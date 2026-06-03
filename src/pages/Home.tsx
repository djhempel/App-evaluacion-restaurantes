import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listAllComments, listAllEvaluations, listAllLikes, listFriendUids, setLike } from '../lib/data'
import { FOOD_CRITERIA } from '../config/scoring'
import type { Evaluation } from '../types'
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
  const [commentCounts, setCommentCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (!user) return
    Promise.all([listAllEvaluations(), listFriendUids(user.uid), listAllLikes(), listAllComments()])
      .then(([all, fu, likes, comments]) => {
        setEvals(all)
        setFriendUids(new Set(fu))
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
      </header>
      <div className="app-main">
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
              commentCount={commentCounts.get(e.id) ?? 0}
              onToggleLike={toggleLike}
            />
          ))
        )}
      </div>

      <button className="fab" onClick={() => navigate('/evaluar')} aria-label="Nueva evaluación">+</button>
    </>
  )
}
