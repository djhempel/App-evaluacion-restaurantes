import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/** Captura errores de render y muestra un mensaje en vez de pantalla en blanco. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="center-screen" style={{ padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>😵</div>
          <h2>Algo se rompió en esta pantalla</h2>
          <p className="muted" style={{ maxWidth: 360 }}>
            {this.state.error.message || 'Error desconocido'}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn" onClick={() => window.location.assign('/')}>Ir al inicio</button>
            <button
              className="btn secondary"
              onClick={() => {
                this.setState({ error: null })
                window.location.reload()
              }}
            >
              Recargar
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
