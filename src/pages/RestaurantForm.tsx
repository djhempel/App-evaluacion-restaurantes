import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/Toast'
import { SubHeader } from '../components/Layout'
import { Spinner } from '../components/Spinner'
import { PhotoUploader } from '../components/PhotoUploader'
import { createRestaurant, getRestaurant, updateRestaurant } from '../lib/data'
import { uploadImage } from '../lib/storage'
import { getCurrentPosition } from '../lib/utils'
import type { Dish } from '../types'

export function RestaurantForm() {
  const { id } = useParams()
  const editing = Boolean(id)
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(editing)
  const [name, setName] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [address, setAddress] = useState('')
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [photos, setPhotos] = useState<string[]>([])
  const [menuPhotos, setMenuPhotos] = useState<string[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [saving, setSaving] = useState(false)
  const [locBusy, setLocBusy] = useState(false)

  useEffect(() => {
    if (!id) return
    getRestaurant(id)
      .then((r) => {
        if (r) {
          setName(r.name)
          setCuisine(r.cuisine ?? '')
          setAddress(r.address ?? '')
          if (r.lat != null && r.lng != null) setLoc({ lat: r.lat, lng: r.lng })
          setPhotos(r.photos ?? [])
          setMenuPhotos(r.menuPhotos ?? [])
          setDishes(r.dishes ?? [])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  function addDish() {
    setDishes((d) => [...d, { id: crypto.randomUUID(), name: '', price: null }])
  }
  function updateDish(dishId: string, patch: Partial<Dish>) {
    setDishes((d) => d.map((x) => (x.id === dishId ? { ...x, ...patch } : x)))
  }
  function removeDish(dishId: string) {
    setDishes((d) => d.filter((x) => x.id !== dishId))
  }

  async function captureLocation() {
    setLocBusy(true)
    try {
      setLoc(await getCurrentPosition())
      toast('Ubicación capturada 📍')
    } catch {
      toast('No se pudo obtener la ubicación')
    } finally {
      setLocBusy(false)
    }
  }

  async function handleSave() {
    if (!user) return
    if (!name.trim()) {
      toast('Ponle un nombre al restaurante')
      return
    }
    setSaving(true)
    const cleanDishes = dishes
      .filter((d) => d.name.trim())
      .map((d) => ({ ...d, name: d.name.trim(), price: d.price ?? null }))
    try {
      const payload = {
        name: name.trim(),
        cuisine: cuisine.trim(),
        address: address.trim(),
        lat: loc?.lat ?? null,
        lng: loc?.lng ?? null,
        photos,
        menuPhotos,
        dishes: cleanDishes,
        createdBy: user.uid,
        createdByName: user.displayName ?? 'Anónimo',
      }
      if (editing && id) {
        await updateRestaurant(id, payload)
        toast('Restaurante actualizado')
        navigate(`/restaurantes/${id}`, { replace: true })
      } else {
        const newId = await createRestaurant(payload)
        toast('Restaurante creado 🎉')
        navigate(`/restaurantes/${newId}`, { replace: true })
      }
    } catch (e) {
      console.error(e)
      toast('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <>
      <SubHeader title={editing ? 'Editar restaurante' : 'Nuevo restaurante'} />
      <div className="app-main">
        <label className="field">
          <span>Nombre *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: La Mar" />
        </label>
        <label className="field">
          <span>Tipo de cocina</span>
          <input value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="Peruana, italiana…" />
        </label>
        <label className="field">
          <span>Dirección</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Calle, ciudad" />
        </label>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>📍</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700 }}>Ubicación en el mapa</div>
              <div className="hint">
                {loc ? `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : 'Sin ubicación'}
              </div>
            </div>
            <button className="btn secondary small" onClick={captureLocation} disabled={locBusy}>
              {locBusy ? '…' : loc ? 'Actualizar' : 'Usar mi ubicación'}
            </button>
          </div>
        </div>

        <div className="section-title">Fotos del lugar</div>
        <div className="card">
          <PhotoUploader
            value={photos}
            onChange={setPhotos}
            upload={(f) => uploadImage(f, `restaurants/photos`)}
          />
        </div>

        <div className="section-title">Menú (carga las fotos del menú)</div>
        <div className="card">
          <PhotoUploader
            value={menuPhotos}
            onChange={setMenuPhotos}
            upload={(f) => uploadImage(f, `restaurants/menus`)}
          />
          <p className="hint">Sube fotos del menú para luego elegir el plato que evaluaste.</p>
        </div>

        <div className="section-title">Platos de la carta</div>
        <div className="card">
          {dishes.length === 0 && (
            <p className="muted" style={{ textAlign: 'center', margin: '8px 0' }}>
              Agrega los platos que se podrán evaluar (opcional).
            </p>
          )}
          {dishes.map((d) => (
            <div key={d.id} style={{ borderBottom: '1px solid var(--line)', paddingBottom: 10, marginBottom: 10 }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <input
                  placeholder="Nombre del plato"
                  value={d.name}
                  onChange={(e) => updateDish(d.id, { name: e.target.value })}
                  style={{ flex: 2 }}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Precio"
                  value={d.price ?? ''}
                  onChange={(e) => updateDish(d.id, { price: e.target.value ? Number(e.target.value) : null })}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn ghost"
                  onClick={() => removeDish(d.id)}
                  style={{ padding: '8px 10px', color: '#d23a3a' }}
                  aria-label="Quitar plato"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
          <button className="btn secondary small" onClick={addDish}>
            + Agregar plato
          </button>
        </div>

        <button className="btn block" onClick={handleSave} disabled={saving} style={{ marginTop: 12 }}>
          {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear restaurante'}
        </button>
      </div>
    </>
  )
}
