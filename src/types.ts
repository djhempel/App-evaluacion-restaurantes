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
  createdBy: string
  createdByName?: string
  createdAt?: Timestamp
}

/** Una puntuación por criterio. `null` = "No aplica" (se reparte su peso). */
export type Scores = Record<CriterionKey, number | null>

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
  scores: Scores
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
