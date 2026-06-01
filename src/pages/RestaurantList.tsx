import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { addWishlist, listRestaurants, listWishlist } from '../lib/data'
import {
  distanceKm,
  getCurrentPosition,
  hasGooglePlaces,
  searchNearbyPlaces,
  type PlaceResult,
} from '../lib/utils'
import type { Restaurant, WishlistItem } from '../types'
import { cuisineLabel } from '../config/cuisines'
import { Spinner } from '../components/Spinner'

const RADII = [
  { label: '1 km', m: 1000 },
  { label: '2 km', m: 2000 },
  { label: '5 km', m: 5000 },
]

export function RestaurantList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState<Restaurant[] | null>(null)
  const [search, setSearch] = useState('')
  const [mode, setMode] = useState<'mine' | 'discover'>('mine')

  // Descubrimiento cercano (Google).
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [radius, setRadius] = useState(2000)
  const [nearby, setNearby] = useState<PlaceResult[] | null>(null)
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [discovering, setDiscovering] = useState(false)

  useEffect(() => {
    listRestaurants()
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  useEffect(() => {
    if (!user) return
    listWishlist(user.uid).then(setWishlist).catch(() => setWishlist([]))
  }, [user])

  async function discover(r = radius) {
    setDiscovering(true)
    try {
      const pos = loc ?? (await getCurrentPosition())
      setLoc(pos)
      const results = await searchNearbyPlaces(pos.lat, pos.lng, r)
      setNearby(results)
      if (results.length === 0) toast('No se encontraron lugares cerca')
    } catch (e) {
      console.error(e)
      toast('No se pudo obtener tu ubicación o buscar cerca')
      setNearby([])
    } finally {
      setDiscovering(false)
    }
  }

  function goDiscover() {
    setMode('discover')
    if (nearby === null) discover()
  }

  async function addToWishlist(p: PlaceResult) {
    if (!user) return
    const payload = {
      userId: user.uid,
      name: p.name,
      address: p.address ?? '',
      note: p.rating != null ? `Google ${p.rating.toFixed(1)} ⭐` : '',
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      googlePlaceId: p.placeId ?? null,
      googleRating: p.rating ?? null,
      done: false,
      restaurantId: null,
    }
    const id = await addWishlist(payload)
    setWishlist((prev) => [{ id, ...payload }, ...prev])
    toast('Agregado a tu lista 📌')
  }

  if (items === null) return <Spinner label="Cargando restaurantes…" />

  const filtered = items.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.cuisine ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  const registeredByPlaceId = new Map(
    items.filter((r) => r.googlePlaceId).map((r) => [r.googlePlaceId as string, r]),
  )
  const wishlistPlaceIds = new Set(wishlist.map((w) => w.googlePlaceId).filter(Boolean))

  return (
    <>
      <header className="app-header">
        <h1>Restaurantes</h1>
      </header>
      <div className="app-main">
        {/* Conmutador Mis lugares / Descubrir */}
        <div className="row" style={{ marginBottom: 14 }}>
          <button
            className={`btn small ${mode === 'mine' ? '' : 'secondary'}`}
            style={{ flex: 1 }}
            onClick={() => setMode('mine')}
          >
            🍴 Mis lugares
          </button>
          <button
            className={`btn small ${mode === 'discover' ? '' : 'secondary'}`}
            style={{ flex: 1 }}
            onClick={goDiscover}
          >
            🧭 Descubrir cerca
          </button>
        </div>

        {mode === 'mine' ? (
          <>
            {items.length > 0 && (
              <input
                placeholder="Buscar…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginBottom: 16 }}
              />
            )}

            {filtered.length === 0 ? (
              <div className="empty">
                <div className="big">🍴</div>
                <h3>{items.length === 0 ? 'Sin restaurantes' : 'Sin resultados'}</h3>
                <p>Crea el primero o usa “Descubrir cerca”.</p>
                <button className="btn" onClick={() => navigate('/restaurantes/nuevo')}>
                  + Crear restaurante
                </button>
              </div>
            ) : (
              <div className="card">
                {filtered.map((r) => (
                  <Link key={r.id} to={`/restaurantes/${r.id}`} className="list-item" style={{ color: 'inherit' }}>
                    {r.photos?.[0] ? (
                      <img src={r.photos[0]} alt="" className="thumb" />
                    ) : (
                      <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 24 }}>🍴</div>
                    )}
                    <div className="meta">
                      <div className="name">{r.name}</div>
                      <div className="sub">
                        {r.cuisine ? `${cuisineLabel(r.cuisine)} · ` : ''}
                        {r.dishes?.length ?? 0} platos
                        {r.googleRating != null ? ` · ⭐ ${r.googleRating.toFixed(1)}` : ''}
                      </div>
                    </div>
                    <span style={{ color: 'var(--muted)' }}>›</span>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {!hasGooglePlaces ? (
              <div className="empty">
                <div className="big">🧭</div>
                <p>El descubrimiento usa Google. Configura la API key para activarlo.</p>
              </div>
            ) : (
              <>
                <div className="row" style={{ marginBottom: 12, gap: 8 }}>
                  {RADII.map((r) => (
                    <button
                      key={r.m}
                      className={`btn small ${radius === r.m ? '' : 'secondary'}`}
                      style={{ flex: 1 }}
                      onClick={() => {
                        setRadius(r.m)
                        discover(r.m)
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>

                {discovering ? (
                  <Spinner label="Buscando lugares cerca…" />
                ) : nearby && nearby.length > 0 ? (
                  <div className="card">
                    {nearby.map((p, i) => {
                      const registered = p.placeId ? registeredByPlaceId.get(p.placeId) : undefined
                      const inWishlist = p.placeId ? wishlistPlaceIds.has(p.placeId) : false
                      const dist = loc ? distanceKm(loc, { lat: p.lat, lng: p.lng }) : null
                      return (
                        <div className="list-item" key={p.placeId ?? i}>
                          <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 22 }}>
                            {registered ? '✅' : '📍'}
                          </div>
                          <div className="meta">
                            <div className="name">{p.name}</div>
                            <div className="sub">
                              {p.rating != null ? `⭐ ${p.rating.toFixed(1)}` : 'sin nota'}
                              {p.type ? ` · ${p.type}` : ''}
                              {dist != null ? ` · ${dist.toFixed(1)} km` : ''}
                            </div>
                            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              {registered ? (
                                <button
                                  className="btn small"
                                  onClick={() => navigate(`/restaurantes/${registered.id}`)}
                                >
                                  Ver ficha ›
                                </button>
                              ) : (
                                <>
                                  <button
                                    className="btn small secondary"
                                    disabled={inWishlist}
                                    onClick={() => addToWishlist(p)}
                                  >
                                    {inWishlist ? '📌 En tu lista' : '📌 Wishlist'}
                                  </button>
                                  <button
                                    className="btn small"
                                    onClick={() => navigate('/restaurantes/nuevo', { state: { place: p } })}
                                  >
                                    + Registrar
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="empty">
                    <div className="big">🧭</div>
                    <p>Toca un radio para buscar restaurantes cerca de ti.</p>
                    <button className="btn" onClick={() => discover()}>Buscar cerca</button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <button className="fab" onClick={() => navigate('/restaurantes/nuevo')} aria-label="Nuevo restaurante">
        +
      </button>
    </>
  )
}
