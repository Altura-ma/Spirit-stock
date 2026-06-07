import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, X, Pencil, Trash2, MinusCircle, ShoppingCart, History } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { CATEGORY_LABELS, BottleCategory, Bottle } from '../types'
import ConfirmDialog from '../components/ConfirmDialog'

const CATS: { value: BottleCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'whisky', label: 'Whisky' }, { value: 'rhum', label: 'Rhum' },
  { value: 'vodka', label: 'Vodka' }, { value: 'gin', label: 'Gin' },
  { value: 'cognac', label: 'Cognac' }, { value: 'vin_rouge', label: 'Vin Rouge' },
  { value: 'vin_blanc', label: 'Vin Blanc' }, { value: 'champagne', label: 'Champagne' },
  { value: 'biere', label: 'Bière' }, { value: 'liqueur', label: 'Liqueur' }, { value: 'autre', label: 'Autre' },
]

function SellModal({ bottle, onClose, onSell }: { bottle: Bottle; onClose: () => void; onSell: (n: number) => Promise<void> }) {
  const [qty, setQty] = useState(1)
  const [loading, setLoading] = useState(false)
  const adjust = (d: number) => setQty(q => Math.max(1, Math.min(bottle.quantity, q + d)))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="card p-6 w-full max-w-sm">
        <h3 className="font-bold text-lg text-gray-900 mb-1">Enregistrer une vente</h3>
        <p className="text-gray-500 text-sm mb-1">{bottle.name}</p>
        <p className="text-primary text-sm font-medium mb-4">Stock disponible : {bottle.quantity}</p>
        <p className="label">Quantité vendue</p>
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => adjust(-1)} className="w-11 h-11 rounded-full border-2 border-gray-200 flex items-center justify-center text-primary text-xl font-light transition-colors active:bg-gray-50">−</button>
          <input type="number" value={qty} onChange={e => setQty(Math.max(1, Math.min(bottle.quantity, parseInt(e.target.value) || 1)))} className="input text-center text-2xl font-bold flex-1" />
          <button onClick={() => adjust(1)} className="w-11 h-11 rounded-full border-2 border-gray-200 flex items-center justify-center text-primary text-xl font-light transition-colors active:bg-gray-50">+</button>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={async () => { setLoading(true); await onSell(qty); setLoading(false) }} disabled={loading} className="btn-primary flex-1">
            {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Valider'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const { bottles, deleteBottle, sellBottle, error, cart, addToCart, setCartQty } = useStock()
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState<BottleCategory | 'all'>('all')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'empty'>('all')
  const [selling, setSelling] = useState<Bottle | null>(null)
  const [deleting, setDeleting] = useState<Bottle | null>(null)
  const navigate = useNavigate()

  const filtered = bottles.filter(b => {
    if (!b.name.toLowerCase().includes(search.toLowerCase())) return false
    if (cat !== 'all' && b.category !== cat) return false
    if (stockFilter === 'low') return b.quantity > 0 && b.quantity <= b.minThreshold
    if (stockFilter === 'empty') return b.quantity === 0
    return true
  })

  const handleDelete = (b: Bottle) => setDeleting(b)

  const confirmDelete = async () => {
    if (!deleting) return
    await deleteBottle(deleting.id)
    setDeleting(null)
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Inventaire</h1>
        <div className="flex items-center gap-2">
          <Link to="/history" className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-400">
            <History size={18} />
          </Link>
          <Link to="/inventory/add" className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white shadow-sm">
            <Plus size={22} />
          </Link>
        </div>
      </div>

      {error && <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9 pr-8" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={16} /></button>}
      </div>

      {/* Stock status filter */}
      <div className="flex gap-2">
        {(['all', 'low', 'empty'] as const).map(v => {
          const labels = { all: 'Tout', low: '⚠️ Alertes', empty: '🔴 Épuisés' }
          return (
            <button key={v} onClick={() => setStockFilter(v)}
              className={`flex-1 py-1.5 rounded-full text-xs font-semibold border transition-colors ${stockFilter === v ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>
              {labels[v]}
            </button>
          )
        })}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {CATS.map(c => (
          <button key={c.value} onClick={() => setCat(c.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${cat === c.value ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(b => {
          const isLow = b.quantity > 0 && b.quantity <= b.minThreshold
          const isEmpty = b.quantity === 0
          const cartQty = cart[b.id] ?? 0
          return (
            <div key={b.id} className={`card p-4 ${isEmpty ? 'border-l-4 border-danger' : isLow ? 'border-l-4 border-warning' : ''}`}>
              {/* Top row: name + edit/delete */}
              <div className="flex items-start gap-2 mb-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 leading-tight">{b.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{CATEGORY_LABELS[b.category]}</span>
                    {isEmpty && <span className="text-[10px] font-bold text-danger bg-danger-light px-1.5 py-0.5 rounded-md">ÉPUISÉ</span>}
                    {isLow && <span className="text-[10px] font-bold text-warning bg-warning-light px-1.5 py-0.5 rounded-md">FAIBLE</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => navigate(`/inventory/edit/${b.id}`)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-primary rounded-lg">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => handleDelete(b)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-danger rounded-lg">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
              {/* Middle row: qty | price */}
              <div className="flex items-end justify-between pt-2 border-t border-gray-50">
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-2xl font-bold leading-none ${isEmpty ? 'text-danger' : isLow ? 'text-warning' : 'text-primary'}`}>{b.quantity}</span>
                  <span className="text-xs text-gray-400">unités</span>
                  <span className="text-xs text-gray-300 mx-0.5">·</span>
                  <span className="text-xs text-gray-400">min. {b.minThreshold}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">{b.price.toFixed(2)} €</p>
                  <p className="text-xs text-gray-400">val. {(b.quantity * b.price).toFixed(0)} €</p>
                </div>
              </div>
              {/* Bottom row: Vente + Achat actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => !isEmpty && setSelling(b)}
                  disabled={isEmpty}
                  className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-2 rounded-lg ${isEmpty ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-primary text-white active:opacity-75'}`}>
                  <MinusCircle size={15} /> Vente
                </button>
                {cartQty > 0 ? (
                  <div className="flex-1 flex items-center justify-between bg-success/10 border border-success rounded-lg px-1">
                    <button onClick={() => setCartQty(b.id, cartQty - 1)} className="w-8 h-8 flex items-center justify-center text-success text-lg font-bold active:opacity-60">−</button>
                    <span className="text-sm font-bold text-success">{cartQty} à commander</span>
                    <button onClick={() => setCartQty(b.id, cartQty + 1)} className="w-8 h-8 flex items-center justify-center text-success text-lg font-bold active:opacity-60">+</button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(b.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-2 rounded-lg bg-white border-2 border-success text-success active:opacity-75">
                    <ShoppingCart size={15} /> Achat
                  </button>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>{bottles.length === 0 ? 'Ajoutez votre premier produit' : 'Aucun résultat'}</p>
          </div>
        )}
      </div>

      {selling && (
        <SellModal bottle={selling} onClose={() => setSelling(null)}
          onSell={async (qty) => { await sellBottle(selling.id, qty); setSelling(null) }} />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer ce produit ?"
        message={deleting ? `“${deleting.name}” sera supprimé de l'inventaire.` : ''}
        confirmLabel="Supprimer"
        tone="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
