import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { SubHeader } from '../components/Layout'
import { Spinner } from '../components/Spinner'
import { MealEditor } from '../components/MealEditor'
import { ScoreBadge } from '../components/ScoreBadge'
import { PhotoUploader } from '../components/PhotoUploader'
import {
  createEvaluation,
  getEvaluation,
  getRestaurant,
  listRestaurants,
  updateEvaluation,
} from '../lib/data'
import { uploadImage } from '../lib/storage'
import {
  FOOD_CRITERIA,
  categoryAverage,
  computeFinalScore,
  ratedCount,
} from '../config/scoring'
import { getCurrentPosition } from '../lib/utils'
import type { DishEntries, RatedDish, Restaurant, Scores } from '../types'

const FOOD_KEYS = FOOD_CRITERIA.map((c) => c.key)

function emptyDishEntries(): DishEntries {
  return Object.fromEntries(FOOD_KEYS.map((k) => [k, [] as RatedDish[]]))
}

export function Evaluate() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preselectId = params.get('restaurant')
  const { id: editId } = useParams() // presente al editar (/evaluacion/:id/editar)

  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null)
  const [restaurantId, setRestaurantId] = useState(preselectId ?? '')
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)

  const [dishEntries, setDishEntries] = useState<DishEntries>(emptyDishEntries)
  // Solo se usan lugar y atención; el resto se calcula desde los platos.
  const [placeScores, setPlaceScores] = useState<Scores>({
    pan: null,
    entrada: null,
    fondo: null,
    postre: null,
    lugar: 6,
    atencion: 6,
  })

  const [photos, setPhotos] = useState<string[]>([])
  const [comment, setComment] = useState('')
  const [price, setPrice] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [locBusy, setLocBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listRestaurants()
      .then(setRestaurants)
      .catch(() => setRestaurants([]))
  }, [])

  useEffect(() => {
    if (!restaurantId) {
      setRestaurant(null)
      return
    }
    getRestaurant(restaurantId).then((r) => {
      setRestaurant(r)
      if (r && r.lat != null && r.lng != null && !loc) {
        setLoc({ lat: r.lat, lng: r.lng })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId])

  // Modo edición: precarga la evaluación existente.
  useEffect(() => {
    if (!editId) return
    getEvaluation(editId).then((e) => {
      if (!e) return
      setRestaurantId(e.restaurantId)
      // Platos por categoría: usa los nuevos o migra desde el formato antiguo.
      if (e.dishEntries) {
        const base = emptyDishEntries()
        for (const k of FOOD_KEYS) base[k] = e.dishEntries[k] ?? []
        setDishEntries(base)
      } else {
        const base = emptyDishEntries()
        for (const k of FOOD_KEYS) {
          const v = e.scores?.[k]
          if (v != null) {
            base[k] = [
              { id: crypto.randomUUID(), name: e.dishName ?? '', score: v, comment: '', photos: [], price: null },
            ]
          }
        }
        setDishEntries(base)
      }
      setPlaceScores((p) => ({
        ...p,
        lugar: e.scores?.lugar ?? null,
        atencion: e.scores?.atencion ?? null,
      }))
      setPhotos(e.photos ?? [])
      setComment(e.comment ?? '')
      setPrice(e.pricePerPerson != null ? String(e.pricePerPerson) : '')
      setIsPublic(e.isPublic)
      if (e.lat != null && e.lng != null) setLoc({ lat: e.lat, lng: e.lng })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  // Construye las notas por criterio a partir de los platos + lugar/atención.
  const scores = useMemo<Scores>(
    () => ({
      pan: categoryAverage(dishEntries.pan),
      entrada: categoryAverage(dishEntries.entrada),
      fondo: categoryAverage(dishEntries.fondo),
      postre: categoryAverage(dishEntries.postre),
      lugar: placeScores.lugar,
      atencion: placeScores.atencion,
    }),
    [dishEntries, placeScores],
  )
  const finalScore = useMemo(() => computeFinalScore(scores), [scores])
  const rated = ratedCount(scores)

  async function captureLocation() {
    setLocBusy(true)
    try {
      const pos = await getCurrentPosition()
      setLoc(pos)
      toast('Ubicación capturada 📍')
    } catch {
      toast('No se pudo obtener la ubicación')
    } finally {
      setLocBusy(false)
    }
  }

  async function handleSave() {
    if (!user || !restaurant) return
    if (rated === 0) {
      toast('Agrega al menos un plato o una nota')
      return
    }
    setSaving(true)
    try {
      // Limpia: deja solo platos con nombre.
      const cleanEntries: DishEntries = {}
      for (const k of FOOD_KEYS) {
        cleanEntries[k] = (dishEntries[k] ?? [])
          .filter((d) => d.name.trim())
          .map((d) => ({
            ...d,
            name: d.name.trim(),
            comment: (d.comment ?? '').trim(),
            photos: d.photos ?? [],
            price: d.price ?? null,
          }))
      }
      // Nombre representativo para el historial.
      const summary =
        cleanEntries.fondo?.[0]?.name ||
        cleanEntries.entrada?.[0]?.name ||
        cleanEntries.postre?.[0]?.name ||
        cleanEntries.pan?.[0]?.name ||
        null
      const dishCount = FOOD_KEYS.reduce((n, k) => n + (cleanEntries[k]?.length ?? 0), 0)

      const data = {
        userId: user.uid,
        userName: user.displayName ?? 'Anónimo',
        userPhoto: user.photoURL ?? '',
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantCuisine: restaurant.cuisine ?? '',
        dishName: dishCount > 1 ? `${summary} +${dishCount - 1}` : summary,
        dishEntries: cleanEntries,
        scores,
        finalScore,
        comment: comment.trim(),
        photos,
        pricePerPerson: price ? Number(price) : null,
        currency: 'CLP',
        lat: loc?.lat ?? restaurant.lat ?? null,
        lng: loc?.lng ?? restaurant.lng ?? null,
        address: restaurant.address ?? '',
        isPublic,
      }
      if (editId) {
        await updateEvaluation(editId, data)
        toast('Cambios guardados ✅')
        navigate(`/evaluacion/${editId}`, { replace: true })
      } else {
        const id = await createEvaluation(data)
        toast('¡Evaluación guardada! 🎉')
        navigate(`/evaluacion/${id}`, { replace: true })
      }
    } catch (e) {
      console.error(e)
      toast('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (restaurants === null) return <Spinner label="Cargando restaurantes…" />

  return (
    <>
      <SubHeader title={editId ? 'Editar evaluación' : 'Nueva evaluación'} />
      <div className="app-main">
        {/* Restaurante */}
        <label className="field">
          <span>Restaurante</span>
          {restaurants.length === 0 ? (
            <div className="card" style={{ textAlign: 'center' }}>
              <p>No hay restaurantes todavía.</p>
              <button className="btn small" onClick={() => navigate('/restaurantes/nuevo')}>
                + Crear restaurante
              </button>
            </div>
          ) : (
            <>
              <select
                value={restaurantId}
                onChange={(e) => setRestaurantId(e.target.value)}
              >
                <option value="">Elige un restaurante…</option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.cuisine ? ` · ${r.cuisine}` : ''}
                  </option>
                ))}
              </select>
              <button
                className="btn ghost small"
                style={{ marginTop: 6 }}
                onClick={() => navigate('/restaurantes/nuevo')}
              >
                + Crear nuevo restaurante
              </button>
            </>
          )}
        </label>

        {restaurant && (
          <>
            {/* Menú del lugar */}
            {(restaurant.menuPhotos?.length > 0 || restaurant.menuUrl) && (
              <div className="card">
                <span className="hint" style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>
                  📋 Menú del lugar
                </span>
                {restaurant.menuUrl && (
                  <a className="btn secondary small block" href={restaurant.menuUrl} target="_blank" rel="noreferrer" style={{ marginBottom: 8 }}>
                    🔗 Ver carta web
                  </a>
                )}
                {restaurant.menuPhotos?.length > 0 && (
                  <div className="photo-grid">
                    {restaurant.menuPhotos.map((m) => (
                      <a href={m} target="_blank" rel="noreferrer" key={m}>
                        <img src={m} alt="Menú" className="photo-thumb" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Platos por categoría + lugar/atención */}
            <div className="section-title">Platos y puntuación</div>
            <p className="hint" style={{ marginTop: -4 }}>
              Agrega cada plato que pediste con su nota. La categoría promedia sus platos.
            </p>
            <MealEditor
              restaurant={restaurant}
              dishEntries={dishEntries}
              onChangeDishEntries={setDishEntries}
              placeScores={placeScores}
              onChangePlaceScores={setPlaceScores}
              uploadPhoto={(f) => uploadImage(f, `evaluations/${user!.uid}`)}
            />

            <div className="card text-center" style={{ position: 'sticky', bottom: 88, zIndex: 10 }}>
              <div className="muted" style={{ fontSize: 13 }}>Nota final ponderada</div>
              <div className="score-big" style={{ color: 'var(--orange)' }}>
                {finalScore.toFixed(1)}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                sobre 7 · {rated} de 6 categorías
              </div>
            </div>

            {/* Fotos generales de la experiencia */}
            <div className="section-title">Fotos de la experiencia (opcional)</div>
            <div className="card">
              <PhotoUploader
                value={photos}
                onChange={setPhotos}
                upload={(f) => uploadImage(f, `evaluations/${user!.uid}`)}
              />
            </div>

            {/* Detalles */}
            <label className="field">
              <span>Comentario general</span>
              <textarea
                placeholder="¿Qué destacó? ¿Volverías?"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Precio por persona (opcional)</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Déjalo vacío si es buffet / all-inclusive"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <p className="hint">En pesos (CLP). Opcional.</p>
            </label>

            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22 }}>📍</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>Ubicación</div>
                  <div className="hint">
                    {loc
                      ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`
                      : 'Sin ubicación'}
                  </div>
                </div>
                <button className="btn secondary small" onClick={captureLocation} disabled={locBusy}>
                  {locBusy ? '…' : loc ? 'Actualizar' : 'Usar mi ubicación'}
                </button>
              </div>
            </div>

            <label className="field" style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <span style={{ fontWeight: 600 }}>
                  Hacer pública (compartible por link sin login)
                </span>
              </div>
            </label>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <ScoreBadge score={finalScore} showLabel />
            </div>

            <button className="btn block" onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : editId ? 'Guardar cambios' : 'Guardar evaluación'}
            </button>
          </>
        )}
      </div>
    </>
  )
}
