import { NavLink, Outlet } from 'react-router-dom'
import { LayoutGrid, Wine, ShoppingCart, ClipboardList, Phone } from 'lucide-react'
import { useStock } from '../context/StockContext'

export default function Layout() {
  const { getCartTotal, getPendingOrders } = useStock()
  const cartCount = getCartTotal()
  const pendingCount = getPendingOrders().length

  const tabs = [
    { to: '/', icon: LayoutGrid, label: 'Accueil', exact: true },
    { to: '/inventory', icon: Wine, label: 'Inventaire' },
    { to: '/restock', icon: ShoppingCart, label: 'Commander', badge: cartCount },
    { to: '/orders', icon: ClipboardList, label: 'Commandes', badge: pendingCount },
    { to: '/suppliers', icon: Phone, label: 'Fournisseurs' },
  ]

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-background">
      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(({ to, icon: Icon, label, badge, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2 px-1 text-xs font-semibold transition-colors ${isActive ? 'text-primary' : 'text-gray-400'}`
              }
            >
              <div className="relative">
                <Icon size={22} />
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-danger text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {badge}
                  </span>
                )}
              </div>
              <span className="text-[11px]">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
