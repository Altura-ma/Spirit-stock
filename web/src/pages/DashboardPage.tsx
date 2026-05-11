import { Link } from 'react-router-dom'
import { Wine, AlertCircle, TrendingUp, ChevronRight, History } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useStock } from '../context/StockContext'
import { CATEGORY_LABELS } from '../types'

export default function DashboardPage() {
  const { user } = useAuth()
  const { bottles, loading, getLowStock, getTotalValue } = useStock()
  const lowStock = getLowStock()
  const outOfStock = bottles.filter(b => b.quantity === 0)

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-gray-500 text-sm">Bonjour</p>
          <h1 className="text-xl font-bold text-gray-900">{user?.restaurantName}</h1>
        </div>
        <Link to="/profile" className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg">
          {user?.restaurantName?.charAt(0).toUpperCase()}
        </Link>
      </div>

      {/* Stats */}
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

      {/* History shortcut */}
      <Link to="/history" className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
        <History size={18} className="text-primary flex-shrink-0" />
        <p className="text-gray-700 text-sm font-medium flex-1">Historique des mouvements</p>
        <ChevronRight size={16} className="text-gray-400" />
      </Link>

      {/* Out of stock */}
      {outOfStock.length > 0 && (
        <Link to="/restock" className="flex items-center gap-3 p-3 bg-danger-light rounded-xl">
          <AlertCircle size={18} className="text-danger flex-shrink-0" />
          <p className="text-danger text-sm font-medium flex-1">
            {outOfStock.length} produit{outOfStock.length > 1 ? 's' : ''} épuisé{outOfStock.length > 1 ? 's' : ''}
          </p>
          <ChevronRight size={16} className="text-danger" />
        </Link>
      )}

      {/* Low stock list */}
      {lowStock.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-900">Stock faible</h2>
            <Link to="/restock" className="text-sm text-primary font-medium">Tout voir</Link>
          </div>
          <div className="space-y-0">
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
        </div>
      )}

      {/* All good */}
      {lowStock.length === 0 && bottles.length > 0 && (
        <div className="card p-6 text-center bg-success-light">
          <TrendingUp size={36} className="text-success mx-auto mb-2" />
          <p className="font-bold text-success">Tout est en ordre !</p>
          <p className="text-success text-sm mt-1">Aucun produit sous le seuil</p>
        </div>
      )}

      {/* Empty */}
      {bottles.length === 0 && (
        <div className="card p-8 text-center">
          <Wine size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="font-bold text-gray-700">Aucun produit</p>
          <p className="text-gray-400 text-sm mt-1">Commencez par ajouter vos bouteilles</p>
          <Link to="/inventory/add" className="btn-primary mt-4 max-w-xs mx-auto">
            Ajouter un produit
          </Link>
        </div>
      )}
    </div>
  )
}
