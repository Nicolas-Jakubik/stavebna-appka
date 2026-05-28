'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { adminStore } from '../lib/store'

export default function Home() {
  const [meno, setMeno] = useState('')
  const [zakazka, setZakazka] = useState('')
  const [prichod, setPrichod] = useState('')
  const [odchod, setOdchod] = useState('')
  const [datum, setDatum] = useState('')
  const [status, setStatus] = useState('')

  const [aktivneZakazky, setAktivneZakazky] = useState<any[]>([])
  const [zoznamZamestnancov, setZoznamZamestnancov] = useState<any[]>([])

  useEffect(() => {
    adminStore.jeOdomknute = false
  }, [])

  useEffect(() => {
    async function nacitajData() {
      // Načítanie aktívnych zákaziek
      const { data: zakazkyData } = await supabase
        .from('zoznam_zakaziek')
        .select('nazov')
        .eq('stav', 'Aktívna')
        .order('nazov', { ascending: true })
      
      if (zakazkyData) setAktivneZakazky(zakazkyData)

      // Načítanie zamestnancov z tvojej novej tabuľky
      const { data: zamData } = await supabase
        .from('zamestnanci')
        .select('meno')
        .order('meno', { ascending: true })
      
      if (zamData) setZoznamZamestnancov(zamData)
    }
    nacitajData()
  }, [])

  async function odoslat(e: React.FormEvent) {
    e.preventDefault()
    setStatus('Odosielam...')
    
    const datumNaUlozenie = datum || new Date().toISOString().split('T')[0]

    const { error } = await supabase.from('dochadzka').insert([{ 
      meno, 
      zakazka, 
      prichod, 
      odchod, 
      datum: datumNaUlozenie
    }])

    if (error) {
      setStatus('Chyba: ' + error.message)
    } else {
      setStatus('✅ Záznam uložený')
      setMeno(''); setZakazka(''); setPrichod(''); setOdchod(''); setDatum('')
    }
  }

  const inputStyle = {
    padding: '12px 0',
    border: 'none',
    borderBottom: '1px solid #e5e7eb',
    width: '100%',
    fontSize: '16px',
    outline: 'none',
    marginBottom: '20px',
    backgroundColor: 'transparent',
    color: '#000000'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '350px', backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Image src="/logo.png" alt="Logo" width={150} height={60} style={{ objectFit: 'contain' }} />
        </div>

        <form onSubmit={odoslat} style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* VÝBER MENA CEZ ROLETKU Z DATABÁZY */}
          <select 
            value={meno} 
            onChange={e => setMeno(e.target.value)} 
            required 
            style={{ ...inputStyle, color: meno ? '#000000' : '#9ca3af' }}
          >
            <option value="" disabled>Vyberte svoje meno</option>
            {zoznamZamestnancov.map((z, i) => (
              <option key={i} value={z.meno} style={{ color: '#000000' }}>{z.meno}</option>
            ))}
          </select>
          
          {/* VÝBER ZÁKAZKY */}
          <select 
            value={zakazka} 
            onChange={e => setZakazka(e.target.value)} 
            required 
            style={{ ...inputStyle, color: zakazka ? '#000000' : '#9ca3af' }}
          >
            <option value="" disabled>Vyberte zákazku zo zoznamu</option>
            {aktivneZakazky.map((z, i) => (
              <option key={i} value={z.nazov} style={{ color: '#000000' }}>{z.nazov}</option>
            ))}
          </select>
          
          <input type="date" value={datum} onChange={e => setDatum(e.target.value)} style={{ ...inputStyle, color: datum ? '#000000' : '#9ca3af' }} />
          
          <div style={{ display: 'flex', gap: '20px' }}>
            <input type="time" value={prichod} onChange={e => setPrichod(e.target.value)} required style={inputStyle} />
            <input type="time" value={odchod} onChange={e => setOdchod(e.target.value)} required style={inputStyle} />
          </div>

          <button type="submit" style={{ marginTop: '20px', padding: '12px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '50px', fontWeight: '600', cursor: 'pointer' }}>
            Odoslať
          </button>
        </form>

        {status && <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>{status}</p>}
      </div>

      <div style={{ marginTop: '30px' }}>
        <Link href="/dashboard" style={{ color: '#d1d5db', fontSize: '13px', textDecoration: 'none' }}>Administrácia</Link>
      </div>
    </div>
  )
}