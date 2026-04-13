import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wine, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const [restaurantName, setRestaurantName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }
    if (password.length < 6) { setError('Mot de passe trop court (min. 6 caractères).'); return }
    setLoading(true)
    try {
      await signUp(email.trim().toLowerCase(), password, restaurantName.trim())
      navigate('/')
    } catch (err: any) {
      setError(err.code === 'auth/email-already-in-use' ? 'Email déjà utilisé.' : 'Erreur lors de la création du compte.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link to="/login" className="flex items-center gap-2 text-primary font-medium mb-6">
          <ArrowLeft size={18} /> Retour
        </Link>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-3">
            <Wine size={28} className="text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Créer un compte</h1>
          <p className="text-gray-500 text-sm mt-1">1 compte par établissement · 20€/mois</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>}

          <div>
            <label className="label">Nom de l'établissement</label>
            <input className="input" value={restaurantName} onChange={e => setRestaurantName(e.target.value)} placeholder="Le Bar du Coin" required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@votreBar.com" required autoCapitalize="none" />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 caractères" required />
          </div>
          <div>
            <label className="label">Confirmer</label>
            <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" required />
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Créer mon compte'}
          </button>
        </form>
      </div>
    </div>
  )
}
