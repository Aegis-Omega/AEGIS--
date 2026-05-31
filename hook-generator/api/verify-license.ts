export const config = { runtime: 'edge' }

const PRODUCT_PERMALINK = 'aegis-hook-generator'

export default async function handler(request: Request): Promise<Response> {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ valid: false, error: 'Method not allowed' }), { status: 405, headers: cors })
  }

  let license_key: string
  try {
    const body = await request.json() as { license_key?: unknown }
    if (!body.license_key || typeof body.license_key !== 'string') {
      return new Response(JSON.stringify({ valid: false, error: 'Missing license_key' }), { status: 400, headers: cors })
    }
    license_key = body.license_key.trim()
  } catch {
    return new Response(JSON.stringify({ valid: false, error: 'Invalid request body' }), { status: 400, headers: cors })
  }

  if (!license_key) {
    return new Response(JSON.stringify({ valid: false, error: 'License key cannot be empty' }), { status: 400, headers: cors })
  }

  try {
    const params = new URLSearchParams({
      product_permalink: PRODUCT_PERMALINK,
      license_key,
      increment_uses_count: 'false',
    })

    const gumroadRes = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const data = await gumroadRes.json() as { success: boolean; message?: string }

    if (data.success) {
      return new Response(JSON.stringify({ valid: true }), { status: 200, headers: cors })
    } else {
      return new Response(
        JSON.stringify({ valid: false, error: data.message ?? 'Invalid license key' }),
        { status: 200, headers: cors },
      )
    }
  } catch {
    return new Response(
      JSON.stringify({ valid: false, error: 'Verification service temporarily unavailable. Try again.' }),
      { status: 200, headers: cors },
    )
  }
}
