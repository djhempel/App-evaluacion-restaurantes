import { FOOD_CRITERIA, MAX_SCORE, MIN_SCORE, PLACE_CRITERIA, categoryAverage } from '../config/scoring'
import { ScoreBadge } from './ScoreBadge'
import { PhotoUploader } from './PhotoUploader'
import type { DishEntries, RatedDish, Restaurant, Scores } from '../types'

interface Props {
  restaurant: Restaurant | null
  dishEntries: DishEntries
  onChangeDishEntries: (d: DishEntries) => void
  placeScores: Scores
  onChangePlaceScores: (s: Scores) => void
  uploadPhoto: (file: File) => Promise<string>
}

export function MealEditor({
  restaurant,
  dishEntries,
  onChangeDishEntries,
  placeScores,
  onChangePlaceScores,
  uploadPhoto,
}: Props) {
  function setDishes(key: string, dishes: RatedDish[]) {
    onChangeDishEntries({ ...dishEntries, [key]: dishes })
  }

  function addDish(key: string) {
    const list = dishEntries[key] ?? []
    setDishes(key, [
      ...list,
      { id: crypto.randomUUID(), name: '', score: 6, comment: '', photos: [], price: null },
    ])
  }

  function updateDish(key: string, dishId: string, patch: Partial<RatedDish>) {
    const list = dishEntries[key] ?? []
    setDishes(
      key,
      list.map((d) => (d.id === dishId ? { ...d, ...patch } : d)),
    )
  }

  function removeDish(key: string, dishId: string) {
    setDishes(key, (dishEntries[key] ?? []).filter((d) => d.id !== dishId))
  }

  return (
    <div>
      {FOOD_CRITERIA.map((c) => {
        const list = dishEntries[c.key] ?? []
        const avg = categoryAverage(list)
        const menuOptions = (restaurant?.dishes ?? []).filter(
          (d) => (d.category ?? 'otro') === c.key,
        )
        return (
          <div className="card" key={c.key}>
            <div className="criterion-head" style={{ marginBottom: 8 }}>
              <span className="emoji">{c.emoji}</span>
              <span className="title">
                {c.label}
                <span className="weight"> · {Math.round(c.weight * 100)}%</span>
              </span>
              {avg != null && <ScoreBadge score={avg} />}
            </div>

            {list.length === 0 && (
              <p className="hint" style={{ marginTop: 0 }}>
                Sin platos. Agrega los que pediste de esta categoría.
              </p>
            )}

            {list.map((dish, idx) => (
              <div
                key={dish.id}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 10,
                }}
              >
                <div className="row" style={{ alignItems: 'center', marginBottom: 8 }}>
                  <input
                    placeholder={`${c.label} ${idx + 1}`}
                    value={dish.name}
                    onChange={(e) => updateDish(c.key, dish.id, { name: e.target.value })}
                    list={`menu-${c.key}`}
                    style={{ flex: 2 }}
                  />
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => removeDish(c.key, dish.id)}
                    style={{ padding: '8px 10px', color: '#d23a3a' }}
                    aria-label="Quitar plato"
                  >
                    🗑️
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <input
                    type="range"
                    min={MIN_SCORE}
                    max={MAX_SCORE}
                    step={0.1}
                    value={dish.score}
                    onChange={(e) => updateDish(c.key, dish.id, { score: Number(e.target.value) })}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontWeight: 800, width: 36, textAlign: 'right' }}>
                    {dish.score.toFixed(1)}
                  </span>
                </div>

                <textarea
                  placeholder="Comentario de este plato (opcional)"
                  value={dish.comment ?? ''}
                  onChange={(e) => updateDish(c.key, dish.id, { comment: e.target.value })}
                  style={{ minHeight: 48, marginBottom: 8 }}
                />

                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Precio del plato (opcional)"
                  value={dish.price ?? ''}
                  onChange={(e) =>
                    updateDish(c.key, dish.id, {
                      price: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  style={{ marginBottom: 8 }}
                />

                <PhotoUploader
                  value={dish.photos ?? []}
                  onChange={(urls) => updateDish(c.key, dish.id, { photos: urls })}
                  upload={uploadPhoto}
                  max={4}
                />
              </div>
            ))}

            <datalist id={`menu-${c.key}`}>
              {menuOptions.map((d) => (
                <option key={d.id} value={d.name} />
              ))}
            </datalist>

            <button type="button" className="btn secondary small" onClick={() => addDish(c.key)}>
              + Agregar {c.label.toLowerCase()}
            </button>
          </div>
        )
      })}

      {/* Lugar y Atención: una sola nota */}
      {PLACE_CRITERIA.map((c) => {
        const value = placeScores[c.key]
        const disabled = value === null
        return (
          <div className={`criterion${disabled ? ' disabled' : ''}`} key={c.key}>
            <div className="criterion-head">
              <span className="emoji">{c.emoji}</span>
              <span className="title">
                {c.label}
                <span className="weight"> · {Math.round(c.weight * 100)}%</span>
              </span>
              <span className="criterion-value">
                {disabled ? '—' : (value as number).toFixed(1)}
              </span>
            </div>
            {!disabled && (
              <input
                type="range"
                min={MIN_SCORE}
                max={MAX_SCORE}
                step={0.1}
                value={value as number}
                onChange={(e) =>
                  onChangePlaceScores({ ...placeScores, [c.key]: Number(e.target.value) })
                }
              />
            )}
            <p className="hint" style={{ margin: '2px 0 0' }}>{c.hint}</p>
            <label className="na-toggle">
              <input
                type="checkbox"
                checked={disabled}
                style={{ width: 'auto' }}
                onChange={(e) =>
                  onChangePlaceScores({ ...placeScores, [c.key]: e.target.checked ? null : 6 })
                }
              />
              No aplica (no reparte su {Math.round(c.weight * 100)}%)
            </label>
          </div>
        )
      })}
    </div>
  )
}
