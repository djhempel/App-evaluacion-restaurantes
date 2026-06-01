import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { Spinner } from '../components/Spinner'
import { addWishlist, deleteWishlist, listWishlist, updateWishlist } from '../lib/data'
import { hasGooglePlaces, searchPlaces, type PlaceResult } from '../lib/utils'
import type { WishlistItem } from '../types'

export function Wishlist() {
  const { user } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState<WishlistItem[] | null>(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [address, setAddress] = useState('')

  // Buscador de lugares (Google si hay key, si no OpenStreetMap).
  const [placeQuery, setPlaceQuery] = useState('')
  const [placeResults, setPlaceResults] = useState<PlaceResult[]>([])
  const [placeSearching, setPlaceSearching] = useState(false)

  useEffect(() => {
    if (!user) return
    listWishlist(user.uid)
      .then(setItems)
      .catch(() => setItems([]))
  }, [user])

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
    if (p.rating != null && !note.trim()) setNote(`Google ${p.rating.toFixed(1)} ⭐`)
    setPlaceResults([])
    setPlaceQuery('')
  }

  async function add() {
    if (!user || !name.trim()) return
    const payload = {
      userId: user.uid,
      name: name.trim(),
      note: note.trim(),
      address: address.trim(),
      done: false,
      restaurantId: null,
    }
    const id = await addWishlist(payload)
    setItems((prev) => [{ id, ...payload }, ...(prev ?? [])])
    setName('')
    setNote('')
    setAddress('')
    toast('Agregado a tu lista 📌')
  }

  async function toggle(item: WishlistItem) {
    await updateWishlist(item.id, { done: !item.done })
    setItems((prev) => prev!.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i)))
  }

  async function remove(item: WishlistItem) {
    await deleteWishlist(item.id)
    setItems((prev) => prev!.filter((i) => i.id !== item.id))
  }

  if (items === null) return <Spinner />

  return (
    <>
      <header className="app-header">
        <h1>Por visitar 📌</h1>
      </header>
      <div className="app-main">
        <div className="card">
          <label className="field" style={{ marginBottom: placeResults.length || placeSearching ? 10 : 12 }}>
            <span>🔎 Buscar el lugar</span>
            <input
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              placeholder="Escribe el nombre del restaurante…"
              autoComplete="off"
            />
            <p className="hint">
              {hasGooglePlaces
                ? 'Busca en Google y precarga nombre y dirección.'
                : 'Busca en OpenStreetMap y precarga nombre y dirección.'}
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
              {p.rating != null && (
                <span className="sub" style={{ whiteSpace: 'nowrap' }}>{p.rating.toFixed(1)} ⭐</span>
              )}
            </button>
          ))}

          <label className="field">
            <span>Restaurante por visitar</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del lugar" />
          </label>
          {address && (
            <p className="hint" style={{ marginTop: -4 }}>📍 {address}</p>
          )}
          <label className="field">
            <span>Nota (opcional)</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Me lo recomendó…" />
          </label>
          <button className="btn block" onClick={add} disabled={!name.trim()}>
            + Agregar a la lista
          </button>
        </div>

        {items.length === 0 ? (
          <div className="empty">
            <div className="big">📌</div>
            <p>Anota los restaurantes que quieres probar.</p>
          </div>
        ) : (
          <div className="card">
            {items.map((i) => (
              <div className="list-item" key={i.id}>
                <input
                  type="checkbox"
                  checked={i.done}
                  onChange={() => toggle(i)}
                  style={{ width: 'auto' }}
                />
                <div className="meta">
                  <div className="name" style={{ textDecoration: i.done ? 'line-through' : 'none', opacity: i.done ? 0.5 : 1 }}>
                    {i.name}
                  </div>
                  {i.address && <div className="sub">📍 {i.address}</div>}
                  {i.note && <div className="sub">{i.note}</div>}
                </div>
                <button className="btn ghost" onClick={() => remove(i)} style={{ color: '#d23a3a' }}>
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
