export interface DishCategory {
  value: string
  label: string
  emoji: string
}

/** Tipos de plato para la carta y las evaluaciones. */
export const DISH_CATEGORIES: DishCategory[] = [
  { value: 'pan', label: 'Pan / Cortesía', emoji: '🥖' },
  { value: 'entrada', label: 'Entrada', emoji: '🥗' },
  { value: 'fondo', label: 'Fondo', emoji: '🍽️' },
  { value: 'postre', label: 'Postre', emoji: '🍰' },
  { value: 'bebida', label: 'Para beber', emoji: '🍹' },
  { value: 'acompanamiento', label: 'Acompañamiento', emoji: '🍟' },
  { value: 'otro', label: 'Otro', emoji: '🍴' },
]

export const DISH_CATEGORY_BY_VALUE: Record<string, DishCategory> =
  DISH_CATEGORIES.reduce(
    (acc, c) => {
      acc[c.value] = c
      return acc
    },
    {} as Record<string, DishCategory>,
  )

export function dishCategoryLabel(value?: string | null): string {
  if (!value) return ''
  const c = DISH_CATEGORY_BY_VALUE[value]
  return c ? `${c.emoji} ${c.label}` : value
}
