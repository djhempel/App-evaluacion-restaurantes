import { CRITERIA, scoreColor } from '../config/scoring'
import type { Evaluation } from '../types'
import { formatDate, formatMoney } from '../lib/utils'
import { ScoreBadge } from './ScoreBadge'
import { MiniMap, googleMapsLink } from './MiniMap'

export function EvaluationView({ e }: { e: Evaluation }) {
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
                <span style={{ fontWeight: 800 }}>{v == null ? 'N/A' : `${v}/10`}</span>
              </div>
              {v != null && (
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${v * 10}%`, background: scoreColor(v) }}
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
