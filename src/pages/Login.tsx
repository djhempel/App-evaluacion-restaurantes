import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CRITERIA } from '../config/scoring'

export function Login() {
  const { user, loading, loginWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  async function handleLogin() {
    setBusy(true)
    setError('')
    try {
      await loginWithGoogle()
    } catch (e) {
      console.error(e)
      setError('No se pudo iniciar sesión. Intenta de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="center-screen">
      <div style={{ fontSize: 64 }}>🍽️</div>
      <h1 style={{ fontSize: 28 }}>Mis Restaurantes</h1>
      <p className="muted" style={{ maxWidth: 320 }}>
        Evalúa cada restaurante plato por plato y guarda tu historial con fotos,
        ubicación y una nota final ponderada.
      </p>

      <div className="card" style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {CRITERIA.map((c) => (
            <span className="chip" key={c.key}>
              {c.emoji} {c.label.split(',')[0]} {Math.round(c.weight * 100)}%
            </span>
          ))}
        </div>
      </div>

      <button className="btn block" onClick={handleLogin} disabled={busy} style={{ maxWidth: 360 }}>
        {busy ? 'Conectando…' : 'Continuar con Google'}
      </button>
      {error && <p style={{ color: '#d23a3a' }}>{error}</p>}
      <p className="hint">Tus evaluaciones quedan guardadas en tu cuenta.</p>
    </div>
  )
}
