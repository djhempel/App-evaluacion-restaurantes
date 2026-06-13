import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getGroupByCode, joinGroup } from '../lib/data'
import type { Group } from '../types'
import { Spinner } from '../components/Spinner'

export function JoinGroup() {
  const { code } = useParams()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [group, setGroup] = useState<Group | null | undefined>(undefined)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!code) return
    getGroupByCode(code).then(setGroup).catch(() => setGroup(null))
  }, [code])

  if (loading || group === undefined) return <Spinner />

  if (group === null)
    return (
      <div className="center-screen">
        <div style={{ fontSize: 48 }}>🔗</div>
        <h2>Invitación no válida</h2>
        <p className="muted">Este link de grupo no existe o expiró.</p>
        <button className="btn" onClick={() => navigate('/')}>Ir a la app</button>
      </div>
    )

  const alreadyMember = !!user && group.memberUids.includes(user.uid)

  async function join() {
    if (!user || !group) return
    setJoining(true)
    setError('')
    try {
      await joinGroup(group.id, {
        uid: user.uid,
        name: user.displayName ?? 'Anónimo',
        photo: user.photoURL ?? '',
      })
      navigate(`/grupos/${group.id}`, { replace: true })
    } catch (e) {
      console.error(e)
      setError('No se pudo unir al grupo. Intenta de nuevo.')
      setJoining(false)
    }
  }

  return (
    <div className="center-screen">
      <div style={{ fontSize: 56 }}>👥</div>
      <h1 style={{ fontSize: 24 }}>{group.name}</h1>
      <p className="muted">
        Te invitaron a este grupo de evaluaciones. Sus miembros comparten sus reseñas entre sí.
      </p>
      {!user ? (
        <>
          <p>Inicia sesión para unirte.</p>
          <button className="btn" onClick={() => navigate('/login')}>Iniciar sesión</button>
        </>
      ) : alreadyMember ? (
        <button className="btn" onClick={() => navigate(`/grupos/${group.id}`)}>
          Ya eres miembro · Ver grupo
        </button>
      ) : (
        <button className="btn" onClick={join} disabled={joining}>
          {joining ? 'Uniéndote…' : 'Unirme al grupo'}
        </button>
      )}
      {error && <p style={{ color: '#d23a3a' }}>{error}</p>}
    </div>
  )
}
