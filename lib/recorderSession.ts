import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto'

export const RECORDER_COOKIE = 'stavby_recorder_session'
// A short-lived private link activates the device once. The browser then uses
// a rolling, HttpOnly session on the ordinary company URL.
export const RECORDER_LINK_TTL = 2 * 24 * 60 * 60
export const RECORDER_TTL = 90 * 24 * 60 * 60
export const RECORDER_RENEW_BEFORE = 30 * 24 * 60 * 60

function getSecret() {
  // Separate secret allows recorder access to be revoked without changing the
  // admin password. Existing installations can use their established key.
  return process.env.RECORDER_SESSION_SECRET || process.env.ADMIN_PASSWORD || ''
}

function signToken(version: string, ttl: number, now: number) {
  const secret = getSecret()
  if (!secret) throw new Error('Recorder signing key is not configured')
  const payload = `${version}.${now + ttl}.${randomBytes(16).toString('hex')}`
  return `${payload}.${createHmac('sha256', secret).update(payload).digest('base64url')}`
}

function verifySignedToken(token: string | undefined, versionExpected: string, ttl: number, now: number) {
  const secret = getSecret()
  if (!token || token.length > 200 || !secret) return false
  const [version, expires, nonce, signature, ...extra] = token.split('.')
  if (extra.length || version !== versionExpected || !/^\d+$/.test(expires || '') ||
      !/^[a-f0-9]{32}$/.test(nonce || '') || !/^[A-Za-z0-9_-]{43}$/.test(signature || '')) return false
  const expiry = Number(expires)
  if (!Number.isSafeInteger(expiry) || expiry <= now || expiry > now + ttl) return false
  const expected = createHmac('sha256', secret).update(`${version}.${expires}.${nonce}`).digest()
  const actual = Buffer.from(signature, 'base64url')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

export function createRecorderActivationToken(now = Math.floor(Date.now() / 1000)) {
  return signToken('recorder-link-v1', RECORDER_LINK_TTL, now)
}

export function verifyRecorderActivationToken(token: string | undefined, now = Math.floor(Date.now() / 1000)) {
  return verifySignedToken(token, 'recorder-link-v1', RECORDER_LINK_TTL, now)
}

export function createRecorderToken(now = Math.floor(Date.now() / 1000)) {
  return signToken('recorder-v2', RECORDER_TTL, now)
}

export function verifyRecorderToken(token: string | undefined, now = Math.floor(Date.now() / 1000)) {
  return verifySignedToken(token, 'recorder-v2', RECORDER_TTL, now)
}

export function renewRecorderToken(token: string | undefined, now = Math.floor(Date.now() / 1000)) {
  if (!verifyRecorderToken(token, now)) return null
  const expires = Number(token!.split('.')[1])
  // Visit the existing bookmarked URL to extend a valid session before expiry.
  // An expired/forged token can never be renewed.
  return expires - now <= RECORDER_RENEW_BEFORE ? createRecorderToken(now) : null
}
