import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { SubHeader } from '../components/Layout'
import { Spinner } from '../components/Spinner'
import { addWishlist, deleteWishlist, listWishlist, updateWishlist } from '../lib/data'
import type { WishlistItem } from '../types'

export function Wishlist() {
  const { user } = useAuth()
  const toast = useToast()
  const [items, setItems] = useState<WishlistItem[] | null>(null)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!user) return
    listWishlist(user.uid)
      .then(setItems)
      .catch(() => setItems([]))
  }, [user])

  async function add() {
    if (!user || !name.trim()) return
    const id = await addWishlist({
      userId: user.uid,
      name: name.trim(),
      note: note.trim(),
      done: false,
      restaurantId: null,
    })
    setItems((prev) => [
      { id, userId: user.uid, name: name.trim(), note: note.trim(), done: false, restaurantId: null },
      ...(prev ?? []),
    ])
    setName('')
    setNote('')
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
      <SubHeader title="Por visitar 📌" />
      <div className="app-main">
        <div className="card">
          <label className="field">
            <span>Restaurante por visitar</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del lugar" />
          </label>
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
