import { getBaseUrl, getAdminDb, getStripe, isBillableRestaurant, requireFirebaseUser, requiredEnv, TRIAL_DAYS } from './stripe-admin.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const ctx = await requireFirebaseUser(req, res)
  if (!ctx) return
  if (!isBillableRestaurant(ctx.user)) return res.status(403).json({ error: 'Restaurant account required' })

  const stripe = getStripe()
  const db = getAdminDb()
  const baseUrl = getBaseUrl()
  let stripeCustomerId = ctx.user.stripeCustomerId

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: ctx.email ?? ctx.user.email,
      name: ctx.user.restaurantName,
      metadata: { firebaseUid: ctx.uid, restaurantId: ctx.user.restaurantId },
    })
    stripeCustomerId = customer.id
    await Promise.all([
      ctx.ref.update({ stripeCustomerId }),
      db.collection('restaurants').doc(ctx.user.restaurantId).set({ stripeCustomerId }, { merge: true }),
    ])
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    line_items: [{ price: requiredEnv('STRIPE_PRICE_ID'), quantity: 1 }],
    payment_method_collection: 'always',
    allow_promotion_codes: true,
    success_url: `${baseUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/?checkout=cancelled`,
    client_reference_id: ctx.uid,
    metadata: { firebaseUid: ctx.uid, restaurantId: ctx.user.restaurantId },
    subscription_data: {
      trial_period_days: TRIAL_DAYS,
      metadata: { firebaseUid: ctx.uid, restaurantId: ctx.user.restaurantId },
    },
  })

  return res.status(200).json({ url: session.url })
}
