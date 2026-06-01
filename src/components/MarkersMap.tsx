import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
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

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 14)
    else if (points.length > 1) map.fitBounds(points, { padding: [40, 40] })
  }, [map, points])
  return null
}

export function MarkersMap({
  markers,
  height = '70vh',
}: {
  markers: MapMarker[]
  height?: string | number
}) {
  const points = markers.map((m) => [m.lat, m.lng] as [number, number])
  const center: [number, number] = points[0] ?? [-33.4489, -70.6693] // Santiago

  return (
    <div className="map-box" style={{ height }}>
      <MapContainer center={center} zoom={13} scrollWheelZoom>
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />
        <FitBounds points={points} />
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
