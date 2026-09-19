'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import { adminStore } from '../../lib/store'

export default function MzdyPage() {
  const [zadaneHeslo, setZadaneHeslo] = useState('')
  const [jeOdomknute, setJeOdomknute] = useState(adminStore.jeOdomknute)
  const [chybaHesla, setChybaHesla] = useState(false)
  const SPRAVNE_HESLO = 'sef123'

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
        @media print {
          body { backgroundColor: white !important; color: black !important; padding: 0 !important; }
          .admin-page-shell { display: block !important; padding: 0 !important; background: white !important; }
          .skryt-pri-tlaci { display: none !important; }
          .ukazat-iba-pri-tlaci { display: inline-block !important; }
          .hlavny-kontajner { boxShadow: none !important; padding: 20px !important; maxWidth: 100% !important; width: 100% !important; }
          tr { pageBreakInside: avoid; }
        }
        .ukazat-iba-pri-tlaci { display: none; }
      `}</style>

      <div className="skryt-pri-tlaci">
        <AdminSidebar
          active="mzdy"
          onLogout={() => { adminStore.jeOdomknute = false; setJeOdomknute(false) }}
        />
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
            Mesačné hodiny, mzdy a stav fakturácie podľa stavieb.
          </div>
        </div>

        <div className="ukazat-iba-pri-tlaci" style={{ width: '100%', borderBottom: '2px solid #1d1d1f', paddingBottom: '12px', marginBottom: '20px' }}>
          <h1 style={{ fontSize: '22px', margin: 0, color: '#1d1d1f' }}>Mesačný prehľad uzávierky</h1>
          <p style={{ fontSize: '12px', margin: '4px 0 0 0', color: '#86868b' }}>Obdobie: <strong>{aktualnyNazovMesiaca}</strong></p>
        </div>

        <div className="skryt-pri-tlaci" style={{ ...cardStyle, padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #eeeeef', display: 'flex', justifyContent: 'space-between', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '750', color: '#1d1d1f' }}>Mesačný prehľad</div>
              <div style={{ fontSize: '10px', color: '#86868b', marginTop: '3px' }}>Fond hodín na jedného pracovníka · sviatky sa počítajú ako bežný pracovný deň.</div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <select value={filterMesiac} onChange={(e) => setFilterMesiac(e.target.value)} style={{...inputStyle, width: 'auto', minWidth: '148px', backgroundColor: '#ffffff'} as any}>
                {zoznamMesiacov.map((m) => <option key={m.hodnota} value={m.hodnota}>{m.nazov}</option>)}
              </select>
              <button
                onClick={spustitExport}
                style={{ ...buttonPrimaryStyle, fontSize: '10px', padding: '8px 14px' } as any}
                onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = '#0077ed'}
                onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = '#0071e3'}
              >
                PDF
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', borderBottom: '1px solid #eeeeef' }}>
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

          <div style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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

        <div className="skryt-pri-tlaci" style={{ ...cardStyle, padding: '0', overflow: 'hidden', marginBottom: '24px' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #eeeeef' }}>
            <div style={{ fontSize: '14px', fontWeight: '750', color: '#1d1d1f' }}>Porovnanie výplat v mesiaci</div>
            <div style={{ fontSize: '10px', color: '#86868b', marginTop: '3px' }}>Obe výplatné obdobia naraz · {nazovMesiacaBezPolovice}</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(190px, 1fr))' }}>
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

        <div style={{ marginBottom: '30px', pageBreakInside: 'avoid', ...cardStyle, padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #eeeeef', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ color: '#1d1d1f', fontSize: '16px', fontWeight: '750' }}>Výplaty pracovníkov</div>
              <div style={{ color: '#86868b', fontSize: '10px', marginTop: '3px' }}>{nazovVyplatnehoObdobia} · fond {fondVybranehoObdobia.toFixed(1)} h / pracovník</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(170px, 1fr))', borderBottom: '1px solid #eeeeef' }}>
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

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '860px', fontSize: '12px' }}>
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
                  <tr><td colSpan={6} style={{ padding: '30px 18px', color: '#a1a1a6', textAlign: 'center', fontSize: '11px' }}>Pre vybrané obdobie nie sú žiadne dáta.</td></tr>
                ) : (
                  Object.entries(zamestnanciHodiny).map(([meno, hodiny]) => {
                    const dbZamestnanec = databazoviZamestnanci.find(z => z.meno === meno)
                    const sadzba = dbZamestnanec ? dbZamestnanec.sadzba : 0
                    const mzda = hodiny * sadzba
                    const rozdiel = hodiny - fondVybranehoObdobia
                    
                    return (
                      <tr key={meno} style={{ borderBottom: '1px solid #eeeeef' }}>
                        <td style={{ padding: '12px 18px', color: '#1d1d1f', fontWeight: '650' }}>{meno}</td>
                        <td style={{ padding: '12px', color: '#1d1d1f', textAlign: 'right', fontWeight: '650' }}>{hodiny.toFixed(2)} h</td>
                        <td style={{ padding: '12px', color: '#86868b', textAlign: 'right' }}>{fondVybranehoObdobia.toFixed(1)} h</td>
                        <td style={{ padding: '12px', textAlign: 'right' }}>
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
                        <td style={{ padding: '12px', textAlign: 'right', color: '#86868b', fontSize: '11px' }}>
                          {sadzba > 0 ? `${sadzba.toFixed(2)} €/h` : 'Nenastavená'}
                        </td>
                        <td style={{ padding: '12px 18px', color: '#1d1d1f', fontWeight: '750', textAlign: 'right', fontSize: '14px' }}>{mzda.toFixed(2)} €</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <div style={{ ...cardStyle, padding: '0', overflow: 'hidden', marginBottom: '16px', pageBreakInside: 'avoid' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #eeeeef' }}>
              <div style={{ color: '#1d1d1f', fontSize: '16px', fontWeight: '750' }}>Fakturácia stavieb</div>
              <div style={{ color: '#86868b', fontSize: '10px', marginTop: '3px' }}>
                Stav fakturácie pre {nazovVyplatnehoObdobia.toLowerCase()}.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(170px, 1fr))' }}>
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