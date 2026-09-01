import { getAdminDb, isBillableRestaurant, requireFirebaseUser } from './stripe-admin.js'
import { applyPosSaleEvents, normalizeProvider } from './pos-core.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ctx = await requireFirebaseUser(req, res)
  if (!ctx) return
  if (!isBillableRestaurant(ctx.user)) return res.status(403).json({ error: 'Restaurant account required' })

  try {
    const provider = normalizeProvider(req.body?.provider || 'csv')
    const rows = req.body?.rows
    const results = await applyPosSaleEvents(getAdminDb(), ctx.user.restaurantId, provider, rows)

    return res.status(200).json({
      imported: results.length,
      applied: results.filter(r => r.status === 'applied').length,
      needs_mapping: results.filter(r => r.status === 'needs_mapping').length,
      duplicates: results.filter(r => r.status === 'duplicate').length,
      results,
    })
  } catch (err) {
    return res.status(400).json({ error: err.message || 'POS import failed' })
  }
}
