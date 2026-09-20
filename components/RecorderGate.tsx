'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function RecorderGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<'loading' | 'ready' | 'denied' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let cancelled = false
    async function check() {
      try {
        const token = new URLSearchParams(window.location.hash.slice(1)).get('zapis')
        const response = await fetch('/api/recorder/session', token ? {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }), cache: 'no-store',
        } : { cache: 'no-store' })
        if (response.ok && token) window.history.replaceState(null, '', window.location.pathname + window.location.search)
        if (!cancelled) setState(response.ok ? 'ready' : response.status === 401 ? 'denied' : 'error')
      } catch { if (!cancelled) setState('error') }
    }
    check()
    return () => { cancelled = true }
  }, [retry])
  if (state === 'ready') return children
  return <main style={{ maxWidth: 480, margin: '15vh auto', padding: 24, color: '#1d1d1f' }}>
    <h1 style={{ fontSize: 24, fontWeight: 650 }}>Zapisovanie hodín</h1>
    <p style={{ margin: '16px 0', lineHeight: 1.6 }}>
      {state === 'loading' ? 'Overujem prístup…' : state === 'denied'
        ? 'Otvorte súkromný odkaz od správcu. Ak jeho platnosť skončila, požiadajte o nový.'
        : 'Prístup sa nepodarilo overiť. Skontrolujte pripojenie a skúste to znova.'}
    </p>
    {state === 'error' && <button onClick={() => { setState('loading'); setRetry(n => n + 1) }} style={{ minHeight: 44, marginRight: 16 }}>Skúsiť znova</button>}
    <Link href="/admin-prihlasenie">Prihlásenie do administrácie</Link>
  </main>
}
