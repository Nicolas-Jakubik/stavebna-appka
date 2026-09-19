'use client'

import { FormEvent, useState } from 'react'

export default function AdminPrihlaseniePage() {
  const [heslo, setHeslo] = useState('')
  const [chyba, setChyba] = useState('')
  const [odosiela, setOdosiela] = useState(false)

  async function prihlasit(e: FormEvent) {
    e.preventDefault()
    if (odosiela) return

    setChyba('')
    setOdosiela(true)

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: heslo }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setChyba(data?.error || 'Prihlásenie sa nepodarilo.')
        setOdosiela(false)
        return
      }

      const params = new URLSearchParams(window.location.search)
      const next = params.get('next')
      window.location.assign(next && next.startsWith('/') ? next : '/dashboard')
    } catch {
      setChyba('Prihlásenie sa nepodarilo. Skúste to znova.')
      setOdosiela(false)
    }
  }

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'grid',
      placeItems: 'center',
      padding: '20px',
      backgroundColor: '#f5f5f7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '360px',
        padding: '28px 22px',
        borderRadius: '18px',
        backgroundColor: '#fff',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 10px 34px rgba(0,0,0,0.07)',
      }}>
        <div style={{ fontSize: '11px', color: '#86868b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Stavby Domy
        </div>
        <h1 style={{ margin: '6px 0 6px', fontSize: '27px', color: '#1d1d1f', letterSpacing: '-0.035em' }}>
          Administrácia
        </h1>
        <p style={{ margin: '0 0 22px', color: '#6e6e73', fontSize: '13px', lineHeight: 1.5 }}>
          Zadajte spoločné administračné heslo.
        </p>

        <form onSubmit={prihlasit}>
          <input
            type="password"
            autoComplete="current-password"
            value={heslo}
            onChange={e => setHeslo(e.target.value)}
            placeholder="Heslo"
            required
            autoFocus
            style={{
              width: '100%',
              minHeight: '50px',
              padding: '0 14px',
              border: '1px solid #d2d2d7',
              borderRadius: '12px',
              backgroundColor: '#fff',
              color: '#1d1d1f',
              fontSize: '16px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {chyba && (
            <div style={{ marginTop: '10px', color: '#b42318', fontSize: '12px', lineHeight: 1.4 }}>
              {chyba}
            </div>
          )}

          <button
            type="submit"
            disabled={odosiela}
            style={{
              width: '100%',
              minHeight: '50px',
              marginTop: '14px',
              border: 'none',
              borderRadius: '12px',
              backgroundColor: '#0071e3',
              color: '#fff',
              fontSize: '15px',
              fontWeight: '650',
              cursor: odosiela ? 'default' : 'pointer',
              opacity: odosiela ? 0.65 : 1,
            }}
          >
            {odosiela ? 'Prihlasujem...' : 'Vstúpiť'}
          </button>
        </form>
      </div>
    </main>
  )
}
