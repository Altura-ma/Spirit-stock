import { Link } from 'react-router-dom'
import { Store, Phone, PlugZap, ClipboardCheck, History, User, ChevronRight, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { INVENTORY_SERVICE } from '../types'

const ITEMS = [
  { to: '/shop', label: 'Boutique', sub: 'Toutes les références des fournisseurs', Icon: Store },
  { to: '/suppliers', label: 'Fournisseurs', sub: 'Contacts et emails de commande', Icon: Phone },
  { to: '/invoices', label: 'Factures', sub: 'Factures reçues de vos fournisseurs', Icon: FileText },
  { to: '/inventory-service', label: 'Inventaire physique', sub: `${INVENTORY_SERVICE.priceHT} € HT · jusqu'à ${INVENTORY_SERVICE.maxHours} h sur place`, Icon: ClipboardCheck },
  { to: '/history', label: 'Historique', sub: 'Tous les mouvements de stock', Icon: History },
  { to: '/pos', label: 'Caisses', sub: 'Connecter votre logiciel de caisse', Icon: PlugZap },
  { to: '/profile', label: 'Mon compte', sub: 'Abonnement, mot de passe', Icon: User },
]

export default function MorePage() {
  const { user } = useAuth()
  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">Plus</h1>
        <p className="text-sm text-gray-400">{user?.restaurantName}</p>
      </div>
      <div className="card overflow-hidden">
        {ITEMS.map(({ to, label, sub, Icon }, i) => (
          <Link key={to} to={to} className={`flex items-center gap-3 p-4 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Icon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 text-sm">{label}</p>
              <p className="text-xs text-gray-400 truncate">{sub}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300" />
          </Link>
        ))}
      </div>
    </div>
  )
}
