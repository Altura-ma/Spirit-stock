// Vercel serverless function — handles supplier accept/refuse clicks from email

import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const requiredEnv = (key) => {
  const value = process.env[key]
  if (!value) throw new Error(`${key} not set`)
  return value
}

const RESEND_API_KEY = requiredEnv('RESEND_API_KEY')
const RESEND_FROM = requiredEnv('RESEND_FROM_EMAIL')

function getAdminDb() {
  if (!getApps().length) {
    initializeApp({ credential: cert(JSON.parse(requiredEnv('FIREBASE_SERVICE_ACCOUNT_JSON'))) })
  }
  return getFirestore()
}

async function getOrder(orderId) {
  const snap = await getAdminDb().collection('orders').doc(orderId).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() }
}

async function patchOrder(orderId, fields) {
  await getAdminDb().collection('orders').doc(orderId).update(fields)
  return true
}

// ── Email helpers ────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function itemsList(items) {
  return (items ?? []).map(i =>
    `<li style="margin-bottom:4px;"><strong>${escapeHtml(i.bottleName)}</strong> × ${Number(i.quantity) || 0}</li>`
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
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: RESEND_FROM, to: [to], subject, html }),
  })
  if (!emailRes.ok) {
    const text = await emailRes.text().catch(() => '')
    throw new Error(`Resend failed: ${emailRes.status} ${text}`)
  }
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

  if (order.token !== token) {
    return html(403, page('🔒', 'Lien invalide', 'Ce lien est expiré ou incorrect.', '#E53935'))
  }

  if (order.status !== 'pending') {
    const msg = order.status === 'accepted' ? 'déjà acceptée'
      : order.status === 'refused' ? 'déjà refusée'
      : order.status === 'cancelled' ? 'déjà annulée'
      : 'déjà traitée'
    return html(200, page('ℹ️', `Commande ${msg}`, 'Cette commande a déjà été traitée.'))
  }

  const now = new Date()

  try {
    if (action === 'accept') {
      await patchOrder(orderId, { status: 'accepted', acceptedAt: now })

      if (order.restaurantEmail) {
        await sendEmail(
          order.restaurantEmail,
          `✓ Commande acceptée — ${order.supplierName ?? 'Votre fournisseur'}`,
          buildAcceptedEmail(order.supplierName ?? 'Votre fournisseur', order.items)
        ).catch(console.error)
      }

      return html(200, page('✅', 'Commande acceptée !', 'Le restaurant a été notifié. Merci !', '#2E7D32'))
    }

    await patchOrder(orderId, { status: 'refused', cancelledAt: now })

    if (order.restaurantEmail) {
      await sendEmail(
        order.restaurantEmail,
        `Commande refusée — ${order.supplierName ?? 'Votre fournisseur'}`,
        buildRefusedEmail(order.supplierName ?? 'Votre fournisseur', order.items)
      ).catch(console.error)
    }

    return html(200, page('❌', 'Commande refusée', 'Le restaurant a été notifié.', '#E53935'))
  } catch (err) {
    console.error('order-action failed:', err)
    return html(500, page('⚠️', 'Erreur', 'Impossible de mettre à jour la commande.', '#E53935'))
  }
}
