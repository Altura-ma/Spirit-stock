import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../context/AuthContext'
import { CheckCircle2, Clock, Package, XCircle, ThumbsUp } from 'lucide-react'
import { CATEGORY_LABELS } from '../types'
import ConfirmDialog from '../components/ConfirmDialog'

type OrderStatus = 'pending' | 'accepted' | 'received' | 'cancelled' | 'refused'

interface SupplierOrder {
  id: string
  restaurantName?: string
  restaurantId: string
  items: { bottleId: string; bottleName: string; category: string; quantity: number }[]
  status: OrderStatus
  createdAt: Date
  acceptedAt?: Date
  cancelledAt?: Date
}

type Filter = 'all' | 'pending' | 'done'

const STATUS_ORDER: Record<string, number> = { pending: 0, accepted: 1, received: 2, refused: 3, cancelled: 4 }

function formatDate(d: Date) {
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function SupplierOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<SupplierOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [actionId, setActionId] = useState<string | null>(null)
  const [confirmRefuseId, setConfirmRefuseId] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.supplierId) return
    const q = query(collection(db, 'orders'), where('supplierId', '==', user.supplierId))
    const unsub = onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({
        id: d.id, ...d.data(),
        createdAt: d.data().createdAt?.toDate() ?? new Date(),
        acceptedAt: d.data().acceptedAt?.toDate(),
        cancelledAt: d.data().cancelledAt?.toDate(),
      })) as SupplierOrder[])
      setLoading(false)
    }, () => setLoading(false))
    return unsub
  }, [user?.supplierId])

  const handleAccept = async (orderId: string) => {
    setActionId(orderId + '_accept')
    await updateDoc(doc(db, 'orders', orderId), { status: 'accepted', acceptedAt: serverTimestamp() })
    setActionId(null)
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
      if (filter === 'pending') return o.status === 'pending'
      if (filter === 'done') return o.status !== 'pending'
      return true
    })
    .sort((a, b) => {
      if (filter === 'all') return b.createdAt.getTime() - a.createdAt.getTime()
      const diff = (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
      return diff !== 0 ? diff : b.createdAt.getTime() - a.createdAt.getTime()
    })

  const pendingCount = orders.filter(o => o.status === 'pending').length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

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
          const totalQty = o.items.reduce((s, i) => s + i.quantity, 0)

          const borderClass = isPending ? 'border-warning' : isAccepted ? 'border-success' : isRefused ? 'border-danger' : 'border-gray-200'

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
                    {o.status === 'received' && <span className="text-[10px] font-bold text-success bg-success-light px-1.5 py-0.5 rounded-md flex items-center gap-1"><CheckCircle2 size={10} /> LIVRÉE</span>}
                    {isRefused && <span className="text-[10px] font-bold text-danger bg-danger-light px-1.5 py-0.5 rounded-md flex items-center gap-1"><XCircle size={10} /> REFUSÉE</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">Reçue le {formatDate(o.createdAt)}</p>
                  {isAccepted && o.acceptedAt && <p className="text-xs text-success mt-0.5">✓ Acceptée le {formatDate(o.acceptedAt)}</p>}
                  {isRefused && o.cancelledAt && <p className="text-xs text-danger mt-0.5">Refusée le {formatDate(o.cancelledAt)}</p>}
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
                    onClick={() => handleAccept(o.id)}
                    disabled={actionId !== null}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-success text-white text-sm font-semibold py-2.5 rounded-lg active:opacity-75 whitespace-nowrap">
                    {actionId === o.id + '_accept'
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <><CheckCircle2 size={16} /> Accepter</>}
                  </button>
                </div>
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
