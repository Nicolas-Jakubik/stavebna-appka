'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { adminStore } from '../../lib/store'

export default function ZamestnanciPage() {
  const [zadaneHeslo, setZadaneHeslo] = useState('')
  const [jeOdomknute, setJeOdomknute] = useState(adminStore.jeOdomknute)
  const [chybaHesla, setChybaHesla] = useState(false)
  const SPRAVNE_HESLO = 'sef123'

  const [zamestnanci, setZamestnanci] = useState<any[]>([])
  
  // Stavy pre pridanie nového zamestnanca
  const [noveMeno, setNoveMeno] = useState('')
  const [novaSadzba, setNovaSadzba] = useState('')
  const [pridavaSa, setPridavaSa] = useState(false)

  // Stavy pre úpravu existujúceho zamestnanca
  const [upravovaneId, setUpravovaneId] = useState<string | null>(null)
  const [upravovaneMeno, setUpravovaneMeno] = useState('')
  const [upravovanaSadzba, setUpravovanaSadzba] = useState('')

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

  async function nacitajZamestnancov() {
    const { data, error } = await supabase
      .from('zamestnanci')
      .select('*')
      .order('meno', { ascending: true })

    if (error) console.error("Chyba načítania zamestnancov:", error)
    else setZamestnanci(data || [])
  }

  async function pridatZamestnanca(e: React.FormEvent) {
    e.preventDefault()
    if (!noveMeno.trim()) return

    setPridavaSa(true)
    
    // Zabezpečíme, že ak nezadá sadzbu, uloží sa 0
    const sadzbaCislo = parseFloat(novaSadzba) || 0

    const { error } = await supabase
      .from('zamestnanci')
      .insert([{ meno: noveMeno.trim(), sadzba: sadzbaCislo }])
    
    setPridavaSa(false)

    if (error) {
      console.error("Chyba pridávania:", error)
      alert("Chyba pri pridávaní zamestnanca.")
    } else {
      setNoveMeno('')
      setNovaSadzba('')
      nacitajZamestnancov()
    }
  }

  async function vymazatZamestnanca(id: string, meno: string) {
    if (!confirm(`Naozaj chcete vymazať zamestnanca "${meno}"? (Jeho doterajšia dochádzka ostane zachovaná)`)) return
    
    const { error } = await supabase
      .from('zamestnanci')
      .delete()
      .eq('id', id)

    if (error) console.error("Chyba mazania:", error)
    else nacitajZamestnancov()
  }

  function zacatUpravu(id: string, aktualneMeno: string, aktualnaSadzba: string) {
    setUpravovaneId(id)
    setUpravovaneMeno(aktualneMeno)
    setUpravovanaSadzba(aktualnaSadzba || '0')
  }

  function zrusitUpravu() {
    setUpravovaneId(null)
    setUpravovaneMeno('')
    setUpravovanaSadzba('')
  }

  async function ulozitUpravu(id: string) {
    if (!upravovaneMeno.trim()) {
      zrusitUpravu()
      return
    }

    const sadzbaCislo = parseFloat(upravovanaSadzba) || 0

    const { error } = await supabase
      .from('zamestnanci')
      .update({ meno: upravovaneMeno.trim(), sadzba: sadzbaCislo })
      .eq('id', id)

    if (error) {
      console.error("Chyba úpravy:", error)
    } else {
      zrusitUpravu()
      nacitajZamestnancov()
    }
  }

  useEffect(() => {
    if (jeOdomknute) {
      nacitajZamestnancov()
    }
  }, [jeOdomknute])

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '350px', backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <h2 style={{ color: '#000000', marginBottom: '20px', fontSize: '20px' }}>Správa zamestnancov</h2>
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
      <div style={{ width: '100%', maxWidth: '900px', backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        
        {/* NAVIGAČNÉ MENU */}
        <div style={{ display: 'flex', gap: '20px', paddingBottom: '20px', borderBottom: '1px solid #e5e7eb', marginBottom: '30px', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{ textDecoration: 'none', color: '#6b7280' }}>Dochádzka</Link>
          <Link href="/zakazky" style={{ textDecoration: 'none', color: '#6b7280' }}>Stavby</Link>
          <Link href="/zamestnanci" style={{ textDecoration: 'none', color: '#111827', fontWeight: 'bold' }}>Zamestnanci</Link>
          <Link href="/mzdy" style={{ textDecoration: 'none', color: '#6b7280' }}>Výplaty</Link>
          <Link href="/" style={{ textDecoration: 'none', color: '#ef4444', marginLeft: 'auto', fontWeight: '500' }}>← Odhlásiť sa</Link>
        </div>

        <h2 style={{ color: '#000000', margin: 0, marginBottom: '40px' }}>Zoznam zamestnancov</h2>

        {/* Formulár na pridanie nového zamestnanca */}
        <form onSubmit={pridatZamestnanca} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '40px', backgroundColor: '#f9fafb', padding: '24px', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>Pridať nového zamestnanca</span>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: '200px' }}>
              <input type="text" placeholder="Meno a priezvisko" value={noveMeno} onChange={(e) => setNoveMeno(e.target.value)} required style={{ padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000', outline: 'none', width: '100%', fontSize: '15px', backgroundColor: 'white' }} />
            </div>
            <div style={{ flex: 1, minWidth: '120px' }}>
              <input type="number" placeholder="Sadzba €/h" value={novaSadzba} onChange={(e) => setNovaSadzba(e.target.value)} required step="0.1" style={{ padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000', outline: 'none', width: '100%', fontSize: '15px', backgroundColor: 'white' }} />
            </div>
            <button type="submit" disabled={pridavaSa} style={{ padding: '12px 24px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: pridavaSa ? 'not-allowed' : 'pointer', minWidth: '140px' }}>
              {pridavaSa ? 'Pridávam...' : '+ Pridať'}
            </button>
          </div>
        </form>

        {/* Tabuľka zamestnancov */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6' }}>
              <th style={{ padding: '12px 0', color: '#666', fontSize: '14px' }}>Meno zamestnanca</th>
              <th style={{ padding: '12px 0', color: '#666', fontSize: '14px', width: '120px' }}>Sadzba (€/h)</th>
              <th style={{ padding: '12px 0', color: '#666', fontSize: '14px', textAlign: 'right', width: '150px' }}>Akcia</th>
            </tr>
          </thead>
          <tbody>
            {zamestnanci.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: '30px 0', color: '#666', textAlign: 'center' }}>Zatiaľ nemáte pridaných žiadnych zamestnancov.</td></tr>
            ) : (
              zamestnanci.map((z) => (
                <tr key={z.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '15px 0', color: '#000000', fontWeight: '500' }}>
                    {upravovaneId === z.id ? (
                      <input type="text" value={upravovaneMeno} onChange={(e) => setUpravovaneMeno(e.target.value)} autoFocus style={{ padding: '6px 10px', border: '1px solid #111827', borderRadius: '6px', color: '#000000', outline: 'none', width: '100%', maxWidth: '250px' }} />
                    ) : (
                      z.meno
                    )}
                  </td>
                  <td style={{ padding: '15px 0', color: '#000000' }}>
                    {upravovaneId === z.id ? (
                      <input type="number" value={upravovanaSadzba} onChange={(e) => setUpravovanaSadzba(e.target.value)} step="0.1" style={{ padding: '6px 10px', border: '1px solid #111827', borderRadius: '6px', color: '#000000', outline: 'none', width: '80px' }} />
                    ) : (
                      `${z.sadzba || 0} €`
                    )}
                  </td>
                  <td style={{ padding: '15px 0', textAlign: 'right' }}>
                    {upravovaneId === z.id ? (
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button onClick={() => zrusitUpravu()} style={{ color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Zrušiť</button>
                        <button onClick={() => ulozitUpravu(z.id)} style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>Uložiť</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: '15px', justifyContent: 'flex-end' }}>
                        <button onClick={() => zacatUpravu(z.id, z.meno, z.sadzba)} style={{ color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Upraviť</button>
                        <button onClick={() => vymazatZamestnanca(z.id, z.meno)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Zmazať</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

      </div>
    </div>
  )
}