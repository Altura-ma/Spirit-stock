// Vercel serverless function — handles supplier accept/cancel clicks from email

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'spirit-stock'
const FIREBASE_API_KEY = process.env.FIREBASE_WEB_API_KEY ?? 'AIzaSyDlj8Z6J8q4X58ttJE0Qsxr4ZS5IuW32Hc'
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? 're_GgbqiBwc_52mftzNhNULbnsWAL8NkF8YB'
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'Spirit Stock <onboarding@resend.dev>'

const FS_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`

// ── Firestore REST helpers ───────────────────────────────────────────────────

function parseField(field) {
  if (field.stringValue !== undefined) return field.stringValue
  if (field.integerValue !== undefined) return Number(field.integerValue)
  if (field.doubleValue !== undefined) return field.doubleValue
  if (field.booleanValue !== undefined) return field.booleanValue
  if (field.timestampValue !== undefined) return new Date(field.timestampValue)
  if (field.nullValue !== undefined) return null
  if (field.arrayValue) return (field.arrayValue.values ?? []).map(parseField)
  if (field.mapValue) return parseDoc(field.mapValue)
  return null
}

function parseDoc(doc) {
  const out = {}
  for (const [k, v] of Object.entries(doc.fields ?? {})) out[k] = parseField(v)
  return out
}

async function getOrder(orderId) {
  const res = await fetch(`${FS_BASE}/orders/${orderId}?key=${FIREBASE_API_KEY}`)
  if (!res.ok) return null
  return parseDoc(await res.json())
}

async function patchOrder(orderId, fields, fieldPaths) {
  const mask = fieldPaths.map(f => `updateMask.fieldPaths=${f}`).join('&')
  const body = { fields: {} }
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'string') body.fields[k] = { stringValue: v }
    else if (v instanceof Date) body.fields[k] = { timestampValue: v.toISOString() }
  }
  const res = await fetch(`${FS_BASE}/orders/${orderId}?${mask}&key=${FIREBASE_API_KEY}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.ok
}

// ── Email helpers ────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function itemsList(items) {
  return (items ?? []).map(i =>
    `<li style="margin-bottom:4px;"><strong>${escapeHtml(i.bottleName)}</strong> × ${i.quantity}</li>`
  ).join('')
}

function buildAcceptedEmail(supplierName, items) {
  return `<body style="font-family:Arial,sans-serif;background:#F9F9F9;padding:20px;margin:0;">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;border-left:5px solid #2E7D32;padding:30px;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <span style="color:#2E7D32;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Commande acceptée ✓</span>
    <h2 style="color:#1A1A1A;margin:8px 0 16px;">Votre commande a été acceptée</h2>
    <p style="color:#555;margin:0 0 16px;"><strong>${escapeHtml(supplierName)}</strong> a accepté votre commande. La livraison sera prochainement effectuée.</p>
    <ul style="color:#333;padding-left:20px;margin:0 0 20px;">${itemsList(items)}</ul>
    <p style="color:#888;font-size:13px;margin:0;">Une fois la livraison reçue, pensez à la marquer comme reçue dans Spirit Stock.</p>
  </div></body>`
}

function buildRefusedEmail(supplierName, items) {
  return `<body style="font-family:Arial,sans-serif;background:#F9F9F9;padding:20px;margin:0;">
  <div style="max-width:500px;margin:0 auto;background:#fff;border-radius:12px;border-left:5px solid #E53935;padding:30px;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <span style="color:#E53935;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Commande refusée</span>
    <h2 style="color:#1A1A1A;margin:8px 0 16px;">Votre commande a été refusée</h2>
    <p style="color:#555;margin:0 0 16px;"><strong>${escapeHtml(supplierName)}</strong> n'est pas en mesure d'honorer votre commande. Veuillez les contacter pour plus d'informations.</p>
    <ul style="color:#333;padding-left:20px;margin:0;">${itemsList(items)}</ul>
  </div></body>`
}

async function sendEmail(to, subject, html) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
  })
}

// ── Response pages ───────────────────────────────────────────────────────────

function page(icon, title, subtitle, color = '#1A1A1A') {
  return `<!DOCTYPE html>
<html lang="fr"><head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Spirit Stock</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:Arial,sans-serif;background:#F9F9F9;padding:20px}
    .card{background:#fff;border-radius:16px;padding:40px 32px;max-width:380px;width:100%;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.1)}
    .icon{font-size:52px;margin-bottom:20px}
    h1{color:${color};font-size:22px;margin-bottom:8px}
    p{color:#666;font-size:14px;line-height:1.5}
  </style>
</head><body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    ${subtitle ? `<p>${subtitle}</p>` : ''}
  </div>
</body></html>`
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host ?? 'localhost'}`)
  const orderId = url.searchParams.get('orderId')
  const token = url.searchParams.get('token')
  const action = url.searchParams.get('action')

  const html = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(body)
  }

  if (!orderId || !token || !['accept', 'cancel'].includes(action)) {
    return html(400, page('⚠️', 'Lien invalide', 'Ce lien est incorrect ou incomplet.', '#E53935'))
  }

  const order = await getOrder(orderId)
  if (!order) {
    return html(404, page('❓', 'Commande introuvable', 'Cette commande n\'existe pas ou a été supprimée.', '#E53935'))
  }

  // Verify token
  if (order.token !== token) {
    return html(403, page('🔒', 'Lien invalide', 'Ce lien est expiré ou incorrect.', '#E53935'))
  }

  // Idempotency — already processed
  if (order.status !== 'pending') {
    const msg = order.status === 'accepted' ? 'déjà acceptée'
      : order.status === 'refused' ? 'déjà refusée'
      : order.status === 'cancelled' ? 'déjà annulée'
      : 'déjà traitée'
    return html(200, page('ℹ️', `Commande ${msg}`, 'Cette commande a déjà été traitée.'))
  }

  const now = new Date()

  if (action === 'accept') {
    const ok = await patchOrder(orderId, { status: 'accepted', acceptedAt: now }, ['status', 'acceptedAt'])
    if (!ok) return html(500, page('⚠️', 'Erreur', 'Impossible de mettre à jour la commande.', '#E53935'))

    if (order.restaurantEmail) {
      await sendEmail(
        order.restaurantEmail,
        `✓ Commande acceptée — ${order.supplierName ?? 'Votre fournisseur'}`,
        buildAcceptedEmail(order.supplierName ?? 'Votre fournisseur', order.items)
      ).catch(console.error)
    }

    return html(200, page('✅', 'Commande acceptée !', 'Le restaurant a été notifié. Merci !', '#2E7D32'))
  }

  // action === 'cancel' (supplier refuses)
  const ok = await patchOrder(orderId, { status: 'refused', cancelledAt: now }, ['status', 'cancelledAt'])
  if (!ok) return html(500, page('⚠️', 'Erreur', 'Impossible de mettre à jour la commande.', '#E53935'))

  if (order.restaurantEmail) {
    await sendEmail(
      order.restaurantEmail,
      `Commande refusée — ${order.supplierName ?? 'Votre fournisseur'}`,
      buildRefusedEmail(order.supplierName ?? 'Votre fournisseur', order.items)
    ).catch(console.error)
  }

  return html(200, page('❌', 'Commande refusée', 'Le restaurant a été notifié.', '#E53935'))
}
