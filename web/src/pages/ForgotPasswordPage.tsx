import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { resetPassword } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try { await resetPassword(email.trim().toLowerCase()); setSent(true) }
    catch { setError('Aucun compte associé à cet email.') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link to="/login" className="flex items-center gap-2 text-primary font-medium mb-6">
          <ArrowLeft size={18} /> Retour
        </Link>
        <div className="card p-6">
          {sent ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-success mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Email envoyé !</h2>
              <p className="text-gray-500 text-sm">Vérifiez votre boîte mail et suivez le lien.</p>
              <Link to="/login" className="btn-primary mt-6 block text-center">Retour à la connexion</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Mot de passe oublié</h2>
              <p className="text-gray-500 text-sm">Entrez votre email pour recevoir un lien de réinitialisation.</p>
              {error && <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>}
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" required autoCapitalize="none" />
              </div>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Envoyer le lien'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
