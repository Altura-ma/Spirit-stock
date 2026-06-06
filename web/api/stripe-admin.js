import Stripe from 'stripe'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

export const TRIAL_DAYS = Number(process.env.STRIPE_TRIAL_DAYS ?? '14')

export function requiredEnv(key) {
  const value = process.env[key]
  if (!value) throw new Error(`${key} not set`)
  return value
}

export function getStripe() {
  return new Stripe(requiredEnv('STRIPE_SECRET_KEY'), { apiVersion: '2025-11-17.clover' })
}

export function getBaseUrl() {
  return (process.env.BASE_URL || 'https://app.spirit-stock.fr').replace(/\/$/, '')
}

export function initAdmin() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(requiredEnv('FIREBASE_SERVICE_ACCOUNT_JSON'))) })
  }
}

export function getAdminDb() {
  initAdmin()
  return getFirestore()
}

export function getAdminAuth() {
  initAdmin()
  return getAuth()
}

export async function requireFirebaseUser(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }

  try {
    const decodedToken = await getAdminAuth().verifyIdToken(authHeader.slice(7))
    const userSnap = await getAdminDb().collection('users').doc(decodedToken.uid).get()
    if (!userSnap.exists) {
      res.status(404).json({ error: 'User not found' })
      return null
    }
    return { uid: decodedToken.uid, email: decodedToken.email, user: userSnap.data(), ref: userSnap.ref }
  } catch {
    res.status(401).json({ error: 'Invalid token' })
    return null
  }
}

export function isBillableRestaurant(user) {
  return user?.role !== 'supplier' && Boolean(user?.restaurantId)
}

export function mapSubscriptionStatus(status) {
  if (status === 'trialing' || status === 'active') return status
  if (status === 'past_due' || status === 'canceled' || status === 'unpaid' || status === 'incomplete' || status === 'incomplete_expired' || status === 'paused') return status
  return 'pending_checkout'
}
