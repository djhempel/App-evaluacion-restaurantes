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
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../firebase'
import type {
  Evaluation,
  FriendRequest,
  Friendship,
  Group,
  GroupMember,
  Restaurant,
  UserProfile,
  WishlistItem,
} from '../types'
import { normalizeText } from './utils'

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
/** Todas las evaluaciones del ecosistema (para rankings agregados). */
export async function listAllEvaluations(): Promise<Evaluation[]> {
  const snap = await getDocs(collection(db, 'evaluations'))
  return byNewest(snap.docs.map((d) => mapDoc<Evaluation>(d)))
}

/** Evaluaciones de un usuario (para su perfil público). */
export async function listEvaluationsByUser(userId: string): Promise<Evaluation[]> {
  const q = query(collection(db, 'evaluations'), where('userId', '==', userId))
  const snap = await getDocs(q)
  return byNewest(snap.docs.map((d) => mapDoc<Evaluation>(d)))
}

/** Perfil público de un usuario. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    return snap.exists() ? (snap.data() as UserProfile) : null
  } catch {
    return null
  }
}

export async function listEvaluationsByRestaurant(
  restaurantId: string,
): Promise<Evaluation[]> {
  // Ecosistema social: todas las evaluaciones del lugar (de cualquier usuario).
  const q = query(collection(db, 'evaluations'), where('restaurantId', '==', restaurantId))
  const snap = await getDocs(q)
  return byNewest(snap.docs.map((d) => mapDoc<Evaluation>(d)))
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

/** Wishlist compartida de un grupo (la ven y editan todos sus miembros). */
export async function listGroupWishlist(groupId: string): Promise<WishlistItem[]> {
  const q = query(collection(db, 'wishlist'), where('groupId', '==', groupId))
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

/* -------------------------------- Amigos -------------------------------- */

function pairId(a: string, b: string): string {
  return [a, b].sort().join('_')
}

/** Busca usuarios por nombre o email (para enviar solicitudes). */
export async function searchUsers(term: string, excludeUid: string): Promise<UserProfile[]> {
  const t = normalizeText(term)
  const email = term.trim().toLowerCase()
  if (t.length < 2) return []
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs
    .map((d) => d.data() as UserProfile)
    .filter(
      (u) =>
        u.uid !== excludeUid &&
        (normalizeText(u.displayName ?? '').includes(t) || (u.email ?? '').toLowerCase().includes(email)),
    )
    .slice(0, 15)
}

export async function sendFriendRequest(from: UserProfile, to: UserProfile): Promise<void> {
  await setDoc(doc(db, 'friendRequests', pairId(from.uid, to.uid)), {
    fromUid: from.uid,
    fromName: from.displayName,
    fromPhoto: from.photoURL ?? '',
    toUid: to.uid,
    toName: to.displayName,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
}

/** Solicitudes recibidas pendientes. */
export async function listIncomingRequests(uid: string): Promise<FriendRequest[]> {
  const q = query(collection(db, 'friendRequests'), where('toUid', '==', uid))
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => mapDoc<FriendRequest>(d))
    .filter((r) => r.status === 'pending')
}

/** Solicitudes que envié (pendientes). */
export async function listOutgoingRequests(uid: string): Promise<FriendRequest[]> {
  const q = query(collection(db, 'friendRequests'), where('fromUid', '==', uid))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapDoc<FriendRequest>(d)).filter((r) => r.status === 'pending')
}

export async function acceptFriendRequest(req: FriendRequest, me: UserProfile): Promise<void> {
  await setDoc(doc(db, 'friendships', pairId(req.fromUid, req.toUid)), {
    uids: [req.fromUid, req.toUid],
    users: [
      { uid: req.fromUid, displayName: req.fromName, photoURL: req.fromPhoto ?? '' },
      { uid: me.uid, displayName: me.displayName, photoURL: me.photoURL ?? '' },
    ],
    createdAt: serverTimestamp(),
  })
  await deleteDoc(doc(db, 'friendRequests', req.id))
}

export async function declineFriendRequest(reqId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendRequests', reqId))
}

export async function listFriendships(uid: string): Promise<Friendship[]> {
  const q = query(collection(db, 'friendships'), where('uids', 'array-contains', uid))
  const snap = await getDocs(q)
  return snap.docs.map((d) => mapDoc<Friendship>(d))
}

/** UIDs de mis amigos. */
export async function listFriendUids(uid: string): Promise<string[]> {
  const fs = await listFriendships(uid)
  return fs.flatMap((f) => f.uids).filter((u) => u !== uid)
}

export async function removeFriend(friendshipId: string): Promise<void> {
  await deleteDoc(doc(db, 'friendships', friendshipId))
}

/* -------------------------------- Grupos -------------------------------- */

function makeInviteCode(): string {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 6)
}

export async function createGroup(
  name: string,
  member: GroupMember,
  emoji = '👥',
): Promise<string> {
  const ref = await addDoc(collection(db, 'groups'), {
    name: name.trim(),
    emoji,
    ownerId: member.uid,
    ownerName: member.name,
    memberUids: [member.uid],
    members: [member],
    inviteCode: makeInviteCode(),
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateGroup(
  id: string,
  data: Partial<Pick<Group, 'name' | 'emoji'>>,
): Promise<void> {
  await updateDoc(doc(db, 'groups', id), data)
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
