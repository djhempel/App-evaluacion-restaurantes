import type { CriterionKey, Scores } from '../types'

/** Escala de notas chilena: de 1.0 a 7.0. */
export const MIN_SCORE = 1
export const MAX_SCORE = 7

/** Convierte una nota (1-7) a porcentaje, para barras de progreso. */
export function scorePercent(value: number): number {
  return Math.max(0, Math.min(100, (value / MAX_SCORE) * 100))
}

export interface Criterion {
  key: CriterionKey
  label: string
  /** Peso por defecto (suman 1.0). */
  weight: number
  emoji: string
  hint: string
  /** 'food' admite varios platos; 'place' es una sola nota. */
  kind: 'food' | 'place'
}

/** Definición de los criterios y pesos pedidos por el usuario. */
export const CRITERIA: Criterion[] = [
  { key: 'pan', label: 'Pan, mantequilla u otros', weight: 0.05, emoji: '🥖', kind: 'food', hint: 'El recibimiento, el pan de cortesía, los snacks iniciales.' },
  { key: 'entrada', label: 'Entrada', weight: 0.20, emoji: '🥗', kind: 'food', hint: 'Las entradas o primeros platos.' },
  { key: 'fondo', label: 'Fondo', weight: 0.30, emoji: '🍽️', kind: 'food', hint: 'Los platos principales. Lo que más pesa.' },
  { key: 'postre', label: 'Postre', weight: 0.20, emoji: '🍰', kind: 'food', hint: 'Los postres.' },
  { key: 'lugar', label: 'Lugar', weight: 0.10, emoji: '🏛️', kind: 'place', hint: 'Ambiente, decoración, comodidad, limpieza.' },
  { key: 'atencion', label: 'Atención', weight: 0.15, emoji: '🤵', kind: 'place', hint: 'Servicio, amabilidad, tiempos.' },
]

/** Criterios que admiten varios platos (entrada, fondo, etc.). */
export const FOOD_CRITERIA = CRITERIA.filter((c) => c.kind === 'food')
/** Criterios de una sola nota (lugar, atención). */
export const PLACE_CRITERIA = CRITERIA.filter((c) => c.kind === 'place')

export const CRITERIA_BY_KEY: Record<CriterionKey, Criterion> = CRITERIA.reduce(
  (acc, c) => {
    acc[c.key] = c
    return acc
  },
  {} as Record<CriterionKey, Criterion>,
)

export function emptyScores(): Scores {
  return {
    pan: null,
    entrada: null,
    fondo: null,
    postre: null,
    lugar: null,
    atencion: null,
  }
}

/** Promedio (1 decimal) de las notas de los platos de una categoría. */
export function categoryAverage(
  dishes: { score: number | null }[] | undefined,
): number | null {
  if (!dishes || dishes.length === 0) return null
  const valid = dishes.filter((d) => d.score != null) as { score: number }[]
  if (valid.length === 0) return null
  const avg = valid.reduce((s, d) => s + d.score, 0) / valid.length
  return Math.round(avg * 10) / 10
}

/**
 * Calcula la nota final ponderada en escala 1-7.
 * Los criterios marcados como "No aplica" (null) se excluyen y su peso
 * se reparte proporcionalmente entre los criterios sí evaluados.
 * Así funciona bien para buffets/all-inclusive sin postre, etc.
 */
export function computeFinalScore(scores: Scores): number {
  let weightedSum = 0
  let totalWeight = 0
  for (const c of CRITERIA) {
    const value = scores[c.key]
    if (value === null || value === undefined) continue
    weightedSum += value * c.weight
    totalWeight += c.weight
  }
  if (totalWeight === 0) return 0
  return Math.round((weightedSum / totalWeight) * 10) / 10
}

/** Cuántos criterios fueron efectivamente puntuados. */
export function ratedCount(scores: Scores): number {
  return CRITERIA.filter((c) => scores[c.key] !== null && scores[c.key] !== undefined).length
}

/** Color según la nota (escala 1-7, para badges). */
export function scoreColor(score: number): string {
  if (score >= 6.5) return '#2e9e4f'
  if (score >= 5.5) return '#7cb518'
  if (score >= 4) return '#f4a300'
  if (score > 0) return '#e85d04'
  return '#9aa0a6'
}

export function scoreLabel(score: number): string {
  if (score >= 6.5) return 'Excelente'
  if (score >= 6) return 'Muy bueno'
  if (score >= 5) return 'Bueno'
  if (score >= 4) return 'Regular'
  if (score > 0) return 'Malo'
  return 'Sin nota'
}
