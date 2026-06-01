import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

export interface ParsedDish {
  name: string
  category: string
  price: number | null
}

interface ParseMenuPayload {
  imageBase64?: string
  mimeType?: string
  imageUrls?: string[]
  url?: string
}

async function callParseMenu(payload: ParseMenuPayload): Promise<ParsedDish[]> {
  const fn = httpsCallable<ParseMenuPayload, { dishes: ParsedDish[] }>(functions, 'parseMenu')
  const res = await fn(payload)
  return res.data?.dishes ?? []
}

/** Reduce una foto a un JPEG pequeño en base64 (mejor para subir y para el costo). */
function fileToScaledBase64(
  file: File,
  maxDim = 1600,
  quality = 0.8,
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('No se pudo procesar la imagen'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

/** Lee la carta desde una foto recién elegida (se reduce antes de enviar). */
export async function parseMenuFromFile(file: File): Promise<ParsedDish[]> {
  const { base64, mimeType } = await fileToScaledBase64(file)
  return callParseMenu({ imageBase64: base64, mimeType })
}

/** Lee la carta desde fotos del menú ya subidas (la Function las descarga). */
export function parseMenuFromUrls(imageUrls: string[]): Promise<ParsedDish[]> {
  return callParseMenu({ imageUrls })
}

/** Lee la carta desde un link (página, PDF o imagen). */
export function parseMenuFromLink(url: string): Promise<ParsedDish[]> {
  return callParseMenu({ url })
}
