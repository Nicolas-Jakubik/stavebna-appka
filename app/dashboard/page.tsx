'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AdminNav from '../../components/AdminNav'
import { adminStore } from '../../lib/store'

export default function DashboardPage() {
  const [zadaneHeslo, setZadaneHeslo] = useState('')
  const [jeOdomknute, setJeOdomknute] = useState(adminStore.jeOdomknute)
  const [chybaHesla, setChybaHesla] = useState(false)
  const SPRAVNE_HESLO = 'sef123'

  const [zaznamy, setZaznamy] = useState<any[]>([])
  const [kontrolneZaznamy, setKontrolneZaznamy] = useState<any[]>([])
  const [filterMesiac, setFilterMesiac] = useState(new Date().toISOString().slice(0, 7))
  const [filterDen, setFilterDen] = useState('')
  const [filterZakazka, setFilterZakazka] = useState('')
  const [filterMeno, setFilterMeno] = useState('')
  const [filterPolovica, setFilterPolovica] = useState<'cely' | 'prva' | 'druha'>('cely')
  const [filterProblem, setFilterProblem] = useState('vsetko')
  
  const [dostupneZakazky, setDostupneZakazky] = useState<string[]>([])
  const [dostupneMena, setDostupneMena] = useState<string[]>([])

  // Kontrola chýbajúcej dochádzky za predchádzajúci kalendárny deň
  const [nezapisaniVcera, setNezapisaniVcera] = useState<string[]>([])
  const [datumKontroly, setDatumKontroly] = useState('')
  const [chybaKontroly, setChybaKontroly] = useState('')
  const [nacitavaKontrola, setNacitavaKontrola] = useState(false)

  const [ukazatFormular, setUkazatFormular] = useState(false)
  const [noveZaznamy, setNoveZaznamy] = useState([
    { datum: new Date().toISOString().split('T')[0], mena: [] as string[], zakazka: '', prichod: '', odchod: '' }
  ])

  const [upravovaneId, setUpravovaneId] = useState<string | null>(null)
  const [upravovanePrichod, setUpravovanePrichod] = useState('')
  const [upravovaneOdchod, setUpravovaneOdchod] = useState('')
  const [upravovaneHodiny, setUpravovaneHodiny] = useState('')
  const [chybaUpravaHodiny, setChybaUpravaHodiny] = useState('')

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
    color: '#000',
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
    color: '#000',
    border: '1px solid #d2d2d7',
    cursor: 'pointer',
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.6px',
    fontWeight: '500',
    borderRadius: '98px',
    transition: 'all 0.2s',
  }

  function arePlacesValidMinutes(time: string): boolean {
    if (!time) return true
    const [hours, minutes] = time.split(':').map(Number)
    const validMinutes = [0, 15, 30, 45]
    return validMinutes.includes(minutes)
  }

  function getTimeValidationError(prichod: string, odchod: string): string {
    if (!prichod || !odchod) return 'Príchod aj odchod sú povinné.'
    if (!arePlacesValidMinutes(prichod)) return 'Príchod: Dovolené sú iba 00, 15, 30, 45 minút'
    if (!arePlacesValidMinutes(odchod)) return 'Odchod: Dovolené sú iba 00, 15, 30, 45 minút'
    if (prichod === odchod) return 'Príchod a odchod nemôžu byť rovnaké.'
    return ''
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

  function jePresnyDuplikat(zaznam: any, excludeId?: string) {
    return kontrolneZaznamy.some(z =>
      z.datum === zaznam.datum &&
      z.meno === zaznam.meno &&
      z.zakazka === zaznam.zakazka &&
      z.prichod === zaznam.prichod &&
      z.odchod === zaznam.odchod &&
      (!excludeId || z.id !== excludeId)
    )
  }

  function maViacPracovnychUsekovVDen(zaznam: any, excludeId?: string) {
    return kontrolneZaznamy.some(z =>
      z.datum === zaznam.datum &&
      z.meno === zaznam.meno &&
      (!excludeId || z.id !== excludeId)
    )
  }

  function maPrekryvajuciSaCas(zaznam: any, excludeId?: string) {
    if (!zaznam.prichod || !zaznam.odchod) return false

    return kontrolneZaznamy.some(z =>
      z.datum === zaznam.datum &&
      z.meno === zaznam.meno &&
      (!excludeId || z.id !== excludeId) &&
      z.prichod && z.odchod &&
      intervalySaPrekryvaju(zaznam.prichod, zaznam.odchod, z.prichod, z.odchod) &&
      !(z.zakazka === zaznam.zakazka && z.prichod === zaznam.prichod && z.odchod === zaznam.odchod)
    )
  }

  function skontrolovatHeslo(e: React.FormEvent) {
    e.preventDefault()
    if (zadaneHeslo === SPRAVNE_HESLO) {
      adminStore.jeOdomknute = true
      setJeOdomknute(true)
      setChybaHesla(false)
    } else setChybaHesla(true)
  }

  const nazvyMesiacov = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December']
  const aktualnyRok = new Date().getFullYear()
  const zoznamMesiacov = [aktualnyRok - 1, aktualnyRok, aktualnyRok + 1].flatMap(rok =>
    nazvyMesiacov.map((nazov, index) => ({
      hodnota: `${rok}-${String(index + 1).padStart(2, '0')}`,
      nazov: `${nazov} ${rok}`
    }))
  )

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

  function jePodozrivyCas(prichod: string, odchod: string, hodiny: number) {
    if (!prichod || !odchod) return true
    if (prichod < '05:00') return true     
    if (odchod > '21:00') return true      
    if (hodiny > 14 || hodiny <= 0) return true 
    return false
  }

  function datumDoLocalString(d: Date) {
    const rok = d.getFullYear()
    const mesiac = String(d.getMonth() + 1).padStart(2, '0')
    const den = String(d.getDate()).padStart(2, '0')
    return `${rok}-${mesiac}-${den}`
  }

  function formatujDatumSK(datum: string) {
    if (!datum) return ''
    const [rok, mesiac, den] = datum.split('-')
    return `${den}.${mesiac}.${rok}`
  }

  function nastavRychlyFilter(typ: 'cely' | 'prva' | 'druha' | 'dnes' | 'vcera') {
    setFilterProblem('vsetko')

    if (typ === 'cely' || typ === 'prva' || typ === 'druha') {
      setFilterDen('')
      setFilterPolovica(typ)
      return
    }

    const datum = new Date()
    if (typ === 'vcera') datum.setDate(datum.getDate() - 1)
    const datumText = datumDoLocalString(datum)

    setFilterMesiac(datumText.slice(0, 7))
    setFilterDen(datumText)
    setFilterPolovica('cely')
  }

  function vypocitajFondObdobia(mesiac: string, odDna = 1, doDna?: number) {
    const [rokText, mesiacText] = mesiac.split('-')
    const rok = Number(rokText)
    const mesiacIndex = Number(mesiacText) - 1

    if (!Number.isInteger(rok) || mesiacIndex < 0 || mesiacIndex > 11) return 0

    const pocetDni = new Date(Date.UTC(rok, mesiacIndex + 1, 0)).getUTCDate()
    const poslednyDen = Math.min(doDna ?? pocetDni, pocetDni)
    let fond = 0

    for (let den = Math.max(1, odDna); den <= poslednyDen; den++) {
      const denVTyzdni = new Date(Date.UTC(rok, mesiacIndex, den)).getUTCDay()
      if (denVTyzdni === 0) continue
      fond += denVTyzdni === 6 ? 10.5 : 11.5
    }

    return fond
  }

  function vypocitajFondMesiaca(mesiac: string) {
    return vypocitajFondObdobia(mesiac)
  }

  async function nacitajNezapisanychVcera() {
    setNacitavaKontrola(true)
    setChybaKontroly('')

    const vcera = new Date()
    vcera.setDate(vcera.getDate() - 1)
    const datum = datumDoLocalString(vcera)
    setDatumKontroly(datum)

    const [zamestnanciResult, dochadzkaResult] = await Promise.all([
      supabase.from('zamestnanci').select('meno').order('meno', { ascending: true }),
      supabase.from('dochadzka').select('meno').eq('datum', datum)
    ])

    if (zamestnanciResult.error || dochadzkaResult.error) {
      const sprava = zamestnanciResult.error?.message || dochadzkaResult.error?.message || 'Nepodarilo sa načítať kontrolu dochádzky.'
      setChybaKontroly(sprava)
      setNezapisaniVcera([])
      setNacitavaKontrola(false)
      return
    }

    const vsetci = Array.from(
      new Set((zamestnanciResult.data || []).map(z => z.meno).filter(Boolean))
    ) as string[]

    const zapisani = new Set(
      (dochadzkaResult.data || []).map(z => z.meno).filter(Boolean)
    )

    setNezapisaniVcera(vsetci.filter(meno => !zapisani.has(meno)))
    setNacitavaKontrola(false)
  }

  async function nacitajFiltre() {
    const [zamestnanciResult, dochadzkaResult] = await Promise.all([
      supabase.from('zamestnanci').select('meno').order('meno', { ascending: true }),
      supabase.from('dochadzka').select('zakazka, meno')
    ])

    const dochadzkaData = dochadzkaResult.data || []
    const unikatneZakazky = Array.from(new Set(dochadzkaData.map(z => z.zakazka))).filter(Boolean)
    setDostupneZakazky(unikatneZakazky.sort() as string[])

    if (!zamestnanciResult.error && zamestnanciResult.data) {
      const mena = Array.from(new Set(zamestnanciResult.data.map(z => z.meno).filter(Boolean))) as string[]
      setDostupneMena(mena.sort())
    } else {
      const mena = Array.from(new Set(dochadzkaData.map(z => z.meno))).filter(Boolean) as string[]
      setDostupneMena(mena.sort())
    }
  }

  async function nacitajKontrolneZaznamy() {
    const { data, error } = await supabase
      .from('dochadzka')
      .select('id, datum, meno, zakazka, prichod, odchod')

    if (error) console.error('Chyba kontroly duplicít a prekryvov:', error.message)
    else setKontrolneZaznamy(data || [])
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
    if (filterMeno) query = query.eq('meno', filterMeno)
    const { data, error } = await query
    if (error) console.error("Chyba Supabase:", error.message)
    else setZaznamy(data || [])
  }

  async function vymazat(id: string) {
    if (!confirm('Naozaj vymazať?')) return
    await supabase.from('dochadzka').delete().eq('id', id)
    nacitaj()
    nacitajFiltre()
    nacitajNezapisanychVcera()
    nacitajKontrolneZaznamy()
  }

  function zacatUpravu(id: string, prichod: string, odchod: string) {
    setUpravovaneId(id)
    setUpravovanePrichod(prichod)
    setUpravovaneOdchod(odchod)
    setUpravovaneHodiny(vypocitajHodiny(prichod, odchod).toFixed(2))
    setChybaUpravaHodiny('')
  }

  function zrusitUpravu() {
    setUpravovaneId(null)
    setUpravovanePrichod('')
    setUpravovaneOdchod('')
    setUpravovaneHodiny('')
    setChybaUpravaHodiny('')
  }

  function handleTimeChange(isOdchod: boolean, value: string) {
    if (isOdchod) {
      setUpravovaneOdchod(value)
      if (upravovanePrichod && value) {
        const error = getTimeValidationError(upravovanePrichod, value)
        setChybaUpravaHodiny(error)
        if (!error) {
          setUpravovaneHodiny(vypocitajHodiny(upravovanePrichod, value).toFixed(2))
        }
      }
    } else {
      setUpravovanePrichod(value)
      if (value && upravovaneOdchod) {
        const error = getTimeValidationError(value, upravovaneOdchod)
        setChybaUpravaHodiny(error)
        if (!error) {
          setUpravovaneHodiny(vypocitajHodiny(value, upravovaneOdchod).toFixed(2))
        }
      }
    }
  }

  async function ulozitUpravu(id: string) {
    const error = getTimeValidationError(upravovanePrichod, upravovaneOdchod)
    if (error) {
      setChybaUpravaHodiny(error)
      return
    }

    const povodny = kontrolneZaznamy.find(z => z.id === id) || zaznamy.find(z => z.id === id)
    if (!povodny) {
      setChybaUpravaHodiny('Záznam sa nepodarilo nájsť.')
      return
    }

    const upraveny = { ...povodny, prichod: upravovanePrichod, odchod: upravovaneOdchod }
    if (jePresnyDuplikat(upraveny, id)) {
      setChybaUpravaHodiny('Tento zápis už existuje: rovnaký pracovník, deň, stavba, príchod aj odchod.')
      return
    }

    const { error: supabaseError } = await supabase
      .from('dochadzka')
      .update({ prichod: upravovanePrichod, odchod: upravovaneOdchod })
      .eq('id', id)

    if (supabaseError) {
      console.error("Chyba úpravy:", supabaseError)
      setChybaUpravaHodiny('Úpravu sa nepodarilo uložiť: ' + supabaseError.message)
    } else {
      zrusitUpravu()
      await Promise.all([nacitaj(), nacitajFiltre(), nacitajKontrolneZaznamy()])
    }
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

    for (let i = 0; i < noveZaznamy.length; i++) {
      const z = noveZaznamy[i]

      if (!z.datum || !z.zakazka || !z.prichod || !z.odchod || z.mena.length === 0) {
        alert(`Blok ${i + 1}: Vyplňte dátum, stavbu, príchod, odchod a vyberte aspoň jedného zamestnanca.`)
        return
      }

      const error = getTimeValidationError(z.prichod, z.odchod)
      if (error) {
        alert(`Blok ${i + 1}: ${error}`)
        return
      }

      for (const meno of z.mena) {
        dataNaVlozenie.push({ datum: z.datum, meno, zakazka: z.zakazka.trim(), prichod: z.prichod, odchod: z.odchod })
      }
    }

    const kluce = new Set<string>()
    for (const zaznam of dataNaVlozenie) {
      const kluc = `${zaznam.datum}|${zaznam.meno}|${zaznam.zakazka}|${zaznam.prichod}|${zaznam.odchod}`.toLowerCase()
      if (kluce.has(kluc) || jePresnyDuplikat(zaznam)) {
        alert(`Duplikát: ${zaznam.meno} už má rovnaký zápis ${zaznam.datum} na stavbe ${zaznam.zakazka} (${zaznam.prichod}–${zaznam.odchod}).`)
        return
      }
      kluce.add(kluc)
    }

    const { error } = await supabase.from('dochadzka').insert(dataNaVlozenie)
    if (error) alert('Chyba: ' + error.message)
    else {
      setUkazatFormular(false)
      setNoveZaznamy([{ datum: new Date().toISOString().split('T')[0], mena: [], zakazka: '', prichod: '', odchod: '' }])
      await Promise.all([nacitaj(), nacitajFiltre(), nacitajNezapisanychVcera(), nacitajKontrolneZaznamy()])
    }
  }

  useEffect(() => { if (jeOdomknute) { nacitajFiltre(); nacitajKontrolneZaznamy() } }, [jeOdomknute])
  useEffect(() => { if (jeOdomknute) nacitajNezapisanychVcera() }, [jeOdomknute])
  useEffect(() => { if (jeOdomknute) nacitaj() }, [filterMesiac, filterDen, filterZakazka, filterMeno, jeOdomknute])

  const celkoveHodiny = zaznamy.reduce((sucet, z) => sucet + vypocitajHodiny(z.prichod, z.odchod), 0)
  const pocetZaznamov = zaznamy.length
  const prvaPolovicaHodiny = zaznamy
    .filter(z => Number(String(z.datum).split('-')[2]) <= 15)
    .reduce((sucet, z) => sucet + vypocitajHodiny(z.prichod, z.odchod), 0)
  const druhaPolovicaHodiny = zaznamy
    .filter(z => Number(String(z.datum).split('-')[2]) >= 16)
    .reduce((sucet, z) => sucet + vypocitajHodiny(z.prichod, z.odchod), 0)
  const fondPrvaPolovica = vypocitajFondObdobia(filterMesiac, 1, 15)
  const fondDruhaPolovica = vypocitajFondObdobia(filterMesiac, 16)
  const fondMesiaca = fondPrvaPolovica + fondDruhaPolovica
  const zobrazitRozdielOprotiFondu = !!filterMeno && !filterDen && !filterZakazka
  const rozdielOprotiFondu = celkoveHodiny - fondMesiaca
  const rozdielPrvaPolovica = prvaPolovicaHodiny - fondPrvaPolovica
  const rozdielDruhaPolovica = druhaPolovicaHodiny - fondDruhaPolovica
  
  const zamestnanciHodiny: Record<string, number> = {}
  zaznamy.forEach(z => { zamestnanciHodiny[z.meno] = (zamestnanciHodiny[z.meno] || 0) + vypocitajHodiny(z.prichod, z.odchod) })
  let najaktivnejsi = '-'; let maxHod = 0
  Object.entries(zamestnanciHodiny).forEach(([meno, h]) => { if (h > maxHod) { maxHod = h; najaktivnejsi = meno } })

  const nazovVybranehoMesiaca = zoznamMesiacov.find(m => m.hodnota === filterMesiac)?.nazov || filterMesiac
  const zobrazitMesacnyPrehlad = !filterDen && !filterZakazka
  const menaPrehladu = filterMeno ? [filterMeno] : dostupneMena
  const mesacnyPrehlad = menaPrehladu.map(meno => {
    const zaznamyPracovnika = zaznamy.filter(z => z.meno === meno)
    const prva = zaznamyPracovnika
      .filter(z => Number(String(z.datum).split('-')[2]) <= 15)
      .reduce((sucet, z) => sucet + vypocitajHodiny(z.prichod, z.odchod), 0)
    const druha = zaznamyPracovnika
      .filter(z => Number(String(z.datum).split('-')[2]) >= 16)
      .reduce((sucet, z) => sucet + vypocitajHodiny(z.prichod, z.odchod), 0)
    const spolu = prva + druha
    return { meno, prva, druha, spolu, rozdiel: spolu - fondMesiaca }
  })

  const dnesText = datumDoLocalString(new Date())
  const vceraDatum = new Date()
  vceraDatum.setDate(vceraDatum.getDate() - 1)
  const vceraText = datumDoLocalString(vceraDatum)

  const zaznamyObdobia = zaznamy.filter(z => {
    if (filterDen) return z.datum === filterDen
    const den = Number(String(z.datum).split('-')[2])
    if (filterPolovica === 'prva') return den <= 15
    if (filterPolovica === 'druha') return den >= 16
    return true
  })

  const jePodozrivyZaznam = (z: any) => jePodozrivyCas(z.prichod, z.odchod, vypocitajHodiny(z.prichod, z.odchod))
  const pocetDuplikatov = zaznamyObdobia.filter(z => jePresnyDuplikat(z, z.id)).length
  const pocetPrekryvov = zaznamyObdobia.filter(z => maPrekryvajuciSaCas(z, z.id)).length
  const pocetPodozrivych = zaznamyObdobia.filter(jePodozrivyZaznam).length

  const zaznamyNaZobrazenie = zaznamyObdobia.filter(z => {
    if (filterProblem === 'duplikat') return jePresnyDuplikat(z, z.id)
    if (filterProblem === 'prekryv') return maPrekryvajuciSaCas(z, z.id)
    if (filterProblem === 'podozrivy') return jePodozrivyZaznam(z)
    return true
  })

  const nazovProblemFiltra =
    filterProblem === 'duplikat' ? 'Presné duplikáty' :
    filterProblem === 'prekryv' ? 'Prekrývajúce sa časy' :
    filterProblem === 'podozrivy' ? 'Podozrivé časy' :
    ''

  if (!jeOdomknute) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backgroundColor: '#fbfbfd', padding: '20px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ width: '100%', maxWidth: '320px' }}>
          <div style={{ ...cardStyle, textAlign: 'center' }}>
            <h2 style={{ color: '#1d1d1f', marginBottom: '20px', fontSize: '26px', fontWeight: '600', letterSpacing: '-0.003em', margin: '0 0 20px 0' }}>Dochádzka</h2>
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
    <div style={{ minHeight: '100vh', backgroundColor: '#fbfbfd', padding: '24px 28px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#1d1d1f' }}>
      <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto' }}>
        
        <AdminNav
          active="dashboard"
          onLogout={() => { adminStore.jeOdomknute = false; setJeOdomknute(false) }}
        />

        <div style={{
          ...cardStyle,
          marginBottom: '16px',
          border: nezapisaniVcera.length > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0',
          backgroundColor: nezapisaniVcera.length > 0 ? '#fff7f7' : '#f7fff9'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#1d1d1f', marginBottom: '4px' }}>
                Dochádzka za včerajší deň {datumKontroly ? `– ${formatujDatumSK(datumKontroly)}` : ''}
              </div>

              {nacitavaKontrola ? (
                <div style={{ fontSize: '12px', color: '#86868b' }}>Kontrolujem zápisy...</div>
              ) : chybaKontroly ? (
                <div style={{ fontSize: '12px', color: '#ff3b30' }}>⚠️ {chybaKontroly}</div>
              ) : nezapisaniVcera.length > 0 ? (
                <>
                  <div style={{ fontSize: '12px', color: '#b42318', marginBottom: '10px' }}>
                    ⚠️ Nemajú žiadny zápis: {nezapisaniVcera.length}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {nezapisaniVcera.map(meno => (
                      <span
                        key={meno}
                        style={{
                          display: 'inline-block',
                          padding: '5px 9px',
                          borderRadius: '14px',
                          backgroundColor: '#fee2e2',
                          color: '#991b1b',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}
                      >
                        {meno}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>
                  ✓ Všetci zamestnanci majú za tento deň aspoň jeden zápis.
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={nacitajNezapisanychVcera}
              disabled={nacitavaKontrola}
              style={{
                ...buttonSecondaryStyle,
                padding: '6px 12px',
                fontSize: '10px',
                opacity: nacitavaKontrola ? 0.6 : 1
              } as any}
            >
              Obnoviť
            </button>
          </div>
        </div>

        <div style={{ ...cardStyle, marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1d1d1f' }}>Vyžaduje kontrolu</div>
              <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>Problémy v aktuálne zobrazenej dochádzke.</div>
            </div>
            {filterProblem !== 'vsetko' && (
              <button
                type="button"
                onClick={() => setFilterProblem('vsetko')}
                style={{ ...buttonSecondaryStyle, padding: '6px 12px', fontSize: '10px' } as any}
              >
                Zrušiť filter
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: nezapisaniVcera.length > 0 ? '#fff7f7' : '#f7fff9', border: nezapisaniVcera.length > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '10px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '600' }}>Chýbajúce včera</div>
              <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px', color: nezapisaniVcera.length > 0 ? '#b42318' : '#15803d' }}>{nezapisaniVcera.length}</div>
              <div style={{ fontSize: '10px', color: '#86868b', marginTop: '3px' }}>{datumKontroly ? formatujDatumSK(datumKontroly) : 'predchádzajúci deň'}</div>
            </div>

            <button
              type="button"
              onClick={() => setFilterProblem(filterProblem === 'duplikat' ? 'vsetko' : 'duplikat')}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                textAlign: 'left',
                cursor: 'pointer',
                backgroundColor: filterProblem === 'duplikat' ? '#fef3c7' : '#ffffff',
                border: filterProblem === 'duplikat' ? '1px solid #f59e0b' : '1px solid #e5e5e5',
                color: '#1d1d1f'
              }}
            >
              <div style={{ fontSize: '10px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '600' }}>Presné duplikáty</div>
              <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px', color: pocetDuplikatov > 0 ? '#92400e' : '#1d1d1f' }}>{pocetDuplikatov}</div>
              <div style={{ fontSize: '10px', color: '#86868b', marginTop: '3px' }}>Klikni pre filtrovanie</div>
            </button>

            <button
              type="button"
              onClick={() => setFilterProblem(filterProblem === 'prekryv' ? 'vsetko' : 'prekryv')}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                textAlign: 'left',
                cursor: 'pointer',
                backgroundColor: filterProblem === 'prekryv' ? '#fff7ed' : '#ffffff',
                border: filterProblem === 'prekryv' ? '1px solid #fb923c' : '1px solid #e5e5e5',
                color: '#1d1d1f'
              }}
            >
              <div style={{ fontSize: '10px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '600' }}>Prekryvy času</div>
              <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px', color: pocetPrekryvov > 0 ? '#9a3412' : '#1d1d1f' }}>{pocetPrekryvov}</div>
              <div style={{ fontSize: '10px', color: '#86868b', marginTop: '3px' }}>Klikni pre filtrovanie</div>
            </button>

            <button
              type="button"
              onClick={() => setFilterProblem(filterProblem === 'podozrivy' ? 'vsetko' : 'podozrivy')}
              style={{
                padding: '12px 14px',
                borderRadius: '10px',
                textAlign: 'left',
                cursor: 'pointer',
                backgroundColor: filterProblem === 'podozrivy' ? '#fef2f2' : '#ffffff',
                border: filterProblem === 'podozrivy' ? '1px solid #f87171' : '1px solid #e5e5e5',
                color: '#1d1d1f'
              }}
            >
              <div style={{ fontSize: '10px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: '600' }}>Podozrivé časy</div>
              <div style={{ fontSize: '24px', fontWeight: '700', marginTop: '4px', color: pocetPodozrivych > 0 ? '#b42318' : '#1d1d1f' }}>{pocetPodozrivych}</div>
              <div style={{ fontSize: '10px', color: '#86868b', marginTop: '3px' }}>Klikni pre filtrovanie</div>
            </button>
          </div>

          {filterProblem !== 'vsetko' && (
            <div style={{ marginTop: '10px', fontSize: '11px', color: '#0071e3', fontWeight: '600' }}>
              Zobrazený filter: {nazovProblemFiltra} · {zaznamyNaZobrazenie.length} záznamov
            </div>
          )}
        </div>

        <div style={{ marginBottom: '16px', padding: '8px 12px', backgroundColor: '#f9fafb', borderLeft: '3px solid #0071e3', borderRadius: '6px', fontSize: '11px' }}>
          <span style={{ display: 'inline-block', marginRight: '12px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span> Chybné časy</span>
          <span style={{ display: 'inline-block', marginRight: '12px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#fef3c7', border: '1px solid #fde68a', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span> Presný duplikát</span>
          <span style={{ display: 'inline-block', marginRight: '12px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#fff7ed', border: '1px solid #fdba74', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span> Prekrývajúci sa čas</span>
          <span style={{ display: 'inline-block', marginRight: '12px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span> Viac pracovných úsekov v deň</span>
          <span style={{ display: 'inline-block', marginRight: '12px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: '#ffb347', border: '1px solid #ff9800', borderRadius: '2px', marginRight: '4px', verticalAlign: 'middle' }}></span> Víkend</span>
          <span style={{ display: 'inline-block' }}><span style={{ color: '#ff3b30', fontWeight: '600', marginRight: '4px' }}>⚠</span> Podozrivý čas</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div style={cardStyle}>
            <p style={{...labelStyle, margin: '0 0 4px 0'}}>Odpracované hodiny</p>
            <h3 style={{ margin: 0, fontSize: '24px', color: '#1d1d1f', fontWeight: '600' }}>{celkoveHodiny.toFixed(2)} h</h3>
          </div>
          <div style={cardStyle}>
            <p style={{...labelStyle, margin: '0 0 4px 0'}}>1. polovica · 1.–15.</p>
            <h3 style={{ margin: 0, fontSize: '24px', color: '#1d1d1f', fontWeight: '600' }}>{prvaPolovicaHodiny.toFixed(2)} h</h3>
            <div style={{ fontSize: '10px', color: '#86868b', marginTop: '5px' }}>Fond / 1 pracovník: {fondPrvaPolovica.toFixed(1)} h</div>
            {zobrazitRozdielOprotiFondu && (
              <div style={{ fontSize: '11px', marginTop: '6px', fontWeight: '600', color: rozdielPrvaPolovica >= 0 ? '#15803d' : '#b42318' }}>
                Rozdiel: {rozdielPrvaPolovica >= 0 ? '+' : ''}{rozdielPrvaPolovica.toFixed(1)} h
              </div>
            )}
          </div>
          <div style={cardStyle}>
            <p style={{...labelStyle, margin: '0 0 4px 0'}}>2. polovica · 16.–koniec</p>
            <h3 style={{ margin: 0, fontSize: '24px', color: '#1d1d1f', fontWeight: '600' }}>{druhaPolovicaHodiny.toFixed(2)} h</h3>
            <div style={{ fontSize: '10px', color: '#86868b', marginTop: '5px' }}>Fond / 1 pracovník: {fondDruhaPolovica.toFixed(1)} h</div>
            {zobrazitRozdielOprotiFondu && (
              <div style={{ fontSize: '11px', marginTop: '6px', fontWeight: '600', color: rozdielDruhaPolovica >= 0 ? '#15803d' : '#b42318' }}>
                Rozdiel: {rozdielDruhaPolovica >= 0 ? '+' : ''}{rozdielDruhaPolovica.toFixed(1)} h
              </div>
            )}
          </div>
          <div style={cardStyle}>
            <p style={{...labelStyle, margin: '0 0 4px 0'}}>Fond mesiaca / 1 pracovník</p>
            <h3 style={{ margin: 0, fontSize: '24px', color: '#1d1d1f', fontWeight: '600' }}>{fondMesiaca.toFixed(1)} h</h3>
            <div style={{ fontSize: '10px', color: '#86868b', marginTop: '5px' }}>Po–Pi 11,5 h · So 10,5 h · Ne 0 h</div>
            {zobrazitRozdielOprotiFondu && (
              <div style={{ fontSize: '11px', marginTop: '6px', fontWeight: '600', color: rozdielOprotiFondu >= 0 ? '#15803d' : '#b42318' }}>
                Rozdiel: {rozdielOprotiFondu >= 0 ? '+' : ''}{rozdielOprotiFondu.toFixed(1)} h
              </div>
            )}
          </div>
          <div style={cardStyle}>
            <p style={{...labelStyle, margin: '0 0 4px 0'}}>Záznamy</p>
            <h3 style={{ margin: 0, fontSize: '24px', color: '#1d1d1f', fontWeight: '600' }}>{pocetZaznamov}</h3>
          </div>
          <div style={cardStyle}>
            <p style={{...labelStyle, margin: '0 0 4px 0'}}>{filterMeno ? 'Pracovník' : 'Najaktívnejší'}</p>
            <h3 style={{ margin: 0, fontSize: '24px', color: '#1d1d1f', fontWeight: '600' }}>{filterMeno || najaktivnejsi}</h3>
          </div>
        </div>

        {zobrazitMesacnyPrehlad && mesacnyPrehlad.length > 0 && (
          <div style={{ ...cardStyle, marginBottom: '24px', padding: '0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '16px 18px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#1d1d1f' }}>Mesačný prehľad pracovníkov</div>
                <div style={{ fontSize: '11px', color: '#86868b', marginTop: '3px' }}>{nazovVybranehoMesiaca} · fond {fondMesiaca.toFixed(1)} h / pracovník</div>
              </div>
              {filterMeno && (
                <button type="button" onClick={() => setFilterMeno('')} style={{ ...buttonSecondaryStyle, padding: '6px 12px', fontSize: '10px' } as any}>
                  Zobraziť všetkých
                </button>
              )}
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '68vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '780px', fontSize: '12px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
                    <th style={{ padding: '10px 18px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Pracovník</th>
                    <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'right' }}>1.–15.</th>
                    <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'right' }}>16.–koniec</th>
                    <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'right' }}>Spolu</th>
                    <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'right' }}>Fond</th>
                    <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'right' }}>Rozdiel</th>
                    <th style={{ padding: '10px 18px', width: '80px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {mesacnyPrehlad.map(r => (
                    <tr key={r.meno} style={{ borderBottom: '1px solid #f5f5f7' }}>
                      <td style={{ padding: '11px 18px', fontWeight: '600', color: '#1d1d1f' }}>{r.meno}</td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', color: '#1d1d1f' }}>{r.prva.toFixed(2)} h</td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', color: '#1d1d1f' }}>{r.druha.toFixed(2)} h</td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', color: '#1d1d1f', fontWeight: '700' }}>{r.spolu.toFixed(2)} h</td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', color: '#86868b' }}>{fondMesiaca.toFixed(1)} h</td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: '700', color: r.rozdiel >= 0 ? '#15803d' : '#b42318' }}>
                        {r.rozdiel >= 0 ? '+' : ''}{r.rozdiel.toFixed(1)} h
                      </td>
                      <td style={{ padding: '11px 18px', textAlign: 'right' }}>
                        <button type="button" onClick={() => setFilterMeno(r.meno)} style={{ border: 'none', background: 'none', color: '#0071e3', cursor: 'pointer', fontSize: '11px', fontWeight: '600', padding: 0 }}>
                          Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <button 
            onClick={() => setUkazatFormular(!ukazatFormular)} 
            style={{ 
              ...(ukazatFormular ? buttonSecondaryStyle : buttonPrimaryStyle)
            } as any}
            onMouseEnter={(e) => {
              if (!ukazatFormular) (e.currentTarget as any).style.backgroundColor = '#0077ed'
              else (e.currentTarget as any).style.backgroundColor = '#efefef'
            }}
            onMouseLeave={(e) => {
              if (!ukazatFormular) (e.currentTarget as any).style.backgroundColor = '#0071e3'
              else (e.currentTarget as any).style.backgroundColor = '#f5f5f7'
            }}
          >
            {ukazatFormular ? '✕ Zavrieť' : '+ Zápis dochádzky'}
          </button>
        </div>

        {ukazatFormular && (
          <div style={{...cardStyle, marginBottom: '20px'}}>
            <datalist id="zoznam-zakaziek">{dostupneZakazky.map(zak => <option key={zak} value={zak} />)}</datalist>
            <div style={{ fontSize: '11px', color: '#86868b', marginBottom: '14px' }}>Každý blok predstavuje jeden pracovný úsek na jednej stavbe. Ak pracovník počas dňa prejde na inú stavbu alebo má iný pracovný čas, pridajte ďalší blok.</div>

            {noveZaznamy.map((z, i) => (
              <div key={i} style={{ marginBottom: i !== noveZaznamy.length - 1 ? '18px' : '0', paddingBottom: i !== noveZaznamy.length - 1 ? '18px' : '0', borderBottom: i !== noveZaznamy.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
                  <div style={{ minWidth: 0 }}>
                    <label style={labelStyle}>Dátum</label>
                    <input type="date" value={z.datum} onChange={e => zmenaNovehoZaznamu(i, 'datum', e.target.value)} style={{...inputStyle, fontSize: '12px'}} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={labelStyle}>Zákazka</label>
                    <input list="zoznam-zakaziek" placeholder="Vybrať..." value={z.zakazka} onChange={e => zmenaNovehoZaznamu(i, 'zakazka', e.target.value)} style={{...inputStyle, fontSize: '12px'}} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={labelStyle}>Príchod</label>
                    <input type="time" value={z.prichod} onChange={e => zmenaNovehoZaznamu(i, 'prichod', e.target.value)} style={{...inputStyle, fontSize: '12px'}} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <label style={labelStyle}>Odchod</label>
                    <input type="time" value={z.odchod} onChange={e => zmenaNovehoZaznamu(i, 'odchod', e.target.value)} style={{...inputStyle, fontSize: '12px'}} />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Zamestnanci</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', marginTop: '8px', marginBottom: '10px' }}>
                    {dostupneMena.map(meno => (
                      <button
                        key={meno} 
                        type="button" 
                        onClick={() => toggleMeno(i, meno)}
                        style={{
                          padding: '6px 12px',
                          border: z.mena.includes(meno) ? 'none' : '1px solid #d2d2d7',
                          cursor: 'pointer',
                          fontSize: '12px',
                          backgroundColor: z.mena.includes(meno) ? '#0071e3' : '#f5f5f7',
                          color: z.mena.includes(meno) ? '#fff' : '#1d1d1f',
                          borderRadius: '18px',
                          fontWeight: '500',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          if (!z.mena.includes(meno)) {
                            (e.currentTarget as any).style.backgroundColor = '#efefef'
                          } else {
                            (e.currentTarget as any).style.backgroundColor = '#0077ed'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!z.mena.includes(meno)) {
                            (e.currentTarget as any).style.backgroundColor = '#f5f5f7'
                          } else {
                            (e.currentTarget as any).style.backgroundColor = '#0071e3'
                          }
                        }}
                      >
                        {meno}
                      </button>
                    ))}
                    
                    <div style={{ display: 'flex', gap: '0', marginLeft: '10px' }}>
                      <input 
                        id={`noveMeno-${i}`} 
                        type="text" 
                        placeholder="Nové" 
                        style={{ 
                          ...inputStyle,
                          borderRadius: '8px 0 0 8px',
                          margin: '0',
                          padding: '6px 10px',
                          fontSize: '12px'
                        } as any}
                      />
                      <button 
                        type="button" 
                        onClick={() => {
                          const input = document.getElementById(`noveMeno-${i}`) as HTMLInputElement;
                          if(input && input.value.trim()) {
                            const val = input.value.trim()
                            if(!dostupneMena.includes(val)) setDostupneMena([...dostupneMena, val])
                            if(!z.mena.includes(val)) toggleMeno(i, val)
                            input.value = ''
                          }
                        }} 
                        style={{
                          ...buttonSecondaryStyle,
                          borderRadius: '0 8px 8px 0',
                          borderLeft: 'none',
                          margin: '0',
                          padding: '6px 10px'
                        } as any}
                        onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = '#efefef'}
                        onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = '#f5f5f7'}
                      >
                        Pridať
                      </button>
                    </div>
                  </div>
                </div>

                {noveZaznamy.length > 1 && (
                  <div style={{ marginTop: '10px' }}>
                    <button 
                      onClick={() => setNoveZaznamy(noveZaznamy.filter((_, index) => index !== i))} 
                      style={{ padding: '0', backgroundColor: 'transparent', color: '#ff3b30', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                      Odstrániť blok
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
              <button 
                onClick={pridatPrazdnyZaznam} 
                style={buttonSecondaryStyle as any}
                onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = '#efefef'}
                onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = '#f5f5f7'}
              >
                Pridať blok
              </button>
              <button 
                onClick={ulozitVsetkyNoveZaznamy} 
                style={buttonPrimaryStyle as any}
                onMouseEnter={(e) => (e.currentTarget as any).style.backgroundColor = '#0077ed'}
                onMouseLeave={(e) => (e.currentTarget as any).style.backgroundColor = '#0071e3'}
              >
                Uložiť
              </button>
            </div>
          </div>
        )}

        <div style={{ ...cardStyle, marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1d1d1f' }}>Rýchle zobrazenie tabuľky</div>
              <div style={{ fontSize: '10px', color: '#86868b', marginTop: '2px' }}>Jedným klikom vyber obdobie dochádzky.</div>
            </div>
            {filterDen && filterDen !== dnesText && filterDen !== vceraText && (
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#0071e3' }}>
                Vybraný deň: {formatujDatumSK(filterDen)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { key: 'cely', label: 'Celý mesiac', active: !filterDen && filterPolovica === 'cely' },
              { key: 'prva', label: '1.–15.', active: !filterDen && filterPolovica === 'prva' },
              { key: 'druha', label: '16.–koniec', active: !filterDen && filterPolovica === 'druha' },
              { key: 'dnes', label: 'Dnes', active: filterDen === dnesText },
              { key: 'vcera', label: 'Včera', active: filterDen === vceraText },
            ].map(item => (
              <button
                key={item.key}
                type="button"
                onClick={() => nastavRychlyFilter(item.key as 'cely' | 'prva' | 'druha' | 'dnes' | 'vcera')}
                style={{
                  ...(item.active ? buttonPrimaryStyle : buttonSecondaryStyle),
                  padding: '7px 14px',
                  fontSize: '10px'
                } as any}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{...cardStyle, marginBottom: '16px'}}>
          <label style={{...labelStyle, marginBottom: '6px'}}>Pracovník</label>
          <select
            value={filterMeno}
            onChange={(e) => setFilterMeno(e.target.value)}
            style={{
              ...inputStyle,
              fontSize: '13px',
              padding: '10px 12px',
              backgroundColor: '#ffffff',
              cursor: 'pointer'
            } as any}
          >
            <option value="">Všetci pracovníci</option>
            {dostupneMena.map((meno) => (
              <option key={meno} value={meno}>{meno}</option>
            ))}
          </select>
          <div style={{ fontSize: '11px', color: '#86868b', marginTop: '7px' }}>
            Vyber pracovníka zo zoznamu. Dashboard potom zobrazí iba jeho dochádzku a hodiny.
          </div>
        </div>

        <div style={{...cardStyle, marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
          <select 
            value={filterZakazka} 
            onChange={(e) => setFilterZakazka(e.target.value)} 
            style={{...inputStyle, flex: 1, minWidth: '110px'} as any}
          >
            <option value="">Všetky</option>
            {dostupneZakazky.map((z) => <option key={z} value={z}>{z}</option>)}
          </select>
          <select 
            value={filterMesiac} 
            disabled={!!filterDen} 
            onChange={(e) => {
              setFilterMesiac(e.target.value)
              setFilterProblem('vsetko')
            }} 
            style={{...inputStyle, flex: 1, minWidth: '110px', opacity: filterDen ? 0.5 : 1} as any}
          >
            {zoznamMesiacov.map((m) => <option key={m.hodnota} value={m.hodnota}>{m.nazov}</option>)}
          </select>
          <input 
            type="date" 
            value={filterDen} 
            onChange={(e) => {
              const hodnota = e.target.value
              setFilterDen(hodnota)
              setFilterPolovica('cely')
              setFilterProblem('vsetko')
              if (hodnota) setFilterMesiac(hodnota.slice(0, 7))
            }} 
            style={{...inputStyle, flex: 1, minWidth: '110px'} as any}
          />
        </div>

        <div style={cardStyle}>
          {filterMeno && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '0 8px 12px 8px', marginBottom: '4px', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '700', color: '#1d1d1f' }}>{filterMeno}</div>
                <div style={{ fontSize: '11px', color: '#86868b', marginTop: '2px' }}>Zobrazené sú iba záznamy tohto pracovníka.</div>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#0071e3' }}>{celkoveHodiny.toFixed(2)} h</div>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: '58px', zIndex: 5, backgroundColor: '#ffffff' }}>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid #d2d2d7' }}>
                  <th style={{ padding: '10px 8px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Dátum</th>
                  <th style={{ padding: '10px 8px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Osoba</th>
                  <th style={{ padding: '10px 8px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Zákazka</th>
                  <th style={{ padding: '10px 8px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Príchod</th>
                  <th style={{ padding: '10px 8px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600' }}>Odchod</th>
                  <th style={{ padding: '10px 8px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'right' }}>Hodiny</th>
                  <th style={{ padding: '10px 8px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '600', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {zaznamyNaZobrazenie.length === 0 ? ( 
                  <tr><td colSpan={7} style={{ padding: '20px 8px', color: '#d2d2d7', textAlign: 'center', fontSize: '12px' }}>{filterProblem === 'vsetko' ? 'Žiadne dáta.' : 'Žiadne záznamy pre vybraný kontrolný filter.'}</td></tr> 
                ) : (
                  zaznamyNaZobrazenie.map((z) => {
                    const hodinyRiadku = upravovaneId === z.id ? parseFloat(upravovaneHodiny) || 0 : vypocitajHodiny(z.prichod, z.odchod)
                    const jeVikend = new Date(z.datum).getDay() === 0 || new Date(z.datum).getDay() === 6
                    const jePodozrivy = upravovaneId !== z.id && jePodozrivyCas(z.prichod, z.odchod, hodinyRiadku)
                    const jeDuplicite = jePresnyDuplikat(z, z.id)
                    const jePrekryv = maPrekryvajuciSaCas(z, z.id)
                    const maViacUsekov = maViacPracovnychUsekovVDen(z, z.id)
                    const maCiasChybu = !arePlacesValidMinutes(z.prichod) || !arePlacesValidMinutes(z.odchod)
                    const farbaRiadku = maCiasChybu
                      ? '#fef2f2'
                      : jeDuplicite
                        ? '#fef3c7'
                        : jePrekryv
                          ? '#fff7ed'
                          : maViacUsekov
                            ? '#eff6ff'
                            : jeVikend
                              ? '#f5f5f7'
                              : 'transparent'

                    return (
                      <tr 
                        key={z.id} 
                        style={{ 
                          borderBottom: '1px solid #f5f5f7',
                          backgroundColor: farbaRiadku,
                          transition: 'filter 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.98)'}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                      >
                        <td style={{ padding: '10px 8px', color: '#1d1d1f', fontWeight: '500' }}>
                          {z.datum}
                          {jeVikend && <span style={{ fontSize: '8px', backgroundColor: '#ffb347', color: '#6f2c00', padding: '1px 3px', marginLeft: '4px', letterSpacing: '0.3px', textTransform: 'uppercase', borderRadius: '2px', fontWeight: '600' }}>W</span>}
                        </td>
                        <td style={{ padding: '10px 8px', fontWeight: '600', color: '#1d1d1f' }}>
                          {z.meno}
                          {jeDuplicite && <span style={{ fontSize: '8px', backgroundColor: '#fde68a', color: '#92400e', padding: '2px 4px', marginLeft: '4px', borderRadius: '2px', fontWeight: '600' }}>DUP</span>}
                          {jePrekryv && <span style={{ fontSize: '8px', backgroundColor: '#fed7aa', color: '#9a3412', padding: '2px 4px', marginLeft: '4px', borderRadius: '2px', fontWeight: '600' }}>PREKRYV</span>}
                          {maViacUsekov && !jeDuplicite && !jePrekryv && <span style={{ fontSize: '8px', backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '2px 4px', marginLeft: '4px', borderRadius: '2px', fontWeight: '600' }}>VIAC</span>}
                        </td>
                        <td style={{ padding: '10px 8px', color: '#666', fontSize: '11px' }}>{z.zakazka}</td>
                        
                        <td style={{ padding: '10px 8px', color: maCiasChybu ? '#ff3b30' : '#1d1d1f', fontWeight: maCiasChybu ? '600' : '500' }}>
                          {upravovaneId === z.id ? (
                            <input 
                              type="time" 
                              value={upravovanePrichod} 
                              onChange={(e) => handleTimeChange(false, e.target.value)}
                              style={{...inputStyle, width: '80px', fontSize: '11px', padding: '4px 6px', borderColor: chybaUpravaHodiny ? '#ff3b30' : '#d2d2d7'}}
                            />
                          ) : (
                            z.prichod
                          )}
                        </td>

                        <td style={{ padding: '10px 8px', color: maCiasChybu ? '#ff3b30' : '#1d1d1f', fontWeight: maCiasChybu ? '600' : '500' }}>
                          {upravovaneId === z.id ? (
                            <input 
                              type="time" 
                              value={upravovaneOdchod} 
                              onChange={(e) => handleTimeChange(true, e.target.value)}
                              style={{...inputStyle, width: '80px', fontSize: '11px', padding: '4px 6px', borderColor: chybaUpravaHodiny ? '#ff3b30' : '#d2d2d7'}}
                            />
                          ) : (
                            z.odchod
                          )}
                        </td>

                        <td style={{ padding: '10px 8px', color: jePodozrivy ? '#ff3b30' : '#1d1d1f', fontWeight: jePodozrivy ? '700' : '600', textAlign: 'right' }} title={jePodozrivy ? "Podozrivý čas" : ""}>
                          {upravovaneId === z.id ? (
                            <input 
                              type="number" 
                              value={upravovaneHodiny} 
                              readOnly
                              title="Hodiny sa počítajú automaticky z príchodu a odchodu"
                              style={{...inputStyle, width: '60px', fontSize: '11px', padding: '4px 6px', textAlign: 'right', opacity: 0.75}}
                            />
                          ) : (
                            <>
                              {hodinyRiadku.toFixed(2)} {jePodozrivy && <span style={{ fontSize: '9px', marginLeft: '3px', textTransform: 'uppercase' }}>⚠</span>}
                            </>
                          )}
                        </td>

                        <td style={{ padding: '10px 8px', textAlign: 'right' }}>
                          {upravovaneId === z.id ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => zrusitUpravu()}
                                style={{ color: '#86868b', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '500', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}
                              >
                                Zrušiť
                              </button>
                              <button 
                                onClick={() => ulozitUpravu(z.id)}
                                style={{ color: '#10b981', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '600', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#059669'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#10b981'}
                              >
                                Uložiť
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => zacatUpravu(z.id, z.prichod, z.odchod)}
                                style={{ color: '#0071e3', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '500', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#0077ed'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#0071e3'}
                              >
                                Upraviť
                              </button>
                              <button 
                                onClick={() => vymazat(z.id)}
                                style={{ color: '#d2d2d7', background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: '500', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ff3b30'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#d2d2d7'}
                              >
                                Zmazať
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          {chybaUpravaHodiny && (
            <div style={{ padding: '12px 8px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '6px', color: '#ff3b30', fontSize: '11px', marginTop: '12px', fontWeight: '500' }}>
              ⚠️ {chybaUpravaHodiny}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}