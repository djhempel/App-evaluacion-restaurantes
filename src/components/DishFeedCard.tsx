import type { MouseEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { scoreColor } from '../config/scoring'
import type { Evaluation } from '../types'
import { formatDate } from '../lib/utils'

export interface DishPost {
  key: string
  e: Evaluation
  emoji: string
  name: string
  score: number
  comment?: string
  photo?: string
}

export function DishFeedCard({ post, showAuthor }: { post: DishPost; showAuthor: boolean }) {
  const { e } = post
  const navigate = useNavigate()

  function goAuthor(ev: MouseEvent) {
    if (!showAuthor) return
    ev.preventDefault()
    ev.stopPropagation()
    navigate(`/u/${e.userId}`)
  }

  return (
    <Link to={`/evaluacion/${e.id}`} className="feed-card">
      <div className="feed-head">
        <div onClick={goAuthor} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: showAuthor ? 'pointer' : 'default' }}>
          {showAuthor && e.userPhoto ? (
            <img src={e.userPhoto} alt="" className="feed-avatar" referrerPolicy="no-referrer" />
          ) : (
            <div className="feed-avatar placeholder">{showAuthor ? '👤' : '🕶️'}</div>
          )}
          <div className="meta">
            <div className="name">{showAuthor ? e.userName : 'Anónimo'}</div>
            <div className="sub">{e.restaurantName} · {formatDate(e.createdAt)}</div>
          </div>
        </div>
        <span className="badge" style={{ background: scoreColor(post.score) }}>⭐ {post.score.toFixed(1)}</span>
      </div>

      {post.photo ? (
        <div className="feed-hero">
          <img src={post.photo} alt="" />
          <span className="feed-hero-score" style={{ background: scoreColor(post.score) }}>{post.emoji} {post.name}</span>
        </div>
      ) : (
        <div className="feed-hero placeholder">{post.emoji}</div>
      )}

      <div className="feed-body">
        <div className="feed-dishes">
          <span className="feed-dish">{post.emoji} {post.name}</span>
        </div>
        {post.comment && <p className="feed-comment">“{post.comment}”</p>}
      </div>
    </Link>
  )
}
