import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { scoreColor } from '../config/scoring'
import type { Evaluation } from '../types'
import { formatDate } from '../lib/utils'
import { Carousel, buildEvalSlides } from './Carousel'

export function FeedCard({
  e,
  showAuthor,
  liked = false,
  likeCount = 0,
  commentCount = 0,
  onToggleLike,
}: {
  e: Evaluation
  showAuthor: boolean
  liked?: boolean
  likeCount?: number
  commentCount?: number
  onToggleLike?: (evalId: string, liked: boolean) => void
}) {
  const navigate = useNavigate()
  const lastTap = useRef(0)
  const [pop, setPop] = useState(false)
  const slides = buildEvalSlides(e)

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

      {commentCount > 0 && (
        <div className="ig-link" onClick={openEval} style={{ cursor: 'pointer' }}>
          Ver {commentCount === 1 ? 'el comentario' : `los ${commentCount} comentarios`}
        </div>
      )}

      <div className="ig-date">{formatDate(e.createdAt)}</div>
    </article>
  )
}
