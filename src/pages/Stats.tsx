import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { SubHeader } from '../components/Layout'
import { Spinner } from '../components/Spinner'
import { listMyEvaluations } from '../lib/data'
import { CRITERIA, scoreColor, scorePercent } from '../config/scoring'
import { formatMoney } from '../lib/utils'
import type { CriterionKey, Evaluation } from '../types'

export function Stats() {
  const { user } = useAuth()
  const [evals, setEvals] = useState<Evaluation[] | null>(null)

  useEffect(() => {
    if (!user) return
    listMyEvaluations(user.uid)
      .then(setEvals)
      .catch(() => setEvals([]))
  }, [user])

  const data = useMemo(() => {
    if (!evals || evals.length === 0) return null
    const total = evals.length
    const avg = evals.reduce((s, e) => s + e.finalScore, 0) / total

    // Promedio por criterio.
    const byCriterion = CRITERIA.map((c) => {
      const vals = evals
        .map((e) => e.scores[c.key as CriterionKey])
        .filter((v): v is number => v != null)
      const a = vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
      return { ...c, avg: a, n: vals.length }
    })

    // Mejor evaluación.
    const best = [...evals].sort((a, b) => b.finalScore - a.finalScore)[0]

    // Mejor relación calidad-precio (solo con precio registrado).
    const withPrice = evals.filter((e) => e.pricePerPerson && e.pricePerPerson > 0)
    const bestValue = withPrice
      .map((e) => ({ e, ratio: e.finalScore / (e.pricePerPerson as number) }))
      .sort((a, b) => b.ratio - a.ratio)[0]?.e

    // Cocinas únicas.
    const cuisines = new Set(evals.map((e) => e.restaurantCuisine).filter(Boolean))

    return { total, avg, byCriterion, best, bestValue, cuisines: cuisines.size }
  }, [evals])

  if (evals === null) return <Spinner />

  return (
    <>
      <SubHeader title="Estadísticas 📊" />
      <div className="app-main">
        {!data ? (
          <div className="empty">
            <div className="big">📊</div>
            <p>Aún no tienes evaluaciones para mostrar estadísticas.</p>
          </div>
        ) : (
          <>
            <div className="stat-grid">
              <div className="stat">
                <div className="num">{data.total}</div>
                <div className="lbl">Evaluaciones</div>
              </div>
              <div className="stat">
                <div className="num">{data.avg.toFixed(1)}</div>
                <div className="lbl">Promedio ⭐</div>
              </div>
              <div className="stat">
                <div className="num">{data.cuisines}</div>
                <div className="lbl">Tipos de cocina</div>
              </div>
              <div className="stat">
                <div className="num">{data.best.finalScore.toFixed(1)}</div>
                <div className="lbl">Tu mejor nota</div>
              </div>
            </div>

            <div className="section-title">Promedio por criterio</div>
            <div className="card">
              {data.byCriterion.map((c) => (
                <div key={c.key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                    <span>{c.emoji}</span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{c.label}</span>
                    <span style={{ fontWeight: 800 }}>{c.n ? c.avg.toFixed(1) : '—'}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${scorePercent(c.avg)}%`, background: scoreColor(c.avg) }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="section-title">Destacados</div>
            <div className="card">
              <p style={{ marginTop: 0 }}>
                🏆 <strong>Mejor experiencia:</strong> {data.best.restaurantName}
                {data.best.dishName ? ` (${data.best.dishName})` : ''} ·{' '}
                {data.best.finalScore.toFixed(1)}
              </p>
              {data.bestValue && (
                <p style={{ marginBottom: 0 }}>
                  💰 <strong>Mejor calidad-precio:</strong> {data.bestValue.restaurantName} ·{' '}
                  {data.bestValue.finalScore.toFixed(1)} por{' '}
                  {formatMoney(data.bestValue.pricePerPerson, data.bestValue.currency)}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
