import { useRef, useState } from 'react'

interface Props {
  /** URLs ya subidas. */
  value: string[]
  onChange: (urls: string[]) => void
  /** Sube un archivo y devuelve su URL. */
  upload: (file: File) => Promise<string>
  label?: string
  max?: number
}

export function PhotoUploader({ value, onChange, upload, label, max = 9 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setBusy(true)
    try {
      const slots = Math.max(0, max - value.length)
      const chosen = Array.from(files).slice(0, slots)
      const urls: string[] = []
      for (const f of chosen) {
        urls.push(await upload(f))
      }
      onChange([...value, ...urls])
    } catch (e) {
      console.error(e)
      alert('No se pudo subir la foto. Revisa tu conexión.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div>
      {label && <span className="hint" style={{ fontWeight: 700, display: 'block', marginBottom: 6 }}>{label}</span>}
      <div className="photo-grid">
        {value.map((url, i) => (
          <div className="photo-wrap" key={url + i}>
            <img src={url} alt="" className="photo-thumb" />
            <button
              type="button"
              className="remove"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              aria-label="Quitar foto"
            >
              ×
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            className="photo-add"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
          >
            {busy ? (
              <div className="spinner" style={{ width: 22, height: 22 }} />
            ) : (
              <>
                <span className="icon">📷</span>
                Agregar
              </>
            )}
          </button>
        )}
      </div>
      {/* Sin "capture": el sistema deja elegir entre cámara o galería. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
