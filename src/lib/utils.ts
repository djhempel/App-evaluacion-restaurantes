import type { Timestamp } from 'firebase/firestore'

export function formatDate(ts?: Timestamp): string {
  if (!ts) return ''
  const d = ts.toDate()
  return d.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatMoney(value?: number | null, currency = 'CLP'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  try {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(value)
  } catch {
    return `${value}`
  }
}

/** Obtiene la ubicación actual del navegador. */
export function getCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocalización no disponible'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  })
}

export function classNames(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ')
}

/** Convierte coordenadas en una dirección legible (OpenStreetMap / Nominatim). */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=es`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('No se pudo obtener la dirección')
  const data = (await res.json()) as { display_name?: string }
  return data.display_name ?? ''
}

export interface PlaceResult {
  name: string
  address: string
  lat: number
  lng: number
}

/** Busca lugares por texto (OpenStreetMap / Nominatim). Para autocompletar. */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
    query,
  )}&limit=6&addressdetails=1&namedetails=1&accept-language=es`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('No se pudo buscar el lugar')
  const data = (await res.json()) as Array<{
    display_name: string
    lat: string
    lon: string
    name?: string
    namedetails?: { name?: string }
  }>
  return data.map((d) => ({
    name: d.namedetails?.name || d.name || d.display_name.split(',')[0],
    address: d.display_name,
    lat: Number(d.lat),
    lng: Number(d.lon),
  }))
}

/** Normaliza texto para comparar (minúsculas, sin acentos). */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[áàä]/g, 'a')
    .replace(/[éèë]/g, 'e')
    .replace(/[íìï]/g, 'i')
    .replace(/[óòö]/g, 'o')
    .replace(/[úùü]/g, 'u')
    .replace(/ñ/g, 'n')
    .trim()
}

/** Distancia en kilómetros entre dos coordenadas (fórmula de Haversine). */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const lat1 = (a.lat * Math.PI) / 180
  const lat2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * R * Math.asin(Math.sqrt(h))
}
