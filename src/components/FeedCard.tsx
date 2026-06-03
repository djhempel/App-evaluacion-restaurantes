import { Link } from 'react-router-dom'
import { FOOD_CRITERIA, scoreColor } from '../config/scoring'
import type { Evaluation } from '../types'
import { formatDate } from '../lib/utils'
import { ScoreBadge } from './ScoreBadge'

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

export function FeedCard({ e, showAuthor }: { e: Evaluation; showAuthor: boolean }) {
  const hero = heroPhoto(e)
  const dishes = topDishes(e)

  return (
    <Link to={`/evaluacion/${e.id}`} className="feed-card">
      <div className="feed-head">
        {showAuthor && e.userPhoto ? (
          <img src={e.userPhoto} alt="" className="feed-avatar" referrerPolicy="no-referrer" />
        ) : (
          <div className="feed-avatar placeholder">{showAuthor ? '👤' : '🕶️'}</div>
        )}
        <div className="meta">
          <div className="name">{showAuthor ? e.userName : 'Anónimo'}</div>
          <div className="sub">{e.restaurantName} · {formatDate(e.createdAt)}</div>
        </div>
        <ScoreBadge score={e.finalScore} />
      </div>

      {hero ? (
        <div className="feed-hero">
          <img src={hero} alt="" />
          <span className="feed-hero-score" style={{ background: scoreColor(e.finalScore) }}>
            ⭐ {e.finalScore.toFixed(1)}
          </span>
        </div>
      ) : (
        <div className="feed-hero placeholder">🍽️</div>
      )}

      <div className="feed-body">
        {dishes.length > 0 && (
          <div className="feed-dishes">
            {dishes.map((d, i) => (
              <span className="feed-dish" key={i}>
                {d.emoji} {d.name}
                <b style={{ color: scoreColor(d.score) }}> {d.score.toFixed(1)}</b>
              </span>
            ))}
          </div>
        )}
        {e.comment && <p className="feed-comment">“{e.comment}”</p>}
      </div>
    </Link>
  )
}
