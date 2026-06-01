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
  /** Nota de Google (0–5), solo si vino de Google Places. */
  rating?: number | null
  /** Nº de reseñas en Google. */
  userRatingCount?: number | null
  /** ID del lugar en Google. */
  placeId?: string | null
}

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

/** Busca lugares con Google Places (incluye la nota de Google). */
async function googleSearchPlaces(query: string): Promise<PlaceResult[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_KEY as string,
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount',
    },
    body: JSON.stringify({ textQuery: query, languageCode: 'es', regionCode: 'CL' }),
  })
  if (!res.ok) throw new Error('google-failed')
  const data = (await res.json()) as {
    places?: Array<{
      id: string
      displayName?: { text?: string }
      formattedAddress?: string
      location?: { latitude: number; longitude: number }
      rating?: number
      userRatingCount?: number
    }>
  }
  return (data.places ?? []).map((p) => ({
    name: p.displayName?.text ?? p.formattedAddress ?? '',
    address: p.formattedAddress ?? '',
    lat: p.location?.latitude ?? 0,
    lng: p.location?.longitude ?? 0,
    rating: p.rating ?? null,
    userRatingCount: p.userRatingCount ?? null,
    placeId: p.id ?? null,
  }))
}

/** Búsqueda con OpenStreetMap / Nominatim (sin nota; respaldo gratuito). */
async function osmSearchPlaces(query: string): Promise<PlaceResult[]> {
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

/** ¿Está configurada la búsqueda de Google? */
export const hasGooglePlaces = Boolean(GOOGLE_KEY)

/**
 * Busca lugares para autocompletar. Usa Google Places (con nota de Google) si
 * hay API key configurada; si no, o si Google falla, cae a OpenStreetMap.
 */
export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  if (GOOGLE_KEY) {
    try {
      return await googleSearchPlaces(query)
    } catch {
      /* si Google falla (cuota, red…), usamos OSM */
    }
  }
  return osmSearchPlaces(query)
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
