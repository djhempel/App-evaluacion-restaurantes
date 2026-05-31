import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { SubHeader } from '../components/Layout'
import { Spinner } from '../components/Spinner'
import { ScoreEditor } from '../components/ScoreEditor'
import { ScoreBadge } from '../components/ScoreBadge'
import { PhotoUploader } from '../components/PhotoUploader'
import { createEvaluation, getRestaurant, listRestaurants } from '../lib/data'
import { uploadImage } from '../lib/storage'
import { computeFinalScore, emptyScores, ratedCount } from '../config/scoring'
import { DISH_CATEGORIES, DISH_CATEGORY_BY_VALUE } from '../config/dishes'
import { getCurrentPosition } from '../lib/utils'
import type { Restaurant, Scores } from '../types'

export function Evaluate() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const preselectId = params.get('restaurant')

  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null)
  const [restaurantId, setRestaurantId] = useState(preselectId ?? '')
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [dishId, setDishId] = useState('')
  const [customDish, setCustomDish] = useState('')
  const [customCategory, setCustomCategory] = useState('fondo')

  const [scores, setScores] = useState<Scores>(emptyScores)
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
    setDishId('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId])

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
      toast('Puntúa al menos un criterio')
      return
    }
    setSaving(true)
    try {
      const menuDish =
        dishId && dishId !== '__custom__'
          ? restaurant.dishes.find((d) => d.id === dishId)
          : undefined
      const dishName = menuDish ? menuDish.name : customDish.trim() || null
      const dishCategory = menuDish
        ? menuDish.category ?? null
        : customDish.trim()
          ? customCategory
          : null
      const id = await createEvaluation({
        userId: user.uid,
        userName: user.displayName ?? 'Anónimo',
        userPhoto: user.photoURL ?? '',
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantCuisine: restaurant.cuisine ?? '',
        dishId: menuDish ? menuDish.id : null,
        dishName,
        dishCategory,
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
      })
      toast('¡Evaluación guardada! 🎉')
      navigate(`/evaluacion/${id}`, { replace: true })
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
      <SubHeader title="Nueva evaluación" />
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
              <select value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
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
            {/* Menú / plato */}
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

            <label className="field">
              <span>Plato evaluado (opcional)</span>
              {restaurant.dishes?.length > 0 && (
                <select value={dishId} onChange={(e) => setDishId(e.target.value)}>
                  <option value="">Sin plato específico</option>
                  {restaurant.dishes.map((d) => (
                    <option key={d.id} value={d.id}>
                      {DISH_CATEGORY_BY_VALUE[d.category ?? 'otro']?.emoji ?? '🍴'} {d.name}
                    </option>
                  ))}
                  <option value="__custom__">✏️ Otro (fuera de la carta)</option>
                </select>
              )}
              {(restaurant.dishes?.length === 0 || dishId === '__custom__') && (
                <div className="row" style={{ marginTop: restaurant.dishes?.length > 0 ? 8 : 0 }}>
                  <input
                    placeholder="Escribe el plato (ej: Risotto de hongos)"
                    value={customDish}
                    onChange={(e) => setCustomDish(e.target.value)}
                    style={{ flex: 2 }}
                  />
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    {DISH_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.emoji} {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </label>

            {/* Puntuación */}
            <div className="section-title">Puntuación por criterio</div>
            <ScoreEditor scores={scores} onChange={setScores} />

            <div className="card text-center" style={{ position: 'sticky', bottom: 88, zIndex: 10 }}>
              <div className="muted" style={{ fontSize: 13 }}>Nota final ponderada</div>
              <div className="score-big" style={{ color: 'var(--orange)' }}>
                {finalScore.toFixed(1)}
              </div>
              <div className="muted" style={{ fontSize: 12 }}>
                sobre 7 · {rated} de 6 criterios
              </div>
            </div>

            {/* Fotos */}
            <div className="section-title">Fotos</div>
            <div className="card">
              <PhotoUploader
                value={photos}
                onChange={setPhotos}
                upload={(f) => uploadImage(f, `evaluations/${user!.uid}`)}
              />
            </div>

            {/* Detalles */}
            <label className="field">
              <span>Comentario</span>
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
              {saving ? 'Guardando…' : 'Guardar evaluación'}
            </button>
          </>
        )}
      </div>
    </>
  )
}
