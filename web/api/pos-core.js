import { FieldValue } from 'firebase-admin/firestore'

const PROVIDERS = new Set([
  'lightspeed',
  'sumup_tiller',
  'zelty',
  'laddition',
  'innovorder',
  'square',
  'toast',
  'clover',
  'micros',
  'csv',
])

const UNITS = new Set(['bottle', 'glass', 'half_glass', 'tasting', 'custom'])

export function normalizeProvider(value) {
  const provider = String(value || '').trim().toLowerCase()
  if (!PROVIDERS.has(provider)) throw new Error('Unsupported POS provider')
  return provider
}

export function normalizeSaleEvent(provider, row) {
  const externalEventId = String(row.externalEventId || row.ticketId || row.orderId || row.id || '').trim()
  const externalProductId = String(row.externalProductId || row.productId || row.sku || row.articleId || '').trim()
  const externalProductName = String(row.externalProductName || row.productName || row.name || row.label || '').trim()
  const quantitySold = Number(row.quantitySold ?? row.quantity ?? row.qty ?? 1)
  const normalizedUnit = String(row.normalizedUnit || row.unit || 'bottle').trim()
  const soldAt = row.soldAt ? new Date(row.soldAt) : new Date()

  if (!externalEventId) throw new Error('Missing externalEventId')
  if (!externalProductId && !externalProductName) throw new Error('Missing product reference')
  if (!Number.isFinite(quantitySold) || quantitySold <= 0) throw new Error('Invalid quantitySold')
  if (!UNITS.has(normalizedUnit)) throw new Error('Unsupported sale unit')

  return {
    provider,
    externalEventId,
    externalProductId,
    externalProductName,
    quantitySold,
    normalizedUnit,
    soldAt,
  }
}

export function getEventDocId(restaurantId, event) {
  const raw = `${restaurantId}:${event.provider}:${event.externalEventId}:${event.externalProductId || event.externalProductName}`
  return Buffer.from(raw).toString('base64url')
}

export async function applyPosSaleEvent(db, restaurantId, event) {
  const eventId = getEventDocId(restaurantId, event)
  const eventRef = db.collection('pos_sales_events').doc(eventId)
  const mappingQuery = await db.collection('pos_product_mappings')
    .where('restaurantId', '==', restaurantId)
    .where('provider', '==', event.provider)
    .where('externalProductId', '==', event.externalProductId)
    .limit(1)
    .get()

  const mappingDoc = mappingQuery.docs[0]
  const mapping = mappingDoc?.data()
  const now = FieldValue.serverTimestamp()

  return db.runTransaction(async transaction => {
    const existing = await transaction.get(eventRef)
    if (existing.exists) {
      return { status: 'duplicate', eventId }
    }

    if (!mapping || mapping.status !== 'active') {
      transaction.set(eventRef, {
        ...event,
        restaurantId,
        status: 'needs_mapping',
        quantitySold: event.quantitySold,
        soldAt: event.soldAt,
        receivedAt: now,
      })
      return { status: 'needs_mapping', eventId }
    }

    const decrement = Number(mapping.decrementPerUnit) * event.quantitySold
    if (!Number.isFinite(decrement) || decrement <= 0) throw new Error('Invalid mapping decrement')

    const bottleRef = db.collection('bottles').doc(mapping.bottleId)
    const bottleSnap = await transaction.get(bottleRef)
    if (!bottleSnap.exists) throw new Error('Mapped bottle not found')

    const bottle = bottleSnap.data()
    if (bottle.restaurantId !== restaurantId) throw new Error('Mapped bottle restaurant mismatch')

    const previousQuantity = Number(bottle.quantity || 0)
    const newQuantity = Math.max(0, Math.round((previousQuantity - decrement) * 100) / 100)

    transaction.update(bottleRef, { quantity: newQuantity, updatedAt: now })
    transaction.set(eventRef, {
      ...event,
      restaurantId,
      bottleId: mapping.bottleId,
      decrementApplied: decrement,
      status: 'applied',
      soldAt: event.soldAt,
      receivedAt: now,
    })
    transaction.set(db.collection('movements').doc(), {
      restaurantId,
      bottleId: mapping.bottleId,
      bottleName: bottle.name,
      category: bottle.category,
      type: 'pos_sale',
      quantity: decrement,
      previousQuantity,
      newQuantity,
      posProvider: event.provider,
      posEventId: eventId,
      createdAt: now,
    })

    return { status: 'applied', eventId, bottleId: mapping.bottleId, decrementApplied: decrement }
  })
}

export async function applyPosSaleEvents(db, restaurantId, provider, rows) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('No POS rows provided')
  if (rows.length > 250) throw new Error('Too many POS rows; limit is 250')

  const events = rows.map(row => normalizeSaleEvent(provider, row))
  const results = []
  for (const event of events) {
    results.push(await applyPosSaleEvent(db, restaurantId, event))
  }
  return results
}
