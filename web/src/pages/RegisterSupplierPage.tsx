import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Truck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function RegisterSupplierPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signUpSupplier } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    const strongPassword = /^(?=.*[0-9]).{8,}$/
    if (!strongPassword.test(password)) { setError('Mot de passe : 8 caractères minimum dont 1 chiffre.'); return }
    setLoading(true)
    try {
      await signUpSupplier(email.trim().toLowerCase(), password, name.trim(), phone.trim().replace(/\s/g, ''))
      navigate('/supplier')
    } catch (err: any) {
      setError(err.code === 'auth/email-already-in-use' ? 'Cet email est déjà utilisé.' : 'Erreur lors de la création du compte.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col p-6">
      <Link to="/login" className="flex items-center gap-1.5 text-primary font-medium mb-8 self-start">
        <ArrowLeft size={18} /> Retour
      </Link>

      <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-md">
            <Truck size={28} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Espace fournisseur</h1>
          <p className="text-gray-400 text-sm mt-1">Référencement · 70€ HT/mois</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-danger-light text-danger text-sm p-3 rounded-xl text-center font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="label">Nom de l'entreprise *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Maison Dupont" required />
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0612345678" />
          </div>
          <div>
            <label className="label">Email professionnel *</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@votreboite.com" required autoCapitalize="none" />
          </div>
          <div>
            <label className="label">Mot de passe *</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8 caractères minimum dont 1 chiffre" required />
          </div>
          <div>
            <label className="label">Confirmer le mot de passe *</label>
            <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required />
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Créer mon compte fournisseur'}
          </button>

          <p className="text-center text-sm text-gray-400 pt-2">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary font-semibold">Se connecter</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
