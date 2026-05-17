import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../context/AuthContext'
import { Search, Check, Package, Plus, X } from 'lucide-react'
import { CATEGORY_LABELS, CATEGORIES, BottleCategory, Product } from '../types'

const EMPTY_FORM = { name: '', brand: '', category: 'whisky' as BottleCategory, volume: '' }

export default function SupplierCatalogPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [supplierProductMap, setSupplierProductMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toggling, setToggling] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.supplierId) return

    // Real-time listener so new products from other suppliers appear instantly
    const unsubProducts = onSnapshot(collection(db, 'products'), snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[])
      setLoading(false)
    }, () => setLoading(false))

    const unsubSP = onSnapshot(
      query(collection(db, 'supplier_products'), where('supplierId', '==', user.supplierId)),
      snap => {
        const map = new Map<string, string>()
        snap.docs.forEach(d => map.set(d.data().productId, d.id))
        setSupplierProductMap(map)
      }
    )

    return () => { unsubProducts(); unsubSP() }
  }, [user?.supplierId])

  const handleToggle = async (product: Product) => {
    if (!user?.supplierId || toggling) return
    setToggling(product.id)
    const existingDocId = supplierProductMap.get(product.id)
    if (existingDocId) {
      await deleteDoc(doc(db, 'supplier_products', existingDocId))
    } else {
      await addDoc(collection(db, 'supplier_products'), {
        supplierId: user.supplierId, productId: product.id, createdAt: serverTimestamp(),
      })
    }
    setToggling(null)
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.supplierId) return
    if (!form.name.trim() || !form.brand.trim()) {
      setFormError('Le nom et la marque sont obligatoires.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const productRef = await addDoc(collection(db, 'products'), {
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category,
        volume: form.volume.trim() || null,
        createdBy: user.supplierId,
        createdAt: serverTimestamp(),
      })
      // Auto-add to this supplier's catalog
      await addDoc(collection(db, 'supplier_products'), {
        supplierId: user.supplierId,
        productId: productRef.id,
        createdAt: serverTimestamp(),
      })
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch {
      setFormError('Erreur lors de la création. Réessayez.')
    }
    setSaving(false)
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

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Mon catalogue</h1>
        <div className="flex items-center gap-2">
          {catalogCount > 0 && (
            <span className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {catalogCount} produit{catalogCount > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => { setShowForm(v => !v); setFormError(null) }}
            className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white"
          >
            {showForm ? <X size={18} /> : <Plus size={18} />}
          </button>
        </div>
      </div>

      {/* New product form */}
      {showForm && (
        <form onSubmit={handleCreateProduct} className="card p-4 space-y-3 border border-primary/30">
          <p className="font-semibold text-gray-900 text-sm">Nouvelle référence</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Marque *</label>
              <input className="input" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Ex: Johnnie Walker" required />
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Black Label" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Catégorie *</label>
              <select className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as BottleCategory }))}>
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Volume</label>
              <input className="input" value={form.volume} onChange={e => setForm(f => ({ ...f, volume: e.target.value }))} placeholder="Ex: 70cl" />
            </div>
          </div>
          {formError && <p className="text-danger text-xs">{formError}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-semibold">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="flex-1 btn-primary py-2.5 text-sm">
              {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto block" /> : 'Créer & ajouter'}
            </button>
          </div>
        </form>
      )}

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
          <p className="text-sm">Le catalogue est vide — soyez le premier à ajouter une référence !</p>
          <button onClick={() => setShowForm(true)} className="mt-3 text-primary text-sm font-semibold">
            + Ajouter une référence
          </button>
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
                  const inCatalog = supplierProductMap.has(p.id)
                  const isToggling = toggling === p.id
                  const isMine = p.createdBy === user?.supplierId
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleToggle(p)}
                      disabled={!!toggling}
                      className={`w-full card p-3 flex items-center gap-3 text-left transition-colors active:opacity-75 ${inCatalog ? 'border border-success' : ''}`}
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
                        <div className="flex items-center gap-1.5">
                          {p.volume && <p className="text-xs text-gray-400">{p.volume}</p>}
                          {isMine && <span className="text-[10px] text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded">Ma référence</span>}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
