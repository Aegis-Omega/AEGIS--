// AEGIS-Ω PayPal order capture + API key provisioning
// Deploy: supabase functions deploy verify-paypal --no-verify-jwt
// Required secrets (supabase secrets set ...):
//   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE (sandbox|live)
//   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY auto-injected by Supabase
//   NOTIFY_SECRET (optional, for owner alerts)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CORS } from '../_shared/cors.ts'

const PAYPAL_CLIENT_ID     = Deno.env.get('PAYPAL_CLIENT_ID') ?? ''
const PAYPAL_CLIENT_SECRET = Deno.env.get('PAYPAL_CLIENT_SECRET') ?? ''
const PAYPAL_MODE          = Deno.env.get('PAYPAL_MODE') ?? 'sandbox'
const PAYPAL_BASE          = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

async function getPayPalToken(): Promise<string> {
  const creds = btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)
  const resp = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method:  'POST',
    headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    'grant_type=client_credentials',
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(`PayPal auth: ${JSON.stringify(data)}`)
  return data.access_token as string
}

async function captureOrder(token: string, orderId: string): Promise<string> {
  const resp = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(`PayPal capture: ${JSON.stringify(data)}`)
  return data.status as string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST')    return new Response('Method Not Allowed', { status: 405 })

  let body: { order_id?: string; tier?: string; email?: string }
  try { body = await req.json() }
  catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS }) }

  const tierNorm  = (body.tier  ?? '').toLowerCase().trim()
  const emailNorm = (body.email ?? '').toLowerCase().trim()

  if (!['explorer', 'operator', 'sovereign'].includes(tierNorm))
    return new Response(JSON.stringify({ error: 'Invalid tier' }), { status: 400, headers: CORS })
  if (!emailNorm || !emailNorm.includes('@'))
    return new Response(JSON.stringify({ error: 'Valid email required' }), { status: 400, headers: CORS })

  // Paid tiers: capture PayPal order before provisioning
  if (tierNorm !== 'explorer') {
    const orderId = (body.order_id ?? '').trim()
    if (!orderId)
      return new Response(JSON.stringify({ error: 'order_id required for paid tiers' }), { status: 400, headers: CORS })
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET)
      return new Response(JSON.stringify({ error: 'PayPal not configured' }), { status: 503, headers: CORS })

    try {
      const token  = await getPayPalToken()
      const status = await captureOrder(token, orderId)
      if (status !== 'COMPLETED')
        return new Response(JSON.stringify({ error: `Order not completed (status: ${status})` }), { status: 402, headers: CORS })
    } catch (e) {
      console.error('PayPal capture error:', e)
      return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS })
    }
  }

  // Provision API key via SQL function (security definer, runs with elevated privileges)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )
  const { data, error } = await supabase.rpc('provision_platform_key', {
    p_customer_email: emailNorm,
    p_tier:           tierNorm,
  })
  if (error) {
    console.error('Provision error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: CORS })
  }

  const rawKey = data as string

  // Notify owner — fire and forget
  const notifyUrl    = `${Deno.env.get('SUPABASE_URL')}/functions/v1/notify`
  const notifySecret = Deno.env.get('NOTIFY_SECRET') ?? ''
  const tierLabel    = { explorer: 'Explorer (free)', operator: 'Operator ($49)', sovereign: 'Sovereign ($499)' }
  fetch(notifyUrl, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'x-notify-secret': notifySecret },
    body:    JSON.stringify({
      channel: 'both',
      subject: `🔑 New AEGIS API key — ${tierLabel[tierNorm as keyof typeof tierLabel]}`,
      text:    `New API key provisioned!\n\nCustomer: ${emailNorm}\nTier: ${tierNorm}\nKey prefix: ${rawKey.slice(0, 14)}...\n\nhttps://aegisomega.com`,
    }),
  }).catch(e => console.error('Notify failed (non-fatal):', e))

  return new Response(
    JSON.stringify({ api_key: rawKey, tier: tierNorm }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } },
  )
})
