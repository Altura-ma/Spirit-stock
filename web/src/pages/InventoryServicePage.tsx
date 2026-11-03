import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck, Clock, CheckCircle2, ShieldCheck, FileSpreadsheet } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useStock } from '../context/StockContext'
import { INVENTORY_SERVICE, ServiceRequest } from '../types'
import { dayKey } from '../lib/analytics'

const SLOTS: { value: ServiceRequest['slot']; label: string }[] = [
  { value: 'morning', label: 'Matin' },
  { value: 'afternoon', label: 'Après-midi' },
  { value: 'evening', label: 'Soir' },
]

export default function InventoryServicePage() {
  const { user } = useAuth()
  const { bottles, requestInventoryService } = useStock()
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 2)
  const [form, setForm] = useState({ address: '', phone: '', preferredDate: dayKey(tomorrow), slot: 'morning' as ServiceRequest['slot'], notes: '' })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.address.trim() || !form.phone.trim()) { setError('Adresse et téléphone requis.'); return }
    setLoading(true)
    try {
      await requestInventoryService({
        email: user?.email ?? '',
        phone: form.phone.trim(),
        address: form.address.trim(),
        preferredDate: form.preferredDate,
        slot: form.slot,
        notes: form.notes.trim() || undefined,
        price: INVENTORY_SERVICE.priceHT,
      })
      setDone(true)
    } catch (err) {
      console.error(err)
      setError("La demande n'a pas pu être envoyée. Réessayez.")
    } finally { setLoading(false) }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 pt-2">
        <Link to="/more" className="text-primary"><ArrowLeft size={22} /></Link>
        <h1 className="text-xl font-bold text-gray-900">Inventaire physique</h1>
      </div>

      <div className="card p-5 bg-primary text-white">
        <ClipboardCheck size={28} className="text-accent mb-2" />
        <p className="font-bold text-lg leading-tight">Notre équipe compte votre stock sur place</p>
        <p className="text-3xl font-bold mt-3">{INVENTORY_SERVICE.priceHT} € <span className="text-sm font-medium text-white/70">HT · prix fixe</span></p>
        <p className="text-sm text-white/80 mt-1">Jusqu'à {INVENTORY_SERVICE.maxHours} h de comptage, sans surprise.</p>
      </div>

      <div className="card p-4 space-y-3">
        {[
          { Icon: Clock, text: `Intervention de ${INVENTORY_SERVICE.maxHours} h maximum, au créneau de votre choix` },
          { Icon: FileSpreadsheet, text: `Comptage bouteille par bouteille, saisi directement dans Spirit Stock (${bottles.length} produits actuellement)` },
          { Icon: ShieldCheck, text: 'Écarts de stock mis en évidence : pertes, casse, vols possibles' },
        ].map(({ Icon, text }) => (
          <div key={text} className="flex gap-3 items-start">
            <Icon size={18} className="text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700">{text}</p>
          </div>
        ))}
      </div>

      {done ? (
        <div className="card p-6 text-center bg-success-light">
          <CheckCircle2 size={36} className="text-success mx-auto mb-2" />
          <p className="font-bold text-success">Demande envoyée</p>
          <p className="text-sm text-success mt-1">Nous vous recontactons au {form.phone} pour confirmer le créneau.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="card p-4 space-y-3">
          <p className="font-bold text-gray-900">Réserver</p>
          {error && <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>}
          <div><label className="label">Adresse de l'établissement *</label><input className="input" value={form.address} onChange={set('address')} placeholder="12 rue de la Paix, 75002 Paris" required /></div>
          <div><label className="label">Téléphone *</label><input className="input" type="tel" value={form.phone} onChange={set('phone')} placeholder="0612345678" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date souhaitée</label><input className="input" type="date" min={dayKey(new Date())} value={form.preferredDate} onChange={set('preferredDate')} required /></div>
            <div><label className="label">Créneau</label>
              <select className="input" value={form.slot} onChange={set('slot')}>
                {SLOTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Précisions</label><textarea className="input min-h-[80px]" value={form.notes} onChange={set('notes')} placeholder="Réserve au sous-sol, accès par la cour…" /></div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : `Demander un inventaire · ${INVENTORY_SERVICE.priceHT} € HT`}
          </button>
          <p className="text-[11px] text-gray-400 text-center">Aucun paiement maintenant : le créneau est confirmé par téléphone.</p>
        </form>
      )}
    </div>
  )
}
