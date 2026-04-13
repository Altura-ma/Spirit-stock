import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, X, Pencil, Trash2, MinusCircle } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { CATEGORY_LABELS, BottleCategory, Bottle } from '../types'

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
          <button onClick={() => adjust(-1)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-primary">−</button>
          <input type="number" value={qty} onChange={e => setQty(Math.max(1, Math.min(bottle.quantity, parseInt(e.target.value) || 1)))} className="input text-center text-xl font-bold flex-1" />
          <button onClick={() => adjust(1)} className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-primary">+</button>
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
  const { bottles, deleteBottle, sellBottle, error } = useStock()
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState<BottleCategory | 'all'>('all')
  const [selling, setSelling] = useState<Bottle | null>(null)
  const navigate = useNavigate()

  const filtered = bottles.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) &&
    (cat === 'all' || b.category === cat)
  )

  const handleDelete = (b: Bottle) => {
    if (confirm(`Supprimer "${b.name}" ?`)) deleteBottle(b.id)
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Inventaire</h1>
        <Link to="/inventory/add" className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
          <Plus size={22} />
        </Link>
      </div>

      {error && <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9 pr-8" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={16} /></button>}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
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
          const isLow = b.quantity <= b.minThreshold
          const isEmpty = b.quantity === 0
          return (
            <div key={b.id} className={`card p-4 ${isEmpty ? 'border-l-4 border-danger' : isLow ? 'border-l-4 border-warning' : ''}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900">{b.name}</span>
                    {isEmpty && <span className="text-[10px] font-bold text-danger bg-danger-light px-1.5 py-0.5 rounded">ÉPUISÉ</span>}
                    {isLow && !isEmpty && <span className="text-[10px] font-bold text-warning bg-warning-light px-1.5 py-0.5 rounded">FAIBLE</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{CATEGORY_LABELS[b.category]}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => !isEmpty && setSelling(b)} disabled={isEmpty}
                    className={`flex items-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg ${isEmpty ? 'bg-gray-100 text-gray-400' : 'bg-primary text-white'}`}>
                    <MinusCircle size={14} /> Vente
                  </button>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <span className={`text-2xl font-bold ${isEmpty ? 'text-danger' : 'text-primary'}`}>{b.quantity}</span>
                  <span className="text-xs text-gray-400 ml-1">unités · seuil {b.minThreshold}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">{b.price.toFixed(2)} €</p>
                  <p className="text-xs text-gray-400">val. {(b.quantity * b.price).toFixed(0)} €</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => navigate(`/inventory/edit/${b.id}`)} className="p-2 text-primary"><Pencil size={16} /></button>
                  <button onClick={() => handleDelete(b)} className="p-2 text-danger"><Trash2 size={16} /></button>
                </div>
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
    </div>
  )
}
