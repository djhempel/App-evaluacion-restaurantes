import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { SubHeader } from '../components/Layout'
import { Spinner } from '../components/Spinner'
import { PhotoUploader } from '../components/PhotoUploader'
import { createRestaurant, getRestaurant, listRestaurants, updateRestaurant } from '../lib/data'
import { uploadImage } from '../lib/storage'
import {
  getCurrentPosition,
  hasGooglePlaces,
  normalizeText,
  reverseGeocode,
  searchPlaces,
  type PlaceResult,
} from '../lib/utils'
import { DISH_CATEGORIES } from '../config/dishes'
import type { Dish, Restaurant } from '../types'

export function RestaurantForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(editing)
  const [name, setName] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [address, setAddress] = useState('')
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [google, setGoogle] = useState<{
    rating: number | null
    count: number | null
    placeId: string | null
  } | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [menuPhotos, setMenuPhotos] = useState<string[]>([])
  const [menuUrl, setMenuUrl] = useState('')
  const [dishes, setDishes] = useState<Dish[]>([])
  const [saving, setSaving] = useState(false)
  const [locBusy, setLocBusy] = useState(false)
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([])

  // Búsqueda de lugares (autocompletar con OpenStreetMap).
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([])
  const [placeSearching, setPlaceSearching] = useState(false)

  // Restaurantes existentes (para sugerir cocinas y avisar duplicados).
  useEffect(() => {
    listRestaurants()
      .then(setAllRestaurants)
      .catch(() => undefined)
  }, [])

  const cuisineOptions = useMemo(() => {
    const set = new Set(allRestaurants.map((r) => (r.cuisine ?? '').trim()).filter(Boolean))
    return Array.from(set).sort()
  }, [allRestaurants])

  // Posibles duplicados por nombre parecido (solo al crear).
  const possibleDuplicates = useMemo(() => {
    const n = normalizeText(name)
    if (editing || n.length < 4) return []
    return allRestaurants
      .filter((r) => {
        const rn = normalizeText(r.name)
        return rn === n || rn.includes(n) || n.includes(rn)
      })
      .slice(0, 3)
  }, [name, allRestaurants, editing])

  // Busca lugares mientras escribes (con retardo, respetando OpenStreetMap).
  useEffect(() => {
    const q = placeQuery.trim()
    if (q.length < 4) {
      setPlaceResults([])
      return
    }
    setPlaceSearching(true)
    const t = setTimeout(() => {
      searchPlaces(q)
        .then(setPlaceResults)
        .catch(() => setPlaceResults([]))
        .finally(() => setPlaceSearching(false))
    }, 700)
    return () => clearTimeout(t)
  }, [placeQuery])

  function selectPlace(p: PlaceResult) {
    if (!name.trim()) setName(p.name)
    setAddress(p.address)
    setLoc({ lat: p.lat, lng: p.lng })
    if (p.rating != null || p.placeId) {
      setGoogle({ rating: p.rating ?? null, count: p.userRatingCount ?? null, placeId: p.placeId ?? null })
    }
    setPlaceResults([])
    setPlaceQuery('')
    toast(p.rating != null ? `Datos cargados · Google ${p.rating}★` : 'Datos del lugar cargados 📍')
  }

  useEffect(() => {
    if (!id) return
    getRestaurant(id)
      .then((r) => {
        if (r) {
          setName(r.name)
          setCuisine(r.cuisine ?? '')
          setAddress(r.address ?? '')
          if (r.lat != null && r.lng != null) setLoc({ lat: r.lat, lng: r.lng })
          setPhotos(r.photos ?? [])
          setMenuPhotos(r.menuPhotos ?? [])
          setMenuUrl(r.menuUrl ?? '')
          setDishes(r.dishes ?? [])
          if (r.googleRating != null || r.googlePlaceId) {
            setGoogle({
              rating: r.googleRating ?? null,
              count: r.googleRatingCount ?? null,
              placeId: r.googlePlaceId ?? null,
            })
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  function addDish() {
    setDishes((d) => [
      ...d,
      { id: crypto.randomUUID(), name: '', price: null, category: 'fondo' },
    ])
  }
  function updateDish(dishId: string, patch: Partial<Dish>) {
    setDishes((d) => d.map((x) => (x.id === dishId ? { ...x, ...patch } : x)))
  }
  function removeDish(dishId: string) {
    setDishes((d) => d.filter((x) => x.id !== dishId))
  }

  async function captureLocation() {
    setLocBusy(true)
    try {
      const pos = await getCurrentPosition()
      setLoc(pos)
      toast('Ubicación capturada 📍')
      // Autocompleta la dirección a partir de las coordenadas.
      try {
        const dir = await reverseGeocode(pos.lat, pos.lng)
        if (dir) setAddress(dir)
      } catch {
        /* si falla la dirección, igual queda la ubicación */
      }
    } catch {
      toast('No se pudo obtener la ubicación')
    } finally {
      setLocBusy(false)
    }
  }

  async function handleSave() {
    if (!user) return
    if (!name.trim()) {
      toast('Ponle un nombre al restaurante')
      return
    }
    setSaving(true)
    const cleanDishes = dishes
      .filter((d) => d.name.trim())
      .map((d) => ({
        ...d,
        name: d.name.trim(),
        price: d.price ?? null,
        category: d.category ?? 'otro',
      }))
    try {
      const payload = {
        name: name.trim(),
        cuisine: cuisine.trim(),
        address: address.trim(),
        menuUrl: menuUrl.trim(),
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        googleRating: google?.rating ?? null,
        googleRatingCount: google?.count ?? null,
        googlePlaceId: google?.placeId ?? null,
        photos,
        menuPhotos,
        dishes: cleanDishes,
        createdBy: user.uid,
        createdByName: user.displayName ?? 'Anónimo',
      }
      if (editing && id) {
        await updateRestaurant(id, payload)
        toast('Restaurante actualizado')
        navigate(`/restaurantes/${id}`, { replace: true })
      } else {
        const newId = await createRestaurant(payload)
        toast('Restaurante creado 🎉')
        navigate(`/restaurantes/${newId}`, { replace: true })
      }
    } catch (e) {
      console.error(e)
      toast('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <>
      <SubHeader title={editing ? 'Editar restaurante' : 'Nuevo restaurante'} />
      <div className="app-main">
        {!editing && (
          <div className="card">
            <label className="field" style={{ marginBottom: placeResults.length || placeSearching ? 10 : 0 }}>
              <span>🔎 Buscar el lugar (autocompletar)</span>
              <input
                value={placeQuery}
                onChange={(e) => setPlaceQuery(e.target.value)}
                placeholder="Escribe el nombre o dirección…"
                autoComplete="off"
              />
              <p className="hint">
                {hasGooglePlaces
                  ? 'Busca en Google y precarga nombre, dirección, ubicación y la nota de Google.'
                  : 'Busca en OpenStreetMap y precarga dirección y ubicación.'}
              </p>
            </label>
            {placeSearching && <p className="hint">Buscando…</p>}
            {placeResults.map((p, i) => (
              <button
                key={i}
                type="button"
                className="list-item"
                onClick={() => selectPlace(p)}
                style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 20 }}>📍</span>
                <div className="meta">
                  <div className="name">{p.name}</div>
                  <div className="sub">{p.address}</div>
                </div>
                {p.rating != null && (
                  <span className="sub" style={{ whiteSpace: 'nowrap' }}>
                    {p.rating.toFixed(1)} ⭐
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {google?.rating != null && (
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>⭐</span>
            <div className="meta">
              <div className="name">Nota de Google: {google.rating.toFixed(1)}/5</div>
              {google.count != null && <div className="sub">{google.count} reseñas</div>}
            </div>
            <button
              className="btn ghost small"
              onClick={() => setGoogle(null)}
              style={{ color: '#d23a3a' }}
            >
              Quitar
            </button>
          </div>
        )}

        <label className="field">
          <span>Nombre *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: La Mar" />
        </label>

        {possibleDuplicates.length > 0 && (
          <div className="card" style={{ borderLeft: '4px solid var(--orange)' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠️ ¿Quizás ya existe?</div>
            <p className="hint" style={{ marginTop: 0 }}>
              Encontramos lugares con nombre parecido. Toca para ver y evitar duplicarlo:
            </p>
            {possibleDuplicates.map((r) => (
              <Link key={r.id} to={`/restaurantes/${r.id}`} className="list-item" style={{ color: 'inherit' }}>
                <div className="meta">
                  <div className="name">{r.name}</div>
                  {r.cuisine && <div className="sub">{r.cuisine}</div>}
                </div>
                <span style={{ color: 'var(--muted)' }}>›</span>
              </Link>
            ))}
          </div>
        )}
        <label className="field">
          <span>Tipo de cocina</span>
          <input
            value={cuisine}
            onChange={(e) => setCuisine(e.target.value)}
            placeholder="Empieza a escribir: peruana, italiana…"
            list="cuisine-options"
            autoComplete="off"
          />
          <datalist id="cuisine-options">
            {cuisineOptions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <p className="hint">
            Te sugiere tipos ya usados. Si no está, escríbelo y se agrega como nuevo.
          </p>
        </label>
        <label className="field">
          <span>Dirección</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, ciudad" />
        </label>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>📍</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>Ubicación en el mapa</div>
              <div className="hint">
                {loc ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : 'Sin ubicación'}
              </div>
            </div>
            <button className="btn secondary small" onClick={captureLocation} disabled={locBusy}>
              {locBusy ? '…' : loc ? 'Actualizar' : 'Usar mi ubicación'}
            </button>
          </div>
        </div>

        <div className="section-title">Fotos del lugar</div>
        <div className="card">
          <PhotoUploader
            value={photos}
            onChange={setPhotos}
            upload={(f) => uploadImage(f, `restaurants/photos`)}
          />
        </div>

        <div className="section-title">Menú (carga las fotos del menú)</div>
        <div className="card">
          <PhotoUploader
            value={menuPhotos}
            onChange={setMenuPhotos}
            upload={(f) => uploadImage(f, `restaurants/menus`)}
          />
          <p className="hint">Sube fotos del menú para luego elegir el plato que evaluaste.</p>
        </div>

        <label className="field">
          <span>Link a la carta web (opcional)</span>
          <input
            type="url"
            inputMode="url"
            value={menuUrl}
            onChange={(e) => setMenuUrl(e.target.value)}
            placeholder="https://… (si el local tiene menú online)"
          />
        </label>

        <div className="section-title">Platos de la carta</div>
        <div className="card">
          {dishes.length === 0 && (
            <p className="muted" style={{ textAlign: 'center', margin: '8px 0' }}>
              Agrega los platos que se podrán evaluar (opcional).
            </p>
          )}
          {dishes.map((d) => (
            <div key={d.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10, marginBottom: 10 }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <input
                  placeholder="Nombre del plato"
                  value={d.name}
                  onChange={(e) => updateDish(d.id, { name: e.target.value })}
                  style={{ flex: 2 }}
                />
                <button
                  className="btn ghost"
                  onClick={() => removeDish(d.id)}
                  style={{ padding: '8px 10px', color: '#d23a3a' }}
                  aria-label="Quitar plato"
                >
                  🗑️
                </button>
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <select
                  value={d.category ?? 'fondo'}
                  onChange={(e) => updateDish(d.id, { category: e.target.value })}
                  style={{ flex: 2 }}
                >
                  {DISH_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Precio"
                  value={d.price ?? ''}
                  onChange={(e) => updateDish(d.id, { price: e.target.value ? Number(e.target.value) : null })}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          ))}
          <button className="btn secondary small" onClick={addDish}>
            + Agregar plato
          </button>
        </div>

        <button className="btn block" onClick={handleSave} disabled={saving} style={{ marginTop: 12 }}>
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear restaurante'}
        </button>
      </div>
    </>
  )
}
