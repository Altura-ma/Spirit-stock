import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Wine, AlertCircle, TrendingUp, ChevronRight, History, SlidersHorizontal, Check, ArrowUp, ArrowDown,
  Truck, Clock, ThumbsUp, ShieldAlert, Store, BarChart3, ClipboardCheck, Eye, EyeOff,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useStock } from '../context/StockContext'
import { CATEGORY_LABELS, DEFAULT_HOME_WIDGETS, HOME_WIDGETS, HomeWidgetId, formatDay, INVENTORY_SERVICE } from '../types'
import { daysAgo, euro, lossAlerts, salesByProduct, startOfDay } from '../lib/analytics'

function WidgetTitle({ title, to, cta = 'Tout voir' }: { title: string; to?: string; cta?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-bold text-gray-900">{title}</h2>
      {to && <Link to={to} className="text-sm text-primary font-medium">{cta}</Link>}
    </div>
  )
}

export default function DashboardPage() {
  const { user, saveHomeWidgets } = useAuth()
  const { bottles, movements, loading, getLowStock, getTotalValue, getPendingOrders } = useStock()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<HomeWidgetId[]>([])
  const [saving, setSaving] = useState(false)

  const widgets = (user?.homeWidgets ?? DEFAULT_HOME_WIDGETS).filter(id => HOME_WIDGETS.some(w => w.id === id))
  const lowStock = getLowStock()
  const outOfStock = bottles.filter(b => b.quantity === 0)
  const activeOrders = getPendingOrders().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const todaySales = useMemo(() => salesByProduct(movements, bottles, startOfDay(new Date())), [movements, bottles])
  const topSales = useMemo(() => salesByProduct(movements, bottles, daysAgo(29)), [movements, bottles])
  const losses = useMemo(() => lossAlerts(movements, bottles, daysAgo(29)), [movements, bottles])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const startEditing = () => { setDraft(widgets); setEditing(true) }
  const toggle = (id: HomeWidgetId) => setDraft(d => d.includes(id) ? d.filter(x => x !== id) : [...d, id])
  const move = (id: HomeWidgetId, dir: -1 | 1) => setDraft(d => {
    const i = d.indexOf(id), j = i + dir
    if (i < 0 || j < 0 || j >= d.length) return d
    const n = [...d]; [n[i], n[j]] = [n[j], n[i]]; return n
  })
  const save = async () => {
    setSaving(true)
    try { await saveHomeWidgets(draft) } catch (e) { console.error(e) }
    setSaving(false); setEditing(false)
  }

  const renderWidget = (id: HomeWidgetId) => {
    switch (id) {
      case 'kpis':
        return (
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-primary">{bottles.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Produits</p>
            </div>
            <div className="card p-3 text-center">
              <p className={`text-2xl font-bold ${lowStock.length > 0 ? 'text-danger' : 'text-primary'}`}>{lowStock.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Alertes</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-xl font-bold text-primary">{getTotalValue().toFixed(0)}€</p>
              <p className="text-xs text-gray-500 mt-0.5">Valeur</p>
            </div>
          </div>
        )

      case 'active_orders':
        return (
          <div className="card p-4">
            <WidgetTitle title="Commandes en cours" to="/orders" />
            {activeOrders.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune commande en cours</p>
            ) : (
              <div>
                {activeOrders.slice(0, 4).map((o, i) => {
                  const qty = o.items.reduce((s, it) => s + it.quantity, 0)
                  const meta = o.status === 'shipped'
                    ? { label: 'En livraison', cls: 'text-primary bg-primary/10', Icon: Truck }
                    : o.status === 'accepted'
                      ? { label: 'Acceptée', cls: 'text-success bg-success-light', Icon: ThumbsUp }
                      : { label: 'En attente', cls: 'text-warning bg-warning-light', Icon: Clock }
                  return (
                    <Link to="/orders" key={o.id} className={`flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.cls}`}>
                        <meta.Icon size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{o.supplierName || 'Fournisseur'}</p>
                        <p className="text-xs text-gray-400">
                          {meta.label} · {qty} bouteille{qty > 1 ? 's' : ''}
                          {o.estimatedDeliveryDate && <> · livraison {formatDay(o.estimatedDeliveryDate)}</>}
                        </p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )

      case 'low_stock':
        return (
          <div className="space-y-3">
            {outOfStock.length > 0 && (
              <Link to="/restock" className="flex items-center gap-3 p-3 bg-danger-light rounded-xl">
                <AlertCircle size={18} className="text-danger flex-shrink-0" />
                <p className="text-danger text-sm font-medium flex-1">
                  {outOfStock.length} produit{outOfStock.length > 1 ? 's' : ''} épuisé{outOfStock.length > 1 ? 's' : ''}
                </p>
                <ChevronRight size={16} className="text-danger" />
              </Link>
            )}
            {lowStock.length > 0 ? (
              <div className="card p-4">
                <WidgetTitle title="Stock faible" to="/restock" />
                {lowStock.slice(0, 5).map((b, i) => (
                  <div key={b.id} className={`flex items-center justify-between py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${b.quantity === 0 ? 'bg-danger' : 'bg-warning'}`} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                        <p className="text-xs text-gray-400">{CATEGORY_LABELS[b.category]}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${b.quantity === 0 ? 'text-danger' : 'text-warning'}`}>{b.quantity} restant{b.quantity > 1 ? 's' : ''}</p>
                      <p className="text-xs text-gray-400">seuil : {b.minThreshold}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : bottles.length > 0 && (
              <div className="card p-6 text-center bg-success-light">
                <TrendingUp size={36} className="text-success mx-auto mb-2" />
                <p className="font-bold text-success">Tout est en ordre !</p>
                <p className="text-success text-sm mt-1">Aucun produit sous le seuil</p>
              </div>
            )}
          </div>
        )

      case 'sales_today': {
        const total = todaySales.reduce((s, r) => s + r.quantity, 0)
        return (
          <div className="card p-4">
            <WidgetTitle title="Ventes du jour" to="/stats" cta="Statistiques" />
            {todaySales.length === 0 ? (
              <p className="text-sm text-gray-400">Aucune vente enregistrée aujourd'hui</p>
            ) : (
              <>
                <p className="text-2xl font-bold text-primary">{Math.round(total * 100) / 100} <span className="text-sm font-medium text-gray-400">bouteille{total > 1 ? 's' : ''}</span></p>
                <div className="mt-2 space-y-1">
                  {todaySales.slice(0, 3).map(r => (
                    <div key={r.bottleId} className="flex justify-between text-sm">
                      <span className="text-gray-700 truncate">{r.name}</span>
                      <span className="font-semibold text-gray-900 ml-2">×{Math.round(r.quantity * 100) / 100}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      }

      case 'top_sales':
        return (
          <div className="card p-4">
            <WidgetTitle title="Meilleures ventes · 30 j" to="/stats" />
            {topSales.length === 0 ? (
              <p className="text-sm text-gray-400">Pas encore de ventes sur 30 jours</p>
            ) : topSales.slice(0, 5).map((r, i) => (
              <div key={r.bottleId} className={`flex items-center gap-3 py-2 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 text-sm text-gray-800 truncate">{r.name}</span>
                <span className="text-sm font-bold text-gray-900">×{Math.round(r.quantity * 100) / 100}</span>
              </div>
            ))}
          </div>
        )

      case 'losses': {
        const high = losses.filter(l => l.level !== 'low')
        const value = losses.reduce((s, l) => s + l.value, 0)
        return (
          <Link to="/stats?tab=losses" className={`card p-4 flex items-center gap-3 ${high.length > 0 ? 'border border-danger/30' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${high.length > 0 ? 'bg-danger-light text-danger' : 'bg-success-light text-success'}`}>
              <ShieldAlert size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm">Écarts de stock · 30 j</p>
              <p className="text-xs text-gray-500">
                {losses.length === 0 ? 'Aucune perte non expliquée' : `${losses.length} produit${losses.length > 1 ? 's' : ''} concerné${losses.length > 1 ? 's' : ''} · ${euro(value)}`}
              </p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </Link>
        )
      }

      case 'shortcuts':
        return (
          <div className="grid grid-cols-3 gap-2">
            {[
              { to: '/history', label: 'Historique', Icon: History },
              { to: '/shop', label: 'Boutique', Icon: Store },
              { to: '/stats', label: 'Statistiques', Icon: BarChart3 },
            ].map(({ to, label, Icon }) => (
              <Link key={to} to={to} className="card p-3 flex flex-col items-center gap-1.5 text-center">
                <Icon size={20} className="text-primary" />
                <span className="text-xs font-semibold text-gray-700">{label}</span>
              </Link>
            ))}
          </div>
        )

      case 'shop':
        return (
          <Link to="/shop" className="card p-4 flex items-center gap-3 bg-primary text-white">
            <Store size={22} className="text-accent flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold">Boutique fournisseurs</p>
              <p className="text-xs text-white/70">Toutes les références des fournisseurs référencés</p>
            </div>
            <ChevronRight size={16} className="text-white/70" />
          </Link>
        )

      case 'inventory_service':
        return (
          <Link to="/inventory-service" className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center flex-shrink-0">
              <ClipboardCheck size={20} />
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm">Inventaire physique sur place</p>
              <p className="text-xs text-gray-500">{INVENTORY_SERVICE.priceHT} € HT · jusqu'à {INVENTORY_SERVICE.maxHours} h</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </Link>
        )
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-gray-500 text-sm">Bonjour</p>
          <h1 className="text-xl font-bold text-gray-900">{user?.restaurantName}</h1>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <button onClick={startEditing} aria-label="Personnaliser l'accueil" className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500">
              <SlidersHorizontal size={18} />
            </button>
          )}
          <Link to="/profile" className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
            {user?.restaurantName?.charAt(0).toUpperCase()}
          </Link>
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="card p-4">
            <p className="font-bold text-gray-900">Personnaliser l'accueil</p>
            <p className="text-xs text-gray-500 mt-0.5">Affichez les blocs utiles et réordonnez-les.</p>
          </div>
          {[...draft, ...HOME_WIDGETS.map(w => w.id).filter(id => !draft.includes(id))].map(id => {
            const meta = HOME_WIDGETS.find(w => w.id === id)!
            const on = draft.includes(id)
            const idx = draft.indexOf(id)
            return (
              <div key={id} className={`card p-3 flex items-center gap-3 ${on ? '' : 'opacity-60'}`}>
                <button onClick={() => toggle(id)} aria-label={on ? 'Masquer' : 'Afficher'}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${on ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                  {on ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                  <p className="text-xs text-gray-400">{meta.description}</p>
                </div>
                {on && (
                  <div className="flex gap-1">
                    <button onClick={() => move(id, -1)} disabled={idx === 0} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-30"><ArrowUp size={14} /></button>
                    <button onClick={() => move(id, 1)} disabled={idx === draft.length - 1} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 disabled:opacity-30"><ArrowDown size={14} /></button>
                  </div>
                )}
              </div>
            )
          })}
          <div className="flex gap-3">
            <button onClick={() => setDraft(DEFAULT_HOME_WIDGETS)} className="btn-secondary flex-1">Par défaut</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check size={16} /> Enregistrer</>}
            </button>
          </div>
        </div>
      ) : bottles.length === 0 ? (
        <div className="card p-8 text-center">
          <Wine size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-700">Aucun produit</p>
          <p className="text-gray-400 text-sm mt-1">Ajoutez vos bouteilles ou piochez dans la boutique</p>
          <div className="flex gap-2 mt-4 max-w-xs mx-auto">
            <Link to="/inventory/add" className="btn-primary flex-1">Ajouter</Link>
            <Link to="/shop" className="btn-secondary flex-1">Boutique</Link>
          </div>
        </div>
      ) : (
        <>
          {widgets.map(id => <div key={id}>{renderWidget(id)}</div>)}
          {widgets.length === 0 && (
            <button onClick={startEditing} className="w-full card p-6 text-center text-gray-400 border-2 border-dashed border-gray-200">
              Accueil vide — touchez pour choisir vos blocs
            </button>
          )}
        </>
      )}
    </div>
  )
}
