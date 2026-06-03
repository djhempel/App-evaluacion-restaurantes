import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FOOD_CRITERIA, scoreColor } from '../config/scoring'
import type { Evaluation } from '../types'
import { formatDate } from '../lib/utils'

function heroPhoto(e: Evaluation): string | undefined {
  if (e.photos?.[0]) return e.photos[0]
  for (const c of FOOD_CRITERIA) {
    for (const d of e.dishEntries?.[c.key] ?? []) {
      if (d.photos?.[0]) return d.photos[0]
    }
  }
  return undefined
}

function topDishes(e: Evaluation, n = 3) {
  const out: { emoji: string; name: string; score: number }[] = []
  for (const c of FOOD_CRITERIA) {
    for (const d of e.dishEntries?.[c.key] ?? []) {
      out.push({ emoji: c.emoji, name: d.name || c.label, score: d.score })
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, n)
}

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
  const hero = heroPhoto(e)
  const dishes = topDishes(e)
  const navigate = useNavigate()
  const lastTap = useRef(0)
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pop, setPop] = useState(false)

  function openEval() {
    navigate(`/evaluacion/${e.id}`)
  }

  function onMediaTap() {
    const now = Date.now()
    if (now - lastTap.current < 280) {
      // Doble tap → like
      if (tapTimer.current) clearTimeout(tapTimer.current)
      if (!liked) onToggleLike?.(e.id, true)
      setPop(true)
      setTimeout(() => setPop(false), 800)
    } else {
      tapTimer.current = setTimeout(openEval, 280)
    }
    lastTap.current = now
  }

  return (
    <article className="ig-card">
      <div className="ig-head">
        {showAuthor && e.userPhoto ? (
          <img src={e.userPhoto} alt="" className="ig-avatar" referrerPolicy="no-referrer" onClick={() => showAuthor && navigate(`/u/${e.userId}`)} />
        ) : (
          <div className="ig-avatar">{showAuthor ? '👤' : '🕶️'}</div>
        )}
        <div className="ig-user" onClick={() => showAuthor && navigate(`/u/${e.userId}`)} style={{ cursor: showAuthor ? 'pointer' : 'default' }}>
          <div className="ig-name">{showAuthor ? e.userName : 'Anónimo'}</div>
          <div className="ig-place">{e.restaurantName}</div>
        </div>
      </div>

      {hero ? (
        <div className="ig-media" onClick={onMediaTap}>
          <img src={hero} alt="" />
          <span className="ig-score">⭐ {e.finalScore.toFixed(1)}</span>
          <div className={`ig-heart-pop ${pop ? 'show' : ''}`}>❤️</div>
        </div>
      ) : (
        <div className="ig-media placeholder" onClick={onMediaTap}>
          🍽️
          <div className={`ig-heart-pop ${pop ? 'show' : ''}`}>❤️</div>
        </div>
      )}

      <div className="ig-actions">
        <button type="button" className="ig-act" onClick={() => onToggleLike?.(e.id, !liked)} aria-label="Me gusta">
          {liked ? '❤️' : '🤍'}
        </button>
        <button type="button" className="ig-act" onClick={openEval} aria-label="Comentar">💬</button>
        <button type="button" className="ig-act" onClick={openEval} aria-label="Ver" style={{ marginLeft: 'auto' }}>›</button>
      </div>

      {likeCount > 0 && <div className="ig-likes">{likeCount} {likeCount === 1 ? 'Me gusta' : 'Me gusta'}</div>}

      {dishes.length > 0 && (
        <div className="ig-dishes">
          {dishes.map((d, i) => (
            <span className="ig-dish" key={i}>
              {d.emoji} {d.name} <b style={{ color: scoreColor(d.score) }}>{d.score.toFixed(1)}</b>
            </span>
          ))}
        </div>
      )}

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
