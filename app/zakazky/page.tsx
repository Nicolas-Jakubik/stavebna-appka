'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import { adminStore } from '../../lib/store'

export default function ZakazkyPage() {
  const [zadaneHeslo, setZadaneHeslo] = useState('')
  const [jeOdomknute, setJeOdomknute] = useState(adminStore.jeOdomknute)
  const [chybaHesla, setChybaHesla] = useState(false)
  const SPRAVNE_HESLO = 'sef123'

  const [zakazky, setZakazky] = useState<any[]>([])
  const [novyNazov, setNovyNazov] = useState('')
  const [pridavaSa, setPridavaSa] = useState(false)
  const [hladat, setHladat] = useState('')
  const [filterStav, setFilterStav] = useState<'vsetky' | 'aktivne' | 'dokoncene'>('vsetky')
  const [zoradenie, setZoradenie] = useState<'najnovsie' | 'najstarsie' | 'az'>('najnovsie')

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
  const hladanyText = hladat.trim().toLocaleLowerCase('sk')
  const filtrujPodlaNazvu = (zoznam: any[]) =>
    hladanyText ? zoznam.filter(z => String(z.nazov || '').toLocaleLowerCase('sk').includes(hladanyText)) : zoznam

  const datumZakazky = (zak: any) => String(zak.datum_pridania || zak.created_at || '')
  const zoradZakazky = (zoznam: any[]) => [...zoznam].sort((a, b) => {
    if (zoradenie === 'az') return String(a.nazov || '').localeCompare(String(b.nazov || ''), 'sk')
    const datumA = datumZakazky(a)
    const datumB = datumZakazky(b)
    return zoradenie === 'najstarsie' ? datumA.localeCompare(datumB) : datumB.localeCompare(datumA)
  })
  const formatujDatumPridania = (zak: any) => {
    const hodnota = datumZakazky(zak)
    if (!hodnota) return '—'
    const datum = new Date(hodnota)
    return Number.isNaN(datum.getTime()) ? hodnota : datum.toLocaleDateString('sk-SK')
  }

  const aktivneZakazkyNaZobrazenie = zoradZakazky(filtrujPodlaNazvu(aktivneZakazky))
  const dokonceneZakazkyNaZobrazenie = zoradZakazky(filtrujPodlaNazvu(dokonceneZakazky))

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

          .simple-admin-form-grid,
          .stavby-summary-grid,
          .stavby-filter-grid {
            grid-template-columns: 1fr !important;
          }

          .simple-admin-form-grid button {
            width: 100% !important;
            min-height: 44px;
          }
        }

        @media (max-width: 600px) {
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

          .simple-mobile-table select {
            width: 100%;
            min-height: 40px;
          }

          .simple-mobile-table td.simple-mobile-actions button {
            min-height: 38px;
            padding: 8px 10px !important;
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
        active="zakazky"
        onLogout={() => { adminStore.jeOdomknute = false; setJeOdomknute(false) }}
      />

      <div className="simple-admin-content" style={{ width: '100%', flex: 1, minWidth: 0, maxWidth: '1540px', margin: '0 auto' }}>
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Firemná administrácia
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', lineHeight: '1.1', letterSpacing: '-0.035em', color: '#1d1d1f', fontWeight: '700' }}>
            Stavby
          </h1>
          <div style={{ fontSize: '11px', color: '#86868b', marginTop: '5px' }}>
            Správa aktívnych a dokončených stavieb.
          </div>
        </div>

        <div className="stavby-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ ...cardStyle, padding: '18px 20px', boxShadow: '0 6px 22px rgba(0,0,0,0.045)' }}>
            <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Aktívne stavby</div>
            <div style={{ fontSize: '30px', lineHeight: 1, color: '#0071e3', fontWeight: '750', letterSpacing: '-0.04em', marginTop: '8px' }}>{aktivneZakazky.length}</div>
            <div style={{ fontSize: '10px', color: '#86868b', marginTop: '8px' }}>Momentálne rozpracované zákazky</div>
          </div>

          <div style={{ ...cardStyle, padding: '18px 20px', boxShadow: '0 6px 22px rgba(0,0,0,0.045)' }}>
            <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Dokončené</div>
            <div style={{ fontSize: '30px', lineHeight: 1, color: '#6e6e73', fontWeight: '750', letterSpacing: '-0.04em', marginTop: '8px' }}>{dokonceneZakazky.length}</div>
            <div style={{ fontSize: '10px', color: '#86868b', marginTop: '8px' }}>Uzavreté stavby v evidencii</div>
          </div>

          <div style={{ ...cardStyle, padding: '18px 20px', boxShadow: '0 6px 22px rgba(0,0,0,0.045)', backgroundColor: '#f7fbff' }}>
            <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Spolu v evidencii</div>
            <div style={{ fontSize: '30px', lineHeight: 1, color: '#1d1d1f', fontWeight: '750', letterSpacing: '-0.04em', marginTop: '8px' }}>{zakazky.length}</div>
            <div style={{ fontSize: '10px', color: '#0071e3', marginTop: '8px', fontWeight: '650' }}>Aktívne + dokončené stavby</div>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: '24px', padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '15px 18px', borderBottom: '1px solid #eeeeef' }}>
            <div style={{ fontSize: '14px', fontWeight: '750', color: '#1d1d1f' }}>Pridať novú stavbu</div>
            <div style={{ fontSize: '10px', color: '#86868b', marginTop: '3px' }}>Nová stavba sa automaticky vytvorí ako aktívna.</div>
          </div>

          <form onSubmit={pridatZakazku} style={{ padding: '16px 18px 18px' }}>
            <div className="simple-admin-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ minWidth: 0 }}>
                <label style={labelStyle}>Názov stavby</label>
                <input 
                  type="text" 
                  placeholder="Napr. Bytovka Bratislava" 
                  value={novyNazov} 
                  onChange={(e) => setNovyNazov(e.target.value)} 
                  required 
                  style={{ ...inputStyle, fontSize: '13px', backgroundColor: '#ffffff' }}
                />
              </div>
              <button 
                type="submit" 
                disabled={pridavaSa} 
                style={{ ...buttonPrimaryStyle, minWidth: '120px', minHeight: '38px', opacity: pridavaSa ? 0.65 : 1 } as any}
                onMouseEnter={(e) => !pridavaSa && ((e.currentTarget as any).style.backgroundColor = '#0077ed')}
                onMouseLeave={(e) => !pridavaSa && ((e.currentTarget as any).style.backgroundColor = '#0071e3')}
              >
                {pridavaSa ? 'Pridávam...' : '+ Pridať stavbu'}
              </button>
            </div>
          </form>
        </div>

        <div style={{ ...cardStyle, marginBottom: '16px', padding: '14px 16px' }}>
          <div className="stavby-filter-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto 150px', gap: '12px', alignItems: 'center' }}>
            <div>
              <label style={labelStyle}>Vyhľadať stavbu</label>
              <input
                type="search"
                placeholder="Napíš názov stavby..."
                value={hladat}
                onChange={(e) => setHladat(e.target.value)}
                style={{ ...inputStyle, backgroundColor: '#ffffff', minHeight: '40px' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Zobraziť</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { key: 'vsetky', label: 'Všetky' },
                  { key: 'aktivne', label: 'Aktívne' },
                  { key: 'dokoncene', label: 'Dokončené' },
                ].map(volba => {
                  const aktivna = filterStav === volba.key
                  return (
                    <button
                      key={volba.key}
                      type="button"
                      onClick={() => setFilterStav(volba.key as 'vsetky' | 'aktivne' | 'dokoncene')}
                      style={{
                        ...(aktivna ? buttonPrimaryStyle : buttonSecondaryStyle),
                        minHeight: '40px',
                        padding: '7px 13px',
                        fontSize: '10px',
                        textTransform: 'none',
                        letterSpacing: 0
                      } as any}
                    >
                      {volba.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Zoradiť</label>
              <select
                value={zoradenie}
                onChange={(e) => setZoradenie(e.target.value as 'najnovsie' | 'najstarsie' | 'az')}
                style={{ ...inputStyle, backgroundColor: '#ffffff', minHeight: '40px' }}
              >
                <option value="najnovsie">Najnovšie</option>
                <option value="najstarsie">Najstaršie</option>
                <option value="az">A–Z</option>
              </select>
            </div>
          </div>

          {(hladat || filterStav !== 'vsetky' || zoradenie !== 'najnovsie') && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eeeeef', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ color: '#86868b', fontSize: '10px' }}>
                Nájdené: {aktivneZakazkyNaZobrazenie.length + dokonceneZakazkyNaZobrazenie.length} stavieb
              </div>
              <button
                type="button"
                onClick={() => { setHladat(''); setFilterStav('vsetky'); setZoradenie('najnovsie') }}
                style={{ border: 'none', background: 'none', color: '#0071e3', cursor: 'pointer', fontSize: '10px', fontWeight: '700', padding: 0 }}
              >
                Vyčistiť filter
              </button>
            </div>
          )}
        </div>

        {filterStav !== 'dokoncene' && (
        <div style={{ ...cardStyle, padding: '0', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #eeeeef', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
                <div style={{ fontSize: '14px', fontWeight: '750', color: '#1d1d1f' }}>Aktívne stavby</div>
                <span style={{ padding: '3px 7px', borderRadius: '999px', backgroundColor: '#ecfdf5', color: '#047857', fontSize: '9px', fontWeight: '750' }}>{aktivneZakazkyNaZobrazenie.length}</span>
              </div>
              <div style={{ fontSize: '10px', color: '#86868b', marginTop: '4px' }}>Rozpracované zákazky. Stav môžeš kedykoľvek zmeniť na dokončený.</div>
            </div>
          </div>

          <table className="simple-mobile-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eeeeef', backgroundColor: '#f7f7f8' }}>
                <th style={{ padding: '10px 18px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Stavba</th>
                <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', width: '130px' }}>Pridaná</th>
                <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', width: '160px' }}>Stav</th>
                <th style={{ padding: '10px 18px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', textAlign: 'right', width: '90px' }}>Akcia</th>
              </tr>
            </thead>
            <tbody>
              {aktivneZakazkyNaZobrazenie.length === 0 ? (
                <tr className="simple-empty-row"><td className="simple-empty-cell" colSpan={4} style={{ padding: '28px 18px', color: '#a1a1a6', textAlign: 'center', fontSize: '11px' }}>Žiadne aktívne stavby.</td></tr>
              ) : (
                aktivneZakazkyNaZobrazenie.map((zak) => (
                  <tr key={zak.id} className="simple-mobile-row" style={{ borderBottom: '1px solid #eeeeef' }}>
                    <td className="simple-mobile-cell" data-label="Stavba" style={{ padding: '12px 18px', color: '#1d1d1f', fontWeight: '650' }}>{zak.nazov}</td>
                    <td className="simple-mobile-cell" data-label="Pridaná" style={{ padding: '10px 12px', color: '#86868b', fontSize: '11px' }}>{formatujDatumPridania(zak)}</td>
                    <td className="simple-mobile-cell" data-label="Stav" style={{ padding: '10px 12px' }}>
                      <select
                        value={zak.stav || 'Aktívna'}
                        onChange={(e) => zmenitStav(zak.id, e.target.value)}
                        style={{ minWidth: '126px', padding: '6px 10px', border: '1px solid #bbf7d0', borderRadius: '9px', color: '#047857', backgroundColor: '#ecfdf5', outline: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}
                      >
                        <option value="Aktívna">Aktívna</option>
                        <option value="Dokončená">Dokončená</option>
                      </select>
                    </td>
                    <td className="simple-mobile-cell simple-mobile-actions" data-label="Akcia" style={{ padding: '10px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => vymazatZakazku(zak.id)}
                        style={{ color: '#86868b', backgroundColor: '#f5f5f7', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '650', padding: '6px 9px', borderRadius: '8px', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#b42318'; e.currentTarget.style.backgroundColor = '#fef2f2' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#86868b'; e.currentTarget.style.backgroundColor = '#f5f5f7' }}
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
        )}

        {filterStav !== 'aktivne' && (
        <div style={{ ...cardStyle, padding: '0', overflow: 'hidden', opacity: 0.88 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #eeeeef', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', backgroundColor: '#fbfbfc' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#a1a1a6', display: 'inline-block' }} />
                <div style={{ fontSize: '14px', fontWeight: '750', color: '#6e6e73' }}>Dokončené stavby</div>
                <span style={{ padding: '3px 7px', borderRadius: '999px', backgroundColor: '#f0f0f2', color: '#6e6e73', fontSize: '9px', fontWeight: '750' }}>{dokonceneZakazkyNaZobrazenie.length}</span>
              </div>
              <div style={{ fontSize: '10px', color: '#86868b', marginTop: '4px' }}>Uzavreté zákazky zostávajú v evidencii a dajú sa znovu aktivovať.</div>
            </div>
          </div>

          <table className="simple-mobile-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eeeeef', backgroundColor: '#f7f7f8' }}>
                <th style={{ padding: '10px 18px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Stavba</th>
                <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', width: '130px' }}>Pridaná</th>
                <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', width: '160px' }}>Stav</th>
                <th style={{ padding: '10px 18px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', textAlign: 'right', width: '90px' }}>Akcia</th>
              </tr>
            </thead>
            <tbody>
              {dokonceneZakazkyNaZobrazenie.length === 0 ? (
                <tr className="simple-empty-row"><td className="simple-empty-cell" colSpan={4} style={{ padding: '28px 18px', color: '#a1a1a6', textAlign: 'center', fontSize: '11px' }}>Žiadne dokončené stavby.</td></tr>
              ) : (
                dokonceneZakazkyNaZobrazenie.map((zak) => (
                  <tr key={zak.id} className="simple-mobile-row" style={{ borderBottom: '1px solid #eeeeef', backgroundColor: '#fcfcfd' }}>
                    <td className="simple-mobile-cell" data-label="Stavba" style={{ padding: '12px 18px', color: '#6e6e73', fontWeight: '600' }}>{zak.nazov}</td>
                    <td className="simple-mobile-cell" data-label="Pridaná" style={{ padding: '10px 12px', color: '#86868b', fontSize: '11px' }}>{formatujDatumPridania(zak)}</td>
                    <td className="simple-mobile-cell" data-label="Stav" style={{ padding: '10px 12px' }}>
                      <select
                        value={zak.stav || 'Dokončená'}
                        onChange={(e) => zmenitStav(zak.id, e.target.value)}
                        style={{ minWidth: '126px', padding: '6px 10px', border: '1px solid #d2d2d7', borderRadius: '9px', color: '#6e6e73', backgroundColor: '#f5f5f7', outline: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}
                      >
                        <option value="Aktívna">Aktívna</option>
                        <option value="Dokončená">Dokončená</option>
                      </select>
                    </td>
                    <td className="simple-mobile-cell simple-mobile-actions" data-label="Akcia" style={{ padding: '10px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => vymazatZakazku(zak.id)}
                        style={{ color: '#a1a1a6', backgroundColor: '#f5f5f7', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '650', padding: '6px 9px', borderRadius: '8px', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#b42318'; e.currentTarget.style.backgroundColor = '#fef2f2' }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = '#a1a1a6'; e.currentTarget.style.backgroundColor = '#f5f5f7' }}
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
        )}

      </div>
    </div>
  )
}