import { useState } from 'react'
import { Phone, Pencil, Trash2, Plus, X } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { Supplier } from '../types'

function SupplierModal({ supplier, onClose, onSave }: { supplier: Supplier | null; onClose: () => void; onSave: (n: string, p: string) => Promise<void> }) {
  const [name, setName] = useState(supplier?.name ?? '')
  const [phone, setPhone] = useState(supplier?.phone ?? '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onSave(name.trim(), phone.trim().replace(/\s/g, ''))
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="card p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900">{supplier ? 'Modifier' : 'Nouveau fournisseur'}</h3>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Nom *</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nom du fournisseur" required /></div>
          <div><label className="label">Téléphone</label><input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0612345678" /></div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SuppliersPage() {
  const { suppliers, bottles, addSupplier, updateSupplier, deleteSupplier } = useStock()
  const [modal, setModal] = useState<{ open: boolean; supplier: Supplier | null }>({ open: false, supplier: null })

  const handleSave = async (name: string, phone: string) => {
    if (modal.supplier) await updateSupplier(modal.supplier.id, { name, phone })
    else await addSupplier({ name, phone })
  }

  const handleDelete = (s: Supplier) => {
    if (window.confirm(`Supprimer "${s.name}" ?`)) deleteSupplier(s.id)
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Fournisseurs</h1>
        <button onClick={() => setModal({ open: true, supplier: null })} className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
          <Plus size={22} />
        </button>
      </div>

      <div className="space-y-2">
        {suppliers.map(s => (
          <div key={s.id} className="card p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
              {s.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 truncate">{s.name}</p>
              <p className="text-sm text-gray-400">{s.phone || 'Aucun numéro'}</p>
              <p className="text-xs text-primary mt-0.5">{bottles.filter(b => b.supplierId === s.id).length} produit(s)</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {s.phone && (
                <a href={`tel:${s.phone}`} className="w-9 h-9 bg-success rounded-full flex items-center justify-center text-white">
                  <Phone size={16} />
                </a>
              )}
              <button onClick={() => setModal({ open: true, supplier: s })} className="p-2 text-primary"><Pencil size={16} /></button>
              <button onClick={() => handleDelete(s)} className="p-2 text-danger"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
        {suppliers.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Aucun fournisseur</p>
            <p className="text-xs mt-1">Louis Mathieu est ajouté automatiquement à l'inscription</p>
          </div>
        )}
      </div>

      {modal.open && <SupplierModal supplier={modal.supplier} onClose={() => setModal({ open: false, supplier: null })} onSave={handleSave} />}
    </div>
  )
}
