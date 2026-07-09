'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { adminStore } from '../../lib/store'

export default function ZakazkyPage() {
  const [zadaneHeslo, setZadaneHeslo] = useState('')
  const [jeOdomknute, setJeOdomknute] = useState(adminStore.jeOdomknute)
  const [chybaHesla, setChybaHesla] = useState(false)
  const SPRAVNE_HESLO = 'sef123'

  const [zakazky, setZakazky] = useState<any[]>([])
  const [novyNazov, setNovyNazov] = useState('')
  const [pridavaSa, setPridavaSa] = useState(false)

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '14px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    border: '1px solid rgba(0,0,0,0.08)'
  }

  const inputStyle = { 
    padding: '8px 10px', 
    borderRadius: '8px',
    border: '1px solid #d2d2d7', 
    outline: 'none', 
    fontSize: '12px', 
    width: '100%', 
    backgroundColor: '#f5f5f7',
    color: '#1d1d1f',
    fontFamily: 'inherit',
    transition: 'all 0.2s',
    boxSizing: 'border-box' as const
  }
  
  const labelStyle = { 
    display: 'block', 
    fontSize: '10px', 
    color: '#86868b', 
    marginBottom: '4px', 
    textTransform: 'uppercase' as const, 
    letterSpacing: '0.5px',
    fontWeight: '500'
  }

  const buttonPrimaryStyle = {
    padding: '8px 18px',
    backgroundColor: '#0071e3',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.6px',
    fontWeight: '500',
    borderRadius: '98px',
    transition: 'all 0.2s',
  }

  const buttonSecondaryStyle = {
    padding: '8px 18px',
    backgroundColor: '#f5f5f7',
    color: '#1d1d1f',
    border: '1px solid #d2d2d7',
    cursor: 'pointer',
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.6px',
    fontWeight: '500',
    borderRadius: '98px',
    transition: 'all 0.2s',
  }

  function skontrolovatHeslo(e: React.FormEvent) {
    e.preventDefault()
    if (zadaneHeslo === SPRAVNE_HESLO) {
      adminStore.jeOdomknute = true
      setJeOdomknute(true)
      setChybaHesla(false)
    } else {
      setChybaHesla(true)
    }
  }

  async function nacitajZakazky() {
    const { data, error } = await supabase
      .from('zoznam_zakaziek')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Chyba načítania zákaziek:", error)
    } else {
      setZakazky(data || [])
    }
  }

  async function pridatZakazku(e: React.FormEvent) {
    e.preventDefault()
    if (!novyNazov.trim()) return

    setPridavaSa(true)
    const dnesnyDatum = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('zoznam_zakaziek')
      .insert([{ nazov: novyNazov, stav: 'Aktívna', datum_pridania: dnesnyDatum }])
    setPridavaSa(false)

    if (error) {
      console.error("Chyba:", error)
      alert("Chyba pri pridávaní zákazky.")
    } else {
      setNovyNazov('')
      nacitajZakazky()
    }
  }

  async function zmenitStav(id: string, novyStav: string) {
    const { error } = await supabase
      .from('zoznam_zakaziek')
      .update({ stav: novyStav })
      .eq('id', id)

    if (error) {
      console.error("Chyba úpravy:", error)
    } else {
      nacitajZakazky()
    }
  }

  async function vymazatZakazku(id: string) {
    if (!confirm('Naozaj vymazať túto zákazku? (Dochádzka sa nezmažuje)')) return
    
    const { error } = await supabase
      .from('zoznam_zakaziek')
      .delete()
      .eq('id', id)

    if (error) {
      console.error("Chyba mazania:", error)
    } else {
      nacitajZakazky()
    }
  }

  useEffect(() => {
    if (jeOdomknute) {
      nacitajZakazky()
    }
  }, [jeOdomknute])

  const aktivneZakazky = zakazky.filter(z => z.stav !== 'Dokončená')
  const dokonceneZakazky = zakazky.filter(z => z.stav === 'Dokončená')

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fbfbfd', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <h2 style={{ color: '#1d1d1f', marginBottom: '20px', fontSize: '26px', fontWeight: '600', letterSpacing: '-0.003em', margin: '0 0 20px 0' }}>Stavby</h2>
            <form onSubmit={skontrolovatHeslo}>
              <input 
                type="password" 
                placeholder="Heslo" 
                value={zadaneHeslo} 
                onChange={e => setZadaneHeslo(e.target.value)} 
                required 
                style={{ ...inputStyle, marginBottom: '14px', textAlign: 'center' }}
              />
              {chybaHesla && <p style={{ color: '#ff3b30', fontSize: '11px', marginBottom: '12px' }}>Nesprávne heslo.</p>}
              <button 
                type="submit" 
                style={{ ...buttonPrimaryStyle, width: '100%' } as any}
                onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = '#0077ed'}
                onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = '#0071e3'}
              >
                Vstúpiť
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fbfbfd', padding: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#1d1d1f' }}>
      <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', gap: '20px', paddingBottom: '14px', marginBottom: '24px', borderBottom: '1px solid #e5e5e5', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: '#86868b', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Dochádzka</Link>
          <Link href="/zakazky" style={{ textDecoration: 'none', color: '#1d1d1f', fontWeight: '600', fontSize: '13px', borderBottom: '2px solid #0071e3', paddingBottom: '2px' }}>Stavby</Link>
          <Link href="/zamestnanci" style={{ textDecoration: 'none', color: '#86868b', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Zamestnanci</Link>
          <Link href="/mzdy" style={{ textDecoration: 'none', color: '#86868b', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Výplaty</Link>
          <button onClick={() => { adminStore.jeOdomknute = false; setJeOdomknute(false); }} style={{ border: 'none', background: 'none', color: '#86868b', marginLeft: 'auto', cursor: 'pointer', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Odhlásiť sa</button>
        </div>

        <div style={{...cardStyle, marginBottom: '24px'}}>
          <form onSubmit={pridatZakazku}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ minWidth: 0 }}>
                <label style={labelStyle}>Nová stavba</label>
                <input 
                  type="text" 
                  placeholder="Názov (napr. Bytovka Bratislava)" 
                  value={novyNazov} 
                  onChange={(e) => setNovyNazov(e.target.value)} 
                  required 
                  style={{...inputStyle, fontSize: '13px'}}
                />
              </div>
              <button 
                type="submit" 
                disabled={pridavaSa} 
                style={{ ...buttonPrimaryStyle, minWidth: '100px' } as any}
                onMouseEnter={(e) => !pridavaSa && ((e.currentTarget as any).style.backgroundColor = '#0077ed')}
                onMouseLeave={(e) => !pridavaSa && ((e.currentTarget as any).style.backgroundColor = '#0071e3')}
              >
                {pridavaSa ? 'Pridávam...' : '+ Pridať'}
              </button>
            </div>
          </form>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ color: '#1d1d1f', margin: '0 0 16px 0', fontSize: '16px', borderBottom: '2px solid #1d1d1f', paddingBottom: '8px', width: 'fit-content', fontWeight: '600' }}>
            Aktívne stavby ({aktivneZakazky.length})
          </h3>
          <div style={{...cardStyle}}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #d2d2d7' }}>
                  <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Stavba</th>
                  <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', width: '140px' }}>Stav</th>
                  <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'right', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {aktivneZakazky.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: '20px 0', color: '#d2d2d7', textAlign: 'center', fontSize: '12px' }}>Žiadne aktívne stavby.</td></tr>
                ) : (
                  aktivneZakazky.map((zak) => (
                    <tr key={zak.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                      <td style={{ padding: '10px 0', color: '#1d1d1f', fontWeight: '500' }}>{zak.nazov}</td>
                      <td style={{ padding: '10px 0' }}>
                        <select 
                          value={zak.stav || 'Aktívna'} 
                          onChange={(e) => zmenitStav(zak.id, e.target.value)} 
                          style={{ padding: '6px 10px', border: '1px solid #10b981', borderRadius: '6px', color: '#047857', backgroundColor: '#ecfdf5', outline: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
                        >
                          <option value="Aktívna">Aktívna</option>
                          <option value="Dokončená">Dokončená</option>
                        </select>
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right' }}>
                        <button 
                          onClick={() => vymazatZakazku(zak.id)} 
                          style={{ color: '#d2d2d7', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'color 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ff3b30'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#d2d2d7'}
                        >
                          Zmazať
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 style={{ color: '#6b7280', margin: '0 0 16px 0', fontSize: '16px', borderBottom: '2px solid #d1d5db', paddingBottom: '8px', width: 'fit-content', fontWeight: '600' }}>
            Dokončené stavby ({dokonceneZakazky.length})
          </h3>
          <div style={{...cardStyle, opacity: 0.8}}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #d2d2d7' }}>
                  <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Stavba</th>
                  <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', width: '140px' }}>Stav</th>
                  <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'right', width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {dokonceneZakazky.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: '20px 0', color: '#d2d2d7', textAlign: 'center', fontSize: '12px' }}>Žiadne dokončené stavby.</td></tr>
                ) : (
                  dokonceneZakazky.map((zak) => (
                    <tr key={zak.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                      <td style={{ padding: '10px 0', color: '#9ca3af', fontWeight: '500', textDecoration: 'line-through' }}>{zak.nazov}</td>
                      <td style={{ padding: '10px 0' }}>
                        <select 
                          value={zak.stav || 'Dokončená'} 
                          onChange={(e) => zmenitStav(zak.id, e.target.value)} 
                          style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', color: '#6b7280', backgroundColor: '#f3f4f6', outline: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}
                        >
                          <option value="Aktívna">Aktívna</option>
                          <option value="Dokončená">Dokončená</option>
                        </select>
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'right' }}>
                        <button 
                          onClick={() => vymazatZakazku(zak.id)} 
                          style={{ color: '#d2d2d7', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'color 0.2s' }}
                          onMouseEnter={(e) => e.currentTarget.style.color = '#ff3b30'}
                          onMouseLeave={(e) => e.currentTarget.style.color = '#d2d2d7'}
                        >
                          Zmazať
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}