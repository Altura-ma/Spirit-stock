import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { Bottle, Supplier, Order, OrderItem } from '../types'
import { useAuth } from './AuthContext'

type Cart = { [bottleId: string]: number }

interface StockContextType {
  bottles: Bottle[]
  suppliers: Supplier[]
  orders: Order[]
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cart, setCart] = useState<Cart>({})

  useEffect(() => {
    if (!user) { setBottles([]); setSuppliers([]); setOrders([]); setLoading(false); return }
    setLoading(true); setError(null)
    let bLoaded = false, sLoaded = false, oLoaded = false
    const check = () => { if (bLoaded && sLoaded && oLoaded) setLoading(false) }

    const ubottles = onSnapshot(
      query(collection(db, 'bottles'), where('restaurantId', '==', user.restaurantId)),
      snap => { setBottles(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() ?? new Date(), updatedAt: d.data().updatedAt?.toDate() ?? new Date() })) as Bottle[]); bLoaded = true; check() },
      () => { setError('Connexion impossible. Vérifiez votre réseau.'); bLoaded = true; check() }
    )
    const usuppliers = onSnapshot(
      query(collection(db, 'suppliers'), where('restaurantId', '==', user.restaurantId)),
      snap => { setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Supplier[]); sLoaded = true; check() },
      () => { sLoaded = true; check() }
    )
    const uorders = onSnapshot(
      query(collection(db, 'orders'), where('restaurantId', '==', user.restaurantId)),
      snap => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() ?? new Date(), receivedAt: d.data().receivedAt?.toDate(), cancelledAt: d.data().cancelledAt?.toDate() })) as Order[])
        oLoaded = true; check()
      },
      () => { oLoaded = true; check() }
    )
    return () => { ubottles(); usuppliers(); uorders() }
  }, [user])

  const addBottle = async (data: Omit<Bottle, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('Non connecté')
    await addDoc(collection(db, 'bottles'), { ...data, restaurantId: user.restaurantId, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  }
  const updateBottle = async (id: string, data: Partial<Bottle>) => await updateDoc(doc(db, 'bottles', id), { ...data, updatedAt: serverTimestamp() })
  const deleteBottle = async (id: string) => await deleteDoc(doc(db, 'bottles', id))
  const sellBottle = async (id: string, qty: number) => {
    const bottle = bottles.find(b => b.id === id)
    if (!bottle) return
    await updateDoc(doc(db, 'bottles', id), { quantity: Math.max(0, bottle.quantity - qty), updatedAt: serverTimestamp() })
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
    const ref = await addDoc(collection(db, 'orders'), {
      restaurantId: user.restaurantId,
      supplierId,
      supplierName: supplier?.name ?? '',
      items,
      status: 'pending',
      createdAt: serverTimestamp(),
    })
    return ref.id
  }

  const markOrderReceived = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return
    await updateDoc(doc(db, 'orders', orderId), { status: 'received', receivedAt: serverTimestamp() })
    await Promise.all(order.items.map(async item => {
      const bottle = bottles.find(b => b.id === item.bottleId)
      if (bottle) await updateDoc(doc(db, 'bottles', item.bottleId), { quantity: bottle.quantity + item.quantity, updatedAt: serverTimestamp() })
    }))
  }

  const cancelOrder = async (orderId: string) => await updateDoc(doc(db, 'orders', orderId), { status: 'cancelled', cancelledAt: serverTimestamp() })

  const getPendingOrders = () => orders.filter(o => o.status === 'pending')
  const getLowStock = () => bottles.filter(b => b.quantity <= b.minThreshold)
  const getTotalValue = () => bottles.reduce((s, b) => s + b.quantity * b.price, 0)

  return (
    <StockContext.Provider value={{
      bottles, suppliers, orders, loading, error,
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
