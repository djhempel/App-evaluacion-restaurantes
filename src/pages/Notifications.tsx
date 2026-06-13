import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { SubHeader } from '../components/Layout'
import { Spinner } from '../components/Spinner'
import {
  getUserProfile,
  listAllComments,
  listAllLikes,
  listIncomingRequests,
  listMyEvaluations,
} from '../lib/data'
import { formatDate } from '../lib/utils'

interface Notif {
  id: string
  type: 'friend' | 'like' | 'comment'
  name: string
  photo?: string
  text?: string
  restaurant?: string
  to: string
  ms: number
}

function Avatar({ url, emoji }: { url?: string; emoji: string }) {
  return url ? (
    <img src={url} alt="" className="thumb" referrerPolicy="no-referrer" style={{ width: 44, height: 44, borderRadius: '50%' }} />
  ) : (
    <div className="thumb" style={{ width: 44, height: 44, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 20 }}>{emoji}</div>
  )
}

export function Notifications() {
  const { user } = useAuth()
  const [notifs, setNotifs] = useState<Notif[] | null>(null)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [mine, likes, comments, requests] = await Promise.all([
        listMyEvaluations(user!.uid),
        listAllLikes(),
        listAllComments(),
        listIncomingRequests(user!.uid),
      ])
      const myEvals = new Map(mine.map((e) => [e.id, e]))
      const out: Notif[] = []

      for (const r of requests) {
        out.push({ id: `f-${r.id}`, type: 'friend', name: r.fromName, photo: r.fromPhoto, to: '/amigos', ms: r.createdAt?.toMillis() ?? Date.now() })
      }
      for (const c of comments) {
        const ev = myEvals.get(c.evalId)
        if (ev && c.uid !== user!.uid) {
          out.push({ id: `c-${c.id}`, type: 'comment', name: c.userName, photo: c.userPhoto, text: c.text, restaurant: ev.restaurantName, to: `/evaluacion/${c.evalId}`, ms: c.createdAt?.toMillis() ?? 0 })
        }
      }
      const likeActors = new Set<string>()
      const myLikes = likes.filter((l) => myEvals.has(l.evalId) && l.uid !== user!.uid)
      for (const l of myLikes) likeActors.add(l.uid)
      const profiles = new Map(
        await Promise.all([...likeActors].map(async (uid) => [uid, await getUserProfile(uid)] as const)),
      )
      for (const l of myLikes) {
        const p = profiles.get(l.uid)
        const ev = myEvals.get(l.evalId)
        out.push({ id: `l-${l.id}`, type: 'like', name: p?.displayName ?? 'Alguien', photo: p?.photoURL, restaurant: ev?.restaurantName, to: `/evaluacion/${l.evalId}`, ms: l.createdAt?.toMillis() ?? 0 })
      }

      out.sort((a, b) => b.ms - a.ms)
      setNotifs(out)
      localStorage.setItem('notifSeen', String(Date.now()))
    }
    load().catch(() => setNotifs([]))
  }, [user])

  if (notifs === null) return <Spinner />

  return (
    <>
      <SubHeader title="Notificaciones 🔔" />
      <div className="app-main">
        {notifs.length === 0 ? (
          <div className="empty">
            <div className="big">🔔</div>
            <p>Sin novedades por ahora. Cuando alguien te dé like, comente o te agregue, lo verás aquí.</p>
          </div>
        ) : (
          <div className="card">
            {notifs.map((n) => (
              <Link key={n.id} to={n.to} className="list-item" style={{ color: 'inherit' }}>
                <Avatar url={n.photo} emoji={n.type === 'friend' ? '🤝' : n.type === 'like' ? '❤️' : '💬'} />
                <div className="meta">
                  <div className="name" style={{ fontWeight: 600, whiteSpace: 'normal' }}>
                    <b>{n.name}</b>{' '}
                    {n.type === 'friend'
                      ? 'quiere ser tu amigo'
                      : n.type === 'like'
                        ? `le dio like a tu evaluación${n.restaurant ? ` de ${n.restaurant}` : ''}`
                        : `comentó tu evaluación${n.restaurant ? ` de ${n.restaurant}` : ''}: “${n.text}”`}
                  </div>
                  {n.ms > 0 && <div className="sub">{formatDate({ toDate: () => new Date(n.ms) } as never)}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
