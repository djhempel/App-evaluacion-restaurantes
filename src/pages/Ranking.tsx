import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { listAllEvaluations, listMyGroups, listRestaurants } from '../lib/data'
import type { Evaluation, Group, Restaurant } from '../types'
import { Spinner } from '../components/Spinner'
import { ScoreBadge } from '../components/ScoreBadge'
import { scoreColor } from '../config/scoring'
import { CUISINES, cuisineLabel } from '../config/cuisines'
import { distanceKm, getCurrentPosition } from '../lib/utils'

type Scope = 'all' | 'grupo' | 'mias'
type SortBy = 'app' | 'google' | 'count' | 'dist'

interface Row {
  r: Restaurant
  avg: number | null
  count: number
  dist: number | null
}

const MIN_COUNTS = [
  { v: 1, label: '1+' },
  { v: 2, label: '2+' },
  { v: 3, label: '3+' },
  { v: 5, label: '5+' },
]
const MIN_GOOGLE = [
  { v: 0, label: 'Cualquiera' },
  { v: 4.0, label: '4.0+' },
  { v: 4.5, label: '4.5+' },
]

export function Ranking() {
  const { user } = useAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null)
  const [evals, setEvals] = useState<Evaluation[]>([])
  const [myGroups, setMyGroups] = useState<Group[]>([])

  const [scope, setScope] = useState<Scope>('all')
  const [cuisine, setCuisine] = useState('')
  const [minCount, setMinCount] = useState(1)
  const [minGoogle, setMinGoogle] = useState(0)
  const [sortBy, setSortBy] = useState<SortBy>('app')
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [maxDist, setMaxDist] = useState(0) // 0 = sin límite

  useEffect(() => {
    if (!user) return
    Promise.all([listRestaurants(), listAllEvaluations(), listMyGroups(user.uid)])
      .then(([rs, ev, gs]) => {
        setRestaurants(rs)
        setEvals(ev)
        setMyGroups(gs)
      })
      .catch(() => setRestaurants([]))
  }, [user])

  const myGroupIds = useMemo(() => new Set(myGroups.map((g) => g.id)), [myGroups])

  async function useMyLocation() {
    try {
      const pos = await getCurrentPosition()
      setLoc(pos)
      if (maxDist === 0) setMaxDist(5)
      setSortBy('dist')
    } catch {
      /* nada */
    }
  }

  const rows = useMemo<Row[]>(() => {
    if (!restaurants) return []
    const scoped = evals.filter((e) => {
      if (scope === 'mias') return e.userId === user?.uid
      if (scope === 'grupo') return e.groupId && myGroupIds.has(e.groupId)
      return true
    })
    const agg = new Map<string, { sum: number; n: number }>()
    for (const e of scoped) {
      const cur = agg.get(e.restaurantId) ?? { sum: 0, n: 0 }
      cur.sum += e.finalScore
      cur.n += 1
      agg.set(e.restaurantId, cur)
    }

    let list: Row[] = restaurants.map((r) => {
      const a = agg.get(r.id)
      const dist = loc && r.lat != null && r.lng != null ? distanceKm(loc, { lat: r.lat, lng: r.lng }) : null
      return { r, avg: a ? a.sum / a.n : null, count: a?.n ?? 0, dist }
    })

    list = list.filter((row) => {
      if (cuisine && row.r.cuisine !== cuisine) return false
      if (row.count < minCount) return false
      if (minGoogle > 0 && (row.r.googleRating ?? 0) < minGoogle) return false
      if (maxDist > 0 && loc && (row.dist == null || row.dist > maxDist)) return false
      return true
    })

    list.sort((a, b) => {
      if (sortBy === 'google') return (b.r.googleRating ?? 0) - (a.r.googleRating ?? 0)
      if (sortBy === 'count') return b.count - a.count
      if (sortBy === 'dist') return (a.dist ?? Infinity) - (b.dist ?? Infinity)
      return (b.avg ?? 0) - (a.avg ?? 0)
    })
    return list
  }, [restaurants, evals, scope, cuisine, minCount, minGoogle, sortBy, loc, maxDist, user, myGroupIds])

  if (restaurants === null) return <Spinner label="Calculando ranking…" />

  const presentCuisines = CUISINES.filter((c) => restaurants.some((r) => r.cuisine === c.value))

  return (
    <>
      <header className="app-header">
        <h1>¿Dónde ir? 🏆</h1>
      </header>
      <div className="app-main">
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <button className={`btn small ${scope === 'all' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setScope('all')}>🌐 Todas</button>
          <button className={`btn small ${scope === 'grupo' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setScope('grupo')}>👥 Grupo</button>
          <button className={`btn small ${scope === 'mias' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setScope('mias')}>🙋 Mías</button>
        </div>

        <div className="card">
          <div className="row" style={{ gap: 8 }}>
            <label className="field" style={{ flex: 1, marginBottom: 10 }}>
              <span>Tipo</span>
              <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
                <option value="">Todos</option>
                {presentCuisines.map((c) => (
                  <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </label>
            <label className="field" style={{ flex: 1, marginBottom: 10 }}>
              <span>Ordenar por</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                <option value="app">Nota de la app</option>
                <option value="google">Nota de Google</option>
                <option value="count">Más evaluados</option>
                <option value="dist" disabled={!loc}>Cercanía</option>
              </select>
            </label>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <label className="field" style={{ flex: 1, marginBottom: 10 }}>
              <span>Mín. evaluaciones</span>
              <select value={minCount} onChange={(e) => setMinCount(Number(e.target.value))}>
                {MIN_COUNTS.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
              </select>
            </label>
            <label className="field" style={{ flex: 1, marginBottom: 10 }}>
              <span>Nota Google</span>
              <select value={minGoogle} onChange={(e) => setMinGoogle(Number(e.target.value))}>
                {MIN_GOOGLE.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
              </select>
            </label>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn secondary small" style={{ flex: 1 }} onClick={useMyLocation}>
              {loc ? '📡 Ubicación lista' : '📡 Cerca de mí'}
            </button>
            <label className="field" style={{ flex: 1, marginBottom: 0 }}>
              <span>Hasta</span>
              <select value={maxDist} onChange={(e) => setMaxDist(Number(e.target.value))} disabled={!loc}>
                <option value={0}>Sin límite</option>
                <option value={1}>1 km</option>
                <option value={2}>2 km</option>
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
              </select>
            </label>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="empty">
            <div className="big">🏆</div>
            <p>Ningún lugar calza con esos filtros. Baja el mínimo de evaluaciones o la nota.</p>
          </div>
        ) : (
          <div className="card">
            {rows.map((row, i) => (
              <Link key={row.r.id} to={`/restaurantes/${row.r.id}`} className="list-item" style={{ color: 'inherit' }}>
                <span className="rank-num" style={{ color: i < 3 ? scoreColor(row.avg ?? 5) : undefined }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                </span>
                {row.r.photos?.[0] ? (
                  <img src={row.r.photos[0]} alt="" className="thumb" />
                ) : (
                  <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 22 }}>🍴</div>
                )}
                <div className="meta">
                  <div className="name">{row.r.name}</div>
                  <div className="sub">
                    {[
                      row.r.cuisine ? cuisineLabel(row.r.cuisine) : null,
                      row.count > 0 ? `${row.count} eval.` : 'sin evaluaciones',
                      row.r.googleRating != null ? `G ${row.r.googleRating.toFixed(1)}⭐` : null,
                      row.dist != null ? `${row.dist.toFixed(1)} km` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                </div>
                {row.avg != null ? <ScoreBadge score={row.avg} /> : <span className="chip">—</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
