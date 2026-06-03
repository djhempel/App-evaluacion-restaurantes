import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { addComment, listAllComments, listAllEvaluations, listAllLikes, listFriendUids, listIncomingRequests, setLike } from '../lib/data'
import { FOOD_CRITERIA } from '../config/scoring'
import type { EvalComment, Evaluation } from '../types'
import { Spinner } from '../components/Spinner'
import { FeedCard } from '../components/FeedCard'
import { DishFeedCard, type DishPost } from '../components/DishFeedCard'

export function Home() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [evals, setEvals] = useState<Evaluation[] | null>(null)
  const [friendUids, setFriendUids] = useState<Set<string>>(new Set())
  const [group, setGroup] = useState<'evals' | 'platos'>('evals')

  const [likeCounts, setLikeCounts] = useState<Map<string, number>>(new Map())
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set())
  const [commentsByEval, setCommentsByEval] = useState<Map<string, EvalComment[]>>(new Map())
  const [notifCount, setNotifCount] = useState(0)
  const [showOnboard, setShowOnboard] = useState(() => !localStorage.getItem('onboardDone'))

  useEffect(() => {
    if (!user) return
    Promise.all([listAllEvaluations(), listFriendUids(user.uid), listAllLikes(), listAllComments(), listIncomingRequests(user.uid)])
      .then(([all, fu, likes, comments, requests]) => {
        setEvals(all)
        setFriendUids(new Set(fu))

        // Badge de notificaciones: solicitudes + likes/comentarios nuevos a lo tuyo.
        const myEvalIds = new Set(all.filter((e) => e.userId === user.uid).map((e) => e.id))
        const seen = Number(localStorage.getItem('notifSeen') || 0)
        let cnt = requests.length
        for (const l of likes) if (myEvalIds.has(l.evalId) && l.uid !== user.uid && (l.createdAt?.toMillis() ?? 0) > seen) cnt++
        for (const c of comments) if (myEvalIds.has(c.evalId) && c.uid !== user.uid && (c.createdAt?.toMillis() ?? 0) > seen) cnt++
        setNotifCount(cnt)
        const lc = new Map<string, number>()
        const mine = new Set<string>()
        for (const l of likes) {
          lc.set(l.evalId, (lc.get(l.evalId) ?? 0) + 1)
          if (l.uid === user.uid) mine.add(l.evalId)
        }
        const cmap = new Map<string, EvalComment[]>()
        for (const c of comments) {
          const arr = cmap.get(c.evalId) ?? []
          arr.push(c)
          cmap.set(c.evalId, arr)
        }
        for (const arr of cmap.values())
          arr.sort((a, b) => (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0))
        setLikeCounts(lc)
        setMyLikes(mine)
        setCommentsByEval(cmap)
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

  function addCommentInline(evalId: string, text: string) {
    if (!user || !text.trim()) return
    const c: EvalComment = {
      id: crypto.randomUUID(),
      evalId,
      uid: user.uid,
      userName: user.displayName ?? 'Anónimo',
      userPhoto: user.photoURL ?? '',
      text: text.trim(),
    }
    setCommentsByEval((prev) => {
      const n = new Map(prev)
      n.set(evalId, [...(n.get(evalId) ?? []), c])
      return n
    })
    addComment(evalId, user, text.trim()).catch(() => undefined)
  }

  // Feed = amigos (y tus propias publicaciones).
  const feed = useMemo(() => {
    if (!evals || !user) return []
    return evals
      .filter((e) => friendUids.has(e.userId) || e.userId === user.uid)
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
  }, [evals, friendUids, user])

  const dishPosts = useMemo<DishPost[]>(() => {
    const out: DishPost[] = []
    for (const e of feed) {
      for (const c of FOOD_CRITERIA) {
        for (const d of e.dishEntries?.[c.key] ?? []) {
          if (!d.name && !d.photos?.[0]) continue
          out.push({
            key: `${e.id}-${c.key}-${d.id}`,
            e,
            emoji: c.emoji,
            name: d.name || c.label,
            score: d.score,
            comment: d.comment,
            photo: d.photos?.[0],
          })
        }
      }
    }
    return out
  }, [feed])

  if (evals === null) return <Spinner label="Cargando tu feed…" />

  return (
    <>
      <header className="app-header">
        <h1>Feed 📸</h1>
        <Link to="/amigos" className="btn ghost" title="Amigos">🤝</Link>
        <Link to="/notificaciones" className="btn ghost" title="Notificaciones" style={{ position: 'relative' }}>
          🔔
          {notifCount > 0 && <span className="notif-badge">{notifCount > 9 ? '9+' : notifCount}</span>}
        </Link>
      </header>
      <div className="app-main">
        {showOnboard && (
          <div className="card onboard">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>👋 ¡Bienvenido!</h3>
              <button className="btn ghost small" onClick={() => { localStorage.setItem('onboardDone', '1'); setShowOnboard(false) }} style={{ color: 'var(--muted)' }}>✕</button>
            </div>
            <p className="hint" style={{ marginTop: 6 }}>En 3 pasos le sacas el jugo:</p>
            <button className="btn block" onClick={() => navigate('/evaluar')} style={{ marginBottom: 8 }}>⭐ Evalúa tu primer lugar</button>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn secondary small" style={{ flex: 1 }} onClick={() => navigate('/amigos')}>🤝 Buscar amigos</button>
              <button className="btn secondary small" style={{ flex: 1 }} onClick={() => navigate('/descubrir')}>🧭 Descubrir</button>
            </div>
          </div>
        )}

        {/* Agrupar por */}
        <div className="row" style={{ gap: 8, marginBottom: 14 }}>
          <button className={`btn small ${group === 'evals' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setGroup('evals')}>
            🍽️ Por evaluaciones
          </button>
          <button className={`btn small ${group === 'platos' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setGroup('platos')}>
            🍴 Por platos
          </button>
        </div>

        {feed.length === 0 ? (
          <div className="empty">
            <div className="big">🤝</div>
            <h3>Tu feed está vacío</h3>
            <p>Agrega amigos para ver qué están comiendo, o evalúa tu primer lugar.</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn" onClick={() => navigate('/amigos')}>Buscar amigos</button>
              <button className="btn secondary" onClick={() => navigate('/evaluar')}>Evaluar</button>
            </div>
          </div>
        ) : group === 'platos' ? (
          dishPosts.length === 0 ? (
            <div className="empty"><div className="big">🍴</div><p>Tus amigos aún no registran platos con detalle.</p></div>
          ) : (
            dishPosts.map((p) => <DishFeedCard key={p.key} post={p} showAuthor={true} />)
          )
        ) : (
          feed.map((e) => (
            <FeedCard
              key={e.id}
              e={e}
              showAuthor={true}
              liked={myLikes.has(e.id)}
              likeCount={likeCounts.get(e.id) ?? 0}
              comments={commentsByEval.get(e.id) ?? []}
              onToggleLike={toggleLike}
              onAddComment={addCommentInline}
            />
          ))
        )}
      </div>
    </>
  )
}
