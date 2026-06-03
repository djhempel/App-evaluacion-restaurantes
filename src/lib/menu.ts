import { DISH_CATEGORIES } from '../config/dishes'

export interface ParsedDish {
  name: string
  category: string
  price: number | null
}

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
const MODEL = 'gemini-2.0-flash'
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`
const CATEGORIES = DISH_CATEGORIES.map((c) => c.value)

export const hasMenuAI = Boolean(GEMINI_KEY)

const PROMPT = `Eres un asistente que extrae la CARTA de un restaurante desde una imagen o PDF del menú.
Devuelve SOLO los platos/bebidas que se pueden pedir.
Reglas:
- Cada item: "name" (nombre del plato, sin la descripción larga),
  "category" (una de: ${CATEGORIES.join(', ')}) y "price" (entero en la moneda local, sin símbolos ni puntos de miles; omite si no aparece).
- Clasifica con sentido: aperitivos/tablas = entrada; principales = fondo; vinos/tragos/jugos = bebida;
  guarniciones = acompanamiento; pan/cortesía = pan; dulces = postre; si no calza, "otro".
- No inventes platos ni precios. No incluyas encabezados de sección como si fueran platos.`

interface Part {
  text?: string
  inline_data?: { mime_type: string; data: string }
}

async function callGemini(parts: Part[]): Promise<ParsedDish[]> {
  if (!GEMINI_KEY) throw new Error('Falta configurar VITE_GEMINI_API_KEY')
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            dishes: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  name: { type: 'STRING' },
                  category: { type: 'STRING', enum: CATEGORIES },
                  price: { type: 'NUMBER' },
                },
                required: ['name', 'category'],
              },
            },
          },
          required: ['dishes'],
        },
      },
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.warn('[gemini] error', res.status, detail)
    throw new Error(`El lector de cartas falló (${res.status})`)
  }
  const data = await res.json()
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('Sin respuesta de la IA')
  const parsed = JSON.parse(text) as { dishes?: ParsedDish[] }
  return (parsed.dishes ?? [])
    .filter((d) => d && d.name)
    .map((d) => ({
      name: String(d.name).slice(0, 120).trim(),
      category: CATEGORIES.includes(d.category) ? d.category : 'otro',
      price: typeof d.price === 'number' && d.price > 0 ? Math.round(d.price) : null,
    }))
}

/** Reduce una foto a un JPEG pequeño en base64. */
function fileToScaledBase64(file: File, maxDim = 1600, quality = 0.8): Promise<string> {
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
      if (!ctx) return reject(new Error('No se pudo procesar la imagen'))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality).split(',')[1])
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = url
  })
}

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error('No se pudo descargar la imagen')
  const blob = await res.blob()
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = () => reject(new Error('No se pudo leer la imagen'))
    fr.readAsDataURL(blob)
  })
  return { data: dataUrl.split(',')[1], mimeType: blob.type || 'image/jpeg' }
}

async function fileToRawBase64(file: File): Promise<string> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = () => reject(new Error('No se pudo leer el archivo'))
    fr.readAsDataURL(file)
  })
  return dataUrl.split(',')[1]
}

/** Lee la carta desde un archivo elegido (imagen o PDF). */
export async function parseMenuFromFile(file: File): Promise<ParsedDish[]> {
  if (file.type === 'application/pdf') {
    const data = await fileToRawBase64(file)
    return callGemini([{ text: PROMPT }, { inline_data: { mime_type: 'application/pdf', data } }])
  }
  const data = await fileToScaledBase64(file)
  return callGemini([{ text: PROMPT }, { inline_data: { mime_type: 'image/jpeg', data } }])
}

/** Lee la carta desde fotos del menú ya subidas (Storage). */
export async function parseMenuFromUrls(imageUrls: string[]): Promise<ParsedDish[]> {
  const parts: Part[] = [{ text: PROMPT }]
  for (const u of imageUrls.slice(0, 4)) {
    const { data, mimeType } = await urlToBase64(u)
    parts.push({ inline_data: { mime_type: mimeType, data } })
  }
  return callGemini(parts)
}
