export interface Cuisine {
  value: string
  label: string
  emoji: string
}

/** Tipos de restaurante / gastronomías para clasificar la wishlist. */
export const CUISINES: Cuisine[] = [
  { value: 'mar', label: 'Comida de mar', emoji: '🦐' },
  { value: 'japones', label: 'Japonés', emoji: '🍣' },
  { value: 'peruano', label: 'Peruano', emoji: '🌶️' },
  { value: 'aleman', label: 'Alemán', emoji: '🥨' },
  { value: 'buffet', label: 'Buffet', emoji: '🍽️' },
  { value: 'chilena', label: 'Chilena', emoji: '🇨🇱' },
  { value: 'parrilla', label: 'Parrilla / Carnes', emoji: '🥩' },
  { value: 'italiano', label: 'Italiano', emoji: '🍝' },
  { value: 'pizza', label: 'Pizzería', emoji: '🍕' },
  { value: 'hamburguesa', label: 'Hamburguesas', emoji: '🍔' },
  { value: 'mexicano', label: 'Mexicano', emoji: '🌮' },
  { value: 'chino', label: 'Chino', emoji: '🥡' },
  { value: 'espanol', label: 'Española', emoji: '🥘' },
  { value: 'arabe', label: 'Árabe / Medio Oriente', emoji: '🧆' },
  { value: 'india', label: 'India', emoji: '🍛' },
  { value: 'tailandes', label: 'Tailandés / Asiático', emoji: '🍜' },
  { value: 'vegetariano', label: 'Vegetariano / Vegano', emoji: '🥗' },
  { value: 'cafe', label: 'Café / Brunch', emoji: '☕' },
  { value: 'postres', label: 'Pastelería / Postres', emoji: '🍰' },
  { value: 'fastfood', label: 'Comida rápida', emoji: '🍟' },
  { value: 'fusion', label: 'Fusión / Otros', emoji: '🍴' },
]

export const CUISINE_BY_VALUE: Record<string, Cuisine> = Object.fromEntries(
  CUISINES.map((c) => [c.value, c]),
)

export function cuisineLabel(value?: string | null): string {
  if (!value) return ''
  const c = CUISINE_BY_VALUE[value]
  return c ? `${c.emoji} ${c.label}` : value
}
