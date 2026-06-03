import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listMyEvaluations } from '../lib/data'
import { CRITERIA, scoreColor } from '../config/scoring'
import { FOOD_CRITERIA } from '../config/scoring'
import type { Evaluation } from '../types'

function cellPhoto(e: Evaluation): string | undefined {
  if (e.photos?.[0]) return e.photos[0]
  for (const c of FOOD_CRITERIA) for (const d of e.dishEntries?.[c.key] ?? []) if (d.photos?.[0]) return d.photos[0]
  return undefined
}

export function Profile() {
  const { user, logout } = useAuth()
  const [evals, setEvals] = useState<Evaluation[]>([])

  useEffect(() => {
    if (!user) return
    listMyEvaluations(user.uid).then(setEvals).catch(() => setEvals([]))
  }, [user])

  const avg = evals.length > 0 ? evals.reduce((s, e) => s + e.finalScore, 0) / evals.length : 0

  return (
    <>
      <header className="app-header">
        <h1>Perfil</h1>
      </header>
      <div className="app-main">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 36, background: '#f0e6db' }}>👤</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 2px' }}>{user?.displayName}</h2>
            <p className="muted" style={{ margin: 0, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              <div><b style={{ fontFamily: 'var(--display)' }}>{evals.length}</b> <span className="muted" style={{ fontSize: 12 }}>evals</span></div>
              <div><b style={{ fontFamily: 'var(--display)' }}>{evals.length ? avg.toFixed(1) : '—'}</b> <span className="muted" style={{ fontSize: 12 }}>promedio</span></div>
            </div>
          </div>
        </div>

        {/* Grilla de evaluaciones */}
        <div className="section-title">Tus evaluaciones</div>
        {evals.length === 0 ? (
          <div className="empty" style={{ padding: 28 }}>
            <div className="big">📸</div>
            <p>Aún no publicas. ¡Evalúa tu primer plato!</p>
          </div>
        ) : (
          <div className="grid-3">
            {evals.map((e) => {
              const ph = cellPhoto(e)
              return (
                <Link key={e.id} to={`/evaluacion/${e.id}`} className="grid-cell">
                  {ph ? <img src={ph} alt="" /> : <div className="ph">🍽️</div>}
                  <span className="sc" style={{ background: scoreColor(e.finalScore) }}>{e.finalScore.toFixed(1)}</span>
                </Link>
              )
            })}
          </div>
        )}

        <div className="section-title">Tu actividad</div>
        <div className="card" style={{ padding: 0 }}>
          {[
            { to: '/estadisticas', icon: '📊', label: 'Estadísticas' },
            { to: '/ranking', icon: '🏆', label: '¿Dónde ir? · Ranking' },
            { to: '/wishlist', icon: '📌', label: 'Por visitar' },
            { to: '/grupos', icon: '👥', label: 'Grupos' },
            { to: '/amigos', icon: '🤝', label: 'Amigos' },
            { to: '/restaurantes/nuevo', icon: '➕', label: 'Crear restaurante' },
          ].map((it) => (
            <Link key={it.to} to={it.to} className="list-item" style={{ color: 'inherit', padding: 16 }}>
              <span style={{ fontSize: 22 }}>{it.icon}</span>
              <div className="meta"><div className="name">{it.label}</div></div>
              <span style={{ color: 'var(--muted)' }}>›</span>
            </Link>
          ))}
        </div>

        <div className="section-title">Cómo se calcula la nota</div>
        <div className="card">
          {CRITERIA.map((c) => (
            <div key={c.key} className="list-item">
              <span style={{ fontSize: 22 }}>{c.emoji}</span>
              <div className="meta"><div className="name">{c.label}</div></div>
              <span className="chip">{Math.round(c.weight * 100)}%</span>
            </div>
          ))}
          <p className="hint" style={{ marginBottom: 0 }}>
            Si marcas un criterio como “No aplica”, su peso se reparte entre los demás.
          </p>
        </div>

        <button className="btn secondary block" onClick={() => logout()} style={{ marginTop: 8 }}>
          Cerrar sesión
        </button>
      </div>
    </>
  )
}
