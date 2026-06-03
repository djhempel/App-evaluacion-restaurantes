import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getRestaurant, listEvaluationsByRestaurant, listMyGroups } from '../lib/data'
import type { Evaluation, Group, Restaurant } from '../types'
import { Spinner } from '../components/Spinner'
import { SubHeader } from '../components/Layout'
import { ScoreBadge } from '../components/ScoreBadge'
import { MiniMap, googleMapsLink } from '../components/MiniMap'
import { dishCategoryLabel } from '../config/dishes'
import { cuisineLabel } from '../config/cuisines'
import { FOOD_CRITERIA, scoreColor } from '../config/scoring'
import { formatDate, formatMoney } from '../lib/utils'

type Scope = 'publico' | 'grupo' | 'solo'

/** Plato agregado (mismo nombre) a partir de varias evaluaciones. */
interface AggDish {
  name: string
  avg: number
  count: number
  photos: string[]
  notes: string[]
}

export function RestaurantDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [r, setR] = useState<Restaurant | null | undefined>(undefined)
  const [evals, setEvals] = useState<Evaluation[]>([])
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [scope, setScope] = useState<Scope>('publico')

  useEffect(() => {
    if (!id || !user) return
    getRestaurant(id).then(setR)
    listEvaluationsByRestaurant(id).then(setEvals).catch(() => setEvals([]))
    listMyGroups(user.uid).then(setMyGroups).catch(() => setMyGroups([]))
  }, [id, user])

  const myGroupIds = useMemo(() => new Set(myGroups.map((g) => g.id)), [myGroups])

  // Evaluaciones según el filtro elegido.
  const shown = useMemo(() => {
    if (!user) return evals
    if (scope === 'solo') return evals.filter((e) => e.userId === user.uid)
    if (scope === 'grupo') return evals.filter((e) => e.groupId && myGroupIds.has(e.groupId))
    return evals
  }, [evals, scope, user, myGroupIds])

  // Platos agregados por sección (categoría) a partir de las evaluaciones mostradas.
  const dishSections = useMemo(() => {
    return FOOD_CRITERIA.map((cat) => {
      const map = new Map<string, AggDish>()
      for (const e of shown) {
        const list = e.dishEntries?.[cat.key] ?? []
        for (const d of list) {
          const key = (d.name || 'Sin nombre').trim().toLowerCase()
          const cur = map.get(key) ?? { name: d.name || 'Sin nombre', avg: 0, count: 0, photos: [], notes: [] }
          cur.avg = (cur.avg * cur.count + d.score) / (cur.count + 1)
          cur.count += 1
          if (d.photos) cur.photos.push(...d.photos)
          if (d.comment?.trim()) cur.notes.push(d.comment.trim())
          map.set(key, cur)
        }
      }
      return { cat, dishes: [...map.values()].sort((a, b) => b.avg - a.avg) }
    }).filter((s) => s.dishes.length > 0)
  }, [shown])

  if (r === undefined) return <Spinner />
  if (r === null)
    return (
      <>
        <SubHeader title="Restaurante" />
        <div className="empty">No se encontró el restaurante.</div>
      </>
    )

  const avg =
    shown.length > 0 ? shown.reduce((s, e) => s + e.finalScore, 0) / shown.length : 0

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
          {r.cuisine && <span className="chip">{cuisineLabel(r.cuisine)}</span>}
          {shown.length > 0 && <ScoreBadge score={avg} showLabel />}
          <span className="chip">{shown.length} evaluaciones</span>
          {r.googleRating != null && (
            <span className="chip" title={r.googleRatingCount ? `${r.googleRatingCount} reseñas en Google` : 'Nota de Google'}>
              ⭐ {r.googleRating.toFixed(1)} Google
            </span>
          )}
          {r.googleType && !r.cuisine && <span className="chip">🍴 {r.googleType}</span>}
          {r.googlePriceLevel != null && (
            <span className="chip">{r.googlePriceLevel === 0 ? 'Gratis' : '$'.repeat(r.googlePriceLevel)}</span>
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

        {r.lat != null && r.lng != null && (
          <div style={{ marginTop: 16 }}>
            <MiniMap lat={r.lat} lng={r.lng} />
          </div>
        )}

        {(r.googlePhone || r.googleWebsite || r.googleMapsUri || r.googleHours) && (
          <>
            <div className="section-title">Información (Google)</div>
            <div className="card">
              <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                {r.googlePhone && (
                  <a className="btn secondary small" href={`tel:${r.googlePhone}`}>📞 Llamar</a>
                )}
                {(r.googlePhoneIntl || r.googlePhone) && (
                  <a
                    className="btn secondary small"
                    href={`https://wa.me/${(r.googlePhoneIntl || r.googlePhone || '').replace(/[^\d]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    💬 WhatsApp
                  </a>
                )}
                {r.googleWebsite && (
                  <a className="btn secondary small" href={r.googleWebsite} target="_blank" rel="noreferrer">🌐 Sitio web</a>
                )}
                {r.googleMapsUri && (
                  <a className="btn secondary small" href={r.googleMapsUri} target="_blank" rel="noreferrer">📍 Ver en Google</a>
                )}
              </div>
              {r.googlePhone && <p className="hint" style={{ marginBottom: 0 }}>📞 {r.googlePhone}</p>}
              {r.googleHours && r.googleHours.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 600 }}>🕒 Horario de atención</summary>
                  <div style={{ marginTop: 6 }}>
                    {r.googleHours.map((h, idx) => (
                      <div className="sub" key={idx}>{h}</div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </>
        )}

        {r.googleReviews && r.googleReviews.length > 0 && (
          <>
            <div className="section-title">Reseñas de Google</div>
            <div className="card">
              {r.googleReviews.map((rev, idx) => (
                <div
                  key={idx}
                  style={{ paddingBottom: 10, marginBottom: 10, borderBottom: idx < r.googleReviews!.length - 1 ? '1px solid var(--line)' : 'none' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontWeight: 600 }}>{rev.author ?? 'Anónimo'}</div>
                    {rev.rating != null && <div style={{ whiteSpace: 'nowrap' }}>{'⭐'.repeat(Math.round(rev.rating))}</div>}
                  </div>
                  {rev.time && <div className="sub" style={{ marginBottom: 4 }}>{rev.time}</div>}
                  {rev.text && <div className="sub">{rev.text}</div>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Filtro de ámbito del ecosistema */}
        <div className="section-title">Qué evaluaciones ver</div>
        <div className="row" style={{ gap: 8, marginBottom: 4 }}>
          <button className={`btn small ${scope === 'publico' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setScope('publico')}>
            🌐 Público
          </button>
          <button className={`btn small ${scope === 'grupo' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setScope('grupo')}>
            👥 Grupo
          </button>
          <button className={`btn small ${scope === 'solo' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setScope('solo')}>
            🙋 Solo yo
          </button>
        </div>
        <p className="hint" style={{ marginBottom: 4 }}>
          {scope === 'publico'
            ? 'Todas las evaluaciones (autor anónimo).'
            : scope === 'grupo'
              ? 'Solo de tus grupos.'
              : 'Solo tus evaluaciones.'}
        </p>

        {shown.length === 0 ? (
          <div className="empty">
            <div className="big">🍽️</div>
            <p>Sin evaluaciones en esta vista. ¡Sé el primero!</p>
            <button className="btn" onClick={() => navigate(`/evaluar?restaurant=${r.id}`)}>⭐ Evaluar</button>
          </div>
        ) : (
          <>
            {/* Platos evaluados por sección */}
            {dishSections.map(({ cat, dishes }) => (
              <div key={cat.key}>
                <div className="section-title">{cat.emoji} {cat.label}</div>
                <div className="card">
                  {dishes.map((d, i) => (
                    <div className="list-item" key={i} style={{ alignItems: 'flex-start' }}>
                      {d.photos[0] ? (
                        <img src={d.photos[0]} alt="" className="thumb" />
                      ) : (
                        <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 22 }}>{cat.emoji}</div>
                      )}
                      <div className="meta">
                        <div className="name">{d.name}</div>
                        <div className="sub" style={{ whiteSpace: 'normal' }}>
                          {d.count} {d.count === 1 ? 'evaluación' : 'evaluaciones'}
                          {d.notes[0] ? ` · “${d.notes[0]}”` : ''}
                        </div>
                      </div>
                      <span className="badge" style={{ background: scoreColor(d.avg) }}>⭐ {d.avg.toFixed(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Feed de evaluaciones (autor oculto en público) */}
            <div className="section-title">Evaluaciones</div>
            <div className="card">
              {shown.map((e) => {
                const dishCount = FOOD_CRITERIA.reduce((n, c) => n + (e.dishEntries?.[c.key]?.length ?? 0), 0)
                return (
                  <Link key={e.id} to={`/evaluacion/${e.id}`} className="list-item" style={{ color: 'inherit' }}>
                    {e.photos?.[0] ? (
                      <img src={e.photos[0]} alt="" className="thumb" />
                    ) : (
                      <div className="thumb" style={{ display: 'grid', placeItems: 'center', fontSize: 22 }}>🍽️</div>
                    )}
                    <div className="meta">
                      <div className="name">{e.userId === user?.uid ? 'Tu evaluación' : 'Evaluación anónima'}</div>
                      <div className="sub">
                        {dishCount > 0 ? `${dishCount} plato${dishCount > 1 ? 's' : ''} · ` : ''}
                        {formatDate(e.createdAt)}
                      </div>
                    </div>
                    <ScoreBadge score={e.finalScore} />
                  </Link>
                )
              })}
            </div>
          </>
        )}

        {/* Carta del lugar (platos disponibles) */}
        {r.dishes?.length > 0 && (
          <>
            <div className="section-title">Carta del lugar</div>
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
      </div>
    </>
  )
}
