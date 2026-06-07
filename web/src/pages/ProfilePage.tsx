import { useState } from 'react'
import { ArrowLeft, CreditCard, Lock, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { auth } from '../config/firebase'
import { useAuth } from '../context/AuthContext'
import { useStock } from '../context/StockContext'
import ConfirmDialog from '../components/ConfirmDialog'

export default function ProfilePage() {
  const { user, signOut, openBillingPortal } = useAuth()
  const { bottles, getTotalValue } = useStock()
  const [showPwd, setShowPwd] = useState(false)
  const [billingLoading, setBillingLoading] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleBillingPortal = async () => {
    setBillingLoading(true)
    try { await openBillingPortal() }
    catch { setMsg({ type: 'err', text: 'Portail de paiement indisponible.' }); setBillingLoading(false) }
  }

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (next !== confirmPwd) { setMsg({ type: 'err', text: 'Les mots de passe ne correspondent pas.' }); return }
    const strongPassword = /^(?=.*[0-9]).{8,}$/
    if (!strongPassword.test(next)) { setMsg({ type: 'err', text: 'Mot de passe : 8 caractères minimum dont 1 chiffre.' }); return }
    setLoading(true)
    try {
      const cu = auth.currentUser
      if (!cu || !cu.email) { setMsg({ type: 'err', text: 'Session expirée.' }); return }
      await reauthenticateWithCredential(cu, EmailAuthProvider.credential(cu.email, current))
      await updatePassword(cu, next)
      setMsg({ type: 'ok', text: 'Mot de passe modifié.' })
      setCurrent(''); setNext(''); setConfirmPwd(''); setShowPwd(false)
    } catch (err: any) {
      setMsg({ type: 'err', text: err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential' ? 'Mot de passe actuel incorrect.' : 'Erreur lors du changement.' })
    } finally { setLoading(false) }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3 pt-2">
        <Link to="/" className="text-primary"><ArrowLeft size={22} /></Link>
        <h1 className="text-xl font-bold text-gray-900">Mon compte</h1>
      </div>

      {/* Identity */}
      <div className="card p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
          {user?.restaurantName?.charAt(0).toUpperCase()}
        </div>
        <p className="font-bold text-xl text-gray-900">{user?.restaurantName}</p>
        <p className="text-gray-400 text-sm mt-1">{user?.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{bottles.length}</p>
          <p className="text-xs text-gray-500">Produits</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{getTotalValue().toFixed(0)} €</p>
          <p className="text-xs text-gray-500">Valeur stock</p>
        </div>
      </div>

      {/* Billing */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <CreditCard size={18} className="text-primary" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">Abonnement</p>
            <p className="text-xs text-gray-400">{user?.subscriptionStatus === 'trialing' ? 'Essai gratuit actif' : user?.subscriptionStatus === 'active' ? 'Actif' : user?.subscriptionStatus ?? 'En attente'}</p>
          </div>
        </div>
        <button onClick={handleBillingPortal} disabled={billingLoading} className="btn-secondary w-full">
          {billingLoading ? 'Ouverture…' : 'Gérer paiement et abonnement'}
        </button>
      </div>

      {/* Change password */}
      <div className="card overflow-hidden">
        <button onClick={() => setShowPwd(v => !v)} className="w-full flex items-center gap-3 p-4">
          <Lock size={18} className="text-primary" />
          <span className="flex-1 text-left font-medium text-gray-900">Changer le mot de passe</span>
          <span className="text-gray-400 text-sm">{showPwd ? '▲' : '▼'}</span>
        </button>
        {showPwd && (
          <form onSubmit={handleChangePwd} className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-4">
            {msg && <div className={`text-sm p-3 rounded-xl ${msg.type === 'ok' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`}>{msg.text}</div>}
            <div><label className="label">Mot de passe actuel</label><input className="input" type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="••••••••" required /></div>
            <div><label className="label">Nouveau mot de passe</label><input className="input" type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="8 caractères minimum dont 1 chiffre" required /></div>
            <div><label className="label">Confirmer</label><input className="input" type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} placeholder="••••••••" required /></div>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Enregistrer'}
            </button>
          </form>
        )}
      </div>

      {/* Sign out */}
      <div className="card">
        <button onClick={() => setConfirmSignOut(true)} className="w-full flex items-center gap-3 p-4 text-danger">
          <LogOut size={18} />
          <span className="font-medium">Se déconnecter</span>
        </button>
      </div>

      <p className="text-center text-xs text-gray-400">Spirit Stock v1.0.0</p>

      <ConfirmDialog
        open={confirmSignOut}
        title="Se déconnecter ?"
        message="Tu devras te reconnecter pour accéder à ton espace Spirit Stock."
        confirmLabel="Se déconnecter"
        tone="danger"
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={signOut}
      />
    </div>
  )
}
