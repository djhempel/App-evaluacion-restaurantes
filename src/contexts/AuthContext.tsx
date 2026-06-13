import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, googleProvider, isFirebaseConfigured } from '../firebase'
import { propagateProfile } from '../lib/data'

/** En celulares los popups suelen bloquearse: usamos redirección. */
const isMobile =
  typeof navigator !== 'undefined' &&
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

interface AuthState {
  user: User | null
  loading: boolean
  configured: boolean
  /** Foto de perfil efectiva (personalizada o de Google). */
  photoURL: string
  loginWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  updateAvatar: (url: string) => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [photoURL, setPhotoURL] = useState('')

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return
    }
    // Completa el inicio de sesión cuando volvemos de la redirección de Google.
    getRedirectResult(auth).catch((e) => console.error('redirect login', e))
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setPhotoURL(u?.photoURL ?? '')
      setLoading(false)
      if (u) {
        // Guardamos/actualizamos el perfil del usuario.
        await setDoc(
          doc(db, 'users', u.uid),
          {
            uid: u.uid,
            displayName: u.displayName ?? 'Anónimo',
            email: u.email ?? '',
            photoURL: u.photoURL ?? '',
            lastSeen: serverTimestamp(),
          },
          { merge: true },
        ).catch(() => undefined)
      }
    })
    return unsub
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      configured: isFirebaseConfigured,
      photoURL,
      loginWithGoogle: async () => {
        if (isMobile) {
          // La página navega a Google y vuelve; el inicio se completa solo.
          await signInWithRedirect(auth, googleProvider)
        } else {
          await signInWithPopup(auth, googleProvider)
        }
      },
      logout: async () => {
        await signOut(auth)
      },
      updateAvatar: async (url: string) => {
        if (!auth.currentUser) return
        const uid = auth.currentUser.uid
        await updateProfile(auth.currentUser, { photoURL: url })
        await setDoc(doc(db, 'users', uid), { photoURL: url }, { merge: true })
        setPhotoURL(url)
        // Propaga a publicaciones y comentarios pasados (en segundo plano).
        propagateProfile(uid, { userPhoto: url }).catch(() => undefined)
      },
    }),
    [user, loading, photoURL],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
