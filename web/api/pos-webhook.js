import { getAdminDb, requiredEnv } from './stripe-admin.js'
import { applyPosSaleEvents, normalizeProvider } from './pos-core.js'
import crypto from 'node:crypto'

function verifyWebhook(req) {
  const expected = requiredEnv('POS_WEBHOOK_SECRET')
  const received = String(req.headers['x-spirit-stock-pos-secret'] || '')
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(received)
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!verifyWebhook(req)) return res.status(401).json({ error: 'Unauthorized' })

  try {
    const provider = normalizeProvider(req.body?.provider)
    const restaurantId = String(req.body?.restaurantId || '').trim()
    const rows = req.body?.rows || req.body?.events

    if (!restaurantId) return res.status(400).json({ error: 'Missing restaurantId' })

    const results = await applyPosSaleEvents(getAdminDb(), restaurantId, provider, rows)

    return res.status(200).json({
      imported: results.length,
      applied: results.filter(r => r.status === 'applied').length,
      needs_mapping: results.filter(r => r.status === 'needs_mapping').length,
      duplicates: results.filter(r => r.status === 'duplicate').length,
    })
  } catch (err) {
    return res.status(400).json({ error: err.message || 'POS webhook failed' })
  }
}
