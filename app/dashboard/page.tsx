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
  
  // ROZŠÍRENÉ FILTRE (Zakazky aj Mená z databázy)
  const [dostupneZakazky, setDostupneZakazky] = useState<string[]>([])
  const [dostupneMena, setDostupneMena] = useState<string[]>([])

  // STAVY PRE HROMADNÉ PRIDÁVANIE PARTIE
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

  // NAČÍTANIE EXISTUJÚCICH ZÁKAZIEK A MIEN PRE VÝBER
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

  // --- LOGIKA FORMULÁRA ---
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
      upravene[index].mena = aktualneMena.filter(m => m !== meno) // Odznačí
    } else {
      upravene[index].mena = [...aktualneMena, meno] // Označí
    }
    setNoveZaznamy(upravene)
  }

  async function ulozitVsetkyNoveZaznamy() {
    const dataNaVlozenie: any[] = []
    
    // Rozbalíme každé vybrané meno do samostatného riadku databázy
    noveZaznamy.forEach(z => {
      if (z.mena.length > 0 && z.zakazka && z.prichod && z.odchod && z.datum) {
        z.mena.forEach(meno => {
          dataNaVlozenie.push({ datum: z.datum, meno: meno, zakazka: z.zakazka, prichod: z.prichod, odchod: z.odchod })
        })
      }
    })
    
    if (dataNaVlozenie.length === 0) {
      alert('Vyplňte formulár! Musíte vybrať aspoň 1 meno, zákazku a časy.')
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

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '350px', backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <h2 style={{ color: '#000000', marginBottom: '20px', fontSize: '20px' }}>Prihlásenie</h2>
          <form onSubmit={skontrolovatHeslo}>
            <input type="password" placeholder="Zadajte heslo" value={zadaneHeslo} onChange={e => setZadaneHeslo(e.target.value)} required style={{ padding: '12px 0', border: 'none', borderBottom: '1px solid #e5e7eb', width: '100%', fontSize: '16px', outline: 'none', marginBottom: '20px', backgroundColor: 'transparent', color: '#000000', textAlign: 'center' }} />
            {chybaHesla && <p style={{ color: '#ef4444', fontSize: '13px', marginTop: '-10px', marginBottom: '15px' }}>Nesprávne heslo</p>}
            <button type="submit" style={{ padding: '12px', width: '100%', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '50px', fontWeight: '600', cursor: 'pointer' }}>Odomknúť</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '1050px', backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        
        {/* NAVIGÁCIA A ŠTATISTIKY OSTÁVAJÚ ZACHOVANÉ */}
        <div style={{ display: 'flex', gap: '20px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb', marginBottom: '30px', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: '#111827', fontWeight: 'bold' }}>Dochádzka</Link>
          <Link href="/zakazky" style={{ textDecoration: 'none', color: '#6b7280' }}>Stavby</Link>
          <Link href="/zamestnanci" style={{ textDecoration: 'none', color: '#6b7280' }}>Zamestnanci</Link>
          <Link href="/mzdy" style={{ textDecoration: 'none', color: '#6b7280' }}>Výplaty</Link>
          <button onClick={() => { adminStore.jeOdomknute = false; setJeOdomknute(false); }} style={{ border: 'none', background: 'none', color: '#ef4444', marginLeft: 'auto', fontWeight: '500', cursor: 'pointer' }}>← Odhlásiť sa</button>
        </div>

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

        {/* --- FORMULÁR PRE HROMADNÉ PRIDÁVANIE PARTIE --- */}
        <div style={{ marginBottom: '25px' }}>
          <button onClick={() => setUkazatFormular(!ukazatFormular)} style={{ padding: '10px 20px', backgroundColor: ukazatFormular ? '#ef4444' : '#10b981', color: 'white', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
            {ukazatFormular ? '❌ Zavrieť pridávanie' : '➕ Pridať partiu na stavbu'}
          </button>
        </div>

        {ukazatFormular && (
          <div style={{ backgroundColor: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
            {/* HTML Datalist pre rozbaľovacie menu zákaziek */}
            <datalist id="zoznam-zakaziek">
              {dostupneZakazky.map(zak => <option key={zak} value={zak} />)}
            </datalist>

            {noveZaznamy.map((z, i) => (
              <div key={i} style={{ padding: '15px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#fff', marginBottom: '15px' }}>
                
                {/* 1. ZÁKAZKA A ČASY */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                  <input type="date" value={z.datum} onChange={e => zmenaNovehoZaznamu(i, 'datum', e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  <input list="zoznam-zakaziek" placeholder="Vyberte alebo napíšte zákazku..." value={z.zakazka} onChange={e => zmenaNovehoZaznamu(i, 'zakazka', e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', flex: 1, minWidth: '200px' }} />
                  <input type="time" title="Príchod" value={z.prichod} onChange={e => zmenaNovehoZaznamu(i, 'prichod', e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  <input type="time" title="Odchod" value={z.odchod} onChange={e => zmenaNovehoZaznamu(i, 'odchod', e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                  {noveZaznamy.length > 1 && <button onClick={() => setNoveZaznamy(noveZaznamy.filter((_, index) => index !== i))} style={{ padding: '8px 12px', backgroundColor: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Zmazať blok</button>}
                </div>

                {/* 2. VÝBER VIACERÝCH MIEN */}
                <div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: '#475569', fontWeight: 'bold' }}>Vyberte zamestnancov (môžete označiť viacerých naraz):</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {dostupneMena.map(meno => (
                      <button
                        key={meno}
                        type="button"
                        onClick={() => toggleMeno(i, meno)}
                        style={{ padding: '6px 14px', borderRadius: '50px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600', transition: '0.2s', backgroundColor: z.mena.includes(meno) ? '#10b981' : '#e2e8f0', color: z.mena.includes(meno) ? '#fff' : '#475569' }}
                      >
                        {meno} {z.mena.includes(meno) && '✓'}
                      </button>
                    ))}
                    
                    {/* Pridanie úplne nového zamestnanca */}
                    <div style={{ display: 'flex', gap: '5px', marginLeft: '10px' }}>
                      <input id={`noveMeno-${i}`} type="text" placeholder="+ Nové meno" style={{ padding: '6px 12px', borderRadius: '50px', border: '1px dashed #cbd5e1', outline: 'none', width: '130px', fontSize: '13px' }} />
                      <button type="button" onClick={() => {
                        const input = document.getElementById(`noveMeno-${i}`) as HTMLInputElement;
                        if(input && input.value.trim()) {
                          const val = input.value.trim()
                          if(!dostupneMena.includes(val)) setDostupneMena([...dostupneMena, val])
                          if(!z.mena.includes(val)) toggleMeno(i, val)
                          input.value = ''
                        }
                      }} style={{ padding: '6px 12px', borderRadius: '50px', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Pridať</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button onClick={pridatPrazdnyZaznam} style={{ padding: '10px 15px', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>+ Pridať ďalší blok (iná stavba/čas)</button>
              <button onClick={ulozitVsetkyNoveZaznamy} style={{ padding: '10px 20px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>💾 Uložiť všetkých označených do databázy</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', flexWrap: 'wrap', gap: '20px' }}>
          <h2 style={{ color: '#000000', margin: 0, marginTop: '10px' }}>Prehľad dochádzky</h2>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', backgroundColor: '#f9fafb', padding: '10px 15px', borderRadius: '12px' }}>
             <select value={filterZakazka} onChange={(e) => setFilterZakazka(e.target.value)} style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none' }}>
                <option value="">Všetky zákazky</option>
                {dostupneZakazky.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
             <select value={filterMesiac} disabled={!!filterDen} onChange={(e) => setFilterMesiac(e.target.value)} style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none' }}>
                {zoznamMesiacov.map((m) => <option key={m.hodnota} value={m.hodnota}>{m.nazov}</option>)}
              </select>
             <input type="date" value={filterDen} onChange={(e) => setFilterDen(e.target.value)} style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', outline: 'none' }} />
          </div>
        </div>

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
              {zaznamy.length === 0 ? ( <tr><td colSpan={6} style={{ padding: '40px 0', color: '#9ca3af', textAlign: 'center' }}>Nenašli sa žiadne záznamy.</td></tr> ) : (
                zaznamy.map((z) => {
                  const hodinyRiadku = vypocitajHodiny(z.prichod, z.odchod)
                  const jeVikend = new Date(z.datum).getDay() === 0 || new Date(z.datum).getDay() === 6
                  return (
                    <tr key={z.id} style={{ borderBottom: '1px solid #f3f4f6', backgroundColor: jeVikend ? '#fffbeb' : 'transparent' }}>
                      <td style={{ padding: '15px 10px', color: '#374151', fontSize: '14px' }}>{z.datum} {jeVikend && <span style={{ fontSize: '10px', color: '#d97706', fontWeight: 'bold' }}>VÍKEND</span>}</td>
                      <td style={{ padding: '15px 10px' }}><span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '50px', fontSize: '13px', fontWeight: '600' }}>{z.meno}</span></td>
                      <td style={{ padding: '15px 10px' }}><span style={{ backgroundColor: '#ffedd5', color: '#c2410c', padding: '4px 12px', borderRadius: '50px', fontSize: '13px', fontWeight: '600' }}>{z.zakazka}</span></td>
                      <td style={{ padding: '15px 10px', color: '#4b5563', fontSize: '14px' }}>{z.prichod} - {z.odchod}</td>
                      <td style={{ padding: '15px 10px', color: '#111827', fontWeight: '700', fontSize: '15px' }}>{hodinyRiadku.toFixed(2)} h</td>
                      <td style={{ padding: '15px 10px' }}><button onClick={() => vymazat(z.id)} style={{ color: '#ef4444', background: '#fef2f2', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}>Zmazať</button></td>
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