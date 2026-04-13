import { Phone } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { CATEGORY_LABELS } from '../types'

export default function RestockPage() {
  const { getLowStock, suppliers } = useStock()
  const lowStock = getLowStock()

  const sections = suppliers
    .map(s => ({ supplier: s, bottles: lowStock.filter(b => b.supplierId === s.id) }))
    .filter(s => s.bottles.length > 0)

  const unassigned = lowStock.filter(b => !suppliers.find(s => s.id === b.supplierId))
  if (unassigned.length > 0) sections.push({ supplier: { id: 'none', name: 'Sans fournisseur', phone: '', restaurantId: '' }, bottles: unassigned })

  if (lowStock.length === 0) return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-4">
      <div className="w-16 h-16 bg-success-light rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">✓</span>
      </div>
      <p className="font-bold text-success text-lg">Tout est en stock</p>
      <p className="text-gray-400 text-sm mt-1">Aucun produit sous le seuil minimum</p>
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 pt-2">
        <h1 className="text-xl font-bold text-gray-900">À commander</h1>
        <span className="bg-danger text-white text-xs font-bold rounded-full px-2 py-0.5">{lowStock.length}</span>
      </div>
      <p className="text-gray-400 text-xs">Produits groupés par fournisseur</p>

      {sections.map(({ supplier, bottles }) => (
        <div key={supplier.id} className="card overflow-hidden">
          <div className="bg-primary p-4 flex items-center justify-between">
            <div>
              <p className="text-white font-bold">{supplier.name}</p>
              {supplier.phone && <p className="text-white/70 text-sm">{supplier.phone}</p>}
            </div>
            {supplier.phone && (
              <a href={`tel:${supplier.phone}`} className="flex items-center gap-2 bg-white/20 text-white font-semibold text-sm px-3 py-2 rounded-lg">
                <Phone size={16} /> Appeler
              </a>
            )}
          </div>
          <div>
            {bottles.map((b, i) => (
              <div key={b.id} className={`flex items-center justify-between p-4 ${i > 0 ? 'border-t border-gray-100' : ''} ${b.quantity === 0 ? 'bg-danger-light' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${b.quantity === 0 ? 'bg-danger' : 'bg-warning'}`} />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{b.name}</p>
                    <p className="text-xs text-gray-400">{CATEGORY_LABELS[b.category]}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${b.quantity === 0 ? 'text-danger' : 'text-warning'}`}>{b.quantity}</p>
                  <p className="text-xs text-gray-400">seuil {b.minThreshold}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
