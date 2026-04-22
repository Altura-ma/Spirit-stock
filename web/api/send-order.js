// Vercel serverless function — sends the order email to the supplier via Resend

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? 're_GgbqiBwc_52mftzNhNULbnsWAL8NkF8YB'
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'Spirit Stock <onboarding@resend.dev>'
const BASE_URL = process.env.BASE_URL ?? 'https://spirit-stock.vercel.app'

function buildItemsRows(items) {
  return items.map(i => `
    <tr>
      <td style="font-size: 15px; color: #333; padding: 10px 0;">
        <strong>${escapeHtml(i.bottleName)}</strong>
      </td>
      <td align="right" style="font-size: 16px; font-weight: bold; color: #D35400; padding: 10px 0;">
        x${i.quantity}
      </td>
    </tr>`).join('')
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildEmail({ restaurantName, items, acceptUrl, cancelUrl, date, time }) {
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:20px;background-color:#F9F9F9;font-family:Arial,sans-serif;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr><td align="center">
      <table border="0" cellpadding="0" cellspacing="0" width="500"
        style="background:#fff;border-radius:12px;border-left:5px solid #E67E22;box-shadow:0 4px 12px rgba(0,0,0,0.05);">

        <tr><td style="padding:25px 25px 5px 25px;">
          <span style="color:#E67E22;font-size:11px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;">Nouvelle commande</span>
          <h2 style="margin:5px 0;color:#1A1A1A;font-size:20px;">Client : ${escapeHtml(restaurantName)}</h2>
          <p style="margin:0;color:#888;font-size:13px;">${date} • ${time}</p>
        </td></tr>

        <tr><td style="padding:20px 25px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%"
            style="border-top:1px solid #F0F0F0;border-bottom:1px solid #F0F0F0;">
            ${buildItemsRows(items)}
          </table>
        </td></tr>

        <tr><td style="padding:10px 25px 30px 25px;">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td width="48%">
                <a href="${acceptUrl}"
                  style="background:#2E7D32;color:#fff;padding:12px;display:block;text-decoration:none;border-radius:6px;text-align:center;font-weight:bold;font-size:14px;">
                  ✓ Accepter
                </a>
              </td>
              <td width="4%"></td>
              <td width="48%">
                <a href="${cancelUrl}"
                  style="background:#fff;color:#666;border:1px solid #DDD;padding:12px;display:block;text-decoration:none;border-radius:6px;text-align:center;font-weight:bold;font-size:14px;">
                  Refuser
                </a>
              </td>
            </tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const { orderId, token, supplierEmail, supplierName, restaurantName, items, createdAt } = body

  if (!orderId || !token || !supplierEmail || !items?.length) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  const d = new Date(createdAt)
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

  const acceptUrl = `${BASE_URL}/api/order-action?orderId=${orderId}&token=${encodeURIComponent(token)}&action=accept`
  const cancelUrl = `${BASE_URL}/api/order-action?orderId=${orderId}&token=${encodeURIComponent(token)}&action=cancel`

  const html = buildEmail({ restaurantName, items, acceptUrl, cancelUrl, date, time })

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [supplierEmail],
      subject: `Nouvelle commande — ${restaurantName}`,
      html,
    }),
  })

  const emailData = await emailRes.json()
  if (!emailRes.ok) {
    console.error('Resend error:', emailData)
    return res.status(500).json({ error: 'Email send failed', details: emailData })
  }

  return res.status(200).json({ success: true, emailId: emailData.id })
}
