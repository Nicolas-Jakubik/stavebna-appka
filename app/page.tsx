'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/recorderClient'
import Image from 'next/image'
import Link from 'next/link'
import { adminStore } from '../lib/store'
import RecorderGate from '../components/RecorderGate'

export default function Home() {
  return <RecorderGate><AttendanceForm /></RecorderGate>
}

function AttendanceForm() {
  // Zmena: Namiesto jedného mena ukladáme pole vybraných mien
  const [vybraneMena, setVybraneMena] = useState<string[]>([])
  const [zakazka, setZakazka] = useState('')
  const [prichod, setPrichod] = useState('')
  const [odchod, setOdchod] = useState('')
  const [datum, setDatum] = useState('')
  const [status, setStatus] = useState('')
  const [odosiela, setOdosiela] = useState(false)
  const [posledneZapisy, setPosledneZapisy] = useState<any[]>([])
  
  const [zobrazitPotvrdenie, setZobrazitPotvrdenie] = useState(false)

  const [aktivneZakazky, setAktivneZakazky] = useState<any[]>([])
  const [zoznamZamestnancov, setZoznamZamestnancov] = useState<any[]>([])
  const [stavDnesnehoDna, setStavDnesnehoDna] = useState<{
    nacitava: boolean
    chyba: boolean
    kompletne: boolean
    chybaMena: string[]
  }>({ nacitava: true, chyba: false, kompletne: false, chybaMena: [] })
  const [tyzdennyPrehlad, setTyzdennyPrehlad] = useState<Array<{
    datum: string
    den: string
    stav: 'hotovy' | 'neuplny' | 'bez_zapisu' | 'buduci'
    chybaMena: string[]
  }>>([])

  useEffect(() => {
    adminStore.jeOdomknute = false
    setDatum(datumDoLocalString(new Date()))

    try {
      const ulozene = sessionStorage.getItem('posledne-zapisy-dochadzky')
      if (ulozene) setPosledneZapisy(JSON.parse(ulozene))
    } catch {
      setPosledneZapisy([])
    }
  }, [])

  useEffect(() => {
    async function nacitajData() {
      const { data: zakazkyData } = await supabase
        .from('zoznam_zakaziek')
        .select('nazov')
        .eq('stav', 'Aktívna')
        .order('nazov', { ascending: true })
      
      if (zakazkyData) setAktivneZakazky(zakazkyData)

      const { data: zamData } = await supabase
        .from('zamestnanci')
        .select('meno')
        .order('meno', { ascending: true })
      
      if (zamData) setZoznamZamestnancov(zamData)
    }
    nacitajData()
    nacitajKontroluZapisov()
  }, [])

  async function nacitajKontroluZapisov() {
    const dnesDatum = new Date()
    const dnes = datumDoLocalString(dnesDatum)
    const denTyzdna = dnesDatum.getDay()
    const pondelok = new Date(dnesDatum)
    pondelok.setHours(12, 0, 0, 0)
    pondelok.setDate(dnesDatum.getDate() + (denTyzdna === 0 ? -6 : 1 - denTyzdna))

    const sobota = new Date(pondelok)
    sobota.setDate(pondelok.getDate() + 5)

    const odDatumu = datumDoLocalString(pondelok)
    const doDatumu = datumDoLocalString(sobota)

    setStavDnesnehoDna(prev => ({ ...prev, nacitava: true, chyba: false }))

    const [
      { data: zamestnanciData, error: chybaZamestnancov },
      { data: dochadzkaData, error: chybaDochadzky },
      { data: nepritomnostiData, error: chybaNepritomnosti }
    ] = await Promise.all([
      supabase.from('zamestnanci').select('meno').order('meno', { ascending: true }),
      supabase.from('dochadzka').select('meno, datum').gte('datum', odDatumu).lte('datum', doDatumu),
      supabase.from('nepritomnosti').select('meno, datum').gte('datum', odDatumu).lte('datum', doDatumu)
    ])

    if (chybaZamestnancov || chybaDochadzky || chybaNepritomnosti) {
      console.error('Chyba kontroly zápisov:', chybaZamestnancov || chybaDochadzky || chybaNepritomnosti)
      setStavDnesnehoDna({ nacitava: false, chyba: true, kompletne: false, chybaMena: [] })
      setTyzdennyPrehlad([])
      return
    }

    const mena = (zamestnanciData || [])
      .map(z => String(z.meno || '').trim())
      .filter(Boolean)

    const nazvyDni = ['Pondelok', 'Utorok', 'Streda', 'Štvrtok', 'Piatok', 'Sobota']
    const prehlad = nazvyDni.map((den, index) => {
      const datumDnaObj = new Date(pondelok)
      datumDnaObj.setDate(pondelok.getDate() + index)
      const datumDna = datumDoLocalString(datumDnaObj)

      if (datumDna > dnes) {
        return { datum: datumDna, den, stav: 'buduci' as const, chybaMena: [] }
      }

      const vyrieseni = new Set(
        [
          ...(dochadzkaData || []).filter(z => z.datum === datumDna),
          ...(nepritomnostiData || []).filter(z => z.datum === datumDna)
        ]
          .map(z => String(z.meno || '').trim())
          .filter(Boolean)
      )

      const chybaMena = mena.filter(meno => !vyrieseni.has(meno))
      const stav = chybaMena.length === 0
        ? 'hotovy' as const
        : vyrieseni.size === 0
          ? 'bez_zapisu' as const
          : 'neuplny' as const

      return { datum: datumDna, den, stav, chybaMena }
    })

    setTyzdennyPrehlad(prehlad)

    if (denTyzdna === 0) {
      setStavDnesnehoDna({ nacitava: false, chyba: false, kompletne: true, chybaMena: [] })
      return
    }

    const dnesnyStav = prehlad.find(d => d.datum === dnes)
    setStavDnesnehoDna({
      nacitava: false,
      chyba: false,
      kompletne: dnesnyStav?.stav === 'hotovy',
      chybaMena: dnesnyStav?.chybaMena || []
    })
  }

  async function najdiKonflikt(datumKontroly: string) {
    if (vybraneMena.length === 0) return ''

    const { data, error } = await supabase
      .from('dochadzka')
      .select('meno, zakazka, datum, prichod, odchod')
      .eq('datum', datumKontroly)
      .in('meno', vybraneMena)

    if (error) return 'Nepodarilo sa overiť existujúce zápisy. Skúste to znova.'

    for (const meno of vybraneMena) {
      const zaznamyPracovnika = (data || []).filter(z => z.meno === meno)

      const duplikat = zaznamyPracovnika.find(z =>
        z.zakazka === zakazka &&
        z.prichod === prichod &&
        z.odchod === odchod
      )
      if (duplikat) {
        return `${meno} už má presne tento zápis (${prichod}–${odchod}, ${zakazka}).`
      }

      const prekryv = zaznamyPracovnika.find(z =>
        z.prichod && z.odchod &&
        intervalySaPrekryvaju(prichod, odchod, z.prichod, z.odchod)
      )
      if (prekryv) {
        return `${meno} už má v tomto čase zápis ${prekryv.prichod}–${prekryv.odchod} na stavbe ${prekryv.zakazka}.`
      }
    }

    return ''
  }

  async function otvoritKontrolu(e: React.FormEvent) {
    e.preventDefault()
    setStatus('')

    if (vybraneMena.length === 0) {
      setStatus('⚠️ Vyberte aspoň jedného zamestnanca')
      return
    }

    if (!zakazka || !prichod || !odchod || !datum) {
      setStatus('⚠️ Vyplňte zákazku, dátum, príchod aj odchod')
      return
    }

    if (!arePlacesValidMinutes(prichod) || !arePlacesValidMinutes(odchod)) {
      setStatus('⚠️ Čas zapisujte iba po 15 minútach (00, 15, 30, 45)')
      return
    }

    if (prichod === odchod) {
      setStatus('⚠️ Príchod a odchod nemôžu byť rovnaké')
      return
    }

    setStatus('Kontrolujem zápis...')
    const konflikt = await najdiKonflikt(datum)

    if (konflikt) {
      setStatus('⚠️ ' + konflikt)
      return
    }

    setStatus('')
    setZobrazitPotvrdenie(true)
  }

  // Uloženie pre všetkých vybraných zamestnancov
  async function potvrditAOdoslat() {
    if (odosiela) return
    setOdosiela(true)
    setStatus('Kontrolujem a odosielam...')
    
    const datumNaUlozenie = datum || datumDoLocalString(new Date())

    // Konflikt overíme znova tesne pred uložením, aby sme znížili riziko duplikátu.
    const konflikt = await najdiKonflikt(datumNaUlozenie)
    if (konflikt) {
      setZobrazitPotvrdenie(false)
      setStatus('⚠️ ' + konflikt)
      setOdosiela(false)
      return
    }

    const zaznamyNaUlozenie = vybraneMena.map(meno => ({
      meno, 
      zakazka, 
      prichod, 
      odchod, 
      datum: datumNaUlozenie
    }))

    const { error } = await supabase.from('dochadzka').insert(zaznamyNaUlozenie)

    if (error) {
      if (error.code === '23505') {
        setZobrazitPotvrdenie(false)
        setStatus('⚠️ Rovnaký zápis už existuje. Skontrolujte dátum, pracovníka, stavbu a čas.')
      } else {
        setStatus('Chyba: ' + error.message)
      }
      setOdosiela(false)
      return
    }

    const novyZapis = {
      id: Date.now(),
      mena: [...vybraneMena],
      zakazka,
      datum: datumNaUlozenie,
      prichod,
      odchod,
      trvanie: vypocitajTrvanie(prichod, odchod),
      casZapisu: new Date().toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' })
    }

    const aktualizovane = [novyZapis, ...posledneZapisy].slice(0, 5)
    setPosledneZapisy(aktualizovane)
    try {
      sessionStorage.setItem('posledne-zapisy-dochadzky', JSON.stringify(aktualizovane))
    } catch {}

    setStatus(`✅ Záznam uložený pre ${vybraneMena.length} zamestnancov`)
    nacitajKontroluZapisov()
    setZobrazitPotvrdenie(false)
    setVybraneMena([])
    setZakazka('')
    setPrichod('')
    setOdchod('')
    setDatum(datumDoLocalString(new Date()))
    setOdosiela(false)
    
    setTimeout(() => {
      setStatus('')
    }, 4000)
  }

  // Funkcia na prepínanie výberu zamestnanca (pridá/odoberie z poľa)
  function toggleZamestnanec(meno: string) {
    setVybraneMena(prev => 
      prev.includes(meno) 
        ? prev.filter(m => m !== meno) 
        : [...prev, meno]
    )
  }

  function arePlacesValidMinutes(cas: string) {
    if (!cas) return false
    const minuty = Number(cas.split(':')[1])
    return [0, 15, 30, 45].includes(minuty)
  }

  function casNaMinuty(cas: string) {
    const [hodiny, minuty] = cas.split(':').map(Number)
    return hodiny * 60 + minuty
  }

  function intervalySaPrekryvaju(prichodA: string, odchodA: string, prichodB: string, odchodB: string) {
    let startA = casNaMinuty(prichodA)
    let endA = casNaMinuty(odchodA)
    let startB = casNaMinuty(prichodB)
    let endB = casNaMinuty(odchodB)

    if (endA <= startA) endA += 24 * 60
    if (endB <= startB) endB += 24 * 60

    return startA < endB && startB < endA
  }

  function datumDoLocalString(d: Date) {
    const rok = d.getFullYear()
    const mesiac = String(d.getMonth() + 1).padStart(2, '0')
    const den = String(d.getDate()).padStart(2, '0')
    return `${rok}-${mesiac}-${den}`
  }

  function vypocitajTrvanie(odCasu: string, doCasu: string) {
    if (!odCasu || !doCasu) return '0 h'
    const [h1, m1] = odCasu.split(':').map(Number)
    const [h2, m2] = doCasu.split(':').map(Number)
    
    let rozdielMinut = (h2 * 60 + m2) - (h1 * 60 + m1)
    if (rozdielMinut < 0) rozdielMinut += 24 * 60
    if (rozdielMinut > 5.5 * 60) rozdielMinut -= 30
    
    const hodiny = Math.floor(rozdielMinut / 60)
    const minuty = rozdielMinut % 60
    
    if (minuty === 0) return `${hodiny} h`
    return `${hodiny} h ${minuty} m`
  }

  function formatujDatum(d: string) {
    const datumPreFormat = d || new Date().toISOString().split('T')[0]
    const [rok, mesiac, den] = datumPreFormat.split('-')
    return `${den}. ${mesiac}. ${rok}`
  }

  const inputStyle = {
    padding: '12px 0',
    border: 'none',
    borderBottom: '1px solid #e5e7eb',
    width: '100%',
    fontSize: '16px',
    outline: 'none',
    marginBottom: '20px',
    backgroundColor: 'transparent',
    color: '#000000',
    minHeight: '45px',
    display: 'flex',
    alignItems: 'center'
  }

  return (
    <div className="attendance-page" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa', padding: '20px', fontFamily: '"SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      <style>{`
        * {
          box-sizing: border-box;
        }

        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          opacity: 0.6;
        }

        input[type="date"], input[type="time"] {
          -webkit-appearance: none;
          appearance: none;
        }

        .attendance-worker-chip {
          min-height: 44px;
          border: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        @media (max-width: 600px) {
          .attendance-page {
            justify-content: flex-start !important;
            align-items: stretch !important;
            padding:
              max(10px, env(safe-area-inset-top))
              max(10px, env(safe-area-inset-right))
              max(20px, env(safe-area-inset-bottom))
              max(10px, env(safe-area-inset-left)) !important;
          }

          .attendance-card,
          .attendance-recent-card {
            max-width: none !important;
            border-radius: 18px !important;
            box-shadow: none !important;
          }

          .attendance-card {
            padding: 20px 16px !important;
          }

          .attendance-recent-card {
            padding: 18px 16px !important;
            margin-top: 10px !important;
          }

          .attendance-logo {
            margin-bottom: 18px !important;
          }

          .attendance-logo img {
            width: 126px !important;
            height: auto !important;
          }

          .attendance-today {
            margin-bottom: 20px !important;
            padding: 14px !important;
          }

          .attendance-week-header {
            align-items: flex-start !important;
            flex-direction: column !important;
            gap: 5px !important;
          }

          .attendance-week-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 7px !important;
          }

          .attendance-week-day {
            padding: 11px 12px !important;
          }

          .attendance-workers {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 8px !important;
          }

          .attendance-worker-chip {
            width: 100% !important;
            min-height: 48px !important;
            padding: 10px 8px !important;
            border-radius: 12px !important;
            font-size: 14px !important;
            line-height: 1.25 !important;
          }

          .attendance-field {
            min-height: 52px !important;
            font-size: 16px !important;
            margin-bottom: 16px !important;
          }

          .attendance-date-block {
            margin-bottom: 16px !important;
          }

          .attendance-time-row {
            gap: 10px !important;
            margin-bottom: 8px !important;
          }

          .attendance-submit {
            min-height: 52px !important;
            margin-top: 12px !important;
            border-radius: 14px !important;
            font-size: 16px !important;
          }

          .attendance-status {
            margin-top: 14px !important;
            padding: 10px 12px !important;
            border-radius: 12px !important;
            background: #f5f5f7 !important;
            line-height: 1.4 !important;
          }

          .attendance-modal-overlay {
            align-items: flex-end !important;
            padding:
              12px
              max(10px, env(safe-area-inset-right))
              max(10px, env(safe-area-inset-bottom))
              max(10px, env(safe-area-inset-left)) !important;
          }

          .attendance-modal-card {
            max-width: none !important;
            border-radius: 20px 20px 16px 16px !important;
            padding: 22px 16px !important;
          }

          .attendance-modal-card button {
            min-height: 50px !important;
            font-size: 16px !important;
          }

          .attendance-recent-header {
            align-items: flex-start !important;
          }

          .attendance-recent-item > div:first-child {
            gap: 6px !important;
            flex-direction: column !important;
          }

          .attendance-admin-link {
            margin-top: 18px !important;
            padding-bottom: max(6px, env(safe-area-inset-bottom)) !important;
            text-align: center !important;
          }
        }

        @media (max-width: 360px) {
          .attendance-workers {
            grid-template-columns: 1fr !important;
          }

          .attendance-time-row {
            flex-direction: column !important;
          }
        }
      `}</style>

      {/* --- MODAL --- */}
      {zobrazitPotvrdenie && (
        <div className="attendance-modal-overlay" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px'
        }}>
          <div className="attendance-modal-card" style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '30px 24px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600', color: '#1d1d1f' }}>Skontrolujte si údaje</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', backgroundColor: '#f5f5f7', padding: '16px', borderRadius: '14px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' }}>
                <span style={{ color: '#86868b' }}>Zamestnanci ({vybraneMena.length}):</span>
                <span style={{ fontWeight: '500', color: '#0071e3', lineHeight: '1.4' }}>
                  {vybraneMena.join(', ')}
                </span>
              </div>
              <div style={{ height: '1px', backgroundColor: '#d2d2d7', margin: '4px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#86868b' }}>Zákazka:</span>
                <span style={{ fontWeight: '500', color: '#1d1d1f', textAlign: 'right', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{zakazka}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#86868b' }}>Dátum:</span>
                <span style={{ fontWeight: '500', color: '#1d1d1f' }}>{formatujDatum(datum)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: '#86868b' }}>Čas:</span>
                <span style={{ fontWeight: '500', color: '#1d1d1f' }}>{prichod} - {odchod}</span>
              </div>
              <div style={{ height: '1px', backgroundColor: '#d2d2d7', margin: '4px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px' }}>
                <span style={{ color: '#1d1d1f', fontWeight: '600' }}>Platený čas (na osobu):</span>
                <span style={{ fontWeight: '600', color: '#1d1d1f' }}>{vypocitajTrvanie(prichod, odchod)}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#86868b', lineHeight: '1.4' }}>
                Pri pracovnom čase nad 5,5 h je odpočítaná 30-minútová prestávka.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
              <button 
                onClick={potvrditAOdoslat}
                disabled={odosiela}
                style={{ width: '100%', padding: '14px', backgroundColor: '#0071e3', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: odosiela ? 'default' : 'pointer', opacity: odosiela ? 0.65 : 1 }}
              >
                {odosiela ? 'Odosielam...' : 'Potvrdiť a odoslať'}
              </button>
              <button 
                onClick={() => setZobrazitPotvrdenie(false)}
                style={{ width: '100%', padding: '14px', backgroundColor: 'transparent', color: '#86868b', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '500', cursor: 'pointer' }}
              >
                Späť na úpravu
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- KONIEC MODALU --- */}

      <div className="attendance-card" style={{ width: '100%', maxWidth: '720px', backgroundColor: 'white', padding: '36px 44px', borderRadius: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
        
        <div className="attendance-logo" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <Image src="/logo.png" alt="Logo" width={150} height={60} style={{ objectFit: 'contain' }} />
        </div>

        <div className="attendance-today" style={{
          marginBottom: '26px',
          padding: '14px 16px',
          borderRadius: '14px',
          backgroundColor: stavDnesnehoDna.chyba
            ? '#f5f5f7'
            : stavDnesnehoDna.kompletne
              ? '#f0fdf4'
              : '#fff7ed',
          border: stavDnesnehoDna.chyba
            ? '1px solid #e5e7eb'
            : stavDnesnehoDna.kompletne
              ? '1px solid #bbf7d0'
              : '1px solid #fed7aa'
        }}>
          {stavDnesnehoDna.nacitava ? (
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
              Kontrolujem dnešný zápis...
            </div>
          ) : stavDnesnehoDna.chyba ? (
            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
              Stav dnešného zápisu sa nepodarilo načítať.
            </div>
          ) : new Date().getDay() === 0 ? (
            <div style={{ fontSize: '13px', color: '#15803d', fontWeight: '600' }}>
              Nedeľa – zápis pracovníkov dnes nie je potrebný.
            </div>
          ) : stavDnesnehoDna.kompletne ? (
            <div>
              <div style={{ fontSize: '14px', color: '#15803d', fontWeight: '700' }}>
                ✓ Dnešný zápis je kompletný
              </div>
              <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '3px' }}>
                Každý pracovník má dnes dochádzku alebo evidovanú neprítomnosť.
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '14px', color: '#c2410c', fontWeight: '700' }}>
                ⚠ Dnes nie je splnený zápis
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px', lineHeight: '1.5' }}>
                Chýba {stavDnesnehoDna.chybaMena.length} pracovník{stavDnesnehoDna.chybaMena.length === 1 ? '' : 'ov'}:
                {' '}
                <span style={{ color: '#9a3412', fontWeight: '600' }}>
                  {stavDnesnehoDna.chybaMena.join(', ')}
                </span>
              </div>
            </div>
          )}
        </div>

        {tyzdennyPrehlad.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div className="attendance-week-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '12px', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1d1d1f' }}>Tento týždeň</div>
                <div style={{ fontSize: '10px', color: '#86868b', marginTop: '2px' }}>Kontrola zápisov od pondelka do soboty</div>
              </div>
              <div style={{ fontSize: '10px', color: '#6b7280', fontWeight: '600', whiteSpace: 'nowrap' }}>
                {tyzdennyPrehlad.filter(d => d.stav === 'hotovy').length} / {tyzdennyPrehlad.filter(d => d.stav !== 'buduci').length} hotových
              </div>
            </div>

            <div className="attendance-week-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' }}>
              {tyzdennyPrehlad.map(den => {
                const jeHotovy = den.stav === 'hotovy'
                const jeNeuplny = den.stav === 'neuplny'
                const jeBezZapisu = den.stav === 'bez_zapisu'
                const statusText = jeHotovy
                  ? 'Hotové'
                  : jeNeuplny
                    ? `Chýba ${den.chybaMena.length}`
                    : jeBezZapisu
                      ? 'Bez zápisu'
                      : 'Čaká'
                const farba = jeHotovy ? '#15803d' : jeNeuplny ? '#c2410c' : jeBezZapisu ? '#b91c1c' : '#86868b'
                const pozadie = jeHotovy ? '#f0fdf4' : jeNeuplny ? '#fff7ed' : jeBezZapisu ? '#fef2f2' : '#f5f5f7'
                const okraj = jeHotovy ? '#bbf7d0' : jeNeuplny ? '#fed7aa' : jeBezZapisu ? '#fecaca' : '#e5e7eb'

                return (
                  <div className="attendance-week-day" key={den.datum} style={{ padding: '10px 12px', borderRadius: '12px', backgroundColor: pozadie, border: `1px solid ${okraj}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#1d1d1f', fontWeight: '650' }}>{den.den}</div>
                        <div style={{ fontSize: '9px', color: '#86868b', marginTop: '2px' }}>{formatujDatum(den.datum)}</div>
                      </div>
                      <span style={{ fontSize: '9px', fontWeight: '750', color: farba, whiteSpace: 'nowrap' }}>{statusText}</span>
                    </div>
                    {(jeNeuplny || jeBezZapisu) && den.chybaMena.length > 0 && (
                      <div style={{ fontSize: '9px', color: '#6b7280', marginTop: '6px', lineHeight: '1.35' }}>
                        {den.chybaMena.join(', ')}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <form onSubmit={otvoritKontrolu} style={{ display: 'flex', flexDirection: 'column' }}>
          
          {/* Výber zamestnancov pomocou "bublín" (Chips) */}
          <div style={{ marginBottom: '24px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'block' }}>
              Zamestnanci (vyberte viacerých)
            </span>
            <div className="attendance-workers" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {zoznamZamestnancov.map((z, i) => {
                const isSelected = vybraneMena.includes(z.meno)
                return (
                  <button
                    type="button"
                    className="attendance-worker-chip"
                    key={i}
                    onClick={() => toggleZamestnanec(z.meno)}
                    aria-pressed={isSelected}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: isSelected ? '#0071e3' : '#f5f5f7',
                      color: isSelected ? '#ffffff' : '#1d1d1f',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: isSelected ? '600' : '400',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      userSelect: 'none',
                      WebkitTapHighlightColor: 'transparent'
                    }}
                  >
                    {z.meno}
                  </button>
                )
              })}
            </div>
          </div>
          
          <select 
            value={zakazka} 
            onChange={e => setZakazka(e.target.value)} 
            required 
            className="attendance-field" style={{ ...inputStyle, color: zakazka ? '#000000' : '#9ca3af' }}
          >
            <option value="" disabled>Vyberte zákazku zo zoznamu</option>
            {aktivneZakazky.map((z, i) => (
              <option key={i} value={z.nazov} style={{ color: '#000000' }}>{z.nazov}</option>
            ))}
          </select>
          
          <div className="attendance-date-block" style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '20px' }}>
            <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Dátum</span>
            <input type="date" value={datum} onChange={e => setDatum(e.target.value)} className="attendance-field" style={{ ...inputStyle, marginBottom: '0', color: '#000000' }} />
          </div>
          
          <div className="attendance-time-row" style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Príchod</span>
              <input type="time" value={prichod} onChange={e => setPrichod(e.target.value)} required className="attendance-field" style={{ ...inputStyle, marginBottom: '0', color: '#000000' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Odchod</span>
              <input type="time" value={odchod} onChange={e => setOdchod(e.target.value)} required className="attendance-field" style={{ ...inputStyle, marginBottom: '0', color: '#000000' }} />
            </div>
          </div>

          <button className="attendance-submit" type="submit" style={{ marginTop: '10px', padding: '14px', backgroundColor: '#0071e3', color: 'white', border: 'none', borderRadius: '50px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', transition: 'background-color 0.2s' }}>
            Skontrolovať záznam
          </button>
        </form>

        {status && (
          <div className="attendance-status" style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', fontWeight: '500', color: status.includes('✅') ? '#34c759' : '#ff3b30' }}>
            {status}
          </div>
        )}
      </div>

      {posledneZapisy.length > 0 && (
        <div className="attendance-recent-card" style={{ width: '100%', maxWidth: '720px', marginTop: '18px', backgroundColor: '#ffffff', padding: '22px 24px', borderRadius: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)' }}>
          <div className="attendance-recent-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#1d1d1f' }}>Posledné zápisy</div>
              <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>Zápisy odoslané z tohto zariadenia počas tejto relácie.</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setPosledneZapisy([])
                try { sessionStorage.removeItem('posledne-zapisy-dochadzky') } catch {}
              }}
              style={{ border: 'none', background: 'none', color: '#86868b', fontSize: '11px', cursor: 'pointer', padding: 0 }}
            >
              Vymazať
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {posledneZapisy.map(zapis => (
              <div className="attendance-recent-item" key={zapis.id} style={{ padding: '12px 14px', borderRadius: '12px', backgroundColor: '#f5f5f7', border: '1px solid #e5e5e5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1d1d1f', lineHeight: '1.4' }}>{zapis.mena.join(', ')}</div>
                    <div style={{ fontSize: '11px', color: '#86868b', marginTop: '3px' }}>{zapis.zakazka} · {formatujDatum(zapis.datum)}</div>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: '#15803d', whiteSpace: 'nowrap' }}>✓ Zapísané {zapis.casZapisu}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginTop: '9px', fontSize: '12px' }}>
                  <span style={{ color: '#1d1d1f' }}>{zapis.prichod} – {zapis.odchod}</span>
                  <span style={{ color: '#1d1d1f', fontWeight: '600' }}>{zapis.trvanie}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="attendance-admin-link" style={{ marginTop: '30px' }}>
        <Link href="/dashboard" style={{ color: '#d1d5db', fontSize: '13px', textDecoration: 'none', transition: 'color 0.2s' }}>Administrácia</Link>
      </div>
    </div>
  )
}