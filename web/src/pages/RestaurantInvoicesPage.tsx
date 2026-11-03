import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { ArrowLeft, FileText, Printer, ExternalLink } from 'lucide-react'
import { db } from '../config/firebase'
import { useAuth } from '../context/AuthContext'
import { useStock } from '../context/StockContext'
import { Invoice } from '../types'
import { parseInvoice } from '../hooks/useSupplierData'
import { INVOICE_STATUS_LABELS, printInvoice } from '../lib/invoice'
import { euro } from '../lib/analytics'

export default function RestaurantInvoicesPage() {
  const { user } = useAuth()
  const { suppliers } = useStock()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.restaurantId) return
    // The status filter is required by the security rules (drafts stay private to the supplier).
    const q = query(collection(db, 'invoices'),
      where('restaurantId', '==', user.restaurantId),
      where('status', 'in', ['issued', 'paid']))
    return onSnapshot(q, snap => {
      setInvoices(snap.docs.map(d => parseInvoice(d.id, d.data())))
      setLoading(false)
    }, () => setLoading(false))
  }, [user?.restaurantId])

  const sorted = invoices.slice().sort((a, b) => b.issueDate.localeCompare(a.issueDate))
  const toPay = invoices.filter(i => i.status === 'issued').reduce((s, i) => s + i.totalTTC, 0)

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center gap-3 pt-2">
        <Link to="/more" className="text-primary"><ArrowLeft size={22} /></Link>
        <h1 className="text-xl font-bold text-gray-900">Factures</h1>
      </div>

      <div className="card p-3">
        <p className="text-xs text-gray-500">Reste à payer</p>
        <p className={`text-xl font-bold ${toPay > 0 ? 'text-warning' : 'text-success'}`}>{euro(toPay, 2)}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText size={40} className="mx-auto mb-2 text-gray-300" />
          <p>Aucune facture reçue</p>
          <p className="text-xs mt-1">Les factures de vos fournisseurs Spirit Stock apparaîtront ici</p>
        </div>
      ) : sorted.map(inv => {
        const s = suppliers.find(x => x.id === inv.supplierId)
        return (
          <div key={inv.id} className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-gray-900 truncate">{inv.supplierName}</p>
                <p className="text-xs text-gray-400">{inv.number} · {new Date(inv.issueDate + 'T12:00:00').toLocaleDateString('fr-FR')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">{euro(inv.totalTTC, 2)}</p>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${inv.status === 'paid' ? 'bg-success-light text-success' : 'bg-warning-light text-warning'}`}>
                  {INVOICE_STATUS_LABELS[inv.status].toUpperCase()}
                </span>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => printInvoice(inv, { name: inv.supplierName, email: s?.email, phone: s?.phone })}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-primary text-white">
                <Printer size={14} /> Voir / PDF
              </button>
              {inv.externalUrl && (
                <a href={inv.externalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold py-2 px-3 rounded-lg border border-gray-200 text-gray-600">
                  <ExternalLink size={14} /> Document
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
