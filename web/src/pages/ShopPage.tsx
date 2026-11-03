import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import { ArrowLeft, Search, X, Store, ShoppingCart, Check, Plus, BadgeCheck } from 'lucide-react'
import { db } from '../config/firebase'
import { useStock } from '../context/StockContext'
import { BottleCategory, CATEGORY_LABELS, Product, ShopOffer } from '../types'
import { euro } from '../lib/analytics'

function OfferModal({ offer, inInventory, cartQty, busy, onClose, onOrder }: {
  offer: ShopOffer
  inInventory: boolean
  cartQty: number
  busy: boolean
  onClose: () => void
  onOrder: () => void
}) {
  const p = offer.product
  return (
    <div data-modal-open className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-400">{CATEGORY_LABELS[p.category]}{p.volume ? ` · ${p.volume}` : ''}</p>
            <h3 className="font-bold text-lg text-gray-900 leading-tight">{p.brand} {p.name}</h3>
          </div>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        <p className="text-sm text-primary font-semibold mt-2 flex items-center gap-1"><BadgeCheck size={14} /> {offer.supplier.name}</p>
        {typeof offer.price === 'number' && <p className="text-2xl font-bold text-gray-900 mt-2">{euro(offer.price, 2)} <span className="text-xs font-medium text-gray-400">HT / bouteille</span></p>}
        <p className="text-sm text-gray-600 mt-3 whitespace-pre-line leading-relaxed">
          {offer.description || "Le fournisseur n'a pas encore ajouté de description."}
        </p>
        <button onClick={onOrder} disabled={busy} className="btn-primary mt-5">
          {busy ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : cartQty > 0 ? <><Check size={16} /> {cartQty} dans la commande · +1</>
            : inInventory ? <><ShoppingCart size={16} /> Commander</>
            : <><Plus size={16} /> Ajouter à mon inventaire et commander</>}
        </button>
        {!inInventory && <p className="text-[11px] text-gray-400 text-center mt-2">Le produit est créé dans votre inventaire avec un stock à 0.</p>}
      </div>
    </div>
  )
}

export default function ShopPage() {
  const { suppliers, bottles, cart, addToCart, addBottle } = useStock()
  const [offers, setOffers] = useState<ShopOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState<BottleCategory | 'all'>('all')
  const [supplierId, setSupplierId] = useState<string>('all')
  const [open, setOpen] = useState<ShopOffer | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const referenced = useMemo(() => suppliers.filter(s => s.isGlobal), [suppliers])

  useEffect(() => {
    let cancelled = false
    Promise.all([getDocs(collection(db, 'products')), getDocs(collection(db, 'supplier_products'))])
      .then(([prodSnap, spSnap]) => {
        if (cancelled) return
        const products = new Map(prodSnap.docs.map(d => [d.id, { id: d.id, ...d.data() } as Product]))
        const bySupplier = new Map(referenced.map(s => [s.id, s]))
        const list: ShopOffer[] = []
        spSnap.docs.forEach(d => {
          const data = d.data()
          const product = products.get(data.productId)
          const supplier = bySupplier.get(data.supplierId)
          if (!product || !supplier) return
          list.push({
            offerId: d.id, product, supplier,
            description: typeof data.description === 'string' ? data.description : undefined,
            price: typeof data.price === 'number' ? data.price : undefined,
          })
        })
        list.sort((a, b) => `${a.product.brand} ${a.product.name}`.localeCompare(`${b.product.brand} ${b.product.name}`))
        setOffers(list)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) { setError('Boutique indisponible pour le moment.'); setLoading(false) } })
    return () => { cancelled = true }
  }, [referenced])

  const bottleFor = (o: ShopOffer) =>
    bottles.find(b => b.catalogProductId === o.product.id && b.supplierId === o.supplier.id)

  const handleOrder = async (o: ShopOffer) => {
    setBusy(o.offerId)
    try {
      const existing = bottleFor(o)
      if (existing) addToCart(existing.id)
      else {
        const id = await addBottle({
          name: `${o.product.brand} ${o.product.name}`.trim(),
          category: o.product.category,
          quantity: 0,
          minThreshold: 2,
          price: o.price ?? 0,
          supplierId: o.supplier.id,
          catalogProductId: o.product.id,
        })
        addToCart(id)
      }
    } catch (e) {
      console.error(e)
      setError("Impossible d'ajouter ce produit.")
    } finally { setBusy(null) }
  }

  const q = search.trim().toLowerCase()
  const filtered = offers.filter(o => {
    if (cat !== 'all' && o.product.category !== cat) return false
    if (supplierId !== 'all' && o.supplier.id !== supplierId) return false
    if (!q) return true
    return `${o.product.brand} ${o.product.name} ${o.supplier.name} ${o.description ?? ''}`.toLowerCase().includes(q)
  })
  const categories = [...new Set(offers.map(o => o.product.category))]
  const cartCount = Object.keys(cart).length

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-3">
          <Link to="/more" className="text-primary"><ArrowLeft size={22} /></Link>
          <h1 className="text-xl font-bold text-gray-900">Boutique</h1>
        </div>
        <Link to="/restock" className="relative w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
          <ShoppingCart size={18} />
          {cartCount > 0 && <span className="absolute -top-1 -right-1 bg-danger text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{cartCount}</span>}
        </Link>
      </div>
      <p className="text-xs text-gray-500 -mt-1">{offers.length} référence{offers.length > 1 ? 's' : ''} · {referenced.length} fournisseur{referenced.length > 1 ? 's' : ''} référencé{referenced.length > 1 ? 's' : ''}</p>

      {error && <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>}

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9 pr-8" value={search} onChange={e => setSearch(e.target.value)} placeholder="Marque, produit, fournisseur…" />
        {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"><X size={16} /></button>}
      </div>

      {referenced.length > 1 && (
        <select className="input py-2" value={supplierId} onChange={e => setSupplierId(e.target.value)}>
          <option value="all">Tous les fournisseurs</option>
          {referenced.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {categories.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
          {(['all', ...categories] as (BottleCategory | 'all')[]).map(c => (
            <button key={c} onClick={() => setCat(c)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border ${cat === c ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>
              {c === 'all' ? 'Tout' : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Store size={40} className="mx-auto mb-2 text-gray-300" />
          <p>{offers.length === 0 ? 'Aucune référence disponible pour le moment' : 'Aucun résultat'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(o => {
            const existing = bottleFor(o)
            const cartQty = existing ? cart[existing.id] ?? 0 : 0
            return (
              <div key={o.offerId} className="card p-3 flex items-center gap-3">
                <button onClick={() => setOpen(o)} className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{o.product.brand} {o.product.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {CATEGORY_LABELS[o.product.category]}{o.product.volume ? ` · ${o.product.volume}` : ''} · {o.supplier.name}
                  </p>
                  {o.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{o.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    {typeof o.price === 'number' && <span className="text-sm font-bold text-gray-900">{euro(o.price, 2)} HT</span>}
                    {existing && <span className="text-[10px] font-bold text-success bg-success-light px-1.5 py-0.5 rounded-md">EN STOCK : {existing.quantity}</span>}
                  </div>
                </button>
                <button onClick={() => handleOrder(o)} disabled={busy === o.offerId}
                  aria-label={`Commander ${o.product.name}`}
                  className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${cartQty > 0 ? 'bg-success text-white' : 'bg-primary text-white'} disabled:opacity-60`}>
                  {busy === o.offerId
                    ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : cartQty > 0 ? <span className="text-sm font-bold">{cartQty}</span> : <Plus size={18} strokeWidth={3} />}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {open && (
        <OfferModal
          offer={open}
          inInventory={!!bottleFor(open)}
          cartQty={(() => { const b = bottleFor(open); return b ? cart[b.id] ?? 0 : 0 })()}
          busy={busy === open.offerId}
          onClose={() => setOpen(null)}
          onOrder={() => handleOrder(open)}
        />
      )}
    </div>
  )
}
