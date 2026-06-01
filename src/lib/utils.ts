import type { Timestamp } from 'firebase/firestore'
import type { GoogleReview } from '../types'

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

/* Carga el Maps JavaScript API una sola vez (la REST no permite CORS desde
   el navegador; la librería JS sí funciona con la key restringida por dominio). */
let mapsPromise: Promise<unknown> | null = null
function loadMaps(): Promise<unknown> {
  if (mapsPromise) return mapsPromise
  mapsPromise = new Promise((resolve, reject) => {
    const w = window as unknown as { google?: { maps?: unknown } }
    if (w.google?.maps) {
      resolve(w.google)
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places&v=weekly&language=es&region=CL&loading=async`
    script.async = true
    script.onload = () => resolve(w.google)
    script.onerror = () => reject(new Error('maps-load-failed'))
    document.head.appendChild(script)
  })
  return mapsPromise
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Busca lugares con Google Places (incluye la nota de Google). */
async function googleSearchPlaces(query: string): Promise<PlaceResult[]> {
  await loadMaps()
  const g = (window as any).google
  const placesLib = g.maps.importLibrary
    ? await g.maps.importLibrary('places')
    : g.maps.places
  const Place = placesLib.Place
  const { places } = await Place.searchByText({
    textQuery: query,
    fields: ['displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'id'],
    language: 'es',
    region: 'cl',
    maxResultCount: 6,
  })
  return (places ?? []).map((p: any) => ({
    name: p.displayName ?? '',
    address: p.formattedAddress ?? '',
    lat: typeof p.location?.lat === 'function' ? p.location.lat() : 0,
    lng: typeof p.location?.lng === 'function' ? p.location.lng() : 0,
    rating: p.rating ?? null,
    userRatingCount: p.userRatingCount ?? null,
    placeId: p.id ?? null,
  }))
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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

/** Detalles ricos de un lugar de Google (se piden solo al seleccionarlo). */
export interface PlaceDetails {
  rating: number | null
  userRatingCount: number | null
  type: string | null
  phone: string | null
  phoneIntl: string | null
  website: string | null
  mapsUri: string | null
  priceLevel: number | null
  hours: string[] | null
  summary: string | null
  reviews: GoogleReview[] | null
}

const PRICE_LEVEL_MAP: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Pide a Google los datos completos de un lugar (teléfono, reseñas, etc.). */
export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  if (!GOOGLE_KEY) return null
  try {
    await loadMaps()
    const g = (window as any).google
    const placesLib = g.maps.importLibrary
      ? await g.maps.importLibrary('places')
      : g.maps.places
    const place = new placesLib.Place({ id: placeId })
    await place.fetchFields({
      fields: [
        'rating',
        'userRatingCount',
        'primaryTypeDisplayName',
        'nationalPhoneNumber',
        'internationalPhoneNumber',
        'websiteURI',
        'googleMapsURI',
        'priceLevel',
        'regularOpeningHours',
        'editorialSummary',
        'reviews',
      ],
    })
    const reviews: GoogleReview[] = (place.reviews ?? []).slice(0, 5).map((r: any) => ({
      author: r.authorAttribution?.displayName ?? undefined,
      rating: r.rating ?? undefined,
      text: typeof r.text === 'string' ? r.text : (r.text?.text ?? undefined),
      time: r.relativePublishTimeDescription ?? undefined,
    }))
    return {
      rating: place.rating ?? null,
      userRatingCount: place.userRatingCount ?? null,
      type: place.primaryTypeDisplayName ?? null,
      phone: place.nationalPhoneNumber ?? null,
      phoneIntl: place.internationalPhoneNumber ?? null,
      website: place.websiteURI ?? null,
      mapsUri: place.googleMapsURI ?? null,
      priceLevel:
        typeof place.priceLevel === 'string' ? (PRICE_LEVEL_MAP[place.priceLevel] ?? null) : null,
      hours: place.regularOpeningHours?.weekdayDescriptions ?? null,
      summary:
        typeof place.editorialSummary === 'string'
          ? place.editorialSummary
          : (place.editorialSummary?.text ?? null),
      reviews: reviews.length ? reviews : null,
    }
  } catch (e) {
    console.warn('[fetchPlaceDetails] Google falló:', e)
    return null
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

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
    } catch (e) {
      // Si Google falla (cuota, red, config…), usamos OSM como respaldo.
      console.warn('[searchPlaces] Google falló, usando OpenStreetMap:', e)
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
