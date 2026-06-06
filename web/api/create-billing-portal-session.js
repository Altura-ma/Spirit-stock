import { getBaseUrl, getStripe, isBillableRestaurant, requireFirebaseUser } from './stripe-admin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ctx = await requireFirebaseUser(req, res)
  if (!ctx) return
  if (!isBillableRestaurant(ctx.user)) return res.status(403).json({ error: 'Restaurant account required' })
  if (!ctx.user.stripeCustomerId) return res.status(400).json({ error: 'No Stripe customer' })

  const stripe = getStripe()
  const baseUrl = getBaseUrl()
  const session = await stripe.billingPortal.sessions.create({
    customer: ctx.user.stripeCustomerId,
    return_url: `${baseUrl}/profile`,
  })

  return res.status(200).json({ url: session.url })
}
