import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'AIzaSyDlj8Z6J8q4X58ttJE0Qsxr4ZS5IuW32Hc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'spirit-stock.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'spirit-stock',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'spirit-stock.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '233454451428',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:233454451428:web:9c0846ad2d4ceccbac4af1',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
