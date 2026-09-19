export const ADMIN_COOKIE = 'stavby_admin_session'
const SESSION_TTL_SECONDS = 12 * 60 * 60

function getSecret() {
  return process.env.ADMIN_PASSWORD || ''
}

function toBase64Url(bytes: Uint8Array) {
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(normalized + padding)
  return Uint8Array.from(binary, char => char.charCodeAt(0))
}

async function getKey() {
  const secret = getSecret()
  if (!secret) return null

  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  )
}

export function isAdminPasswordConfigured() {
  return Boolean(getSecret())
}

export function isCorrectAdminPassword(password: string) {
  const expected = getSecret()
  return Boolean(expected) && password === expected
}

export async function createAdminSession() {
  const key = await getKey()
  if (!key) throw new Error('ADMIN_PASSWORD is not configured')

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  const payload = `v1.${expiresAt}`
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))

  return {
    value: `${payload}.${toBase64Url(new Uint8Array(signature))}`,
    maxAge: SESSION_TTL_SECONDS,
  }
}

export async function verifyAdminSession(value?: string | null) {
  if (!value) return false

  const [version, expiresText, signatureText, ...extra] = value.split('.')
  if (extra.length > 0 || version !== 'v1' || !expiresText || !signatureText) return false

  const expiresAt = Number(expiresText)
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) return false

  const key = await getKey()
  if (!key) return false

  try {
    return crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signatureText),
      new TextEncoder().encode(`${version}.${expiresText}`)
    )
  } catch {
    return false
  }
}
