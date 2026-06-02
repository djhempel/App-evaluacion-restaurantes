import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  title: string
  subtitle?: string
  /** Color del pin (CSS). */
  color: string
  /** Ruta interna opcional (para "Ver detalle"). */
  to?: string
}

function pinIcon(color: string) {
  return L.divIcon({
    className: 'marker-pin',
    html: `<div style="width:18px;height:18px;background:${color};border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 1px 3px rgba(0,0,0,.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
    popupAnchor: [0, -18],
  })
}

const originIcon = L.divIcon({
  className: 'origin-marker',
  html: '<div class="origin-pulse"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
  popupAnchor: [0, -10],
})

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 14)
    else if (points.length > 1) map.fitBounds(points, { padding: [44, 44] })
  }, [map, points])
  return null
}

export function MarkersMap({
  markers,
  height = '70vh',
  origin,
  radiusMeters,
}: {
  markers: MapMarker[]
  height?: string | number
  origin?: { lat: number; lng: number; label?: string }
  radiusMeters?: number
}) {
  const points: [number, number][] = markers.map((m) => [m.lat, m.lng])
  if (origin) points.push([origin.lat, origin.lng])
  const center: [number, number] = origin
    ? [origin.lat, origin.lng]
    : points[0] ?? [-33.4489, -70.6693] // Santiago

  return (
    <div className="map-box" style={{ height }}>
      <MapContainer center={center} zoom={14} scrollWheelZoom>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        <FitBounds points={points} />

        {origin && radiusMeters ? (
          <Circle
            center={[origin.lat, origin.lng]}
            radius={radiusMeters}
            pathOptions={{ color: '#e85d04', weight: 1.5, fillColor: '#e85d04', fillOpacity: 0.06 }}
          />
        ) : null}

        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
            <Popup>
              <strong>{origin.label || 'Tu ubicación'}</strong>
            </Popup>
          </Marker>
        )}

        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={pinIcon(m.color)}>
            <Popup>
              <strong>{m.title}</strong>
              {m.subtitle && <div>{m.subtitle}</div>}
              {m.to && <Link to={m.to}>Ver detalle ›</Link>}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
