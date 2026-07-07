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

  const inputStyle = { padding: '10px 0', border: 'none', borderBottom: '1px solid #e5e5e5', outline: 'none', fontSize: '14px', width: '100%', backgroundColor: 'transparent', color: '#000' }
  const labelStyle = { display: 'block', fontSize: '11px', color: '#999', marginBottom: '4px', textTransform: 'uppercase' as const, letterSpacing: '1px' }

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '300px', textAlign: 'center' }}>
          <h2 style={{ color: '#000', marginBottom: '40px', fontSize: '20px', fontWeight: '400', letterSpacing: '2px', textTransform: 'uppercase' }}>Prihlásenie</h2>
          <form onSubmit={skontrolovatHeslo}>
            <input type="password" placeholder="Heslo" value={zadaneHeslo} onChange={e => setZadaneHeslo(e.target.value)} required style={{ padding: '10px 0', border: 'none', borderBottom: '1px solid #000', width: '100%', fontSize: '14px', outline: 'none', marginBottom: '30px', backgroundColor: 'transparent', color: '#000', textAlign: 'center', letterSpacing: '2px' }} />
            {chybaHesla && <p style={{ color: '#000', fontSize: '12px', marginTop: '-15px', marginBottom: '20px' }}>Nesprávne heslo.</p>}
            <button type="submit" style={{ padding: '12px', width: '100%', backgroundColor: '#000', color: '#fff', border: 'none', fontWeight: '400', cursor: 'pointer', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Vstúpiť</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fff', padding: '40px 20px', display: 'flex', justifyContent: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '1000px' }}>
        
        {/* NAVIGÁCIA */}
        <div style={{ display: 'flex', gap: '30px', paddingBottom: '30px', marginBottom: '40px', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: '#000', fontWeight: '500', borderBottom: '1px solid #000', paddingBottom: '4px' }}>Dochádzka</Link>
          <Link href="/zakazky" style={{ textDecoration: 'none', color: '#999' }}>Stavby</Link>
          <Link href="/zamestnanci" style={{ textDecoration: 'none', color: '#999' }}>Zamestnanci</Link>
          <Link href="/mzdy" style={{ textDecoration: 'none', color: '#999' }}>Výplaty</Link>
          <button onClick={() => { adminStore.jeOdomknute = false; setJeOdomknute(false); }} style={{ border: 'none', background: 'none', color: '#999', marginLeft: 'auto', cursor: 'pointer', fontSize: '14px' }}>Odhlásiť sa</button>
        </div>

        {/* ŠTATISTIKY */}
        <div style={{ display: 'flex', gap: '40px', marginBottom: '50px', flexWrap: 'wrap', borderTop: '1px solid #f0f0f0', borderBottom: '1px solid #f0f0f0', padding: '30px 0' }}>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>Odpracované hodiny</p>
            <h3 style={{ margin: 0, fontSize: '28px', color: '#000', fontWeight: '400' }}>{celkoveHodiny.toFixed(2)}</h3>
          </div>
          <div style={{ flex: '1', minWidth: '150px', borderLeft: '1px solid #f0f0f0', paddingLeft: '40px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>Záznamy</p>
            <h3 style={{ margin: 0, fontSize: '28px', color: '#000', fontWeight: '400' }}>{pocetZaznamov}</h3>
          </div>
          <div style={{ flex: '1', minWidth: '150px', borderLeft: '1px solid #f0f0f0', paddingLeft: '40px' }}>
            <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '1px' }}>Najaktívnejší</p>
            <h3 style={{ margin: 0, fontSize: '28px', color: '#000', fontWeight: '400' }}>{najaktivnejsi}</h3>
          </div>
        </div>

        {/* TLAČIDLO PRE FORMULÁR */}
        <div style={{ marginBottom: '40px' }}>
          <button onClick={() => setUkazatFormular(!ukazatFormular)} style={{ padding: '10px 20px', backgroundColor: ukazatFormular ? '#fff' : '#000', color: ukazatFormular ? '#000' : '#fff', border: '1px solid #000', cursor: 'pointer', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {ukazatFormular ? 'Zavrieť' : 'Zápis dochádzky'}
          </button>
        </div>

        {/* FORMULÁR */}
        {ukazatFormular && (
          <div style={{ border: '1px solid #e5e5e5', padding: '40px', marginBottom: '50px' }}>
            <datalist id="zoznam-zakaziek">{dostupneZakazky.map(zak => <option key={zak} value={zak} />)}</datalist>

            {noveZaznamy.map((z, i) => (
              <div key={i} style={{ marginBottom: '40px', paddingBottom: '40px', borderBottom: i !== noveZaznamy.length -1 ? '1px solid #f0f0f0' : 'none' }}>
                
                <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap', marginBottom: '30px' }}>
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={labelStyle}>Dátum</label>
                    <input type="date" value={z.datum} onChange={e => zmenaNovehoZaznamu(i, 'datum', e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ flex: '2 1 200px' }}>
                    <label style={labelStyle}>Zákazka</label>
                    <input list="zoznam-zakaziek" placeholder="Vybrať alebo napísať..." value={z.zakazka} onChange={e => zmenaNovehoZaznamu(i, 'zakazka', e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ flex: '1 1 100px' }}>
                    <label style={labelStyle}>Príchod</label>
                    <input type="time" value={z.prichod} onChange={e => zmenaNovehoZaznamu(i, 'prichod', e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ flex: '1 1 100px' }}>
                    <label style={labelStyle}>Odchod</label>
                    <input type="time" value={z.odchod} onChange={e => zmenaNovehoZaznamu(i, 'odchod', e.target.value)} style={inputStyle} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Zamestnanci</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginTop: '15px' }}>
                    {dostupneMena.map(meno => (
                      <button
                        key={meno} type="button" onClick={() => toggleMeno(i, meno)}
                        style={{ padding: '6px 12px', border: '1px solid #000', cursor: 'pointer', fontSize: '12px', backgroundColor: z.mena.includes(meno) ? '#000' : '#fff', color: z.mena.includes(meno) ? '#fff' : '#000' }}
                      >
                        {meno}
                      </button>
                    ))}
                    
                    <div style={{ display: 'flex', gap: '0', marginLeft: '20px' }}>
                      <input id={`noveMeno-${i}`} type="text" placeholder="Nové meno" style={{ padding: '6px 10px', border: '1px solid #e5e5e5', borderRight: 'none', outline: 'none', width: '120px', fontSize: '12px' }} />
                      <button type="button" onClick={() => {
                        const input = document.getElementById(`noveMeno-${i}`) as HTMLInputElement;
                        if(input && input.value.trim()) {
                          const val = input.value.trim()
                          if(!dostupneMena.includes(val)) setDostupneMena([...dostupneMena, val])
                          if(!z.mena.includes(val)) toggleMeno(i, val)
                          input.value = ''
                        }
                      }} style={{ padding: '6px 12px', background: '#f5f5f5', color: '#000', border: '1px solid #e5e5e5', cursor: 'pointer', fontSize: '12px' }}>Pridať</button>
                    </div>
                  </div>
                </div>

                {noveZaznamy.length > 1 && (
                  <div style={{ marginTop: '20px' }}>
                    <button onClick={() => setNoveZaznamy(noveZaznamy.filter((_, index) => index !== i))} style={{ padding: '0', backgroundColor: 'transparent', color: '#999', border: 'none', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}>Odstrániť blok</button>
                  </div>
                )}
              </div>
            ))}
            
            <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button onClick={pridatPrazdnyZaznam} style={{ padding: '10px 20px', backgroundColor: '#fff', color: '#000', border: '1px solid #e5e5e5', cursor: 'pointer', fontSize: '13px' }}>Pridať ďalší blok</button>
              <button onClick={ulozitVsetkyNoveZaznamy} style={{ padding: '10px 20px', backgroundColor: '#000', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>Uložiť záznamy</button>
            </div>
          </div>
        )}

        {/* FILTRE */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
          <select value={filterZakazka} onChange={(e) => setFilterZakazka(e.target.value)} style={{ padding: '8px 0', border: 'none', borderBottom: '1px solid #e5e5e5', outline: 'none', backgroundColor: 'transparent', color: '#000', minWidth: '150px', fontSize: '14px' }}>
            <option value="">Všetky zákazky</option>
            {dostupneZakazky.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <select value={filterMesiac} disabled={!!filterDen} onChange={(e) => setFilterMesiac(e.target.value)} style={{ padding: '8px 0', border: 'none', borderBottom: '1px solid #e5e5e5', outline: 'none', backgroundColor: 'transparent', color: '#000', minWidth: '150px', fontSize: '14px' }}>
            {zoznamMesiacov.map((m) => <option key={m.hodnota} value={m.hodnota}>{m.nazov}</option>)}
          </select>
          <input type="date" value={filterDen} onChange={(e) => setFilterDen(e.target.value)} style={{ padding: '8px 0', border: 'none', borderBottom: '1px solid #e5e5e5', outline: 'none', backgroundColor: 'transparent', color: '#000', fontSize: '14px' }} />
        </div>

        {/* TABUĽKA */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px', fontSize: '14px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #000' }}>
                <th style={{ padding: '15px 10px', color: '#999', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '400' }}>Dátum</th>
                <th style={{ padding: '15px 10px', color: '#999', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '400' }}>Zamestnanec</th>
                <th style={{ padding: '15px 10px', color: '#999', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '400' }}>Zákazka</th>
                <th style={{ padding: '15px 10px', color: '#999', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '400' }}>Čas</th>
                <th style={{ padding: '15px 10px', color: '#999', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '400' }}>Hodiny</th>
                <th style={{ padding: '15px 10px', color: '#999', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '400' }}></th>
              </tr>
            </thead>
            <tbody>
              {zaznamy.length === 0 ? ( <tr><td colSpan={6} style={{ padding: '40px 10px', color: '#999', textAlign: 'center' }}>Žiadne dáta.</td></tr> ) : (
                zaznamy.map((z) => {
                  const hodinyRiadku = vypocitajHodiny(z.prichod, z.odchod)
                  const jeVikend = new Date(z.datum).getDay() === 0 || new Date(z.datum).getDay() === 6
                  return (
                    <tr key={z.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '15px 10px', color: jeVikend ? '#999' : '#000' }}>{z.datum}</td>
                      <td style={{ padding: '15px 10px', fontWeight: '500', color: '#000' }}>{z.meno}</td>
                      <td style={{ padding: '15px 10px', color: '#666' }}>{z.zakazka}</td>
                      <td style={{ padding: '15px 10px', color: '#666' }}>{z.prichod} - {z.odchod}</td>
                      <td style={{ padding: '15px 10px', color: '#000' }}>{hodinyRiadku.toFixed(2)}</td>
                      <td style={{ padding: '15px 10px', textAlign: 'right' }}><button onClick={() => vymazat(z.id)} style={{ color: '#999', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Zmazať</button></td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}