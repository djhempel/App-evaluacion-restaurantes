import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase'

/** Comprime una imagen en el navegador antes de subirla (ahorra cuota y datos).
 *  Usa <img>+canvas (compatible con HEIC del iPhone, que Safari sí renderiza). */
export async function compressImage(file: File, maxSize = 1280, quality = 0.74): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  try {
    const url = URL.createObjectURL(file)
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const im = new Image()
      im.onload = () => resolve(im)
      im.onerror = () => reject(new Error('img'))
      im.src = url
    })
    URL.revokeObjectURL(url)
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
    const width = Math.round(img.width * scale)
    const height = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    return blob ?? file
  } catch {
    return file
  }
}

/** Sube una imagen a Storage y devuelve la URL pública. */
export async function uploadImage(file: File, folder: string): Promise<string> {
  const blob = await compressImage(file)
  const name = `${folder}/${crypto.randomUUID()}.jpg`
  const storageRef = ref(storage, name)
  await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
  return getDownloadURL(storageRef)
}

export async function uploadMany(files: File[], folder: string): Promise<string[]> {
  return Promise.all(files.map((f) => uploadImage(f, folder)))
}
