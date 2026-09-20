'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/adminSupabase'
import AdminSidebar from '../../components/AdminSidebar'

export default function MzdyPage() {
  const [zaznamy, setZaznamy] = useState<any[]>([])
  const [mesacneZaznamy, setMesacneZaznamy] = useState<any[]>([])
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
  const nazovMesiacaBezPolovice = zoznamMesiacov.find(m => m.hodnota === filterMesiac)?.nazov || filterMesiac

  function vypocitajFondObdobia(mesiacText: string, odDna: number, doDna: number) {
    const [rokText, mesiacCisloText] = mesiacText.split('-')
    const rok = Number(rokText)
    const mesiacCislo = Number(mesiacCisloText)
    if (!rok || !mesiacCislo) return 0

    const poslednyDen = new Date(Date.UTC(rok, mesiacCislo, 0)).getUTCDate()
    const koniec = Math.min(doDna, poslednyDen)
    let fond = 0

    for (let den = odDna; den <= koniec; den++) {
      const denVTyzdni = new Date(Date.UTC(rok, mesiacCislo - 1, den)).getUTCDay()
      if (denVTyzdni === 0) continue
      fond += denVTyzdni === 6 ? 10.5 : 11.5
    }

    return fond
  }

  const [rokFonduText, mesiacFonduText] = filterMesiac.split('-')
  const pocetDniVoVybranomMesiaci = rokFonduText && mesiacFonduText
    ? new Date(Date.UTC(Number(rokFonduText), Number(mesiacFonduText), 0)).getUTCDate()
    : 31
  const fondPrvaPolovica = vypocitajFondObdobia(filterMesiac, 1, 15)
  const fondDruhaPolovica = vypocitajFondObdobia(filterMesiac, 16, pocetDniVoVybranomMesiaci)
  const fondCelyMesiac = fondPrvaPolovica + fondDruhaPolovica
  const fondVybranehoObdobia = filterPolovica === 'prva'
    ? fondPrvaPolovica
    : filterPolovica === 'druha'
      ? fondDruhaPolovica
      : fondCelyMesiac
  const nazovVyplatnehoObdobia = filterPolovica === 'prva'
    ? 'Výplata 1 · 1.–15.'
    : filterPolovica === 'druha'
      ? 'Výplata 2 · 16.–koniec'
      : 'Celý mesiac'

  useEffect(() => {
    const ulozeneStavy = localStorage.getItem('stavyStaviebAdmin')
    if (ulozeneStavy) setStavyStavieb(JSON.parse(ulozeneStavy))
  }, [])

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

    if (rok && mesiac) {
      const pocetDni = new Date(parseInt(rok), parseInt(mesiac), 0).getDate()
      const poslednyDenText = String(pocetDni).padStart(2, '0')
      const { data: mesacneData } = await supabase
        .from('dochadzka')
        .select('*')
        .gte('datum', `${rok}-${mesiac}-01`)
        .lte('datum', `${rok}-${mesiac}-${poslednyDenText}`)
      setMesacneZaznamy(mesacneData || [])
    } else {
      setMesacneZaznamy([])
    }

    const { data: zamData } = await supabase.from('zamestnanci').select('*')
    setDatabazoviZamestnancov(zamData || [])
  }

  useEffect(() => { nacitaj() }, [filterMesiac, filterPolovica])

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

  const pocetPracovnikovVyplata = Object.keys(zamestnanciHodiny).length
  const celkoveOdpracovaneHodiny = Object.values(zamestnanciHodiny).reduce((sucet, hodiny) => sucet + hodiny, 0)
  const celkovaSumaNaVyplatu = Object.entries(zamestnanciHodiny).reduce((sucet, [meno, hodiny]) => {
    const dbZamestnanec = databazoviZamestnanci.find(z => z.meno === meno)
    const sadzba = dbZamestnanec ? Number(dbZamestnanec.sadzba) || 0 : 0
    return sucet + hodiny * sadzba
  }, 0)

  const suhrnPolovice = (prvaPolovica: boolean) => mesacneZaznamy.reduce(
    (suhrn, z) => {
      const den = Number(String(z.datum).slice(8, 10))
      const patriDoObdobia = prvaPolovica ? den <= 15 : den >= 16
      if (!patriDoObdobia) return suhrn

      const hodiny = vypocitajHodiny(z.prichod, z.odchod)
      const dbZamestnanec = databazoviZamestnanci.find(pracovnik => pracovnik.meno === z.meno)
      const sadzba = dbZamestnanec ? Number(dbZamestnanec.sadzba) || 0 : 0

      suhrn.hodiny += hodiny
      suhrn.suma += hodiny * sadzba
      return suhrn
    },
    { hodiny: 0, suma: 0 }
  )

  const suhrnPrvaPolovica = suhrnPolovice(true)
  const suhrnDruhaPolovica = suhrnPolovice(false)
  const suhrnCelyMesiac = {
    hodiny: suhrnPrvaPolovica.hodiny + suhrnDruhaPolovica.hodiny,
    suma: suhrnPrvaPolovica.suma + suhrnDruhaPolovica.suma
  }

  const pracovniciMesacne: Record<string, { prvaHodiny: number; druhaHodiny: number; sadzba: number }> = {}

  mesacneZaznamy.forEach((z) => {
    if (!pracovniciMesacne[z.meno]) {
      const dbZamestnanec = databazoviZamestnanci.find(pracovnik => pracovnik.meno === z.meno)
      pracovniciMesacne[z.meno] = {
        prvaHodiny: 0,
        druhaHodiny: 0,
        sadzba: dbZamestnanec ? Number(dbZamestnanec.sadzba) || 0 : 0
      }
    }

    const den = Number(String(z.datum).slice(8, 10))
    const hodiny = vypocitajHodiny(z.prichod, z.odchod)
    if (den <= 15) pracovniciMesacne[z.meno].prvaHodiny += hodiny
    else pracovniciMesacne[z.meno].druhaHodiny += hodiny
  })

  const pracovniciMesacneZoradeni = Object.entries(pracovniciMesacne)
    .sort(([menoA], [menoB]) => menoA.localeCompare(menoB, 'sk'))

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
    if (filterPolovica === 'cely') {
      alert('Pre PDF vyberte 1.–15. alebo 16.–koniec mesiaca.')
      return
    }
    window.print()
  }

  const RenderujTabulkuStavieb = ({ zoznam, nadpis, predvolenyStav }: any) => {
    const jeVyplatena = predvolenyStav === 'Vyplatená'
    const farba = dajFarbuStavu(predvolenyStav)
    const hodinySpolu = zoznam.reduce((sucet: number, [, hodiny]: [string, number]) => sucet + hodiny, 0)

    return (
      <div className="print-card" style={{ ...cardStyle, padding: '0', overflow: 'hidden', marginBottom: '14px', pageBreakInside: 'avoid' }}>
        <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '1px solid #eeeeef', backgroundColor: jeVyplatena ? '#fbfbfc' : '#ffffff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: farba.color, display: 'inline-block' }} />
            <div style={{ color: jeVyplatena ? '#6e6e73' : '#1d1d1f', fontSize: '13px', fontWeight: '750' }}>{nadpis}</div>
            <span style={{ fontSize: '9px', color: '#86868b', backgroundColor: '#f5f5f7', borderRadius: '999px', padding: '3px 7px', fontWeight: '700' }}>{zoznam.length}</span>
          </div>
          <div style={{ fontSize: '11px', color: '#86868b', fontWeight: '650' }}>{hodinySpolu.toFixed(2)} h</div>
        </div>

        <div className="vyplaty-mobile-scroll" style={{ overflowX: 'auto' }}>
          <table className="vyplaty-mobile-table vyplaty-billing-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7f7f8', borderBottom: '1px solid #eeeeef' }}>
                <th style={{ padding: '9px 16px', textAlign: 'left', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Stavba</th>
                <th style={{ padding: '9px 12px', textAlign: 'center', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', width: '190px' }}>Stav faktúry</th>
                <th style={{ padding: '9px 16px', textAlign: 'right', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', width: '110px' }}>Hodiny</th>
              </tr>
            </thead>
            <tbody>
              {zoznam.length === 0 ? (
                <tr className="skryt-pri-tlaci">
                  <td colSpan={3} style={{ padding: '20px 16px', color: '#a1a1a6', fontSize: '11px', textAlign: 'center' }}>V tejto kategórii nie sú žiadne stavby.</td>
                </tr>
              ) : (
                zoznam.map(([stavba, hodiny]: any) => {
                  const aktualnyStav = stavyStavieb[`${filterMesiac}_${filterPolovica}_${stavba}`] || 'Nezaplatená'
                  const farby = dajFarbuStavu(aktualnyStav)
                  return (
                    <tr key={stavba} className="vyplaty-mobile-row" style={{ borderBottom: '1px solid #eeeeef', backgroundColor: jeVyplatena ? '#fcfcfd' : '#ffffff' }}>
                      <td className="vyplaty-mobile-cell" data-label="Stavba" style={{ padding: '11px 16px', color: jeVyplatena ? '#86868b' : '#1d1d1f', fontWeight: '650', fontSize: '12px' }}>{stavba}</td>

                      <td className="vyplaty-mobile-cell" data-label="Stav faktúry" style={{ padding: '9px 12px', textAlign: 'center' }}>
                        <span className="ukazat-iba-pri-tlaci" style={{ fontSize: '11px', fontWeight: '700', color: farby.color }}>{aktualnyStav}</span>
                        <select
                          value={aktualnyStav}
                          onChange={(e) => zmenaStavuStavby(stavba, e.target.value)}
                          className="skryt-pri-tlaci"
                          style={{
                            minWidth: '132px',
                            padding: '6px 9px',
                            border: `1px solid ${farby.border}`,
                            borderRadius: '9px',
                            color: farby.color,
                            backgroundColor: farby.bg,
                            outline: 'none',
                            cursor: 'pointer',
                            fontSize: '10px',
                            fontWeight: '700'
                          }}
                        >
                          <option value="Nezaplatená">Nezaplatená</option>
                          <option value="Poslaná FA">Poslaná FA</option>
                          <option value="Vyplatená">Vyplatená</option>
                        </select>
                      </td>

                      <td className="vyplaty-mobile-cell" data-label="Hodiny" style={{ padding: '11px 16px', color: jeVyplatena ? '#86868b' : '#1d1d1f', fontWeight: '700', textAlign: 'right', fontSize: '12px' }}>{hodiny.toFixed(2)} h</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div
      className="admin-page-shell"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f7',
        padding: '24px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#1d1d1f',
        display: 'flex',
        gap: '24px',
        alignItems: 'flex-start'
      }}
    >
      <style>{`
        @media (max-width: 1024px) {
          .admin-page-shell {
            padding:
              calc(64px + env(safe-area-inset-top))
              max(12px, env(safe-area-inset-right))
              calc(20px + env(safe-area-inset-bottom))
              max(12px, env(safe-area-inset-left)) !important;
            display: block !important;
          }

          .hlavny-kontajner {
            max-width: 100% !important;
          }

          .vyplaty-grid-3,
          .vyplaty-grid-summary,
          .vyplaty-billing-summary {
            grid-template-columns: 1fr !important;
          }

          .vyplaty-grid-3 > div,
          .vyplaty-grid-summary > div,
          .vyplaty-billing-summary > div {
            border-right: none !important;
            border-bottom: 1px solid #eeeeef;
          }

          .vyplaty-mobile-scroll {
            margin-left: -16px;
            margin-right: -16px;
            padding-left: 16px;
            padding-right: 16px;
          }

          .vyplaty-period-actions {
            width: 100%;
          }

          .vyplaty-period-actions button {
            flex: 1 1 30%;
            min-height: 42px;
          }

          .vyplaty-toolbar {
            width: 100%;
          }

          .vyplaty-toolbar select,
          .vyplaty-toolbar button {
            width: 100% !important;
            min-height: 44px;
          }
        }

        @media (max-width: 600px) {
          .vyplaty-mobile-table {
            display: block;
            min-width: 0 !important;
            width: 100% !important;
          }

          .vyplaty-mobile-table thead {
            display: none;
          }

          .vyplaty-mobile-table tbody {
            display: grid;
            gap: 10px;
          }

          .vyplaty-mobile-table tr.vyplaty-mobile-row {
            display: block;
            border: 1px solid #e5e5e7 !important;
            border-radius: 14px;
            overflow: hidden;
            background: #ffffff;
          }

          .vyplaty-mobile-table td.vyplaty-mobile-cell {
            display: grid;
            grid-template-columns: 104px minmax(0, 1fr);
            gap: 10px;
            align-items: center;
            min-height: 42px;
            padding: 8px 12px !important;
            border-bottom: 1px solid rgba(0,0,0,0.055);
            text-align: left !important;
          }

          .vyplaty-mobile-table td.vyplaty-mobile-cell:last-child {
            border-bottom: none;
          }

          .vyplaty-mobile-table td.vyplaty-mobile-cell::before {
            content: attr(data-label);
            color: #86868b;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.45px;
          }

          .vyplaty-mobile-table tr.vyplaty-empty-row {
            display: table-row !important;
            border: none !important;
          }

          .vyplaty-mobile-table td.vyplaty-empty-cell {
            display: table-cell !important;
            border: none !important;
          }

          .vyplaty-mobile-table td.vyplaty-empty-cell::before {
            display: none !important;
          }

          .vyplaty-billing-table select {
            width: 100%;
            min-height: 40px;
          }
        }

        @page { size: A4 portrait; margin: 14mm; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body { background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; }
          .admin-page-shell { display: block !important; padding: 0 !important; background: white !important; }
          .skryt-pri-tlaci { display: none !important; }
          .ukazat-iba-pri-tlaci { display: block !important; }
          span.ukazat-iba-pri-tlaci { display: inline-block !important; }
          .hlavny-kontajner { boxShadow: none !important; padding: 0 !important; maxWidth: 100% !important; width: 100% !important; }
          .hlavny-kontajner > *:not(.pdf-vyplata) { display: none !important; }
          .pdf-vyplata { display: block !important; }
          table { width: 100% !important; min-width: 0 !important; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          h1, h2, h3, h4 { break-after: avoid; }
        }
        .ukazat-iba-pri-tlaci { display: none; }
      `}</style>

      <div className="skryt-pri-tlaci">
        <AdminSidebar active="mzdy" />
      </div>

      <div className="hlavny-kontajner" style={{ width: '100%', flex: 1, minWidth: 0, maxWidth: '1540px', margin: '0 auto' }}>
        <div className="skryt-pri-tlaci" style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Firemná administrácia
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', lineHeight: '1.1', letterSpacing: '-0.035em', color: '#1d1d1f', fontWeight: '700' }}>
            Výplaty
          </h1>
          <div style={{ fontSize: '11px', color: '#86868b', marginTop: '5px' }}>
            Výplatné obdobia, mzdy pracovníkov a fakturácia stavieb na jednom mieste.
          </div>
        </div>

        <div className="pdf-vyplata ukazat-iba-pri-tlaci" style={{ width: '100%' }}>
          <div style={{ borderBottom: '2px solid #1d1d1f', paddingBottom: '10px', marginBottom: '18px' }}>
            <div style={{ fontSize: '10px', color: '#86868b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Stavby Domy · výplaty</div>
            <h1 style={{ fontSize: '22px', margin: '4px 0 0 0', color: '#1d1d1f' }}>{nazovVyplatnehoObdobia}</h1>
            <div style={{ fontSize: '11px', color: '#86868b', marginTop: '4px' }}>{nazovMesiacaBezPolovice}</div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #d2d2d7' }}>
                <th style={{ padding: '9px 8px', textAlign: 'left', fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pracovník</th>
                <th style={{ padding: '9px 8px', textAlign: 'right', fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hodiny</th>
                <th style={{ padding: '9px 8px', textAlign: 'right', fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Zarobil</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(zamestnanciHodiny)
                .sort(([menoA], [menoB]) => menoA.localeCompare(menoB, 'sk'))
                .map(([meno, hodiny]) => {
                  const dbZamestnanec = databazoviZamestnanci.find(z => z.meno === meno)
                  const sadzba = dbZamestnanec ? Number(dbZamestnanec.sadzba) || 0 : 0
                  const suma = hodiny * sadzba

                  return (
                    <tr key={meno} style={{ borderBottom: '1px solid #eeeeef' }}>
                      <td style={{ padding: '11px 8px', fontWeight: '650', color: '#1d1d1f' }}>{meno}</td>
                      <td style={{ padding: '11px 8px', textAlign: 'right', color: '#1d1d1f' }}>{hodiny.toFixed(2)} h</td>
                      <td style={{ padding: '11px 8px', textAlign: 'right', fontWeight: '750', color: '#1d1d1f' }}>{suma.toFixed(2)} €</td>
                    </tr>
                  )
                })}
              <tr style={{ borderTop: '2px solid #1d1d1f' }}>
                <td style={{ padding: '12px 8px', fontWeight: '750' }}>Spolu</td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '750' }}>{celkoveOdpracovaneHodiny.toFixed(2)} h</td>
                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '800' }}>{celkovaSumaNaVyplatu.toFixed(2)} €</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="skryt-pri-tlaci" style={{ ...cardStyle, padding: '0', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #eeeeef', display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '750', color: '#1d1d1f' }}>Výplatný mesiac</div>
              <div style={{ fontSize: '10px', color: '#86868b', marginTop: '3px' }}>Fond hodín na jedného pracovníka · sviatky sa počítajú ako bežný pracovný deň.</div>
            </div>

            <div className="vyplaty-toolbar" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={filterMesiac} onChange={(e) => setFilterMesiac(e.target.value)} style={{...inputStyle, width: 'auto', minWidth: '148px', backgroundColor: '#ffffff'} as any}>
                {zoznamMesiacov.map((m) => <option key={m.hodnota} value={m.hodnota}>{m.nazov}</option>)}
              </select>
              <button
                onClick={spustitExport}
                disabled={filterPolovica === 'cely'}
                title={filterPolovica === 'cely' ? 'Vyberte 1.–15. alebo 16.–koniec mesiaca' : 'Vytlačiť jednoduchý prehľad výplaty do PDF'}
                style={{
                  ...buttonPrimaryStyle,
                  fontSize: '10px',
                  padding: '8px 14px',
                  opacity: filterPolovica === 'cely' ? 0.45 : 1,
                  cursor: filterPolovica === 'cely' ? 'not-allowed' : 'pointer'
                } as any}
                onMouseEnter={(e) => {
                  if (filterPolovica !== 'cely') (e.currentTarget as any).style.backgroundColor = '#0077ed'
                }}
                onMouseLeave={(e) => {
                  if (filterPolovica !== 'cely') (e.currentTarget as any).style.backgroundColor = '#0071e3'
                }}
              >
                {filterPolovica === 'prva' ? 'PDF 1.–15.' : filterPolovica === 'druha' ? 'PDF 16.–koniec' : 'PDF · vyber polovicu'}
              </button>
            </div>
          </div>

          <div className="vyplaty-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', borderBottom: '1px solid #eeeeef' }}>
            <div style={{ padding: '18px 20px', borderRight: '1px solid #eeeeef', backgroundColor: filterPolovica === 'prva' ? '#f7fbff' : '#ffffff' }}>
              <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>1.–15.</div>
              <div style={{ marginTop: '7px', fontSize: '26px', fontWeight: '750', color: '#1d1d1f', letterSpacing: '-0.03em' }}>{fondPrvaPolovica.toFixed(1)} h</div>
              <div style={{ fontSize: '9px', color: '#86868b', marginTop: '5px' }}>Fond 1. výplatného obdobia</div>
            </div>
            <div style={{ padding: '18px 20px', borderRight: '1px solid #eeeeef', backgroundColor: filterPolovica === 'druha' ? '#f7fbff' : '#ffffff' }}>
              <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>16.–koniec</div>
              <div style={{ marginTop: '7px', fontSize: '26px', fontWeight: '750', color: '#1d1d1f', letterSpacing: '-0.03em' }}>{fondDruhaPolovica.toFixed(1)} h</div>
              <div style={{ fontSize: '9px', color: '#86868b', marginTop: '5px' }}>Fond 2. výplatného obdobia</div>
            </div>
            <div style={{ padding: '18px 20px', backgroundColor: filterPolovica === 'cely' ? '#f7fbff' : '#ffffff' }}>
              <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Celý mesiac</div>
              <div style={{ marginTop: '7px', fontSize: '26px', fontWeight: '750', color: '#0071e3', letterSpacing: '-0.03em' }}>{fondCelyMesiac.toFixed(1)} h</div>
              <div style={{ fontSize: '9px', color: '#86868b', marginTop: '5px' }}>{nazovMesiacaBezPolovice}</div>
            </div>
          </div>

          <div className="vyplaty-period-actions" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '10px', color: '#86868b', fontWeight: '650', marginRight: '4px' }}>Zobraziť výplatu:</span>
            {[
              { key: 'cely', label: 'Celý mesiac' },
              { key: 'prva', label: '1.–15.' },
              { key: 'druha', label: '16.–koniec' }
            ].map(obdobie => {
              const aktivne = filterPolovica === obdobie.key
              return (
                <button
                  key={obdobie.key}
                  type="button"
                  onClick={() => setFilterPolovica(obdobie.key)}
                  style={{
                    padding: '6px 11px',
                    borderRadius: '9px',
                    border: aktivne ? '1px solid #0071e3' : '1px solid #d2d2d7',
                    backgroundColor: aktivne ? '#e8f3ff' : '#ffffff',
                    color: aktivne ? '#0066cc' : '#6e6e73',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: aktivne ? '700' : '600'
                  }}
                >
                  {obdobie.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="skryt-pri-tlaci" style={{ ...cardStyle, padding: '0', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #eeeeef' }}>
            <div style={{ fontSize: '14px', fontWeight: '750', color: '#1d1d1f' }}>Súhrn výplatných období</div>
            <div style={{ fontSize: '10px', color: '#86868b', marginTop: '3px' }}>Prehľad 1.–15., 16.–koniec a celého mesiaca · {nazovMesiacaBezPolovice}</div>
          </div>

          <div className="vyplaty-grid-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(190px, 1fr))' }}>
            <div style={{ padding: '16px 18px', borderRight: '1px solid #eeeeef' }}>
              <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Výplata 1 · 1.–15.</div>
              <div style={{ marginTop: '7px', fontSize: '20px', fontWeight: '750', color: '#1d1d1f' }}>{suhrnPrvaPolovica.hodiny.toFixed(2)} h</div>
              <div style={{ marginTop: '4px', fontSize: '15px', fontWeight: '750', color: '#0071e3' }}>{suhrnPrvaPolovica.suma.toFixed(2)} €</div>
            </div>

            <div style={{ padding: '16px 18px', borderRight: '1px solid #eeeeef' }}>
              <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Výplata 2 · 16.–koniec</div>
              <div style={{ marginTop: '7px', fontSize: '20px', fontWeight: '750', color: '#1d1d1f' }}>{suhrnDruhaPolovica.hodiny.toFixed(2)} h</div>
              <div style={{ marginTop: '4px', fontSize: '15px', fontWeight: '750', color: '#0071e3' }}>{suhrnDruhaPolovica.suma.toFixed(2)} €</div>
            </div>

            <div style={{ padding: '16px 18px', backgroundColor: '#f7fbff' }}>
              <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Spolu mesiac</div>
              <div style={{ marginTop: '7px', fontSize: '20px', fontWeight: '750', color: '#1d1d1f' }}>{suhrnCelyMesiac.hodiny.toFixed(2)} h</div>
              <div style={{ marginTop: '4px', fontSize: '15px', fontWeight: '750', color: '#0071e3' }}>{suhrnCelyMesiac.suma.toFixed(2)} €</div>
            </div>
          </div>
        </div>

        <div className="skryt-pri-tlaci" style={{ ...cardStyle, padding: '0', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #eeeeef' }}>
            <div style={{ fontSize: '14px', fontWeight: '750', color: '#1d1d1f' }}>Pracovníci za celý mesiac</div>
            <div style={{ fontSize: '10px', color: '#86868b', marginTop: '3px' }}>Obe výplatné obdobia pri každom pracovníkovi · {nazovMesiacaBezPolovice}</div>
          </div>

          <div className="vyplaty-mobile-scroll" style={{ overflowX: 'auto' }}>
            <table className="vyplaty-mobile-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '920px', fontSize: '11px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f7f7f8', borderBottom: '1px solid #e5e5e7' }}>
                  <th style={{ padding: '10px 18px', textAlign: 'left', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px' }}>Pracovník</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px' }}>1.–15. hodiny</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px' }}>Výplata 1</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px' }}>16.–koniec hodiny</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px' }}>Výplata 2</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px' }}>Spolu hodiny</th>
                  <th style={{ padding: '10px 18px', textAlign: 'right', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px' }}>Spolu €</th>
                </tr>
              </thead>
              <tbody>
                {pracovniciMesacneZoradeni.length === 0 ? (
                  <tr className="vyplaty-empty-row"><td className="vyplaty-empty-cell" colSpan={7} style={{ padding: '28px 18px', textAlign: 'center', color: '#a1a1a6' }}>Pre tento mesiac nie sú žiadne dáta.</td></tr>
                ) : (
                  pracovniciMesacneZoradeni.map(([meno, data]) => {
                    const prvaSuma = data.prvaHodiny * data.sadzba
                    const druhaSuma = data.druhaHodiny * data.sadzba
                    const spoluHodiny = data.prvaHodiny + data.druhaHodiny
                    const spoluSuma = prvaSuma + druhaSuma

                    return (
                      <tr key={meno} className="vyplaty-mobile-row" style={{ borderBottom: '1px solid #eeeeef' }}>
                        <td className="vyplaty-mobile-cell" data-label="Pracovník" style={{ padding: '11px 18px', color: '#1d1d1f', fontWeight: '650' }}>{meno}</td>
                        <td className="vyplaty-mobile-cell" data-label="1.–15. hodiny" style={{ padding: '11px 12px', textAlign: 'right', color: '#1d1d1f' }}>{data.prvaHodiny.toFixed(2)} h</td>
                        <td className="vyplaty-mobile-cell" data-label="Výplata 1" style={{ padding: '11px 12px', textAlign: 'right', color: '#0071e3', fontWeight: '650' }}>{prvaSuma.toFixed(2)} €</td>
                        <td className="vyplaty-mobile-cell" data-label="16.–koniec" style={{ padding: '11px 12px', textAlign: 'right', color: '#1d1d1f' }}>{data.druhaHodiny.toFixed(2)} h</td>
                        <td className="vyplaty-mobile-cell" data-label="Výplata 2" style={{ padding: '11px 12px', textAlign: 'right', color: '#0071e3', fontWeight: '650' }}>{druhaSuma.toFixed(2)} €</td>
                        <td className="vyplaty-mobile-cell" data-label="Spolu hodiny" style={{ padding: '11px 12px', textAlign: 'right', color: '#1d1d1f', fontWeight: '650' }}>{spoluHodiny.toFixed(2)} h</td>
                        <td className="vyplaty-mobile-cell" data-label="Spolu €" style={{ padding: '11px 18px', textAlign: 'right', color: '#1d1d1f', fontWeight: '750' }}>{spoluSuma.toFixed(2)} €</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="print-card" style={{ marginBottom: '20px', pageBreakInside: 'avoid', ...cardStyle, padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #eeeeef', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#1d1d1f', fontSize: '16px', fontWeight: '750' }}>Detail vybraného obdobia</div>
              <div style={{ color: '#86868b', fontSize: '10px', marginTop: '3px' }}>{nazovVyplatnehoObdobia} · fond {fondVybranehoObdobia.toFixed(1)} h / pracovník</div>
            </div>
          </div>

          <div className="vyplaty-grid-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(170px, 1fr))', borderBottom: '1px solid #eeeeef' }}>
            <div style={{ padding: '14px 18px', borderRight: '1px solid #eeeeef' }}>
              <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Pracovníci</div>
              <div style={{ fontSize: '22px', fontWeight: '750', color: '#1d1d1f', marginTop: '5px' }}>{pocetPracovnikovVyplata}</div>
            </div>
            <div style={{ padding: '14px 18px', borderRight: '1px solid #eeeeef' }}>
              <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Odpracované spolu</div>
              <div style={{ fontSize: '22px', fontWeight: '750', color: '#1d1d1f', marginTop: '5px' }}>{celkoveOdpracovaneHodiny.toFixed(2)} h</div>
            </div>
            <div style={{ padding: '14px 18px', backgroundColor: '#f7fbff' }}>
              <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Na výplatu spolu</div>
              <div style={{ fontSize: '22px', fontWeight: '750', color: '#0071e3', marginTop: '5px' }}>{celkovaSumaNaVyplatu.toFixed(2)} €</div>
            </div>
          </div>

          <div className="vyplaty-mobile-scroll" style={{ overflowX: 'auto' }}>
            <table className="vyplaty-mobile-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px', fontSize: '12px' }}>
              <thead>
                <tr style={{ textAlign: 'left', backgroundColor: '#f7f7f8', borderBottom: '1px solid #e5e5e7' }}>
                  <th style={{ padding: '11px 18px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Pracovník</th>
                  <th style={{ padding: '11px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', textAlign: 'right' }}>Odpracované</th>
                  <th style={{ padding: '11px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', textAlign: 'right' }}>Fond</th>
                  <th style={{ padding: '11px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', textAlign: 'right' }}>Rozdiel</th>
                  <th style={{ padding: '11px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', textAlign: 'right' }}>Sadzba</th>
                  <th style={{ padding: '11px 18px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', textAlign: 'right' }}>Na výplatu</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(zamestnanciHodiny).length === 0 ? (
                  <tr className="vyplaty-empty-row"><td className="vyplaty-empty-cell" colSpan={6} style={{ padding: '30px 18px', color: '#a1a1a6', textAlign: 'center', fontSize: '11px' }}>Pre vybrané obdobie nie sú žiadne dáta.</td></tr>
                ) : (
                  Object.entries(zamestnanciHodiny).map(([meno, hodiny]) => {
                    const dbZamestnanec = databazoviZamestnanci.find(z => z.meno === meno)
                    const sadzba = dbZamestnanec ? dbZamestnanec.sadzba : 0
                    const mzda = hodiny * sadzba
                    const rozdiel = hodiny - fondVybranehoObdobia
                    
                    return (
                      <tr key={meno} className="vyplaty-mobile-row" style={{ borderBottom: '1px solid #eeeeef' }}>
                        <td className="vyplaty-mobile-cell" data-label="Pracovník" style={{ padding: '12px 18px', color: '#1d1d1f', fontWeight: '650' }}>{meno}</td>
                        <td className="vyplaty-mobile-cell" data-label="Odpracované" style={{ padding: '12px', color: '#1d1d1f', textAlign: 'right', fontWeight: '650' }}>{hodiny.toFixed(2)} h</td>
                        <td className="vyplaty-mobile-cell" data-label="Fond" style={{ padding: '12px', color: '#86868b', textAlign: 'right' }}>{fondVybranehoObdobia.toFixed(1)} h</td>
                        <td className="vyplaty-mobile-cell" data-label="Rozdiel" style={{ padding: '12px', textAlign: 'right' }}>
                          <span style={{
                            display: 'inline-block',
                            minWidth: '64px',
                            padding: '4px 7px',
                            borderRadius: '9px',
                            backgroundColor: rozdiel >= 0 ? '#ecfdf5' : '#fef2f2',
                            color: rozdiel >= 0 ? '#047857' : '#b42318',
                            fontWeight: '700',
                            fontSize: '10px'
                          }}>
                            {rozdiel >= 0 ? '+' : ''}{rozdiel.toFixed(1)} h
                          </span>
                        </td>
                        <td className="vyplaty-mobile-cell" data-label="Sadzba" style={{ padding: '12px', textAlign: 'right', color: '#86868b', fontSize: '11px' }}>
                          {sadzba > 0 ? `${sadzba.toFixed(2)} €/h` : 'Nenastavená'}
                        </td>
                        <td className="vyplaty-mobile-cell" data-label="Na výplatu" style={{ padding: '12px 18px', color: '#1d1d1f', fontWeight: '750', textAlign: 'right', fontSize: '14px' }}>{mzda.toFixed(2)} €</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: '4px' }}>
          <div style={{ ...cardStyle, padding: '0', overflow: 'hidden', marginBottom: '16px', pageBreakInside: 'avoid' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #eeeeef' }}>
              <div style={{ color: '#1d1d1f', fontSize: '16px', fontWeight: '750' }}>Fakturácia stavieb</div>
              <div style={{ color: '#86868b', fontSize: '10px', marginTop: '3px' }}>
                Stav fakturácie stavieb pre {nazovVyplatnehoObdobia.toLowerCase()}.
              </div>
            </div>

            <div className="vyplaty-billing-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(170px, 1fr))' }}>
              <div style={{ padding: '14px 18px', borderRight: '1px solid #eeeeef', backgroundColor: '#fffafa' }}>
                <div style={{ fontSize: '9px', color: '#b42318', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Nezaplatené</div>
                <div style={{ fontSize: '22px', color: '#1d1d1f', fontWeight: '750', marginTop: '5px' }}>{nezaplateneStavby.length}</div>
                <div style={{ fontSize: '9px', color: '#86868b', marginTop: '4px' }}>
                  {nezaplateneStavby.reduce((sucet, [, hodiny]) => sucet + hodiny, 0).toFixed(2)} h
                </div>
              </div>
              <div style={{ padding: '14px 18px', borderRight: '1px solid #eeeeef', backgroundColor: '#fffdf7' }}>
                <div style={{ fontSize: '9px', color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Poslaná FA</div>
                <div style={{ fontSize: '22px', color: '#1d1d1f', fontWeight: '750', marginTop: '5px' }}>{poslaneFaStavby.length}</div>
                <div style={{ fontSize: '9px', color: '#86868b', marginTop: '4px' }}>
                  {poslaneFaStavby.reduce((sucet, [, hodiny]) => sucet + hodiny, 0).toFixed(2)} h
                </div>
              </div>
              <div style={{ padding: '14px 18px', backgroundColor: '#f8fdfb' }}>
                <div style={{ fontSize: '9px', color: '#047857', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Vyplatené</div>
                <div style={{ fontSize: '22px', color: '#1d1d1f', fontWeight: '750', marginTop: '5px' }}>{vyplateneStavby.length}</div>
                <div style={{ fontSize: '9px', color: '#86868b', marginTop: '4px' }}>
                  {vyplateneStavby.reduce((sucet, [, hodiny]) => sucet + hodiny, 0).toFixed(2)} h
                </div>
              </div>
            </div>
          </div>

          <RenderujTabulkuStavieb zoznam={nezaplateneStavby} nadpis="Nezaplatené" predvolenyStav="Nezaplatená" />
          <RenderujTabulkuStavieb zoznam={poslaneFaStavby} nadpis="Poslaná FA" predvolenyStav="Poslaná FA" />
          <RenderujTabulkuStavieb zoznam={vyplateneStavby} nadpis="Vyplatené" predvolenyStav="Vyplatená" />
        </div>

      </div>
    </div>
  )
}