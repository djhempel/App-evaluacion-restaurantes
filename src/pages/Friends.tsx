import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { SubHeader } from '../components/Layout'
import { Spinner } from '../components/Spinner'
import {
  acceptFriendRequest,
  declineFriendRequest,
  listFriendships,
  listIncomingRequests,
  listOutgoingRequests,
  removeFriend,
  searchUsers,
  sendFriendRequest,
} from '../lib/data'
import type { Friendship, FriendRequest, UserProfile } from '../types'

function Avatar({ url, size = 44 }: { url?: string; size?: number }) {
  return url ? (
    <img src={url} alt="" className="thumb" referrerPolicy="no-referrer" style={{ width: size, height: size, borderRadius: '50%' }} />
  ) : (
    <div className="thumb" style={{ width: size, height: size, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 20 }}>👤</div>
  )
}

export function Friends() {
  const { user } = useAuth()
  const toast = useToast()
  const me: UserProfile | null = user
    ? { uid: user.uid, displayName: user.displayName ?? 'Anónimo', email: user.email ?? '', photoURL: user.photoURL ?? '' }
    : null

  const [incoming, setIncoming] = useState<FriendRequest[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([])
  const [friends, setFriends] = useState<Friendship[] | null>(null)

  const [term, setTerm] = useState('')
  const [results, setResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)

  async function reload() {
    if (!user) return
    const [inc, out, fr] = await Promise.all([
      listIncomingRequests(user.uid),
      listOutgoingRequests(user.uid),
      listFriendships(user.uid),
    ])
    setIncoming(inc)
    setOutgoing(out)
    setFriends(fr)
  }

  useEffect(() => {
    reload().catch(() => setFriends([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    const q = term.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const t = setTimeout(() => {
      searchUsers(q, user!.uid)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 400)
    return () => clearTimeout(t)
  }, [term, user])

  const friendUids = new Set((friends ?? []).flatMap((f) => f.uids))
  const outgoingUids = new Set(outgoing.map((o) => o.toUid))

  async function send(u: UserProfile) {
    if (!me) return
    try {
      await sendFriendRequest(me, u)
      setOutgoing((o) => [...o, { id: `${me.uid}_${u.uid}`, fromUid: me.uid, fromName: me.displayName, toUid: u.uid, status: 'pending' }])
      toast('Solicitud enviada 🤝')
    } catch {
      toast('No se pudo enviar')
    }
  }

  async function accept(req: FriendRequest) {
    if (!me) return
    try {
      await acceptFriendRequest(req, me)
      toast('¡Ahora son amigos! 🎉')
      reload()
    } catch {
      toast('No se pudo aceptar')
    }
  }

  async function decline(req: FriendRequest) {
    await declineFriendRequest(req.id)
    setIncoming((i) => i.filter((x) => x.id !== req.id))
  }

  async function unfriend(f: Friendship) {
    if (!confirm('¿Eliminar esta amistad?')) return
    await removeFriend(f.id)
    setFriends((fr) => (fr ?? []).filter((x) => x.id !== f.id))
  }

  if (friends === null) return <Spinner />

  return (
    <>
      <SubHeader title="Amigos 🤝" />
      <div className="app-main">
        {/* Solicitudes recibidas */}
        {incoming.length > 0 && (
          <>
            <div className="section-title">Solicitudes ({incoming.length})</div>
            <div className="card">
              {incoming.map((req) => (
                <div className="list-item" key={req.id}>
                  <Avatar url={req.fromPhoto} />
                  <div className="meta"><div className="name">{req.fromName}</div><div className="sub">quiere ser tu amigo</div></div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn small" onClick={() => accept(req)}>Aceptar</button>
                    <button className="btn ghost small" onClick={() => decline(req)} style={{ color: '#d23a3a' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Buscar */}
        <div className="section-title">Buscar personas</div>
        <div className="card">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Nombre o email…"
            autoComplete="off"
          />
          {searching && <p className="hint">Buscando…</p>}
          {results.map((u) => {
            const isFriend = friendUids.has(u.uid)
            const sent = outgoingUids.has(u.uid)
            return (
              <div className="list-item" key={u.uid}>
                <Avatar url={u.photoURL} />
                <div className="meta"><div className="name">{u.displayName}</div>{u.email && <div className="sub">{u.email}</div>}</div>
                {isFriend ? (
                  <span className="chip">✓ Amigo</span>
                ) : sent ? (
                  <span className="chip">Enviada</span>
                ) : (
                  <button className="btn small" onClick={() => send(u)}>+ Agregar</button>
                )}
              </div>
            )
          })}
          {term.trim().length >= 2 && !searching && results.length === 0 && (
            <p className="hint">Sin resultados. Deben haber iniciado sesión al menos una vez.</p>
          )}
        </div>

        {/* Mis amigos */}
        <div className="section-title">Mis amigos ({friends.length})</div>
        {friends.length === 0 ? (
          <div className="empty"><div className="big">🤝</div><p>Aún no tienes amigos. Búscalos arriba.</p></div>
        ) : (
          <div className="card">
            {friends.map((f) => {
              const other = f.users.find((u) => u.uid !== user!.uid) ?? f.users[0]
              return (
                <div className="list-item" key={f.id}>
                  <Avatar url={other?.photoURL} />
                  <div className="meta"><div className="name">{other?.displayName ?? 'Amigo'}</div></div>
                  <button className="btn ghost small" onClick={() => unfriend(f)} style={{ color: '#d23a3a' }}>Quitar</button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
