import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wine, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email.trim().toLowerCase(), password)
      navigate('/')
    } catch {
      setError('Email ou mot de passe incorrect.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
            <Wine size={32} className="text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-primary">Spirit Stock</h1>
          <p className="text-gray-500 mt-1 text-sm">Gestion de stock professionnelle</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          {error && <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>}

          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre@email.com" required autoCapitalize="none" />
          </div>

          <div>
            <label className="label">Mot de passe</label>
            <div className="relative">
              <input className="input pr-12" type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
              <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <Link to="/forgot-password" className="text-xs text-primary font-medium mt-1.5 block text-right">Mot de passe oublié ?</Link>
          </div>

          <button type="submit" disabled={loading} className="btn-primary mt-2">
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Se connecter'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Pas de compte ?{' '}
            <Link to="/register" className="text-primary font-semibold">Créer un compte</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
