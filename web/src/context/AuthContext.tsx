import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut as firebaseSignOut, onAuthStateChanged, sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { AppUser } from '../types'

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, restaurantName: string) => Promise<void>
  signUpSupplier: (email: string, password: string, name: string, phone: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
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
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    try {
      const restRef = await addDoc(collection(db, 'restaurants'), { name: restaurantName, ownerId: cred.user.uid, createdAt: serverTimestamp() })
      await setDoc(doc(db, 'users', cred.user.uid), { email, restaurantId: restRef.id, restaurantName, role: 'restaurant', createdAt: serverTimestamp() })
      setUser({ uid: cred.user.uid, email, restaurantId: restRef.id, restaurantName, role: 'restaurant' })
    } catch (err) {
      await cred.user.delete()
      throw err
    }
  }

  const signUpSupplier = async (email: string, password: string, name: string, phone: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    try {
      const supplierRef = await addDoc(collection(db, 'suppliers'), {
        name, phone, email, restaurantId: '', isGlobal: true, createdAt: serverTimestamp(),
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

  const signOut = async () => { await firebaseSignOut(auth); setUser(null) }
  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email)

  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signUpSupplier, signOut, resetPassword }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
