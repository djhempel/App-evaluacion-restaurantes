import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase'

/** Comprime una imagen en el navegador antes de subirla (ahorra cuota y datos). */
export async function compressImage(file: File, maxSize = 1280, quality = 0.8): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, width, height)
  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob ?? file),
      'image/jpeg',
      quality,
    )
  })
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
