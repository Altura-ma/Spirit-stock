import { useState } from 'react'
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { CheckCircle2, Clock, Package, XCircle, ThumbsUp, Truck, CalendarDays, X } from 'lucide-react'
import { CATEGORY_LABELS, Order, formatDay } from '../types'
import { useSupplierOrders } from '../hooks/useSupplierData'
import { dayKey } from '../lib/analytics'
import ConfirmDialog from '../components/ConfirmDialog'
import AppLoadingSkeleton from '../components/AppLoadingSkeleton'

type SupplierOrder = Order

type Filter = 'all' | 'pending' | 'done'

const STATUS_ORDER: Record<string, number> = { pending: 0, accepted: 1, shipped: 2, received: 3, refused: 4, cancelled: 5 }

type DeliveryMode = 'accept' | 'edit' | 'ship'

function DeliveryDateModal({ order, mode, onClose, onConfirm }: {
  order: SupplierOrder
  mode: DeliveryMode
  onClose: () => void
  onConfirm: (date: string) => Promise<void>
}) {
  const inTwoDays = new Date(); inTwoDays.setDate(inTwoDays.getDate() + 2)
  const [date, setDate] = useState(order.estimatedDeliveryDate ?? dayKey(inTwoDays))
  const [loading, setLoading] = useState(false)
  const quick = [1, 2, 3, 7].map(n => { const d = new Date(); d.setDate(d.getDate() + n); return { n, key: dayKey(d) } })
  const title = mode === 'accept' ? 'Accepter la commande' : mode === 'ship' ? 'Commande expédiée' : 'Date de livraison'
  const cta = mode === 'accept' ? 'Accepter' : mode === 'ship' ? 'Confirmer l\'expédition' : 'Enregistrer'

  return (
    <div data-modal-open className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-success-light text-success flex items-center justify-center flex-shrink-0">
              {mode === 'ship' ? <Truck size={22} /> : <CalendarDays size={22} />}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 leading-tight">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">{order.restaurantName || 'Restaurant'} · quand pensez-vous livrer ?</p>
            </div>
            <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {quick.map(q => (
              <button key={q.n} type="button" onClick={() => setDate(q.key)}
                className={`py-2 rounded-xl text-xs font-semibold border ${date === q.key ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}>
                {q.n === 1 ? 'Demain' : `J+${q.n}`}
              </button>
            ))}
          </div>
          <div>
            <label className="label">Livraison estimée</label>
            <input type="date" className="input" min={dayKey(new Date())} value={date} onChange={e => setDate(e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">{formatDay(date)} · visible par le restaurant dans son inventaire</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 border-t border-gray-100">
          <button onClick={onClose} disabled={loading} className="h-12 rounded-2xl bg-white border border-gray-200 text-gray-600 font-bold">Annuler</button>
          <button disabled={loading || !date} onClick={async () => { setLoading(true); try { await onConfirm(date) } finally { setLoading(false) } }}
            className="h-12 rounded-2xl bg-success text-white font-bold flex items-center justify-center disabled:opacity-60">
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : cta}
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SupplierOrdersPage() {
  const { orders, loading } = useSupplierOrders()
  const [delivery, setDelivery] = useState<{ order: SupplierOrder; mode: DeliveryMode } | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [actionId, setActionId] = useState<string | null>(null)
  const [confirmRefuseId, setConfirmRefuseId] = useState<string | null>(null)

  const confirmDelivery = async (date: string) => {
    if (!delivery) return
    const { order, mode } = delivery
    const patch: Record<string, unknown> = { estimatedDeliveryDate: date }
    if (mode === 'accept') { patch.status = 'accepted'; patch.acceptedAt = serverTimestamp() }
    if (mode === 'ship') { patch.status = 'shipped'; patch.shippedAt = serverTimestamp() }
    await updateDoc(doc(db, 'orders', order.id), patch)
    setDelivery(null)
  }

  const handleRefuse = (orderId: string) => setConfirmRefuseId(orderId)

  const confirmRefuse = async () => {
    if (!confirmRefuseId) return
    const orderId = confirmRefuseId
    setActionId(orderId + '_refuse')
    await updateDoc(doc(db, 'orders', orderId), { status: 'refused', cancelledAt: serverTimestamp() })
    setActionId(null)
    setConfirmRefuseId(null)
  }

  const filtered = orders
    .filter(o => {
      if (filter === 'pending') return o.status === 'pending' || o.status === 'accepted'
      if (filter === 'done') return o.status !== 'pending' && o.status !== 'accepted'
      return true
    })
    .sort((a, b) => {
      if (filter === 'all') return b.createdAt.getTime() - a.createdAt.getTime()
      const diff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
      return diff !== 0 ? diff : b.createdAt.getTime() - a.createdAt.getTime()
    })

  const pendingCount = orders.filter(o => o.status === 'pending').length

  if (loading) return <AppLoadingSkeleton />

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Commandes reçues</h1>
        {pendingCount > 0 && (
          <span className="bg-warning text-white text-xs font-bold px-2.5 py-1 rounded-full">{pendingCount} en attente</span>
        )}
      </div>

      <div className="flex gap-2">
        {([['all', 'Toutes'], ['pending', 'À traiter'], ['done', 'Traitées']] as [Filter, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`flex-1 py-1.5 rounded-full text-xs font-semibold border transition-colors ${filter === v ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(o => {
          const isPending = o.status === 'pending'
          const isAccepted = o.status === 'accepted'
          const isRefused = o.status === 'refused'
          const isShipped = o.status === 'shipped'
          const totalQty = o.items.reduce((s, i) => s + i.quantity, 0)

          const borderClass = isPending ? 'border-warning' : isAccepted ? 'border-success' : isShipped ? 'border-primary' : isRefused ? 'border-danger' : 'border-gray-200'

          return (
            <div key={o.id} className={`card p-4 border-l-4 ${borderClass} ${isRefused || o.status === 'cancelled' ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 truncate">
                      {o.restaurantName || 'Restaurant'}
                    </p>
                    {isPending && <span className="text-[10px] font-bold text-warning bg-warning-light px-1.5 py-0.5 rounded-md flex items-center gap-1"><Clock size={10} /> À TRAITER</span>}
                    {isAccepted && <span className="text-[10px] font-bold text-success bg-success-light px-1.5 py-0.5 rounded-md flex items-center gap-1"><ThumbsUp size={10} /> ACCEPTÉE</span>}
                    {isShipped && <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md flex items-center gap-1"><Truck size={10} /> EN LIVRAISON</span>}
                    {o.status === 'received' && <span className="text-[10px] font-bold text-success bg-success-light px-1.5 py-0.5 rounded-md flex items-center gap-1"><CheckCircle2 size={10} /> LIVRÉE</span>}
                    {isRefused && <span className="text-[10px] font-bold text-danger bg-danger-light px-1.5 py-0.5 rounded-md flex items-center gap-1"><XCircle size={10} /> REFUSÉE</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Reçue le {formatDate(o.createdAt)}</p>
                  {isAccepted && o.acceptedAt && <p className="text-xs text-success mt-0.5">✓ Acceptée le {formatDate(o.acceptedAt)}</p>}
                  {isRefused && o.cancelledAt && <p className="text-xs text-danger mt-0.5">Refusée le {formatDate(o.cancelledAt)}</p>}
                  {(isAccepted || isShipped) && (
                    <button onClick={() => setDelivery({ order: o, mode: 'edit' })} className="text-xs text-primary font-semibold mt-1 flex items-center gap-1">
                      <CalendarDays size={12} /> {o.estimatedDeliveryDate ? `Livraison prévue ${formatDay(o.estimatedDeliveryDate)}` : 'Indiquer une date de livraison'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 text-primary">
                  <Package size={14} />
                  <span className="text-sm font-bold">{totalQty}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-50 space-y-1">
                {o.items.map((i, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-800">{i.bottleName}</span>
                      <span className="text-xs text-gray-400 ml-1.5">· {CATEGORY_LABELS[i.category as keyof typeof CATEGORY_LABELS] ?? i.category}</span>
                    </div>
                    <span className="font-semibold text-primary flex-shrink-0 ml-2">×{i.quantity}</span>
                  </div>
                ))}
              </div>

              {isPending && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleRefuse(o.id)}
                    disabled={actionId !== null}
                    className="flex items-center justify-center gap-1.5 bg-white border-2 border-danger text-danger font-semibold py-2.5 px-4 rounded-lg active:opacity-75 flex-shrink-0">
                    {actionId === o.id + '_refuse'
                      ? <span className="w-4 h-4 border-2 border-danger border-t-transparent rounded-full animate-spin" />
                      : <><XCircle size={16} /> Refuser</>}
                  </button>
                  <button
                    onClick={() => setDelivery({ order: o, mode: 'accept' })}
                    disabled={actionId !== null}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-success text-white text-sm font-semibold py-2.5 rounded-lg active:opacity-75 whitespace-nowrap">
                    <CheckCircle2 size={16} /> Accepter
                  </button>
                </div>
              )}
              {isAccepted && (
                <button onClick={() => setDelivery({ order: o, mode: 'ship' })}
                  className="w-full mt-3 flex items-center justify-center gap-1.5 bg-primary text-white text-sm font-semibold py-2.5 rounded-lg active:opacity-75">
                  <Truck size={16} /> Marquer comme expédiée
                </button>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Package size={40} className="mx-auto mb-2 text-gray-300" />
            <p>{orders.length === 0 ? 'Aucune commande reçue' : 'Aucun résultat'}</p>
            {orders.length === 0 && <p className="text-xs mt-1">Les commandes des restaurants apparaîtront ici</p>}
          </div>
        )}
      </div>

      {delivery && <DeliveryDateModal order={delivery.order} mode={delivery.mode} onClose={() => setDelivery(null)} onConfirm={confirmDelivery} />}

      <ConfirmDialog
        open={confirmRefuseId !== null}
        title="Refuser cette commande ?"
        message="Le restaurant verra que la commande a été refusée. Action conservée dans l'historique."
        confirmLabel="Refuser"
        tone="danger"
        loading={confirmRefuseId !== null && actionId === confirmRefuseId + '_refuse'}
        onCancel={() => setConfirmRefuseId(null)}
        onConfirm={confirmRefuse}
      />
    </div>
  )
}
