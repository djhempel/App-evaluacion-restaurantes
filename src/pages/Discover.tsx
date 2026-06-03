import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listAllEvaluations } from '../lib/data'
import { FOOD_CRITERIA } from '../config/scoring'
import type { Evaluation } from '../types'
import { Spinner } from '../components/Spinner'
import { Explore } from './Explore'
import { RestaurantList } from './RestaurantList'

type Tab = 'fotos' | 'lista' | 'mapa'

function PhotosGallery() {
  const [evals, setEvals] = useState<Evaluation[] | null>(null)
  useEffect(() => {
    listAllEvaluations().then(setEvals).catch(() => setEvals([]))
  }, [])

  const photos = useMemo(() => {
    if (!evals) return []
    const out: { photo: string; id: string }[] = []
    for (const e of evals) {
      const set = new Set<string>()
      for (const p of e.photos ?? []) set.add(p)
      for (const c of FOOD_CRITERIA) for (const d of e.dishEntries?.[c.key] ?? []) for (const p of d.photos ?? []) set.add(p)
      for (const p of set) out.push({ photo: p, id: e.id })
    }
    return out.slice(0, 120)
  }, [evals])

  if (evals === null) return <Spinner />
  if (photos.length === 0)
    return <div className="empty"><div className="big">🖼️</div><p>Aún no hay fotos de platos en el ecosistema.</p></div>

  return (
    <>
      <p className="hint" style={{ marginTop: 0 }}>Fotos y platos de toda la comunidad. Toca una para ver la evaluación.</p>
      <div className="grid-3">
        {photos.map((p, i) => (
          <Link key={i} to={`/evaluacion/${p.id}`} className="grid-cell">
            <img src={p.photo} alt="" />
          </Link>
        ))}
      </div>
    </>
  )
}

export function Discover() {
  const [tab, setTab] = useState<Tab>('fotos')

  return (
    <>
      <header className="app-header">
        <h1>Descubrir 🧭</h1>
      </header>
      <div className="app-main">
        <div className="row" style={{ gap: 8, marginBottom: 14 }}>
          <button className={`btn small ${tab === 'fotos' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setTab('fotos')}>🖼️ Fotos</button>
          <button className={`btn small ${tab === 'lista' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setTab('lista')}>🍴 Lista</button>
          <button className={`btn small ${tab === 'mapa' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setTab('mapa')}>🗺️ Mapa</button>
        </div>

        {tab === 'fotos' && <PhotosGallery />}
        {tab === 'lista' && <RestaurantList embedded />}
        {tab === 'mapa' && <Explore embedded />}
      </div>
    </>
  )
}
