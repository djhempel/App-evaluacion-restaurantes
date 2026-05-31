import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listRestaurants } from '../lib/data'
import type { Restaurant } from '../types'
import { Spinner } from '../components/Spinner'

export function RestaurantList() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Restaurant[] | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    listRestaurants()
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  if (items === null) return <Spinner label="Cargando restaurantes…" />

  const filtered = items.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      (r.cuisine ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <header className="app-header">
        <h1>Restaurantes</h1>
      </header>
      <div className="app-main">
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
            <p>Crea el primero para empezar a evaluar.</p>
            <button className="btn" onClick={() => navigate('/restaurantes/nuevo')}>
              + Crear restaurante
            </button>
          </div>
        ) : (
          <div className="card">
            {filtered.map((r) => (
              <Link
                key={r.id}
                to={`/restaurantes/${r.id}`}
                className="list-item"
                style={{ color: 'inherit' }}
              >
                {r.photos?.[0] ? (
                  <img src={r.photos[0]} alt="" className="thumb" />
                ) : (
                  <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 24 }}>🍴</div>
                )}
                <div className="meta">
                  <div className="name">{r.name}</div>
                  <div className="sub">
                    {r.cuisine ? `${r.cuisine} · ` : ''}
                    {r.dishes?.length ?? 0} platos
                  </div>
                </div>
                <span style={{ color: 'var(--muted)' }}>›</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => navigate('/restaurantes/nuevo')} aria-label="Nuevo restaurante">
        +
      </button>
    </>
  )
}
