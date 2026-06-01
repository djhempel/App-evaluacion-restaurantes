import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { createGroup, listMyGroups } from '../lib/data'
import type { Group } from '../types'
import { Spinner } from '../components/Spinner'
import { SubHeader } from '../components/Layout'

const EMOJI_CHOICES = ['👥', '💑', '👨‍👩‍👧‍👦', '🍷', '🍽️', '🍕', '🍣', '🥩', '🍔', '🏖️', '⭐', '🎉']

export function Groups() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('👥')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!user) return
    listMyGroups(user.uid).then(setGroups).catch(() => setGroups([]))
  }, [user])

  async function create() {
    if (!user || !name.trim()) return
    setCreating(true)
    try {
      const id = await createGroup(
        name.trim(),
        {
          uid: user.uid,
          name: user.displayName ?? 'Anónimo',
          photo: user.photoURL ?? '',
        },
        emoji,
      )
      toast('Grupo creado 🎉')
      navigate(`/grupos/${id}`)
    } catch (e) {
      console.error(e)
      toast('No se pudo crear el grupo')
    } finally {
      setCreating(false)
    }
  }

  if (groups === null) return <Spinner />

  return (
    <>
      <SubHeader title="Grupos 👥" />
      <div className="app-main">
        <div className="card">
          <label className="field" style={{ marginBottom: 8 }}>
            <span>Emoji</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EMOJI_CHOICES.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  style={{
                    fontSize: 22,
                    padding: '4px 8px',
                    borderRadius: 8,
                    border: emoji === e ? '2px solid var(--orange)' : '1px solid var(--line)',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </label>
          <label className="field" style={{ marginBottom: 10 }}>
            <span>Nombre del grupo</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Diego y señora"
            />
          </label>
          <button className="btn block" onClick={create} disabled={creating || !name.trim()}>
            {creating ? 'Creando…' : '+ Crear grupo'}
          </button>
          <p className="hint" style={{ marginBottom: 0 }}>
            Luego compartes un link para que se unan. Las evaluaciones de grupo solo las ven sus miembros.
          </p>
        </div>

        {groups.length === 0 ? (
          <div className="empty">
            <div className="big">👥</div>
            <p>Aún no tienes grupos.</p>
          </div>
        ) : (
          <div className="card">
            {groups.map((g) => (
              <Link key={g.id} to={`/grupos/${g.id}`} className="list-item" style={{ color: 'inherit' }}>
                <span style={{ fontSize: 22 }}>{g.emoji ?? '👥'}</span>
                <div className="meta">
                  <div className="name">{g.name}</div>
                  <div className="sub">
                    {g.memberUids.length} {g.memberUids.length === 1 ? 'miembro' : 'miembros'}
                  </div>
                </div>
                <span style={{ color: 'var(--muted)' }}>›</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
