import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useToast } from '../components/Toast'
import { getGroup, listEvaluationsByGroup } from '../lib/data'
import type { Evaluation, Group } from '../types'
import { Spinner } from '../components/Spinner'
import { SubHeader } from '../components/Layout'
import { ScoreBadge } from '../components/ScoreBadge'
import { formatDate } from '../lib/utils'

export function GroupDetail() {
  const { id } = useParams()
  const toast = useToast()
  const [group, setGroup] = useState<Group | null | undefined>(undefined)
  const [evals, setEvals] = useState<Evaluation[]>([])

  useEffect(() => {
    if (!id) return
    getGroup(id).then(setGroup)
    listEvaluationsByGroup(id).then(setEvals).catch(() => setEvals([]))
  }, [id])

  if (group === undefined) return <Spinner />
  if (group === null)
    return (
      <>
        <SubHeader title="Grupo" />
        <div className="empty">No se encontró el grupo.</div>
      </>
    )

  const inviteUrl = `${window.location.origin}/grupos/unirse/${group.inviteCode}`

  async function shareInvite() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Únete a "${group!.name}"`,
          text: `Te invito a mi grupo de evaluaciones en Mis Restaurantes`,
          url: inviteUrl,
        })
        return
      } catch {
        /* cancelado */
      }
    }
    await navigator.clipboard.writeText(inviteUrl)
    toast('Link de invitación copiado 📋')
  }

  return (
    <>
      <SubHeader title={group.name} />
      <div className="app-main">
        <div className="card">
          <div className="section-title" style={{ marginTop: 0 }}>Miembros ({group.members.length})</div>
          {group.members.map((m) => (
            <div className="list-item" key={m.uid}>
              {m.photo ? (
                <img src={m.photo} alt="" className="thumb" style={{ width: 40, height: 40, borderRadius: '50%' }} referrerPolicy="no-referrer" />
              ) : (
                <div className="thumb" style={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center' }}>👤</div>
              )}
              <div className="meta">
                <div className="name">{m.name}{m.uid === group.ownerId ? ' · admin' : ''}</div>
              </div>
            </div>
          ))}
          <button className="btn block" onClick={shareInvite} style={{ marginTop: 12 }}>
            🔗 Invitar (compartir link)
          </button>
          <p className="hint" style={{ marginBottom: 0 }}>
            Quien abra el link e inicie sesión se unirá al grupo.
          </p>
        </div>

        <div className="section-title">Evaluaciones del grupo</div>
        {evals.length === 0 ? (
          <div className="empty">
            <div className="big">🍽️</div>
            <p>Aún no hay evaluaciones compartidas con este grupo.</p>
          </div>
        ) : (
          <div className="card">
            {evals.map((e) => (
              <Link key={e.id} to={`/evaluacion/${e.id}`} className="list-item" style={{ color: 'inherit' }}>
                {e.photos?.[0] ? (
                  <img src={e.photos[0]} alt="" className="thumb" />
                ) : (
                  <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 24 }}>🍽️</div>
                )}
                <div className="meta">
                  <div className="name">{e.restaurantName}</div>
                  <div className="sub">{e.userName} · {formatDate(e.createdAt)}</div>
                </div>
                <ScoreBadge score={e.finalScore} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
