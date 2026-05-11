import { useState } from 'react'
import { TrendingDown, Package, ArrowUp, ArrowDown, History } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { Movement, MovementType, CATEGORY_LABELS } from '../types'

type Filter = 'all' | 'sale' | 'order_received' | 'adjustment'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'sale', label: 'Ventes' },
  { value: 'order_received', label: 'Commandes' },
  { value: 'adjustment', label: 'Ajustements' },
]

const MOVEMENT_CONFIG: Record<MovementType, { label: string; color: string; bg: string; Icon: React.ElementType; sign: string }> = {
  sale:             { label: 'Vente',       color: 'text-danger',  bg: 'bg-danger-light',   Icon: TrendingDown, sign: '−' },
  order_received:   { label: 'Commande',    color: 'text-success', bg: 'bg-success-light',  Icon: Package,      sign: '+' },
  adjustment_add:   { label: 'Ajustement',  color: 'text-primary', bg: 'bg-primary/10',     Icon: ArrowUp,      sign: '+' },
  adjustment_remove:{ label: 'Ajustement',  color: 'text-warning', bg: 'bg-warning-light',  Icon: ArrowDown,    sign: '−' },
}

function getDateLabel(d: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui"
  if (d.toDateString() === yesterday.toDateString()) return 'Hier'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function groupByDate(list: Movement[]): [string, Movement[]][] {
  const map = new Map<string, Movement[]>()
  for (const m of list) {
    const label = getDateLabel(m.createdAt)
    if (!map.has(label)) map.set(label, [])
    map.get(label)!.push(m)
  }
  return Array.from(map.entries())
}

export default function MovementsPage() {
  const { movements } = useStock()
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = movements
    .filter(m => {
      if (filter === 'all') return true
      if (filter === 'adjustment') return m.type === 'adjustment_add' || m.type === 'adjustment_remove'
      return m.type === filter
    })
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

  const groups = groupByDate(filtered)

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Historique</h1>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${filter === f.value ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <History size={40} className="mx-auto mb-2 text-gray-300" />
          <p className="font-medium">Aucun mouvement</p>
          <p className="text-xs mt-1">Les ventes et réceptions apparaîtront ici</p>
        </div>
      )}

      <div className="space-y-4">
        {groups.map(([date, items]) => (
          <div key={date}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{date}</p>
            <div className="space-y-2">
              {items.map(m => {
                const { label, color, bg, Icon, sign } = MOVEMENT_CONFIG[m.type]
                return (
                  <div key={m.id} className="card p-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={18} className={color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate text-sm">{m.bottleName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`text-[10px] font-bold ${color} ${bg} px-1.5 py-0.5 rounded-md`}>{label}</span>
                        <span className="text-xs text-gray-400">{CATEGORY_LABELS[m.category]}</span>
                        {m.supplierName && <span className="text-xs text-gray-400">· {m.supplierName}</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {m.createdAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        {' · '}
                        <span className="font-medium">{m.previousQuantity} → {m.newQuantity}</span>
                      </p>
                    </div>
                    <div className={`text-base font-bold flex-shrink-0 ${color}`}>
                      {sign}{m.quantity}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
