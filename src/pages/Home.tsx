import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listAllComments, listAllEvaluations, listAllLikes, listFriendUids, listMyGroups, setLike } from '../lib/data'
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
  const [view, setView] = useState<'feed' | 'fotos'>('feed')
  const [period, setPeriod] = useState<'week' | 'all'>('week')

  const [likeCounts, setLikeCounts] = useState<Map<string, number>>(new Map())
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set())
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (!user) return
    Promise.all([
      listAllEvaluations(),
      listFriendUids(user.uid),
      listMyGroups(user.uid),
      listAllLikes(),
      listAllComments(),
    ])
      .then(([all, fu, gs, likes, comments]) => {
        setEvals(all)
        setFriendUids(new Set(fu))
        setGroupIds(new Set(gs.map((g) => g.id)))
        const lc = new Map<string, number>()
        const mine = new Set<string>()
        for (const l of likes) {
          lc.set(l.evalId, (lc.get(l.evalId) ?? 0) + 1)
          if (l.uid === user.uid) mine.add(l.evalId)
        }
        const cc = new Map<string, number>()
        for (const c of comments) cc.set(c.evalId, (cc.get(c.evalId) ?? 0) + 1)
        setLikeCounts(lc)
        setMyLikes(mine)
        setCommentCounts(cc)
      })
      .catch(() => setEvals([]))
  }, [user])

  function toggleLike(evalId: string, liked: boolean) {
    if (!user) return
    setMyLikes((prev) => {
      const n = new Set(prev)
      if (liked) n.add(evalId)
      else n.delete(evalId)
      return n
    })
    setLikeCounts((prev) => {
      const n = new Map(prev)
      n.set(evalId, Math.max(0, (n.get(evalId) ?? 0) + (liked ? 1 : -1)))
      return n
    })
    setLike(evalId, user.uid, liked).catch(() => undefined)
  }

  const scoped = useMemo(() => {
    if (!evals) return []
    return evals.filter((e) => {
      if (scope === 'me') return e.userId === user?.uid
      if (scope === 'friends') return friendUids.has(e.userId)
      if (scope === 'group') return e.groupId && groupIds.has(e.groupId)
      return true // public
    })
  }, [evals, scope, user, friendUids, groupIds])

  // Recorte por período (semana = últimos 7 días).
  const periodScoped = useMemo(() => {
    if (period === 'all') return scoped
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    return scoped.filter((e) => (e.createdAt?.toMillis() ?? 0) >= since)
  }, [scoped, period])

  // Restaurantes en alza (mejor punteados en el período).
  const topRestaurants = useMemo(() => {
    const map = new Map<string, { id: string; name: string; sum: number; n: number; photo?: string }>()
    for (const e of periodScoped) {
      const cur = map.get(e.restaurantId) ?? { id: e.restaurantId, name: e.restaurantName, sum: 0, n: 0, photo: e.photos?.[0] }
      cur.sum += e.finalScore
      cur.n += 1
      if (!cur.photo && e.photos?.[0]) cur.photo = e.photos[0]
      map.set(e.restaurantId, cur)
    }
    return [...map.values()]
      .map((v) => ({ ...v, avg: v.sum / v.n }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10)
  }, [periodScoped])

  // Platos top (mejor punteados) dentro del ámbito y período.
  const topDishes = useMemo<TopDish[]>(() => {
    const map = new Map<string, { sum: number; n: number; d: TopDish }>()
    for (const e of periodScoped) {
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
  }, [periodScoped])

  const feed = useMemo(
    () =>
      [...scoped].sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)).slice(0, 30),
    [scoped],
  )

  // Galería de fotos de platos (del ámbito).
  const photos = useMemo(() => {
    const out: { photo: string; id: string }[] = []
    for (const e of feed) {
      const set = new Set<string>()
      for (const p of e.photos ?? []) set.add(p)
      for (const c of FOOD_CRITERIA) for (const d of e.dishEntries?.[c.key] ?? []) for (const p of d.photos ?? []) set.add(p)
      for (const p of set) out.push({ photo: p, id: e.id })
    }
    return out.slice(0, 60)
  }, [feed])

  if (evals === null) return <Spinner label="Cargando tu feed…" />

  const scopeLabel = scope === 'me' ? 'tuyos' : scope === 'friends' ? 'de amigos' : scope === 'group' ? 'de grupos' : 'de todos'

  return (
    <>
      <header className="app-header">
        <h1>Sabores 🍽️</h1>
        <Link to="/amigos" className="btn ghost" title="Buscar personas / amigos">🔍</Link>
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

        {/* Vista: feed o fotos */}
        <div className="row" style={{ gap: 8, marginBottom: 8 }}>
          <button className={`btn small ${view === 'feed' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setView('feed')}>📸 Feed</button>
          <button className={`btn small ${view === 'fotos' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setView('fotos')}>🖼️ Fotos</button>
        </div>

        {view === 'fotos' ? (
          photos.length === 0 ? (
            <div className="empty"><div className="big">🖼️</div><p>Aún no hay fotos en este ámbito.</p></div>
          ) : (
            <div className="grid-3">
              {photos.map((p, i) => (
                <Link key={i} to={`/evaluacion/${p.id}`} className="grid-cell">
                  <img src={p.photo} alt="" />
                </Link>
              ))}
            </div>
          )
        ) : (
        <>
        {/* Período */}
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <button className={`btn small ${period === 'week' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setPeriod('week')}>🗓️ Esta semana</button>
          <button className={`btn small ${period === 'all' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setPeriod('all')}>♾️ Siempre</button>
        </div>

        {/* Restaurantes en alza */}
        {topRestaurants.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 8 }}>📈 {period === 'week' ? 'En alza esta semana' : 'Mejores lugares'} {scopeLabel}</div>
            <div className="hscroll">
              {topRestaurants.map((r) => (
                <Link key={r.id} to={`/restaurantes/${r.id}`} className="dish-card">
                  {r.photo ? <img className="ph" src={r.photo} alt="" /> : <div className="ph placeholder">🍴</div>}
                  <div className="info">
                    <div className="dn">{r.name}</div>
                    <div className="ds">{r.n} {r.n === 1 ? 'evaluación' : 'evals'}</div>
                    <span className="badge" style={{ background: scoreColor(r.avg), marginTop: 6 }}>⭐ {r.avg.toFixed(1)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}

        {/* Platos top del ámbito */}
        {topDishes.length > 0 && (
          <>
            <div className="section-title" style={{ marginTop: 4 }}>🔥 Platos top {period === 'week' ? 'de la semana' : ''} {scopeLabel}</div>
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
            <FeedCard
              key={e.id}
              e={e}
              showAuthor={scope !== 'public' || e.userId === user?.uid}
              liked={myLikes.has(e.id)}
              likeCount={likeCounts.get(e.id) ?? 0}
              commentCount={commentCounts.get(e.id) ?? 0}
              onToggleLike={toggleLike}
            />
          ))
        )}
        </>
        )}
      </div>

      <button className="fab" onClick={() => navigate('/evaluar')} aria-label="Nueva evaluación">+</button>
    </>
  )
}
