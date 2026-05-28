'use client'
import { useState } from 'react'

export default function PasswordProtect({ children }: { children: React.ReactNode }) {
  const [heslo, setHeslo] = useState('')
  const [autentifikovany, setAutentifikovany] = useState(false)

  if (autentifikovany) return <>{children}</>

  return (
    <div style={{ padding: '50px', textAlign: 'center' }}>
      <h1>Administrácia</h1>
      <input 
        type="password" 
        value={heslo} 
        onChange={(e) => setHeslo(e.target.value)}
        placeholder="Zadaj heslo"
        style={{ padding: '10px' }}
      />
      <button 
        onClick={() => { if (heslo === '140720') setAutentifikovany(true) }}
        style={{ padding: '10px 20px', marginLeft: '10px' }}
      >
        Vstúpiť
      </button>
    </div>
  )
}