import { CRITERIA, FOOD_CRITERIA, MAX_SCORE, categoryAverage, scoreColor, scorePercent } from '../config/scoring'
import type { Evaluation } from '../types'
import { formatDate, formatMoney } from '../lib/utils'
import { ScoreBadge } from './ScoreBadge'
import { MiniMap, googleMapsLink } from './MiniMap'

export function EvaluationView({ e }: { e: Evaluation }) {
  const entries = e.dishEntries
  const hasDishes =
    !!entries && FOOD_CRITERIA.some((c) => (entries[c.key]?.length ?? 0) > 0)

  return (
    <>
      <div className="card text-center">
        <div className="muted" style={{ fontSize: 13 }}>{e.restaurantName}</div>
        {e.dishName && <h2 style={{ margin: '4px 0' }}>{e.dishName}</h2>}
        <div className="score-big" style={{ color: scoreColor(e.finalScore) }}>
          {e.finalScore.toFixed(1)}
        </div>
        <ScoreBadge score={e.finalScore} showLabel />
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          por {e.userName} · {formatDate(e.createdAt)}
        </div>
      </div>

      {e.photos?.length > 0 && (
        <div className="photo-grid" style={{ marginBottom: 14 }}>
          {e.photos.map((p) => (
            <a href={p} target="_blank" rel="noreferrer" key={p}>
              <img src={p} alt="" className="photo-thumb" />
            </a>
          ))}
        </div>
      )}

      {/* Platos evaluados por categoría */}
      {hasDishes &&
        FOOD_CRITERIA.map((c) => {
          const dishes = entries![c.key] ?? []
          if (dishes.length === 0) return null
          const avg = categoryAverage(dishes)
          return (
            <div className="card" key={c.key}>
              <div className="criterion-head" style={{ marginBottom: 8 }}>
                <span className="emoji">{c.emoji}</span>
                <span className="title">{c.label}</span>
                {avg != null && <ScoreBadge score={avg} />}
              </div>
              {dishes.map((d) => (
                <div key={d.id} style={{ borderTop: '1px solid var(--line)', paddingTop: 10, marginTop: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontWeight: 700 }}>{d.name || 'Plato'}</span>
                    <ScoreBadge score={d.score} />
                  </div>
                  {d.price != null && (
                    <div className="hint" style={{ marginTop: 2 }}>{formatMoney(d.price)}</div>
                  )}
                  {d.comment && <p style={{ margin: '6px 0 0' }}>“{d.comment}”</p>}
                  {d.photos && d.photos.length > 0 && (
                    <div className="photo-grid" style={{ marginTop: 8 }}>
                      {d.photos.map((p) => (
                        <a href={p} target="_blank" rel="noreferrer" key={p}>
                          <img src={p} alt="" className="photo-thumb" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        })}

      <div className="card">
        <div className="section-title" style={{ marginTop: 0 }}>Desglose</div>
        {CRITERIA.map((c) => {
          const v = e.scores[c.key]
          return (
            <div key={c.key} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span>{c.emoji}</span>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>
                  {c.label} <span className="muted">· {Math.round(c.weight * 100)}%</span>
                </span>
                <span style={{ fontWeight: 800 }}>
                  {v == null ? 'N/A' : `${v.toFixed(1)}/${MAX_SCORE}`}
                </span>
              </div>
              {v != null && (
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${scorePercent(v)}%`, background: scoreColor(v) }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {(e.pricePerPerson != null || e.comment) && (
        <div className="card">
          {e.pricePerPerson != null && (
            <p style={{ marginTop: 0 }}>
              💵 <strong>Precio por persona:</strong> {formatMoney(e.pricePerPerson, e.currency)}
            </p>
          )}
          {e.comment && <p style={{ marginBottom: 0 }}>“{e.comment}”</p>}
        </div>
      )}

      {e.lat != null && e.lng != null && (
        <>
          <MiniMap lat={e.lat} lng={e.lng} />
          <a
            className="btn secondary block"
            href={googleMapsLink(e.lat, e.lng)}
            target="_blank"
            rel="noreferrer"
            style={{ marginTop: 10 }}
          >
            🗺️ Ver en el mapa
          </a>
        </>
      )}
    </>
  )
}
