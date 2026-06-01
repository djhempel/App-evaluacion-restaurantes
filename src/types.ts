import type { Timestamp } from 'firebase/firestore'

/** Las 6 categorías que se evalúan, con sus pesos por defecto. */
export type CriterionKey =
  | 'pan'
  | 'entrada'
  | 'fondo'
  | 'postre'
  | 'lugar'
  | 'atencion'

export interface UserProfile {
  uid: string
  displayName: string
  email: string
  photoURL: string
  createdAt?: Timestamp
}

export interface Dish {
  id: string
  name: string
  description?: string
  /** Precio referencial del plato (opcional). */
  price?: number | null
  category?: string
}

export interface Restaurant {
  id: string
  name: string
  /** Tipo de cocina / etiqueta corta. */
  cuisine?: string
  address?: string
  lat?: number | null
  lng?: number | null
  /** URLs de fotos del lugar en Storage. */
  photos: string[]
  /** Fotos del menú cargado (para luego elegir el plato). */
  menuPhotos: string[]
  /** Link a la carta web del restaurante (opcional). */
  menuUrl?: string
  /** Carta de platos para evaluar. */
  dishes: Dish[]
  /** Nota de Google (0–5) y nº de reseñas, si se cargó desde Google Places. */
  googleRating?: number | null
  googleRatingCount?: number | null
  /** ID del lugar en Google (para futuras consultas). */
  googlePlaceId?: string | null
  createdBy: string
  createdByName?: string
  createdAt?: Timestamp
}

/** Una puntuación por criterio. `null` = "No aplica" (se reparte su peso). */
export type Scores = Record<CriterionKey, number | null>

/** Un plato evaluado individualmente dentro de una categoría. */
export interface RatedDish {
  id: string
  name: string
  /** Nota 1-7 del plato. */
  score: number
  comment?: string
  photos?: string[]
  price?: number | null
}

/** Platos evaluados por categoría de comida (entrada, fondo, postre, pan). */
export type DishEntries = Record<string, RatedDish[]>

export interface Evaluation {
  id: string
  userId: string
  userName: string
  userPhoto?: string
  restaurantId: string
  restaurantName: string
  restaurantCuisine?: string
  dishId?: string | null
  dishName?: string | null
  /** Tipo del plato evaluado (entrada, fondo, postre, bebida…). */
  dishCategory?: string | null
  /** Promedio por criterio (food = promedio de sus platos; place = nota directa). */
  scores: Scores
  /** Detalle de los platos evaluados por categoría. */
  dishEntries?: DishEntries
  /** Nota final ponderada en escala 1-7, calculada y guardada. */
  finalScore: number
  comment?: string
  /** Fotos de la experiencia (platos, lugar). */
  photos: string[]
  /** Precio por persona pagado (OPCIONAL: buffets/all-inclusive pueden no tenerlo). */
  pricePerPerson?: number | null
  currency?: string
  /** Ubicación capturada al momento de evaluar (puede diferir de la del restaurante). */
  lat?: number | null
  lng?: number | null
  address?: string
  /** Si es público, cualquiera con el link puede verla sin login. */
  isPublic: boolean
  /** Nivel de visibilidad: privada, de grupo o pública. */
  visibility?: Visibility
  /** Grupo con el que se comparte (cuando visibility === 'group'). */
  groupId?: string | null
  /** UIDs que pueden leerla (denormalizado para las reglas y consultas). */
  allowedUids?: string[]
  createdAt?: Timestamp
  visitedAt?: string
}

export interface WishlistItem {
  id: string
  userId: string
  name: string
  cuisine?: string
  address?: string
  note?: string
  restaurantId?: string | null
  done: boolean
  createdAt?: Timestamp
}

export interface GroupMember {
  uid: string
  name: string
  photo?: string
}

export interface Group {
  id: string
  name: string
  ownerId: string
  ownerName?: string
  memberUids: string[]
  members: GroupMember[]
  inviteCode: string
  createdAt?: Timestamp
}

/** Quién puede ver una evaluación. */
export type Visibility = 'private' | 'group' | 'public'
