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
    const { data } = await query
    setZaznamy(data || [])
  }

  async function ulozZmenu(id: string) {
    const { error } = await supabase
      .from('dochadzka')
      .update({ prichod: editPrichod, odchod: editOdchod })
      .eq('id', id)

    if (error) alert("Chyba pri ukladaní")
    else {
      setEditovanyId(null)
      nacitaj()
    }
  }

  async function vymazat(id: string) {
    if (!confirm('Naozaj vymazať?')) return
    await supabase.from('dochadzka').delete().eq('id', id)
    nacitaj()
  }

  useEffect(() => { if (jeOdomknute) nacitaj() }, [filterMesiac, filterDen, filterZakazka, jeOdomknute])

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' }}>
        <div style={{ background: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <h2>Prihlásenie</h2>
          <form onSubmit={skontrolovatHeslo}>
            <input type="password" value={zadaneHeslo} onChange={e => setZadaneHeslo(e.target.value)} style={{ display: 'block', margin: '10px auto', padding: '10px' }} />
            <button type="submit">Odomknúť</button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#fafafa', padding: '40px' }}>
      <div style={{ maxWidth: '1050px', margin: '0 auto', backgroundColor: 'white', padding: '40px', borderRadius: '20px' }}>
        
        {/* Navigácia a filtre (skrátené pre prehľadnosť, pridaj si podľa potreby) */}
        <h2>Prehľad dochádzky</h2>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '10px' }}>Dátum</th>
              <th style={{ padding: '10px' }}>Zamestnanec</th>
              <th style={{ padding: '10px' }}>Zákazka</th>
              <th style={{ padding: '10px' }}>Čas</th>
              <th style={{ padding: '10px' }}>Akcia</th>
            </tr>
          </thead>
          <tbody>
            {zaznamy.map((z) => (
              <tr key={z.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '15px' }}>{z.datum}</td>
                <td style={{ padding: '15px' }}>{z.meno}</td>
                <td style={{ padding: '15px' }}>{z.zakazka}</td>
                <td style={{ padding: '15px' }}>
                  {editovanyId === z.id ? (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <input type="time" value={editPrichod} onChange={e => setEditPrichod(e.target.value)} />
                      <input type="time" value={editOdchod} onChange={e => setEditOdchod(e.target.value)} />
                    </div>
                  ) : (
                    `${z.prichod} - ${z.odchod}`
                  )}
                </td>
                <td style={{ padding: '15px' }}>
                  {editovanyId === z.id ? (
                    <button onClick={() => ulozZmenu(z.id)} style={{ color: '#10b981', cursor: 'pointer', fontWeight: 'bold' }}>Uložiť</button>
                  ) : (
                    <button onClick={() => { setEditovanyId(z.id); setEditPrichod(z.prichod); setEditOdchod(z.odchod); }} style={{ color: '#3b82f6', cursor: 'pointer', marginRight: '10px' }}>Upraviť</button>
                  )}
                  <button onClick={() => vymazat(z.id)} style={{ color: '#ef4444', cursor: 'pointer' }}>Zmazať</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}