import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { addWishlist, listPublicEvaluations, listRestaurants } from '../lib/data'
import {
  discoverPlaces,
  distanceKm,
  getCurrentPosition,
  hasGooglePlaces,
  searchPlaces,
  type PlaceResult,
} from '../lib/utils'
import { CUISINES, cuisineLabel } from '../config/cuisines'
import type { Restaurant } from '../types'
import { Spinner } from '../components/Spinner'
import { MarkersMap, type MapMarker } from '../components/MarkersMap'

const RADII = [1, 2, 5, 10]
const MIN_RATINGS = [
  { v: 0, label: 'Cualquiera' },
  { v: 3.5, label: '3.5+' },
  { v: 4.0, label: '4.0+' },
  { v: 4.5, label: '4.5+' },
]
const GREEN = '#1f9d55'
const ORANGE = '#e8730c'

export function Explore() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [appAvg, setAppAvg] = useState<Map<string, number>>(new Map())
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())

  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [centerLabel, setCenterLabel] = useState('')
  const [radiusKm, setRadiusKm] = useState(3)
  const [cuisine, setCuisine] = useState('')
  const [minRating, setMinRating] = useState(0)
  const [view, setView] = useState<'list' | 'map'>('list')

  const [results, setResults] = useState<PlaceResult[] | null>(null)
  const [busy, setBusy] = useState(false)

  // Búsqueda de dirección (geocode reutilizando searchPlaces).
  const [addr, setAddr] = useState('')
  const [addrResults, setAddrResults] = useState<PlaceResult[]>([])
  const reqId = useRef(0)

  useEffect(() => {
    Promise.all([listRestaurants(), listPublicEvaluations()])
      .then(([rs, ev]) => {
        setRestaurants(rs)
        const agg = new Map<string, { sum: number; n: number }>()
        for (const e of ev) {
          const cur = agg.get(e.restaurantId) ?? { sum: 0, n: 0 }
          cur.sum += e.finalScore
          cur.n += 1
          agg.set(e.restaurantId, cur)
        }
        setAppAvg(new Map([...agg].map(([id, { sum, n }]) => [id, sum / n])))
      })
      .catch(() => undefined)
  }, [])

  // Ubicación inicial.
  useEffect(() => {
    getCurrentPosition()
      .then((pos) => {
        setCenter(pos)
        setCenterLabel('Mi ubicación')
      })
      .catch(() => undefined)
  }, [])

  // Buscador de dirección.
  useEffect(() => {
    const q = addr.trim()
    if (q.length < 4) {
      setAddrResults([])
      return
    }
    const t = setTimeout(() => {
      searchPlaces(q).then(setAddrResults).catch(() => setAddrResults([]))
    }, 600)
    return () => clearTimeout(t)
  }, [addr])

  // Descubre cuando cambian centro / radio / tipo.
  useEffect(() => {
    if (!center || !hasGooglePlaces) return
    const myReq = ++reqId.current
    setBusy(true)
    discoverPlaces(center.lat, center.lng, radiusKm * 1000, cuisine ? cuisineLabel(cuisine) : undefined)
      .then((r) => {
        if (myReq === reqId.current) setResults(r)
      })
      .catch(() => {
        if (myReq === reqId.current) setResults([])
      })
      .finally(() => {
        if (myReq === reqId.current) setBusy(false)
      })
  }, [center, radiusKm, cuisine])

  async function useMyLocation() {
    try {
      const pos = await getCurrentPosition()
      setCenter(pos)
      setCenterLabel('Mi ubicación')
    } catch {
      toast('No se pudo obtener tu ubicación')
    }
  }

  function pickAddress(p: PlaceResult) {
    setCenter({ lat: p.lat, lng: p.lng })
    setCenterLabel(p.name)
    setAddr('')
    setAddrResults([])
  }

  async function addToWishlist(p: PlaceResult) {
    if (!user) return
    const payload = {
      userId: user.uid,
      name: p.name,
      address: p.address ?? '',
      note: p.rating != null ? `Google ${p.rating.toFixed(1)} ⭐` : '',
      cuisine: cuisine || '',
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      googlePlaceId: p.placeId ?? null,
      googleRating: p.rating ?? null,
      done: false,
      restaurantId: null,
    }
    await addWishlist(payload)
    if (p.placeId) setWishlistIds((s) => new Set(s).add(p.placeId as string))
    toast('Agregado a tu lista 📌')
  }

  const registeredByPlaceId = useMemo(
    () => new Map(restaurants.filter((r) => r.googlePlaceId).map((r) => [r.googlePlaceId as string, r])),
    [restaurants],
  )

  const filtered = useMemo(
    () => (results ?? []).filter((p) => (p.rating ?? 0) >= minRating),
    [results, minRating],
  )

  const markers: MapMarker[] = useMemo(() => {
    const m: MapMarker[] = []
    for (const p of filtered) {
      if (p.lat && p.lng) {
        const reg = p.placeId ? registeredByPlaceId.get(p.placeId) : undefined
        const dist = center ? distanceKm(center, { lat: p.lat, lng: p.lng }) : null
        m.push({
          id: `g-${p.placeId}`,
          lat: p.lat,
          lng: p.lng,
          title: p.name,
          subtitle: [
            p.rating != null ? `⭐ ${p.rating.toFixed(1)}` : null,
            p.type,
            dist != null ? `📍 a ${dist.toFixed(1)} km` : null,
          ]
            .filter(Boolean)
            .join(' · '),
          color: reg ? GREEN : ORANGE,
          to: reg ? `/restaurantes/${reg.id}` : undefined,
        })
      }
    }
    return m
  }, [filtered, registeredByPlaceId, center])

  return (
    <>
      <header className="app-header">
        <h1>Explorar 🧭</h1>
      </header>
      <div className="app-main">
        {/* Ubicación */}
        <div className="card">
          <label className="field" style={{ marginBottom: addrResults.length ? 8 : 8 }}>
            <span>📍 Ubicación</span>
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder={centerLabel ? `Centro: ${centerLabel}` : 'Escribe una dirección o lugar (ej. tu hotel)…'}
              autoComplete="off"
            />
          </label>
          {addrResults.map((p, i) => (
            <button
              key={i}
              type="button"
              className="list-item"
              onClick={() => pickAddress(p)}
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 18 }}>📍</span>
              <div className="meta"><div className="name">{p.name}</div><div className="sub">{p.address}</div></div>
            </button>
          ))}
          <button className="btn secondary small" onClick={useMyLocation}>📡 Usar mi ubicación</button>
        </div>

        {/* Filtros */}
        <div className="card">
          <label className="field" style={{ marginBottom: 12 }}>
            <span>Radio de búsqueda</span>
            <div className="row" style={{ gap: 6 }}>
              {RADII.map((r) => (
                <button key={r} className={`btn small ${radiusKm === r ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setRadiusKm(r)}>
                  {r} km
                </button>
              ))}
            </div>
          </label>
          <div className="row" style={{ gap: 8 }}>
            <label className="field" style={{ flex: 2, marginBottom: 0 }}>
              <span>Tipo de comida</span>
              <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                <option value="">Cualquier tipo</option>
                {CUISINES.map((c) => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </label>
            <label className="field" style={{ flex: 1, marginBottom: 0 }}>
              <span>Nota mínima</span>
              <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
                {MIN_RATINGS.map((m) => (
                  <option key={m.v} value={m.v}>{m.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* Vista */}
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <button className={`btn small ${view === 'list' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setView('list')}>📋 Lista</button>
          <button className={`btn small ${view === 'map' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setView('map')}>🗺️ Mapa</button>
        </div>

        {!hasGooglePlaces ? (
          <div className="empty"><div className="big">🧭</div><p>Configura la API key de Google para explorar lugares cercanos.</p></div>
        ) : !center ? (
          <div className="empty"><div className="big">📍</div><p>Activa tu ubicación o escribe una dirección para empezar.</p></div>
        ) : busy && results === null ? (
          <Spinner label="Buscando cerca…" />
        ) : view === 'map' ? (
          markers.length === 0 ? (
            <div className="empty"><div className="big">🗺️</div><p>Sin resultados con esos filtros.</p></div>
          ) : (
            <>
              <MarkersMap
                markers={markers}
                height="58vh"
                origin={center ? { lat: center.lat, lng: center.lng, label: centerLabel || 'Tu ubicación' } : undefined}
                radiusMeters={radiusKm * 1000}
              />
              <div className="map-legend">
                <span><i className="dot" style={{ background: '#2b6cb0' }} /> {centerLabel || 'Tu ubicación'}</span>
                <span><i className="dot" style={{ background: GREEN }} /> Registrados</span>
                <span><i className="dot" style={{ background: ORANGE }} /> Sugeridos</span>
              </div>
            </>
          )
        ) : filtered.length === 0 ? (
          <div className="empty"><div className="big">🔍</div><p>{busy ? 'Buscando…' : 'Sin resultados con esos filtros. Sube el radio o baja la nota mínima.'}</p></div>
        ) : (
          <div className="card">
            {filtered.map((p, i) => {
              const reg = p.placeId ? registeredByPlaceId.get(p.placeId) : undefined
              const inList = p.placeId ? wishlistIds.has(p.placeId) : false
              const dist = center ? distanceKm(center, { lat: p.lat, lng: p.lng }) : null
              const myScore = reg ? appAvg.get(reg.id) : undefined
              return (
                <div className="list-item" key={p.placeId ?? i}>
                  <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 22 }}>{reg ? '✅' : '📍'}</div>
                  <div className="meta">
                    <div className="name">{p.name}</div>
                    <div className="sub">
                      {p.rating != null ? `⭐ ${p.rating.toFixed(1)} Google` : 'sin nota'}
                      {myScore != null ? ` · ${myScore.toFixed(1)} app` : ''}
                      {p.type ? ` · ${p.type}` : ''}
                      {dist != null ? ` · ${dist.toFixed(1)} km` : ''}
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {reg ? (
                        <button className="btn small" onClick={() => navigate(`/restaurantes/${reg.id}`)}>Ver ficha ›</button>
                      ) : (
                        <>
                          <button className="btn small secondary" disabled={inList} onClick={() => addToWishlist(p)}>
                            {inList ? '📌 En tu lista' : '📌 Wishlist'}
                          </button>
                          <button className="btn small" onClick={() => navigate('/restaurantes/nuevo', { state: { place: p } })}>+ Registrar</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
