'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Image from 'next/image'
import Link from 'next/link'
import { adminStore } from '../lib/store'

export default function Home() {
  // Zmena: Namiesto jedného mena ukladáme pole vybraných mien
  const [vybraneMena, setVybraneMena] = useState<string[]>([])
  const [zakazka, setZakazka] = useState('')
  const [prichod, setPrichod] = useState('')
  const [odchod, setOdchod] = useState('')
  const [datum, setDatum] = useState('')
  const [status, setStatus] = useState('')
  
  const [zobrazitPotvrdenie, setZobrazitPotvrdenie] = useState(false)

  const [aktivneZakazky, setAktivneZakazky] = useState<any[]>([])
  const [zoznamZamestnancov, setZoznamZamestnancov] = useState<any[]>([])

  useEffect(() => {
    adminStore.jeOdomknute = false
  }, [])

  useEffect(() => {
    async function nacitajData() {
      const { data: zakazkyData } = await supabase
        .from('zoznam_zakaziek')
        .select('nazov')
        .eq('stav', 'Aktívna')
        .order('nazov', { ascending: true })
      
      if (zakazkyData) setAktivneZakazky(zakazkyData)

      const { data: zamData } = await supabase
        .from('zamestnanci')
        .select('meno')
        .order('meno', { ascending: true })
      
      if (zamData) setZoznamZamestnancov(zamData)
    }
    nacitajData()
  }, [])

  // Pridaná kontrola, či je vybraný aspoň jeden zamestnanec
  function otvoritKontrolu(e: React.FormEvent) {
    e.preventDefault()
    if (vybraneMena.length === 0) {
      setStatus('⚠️ Vyberte aspoň jedného zamestnanca')
      setTimeout(() => setStatus(''), 3000)
      return
    }
    setZobrazitPotvrdenie(true)
  }

  // Uloženie pre všetkých vybraných zamestnancov
  async function potvrditAOdoslat() {
    setStatus('Odosielam...')
    setZobrazitPotvrdenie(false)
    
    const datumNaUlozenie = datum || new Date().toISOString().split('T')[0]

    // Vytvoríme pole záznamov (pre každého označeného zamestnanca jeden)
    const zaznamyNaUlozenie = vybraneMena.map(meno => ({
      meno, 
      zakazka, 
      prichod, 
      odchod, 
      datum: datumNaUlozenie
    }))

    // Supabase dokáže vložiť celé pole naraz (Bulk insert)
    const { error } = await supabase.from('dochadzka').insert(zaznamyNaUlozenie)

    if (error) {
      setStatus('Chyba: ' + error.message)
    } else {
      setStatus(`✅ Záznam uložený pre ${vybraneMena.length} zamestnancov`)
      // Zresetujeme formulár
      setVybraneMena([])
      setZakazka('')
      setPrichod('')
      setOdchod('')
      setDatum('')
      
      setTimeout(() => {
        setStatus('')
      }, 4000)
    }
  }

  // Funkcia na prepínanie výberu zamestnanca (pridá/odoberie z poľa)
  function toggleZamestnanec(meno: string) {
    setVybraneMena(prev => 
      prev.includes(meno) 
        ? prev.filter(m => m !== meno) 
        : [...prev, meno]
    )
  }

  function vypocitajTrvanie(odCasu: string, doCasu: string) {
    if (!odCasu || !doCasu) return '0 h'
    const [h1, m1] = odCasu.split(':').map(Number)
    const [h2, m2] = doCasu.split(':').map(Number)
    
    let rozdielMinut = (h2 * 60 + m2) - (h1 * 60 + m1)
    if (rozdielMinut < 0) rozdielMinut += 24 * 60 
    
    const hodiny = Math.floor(rozdielMinut / 60)
    const minuty = rozdielMinut % 60
    
    if (minuty === 0) return `${hodiny} h`
    return `${hodiny} h ${minuty} m`
  }

  function formatujDatum(d: string) {
    const datumPreFormat = d || new Date().toISOString().split('T')[0]
    const [rok, mesiac, den] = datumPreFormat.split('-')
    return `${den}. ${mesiac}. ${rok}`
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
    color: '#000000',
    minHeight: '45px',
    display: 'flex',
    alignItems: 'center'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', padding: '20px', fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 0.6;
        }
        input[type="date"], input[type="time"] {
          -webkit-appearance: none;
          appearance: none;
        }
      `}</style>

      {/* --- MODAL --- */}
      {zobrazitPotvrdenie && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '30px 24px',
            width: '100%',
            maxWidth: '340px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#1d1d1f' }}>Skontrolujte si údaje</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', backgroundColor: '#f5f5f7', padding: '16px', borderRadius: '14px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
                <span style={{ color: '#86868b' }}>Zamestnanci ({vybraneMena.length}):</span>
                <span style={{ fontWeight: '500', color: '#0071e3', lineHeight: '1.4' }}>
                  {vybraneMena.join(', ')}
                </span>
              </div>
              <div style={{ height: '1px', backgroundColor: '#d2d2d7', margin: '4px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#86868b' }}>Zákazka:</span>
                <span style={{ fontWeight: '500', color: '#1d1d1f', textAlign: 'right', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{zakazka}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#86868b' }}>Dátum:</span>
                <span style={{ fontWeight: '500', color: '#1d1d1f' }}>{formatujDatum(datum)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#86868b' }}>Čas:</span>
                <span style={{ fontWeight: '500', color: '#1d1d1f' }}>{prichod} - {odchod}</span>
              </div>
              <div style={{ height: '1px', backgroundColor: '#d2d2d7', margin: '4px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                <span style={{ color: '#1d1d1f', fontWeight: '600' }}>Spolu (na osobu):</span>
                <span style={{ fontWeight: '600', color: '#1d1d1f' }}>{vypocitajTrvanie(prichod, odchod)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button 
                onClick={potvrditAOdoslat}
                style={{ width: '100%', padding: '14px', backgroundColor: '#0071e3', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}
              >
                Potvrdiť a odoslať
              </button>
              <button 
                onClick={() => setZobrazitPotvrdenie(false)}
                style={{ width: '100%', padding: '14px', backgroundColor: 'transparent', color: '#86868b', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}
              >
                Späť na úpravu
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- KONIEC MODALU --- */}

      <div style={{ width: '100%', maxWidth: '380px', backgroundColor: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Image src="/logo.png" alt="Logo" width={150} height={60} style={{ objectFit: 'contain' }} />
        </div>

        <form onSubmit={otvoritKontrolu} style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* Výber zamestnancov pomocou "bublín" (Chips) */}
          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }}>
              Zamestnanci (vyberte viacerých)
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {zoznamZamestnancov.map((z, i) => {
                const isSelected = vybraneMena.includes(z.meno)
                return (
                  <div 
                    key={i}
                    onClick={() => toggleZamestnanec(z.meno)}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: isSelected ? '#0071e3' : '#f5f5f7',
                      color: isSelected ? '#ffffff' : '#1d1d1f',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: isSelected ? '600' : '400',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      userSelect: 'none',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    {z.meno}
                  </div>
                )
              })}
            </div>
          </div>
          
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
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '20px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dátum (ak iný ako dnes)</span>
            <input type="date" value={datum} onChange={e => setDatum(e.target.value)} style={{ ...inputStyle, marginBottom: '0', color: '#000000' }} />
          </div>
          
          <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Príchod</span>
              <input type="time" value={prichod} onChange={e => setPrichod(e.target.value)} required style={{ ...inputStyle, marginBottom: '0', color: '#000000' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Odchod</span>
              <input type="time" value={odchod} onChange={e => setOdchod(e.target.value)} required style={{ ...inputStyle, marginBottom: '0', color: '#000000' }} />
            </div>
          </div>

          <button type="submit" style={{ marginTop: '10px', padding: '14px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '50px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' }}>
            Odoslať záznam
          </button>
        </form>

        {status && (
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', fontWeight: '500', color: status.includes('✅') ? '#34c759' : '#ff3b30' }}>
            {status}
          </div>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <Link href="/dashboard" style={{ color: '#d1d5db', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}>Administrácia</Link>
      </div>
    </div>
  )
}