import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { addWishlist, listAllEvaluations, listRestaurants, listWishlist } from '../lib/data'
import {
  discoverPlaces,
  distanceKm,
  getCurrentPosition,
  hasGooglePlaces,
  searchPlaces,
  type PlaceResult,
} from '../lib/utils'
import { CUISINES, cuisineLabel } from '../config/cuisines'
import { FOOD_CRITERIA } from '../config/scoring'
import type { Evaluation, Restaurant } from '../types'
import { Spinner } from '../components/Spinner'
import { MarkersMap, type MapMarker } from '../components/MarkersMap'

type Tab = 'fotos' | 'lista' | 'mapa'
const RADII = [1, 2, 5, 10]
const MIN_RATINGS = [
  { v: 0, label: 'Cualquiera' },
  { v: 3.5, label: '3.5+' },
  { v: 4.0, label: '4.0+' },
  { v: 4.5, label: '4.5+' },
]
const GREEN = '#1f9d55'
const ORANGE = '#e8730c'

interface Place {
  key: string
  name: string
  lat: number
  lng: number
  registeredId?: string
  placeId?: string | null
  cuisine?: string
  googleRating?: number | null
  appAvg?: number | null
  type?: string | null
  dist: number | null
  address?: string
}

export function Discover() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [tab, setTab] = useState<Tab>('fotos')
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [evals, setEvals] = useState<Evaluation[]>([])
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  // Filtros compartidos.
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [centerLabel, setCenterLabel] = useState('')
  const [radiusKm, setRadiusKm] = useState(5)
  const [cuisine, setCuisine] = useState('')
  const [minRating, setMinRating] = useState(0)

  const [google, setGoogle] = useState<PlaceResult[]>([])
  const [addr, setAddr] = useState('')
  const [addrResults, setAddrResults] = useState<PlaceResult[]>([])
  const reqId = useRef(0)

  useEffect(() => {
    if (!user) return
    Promise.all([listRestaurants(), listAllEvaluations(), listWishlist(user.uid)])
      .then(([rs, ev, wl]) => {
        setRestaurants(rs)
        setEvals(ev)
        setWishlistIds(new Set(wl.map((w) => w.googlePlaceId).filter(Boolean) as string[]))
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true))
  }, [user])

  useEffect(() => {
    getCurrentPosition().then((p) => { setCenter(p); setCenterLabel('Mi ubicación') }).catch(() => undefined)
  }, [])

  useEffect(() => {
    const q = addr.trim()
    if (q.length < 4) { setAddrResults([]); return }
    const t = setTimeout(() => { searchPlaces(q).then(setAddrResults).catch(() => setAddrResults([])) }, 600)
    return () => clearTimeout(t)
  }, [addr])

  // Sugeridos de Google (para Lista y Mapa).
  useEffect(() => {
    if (!center || !hasGooglePlaces) return
    const my = ++reqId.current
    discoverPlaces(center.lat, center.lng, radiusKm * 1000, cuisine ? cuisineLabel(cuisine) : undefined)
      .then((r) => my === reqId.current && setGoogle(r))
      .catch(() => my === reqId.current && setGoogle([]))
  }, [center, radiusKm, cuisine])

  async function useMyLocation() {
    try { const p = await getCurrentPosition(); setCenter(p); setCenterLabel('Mi ubicación') } catch { toast('No se pudo ubicar') }
  }
  function pickAddress(p: PlaceResult) {
    setCenter({ lat: p.lat, lng: p.lng }); setCenterLabel(p.name); setAddr(''); setAddrResults([])
  }

  async function addToWishlist(p: Place) {
    if (!user) return
    await addWishlist({
      userId: user.uid, name: p.name, address: p.address ?? '', note: p.googleRating != null ? `Google ${p.googleRating.toFixed(1)} ⭐` : '',
      cuisine: cuisine || '', lat: p.lat, lng: p.lng, googlePlaceId: p.placeId ?? null, googleRating: p.googleRating ?? null, done: false, restaurantId: null,
    })
    if (p.placeId) setWishlistIds((s) => new Set(s).add(p.placeId as string))
    toast('Agregado a tu lista 📌')
  }

  const appAvg = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>()
    for (const e of evals) {
      const c = m.get(e.restaurantId) ?? { sum: 0, n: 0 }
      c.sum += e.finalScore; c.n += 1; m.set(e.restaurantId, c)
    }
    return new Map([...m].map(([id, v]) => [id, v.sum / v.n]))
  }, [evals])

  const registeredPlaceIds = useMemo(
    () => new Set(restaurants.map((r) => r.googlePlaceId).filter(Boolean) as string[]),
    [restaurants],
  )

  // Lugares filtrados (registrados + sugeridos de Google).
  const places = useMemo<Place[]>(() => {
    const out: Place[] = []
    for (const r of restaurants) {
      if (r.lat == null || r.lng == null) continue
      if (cuisine && r.cuisine !== cuisine) continue
      const dist = center ? distanceKm(center, { lat: r.lat, lng: r.lng }) : null
      if (center && dist != null && dist > radiusKm) continue
      const g = r.googleRating ?? null
      const a = appAvg.get(r.id) ?? null
      if (minRating > 0 && (g ?? 0) < minRating && (a ?? 0) < minRating) continue
      out.push({ key: `r-${r.id}`, name: r.name, lat: r.lat, lng: r.lng, registeredId: r.id, cuisine: r.cuisine, googleRating: g, appAvg: a, dist })
    }
    for (const p of google) {
      if (p.placeId && registeredPlaceIds.has(p.placeId)) continue
      if (minRating > 0 && (p.rating ?? 0) < minRating) continue
      const dist = center ? distanceKm(center, { lat: p.lat, lng: p.lng }) : null
      out.push({ key: `g-${p.placeId}`, name: p.name, lat: p.lat, lng: p.lng, placeId: p.placeId, googleRating: p.rating ?? null, type: p.type, dist, address: p.address })
    }
    out.sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))
    return out
  }, [restaurants, google, cuisine, center, radiusKm, minRating, appAvg, registeredPlaceIds])

  // Fotos filtradas (de las evaluaciones).
  const photos = useMemo(() => {
    const out: { photo: string; id: string }[] = []
    for (const e of evals) {
      if (cuisine && e.restaurantCuisine !== cuisine) continue
      if (minRating > 0 && e.finalScore < minRating) continue
      if (center && e.lat != null && e.lng != null && distanceKm(center, { lat: e.lat, lng: e.lng }) > radiusKm) continue
      const set = new Set<string>()
      for (const p of e.photos ?? []) set.add(p)
      for (const c of FOOD_CRITERIA) for (const d of e.dishEntries?.[c.key] ?? []) for (const p of d.photos ?? []) set.add(p)
      for (const p of set) out.push({ photo: p, id: e.id })
    }
    return out.slice(0, 120)
  }, [evals, cuisine, minRating, center, radiusKm])

  const markers: MapMarker[] = places.map((p) => ({
    id: p.key,
    lat: p.lat,
    lng: p.lng,
    title: p.name,
    subtitle: [p.googleRating != null ? `⭐ ${p.googleRating.toFixed(1)}` : null, p.dist != null ? `a ${p.dist.toFixed(1)} km` : null].filter(Boolean).join(' · '),
    color: p.registeredId ? GREEN : ORANGE,
    to: p.registeredId ? `/restaurantes/${p.registeredId}` : undefined,
  }))

  return (
    <>
      <header className="app-header">
        <h1>Descubrir 🧭</h1>
      </header>
      <div className="app-main">
        {/* Filtros compartidos */}
        <div className="card">
          <label className="field" style={{ marginBottom: 8 }}>
            <span>📍 Ubicación</span>
            <input value={addr} onChange={(e) => setAddr(e.target.value)} placeholder={centerLabel ? `Centro: ${centerLabel}` : 'Dirección o lugar (ej. tu hotel)…'} autoComplete="off" />
          </label>
          {addrResults.map((p, i) => (
            <button key={i} type="button" className="list-item" onClick={() => pickAddress(p)} style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ fontSize: 18 }}>📍</span>
              <div className="meta"><div className="name">{p.name}</div><div className="sub">{p.address}</div></div>
            </button>
          ))}
          <div className="row" style={{ gap: 6, marginBottom: 10 }}>
            <button className="btn secondary small" style={{ flex: 1 }} onClick={useMyLocation}>📡 Mi ubicación</button>
            {RADII.map((r) => (
              <button key={r} className={`btn small ${radiusKm === r ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setRadiusKm(r)}>{r}km</button>
            ))}
          </div>
          <div className="row" style={{ gap: 8 }}>
            <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} style={{ flex: 2 }}>
              <option value="">Cualquier tipo</option>
              {CUISINES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
            </select>
            <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))} style={{ flex: 1 }}>
              {MIN_RATINGS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
            </select>
          </div>
        </div>

        {/* Vistas */}
        <div className="row" style={{ gap: 8, marginBottom: 14 }}>
          <button className={`btn small ${tab === 'fotos' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setTab('fotos')}>🖼️ Fotos</button>
          <button className={`btn small ${tab === 'lista' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setTab('lista')}>🍴 Lista</button>
          <button className={`btn small ${tab === 'mapa' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setTab('mapa')}>🗺️ Mapa</button>
        </div>

        {!loaded ? (
          <Spinner />
        ) : tab === 'fotos' ? (
          photos.length === 0 ? (
            <div className="empty"><div className="big">🖼️</div><p>Sin fotos con esos filtros.</p></div>
          ) : (
            <div className="grid-3">
              {photos.map((p, i) => (
                <Link key={i} to={`/evaluacion/${p.id}`} className="grid-cell"><img src={p.photo} alt="" /></Link>
              ))}
            </div>
          )
        ) : tab === 'mapa' ? (
          !center ? (
            <div className="empty"><div className="big">📍</div><p>Activa tu ubicación o escribe una dirección.</p></div>
          ) : markers.length === 0 ? (
            <div className="empty"><div className="big">🗺️</div><p>Sin lugares con esos filtros.</p></div>
          ) : (
            <>
              <MarkersMap markers={markers} height="58vh" origin={{ lat: center.lat, lng: center.lng, label: centerLabel || 'Tu ubicación' }} radiusMeters={radiusKm * 1000} />
              <div className="map-legend">
                <span><i className="dot" style={{ background: '#2b6cb0' }} /> Ubicación</span>
                <span><i className="dot" style={{ background: GREEN }} /> Registrados</span>
                <span><i className="dot" style={{ background: ORANGE }} /> Sugeridos</span>
              </div>
            </>
          )
        ) : places.length === 0 ? (
          <div className="empty"><div className="big">🍴</div><p>Sin lugares con esos filtros.</p></div>
        ) : (
          <div className="card">
            {places.map((p) => (
              <div className="list-item" key={p.key}>
                <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 22 }}>{p.registeredId ? '✅' : '📍'}</div>
                <div className="meta">
                  <div className="name">{p.name}</div>
                  <div className="sub">
                    {[
                      p.googleRating != null ? `⭐ ${p.googleRating.toFixed(1)} Google` : null,
                      p.appAvg != null ? `${p.appAvg.toFixed(1)} app` : null,
                      p.cuisine ? cuisineLabel(p.cuisine) : p.type,
                      p.dist != null ? `${p.dist.toFixed(1)} km` : null,
                    ].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {p.registeredId ? (
                      <button className="btn small" onClick={() => navigate(`/restaurantes/${p.registeredId}`)}>Ver ficha ›</button>
                    ) : (
                      <>
                        <button className="btn small secondary" disabled={!!p.placeId && wishlistIds.has(p.placeId)} onClick={() => addToWishlist(p)}>
                          {p.placeId && wishlistIds.has(p.placeId) ? '📌 En tu lista' : '📌 Wishlist'}
                        </button>
                        <button className="btn small" onClick={() => navigate('/restaurantes/nuevo', { state: { place: { name: p.name, address: p.address, lat: p.lat, lng: p.lng, placeId: p.placeId, rating: p.googleRating, type: p.type } } })}>+ Registrar</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => navigate('/restaurantes/nuevo')} aria-label="Crear restaurante">+</button>
    </>
  )
}
