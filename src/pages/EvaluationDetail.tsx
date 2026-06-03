import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { SubHeader } from '../components/Layout'
import { Spinner } from '../components/Spinner'
import { EvaluationView } from '../components/EvaluationView'
import { deleteEvaluation, getEvaluation, updateEvaluation } from '../lib/data'
import type { Evaluation } from '../types'

export function EvaluationDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [e, setE] = useState<Evaluation | null | undefined>(undefined)

  useEffect(() => {
    if (!id) return
    getEvaluation(id).then(setE)
  }, [id])

  if (e === undefined) return <Spinner />
  if (e === null)
    return (
      <>
        <SubHeader title="Evaluación" />
        <div className="empty">No se encontró la evaluación.</div>
      </>
    )

  const isOwner = user?.uid === e.userId
  const shareUrl = `${window.location.origin}/e/${e.id}`

  async function share() {
    if (!e) return
    if (!e.isPublic) {
      await updateEvaluation(e.id, { isPublic: true, visibility: 'public', groupId: null, allowedUids: [] })
      setE({ ...e, isPublic: true, visibility: 'public' })
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${e.restaurantName} - ${e.finalScore.toFixed(1)}/7`,
          text: `Mira mi evaluación de ${e.restaurantName}`,
          url: shareUrl,
        })
        return
      } catch {
        /* el usuario canceló */
      }
    }
    await navigator.clipboard.writeText(shareUrl)
    toast('Link copiado 📋')
  }

  async function togglePublic() {
    if (!e) return
    const makePublic = !e.isPublic
    await updateEvaluation(e.id, {
      isPublic: makePublic,
      visibility: makePublic ? 'public' : 'private',
      groupId: null,
      allowedUids: makePublic ? [] : [e.userId],
    })
    setE({ ...e, isPublic: makePublic, visibility: makePublic ? 'public' : 'private' })
    toast(makePublic ? 'Ahora es pública' : 'Ahora es privada')
  }

  async function remove() {
    if (!e) return
    if (!confirm('¿Eliminar esta evaluación? No se puede deshacer.')) return
    await deleteEvaluation(e.id)
    toast('Evaluación eliminada')
    navigate('/', { replace: true })
  }

  return (
    <>
      <SubHeader title="Evaluación" />
      <div className="app-main">
        <EvaluationView e={e} showAuthor={isOwner} />

        {isOwner && (
          <>
            <button className="btn block" onClick={share} style={{ marginTop: 16 }}>
              🔗 Compartir
            </button>
            <button
              className="btn secondary block"
              onClick={() => navigate(`/evaluacion/${e.id}/editar`)}
              style={{ marginTop: 10 }}
            >
              ✏️ Editar evaluación
            </button>
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn secondary small" onClick={togglePublic}>
                {e.isPublic ? '🔒 Hacer privada' : '🌐 Hacer pública'}
              </button>
              <button className="btn danger small" onClick={remove}>
                🗑️ Eliminar
              </button>
            </div>
            {e.isPublic && (
              <p className="hint text-center" style={{ marginTop: 10 }}>
                Link público: {shareUrl}
              </p>
            )}
          </>
        )}
      </div>
    </>
  )
}
