import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { Spinner } from '../components/Spinner'
import {
  addWishlist,
  deleteWishlist,
  listGroupWishlist,
  listMyGroups,
  listWishlist,
  updateWishlist,
} from '../lib/data'
import { hasGooglePlaces, searchPlaces, type PlaceResult } from '../lib/utils'
import { CUISINES, cuisineLabel } from '../config/cuisines'
import type { Group, WishlistItem } from '../types'
import { MarkersMap, type MapMarker } from '../components/MarkersMap'

const GREEN = '#1f9d55'
const ORANGE = '#e8730c'

export function Wishlist() {
  const { user } = useAuth()
  const toast = useToast()

  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [scope, setScope] = useState<string>('personal') // 'personal' | groupId
  const [items, setItems] = useState<WishlistItem[] | null>(null)
  const [view, setView] = useState<'list' | 'map'>('list')

  // Formulario de alta.
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [address, setAddress] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [placeId, setPlaceId] = useState<string | null>(null)
  const [rating, setRating] = useState<number | null>(null)

  // Buscador.
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([])
  const [placeSearching, setPlaceSearching] = useState(false)

  // Filtros.
  const [filterCuisine, setFilterCuisine] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'done'>('all')

  useEffect(() => {
    if (!user) return
    listMyGroups(user.uid).then(setMyGroups).catch(() => setMyGroups([]))
  }, [user])

  useEffect(() => {
    if (!user) return
    setItems(null)
    const load =
      scope === 'personal'
        ? listWishlist(user.uid).then((all) => all.filter((w) => !w.groupId))
        : listGroupWishlist(scope)
    load.then(setItems).catch(() => setItems([]))
  }, [user, scope])

  useEffect(() => {
    const q = placeQuery.trim()
    if (q.length < 4) {
      setPlaceResults([])
      return
    }
    setPlaceSearching(true)
    const t = setTimeout(() => {
      searchPlaces(q)
        .then(setPlaceResults)
        .catch(() => setPlaceResults([]))
        .finally(() => setPlaceSearching(false))
    }, 600)
    return () => clearTimeout(t)
  }, [placeQuery])

  function selectPlace(p: PlaceResult) {
    setName(p.name)
    setAddress(p.address)
    setLoc({ lat: p.lat, lng: p.lng })
    setPlaceId(p.placeId ?? null)
    setRating(p.rating ?? null)
    if (p.rating != null && !note.trim()) setNote(`Google ${p.rating.toFixed(1)} ⭐`)
    setPlaceResults([])
    setPlaceQuery('')
  }

  function resetForm() {
    setName('')
    setNote('')
    setAddress('')
    setCuisine('')
    setLoc(null)
    setPlaceId(null)
    setRating(null)
  }

  async function add() {
    if (!user || !name.trim()) return
    const payload = {
      userId: user.uid,
      name: name.trim(),
      note: note.trim(),
      address: address.trim(),
      cuisine: cuisine || '',
      lat: loc?.lat ?? null,
      lng: loc?.lng ?? null,
      groupId: scope === 'personal' ? null : scope,
      googlePlaceId: placeId,
      googleRating: rating,
      done: false,
      restaurantId: null,
    }
    const id = await addWishlist(payload)
    setItems((prev) => [{ id, ...payload }, ...(prev ?? [])])
    resetForm()
    toast(scope === 'personal' ? 'Agregado a tu lista 📌' : 'Agregado a la lista del grupo 👥')
  }

  async function toggle(item: WishlistItem) {
    await updateWishlist(item.id, { done: !item.done })
    setItems((prev) => prev!.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
  }

  async function remove(item: WishlistItem) {
    await deleteWishlist(item.id)
    setItems((prev) => prev!.filter((i) => i.id !== item.id))
  }

  const filtered = useMemo(() => {
    if (!items) return []
    return items.filter((i) => {
      if (filterCuisine && i.cuisine !== filterCuisine) return false
      if (filterStatus === 'pending' && i.done) return false
      if (filterStatus === 'done' && !i.done) return false
      return true
    })
  }, [items, filterCuisine, filterStatus])

  // Tipos presentes (para mostrar solo filtros útiles).
  const presentCuisines = useMemo(
    () => CUISINES.filter((c) => items?.some((i) => i.cuisine === c.value)),
    [items],
  )

  const mapMarkers: MapMarker[] = filtered
    .filter((i) => i.lat != null && i.lng != null)
    .map((i) => ({
      id: i.id,
      lat: i.lat as number,
      lng: i.lng as number,
      title: i.name,
      subtitle: [cuisineLabel(i.cuisine), i.done ? '✓ visitado' : 'por visitar']
        .filter(Boolean)
        .join(' · '),
      color: i.done ? GREEN : ORANGE,
    }))

  return (
    <>
      <header className="app-header">
        <h1>Por visitar 📌</h1>
      </header>
      <div className="app-main">
        {/* Ámbito: personal o por grupo */}
        <div className="scroll-x" style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto' }}>
          <button
            className={`btn small ${scope === 'personal' ? '' : 'secondary'}`}
            style={{ whiteSpace: 'nowrap' }}
            onClick={() => setScope('personal')}
          >
            👤 Personal
          </button>
          {myGroups.map((g) => (
            <button
              key={g.id}
              className={`btn small ${scope === g.id ? '' : 'secondary'}`}
              style={{ whiteSpace: 'nowrap' }}
              onClick={() => setScope(g.id)}
            >
              {g.emoji ?? '👥'} {g.name}
            </button>
          ))}
        </div>

        {/* Alta */}
        <div className="card">
          <label className="field" style={{ marginBottom: placeResults.length || placeSearching ? 8 : 10 }}>
            <span>🔎 Buscar el lugar</span>
            <input
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              placeholder="Escribe el nombre del restaurante…"
              autoComplete="off"
            />
            <p className="hint">
              {hasGooglePlaces ? 'Busca en Google (precarga nombre, dirección y ubicación).' : 'Busca en OpenStreetMap.'}
            </p>
          </label>
          {placeSearching && <p className="hint">Buscando…</p>}
          {placeResults.map((p, i) => (
            <button
              key={i}
              type="button"
              className="list-item"
              onClick={() => selectPlace(p)}
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer' }}
            >
              <span style={{ fontSize: 20 }}>📍</span>
              <div className="meta">
                <div className="name">{p.name}</div>
                <div className="sub">{p.address}</div>
              </div>
              {p.rating != null && <span className="sub" style={{ whiteSpace: 'nowrap' }}>{p.rating.toFixed(1)} ⭐</span>}
            </button>
          ))}

          <label className="field">
            <span>Restaurante</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del lugar" />
          </label>
          {address && <p className="hint" style={{ marginTop: -4 }}>📍 {address}</p>}
          <label className="field">
            <span>Tipo de restaurante</span>
            <select value={cuisine} onChange={(e) => setCuisine(e.target.value)}>
              <option value="">Sin especificar</option>
              {CUISINES.map((c) => (
                <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Nota (opcional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Me lo recomendó…" />
          </label>
          <button className="btn block" onClick={add} disabled={!name.trim()}>
            + Agregar {scope === 'personal' ? 'a mi lista' : 'a la lista del grupo'}
          </button>
        </div>

        {/* Filtros + vista */}
        <div className="row" style={{ gap: 8, marginBottom: 10 }}>
          <select value={filterCuisine} onChange={(e) => setFilterCuisine(e.target.value)} style={{ flex: 2 }}>
            <option value="">Todos los tipos</option>
            {presentCuisines.map((c) => (
              <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)} style={{ flex: 1 }}>
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="done">Visitados</option>
          </select>
        </div>
        <div className="row" style={{ gap: 8, marginBottom: 12 }}>
          <button className={`btn small ${view === 'list' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setView('list')}>
            📋 Lista
          </button>
          <button className={`btn small ${view === 'map' ? '' : 'secondary'}`} style={{ flex: 1 }} onClick={() => setView('map')}>
            🗺️ Mapa
          </button>
        </div>

        {items === null ? (
          <Spinner />
        ) : view === 'map' ? (
          mapMarkers.length === 0 ? (
            <div className="empty"><div className="big">🗺️</div><p>Ningún lugar de esta lista tiene ubicación. Agrégalos con el buscador.</p></div>
          ) : (
            <MarkersMap markers={mapMarkers} height="60vh" />
          )
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="big">📌</div>
            <p>{items.length === 0 ? 'Aún no hay lugares en esta lista.' : 'Nada con esos filtros.'}</p>
          </div>
        ) : (
          <div className="card">
            {filtered.map((i) => (
              <div className="list-item" key={i.id}>
                <input type="checkbox" checked={i.done} onChange={() => toggle(i)} style={{ width: 'auto' }} />
                <div className="meta">
                  <div className="name" style={{ textDecoration: i.done ? 'line-through' : 'none', opacity: i.done ? 0.5 : 1 }}>
                    {i.name}
                  </div>
                  <div className="sub">
                    {[cuisineLabel(i.cuisine), i.address, i.note].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <button className="btn ghost" onClick={() => remove(i)} style={{ color: '#d23a3a' }}>🗑️</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
