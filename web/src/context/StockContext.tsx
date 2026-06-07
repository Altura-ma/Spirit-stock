import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../config/firebase'
import { Bottle, Supplier, Order, OrderItem, Movement } from '../types'
import { useAuth } from './AuthContext'

type Cart = { [bottleId: string]: number }

interface StockContextType {
  bottles: Bottle[]
  suppliers: Supplier[]
  orders: Order[]
  movements: Movement[]
  loading: boolean
  error: string | null
  addBottle: (data: Omit<Bottle, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateBottle: (id: string, data: Partial<Bottle>) => Promise<void>
  deleteBottle: (id: string) => Promise<void>
  sellBottle: (id: string, qty: number) => Promise<void>
  addSupplier: (data: Omit<Supplier, 'id' | 'restaurantId'>) => Promise<void>
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>
  deleteSupplier: (id: string) => Promise<void>
  cart: Cart
  addToCart: (bottleId: string) => void
  removeFromCart: (bottleId: string) => void
  setCartQty: (bottleId: string, qty: number) => void
  clearSupplierCart: (supplierId: string) => void
  clearCart: () => void
  getCartTotal: () => number
  createOrder: (supplierId: string, items: OrderItem[]) => Promise<string>
  markOrderReceived: (orderId: string) => Promise<void>
  cancelOrder: (orderId: string) => Promise<void>
  getPendingOrders: () => Order[]
  getLowStock: () => Bottle[]
  getTotalValue: () => number
}

const StockContext = createContext<StockContextType | null>(null)

export function StockProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [bottles, setBottles] = useState<Bottle[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<Cart>({})

  // Ref to merge restaurant + platform suppliers without stale state
  const suppliersRef = useRef<{ restaurant: Supplier[]; platform: Supplier[] }>({ restaurant: [], platform: [] })

  useEffect(() => {
    if (!user) {
      setBottles([]); setSuppliers([]); setOrders([]); setMovements([])
      suppliersRef.current = { restaurant: [], platform: [] }
      setLoading(false); return
    }
    setLoading(true); setError(null)
    let bLoaded = false, sLoaded = false, oLoaded = false, mLoaded = false, gsLoaded = false
    const check = () => { if (bLoaded && sLoaded && oLoaded && mLoaded && gsLoaded) setLoading(false) }

    const merge = () => setSuppliers([...suppliersRef.current.platform, ...suppliersRef.current.restaurant])

    const ubottles = onSnapshot(
      query(collection(db, 'bottles'), where('restaurantId', '==', user.restaurantId)),
      snap => { setBottles(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() ?? new Date(), updatedAt: d.data().updatedAt?.toDate() ?? new Date() })) as Bottle[]); bLoaded = true; check() },
      () => { setError('Connexion impossible. Vérifiez votre réseau.'); bLoaded = true; check() }
    )
    const usuppliers = onSnapshot(
      query(collection(db, 'suppliers'), where('restaurantId', '==', user.restaurantId)),
      snap => { suppliersRef.current.restaurant = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Supplier[]; merge(); sLoaded = true; check() },
      () => { sLoaded = true; check() }
    )
    const uglobal = onSnapshot(
      query(collection(db, 'suppliers'), where('isGlobal', '==', true)),
      snap => { suppliersRef.current.platform = snap.docs.map(d => ({ id: d.id, ...d.data(), isGlobal: true })) as Supplier[]; merge(); gsLoaded = true; check() },
      () => { gsLoaded = true; check() }
    )
    const uorders = onSnapshot(
      query(collection(db, 'orders'), where('restaurantId', '==', user.restaurantId)),
      snap => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() ?? new Date(), acceptedAt: d.data().acceptedAt?.toDate(), receivedAt: d.data().receivedAt?.toDate(), cancelledAt: d.data().cancelledAt?.toDate() })) as Order[])
        oLoaded = true; check()
      },
      () => { oLoaded = true; check() }
    )
    const umovements = onSnapshot(
      query(collection(db, 'movements'), where('restaurantId', '==', user.restaurantId)),
      snap => { setMovements(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() ?? new Date() })) as Movement[]); mLoaded = true; check() },
      () => { mLoaded = true; check() }
    )
    return () => { ubottles(); usuppliers(); uglobal(); uorders(); umovements() }
  }, [user])

  const addMovement = async (data: Omit<Movement, 'id' | 'restaurantId' | 'createdAt'>) => {
    if (!user) return
    await addDoc(collection(db, 'movements'), { ...data, restaurantId: user.restaurantId, createdAt: serverTimestamp() })
  }

  const addBottle = async (data: Omit<Bottle, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('Non connecté')
    const ref = await addDoc(collection(db, 'bottles'), { ...data, restaurantId: user.restaurantId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    if (data.quantity > 0) {
      addMovement({ bottleId: ref.id, bottleName: data.name, category: data.category, type: 'adjustment_add', quantity: data.quantity, previousQuantity: 0, newQuantity: data.quantity }).catch(console.error)
    }
  }

  const updateBottle = async (id: string, data: Partial<Bottle>) => {
    const bottle = bottles.find(b => b.id === id)
    await updateDoc(doc(db, 'bottles', id), { ...data, updatedAt: serverTimestamp() })
    if (data.quantity !== undefined && bottle && data.quantity !== bottle.quantity) {
      const diff = data.quantity - bottle.quantity
      addMovement({ bottleId: id, bottleName: data.name ?? bottle.name, category: data.category ?? bottle.category, type: diff > 0 ? 'adjustment_add' : 'adjustment_remove', quantity: Math.abs(diff), previousQuantity: bottle.quantity, newQuantity: data.quantity }).catch(console.error)
    }
  }

  const deleteBottle = async (id: string) => await deleteDoc(doc(db, 'bottles', id))

  const sellBottle = async (id: string, qty: number) => {
    const bottle = bottles.find(b => b.id === id)
    if (!bottle) return
    const newQty = Math.max(0, bottle.quantity - qty)
    await updateDoc(doc(db, 'bottles', id), { quantity: newQty, updatedAt: serverTimestamp() })
    addMovement({ bottleId: id, bottleName: bottle.name, category: bottle.category, type: 'sale', quantity: qty, previousQuantity: bottle.quantity, newQuantity: newQty }).catch(console.error)
  }

  const addSupplier = async (data: Omit<Supplier, 'id' | 'restaurantId'>) => {
    if (!user) throw new Error('Non connecté')
    await addDoc(collection(db, 'suppliers'), { ...data, restaurantId: user.restaurantId })
  }
  const updateSupplier = async (id: string, data: Partial<Supplier>) => await updateDoc(doc(db, 'suppliers', id), data)
  const deleteSupplier = async (id: string) => await deleteDoc(doc(db, 'suppliers', id))

  const addToCart = (bottleId: string) => setCart(c => ({ ...c, [bottleId]: (c[bottleId] ?? 0) + 1 }))
  const removeFromCart = (bottleId: string) => setCart(c => { const n = { ...c }; delete n[bottleId]; return n })
  const setCartQty = (bottleId: string, qty: number) => {
    if (qty <= 0) { removeFromCart(bottleId); return }
    setCart(c => ({ ...c, [bottleId]: qty }))
  }
  const clearSupplierCart = (supplierId: string) => {
    const ids = bottles.filter(b => b.supplierId === supplierId).map(b => b.id)
    setCart(c => { const n = { ...c }; ids.forEach(id => delete n[id]); return n })
  }
  const clearCart = () => setCart({})
  const getCartTotal = () => Object.keys(cart).length

  const createOrder = async (supplierId: string, items: OrderItem[]): Promise<string> => {
    if (!user) throw new Error('Non connecté')
    const supplier = suppliers.find(s => s.id === supplierId)
    const token = crypto.randomUUID()
    const ref = await addDoc(collection(db, 'orders'), {
      restaurantId: user.restaurantId, supplierId,
      supplierName: supplier?.name ?? '', supplierEmail: supplier?.email ?? '',
      restaurantName: user.restaurantName, restaurantEmail: user.email,
      items, token, status: 'pending', createdAt: serverTimestamp(),
    })
    if (supplier?.email) {
      const idToken = await auth.currentUser?.getIdToken()
      if (!idToken) throw new Error('Session expirée')

      const sendRes = await fetch('/api/send-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ orderId: ref.id }),
      })
      if (!sendRes.ok) {
        throw new Error('Commande créée, mais email fournisseur non envoyé')
      }
    }
    return ref.id
  }

  const markOrderReceived = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    await updateDoc(doc(db, 'orders', orderId), { status: 'received', receivedAt: serverTimestamp() })
    await Promise.all(order.items.map(async item => {
      const bottle = bottles.find(b => b.id === item.bottleId)
      if (bottle) {
        const newQty = bottle.quantity + item.quantity
        await updateDoc(doc(db, 'bottles', item.bottleId), { quantity: newQty, updatedAt: serverTimestamp() })
        addMovement({ bottleId: item.bottleId, bottleName: item.bottleName, category: item.category, type: 'order_received', quantity: item.quantity, previousQuantity: bottle.quantity, newQuantity: newQty, orderId, supplierName: order.supplierName }).catch(console.error)
      }
    }))
  }

  const cancelOrder = async (orderId: string) => await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled', cancelledAt: serverTimestamp() })
  const getPendingOrders = () => orders.filter(o => o.status === 'pending' || o.status === 'accepted')
  const getLowStock = () => bottles.filter(b => b.quantity <= b.minThreshold)
  const getTotalValue = () => bottles.reduce((s, b) => s + b.quantity * b.price, 0)

  return (
    <StockContext.Provider value={{
      bottles, suppliers, orders, movements, loading, error,
      addBottle, updateBottle, deleteBottle, sellBottle,
      addSupplier, updateSupplier, deleteSupplier,
      cart, addToCart, removeFromCart, setCartQty, clearSupplierCart, clearCart, getCartTotal,
      createOrder, markOrderReceived, cancelOrder, getPendingOrders,
      getLowStock, getTotalValue,
    }}>
      {children}
    </StockContext.Provider>
  )
}

export const useStock = () => {
  const ctx = useContext(StockContext)
  if (!ctx) throw new Error('useStock must be used within StockProvider')
  return ctx
}
