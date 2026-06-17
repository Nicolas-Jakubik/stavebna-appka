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

  // Stavy pre úpravu
  const [editovanyId, setEditovanyId] = useState<string | null>(null)
  const [editPrichod, setEditPrichod] = useState('')
  const [editOdchod, setEditOdchod] = useState('')

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

  async function ulozZmenu(id: string) {
    const { error } = await supabase
      .from('dochadzka')
      .update({ prichod: editPrichod, odchod: editOdchod })
      .eq('id', id)

    if (error) alert("Chyba pri ukladaní zmeny: " + error.message)
    else {
      setEditovanyId(null)
      nacitaj()
    }
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
  const pocetZaznamov = zaznamy.length
  
  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '350px', backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <h2 style={{ color: '#000000', marginBottom: '20px', fontSize: '20px' }}>Prihlásenie</h2>
          <form onSubmit={skontrolovatHeslo}>
            <input type="password" placeholder="Zadajte heslo" value={zadaneHeslo} onChange={e => setZadaneHeslo(e.target.value)} required style={{ padding: '12px 0', border: 'none', borderBottom: '1px solid #e5e7eb', width: '100%', fontSize: '16px', outline: 'none', marginBottom: '20px', backgroundColor: 'transparent', color: '#000000', textAlign: 'center' }} />
            <button type="submit" style={{ padding: '12px', width: '100%', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '50px', fontWeight: '600', cursor: 'pointer' }}>Odomknúť</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', padding: '40px 20px', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '1050px', backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', gap: '20px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb', marginBottom: '30px', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: '#111827', fontWeight: 'bold' }}>Dochádzka</Link>
          <Link href="/zakazky" style={{ textDecoration: 'none', color: '#6b7280' }}>Stavby</Link>
          <Link href="/zamestnanci" style={{ textDecoration: 'none', color: '#6b7280' }}>Zamestnanci</Link>
          <Link href="/mzdy" style={{ textDecoration: 'none', color: '#6b7280' }}>Výplaty</Link>
          <Link href="/" style={{ textDecoration: 'none', color: '#ef4444', marginLeft: 'auto', fontWeight: '500' }}>← Odhlásiť sa</Link>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
              <th style={{ padding: '12px 10px' }}>Dátum</th>
              <th style={{ padding: '12px 10px' }}>Zamestnanec</th>
              <th style={{ padding: '12px 10px' }}>Čas</th>
              <th style={{ padding: '12px 10px' }}>Akcia</th>
            </tr>
          </thead>
          <tbody>
            {zaznamy.map((z) => (
              <tr key={z.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '15px 10px' }}>{z.datum}</td>
                <td style={{ padding: '15px 10px' }}>{z.meno}</td>
                <td style={{ padding: '15px 10px' }}>
                  {editovanyId === z.id ? (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input type="time" value={editPrichod} onChange={e => setEditPrichod(e.target.value)} />
                      <input type="time" value={editOdchod} onChange={e => setEditOdchod(e.target.value)} />
                    </div>
                  ) : (
                    `${z.prichod} - ${z.odchod}`
                  )}
                </td>
                <td style={{ padding: '15px 10px' }}>
                  {editovanyId === z.id ? (
                    <button onClick={() => ulozZmenu(z.id)} style={{ color: '#10b981', fontWeight: 'bold', cursor: 'pointer', border: 'none', background: 'none' }}>Uložiť</button>
                  ) : (
                    <button onClick={() => { setEditovanyId(z.id); setEditPrichod(z.prichod); setEditOdchod(z.odchod); }} style={{ color: '#3b82f6', cursor: 'pointer', border: 'none', background: 'none', marginRight: '10px' }}>Upraviť</button>
                  )}
                  <button onClick={() => vymazat(z.id)} style={{ color: '#ef4444', cursor: 'pointer', border: 'none', background: 'none' }}>Zmazať</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}