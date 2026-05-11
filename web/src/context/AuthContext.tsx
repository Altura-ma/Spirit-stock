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
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

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
              const d = snap.data()
              setUser({ uid: firebaseUser.uid, email: firebaseUser.email ?? '', restaurantId: d.restaurantId, restaurantName: d.restaurantName })
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
      const d = snap.data()
      setUser({ uid: cred.user.uid, email: cred.user.email ?? '', restaurantId: d.restaurantId, restaurantName: d.restaurantName })
    } else {
      await firebaseSignOut(auth)
      throw Object.assign(new Error(), { code: 'app/incomplete-account' })
    }
  }

  const signUp = async (email: string, password: string, restaurantName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    try {
      const restRef = await addDoc(collection(db, 'restaurants'), { name: restaurantName, ownerId: cred.user.uid, createdAt: serverTimestamp() })
      await setDoc(doc(db, 'users', cred.user.uid), { email, restaurantId: restRef.id, restaurantName, createdAt: serverTimestamp() })
      setUser({ uid: cred.user.uid, email, restaurantId: restRef.id, restaurantName })
    } catch (err) {
      await cred.user.delete()
      throw err
    }
  }

  const signOut = async () => { await firebaseSignOut(auth); setUser(null) }
  const resetPassword = (email: string) => sendPasswordResetEmail(auth, email)

  return <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
