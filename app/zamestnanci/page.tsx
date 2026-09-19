'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminSidebar from '../../components/AdminSidebar'
import { adminStore } from '../../lib/store'

export default function ZamestnanciPage() {
  const [zadaneHeslo, setZadaneHeslo] = useState('')
  const [jeOdomknute, setJeOdomknute] = useState(adminStore.jeOdomknute)
  const [chybaHesla, setChybaHesla] = useState(false)
  const SPRAVNE_HESLO = 'sef123'

  const [zamestnanci, setZamestnanci] = useState<any[]>([])
  
  const [noveMeno, setNoveMeno] = useState('')
  const [novaSadzba, setNovaSadzba] = useState('')
  const [pridavaSa, setPridavaSa] = useState(false)

  const [upravovaneId, setUpravovaneId] = useState<string | null>(null)
  const [upravovaneMeno, setUpravovaneMeno] = useState('')
  const [upravovanaSadzba, setUpravovanaSadzba] = useState('')
  const [hladat, setHladat] = useState('')
  const [zoradenie, setZoradenie] = useState<'az' | 'za' | 'sadzba_desc' | 'sadzba_asc' | 'hodiny_desc' | 'posledna_praca' | 'nepritomnosti_desc'>('az')
  const [pocetDochadzkyPodlaMena, setPocetDochadzkyPodlaMena] = useState<Record<string, number>>({})
  const [hodinyPodlaMena, setHodinyPodlaMena] = useState<Record<string, number>>({})
  const [poslednaAktivitaPodlaMena, setPoslednaAktivitaPodlaMena] = useState<Record<string, string>>({})
  const [pocetNepritomnostiPodlaMena, setPocetNepritomnostiPodlaMena] = useState<Record<string, number>>({})

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
    color: '#1d1d1f',
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
    color: '#1d1d1f',
    border: '1px solid #d2d2d7',
    cursor: 'pointer',
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.6px',
    fontWeight: '500',
    borderRadius: '98px',
    transition: 'all 0.2s',
  }

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

  function formatujHodiny(hodiny: number) {
    return Number.isInteger(hodiny) ? String(hodiny) : hodiny.toFixed(1)
  }

  function formatujDatumAktivity(datum: string) {
    if (!datum) return 'Bez záznamu'
    const [rok, mesiac, den] = datum.split('-')
    return den && mesiac && rok ? `${den}.${mesiac}.${rok}` : datum
  }

  async function nacitajZamestnancov() {
    const [
      { data: dataZamestnanci, error: chybaZamestnancov },
      { data: dataDochadzka, error: chybaDochadzky },
      { data: dataNepritomnosti, error: chybaNepritomnosti }
    ] = await Promise.all([
      supabase
        .from('zamestnanci')
        .select('*')
        .order('meno', { ascending: true }),
      supabase
        .from('dochadzka')
        .select('meno, datum, prichod, odchod'),
      supabase
        .from('nepritomnosti')
        .select('meno')
    ])

    if (chybaZamestnancov) {
      console.error("Chyba načítania zamestnancov:", chybaZamestnancov)
    } else {
      setZamestnanci(dataZamestnanci || [])
    }

    if (chybaDochadzky) {
      console.error("Chyba načítania dochádzky pracovníkov:", chybaDochadzky)
      setPocetDochadzkyPodlaMena({})
      setHodinyPodlaMena({})
      setPoslednaAktivitaPodlaMena({})
    } else {
      const pocty: Record<string, number> = {}
      const hodiny: Record<string, number> = {}
      const poslednaAktivita: Record<string, string> = {}

      ;(dataDochadzka || []).forEach(zaznam => {
        const meno = String(zaznam.meno || '').trim()
        if (!meno) return

        pocty[meno] = (pocty[meno] || 0) + 1
        hodiny[meno] = (hodiny[meno] || 0) + vypocitajHodiny(
          String(zaznam.prichod || ''),
          String(zaznam.odchod || '')
        )

        const datum = String(zaznam.datum || '')
        if (datum && (!poslednaAktivita[meno] || datum > poslednaAktivita[meno])) {
          poslednaAktivita[meno] = datum
        }
      })

      setPocetDochadzkyPodlaMena(pocty)
      setHodinyPodlaMena(hodiny)
      setPoslednaAktivitaPodlaMena(poslednaAktivita)
    }

    if (chybaNepritomnosti) {
      console.error("Chyba načítania neprítomností pracovníkov:", chybaNepritomnosti)
      setPocetNepritomnostiPodlaMena({})
    } else {
      const poctyNepritomnosti: Record<string, number> = {}

      ;(dataNepritomnosti || []).forEach(zaznam => {
        const meno = String(zaznam.meno || '').trim()
        if (!meno) return
        poctyNepritomnosti[meno] = (poctyNepritomnosti[meno] || 0) + 1
      })

      setPocetNepritomnostiPodlaMena(poctyNepritomnosti)
    }
  }

  async function pridatZamestnanca(e: React.FormEvent) {
    e.preventDefault()
    const meno = noveMeno.trim()
    if (!meno) return

    const existujeRovnakeMeno = zamestnanci.some(z =>
      String(z.meno || '').trim().toLocaleLowerCase('sk') === meno.toLocaleLowerCase('sk')
    )

    if (existujeRovnakeMeno) {
      alert('Pracovník s týmto menom už existuje.')
      return
    }

    setPridavaSa(true)
    const sadzbaCislo = parseFloat(novaSadzba) || 0

    const { error } = await supabase
      .from('zamestnanci')
      .insert([{ meno, sadzba: sadzbaCislo }])
    
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
    const klucMena = String(meno || '').trim()
    const pocetZaznamov = pocetDochadzkyPodlaMena[klucMena] || 0
    const pocetNepritomnosti = pocetNepritomnostiPodlaMena[klucMena] || 0
    const maHistoriu = pocetZaznamov > 0 || pocetNepritomnosti > 0
    const sprava = maHistoriu
      ? `Naozaj vymazať "${meno}"? Historické dáta zostanú zachované: dochádzka ${pocetZaznamov}, neprítomnosti ${pocetNepritomnosti}.`
      : `Naozaj vymazať "${meno}"? Tento pracovník nemá evidovanú dochádzku ani neprítomnosti.`

    if (!confirm(sprava)) return
    
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
    const noveMeno = upravovaneMeno.trim()
    if (!noveMeno) {
      zrusitUpravu()
      return
    }

    const upravovanyZamestnanec = zamestnanci.find(z => String(z.id) === String(id))
    if (!upravovanyZamestnanec) {
      alert('Pracovníka sa nepodarilo nájsť.')
      return
    }

    const povodneMeno = String(upravovanyZamestnanec.meno || '')
    const povodnaSadzba = Number(upravovanyZamestnanec.sadzba) || 0
    const sadzbaCislo = parseFloat(upravovanaSadzba) || 0

    const existujeRovnakeMeno = zamestnanci.some(z =>
      String(z.id) !== String(id) &&
      String(z.meno || '').trim().toLocaleLowerCase('sk') === noveMeno.toLocaleLowerCase('sk')
    )

    if (existujeRovnakeMeno) {
      alert('Pracovník s týmto menom už existuje.')
      return
    }

    const { error: chybaZamestnanca } = await supabase
      .from('zamestnanci')
      .update({ meno: noveMeno, sadzba: sadzbaCislo })
      .eq('id', id)

    if (chybaZamestnanca) {
      console.error("Chyba úpravy pracovníka:", chybaZamestnanca)
      alert('Úpravu pracovníka sa nepodarilo uložiť.')
      return
    }

    if (noveMeno !== povodneMeno) {
      const { error: chybaDochadzky } = await supabase
        .from('dochadzka')
        .update({ meno: noveMeno })
        .eq('meno', povodneMeno)

      if (chybaDochadzky) {
        console.error('Chyba premenovania pracovníka v dochádzke:', chybaDochadzky)

        await supabase
          .from('zamestnanci')
          .update({ meno: povodneMeno, sadzba: povodnaSadzba })
          .eq('id', id)

        alert('Meno sa nepodarilo zmeniť vo všetkých záznamoch. Pôvodné údaje boli obnovené.')
        return
      }

    }

    zrusitUpravu()
    nacitajZamestnancov()
  }

  useEffect(() => {
    if (jeOdomknute) {
      nacitajZamestnancov()
    }
  }, [jeOdomknute])

  const priemernaSadzba = zamestnanci.length > 0
    ? zamestnanci.reduce((sucet, zamestnanec) => sucet + (Number(zamestnanec.sadzba) || 0), 0) / zamestnanci.length
    : 0

  const najvyssiaSadzba = zamestnanci.reduce(
    (maximum, zamestnanec) => Math.max(maximum, Number(zamestnanec.sadzba) || 0),
    0
  )

  const hladanyText = hladat.trim().toLocaleLowerCase('sk')
  const zamestnanciNaZobrazenie = zamestnanci
    .filter(zamestnanec =>
      !hladanyText ||
      String(zamestnanec.meno || '').toLocaleLowerCase('sk').includes(hladanyText)
    )
    .sort((a, b) => {
      const menoA = String(a.meno || '').trim()
      const menoB = String(b.meno || '').trim()

      if (zoradenie === 'sadzba_desc') {
        return (Number(b.sadzba) || 0) - (Number(a.sadzba) || 0) || menoA.localeCompare(menoB, 'sk')
      }

      if (zoradenie === 'sadzba_asc') {
        return (Number(a.sadzba) || 0) - (Number(b.sadzba) || 0) || menoA.localeCompare(menoB, 'sk')
      }

      if (zoradenie === 'hodiny_desc') {
        return (hodinyPodlaMena[menoB] || 0) - (hodinyPodlaMena[menoA] || 0) || menoA.localeCompare(menoB, 'sk')
      }

      if (zoradenie === 'posledna_praca') {
        const datumA = poslednaAktivitaPodlaMena[menoA] || ''
        const datumB = poslednaAktivitaPodlaMena[menoB] || ''
        return datumB.localeCompare(datumA) || menoA.localeCompare(menoB, 'sk')
      }

      if (zoradenie === 'nepritomnosti_desc') {
        return (pocetNepritomnostiPodlaMena[menoB] || 0) - (pocetNepritomnostiPodlaMena[menoA] || 0) || menoA.localeCompare(menoB, 'sk')
      }

      return zoradenie === 'za'
        ? menoB.localeCompare(menoA, 'sk')
        : menoA.localeCompare(menoB, 'sk')
    })

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fbfbfd', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <h2 style={{ color: '#1d1d1f', marginBottom: '20px', fontSize: '26px', fontWeight: '600', letterSpacing: '-0.003em', margin: '0 0 20px 0' }}>Zamestnanci</h2>
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
    <div className="simple-admin-shell" style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f7',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#1d1d1f',
      display: 'flex',
      gap: '24px',
      alignItems: 'flex-start'
    }}>
      <style>{`
        @media (max-width: 1024px) {
          .simple-admin-shell {
            padding:
              calc(64px + env(safe-area-inset-top))
              max(12px, env(safe-area-inset-right))
              calc(20px + env(safe-area-inset-bottom))
              max(12px, env(safe-area-inset-left)) !important;
            display: block !important;
          }

          .simple-admin-content {
            max-width: 100% !important;
          }

          .simple-admin-form-grid,
          .zamestnanci-summary-grid,
          .zamestnanci-filter-grid {
            grid-template-columns: 1fr !important;
          }

          .simple-admin-form-grid button {
            width: 100% !important;
            min-height: 44px;
          }
        }

        @media (max-width: 600px) {
          .simple-admin-card {
            overflow: visible !important;
          }

          .simple-mobile-table {
            display: block;
            width: 100% !important;
          }

          .simple-mobile-table thead {
            display: none;
          }

          .simple-mobile-table tbody {
            display: grid;
            gap: 10px;
          }

          .simple-mobile-table tr.simple-mobile-row {
            display: block;
            border: 1px solid #e5e5e7 !important;
            border-radius: 14px;
            overflow: hidden;
            background: #fff;
          }

          .simple-mobile-table td.simple-mobile-cell {
            display: grid;
            grid-template-columns: 104px minmax(0, 1fr);
            gap: 10px;
            align-items: center;
            min-height: 44px;
            padding: 9px 12px !important;
            border-bottom: 1px solid rgba(0,0,0,0.055);
            text-align: left !important;
          }

          .simple-mobile-table td.simple-mobile-cell:last-child {
            border-bottom: none;
          }

          .simple-mobile-table td.simple-mobile-cell::before {
            content: attr(data-label);
            color: #86868b;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.45px;
          }

          .simple-mobile-table td.simple-mobile-actions > div {
            justify-content: flex-start !important;
            flex-wrap: wrap;
          }

          .simple-mobile-table td.simple-mobile-actions button {
            min-height: 38px;
            padding: 8px 10px !important;
          }

          .simple-mobile-table input {
            width: 100% !important;
            max-width: none !important;
            min-height: 40px;
          }

          .simple-empty-row {
            display: table-row !important;
            border: none !important;
          }

          .simple-empty-cell {
            display: table-cell !important;
            border: none !important;
          }

          .simple-empty-cell::before {
            display: none !important;
          }
        }
      `}</style>

      <AdminSidebar
        active="zamestnanci"
        onLogout={() => { adminStore.jeOdomknute = false; setJeOdomknute(false) }}
      />

      <div className="simple-admin-content" style={{ width: '100%', flex: 1, minWidth: 0, maxWidth: '1540px', margin: '0 auto' }}>
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Firemná administrácia
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', lineHeight: '1.1', letterSpacing: '-0.035em', color: '#1d1d1f', fontWeight: '700' }}>
            Zamestnanci
          </h1>
          <div style={{ fontSize: '11px', color: '#86868b', marginTop: '5px' }}>
            Pracovníci, sadzby, dochádzka, odpracované hodiny a neprítomnosti.
          </div>
        </div>

        <div className="zamestnanci-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          <div style={{ ...cardStyle, padding: '18px 20px', boxShadow: '0 6px 22px rgba(0,0,0,0.045)' }}>
            <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Pracovníci</div>
            <div style={{ fontSize: '30px', lineHeight: 1, color: '#0071e3', fontWeight: '750', letterSpacing: '-0.04em', marginTop: '8px' }}>{zamestnanci.length}</div>
            <div style={{ fontSize: '10px', color: '#86868b', marginTop: '8px' }}>Počet pracovníkov v evidencii</div>
          </div>

          <div style={{ ...cardStyle, padding: '18px 20px', boxShadow: '0 6px 22px rgba(0,0,0,0.045)' }}>
            <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Priemerná sadzba</div>
            <div style={{ fontSize: '30px', lineHeight: 1, color: '#1d1d1f', fontWeight: '750', letterSpacing: '-0.04em', marginTop: '8px' }}>{priemernaSadzba.toFixed(2)} €</div>
            <div style={{ fontSize: '10px', color: '#86868b', marginTop: '8px' }}>Priemer hodinových sadzieb</div>
          </div>

          <div style={{ ...cardStyle, padding: '18px 20px', boxShadow: '0 6px 22px rgba(0,0,0,0.045)', backgroundColor: '#f7fbff' }}>
            <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Najvyššia sadzba</div>
            <div style={{ fontSize: '30px', lineHeight: 1, color: '#1d1d1f', fontWeight: '750', letterSpacing: '-0.04em', marginTop: '8px' }}>{najvyssiaSadzba.toFixed(2)} €</div>
            <div style={{ fontSize: '10px', color: '#0071e3', marginTop: '8px', fontWeight: '650' }}>Najvyššia hodinová sadzba v tíme</div>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: '24px', padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '15px 18px', borderBottom: '1px solid #eeeeef' }}>
            <div style={{ fontSize: '14px', fontWeight: '750', color: '#1d1d1f' }}>Pridať pracovníka</div>
            <div style={{ fontSize: '10px', color: '#86868b', marginTop: '3px' }}>Zadaj meno a základnú hodinovú sadzbu pracovníka.</div>
          </div>

          <form onSubmit={pridatZamestnanca} style={{ padding: '16px 18px 18px' }}>
            <div className="simple-admin-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 140px auto', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{ minWidth: 0 }}>
                <label style={labelStyle}>Meno pracovníka</label>
                <input 
                  type="text" 
                  placeholder="Meno a priezvisko" 
                  value={noveMeno} 
                  onChange={(e) => setNoveMeno(e.target.value)} 
                  required 
                  style={{ ...inputStyle, fontSize: '13px', backgroundColor: '#ffffff' }}
                />
              </div>
              <div style={{ minWidth: 0 }}>
                <label style={labelStyle}>Hodinová sadzba</label>
                <input 
                  type="number" 
                  placeholder="€/h" 
                  value={novaSadzba} 
                  onChange={(e) => setNovaSadzba(e.target.value)} 
                  required 
                  step="0.1"
                  min="0"
                  style={{ ...inputStyle, fontSize: '13px', backgroundColor: '#ffffff' }}
                />
              </div>
              <button 
                type="submit" 
                disabled={pridavaSa} 
                style={{ ...buttonPrimaryStyle, minWidth: '130px', minHeight: '38px', opacity: pridavaSa ? 0.65 : 1 } as any}
                onMouseEnter={(e) => !pridavaSa && ((e.currentTarget as any).style.backgroundColor = '#0077ed')}
                onMouseLeave={(e) => !pridavaSa && ((e.currentTarget as any).style.backgroundColor = '#0071e3')}
              >
                {pridavaSa ? 'Pridávam...' : '+ Pridať pracovníka'}
              </button>
            </div>
          </form>
        </div>

        <div className="simple-admin-card" style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #eeeeef', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '750', color: '#1d1d1f' }}>Prehľad pracovníkov</div>
              <div style={{ fontSize: '10px', color: '#86868b', marginTop: '4px' }}>Kompletný prehľad pracovníkov, dochádzky, hodín a neprítomností.</div>
            </div>
            <span style={{ padding: '4px 9px', borderRadius: '999px', backgroundColor: '#eef6ff', color: '#0071e3', fontSize: '10px', fontWeight: '750' }}>
              {zamestnanciNaZobrazenie.length} / {zamestnanci.length}
            </span>
          </div>

          <div style={{ padding: '12px 18px', borderBottom: '1px solid #eeeeef', backgroundColor: '#fbfbfc' }}>
            <div className="zamestnanci-filter-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 220px auto', gap: '10px', alignItems: 'flex-end' }}>
              <div>
                <label style={labelStyle}>Vyhľadať pracovníka</label>
                <input
                  type="search"
                  placeholder="Napíš meno..."
                  value={hladat}
                  onChange={(e) => setHladat(e.target.value)}
                  style={{ ...inputStyle, backgroundColor: '#ffffff', minHeight: '40px' }}
                />
              </div>

              <div>
                <label style={labelStyle}>Zoradiť</label>
                <select
                  value={zoradenie}
                  onChange={(e) => setZoradenie(e.target.value as 'az' | 'za' | 'sadzba_desc' | 'sadzba_asc' | 'hodiny_desc' | 'posledna_praca' | 'nepritomnosti_desc')}
                  style={{ ...inputStyle, backgroundColor: '#ffffff', minHeight: '40px' }}
                >
                  <option value="az">Meno A–Z</option>
                  <option value="za">Meno Z–A</option>
                  <option value="sadzba_desc">Najvyššia sadzba</option>
                  <option value="sadzba_asc">Najnižšia sadzba</option>
                  <option value="hodiny_desc">Najviac hodín</option>
                  <option value="posledna_praca">Posledná práca</option>
                  <option value="nepritomnosti_desc">Najviac neprítomností</option>
                </select>
              </div>

              {(hladat || zoradenie !== 'az') && (
                <button
                  type="button"
                  onClick={() => { setHladat(''); setZoradenie('az') }}
                  style={{ ...buttonSecondaryStyle, minHeight: '40px', padding: '8px 14px', fontSize: '10px', textTransform: 'none', letterSpacing: 0 } as any}
                >
                  Vyčistiť
                </button>
              )}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="simple-mobile-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #eeeeef', backgroundColor: '#f7f7f8' }}>
                  <th style={{ padding: '10px 18px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Pracovník</th>
                  <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', width: '140px' }}>Hodinová sadzba</th>
                  <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', width: '110px' }}>Dochádzka</th>
                  <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', width: '110px' }}>Hodiny</th>
                  <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', width: '130px' }}>Posledná práca</th>
                  <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', width: '110px' }}>Neprítomnosti</th>
                  <th style={{ padding: '10px 18px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', width: '180px', textAlign: 'right' }}>Akcia</th>
                </tr>
              </thead>
              <tbody>
                {zamestnanciNaZobrazenie.length === 0 ? (
                  <tr className="simple-empty-row">
                    <td className="simple-empty-cell" colSpan={7} style={{ padding: '30px 18px', color: '#a1a1a6', textAlign: 'center', fontSize: '11px' }}>
                      {hladat ? 'Žiadny pracovník nezodpovedá vyhľadávaniu.' : 'Zatiaľ nie je pridaný žiadny pracovník.'}
                    </td>
                  </tr>
                ) : (
                  zamestnanciNaZobrazenie.map((z) => (
                    <tr key={z.id} className="simple-mobile-row" style={{ borderBottom: '1px solid #eeeeef' }}>
                      <td className="simple-mobile-cell" data-label="Pracovník" style={{ padding: '12px 18px', color: '#1d1d1f', fontWeight: '650' }}>
                        {upravovaneId === z.id ? (
                          <input 
                            type="text" 
                            value={upravovaneMeno} 
                            onChange={(e) => setUpravovaneMeno(e.target.value)} 
                            autoFocus 
                            style={{ ...inputStyle, maxWidth: '260px', fontSize: '12px', backgroundColor: '#ffffff' }}
                          />
                        ) : (
                          z.meno
                        )}
                      </td>
                      <td className="simple-mobile-cell" data-label="Hodinová sadzba" style={{ padding: '10px 12px' }}>
                        {upravovaneId === z.id ? (
                          <input 
                            type="number" 
                            value={upravovanaSadzba} 
                            onChange={(e) => setUpravovanaSadzba(e.target.value)} 
                            step="0.1"
                            min="0"
                            style={{ ...inputStyle, width: '96px', fontSize: '12px', backgroundColor: '#ffffff' }}
                          />
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 9px', borderRadius: '999px', backgroundColor: '#f5f5f7', color: '#1d1d1f', fontWeight: '700', fontSize: '11px' }}>
                            {Number(z.sadzba || 0).toFixed(2)} €/h
                          </span>
                        )}
                      </td>
                      <td className="simple-mobile-cell" data-label="Dochádzka" style={{ padding: '10px 12px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '30px',
                          padding: '4px 8px',
                          borderRadius: '999px',
                          backgroundColor: (pocetDochadzkyPodlaMena[String(z.meno || '').trim()] || 0) > 0 ? '#eef6ff' : '#f5f5f7',
                          color: (pocetDochadzkyPodlaMena[String(z.meno || '').trim()] || 0) > 0 ? '#0071e3' : '#86868b',
                          fontSize: '10px',
                          fontWeight: '750'
                        }}>
                          {pocetDochadzkyPodlaMena[String(z.meno || '').trim()] || 0}
                        </span>
                      </td>
                      <td className="simple-mobile-cell" data-label="Hodiny" style={{ padding: '10px 12px', color: '#1d1d1f', fontSize: '11px', fontWeight: '700' }}>
                        {formatujHodiny(hodinyPodlaMena[String(z.meno || '').trim()] || 0)} h
                      </td>
                      <td className="simple-mobile-cell" data-label="Posledná práca" style={{ padding: '10px 12px', color: '#1d1d1f', fontSize: '11px', fontWeight: '600' }}>
                        {formatujDatumAktivity(poslednaAktivitaPodlaMena[String(z.meno || '').trim()] || '')}
                      </td>
                      <td className="simple-mobile-cell" data-label="Neprítomnosti" style={{ padding: '10px 12px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '30px',
                          padding: '4px 8px',
                          borderRadius: '999px',
                          backgroundColor: (pocetNepritomnostiPodlaMena[String(z.meno || '').trim()] || 0) > 0 ? '#fff7ed' : '#f5f5f7',
                          color: (pocetNepritomnostiPodlaMena[String(z.meno || '').trim()] || 0) > 0 ? '#c2410c' : '#86868b',
                          fontSize: '10px',
                          fontWeight: '750'
                        }}>
                          {pocetNepritomnostiPodlaMena[String(z.meno || '').trim()] || 0}
                        </span>
                      </td>
                      <td className="simple-mobile-cell simple-mobile-actions" data-label="Akcia" style={{ padding: '10px 18px', textAlign: 'right' }}>
                        {upravovaneId === z.id ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button 
                              type="button"
                              onClick={zrusitUpravu}
                              style={{ color: '#86868b', backgroundColor: '#f5f5f7', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '650', padding: '6px 9px', borderRadius: '8px' }}
                            >
                              Zrušiť
                            </button>
                            <button 
                              type="button"
                              onClick={() => ulozitUpravu(z.id)}
                              style={{ color: '#ffffff', backgroundColor: '#0071e3', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '700', padding: '6px 9px', borderRadius: '8px' }}
                            >
                              Uložiť
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            <button 
                              type="button"
                              onClick={() => zacatUpravu(z.id, z.meno, z.sadzba)}
                              style={{ color: '#0071e3', backgroundColor: '#eef6ff', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '650', padding: '6px 9px', borderRadius: '8px' }}
                            >
                              Upraviť
                            </button>
                            <button 
                              type="button"
                              onClick={() => vymazatZamestnanca(z.id, z.meno)}
                              style={{ color: '#86868b', backgroundColor: '#f5f5f7', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '650', padding: '6px 9px', borderRadius: '8px', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = '#b42318'; e.currentTarget.style.backgroundColor = '#fef2f2' }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = '#86868b'; e.currentTarget.style.backgroundColor = '#f5f5f7' }}
                            >
                              Zmazať
                            </button>
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

      </div>
    </div>
  )
}