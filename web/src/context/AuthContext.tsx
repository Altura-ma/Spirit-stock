import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut as firebaseSignOut, onAuthStateChanged, sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, firebaseConfigReady, missingFirebaseEnv } from '../config/firebase'
import AppLoadingSkeleton from '../components/AppLoadingSkeleton'
import { AppUser } from '../types'

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, restaurantName: string) => Promise<void>
  signUpSupplier: (email: string, password: string, name: string, phone: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  startCheckout: () => Promise<void>
  openBillingPortal: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

function parseUser(uid: string, email: string, d: Record<string, any>): AppUser {
  return {
    uid,
    email,
    restaurantId: d.restaurantId ?? '',
    restaurantName: d.restaurantName ?? d.name ?? '',
    role: d.role ?? 'restaurant',
    supplierId: d.supplierId,
    subscriptionStatus: d.subscriptionStatus,
    stripeCustomerId: d.stripeCustomerId,
  }
}

function FirebaseConfigError() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="card p-6 max-w-sm w-full text-center space-y-4">
        <img src="/logo-spirit-stock.png" alt="Spirit Stock" className="w-20 h-20 object-contain mx-auto" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Chargement indisponible</h1>
          <p className="text-gray-500 text-sm mt-2">
            Configuration Firebase manquante côté production. L’application ne peut pas charger les comptes pour le moment.
          </p>
        </div>
        <div className="bg-danger-light text-danger text-xs p-3 rounded-xl text-left break-words">
          Variables à corriger dans Vercel : {missingFirebaseEnv.join(', ')}
        </div>
      </div>
    </div>
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firebaseConfigReady) {
      setLoading(false)
      return
    }

    let unsub = () => {}
    try {
      unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            const snap = await getDoc(doc(db, 'users', firebaseUser.uid))
            if (snap.exists()) {
              setUser(parseUser(firebaseUser.uid, firebaseUser.email ?? '', snap.data()))
            } else setUser(null)
          } else setUser(null)
        } catch { setUser(null) }
        finally { setLoading(false) }
      }, () => { setUser(null); setLoading(false) })
    } catch (e) {
      console.error('Firebase auth error:', e)
      setLoading(false)
    }
    return unsub
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!firebaseConfigReady) throw Object.assign(new Error('Configuration Firebase manquante'), { code: 'app/config-missing' })
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const snap = await getDoc(doc(db, 'users', cred.user.uid))
    if (snap.exists()) {
      setUser(parseUser(cred.user.uid, cred.user.email ?? '', snap.data()))
    } else {
      await firebaseSignOut(auth)
      throw Object.assign(new Error(), { code: 'app/incomplete-account' })
    }
  }

  const signUp = async (email: string, password: string, restaurantName: string) => {
    if (!firebaseConfigReady) throw Object.assign(new Error('Configuration Firebase manquante'), { code: 'app/config-missing' })
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    try {
      const restRef = await addDoc(collection(db, 'restaurants'), { name: restaurantName, ownerId: cred.user.uid, createdAt: serverTimestamp() })
      await setDoc(doc(db, 'users', cred.user.uid), {
        email, restaurantId: restRef.id, restaurantName, role: 'restaurant',
        subscriptionStatus: 'pending_checkout', createdAt: serverTimestamp(),
      })
      setUser({ uid: cred.user.uid, email, restaurantId: restRef.id, restaurantName, role: 'restaurant', subscriptionStatus: 'pending_checkout' })
    } catch (err) {
      await cred.user.delete()
      throw err
    }
  }

  const signUpSupplier = async (email: string, password: string, name: string, phone: string) => {
    if (!firebaseConfigReady) throw Object.assign(new Error('Configuration Firebase manquante'), { code: 'app/config-missing' })
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    try {
      const supplierRef = await addDoc(collection(db, 'suppliers'), {
        name, phone, email, restaurantId: '', isGlobal: false, createdAt: serverTimestamp(),
      })
      await setDoc(doc(db, 'users', cred.user.uid), {
        email, role: 'supplier', supplierId: supplierRef.id, name, createdAt: serverTimestamp(),
      })
      setUser({ uid: cred.user.uid, email, restaurantId: '', restaurantName: name, role: 'supplier', supplierId: supplierRef.id })
    } catch (err) {
      await cred.user.delete()
      throw err
    }
  }

  const signOut = async () => {
    if (firebaseConfigReady) await firebaseSignOut(auth)
    setUser(null)
  }
  const resetPassword = (email: string) => {
    if (!firebaseConfigReady) throw Object.assign(new Error('Configuration Firebase manquante'), { code: 'app/config-missing' })
    return sendPasswordResetEmail(auth, email)
  }

  const postBillingEndpoint = async (endpoint: string) => {
    if (!firebaseConfigReady) throw Object.assign(new Error('Configuration Firebase manquante'), { code: 'app/config-missing' })
    const idToken = await auth.currentUser?.getIdToken()
    if (!idToken) throw Object.assign(new Error('Session expirée'), { code: 'app/session-expired' })
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({}),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || typeof data.url !== 'string') {
      throw Object.assign(new Error(data.error ?? 'Erreur paiement'), { code: 'app/billing-error' })
    }
    window.location.assign(data.url)
  }

  const startCheckout = () => postBillingEndpoint('/api/create-checkout-session')
  const openBillingPortal = () => postBillingEndpoint('/api/create-billing-portal-session')

  if (!firebaseConfigReady) return <FirebaseConfigError />
  if (loading) return <AppLoadingSkeleton />

  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signUpSupplier, signOut, resetPassword, startCheckout, openBillingPortal }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
