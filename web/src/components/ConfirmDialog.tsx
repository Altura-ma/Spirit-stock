import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

type ConfirmTone = 'danger' | 'success' | 'warning' | 'primary'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel?: string
  tone?: ConfirmTone
  loading?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

const toneStyles: Record<ConfirmTone, { icon: string; button: string; Icon: typeof AlertTriangle }> = {
  danger: { icon: 'bg-danger-light text-danger', button: 'bg-danger text-white', Icon: AlertTriangle },
  success: { icon: 'bg-success-light text-success', button: 'bg-success text-white', Icon: CheckCircle2 },
  warning: { icon: 'bg-warning-light text-warning', button: 'bg-warning text-white', Icon: AlertTriangle },
  primary: { icon: 'bg-primary/10 text-primary', button: 'bg-primary text-white', Icon: CheckCircle2 },
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Annuler',
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  const styles = toneStyles[tone]
  const Icon = styles.Icon

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-white/70 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${styles.icon}`}>
              <Icon size={24} strokeWidth={2.4} />
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h3 className="text-lg font-bold text-gray-900 leading-tight">{title}</h3>
              <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="h-12 rounded-2xl bg-white border border-gray-200 text-gray-600 font-bold disabled:opacity-60 active:scale-[0.98] transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`h-12 rounded-2xl font-bold flex items-center justify-center disabled:opacity-60 active:scale-[0.98] transition ${styles.button}`}
          >
            {loading ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
