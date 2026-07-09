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

  const [upravovaneId, setUpravovaneId] = useState<string | null>(null)
  const [upravovanePrichod, setUpravovanePrichod] = useState('')
  const [upravovaneOdchod, setUpravovaneOdchod] = useState('')
  const [upravovaneHodiny, setUpravovaneHodiny] = useState('')
  const [chybaUpravaHodiny, setChybaUpravaHodiny] = useState('')

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
    color: '#000',
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
    color: '#000',
    border: '1px solid #d2d2d7',
    cursor: 'pointer',
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.6px',
    fontWeight: '500',
    borderRadius: '98px',
    transition: 'all 0.2s',
  }

  function arePlacesValidMinutes(time: string): boolean {
    if (!time) return true
    const [hours, minutes] = time.split(':').map(Number)
    const validMinutes = [0, 15, 30, 45]
    return validMinutes.includes(minutes)
  }

  function getTimeValidationError(prichod: string, odchod: string): string {
    if (!prichod || !odchod) return ''
    if (!arePlacesValidMinutes(prichod)) return 'Príchod: Dovolené sú iba 00, 15, 30, 45 minút'
    if (!arePlacesValidMinutes(odchod)) return 'Odchod: Dovolené sú iba 00, 15, 30, 45 minút'
    return ''
  }

  function getDuplicateCount(datum: string, meno: string, excludeId?: string): number {
    return zaznamy.filter(z => 
      z.datum === datum && 
      z.meno === meno && 
      (!excludeId || z.id !== excludeId)
    ).length
  }

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

  function zacatUpravu(id: string, prichod: string, odchod: string) {
    setUpravovaneId(id)
    setUpravovanePrichod(prichod)
    setUpravovaneOdchod(odchod)
    setUpravovaneHodiny(vypocitajHodiny(prichod, odchod).toFixed(2))
    setChybaUpravaHodiny('')
  }

  function zrusitUpravu() {
    setUpravovaneId(null)
    setUpravovanePrichod('')
    setUpravovaneOdchod('')
    setUpravovaneHodiny('')
    setChybaUpravaHodiny('')
  }

  function handleTimeChange(isOdchod: boolean, value: string) {
    if (isOdchod) {
      setUpravovaneOdchod(value)
      if (upravovanePrichod && value) {
        const error = getTimeValidationError(upravovanePrichod, value)
        setChybaUpravaHodiny(error)
        if (!error) {
          setUpravovaneHodiny(vypocitajHodiny(upravovanePrichod, value).toFixed(2))
        }
      }
    } else {
      setUpravovanePrichod(value)
      if (value && upravovaneOdchod) {
        const error = getTimeValidationError(value, upravovaneOdchod)
        setChybaUpravaHodiny(error)
        if (!error) {
          setUpravovaneHodiny(vypocitajHodiny(value, upravovaneOdchod).toFixed(2))
        }
      }
    }
  }

  async function ulozitUpravu(id: string) {
    const error = getTimeValidationError(upravovanePrichod, upravovaneOdchod)
    if (error) {
      setChybaUpravaHodiny(error)
      return
    }

    const { error: supabaseError } = await supabase
      .from('dochadzka')
      .update({ prichod: upravovanePrichod, odchod: upravovaneOdchod })
      .eq('id', id)

    if (supabaseError) {
      console.error("Chyba úpravy:", supabaseError)
    } else {
      zrusitUpravu()
      nacitaj()
      nacitajFiltre()
    }
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
        const error = getTimeValidationError(z.prichod, z.odchod)
        if (error) {
          alert(error)
          return
        }
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

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fbfbfd', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <h2 style={{ color: '#1d1d1f', marginBottom: '20px', fontSize: '26px', fontWeight: '600', letterSpacing: '-0.003em', margin: '0 0 20px 0' }}>Dochádzka</h2>
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
          <Link href="/dashboard" style={{ textDecoration: 'none', color: '#1d1d1f', fontWeight: '600', fontSize: '13px', borderBottom: '2px solid #0071e3', paddingBottom: '2px' }}>Dochádzka</Link>
          <Link href="/zakazky" style={{ textDecoration: 'none', color: '#86868b', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Stavby</Link>
          <Link href="/zamestnanci" style={{ textDecoration: 'none', color: '#86868b', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Zamestnanci</Link>
          <Link href="/mzdy" style={{ textDecoration: 'none', color: '#86868b', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Výplaty</Link>
          <button onClick={() => { adminStore.jeOdomknute = false; setJeOdomknute(false); }} style={{ border: 'none', background: 'none', color: '#86868b', marginLeft: 'auto', cursor: 'pointer', fontSize: '13px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'} onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}>Odhlásiť sa</button>
        </div>

        <div style={{...cardStyle, marginBottom: '20px', borderLeft: '4px solid #0071e3', backgroundColor: '#f9fafb'}}>
          <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#1d1d1f' }}>📋 Legenda:</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', fontSize: '12px' }}>
            <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '3px', marginRight: '6px', verticalAlign: 'middle' }}></span> <strong>Chybné časy:</strong> Minúty musia byť 00, 15, 30 alebo 45</div>
            <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '3px', marginRight: '6px', verticalAlign: 'middle' }}></span> <strong>Duplikát:</strong> Rovnaký deň + rovnaká osoba viackrát</div>
            <div><span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: '#ffb347', border: '1px solid #ff9800', borderRadius: '3px', marginRight: '6px', verticalAlign: 'middle' }}></span> <strong>Víkend:</strong> Sobota alebo nedeľa</div>
            <div><span style={{ fontSize: '13px', fontWeight: '600', color: '#ff3b30' }}>⚠</span> <strong>Podozrivý čas:</strong> Pred 05:00 alebo po 21:00</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={cardStyle}>
            <p style={{...labelStyle, margin: '0 0 4px 0'}}>Odpracované hodiny</p>
            <h3 style={{ margin: 0, fontSize: '24px', color: '#1d1d1f', fontWeight: '600' }}>{celkoveHodiny.toFixed(2)}</h3>
          </div>
          <div style={cardStyle}>
            <p style={{...labelStyle, margin: '0 0 4px 0'}}>Záznamy</p>
            <h3 style={{ margin: 0, fontSize: '24px', color: '#1d1d1f', fontWeight: '600' }}>{pocetZaznamov}</h3>
          </div>
          <div style={cardStyle}>
            <p style={{...labelStyle, margin: '0 0 4px 0'}}>Najaktívnejší</p>
            <h3 style={{ margin: 0, fontSize: '24px', color: '#1d1d1f', fontWeight: '600' }}>{najaktivnejsi}</h3>
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <button 
            onClick={() => setUkazatFormular(!ukazatFormular)} 
            style={{ 
              ...(ukazatFormular ? buttonSecondaryStyle : buttonPrimaryStyle)
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

        {ukazatFormular && (
          <div style={{...cardStyle, marginBottom: '20px'}}>
            <datalist id="zoznam-zakaziek">{dostupneZakazky.map(zak => <option key={zak} value={zak} />)}</datalist>

            {noveZaznamy.map((z, i) => (
              <div key={i} style={{ marginBottom: i !== noveZaznamy.length - 1 ? '18px' : '0', paddingBottom: i !== noveZaznamy.length - 1 ? '18px' : '0', borderBottom: i !== noveZaznamy.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={labelStyle}>Dátum</label>
                    <input type="date" value={z.datum} onChange={e => zmenaNovehoZaznamu(i, 'datum', e.target.value)} style={{...inputStyle, fontSize: '12px'}} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={labelStyle}>Zákazka</label>
                    <input list="zoznam-zakaziek" placeholder="Vybrať..." value={z.zakazka} onChange={e => zmenaNovehoZaznamu(i, 'zakazka', e.target.value)} style={{...inputStyle, fontSize: '12px'}} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={labelStyle}>Príchod</label>
                    <input type="time" value={z.prichod} onChange={e => zmenaNovehoZaznamu(i, 'prichod', e.target.value)} style={{...inputStyle, fontSize: '12px'}} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={labelStyle}>Odchod</label>
                    <input type="time" value={z.odchod} onChange={e => zmenaNovehoZaznamu(i, 'odchod', e.target.value)} style={{...inputStyle, fontSize: '12px'}} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Zamestnanci</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px', marginBottom: '10px' }}>
                    {dostupneMena.map(meno => (
                      <button
                        key={meno} 
                        type="button" 
                        onClick={() => toggleMeno(i, meno)}
                        style={{
                          padding: '6px 12px',
                          border: z.mena.includes(meno) ? 'none' : '1px solid #d2d2d7',
                          cursor: 'pointer',
                          fontSize: '12px',
                          backgroundColor: z.mena.includes(meno) ? '#0071e3' : '#f5f5f7',
                          color: z.mena.includes(meno) ? '#fff' : '#1d1d1f',
                          borderRadius: '18px',
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
                    
                    <div style={{ display: 'flex', gap: '0', marginLeft: '10px' }}>
                      <input 
                        id={`noveMeno-${i}`} 
                        type="text" 
                        placeholder="Nové" 
                        style={{ 
                          ...inputStyle,
                          borderRadius: '8px 0 0 8px',
                          margin: '0',
                          padding: '6px 10px',
                          fontSize: '12px'
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
                          borderRadius: '0 8px 8px 0',
                          borderLeft: 'none',
                          margin: '0',
                          padding: '6px 10px'
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
                  <div style={{ marginTop: '10px' }}>
                    <button 
                      onClick={() => setNoveZaznamy(noveZaznamy.filter((_, index) => index !== i))} 
                      style={{ padding: '0', backgroundColor: 'transparent', color: '#ff3b30', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                      Odstrániť blok
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={pridatPrazdnyZaznam} 
                style={buttonSecondaryStyle as any}
                onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = '#efefef'}
                onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = '#f5f5f7'}
              >
                Pridať blok
              </button>
              <button 
                onClick={ulozitVsetkyNoveZaznamy} 
                style={buttonPrimaryStyle as any}
                onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = '#0077ed'}
                onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = '#0071e3'}
              >
                Uložiť
              </button>
            </div>
          </div>
        )}

        <div style={{...cardStyle, marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
          <select 
            value={filterZakazka} 
            onChange={(e) => setFilterZakazka(e.target.value)} 
            style={{...inputStyle, flex: 1, minWidth: '110px'} as any}
          >
            <option value="">Všetky</option>
            {dostupneZakazky.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <select 
            value={filterMesiac} 
            disabled={!!filterDen} 
            onChange={(e) => setFilterMesiac(e.target.value)} 
            style={{...inputStyle, flex: 1, minWidth: '110px', opacity: filterDen ? 0.5 : 1} as any}
          >
            {zoznamMesiacov.map((m) => <option key={m.hodnota} value={m.hodnota}>{m.nazov}</option>)}
          </select>
          <input 
            type="date" 
            value={filterDen} 
            onChange={(e) => setFilterDen(e.target.value)} 
            style={{...inputStyle, flex: 1, minWidth: '110px'} as any}
          />
        </div>

        <div style={cardStyle}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '12px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #d2d2d7' }}>
                  <th style={{ padding: '10px 8px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Dátum</th>
                  <th style={{ padding: '10px 8px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Osoba</th>
                  <th style={{ padding: '10px 8px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Zákazka</th>
                  <th style={{ padding: '10px 8px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Príchod</th>
                  <th style={{ padding: '10px 8px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Odchod</th>
                  <th style={{ padding: '10px 8px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'right' }}>Hodiny</th>
                  <th style={{ padding: '10px 8px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {zaznamy.length === 0 ? ( 
                  <tr><td colSpan={7} style={{ padding: '20px 8px', color: '#d2d2d7', textAlign: 'center', fontSize: '12px' }}>Žiadne dáta.</td></tr> 
                ) : (
                  zaznamy.map((z) => {
                    const hodinyRiadku = upravovaneId === z.id ? parseFloat(upravovaneHodiny) || 0 : vypocitajHodiny(z.prichod, z.odchod)
                    const jeVikend = new Date(z.datum).getDay() === 0 || new Date(z.datum).getDay() === 6
                    const jePodozrivy = upravovaneId !== z.id && jePodozrivyCas(z.prichod, z.odchod, hodinyRiadku)
                    const jeDuplicite = getDuplicateCount(z.datum, z.meno, z.id) > 0
                    const maCiasChybu = !arePlacesValidMinutes(z.prichod) || !arePlacesValidMinutes(z.odchod)

                    return (
                      <tr 
                        key={z.id} 
                        style={{ 
                          borderBottom: '1px solid #f5f5f7',
                          backgroundColor: maCiasChybu ? '#fef2f2' : jeDuplicite ? '#fef3c7' : jeVikend ? '#f5f5f7' : 'transparent',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f7'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = maCiasChybu ? '#fef2f2' : jeDuplicite ? '#fef3c7' : jeVikend ? '#f5f5f7' : 'transparent'}
                      >
                        <td style={{ padding: '10px 8px', color: '#1d1d1f', fontWeight: '500' }}>
                          {z.datum}
                          {jeVikend && <span style={{ fontSize: '8px', backgroundColor: '#ffb347', color: '#6f2c00', padding: '1px 3px', marginLeft: '4px', letterSpacing: '0.3px', textTransform: 'uppercase', borderRadius: '2px', fontWeight: '600' }}>W</span>}
                        </td>
                        <td style={{ padding: '10px 8px', fontWeight: '600', color: '#1d1d1f' }}>
                          {z.meno}
                          {jeDuplicite && <span style={{ fontSize: '8px', backgroundColor: '#fde68a', color: '#92400e', padding: '2px 4px', marginLeft: '4px', borderRadius: '2px', fontWeight: '600' }}>×2</span>}
                        </td>
                        <td style={{ padding: '10px 8px', color: '#666', fontSize: '11px' }}>{z.zakazka}</td>
                        
                        <td style={{ padding: '10px 8px', color: maCiasChybu ? '#ff3b30' : '#1d1d1f', fontWeight: maCiasChybu ? '600' : '500' }}>
                          {upravovaneId === z.id ? (
                            <input 
                              type="time" 
                              value={upravovanePrichod} 
                              onChange={(e) => handleTimeChange(false, e.target.value)}
                              style={{...inputStyle, width: '80px', fontSize: '11px', padding: '4px 6px', borderColor: chybaUpravaHodiny ? '#ff3b30' : '#d2d2d7'}}
                            />
                          ) : (
                            z.prichod
                          )}
                        </td>

                        <td style={{ padding: '10px 8px', color: maCiasChybu ? '#ff3b30' : '#1d1d1f', fontWeight: maCiasChybu ? '600' : '500' }}>
                          {upravovaneId === z.id ? (
                            <input 
                              type="time" 
                              value={upravovaneOdchod} 
                              onChange={(e) => handleTimeChange(true, e.target.value)}
                              style={{...inputStyle, width: '80px', fontSize: '11px', padding: '4px 6px', borderColor: chybaUpravaHodiny ? '#ff3b30' : '#d2d2d7'}}
                            />
                          ) : (
                            z.odchod
                          )}
                        </td>

                        <td style={{ padding: '10px 8px', color: jePodozrivy ? '#ff3b30' : '#1d1d1f', fontWeight: jePodozrivy ? '700' : '600', textAlign: 'right' }} title={jePodozrivy ? "Podozrivý čas" : ""}>
                          {upravovaneId === z.id ? (
                            <input 
                              type="number" 
                              value={upravovaneHodiny} 
                              onChange={(e) => setUpravovaneHodiny(e.target.value)}
                              step="0.1"
                              style={{...inputStyle, width: '60px', fontSize: '11px', padding: '4px 6px', textAlign: 'right'}}
                            />
                          ) : (
                            <>
                              {hodinyRiadku.toFixed(2)} {jePodozrivy && <span style={{ fontSize: '9px', marginLeft: '3px', textTransform: 'uppercase' }}>⚠</span>}
                            </>
                          )}
                        </td>

                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          {upravovaneId === z.id ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => zrusitUpravu()}
                                style={{ color: '#86868b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '500', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}
                              >
                                Zrušiť
                              </button>
                              <button 
                                onClick={() => ulozitUpravu(z.id)}
                                style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#059669'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#10b981'}
                              >
                                Uložiť
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => zacatUpravu(z.id, z.prichod, z.odchod)}
                                style={{ color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '500', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#0077ed'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#0071e3'}
                              >
                                Upraviť
                              </button>
                              <button 
                                onClick={() => vymazat(z.id)}
                                style={{ color: '#d2d2d7', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '500', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ff3b30'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#d2d2d7'}
                              >
                                Zmazať
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {chybaUpravaHodiny && (
            <div style={{ padding: '12px 8px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '6px', color: '#ff3b30', fontSize: '11px', marginTop: '12px', fontWeight: '500' }}>
              ⚠️ {chybaUpravaHodiny}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}