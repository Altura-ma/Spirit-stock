export interface Bottle {
  id: string
  name: string
  category: BottleCategory
  quantity: number
  minThreshold: number
  price: number
  supplierId: string
  restaurantId: string
  catalogProductId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  brand: string
  category: BottleCategory
  volume?: string
}

export interface SupplierProduct {
  id: string
  supplierId: string
  productId: string
  description?: string
  price?: number
}

/** A product as shown in the shop: catalog product + supplier offer. */
export interface ShopOffer {
  offerId: string
  product: Product
  supplier: Supplier
  description?: string
  price?: number
}

export type BottleCategory =
  | 'whisky' | 'rhum' | 'vodka' | 'gin' | 'cognac' | 'tequila'
  | 'vin_rouge' | 'vin_blanc' | 'vin_rose' | 'champagne' | 'biere'
  | 'liqueur' | 'autre'

export const CATEGORY_LABELS: Record<BottleCategory, string> = {
  whisky: 'Whisky', rhum: 'Rhum', vodka: 'Vodka', gin: 'Gin',
  cognac: 'Cognac', tequila: 'Tequila', vin_rouge: 'Vin Rouge',
  vin_blanc: 'Vin Blanc', vin_rose: 'Vin Rosé', champagne: 'Champagne',
  biere: 'Bière', liqueur: 'Liqueur', autre: 'Autre',
}

export const CATEGORIES = Object.entries(CATEGORY_LABELS) as [BottleCategory, string][]

export interface Supplier {
  id: string
  name: string
  phone: string
  email: string
  restaurantId: string
  isGlobal?: boolean
}

export interface AppUser {
  uid: string
  email: string
  restaurantId: string
  restaurantName: string
  role?: 'restaurant' | 'supplier'
  supplierId?: string
  homeWidgets?: HomeWidgetId[]
  subscriptionStatus?: 'pending_checkout' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | 'paused'
  stripeCustomerId?: string
}

export interface OrderItem {
  bottleId: string
  bottleName: string
  category: BottleCategory
  quantity: number
  unitPrice?: number
}

export type OrderStatus = 'pending' | 'accepted' | 'shipped' | 'received' | 'cancelled' | 'refused'

/** Orders still expected by the restaurant. */
export const ACTIVE_ORDER_STATUSES: OrderStatus[] = ['pending', 'accepted', 'shipped']

export interface Order {
  id: string
  restaurantId: string
  supplierId: string
  supplierName: string
  supplierEmail?: string
  restaurantEmail?: string
  items: OrderItem[]
  token?: string
  restaurantName?: string
  status: OrderStatus
  createdAt: Date
  acceptedAt?: Date
  shippedAt?: Date
  estimatedDeliveryDate?: string // YYYY-MM-DD
  receivedAt?: Date
  cancelledAt?: Date
}

export type MovementType = 'sale' | 'pos_sale' | 'order_received' | 'adjustment_add' | 'adjustment_remove'

export interface Movement {
  id: string
  restaurantId: string
  bottleId: string
  bottleName: string
  category: BottleCategory
  type: MovementType
  quantity: number
  previousQuantity: number
  newQuantity: number
  orderId?: string
  supplierName?: string
  posProvider?: string
  posEventId?: string
  createdAt: Date
}

export type PosProvider =
  | 'lightspeed' | 'sumup_tiller' | 'zelty' | 'laddition' | 'innovorder'
  | 'square' | 'toast' | 'clover' | 'micros' | 'csv'

export type PosSaleUnit = 'bottle' | 'glass' | 'half_glass' | 'tasting' | 'custom'

export interface PosSalesEvent {
  id: string
  restaurantId: string
  provider: PosProvider
  externalEventId: string
  externalProductId: string
  externalProductName: string
  quantitySold: number
  normalizedUnit: PosSaleUnit
  decrementApplied?: number
  bottleId?: string
  status: 'applied' | 'needs_mapping' | 'duplicate' | 'failed'
}

export interface PosProductMapping {
  id: string
  restaurantId: string
  provider: PosProvider
  externalProductId: string
  externalProductName: string
  bottleId: string
  saleUnit: PosSaleUnit
  decrementPerUnit: number
  confidence: number
  status: 'active' | 'needs_review' | 'ignored'
}

export type HomeWidgetId =
  | 'kpis' | 'active_orders' | 'low_stock' | 'sales_today' | 'top_sales'
  | 'losses' | 'shortcuts' | 'shop' | 'inventory_service'

export const HOME_WIDGETS: { id: HomeWidgetId; label: string; description: string }[] = [
  { id: 'kpis', label: 'Chiffres clés', description: 'Produits, alertes, valeur du stock' },
  { id: 'active_orders', label: 'Commandes en cours', description: 'En attente, acceptées, en livraison' },
  { id: 'low_stock', label: 'Stock faible', description: 'Produits sous le seuil' },
  { id: 'sales_today', label: 'Ventes du jour', description: "Bouteilles vendues aujourd'hui" },
  { id: 'top_sales', label: 'Meilleures ventes', description: 'Top références sur 30 jours' },
  { id: 'losses', label: 'Écarts de stock', description: 'Pertes non expliquées (vols possibles)' },
  { id: 'shortcuts', label: 'Raccourcis', description: 'Historique, boutique, statistiques' },
  { id: 'shop', label: 'Boutique', description: 'Accès aux références fournisseurs' },
  { id: 'inventory_service', label: 'Inventaire physique', description: 'Réserver un inventaire sur place' },
]

export const DEFAULT_HOME_WIDGETS: HomeWidgetId[] = ['kpis', 'active_orders', 'low_stock', 'sales_today', 'shortcuts']

export type InvoiceKind = 'internal' | 'external'
export type InvoiceStatus = 'draft' | 'issued' | 'paid'

export interface InvoiceLine {
  label: string
  quantity: number
  unitPrice: number // HT
}

export interface Invoice {
  id: string
  supplierId: string
  supplierName: string
  kind: InvoiceKind // internal = émise dans Spirit Stock, external = importée (hors app)
  number: string
  clientName: string
  restaurantId?: string
  orderId?: string
  issueDate: string // YYYY-MM-DD
  dueDate?: string
  lines: InvoiceLine[]
  vatRate: number // %
  totalHT: number
  totalTTC: number
  status: InvoiceStatus
  externalUrl?: string
  notes?: string
  createdAt: Date
}

export interface ServiceRequest {
  id: string
  restaurantId: string
  restaurantName: string
  email: string
  phone: string
  address: string
  preferredDate: string
  slot: 'morning' | 'afternoon' | 'evening'
  notes?: string
  price: number
  status: 'requested' | 'confirmed' | 'done' | 'cancelled'
  createdAt: Date
}

/** Physical inventory service: fixed price, up to 3 hours on site. */
export const INVENTORY_SERVICE = { priceHT: 149, maxHours: 3 }

export function invoiceTotals(lines: InvoiceLine[], vatRate: number) {
  const totalHT = Math.round(lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0) * 100) / 100
  const totalTTC = Math.round(totalHT * (1 + vatRate / 100) * 100) / 100
  return { totalHT, totalTTC }
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'En attente', accepted: 'Acceptée', shipped: 'En livraison',
  received: 'Reçue', cancelled: 'Annulée', refused: 'Refusée',
}

export function formatDay(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })
}
