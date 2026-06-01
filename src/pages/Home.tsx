import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listEvaluationsByGroup, listMyEvaluations, listMyGroups } from '../lib/data'
import { discoverPlaces, getCurrentPosition, hasGooglePlaces, type PlaceResult } from '../lib/utils'
import type { Evaluation } from '../types'
import { Spinner } from '../components/Spinner'
import { ScoreBadge } from '../components/ScoreBadge'
import { formatDate } from '../lib/utils'

// Cache de recomendaciones cercanas durante la sesión (evita llamadas repetidas a Google).
let nearbyCache: { ts: number; items: PlaceResult[] } | null = null

export function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [evals, setEvals] = useState<Evaluation[] | null>(null)
  const [groupNews, setGroupNews] = useState<Evaluation[]>([])
  const [nearby, setNearby] = useState<PlaceResult[] | null>(nearbyCache?.items ?? null)

  useEffect(() => {
    if (!user) return
    listMyEvaluations(user.uid)
      .then(setEvals)
      .catch(() => setEvals([]))

    listMyGroups(user.uid)
      .then(async (groups) => {
        const lists = await Promise.all(groups.map((g) => listEvaluationsByGroup(g.id)))
        const all = lists.flat().filter((e) => e.userId !== user.uid)
        all.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
        setGroupNews(all.slice(0, 5))
      })
      .catch(() => setGroupNews([]))
  }, [user])

  useEffect(() => {
    if (!hasGooglePlaces) return
    if (nearbyCache && Date.now() - nearbyCache.ts < 10 * 60 * 1000) {
      setNearby(nearbyCache.items)
      return
    }
    getCurrentPosition()
      .then((pos) => discoverPlaces(pos.lat, pos.lng, 2500))
      .then((items) => {
        const top = [...items].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 4)
        nearbyCache = { ts: Date.now(), items: top }
        setNearby(top)
      })
      .catch(() => setNearby([]))
  }, [])

  if (evals === null) return <Spinner label="Cargando…" />

  const avg = evals.length > 0 ? evals.reduce((s, e) => s + e.finalScore, 0) / evals.length : 0
  const best = [...evals].sort((a, b) => b.finalScore - a.finalScore).slice(0, 3)
  const recent = evals.slice(0, 4)

  return (
    <>
      <header className="app-header">
        <h1>Hola, {user?.displayName?.split(' ')[0] ?? ''} 👋</h1>
      </header>
      <div className="app-main">
        {/* Stats */}
        <div className="stat-grid" style={{ marginBottom: 14 }}>
          <Link to="/estadisticas" className="stat" style={{ textDecoration: 'none' }}>
            <div className="num">{evals.length}</div>
            <div className="lbl">Evaluaciones</div>
          </Link>
          <Link to="/ranking" className="stat" style={{ textDecoration: 'none' }}>
            <div className="num">{evals.length ? avg.toFixed(1) : '—'}</div>
            <div className="lbl">Promedio ⭐</div>
          </Link>
        </div>

        {/* Acciones rápidas */}
        <div className="row" style={{ gap: 8, marginBottom: 18 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => navigate('/evaluar')}>⭐ Evaluar</button>
          <button className="btn secondary" style={{ flex: 1 }} onClick={() => navigate('/explorar')}>🧭 Explorar cerca</button>
        </div>

        {/* Recomendados cerca (Google) */}
        {hasGooglePlaces && nearby && nearby.length > 0 && (
          <>
            <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>📍 Recomendados cerca</span>
              <Link to="/explorar" className="sub" style={{ alignSelf: 'center' }}>Ver más ›</Link>
            </div>
            <div className="card">
              {nearby.map((p, i) => (
                <button
                  key={p.placeId ?? i}
                  type="button"
                  className="list-item"
                  onClick={() => navigate('/restaurantes/nuevo', { state: { place: p } })}
                  style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
                >
                  <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 22 }}>📍</div>
                  <div className="meta">
                    <div className="name">{p.name}</div>
                    <div className="sub">
                      {p.rating != null ? `⭐ ${p.rating.toFixed(1)} Google` : 'sin nota'}
                      {p.type ? ` · ${p.type}` : ''}
                    </div>
                  </div>
                  <span style={{ color: 'var(--muted)' }}>›</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Novedades de grupos */}
        {groupNews.length > 0 && (
          <>
            <div className="section-title">👥 Novedades de tus grupos</div>
            <div className="card">
              {groupNews.map((e) => (
                <Link key={e.id} to={`/evaluacion/${e.id}`} className="list-item" style={{ color: 'inherit' }}>
                  {e.photos?.[0] ? (
                    <img src={e.photos[0]} alt="" className="thumb" />
                  ) : (
                    <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 22 }}>🍽️</div>
                  )}
                  <div className="meta">
                    <div className="name">{e.restaurantName}</div>
                    <div className="sub">{e.userName} · {formatDate(e.createdAt)}</div>
                  </div>
                  <ScoreBadge score={e.finalScore} />
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Mejores evaluados (tuyos) */}
        {best.length > 0 && (
          <>
            <div className="section-title">🏆 Tus mejores evaluados</div>
            <div className="card">
              {best.map((e) => (
                <Link key={e.id} to={`/evaluacion/${e.id}`} className="list-item" style={{ color: 'inherit' }}>
                  <div className="meta">
                    <div className="name">{e.restaurantName}</div>
                    <div className="sub">{e.dishName ? `${e.dishName} · ` : ''}{formatDate(e.createdAt)}</div>
                  </div>
                  <ScoreBadge score={e.finalScore} />
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Últimas evaluaciones */}
        <div className="section-title">🕒 Tus últimas evaluaciones</div>
        {recent.length === 0 ? (
          <div className="empty">
            <div className="big">🍽️</div>
            <p>Aún no tienes evaluaciones. Toca “⭐ Evaluar” para empezar.</p>
          </div>
        ) : (
          <div className="card">
            {recent.map((e) => (
              <Link key={e.id} to={`/evaluacion/${e.id}`} className="list-item" style={{ color: 'inherit' }}>
                {e.photos?.[0] ? (
                  <img src={e.photos[0]} alt="" className="thumb" />
                ) : (
                  <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 22 }}>🍽️</div>
                )}
                <div className="meta">
                  <div className="name">{e.restaurantName}</div>
                  <div className="sub">{e.dishName ? `${e.dishName} · ` : ''}{formatDate(e.createdAt)}</div>
                </div>
                <ScoreBadge score={e.finalScore} />
              </Link>
            ))}
          </div>
        )}
      </div>

      <button className="fab" onClick={() => navigate('/evaluar')} aria-label="Nueva evaluación">+</button>
    </>
  )
}
