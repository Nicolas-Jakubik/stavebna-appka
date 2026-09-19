'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
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
    <div className="simple-admin-shell" style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f7',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#1d1d1f',
      display: 'flex',
      gap: '24px',
      alignItems: 'flex-start'
    }}>
      <style>{`
        @media (max-width: 1024px) {
          .simple-admin-shell {
            padding:
              calc(64px + env(safe-area-inset-top))
              max(12px, env(safe-area-inset-right))
              calc(20px + env(safe-area-inset-bottom))
              max(12px, env(safe-area-inset-left)) !important;
            display: block !important;
          }

          .simple-admin-content {
            max-width: 100% !important;
          }

          .simple-admin-form-grid {
            grid-template-columns: 1fr !important;
          }

          .simple-admin-form-grid button {
            width: 100% !important;
            min-height: 44px;
          }
        }

        @media (max-width: 600px) {
          .simple-admin-card {
            overflow: visible !important;
          }

          .simple-mobile-table {
            display: block;
            width: 100% !important;
          }

          .simple-mobile-table thead {
            display: none;
          }

          .simple-mobile-table tbody {
            display: grid;
            gap: 10px;
          }

          .simple-mobile-table tr.simple-mobile-row {
            display: block;
            border: 1px solid #e5e5e7 !important;
            border-radius: 14px;
            overflow: hidden;
            background: #fff;
          }

          .simple-mobile-table td.simple-mobile-cell {
            display: grid;
            grid-template-columns: 82px minmax(0, 1fr);
            gap: 10px;
            align-items: center;
            min-height: 44px;
            padding: 9px 12px !important;
            border-bottom: 1px solid rgba(0,0,0,0.055);
            text-align: left !important;
          }

          .simple-mobile-table td.simple-mobile-cell:last-child {
            border-bottom: none;
          }

          .simple-mobile-table td.simple-mobile-cell::before {
            content: attr(data-label);
            color: #86868b;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.45px;
          }

          .simple-mobile-table td.simple-mobile-actions > div {
            justify-content: flex-start !important;
            flex-wrap: wrap;
          }

          .simple-mobile-table td.simple-mobile-actions button {
            min-height: 38px;
            padding: 8px 10px !important;
          }

          .simple-mobile-table input {
            width: 100% !important;
            max-width: none !important;
            min-height: 40px;
          }

          .simple-empty-row {
            display: table-row !important;
            border: none !important;
          }

          .simple-empty-cell {
            display: table-cell !important;
            border: none !important;
          }

          .simple-empty-cell::before {
            display: none !important;
          }
        }
      `}</style>

      <AdminSidebar
        active="zamestnanci"
        onLogout={() => { adminStore.jeOdomknute = false; setJeOdomknute(false) }}
      />

      <div className="simple-admin-content" style={{ width: '100%', flex: 1, minWidth: 0, maxWidth: '1540px', margin: '0 auto' }}>
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Firemná administrácia
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', lineHeight: '1.1', letterSpacing: '-0.035em', color: '#1d1d1f', fontWeight: '700' }}>
            Zamestnanci
          </h1>
          <div style={{ fontSize: '11px', color: '#86868b', marginTop: '5px' }}>
            Pracovníci, hodinové sadzby a základná správa tímu.
          </div>
        </div>

        <div style={{...cardStyle, marginBottom: '24px'}}>
          <form onSubmit={pridatZamestnanca}>
            <div className="simple-admin-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: '10px', alignItems: 'flex-end' }}>
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

        <div className="simple-admin-card" style={{...cardStyle, overflowX: 'auto'}}>
          <table className="simple-mobile-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #d2d2d7' }}>
                <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Meno</th>
                <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', width: '100px', textAlign: 'center' }}>Sadzba</th>
                <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', width: '140px', textAlign: 'right' }}>Akcia</th>
              </tr>
            </thead>
            <tbody>
              {zamestnanci.length === 0 ? (
                <tr className="simple-empty-row"><td className="simple-empty-cell" colSpan={3} style={{ padding: '20px 0', color: '#d2d2d7', textAlign: 'center', fontSize: '12px' }}>Žiadni zamestnanci.</td></tr>
              ) : (
                zamestnanci.map((z) => (
                  <tr key={z.id} className="simple-mobile-row" style={{ borderBottom: '1px solid #f5f5f7' }}>
                    <td className="simple-mobile-cell" data-label="Meno" style={{ padding: '10px 0', color: '#1d1d1f', fontWeight: '500' }}>
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
                    <td className="simple-mobile-cell" data-label="Sadzba" style={{ padding: '10px 0', color: '#1d1d1f', textAlign: 'center', fontWeight: '500' }}>
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
                    <td className="simple-mobile-cell simple-mobile-actions" data-label="Akcia" style={{ padding: '10px 0', textAlign: 'right' }}>
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