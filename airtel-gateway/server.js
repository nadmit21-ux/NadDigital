import 'dotenv/config'
import crypto from 'node:crypto'
import express from 'express'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'

const app = express()
const PORT = Number(process.env.PORT || 8080)
const COUNTRY = process.env.AIRTEL_COUNTRY || 'CD'
const DEFAULT_CURRENCY = process.env.AIRTEL_DEFAULT_CURRENCY || 'USD'
const BASE_URL = (process.env.AIRTEL_BASE_URL || 'https://openapiuat.airtel.cd').replace(/\/$/, '')
const PAYMENT_PATH = process.env.AIRTEL_PAYMENT_PATH || '/merchant/v2/payments/'
const DRY_RUN = String(process.env.DRY_RUN || 'true').toLowerCase() === 'true'

app.disable('x-powered-by')
app.use(helmet())
app.use(rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: true, legacyHeaders: false }))
app.use(express.json({
  limit: '32kb',
  verify: (req, _res, buffer) => { req.rawBody = buffer.toString('utf8') },
}))

function safeEqualHex(left, right) {
  try {
    const a = Buffer.from(String(left || ''), 'hex')
    const b = Buffer.from(String(right || ''), 'hex')
    return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function verifyInternalSignature(req) {
  const secret = process.env.GATEWAY_SHARED_SECRET
  if (!secret || secret.length < 32) return { ok: false, error: 'Gateway secret is not configured.' }

  const timestamp = String(req.get('x-naddigital-timestamp') || '')
  const signature = String(req.get('x-naddigital-signature') || '')
  const seconds = Number(timestamp)
  if (!Number.isFinite(seconds)) return { ok: false, error: 'Invalid request timestamp.' }

  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - seconds) > 300) return { ok: false, error: 'Expired request.' }

  const payload = `${timestamp}.${req.rawBody || ''}`
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  if (!safeEqualHex(signature, expected)) return { ok: false, error: 'Invalid request signature.' }
  return { ok: true }
}

function normalizeRdcMsisdn(value) {
  let digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('243')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (!/^\d{9}$/.test(digits)) throw new Error('Invalid RDC mobile number.')
  return digits
}

function validatePayment(body) {
  const orderNumber = String(body?.order_number || '').trim().toUpperCase()
  const transactionId = String(body?.transaction_id || '').trim()
  const currency = String(body?.currency || DEFAULT_CURRENCY).trim().toUpperCase()
  const amount = Number(body?.amount)
  const msisdn = normalizeRdcMsisdn(body?.msisdn)

  if (!/^ND-[A-Z0-9-]{8,32}$/.test(orderNumber)) throw new Error('Invalid order number.')
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(transactionId)) throw new Error('Invalid transaction id.')
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid payment amount.')
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Invalid currency.')

  return { orderNumber, transactionId, currency, amount, msisdn }
}

async function getAirtelToken() {
  const tokenUrl = process.env.AIRTEL_TOKEN_URL
  const clientId = process.env.AIRTEL_CLIENT_ID
  const clientSecret = process.env.AIRTEL_CLIENT_SECRET

  if (!tokenUrl || !clientId || !clientSecret) {
    throw new Error('Airtel OAuth credentials are not configured yet.')
  }

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data?.access_token) {
    console.error('Airtel OAuth failed', response.status)
    throw new Error('Unable to authenticate with Airtel.')
  }
  return data.access_token
}

function paymentPayload(payment) {
  return {
    reference: payment.orderNumber,
    subscriber: {
      country: COUNTRY,
      currency: payment.currency,
      msisdn: payment.msisdn,
    },
    transaction: {
      amount: payment.amount,
      country: COUNTRY,
      currency: payment.currency,
      id: payment.transactionId,
    },
  }
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'naddigital-airtel-gateway',
    environment: DRY_RUN ? 'dry-run' : 'airtel-test',
    country: COUNTRY,
    time: new Date().toISOString(),
  })
})

app.post('/v1/airtel/payment', async (req, res) => {
  const auth = verifyInternalSignature(req)
  if (!auth.ok) return res.status(401).json({ ok: false, error: auth.error })

  try {
    const payment = validatePayment(req.body)
    const payload = paymentPayload(payment)

    if (DRY_RUN) {
      return res.json({
        ok: true,
        dry_run: true,
        airtel_request: payload,
        message: 'Gateway validation passed. Airtel was not contacted.',
      })
    }

    if (String(process.env.AIRTEL_MESSAGE_SIGNING || 'false').toLowerCase() === 'true') {
      return res.status(503).json({
        ok: false,
        error: 'Airtel message signing is enabled but the encryption adapter has not been configured yet.',
      })
    }

    const token = await getAirtelToken()
    const response = await fetch(`${BASE_URL}${PAYMENT_PATH}`, {
      method: 'POST',
      headers: {
        Accept: '*/*',
        'Content-Type': 'application/json',
        'X-Country': COUNTRY,
        'X-Currency': payment.currency,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await response.json().catch(() => ({}))
    return res.status(response.ok ? 200 : 502).json({
      ok: response.ok,
      provider: 'airtel',
      provider_status: response.status,
      data,
    })
  } catch (error) {
    console.error('payment gateway error', error?.message || error)
    return res.status(400).json({ ok: false, error: error?.message || 'Unable to process payment request.' })
  }
})

app.use((_req, res) => res.status(404).json({ ok: false, error: 'Not found.' }))

app.listen(PORT, '0.0.0.0', () => {
  console.log(`NadDigital Airtel Gateway listening on port ${PORT} (${DRY_RUN ? 'DRY_RUN' : 'AIRTEL TEST'})`)
})
