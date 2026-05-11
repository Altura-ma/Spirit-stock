import { useState, useEffect } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import { useAuth } from '../context/AuthContext'
import { LogOut, Save } from 'lucide-react'

export default function SupplierProfilePage() {
  const { user, signOut } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user?.supplierId) return
    getDoc(doc(db, 'suppliers', user.supplierId)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setName(d.name ?? '')
        setPhone(d.phone ?? '')
        setEmail(d.email ?? '')
      }
      setLoading(false)
    })
  }, [user?.supplierId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.supplierId) return
    setSaving(true)
    setSuccess(false)
    await updateDoc(doc(db, 'suppliers', user.supplierId), {
      name: name.trim(), phone: phone.trim().replace(/\s/g, ''), email: email.trim(),
    })
    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Mon profil</h1>
        <button onClick={signOut} className="flex items-center gap-1.5 text-sm text-gray-400 font-medium">
          <LogOut size={16} /> Déconnexion
        </button>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
          {name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-gray-900">{name}</p>
          <p className="text-xs text-primary font-semibold">Fournisseur référencé</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="card p-5 space-y-4">
        {success && <div className="bg-success-light text-success text-sm p-3 rounded-xl text-center font-medium">Profil mis à jour ✓</div>}

        <div>
          <label className="label">Nom de l'entreprise</label>
          <input className="input" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="label">Téléphone</label>
          <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoCapitalize="none" />
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving
            ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : <><Save size={16} /> Enregistrer</>}
        </button>
      </form>
    </div>
  )
}
