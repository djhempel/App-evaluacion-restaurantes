import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { CRITERIA } from '../config/scoring'

export function Profile() {
  const { user, logout } = useAuth()

  return (
    <>
      <header className="app-header">
        <h1>Perfil</h1>
      </header>
      <div className="app-main">
        <div className="card text-center">
          {user?.photoURL ? (
            <img
              src={user.photoURL}
              alt=""
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div style={{ fontSize: 56 }}>👤</div>
          )}
          <h2 style={{ margin: '8px 0 2px' }}>{user?.displayName}</h2>
          <p className="muted" style={{ margin: 0 }}>{user?.email}</p>
        </div>

        <div className="section-title">Tu actividad</div>
        <div className="card" style={{ padding: 0 }}>
          <Link to="/estadisticas" className="list-item" style={{ color: 'inherit', padding: 16 }}>
            <span style={{ fontSize: 22 }}>📊</span>
            <div className="meta"><div className="name">Estadísticas</div></div>
            <span style={{ color: 'var(--muted)' }}>›</span>
          </Link>
          <Link to="/ranking" className="list-item" style={{ color: 'inherit', padding: 16 }}>
            <span style={{ fontSize: 22 }}>🏆</span>
            <div className="meta"><div className="name">Ranking</div></div>
            <span style={{ color: 'var(--muted)' }}>›</span>
          </Link>
          <Link to="/wishlist" className="list-item" style={{ color: 'inherit', padding: 16 }}>
            <span style={{ fontSize: 22 }}>📌</span>
            <div className="meta"><div className="name">Por visitar</div></div>
            <span style={{ color: 'var(--muted)' }}>›</span>
          </Link>
          <Link to="/grupos" className="list-item" style={{ color: 'inherit', padding: 16 }}>
            <span style={{ fontSize: 22 }}>👥</span>
            <div className="meta"><div className="name">Grupos</div></div>
            <span style={{ color: 'var(--muted)' }}>›</span>
          </Link>
          <Link to="/restaurantes/nuevo" className="list-item" style={{ color: 'inherit', padding: 16 }}>
            <span style={{ fontSize: 22 }}>➕</span>
            <div className="meta"><div className="name">Crear restaurante</div></div>
            <span style={{ color: 'var(--muted)' }}>›</span>
          </Link>
        </div>

        <div className="section-title">Cómo se calcula la nota</div>
        <div className="card">
          {CRITERIA.map((c) => (
            <div key={c.key} className="list-item">
              <span style={{ fontSize: 22 }}>{c.emoji}</span>
              <div className="meta">
                <div className="name">{c.label}</div>
              </div>
              <span className="chip">{Math.round(c.weight * 100)}%</span>
            </div>
          ))}
          <p className="hint" style={{ marginBottom: 0 }}>
            Si marcas un criterio como “No aplica”, su peso se reparte entre los demás
            (ideal para buffets o all-inclusive).
          </p>
        </div>

        <button className="btn secondary block" onClick={() => logout()} style={{ marginTop: 8 }}>
          Cerrar sesión
        </button>
      </div>
    </>
  )
}
