import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listAllEvaluations, listFriendUids, listMyGroups } from '../lib/data'
import { FOOD_CRITERIA, scoreColor } from '../config/scoring'
import type { Evaluation, FeedScope } from '../types'
import { Spinner } from '../components/Spinner'
import { FeedCard } from '../components/FeedCard'

interface TopDish {
  key: string
  name: string
  emoji: string
  restaurantId: string
  restaurantName: string
  avg: number
  photo?: string
}

export function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [evals, setEvals] = useState<Evaluation[] | null>(null)
  const [friendUids, setFriendUids] = useState<Set<string>>(new Set())
  const [groupIds, setGroupIds] = useState<Set<string>>(new Set())
  const [scope, setScope] = useState<FeedScope>('public')

  useEffect(() => {
    if (!user) return
    Promise.all([listAllEvaluations(), listFriendUids(user.uid), listMyGroups(user.uid)])
      .then(([all, fu, gs]) => {
        setEvals(all)
        setFriendUids(new Set(fu))
        setGroupIds(new Set(gs.map((g) => g.id)))
      })
      .catch(() => setEvals([]))
  }, [user])

  const scoped = useMemo(() => {
    if (!evals) return []
    return evals.filter((e) => {
      if (scope === 'me') return e.userId === user?.uid
      if (scope === 'friends') return friendUids.has(e.userId)
      if (scope === 'group') return e.groupId && groupIds.has(e.groupId)
      return true // public
    })
  }, [evals, scope, user, friendUids, groupIds])

  // Platos top (mejor punteados) dentro del ámbito.
  const topDishes = useMemo<TopDish[]>(() => {
    const map = new Map<string, { sum: number; n: number; d: TopDish }>()
    for (const e of scoped) {
      for (const c of FOOD_CRITERIA) {
        for (const dish of e.dishEntries?.[c.key] ?? []) {
          if (!dish.name) continue
          const key = `${e.restaurantId}|${dish.name.trim().toLowerCase()}`
          const cur = map.get(key) ?? {
            sum: 0,
            n: 0,
            d: {
              key,
              name: dish.name,
              emoji: c.emoji,
              restaurantId: e.restaurantId,
              restaurantName: e.restaurantName,
              avg: 0,
              photo: dish.photos?.[0],
            },
          }
          cur.sum += dish.score
          cur.n += 1
          if (!cur.d.photo && dish.photos?.[0]) cur.d.photo = dish.photos[0]
          map.set(key, cur)
        }
      }
    }
    return [...map.values()]
      .map((v) => ({ ...v.d, avg: v.sum / v.n }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10)
  }, [scoped])

  const feed = useMemo(
    () =>
      [...scoped].sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)).slice(0, 30),
    [scoped],
  )

  if (evals === null) return <Spinner label="Cargando tu feed…" />

  const scopeLabel = scope === 'me' ? 'tuyos' : scope === 'friends' ? 'de amigos' : scope === 'group' ? 'de grupos' : 'de todos'

  return (
    <>
      <header className="app-header">
        <h1>Sabores 🍽️</h1>
        <Link to="/amigos" className="btn ghost" title="Amigos">🤝</Link>
      </header>
      <div className="app-main">
        {/* Acciones rápidas */}
        <div className="row" style={{ gap: 8, marginBottom: 14 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => navigate('/evaluar')}>⭐ Evaluar</button>
          <button className="btn secondary" style={{ flex: 1 }} onClick={() => navigate('/explorar')}>🧭 Explorar</button>
          <button className="btn secondary" style={{ flex: 1 }} onClick={() => navigate('/ranking')}>🏆 Ranking</button>
        </div>

        {/* Ámbito del feed */}
        <div className="row" style={{ gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
          <button className={`btn small ${scope === 'public' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setScope('public')}>🌐 Todos</button>
          <button className={`btn small ${scope === 'friends' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setScope('friends')}>🤝 Amigos</button>
          <button className={`btn small ${scope === 'group' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setScope('group')}>👥 Grupo</button>
          <button className={`btn small ${scope === 'me' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setScope('me')}>🙋 Yo</button>
        </div>

        {/* Platos top del ámbito */}
        {topDishes.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 4 }}>🔥 Platos top {scopeLabel}</div>
            <div className="hscroll">
              {topDishes.map((d) => (
                <Link key={d.key} to={`/restaurantes/${d.restaurantId}`} className="dish-card">
                  {d.photo ? (
                    <img className="ph" src={d.photo} alt="" />
                  ) : (
                    <div className="ph placeholder">{d.emoji}</div>
                  )}
                  <div className="info">
                    <div className="dn">{d.emoji} {d.name}</div>
                    <div className="ds">{d.restaurantName}</div>
                    <span className="badge" style={{ background: scoreColor(d.avg), marginTop: 6 }}>⭐ {d.avg.toFixed(1)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Feed */}
        <div className="section-title">📸 Feed {scopeLabel}</div>
        {feed.length === 0 ? (
          <div className="empty">
            <div className="big">🍽️</div>
            <p>
              {scope === 'friends'
                ? 'Tus amigos aún no publican. Agrega amigos o mira el feed de Todos.'
                : scope === 'group'
                  ? 'Tus grupos aún no tienen evaluaciones.'
                  : scope === 'me'
                    ? 'Aún no has evaluado. ¡Evalúa tu primer plato!'
                    : 'Aún no hay evaluaciones en el ecosistema.'}
            </p>
            <button className="btn" onClick={() => navigate('/evaluar')}>⭐ Evaluar</button>
          </div>
        ) : (
          feed.map((e) => (
            <FeedCard key={e.id} e={e} showAuthor={scope !== 'public' || e.userId === user?.uid} />
          ))
        )}
      </div>

      <button className="fab" onClick={() => navigate('/evaluar')} aria-label="Nueva evaluación">+</button>
    </>
  )
}
