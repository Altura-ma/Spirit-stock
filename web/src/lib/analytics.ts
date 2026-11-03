import type { Bottle, Movement, Order, BottleCategory } from '../types'

export const SALE_TYPES = new Set(['sale', 'pos_sale'])

export function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfDay(d: Date) {
  const n = new Date(d)
  n.setHours(0, 0, 0, 0)
  return n
}

export function daysAgo(n: number) {
  const d = startOfDay(new Date())
  d.setDate(d.getDate() - n)
  return d
}

/** List of day keys from `from` to today, oldest first. */
export function dayRange(days: number): string[] {
  const out: string[] = []
  for (let i = days - 1; i >= 0; i--) out.push(dayKey(daysAgo(i)))
  return out
}

export interface SalesByProduct {
  bottleId: string
  name: string
  category: BottleCategory
  quantity: number
  revenue: number // valeur au prix d'achat
}

export function salesByProduct(movements: Movement[], bottles: Bottle[], since: Date): SalesByProduct[] {
  const priceById = new Map(bottles.map(b => [b.id, b.price]))
  const map = new Map<string, SalesByProduct>()
  for (const m of movements) {
    if (!SALE_TYPES.has(m.type) || m.createdAt < since) continue
    const row = map.get(m.bottleId) ?? { bottleId: m.bottleId, name: m.bottleName, category: m.category, quantity: 0, revenue: 0 }
    row.quantity += m.quantity
    row.revenue += m.quantity * (priceById.get(m.bottleId) ?? 0)
    map.set(m.bottleId, row)
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity)
}

export function salesPerDay(movements: Movement[], days: number): { day: string; quantity: number }[] {
  const keys = dayRange(days)
  const totals = new Map(keys.map(k => [k, 0]))
  const since = daysAgo(days - 1)
  for (const m of movements) {
    if (!SALE_TYPES.has(m.type) || m.createdAt < since) continue
    const k = dayKey(m.createdAt)
    if (totals.has(k)) totals.set(k, (totals.get(k) ?? 0) + m.quantity)
  }
  return keys.map(day => ({ day, quantity: Math.round((totals.get(day) ?? 0) * 100) / 100 }))
}

export function round2(n: number) {
  return Math.round(n * 100) / 100
}

export interface DailyStockRow {
  day: string
  opening: number
  sold: number
  received: number
  added: number
  removed: number // écart négatif non expliqué par une vente
  closing: number
}

/**
 * Reconstruct a bottle's stock day by day, going backwards from its current quantity.
 * Movements store previous/new quantities, so the last movement of a day gives the closing stock.
 */
export function dailyStock(bottle: Bottle, movements: Movement[], days: number): DailyStockRow[] {
  const keys = dayRange(days)
  const own = movements
    .filter(m => m.bottleId === bottle.id)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())

  const byDay = new Map<string, Movement[]>()
  for (const m of own) {
    const k = dayKey(m.createdAt)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k)!.push(m)
  }

  // Walk back from today to find the closing stock of each day.
  const rows: DailyStockRow[] = []
  let closing = bottle.quantity
  for (let i = keys.length - 1; i >= 0; i--) {
    const day = keys[i]
    const list = byDay.get(day) ?? []
    let sold = 0, received = 0, added = 0, removed = 0
    for (const m of list) {
      if (SALE_TYPES.has(m.type)) sold += m.quantity
      else if (m.type === 'order_received') received += m.quantity
      else if (m.type === 'adjustment_add') added += m.quantity
      else if (m.type === 'adjustment_remove') removed += m.quantity
    }
    const dayClosing = list.length > 0 ? list[list.length - 1].newQuantity : closing
    const opening = list.length > 0 ? list[0].previousQuantity : dayClosing
    rows.unshift({ day, opening: round2(opening), sold: round2(sold), received: round2(received), added: round2(added), removed: round2(removed), closing: round2(dayClosing) })
    closing = opening
  }
  return rows
}

export interface LossAlert {
  bottleId: string
  name: string
  category: BottleCategory
  lost: number // quantité disparue sans vente enregistrée
  sold: number
  value: number
  lossRate: number // lost / (lost + sold)
  lastLossAt: Date
  level: 'high' | 'medium' | 'low'
}

/**
 * Losses = downward stock corrections (adjustment_remove). They represent bottles that left
 * the stock without a recorded sale: breakage, offered drinks, errors… or theft.
 */
export function lossAlerts(movements: Movement[], bottles: Bottle[], since: Date): LossAlert[] {
  const priceById = new Map(bottles.map(b => [b.id, b.price]))
  const map = new Map<string, LossAlert>()
  for (const m of movements) {
    if (m.createdAt < since) continue
    if (m.type !== 'adjustment_remove' && !SALE_TYPES.has(m.type)) continue
    const row = map.get(m.bottleId) ?? {
      bottleId: m.bottleId, name: m.bottleName, category: m.category,
      lost: 0, sold: 0, value: 0, lossRate: 0, lastLossAt: new Date(0), level: 'low' as const,
    }
    if (m.type === 'adjustment_remove') {
      row.lost += m.quantity
      if (m.createdAt > row.lastLossAt) row.lastLossAt = m.createdAt
    } else {
      row.sold += m.quantity
    }
    map.set(m.bottleId, row)
  }
  return [...map.values()]
    .filter(r => r.lost > 0)
    .map(r => {
      const lossRate = r.lost / (r.lost + r.sold)
      const value = round2(r.lost * (priceById.get(r.bottleId) ?? 0))
      const level: LossAlert['level'] = lossRate >= 0.2 || r.lost >= 3 ? 'high' : lossRate >= 0.08 || r.lost >= 1.5 ? 'medium' : 'low'
      return { ...r, lost: round2(r.lost), sold: round2(r.sold), lossRate, value, level }
    })
    .sort((a, b) => b.value - a.value || b.lost - a.lost)
}

export function lossesPerDay(movements: Movement[], days: number) {
  const keys = dayRange(days)
  const totals = new Map(keys.map(k => [k, { lost: 0, sold: 0 }]))
  const since = daysAgo(days - 1)
  for (const m of movements) {
    if (m.createdAt < since) continue
    const t = totals.get(dayKey(m.createdAt))
    if (!t) continue
    if (m.type === 'adjustment_remove') t.lost += m.quantity
    else if (SALE_TYPES.has(m.type)) t.sold += m.quantity
  }
  return keys.map(day => ({ day, ...totals.get(day)! }))
}

// ── Supplier analytics ───────────────────────────────────────────────────────

export interface SupplierItemStat {
  name: string
  quantity: number
  revenue: number
  avgPrice: number | null
  orders: number
}

export interface SupplierBarStat {
  restaurantId: string
  restaurantName: string
  orders: number
  quantity: number
  revenue: number
  avgBasket: number
  lastOrderAt: Date
  topItem: string
}

export interface SupplierStats {
  orders: number
  quantity: number
  revenue: number
  avgPrice: number | null
  avgBasket: number
  acceptanceRate: number | null
  items: SupplierItemStat[]
  bars: SupplierBarStat[]
}

type SupplierOrderLike = Pick<Order, 'restaurantId' | 'restaurantName' | 'status' | 'createdAt'> & {
  items: { bottleName: string; quantity: number; unitPrice?: number }[]
}

/** Stats on orders that were accepted, shipped or received (refused/cancelled excluded). */
export function supplierStats(orders: SupplierOrderLike[], since: Date): SupplierStats {
  const inPeriod = orders.filter(o => o.createdAt >= since)
  const decided = inPeriod.filter(o => o.status !== 'pending' && o.status !== 'cancelled')
  const sold = inPeriod.filter(o => o.status === 'accepted' || o.status === 'shipped' || o.status === 'received')

  const items = new Map<string, SupplierItemStat & { pricedQty: number; pricedRevenue: number }>()
  const bars = new Map<string, SupplierBarStat & { itemQty: Map<string, number> }>()
  let quantity = 0, revenue = 0, pricedQty = 0

  for (const o of sold) {
    let orderRevenue = 0, orderQty = 0
    const bar = bars.get(o.restaurantId) ?? {
      restaurantId: o.restaurantId, restaurantName: o.restaurantName || 'Établissement',
      orders: 0, quantity: 0, revenue: 0, avgBasket: 0, lastOrderAt: new Date(0), topItem: '', itemQty: new Map(),
    }
    for (const i of o.items) {
      const key = i.bottleName.trim().toLowerCase()
      const it = items.get(key) ?? { name: i.bottleName, quantity: 0, revenue: 0, avgPrice: null, orders: 0, pricedQty: 0, pricedRevenue: 0 }
      it.quantity += i.quantity
      it.orders += 1
      if (typeof i.unitPrice === 'number' && i.unitPrice > 0) {
        it.pricedQty += i.quantity
        it.pricedRevenue += i.quantity * i.unitPrice
        orderRevenue += i.quantity * i.unitPrice
        pricedQty += i.quantity
      }
      items.set(key, it)
      orderQty += i.quantity
      bar.itemQty.set(i.bottleName, (bar.itemQty.get(i.bottleName) ?? 0) + i.quantity)
    }
    quantity += orderQty
    revenue += orderRevenue
    bar.orders += 1
    bar.quantity += orderQty
    bar.revenue += orderRevenue
    if (o.createdAt > bar.lastOrderAt) bar.lastOrderAt = o.createdAt
    bars.set(o.restaurantId, bar)
  }

  return {
    orders: sold.length,
    quantity,
    revenue: round2(revenue),
    avgPrice: pricedQty > 0 ? round2(revenue / pricedQty) : null,
    avgBasket: sold.length > 0 ? round2(revenue / sold.length) : 0,
    acceptanceRate: decided.length > 0 ? sold.length / decided.length : null,
    items: [...items.values()]
      .map(({ pricedQty: pq, pricedRevenue: pr, ...it }) => ({ ...it, revenue: round2(pr), avgPrice: pq > 0 ? round2(pr / pq) : null }))
      .sort((a, b) => b.quantity - a.quantity),
    bars: [...bars.values()]
      .map(({ itemQty, ...b }) => ({
        ...b,
        revenue: round2(b.revenue),
        avgBasket: b.orders > 0 ? round2(b.revenue / b.orders) : 0,
        topItem: [...itemQty.entries()].sort((x, y) => y[1] - x[1])[0]?.[0] ?? '',
      }))
      .sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity),
  }
}

export function euro(n: number, digits = 0) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', minimumFractionDigits: digits, maximumFractionDigits: digits })
}
