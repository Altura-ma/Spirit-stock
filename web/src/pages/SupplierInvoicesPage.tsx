import { useMemo, useState } from 'react'
import { addDoc, collection, deleteDoc, deleteField, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { FileText, Plus, X, Trash2, Printer, ExternalLink, Pencil, Upload, ClipboardList } from 'lucide-react'
import { db } from '../config/firebase'
import { useAuth } from '../context/AuthContext'
import { useSupplierInvoices, useSupplierOrders, useSupplierProfile } from '../hooks/useSupplierData'
import { Invoice, InvoiceKind, InvoiceLine, InvoiceStatus, Order, invoiceTotals } from '../types'
import { INVOICE_STATUS_LABELS, printInvoice } from '../lib/invoice'
import { dayKey, euro } from '../lib/analytics'
import ConfirmDialog from '../components/ConfirmDialog'
import AppLoadingSkeleton from '../components/AppLoadingSkeleton'

type Draft = Omit<Invoice, 'id' | 'createdAt' | 'supplierId' | 'supplierName' | 'totalHT' | 'totalTTC'> & { id?: string }

const STATUS_STYLE: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-500',
  issued: 'bg-warning-light text-warning',
  paid: 'bg-success-light text-success',
}

function nextNumber(invoices: Invoice[]) {
  const year = new Date().getFullYear()
  const prefix = `F-${year}-`
  const max = invoices
    .filter(i => i.kind === 'internal' && i.number.startsWith(prefix))
    .reduce((m, i) => Math.max(m, parseInt(i.number.slice(prefix.length)) || 0), 0)
  return `${prefix}${String(max + 1).padStart(3, '0')}`
}

function emptyDraft(kind: InvoiceKind, number: string): Draft {
  const due = new Date(); due.setDate(due.getDate() + 30)
  return {
    kind, number, clientName: '', issueDate: dayKey(new Date()), dueDate: dayKey(due),
    lines: [{ label: '', quantity: 1, unitPrice: 0 }], vatRate: 20, status: kind === 'external' ? 'issued' : 'draft',
  }
}

function draftFromOrder(o: Order, number: string): Draft {
  const d = emptyDraft('internal', number)
  return {
    ...d,
    clientName: o.restaurantName || 'Établissement',
    restaurantId: o.restaurantId,
    orderId: o.id,
    lines: o.items.map(i => ({ label: i.bottleName, quantity: i.quantity, unitPrice: i.unitPrice ?? 0 })),
    notes: `Commande du ${o.createdAt.toLocaleDateString('fr-FR')}`,
  }
}

function InvoiceEditor({ draft, clients, onClose, onSave }: {
  draft: Draft
  clients: { id: string; name: string }[]
  onClose: () => void
  onSave: (d: Draft) => Promise<void>
}) {
  const [d, setD] = useState<Draft>(draft)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const totals = invoiceTotals(d.lines, d.vatRate)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(x => ({ ...x, [k]: v }))
  const setLine = (i: number, patch: Partial<InvoiceLine>) => setD(x => ({ ...x, lines: x.lines.map((l, j) => j === i ? { ...l, ...patch } : l) }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const lines = d.lines.filter(l => l.label.trim() && l.quantity > 0)
    if (!d.number.trim() || !d.clientName.trim()) { setError('Numéro et client requis.'); return }
    if (lines.length === 0) { setError('Ajoutez au moins une ligne.'); return }
    if (d.externalUrl && !/^https?:\/\//i.test(d.externalUrl.trim())) { setError('Le lien doit commencer par https://'); return }
    setSaving(true)
    try { await onSave({ ...d, lines, number: d.number.trim(), clientName: d.clientName.trim(), externalUrl: d.externalUrl?.trim() || undefined }) }
    catch (err) { console.error(err); setError("Enregistrement impossible."); setSaving(false) }
  }

  return (
    <div data-modal-open className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
      <form onSubmit={submit} className="bg-white w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-gray-900">
            {d.id ? 'Modifier la facture' : d.kind === 'external' ? 'Facture externe' : 'Nouvelle facture'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        {d.kind === 'external' && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3">
            Enregistrez ici une facture émise ou reçue hors de Spirit Stock (logiciel comptable, papier…) pour tout retrouver au même endroit.
          </p>
        )}
        {error && <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>}

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Numéro *</label><input className="input" value={d.number} onChange={e => set('number', e.target.value)} required /></div>
          <div><label className="label">Statut</label>
            <select className="input" value={d.status} onChange={e => set('status', e.target.value as InvoiceStatus)}>
              {(Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]).map(s => <option key={s} value={s}>{INVOICE_STATUS_LABELS[s]}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Client *</label>
          <input className="input" list="invoice-clients" value={d.clientName}
            onChange={e => {
              const name = e.target.value
              const match = clients.find(c => c.name === name)
              setD(x => ({ ...x, clientName: name, restaurantId: match?.id ?? (x.orderId ? x.restaurantId : undefined) }))
            }}
            placeholder="Nom de l'établissement" required />
          <datalist id="invoice-clients">{clients.map(c => <option key={c.id} value={c.name} />)}</datalist>
          {d.restaurantId && <p className="text-[11px] text-success mt-1">Client Spirit Stock : la facture émise sera visible dans son espace.</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Date</label><input className="input" type="date" value={d.issueDate} onChange={e => set('issueDate', e.target.value)} required /></div>
          <div><label className="label">Échéance</label><input className="input" type="date" value={d.dueDate ?? ''} onChange={e => set('dueDate', e.target.value || undefined)} /></div>
        </div>

        <div>
          <label className="label">Lignes</label>
          <div className="space-y-2">
            {d.lines.map((l, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-2 space-y-2">
                <div className="flex gap-2">
                  <input className="input py-2 flex-1" value={l.label} onChange={e => setLine(i, { label: e.target.value })} placeholder="Désignation" />
                  <button type="button" onClick={() => setD(x => ({ ...x, lines: x.lines.filter((_, j) => j !== i) }))} className="text-gray-400 px-1" aria-label="Supprimer la ligne"><Trash2 size={16} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <input className="input py-2" type="number" min="0" step="1" value={l.quantity} onChange={e => setLine(i, { quantity: Number(e.target.value) || 0 })} aria-label="Quantité" />
                  <input className="input py-2" type="number" min="0" step="0.01" value={l.unitPrice} onChange={e => setLine(i, { unitPrice: Number(e.target.value) || 0 })} aria-label="Prix unitaire HT" />
                  <p className="text-sm font-semibold text-right text-gray-700">{euro(l.quantity * l.unitPrice, 2)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-400 mt-1 px-1"><span>Qté · PU HT</span><span>Total HT</span></div>
          <button type="button" onClick={() => setD(x => ({ ...x, lines: [...x.lines, { label: '', quantity: 1, unitPrice: 0 }] }))}
            className="mt-2 text-sm font-semibold text-primary flex items-center gap-1"><Plus size={14} /> Ajouter une ligne</button>
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <div><label className="label">TVA (%)</label>
            <select className="input" value={d.vatRate} onChange={e => set('vatRate', Number(e.target.value))}>
              {[20, 10, 5.5, 2.1, 0].map(v => <option key={v} value={v}>{v} %</option>)}
            </select>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total HT {euro(totals.totalHT, 2)}</p>
            <p className="text-lg font-bold text-gray-900">{euro(totals.totalTTC, 2)} TTC</p>
          </div>
        </div>

        {d.kind === 'external' && (
          <div><label className="label">Lien vers le document (PDF)</label>
            <input className="input" type="url" value={d.externalUrl ?? ''} onChange={e => set('externalUrl', e.target.value)} placeholder="https://drive.google.com/…" />
          </div>
        )}
        <div><label className="label">Notes</label><textarea className="input min-h-[64px]" value={d.notes ?? ''} onChange={e => set('notes', e.target.value || undefined)} placeholder="Conditions de paiement, IBAN…" /></div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}

function OrderPicker({ orders, invoicedOrderIds, onPick, onClose }: {
  orders: Order[]
  invoicedOrderIds: Set<string>
  onPick: (o: Order) => void
  onClose: () => void
}) {
  const eligible = orders
    .filter(o => o.status === 'accepted' || o.status === 'shipped' || o.status === 'received')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return (
    <div data-modal-open className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="card p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-gray-900">Facturer une commande</h3>
          <button onClick={onClose} className="text-gray-400"><X size={20} /></button>
        </div>
        {eligible.length === 0 ? <p className="text-sm text-gray-400 py-6 text-center">Aucune commande acceptée à facturer</p> : eligible.map(o => {
          const qty = o.items.reduce((s, i) => s + i.quantity, 0)
          const done = invoicedOrderIds.has(o.id)
          return (
            <button key={o.id} onClick={() => onPick(o)} className="w-full text-left py-3 border-t border-gray-100 first:border-0 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{o.restaurantName || 'Établissement'}</p>
                <p className="text-xs text-gray-400">{o.createdAt.toLocaleDateString('fr-FR')} · {qty} bouteille{qty > 1 ? 's' : ''}</p>
              </div>
              {done && <span className="text-[10px] font-bold text-success bg-success-light px-1.5 py-0.5 rounded-md">FACTURÉE</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function SupplierInvoicesPage() {
  const { user } = useAuth()
  const supplier = useSupplierProfile()
  const { invoices, loading } = useSupplierInvoices()
  const { orders } = useSupplierOrders()
  const [kind, setKind] = useState<InvoiceKind>('internal')
  const [editing, setEditing] = useState<Draft | null>(null)
  const [picking, setPicking] = useState(false)
  const [deleting, setDeleting] = useState<Invoice | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const clients = useMemo(() => {
    const map = new Map<string, string>()
    orders.forEach(o => { if (o.restaurantId) map.set(o.restaurantId, o.restaurantName || 'Établissement') })
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [orders])
  const invoicedOrderIds = useMemo(() => new Set(invoices.map(i => i.orderId).filter(Boolean) as string[]), [invoices])

  const list = invoices
    .filter(i => i.kind === kind)
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate) || b.createdAt.getTime() - a.createdAt.getTime())
  const outstanding = invoices.filter(i => i.status === 'issued').reduce((s, i) => s + i.totalTTC, 0)
  const paidThisYear = invoices
    .filter(i => i.status === 'paid' && i.issueDate.startsWith(String(new Date().getFullYear())))
    .reduce((s, i) => s + i.totalTTC, 0)

  const save = async (d: Draft) => {
    if (!user?.supplierId) return
    const { totalHT, totalTTC } = invoiceTotals(d.lines, d.vatRate)
    const { id, ...rest } = d
    const fields: Record<string, unknown> = {
      kind: rest.kind, number: rest.number, clientName: rest.clientName, restaurantId: rest.restaurantId,
      orderId: rest.orderId, issueDate: rest.issueDate, dueDate: rest.dueDate, lines: rest.lines,
      vatRate: rest.vatRate, status: rest.status, externalUrl: rest.externalUrl, notes: rest.notes,
      totalHT, totalTTC, supplierId: user.supplierId, supplierName: supplier?.name ?? user.restaurantName,
    }
    if (id) {
      // Cleared optional fields are removed (e.g. a client no longer linked to a restaurant).
      const data = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, v === undefined ? deleteField() : v]))
      await updateDoc(doc(db, 'invoices', id), { ...data, updatedAt: serverTimestamp() })
    } else {
      // Firestore rejects `undefined` values.
      const data = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined))
      await addDoc(collection(db, 'invoices'), { ...data, createdAt: serverTimestamp() })
    }
    setEditing(null)
    setKind(d.kind)
  }

  const markPaid = async (inv: Invoice) => {
    await updateDoc(doc(db, 'invoices', inv.id), { status: 'paid', updatedAt: serverTimestamp() })
  }

  const openPrint = (inv: Invoice) => {
    const ok = printInvoice(inv, { name: supplier?.name ?? user?.restaurantName ?? '', email: supplier?.email, phone: supplier?.phone })
    if (!ok) setMessage("Autorisez l'ouverture de fenêtres pour afficher la facture.")
  }

  if (loading) return <AppLoadingSkeleton />

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-gray-900">Factures</h1>
        <button onClick={() => setEditing(emptyDraft(kind, kind === 'internal' ? nextNumber(invoices) : ''))}
          className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white" aria-label="Nouvelle facture">
          <Plus size={22} />
        </button>
      </div>

      {message && <div className="bg-warning-light text-warning text-sm p-3 rounded-xl">{message}</div>}

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3">
          <p className="text-xs text-gray-500">À encaisser</p>
          <p className="text-xl font-bold text-warning">{euro(outstanding)}</p>
        </div>
        <div className="card p-3">
          <p className="text-xs text-gray-500">Encaissé {new Date().getFullYear()}</p>
          <p className="text-xl font-bold text-success">{euro(paidThisYear)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setPicking(true)} className="card p-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <ClipboardList size={16} className="text-primary" /> Depuis une commande
        </button>
        <button onClick={() => setEditing(emptyDraft('external', ''))} className="card p-3 flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Upload size={16} className="text-primary" /> Facture externe
        </button>
      </div>

      <div className="flex gap-2">
        {([['internal', 'Internes'], ['external', 'Externes']] as [InvoiceKind, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setKind(v)}
            className={`flex-1 py-1.5 rounded-full text-xs font-semibold border ${kind === v ? 'bg-primary text-white border-primary' : 'bg-white text-gray-500 border-gray-200'}`}>
            {l} · {invoices.filter(i => i.kind === v).length}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileText size={40} className="mx-auto mb-2 text-gray-300" />
          <p>{kind === 'internal' ? 'Aucune facture émise' : 'Aucune facture externe'}</p>
          <p className="text-xs mt-1">{kind === 'internal' ? 'Créez une facture ou facturez une commande' : 'Ajoutez les factures gérées hors de Spirit Stock'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map(inv => (
            <div key={inv.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-900 truncate">{inv.clientName}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${STATUS_STYLE[inv.status]}`}>{INVOICE_STATUS_LABELS[inv.status].toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {inv.number} · {new Date(inv.issueDate + 'T12:00:00').toLocaleDateString('fr-FR')}
                    {inv.dueDate && inv.status === 'issued' && <> · échéance {new Date(inv.dueDate + 'T12:00:00').toLocaleDateString('fr-FR')}</>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">{euro(inv.totalTTC, 2)}</p>
                  <p className="text-[11px] text-gray-400">{euro(inv.totalHT, 2)} HT</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => openPrint(inv)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg bg-primary text-white"><Printer size={14} /> Voir / PDF</button>
                {inv.externalUrl && (
                  <a href={inv.externalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1 text-xs font-semibold py-2 px-3 rounded-lg border border-gray-200 text-gray-600"><ExternalLink size={14} /> Doc</a>
                )}
                {inv.status === 'issued' && (
                  <button onClick={() => markPaid(inv)} className="flex items-center justify-center text-xs font-semibold py-2 px-3 rounded-lg border-2 border-success text-success">Payée</button>
                )}
                <button onClick={() => setEditing({ ...inv })} className="w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500" aria-label="Modifier"><Pencil size={14} /></button>
                <button onClick={() => setDeleting(inv)} className="w-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400" aria-label="Supprimer"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && <InvoiceEditor draft={editing} clients={clients} onClose={() => setEditing(null)} onSave={save} />}
      {picking && (
        <OrderPicker orders={orders} invoicedOrderIds={invoicedOrderIds} onClose={() => setPicking(false)}
          onPick={o => { setPicking(false); setEditing(draftFromOrder(o, nextNumber(invoices))) }} />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Supprimer cette facture ?"
        message={deleting ? `La facture ${deleting.number} sera définitivement supprimée.` : ''}
        confirmLabel="Supprimer"
        tone="danger"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => { if (deleting) await deleteDoc(doc(db, 'invoices', deleting.id)); setDeleting(null) }}
      />
    </div>
  )
}
