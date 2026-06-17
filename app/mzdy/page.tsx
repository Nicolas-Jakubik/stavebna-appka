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
  // NOVÁ PREMENNÁ: Filter na polovicu mesiaca
  const [filterPolovica, setFilterPolovica] = useState('cely') 
  
  const [databazoviZamestnanci, setDatabazoviZamestnancov] = useState<any[]>([])
  const [stavyStavieb, setStavyStavieb] = useState<Record<string, string>>({})

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
      
      // NOVÁ LOGIKA: Tu filtrujeme podľa toho, ktorú polovicu si klient vybral
      let odDna = 1;
      let doDna = pocetDni;

      if (filterPolovica === 'prva') {
        doDna = 15;
      } else if (filterPolovica === 'druha') {
        odDna = 16;
      }

      // Bezpečné pridanie 0 pred číslo dňa, ak je jednociferné (napr. 01, 09)
      const odDnaText = odDna < 10 ? `0${odDna}` : `${odDna}`;
      const doDnaText = doDna < 10 ? `0${doDna}` : `${doDna}`;

      query = query.gte('datum', `${rok}-${mesiac}-${odDnaText}`).lte('datum', `${rok}-${mesiac}-${doDnaText}`)
    }
    
    const { data: dochData } = await query
    setZaznamy(dochData || [])

    const { data: zamData } = await supabase.from('zamestnanci').select('*')
    setDatabazoviZamestnancov(zamData || [])
  }

  // Ak sa zmení mesiac ALEBO zvolená polovica, kalkulačka sa znova naštartuje
  useEffect(() => { if (jeOdomknute) nacitaj() }, [filterMesiac, filterPolovica, jeOdomknute])

  function zmenaStavuStavby(stavba: string, hodnota: string) {
    const kluc = `${filterMesiac}_${filterPolovica}_${stavba}` // Aktualizovaný kľúč, aby si pamätal stavy aj pre polovice
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

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '350px', backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <h2 style={{ color: '#000000', marginBottom: '20px', fontSize: '20px' }}>Výplata a Súhrny</h2>
          <form onSubmit={skontrolovatHeslo}>
            <input type="password" placeholder="Zadajte heslo" value={zadaneHeslo} onChange={e => setZadaneHeslo(e.target.value)} style={{ padding: '12px 0', border: 'none', borderBottom: '1px solid #e5e7eb', width: '100%', fontSize: '16px', outline: 'none', marginBottom: '20px', backgroundColor: 'transparent', color: '#000000', textAlign: 'center' }} />
            {chybaHesla && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '-10px', marginBottom: '15px' }}>Nesprávne heslo</p>}
            <button type="submit" style={{ padding: '12px', width: '100%', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '50px', fontWeight: '600', cursor: 'pointer' }}>Odomknúť</button>
          </form>
        </div>
        <div style={{ marginTop: '30px' }}>
          <Link href="/" style={{ color: '#9ca3af', fontSize: '13px', textDecoration: 'none' }}>← Späť na formulár</Link>
        </div>
      </div>
    )
  }

  const RenderujTabulkuStavieb = ({ zoznam, nadpis, predvolenyStav }: { zoznam: [string, number][], nadpis: string, predvolenyStav: string }) => {
    const jeVyplatena = predvolenyStav === 'Vyplatená'
    const jeFa = predvolenyStav === 'Poslaná FA'
    let farbaCiary = jeFa ? '#f59e0b' : jeVyplatena ? '#10b981' : '#ef4444'

    return (
      <div style={{ marginBottom: '35px', pageBreakInside: 'avoid' }}>
        <h4 style={{ color: jeVyplatena ? '#6b7280' : '#111827', margin: '0 0 15px 0', fontSize: '16px', borderBottom: `2px solid ${farbaCiary}`, paddingBottom: '6px', width: 'fit-content', fontWeight: '600' }}>
          {nadpis} ({zoznam.length})
        </h4>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {zoznam.length === 0 ? (
              <tr className="skryt-pri-tlaci"><td style={{ padding: '15px 0', color: '#9ca3af', fontSize: '14px', fontStyle: 'italic' }}>V tejto kategórii nie sú žiadne stavby.</td></tr>
            ) : (
              zoznam.map(([stavba, hodiny]) => {
                const aktualnyStav = stavyStavieb[`${filterMesiac}_${filterPolovica}_${stavba}`] || 'Nezaplatená'
                const farby = dajFarbuStavu(aktualnyStav)
                return (
                  <tr key={stavba} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 0', color: jeVyplatena ? '#9ca3af' : '#000000', fontWeight: '500', textDecoration: jeVyplatena ? 'line-through' : 'none' }}>{stavba}</td>
                    
                    <td style={{ padding: '12px 0', textAlign: 'center', width: '200px' }}>
                      <span className="ukazat-iba-pri-tlaci" style={{ fontSize: '13px', fontWeight: '600', color: farby.color }}>{aktualnyStav}</span>
                      <select value={aktualnyStav} onChange={(e) => zmenaStavuStavby(stavba, e.target.value)} className="skryt-pri-tlaci" style={{ padding: '5px 10px', border: '1px solid', borderColor: farby.border, borderRadius: '50px', color: farby.color, backgroundColor: farby.bg, outline: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
                        <option value="Nezaplatená">Nezaplatená</option><option value="Poslaná FA">Poslaná FA</option><option value="Vyplatená">Vyplatená</option>
                      </select>
                    </td>
                    
                    <td style={{ padding: '12px 0', color: jeVyplatena ? '#9ca3af' : '#111827', fontWeight: 'bold', textAlign: 'right', fontSize: '14px', width: '150px', paddingRight: '10px' }}>{hodiny.toFixed(2)} h</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
      
      <style>{`
        @media print {
          body { backgroundColor: white !important; color: black !important; padding: 0 !important; }
          .skryt-pri-tlaci { display: none !important; }
          .ukazat-iba-pri-tlaci { display: inline-block !important; }
          .hlavny-kontajner { boxShadow: none !important; padding: 0 !important; maxWidth: 100% !important; width: 100% !important; }
          tr { pageBreakInside: avoid; }
        }
        .ukazat-iba-pri-tlaci { display: none; }
      `}</style>

      <div className="hlavny-kontajner" style={{ width: '100%', maxWidth: '900px', backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        
        <div className="skryt-pri-tlaci" style={{ display: 'flex', gap: '20px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb', marginBottom: '30px', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: '#6b7280' }}>Dochádzka</Link>
          <Link href="/zakazky" style={{ textDecoration: 'none', color: '#6b7280' }}>Stavby</Link>
          <Link href="/zamestnanci" style={{ textDecoration: 'none', color: '#6b7280' }}>Zamestnanci</Link>
          <Link href="/mzdy" style={{ textDecoration: 'none', color: '#111827', fontWeight: 'bold' }}>Výplaty</Link>
          <Link href="/" style={{ textDecoration: 'none', color: '#ef4444', marginLeft: 'auto', fontWeight: '500' }}>← Odhlásiť sa</Link>
        </div>

        <div className="ukazat-iba-pri-tlaci" style={{ width: '100%', borderBottom: '2px solid #111827', paddingBottom: '15px', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '24px', margin: 0, color: 'black' }}>Mesačný prehľad uzávierky</h1>
          <p style={{ fontSize: '14px', margin: '5px 0 0 0', color: '#555' }}>Obdobie: <strong>{aktualnyNazovMesiaca}</strong></p>
        </div>

        {/* TOP FILTER S NOVÝM VÝBEROM POLOVICE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px', backgroundColor: '#f9fafb', padding: '15px 20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'center' }}>
            <span className="skryt-pri-tlaci" style={{ fontWeight: '600', color: '#374151' }}>Prehľad za obdobie:</span>
            <span className="ukazat-iba-pri-tlaci" style={{ fontWeight: '600' }}>Vybrané obdobie: {aktualnyNazovMesiaca}</span>
            
            <select value={filterMesiac} onChange={(e) => setFilterMesiac(e.target.value)} className="skryt-pri-tlaci" style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000', backgroundColor: '#ffffff', outline: 'none', cursor: 'pointer', minWidth: '160px', fontWeight: '500' }}>
              {zoznamMesiacov.map((m) => <option key={m.hodnota} value={m.hodnota}>{m.nazov}</option>)}
            </select>

            {/* NOVÝ SELECT PRE VÝBER POLOVICE */}
            <select value={filterPolovica} onChange={(e) => setFilterPolovica(e.target.value)} className="skryt-pri-tlaci" style={{ padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000', backgroundColor: '#ffffff', outline: 'none', cursor: 'pointer', minWidth: '160px', fontWeight: '500' }}>
              <option value="cely">Celý mesiac</option>
              <option value="prva">1. polovica (1. - 15.)</option>
              <option value="druha">2. polovica (16. - koniec)</option>
            </select>
          </div>
          
          <button 
            onClick={spustitExport} 
            className="skryt-pri-tlaci" 
            style={{ padding: '10px 20px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
          >
            🖨️ Exportovať do PDF
          </button>
        </div>

        <div style={{ marginBottom: '50px', pageBreakInside: 'avoid' }}>
          <h3 style={{ color: '#000000', margin: '0 0 20px 0', fontSize: '20px', borderBottom: '2px solid #111827', paddingBottom: '8px', width: 'fit-content' }}>1. Výplata</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6' }}>
                <th style={{ padding: '12px 0', color: '#666', fontSize: '14px' }}>Zamestnanec</th>
                <th style={{ padding: '12px 0', color: '#666', fontSize: '14px', textAlign: 'center' }}>Odpracované hodiny</th>
                <th style={{ padding: '12px 0', color: '#666', fontSize: '14px', textAlign: 'center' }}>Hodinová sadzba</th>
                <th style={{ padding: '12px 0', color: '#666', fontSize: '14px', textAlign: 'right' }}>Spolu mzda (€)</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(zamestnanciHodiny).length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '30px 0', color: '#666', textAlign: 'center' }}>V zvolenom období neevidujeme žiadnu prácu zamestnancov.</td></tr>
              ) : (
                Object.entries(zamestnanciHodiny).map(([meno, hodiny]) => {
                  const dbZamestnanec = databazoviZamestnanci.find(z => z.meno === meno)
                  const sadzba = dbZamestnanec ? dbZamestnanec.sadzba : 0
                  const mzda = hodiny * sadzba
                  
                  return (
                    <tr key={meno} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '15px 0', color: '#000000', fontWeight: '500' }}>{meno}</td>
                      <td style={{ padding: '15px 0', color: '#000000', textAlign: 'center' }}>{hodiny.toFixed(2)} h</td>
                      <td style={{ padding: '15px 0', textAlign: 'center', color: '#6b7280' }}>
                        {sadzba > 0 ? `${sadzba.toFixed(2)} €/h` : 'Nenastavená (0 €)'}
                      </td>
                      <td style={{ padding: '15px 0', color: '#000000', fontWeight: 'bold', textAlign: 'right', fontSize: '16px' }}>{mzda.toFixed(2)} €</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#000000', margin: '0 0 25px 0', fontSize: '20px', borderBottom: '2px solid #111827', paddingBottom: '8px', width: 'fit-content' }}>2. Súhrn stavby</h3>
          <RenderujTabulkuStavieb zoznam={nezaplateneStavby} nadpis="Nezaplatené stavby" predvolenyStav="Nezaplatená" />
          <RenderujTabulkuStavieb zoznam={poslaneFaStavby} nadpis="Poslaná FA" predvolenyStav="Poslaná FA" />
          <RenderujTabulkuStavieb zoznam={vyplateneStavby} nadpis="Vyplatené stavby" predvolenyStav="Vyplatená" />
        </div>

      </div>
    </div>
  )
}