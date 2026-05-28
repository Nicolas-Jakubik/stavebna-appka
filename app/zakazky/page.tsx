'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'
import { adminStore } from '../../lib/store'

export default function ZakazkyPage() {
  const [zadaneHeslo, setZadaneHeslo] = useState('')
  const [jeOdomknute, setJeOdomknute] = useState(adminStore.jeOdomknute)
  const [chybaHesla, setChybaHesla] = useState(false)
  const SPRAVNE_HESLO = 'sef123'

  const [zakazky, setZakazky] = useState<any[]>([])
  const [novyNazov, setNovyNazov] = useState('')
  const [pridavaSa, setPridavaSa] = useState(false)

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

  async function nacitajZakazky() {
    const { data, error } = await supabase
      .from('zoznam_zakaziek')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Chyba načítania zákaziek:", error)
    } else {
      setZakazky(data || [])
    }
  }

  async function pridatZakazku(e: React.FormEvent) {
    e.preventDefault()
    if (!novyNazov.trim()) return

    setPridavaSa(true)
    const dnesnyDatum = new Date().toISOString().split('T')[0]
    const { error } = await supabase
      .from('zoznam_zakaziek')
      .insert([{ nazov: novyNazov, stav: 'Aktívna', datum_pridania: dnesnyDatum }])
    setPridavaSa(false)

    if (error) {
      console.error("Chyba:", error)
      alert("Chyba pri pridávaní zákazky.")
    } else {
      setNovyNazov('')
      nacitajZakazky()
    }
  }

  async function zmenitStav(id: string, novyStav: string) {
    const { error } = await supabase
      .from('zoznam_zakaziek')
      .update({ stav: novyStav })
      .eq('id', id)

    if (error) {
      console.error("Chyba úpravy:", error)
    } else {
      nacitajZakazky()
    }
  }

  async function vymazatZakazku(id: string) {
    if (!confirm('Naozaj vymazať túto zákazku zo zoznamu? (Týmto nezmažeš dochádzku, len zákazku z tohto zoznamu)')) return
    
    const { error } = await supabase
      .from('zoznam_zakaziek')
      .delete()
      .eq('id', id)

    if (error) {
      console.error("Chyba mazania:", error)
    } else {
      nacitajZakazky()
    }
  }

  useEffect(() => {
    if (jeOdomknute) {
      nacitajZakazky()
    }
  }, [jeOdomknute])

  // ROZDELENIE DÁT NA AKTÍVNE A DOKONČENÉ
  const aktivneZakazky = zakazky.filter(z => z.stav !== 'Dokončená')
  const dokonceneZakazky = zakazky.filter(z => z.stav === 'Dokončená')

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '350px', backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <h2 style={{ color: '#000000', marginBottom: '20px', fontSize: '20px' }}>Správa stavieb</h2>
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
          <Link href="/zakazky" style={{ textDecoration: 'none', color: '#111827', fontWeight: 'bold' }}>Stavby</Link>
          <Link href="/mzdy" style={{ textDecoration: 'none', color: '#6b7280' }}>Výplaty</Link>
          <Link href="/" style={{ textDecoration: 'none', color: '#ef4444', marginLeft: 'auto', fontWeight: '500' }}>← Odhlásiť sa</Link>
        </div>

        <h2 style={{ color: '#000000', margin: 0, marginBottom: '40px' }}>Zoznam zákaziek (Stavby)</h2>

        {/* Formulár na pridanie novej zákazky */}
        <form onSubmit={pridatZakazku} style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '5px', backgroundColor: '#f9fafb', padding: '24px', borderRadius: '12px', border: '1px solid #f3f4f6' }}>
          <span style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>Pridať novú zákazku</span>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <input type="text" placeholder="Názov zákazky (napr. Bytovka Bratislava)" value={novyNazov} onChange={(e) => setNovyNazov(e.target.value)} required style={{ padding: '12px 16px', border: '1px solid #e5e7eb', borderRadius: '8px', color: '#000000', outline: 'none', width: '100%', fontSize: '15px', backgroundColor: 'white' }} />
            </div>
            <button type="submit" disabled={pridavaSa} style={{ padding: '12px 24px', backgroundColor: '#111827', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: pridavaSa ? 'not-allowed' : 'pointer', minWidth: '160px' }}>
              {pridavaSa ? 'Pridávam...' : '+ Pridať zákazku'}
            </button>
          </div>
        </form>

        {/* ---------------- PRVÁ SEKCIA: AKTÍVNE STAVBY ---------------- */}
        <div style={{ marginBottom: '50px', marginTop: '40px' }}>
          <h3 style={{ color: '#000000', margin: '0 0 20px 0', fontSize: '18px', borderBottom: '2px solid #111827', paddingBottom: '8px', width: 'fit-content' }}>Aktívne stavby</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6' }}>
                <th style={{ padding: '12px 0', color: '#666', fontSize: '14px' }}>Názov zákazky</th>
                <th style={{ padding: '12px 0', color: '#666', fontSize: '14px', width: '180px' }}>Stav</th>
                <th style={{ padding: '12px 0', color: '#666', fontSize: '14px', textAlign: 'right', width: '100px' }}>Akcia</th>
              </tr>
            </thead>
            <tbody>
              {aktivneZakazky.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '30px 0', color: '#666', textAlign: 'center' }}>Žiadne aktívne stavby.</td></tr>
              ) : (
                aktivneZakazky.map((zak) => (
                  <tr key={zak.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '15px 0', color: '#000000', fontWeight: '500' }}>{zak.nazov}</td>
                    <td style={{ padding: '15px 0' }}>
                      <select value={zak.stav || 'Aktívna'} onChange={(e) => zmenitStav(zak.id, e.target.value)} style={{ padding: '6px 12px', border: '1px solid', borderColor: '#10b981', borderRadius: '50px', color: '#047857', backgroundColor: '#ecfdf5', outline: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        <option value="Aktívna">Aktívna</option>
                        <option value="Dokončená">Dokončená</option>
                      </select>
                    </td>
                    <td style={{ padding: '15px 0', textAlign: 'right' }}><button onClick={() => vymazatZakazku(zak.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Zmazať</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ---------------- DRUHÁ SEKCIA: DOKONČENÉ STAVBY ---------------- */}
        <div>
          <h3 style={{ color: '#6b7280', margin: '0 0 20px 0', fontSize: '18px', borderBottom: '2px solid #9ca3af', paddingBottom: '8px', width: 'fit-content' }}>Dokončené stavby</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #f3f4f6' }}>
                <th style={{ padding: '12px 0', color: '#666', fontSize: '14px' }}>Názov zákazky</th>
                <th style={{ padding: '12px 0', color: '#666', fontSize: '14px', width: '180px' }}>Stav</th>
                <th style={{ padding: '12px 0', color: '#666', fontSize: '14px', textAlign: 'right', width: '100px' }}>Akcia</th>
              </tr>
            </thead>
            <tbody>
              {dokonceneZakazky.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '30px 0', color: '#666', textAlign: 'center' }}>Žiadne dokončené stavby.</td></tr>
              ) : (
                dokonceneZakazky.map((zak) => (
                  <tr key={zak.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '15px 0', color: '#6b7280', fontWeight: '500', textDecoration: 'line-through' }}>{zak.nazov}</td>
                    <td style={{ padding: '15px 0' }}>
                      <select value={zak.stav || 'Dokončená'} onChange={(e) => zmenitStav(zak.id, e.target.value)} style={{ padding: '6px 12px', border: '1px solid', borderColor: '#d1d5db', borderRadius: '50px', color: '#6b7280', backgroundColor: '#f3f4f6', outline: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                        <option value="Aktívna">Aktívna</option>
                        <option value="Dokončená">Dokončená</option>
                      </select>
                    </td>
                    <td style={{ padding: '15px 0', textAlign: 'right' }}><button onClick={() => vymazatZakazku(zak.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px' }}>Zmazať</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}