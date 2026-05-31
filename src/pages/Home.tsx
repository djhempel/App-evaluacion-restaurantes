import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listMyEvaluations } from '../lib/data'
import type { Evaluation } from '../types'
import { Spinner } from '../components/Spinner'
import { ScoreBadge } from '../components/ScoreBadge'
import { formatDate } from '../lib/utils'

export function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [evals, setEvals] = useState<Evaluation[] | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user) return
    listMyEvaluations(user.uid)
      .then(setEvals)
      .catch((e) => {
        console.error(e)
        setEvals([])
      })
  }, [user])

  if (evals === null) return <Spinner label="Cargando tu historial…" />

  const filtered = evals.filter((e) => {
    const q = search.toLowerCase()
    return (
      e.restaurantName?.toLowerCase().includes(q) ||
      e.dishName?.toLowerCase().includes(q) ||
      e.restaurantCuisine?.toLowerCase().includes(q)
    )
  })

  const avg =
    evals.length > 0
      ? evals.reduce((s, e) => s + e.finalScore, 0) / evals.length
      : 0

  return (
    <>
      <header className="app-header">
        <h1>Hola, {user?.displayName?.split(' ')[0] ?? ''} 👋</h1>
        <Link to="/wishlist" className="btn ghost" title="Por visitar">📌</Link>
      </header>
      <div className="app-main">
        {evals.length > 0 && (
          <div className="stat-grid" style={{ marginBottom: 16 }}>
            <Link to="/estadisticas" className="stat" style={{ textDecoration: 'none' }}>
              <div className="num">{evals.length}</div>
              <div className="lbl">Evaluaciones</div>
            </Link>
            <Link to="/ranking" className="stat" style={{ textDecoration: 'none' }}>
              <div className="num">{avg.toFixed(1)}</div>
              <div className="lbl">Promedio ⭐</div>
            </Link>
          </div>
        )}

        {evals.length > 0 && (
          <input
            placeholder="Buscar restaurante o plato…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 16 }}
          />
        )}

        {filtered.length === 0 ? (
          <div className="empty">
            <div className="big">🍽️</div>
            <h3>{evals.length === 0 ? 'Aún no tienes evaluaciones' : 'Sin resultados'}</h3>
            <p>
              {evals.length === 0
                ? 'Toca el botón naranja para evaluar tu primer restaurante.'
                : 'Prueba con otra búsqueda.'}
            </p>
          </div>
        ) : (
          <div className="card">
            {filtered.map((e) => (
              <Link
                key={e.id}
                to={`/evaluacion/${e.id}`}
                className="list-item"
                style={{ color: 'inherit' }}
              >
                {e.photos?.[0] ? (
                  <img src={e.photos[0]} alt="" className="thumb" />
                ) : (
                  <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 24 }}>🍽️</div>
                )}
                <div className="meta">
                  <div className="name">{e.restaurantName}</div>
                  <div className="sub">
                    {e.dishName ? `${e.dishName} · ` : ''}
                    {formatDate(e.createdAt)}
                  </div>
                </div>
                <ScoreBadge score={e.finalScore} />
              </Link>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => navigate('/evaluar')} aria-label="Nueva evaluación">
        +
      </button>
    </>
  )
}
