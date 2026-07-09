'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { adminStore } from '../../lib/store'

export default function ZamestnanciPage() {
  const [zadaneHeslo, setZadaneHeslo] = useState('')
  const [jeOdomknute, setJeOdomknute] = useState(adminStore.jeOdomknute)
  const [chybaHesla, setChybaHesla] = useState(false)
  const SPRAVNE_HESLO = 'sef123'

  const [zamestnanci, setZamestnanci] = useState<any[]>([])
  
  const [noveMeno, setNoveMeno] = useState('')
  const [novaSadzba, setNovaSadzba] = useState('')
  const [pridavaSa, setPridavaSa] = useState(false)

  const [upravovaneId, setUpravovaneId] = useState<string | null>(null)
  const [upravovaneMeno, setUpravovaneMeno] = useState('')
  const [upravovanaSadzba, setUpravovanaSadzba] = useState('')

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

  async function nacitajZamestnancov() {
    const { data, error } = await supabase
      .from('zamestnanci')
      .select('*')
      .order('meno', { ascending: true })

    if (error) console.error("Chyba načítania zamestnancov:", error)
    else setZamestnanci(data || [])
  }

  async function pridatZamestnanca(e: React.FormEvent) {
    e.preventDefault()
    if (!noveMeno.trim()) return

    setPridavaSa(true)
    const sadzbaCislo = parseFloat(novaSadzba) || 0

    const { error } = await supabase
      .from('zamestnanci')
      .insert([{ meno: noveMeno.trim(), sadzba: sadzbaCislo }])
    
    setPridavaSa(false)

    if (error) {
      console.error("Chyba pridávania:", error)
      alert("Chyba pri pridávaní zamestnanca.")
    } else {
      setNoveMeno('')
      setNovaSadzba('')
      nacitajZamestnancov()
    }
  }

  async function vymazatZamestnanca(id: string, meno: string) {
    if (!confirm(`Naozaj vymazať "${meno}"? (Dochádzka ostane zachovaná)`)) return
    
    const { error } = await supabase
      .from('zamestnanci')
      .delete()
      .eq('id', id)

    if (error) console.error("Chyba mazania:", error)
    else nacitajZamestnancov()
  }

  function zacatUpravu(id: string, aktualneMeno: string, aktualnaSadzba: string) {
    setUpravovaneId(id)
    setUpravovaneMeno(aktualneMeno)
    setUpravovanaSadzba(aktualnaSadzba || '0')
  }

  function zrusitUpravu() {
    setUpravovaneId(null)
    setUpravovaneMeno('')
    setUpravovanaSadzba('')
  }

  async function ulozitUpravu(id: string) {
    if (!upravovaneMeno.trim()) {
      zrusitUpravu()
      return
    }

    const sadzbaCislo = parseFloat(upravovanaSadzba) || 0

    const { error } = await supabase
      .from('zamestnanci')
      .update({ meno: upravovaneMeno.trim(), sadzba: sadzbaCislo })
      .eq('id', id)

    if (error) {
      console.error("Chyba úpravy:", error)
    } else {
      zrusitUpravu()
      nacitajZamestnancov()
    }
  }

  useEffect(() => {
    if (jeOdomknute) {
      nacitajZamestnancov()
    }
  }, [jeOdomknute])

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fbfbfd', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <h2 style={{ color: '#1d1d1f', marginBottom: '20px', fontSize: '26px', fontWeight: '600', letterSpacing: '-0.003em', margin: '0 0 20px 0' }}>Zamestnanci</h2>
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
          <Link href="/zakazky" style={{ textDecoration: 'none', color: '#86868b', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Stavby</Link>
          <Link href="/zamestnanci" style={{ textDecoration: 'none', color: '#1d1d1f', fontWeight: '600', fontSize: '13px', borderBottom: '2px solid #0071e3', paddingBottom: '2px' }}>Zamestnanci</Link>
          <Link href="/mzdy" style={{ textDecoration: 'none', color: '#86868b', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Výplaty</Link>
          <button onClick={() => { adminStore.jeOdomknute = false; setJeOdomknute(false); }} style={{ border: 'none', background: 'none', color: '#86868b', marginLeft: 'auto', cursor: 'pointer', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Odhlásiť sa</button>
        </div>

        <div style={{...cardStyle, marginBottom: '24px'}}>
          <form onSubmit={pridatZamestnanca}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ minWidth: 0 }}>
                <label style={labelStyle}>Meno</label>
                <input 
                  type="text" 
                  placeholder="Meno a priezvisko" 
                  value={noveMeno} 
                  onChange={(e) => setNoveMeno(e.target.value)} 
                  required 
                  style={{...inputStyle, fontSize: '13px'}}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={labelStyle}>Sadzba</label>
                <input 
                  type="number" 
                  placeholder="€/h" 
                  value={novaSadzba} 
                  onChange={(e) => setNovaSadzba(e.target.value)} 
                  required 
                  step="0.1" 
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

        <div style={{...cardStyle}}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #d2d2d7' }}>
                <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Meno</th>
                <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', width: '100px', textAlign: 'center' }}>Sadzba</th>
                <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', width: '140px', textAlign: 'right' }}>Akcia</th>
              </tr>
            </thead>
            <tbody>
              {zamestnanci.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '20px 0', color: '#d2d2d7', textAlign: 'center', fontSize: '12px' }}>Žiadni zamestnanci.</td></tr>
              ) : (
                zamestnanci.map((z) => (
                  <tr key={z.id} style={{ borderBottom: '1px solid #f5f5f7' }}>
                    <td style={{ padding: '10px 0', color: '#1d1d1f', fontWeight: '500' }}>
                      {upravovaneId === z.id ? (
                        <input 
                          type="text" 
                          value={upravovaneMeno} 
                          onChange={(e) => setUpravovaneMeno(e.target.value)} 
                          autoFocus 
                          style={{...inputStyle, maxWidth: '200px', fontSize: '12px'}}
                        />
                      ) : (
                        z.meno
                      )}
                    </td>
                    <td style={{ padding: '10px 0', color: '#1d1d1f', textAlign: 'center', fontWeight: '500' }}>
                      {upravovaneId === z.id ? (
                        <input 
                          type="number" 
                          value={upravovanaSadzba} 
                          onChange={(e) => setUpravovanaSadzba(e.target.value)} 
                          step="0.1" 
                          style={{...inputStyle, width: '80px', fontSize: '12px'}}
                        />
                      ) : (
                        `${z.sadzba || 0} €`
                      )}
                    </td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}>
                      {upravovaneId === z.id ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => zrusitUpravu()} 
                            style={{ color: '#86868b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}
                          >
                            Zrušiť
                          </button>
                          <button 
                            onClick={() => ulozitUpravu(z.id)} 
                            style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#059669'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#10b981'}
                          >
                            Uložiť
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => zacatUpravu(z.id, z.meno, z.sadzba)} 
                            style={{ color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#0077ed'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#0071e3'}
                          >
                            Upraviť
                          </button>
                          <button 
                            onClick={() => vymazatZamestnanca(z.id, z.meno)} 
                            style={{ color: '#d2d2d7', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#ff3b30'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#d2d2d7'}
                          >
                            Zmazať
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}