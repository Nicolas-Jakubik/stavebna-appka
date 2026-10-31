/**
 * A next= query string is untrusted navigation input.
 * Return only a relative path under this application's origin.
 */
export function bezpecnaCestaPoPrihlaseni(next: string | null, origin: string): string {
  const fallback = '/dashboard'
  if (!next || next.length > 2048 || !next.startsWith('/') ||
      next.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(next)) {
    return fallback
  }
  try {
    const expected = new URL(origin)
    const parsed = new URL(next, expected)
    if (parsed.origin !== expected.origin || parsed.username || parsed.password ||
        (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')) return fallback
    return parsed.pathname + parsed.search + parsed.hash
  } catch {
    return fallback
  }
}
