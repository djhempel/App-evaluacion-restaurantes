import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { getGroup, listEvaluationsByGroup, updateGroup } from '../lib/data'
import type { Evaluation, Group } from '../types'
import { Spinner } from '../components/Spinner'
import { SubHeader } from '../components/Layout'
import { ScoreBadge } from '../components/ScoreBadge'
import { formatDate } from '../lib/utils'

const EMOJI_CHOICES = ['👥', '💑', '👨‍👩‍👧‍👦', '🍷', '🍽️', '🍕', '🍣', '🥩', '🍔', '🏖️', '⭐', '🎉']

export function GroupDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const [group, setGroup] = useState<Group | null | undefined>(undefined)
  const [evals, setEvals] = useState<Evaluation[]>([])

  // Edición de nombre + emoji.
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('👥')
  const [savingEdit, setSavingEdit] = useState(false)

  useEffect(() => {
    if (!id) return
    getGroup(id).then(setGroup)
    listEvaluationsByGroup(id).then(setEvals).catch(() => setEvals([]))
  }, [id])

  function startEdit() {
    if (!group) return
    setEditName(group.name)
    setEditEmoji(group.emoji ?? '👥')
    setEditing(true)
  }

  async function saveEdit() {
    if (!group || !editName.trim()) return
    setSavingEdit(true)
    try {
      await updateGroup(group.id, { name: editName.trim(), emoji: editEmoji })
      setGroup({ ...group, name: editName.trim(), emoji: editEmoji })
      setEditing(false)
      toast('Grupo actualizado ✏️')
    } catch (e) {
      console.error(e)
      toast('No se pudo actualizar el grupo')
    } finally {
      setSavingEdit(false)
    }
  }

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

  const isMember = !!user && group.memberUids.includes(user.uid)

  return (
    <>
      <SubHeader title={`${group.emoji ?? '👥'} ${group.name}`} />
      <div className="app-main">
        {isMember && (
          <div className="card">
            {editing ? (
              <>
                <div className="section-title" style={{ marginTop: 0 }}>Editar grupo</div>
                <label className="field">
                  <span>Emoji</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    {EMOJI_CHOICES.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setEditEmoji(e)}
                        style={{
                          fontSize: 22,
                          padding: '4px 8px',
                          borderRadius: 8,
                          border: editEmoji === e ? '2px solid var(--orange)' : '1px solid var(--line)',
                          background: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                  <input
                    value={editEmoji}
                    onChange={(ev) => setEditEmoji(ev.target.value.slice(0, 4))}
                    placeholder="O escribe un emoji"
                    style={{ width: 90, textAlign: 'center', fontSize: 20 }}
                  />
                </label>
                <label className="field">
                  <span>Nombre</span>
                  <input value={editName} onChange={(ev) => setEditName(ev.target.value)} placeholder="Nombre del grupo" />
                </label>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn secondary small" style={{ flex: 1 }} onClick={() => setEditing(false)} disabled={savingEdit}>
                    Cancelar
                  </button>
                  <button className="btn small" style={{ flex: 1 }} onClick={saveEdit} disabled={savingEdit || !editName.trim()}>
                    {savingEdit ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 32 }}>{group.emoji ?? '👥'}</span>
                <div className="meta" style={{ flex: 1 }}>
                  <div className="name" style={{ fontSize: 18, fontWeight: 700 }}>{group.name}</div>
                  <div className="sub">{group.memberUids.length} {group.memberUids.length === 1 ? 'miembro' : 'miembros'}</div>
                </div>
                <button className="btn secondary small" onClick={startEdit}>✏️ Editar</button>
              </div>
            )}
          </div>
        )}

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
