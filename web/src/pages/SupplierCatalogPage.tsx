import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, updateDoc, deleteField } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../context/AuthContext'
import { Search, Check, Package, PenLine, X } from 'lucide-react'
import { CATEGORY_LABELS, BottleCategory, Product } from '../types'
import AppLoadingSkeleton from '../components/AppLoadingSkeleton'

type Offer = { docId: string; description?: string; price?: number }

function OfferEditor({ product, offer, onClose, onSave }: {
  product: Product
  offer: Offer
  onClose: () => void
  onSave: (description: string, price: number | null) => Promise<void>
}) {
  const [description, setDescription] = useState(offer.description ?? '')
  const [price, setPrice] = useState(offer.price != null ? String(offer.price) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = price.trim() === '' ? null : Number(price.replace(',', '.'))
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) { setError('Prix invalide.'); return }
    setSaving(true)
    try { await onSave(description.trim(), parsed) }
    catch { setError('Enregistrement impossible.'); setSaving(false) }
  }

  return (
    <div data-modal-open className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <form onSubmit={submit} className="card p-5 w-full max-w-sm space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-gray-400">{CATEGORY_LABELS[product.category]}{product.volume ? ` · ${product.volume}` : ''}</p>
            <h3 className="font-bold text-lg text-gray-900 leading-tight">{product.brand} {product.name}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        {error && <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>}
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[120px]" maxLength={2000} value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Origine, notes de dégustation, degré, conditionnement, conseils de service…" />
          <p className="text-[11px] text-gray-400 text-right">{description.length}/2000</p>
        </div>
        <div>
          <label className="label">Prix HT par bouteille (€)</label>
          <input className="input" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="ex. 24,90" />
          <p className="text-[11px] text-gray-400 mt-1">Affiché aux restaurants dans la boutique.</p>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function SupplierCatalogPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [supplierProductMap, setSupplierProductMap] = useState<Map<string, Offer>>(new Map())
  const [editing, setEditing] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.supplierId) return
    Promise.all([
      getDocs(collection(db, 'products')),
      getDocs(query(collection(db, 'supplier_products'), where('supplierId', '==', user.supplierId))),
    ]).then(([prodSnap, spSnap]) => {
      setProducts(prodSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[])
      const map = new Map<string, Offer>()
      spSnap.docs.forEach(d => {
        const data = d.data()
        map.set(data.productId, {
          docId: d.id,
          description: typeof data.description === 'string' ? data.description : undefined,
          price: typeof data.price === 'number' ? data.price : undefined,
        })
      })
      setSupplierProductMap(map)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user?.supplierId])

  const handleToggle = async (product: Product) => {
    if (!user?.supplierId || toggling) return
    setToggling(product.id)
    const existingDocId = supplierProductMap.get(product.id)?.docId
    if (existingDocId) {
      await deleteDoc(doc(db, 'supplier_products', existingDocId))
      setSupplierProductMap(prev => { const n = new Map(prev); n.delete(product.id); return n })
    } else {
      const ref = await addDoc(collection(db, 'supplier_products'), {
        supplierId: user.supplierId, productId: product.id, createdAt: serverTimestamp(),
      })
      setSupplierProductMap(prev => new Map(prev).set(product.id, { docId: ref.id }))
      setEditing(product) // invite the supplier to describe the new article
    }
    setToggling(null)
  }

  const saveOffer = async (product: Product, description: string, price: number | null) => {
    const offer = supplierProductMap.get(product.id)
    if (!offer) return
    await updateDoc(doc(db, 'supplier_products', offer.docId), {
      description: description || deleteField(),
      price: price ?? deleteField(),
      updatedAt: serverTimestamp(),
    })
    setSupplierProductMap(prev => new Map(prev).set(product.id, { docId: offer.docId, description: description || undefined, price: price ?? undefined }))
    setEditing(null)
  }

  const filtered = products.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = filtered.reduce((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {} as Record<string, Product[]>)

  const catalogCount = supplierProductMap.size

  if (loading) return <AppLoadingSkeleton />

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Mon catalogue</h1>
        {catalogCount > 0 && (
          <span className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {catalogCount} produit{catalogCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-10"
          placeholder="Rechercher un produit…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package size={40} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Le catalogue est vide pour l'instant</p>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Aucun résultat pour "{search}"</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([cat, prods]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {CATEGORY_LABELS[cat as BottleCategory] ?? cat}
              </p>
              <div className="space-y-2">
                {prods.map(p => {
                  const offer = supplierProductMap.get(p.id)
                  const inCatalog = !!offer
                  const isToggling = toggling === p.id
                  return (
                    <div key={p.id} className={`card flex items-center ${inCatalog ? 'border border-success' : ''}`}>
                    <button
                      onClick={() => handleToggle(p)}
                      disabled={!!toggling}
                      className="flex-1 min-w-0 p-3 flex items-center gap-3 text-left transition-colors active:opacity-75"
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${inCatalog ? 'bg-success' : 'bg-gray-100'}`}>
                        {isToggling
                          ? <span className={`w-4 h-4 border-2 ${inCatalog ? 'border-white' : 'border-gray-400'} border-t-transparent rounded-full animate-spin`} />
                          : inCatalog
                            ? <Check size={15} className="text-white" />
                            : <span className="text-gray-400 text-base font-light">+</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{p.brand} {p.name}</p>
                        {p.volume && <p className="text-xs text-gray-400">{p.volume}</p>}
                        {offer?.description && <p className="text-xs text-gray-500 truncate">{offer.description}</p>}
                        {offer?.price != null && <p className="text-xs font-semibold text-gray-700">{offer.price.toFixed(2)} € HT</p>}
                      </div>
                    </button>
                    {inCatalog && (
                      <button onClick={() => setEditing(p)} aria-label="Modifier la fiche"
                        className={`mr-3 flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg ${offer?.description ? 'bg-gray-100 text-gray-600' : 'bg-primary/10 text-primary'}`}>
                        <PenLine size={13} /> {offer?.description ? 'Fiche' : 'Décrire'}
                      </button>
                    )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && supplierProductMap.get(editing.id) && (
        <OfferEditor product={editing} offer={supplierProductMap.get(editing.id)!} onClose={() => setEditing(null)}
          onSave={(d, pr) => saveOffer(editing, d, pr)} />
      )}
    </div>
  )
}
