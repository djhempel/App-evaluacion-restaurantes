import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listPublicEvaluations, listMyEvaluations } from '../lib/data'
import type { Evaluation } from '../types'
import { Spinner } from '../components/Spinner'
import { ScoreBadge } from '../components/ScoreBadge'
import { scoreColor } from '../config/scoring'

interface RankRow {
  restaurantId: string
  name: string
  cuisine?: string
  count: number
  avg: number
}

export function Ranking() {
  const { user } = useAuth()
  const [scope, setScope] = useState<'mine' | 'all'>('mine')
  const [evals, setEvals] = useState<Evaluation[] | null>(null)

  useEffect(() => {
    setEvals(null)
    const loader =
      scope === 'mine' && user ? listMyEvaluations(user.uid) : listPublicEvaluations()
    loader.then(setEvals).catch(() => setEvals([]))
  }, [scope, user])

  const rows = useMemo<RankRow[]>(() => {
    if (!evals) return []
    const map = new Map<string, RankRow & { sum: number }>()
    for (const e of evals) {
      const cur = map.get(e.restaurantId) ?? {
        restaurantId: e.restaurantId,
        name: e.restaurantName,
        cuisine: e.restaurantCuisine,
        count: 0,
        sum: 0,
        avg: 0,
      }
      cur.count += 1
      cur.sum += e.finalScore
      cur.avg = cur.sum / cur.count
      map.set(e.restaurantId, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.avg - a.avg)
  }, [evals])

  if (evals === null) return <Spinner label="Calculando ranking…" />

  return (
    <>
      <header className="app-header">
        <h1>Ranking 🏆</h1>
      </header>
      <div className="app-main">
        <div className="tabs">
          <button className={scope === 'mine' ? 'active' : ''} onClick={() => setScope('mine')}>
            Mis notas
          </button>
          <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>
            Todos
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            <div className="big">🏆</div>
            <p>Aún no hay datos suficientes para un ranking.</p>
          </div>
        ) : (
          <div className="card">
            {rows.map((r, i) => (
              <Link key={r.restaurantId} to={`/restaurantes/${r.restaurantId}`} className="list-item" style={{ color: 'inherit' }}>
                <span className="rank-num" style={{ color: i < 3 ? scoreColor(r.avg) : undefined }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                <div className="meta">
                  <div className="name">{r.name}</div>
                  <div className="sub">
                    {r.cuisine ? `${r.cuisine} · ` : ''}
                    {r.count} {r.count === 1 ? 'evaluación' : 'evaluaciones'}
                  </div>
                </div>
                <ScoreBadge score={r.avg} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
