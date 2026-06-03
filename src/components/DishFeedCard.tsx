import { useNavigate } from 'react-router-dom'
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
  const openEval = () => navigate(`/evaluacion/${e.id}`)

  return (
    <article className="ig-card">
      <div className="ig-head">
        {showAuthor && e.userPhoto ? (
          <img src={e.userPhoto} alt="" className="ig-avatar" referrerPolicy="no-referrer" onClick={() => navigate(`/u/${e.userId}`)} />
        ) : (
          <div className="ig-avatar">{showAuthor ? '👤' : '🕶️'}</div>
        )}
        <div className="ig-user" onClick={() => showAuthor && navigate(`/u/${e.userId}`)} style={{ cursor: showAuthor ? 'pointer' : 'default' }}>
          <div className="ig-name">{post.emoji} {post.name}</div>
          <div className="ig-place">{showAuthor ? `${e.userName} · ` : ''}{e.restaurantName}</div>
        </div>
      </div>

      {post.photo ? (
        <div className="ig-media" onClick={openEval}>
          <img src={post.photo} alt="" />
          <span className="ig-score">⭐ {post.score.toFixed(1)}</span>
        </div>
      ) : (
        <div className="ig-media placeholder" onClick={openEval}>{post.emoji}</div>
      )}

      <div className="ig-dishes" style={{ paddingTop: 10 }}>
        <span className="ig-dish">{post.emoji} {post.name} <b style={{ color: scoreColor(post.score) }}>{post.score.toFixed(1)}</b></span>
      </div>

      {post.comment && (
        <div className="ig-caption">“{post.comment}”</div>
      )}

      <div className="ig-date">{formatDate(e.createdAt)}</div>
    </article>
  )
}
