import { NavLink, Outlet, useNavigate } from 'react-router-dom'

const NAV = [
  { to: '/', icon: '🏠', label: 'Inicio', end: true },
  { to: '/restaurantes', icon: '🍴', label: 'Lugares', end: false },
  { to: '/explorar', icon: '📍', label: 'Cerca', end: false },
  { to: '/mapa', icon: '🗺️', label: 'Mapa', end: false },
  { to: '/perfil', icon: '👤', label: 'Perfil', end: false },
]

export function Layout({ title }: { title?: string }) {
  return (
    <>
      {title && (
        <header className="app-header">
          <h1>{title}</h1>
        </header>
      )}
      <main className="app-main">
        <Outlet />
      </main>
      <nav className="bottom-nav">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end}>
            <span className="icon">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}

/** Cabecera con botón de volver, para pantallas internas. */
export function SubHeader({ title }: { title: string }) {
  const navigate = useNavigate()
  return (
    <header className="app-header">
      <button
        className="btn ghost"
        onClick={() => navigate(-1)}
        aria-label="Volver"
        style={{ padding: 4, fontSize: 22 }}
      >
        ‹
      </button>
      <h1>{title}</h1>
    </header>
  )
}
