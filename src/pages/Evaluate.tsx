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
  listMyGroups,
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
import { getCurrentPosition, hasGooglePlaces, searchPlaces, type PlaceResult } from '../lib/utils'
import type { DishEntries, Group, RatedDish, Restaurant, Scores, Visibility } from '../types'

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

  // Selector de restaurante (buscar existente o de Google).
  const [pickQuery, setPickQuery] = useState('')
  const [pickResults, setPickResults] = useState<PlaceResult[]>([])
  const [picking, setPicking] = useState(false)

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
  const [visibility, setVisibility] = useState<Visibility>('private')
  const [groupId, setGroupId] = useState('')
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [locBusy, setLocBusy] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listRestaurants()
      .then(setRestaurants)
      .catch(() => setRestaurants([]))
  }, [])

  useEffect(() => {
    if (!user) return
    listMyGroups(user.uid).then(setMyGroups).catch(() => setMyGroups([]))
  }, [user])

  // Busca lugares (Google/OSM) para el selector.
  useEffect(() => {
    const q = pickQuery.trim()
    if (q.length < 3) {
      setPickResults([])
      return
    }
    setPicking(true)
    const t = setTimeout(() => {
      searchPlaces(q)
        .then(setPickResults)
        .catch(() => setPickResults([]))
        .finally(() => setPicking(false))
    }, 500)
    return () => clearTimeout(t)
  }, [pickQuery])

  function selectExisting(r: Restaurant) {
    setRestaurantId(r.id)
    setPickQuery('')
    setPickResults([])
  }

  // Crear un restaurante nuevo pasa por el formulario completo (tipo, fotos, menú…)
  // y vuelve a Evaluar con ese restaurante seleccionado.
  function selectGooglePlace(p: PlaceResult) {
    navigate('/restaurantes/nuevo', { state: { place: p, fromEvaluate: true } })
  }

  useEffect(() => {
    if (!restaurantId) {
      setRestaurant(null)
      return
    }
    getRestaurant(restaurantId)
      .then((r) => {
        setRestaurant(r)
        if (r && r.lat != null && r.lng != null && !loc) {
          setLoc({ lat: r.lat, lng: r.lng })
        }
        if (!r) toast('No se encontró ese restaurante')
      })
      .catch((e) => {
        console.error(e)
        toast('No se pudo cargar el restaurante')
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
      setVisibility(e.visibility ?? (e.isPublic ? 'public' : 'private'))
      setGroupId(e.groupId ?? '')
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
    if (visibility === 'group' && !groupId) {
      toast('Elige un grupo o cambia la visibilidad')
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

      // Visibilidad → quién puede leerla.
      const group = visibility === 'group' ? myGroups.find((g) => g.id === groupId) : undefined
      const allowedUids =
        visibility === 'group' && group
          ? group.memberUids
          : visibility === 'private'
            ? [user.uid]
            : []

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
        isPublic: visibility === 'public',
        visibility,
        groupId: visibility === 'group' ? groupId || null : null,
        allowedUids,
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
        {/* Restaurante: buscar existente o de Google */}
        {restaurant ? (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {restaurant.photos?.[0] ? (
              <img src={restaurant.photos[0]} alt="" className="thumb" />
            ) : (
              <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 22 }}>🍴</div>
            )}
            <div className="meta">
              <div className="name">{restaurant.name}</div>
              <div className="sub">Evaluando este lugar</div>
            </div>
            <button className="btn secondary small" onClick={() => setRestaurantId('')}>Cambiar</button>
          </div>
        ) : (
          <div className="card">
            <label className="field" style={{ marginBottom: 8 }}>
              <span>¿Dónde comiste?</span>
              <input
                value={pickQuery}
                onChange={(e) => setPickQuery(e.target.value)}
                placeholder="Busca el restaurante…"
                autoComplete="off"
              />
            </label>

            {/* Existentes que calzan */}
            {(restaurants ?? [])
              .filter((r) => r.name.toLowerCase().includes(pickQuery.trim().toLowerCase()))
              .slice(0, 6)
              .map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className="list-item"
                  onClick={() => selectExisting(r)}
                  style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                >
                  {r.photos?.[0] ? (
                    <img src={r.photos[0]} alt="" className="thumb" />
                  ) : (
                    <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 20 }}>🍴</div>
                  )}
                  <div className="meta">
                    <div className="name">{r.name}</div>
                    <div className="sub">{r.cuisine ? `${r.cuisine} · ` : ''}registrado</div>
                  </div>
                  <span className="chip">✓</span>
                </button>
              ))}

            {/* Resultados de Google (no registrados) */}
            {picking && <p className="hint">Buscando en {hasGooglePlaces ? 'Google' : 'OpenStreetMap'}…</p>}
            {pickResults
              .filter((p) => !p.placeId || !(restaurants ?? []).some((r) => r.googlePlaceId === p.placeId))
              .map((p, i) => (
                <button
                  key={i}
                  type="button"
                  className="list-item"
                  onClick={() => selectGooglePlace(p)}
                  style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 20 }}>📍</span>
                  <div className="meta">
                    <div className="name">{p.name}</div>
                    <div className="sub">{p.address}</div>
                  </div>
                  {p.rating != null ? <span className="chip">{p.rating.toFixed(1)} ⭐</span> : <span className="chip">nuevo</span>}
                </button>
              ))}

            <button className="btn ghost small" style={{ marginTop: 6 }} onClick={() => navigate('/restaurantes/nuevo', { state: { fromEvaluate: true } })}>
              + Crear manualmente
            </button>
          </div>
        )}

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
              <span>¿Quién puede verla?</span>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
                <option value="private">🔒 Privada (solo yo)</option>
                <option value="group">👥 Grupo (solo los miembros)</option>
                <option value="public">🌐 Pública (cualquiera con el link)</option>
              </select>
            </label>

            {visibility === 'group' && (
              <label className="field">
                <span>Grupo</span>
                {myGroups.length === 0 ? (
                  <div className="hint">
                    No tienes grupos.{' '}
                    <a onClick={() => navigate('/grupos')} style={{ cursor: 'pointer' }}>
                      Crea uno aquí
                    </a>
                    .
                  </div>
                ) : (
                  <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
                    <option value="">Elige un grupo…</option>
                    {myGroups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}
              </label>
            )}

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
