import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const rawEnv = import.meta.env
const firebaseEnv = {
  apiKey: rawEnv.VITE_FIREBASE_API_KEY,
  authDomain: rawEnv.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: rawEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: rawEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: rawEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: rawEnv.VITE_FIREBASE_APP_ID,
}

const invalidEnvValue = (value: unknown) => typeof value !== 'string' || value.trim() === '' || value.includes('<') || value.includes('>')

export const missingFirebaseEnv = Object.entries(firebaseEnv)
  .filter(([, value]) => invalidEnvValue(value))
  .map(([key]) => `VITE_FIREBASE_${key.replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}`)

export const firebaseConfigReady = missingFirebaseEnv.length === 0

if (!firebaseConfigReady) {
  console.error('Firebase client config missing:', missingFirebaseEnv.join(', '))
}

const app = firebaseConfigReady ? initializeApp(firebaseEnv) : null

export const auth = app ? getAuth(app) : (null as unknown as ReturnType<typeof getAuth>)
export const db = app ? getFirestore(app) : (null as unknown as ReturnType<typeof getFirestore>)
export default app
