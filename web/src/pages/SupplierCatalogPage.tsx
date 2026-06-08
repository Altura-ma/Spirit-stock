import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../context/AuthContext'
import { Search, Check, Package } from 'lucide-react'
import { CATEGORY_LABELS, BottleCategory, Product } from '../types'
import AppLoadingSkeleton from '../components/AppLoadingSkeleton'

export default function SupplierCatalogPage() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [supplierProductMap, setSupplierProductMap] = useState<Map<string, string>>(new Map())
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
      const map = new Map<string, string>()
      spSnap.docs.forEach(d => map.set(d.data().productId, d.id))
      setSupplierProductMap(map)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user?.supplierId])

  const handleToggle = async (product: Product) => {
    if (!user?.supplierId || toggling) return
    setToggling(product.id)
    const existingDocId = supplierProductMap.get(product.id)
    if (existingDocId) {
      await deleteDoc(doc(db, 'supplier_products', existingDocId))
      setSupplierProductMap(prev => { const n = new Map(prev); n.delete(product.id); return n })
    } else {
      const ref = await addDoc(collection(db, 'supplier_products'), {
        supplierId: user.supplierId, productId: product.id, createdAt: serverTimestamp(),
      })
      setSupplierProductMap(prev => new Map(prev).set(product.id, ref.id))
    }
    setToggling(null)
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
                  const inCatalog = supplierProductMap.has(p.id)
                  const isToggling = toggling === p.id
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
                        {p.volume && <p className="text-xs text-gray-400">{p.volume}</p>}
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
