import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BarChart3, ShieldAlert, CalendarDays, Info, ClipboardCheck, Pencil } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { CATEGORY_LABELS, formatDay } from '../types'
import { dailyStock, daysAgo, euro, lossAlerts, lossesPerDay, round2, salesByProduct, salesPerDay } from '../lib/analytics'

type Tab = 'sales' | 'losses' | 'daily'
const PERIODS = [7, 30, 90] as const

function Bars({ data, color = 'bg-primary', secondary }: {
  data: { day: string; value: number; value2?: number }[]
  color?: string
  secondary?: string
}) {
  const max = Math.max(1, ...data.map(d => d.value + (d.value2 ?? 0)))
  const showEvery = data.length > 31 ? 7 : data.length > 10 ? 5 : 1
  return (
    <div>
      <div className="flex items-end gap-[2px] h-28" role="img" aria-label="Graphique par jour">
        {data.map(d => (
          <div key={d.day} className="flex-1 flex flex-col justify-end h-full" title={`${formatDay(d.day)} : ${round2(d.value)}${d.value2 ? ` / ${round2(d.value2)}` : ''}`}>
            {secondary && (d.value2 ?? 0) > 0 && <div className={`${secondary} rounded-t-sm`} style={{ height: `${((d.value2 ?? 0) / max) * 100}%` }} />}
            <div className={`${color} ${secondary && (d.value2 ?? 0) > 0 ? '' : 'rounded-t-sm'} min-h-[1px]`} style={{ height: `${(d.value / max) * 100}%`, opacity: d.value === 0 ? 0.15 : 1 }} />
          </div>
        ))}
      </div>
      <div className="flex gap-[2px] mt-1">
        {data.map((d, i) => (
          <div key={d.day} className="flex-1 text-[9px] text-gray-400 text-center overflow-visible whitespace-nowrap">
            {i % showEvery === 0 ? new Date(d.day + 'T12:00:00').getDate() : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function StatsPage() {
  const { bottles, movements } = useStock()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'sales'
  const [period, setPeriod] = useState<number>(30)
  const [bottleId, setBottleId] = useState<string>('')

  const since = daysAgo(period - 1)
  const sales = useMemo(() => salesByProduct(movements, bottles, since), [movements, bottles, period]) // eslint-disable-line react-hooks/exhaustive-deps
  const perDay = useMemo(() => salesPerDay(movements, period), [movements, period])
  const losses = useMemo(() => lossAlerts(movements, bottles, since), [movements, bottles, period]) // eslint-disable-line react-hooks/exhaustive-deps
  const lossDays = useMemo(() => lossesPerDay(movements, period), [movements, period])

  const selectedBottle = bottles.find(b => b.id === (bottleId || losses[0]?.bottleId || sales[0]?.bottleId || bottles[0]?.id))
  const daily = useMemo(() => selectedBottle ? dailyStock(selectedBottle, movements, Math.min(period, 31)) : [], [selectedBottle, movements, period])

  const totalSold = round2(sales.reduce((s, r) => s + r.quantity, 0))
  const totalValue = sales.reduce((s, r) => s + r.revenue, 0)
  const totalLost = round2(losses.reduce((s, r) => s + r.lost, 0))
  const lostValue = losses.reduce((s, r) => s + r.value, 0)
  const lossRate = totalLost + totalSold > 0 ? totalLost / (totalLost + totalSold) : 0

  const setTab = (t: Tab) => setParams(t === 'sales' ? {} : { tab: t }, { replace: true })

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Statistiques</h1>
        <div className="flex bg-white border border-gray-200 rounded-full p-0.5" data-no-swipe>
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${period === p ? 'bg-primary text-white' : 'text-gray-500'}`}>
              {p} j
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {([
          ['sales', 'Ventes', BarChart3],
          ['losses', 'Écarts / vols', ShieldAlert],
          ['daily', 'Stock / jour', CalendarDays],
        ] as const).map(([v, label, Icon]) => (
          <button key={v} onClick={() => setTab(v)}
            className={`flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-semibold border ${tab === v ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === 'sales' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3">
              <p className="text-xs text-gray-500">Bouteilles vendues</p>
              <p className="text-2xl font-bold text-primary">{totalSold}</p>
            </div>
            <div className="card p-3">
              <p className="text-xs text-gray-500">Valeur (prix d'achat)</p>
              <p className="text-2xl font-bold text-primary">{euro(totalValue)}</p>
            </div>
          </div>

          <div className="card p-4">
            <p className="font-bold text-gray-900 mb-3">Ventes par jour</p>
            <Bars data={perDay.map(d => ({ day: d.day, value: d.quantity }))} />
          </div>

          <div className="card p-4">
            <p className="font-bold text-gray-900 mb-1">Par référence</p>
            <p className="text-xs text-gray-400 mb-3">Ventes manuelles et ventes caisse, sur {period} jours</p>
            {sales.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Aucune vente sur la période</p>
            ) : sales.map((r, i) => (
              <div key={r.bottleId} className={`py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                    <p className="text-xs text-gray-400">{CATEGORY_LABELS[r.category]} · {euro(r.revenue)}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 ml-2">×{round2(r.quantity)}</p>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full mt-1.5 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(r.quantity / sales[0].quantity) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'losses' && (
        <>
          <div className="card p-4 bg-primary/5 border border-primary/10 flex gap-3">
            <Info size={18} className="text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-600 leading-relaxed">
              Un <strong>écart</strong> est une bouteille sortie du stock sans vente enregistrée : vous avez corrigé la quantité
              à la baisse après un comptage. Casse, offerts, erreurs de saisie… ou <strong>vol</strong>. Comptez régulièrement
              votre stock pour repérer les écarts au jour près.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="card p-3 text-center">
              <p className={`text-xl font-bold ${totalLost > 0 ? 'text-danger' : 'text-success'}`}>{totalLost}</p>
              <p className="text-[11px] text-gray-500">bouteilles</p>
            </div>
            <div className="card p-3 text-center">
              <p className={`text-xl font-bold ${lostValue > 0 ? 'text-danger' : 'text-success'}`}>{euro(lostValue)}</p>
              <p className="text-[11px] text-gray-500">perdus</p>
            </div>
            <div className="card p-3 text-center">
              <p className={`text-xl font-bold ${lossRate >= 0.08 ? 'text-danger' : lossRate > 0 ? 'text-warning' : 'text-success'}`}>{Math.round(lossRate * 100)}%</p>
              <p className="text-[11px] text-gray-500">des sorties</p>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-900">Écarts par jour</p>
              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-danger" />Écarts</span>
              </div>
            </div>
            <Bars data={lossDays.map(d => ({ day: d.day, value: d.lost }))} color="bg-danger" />
          </div>

          <div className="card p-4">
            <p className="font-bold text-gray-900 mb-3">Produits à surveiller</p>
            {losses.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">Aucun écart sur la période 👌</p>
            ) : losses.map((l, i) => (
              <button key={l.bottleId} onClick={() => { setBottleId(l.bottleId); setTab('daily') }}
                className={`w-full text-left flex items-center gap-3 py-2.5 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                  l.level === 'high' ? 'bg-danger-light text-danger' : l.level === 'medium' ? 'bg-warning-light text-warning' : 'bg-gray-100 text-gray-500'}`}>
                  {l.level === 'high' ? 'ÉLEVÉ' : l.level === 'medium' ? 'MOYEN' : 'FAIBLE'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{l.name}</p>
                  <p className="text-xs text-gray-400">
                    {l.lost} manquante{l.lost > 1 ? 's' : ''} · {l.sold} vendue{l.sold > 1 ? 's' : ''} · dernier écart {l.lastLossAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <p className="text-sm font-bold text-danger">{euro(l.value)}</p>
              </button>
            ))}
          </div>

          <Link to="/inventory-service" className="card p-4 flex items-center gap-3">
            <ClipboardCheck size={20} className="text-accent flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Faire vérifier votre stock sur place</p>
              <p className="text-xs text-gray-500">Un inventaire physique par notre équipe</p>
            </div>
          </Link>
        </>
      )}

      {tab === 'daily' && (
        <>
          <div>
            <label className="label">Produit</label>
            <select className="input" value={selectedBottle?.id ?? ''} onChange={e => setBottleId(e.target.value)}>
              {bottles.slice().sort((a, b) => a.name.localeCompare(b.name)).map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {!selectedBottle ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucun produit</p>
          ) : (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between p-4 pb-2">
                <div>
                  <p className="font-bold text-gray-900">{selectedBottle.name}</p>
                  <p className="text-xs text-gray-400">Stock actuel : {selectedBottle.quantity} · {Math.min(period, 31)} derniers jours</p>
                </div>
                <Link to={`/inventory/edit/${selectedBottle.id}`} className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1.5 rounded-lg">
                  <Pencil size={12} /> Comptage
                </Link>
              </div>
              <div className="overflow-x-auto" data-no-swipe>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left font-semibold px-4 py-2">Jour</th>
                      <th className="text-right font-semibold px-1.5 py-2">Début</th>
                      <th className="text-right font-semibold px-1.5 py-2">Ventes</th>
                      <th className="text-right font-semibold px-1.5 py-2">Entrées</th>
                      <th className="text-right font-semibold px-1.5 py-2">Écart</th>
                      <th className="text-right font-semibold px-4 py-2">Fin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.slice().reverse().map(r => {
                      const quiet = r.sold === 0 && r.received === 0 && r.added === 0 && r.removed === 0
                      return (
                        <tr key={r.day} className={`border-b border-gray-50 ${r.removed > 0 ? 'bg-danger-light/60' : ''} ${quiet ? 'text-gray-300' : 'text-gray-700'}`}>
                          <td className="px-4 py-1.5 whitespace-nowrap">{formatDay(r.day)}</td>
                          <td className="text-right px-1.5">{r.opening}</td>
                          <td className="text-right px-1.5">{r.sold ? `−${r.sold}` : '·'}</td>
                          <td className="text-right px-1.5 text-success">{r.received + r.added ? `+${round2(r.received + r.added)}` : '·'}</td>
                          <td className={`text-right px-1.5 ${r.removed ? 'text-danger font-bold' : ''}`}>{r.removed ? `−${r.removed}` : '·'}</td>
                          <td className="text-right px-4 font-semibold">{r.closing}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
