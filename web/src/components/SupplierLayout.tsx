import { NavLink, Outlet } from 'react-router-dom'
import { ClipboardList, User } from 'lucide-react'

const tabs = [
  { to: '/supplier', label: 'Commandes', icon: ClipboardList, exact: true },
  { to: '/supplier/profile', label: 'Profil', icon: User },
]

export default function SupplierLayout() {
  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-background">
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-lg mx-auto flex">
          {tabs.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center gap-1 py-2 px-1 text-xs font-semibold transition-colors ${isActive ? 'text-primary' : 'text-gray-400'}`
              }
            >
              <Icon size={22} />
              <span className="text-[11px]">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
