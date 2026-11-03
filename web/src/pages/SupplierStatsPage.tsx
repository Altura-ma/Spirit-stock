import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Info, Store, Trophy } from 'lucide-react'
import { useSupplierOrders } from '../hooks/useSupplierData'
import { daysAgo, euro, supplierStats } from '../lib/analytics'
import AppLoadingSkeleton from '../components/AppLoadingSkeleton'

const PERIODS = [30, 90, 365] as const

export default function SupplierStatsPage() {
  const { orders, loading } = useSupplierOrders()
  const [period, setPeriod] = useState<number>(90)
  const [openBar, setOpenBar] = useState<string | null>(null)

  const since = daysAgo(period - 1)
  const stats = useMemo(() => supplierStats(orders, since), [orders, period]) // eslint-disable-line react-hooks/exhaustive-deps
  const barDetail = useMemo(() => {
    if (!openBar) return null
    return supplierStats(orders.filter(o => o.restaurantId === openBar), since)
  }, [orders, openBar, period]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasUnpriced = orders.some(o => o.createdAt >= since && o.items.some(i => typeof i.unitPrice !== 'number'))

  if (loading) return <AppLoadingSkeleton />

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Analyses</h1>
        <div className="flex bg-white border border-gray-200 rounded-full p-0.5" data-no-swipe>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${period === p ? 'bg-primary text-white' : 'text-gray-500'}`}>
              {p === 365 ? '1 an' : `${p} j`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3 col-span-2 bg-primary text-white">
          <p className="text-xs text-white/70">Chiffre d'affaires (commandes acceptées)</p>
          <p className="text-3xl font-bold">{euro(stats.revenue)}</p>
          <p className="text-xs text-white/70 mt-0.5">{stats.orders} commande{stats.orders > 1 ? 's' : ''} · {stats.quantity} bouteille{stats.quantity > 1 ? 's' : ''} · {stats.bars.length} établissement{stats.bars.length > 1 ? 's' : ''}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">Prix moyen / bouteille</p>
          <p className="text-xl font-bold text-primary">{stats.avgPrice != null ? euro(stats.avgPrice, 2) : '—'}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">Panier moyen</p>
          <p className="text-xl font-bold text-primary">{euro(stats.avgBasket)}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">Bouteilles / commande</p>
          <p className="text-xl font-bold text-primary">{stats.orders ? Math.round((stats.quantity / stats.orders) * 10) / 10 : 0}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">Taux d'acceptation</p>
          <p className="text-xl font-bold text-primary">{stats.acceptanceRate != null ? `${Math.round(stats.acceptanceRate * 100)} %` : '—'}</p>
        </div>
      </div>

      {hasUnpriced && (
        <div className="flex gap-2 text-xs text-gray-500 bg-white rounded-xl p-3 border border-gray-100">
          <Info size={14} className="flex-shrink-0 mt-0.5 text-primary" />
          <p>Les anciennes commandes sans prix comptent dans les quantités mais pas dans le chiffre d'affaires.</p>
        </div>
      )}

      <div className="card p-4">
        <p className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Trophy size={16} className="text-accent" /> Meilleurs articles</p>
        {stats.items.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Aucune vente sur la période</p> : (
          <div>
            <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 text-[11px] text-gray-400 pb-1">
              <span>Article</span><span className="text-right">Qté</span><span className="text-right w-20">CA · PU moy.</span>
            </div>
            {stats.items.slice(0, 10).map((it, i) => (
              <div key={it.name} className="grid grid-cols-[1fr_auto_auto] gap-x-3 items-center py-2 border-t border-gray-100">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                  <span className="text-sm text-gray-900 truncate">{it.name}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 text-right">{it.quantity}</span>
                <div className="text-right w-20">
                  <p className="text-sm font-semibold text-gray-800">{euro(it.revenue)}</p>
                  <p className="text-[11px] text-gray-400">{it.avgPrice != null ? euro(it.avgPrice, 2) : '—'}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-4">
        <p className="font-bold text-gray-900 mb-3 flex items-center gap-2"><Store size={16} className="text-primary" /> Par établissement</p>
        {stats.bars.length === 0 ? <p className="text-sm text-gray-400 text-center py-4">Aucun établissement sur la période</p> : stats.bars.map((b, i) => {
          const open = openBar === b.restaurantId
          const share = stats.revenue > 0 ? b.revenue / stats.revenue : stats.quantity > 0 ? b.quantity / stats.quantity : 0
          return (
            <div key={b.restaurantId} className={i > 0 ? 'border-t border-gray-100' : ''}>
              <button onClick={() => setOpenBar(open ? null : b.restaurantId)} className="w-full text-left py-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{b.restaurantName}</p>
                    <p className="text-xs text-gray-400">
                      {b.orders} cde · {b.quantity} btl · panier {euro(b.avgBasket)} · dernière {b.lastOrderAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-sm font-bold text-gray-900">{euro(b.revenue)}</span>
                    {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.max(2, share * 100)}%` }} />
                </div>
              </button>
              {open && barDetail && (
                <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase">Articles commandés</p>
                  {barDetail.items.map(it => (
                    <div key={it.name} className="flex justify-between text-xs">
                      <span className="text-gray-700 truncate">{it.name}</span>
                      <span className="text-gray-900 font-semibold ml-2 whitespace-nowrap">×{it.quantity}{it.avgPrice != null ? ` · ${euro(it.avgPrice, 2)}` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
