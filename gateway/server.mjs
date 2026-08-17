import http from 'node:http'
import crypto from 'node:crypto'

const PORT = Number(process.env.PORT || 8080)
const SHARED_SECRET = process.env.GATEWAY_SHARED_SECRET || ''
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES || 65536)
const MAX_CLOCK_SKEW_SECONDS = Number(process.env.MAX_CLOCK_SKEW_SECONDS || 300)

const json = (res, status, body) => {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(payload)
}

const readBody = (req) => new Promise((resolve, reject) => {
  let size = 0
  const chunks = []
  req.on('data', (chunk) => {
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      reject(new Error('payload_too_large'))
      req.destroy()
      return
    }
    chunks.push(chunk)
  })
  req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  req.on('error', reject)
})

const safeEqual = (a, b) => {
  const left = Buffer.from(String(a || ''))
  const right = Buffer.from(String(b || ''))
  if (left.length !== right.length) return false
  return crypto.timingSafeEqual(left, right)
}

const verifyGatewaySignature = ({ req, rawBody }) => {
  if (!SHARED_SECRET) return { ok: false, reason: 'gateway_secret_missing' }

  const timestamp = String(req.headers['x-nd-timestamp'] || '')
  const signature = String(req.headers['x-nd-signature'] || '')
  const unix = Number(timestamp)
  if (!Number.isFinite(unix)) return { ok: false, reason: 'invalid_timestamp' }

  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - unix) > MAX_CLOCK_SKEW_SECONDS) {
    return { ok: false, reason: 'stale_request' }
  }

  const canonical = [timestamp, req.method, req.url, rawBody].join('\n')
  const expected = crypto
    .createHmac('sha256', SHARED_SECRET)
    .update(canonical)
    .digest('hex')

  return safeEqual(expected, signature)
    ? { ok: true }
    : { ok: false, reason: 'invalid_signature' }
}

const requireJsonObject = (rawBody) => {
  let body
  try {
    body = JSON.parse(rawBody || '{}')
  } catch {
    throw new Error('invalid_json')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('invalid_json_object')
  }
  return body
}

const pendingAirtelAdapter = (res, operation) => json(res, 503, {
  ok: false,
  code: 'airtel_adapter_not_configured',
  message: 'Le gateway est actif, mais la couche OAuth2/chiffrement/signature Airtel doit encore être configurée depuis la documentation officielle du portail.',
  operation,
})

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      return json(res, 200, {
        ok: true,
        service: 'naddigital-airtel-gateway',
        version: '0.1.0',
        airtel_mode: process.env.AIRTEL_MODE || 'TEST',
        static_ip_ready: true,
      })
    }

    if (req.method !== 'POST') {
      return json(res, 404, { ok: false, code: 'not_found' })
    }

    const rawBody = await readBody(req)
    const auth = verifyGatewaySignature({ req, rawBody })
    if (!auth.ok) {
      return json(res, 401, { ok: false, code: auth.reason })
    }

    const body = requireJsonObject(rawBody)

    if (req.url === '/v1/airtel/payment') {
      const required = ['order_id', 'order_number', 'msisdn', 'amount', 'currency']
      const missing = required.filter((key) => body[key] === undefined || body[key] === null || body[key] === '')
      if (missing.length) {
        return json(res, 400, { ok: false, code: 'missing_fields', fields: missing })
      }
      return pendingAirtelAdapter(res, 'payment')
    }

    if (req.url === '/v1/airtel/status') {
      if (!body.transaction_id && !body.order_number) {
        return json(res, 400, { ok: false, code: 'transaction_identifier_required' })
      }
      return pendingAirtelAdapter(res, 'status')
    }

    return json(res, 404, { ok: false, code: 'not_found' })
  } catch (error) {
    const code = error?.message || 'internal_error'
    const status = code === 'payload_too_large' ? 413 : code.startsWith('invalid_json') ? 400 : 500
    return json(res, status, { ok: false, code })
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`NadDigital Airtel Gateway listening on :${PORT}`)
})
