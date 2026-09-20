import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'

export const RECORDER_COOKIE = 'stavby_recorder_session'
export const RECORDER_TTL = 30 * 24 * 60 * 60

export function createRecorderToken(now = Math.floor(Date.now() / 1000)) {
  const secret = process.env.ADMIN_PASSWORD
  if (!secret) throw new Error('Admin password is not configured')
  const payload = `recorder-v1.${now + RECORDER_TTL}.${randomBytes(16).toString('hex')}`
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`
}

export function verifyRecorderToken(token: string | undefined, now = Math.floor(Date.now() / 1000)) {
  if (!token || token.length > 200 || !process.env.ADMIN_PASSWORD) return false
  const [version, expires, nonce, signature, ...extra] = token.split('.')
  if (extra.length || version !== 'recorder-v1' || !/^\d+$/.test(expires || '') ||
      !/^[a-f0-9]{32}$/.test(nonce || '') || !/^[A-Za-z0-9_-]{43}$/.test(signature || '')) return false
  const expiry = Number(expires)
  if (!Number.isSafeInteger(expiry) || expiry <= now || expiry > now + RECORDER_TTL) return false
  const expected = createHmac('sha256', process.env.ADMIN_PASSWORD).update(`${version}.${expires}.${nonce}`).digest()
  const actual = Buffer.from(signature, 'base64url')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}
