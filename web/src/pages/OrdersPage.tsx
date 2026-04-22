import { useState } from 'react'
import { CheckCircle2, Clock, Package, XCircle, ThumbsUp } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { CATEGORY_LABELS } from '../types'

type Filter = 'all' | 'pending' | 'received' | 'cancelled'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'pending', label: 'En attente' },
  { value: 'received', label: 'Reçues' },
  { value: 'cancelled', label: 'Annulées' },
]

// Display priority: pending → accepted → received → cancelled
const STATUS_ORDER: Record<string, number> = { pending: 0, accepted: 1, received: 2, refused: 3, cancelled: 4 }

function formatDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function OrdersPage() {
  const { orders, markOrderReceived, cancelOrder } = useStock()
  const [filter, setFilter] = useState<Filter>('all')
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const filtered = orders
    .filter(o => {
      if (filter === 'all') return true
      if (filter === 'pending') return o.status === 'pending' || o.status === 'accepted'
      if (filter === 'cancelled') return o.status === 'cancelled' || o.status === 'refused'
      return o.status === filter
    })
    .sort((a, b) => {
      if (filter === 'all') return b.createdAt.getTime() - a.createdAt.getTime()
      const diff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
      return diff !== 0 ? diff : b.createdAt.getTime() - a.createdAt.getTime()
    })

  const handleReceive = async (id: string) => {
    if (!window.confirm('Confirmer la réception ? Les quantités seront ajoutées au stock.')) return
    setLoadingId(id)
    await markOrderReceived(id)
    setLoadingId(null)
  }

  const handleCancel = async (id: string) => {
    if (!window.confirm("Annuler cette commande ? Elle sera conservée dans l'historique.")) return
    setCancellingId(id)
    await cancelOrder(id)
    setCancellingId(null)
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Commandes</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${filter === f.value ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(o => {
          const totalQty = o.items.reduce((s, i) => s + i.quantity, 0)
          const isPending = o.status === 'pending'
          const isAccepted = o.status === 'accepted'
          const isCancelled = o.status === 'cancelled'
          const isRefused = o.status === 'refused'
          const isActive = isPending || isAccepted

          const borderClass = isPending ? 'border-warning'
            : isAccepted ? 'border-success'
            : isRefused ? 'border-danger'
            : isCancelled ? 'border-gray-300'
            : 'border-success'

          return (
            <div key={o.id} className={`card p-4 border-l-4 ${borderClass} ${isCancelled || isRefused ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-bold truncate ${isCancelled || isRefused ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {o.supplierName}
                    </p>
                    {isPending && (
                      <span className="text-[10px] font-bold text-warning bg-warning-light px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <Clock size={10} /> EN ATTENTE
                      </span>
                    )}
                    {isAccepted && (
                      <span className="text-[10px] font-bold text-success bg-success-light px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <ThumbsUp size={10} /> ACCEPTÉE
                      </span>
                    )}
                    {o.status === 'received' && (
                      <span className="text-[10px] font-bold text-success bg-success-light px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <CheckCircle2 size={10} /> REÇUE
                      </span>
                    )}
                    {isRefused && (
                      <span className="text-[10px] font-bold text-danger bg-danger-light px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <XCircle size={10} /> REFUSÉE
                      </span>
                    )}
                    {isCancelled && (
                      <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                        <XCircle size={10} /> ANNULÉE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Commandée le {formatDate(o.createdAt)}</p>
                  {isAccepted && o.acceptedAt && (
                    <p className="text-xs text-success mt-0.5">✓ Acceptée le {formatDate(o.acceptedAt)}</p>
                  )}
                  {o.status === 'received' && o.receivedAt && (
                    <p className="text-xs text-success mt-0.5">Reçue le {formatDate(o.receivedAt)}</p>
                  )}
                  {isRefused && o.cancelledAt && (
                    <p className="text-xs text-danger mt-0.5">Refusée le {formatDate(o.cancelledAt)}</p>
                  )}
                  {isCancelled && o.cancelledAt && (
                    <p className="text-xs text-gray-500 mt-0.5">Annulée le {formatDate(o.cancelledAt)}</p>
                  )}
                </div>
                <div className={`flex items-center gap-1 flex-shrink-0 ${isCancelled || isRefused ? 'text-gray-400' : 'text-primary'}`}>
                  <Package size={14} />
                  <span className="text-sm font-bold">{totalQty}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-50 space-y-1">
                {o.items.map(i => (
                  <div key={i.bottleId} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <span className={isCancelled ? 'text-gray-400' : 'text-gray-800'}>{i.bottleName}</span>
                      <span className="text-xs text-gray-400 ml-1.5">· {CATEGORY_LABELS[i.category]}</span>
                    </div>
                    <span className={`font-semibold flex-shrink-0 ml-2 ${isCancelled || isRefused ? 'text-gray-400' : 'text-primary'}`}>×{i.quantity}</span>
                  </div>
                ))}
              </div>

              {isActive && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleCancel(o.id)}
                    disabled={cancellingId === o.id || loadingId === o.id}
                    className="flex items-center justify-center gap-1.5 bg-white border-2 border-danger text-danger font-semibold py-2.5 px-4 rounded-lg active:opacity-75 flex-shrink-0">
                    {cancellingId === o.id
                      ? <span className="w-4 h-4 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                      : <><XCircle size={16} /> Annuler</>}
                  </button>
                  <button
                    onClick={() => handleReceive(o.id)}
                    disabled={loadingId === o.id || cancellingId === o.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-success text-white font-semibold py-2.5 rounded-lg active:opacity-75">
                    {loadingId === o.id
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><CheckCircle2 size={16} /> Marquer comme reçue</>}
                  </button>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Package size={40} className="mx-auto mb-2 text-gray-300" />
            <p>{orders.length === 0 ? 'Aucune commande' : 'Aucun résultat'}</p>
            {orders.length === 0 && <p className="text-xs mt-1">Les commandes passées apparaîtront ici</p>}
          </div>
        )}
      </div>
    </div>
  )
}
