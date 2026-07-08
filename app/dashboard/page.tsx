'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { adminStore } from '../../lib/store'

export default function DashboardPage() {
  const [zadaneHeslo, setZadaneHeslo] = useState('')
  const [jeOdomknute, setJeOdomknute] = useState(adminStore.jeOdomknute)
  const [chybaHesla, setChybaHesla] = useState(false)
  const SPRAVNE_HESLO = 'sef123'

  const [zaznamy, setZaznamy] = useState<any[]>([])
  const [filterMesiac, setFilterMesiac] = useState(new Date().toISOString().slice(0, 7))
  const [filterDen, setFilterDen] = useState('')
  const [filterZakazka, setFilterZakazka] = useState('')
  
  const [dostupneZakazky, setDostupneZakazky] = useState<string[]>([])
  const [dostupneMena, setDostupneMena] = useState<string[]>([])

  const [ukazatFormular, setUkazatFormular] = useState(false)
  const [noveZaznamy, setNoveZaznamy] = useState([
    { datum: new Date().toISOString().split('T')[0], mena: [] as string[], zakazka: '', prichod: '', odchod: '' }
  ])

  function skontrolovatHeslo(e: React.FormEvent) {
    e.preventDefault()
    if (zadaneHeslo === SPRAVNE_HESLO) {
      adminStore.jeOdomknute = true
      setJeOdomknute(true)
      setChybaHesla(false)
    } else setChybaHesla(true)
  }

  const zoznamMesiacov = [
    { hodnota: '2026-01', nazov: 'Január 2026' }, { hodnota: '2026-02', nazov: 'Február 2026' }, { hodnota: '2026-03', nazov: 'Marec 2026' }, { hodnota: '2026-04', nazov: 'Apríl 2026' }, { hodnota: '2026-05', nazov: 'Máj 2026' }, { hodnota: '2026-06', nazov: 'Jún 2026' }, { hodnota: '2026-07', nazov: 'Júl 2026' }, { hodnota: '2026-08', nazov: 'August 2026' }, { hodnota: '2026-09', nazov: 'September 2026' }, { hodnota: '2026-10', nazov: 'Október 2026' }, { hodnota: '2026-11', nazov: 'November 2026' }, { hodnota: '2026-12', nazov: 'December 2026' },
  ]

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

  function jePodozrivyCas(prichod: string, odchod: string, hodiny: number) {
    if (!prichod || !odchod) return true
    if (prichod < '05:00') return true     
    if (odchod > '21:00') return true      
    if (hodiny > 14 || hodiny <= 0) return true 
    return false
  }

  async function nacitajFiltre() {
    const { data } = await supabase.from('dochadzka').select('zakazka, meno')
    if (data) {
      const unikatneZakazky = Array.from(new Set(data.map(z => z.zakazka))).filter(Boolean)
      const unikatneMena = Array.from(new Set(data.map(z => z.meno))).filter(Boolean)
      setDostupneZakazky(unikatneZakazky.sort() as string[])
      setDostupneMena(unikatneMena.sort() as string[])
    }
  }

  async function nacitaj() {
    let query = supabase.from('dochadzka').select('*').order('datum', { ascending: false })
    if (filterDen) query = query.eq('datum', filterDen)
    else if (filterMesiac) {
      const [rok, mesiac] = filterMesiac.split('-')
      if (rok && mesiac) {
        const pocetDni = new Date(parseInt(rok), parseInt(mesiac), 0).getDate()
        query = query.gte('datum', `${rok}-${mesiac}-01`).lte('datum', `${rok}-${mesiac}-${pocetDni}`)
      }
    }
    if (filterZakazka) query = query.eq('zakazka', filterZakazka)
    const { data, error } = await query
    if (error) console.error("Chyba Supabase:", error.message)
    else setZaznamy(data || [])
  }

  async function vymazat(id: string) {
    if (!confirm('Naozaj vymazať?')) return
    await supabase.from('dochadzka').delete().eq('id', id)
    nacitaj()
    nacitajFiltre()
  }

  function pridatPrazdnyZaznam() {
    setNoveZaznamy([...noveZaznamy, { datum: new Date().toISOString().split('T')[0], mena: [], zakazka: '', prichod: '', odchod: '' }])
  }

  function zmenaNovehoZaznamu(index: number, pole: string, hodnota: string) {
    const upravene = [...noveZaznamy]
    upravene[index] = { ...upravene[index], [pole]: hodnota }
    setNoveZaznamy(upravene)
  }

  function toggleMeno(index: number, meno: string) {
    const upravene = [...noveZaznamy]
    const aktualneMena = upravene[index].mena
    if (aktualneMena.includes(meno)) {
      upravene[index].mena = aktualneMena.filter(m => m !== meno)
    } else {
      upravene[index].mena = [...aktualneMena, meno]
    }
    setNoveZaznamy(upravene)
  }

  async function ulozitVsetkyNoveZaznamy() {
    const dataNaVlozenie: any[] = []
    
    noveZaznamy.forEach(z => {
      if (z.mena.length > 0 && z.zakazka && z.prichod && z.odchod && z.datum) {
        z.mena.forEach(meno => {
          dataNaVlozenie.push({ datum: z.datum, meno: meno, zakazka: z.zakazka, prichod: z.prichod, odchod: z.odchod })
        })
      }
    })
    
    if (dataNaVlozenie.length === 0) {
      alert('Chyba: Vyplňte všetky polia a vyberte zamestnanca.')
      return
    }

    const { error } = await supabase.from('dochadzka').insert(dataNaVlozenie)
    if (error) alert('Chyba: ' + error.message)
    else {
      setUkazatFormular(false)
      setNoveZaznamy([{ datum: new Date().toISOString().split('T')[0], mena: [], zakazka: '', prichod: '', odchod: '' }])
      nacitaj()
      nacitajFiltre()
    }
  }

  useEffect(() => { if (jeOdomknute) nacitajFiltre() }, [jeOdomknute])
  useEffect(() => { if (jeOdomknute) nacitaj() }, [filterMesiac, filterDen, filterZakazka, jeOdomknute])

  const celkoveHodiny = zaznamy.reduce((sucet, z) => sucet + vypocitajHodiny(z.prichod, z.odchod), 0)
  const pocetZaznamov = zaznamy.length
  
  const zamestnanciHodiny: Record<string, number> = {}
  zaznamy.forEach(z => { zamestnanciHodiny[z.meno] = (zamestnanciHodiny[z.meno] || 0) + vypocitajHodiny(z.prichod, z.odchod) })
  let najaktivnejsi = '-'; let maxHod = 0
  Object.entries(zamestnanciHodiny).forEach(([meno, h]) => { if (h > maxHod) { maxHod = h; najaktivnejsi = meno } })

  // ===== APPLE ŠTÝLY =====
  const inputStyle = { 
    padding: '12px 16px', 
    borderRadius: '10px',
    border: '1px solid #d2d2d7', 
    outline: 'none', 
    fontSize: '14px', 
    width: '100%', 
    backgroundColor: '#f5f5f7',
    color: '#000',
    fontFamily: 'inherit',
    transition: 'all 0.2s'
  }
  
  const labelStyle = { 
    display: 'block', 
    fontSize: '11px', 
    color: '#86868b', 
    marginBottom: '8px', 
    textTransform: 'uppercase' as const, 
    letterSpacing: '0.8px',
    fontWeight: '500'
  }

  const buttonPrimaryStyle = {
    padding: '10px 24px',
    backgroundColor: '#0071e3',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    fontWeight: '500',
    borderRadius: '98px',
    transition: 'all 0.2s',
  }

  const buttonSecondaryStyle = {
    padding: '10px 24px',
    backgroundColor: '#f5f5f7',
    color: '#000',
    border: '1px solid #d2d2d7',
    cursor: 'pointer',
    fontSize: '13px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.8px',
    fontWeight: '500',
    borderRadius: '98px',
    transition: 'all 0.2s',
  }

  const cardStyle = {
    backgroundColor: '#ffffff',
    borderRadius: '18px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.08)'
  }

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fbfbfd', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <h2 style={{ color: '#000', marginBottom: '40px', fontSize: '32px', fontWeight: '600', letterSpacing: '-0.003em', margin: '0 0 40px 0' }}>Dochádzka</h2>
            <form onSubmit={skontrolovatHeslo}>
              <input 
                type="password" 
                placeholder="Heslo" 
                value={zadaneHeslo} 
                onChange={e => setZadaneHeslo(e.target.value)} 
                required 
                style={{ ...inputStyle, marginBottom: '30px', textAlign: 'center' }}
              />
              {chybaHesla && <p style={{ color: '#ff3b30', fontSize: '12px', marginTop: '-20px', marginBottom: '20px' }}>Nesprávne heslo.</p>}
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
    <div style={{ minHeight: '100vh', backgroundColor: '#fbfbfd', padding: '40px 20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#1d1d1f' }}>
      <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* NAVIGÁCIA */}
        <div style={{ display: 'flex', gap: '32px', paddingBottom: '40px', marginBottom: '50px', borderBottom: '1px solid #e5e5e5', flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: '#000', fontWeight: '600', fontSize: '14px', borderBottom: '2px solid #0071e3', paddingBottom: '4px' }}>Dochádzka</Link>
          <Link href="/zakazky" style={{ textDecoration: 'none', color: '#86868b', fontSize: '14px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#000'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Stavby</Link>
          <Link href="/zamestnanci" style={{ textDecoration: 'none', color: '#86868b', fontSize: '14px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#000'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Zamestnanci</Link>
          <Link href="/mzdy" style={{ textDecoration: 'none', color: '#86868b', fontSize: '14px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#000'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Výplaty</Link>
          <button onClick={() => { adminStore.jeOdomknute = false; setJeOdomknute(false); }} style={{ border: 'none', background: 'none', color: '#86868b', marginLeft: 'auto', cursor: 'pointer', fontSize: '14px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#000'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Odhlásiť sa</button>
        </div>

        {/* ŠTATISTIKY - APPLE CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '50px' }}>
          <div style={cardStyle}>
            <p style={{...labelStyle, margin: '0 0 12px 0'}}>Odpracované hodiny</p>
            <h3 style={{ margin: 0, fontSize: '36px', color: '#000', fontWeight: '600', lineHeight: '1' }}>{celkoveHodiny.toFixed(2)}</h3>
          </div>
          <div style={cardStyle}>
            <p style={{...labelStyle, margin: '0 0 12px 0'}}>Záznamy</p>
            <h3 style={{ margin: 0, fontSize: '36px', color: '#000', fontWeight: '600', lineHeight: '1' }}>{pocetZaznamov}</h3>
          </div>
          <div style={cardStyle}>
            <p style={{...labelStyle, margin: '0 0 12px 0'}}>Najaktívnejší</p>
            <h3 style={{ margin: 0, fontSize: '36px', color: '#000', fontWeight: '600', lineHeight: '1' }}>{najaktivnejsi}</h3>
          </div>
        </div>

        {/* TLAČIDLO PRE FORMULÁR */}
        <div style={{ marginBottom: '40px' }}>
          <button 
            onClick={() => setUkazatFormular(!ukazatFormular)} 
            style={{ 
              ...buttonPrimaryStyle,
              backgroundColor: ukazatFormular ? '#f5f5f7' : '#0071e3',
              color: ukazatFormular ? '#000' : '#fff',
              border: ukazatFormular ? '1px solid #d2d2d7' : 'none'
            } as any}
            onMouseEnter={(e) => {
              if (!ukazatFormular) (e.currentTarget as any).style.backgroundColor = '#0077ed'
              else (e.currentTarget as any).style.backgroundColor = '#efefef'
            }}
            onMouseLeave={(e) => {
              if (!ukazatFormular) (e.currentTarget as any).style.backgroundColor = '#0071e3'
              else (e.currentTarget as any).style.backgroundColor = '#f5f5f7'
            }}
          >
            {ukazatFormular ? '✕ Zavrieť' : '+ Zápis dochádzky'}
          </button>
        </div>

        {/* FORMULÁR */}
        {ukazatFormular && (
          <div style={{...cardStyle, marginBottom: '50px'}}>
            <datalist id="zoznam-zakaziek">{dostupneZakazky.map(zak => <option key={zak} value={zak} />)}</datalist>

            {noveZaznamy.map((z, i) => (
              <div key={i} style={{ marginBottom: i !== noveZaznamy.length - 1 ? '40px' : '0', paddingBottom: i !== noveZaznamy.length - 1 ? '40px' : '0', borderBottom: i !== noveZaznamy.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                  <div>
                    <label style={labelStyle}>Dátum</label>
                    <input type="date" value={z.datum} onChange={e => zmenaNovehoZaznamu(i, 'datum', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Zákazka</label>
                    <input list="zoznam-zakaziek" placeholder="Vybrať alebo napísať..." value={z.zakazka} onChange={e => zmenaNovehoZaznamu(i, 'zakazka', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Príchod</label>
                    <input type="time" value={z.prichod} onChange={e => zmenaNovehoZaznamu(i, 'prichod', e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Odchod</label>
                    <input type="time" value={z.odchod} onChange={e => zmenaNovehoZaznamu(i, 'odchod', e.target.value)} style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Zamestnanci</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginTop: '12px', marginBottom: '20px' }}>
                    {dostupneMena.map(meno => (
                      <button
                        key={meno} 
                        type="button" 
                        onClick={() => toggleMeno(i, meno)}
                        style={{
                          padding: '8px 16px',
                          border: z.mena.includes(meno) ? 'none' : '1px solid #d2d2d7',
                          cursor: 'pointer',
                          fontSize: '13px',
                          backgroundColor: z.mena.includes(meno) ? '#0071e3' : '#f5f5f7',
                          color: z.mena.includes(meno) ? '#fff' : '#000',
                          borderRadius: '20px',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!z.mena.includes(meno)) {
                            (e.currentTarget as any).style.backgroundColor = '#efefef'
                          } else {
                            (e.currentTarget as any).style.backgroundColor = '#0077ed'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!z.mena.includes(meno)) {
                            (e.currentTarget as any).style.backgroundColor = '#f5f5f7'
                          } else {
                            (e.currentTarget as any).style.backgroundColor = '#0071e3'
                          }
                        }}
                      >
                        {meno}
                      </button>
                    ))}
                    
                    <div style={{ display: 'flex', gap: '0', marginLeft: '20px' }}>
                      <input 
                        id={`noveMeno-${i}`} 
                        type="text" 
                        placeholder="Nové meno" 
                        style={{ 
                          ...inputStyle,
                          borderRadius: '10px 0 0 10px',
                          margin: '0'
                        } as any}
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          const input = document.getElementById(`noveMeno-${i}`) as HTMLInputElement;
                          if(input && input.value.trim()) {
                            const val = input.value.trim()
                            if(!dostupneMena.includes(val)) setDostupneMena([...dostupneMena, val])
                            if(!z.mena.includes(val)) toggleMeno(i, val)
                            input.value = ''
                          }
                        }} 
                        style={{
                          ...buttonSecondaryStyle,
                          borderRadius: '0 10px 10px 0',
                          borderLeft: 'none',
                          margin: '0'
                        } as any}
                        onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = '#efefef'}
                        onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = '#f5f5f7'}
                      >
                        Pridať
                      </button>
                    </div>
                  </div>
                </div>

                {noveZaznamy.length > 1 && (
                  <div style={{ marginTop: '20px' }}>
                    <button 
                      onClick={() => setNoveZaznamy(noveZaznamy.filter((_, index) => index !== i))} 
                      style={{ padding: '0', backgroundColor: 'transparent', color: '#ff3b30', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '500' }}>
                      Odstrániť blok
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            <div style={{ display: 'flex', gap: '12px', marginTop: '30px', flexWrap: 'wrap' }}>
              <button 
                onClick={pridatPrazdnyZaznam} 
                style={buttonSecondaryStyle as any}
                onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = '#efefef'}
                onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = '#f5f5f7'}
              >
                Pridať ďalší blok
              </button>
              <button 
                onClick={ulozitVsetkyNoveZaznamy} 
                style={buttonPrimaryStyle as any}
                onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = '#0077ed'}
                onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = '#0071e3'}
              >
                Uložiť záznamy
              </button>
            </div>
          </div>
        )}

        {/* FILTRE */}
        <div style={{...cardStyle, marginBottom: '40px', display: 'flex', gap: '16px', flexWrap: 'wrap'}}>
          <select 
            value={filterZakazka} 
            onChange={(e) => setFilterZakazka(e.target.value)} 
            style={{...inputStyle, flex: 1, minWidth: '150px'} as any}
          >
            <option value="">Všetky zákazky</option>
            {dostupneZakazky.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <select 
            value={filterMesiac} 
            disabled={!!filterDen} 
            onChange={(e) => setFilterMesiac(e.target.value)} 
            style={{...inputStyle, flex: 1, minWidth: '150px', opacity: filterDen ? 0.5 : 1} as any}
          >
            {zoznamMesiacov.map((m) => <option key={m.hodnota} value={m.hodnota}>{m.nazov}</option>)}
          </select>
          <input 
            type="date" 
            value={filterDen} 
            onChange={(e) => setFilterDen(e.target.value)} 
            style={{...inputStyle, flex: 1, minWidth: '150px'} as any}
          />
        </div>

        {/* TABUĽKA */}
        <div style={cardStyle}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '14px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #d2d2d7' }}>
                  <th style={{ padding: '16px', color: '#86868b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}>Dátum</th>
                  <th style={{ padding: '16px', color: '#86868b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}>Zamestnanec</th>
                  <th style={{ padding: '16px', color: '#86868b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}>Zákazka</th>
                  <th style={{ padding: '16px', color: '#86868b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}>Čas</th>
                  <th style={{ padding: '16px', color: '#86868b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}>Hodiny</th>
                  <th style={{ padding: '16px', color: '#86868b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '600' }}></th>
                </tr>
              </thead>
              <tbody>
                {zaznamy.length === 0 ? ( 
                  <tr><td colSpan={6} style={{ padding: '40px 16px', color: '#d2d2d7', textAlign: 'center', fontSize: '14px' }}>Žiadne dáta.</td></tr> 
                ) : (
                  zaznamy.map((z) => {
                    const hodinyRiadku = vypocitajHodiny(z.prichod, z.odchod)
                    const jeVikend = new Date(z.datum).getDay() === 0 || new Date(z.datum).getDay() === 6
                    const jePodozrivy = jePodozrivyCas(z.prichod, z.odchod, hodinyRiadku)

                    return (
                      <tr 
                        key={z.id} 
                        style={{ 
                          borderBottom: '1px solid #f5f5f7',
                          backgroundColor: jeVikend ? '#f5f5f7' : 'transparent',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f7'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = jeVikend ? '#f5f5f7' : 'transparent'}
                      >
                        <td style={{ padding: '16px', color: '#000', fontWeight: '500' }}>
                          {z.datum}
                          {jeVikend && <span style={{ fontSize: '9px', backgroundColor: '#ffb347', color: '#6f2c00', padding: '2px 6px', marginLeft: '8px', letterSpacing: '0.5px', textTransform: 'uppercase', borderRadius: '4px', fontWeight: '600' }}>Víkend</span>}
                        </td>
                        <td style={{ padding: '16px', fontWeight: '600', color: '#000' }}>{z.meno}</td>
                        <td style={{ padding: '16px', color: '#666' }}>{z.zakazka}</td>
                        
                        <td style={{ padding: '16px', color: jePodozrivy ? '#ff3b30' : '#666', fontWeight: jePodozrivy ? '600' : 'normal' }}>
                          {z.prichod} - {z.odchod}
                        </td>
                        <td style={{ padding: '16px', color: jePodozrivy ? '#ff3b30' : '#000', fontWeight: jePodozrivy ? '700' : '600' }} title={jePodozrivy ? "Tento čas vyzerá podozrivo. Skontrolujte príchod/odchod." : ""}>
                          {hodinyRiadku.toFixed(2)} {jePodozrivy && <span style={{ fontSize: '10px', marginLeft: '5px', textTransform: 'uppercase' }}>⚠</span>}
                        </td>

                        <td style={{ padding: '16px', textAlign: 'right' }}>
                          <button 
                            onClick={() => vymazat(z.id)} 
                            style={{ color: '#d2d2d7', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500', transition: 'color 0.2s' }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#ff3b30'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#d2d2d7'}
                          >
                            Zmazať
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}