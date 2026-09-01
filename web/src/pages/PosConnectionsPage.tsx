import { useEffect, useState } from 'react'
import { Link2, PlugZap, RefreshCw } from 'lucide-react'
import { auth } from '../config/firebase'
import { useStock } from '../context/StockContext'
import { PosProvider, PosSalesEvent, PosSaleUnit } from '../types'

const PROVIDERS: { id: PosProvider; label: string; status: 'ready' | 'next' }[] = [
  { id: 'lightspeed', label: 'Lightspeed Restaurant', status: 'next' },
  { id: 'sumup_tiller', label: 'SumUp / Tiller', status: 'next' },
  { id: 'zelty', label: 'Zelty', status: 'next' },
  { id: 'laddition', label: "L'Addition", status: 'next' },
  { id: 'innovorder', label: 'Innovorder', status: 'next' },
  { id: 'csv', label: 'Import CSV / JSON', status: 'ready' },
  { id: 'square', label: 'Square', status: 'next' },
  { id: 'toast', label: 'Toast', status: 'next' },
  { id: 'clover', label: 'Clover', status: 'next' },
  { id: 'micros', label: 'Oracle MICROS', status: 'next' },
]

const SAMPLE = `[
  {
    "externalEventId": "ticket-1001",
    "externalProductId": "sku-chartreuse-verre",
    "externalProductName": "Chartreuse verte verre",
    "quantitySold": 2,
    "normalizedUnit": "glass",
    "soldAt": "2026-09-01T12:00:00.000Z"
  }
]`

type MappingResponse = {
  needs_mapping: PosSalesEvent[]
}

async function authFetch(path: string, options: RequestInit = {}) {
  const token = await auth.currentUser?.getIdToken()
  if (!token) throw new Error('Session expirée')
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
}

export default function PosConnectionsPage() {
  const { bottles } = useStock()
  const [provider, setProvider] = useState<PosProvider>('csv')
  const [payload, setPayload] = useState(SAMPLE)
  const [needsMapping, setNeedsMapping] = useState<PosSalesEvent[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadMappings = async () => {
    const res = await authFetch('/api/pos-mappings')
    if (!res.ok) throw new Error('Chargement mappings impossible')
    const data = await res.json() as MappingResponse
    setNeedsMapping(data.needs_mapping)
  }

  useEffect(() => {
    loadMappings().catch(() => {})
  }, [])

  const importRows = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const rows = JSON.parse(payload)
      const res = await authFetch('/api/pos-import', {
        method: 'POST',
        body: JSON.stringify({ provider, rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import impossible')
      setMessage(`${data.applied} appliquée(s), ${data.needs_mapping} à lier, ${data.duplicates} doublon(s).`)
      await loadMappings()
    } catch (err: any) {
      setMessage(err.message || 'Import impossible')
    } finally {
      setLoading(false)
    }
  }

  const saveMapping = async (event: PosSalesEvent, bottleId: string, saleUnit: PosSaleUnit) => {
    if (!bottleId) return
    setLoading(true)
    setMessage(null)
    try {
      const res = await authFetch('/api/pos-mappings', {
        method: 'POST',
        body: JSON.stringify({
          provider: event.provider,
          externalProductId: event.externalProductId,
          externalProductName: event.externalProductName,
          bottleId,
          saleUnit,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Mapping impossible')
      setMessage('Article caisse lié. Prochains tickets décrémenteront le stock.')
      await loadMappings()
    } catch (err: any) {
      setMessage(err.message || 'Mapping impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <p className="text-xs font-bold text-primary uppercase tracking-wide">Connecteurs</p>
        <h1 className="text-xl font-bold text-gray-900">Caisses</h1>
        <p className="text-sm text-gray-500 mt-1">Connecte les ventes caisse à Spirit Stock. API/webhooks arrivent par fournisseur, CSV/JSON sert de fallback universel.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            onClick={() => setProvider(p.id)}
            className={`card p-3 text-left border ${provider === p.id ? 'border-primary bg-primary/5' : 'border-transparent'}`}
          >
            <div className="flex items-center gap-2">
              <PlugZap size={16} className={p.status === 'ready' ? 'text-success' : 'text-gray-400'} />
              <span className="text-sm font-semibold text-gray-900">{p.label}</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">{p.status === 'ready' ? 'Actif' : 'Connecteur dédié à brancher'}</p>
          </button>
        ))}
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <RefreshCw size={17} className="text-primary" />
          <h2 className="font-bold text-gray-900">Importer ventes</h2>
        </div>
        <textarea
          className="input min-h-[190px] font-mono text-xs"
          value={payload}
          onChange={e => setPayload(e.target.value)}
        />
        <button onClick={importRows} disabled={loading} className="btn-primary">
          {loading ? 'Import…' : 'Importer'}
        </button>
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Link2 size={17} className="text-primary" />
          <h2 className="font-bold text-gray-900">Articles à lier</h2>
        </div>

        {needsMapping.length === 0 && <p className="text-sm text-gray-400">Aucun article caisse en attente.</p>}

        {needsMapping.map(event => (
          <MappingRow
            key={event.id}
            event={event}
            bottles={bottles}
            disabled={loading}
            onSave={saveMapping}
          />
        ))}
      </div>
    </div>
  )
}

function MappingRow({
  event,
  bottles,
  disabled,
  onSave,
}: {
  event: PosSalesEvent
  bottles: { id: string; name: string }[]
  disabled: boolean
  onSave: (event: PosSalesEvent, bottleId: string, saleUnit: PosSaleUnit) => Promise<void>
}) {
  const [bottleId, setBottleId] = useState('')
  const [saleUnit, setSaleUnit] = useState<PosSaleUnit>(event.normalizedUnit || 'bottle')

  return (
    <div className="border border-gray-100 rounded-xl p-3 space-y-2">
      <div>
        <p className="text-sm font-semibold text-gray-900">{event.externalProductName || event.externalProductId}</p>
        <p className="text-xs text-gray-400">{event.provider} · {event.externalProductId} · quantité {event.quantitySold}</p>
      </div>
      <select className="input" value={bottleId} onChange={e => setBottleId(e.target.value)}>
        <option value="">Choisir bouteille Spirit Stock</option>
        {bottles.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select>
      <select className="input" value={saleUnit} onChange={e => setSaleUnit(e.target.value as PosSaleUnit)}>
        <option value="bottle">Bouteille entière (-1)</option>
        <option value="glass">Verre (-0.2)</option>
        <option value="half_glass">Demi-verre (-0.1)</option>
        <option value="tasting">Dégustation (-0.05)</option>
      </select>
      <button
        className="btn-secondary w-full"
        disabled={disabled || !bottleId}
        onClick={() => onSave(event, bottleId, saleUnit)}
      >
        Lier
      </button>
    </div>
  )
}
