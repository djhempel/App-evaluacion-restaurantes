import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { listGroupWishlist, listMyGroups, listRestaurants, listWishlist } from '../lib/data'
import { cuisineLabel } from '../config/cuisines'
import type { Restaurant, WishlistItem } from '../types'
import { Spinner } from '../components/Spinner'
import { MarkersMap, type MapMarker } from '../components/MarkersMap'

const GREEN = '#1f9d55' // visitados / registrados
const ORANGE = '#e8730c' // por visitar (wishlist)

export function MapView() {
  const { user } = useAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [show, setShow] = useState<{ visited: boolean; pending: boolean }>({
    visited: true,
    pending: true,
  })

  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        const [rest, mine, groups] = await Promise.all([
          listRestaurants(),
          listWishlist(user!.uid),
          listMyGroups(user!.uid),
        ])
        const groupLists = await Promise.all(groups.map((g) => listGroupWishlist(g.id)))
        // Combina wishlist personal + de grupos, sin duplicar por id.
        const byId = new Map<string, WishlistItem>()
        for (const w of [...mine, ...groupLists.flat()]) byId.set(w.id, w)
        setRestaurants(rest)
        setWishlist([...byId.values()])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  if (loading) return <Spinner label="Cargando mapa…" />

  const markers: MapMarker[] = []
  if (show.visited) {
    for (const r of restaurants) {
      if (r.lat != null && r.lng != null) {
        markers.push({
          id: `r-${r.id}`,
          lat: r.lat,
          lng: r.lng,
          title: r.name,
          subtitle: cuisineLabel(r.cuisine) || (r.googleRating != null ? `⭐ ${r.googleRating}` : undefined),
          color: GREEN,
          to: `/restaurantes/${r.id}`,
        })
      }
    }
  }
  if (show.pending) {
    for (const w of wishlist) {
      if (!w.done && w.lat != null && w.lng != null) {
        markers.push({
          id: `w-${w.id}`,
          lat: w.lat,
          lng: w.lng,
          title: w.name,
          subtitle: [cuisineLabel(w.cuisine), w.groupId ? '👥 grupo' : null]
            .filter(Boolean)
            .join(' · ') || undefined,
          color: ORANGE,
        })
      }
    }
  }

  return (
    <>
      <header className="app-header">
        <h1>Mapa 🗺️</h1>
      </header>
      <div className="app-main">
        <div className="row" style={{ marginBottom: 12, gap: 8 }}>
          <button
            className={`btn small ${show.visited ? '' : 'secondary'}`}
            style={{ flex: 1 }}
            onClick={() => setShow((s) => ({ ...s, visited: !s.visited }))}
          >
            🟢 Visitados
          </button>
          <button
            className={`btn small ${show.pending ? '' : 'secondary'}`}
            style={{ flex: 1 }}
            onClick={() => setShow((s) => ({ ...s, pending: !s.pending }))}
          >
            🟠 Por visitar
          </button>
        </div>

        {markers.length === 0 ? (
          <div className="empty">
            <div className="big">🗺️</div>
            <p>Nada que mostrar con ubicación todavía. Agrega lugares (con ubicación) o a tu wishlist.</p>
          </div>
        ) : (
          <MarkersMap markers={markers} />
        )}
      </div>
    </>
  )
}
