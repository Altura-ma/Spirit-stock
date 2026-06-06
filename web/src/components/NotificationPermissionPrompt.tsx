import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'

const DISMISSED_KEY = 'spirit-stock-notifications-dismissed'

export default function NotificationPermissionPrompt() {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!('Notification' in window)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission)
    setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true')
  }, [])

  const askPermission = async () => {
    if (!('Notification' in window)) return

    const result = await Notification.requestPermission()
    setPermission(result)

    if (result === 'granted') {
      localStorage.setItem(DISMISSED_KEY, 'true')
      setDismissed(true)

      try {
        new Notification('Notifications activées', {
          body: 'Spirit Stock pourra vous prévenir pour les commandes et alertes importantes.',
          icon: '/android-chrome-192x192.png',
        })
      } catch {
        // Some browsers block immediate local notifications despite permission.
      }
    }
  }

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true')
    setDismissed(true)
  }

  if (permission !== 'default' || dismissed) return null

  return (
    <div className="fixed left-4 right-4 bottom-24 z-[60] max-w-lg mx-auto rounded-2xl border border-primary/15 bg-white shadow-xl p-4">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fermer la demande de notifications"
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
      >
        <X size={18} />
      </button>

      <div className="flex gap-3 pr-6">
        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Bell size={22} />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-primary">Activer les notifications</p>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">
            Recevez les alertes utiles pour vos commandes, ruptures et mouvements importants.
          </p>
          <div className="flex gap-2 mt-3">
            <button type="button" onClick={askPermission} className="btn-primary !py-2 !text-sm">
              Activer
            </button>
            <button type="button" onClick={dismiss} className="px-4 py-2 text-sm font-semibold text-gray-500">
              Plus tard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
