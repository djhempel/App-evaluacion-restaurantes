import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { SubHeader } from '../components/Layout'
import { Spinner } from '../components/Spinner'
import { createOuting, listMyGroups, listRestaurants } from '../lib/data'
import { uploadImage } from '../lib/storage'
import { formatMoney } from '../lib/utils'
import type { Group, OutingSplit, Restaurant } from '../types'

export function NewOuting() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [groups, setGroups] = useState<Group[] | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])

  const [groupId, setGroupId] = useState('')
  const [restName, setRestName] = useState('')
  const [restId, setRestId] = useState<string | null>(null)
  const [restQuery, setRestQuery] = useState('')
  const [total, setTotal] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [participants, setParticipants] = useState<Set<string>>(new Set())
  const [payer, setPayer] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return
    listMyGroups(user.uid).then((gs) => {
      setGroups(gs)
      if (gs[0]) setGroupId(gs[0].id)
    }).catch(() => setGroups([]))
    listRestaurants().then(setRestaurants).catch(() => setRestaurants([]))
  }, [user])

  const group = useMemo(() => groups?.find((g) => g.id === groupId), [groups, groupId])

  // Al cambiar de grupo, todos participan por defecto y pago lo pone uno mismo.
  useEffect(() => {
    if (!group) return
    setParticipants(new Set(group.memberUids))
    setPayer(user && group.memberUids.includes(user.uid) ? user.uid : group.memberUids[0] ?? '')
  }, [group, user])

  const totalNum = Number(total) || 0
  const partList = group ? group.members.filter((m) => participants.has(m.uid)) : []
  const share = partList.length > 0 ? Math.round(totalNum / partList.length) : 0

  function toggleParticipant(uid: string) {
    setParticipants((prev) => {
      const n = new Set(prev)
      if (n.has(uid)) n.delete(uid)
      else n.add(uid)
      return n
    })
  }

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(true)
    try {
      setPhoto(await uploadImage(file, 'outings'))
    } catch {
      toast('No se pudo subir la boleta')
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    if (!user || !group || totalNum <= 0 || partList.length === 0 || !payer) {
      toast('Completa grupo, monto y comensales')
      return
    }
    setSaving(true)
    try {
      const payerName = group.members.find((m) => m.uid === payer)?.name ?? 'Alguien'
      const splits: OutingSplit[] = partList.map((m) => ({
        uid: m.uid,
        name: m.name,
        amount: share,
        paid: m.uid === payer,
      }))
      const id = await createOuting({
        groupId: group.id,
        restaurantId: restId,
        restaurantName: restName.trim() || 'Salida',
        photoUrl: photo,
        total: totalNum,
        payerUid: payer,
        payerName,
        splits,
        createdBy: user.uid,
      })
      toast('Salida registrada 💸')
      navigate(`/grupos/${group.id}`, { replace: true })
      void id
    } catch (e) {
      console.error(e)
      toast('No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  if (groups === null) return <Spinner />

  if (groups.length === 0)
    return (
      <>
        <SubHeader title="Nueva salida" />
        <div className="empty">
          <div className="big">👥</div>
          <p>Las salidas son de grupo. Crea un grupo primero.</p>
          <button className="btn" onClick={() => navigate('/grupos')}>Crear grupo</button>
        </div>
      </>
    )

  const restMatches = restaurants
    .filter((r) => restQuery.trim().length >= 2 && r.name.toLowerCase().includes(restQuery.trim().toLowerCase()))
    .slice(0, 5)

  return (
    <>
      <SubHeader title="Nueva salida a comer 💸" />
      <div className="app-main">
        <label className="field">
          <span>Grupo</span>
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.emoji ?? '👥'} {g.name}</option>
            ))}
          </select>
        </label>

        <label className="field" style={{ marginBottom: restMatches.length ? 6 : 14 }}>
          <span>Restaurante</span>
          <input
            value={restName}
            onChange={(e) => { setRestName(e.target.value); setRestQuery(e.target.value); setRestId(null) }}
            placeholder="¿Dónde fueron?"
            autoComplete="off"
          />
        </label>
        {restMatches.map((r) => (
          <button key={r.id} type="button" className="list-item" onClick={() => { setRestName(r.name); setRestId(r.id); setRestQuery('') }}
            style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}>
            {r.photos?.[0] ? <img src={r.photos[0]} alt="" className="thumb" /> : <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 20 }}>🍴</div>}
            <div className="meta"><div className="name">{r.name}</div><div className="sub">registrado</div></div>
            <span className="chip">✓</span>
          </button>
        ))}

        <label className="field">
          <span>Total de la cuenta (CLP)</span>
          <input type="number" inputMode="numeric" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="Ej: 48000" />
        </label>

        <div className="section-title" style={{ marginTop: 4 }}>Boleta (opcional)</div>
        <div className="card">
          {photo ? (
            <div style={{ position: 'relative' }}>
              <img src={photo} alt="" style={{ width: '100%', borderRadius: 12, maxHeight: 240, objectFit: 'cover' }} />
              <button className="btn ghost small" onClick={() => setPhoto(null)} style={{ color: '#d23a3a' }}>Quitar</button>
            </div>
          ) : (
            <label className="btn secondary block" style={{ cursor: uploading ? 'default' : 'pointer', opacity: uploading ? 0.6 : 1 }}>
              {uploading ? 'Subiendo…' : '📷 Subir foto de la boleta'}
              <input type="file" accept="image/*" onChange={onPhoto} disabled={uploading} style={{ display: 'none' }} />
            </label>
          )}
        </div>

        <div className="section-title">¿Quiénes fueron? ({partList.length})</div>
        <div className="card">
          {group?.members.map((m) => (
            <label className="list-item" key={m.uid} style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={participants.has(m.uid)} onChange={() => toggleParticipant(m.uid)} style={{ width: 'auto' }} />
              <div className="meta"><div className="name">{m.name}{m.uid === user?.uid ? ' (tú)' : ''}</div></div>
              {participants.has(m.uid) && share > 0 && <span className="chip">{formatMoney(share)}</span>}
            </label>
          ))}
        </div>

        <label className="field">
          <span>¿Quién pagó?</span>
          <select value={payer} onChange={(e) => setPayer(e.target.value)}>
            {partList.map((m) => (
              <option key={m.uid} value={m.uid}>{m.name}{m.uid === user?.uid ? ' (tú)' : ''}</option>
            ))}
          </select>
        </label>

        {totalNum > 0 && partList.length > 0 && (
          <p className="hint">Cada uno pone {formatMoney(share)}. Los demás le deben eso a {group?.members.find((m) => m.uid === payer)?.name ?? 'quien pagó'}.</p>
        )}

        <button className="btn block" onClick={save} disabled={saving} style={{ marginTop: 8 }}>
          {saving ? 'Guardando…' : 'Registrar salida'}
        </button>
      </div>
    </>
  )
}
