import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import {
  addWishlist,
  listAllEvaluations,
  listFriendUids,
  listMyGroups,
  listRestaurants,
} from '../lib/data'
import {
  discoverPlaces,
  distanceKm,
  getCurrentPosition,
  hasGooglePlaces,
  searchPlaces,
  type PlaceResult,
} from '../lib/utils'
import { CUISINES, cuisineLabel } from '../config/cuisines'
import type { Evaluation, FeedScope, Restaurant } from '../types'
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

interface RedRow {
  r: Restaurant
  avg: number
  count: number
  dist: number | null
}

export function Explore({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [evals, setEvals] = useState<Evaluation[]>([])
  const [friendUids, setFriendUids] = useState<Set<string>>(new Set())
  const [groupIds, setGroupIds] = useState<Set<string>>(new Set())
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set())
  const [loaded, setLoaded] = useState(false)

  const [scope, setScope] = useState<FeedScope>('public')
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)
  const [centerLabel, setCenterLabel] = useState('')
  const [radiusKm, setRadiusKm] = useState(3)
  const [cuisine, setCuisine] = useState('')
  const [minRating, setMinRating] = useState(0)
  const [view, setView] = useState<'list' | 'map'>('list')

  const [results, setResults] = useState<PlaceResult[] | null>(null)
  const [busy, setBusy] = useState(false)

  const [addr, setAddr] = useState('')
  const [addrResults, setAddrResults] = useState<PlaceResult[]>([])
  const reqId = useRef(0)

  useEffect(() => {
    if (!user) return
    Promise.all([listRestaurants(), listAllEvaluations(), listFriendUids(user.uid), listMyGroups(user.uid)])
      .then(([rs, ev, fu, gs]) => {
        setRestaurants(rs)
        setEvals(ev)
        setFriendUids(new Set(fu))
        setGroupIds(new Set(gs.map((g) => g.id)))
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true))
  }, [user])

  useEffect(() => {
    getCurrentPosition()
      .then((pos) => {
        setCenter(pos)
        setCenterLabel('Mi ubicación')
      })
      .catch(() => undefined)
  }, [])

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

  // Descubrimiento Google (sugeridos).
  useEffect(() => {
    if (!center || !hasGooglePlaces) return
    const myReq = ++reqId.current
    setBusy(true)
    discoverPlaces(center.lat, center.lng, radiusKm * 1000, cuisine ? cuisineLabel(cuisine) : undefined)
      .then((r) => myReq === reqId.current && setResults(r))
      .catch(() => myReq === reqId.current && setResults([]))
      .finally(() => myReq === reqId.current && setBusy(false))
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

  // Capa "tu red": restaurantes evaluados según el ámbito, dentro del radio.
  const redRows = useMemo<RedRow[]>(() => {
    const scoped = evals.filter((e) => {
      if (scope === 'me') return e.userId === user?.uid
      if (scope === 'friends') return friendUids.has(e.userId)
      if (scope === 'group') return e.groupId && groupIds.has(e.groupId)
      return true // public
    })
    const agg = new Map<string, { sum: number; n: number }>()
    for (const e of scoped) {
      const cur = agg.get(e.restaurantId) ?? { sum: 0, n: 0 }
      cur.sum += e.finalScore
      cur.n += 1
      agg.set(e.restaurantId, cur)
    }
    return restaurants
      .filter((r) => agg.has(r.id) && r.lat != null && r.lng != null)
      .filter((r) => !cuisine || r.cuisine === cuisine)
      .map((r) => {
        const a = agg.get(r.id)!
        const dist = center ? distanceKm(center, { lat: r.lat as number, lng: r.lng as number }) : null
        return { r, avg: a.sum / a.n, count: a.n, dist }
      })
      .filter((row) => (center && radiusKm ? (row.dist ?? Infinity) <= radiusKm : true))
      .sort((a, b) => (a.dist ?? 0) - (b.dist ?? 0))
  }, [evals, restaurants, scope, cuisine, center, radiusKm, user, friendUids, groupIds])

  // Sugeridos Google (no registrados), filtrados por nota.
  const suggested = useMemo(
    () =>
      (results ?? []).filter(
        (p) => (p.rating ?? 0) >= minRating && !(p.placeId && registeredByPlaceId.has(p.placeId)),
      ),
    [results, minRating, registeredByPlaceId],
  )

  const markers: MapMarker[] = useMemo(() => {
    const m: MapMarker[] = []
    for (const row of redRows) {
      m.push({
        id: `red-${row.r.id}`,
        lat: row.r.lat as number,
        lng: row.r.lng as number,
        title: row.r.name,
        subtitle: [`⭐ ${row.avg.toFixed(1)} app`, row.dist != null ? `a ${row.dist.toFixed(1)} km` : null].filter(Boolean).join(' · '),
        color: GREEN,
        to: `/restaurantes/${row.r.id}`,
      })
    }
    for (const p of suggested) {
      if (p.lat && p.lng) {
        const dist = center ? distanceKm(center, { lat: p.lat, lng: p.lng }) : null
        m.push({
          id: `g-${p.placeId}`,
          lat: p.lat,
          lng: p.lng,
          title: p.name,
          subtitle: [p.rating != null ? `⭐ ${p.rating.toFixed(1)} Google` : null, p.type, dist != null ? `a ${dist.toFixed(1)} km` : null].filter(Boolean).join(' · '),
          color: ORANGE,
        })
      }
    }
    return m
  }, [redRows, suggested, center])

  const scopeLabel = scope === 'me' ? 'tú' : scope === 'friends' ? 'amigos' : scope === 'group' ? 'grupos' : 'todos'

  return (
    <>
      {!embedded && (
        <header className="app-header">
          <h1>Explorar 🧭</h1>
        </header>
      )}
      <div className={embedded ? '' : 'app-main'}>
        {/* Ámbito */}
        <div className="row" style={{ gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <button className={`btn small ${scope === 'public' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setScope('public')}>🌐 Todos</button>
          <button className={`btn small ${scope === 'friends' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setScope('friends')}>🤝 Amigos</button>
          <button className={`btn small ${scope === 'group' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setScope('group')}>👥 Grupo</button>
          <button className={`btn small ${scope === 'me' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setScope('me')}>🙋 Yo</button>
        </div>

        {/* Ubicación */}
        <div className="card">
          <label className="field" style={{ marginBottom: 8 }}>
            <span>📍 Ubicación</span>
            <input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder={centerLabel ? `Centro: ${centerLabel}` : 'Escribe una dirección o lugar (ej. tu hotel)…'}
              autoComplete="off"
            />
          </label>
          {addrResults.map((p, i) => (
            <button key={i} type="button" className="list-item" onClick={() => pickAddress(p)} style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
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
                <button key={r} className={`btn small ${radiusKm === r ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setRadiusKm(r)}>{r} km</button>
              ))}
            </div>
          </label>
          <div className="row" style={{ gap: 8 }}>
            <label className="field" style={{ flex: 2, marginBottom: 0 }}>
              <span>Tipo de comida</span>
              <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                <option value="">Cualquier tipo</option>
                {CUISINES.map((c) => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </label>
            <label className="field" style={{ flex: 1, marginBottom: 0 }}>
              <span>Nota Google</span>
              <select value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
                {MIN_RATINGS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <button className={`btn small ${view === 'list' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setView('list')}>📋 Lista</button>
          <button className={`btn small ${view === 'map' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setView('map')}>🗺️ Mapa</button>
        </div>

        {!center ? (
          <div className="empty"><div className="big">📍</div><p>Activa tu ubicación o escribe una dirección para empezar.</p></div>
        ) : view === 'map' ? (
          markers.length === 0 ? (
            <div className="empty"><div className="big">🗺️</div><p>Sin lugares con esos filtros.</p></div>
          ) : (
            <>
              <MarkersMap
                markers={markers}
                height="56vh"
                origin={{ lat: center.lat, lng: center.lng, label: centerLabel || 'Tu ubicación' }}
                radiusMeters={radiusKm * 1000}
              />
              <div className="map-legend">
                <span><i className="dot" style={{ background: '#2b6cb0' }} /> {centerLabel || 'Tu ubicación'}</span>
                <span><i className="dot" style={{ background: GREEN }} /> Visitados ({scopeLabel})</span>
                <span><i className="dot" style={{ background: ORANGE }} /> Sugeridos</span>
              </div>
            </>
          )
        ) : (
          <>
            {/* De tu red según ámbito */}
            <div className="section-title">📍 Visitados — {scopeLabel}</div>
            {!loaded ? (
              <Spinner />
            ) : redRows.length === 0 ? (
              <div className="empty" style={{ padding: '24px' }}>
                <p>Nadie de este ámbito ha evaluado lugares en el radio.</p>
              </div>
            ) : (
              <div className="card">
                {redRows.map((row) => (
                  <button key={row.r.id} type="button" className="list-item" onClick={() => navigate(`/restaurantes/${row.r.id}`)} style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
                    {row.r.photos?.[0] ? (
                      <img src={row.r.photos[0]} alt="" className="thumb" />
                    ) : (
                      <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 22 }}>🍴</div>
                    )}
                    <div className="meta">
                      <div className="name">{row.r.name}</div>
                      <div className="sub">
                        {[row.r.cuisine ? cuisineLabel(row.r.cuisine) : null, `${row.count} eval.`, row.dist != null ? `${row.dist.toFixed(1)} km` : null].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                    <span className="badge" style={{ background: '#1f9d55' }}>⭐ {row.avg.toFixed(1)}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Sugeridos por Google */}
            {hasGooglePlaces && (
              <>
                <div className="section-title">✨ Sugeridos (Google)</div>
                {busy && results === null ? (
                  <Spinner label="Buscando cerca…" />
                ) : suggested.length === 0 ? (
                  <div className="empty" style={{ padding: 24 }}><p>{busy ? 'Buscando…' : 'Sin sugerencias con esos filtros.'}</p></div>
                ) : (
                  <div className="card">
                    {suggested.map((p, i) => {
                      const inList = p.placeId ? wishlistIds.has(p.placeId) : false
                      const dist = center ? distanceKm(center, { lat: p.lat, lng: p.lng }) : null
                      return (
                        <div className="list-item" key={p.placeId ?? i}>
                          <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 22 }}>📍</div>
                          <div className="meta">
                            <div className="name">{p.name}</div>
                            <div className="sub">
                              {p.rating != null ? `⭐ ${p.rating.toFixed(1)}` : 'sin nota'}
                              {p.type ? ` · ${p.type}` : ''}
                              {dist != null ? ` · ${dist.toFixed(1)} km` : ''}
                            </div>
                            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <button className="btn small secondary" disabled={inList} onClick={() => addToWishlist(p)}>
                                {inList ? '📌 En tu lista' : '📌 Wishlist'}
                              </button>
                              <button className="btn small" onClick={() => navigate('/restaurantes/nuevo', { state: { place: p } })}>+ Registrar</button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
