// Vercel serverless function — sends the order email to the supplier via Resend

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? 're_GgbqiBwc_52mftzNhNULbnsWAL8NkF8YB'
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'Spirit Stock <onboarding@resend.dev>'
const BASE_URL = process.env.BASE_URL ?? 'https://app.spirit-stock.fr'

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function buildItemsRows(items) {
  return items.map((i, idx) => `
    <tr>
      <td style="padding:${idx === 0 ? '0' : '8px'} 0 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="background:#F7F4F0;border-radius:10px;padding:14px 18px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:15px;font-weight:700;color:#1A1A1A;">
                    ${escapeHtml(i.bottleName)}
                  </td>
                  <td align="right" style="white-space:nowrap;padding-left:12px;">
                    <span style="display:inline-block;background:#8B4513;color:#ffffff;font-family:Arial,sans-serif;font-size:13px;font-weight:700;padding:4px 14px;border-radius:20px;">
                      × ${i.quantity}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`).join('')
}

function buildEmail({ restaurantName, items, acceptUrl, cancelUrl, date, time }) {
  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="fr">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#F0EDE8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table width="540" cellpadding="0" cellspacing="0" style="max-width:540px;">

          <!-- Logo / brand row -->
          <tr>
            <td align="center" style="padding-bottom:20px;">
              <span style="font-family:Arial,sans-serif;font-size:13px;font-weight:700;color:#8B4513;letter-spacing:2px;text-transform:uppercase;">Spirit Stock</span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.10);">

              <!-- Orange top bar -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="background:#E67E22;height:6px;border-radius:20px 20px 0 0;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>

              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:32px 36px 24px;">
                    <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#E67E22;text-transform:uppercase;letter-spacing:2px;">Nouvelle commande</p>
                    <h1 style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:26px;font-weight:800;color:#1A1A1A;line-height:1.2;">
                      ${escapeHtml(restaurantName)}
                    </h1>
                    <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#999;">
                      ${date} &nbsp;·&nbsp; ${time}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:0 36px;"><div style="height:1px;background:#F0EDE8;font-size:0;line-height:0;">&nbsp;</div></td></tr>
              </table>

              <!-- Items -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:24px 36px;">
                    <p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:1.5px;">Articles</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${buildItemsRows(items)}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:0 36px;"><div style="height:1px;background:#F0EDE8;font-size:0;line-height:0;">&nbsp;</div></td></tr>
              </table>

              <!-- Buttons -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 36px 36px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="48%">
                          <a href="${acceptUrl}"
                            style="display:block;background:#2E7D32;color:#ffffff;text-decoration:none;text-align:center;padding:16px 12px;border-radius:12px;font-family:Arial,sans-serif;font-size:15px;font-weight:700;">
                            ✓&nbsp; Accepter
                          </a>
                        </td>
                        <td width="4%"></td>
                        <td width="48%">
                          <a href="${cancelUrl}"
                            style="display:block;background:#ffffff;color:#555555;text-decoration:none;text-align:center;padding:14px 12px;border-radius:12px;font-family:Arial,sans-serif;font-size:15px;font-weight:700;border:2px solid #E0E0E0;">
                            Refuser
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;color:#BBB;">
                Ce message a été envoyé automatiquement via Spirit Stock.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
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

  const { orderId, token, supplierEmail, restaurantName, items, createdAt } = body

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
