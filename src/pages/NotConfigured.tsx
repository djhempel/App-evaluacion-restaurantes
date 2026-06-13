export function NotConfigured() {
  return (
    <div className="center-screen">
      <div style={{ fontSize: 56 }}>🍽️</div>
      <h1>Mis Restaurantes</h1>
      <p className="muted">
        La app está casi lista. Falta conectar tu proyecto de <strong>Firebase</strong>{' '}
        para activar el login con Google, la base de datos y las fotos.
      </p>
      <div className="card" style={{ textAlign: 'left', width: '100%' }}>
        <p style={{ marginTop: 0 }}>
          Crea un archivo <code>.env</code> (puedes copiar <code>.env.example</code>) con
          tus credenciales de Firebase y vuelve a iniciar la app:
        </p>
        <pre
          style={{
            background: '#f4ece2',
            padding: 12,
            borderRadius: 10,
            overflowX: 'auto',
            fontSize: 12,
          }}
        >
{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}
        </pre>
        <p className="hint">
          Los pasos detallados están en el archivo <code>README.md</code> del proyecto.
        </p>
      </div>
    </div>
  )
}
