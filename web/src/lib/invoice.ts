import { Invoice } from '../types'

function esc(s: unknown) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function money(n: number) {
  return n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
}

function date(iso?: string) {
  return iso ? new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR') : ''
}

export const INVOICE_STATUS_LABELS: Record<Invoice['status'], string> = {
  draft: 'Brouillon', issued: 'Émise', paid: 'Payée',
}

/** Opens a printable invoice in a new tab (the browser's "Save as PDF" makes the PDF). */
export function printInvoice(inv: Invoice, supplier: { name: string; email?: string; phone?: string }) {
  const vat = Math.round((inv.totalTTC - inv.totalHT) * 100) / 100
  const rows = inv.lines.map(l => `
    <tr>
      <td>${esc(l.label)}</td>
      <td class="r">${l.quantity}</td>
      <td class="r">${money(l.unitPrice)}</td>
      <td class="r">${money(l.quantity * l.unitPrice)}</td>
    </tr>`).join('')

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Facture ${esc(inv.number)}</title>
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,Segoe UI,Arial,sans-serif;color:#1a1a1a;margin:0;padding:32px;max-width:800px;margin:auto}
  h1{font-size:28px;margin:0;color:#8B4513} .muted{color:#777;font-size:13px}
  .head{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:32px}
  .box{border:1px solid #eee;border-radius:10px;padding:14px 16px;min-width:220px}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-size:14px}
  th{text-align:left;border-bottom:2px solid #8B4513;padding:8px 6px;font-size:12px;text-transform:uppercase;color:#555}
  td{border-bottom:1px solid #eee;padding:8px 6px} .r{text-align:right}
  .totals{margin-left:auto;margin-top:16px;width:280px;font-size:14px}
  .totals div{display:flex;justify-content:space-between;padding:4px 0}
  .totals .ttc{font-weight:700;font-size:18px;border-top:2px solid #1a1a1a;margin-top:6px;padding-top:8px}
  .badge{display:inline-block;padding:2px 8px;border-radius:6px;background:#f3ece6;color:#8B4513;font-size:12px;font-weight:600}
  .notes{margin-top:28px;font-size:13px;color:#555;white-space:pre-line}
  .print{position:fixed;right:16px;bottom:16px;background:#8B4513;color:#fff;border:0;border-radius:10px;padding:12px 18px;font-weight:600;font-size:14px}
  @media print{.print{display:none} body{padding:0}}
</style></head><body>
  <div class="head">
    <div>
      <h1>Facture</h1>
      <p class="muted">N° <strong>${esc(inv.number)}</strong> · ${inv.kind === 'external' ? 'Facture externe' : 'Spirit Stock'}</p>
      <p class="muted">Émise le ${date(inv.issueDate)}${inv.dueDate ? ` · échéance ${date(inv.dueDate)}` : ''}</p>
      <span class="badge">${INVOICE_STATUS_LABELS[inv.status]}</span>
    </div>
    <div class="box">
      <p class="muted">Émetteur</p>
      <strong>${esc(supplier.name)}</strong><br>
      ${supplier.email ? `<span class="muted">${esc(supplier.email)}</span><br>` : ''}
      ${supplier.phone ? `<span class="muted">${esc(supplier.phone)}</span>` : ''}
    </div>
    <div class="box">
      <p class="muted">Client</p>
      <strong>${esc(inv.clientName)}</strong>
    </div>
  </div>
  <table>
    <thead><tr><th>Désignation</th><th class="r">Qté</th><th class="r">PU HT</th><th class="r">Total HT</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4" class="muted">Aucune ligne</td></tr>'}</tbody>
  </table>
  <div class="totals">
    <div><span>Total HT</span><span>${money(inv.totalHT)}</span></div>
    <div><span>TVA ${inv.vatRate} %</span><span>${money(vat)}</span></div>
    <div class="ttc"><span>Total TTC</span><span>${money(inv.totalTTC)}</span></div>
  </div>
  ${inv.notes ? `<div class="notes">${esc(inv.notes)}</div>` : ''}
  <button class="print" onclick="window.print()">Imprimer / PDF</button>
</body></html>`

  const w = window.open('', '_blank')
  if (!w) return false
  w.document.open()
  w.document.write(html)
  w.document.close()
  return true
}
