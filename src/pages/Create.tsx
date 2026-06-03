import { useNavigate } from 'react-router-dom'
import { SubHeader } from '../components/Layout'

const OPTIONS = [
  { icon: '⭐', title: 'Nueva evaluación', sub: 'Evalúa un lugar plato por plato', to: '/evaluar' },
  { icon: '💸', title: 'Nueva salida a comer', sub: 'Cuenta del grupo + boleta + saldos', to: '/salida/nueva' },
  { icon: '🍴', title: 'Nuevo restaurante', sub: 'Agrega un lugar al catálogo', to: '/restaurantes/nuevo' },
  { icon: '👥', title: 'Nuevo grupo', sub: 'Crea un grupo e invita amigos', to: '/grupos' },
]

export function Create() {
  const navigate = useNavigate()
  return (
    <>
      <SubHeader title="Crear" />
      <div className="app-main">
        <div className="card" style={{ padding: 0 }}>
          {OPTIONS.map((o) => (
            <button
              key={o.to}
              type="button"
              className="list-item"
              onClick={() => navigate(o.to)}
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer', padding: 16 }}
            >
              <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 26, background: 'linear-gradient(145deg,#fff,#ffe9d4)' }}>{o.icon}</div>
              <div className="meta">
                <div className="name">{o.title}</div>
                <div className="sub" style={{ whiteSpace: 'normal' }}>{o.sub}</div>
              </div>
              <span style={{ color: 'var(--muted)' }}>›</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
