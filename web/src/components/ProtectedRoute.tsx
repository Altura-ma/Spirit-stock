import { Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AppLoadingSkeleton from './AppLoadingSkeleton'

function hasAccess(status?: string) {
  return status === 'trialing' || status === 'active'
}

function BillingRequired() {
  const { user, startCheckout, signOut } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async () => {
    setError('')
    setLoading(true)
    try {
      await startCheckout()
    } catch {
      setError('Redirection paiement impossible. Réessayez dans quelques secondes.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="card p-6 max-w-sm w-full text-center space-y-4">
        <img src="/logo-spirit-stock.png" alt="Spirit Stock" className="w-20 h-20 object-contain mx-auto" />
        <div>
          <h1 className="text-2xl font-bold text-primary">Activez votre essai</h1>
          <p className="text-gray-500 text-sm mt-2">
            14 jours gratuits, puis 20€/mois. Carte bancaire requise. Débit réel seulement après fin d’essai.
          </p>
        </div>
        {user?.subscriptionStatus && user.subscriptionStatus !== 'pending_checkout' && (
          <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">
            Abonnement {user.subscriptionStatus}. Mettez votre paiement à jour pour accéder à Spirit Stock.
          </div>
        )}
        {error && <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>}
        <button onClick={handleCheckout} disabled={loading} className="btn-primary">
          {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Commencer l’essai gratuit'}
        </button>
        <button onClick={signOut} className="text-sm text-gray-400 font-medium">Se déconnecter</button>
      </div>
    </div>
  )
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <AppLoadingSkeleton />
  if (!user) return <Navigate to="/login" replace />
  if (user.role === 'supplier') return <Navigate to="/supplier" replace />
  if (!hasAccess(user.subscriptionStatus)) return <BillingRequired />
  return <>{children}</>
}

export function ProtectedSupplierRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <AppLoadingSkeleton />
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'supplier') return <Navigate to="/" replace />
  return <>{children}</>
}
