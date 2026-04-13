import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { Bottle, Supplier } from '../types'
import { useAuth } from './AuthContext'

interface StockContextType {
  bottles: Bottle[]
  suppliers: Supplier[]
  loading: boolean
  error: string | null
  addBottle: (data: Omit<Bottle, 'id' | 'restaurantId' | 'createdAt' | 'updatedAt'>) => Promise<void>
  updateBottle: (id: string, data: Partial<Bottle>) => Promise<void>
  deleteBottle: (id: string) => Promise<void>
  sellBottle: (id: string, qty: number) => Promise<void>
  addSupplier: (data: Omit<Supplier, 'id' | 'restaurantId'>) => Promise<void>
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<void>
  deleteSupplier: (id: string) => Promise<void>
  getLowStock: () => Bottle[]
  getTotalValue: () => number
}

const StockContext = createContext<StockContextType | null>(null)

export function StockProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [bottles, setBottles] = useState<Bottle[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) { setBottles([]); setSuppliers([]); setLoading(false); return }
    setLoading(true); setError(null)
    let bLoaded = false, sLoaded = false
    const check = () => { if (bLoaded && sLoaded) setLoading(false) }

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
    return () => { ubottles(); usuppliers() }
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
  const getLowStock = () => bottles.filter(b => b.quantity <= b.minThreshold)
  const getTotalValue = () => bottles.reduce((s, b) => s + b.quantity * b.price, 0)

  return <StockContext.Provider value={{ bottles, suppliers, loading, error, addBottle, updateBottle, deleteBottle, sellBottle, addSupplier, updateSupplier, deleteSupplier, getLowStock, getTotalValue }}>{children}</StockContext.Provider>
}

export const useStock = () => {
  const ctx = useContext(StockContext)
  if (!ctx) throw new Error('useStock must be used within StockProvider')
  return ctx
}
