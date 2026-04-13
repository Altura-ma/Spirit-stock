import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { CATEGORIES, BottleCategory } from '../types'

export default function AddBottlePage() {
  const { addBottle, suppliers } = useStock()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', category: 'whisky' as BottleCategory, quantity: '', minThreshold: '', price: '', supplierId: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!form.supplierId && suppliers.length > 0) setForm(f => ({ ...f, supplierId: suppliers[0].id }))
  }, [suppliers])

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const qty = parseInt(form.quantity)
    const min = parseInt(form.minThreshold)
    const price = parseFloat(form.price.replace(',', '.'))
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return }
    if (isNaN(qty) || qty < 0 || isNaN(min) || min < 0 || isNaN(price) || price < 0) { setError('Vérifiez les valeurs numériques.'); return }
    setLoading(true)
    try {
      await addBottle({ name: form.name.trim(), category: form.category, quantity: qty, minThreshold: min, price, supplierId: form.supplierId })
      navigate('/inventory')
    } catch { setError('Erreur lors de l\'ajout.') }
    finally { setLoading(false) }
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 pt-2 mb-6">
        <button onClick={() => navigate(-1)} className="text-primary"><ArrowLeft size={22} /></button>
        <h1 className="text-xl font-bold text-gray-900">Nouveau produit</h1>
      </div>

      <form onSubmit={handleSubmit} className="card p-5 space-y-4">
        {error && <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>}

        <div><label className="label">Nom *</label><input className="input" value={form.name} onChange={set('name')} placeholder="ex: Johnnie Walker Black" required /></div>
        <div>
          <label className="label">Catégorie *</label>
          <select className="input" value={form.category} onChange={set('category')}>
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Quantité *</label><input className="input" type="number" min="0" value={form.quantity} onChange={set('quantity')} placeholder="0" required /></div>
          <div><label className="label">Seuil minimum *</label><input className="input" type="number" min="0" value={form.minThreshold} onChange={set('minThreshold')} placeholder="0" required /></div>
        </div>
        <div><label className="label">Prix unitaire (€) *</label><input className="input" type="text" inputMode="decimal" value={form.price} onChange={set('price')} placeholder="0.00" required /></div>
        {suppliers.length > 0 && (
          <div>
            <label className="label">Fournisseur</label>
            <select className="input" value={form.supplierId} onChange={set('supplierId')}>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}
        <button type="submit" disabled={loading} className="btn-primary mt-2">
          {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Enregistrer'}
        </button>
      </form>
    </div>
  )
}
