'use client'
import { useState } from 'react'

export default function RecorderLink() {
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  async function createLink() {
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/admin/recorder-link', { method: 'POST' })
      if (response.status === 401) { window.location.assign('/admin-prihlasenie'); return }
      if (!response.ok) throw new Error('Odkaz sa nepodarilo vytvoriť.')
      const data = await response.json()
      setLink(data.link)
      try { await navigator.clipboard.writeText(data.link); setMessage('Odkaz skopírovaný. Platí 30 dní.') }
      catch { setMessage('Odkaz je pripravený. Skopírujte ho z poľa.') }
    } catch { setMessage('Odkaz sa nepodarilo vytvoriť. Skúste to znova.') }
    finally { setBusy(false) }
  }
  return <div style={{ padding: '12px 0', fontSize: 12 }}>
    <button onClick={createLink} disabled={busy} style={{ width: '100%', minHeight: 44, padding: 8, border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer' }}>
      {busy ? 'Pripravujem…' : 'Odkaz pre zapisovateľa'}
    </button>
    {message && <p role="status" style={{ marginTop: 8 }}>{message}</p>}
    {link && <>
      <input aria-label="Súkromný odkaz pre zapisovateľa" readOnly value={link} onFocus={e => e.target.select()} style={{ width: '100%', minHeight: 44, marginTop: 8 }} />
      <p style={{ marginTop: 8, lineHeight: 1.5 }}>Pošlite ho iba zapisovateľovi. Uvidí mená, stavby a dochádzku; sadzby ani mazanie mu odkaz nesprístupní.</p>
    </>}
  </div>
}
