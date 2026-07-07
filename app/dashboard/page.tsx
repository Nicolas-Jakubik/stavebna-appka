'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { adminStore } from '../../lib/store'

export default function DashboardPage() {
  // VRÁTENÉ JEDNODUCHÉ PRIHLASOVANIE IBA NA HESLO
  const [zadaneHeslo, setZadaneHeslo] = useState('')
  const [jeOdomknute, setJeOdomknute] = useState(adminStore.jeOdomknute)
  const [chybaHesla, setChybaHesla] = useState(false)
  const SPRAVNE_HESLO = 'sef123'

  const [zaznamy, setZaznamy] = useState<any[]>([])
  const [filterMesiac, setFilterMesiac] = useState(new Date().toISOString().slice(0, 7))
  const [filterDen, setFilterDen] = useState('')
  const [filterZakazka, setFilterZakazka] = useState('')
  const [dostupneZakazky, setDostupneZakazky] = useState<string[]>([])

  // --- NOVÉ STAVY PRE HROMADNÉ PRIDÁVANIE ---
  const [ukazatFormular, setUkazatFormular] = useState(false)
  const [noveZaznamy, setNoveZaznamy] = useState([
    { datum: new Date().toISOString().split('T')[0], meno: '', zakazka: '', prichod: '', odchod: '' }
  ])

  // JEDNODUCHÁ KONTROLA HESLA
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

  async function nacitajDostupneZakazky() {
    const { data } = await supabase.from('dochadzka').select('zakazka')
    if (data) {
      const unikatne = Array.from(new Set(data.map(z => z.zakazka)))
      setDostupneZakazky(unikatne.sort())
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
    if (error) console.error("Chyba Supabase:", error.message || error)
    else setZaznamy(data || [])
  }

  async function vymazat(id: string) {
    if (!confirm('Naozaj vymazať tento záznam?')) return
    await supabase.from('dochadzka').delete().eq('id', id)
    nacitaj()
    nacitajDostupneZakazky()
  }

  // --- NOVÉ FUNKCIE PRE HROMADNÉ PRIDÁVANIE ---
  function pridatPrazdnyZaznam() {
    setNoveZaznamy([...noveZaznamy, { datum: new Date().toISOString().split('T')[0], meno: '', zakazka: '', prichod: '', odchod: '' }])
  }

  function zmenaNovehoZaznamu(index: number, pole: string, hodnota: string) {
    const upravene = [...noveZaznamy]
    upravene[index] = { ...upravene[index], [pole]: hodnota }
    setNoveZaznamy(upravene)
  }

  async function ulozitVsetkyNoveZaznamy() {
    // Vyfiltrujeme len tie záznamy, ktoré sú kompletne vyplnené
    const platneZaznamy = noveZaznamy.filter(z => z.meno && z.zakazka && z.prichod && z.odchod && z.datum)
    
    if (platneZaznamy.length === 0) {
      alert('Vyplňte aspoň jeden kompletný riadok (Dátum, Meno, Zákazka, Príchod, Odchod).')
      return
    }

    const { error } = await supabase.from('dochadzka').insert(platneZaznamy)
    if (error) {
      alert('Chyba pri ukladaní do databázy: ' + error.message)
    } else {
      setUkazatFormular(false)
      setNoveZaznamy([{ datum: new Date().toISOString().split('T')[0], meno: '', zakazka: '', prichod: '', odchod: '' }])
      nacitaj()
      nacitajDostupneZakazky()
    }
  }

  useEffect(() => { if (jeOdomknute) nacitajDostupneZakazky() }, [jeOdomknute])
  useEffect(() => { if (jeOdomknute) nacitaj() }, [filterMesiac, filterDen, filterZakazka, jeOdomknute])

  // --- VÝPOČTY PRE RÝCHLE ŠTATISTIKY ---
  const celkoveHodiny = zaznamy.reduce((sucet, z) => sucet + vypocitajHodiny(z.prichod, z.odchod), 0)
  const pocetZaznamov = zaznamy.length
  
  const zamestnanciHodiny: Record<string, number> = {}
  zaznamy.forEach(z => {
    zamestnanciHodiny[z.meno] = (zamestnanciHodiny[z.meno] || 0) + vypocitajHodiny(z.prichod, z.odchod)
  })
  let najaktivnejsi = '-'
  let maxHod = 0
  Object.entries(zamestnanciHodiny).forEach(([meno, h]) => {
    if (h > maxHod) { maxHod = h; najaktivnejsi = meno }
  })

  // JEDNODUCHÝ PRIHLASOVACÍ FORMULÁR
  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '350px', backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <h2 style={{ color: '#000000', marginBottom: '20px', fontSize: '20px' }}>Prihlásenie</h2>
          <form onSubmit={skontrolovatHeslo}>
            <input 
              type="password" 
              placeholder="Zadajte heslo" 
              value={zadaneHeslo} 
              onChange={e => setZadaneHeslo(e.target.value)} 
              required 
              style={{ padding: '12px 0', border: 'none', borderBottom: '1px solid #e5e7eb', width: '100%', fontSize: '16px', outline: 'none', marginBottom: '20px', backgroundColor: 'transparent', color: '#000000', textAlign: 'center' }} 
            />
            {chybaHesla && (
              <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '-10px', marginBottom: '15px' }}>Nesprávne heslo</p>
            )}
            <button type="submit" style={{ padding: '12px', width: '100%', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '50px', fontWeight: '600', cursor: 'pointer' }}>Odomknúť</button>
          </form>
        </div>
        <div style={{ marginTop: '30px' }}>
          <Link href="/" style={{ color: '#9ca3af', fontSize: '13px', textDecoration: 'none' }}>← Späť na formulár</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '1050px', backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        
        {/* NAVIGÁCIA */}
        <div style={{ display: 'flex', gap: '20px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb', marginBottom: '30px', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: '#111827', fontWeight: 'bold' }}>Dochádzka</Link>
          <Link href="/zakazky" style={{ textDecoration: 'none', color: '#6b7280' }}>Stavby</Link>
          <Link href="/zamestnanci" style={{ textDecoration: 'none', color: '#6b7280' }}>Zamestnanci</Link>
          <Link href="/mzdy" style={{ textDecoration: 'none', color: '#6b7280' }}>Výplaty</Link>
          <button onClick={() => { adminStore.jeOdomknute = false; setJeOdomknute(false); }} style={{ border: 'none', background: 'none', color: '#ef4444', marginLeft: 'auto', fontWeight: '500', cursor: 'pointer' }}>← Odhlásiť sa</button>
        </div>

        {/* 3 RÝCHLE ŠTATISTIKY (KARTY) */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '35px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px', backgroundColor: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Odpracované hodiny</p>
            <h3 style={{ margin: 0, fontSize: '28px', color: '#0f172a' }}>{celkoveHodiny.toFixed(2)} h</h3>
          </div>
          <div style={{ flex: '1', minWidth: '200px', backgroundColor: '#f0fdf4', padding: '20px', borderRadius: '16px', border: '1px solid #bbf7d0' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#166534', fontWeight: '600', textTransform: 'uppercase' }}>Počet záznamov</p>
            <h3 style={{ margin: 0, fontSize: '28px', color: '#15803d' }}>{pocetZaznamov}</h3>
          </div>
          <div style={{ flex: '1', minWidth: '200px', backgroundColor: '#eff6ff', padding: '20px', borderRadius: '16px', border: '1px solid #bfdbfe' }}>
            <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: '#1e40af', fontWeight: '600', textTransform: 'uppercase' }}>Najusilovnejší</p>
            <h3 style={{ margin: 0, fontSize: '28px', color: '#1d4ed8' }}>{najaktivnejsi}</h3>
          </div>
        </div>

        {/* --- NOVÁ SEKCIA: TLAČIDLO A FORMULÁR NA PRIDÁVANIE --- */}
        <div style={{ marginBottom: '25px' }}>
          <button 
            onClick={() => setUkazatFormular(!ukazatFormular)} 
            style={{ padding: '10px 20px', backgroundColor: ukazatFormular ? '#ef4444' : '#10b981', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
          >
            {ukazatFormular ? '❌ Zavrieť pridávanie' : '➕ Pridať novú dochádzku'}
          </button>
        </div>

        {ukazatFormular && (
          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px', color: '#0f172a', fontSize: '16px' }}>Hromadné zapisovanie hodín</h3>
            
            {noveZaznamy.map((z, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="date" value={z.datum} onChange={e => zmenaNovehoZaznamu(i, 'datum', e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} required />
                <input type="text" placeholder="Meno zamestnanca" value={z.meno} onChange={e => zmenaNovehoZaznamu(i, 'meno', e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', minWidth: '150px' }} required />
                <input type="text" placeholder="Názov zákazky" value={z.zakazka} onChange={e => zmenaNovehoZaznamu(i, 'zakazka', e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', minWidth: '150px' }} required />
                <input type="time" value={z.prichod} onChange={e => zmenaNovehoZaznamu(i, 'prichod', e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} required title="Príchod" />
                <input type="time" value={z.odchod} onChange={e => zmenaNovehoZaznamu(i, 'odchod', e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} required title="Odchod" />
                
                {noveZaznamy.length > 1 && (
                  <button onClick={() => setNoveZaznamy(noveZaznamy.filter((_, index) => index !== i))} style={{ padding: '8px 12px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>X</button>
                )}
              </div>
            ))}
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={pridatPrazdnyZaznam} style={{ padding: '10px 15px', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Pridať ďalší riadok</button>
              <button onClick={ulozitVsetkyNoveZaznamy} style={{ padding: '10px 20px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>💾 Uložiť všetko do databázy</button>
            </div>
          </div>
        )}

        {/* NADPIS A FILTRE */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
          <h2 style={{ color: '#000000', margin: 0, marginTop: '10px' }}>Prehľad dochádzky</h2>
          
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', backgroundColor: '#f9fafb', padding: '10px 15px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Filter zákazka</span>
              <select value={filterZakazka} onChange={(e) => setFilterZakazka(e.target.value)} style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000', backgroundColor: '#ffffff', outline: 'none', cursor: 'pointer', minWidth: '150px' }}>
                <option value="">Všetky zákazky</option>
                {dostupneZakazky.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Filter mesiac</span>
              <select value={filterMesiac} disabled={!!filterDen} onChange={(e) => setFilterMesiac(e.target.value)} style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000', backgroundColor: '#ffffff', outline: 'none', cursor: !!filterDen ? 'not-allowed' : 'pointer', minWidth: '150px' }}>
                {zoznamMesiacov.map((m) => <option key={m.hodnota} value={m.hodnota}>{m.nazov}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>Filter konkrétny deň</span>
              <input type="date" value={filterDen} onChange={(e) => setFilterDen(e.target.value)} style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000', outline: 'none' }} />
              {filterDen && <button onClick={() => setFilterDen('')} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', textAlign: 'left', marginTop: '4px', fontWeight: '600' }}>❌ Zrušiť deň</button>}
            </div>
          </div>
        </div>

        {/* VYLEPŠENÁ TABUĽKA */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '12px 10px', color: '#6b7280', fontSize: '13px', textTransform: 'uppercase' }}>Dátum</th>
                <th style={{ padding: '12px 10px', color: '#6b7280', fontSize: '13px', textTransform: 'uppercase' }}>Zamestnanec</th>
                <th style={{ padding: '12px 10px', color: '#6b7280', fontSize: '13px', textTransform: 'uppercase' }}>Zákazka</th>
                <th style={{ padding: '12px 10px', color: '#6b7280', fontSize: '13px', textTransform: 'uppercase' }}>Čas</th>
                <th style={{ padding: '12px 10px', color: '#6b7280', fontSize: '13px', textTransform: 'uppercase' }}>Hodiny</th>
                <th style={{ padding: '12px 10px', color: '#6b7280', fontSize: '13px', textTransform: 'uppercase' }}>Akcia</th>
              </tr>
            </thead>
            <tbody>
              {zaznamy.length === 0 ? ( 
                <tr><td colSpan={6} style={{ padding: '40px 0', color: '#9ca3af', textAlign: 'center', fontStyle: 'italic' }}>Pre zvolené filtre sa nenašli žiadne záznamy.</td></tr> 
              ) : (
                zaznamy.map((z) => {
                  const hodinyRiadku = vypocitajHodiny(z.prichod, z.odchod)
                  
                  // Zistenie víkendu (0 = Nedeľa, 6 = Sobota)
                  const denVTyzni = new Date(z.datum).getDay()
                  const jeVikend = denVTyzni === 0 || denVTyzni === 6

                  return (
                    <tr key={z.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: jeVikend ? '#fffbeb' : 'transparent' }}>
                      <td style={{ padding: '15px 10px', color: '#374151', fontSize: '14px' }}>
                        {z.datum} {jeVikend && <span style={{ fontSize: '10px', color: '#d97706', fontWeight: 'bold', marginLeft: '5px' }}>VÍKEND</span>}
                      </td>
                      <td style={{ padding: '15px 10px' }}>
                        <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '50px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          {z.meno}
                        </span>
                      </td>
                      <td style={{ padding: '15px 10px' }}>
                        <span style={{ backgroundColor: '#ffedd5', color: '#c2410c', padding: '4px 12px', borderRadius: '50px', fontSize: '13px', fontWeight: '600', whiteSpace: 'nowrap' }}>
                          {z.zakazka}
                        </span>
                      </td>
                      <td style={{ padding: '15px 10px', color: '#4b5563', fontSize: '14px' }}>
                        {z.prichod} - {z.odchod}
                      </td>
                      <td style={{ padding: '15px 10px', color: '#111827', fontWeight: '700', fontSize: '15px' }}>
                        {hodinyRiadku.toFixed(2)} h
                      </td>
                      <td style={{ padding: '15px 10px' }}>
                        <button onClick={() => vymazat(z.id)} style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>
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
  )
}