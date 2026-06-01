const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const logger = require('firebase-functions/logger')

// La API key de Gemini se guarda en Secret Manager (no en el código):
//   firebase functions:secrets:set GEMINI_API_KEY
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')

// Modelo de Gemini. Flash = rápido y barato, con visión y salida estructurada.
const MODEL = 'gemini-2.0-flash'

// Mismas categorías que la app (src/config/dishes.ts).
const CATEGORIES = ['pan', 'entrada', 'fondo', 'postre', 'bebida', 'acompanamiento', 'otro']

const PROMPT = `Eres un asistente que extrae la CARTA de un restaurante a partir de una imagen,
un PDF o el texto de una página web. Devuelve SOLO los platos/bebidas que se pueden pedir.

Reglas:
- Cada item: "name" (nombre del plato tal como aparece, sin la descripción larga),
  "category" (una de: ${CATEGORIES.join(', ')}) y "price" (número entero en la moneda local,
  sin símbolos ni puntos de miles; omite el precio si no aparece).
- Clasifica con sentido común: aperitivos/tablas = entrada; platos principales = fondo;
  vinos/tragos/jugos/bebestibles = bebida; guarniciones = acompanamiento; pan/cortesía = pan;
  dulces = postre; si no calza, "otro".
- No inventes platos ni precios. Si no hay carta, devuelve una lista vacía.
- No incluyas encabezados de sección (ej. "ENTRADAS") como si fueran platos.`

async function fetchBuffer(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (MenuParser)' } })
  if (!res.ok) throw new Error(`No se pudo descargar (${res.status})`)
  const contentType = res.headers.get('content-type') || ''
  const buffer = Buffer.from(await res.arrayBuffer())
  return { contentType, buffer }
}

/** Convierte una URL de imagen/PDF en una parte inline para Gemini. */
async function urlToInlinePart(url) {
  const { contentType, buffer } = await fetchBuffer(url)
  const mimeType = contentType.split(';')[0] || 'image/jpeg'
  return { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } }
}

/** Lee un link de carta: imagen/PDF → parte inline; HTML → texto limpio. */
async function urlToPart(url) {
  const { contentType, buffer } = await fetchBuffer(url)
  const ct = contentType.toLowerCase()
  if (ct.startsWith('image/') || ct.includes('pdf')) {
    const mimeType = ct.includes('pdf') ? 'application/pdf' : ct.split(';')[0]
    return { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } }
  }
  // HTML / texto: quita scripts, estilos y etiquetas.
  const text = buffer
    .toString('utf8')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000)
  return { text: `CONTENIDO DE LA PÁGINA DE LA CARTA:\n${text}` }
}

exports.parseMenu = onCall(
  { secrets: [GEMINI_API_KEY], timeoutSeconds: 120, memory: '512MiB', cors: true },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Debes iniciar sesión.')
    }

    const { imageBase64, mimeType, imageUrls, url } = request.data || {}
    const parts = [{ text: PROMPT }]

    try {
      if (imageBase64) {
        parts.push({ inline_data: { mime_type: mimeType || 'image/jpeg', data: imageBase64 } })
      }
      if (Array.isArray(imageUrls)) {
        for (const u of imageUrls.slice(0, 4)) parts.push(await urlToInlinePart(u))
      }
      if (url) {
        parts.push(await urlToPart(url))
      }
    } catch (e) {
      logger.error('Error leyendo la entrada:', e)
      throw new HttpsError('invalid-argument', `No se pudo leer la carta: ${e.message}`)
    }

    if (parts.length === 1) {
      throw new HttpsError('invalid-argument', 'Envía una foto, fotos del menú o un link de la carta.')
    }

    const body = {
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
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY.value()}`
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const detail = await res.text()
      logger.error('Gemini respondió error:', res.status, detail)
      throw new HttpsError('internal', `El lector de cartas falló (${res.status}).`)
    }

    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw new HttpsError('internal', 'No se pudo leer la carta (sin respuesta).')
    }

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new HttpsError('internal', 'La respuesta del lector no fue válida.')
    }

    const dishes = (parsed.dishes || [])
      .filter((d) => d && d.name)
      .map((d) => ({
        name: String(d.name).slice(0, 120).trim(),
        category: CATEGORIES.includes(d.category) ? d.category : 'otro',
        price: typeof d.price === 'number' && d.price > 0 ? Math.round(d.price) : null,
      }))

    return { dishes }
  },
)
