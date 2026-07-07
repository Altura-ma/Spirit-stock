import { getAdminDb, requiredEnv } from './stripe-admin.js'

function checkAdmin(req, res) {
  const auth = req.headers.authorization
  if (auth !== `Bearer ${requiredEnv('ADMIN_STATS_SECRET')}`) {
    res.status(403).json({ error: 'Unauthorized' })
    return false
  }
  return true
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!checkAdmin(req, res)) return

  const db = getAdminDb()
  const users = db.collection('users')

  const [total, restaurants, suppliers, active, trialing] = await Promise.all([
    users.count().get(),
    users.where('role', '==', 'restaurant').count().get(),
    users.where('role', '==', 'supplier').count().get(),
    users.where('subscriptionStatus', '==', 'active').count().get(),
    users.where('subscriptionStatus', '==', 'trialing').count().get(),
  ])

  res.status(200).json({
    total_users: total.data().count,
    restaurants: restaurants.data().count,
    suppliers: suppliers.data().count,
    paying_users: active.data().count,
    trialing_users: trialing.data().count,
  })
}
