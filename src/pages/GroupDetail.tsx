import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { getGroup, listEvaluationsByGroup, listOutingsByGroup, updateGroup, updateOuting } from '../lib/data'
import type { Evaluation, Group, Outing } from '../types'
import { Spinner } from '../components/Spinner'
import { SubHeader } from '../components/Layout'
import { ScoreBadge } from '../components/ScoreBadge'
import { formatDate, formatMoney } from '../lib/utils'

const EMOJI_CHOICES = ['👥', '💑', '👨‍👩‍👧‍👦', '🍷', '🍽️', '🍕', '🍣', '🥩', '🍔', '🏖️', '⭐', '🎉']

export function GroupDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const [group, setGroup] = useState<Group | null | undefined>(undefined)
  const [evals, setEvals] = useState<Evaluation[]>([])
  const [outings, setOutings] = useState<Outing[]>([])

  // Edición de nombre + emoji.
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmoji, setEditEmoji] = useState('👥')
  const [savingEdit, setSavingEdit] = useState(false)
  const [groupView, setGroupView] = useState<'rest' | 'all'>('rest')

  const byRestaurant = useMemo(() => {
    const map = new Map<string, { id: string; name: string; photo?: string; sum: number; n: number }>()
    for (const e of evals) {
      const cur = map.get(e.restaurantId) ?? { id: e.restaurantId, name: e.restaurantName, photo: e.photos?.[0], sum: 0, n: 0 }
      cur.sum += e.finalScore
      cur.n += 1
      if (!cur.photo && e.photos?.[0]) cur.photo = e.photos[0]
      map.set(e.restaurantId, cur)
    }
    return [...map.values()].map((v) => ({ ...v, avg: v.sum / v.n })).sort((a, b) => b.avg - a.avg)
  }, [evals])

  useEffect(() => {
    if (!id) return
    getGroup(id).then(setGroup)
    listEvaluationsByGroup(id).then(setEvals).catch(() => setEvals([]))
    listOutingsByGroup(id).then(setOutings).catch(() => setOutings([]))
  }, [id])

  // Saldos netos por miembro a partir de las salidas.
  const balances = useMemo(() => {
    const owes = new Map<string, number>() // lo que cada uno debe (no pagado)
    const owed = new Map<string, number>() // lo que a cada uno le deben
    for (const o of outings) {
      for (const s of o.splits) {
        if (s.paid || s.uid === o.payerUid) continue
        owes.set(s.uid, (owes.get(s.uid) ?? 0) + s.amount)
        owed.set(o.payerUid, (owed.get(o.payerUid) ?? 0) + s.amount)
      }
    }
    const uids = new Set<string>([...owes.keys(), ...owed.keys()])
    return [...uids].map((uid) => ({ uid, net: (owed.get(uid) ?? 0) - (owes.get(uid) ?? 0) }))
  }, [outings])

  async function toggleSplitPaid(o: Outing, uid: string) {
    const splits = o.splits.map((s) => (s.uid === uid ? { ...s, paid: !s.paid } : s))
    setOutings((prev) => prev.map((x) => (x.id === o.id ? { ...x, splits } : x)))
    await updateOuting(o.id, { splits }).catch(() => undefined)
  }

  function nameOf(uid: string) {
    return group?.members.find((m) => m.uid === uid)?.name ?? 'Alguien'
  }

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
          <>
            <div className="row" style={{ gap: 8, marginBottom: 12 }}>
              <button className={`btn small ${groupView === 'rest' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setGroupView('rest')}>
                🍴 Por restaurante
              </button>
              <button className={`btn small ${groupView === 'all' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setGroupView('all')}>
                🍽️ Todas
              </button>
            </div>
            <div className="card">
              {groupView === 'rest'
                ? byRestaurant.map((r) => (
                    <Link key={r.id} to={`/restaurantes/${r.id}`} className="list-item" style={{ color: 'inherit' }}>
                      {r.photo ? (
                        <img src={r.photo} alt="" className="thumb" />
                      ) : (
                        <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 24 }}>🍴</div>
                      )}
                      <div className="meta">
                        <div className="name">{r.name}</div>
                        <div className="sub">{r.n} {r.n === 1 ? 'evaluación' : 'evaluaciones'} del grupo</div>
                      </div>
                      <ScoreBadge score={r.avg} />
                    </Link>
                  ))
                : evals.map((e) => (
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
          </>
        )}

        {/* Cuentas del grupo */}
        <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>💸 Cuentas del grupo</span>
          <Link to="/salida/nueva" className="sub" style={{ alignSelf: 'center' }}>+ Salida</Link>
        </div>

        {balances.length > 0 && (
          <div className="card">
            {balances.map((b) => (
              <div className="list-item" key={b.uid}>
                <div className="meta"><div className="name">{nameOf(b.uid)}{b.uid === user?.uid ? ' (tú)' : ''}</div></div>
                <span className="chip" style={{ background: b.net > 0 ? '#e3f5e9' : b.net < 0 ? '#fde6e6' : undefined, color: b.net > 0 ? '#1f7a47' : b.net < 0 ? '#b13' : 'var(--muted)' }}>
                  {b.net > 0 ? `le deben ${formatMoney(b.net)}` : b.net < 0 ? `debe ${formatMoney(-b.net)}` : 'al día'}
                </span>
              </div>
            ))}
          </div>
        )}

        {outings.length === 0 ? (
          <div className="empty" style={{ padding: 24 }}>
            <p>Sin salidas todavía. Registra una con la boleta y dividimos la cuenta.</p>
            <button className="btn" onClick={() => navigate('/salida/nueva')}>💸 Nueva salida</button>
          </div>
        ) : (
          outings.map((o) => (
            <div className="card" key={o.id}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                {o.photoUrl ? (
                  <img src={o.photoUrl} alt="boleta" className="thumb" />
                ) : (
                  <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 22 }}>🧾</div>
                )}
                <div className="meta">
                  <div className="name">{o.restaurantName}</div>
                  <div className="sub">{formatMoney(o.total)} · pagó {o.payerName} · {formatDate(o.createdAt)}</div>
                </div>
              </div>
              {o.splits.map((s) => (
                <div className="list-item" key={s.uid} style={{ padding: '8px 0' }}>
                  <div className="meta">
                    <div className="name" style={{ fontSize: 14 }}>{s.name}{s.uid === o.payerUid ? ' · pagó la cuenta' : ''}</div>
                    <div className="sub">{formatMoney(s.amount)}</div>
                  </div>
                  {s.uid !== o.payerUid && (
                    <button
                      className={`btn small ${s.paid ? 'secondary' : ''}`}
                      onClick={() => toggleSplitPaid(o, s.uid)}
                    >
                      {s.paid ? '✓ Pagado' : 'Marcar pagado'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </>
  )
}
