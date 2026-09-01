import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isBillableRestaurant, requireFirebaseUser } from './stripe-admin.js'
import { normalizeProvider } from './pos-core.js'

const SALE_UNITS = new Set(['bottle', 'glass', 'half_glass', 'tasting', 'custom'])

function parseDecrement(body) {
  if (body.decrementPerUnit != null) return Number(body.decrementPerUnit)
  if (body.saleUnit === 'bottle') return 1
  if (body.saleUnit === 'glass') return 0.2
  if (body.saleUnit === 'half_glass') return 0.1
  if (body.saleUnit === 'tasting') return 0.05
  return NaN
}

export default async function handler(req, res) {
  const ctx = await requireFirebaseUser(req, res)
  if (!ctx) return
  if (!isBillableRestaurant(ctx.user)) return res.status(403).json({ error: 'Restaurant account required' })

  const db = getAdminDb()
  const restaurantId = ctx.user.restaurantId

  if (req.method === 'GET') {
    const [eventsSnap, mappingsSnap] = await Promise.all([
      db.collection('pos_sales_events')
        .where('restaurantId', '==', restaurantId)
        .where('status', '==', 'needs_mapping')
        .limit(100)
        .get(),
      db.collection('pos_product_mappings')
        .where('restaurantId', '==', restaurantId)
        .limit(250)
        .get(),
    ])

    return res.status(200).json({
      needs_mapping: eventsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      mappings: mappingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const provider = normalizeProvider(req.body?.provider)
    const externalProductId = String(req.body?.externalProductId || '').trim()
    const externalProductName = String(req.body?.externalProductName || '').trim()
    const bottleId = String(req.body?.bottleId || '').trim()
    const saleUnit = String(req.body?.saleUnit || 'bottle').trim()
    const decrementPerUnit = parseDecrement({ ...req.body, saleUnit })

    if (!externalProductId) return res.status(400).json({ error: 'Missing externalProductId' })
    if (!bottleId) return res.status(400).json({ error: 'Missing bottleId' })
    if (!SALE_UNITS.has(saleUnit)) return res.status(400).json({ error: 'Unsupported saleUnit' })
    if (!Number.isFinite(decrementPerUnit) || decrementPerUnit <= 0) return res.status(400).json({ error: 'Invalid decrementPerUnit' })

    const bottleSnap = await db.collection('bottles').doc(bottleId).get()
    if (!bottleSnap.exists || bottleSnap.data().restaurantId !== restaurantId) {
      return res.status(404).json({ error: 'Bottle not found' })
    }

    const mappingId = Buffer.from(`${restaurantId}:${provider}:${externalProductId}`).toString('base64url')
    await db.collection('pos_product_mappings').doc(mappingId).set({
      restaurantId,
      provider,
      externalProductId,
      externalProductName,
      bottleId,
      saleUnit,
      decrementPerUnit,
      confidence: 1,
      status: 'active',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    return res.status(200).json({ id: mappingId, status: 'active' })
  } catch (err) {
    return res.status(400).json({ error: err.message || 'POS mapping failed' })
  }
}
