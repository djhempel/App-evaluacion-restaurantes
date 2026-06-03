import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { scoreColor } from '../config/scoring'
import type { EvalComment, Evaluation } from '../types'
import { formatDate } from '../lib/utils'
import { Carousel, buildEvalSlides } from './Carousel'

export function FeedCard({
  e,
  showAuthor,
  liked = false,
  likeCount = 0,
  comments = [],
  onToggleLike,
  onAddComment,
}: {
  e: Evaluation
  showAuthor: boolean
  liked?: boolean
  likeCount?: number
  comments?: EvalComment[]
  onToggleLike?: (evalId: string, liked: boolean) => void
  onAddComment?: (evalId: string, text: string) => void
}) {
  const navigate = useNavigate()
  const lastTap = useRef(0)
  const [pop, setPop] = useState(false)
  const [text, setText] = useState('')
  const slides = buildEvalSlides(e)
  const commentCount = comments.length
  const preview = comments.slice(-2)

  function submit() {
    if (!text.trim()) return
    onAddComment?.(e.id, text.trim())
    setText('')
  }

  function openEval() {
    navigate(`/evaluacion/${e.id}`)
  }

  // Doble-tap sobre la foto → like (sin interferir con el deslizar).
  function onMediaClick() {
    const now = Date.now()
    if (now - lastTap.current < 280) {
      if (!liked) onToggleLike?.(e.id, true)
      setPop(true)
      setTimeout(() => setPop(false), 800)
    }
    lastTap.current = now
  }

  return (
    <article className="ig-card">
      <div className="ig-head">
        {showAuthor && e.userPhoto ? (
          <img src={e.userPhoto} alt="" className="ig-avatar" referrerPolicy="no-referrer" onClick={() => navigate(`/u/${e.userId}`)} />
        ) : (
          <div className="ig-avatar">{showAuthor ? '👤' : '🕶️'}</div>
        )}
        <div className="ig-user" onClick={() => showAuthor && navigate(`/u/${e.userId}`)} style={{ cursor: showAuthor ? 'pointer' : 'default' }}>
          <div className="ig-name">{showAuthor ? e.userName : 'Anónimo'}</div>
          <div className="ig-place">{e.restaurantName}</div>
        </div>
        <span className="badge" style={{ background: scoreColor(e.finalScore) }}>⭐ {e.finalScore.toFixed(1)}</span>
      </div>

      <div className="ig-carousel" onClick={onMediaClick}>
        {slides.length > 0 ? (
          <Carousel slides={slides} flush />
        ) : (
          <div className="ig-media placeholder">🍽️</div>
        )}
        <div className={`ig-heart-pop ${pop ? 'show' : ''}`}>❤️</div>
      </div>

      <div className="ig-actions">
        <button type="button" className="ig-act" onClick={() => onToggleLike?.(e.id, !liked)} aria-label="Me gusta">
          {liked ? '❤️' : '🤍'}
        </button>
        <button type="button" className="ig-act" onClick={openEval} aria-label="Comentar">💬</button>
        <button type="button" className="ig-act" onClick={openEval} aria-label="Ver" style={{ marginLeft: 'auto' }}>›</button>
      </div>

      {likeCount > 0 && <div className="ig-likes">{likeCount} Me gusta</div>}

      {e.comment && (
        <div className="ig-caption">
          {showAuthor && <span className="u">{e.userName}</span>}
          “{e.comment}”
        </div>
      )}

      {commentCount > 2 && (
        <div className="ig-link" onClick={openEval} style={{ cursor: 'pointer' }}>
          Ver los {commentCount} comentarios
        </div>
      )}

      {preview.map((c) => (
        <div className="ig-caption" key={c.id}>
          <span className="u">{c.userName}</span>
          {c.text}
        </div>
      ))}

      <div className="ig-date">{formatDate(e.createdAt)}</div>

      <div className="ig-composer">
        <input
          value={text}
          onChange={(ev) => setText(ev.target.value)}
          placeholder="Agrega un comentario…"
          onKeyDown={(ev) => ev.key === 'Enter' && submit()}
        />
        <button type="button" onClick={submit} disabled={!text.trim()}>Publicar</button>
      </div>
    </article>
  )
}
