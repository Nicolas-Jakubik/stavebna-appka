'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { adminStore } from '../../lib/store'

export default function MzdyPage() {
  const [zadaneHeslo, setZadaneHeslo] = useState('')
  const [jeOdomknute, setJeOdomknute] = useState(adminStore.jeOdomknute)
  const [chybaHesla, setChybaHesla] = useState(false)
  const SPRAVNE_HESLO = 'sef123'

  const [zaznamy, setZaznamy] = useState<any[]>([])
  const [filterMesiac, setFilterMesiac] = useState(new Date().toISOString().slice(0, 7))
  const [filterPolovica, setFilterPolovica] = useState('cely') 
  
  const [databazoviZamestnanci, setDatabazoviZamestnancov] = useState<any[]>([])
  const [stavyStavieb, setStavyStavieb] = useState<Record<string, string>>({})

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

  const zoznamMesiacov = [
    { hodnota: '2026-01', nazov: 'Január 2026' }, { hodnota: '2026-02', nazov: 'Február 2026' }, { hodnota: '2026-03', nazov: 'Marec 2026' }, { hodnota: '2026-04', nazov: 'Apríl 2026' }, { hodnota: '2026-05', nazov: 'Máj 2026' }, { hodnota: '2026-06', nazov: 'Jún 2026' }, { hodnota: '2026-07', nazov: 'Júl 2026' }, { hodnota: '2026-08', nazov: 'August 2026' }, { hodnota: '2026-09', nazov: 'September 2026' }, { hodnota: '2026-10', nazov: 'Október 2026' }, { hodnota: '2026-11', nazov: 'November 2026' }, { hodnota: '2026-12', nazov: 'December 2026' },
  ]

  let textPolovice = '';
  if (filterPolovica === 'prva') textPolovice = ' (1. polovica: 1. - 15. deň)';
  if (filterPolovica === 'druha') textPolovice = ' (2. polovica: 16. deň - koniec)';
  const aktualnyNazovMesiaca = (zoznamMesiacov.find(m => m.hodnota === filterMesiac)?.nazov || filterMesiac) + textPolovice;

  useEffect(() => {
    const ulozeneStavy = localStorage.getItem('stavyStaviebAdmin')
    if (ulozeneStavy) setStavyStavieb(JSON.parse(ulozeneStavy))
  }, [])

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

  function vypocitajHodiny(prichod: string, odchod: string) {
    if (!prichod || !odchod) return 0
    const [pHod, pMin] = prichod.split(':').map(Number)
    const [oHod, oMin] = odchod.split(':').map(Number)
    let minutySpolu = (oHod * 60 + oMin) - (pHod * 60 + pMin)
    if (minutySpolu < 0) minutySpolu += 24 * 60 
    let hodinySpolu = minutySpolu / 60
    if (hodinySpolu > 5.5) hodinySpolu -= 0.5
    return hodinySpolu
  }

  async function nacitaj() {
    let query = supabase.from('dochadzka').select('*')
    const [rok, mesiac] = filterMesiac.split('-')
    
    if (rok && mesiac) {
      const pocetDni = new Date(parseInt(rok), parseInt(mesiac), 0).getDate()
      
      let odDna = 1;
      let doDna = pocetDni;

      if (filterPolovica === 'prva') {
        doDna = 15;
      } else if (filterPolovica === 'druha') {
        odDna = 16;
      }

      const odDnaText = odDna < 10 ? `0${odDna}` : `${odDna}`;
      const doDnaText = doDna < 10 ? `0${doDna}` : `${doDna}`;

      query = query.gte('datum', `${rok}-${mesiac}-${odDnaText}`).lte('datum', `${rok}-${mesiac}-${doDnaText}`)
    }
    
    const { data: dochData } = await query
    setZaznamy(dochData || [])

    const { data: zamData } = await supabase.from('zamestnanci').select('*')
    setDatabazoviZamestnancov(zamData || [])
  }

  useEffect(() => { if (jeOdomknute) nacitaj() }, [filterMesiac, filterPolovica, jeOdomknute])

  function zmenaStavuStavby(stavba: string, hodnota: string) {
    const kluc = `${filterMesiac}_${filterPolovica}_${stavba}`
    const noveStavy = { ...stavyStavieb, [kluc]: hodnota }
    setStavyStavieb(noveStavy)
    localStorage.setItem('stavyStaviebAdmin', JSON.stringify(noveStavy))
  }

  const zamestnanciHodiny: Record<string, number> = {}
  const stavbyData: Record<string, number> = {}

  zaznamy.forEach((z) => {
    const hodiny = vypocitajHodiny(z.prichod, z.odchod)
    
    if (!zamestnanciHodiny[z.meno]) zamestnanciHodiny[z.meno] = 0
    zamestnanciHodiny[z.meno] += hodiny

    if (!stavbyData[z.zakazka]) stavbyData[z.zakazka] = 0
    stavbyData[z.zakazka] += hodiny
  })

  const nezaplateneStavby: [string, number][] = []
  const poslaneFaStavby: [string, number][] = []
  const vyplateneStavby: [string, number][] = []

  Object.entries(stavbyData).forEach(([stavba, hodiny]) => {
    const stav = stavyStavieb[`${filterMesiac}_${filterPolovica}_${stavba}`] || 'Nezaplatená'
    if (stav === 'Vyplatená') vyplateneStavby.push([stavba, hodiny])
    else if (stav === 'Poslaná FA') poslaneFaStavby.push([stavba, hodiny])
    else nezaplateneStavby.push([stavba, hodiny])
  })

  function dajFarbuStavu(stav: string) {
    if (stav === 'Vyplatená') return { color: '#047857', bg: '#ecfdf5', border: '#10b981' }
    if (stav === 'Poslaná FA') return { color: '#b45309', bg: '#fffbeb', border: '#f59e0b' }
    return { color: '#ef4444', bg: '#fef2f2', border: '#fee2e2' }
  }

  function spustitExport() {
    window.print()
  }

  const RenderujTabulkuStavieb = ({ zoznam, nadpis, predvolenyStav }: any) => {
    const jeVyplatena = predvolenyStav === 'Vyplatená'
    const farba = dajFarbuStavu(predvolenyStav)
    const farbaCiary = jeVyplatena ? '#d1d5db' : farba.border

    return (
      <div style={{ marginBottom: '20px', pageBreakInside: 'avoid' }}>
        <h4 style={{ color: jeVyplatena ? '#6b7280' : '#1d1d1f', margin: '0 0 12px 0', fontSize: '14px', borderBottom: `2px solid ${farbaCiary}`, paddingBottom: '6px', width: 'fit-content', fontWeight: '600' }}>
          {nadpis} ({zoznam.length})
        </h4>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {zoznam.length === 0 ? (
              <tr className="skryt-pri-tlaci"><td style={{ padding: '12px 0', color: '#9ca3af', fontSize: '13px', fontStyle: 'italic' }}>V tejto kategórii nie sú žiadne stavby.</td></tr>
            ) : (
              zoznam.map(([stavba, hodiny]: any) => {
                const aktualnyStav = stavyStavieb[`${filterMesiac}_${filterPolovica}_${stavba}`] || 'Nezaplatená'
                const farby = dajFarbuStavu(aktualnyStav)
                return (
                  <tr key={stavba} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 0', color: jeVyplatena ? '#9ca3af' : '#1d1d1f', fontWeight: '500', textDecoration: jeVyplatena ? 'line-through' : 'none', fontSize: '13px' }}>{stavba}</td>
                    
                    <td style={{ padding: '10px 0', textAlign: 'center', width: '180px' }}>
                      <span className="ukazat-iba-pri-tlaci" style={{ fontSize: '12px', fontWeight: '600', color: farby.color }}>{aktualnyStav}</span>
                      <select value={aktualnyStav} onChange={(e) => zmenaStavuStavby(stavba, e.target.value)} className="skryt-pri-tlaci" style={{ padding: '6px 10px', border: '1px solid', borderColor: farby.border, borderRadius: '6px', color: farby.color, backgroundColor: farby.bg, outline: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600' }}>
                        <option value="Nezaplatená">Nezaplatená</option><option value="Poslaná FA">Poslaná FA</option><option value="Vyplatená">Vyplatená</option>
                      </select>
                    </td>
                    
                    <td style={{ padding: '10px 0', color: jeVyplatena ? '#9ca3af' : '#1d1d1f', fontWeight: '600', textAlign: 'right', fontSize: '13px', width: '100px', paddingRight: '10px' }}>{hodiny.toFixed(2)} h</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    )
  }

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fbfbfd', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <h2 style={{ color: '#1d1d1f', marginBottom: '20px', fontSize: '26px', fontWeight: '600', letterSpacing: '-0.003em', margin: '0 0 20px 0' }}>Výplata</h2>
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
      
      <style>{`
        @media print {
          body { backgroundColor: white !important; color: black !important; padding: 0 !important; }
          .skryt-pri-tlaci { display: none !important; }
          .ukazat-iba-pri-tlaci { display: inline-block !important; }
          .hlavny-kontajner { boxShadow: none !important; padding: 20px !important; maxWidth: 100% !important; width: 100% !important; }
          tr { pageBreakInside: avoid; }
        }
        .ukazat-iba-pri-tlaci { display: none; }
      `}</style>

      <div className="hlavny-kontajner" style={{ width: '100%', maxWidth: '900px', margin: '0 auto' }}>
        
        <div className="skryt-pri-tlaci" style={{ display: 'flex', gap: '20px', paddingBottom: '14px', marginBottom: '24px', borderBottom: '1px solid #e5e5e5', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: '#86868b', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Dochádzka</Link>
          <Link href="/zakazky" style={{ textDecoration: 'none', color: '#86868b', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Stavby</Link>
          <Link href="/zamestnanci" style={{ textDecoration: 'none', color: '#86868b', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Zamestnanci</Link>
          <Link href="/mzdy" style={{ textDecoration: 'none', color: '#1d1d1f', fontWeight: '600', fontSize: '13px', borderBottom: '2px solid #0071e3', paddingBottom: '2px' }}>Výplaty</Link>
          <button onClick={() => { adminStore.jeOdomknute = false; setJeOdomknute(false); }} style={{ border: 'none', background: 'none', color: '#86868b', marginLeft: 'auto', cursor: 'pointer', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Odhlásiť sa</button>
        </div>

        <div className="ukazat-iba-pri-tlaci" style={{ width: '100%', borderBottom: '2px solid #1d1d1f', paddingBottom: '12px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '22px', margin: 0, color: '#1d1d1f' }}>Mesačný prehľad uzávierky</h1>
          <p style={{ fontSize: '12px', margin: '4px 0 0 0', color: '#86868b' }}>Obdobie: <strong>{aktualnyNazovMesiaca}</strong></p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px', backgroundColor: '#f5f5f7', padding: '12px 12px', borderRadius: '10px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', fontSize: '12px' }}>
            <span className="skryt-pri-tlaci" style={{ fontWeight: '600', color: '#1d1d1f' }}>Obdobie:</span>
            <span className="ukazat-iba-pri-tlaci" style={{ fontWeight: '600' }}>Vybrané: {aktualnyNazovMesiaca}</span>
            
            <select value={filterMesiac} onChange={(e) => setFilterMesiac(e.target.value)} className="skryt-pri-tlaci" style={{...inputStyle, minWidth: '140px'} as any}>
              {zoznamMesiacov.map((m) => <option key={m.hodnota} value={m.hodnota}>{m.nazov}</option>)}
            </select>

            <select value={filterPolovica} onChange={(e) => setFilterPolovica(e.target.value)} className="skryt-pri-tlaci" style={{...inputStyle, minWidth: '140px'} as any}>
              <option value="cely">Celý mesiac</option>
              <option value="prva">1. polovica (1.-15.)</option>
              <option value="druha">2. polovica (16.-koniec)</option>
            </select>
          </div>
          
          <button 
            onClick={spustitExport} 
            className="skryt-pri-tlaci" 
            style={{ ...buttonPrimaryStyle, fontSize: '11px' } as any}
            onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = '#0077ed'}
            onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = '#0071e3'}
          >
            🖨️ PDF
          </button>
        </div>

        <div style={{ marginBottom: '30px', pageBreakInside: 'avoid', ...cardStyle }}>
          <h3 style={{ color: '#1d1d1f', margin: '0 0 16px 0', fontSize: '16px', borderBottom: '2px solid #1d1d1f', paddingBottom: '8px', width: 'fit-content', fontWeight: '600' }}>1. Výplata</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #d2d2d7' }}>
                <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Zamestnanec</th>
                <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'center' }}>Hodiny</th>
                <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'center' }}>Sadzba</th>
                <th style={{ padding: '10px 0', color: '#86868b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'right' }}>Mzda (€)</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(zamestnanciHodiny).length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '20px 0', color: '#d2d2d7', textAlign: 'center', fontSize: '12px' }}>Žiadne dáta.</td></tr>
              ) : (
                Object.entries(zamestnanciHodiny).map(([meno, hodiny]) => {
                  const dbZamestnanec = databazoviZamestnanci.find(z => z.meno === meno)
                  const sadzba = dbZamestnanec ? dbZamestnanec.sadzba : 0
                  const mzda = hodiny * sadzba
                  
                  return (
                    <tr key={meno} style={{ borderBottom: '1px solid #f5f5f7' }}>
                      <td style={{ padding: '10px 0', color: '#1d1d1f', fontWeight: '500' }}>{meno}</td>
                      <td style={{ padding: '10px 0', color: '#1d1d1f', textAlign: 'center' }}>{hodiny.toFixed(2)} h</td>
                      <td style={{ padding: '10px 0', textAlign: 'center', color: '#86868b', fontSize: '12px' }}>
                        {sadzba > 0 ? `${sadzba.toFixed(2)} €/h` : 'Nenastavená'}
                      </td>
                      <td style={{ padding: '10px 0', color: '#1d1d1f', fontWeight: '600', textAlign: 'right' }}>{mzda.toFixed(2)} €</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#1d1d1f', margin: '0 0 16px 0', fontSize: '16px', borderBottom: '2px solid #1d1d1f', paddingBottom: '8px', width: 'fit-content', fontWeight: '600' }}>2. Súhrn stavby</h3>
          <RenderujTabulkuStavieb zoznam={nezaplateneStavby} nadpis="Nezaplatené" predvolenyStav="Nezaplatená" />
          <RenderujTabulkuStavieb zoznam={poslaneFaStavby} nadpis="Poslaná FA" predvolenyStav="Poslaná FA" />
          <RenderujTabulkuStavieb zoznam={vyplateneStavby} nadpis="Vyplatené" predvolenyStav="Vyplatená" />
        </div>

      </div>
    </div>
  )
}