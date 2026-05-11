import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, ChevronRight, Package } from 'lucide-react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useStock } from '../context/StockContext'
import { CATEGORIES, CATEGORY_LABELS, BottleCategory, Product } from '../types'

type Step = 'search' | 'details' | 'custom'

export default function AddBottlePage() {
  const { addBottle, suppliers } = useStock()
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [form, setForm] = useState({ name: '', category: 'whisky' as BottleCategory, quantity: '', minThreshold: '', price: '', supplierId: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState(false)

  useEffect(() => {
    getDocs(collection(db, 'products')).then(snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[])
      setProductsLoading(false)
    }).catch(err => {
      console.error('products fetch failed:', err)
      setCatalogError(true)
      setProductsLoading(false)
    })
  }, [])

  useEffect(() => {
    if (!form.supplierId && suppliers.length > 0) setForm(f => ({ ...f, supplierId: suppliers[0].id }))
  }, [suppliers])

  const filtered = searchQuery.length >= 2
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 20)
    : []

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    setForm(f => ({
      ...f,
      name: product.brand ? `${product.brand} ${product.name}` : product.name,
      category: product.category,
    }))
    setStep('details')
  }

  const handleCustom = () => {
    setSelectedProduct(null)
    setForm({ name: searchQuery, category: 'whisky', quantity: '', minThreshold: '', price: '', supplierId: suppliers[0]?.id ?? '' })
    setStep('custom')
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const qty = parseInt(form.quantity)
    const min = parseInt(form.minThreshold)
    const price = parseFloat(form.price.replace(',', '.'))
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return }
    if (isNaN(qty) || qty < 0 || isNaN(min) || min < 0 || isNaN(price) || price < 0) { setError('Vérifiez les valeurs numériques.'); return }
    setLoading(true)
    try {
      await addBottle({
        name: form.name.trim(),
        category: form.category,
        quantity: qty,
        minThreshold: min,
        price,
        supplierId: form.supplierId,
        ...(selectedProduct ? { catalogProductId: selectedProduct.id } : {}),
      })
      navigate('/inventory')
    } catch { setError('Erreur lors de l\'ajout.') }
    finally { setLoading(false) }
  }

  if (step === 'search') {
    return (
      <div className="p-4">
        <div className="flex items-center gap-3 pt-2 mb-5">
          <button onClick={() => navigate(-1)} className="text-primary"><ArrowLeft size={22} /></button>
          <h1 className="text-xl font-bold text-gray-900">Nouveau produit</h1>
        </div>

        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-10"
            placeholder="Rechercher dans le catalogue…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        {searchQuery.length < 2 ? (
          <div className="text-center py-10 text-gray-400">
            <Package size={36} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Saisissez au moins 2 caractères</p>
            <button onClick={handleCustom} className="mt-5 text-primary text-sm font-semibold">
              + Créer un produit personnalisé
            </button>
          </div>
        ) : catalogError ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm text-danger">Catalogue indisponible — vérifiez les règles Firestore</p>
            <button onClick={handleCustom} className="mt-4 text-primary text-sm font-semibold">
              + Créer un produit personnalisé
            </button>
          </div>
        ) : productsLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectProduct(p)}
                className="w-full card p-3 flex items-center justify-between text-left active:opacity-75"
              >
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{p.brand} {p.name}</p>
                  <p className="text-xs text-gray-400">
                    {CATEGORY_LABELS[p.category]}{p.volume ? ` · ${p.volume}` : ''}
                  </p>
                </div>
                <ChevronRight size={18} className="text-gray-300 flex-shrink-0" />
              </button>
            ))}
            <button
              onClick={handleCustom}
              className="w-full card p-3 flex items-center gap-3 text-left border border-dashed border-gray-200 active:opacity-75"
            >
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xl font-light flex-shrink-0">+</div>
              <div>
                <p className="font-semibold text-gray-700 text-sm">Produit personnalisé</p>
                {filtered.length === 0
                  ? <p className="text-xs text-gray-400">"{searchQuery}" n'est pas dans le catalogue</p>
                  : <p className="text-xs text-gray-400">Créer manuellement</p>
                }
              </div>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-2 mb-5">
        <button onClick={() => setStep('search')} className="text-primary"><ArrowLeft size={22} /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {step === 'details' ? 'Détails du produit' : 'Produit personnalisé'}
          </h1>
          {selectedProduct && (
            <p className="text-xs text-gray-400 mt-0.5">
              {selectedProduct.brand} {selectedProduct.name}{selectedProduct.volume ? ` · ${selectedProduct.volume}` : ''}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        {error && <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>}

        <div>
          <label className="label">Nom *</label>
          <input className="input" value={form.name} onChange={set('name')} required />
        </div>

        <div>
          <label className="label">Catégorie *</label>
          <select className="input" value={form.category} onChange={set('category')} disabled={step === 'details'}>
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Quantité *</label><input className="input" type="number" min="0" value={form.quantity} onChange={set('quantity')} placeholder="0" required /></div>
          <div><label className="label">Seuil minimum *</label><input className="input" type="number" min="0" value={form.minThreshold} onChange={set('minThreshold')} placeholder="0" required /></div>
        </div>

        <div>
          <label className="label">Prix unitaire (€) *</label>
          <input className="input" type="text" inputMode="decimal" value={form.price} onChange={set('price')} placeholder="0.00" required />
        </div>

        {suppliers.length > 0 && (
          <div>
            <label className="label">Fournisseur</label>
            <select className="input" value={form.supplierId} onChange={set('supplierId')}>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
