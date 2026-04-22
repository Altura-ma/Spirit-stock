import { useState } from 'react'
import { Phone, Mail, ShoppingCart, CheckCircle, Send } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { useAuth } from '../context/AuthContext'
import { CATEGORY_LABELS, OrderItem } from '../types'

export default function RestockPage() {
  const { user } = useAuth()
  const { bottles, suppliers, cart, clearSupplierCart, clearCart, createOrder, getLowStock } = useStock()
  const [sent, setSent] = useState<string[]>([])
  const [emailError, setEmailError] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null) // supplierId being sent

  const cartBottles = bottles.filter(b => cart[b.id] > 0)
  const cartSections = suppliers
    .map(s => ({ supplier: s, items: cartBottles.filter(b => b.supplierId === s.id) }))
    .filter(s => s.items.length > 0)
  const unassignedItems = cartBottles.filter(b => !suppliers.find(s => s.id === b.supplierId))
  if (unassignedItems.length > 0) {
    cartSections.push({ supplier: { id: 'none', name: 'Sans fournisseur', phone: '', email: '', restaurantId: '' }, items: unassignedItems })
  }

  const totalCartItems = cartBottles.length

  const handleCommander = async (supplierId: string) => {
    const section = cartSections.find(s => s.supplier.id === supplierId)
    if (!section) return
    if (supplierId === 'none') { setEmailError("Ces produits n'ont pas de fournisseur assigné."); return }
    if (!section.supplier.email) {
      setEmailError(`Ajoutez l'adresse email de "${section.supplier.name}" dans Fournisseurs pour commander.`)
      return
    }
    setEmailError(null)
    setLoading(supplierId)
    const orderItems: OrderItem[] = section.items.map(b => ({ bottleId: b.id, bottleName: b.name, category: b.category, quantity: cart[b.id] }))
    await createOrder(supplierId, orderItems)
    clearSupplierCart(supplierId)
    setSent(prev => [...prev, supplierId])
    setLoading(null)
  }

  const handleToutCommander = async () => {
    setEmailError(null)
    const missing = cartSections.filter(s => s.supplier.id !== 'none' && !s.supplier.email)
    if (missing.length > 0) {
      setEmailError(`Email manquant pour : ${missing.map(s => s.supplier.name).join(', ')}. Ajoutez-les dans Fournisseurs.`)
      return
    }
    setLoading('all')
    for (const section of cartSections) {
      if (section.supplier.id === 'none' || !section.supplier.email) continue
      const orderItems: OrderItem[] = section.items.map(b => ({ bottleId: b.id, bottleName: b.name, category: b.category, quantity: cart[b.id] }))
      await createOrder(section.supplier.id, orderItems)
    }
    clearCart()
    setSent(cartSections.map(s => s.supplier.id))
    setLoading(null)
  }

  const lowStock = getLowStock()
  const suggestions = lowStock.filter(b => !cart[b.id])

  if (totalCartItems === 0 && lowStock.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-4">
      <div className="w-16 h-16 bg-success-light rounded-full flex items-center justify-center mb-4">
        <CheckCircle size={28} className="text-success" />
      </div>
      <p className="font-bold text-success text-lg">Tout est en stock</p>
      <p className="text-gray-400 text-sm mt-1">Aucun produit sous le seuil minimum</p>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">Commander</h1>
          {totalCartItems > 0 && (
            <span className="bg-primary text-white text-xs font-bold rounded-full px-2 py-0.5">{totalCartItems}</span>
          )}
        </div>
        {totalCartItems > 1 && (
          <button
            onClick={handleToutCommander}
            disabled={loading === 'all'}
            className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-60">
            {loading === 'all'
              ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><ShoppingCart size={15} /> Tout commander</>}
          </button>
        )}
      </div>

      {emailError && (
        <div className="bg-danger-light text-danger text-sm p-3 rounded-xl flex items-start gap-2">
          <Mail size={16} className="flex-shrink-0 mt-0.5" />
          <p>{emailError}</p>
        </div>
      )}

      {totalCartItems > 0 ? (
        <div className="space-y-3">
          {cartSections.map(({ supplier, items }) => (
            <div key={supplier.id} className="card overflow-hidden">
              <div className="bg-primary p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white font-bold text-base">{supplier.name}</p>
                    {supplier.phone && <p className="text-white/70 text-sm">{supplier.phone}</p>}
                  </div>
                  {supplier.phone && (
                    <a href={`tel:${supplier.phone}`} className="flex items-center gap-1.5 bg-white/20 text-white text-sm font-medium px-3 py-1.5 rounded-lg">
                      <Phone size={14} /> Appeler
                    </a>
                  )}
                </div>
                {supplier.id !== 'none' && !sent.includes(supplier.id) && (
                  <button
                    onClick={() => handleCommander(supplier.id)}
                    disabled={loading === supplier.id}
                    className="w-full flex items-center justify-center gap-2 bg-white text-primary font-bold py-2.5 rounded-xl text-sm disabled:opacity-60">
                    {loading === supplier.id
                      ? <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      : <><Send size={14} /> Commander chez {supplier.name}</>}
                  </button>
                )}
                {sent.includes(supplier.id) && (
                  <div className="w-full flex items-center justify-center gap-2 bg-success text-white font-bold py-2.5 rounded-xl text-sm">
                    <CheckCircle size={15} /> Email envoyé au fournisseur
                  </div>
                )}
                {supplier.id !== 'none' && !supplier.email && !sent.includes(supplier.id) && (
                  <p className="text-white/60 text-xs text-center mt-2">⚠ Pas d'email — ajoutez-en un dans Fournisseurs</p>
                )}
              </div>
              <div>
                {items.map((b, i) => (
                  <div key={b.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                      <p className="text-xs text-gray-400">{CATEGORY_LABELS[b.category]}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400">stock : {b.quantity}</span>
                      <span className="text-base font-bold text-primary">+{cart[b.id]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-5 text-center">
          <ShoppingCart size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="font-semibold text-gray-600">Panier vide</p>
          <p className="text-gray-400 text-sm mt-1">Ajoutez des bouteilles depuis l'Inventaire</p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Suggestions — stock faible</p>
          <div className="card overflow-hidden">
            {suggestions.map((b, i) => (
              <div key={b.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.quantity === 0 ? 'bg-danger' : 'bg-warning'}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-400">{CATEGORY_LABELS[b.category]} · seuil {b.minThreshold}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold ${b.quantity === 0 ? 'text-danger' : 'text-warning'}`}>{b.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
