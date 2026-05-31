import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getEvaluation } from '../lib/data'
import type { Evaluation } from '../types'
import { Spinner } from '../components/Spinner'
import { EvaluationView } from '../components/EvaluationView'

export function PublicEvaluation() {
  const { id } = useParams()
  const [e, setE] = useState<Evaluation | null | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    getEvaluation(id)
      .then(setE)
      .catch(() => setE(null))
  }, [id])

  if (e === undefined) return <Spinner />

  if (e === null || !e.isPublic)
    return (
      <div className="center-screen">
        <div style={{ fontSize: 48 }}>🔒</div>
        <h2>Evaluación no disponible</h2>
        <p className="muted">Este link no existe o la evaluación es privada.</p>
        <Link className="btn" to="/">Ir a la app</Link>
      </div>
    )

  return (
    <>
      <header className="app-header">
        <h1>🍽️ Mis Restaurantes</h1>
      </header>
      <div className="app-main">
        <EvaluationView e={e} />
        <Link className="btn block" to="/" style={{ marginTop: 16 }}>
          Crear mis propias evaluaciones
        </Link>
      </div>
    </>
  )
}
