import { CRITERIA, MAX_SCORE, MIN_SCORE } from '../config/scoring'
import type { CriterionKey, Scores } from '../types'

interface Props {
  scores: Scores
  onChange: (scores: Scores) => void
}

export function ScoreEditor({ scores, onChange }: Props) {
  function setScore(key: CriterionKey, value: number | null) {
    onChange({ ...scores, [key]: value })
  }

  return (
    <div>
      {CRITERIA.map((c) => {
        const value = scores[c.key]
        const disabled = value === null
        return (
          <div key={c.key} className={`criterion${disabled ? ' disabled' : ''}`}>
            <div className="criterion-head">
              <span className="emoji">{c.emoji}</span>
              <span className="title">
                {c.label}
                <span className="weight"> · {Math.round(c.weight * 100)}%</span>
              </span>
              <span className="criterion-value">
                {disabled ? '—' : (value as number).toFixed(1)}
              </span>
            </div>
            {!disabled && (
              <input
                type="range"
                min={MIN_SCORE}
                max={MAX_SCORE}
                step={0.1}
                value={value as number}
                onChange={(e) => setScore(c.key, Number(e.target.value))}
              />
            )}
            <p className="hint" style={{ margin: '2px 0 0' }}>{c.hint}</p>
            <label className="na-toggle">
              <input
                type="checkbox"
                checked={disabled}
                style={{ width: 'auto' }}
                onChange={(e) => setScore(c.key, e.target.checked ? null : 5)}
              />
              No aplica (no reparte su {Math.round(c.weight * 100)}%)
            </label>
          </div>
        )
      })}
    </div>
  )
}
