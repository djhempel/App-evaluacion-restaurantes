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
}

/** Definición de los criterios y pesos pedidos por el usuario. */
export const CRITERIA: Criterion[] = [
  { key: 'pan', label: 'Pan, mantequilla u otros', weight: 0.05, emoji: '🥖', hint: 'El recibimiento, el pan de cortesía, los snacks iniciales.' },
  { key: 'entrada', label: 'Entrada', weight: 0.20, emoji: '🥗', hint: 'La entrada o primer plato.' },
  { key: 'fondo', label: 'Fondo', weight: 0.30, emoji: '🍽️', hint: 'El plato principal. Lo que más pesa.' },
  { key: 'postre', label: 'Postre', weight: 0.20, emoji: '🍰', hint: 'El cierre dulce.' },
  { key: 'lugar', label: 'Lugar', weight: 0.10, emoji: '🏛️', hint: 'Ambiente, decoración, comodidad, limpieza.' },
  { key: 'atencion', label: 'Atención', weight: 0.15, emoji: '🤵', hint: 'Servicio, amabilidad, tiempos.' },
]

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
