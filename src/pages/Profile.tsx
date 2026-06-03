import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { listFriendUids, listMyEvaluations } from '../lib/data'
import { uploadImage } from '../lib/storage'
import { scoreColor, FOOD_CRITERIA } from '../config/scoring'
import type { Evaluation } from '../types'

const AVATAR_STYLES = ['fun-emoji', 'adventurer', 'avataaars', 'bottts', 'thumbs', 'lorelei', 'micah', 'notionists']

function cellPhoto(e: Evaluation): string | undefined {
  if (e.photos?.[0]) return e.photos[0]
  for (const c of FOOD_CRITERIA) for (const d of e.dishEntries?.[c.key] ?? []) if (d.photos?.[0]) return d.photos[0]
  return undefined
}

const QUICK = [
  { to: '/ranking', icon: '🏆', label: 'Ranking' },
  { to: '/wishlist', icon: '📌', label: 'Por visitar' },
  { to: '/grupos', icon: '👥', label: 'Grupos' },
  { to: '/amigos', icon: '🤝', label: 'Amigos' },
  { to: '/estadisticas', icon: '📊', label: 'Estadísticas' },
  { to: '/restaurantes/nuevo', icon: '🍴', label: 'Crear lugar' },
]

export function Profile() {
  const { user, logout, photoURL, updateAvatar } = useAuth()
  const toast = useToast()
  const [evals, setEvals] = useState<Evaluation[]>([])
  const [friends, setFriends] = useState(0)
  const [editingAvatar, setEditingAvatar] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)

  useEffect(() => {
    if (!user) return
    listMyEvaluations(user.uid).then(setEvals).catch(() => setEvals([]))
    listFriendUids(user.uid).then((u) => setFriends(u.length)).catch(() => setFriends(0))
  }, [user])

  const avg = evals.length > 0 ? evals.reduce((s, e) => s + e.finalScore, 0) / evals.length : 0
  const avatarOptions = AVATAR_STYLES.map(
    (s) => `https://api.dicebear.com/9.x/${s}/svg?seed=${encodeURIComponent(user?.uid ?? 'seed')}`,
  )

  async function chooseAvatar(url: string) {
    setAvatarBusy(true)
    try {
      await updateAvatar(url)
      toast('Foto actualizada ✓')
      setEditingAvatar(false)
    } catch {
      toast('No se pudo actualizar')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function onUploadAvatar(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return
    setAvatarBusy(true)
    try {
      const url = await uploadImage(file, `avatars/${user.uid}`)
      await updateAvatar(url)
      toast('Foto actualizada ✓')
      setEditingAvatar(false)
    } catch {
      toast('No se pudo subir la foto')
    } finally {
      setAvatarBusy(false)
    }
  }

  return (
    <>
      <header className="app-header">
        <h1>{user?.displayName?.split(' ')[0] ?? 'Perfil'}</h1>
        <button className="btn ghost" onClick={() => logout()} title="Cerrar sesión" style={{ fontSize: 20 }}>⎋</button>
      </header>
      <div className="app-main">
        {/* Cabecera tipo Instagram */}
        <div className="ig-prof">
          <button
            type="button"
            onClick={() => setEditingAvatar((v) => !v)}
            style={{ position: 'relative', border: 'none', background: 'none', padding: 0, cursor: 'pointer', flexShrink: 0 }}
            aria-label="Cambiar foto"
          >
            {photoURL ? (
              <img src={photoURL} alt="" style={{ width: 84, height: 84, borderRadius: '50%', objectFit: 'cover', background: '#f0e6db' }} referrerPolicy="no-referrer" />
            ) : (
              <div style={{ width: 84, height: 84, borderRadius: '50%', display: 'grid', placeItems: 'center', fontSize: 40, background: '#f0e6db' }}>👤</div>
            )}
            <span style={{ position: 'absolute', right: 0, bottom: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--orange-grad)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, boxShadow: '0 2px 6px rgba(232,93,4,.5)', border: '2px solid #fff' }}>📷</span>
          </button>
          <div className="ig-stats">
            <div className="ig-stat"><b>{evals.length}</b><span>Publicaciones</span></div>
            <div className="ig-stat"><b>{friends}</b><span>Amigos</span></div>
            <div className="ig-stat"><b>{evals.length ? avg.toFixed(1) : '—'}</b><span>Promedio</span></div>
          </div>
        </div>

        <div className="ig-bio">
          <div className="nm">{user?.displayName}</div>
          <div className="muted" style={{ fontSize: 13 }}>{user?.email}</div>
        </div>

        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <button className="btn secondary small" style={{ flex: 1 }} onClick={() => setEditingAvatar((v) => !v)}>✏️ Editar foto</button>
          <Link className="btn secondary small" style={{ flex: 1 }} to="/evaluar">⭐ Evaluar</Link>
        </div>

        {editingAvatar && (
          <div className="card" style={{ marginTop: 12 }}>
            <div className="section-title" style={{ marginTop: 0 }}>Tu foto de perfil</div>
            <label className="btn secondary block" style={{ cursor: avatarBusy ? 'default' : 'pointer', opacity: avatarBusy ? 0.6 : 1, marginBottom: 12 }}>
              📷 Subir una foto
              <input type="file" accept="image/*" onChange={onUploadAvatar} disabled={avatarBusy} style={{ display: 'none' }} />
            </label>
            <p className="hint" style={{ marginTop: 0 }}>O elige un avatar:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {avatarOptions.map((url) => (
                <button key={url} type="button" onClick={() => chooseAvatar(url)} disabled={avatarBusy}
                  style={{ border: photoURL === url ? '2px solid var(--orange)' : '1px solid var(--line)', borderRadius: '50%', padding: 0, background: '#fff', cursor: 'pointer' }}>
                  <img src={url} alt="" style={{ width: 54, height: 54, borderRadius: '50%', display: 'block' }} />
                </button>
              ))}
            </div>
            {avatarBusy && <p className="hint">Guardando…</p>}
          </div>
        )}

        {/* Accesos rápidos */}
        <div className="hscroll" style={{ marginTop: 14 }}>
          {QUICK.map((it) => (
            <Link key={it.to} to={it.to} className="dish-card" style={{ flex: '0 0 92px', textAlign: 'center', textDecoration: 'none' }}>
              <div style={{ fontSize: 26, paddingTop: 12 }}>{it.icon}</div>
              <div className="info" style={{ paddingTop: 4 }}>
                <div className="dn" style={{ fontSize: 12 }}>{it.label}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Grilla de publicaciones */}
        <div className="ig-tabbar">▦ PUBLICACIONES</div>
        {evals.length === 0 ? (
          <div className="empty" style={{ padding: 28 }}>
            <div className="big">📸</div>
            <p>Aún no publicas. ¡Evalúa tu primer plato!</p>
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
