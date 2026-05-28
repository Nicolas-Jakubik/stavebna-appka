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

  useEffect(() => { if (jeOdomknute) nacitajDostupneZakazky() }, [jeOdomknute])
  useEffect(() => { if (jeOdomknute) nacitaj() }, [filterMesiac, filterDen, filterZakazka, jeOdomknute])

  const celkoveHodiny = zaznamy.reduce((sucet, z) => sucet + vypocitajHodiny(z.prichod, z.odchod), 0)

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '350px', backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <h2 style={{ color: '#000000', marginBottom: '20px', fontSize: '20px' }}>Prístup do administrácie</h2>
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '1000px', backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        
        {/* NAVIGAČNÉ MENU S PRIDANÝMI ZAMESTNANCAMI */}
        <div style={{ display: 'flex', gap: '20px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb', marginBottom: '30px', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: '#111827', fontWeight: 'bold' }}>Dochádzka</Link>
          <Link href="/zakazky" style={{ textDecoration: 'none', color: '#6b7280' }}>Stavby</Link>
          <Link href="/zamestnanci" style={{ textDecoration: 'none', color: '#6b7280' }}>Zamestnanci</Link>
          <Link href="/mzdy" style={{ textDecoration: 'none', color: '#6b7280' }}>Výplaty</Link>
          <Link href="/" style={{ textDecoration: 'none', color: '#ef4444', marginLeft: 'auto', fontWeight: '500' }}>← Odhlásiť sa</Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', flexWrap: 'wrap', gap: '20px' }}>
          <h2 style={{ color: '#000000', margin: 0, marginTop: '10px' }}>Prehľad dochádzky</h2>
          
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>Filter zákazka</span>
              <select value={filterZakazka} onChange={(e) => setFilterZakazka(e.target.value)} style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000', backgroundColor: '#ffffff', outline: 'none', cursor: 'pointer', minWidth: '150px' }}>
                <option value="">Všetky zákazky</option>
                {dostupneZakazky.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>Filter mesiac</span>
              <select value={filterMesiac} disabled={!!filterDen} onChange={(e) => setFilterMesiac(e.target.value)} style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000', backgroundColor: '#ffffff', outline: 'none', cursor: !!filterDen ? 'not-allowed' : 'pointer', minWidth: '150px' }}>
                {zoznamMesiacov.map((m) => <option key={m.hodnota} value={m.hodnota}>{m.nazov}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '12px', color: '#666' }}>Filter konkrétny deň</span>
              <input type="date" value={filterDen} onChange={(e) => setFilterDen(e.target.value)} style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000', outline: 'none' }} />
              {filterDen && <button onClick={() => setFilterDen('')} style={{ background: 'none', border: 'none', color: '#666', fontSize: '11px', cursor: 'pointer', textAlign: 'left', marginTop: '2px' }}>❌ Zrušiť deň</button>}
            </div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6' }}>
              <th style={{ padding: '12px 0', color: '#666', fontSize: '14px' }}>Dátum</th><th style={{ padding: '12px 0', color: '#666', fontSize: '14px' }}>Zamestnanec</th><th style={{ padding: '12px 0', color: '#666', fontSize: '14px' }}>Zákazka</th><th style={{ padding: '12px 0', color: '#666', fontSize: '14px' }}>Čas</th><th style={{ padding: '12px 0', color: '#666', fontSize: '14px' }}>Hodiny</th><th style={{ padding: '12px 0', color: '#666', fontSize: '14px' }}>Akcia</th>
            </tr>
          </thead>
          <tbody>
            {zaznamy.length === 0 ? ( <tr><td colSpan={6} style={{ padding: '30px 0', color: '#666', textAlign: 'center' }}>Pre zvolené filtre sa nenašli žiadne záznamy.</td></tr> ) : (
              zaznamy.map((z) => {
                const hodinyRiadku = vypocitajHodiny(z.prichod, z.odchod)
                return (
                  <tr key={z.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '15px 0', color: '#000000' }}>{z.datum}</td><td style={{ padding: '15px 0', color: '#000000' }}>{z.meno}</td><td style={{ padding: '15px 0', color: '#000000' }}>{z.zakazka}</td><td style={{ padding: '15px 0', color: '#000000' }}>{z.prichod} - {z.odchod}</td><td style={{ padding: '15px 0', color: '#000000', fontWeight: '500' }}>{hodinyRiadku.toFixed(2)} h</td><td style={{ padding: '15px 0' }}><button onClick={() => vymazat(z.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Zmazať</button></td>
                  </tr>
                )
              })
            )}
          </tbody>
          {zaznamy.length > 0 && (
            <tfoot><tr style={{ borderTop: '2px solid #e5e7eb' }}><td colSpan={4} style={{ padding: '20px 0', textAlign: 'right', color: '#000000', fontWeight: 'bold', paddingRight: '20px' }}>Spolu odpracované:</td><td colSpan={2} style={{ padding: '20px 0', color: '#000000', fontWeight: 'bold', fontSize: '16px' }}>{celkoveHodiny.toFixed(2)} h</td></tr></tfoot>
          )}
        </table>
      </div>
    </div>
  )
}