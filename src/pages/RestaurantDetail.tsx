import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getRestaurant, listEvaluationsByRestaurant } from '../lib/data'
import type { Evaluation, Restaurant } from '../types'
import { Spinner } from '../components/Spinner'
import { SubHeader } from '../components/Layout'
import { ScoreBadge } from '../components/ScoreBadge'
import { MiniMap, googleMapsLink } from '../components/MiniMap'
import { dishCategoryLabel } from '../config/dishes'
import { formatDate, formatMoney } from '../lib/utils'

export function RestaurantDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [r, setR] = useState<Restaurant | null | undefined>(undefined)
  const [evals, setEvals] = useState<Evaluation[]>([])

  useEffect(() => {
    if (!id || !user) return
    getRestaurant(id).then(setR)
    listEvaluationsByRestaurant(id, user.uid).then(setEvals).catch(() => setEvals([]))
  }, [id, user])

  if (r === undefined) return <Spinner />
  if (r === null)
    return (
      <>
        <SubHeader title="Restaurante" />
        <div className="empty">No se encontró el restaurante.</div>
      </>
    )

  const avg =
    evals.length > 0 ? evals.reduce((s, e) => s + e.finalScore, 0) / evals.length : 0

  return (
    <>
      <SubHeader title={r.name} />
      <div className="app-main">
        {r.photos?.[0] && (
          <img
            src={r.photos[0]}
            alt=""
            style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 'var(--radius)', marginBottom: 12 }}
          />
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {r.cuisine && <span className="chip">🍴 {r.cuisine}</span>}
          {evals.length > 0 && <ScoreBadge score={avg} showLabel />}
          <span className="chip">{evals.length} evaluaciones</span>
          {r.googleRating != null && (
            <span className="chip" title={r.googleRatingCount ? `${r.googleRatingCount} reseñas en Google` : 'Nota de Google'}>
              ⭐ {r.googleRating.toFixed(1)} Google
            </span>
          )}
        </div>

        {r.address && <p className="muted" style={{ marginTop: 0 }}>📍 {r.address}</p>}

        <button className="btn block" onClick={() => navigate(`/evaluar?restaurant=${r.id}`)}>
          ⭐ Evaluar este lugar
        </button>

        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn secondary small" onClick={() => navigate(`/restaurantes/${r.id}/editar`)}>
            ✏️ Editar
          </button>
          {r.lat != null && r.lng != null && (
            <a className="btn secondary small" href={googleMapsLink(r.lat, r.lng)} target="_blank" rel="noreferrer">
              🗺️ Cómo llegar
            </a>
          )}
        </div>

        {r.lat != null && r.lng != null && (
          <div style={{ marginTop: 16 }}>
            <MiniMap lat={r.lat} lng={r.lng} />
          </div>
        )}

        {(r.menuPhotos?.length > 0 || r.menuUrl) && (
          <>
            <div className="section-title">Menú</div>
            <div className="card">
              {r.menuUrl && (
                <a className="btn secondary block" href={r.menuUrl} target="_blank" rel="noreferrer" style={{ marginBottom: r.menuPhotos?.length > 0 ? 10 : 0 }}>
                  🔗 Ver carta web
                </a>
              )}
              {r.menuPhotos?.length > 0 && (
                <div className="photo-grid">
                  {r.menuPhotos.map((m) => (
                    <a href={m} target="_blank" rel="noreferrer" key={m}>
                      <img src={m} alt="Menú" className="photo-thumb" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {r.dishes?.length > 0 && (
          <>
            <div className="section-title">Carta</div>
            <div className="card">
              {r.dishes.map((d) => (
                <div className="list-item" key={d.id}>
                  <div className="meta">
                    <div className="name">{d.name}</div>
                    <div className="sub">{dishCategoryLabel(d.category)}</div>
                  </div>
                  {d.price != null && <span className="chip">{formatMoney(d.price)}</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {evals.length > 0 && (
          <>
            <div className="section-title">Evaluaciones</div>
            <div className="card">
              {evals.map((e) => (
                <Link key={e.id} to={`/evaluacion/${e.id}`} className="list-item" style={{ color: 'inherit' }}>
                  {e.photos?.[0] ? (
                    <img src={e.photos[0]} alt="" className="thumb" />
                  ) : (
                    <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 24 }}>🍽️</div>
                  )}
                  <div className="meta">
                    <div className="name">{e.dishName || e.userName}</div>
                    <div className="sub">
                      {e.userName} · {formatDate(e.createdAt)}
                    </div>
                  </div>
                  <ScoreBadge score={e.finalScore} />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
