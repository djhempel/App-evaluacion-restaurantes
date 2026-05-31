import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPublicEvaluations, listRestaurants } from '../lib/data'
import type { Evaluation, Restaurant } from '../types'
import { Spinner } from '../components/Spinner'
import { ScoreBadge } from '../components/ScoreBadge'
import { MIN_SCORE } from '../config/scoring'
import { distanceKm, getCurrentPosition } from '../lib/utils'

interface Row {
  restaurant: Restaurant
  avg: number
  count: number
  dist?: number
}

export function Explore() {
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null)
  const [evals, setEvals] = useState<Evaluation[]>([])
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [locBusy, setLocBusy] = useState(false)

  const [cuisine, setCuisine] = useState('')
  const [minScore, setMinScore] = useState(MIN_SCORE)
  const [maxDist, setMaxDist] = useState(25)

  useEffect(() => {
    Promise.all([listRestaurants(), listPublicEvaluations()])
      .then(([rs, ev]) => {
        setRestaurants(rs)
        setEvals(ev)
      })
      .catch(() => {
        setRestaurants([])
        setEvals([])
      })
  }, [])

  async function useMyLocation() {
    setLocBusy(true)
    try {
      setLoc(await getCurrentPosition())
    } catch {
      /* nada */
    } finally {
      setLocBusy(false)
    }
  }

  const cuisines = useMemo(() => {
    const set = new Set((restaurants ?? []).map((r) => (r.cuisine ?? '').trim()).filter(Boolean))
    return Array.from(set).sort()
  }, [restaurants])

  const rows = useMemo<Row[]>(() => {
    if (!restaurants) return []
    // Promedio y conteo por restaurante (solo evaluaciones públicas).
    const agg = new Map<string, { sum: number; count: number }>()
    for (const e of evals) {
      const cur = agg.get(e.restaurantId) ?? { sum: 0, count: 0 }
      cur.sum += e.finalScore
      cur.count += 1
      agg.set(e.restaurantId, cur)
    }
    let list: Row[] = restaurants
      .map((r) => {
        const a = agg.get(r.id)
        const dist =
          loc && r.lat != null && r.lng != null
            ? distanceKm(loc, { lat: r.lat, lng: r.lng })
            : undefined
        return {
          restaurant: r,
          avg: a ? a.sum / a.count : 0,
          count: a ? a.count : 0,
          dist,
        }
      })
      // Solo lugares con al menos una evaluación pública.
      .filter((row) => row.count > 0)

    if (cuisine) list = list.filter((row) => (row.restaurant.cuisine ?? '') === cuisine)
    list = list.filter((row) => row.avg >= minScore)
    if (loc) list = list.filter((row) => row.dist == null || row.dist <= maxDist)

    // Ordena: si hay ubicación, por cercanía; si no, por nota.
    list.sort((a, b) => {
      if (loc && a.dist != null && b.dist != null) return a.dist - b.dist
      return b.avg - a.avg
    })
    return list
  }, [restaurants, evals, cuisine, minScore, maxDist, loc])

  if (restaurants === null) return <Spinner label="Buscando lugares…" />

  return (
    <>
      <header className="app-header">
        <h1>Populares cerca 📍</h1>
      </header>
      <div className="app-main">
        <div className="card">
          <button
            className="btn secondary block"
            onClick={useMyLocation}
            disabled={locBusy}
            style={{ marginBottom: 12 }}
          >
            {locBusy ? 'Ubicando…' : loc ? '📍 Ubicación activada · actualizar' : '📍 Usar mi ubicación'}
          </button>

          <label className="field" style={{ marginBottom: 12 }}>
            <span>Tipo de comida</span>
            <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
              <option value="">Todas</option>
              {cuisines.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>

          <label className="field" style={{ marginBottom: 12 }}>
            <span>Nota mínima: {minScore.toFixed(1)}</span>
            <input
              type="range"
              min={MIN_SCORE}
              max={7}
              step={0.5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
            />
          </label>

          {loc && (
            <label className="field" style={{ marginBottom: 0 }}>
              <span>Distancia máxima: {maxDist} km</span>
              <input
                type="range"
                min={1}
                max={50}
                step={1}
                value={maxDist}
                onChange={(e) => setMaxDist(Number(e.target.value))}
              />
            </label>
          )}
          {!loc && (
            <p className="hint" style={{ margin: 0 }}>
              Activa tu ubicación para filtrar por distancia y ordenar por cercanía.
            </p>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            <div className="big">🔍</div>
            <p>No hay lugares que cumplan con esos filtros.</p>
          </div>
        ) : (
          <div className="card">
            {rows.map((row) => (
              <Link
                key={row.restaurant.id}
                to={`/restaurantes/${row.restaurant.id}`}
                className="list-item"
                style={{ color: 'inherit' }}
              >
                {row.restaurant.photos?.[0] ? (
                  <img src={row.restaurant.photos[0]} alt="" className="thumb" />
                ) : (
                  <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 24 }}>🍴</div>
                )}
                <div className="meta">
                  <div className="name">{row.restaurant.name}</div>
                  <div className="sub">
                    {row.restaurant.cuisine ? `${row.restaurant.cuisine} · ` : ''}
                    {row.count} {row.count === 1 ? 'opinión' : 'opiniones'}
                    {row.dist != null ? ` · ${row.dist.toFixed(1)} km` : ''}
                  </div>
                </div>
                <ScoreBadge score={row.avg} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
