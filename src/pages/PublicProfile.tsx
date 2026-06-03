import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { SubHeader } from '../components/Layout'
import { Spinner } from '../components/Spinner'
import {
  getUserProfile,
  listEvaluationsByUser,
  listFriendUids,
  listOutgoingRequests,
  sendFriendRequest,
} from '../lib/data'
import { FOOD_CRITERIA, scoreColor } from '../config/scoring'
import type { Evaluation, UserProfile } from '../types'

function cellPhoto(e: Evaluation): string | undefined {
  if (e.photos?.[0]) return e.photos[0]
  for (const c of FOOD_CRITERIA) for (const d of e.dishEntries?.[c.key] ?? []) if (d.photos?.[0]) return d.photos[0]
  return undefined
}

export function PublicProfile() {
  const { uid } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const [profile, setProfile] = useState<UserProfile | null | undefined>(undefined)
  const [evals, setEvals] = useState<Evaluation[]>([])
  const [status, setStatus] = useState<'self' | 'friend' | 'pending' | 'none'>('none')

  useEffect(() => {
    if (!uid || !user) return
    getUserProfile(uid).then(setProfile)
    listEvaluationsByUser(uid).then(setEvals).catch(() => setEvals([]))
    if (uid === user.uid) {
      setStatus('self')
    } else {
      Promise.all([listFriendUids(user.uid), listOutgoingRequests(user.uid)])
        .then(([friends, out]) => {
          if (friends.includes(uid)) setStatus('friend')
          else if (out.some((o) => o.toUid === uid)) setStatus('pending')
          else setStatus('none')
        })
        .catch(() => setStatus('none'))
    }
  }, [uid, user])

  async function addFriend() {
    if (!user || !profile) return
    try {
      await sendFriendRequest(
        { uid: user.uid, displayName: user.displayName ?? 'Anónimo', email: user.email ?? '', photoURL: user.photoURL ?? '' },
        profile,
      )
      setStatus('pending')
      toast('Solicitud enviada 🤝')
    } catch {
      toast('No se pudo enviar')
    }
  }

  if (profile === undefined) return <Spinner />
  if (profile === null)
    return (
      <>
        <SubHeader title="Perfil" />
        <div className="empty">No se encontró el perfil.</div>
      </>
    )

  const avg = evals.length > 0 ? evals.reduce((s, e) => s + e.finalScore, 0) / evals.length : 0

  return (
    <>
      <SubHeader title={profile.displayName} />
      <div className="app-main">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
          ) : (
            <div style={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 36, background: '#f0e6db' }}>👤</div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: '0 0 6px' }}>{profile.displayName}</h2>
            <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
              <div><b style={{ fontFamily: 'var(--display)' }}>{evals.length}</b> <span className="muted" style={{ fontSize: 12 }}>evals</span></div>
              <div><b style={{ fontFamily: 'var(--display)' }}>{evals.length ? avg.toFixed(1) : '—'}</b> <span className="muted" style={{ fontSize: 12 }}>promedio</span></div>
            </div>
            {status === 'self' ? (
              <span className="chip">Este eres tú</span>
            ) : status === 'friend' ? (
              <span className="chip">✓ Amigos</span>
            ) : status === 'pending' ? (
              <span className="chip">Solicitud enviada</span>
            ) : (
              <button className="btn small" onClick={addFriend}>🤝 Agregar amigo</button>
            )}
          </div>
        </div>

        <div className="section-title">Evaluaciones</div>
        {evals.length === 0 ? (
          <div className="empty" style={{ padding: 28 }}>
            <div className="big">📸</div>
            <p>Aún no ha publicado evaluaciones.</p>
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
      </div>
    </>
  )
}
