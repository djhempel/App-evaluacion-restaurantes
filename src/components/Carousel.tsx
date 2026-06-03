import { useRef, useState, type ReactNode } from 'react'
import { FOOD_CRITERIA, scoreColor } from '../config/scoring'
import type { Evaluation } from '../types'

export function Carousel({ slides, flush = false }: { slides: ReactNode[]; flush?: boolean }) {
  const [idx, setIdx] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  function onScroll() {
    const el = ref.current
    if (!el) return
    setIdx(Math.round(el.scrollLeft / el.clientWidth))
  }

  const cls = `carousel${flush ? ' flush' : ''}`
  if (slides.length === 0) return null
  if (slides.length === 1) return <div className={cls}>{slides[0]}</div>

  return (
    <div className={cls}>
      <div className="carousel-track" ref={ref} onScroll={onScroll}>
        {slides.map((s, i) => (
          <div className="carousel-slide" key={i}>{s}</div>
        ))}
      </div>
      <span className="carousel-count">{idx + 1}/{slides.length}</span>
      <div className="carousel-dots">
        {slides.map((_, i) => (
          <span className={`cdot ${i === idx ? 'on' : ''}`} key={i} />
        ))}
      </div>
    </div>
  )
}

/** Una "diapositiva" de plato: con foto (imagen) o sin foto (degradado + emoji). */
export function DishSlide({
  photo,
  emoji,
  label,
  name,
  score,
  comment,
}: {
  photo?: string
  emoji: string
  label: string
  name: string
  score: number
  comment?: string
}) {
  return (
    <div className={`dish-slide ${photo ? 'has-photo' : 'no-photo'}`}>
      {photo && <img src={photo} alt="" />}
      <div className="dish-slide-grad" />
      <div className="dish-slide-top">
        <span className="cat">{emoji} {label}</span>
        <span className="sc" style={{ background: scoreColor(score) }}>⭐ {score.toFixed(1)}</span>
      </div>
      {!photo && <div className="dish-slide-emoji">{emoji}</div>}
      <div className="dish-slide-bottom">
        <div className="dn">{name}</div>
        {comment && <div className="cm">“{comment}”</div>}
      </div>
    </div>
  )
}

/** Construye los slides de una evaluación (platos + fotos de la experiencia). */
export function buildEvalSlides(e: Evaluation): ReactNode[] {
  const slides: ReactNode[] = []
  const usedPhotos = new Set<string>()
  for (const c of FOOD_CRITERIA) {
    for (const d of e.dishEntries?.[c.key] ?? []) {
      const photo = d.photos?.[0]
      if (photo) usedPhotos.add(photo)
      slides.push(
        <DishSlide
          key={`${c.key}-${d.id}`}
          photo={photo}
          emoji={c.emoji}
          label={c.label}
          name={d.name || c.label}
          score={d.score}
          comment={d.comment}
        />,
      )
    }
  }
  // Fotos de la experiencia que no estén ya en un plato.
  for (const p of e.photos ?? []) {
    if (usedPhotos.has(p)) continue
    slides.push(
      <div className="dish-slide has-photo" key={`exp-${p}`}>
        <img src={p} alt="" />
      </div>,
    )
  }
  return slides
}
