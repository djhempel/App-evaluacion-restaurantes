import {
  addDoc,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { Evaluation, Group, GroupMember, Restaurant, WishlistItem } from '../types'

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

/** Evaluaciones públicas de todos los usuarios (para ranking y explorar). */
export async function listPublicEvaluations(): Promise<Evaluation[]> {
  const q = query(collection(db, 'evaluations'), where('isPublic', '==', true))
  const snap = await getDocs(q)
  return byNewest(snap.docs.map((d) => mapDoc<Evaluation>(d)))
}

/**
 * Evaluaciones de un restaurante que el usuario puede ver: todas las públicas
 * (de cualquiera) más las propias (aunque sean privadas).
 */
export async function listEvaluationsByRestaurant(
  restaurantId: string,
  userId: string,
): Promise<Evaluation[]> {
  const [pub, mine] = await Promise.all([
    listPublicEvaluations(),
    listMyEvaluations(userId),
  ])
  const byId = new Map<string, Evaluation>()
  for (const e of [...pub, ...mine]) {
    if (e.restaurantId === restaurantId) byId.set(e.id, e)
  }
  return byNewest(Array.from(byId.values()))
}

export async function getEvaluation(id: string): Promise<Evaluation | null> {
  try {
    const snap = await getDoc(doc(db, 'evaluations', id))
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Evaluation) : null
  } catch {
    // Sin permiso para leerla (es privada de otra persona).
    return null
  }
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

/* -------------------------------- Grupos -------------------------------- */

function makeInviteCode(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6)
}

export async function createGroup(
  name: string,
  member: GroupMember,
): Promise<string> {
  const ref = await addDoc(collection(db, 'groups'), {
    name: name.trim(),
    ownerId: member.uid,
    ownerName: member.name,
    memberUids: [member.uid],
    members: [member],
    inviteCode: makeInviteCode(),
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function listMyGroups(uid: string): Promise<Group[]> {
  const q = query(collection(db, 'groups'), where('memberUids', 'array-contains', uid))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapDoc<Group>(d))
}

export async function getGroup(id: string): Promise<Group | null> {
  try {
    const snap = await getDoc(doc(db, 'groups', id))
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null
  } catch {
    return null
  }
}

export async function getGroupByCode(code: string): Promise<Group | null> {
  const q = query(collection(db, 'groups'), where('inviteCode', '==', code), limit(1))
  const snap = await getDocs(q)
  return snap.empty ? null : mapDoc<Group>(snap.docs[0])
}

export async function joinGroup(groupId: string, member: GroupMember): Promise<void> {
  await updateDoc(doc(db, 'groups', groupId), {
    memberUids: arrayUnion(member.uid),
    members: arrayUnion(member),
  })
}

export async function listEvaluationsByGroup(groupId: string): Promise<Evaluation[]> {
  const q = query(collection(db, 'evaluations'), where('groupId', '==', groupId))
  const snap = await getDocs(q)
  return byNewest(snap.docs.map((d) => mapDoc<Evaluation>(d)))
}
