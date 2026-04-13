import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { CATEGORIES, BottleCategory } from '../types'

export default function EditBottlePage() {
  const { id } = useParams<{ id: string }>()
  const { bottles, suppliers, updateBottle } = useStock()
  const navigate = useNavigate()
  const bottle = bottles.find(b => b.id === id)
  const [form, setForm] = useState({ name: '', category: 'whisky' as BottleCategory, quantity: '', minThreshold: '', price: '', supplierId: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (bottle) setForm({ name: bottle.name, category: bottle.category, quantity: String(bottle.quantity), minThreshold: String(bottle.minThreshold), price: String(bottle.price), supplierId: bottle.supplierId })
  }, [bottle])

  if (!bottle) return <div className="p-4 text-center text-gray-500 mt-20">Produit introuvable</div>

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const qty = parseInt(form.quantity)
    const min = parseInt(form.minThreshold)
    const price = parseFloat(form.price.replace(',', '.'))
    if (!form.name.trim() || isNaN(qty) || isNaN(min) || isNaN(price)) { setError('Vérifiez tous les champs.'); return }
    setLoading(true)
    try {
      await updateBottle(id!, { name: form.name.trim(), category: form.category, quantity: qty, minThreshold: min, price, supplierId: form.supplierId })
      navigate('/inventory')
    } catch { setError('Erreur lors de la mise à jour.') }
    finally { setLoading(false) }
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-2 mb-6">
        <button onClick={() => navigate(-1)} className="text-primary"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-bold text-gray-900">Modifier le produit</h1>
      </div>
      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        {error && <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>}
        <div><label className="label">Nom</label><input className="input" value={form.name} onChange={set('name')} required /></div>
        <div>
          <label className="label">Catégorie</label>
          <select className="input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Quantité</label><input className="input" type="number" min="0" value={form.quantity} onChange={set('quantity')} /></div>
          <div><label className="label">Seuil minimum</label><input className="input" type="number" min="0" value={form.minThreshold} onChange={set('minThreshold')} /></div>
        </div>
        <div><label className="label">Prix unitaire (€)</label><input className="input" type="text" inputMode="decimal" value={form.price} onChange={set('price')} /></div>
        {suppliers.length > 0 && (
          <div>
            <label className="label">Fournisseur</label>
            <select className="input" value={form.supplierId} onChange={set('supplierId')}>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
