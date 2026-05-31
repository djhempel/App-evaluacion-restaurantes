import { scoreColor, scoreLabel } from '../config/scoring'

export function ScoreBadge({ score, showLabel }: { score: number; showLabel?: boolean }) {
  return (
    <span className="badge" style={{ background: scoreColor(score) }}>
      ⭐ {score.toFixed(1)}
      {showLabel && ` · ${scoreLabel(score)}`}
    </span>
  )
}
