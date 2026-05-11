export interface Bottle {
  id: string
  name: string
  category: BottleCategory
  quantity: number
  minThreshold: number
  price: number
  supplierId: string
  restaurantId: string
  createdAt: Date
  updatedAt: Date
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
}

export interface OrderItem {
  bottleId: string
  bottleName: string
  category: BottleCategory
  quantity: number
}

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
  status: 'pending' | 'accepted' | 'received' | 'cancelled' | 'refused'
  createdAt: Date
  acceptedAt?: Date
  receivedAt?: Date
  cancelledAt?: Date
}

export type MovementType = 'sale' | 'order_received' | 'adjustment_add' | 'adjustment_remove'

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
  createdAt: Date
}
