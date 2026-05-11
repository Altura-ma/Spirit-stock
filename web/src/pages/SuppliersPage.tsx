import { useState } from 'react'
import { Phone, Pencil, Trash2, Plus, X, Mail, BadgeCheck } from 'lucide-react'
import { useStock } from '../context/StockContext'
import { Supplier } from '../types'

function SupplierModal({ supplier, onClose, onSave }: { supplier: Supplier | null; onClose: () => void; onSave: (n: string, p: string, e: string) => Promise<void> }) {
  const [name, setName] = useState(supplier?.name ?? '')
  const [phone, setPhone] = useState(supplier?.phone ?? '')
  const [email, setEmail] = useState(supplier?.email ?? '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    await onSave(name.trim(), phone.trim().replace(/\s/g, ''), email.trim())
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="card p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg text-gray-900">{supplier ? 'Modifier' : 'Nouveau fournisseur'}</h3>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="label">Nom *</label><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Nom du fournisseur" required /></div>
          <div><label className="label">Téléphone</label><input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0612345678" /></div>
          <div><label className="label">Email</label><input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="fournisseur@exemple.com" /></div>
          <p className="text-xs text-gray-400 -mt-2">L'email est utilisé pour envoyer les commandes automatiquement.</p>
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

function SupplierCard({ s, bottleCount, onEdit, onDelete }: { s: Supplier; bottleCount: number; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className={`card p-4 flex items-center gap-3 ${s.isGlobal ? 'border border-primary/20' : ''}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${s.isGlobal ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
        {s.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="font-bold text-gray-900 truncate">{s.name}</p>
          {s.isGlobal && (
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full flex-shrink-0">
              <BadgeCheck size={10} /> Référencé
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 truncate">{s.phone || 'Aucun numéro'}</p>
        {s.email ? (
          <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5"><Mail size={10} />{s.email}</p>
        ) : (
          <p className="text-xs text-warning flex items-center gap-1 mt-0.5"><Mail size={10} />Aucun email</p>
        )}
        <p className="text-xs text-primary mt-0.5">{bottleCount} produit(s) lié(s)</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {s.phone && (
          <a href={`tel:${s.phone}`} className="w-9 h-9 bg-success rounded-full flex items-center justify-center text-white">
            <Phone size={16} />
          </a>
        )}
        {!s.isGlobal && (
          <>
            <button onClick={onEdit} className="p-2 text-primary"><Pencil size={16} /></button>
            <button onClick={onDelete} className="p-2 text-danger"><Trash2 size={16} /></button>
          </>
        )}
      </div>
    </div>
  )
}

export default function SuppliersPage() {
  const { suppliers, bottles, addSupplier, updateSupplier, deleteSupplier } = useStock()
  const [modal, setModal] = useState<{ open: boolean; supplier: Supplier | null }>({ open: false, supplier: null })

  const globalSuppliers = suppliers.filter(s => s.isGlobal)
  const mySuppliers = suppliers.filter(s => !s.isGlobal)

  const handleSave = async (name: string, phone: string, email: string) => {
    if (modal.supplier) await updateSupplier(modal.supplier.id, { name, phone, email })
    else await addSupplier({ name, phone, email })
  }

  const handleDelete = (s: Supplier) => {
    if (window.confirm(`Supprimer "${s.name}" ?`)) deleteSupplier(s.id)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Fournisseurs</h1>
        <button onClick={() => setModal({ open: true, supplier: null })} className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
          <Plus size={22} />
        </button>
      </div>

      {/* Platform suppliers */}
      {globalSuppliers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1">
            <BadgeCheck size={12} /> Fournisseurs référencés
          </p>
          {globalSuppliers.map(s => (
            <SupplierCard key={s.id} s={s} bottleCount={bottles.filter(b => b.supplierId === s.id).length} onEdit={() => setModal({ open: true, supplier: s })} onDelete={() => handleDelete(s)} />
          ))}
        </div>
      )}

      {/* My suppliers */}
      <div className="space-y-2">
        {mySuppliers.length > 0 && (
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Mes fournisseurs</p>
        )}
        {mySuppliers.map(s => (
          <SupplierCard key={s.id} s={s} bottleCount={bottles.filter(b => b.supplierId === s.id).length} onEdit={() => setModal({ open: true, supplier: s })} onDelete={() => handleDelete(s)} />
        ))}
        {mySuppliers.length === 0 && globalSuppliers.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <p className="font-medium">Aucun fournisseur</p>
            <p className="text-xs mt-1">Ajoutez vos propres fournisseurs avec le bouton +</p>
          </div>
        )}
        {mySuppliers.length === 0 && globalSuppliers.length > 0 && (
          <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-sm">Aucun fournisseur privé</p>
            <p className="text-xs mt-1">Ajoutez vos propres fournisseurs avec le +</p>
          </div>
        )}
      </div>

      {modal.open && <SupplierModal supplier={modal.supplier} onClose={() => setModal({ open: false, supplier: null })} onSave={handleSave} />}
    </div>
  )
}
