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
    if (!confirm('Naozaj vymazať tento záznam?')) return
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
      alert('Chyba: Uistite sa, že máte vyplnený dátum, zákazku, príchod, odchod a označeného aspoň jedného zamestnanca.')
      return
    }

    const { error } = await supabase.from('dochadzka').insert(dataNaVlozenie)
    if (error) alert('Chyba pri ukladaní: ' + error.message)
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

  const inputStyle = { padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '14px', width: '100%', backgroundColor: '#ffffff', color: '#0f172a' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase' as const }

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '380px', backgroundColor: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <h2 style={{ color: '#0f172a', marginBottom: '25px', fontSize: '22px' }}>Prihlásenie</h2>
          <form onSubmit={skontrolovatHeslo}>
            <input type="password" placeholder="Zadajte heslo" value={zadaneHeslo} onChange={e => setZadaneHeslo(e.target.value)} required style={{ padding: '14px', border: '1px solid #e2e8f0', borderRadius: '12px', width: '100%', fontSize: '16px', outline: 'none', marginBottom: '20px', backgroundColor: '#f8fafc', color: '#0f172a', textAlign: 'center' }} />
            {chybaHesla && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '-10px', marginBottom: '15px' }}>Nesprávne heslo</p>}
            <button type="submit" style={{ padding: '14px', width: '100%', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '600', cursor: 'pointer', fontSize: '16px' }}>Odomknúť</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '1100px', backgroundColor: 'white', padding: '40px', borderRadius: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
        
        {/* NAVIGÁCIA */}
        <div style={{ display: 'flex', gap: '25px', paddingBottom: '20px', borderBottom: '1px solid #f1f5f9', marginBottom: '35px', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: '#0f172a', fontWeight: '700' }}>Dochádzka</Link>
          <Link href="/zakazky" style={{ textDecoration: 'none', color: '#64748b' }}>Stavby</Link>
          <Link href="/zamestnanci" style={{ textDecoration: 'none', color: '#64748b' }}>Zamestnanci</Link>
          <Link href="/mzdy" style={{ textDecoration: 'none', color: '#64748b' }}>Výplaty</Link>
          <button onClick={() => { adminStore.jeOdomknute = false; setJeOdomknute(false); }} style={{ border: 'none', background: 'none', color: '#ef4444', marginLeft: 'auto', fontWeight: '600', cursor: 'pointer' }}>← Odhlásiť sa</button>
        </div>

        {/* ŠTATISTIKY */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '40px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '220px', backgroundColor: '#ffffff', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Odpracované hodiny</p>
            <h3 style={{ margin: 0, fontSize: '32px', color: '#0f172a' }}>{celkoveHodiny.toFixed(2)} <span style={{ fontSize: '16px', color: '#94a3b8' }}>h</span></h3>
          </div>
          <div style={{ flex: '1', minWidth: '220px', backgroundColor: '#ffffff', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Počet záznamov</p>
            <h3 style={{ margin: 0, fontSize: '32px', color: '#0f172a' }}>{pocetZaznamov}</h3>
          </div>
          <div style={{ flex: '1', minWidth: '220px', backgroundColor: '#ffffff', padding: '25px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Najaktívnejší</p>
            <h3 style={{ margin: 0, fontSize: '32px', color: '#0f172a' }}>{najaktivnejsi}</h3>
          </div>
        </div>

        {/* TLAČIDLO PRE FORMULÁR */}
        <div style={{ marginBottom: '30px' }}>
          <button onClick={() => setUkazatFormular(!ukazatFormular)} style={{ padding: '14px 24px', backgroundColor: ukazatFormular ? '#f8fafc' : '#0f172a', color: ukazatFormular ? '#0f172a' : 'white', borderRadius: '12px', border: ukazatFormular ? '1px solid #e2e8f0' : 'none', fontWeight: '600', cursor: 'pointer', transition: '0.2s', fontSize: '15px' }}>
            {ukazatFormular ? 'Zavrieť pridávanie' : '+ Zápis novej partie'}
          </button>
        </div>

        {/* --- VYLEPŠENÝ FORMULÁR --- */}
        {ukazatFormular && (
          <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '20px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.04)', marginBottom: '40px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '25px', color: '#0f172a', fontSize: '20px' }}>Zápis dochádzky</h3>
            <datalist id="zoznam-zakaziek">{dostupneZakazky.map(zak => <option key={zak} value={zak} />)}</datalist>

            {noveZaznamy.map((z, i) => (
              <div key={i} style={{ padding: '25px', borderRadius: '16px', backgroundColor: '#f8fafc', border: '1px solid #f1f5f9', marginBottom: '20px' }}>
                
                {/* 1. SEKCIA: Kedy a Kde */}
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '25px' }}>
                  <div style={{ flex: '1 1 150px' }}>
                    <label style={labelStyle}>Dátum</label>
                    <input type="date" value={z.datum} onChange={e => zmenaNovehoZaznamu(i, 'datum', e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ flex: '2 1 250px' }}>
                    <label style={labelStyle}>Zákazka (vyberte alebo napíšte)</label>
                    <input list="zoznam-zakaziek" placeholder="Napr. Výstavba domu BA" value={z.zakazka} onChange={e => zmenaNovehoZaznamu(i, 'zakazka', e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ flex: '1 1 120px' }}>
                    <label style={labelStyle}>Príchod</label>
                    <input type="time" value={z.prichod} onChange={e => zmenaNovehoZaznamu(i, 'prichod', e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ flex: '1 1 120px' }}>
                    <label style={labelStyle}>Odchod</label>
                    <input type="time" value={z.odchod} onChange={e => zmenaNovehoZaznamu(i, 'odchod', e.target.value)} style={inputStyle} />
                  </div>
                </div>

                {/* 2. SEKCIA: Kto */}
                <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <label style={{...labelStyle, marginBottom: '12px'}}>Vyberte zamestnancov (kto bol na stavbe)</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {dostupneMena.map(meno => (
                      <button
                        key={meno} type="button" onClick={() => toggleMeno(i, meno)}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: z.mena.includes(meno) ? '1px solid #0f172a' : '1px solid #e2e8f0', cursor: 'pointer', fontSize: '14px', fontWeight: '600', transition: 'all 0.2s', backgroundColor: z.mena.includes(meno) ? '#0f172a' : '#ffffff', color: z.mena.includes(meno) ? '#ffffff' : '#475569' }}
                      >
                        {meno}
                      </button>
                    ))}
                    
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '10px', borderLeft: '1px solid #e2e8f0', paddingLeft: '15px' }}>
                      <input id={`noveMeno-${i}`} type="text" placeholder="Nové meno" style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', width: '120px', fontSize: '14px' }} />
                      <button type="button" onClick={() => {
                        const input = document.getElementById(`noveMeno-${i}`) as HTMLInputElement;
                        if(input && input.value.trim()) {
                          const val = input.value.trim()
                          if(!dostupneMena.includes(val)) setDostupneMena([...dostupneMena, val])
                          if(!z.mena.includes(val)) toggleMeno(i, val)
                          input.value = ''
                        }
                      }} style={{ padding: '8px 16px', borderRadius: '8px', background: '#e2e8f0', color: '#0f172a', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Pridať</button>
                    </div>
                  </div>
                </div>

                {noveZaznamy.length > 1 && (
                  <div style={{ marginTop: '20px', textAlign: 'right' }}>
                    <button onClick={() => setNoveZaznamy(noveZaznamy.filter((_, index) => index !== i))} style={{ padding: '8px 16px', backgroundColor: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>Odstrániť tento blok</button>
                  </div>
                )}
              </div>
            ))}
            
            <div style={{ display: 'flex', gap: '15px', marginTop: '30px', flexWrap: 'wrap' }}>
              <button onClick={pridatPrazdnyZaznam} style={{ padding: '14px 20px', backgroundColor: '#f1f5f9', color: '#0f172a', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}>+ Ďalší blok (iná stavba/čas)</button>
              <button onClick={ulozitVsetkyNoveZaznamy} style={{ padding: '14px 30px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', fontSize: '15px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}>Uložiť všetko do databázy</button>
            </div>
          </div>
        )}

        {/* NADPIS A FILTRE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
          <h2 style={{ color: '#0f172a', margin: 0, marginTop: '10px' }}>Prehľad dochádzky</h2>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', padding: '12px 18px', borderRadius: '16px' }}>
             <select value={filterZakazka} onChange={(e) => setFilterZakazka(e.target.value)} style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', outline: 'none', backgroundColor: '#f8fafc', color: '#0f172a' }}>
                <option value="">Všetky zákazky</option>
                {dostupneZakazky.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
             <select value={filterMesiac} disabled={!!filterDen} onChange={(e) => setFilterMesiac(e.target.value)} style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', outline: 'none', backgroundColor: '#f8fafc', color: '#0f172a' }}>
                {zoznamMesiacov.map((m) => <option key={m.hodnota} value={m.hodnota}>{m.nazov}</option>)}
              </select>
             <input type="date" value={filterDen} onChange={(e) => setFilterDen(e.target.value)} style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '10px', outline: 'none', backgroundColor: '#f8fafc', color: '#0f172a' }} />
          </div>
        </div>

        {/* TABUĽKA */}
        <div style={{ overflowX: 'auto', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dátum</th>
                <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Zamestnanec</th>
                <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Zákazka</th>
                <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Čas</th>
                <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hodiny</th>
                <th style={{ padding: '16px 20px', color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Akcia</th>
              </tr>
            </thead>
            <tbody>
              {zaznamy.length === 0 ? ( <tr><td colSpan={6} style={{ padding: '40px 0', color: '#94a3b8', textAlign: 'center' }}>Nenašli sa žiadne záznamy.</td></tr> ) : (
                zaznamy.map((z) => {
                  const hodinyRiadku = vypocitajHodiny(z.prichod, z.odchod)
                  const jeVikend = new Date(z.datum).getDay() === 0 || new Date(z.datum).getDay() === 6
                  return (
                    <tr key={z.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: jeVikend ? '#fffbeb' : 'transparent', transition: '0.2s' }}>
                      <td style={{ padding: '18px 20px', color: '#334155', fontSize: '14px' }}>{z.datum} {jeVikend && <span style={{ fontSize: '10px', color: '#d97706', fontWeight: 'bold', marginLeft: '8px', backgroundColor: '#fef3c7', padding: '2px 6px', borderRadius: '4px' }}>VÍKEND</span>}</td>
                      <td style={{ padding: '18px 20px' }}><span style={{ backgroundColor: '#f1f5f9', color: '#0f172a', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600' }}>{z.meno}</span></td>
                      <td style={{ padding: '18px 20px' }}><span style={{ color: '#475569', fontSize: '14px', fontWeight: '500' }}>{z.zakazka}</span></td>
                      <td style={{ padding: '18px 20px', color: '#64748b', fontSize: '14px' }}>{z.prichod} - {z.odchod}</td>
                      <td style={{ padding: '18px 20px', color: '#0f172a', fontWeight: '700', fontSize: '15px' }}>{hodinyRiadku.toFixed(2)} h</td>
                      <td style={{ padding: '18px 20px' }}><button onClick={() => vymazat(z.id)} style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>Zmazať</button></td>
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