import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'
import { listRestaurants } from '../lib/data'
import type { Restaurant } from '../types'
import { Spinner } from '../components/Spinner'

L.Marker.prototype.options.icon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 14)
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] })
    }
  }, [map, points])
  return null
}

export function MapView() {
  const [items, setItems] = useState<Restaurant[] | null>(null)

  useEffect(() => {
    listRestaurants()
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  if (items === null) return <Spinner label="Cargando mapa…" />

  const located = items.filter((r) => r.lat != null && r.lng != null)
  const points = located.map((r) => [r.lat as number, r.lng as number] as [number, number])
  const center: [number, number] = points[0] ?? [-33.4489, -70.6693] // Santiago por defecto

  return (
    <>
      <header className="app-header">
        <h1>Mapa 🗺️</h1>
      </header>
      <div className="app-main">
        {located.length === 0 ? (
          <div className="empty">
            <div className="big">🗺️</div>
            <p>Ningún restaurante tiene ubicación todavía. Agrégala al crearlos.</p>
          </div>
        ) : (
          <div className="map-box" style={{ height: '70vh' }}>
            <MapContainer center={center} zoom={13} scrollWheelZoom>
              <TileLayer
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap"
              />
              <FitBounds points={points} />
              {located.map((r) => (
                <Marker key={r.id} position={[r.lat as number, r.lng as number]}>
                  <Popup>
                    <strong>{r.name}</strong>
                    {r.cuisine && <div>{r.cuisine}</div>}
                    <Link to={`/restaurantes/${r.id}`}>Ver detalle ›</Link>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>
    </>
  )
}
