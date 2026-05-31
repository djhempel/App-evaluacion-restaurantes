import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Evaluation, Restaurant, WishlistItem } from '../types'

function mapDoc<T>(snap: QueryDocumentSnapshot<DocumentData>): T {
  return { id: snap.id, ...snap.data() } as T
}

/* ----------------------------- Restaurantes ----------------------------- */

export async function listRestaurants(): Promise<Restaurant[]> {
  const q = query(collection(db, 'restaurants'), orderBy('name'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapDoc<Restaurant>(d))
}

export async function getRestaurant(id: string): Promise<Restaurant | null> {
  const snap = await getDoc(doc(db, 'restaurants', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Restaurant) : null
}

export async function createRestaurant(
  data: Omit<Restaurant, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'restaurants'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateRestaurant(
  id: string,
  data: Partial<Restaurant>,
): Promise<void> {
  await updateDoc(doc(db, 'restaurants', id), data as DocumentData)
}

/* ----------------------------- Evaluaciones ----------------------------- */

/** Ordena por fecha de creación descendente (más reciente primero). */
function byNewest<T extends { createdAt?: { toMillis(): number } }>(items: T[]): T[] {
  return items.sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  )
}

export async function listMyEvaluations(userId: string): Promise<Evaluation[]> {
  // Sin orderBy para no requerir índice compuesto; ordenamos en cliente.
  const q = query(collection(db, 'evaluations'), where('userId', '==', userId))
  const snap = await getDocs(q)
  return byNewest(snap.docs.map((d) => mapDoc<Evaluation>(d)))
}

export async function listAllEvaluations(): Promise<Evaluation[]> {
  const q = query(collection(db, 'evaluations'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapDoc<Evaluation>(d))
}

export async function listEvaluationsByRestaurant(
  restaurantId: string,
): Promise<Evaluation[]> {
  // Sin orderBy para no requerir índice compuesto; ordenamos en cliente.
  const q = query(
    collection(db, 'evaluations'),
    where('restaurantId', '==', restaurantId),
  )
  const snap = await getDocs(q)
  const items = snap.docs.map((d) => mapDoc<Evaluation>(d))
  return items.sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  )
}

export async function getEvaluation(id: string): Promise<Evaluation | null> {
  const snap = await getDoc(doc(db, 'evaluations', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Evaluation) : null
}

export async function createEvaluation(
  data: Omit<Evaluation, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'evaluations'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateEvaluation(
  id: string,
  data: Partial<Evaluation>,
): Promise<void> {
  await updateDoc(doc(db, 'evaluations', id), data as DocumentData)
}

export async function deleteEvaluation(id: string): Promise<void> {
  await deleteDoc(doc(db, 'evaluations', id))
}

/* ------------------------------- Wishlist ------------------------------- */

export async function listWishlist(userId: string): Promise<WishlistItem[]> {
  // Sin orderBy para no requerir índice compuesto; ordenamos en cliente.
  const q = query(collection(db, 'wishlist'), where('userId', '==', userId))
  const snap = await getDocs(q)
  return byNewest(snap.docs.map((d) => mapDoc<WishlistItem>(d)))
}

export async function addWishlist(
  data: Omit<WishlistItem, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'wishlist'), {
    ...data,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateWishlist(
  id: string,
  data: Partial<WishlistItem>,
): Promise<void> {
  await updateDoc(doc(db, 'wishlist', id), data as DocumentData)
}

export async function deleteWishlist(id: string): Promise<void> {
  await deleteDoc(doc(db, 'wishlist', id))
}
