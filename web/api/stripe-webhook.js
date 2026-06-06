import { getAdminDb, getStripe, mapSubscriptionStatus, requiredEnv } from './stripe-admin.js'

export const config = {
  api: { bodyParser: false },
}

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  return Buffer.concat(chunks)
}

async function updateSubscription({ firebaseUid, restaurantId, customerId, subscriptionId, status, currentPeriodEnd, trialEnd }) {
  const db = getAdminDb()
  const subscriptionStatus = mapSubscriptionStatus(status)
  const data = {
    subscriptionStatus,
    stripeCustomerId: customerId ?? null,
    stripeSubscriptionId: subscriptionId ?? null,
    subscriptionCurrentPeriodEnd: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
    trialEndsAt: trialEnd ? new Date(trialEnd * 1000) : null,
    updatedAt: new Date(),
  }

  const writes = []
  if (firebaseUid) writes.push(db.collection('users').doc(firebaseUid).set(data, { merge: true }))
  if (restaurantId) writes.push(db.collection('restaurants').doc(restaurantId).set(data, { merge: true }))
  await Promise.all(writes)
}

async function findUserByCustomer(customerId) {
  if (!customerId) return null
  const snap = await getAdminDb().collection('users').where('stripeCustomerId', '==', customerId).limit(1).get()
  if (snap.empty) return null
  const doc = snap.docs[0]
  return { uid: doc.id, user: doc.data() }
}

async function handleSubscription(subscription) {
  const fallback = await findUserByCustomer(subscription.customer)
  await updateSubscription({
    firebaseUid: subscription.metadata?.firebaseUid || fallback?.uid,
    restaurantId: subscription.metadata?.restaurantId || fallback?.user?.restaurantId,
    customerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
    subscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodEnd: subscription.current_period_end,
    trialEnd: subscription.trial_end,
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  const stripe = getStripe()
  const rawBody = await readRawBody(req)
  const signature = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, requiredEnv('STRIPE_WEBHOOK_SECRET'))
  } catch (err) {
    console.error('Stripe webhook signature failed:', err.message)
    return res.status(400).send('Invalid signature')
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      if (session.mode === 'subscription' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription)
        await handleSubscription(subscription)
      }
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await handleSubscription(event.data.object)
    }
  } catch (err) {
    console.error('Stripe webhook handler failed:', err)
    return res.status(500).send('Webhook handler failed')
  }

  return res.status(200).json({ received: true })
}
