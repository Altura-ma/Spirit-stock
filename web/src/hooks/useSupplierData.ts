import { useEffect, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../context/AuthContext'
import { Invoice, Order, Supplier } from '../types'

const toDate = (v: any) => (v?.toDate ? v.toDate() : undefined)

export function useSupplierOrders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.supplierId) { setLoading(false); return }
    const q = query(collection(db, 'orders'), where('supplierId', '==', user.supplierId))
    return onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => {
        const data = d.data()
        return {
          id: d.id, ...data,
          items: Array.isArray(data.items) ? data.items : [],
          createdAt: toDate(data.createdAt) ?? new Date(),
          acceptedAt: toDate(data.acceptedAt),
          shippedAt: toDate(data.shippedAt),
          receivedAt: toDate(data.receivedAt),
          cancelledAt: toDate(data.cancelledAt),
        } as Order
      }))
      setLoading(false)
    }, () => setLoading(false))
  }, [user?.supplierId])

  return { orders, loading }
}

export function useSupplierProfile() {
  const { user } = useAuth()
  const [supplier, setSupplier] = useState<Supplier | null>(null)
  useEffect(() => {
    if (!user?.supplierId) return
    getDoc(doc(db, 'suppliers', user.supplierId))
      .then(s => { if (s.exists()) setSupplier({ id: s.id, ...s.data() } as Supplier) })
      .catch(console.error)
  }, [user?.supplierId])
  return supplier
}

export function parseInvoice(id: string, data: Record<string, any>): Invoice {
  return {
    id, ...data,
    lines: Array.isArray(data.lines) ? data.lines : [],
    createdAt: toDate(data.createdAt) ?? new Date(),
  } as Invoice
}

export function useSupplierInvoices() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!user?.supplierId) { setLoading(false); return }
    const q = query(collection(db, 'invoices'), where('supplierId', '==', user.supplierId))
    return onSnapshot(q, snap => {
      setInvoices(snap.docs.map(d => parseInvoice(d.id, d.data())))
      setLoading(false)
    }, () => setLoading(false))
  }, [user?.supplierId])
  return { invoices, loading }
}
