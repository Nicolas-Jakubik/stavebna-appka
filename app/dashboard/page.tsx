'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/adminSupabase'
import { vypocitajFondObdobia } from '../../lib/workFund'
import { hodinyZaznamuZMapy, vypocitajHodinyJednehoUseku as vypocitajHodiny, vytvorMapuCistychHodin } from '../../lib/workHours'
import AdminSidebar from '../../components/AdminSidebar'

export default function DashboardPage() {
  const [zaznamy, setZaznamy] = useState<any[]>([])
  const [kontrolneZaznamy, setKontrolneZaznamy] = useState<any[]>([])
  const [nepritomnosti, setNepritomnosti] = useState<any[]>([])
  const [filterMesiac, setFilterMesiac] = useState(new Date().toISOString().slice(0, 7))
  const [filterDen, setFilterDen] = useState('')
  const [filterZakazka, setFilterZakazka] = useState('')
  const [filterMeno, setFilterMeno] = useState('')
  const [filterPolovica, setFilterPolovica] = useState<'cely' | 'prva' | 'druha'>('cely')
  const [filterDennehoPrehladu, setFilterDennehoPrehladu] = useState<'cely' | 'prva' | 'druha'>('cely')
  const [filterProblem, setFilterProblem] = useState('vsetko')
  const [triedenie, setTriedenie] = useState<'datum' | 'meno' | 'zakazka' | 'hodiny'>('datum')
  const [smerTriedenia, setSmerTriedenia] = useState<'asc' | 'desc'>('desc')
  
  const [dostupneZakazky, setDostupneZakazky] = useState<string[]>([])
  const [dostupneMena, setDostupneMena] = useState<string[]>([])

  // Kontrola chýbajúcej dochádzky za predchádzajúci kalendárny deň
  const [nezapisaniVcera, setNezapisaniVcera] = useState<string[]>([])
  const [datumKontroly, setDatumKontroly] = useState('')
  const [chybaKontroly, setChybaKontroly] = useState('')
  const [nacitavaKontrola, setNacitavaKontrola] = useState(false)

  const [ukazatFormular, setUkazatFormular] = useState(false)
  const [ukazatNepritomnost, setUkazatNepritomnost] = useState(false)
  const [ukladaNepritomnost, setUkladaNepritomnost] = useState(false)
  const [chybaNepritomnosti, setChybaNepritomnosti] = useState('')
  const [novaNepritomnost, setNovaNepritomnost] = useState({
    datum: new Date().toISOString().split('T')[0],
    dovod: '',
    mena: [] as string[]
  })
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

  const nazvyMesiacov = ['Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún', 'Júl', 'August', 'September', 'Október', 'November', 'December']
  const aktualnyRok = new Date().getFullYear()
  const zoznamMesiacov = [aktualnyRok - 1, aktualnyRok, aktualnyRok + 1].flatMap(rok =>
    nazvyMesiacov.map((nazov, index) => ({
      hodnota: `${rok}-${String(index + 1).padStart(2, '0')}`,
      nazov: `${nazov} ${rok}`
    }))
  )

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

    const [zamestnanciResult, dochadzkaResult, nepritomnostiResult] = await Promise.all([
      supabase.from('zamestnanci').select('meno').order('meno', { ascending: true }),
      supabase.from('dochadzka').select('meno').eq('datum', datum),
      supabase.from('nepritomnosti').select('meno').eq('datum', datum)
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
    const ospravedlneni = new Set(
      (nepritomnostiResult.error ? [] : (nepritomnostiResult.data || []))
        .map(z => z.meno)
        .filter(Boolean)
    )

    setNezapisaniVcera(vsetci.filter(meno => !zapisani.has(meno) && !ospravedlneni.has(meno)))
    setNacitavaKontrola(false)
  }

  async function nacitajNepritomnosti() {
    const { data, error } = await supabase
      .from('nepritomnosti')
      .select('id, datum, meno, dovod, created_at')
      .order('datum', { ascending: false })

    if (error) {
      console.error('Chyba načítania neprítomností:', error.message)
      setNepritomnosti([])
      return
    }

    setNepritomnosti(data || [])
  }

  async function ulozitNepritomnost() {
    setChybaNepritomnosti('')

    const datum = novaNepritomnost.datum
    const dovod = novaNepritomnost.dovod.trim()
    const mena = novaNepritomnost.mena

    if (!datum || !dovod || mena.length === 0) {
      setChybaNepritomnosti('Vyber dátum, zadaj dôvod a označ aspoň jedného pracovníka.')
      return
    }

    const majuDochadzku = mena.filter(meno =>
      kontrolneZaznamy.some(z => z.datum === datum && z.meno === meno)
    )

    if (majuDochadzku.length > 0) {
      setChybaNepritomnosti(`Títo pracovníci už majú v daný deň dochádzku: ${majuDochadzku.join(', ')}.`)
      return
    }

    const uzEvidovani = mena.filter(meno =>
      nepritomnosti.some(n => n.datum === datum && n.meno === meno)
    )

    if (uzEvidovani.length > 0) {
      setChybaNepritomnosti(`Neprítomnosť už je evidovaná pre: ${uzEvidovani.join(', ')}.`)
      return
    }

    setUkladaNepritomnost(true)
    const dataNaVlozenie = mena.map(meno => ({ datum, meno, dovod }))
    const { error } = await supabase.from('nepritomnosti').insert(dataNaVlozenie)

    if (error) {
      setChybaNepritomnosti(
        error.code === '42P01'
          ? 'Tabuľka neprítomností ešte nie je pripravená v Supabase.'
          : 'Neprítomnosť sa nepodarilo uložiť: ' + error.message
      )
      setUkladaNepritomnost(false)
      return
    }

    setNovaNepritomnost({ datum: datumDoLocalString(new Date()), dovod: '', mena: [] })
    setUkazatNepritomnost(false)
    setUkladaNepritomnost(false)
    await Promise.all([nacitajNepritomnosti(), nacitajNezapisanychVcera()])
  }

  async function vymazatNepritomnost(id: string) {
    if (!confirm('Naozaj vymazať túto neprítomnosť?')) return

    const { error } = await supabase.from('nepritomnosti').delete().eq('id', id)
    if (error) {
      alert('Neprítomnosť sa nepodarilo vymazať: ' + error.message)
      return
    }

    await Promise.all([nacitajNepritomnosti(), nacitajNezapisanychVcera()])
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

  useEffect(() => { nacitajFiltre(); nacitajKontrolneZaznamy(); nacitajNepritomnosti() }, [])
  useEffect(() => { nacitajNezapisanychVcera() }, [])
  useEffect(() => { nacitaj() }, [filterMesiac, filterDen, filterZakazka, filterMeno])

  const mapaCistychHodin = vytvorMapuCistychHodin(kontrolneZaznamy)
  const hodinyZaznamu = (z: any) => hodinyZaznamuZMapy(z, mapaCistychHodin)

  const celkoveHodiny = zaznamy.reduce((sucet, z) => sucet + hodinyZaznamu(z), 0)
  const pocetZaznamov = zaznamy.length
  const prvaPolovicaHodiny = zaznamy
    .filter(z => Number(String(z.datum).split('-')[2]) <= 15)
    .reduce((sucet, z) => sucet + hodinyZaznamu(z), 0)
  const druhaPolovicaHodiny = zaznamy
    .filter(z => Number(String(z.datum).split('-')[2]) >= 16)
    .reduce((sucet, z) => sucet + hodinyZaznamu(z), 0)
  const fondPrvaPolovica = vypocitajFondObdobia(filterMesiac, 1, 15)
  const fondDruhaPolovica = vypocitajFondObdobia(filterMesiac, 16)
  const fondMesiaca = fondPrvaPolovica + fondDruhaPolovica
  const zobrazitRozdielOprotiFondu = !!filterMeno && !filterDen && !filterZakazka
  const rozdielOprotiFondu = celkoveHodiny - fondMesiaca
  const rozdielPrvaPolovica = prvaPolovicaHodiny - fondPrvaPolovica
  const rozdielDruhaPolovica = druhaPolovicaHodiny - fondDruhaPolovica
  
  const zamestnanciHodiny: Record<string, number> = {}
  zaznamy.forEach(z => { zamestnanciHodiny[z.meno] = (zamestnanciHodiny[z.meno] || 0) + hodinyZaznamu(z) })
  let najaktivnejsi = '-'; let maxHod = 0
  Object.entries(zamestnanciHodiny).forEach(([meno, h]) => { if (h > maxHod) { maxHod = h; najaktivnejsi = meno } })

  const nazovVybranehoMesiaca = zoznamMesiacov.find(m => m.hodnota === filterMesiac)?.nazov || filterMesiac
  const zobrazitMesacnyPrehlad = !filterDen && !filterZakazka
  const menaPrehladu = filterMeno ? [filterMeno] : dostupneMena
  const mesacnyPrehlad = menaPrehladu.map(meno => {
    const zaznamyPracovnika = zaznamy.filter(z => z.meno === meno)
    const prva = zaznamyPracovnika
      .filter(z => Number(String(z.datum).split('-')[2]) <= 15)
      .reduce((sucet, z) => sucet + hodinyZaznamu(z), 0)
    const druha = zaznamyPracovnika
      .filter(z => Number(String(z.datum).split('-')[2]) >= 16)
      .reduce((sucet, z) => sucet + vypocitajHodiny(z.prichod, z.odchod), 0)
    const spolu = prva + druha
    return { meno, prva, druha, spolu, rozdiel: spolu - fondMesiaca }
  })

  const [rokPrehladuText, mesiacPrehladuText] = filterMesiac.split('-')
  const rokPrehladu = Number(rokPrehladuText)
  const mesiacPrehladu = Number(mesiacPrehladuText)
  const pocetDniPrehladu = new Date(Date.UTC(rokPrehladu, mesiacPrehladu, 0)).getUTCDate()
  const nazvyDni = ['Ne', 'Po', 'Ut', 'St', 'Št', 'Pi', 'So']

  const dennyPrehladPracovnikov = Array.from({ length: pocetDniPrehladu }, (_, index) => {
    const den = index + 1
    const datum = `${filterMesiac}-${String(den).padStart(2, '0')}`
    const mena = Array.from(
      new Set(
        kontrolneZaznamy
          .filter(z => z.datum === datum && z.meno)
          .map(z => z.meno)
      )
    ).sort((a, b) => String(a).localeCompare(String(b), 'sk')) as string[]

    const nepritomnostiDna = nepritomnosti
      .filter(n => n.datum === datum)
      .sort((a, b) => String(a.meno).localeCompare(String(b.meno), 'sk'))

    const menaNepritomnych = new Set(
      nepritomnostiDna.map(n => n.meno).filter(Boolean)
    )
    const menaVPraci = new Set(mena)
    const jeBuduciDen = datum > datumDoLocalString(new Date())
    const nezapisani = jeBuduciDen
      ? []
      : dostupneMena
          .filter(meno => !menaVPraci.has(meno) && !menaNepritomnych.has(meno))
          .sort((a, b) => String(a).localeCompare(String(b), 'sk'))

    const skupinyMapa = new Map<string, any[]>()
    nepritomnostiDna.forEach(n => {
      const aktualne = skupinyMapa.get(n.dovod) || []
      aktualne.push(n)
      skupinyMapa.set(n.dovod, aktualne)
    })
    const skupinyNepritomnosti = Array.from(skupinyMapa.entries()).map(([dovod, polozky]) => ({
      dovod,
      polozky
    }))

    const denVTyzdni = new Date(Date.UTC(rokPrehladu, mesiacPrehladu - 1, den)).getUTCDay()
    return {
      datum,
      den,
      denVTyzdni: nazvyDni[denVTyzdni],
      pocet: mena.length,
      mena,
      pocetNepritomnych: menaNepritomnych.size,
      skupinyNepritomnosti,
      pocetNezapisanych: nezapisani.length,
      nezapisani
    }
  })

  const dennyPrehladNaZobrazenie = dennyPrehladPracovnikov.filter(den => {
    if (filterDennehoPrehladu === 'prva') return den.den <= 15
    if (filterDennehoPrehladu === 'druha') return den.den >= 16
    return true
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

  const dnesneZaznamy = kontrolneZaznamy.filter(z => z.datum === dnesText)
  const pocetPracovnikovDnes = new Set(dnesneZaznamy.map(z => z.meno).filter(Boolean)).size
  const pocetNepritomnychDnes = new Set(
    nepritomnosti.filter(n => n.datum === dnesText).map(n => n.meno).filter(Boolean)
  ).size
  const pocetProblemovDnes = dnesneZaznamy.filter(z =>
    jePresnyDuplikat(z, z.id) ||
    maPrekryvajuciSaCas(z, z.id) ||
    jePodozrivyZaznam(z)
  ).length

  const pocetDuplikatov = zaznamyObdobia.filter(z => jePresnyDuplikat(z, z.id)).length
  const pocetPrekryvov = zaznamyObdobia.filter(z => maPrekryvajuciSaCas(z, z.id)).length
  const pocetPodozrivych = zaznamyObdobia.filter(jePodozrivyZaznam).length

  const zaznamyNaZobrazenie = zaznamyObdobia.filter(z => {
    if (filterProblem === 'duplikat') return jePresnyDuplikat(z, z.id)
    if (filterProblem === 'prekryv') return maPrekryvajuciSaCas(z, z.id)
    if (filterProblem === 'podozrivy') return jePodozrivyZaznam(z)
    return true
  })

  function zmenTriedenie(noveTriedenie: 'datum' | 'meno' | 'zakazka' | 'hodiny') {
    if (triedenie === noveTriedenie) {
      setSmerTriedenia(smerTriedenia === 'asc' ? 'desc' : 'asc')
      return
    }

    setTriedenie(noveTriedenie)
    setSmerTriedenia(noveTriedenie === 'datum' ? 'desc' : 'asc')
  }

  const zoradeneZaznamy = [...zaznamyNaZobrazenie].sort((a, b) => {
    let hodnotaA: string | number = ''
    let hodnotaB: string | number = ''

    if (triedenie === 'hodiny') {
      hodnotaA = hodinyZaznamu(a)
      hodnotaB = hodinyZaznamu(b)
    } else {
      hodnotaA = String(a[triedenie] || '').toLocaleLowerCase('sk')
      hodnotaB = String(b[triedenie] || '').toLocaleLowerCase('sk')
    }

    if (hodnotaA < hodnotaB) return smerTriedenia === 'asc' ? -1 : 1
    if (hodnotaA > hodnotaB) return smerTriedenia === 'asc' ? 1 : -1
    return 0
  })

  const indikatorTriedenia = (stlpec: 'datum' | 'meno' | 'zakazka' | 'hodiny') =>
    triedenie === stlpec ? (smerTriedenia === 'asc' ? ' ↑' : ' ↓') : ''

  const nazovProblemFiltra =
    filterProblem === 'duplikat' ? 'Presné duplikáty' :
    filterProblem === 'prekryv' ? 'Prekrývajúce sa časy' :
    filterProblem === 'podozrivy' ? 'Podozrivé časy' :
    ''

  return (
    <div className="dashboard-shell" style={{
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
          .dashboard-shell {
            padding:
              calc(64px + env(safe-area-inset-top))
              max(12px, env(safe-area-inset-right))
              calc(20px + env(safe-area-inset-bottom))
              max(12px, env(safe-area-inset-left)) !important;
            display: block !important;
          }

          .dashboard-content {
            max-width: 100% !important;
          }

          .dashboard-today-grid,
          .dashboard-filter-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          .dashboard-form-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .dashboard-month-grid {
            grid-template-columns: 1fr 1fr !important;
          }

          .dashboard-month-grid > div {
            border-right: none !important;
            border-bottom: 1px solid #eeeeef;
          }

          .dashboard-mobile-full-button {
            width: 100% !important;
            min-height: 44px;
          }

          .dashboard-mobile-actions {
            width: 100%;
          }

          .dashboard-mobile-actions > button {
            flex: 1 1 140px;
            min-height: 44px;
          }

          .dashboard-scroll-table {
            margin-left: -16px;
            margin-right: -16px;
            padding-left: 16px;
            padding-right: 16px;
          }
        }

        @media (max-width: 760px) {
          .dashboard-today-grid,
          .dashboard-filter-grid,
          .dashboard-form-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 600px) {
          .attendance-table-wrap {
            margin: 0 !important;
            padding: 10px 12px 14px !important;
            max-height: none !important;
            overflow: visible !important;
            background: #f5f5f7;
          }

          .attendance-table {
            display: block;
            min-width: 0 !important;
            width: 100% !important;
          }

          .attendance-table thead {
            display: none;
          }

          .attendance-table tbody {
            display: grid;
            gap: 10px;
          }

          .attendance-table tr.attendance-row {
            display: block;
            border: 1px solid #e5e5e7 !important;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
          }

          .attendance-table td.attendance-cell {
            display: grid;
            grid-template-columns: 88px minmax(0, 1fr);
            gap: 10px;
            align-items: center;
            min-height: 42px;
            padding: 8px 12px !important;
            border-bottom: 1px solid rgba(0,0,0,0.055);
            text-align: left !important;
          }

          .attendance-table td.attendance-cell:last-child {
            border-bottom: none;
          }

          .attendance-table td.attendance-cell::before {
            content: attr(data-label);
            color: #86868b;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.45px;
          }

          .attendance-table td.attendance-actions > div {
            justify-content: flex-start !important;
            flex-wrap: wrap;
          }

          .attendance-table td.attendance-actions button {
            min-height: 38px;
            padding: 8px 12px !important;
          }

          .attendance-table input[type="time"],
          .attendance-table input[type="number"] {
            min-height: 38px;
            width: 100% !important;
            max-width: 150px;
          }

          .attendance-empty-row {
            display: table-row !important;
            box-shadow: none !important;
            border: none !important;
          }

          .attendance-empty-cell {
            display: table-cell !important;
            border: none !important;
          }

          .attendance-empty-cell::before {
            display: none !important;
          }
        }

        @media (max-width: 480px) {
          .dashboard-month-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <AdminSidebar active="dashboard" />

      <div className="dashboard-content" style={{ width: '100%', flex: 1, minWidth: 0, maxWidth: '1540px', margin: '0 auto' }}>
        <div style={{ marginBottom: '18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#86868b', fontWeight: '600', marginBottom: '4px' }}>FIREMNÝ PREHĽAD</div>
              <h1 style={{ margin: 0, fontSize: '28px', lineHeight: '1.1', letterSpacing: '-0.035em', color: '#1d1d1f', fontWeight: '700' }}>
                Dnešný stav
              </h1>
            </div>
            <div style={{ fontSize: '12px', color: '#86868b', fontWeight: '600' }}>
              {formatujDatumSK(dnesText)}
            </div>
          </div>

          <div className="dashboard-today-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: '12px' }}>
            <div style={{ ...cardStyle, padding: '18px 20px', boxShadow: '0 6px 22px rgba(0,0,0,0.045)' }}>
              <div style={{ fontSize: '10px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>V práci dnes</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '7px' }}>
                <span style={{ fontSize: '32px', lineHeight: 1, fontWeight: '750', color: '#1d1d1f', letterSpacing: '-0.04em' }}>{pocetPracovnikovDnes}</span>
                <span style={{ fontSize: '11px', color: '#86868b' }}>pracovníkov</span>
              </div>
              <div style={{ fontSize: '10px', color: '#15803d', marginTop: '8px', fontWeight: '600' }}>Unikátni pracovníci s dnešným zápisom</div>
            </div>

            <div style={{ ...cardStyle, padding: '18px 20px', boxShadow: '0 6px 22px rgba(0,0,0,0.045)' }}>
              <div style={{ fontSize: '10px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Neprítomní dnes</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '7px' }}>
                <span style={{ fontSize: '32px', lineHeight: 1, fontWeight: '750', color: '#7c3aed', letterSpacing: '-0.04em' }}>{pocetNepritomnychDnes}</span>
                <span style={{ fontSize: '11px', color: '#86868b' }}>pracovníkov</span>
              </div>
              <div style={{ fontSize: '10px', color: '#7c3aed', marginTop: '8px', fontWeight: '600' }}>Evidovaná neprítomnosť na dnešný deň</div>
            </div>

            <div style={{
              ...cardStyle,
              padding: '18px 20px',
              boxShadow: '0 6px 22px rgba(0,0,0,0.045)',
              border: pocetProblemovDnes > 0 ? '1px solid #fecaca' : '1px solid rgba(0,0,0,0.08)',
              backgroundColor: pocetProblemovDnes > 0 ? '#fffafa' : '#ffffff'
            }}>
              <div style={{ fontSize: '10px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Problémy dnes</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', marginTop: '7px' }}>
                <span style={{ fontSize: '32px', lineHeight: 1, fontWeight: '750', color: pocetProblemovDnes > 0 ? '#b42318' : '#1d1d1f', letterSpacing: '-0.04em' }}>{pocetProblemovDnes}</span>
                <span style={{ fontSize: '11px', color: '#86868b' }}>záznamov</span>
              </div>
              <div style={{ fontSize: '10px', color: pocetProblemovDnes > 0 ? '#b42318' : '#15803d', marginTop: '8px', fontWeight: '600' }}>
                {pocetProblemovDnes > 0 ? 'Duplikáty, prekryvy alebo podozrivé časy' : 'Dnešné zápisy sú bez zisteného problému'}
              </div>
            </div>
          </div>
        </div>

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

        <div style={{
          ...cardStyle,
          marginBottom: '16px',
          padding: '14px 16px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.035)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '145px', marginRight: 'auto' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1d1d1f' }}>Vyžaduje kontrolu</div>
              <div style={{ fontSize: '10px', color: '#86868b', marginTop: '2px' }}>Kliknutím zobrazíš problémové zápisy.</div>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 10px',
              borderRadius: '10px',
              backgroundColor: nezapisaniVcera.length > 0 ? '#fff7f7' : '#f7fff9',
              border: nezapisaniVcera.length > 0 ? '1px solid #fecaca' : '1px solid #bbf7d0'
            }}>
              <span style={{ fontSize: '19px', fontWeight: '750', color: nezapisaniVcera.length > 0 ? '#b42318' : '#15803d', lineHeight: 1 }}>{nezapisaniVcera.length}</span>
              <span style={{ fontSize: '10px', fontWeight: '650', color: '#6e6e73' }}>Chýbajúce včera</span>
            </div>

            <button
              type="button"
              onClick={() => setFilterProblem(filterProblem === 'duplikat' ? 'vsetko' : 'duplikat')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 10px',
                borderRadius: '10px',
                cursor: 'pointer',
                backgroundColor: filterProblem === 'duplikat' ? '#fef3c7' : '#fafafa',
                border: filterProblem === 'duplikat' ? '1px solid #f59e0b' : '1px solid #e8e8ed',
                color: '#1d1d1f'
              }}
            >
              <span style={{ fontSize: '19px', fontWeight: '750', color: pocetDuplikatov > 0 ? '#92400e' : '#86868b', lineHeight: 1 }}>{pocetDuplikatov}</span>
              <span style={{ fontSize: '10px', fontWeight: '650', color: '#6e6e73' }}>Duplikáty</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterProblem(filterProblem === 'prekryv' ? 'vsetko' : 'prekryv')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 10px',
                borderRadius: '10px',
                cursor: 'pointer',
                backgroundColor: filterProblem === 'prekryv' ? '#fff7ed' : '#fafafa',
                border: filterProblem === 'prekryv' ? '1px solid #fb923c' : '1px solid #e8e8ed',
                color: '#1d1d1f'
              }}
            >
              <span style={{ fontSize: '19px', fontWeight: '750', color: pocetPrekryvov > 0 ? '#9a3412' : '#86868b', lineHeight: 1 }}>{pocetPrekryvov}</span>
              <span style={{ fontSize: '10px', fontWeight: '650', color: '#6e6e73' }}>Prekryvy</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterProblem(filterProblem === 'podozrivy' ? 'vsetko' : 'podozrivy')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 10px',
                borderRadius: '10px',
                cursor: 'pointer',
                backgroundColor: filterProblem === 'podozrivy' ? '#fef2f2' : '#fafafa',
                border: filterProblem === 'podozrivy' ? '1px solid #f87171' : '1px solid #e8e8ed',
                color: '#1d1d1f'
              }}
            >
              <span style={{ fontSize: '19px', fontWeight: '750', color: pocetPodozrivych > 0 ? '#b42318' : '#86868b', lineHeight: 1 }}>{pocetPodozrivych}</span>
              <span style={{ fontSize: '10px', fontWeight: '650', color: '#6e6e73' }}>Podozrivé</span>
            </button>

            {filterProblem !== 'vsetko' && (
              <button
                type="button"
                onClick={() => setFilterProblem('vsetko')}
                style={{ ...buttonSecondaryStyle, padding: '7px 11px', fontSize: '9px' } as any}
              >
                Zrušiť filter
              </button>
            )}
          </div>

          {filterProblem !== 'vsetko' && (
            <div style={{ marginTop: '10px', paddingTop: '9px', borderTop: '1px solid #f0f0f0', fontSize: '10px', color: '#0071e3', fontWeight: '650' }}>
              {nazovProblemFiltra} · {zaznamyNaZobrazenie.length} záznamov
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

        <div style={{ ...cardStyle, marginBottom: '24px', padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #eeeeef', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '750', color: '#1d1d1f' }}>Mesačný výkon</div>
              <div style={{ fontSize: '10px', color: '#86868b', marginTop: '3px' }}>
                {nazovVybranehoMesiaca}{filterMeno ? ` · ${filterMeno}` : ' · všetci pracovníci'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '10px', color: '#86868b' }}>
                Záznamy <strong style={{ color: '#1d1d1f' }}>{pocetZaznamov}</strong>
              </div>
              <div style={{ fontSize: '10px', color: '#86868b' }}>
                {filterMeno ? 'Pracovník' : 'Najaktívnejší'} <strong style={{ color: '#1d1d1f' }}>{filterMeno || najaktivnejsi}</strong>
              </div>
            </div>
          </div>

          <div className="dashboard-month-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))' }}>
            <div style={{ padding: '18px 20px', borderRight: '1px solid #eeeeef' }}>
              <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Odpracované hodiny</div>
              <div style={{ fontSize: '28px', lineHeight: 1.05, color: '#0071e3', fontWeight: '750', letterSpacing: '-0.035em', marginTop: '7px' }}>
                {celkoveHodiny.toFixed(2)} h
              </div>
              {zobrazitRozdielOprotiFondu && (
                <div style={{ fontSize: '10px', marginTop: '7px', fontWeight: '650', color: rozdielOprotiFondu >= 0 ? '#15803d' : '#b42318' }}>
                  {rozdielOprotiFondu >= 0 ? '+' : ''}{rozdielOprotiFondu.toFixed(1)} h oproti fondu
                </div>
              )}
            </div>

            <div style={{ padding: '18px 20px', borderRight: '1px solid #eeeeef' }}>
              <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>1.–15.</div>
              <div style={{ fontSize: '24px', lineHeight: 1.05, color: '#1d1d1f', fontWeight: '700', letterSpacing: '-0.025em', marginTop: '7px' }}>
                {prvaPolovicaHodiny.toFixed(2)} h
              </div>
              <div style={{ fontSize: '9px', color: '#86868b', marginTop: '7px' }}>Fond / pracovník {fondPrvaPolovica.toFixed(1)} h</div>
              {zobrazitRozdielOprotiFondu && (
                <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: '650', color: rozdielPrvaPolovica >= 0 ? '#15803d' : '#b42318' }}>
                  {rozdielPrvaPolovica >= 0 ? '+' : ''}{rozdielPrvaPolovica.toFixed(1)} h
                </div>
              )}
            </div>

            <div style={{ padding: '18px 20px', borderRight: '1px solid #eeeeef' }}>
              <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>16.–koniec</div>
              <div style={{ fontSize: '24px', lineHeight: 1.05, color: '#1d1d1f', fontWeight: '700', letterSpacing: '-0.025em', marginTop: '7px' }}>
                {druhaPolovicaHodiny.toFixed(2)} h
              </div>
              <div style={{ fontSize: '9px', color: '#86868b', marginTop: '7px' }}>Fond / pracovník {fondDruhaPolovica.toFixed(1)} h</div>
              {zobrazitRozdielOprotiFondu && (
                <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: '650', color: rozdielDruhaPolovica >= 0 ? '#15803d' : '#b42318' }}>
                  {rozdielDruhaPolovica >= 0 ? '+' : ''}{rozdielDruhaPolovica.toFixed(1)} h
                </div>
              )}
            </div>

            <div style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '9px', color: '#86868b', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Fond mesiaca / pracovník</div>
              <div style={{ fontSize: '24px', lineHeight: 1.05, color: '#1d1d1f', fontWeight: '700', letterSpacing: '-0.025em', marginTop: '7px' }}>
                {fondMesiaca.toFixed(1)} h
              </div>
              <div style={{ fontSize: '9px', color: '#86868b', marginTop: '7px' }}>Po–Pi 11,5 h · So 10,5 h · Ne 0 h</div>
            </div>
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
            <div className="dashboard-scroll-table" style={{ overflowX: 'auto', maxHeight: '68vh', overflowY: 'auto' }}>
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

        <div style={{ ...cardStyle, marginBottom: '24px', padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #eeeeef' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '750', color: '#1d1d1f', letterSpacing: '-0.015em' }}>Pracovníci v práci podľa dní</div>
                <div style={{ fontSize: '11px', color: '#86868b', marginTop: '4px' }}>{nazovVybranehoMesiaca} · každý pracovník sa za deň počíta iba raz</div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {[
                  { key: 'cely', label: 'Celý mesiac' },
                  { key: 'prva', label: '1.–15.' },
                  { key: 'druha', label: '16.–koniec' },
                ].map(volba => {
                  const aktivna = filterDennehoPrehladu === volba.key
                  return (
                    <button
                      key={volba.key}
                      type="button"
                      onClick={() => setFilterDennehoPrehladu(volba.key as 'cely' | 'prva' | 'druha')}
                      style={{
                        ...(aktivna ? buttonPrimaryStyle : buttonSecondaryStyle),
                        padding: '6px 12px',
                        fontSize: '9px'
                      } as any}
                    >
                      {volba.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '12px', fontSize: '10px', color: '#86868b' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: '#fff7ed', border: '1px solid #fed7aa' }}></span>
                Sobota
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: '#fef2f2', border: '1px solid #fecaca' }}></span>
                Nedeľa
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: '#f3e8ff', border: '1px solid #ddd6fe' }}></span>
                Neprítomnosť
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: '9px', height: '9px', borderRadius: '3px', backgroundColor: '#fff1f2', border: '1px solid #fecdd3' }}></span>
                Nezapísaný
              </span>
            </div>
          </div>

          <div style={{ maxHeight: '440px', overflowY: 'auto', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1180px', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 3, backgroundColor: '#ffffff' }}>
                <tr style={{ textAlign: 'left', backgroundColor: '#fafafa', borderBottom: '1px solid #e5e5e5' }}>
                  <th style={{ padding: '10px 20px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '650' }}>Deň</th>
                  <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '650', textAlign: 'center', width: '110px' }}>V práci</th>
                  <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '650' }}>Pracovníci</th>
                  <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '650' }}>Neprítomní</th>
                  <th style={{ padding: '10px 12px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: '650' }}>Nezapísaní</th>
                  <th style={{ padding: '10px 20px', width: '80px' }}></th>
                </tr>
              </thead>
              <tbody>
                {dennyPrehladNaZobrazenie.map(den => {
                  const jeSobota = den.denVTyzdni === 'So'
                  const jeNedela = den.denVTyzdni === 'Ne'
                  const jeDnes = den.datum === dnesText

                  return (
                    <tr
                      key={den.datum}
                      style={{
                        borderBottom: '1px solid #f2f2f4',
                        backgroundColor: jeNedela ? '#fef2f2' : jeSobota ? '#fff7ed' : jeDnes ? '#eff6ff' : '#ffffff'
                      }}
                    >
                      <td style={{ padding: '11px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                          <div>
                            <div style={{ fontWeight: '700', color: '#1d1d1f', fontSize: '12px' }}>{formatujDatumSK(den.datum)}</div>
                            <div style={{
                              marginTop: '2px',
                              fontSize: '10px',
                              fontWeight: jeSobota || jeNedela ? '700' : '550',
                              color: jeNedela ? '#b42318' : jeSobota ? '#9a3412' : '#86868b'
                            }}>
                              {den.denVTyzdni}
                            </div>
                          </div>
                          {jeDnes && (
                            <span style={{ padding: '3px 7px', borderRadius: '10px', backgroundColor: '#0071e3', color: '#ffffff', fontSize: '8px', fontWeight: '750', letterSpacing: '0.04em' }}>
                              DNES
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '11px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          minWidth: '38px',
                          height: '30px',
                          padding: '0 10px',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '15px',
                          fontSize: '14px',
                          fontWeight: '750',
                          backgroundColor: den.pocet > 0 ? '#e8f3ff' : '#f0f0f2',
                          color: den.pocet > 0 ? '#0071e3' : '#86868b'
                        }}>
                          {den.pocet}
                        </span>
                      </td>

                      <td style={{ padding: '11px 12px', color: den.mena.length > 0 ? '#1d1d1f' : '#b0b0b5', fontSize: '11px', lineHeight: '1.45' }}>
                        {den.mena.length > 0 ? den.mena.join(', ') : 'Nikto'}
                      </td>

                      <td style={{ padding: '11px 12px', verticalAlign: 'middle' }}>
                        {den.pocetNepritomnych === 0 ? (
                          <span style={{ color: '#c7c7cc', fontSize: '11px' }}>—</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            {den.skupinyNepritomnosti.map((skupina: any) => (
                              <div key={skupina.dovod} style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '3px',
                                width: 'fit-content',
                                padding: '4px 7px',
                                borderRadius: '8px',
                                backgroundColor: '#f3e8ff',
                                fontSize: '10px',
                                lineHeight: '1.35'
                              }}>
                                <span style={{ fontWeight: '750', color: '#7c3aed' }}>{skupina.dovod}</span>
                                <span style={{ color: '#a1a1a6' }}>·</span>
                                {skupina.polozky.map((polozka: any, index: number) => (
                                  <span key={polozka.id}>
                                    {index > 0 ? ', ' : ''}
                                    <span style={{ color: '#4c1d95', fontWeight: '550' }}>{polozka.meno}</span>
                                    <button
                                      type="button"
                                      title="Vymazať neprítomnosť"
                                      onClick={() => vymazatNepritomnost(polozka.id)}
                                      style={{ marginLeft: '3px', padding: 0, border: 'none', background: 'none', color: '#a78bfa', cursor: 'pointer', fontSize: '10px' }}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '11px 12px', verticalAlign: 'middle' }}>
                        {den.pocetNezapisanych === 0 ? (
                          <span style={{ color: '#c7c7cc', fontSize: '11px' }}>—</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {den.nezapisani.map((meno: string) => (
                              <span
                                key={meno}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '4px 7px',
                                  borderRadius: '8px',
                                  backgroundColor: '#fff1f2',
                                  border: '1px solid #fecdd3',
                                  color: '#be123c',
                                  fontSize: '10px',
                                  fontWeight: '650',
                                  lineHeight: '1.35'
                                }}
                              >
                                {meno}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '11px 20px', textAlign: 'right' }}>
                        {(den.pocet > 0 || den.pocetNepritomnych > 0 || den.pocetNezapisanych > 0) && (
                          <button
                            type="button"
                            onClick={() => {
                              setFilterDen(den.datum)
                              setFilterMesiac(den.datum.slice(0, 7))
                              setFilterMeno('')
                              setFilterZakazka('')
                              setFilterPolovica('cely')
                              setFilterProblem('vsetko')
                            }}
                            style={{ border: 'none', background: 'none', color: '#0071e3', cursor: 'pointer', fontSize: '10px', fontWeight: '650', padding: '4px 0' }}
                          >
                            Detail
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{
          ...cardStyle,
          marginBottom: '16px',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          flexWrap: 'wrap'
        }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1d1d1f' }}>Rýchle akcie</div>
            <div style={{ fontSize: '10px', color: '#86868b', marginTop: '2px' }}>Pridaj dochádzku alebo eviduj neprítomnosť.</div>
          </div>

          <div className="dashboard-mobile-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => {
                setUkazatFormular(!ukazatFormular)
                if (!ukazatFormular) setUkazatNepritomnost(false)
              }}
              style={{
                ...(ukazatFormular ? buttonSecondaryStyle : buttonPrimaryStyle),
                padding: '7px 14px',
                fontSize: '10px'
              } as any}
            >
              {ukazatFormular ? '✕ Zavrieť dochádzku' : '+ Dochádzka'}
            </button>

            <button
              type="button"
              onClick={() => {
                setUkazatNepritomnost(!ukazatNepritomnost)
                if (!ukazatNepritomnost) setUkazatFormular(false)
              }}
              style={{
                ...(ukazatNepritomnost ? buttonSecondaryStyle : buttonSecondaryStyle),
                padding: '7px 14px',
                fontSize: '10px',
                color: ukazatNepritomnost ? '#1d1d1f' : '#6d28d9',
                borderColor: ukazatNepritomnost ? '#d2d2d7' : '#ddd6fe',
                backgroundColor: ukazatNepritomnost ? '#f5f5f7' : '#faf5ff'
              } as any}
            >
              {ukazatNepritomnost ? '✕ Zavrieť neprítomnosť' : '+ Neprítomnosť'}
            </button>
          </div>
        </div>

        {ukazatNepritomnost && (
          <div style={{ ...cardStyle, marginBottom: '20px' }}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#1d1d1f' }}>Zapísať neprítomnosť</div>
              <div style={{ fontSize: '11px', color: '#86868b', marginTop: '3px' }}>
                Eviduje dôvod, prečo pracovník nebol v práci. Nepridáva odpracované hodiny.
              </div>
            </div>

            <div className="dashboard-form-grid" style={{ display: 'grid', gridTemplateColumns: '220px minmax(240px, 1fr)', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={labelStyle}>Dátum</label>
                <input
                  type="date"
                  value={novaNepritomnost.datum}
                  onChange={e => setNovaNepritomnost({ ...novaNepritomnost, datum: e.target.value })}
                  style={inputStyle as any}
                />
              </div>
              <div>
                <label style={labelStyle}>Dôvod</label>
                <input
                  type="text"
                  placeholder="Napr. svadba, dovolenka, lekár..."
                  value={novaNepritomnost.dovod}
                  onChange={e => setNovaNepritomnost({ ...novaNepritomnost, dovod: e.target.value })}
                  style={inputStyle as any}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Pracovníci</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                {dostupneMena.map(meno => {
                  const vybrany = novaNepritomnost.mena.includes(meno)
                  return (
                    <button
                      key={meno}
                      type="button"
                      onClick={() => {
                        setNovaNepritomnost({
                          ...novaNepritomnost,
                          mena: vybrany
                            ? novaNepritomnost.mena.filter(m => m !== meno)
                            : [...novaNepritomnost.mena, meno]
                        })
                      }}
                      style={{
                        padding: '7px 12px',
                        borderRadius: '18px',
                        border: vybrany ? '1px solid #7c3aed' : '1px solid #d2d2d7',
                        backgroundColor: vybrany ? '#f3e8ff' : '#f5f5f7',
                        color: vybrany ? '#6d28d9' : '#1d1d1f',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: vybrany ? '700' : '500'
                      }}
                    >
                      {meno}
                    </button>
                  )
                })}
              </div>
            </div>

            {chybaNepritomnosti && (
              <div style={{ marginTop: '12px', padding: '10px 12px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#b42318', fontSize: '11px' }}>
                {chybaNepritomnosti}
              </div>
            )}

            <div style={{ marginTop: '14px' }}>
              <button
                type="button"
                onClick={ulozitNepritomnost}
                disabled={ukladaNepritomnost}
                style={{
                  ...buttonPrimaryStyle,
                  opacity: ukladaNepritomnost ? 0.65 : 1,
                  cursor: ukladaNepritomnost ? 'default' : 'pointer'
                } as any}
              >
                {ukladaNepritomnost ? 'Ukladám...' : 'Uložiť neprítomnosť'}
              </button>
            </div>
          </div>
        )}

        {ukazatFormular && (
          <div style={{...cardStyle, marginBottom: '20px'}}>
            <datalist id="zoznam-zakaziek">{dostupneZakazky.map(zak => <option key={zak} value={zak} />)}</datalist>
            <div style={{ fontSize: '11px', color: '#86868b', marginBottom: '14px' }}>Každý blok predstavuje jeden pracovný úsek na jednej stavbe. Ak pracovník počas dňa prejde na inú stavbu alebo má iný pracovný čas, pridajte ďalší blok.</div>

            {noveZaznamy.map((z, i) => (
              <div key={i} style={{ marginBottom: i !== noveZaznamy.length - 1 ? '18px' : '0', paddingBottom: i !== noveZaznamy.length - 1 ? '18px' : '0', borderBottom: i !== noveZaznamy.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                
                <div className="dashboard-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
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

        <div style={{ ...cardStyle, marginBottom: '16px', padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1d1d1f' }}>Filtre dochádzky</div>
              <div style={{ fontSize: '10px', color: '#86868b', marginTop: '2px' }}>Obdobie, pracovník a stavba na jednom mieste.</div>
            </div>
            {filterDen && filterDen !== dnesText && filterDen !== vceraText && (
              <div style={{ fontSize: '10px', fontWeight: '650', color: '#0071e3', padding: '5px 9px', backgroundColor: '#e8f3ff', borderRadius: '12px' }}>
                {formatujDatumSK(filterDen)}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '14px' }}>
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
                  padding: '6px 12px',
                  fontSize: '9px'
                } as any}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="dashboard-filter-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(190px, 1.35fr) repeat(3, minmax(155px, 1fr))', gap: '10px' }}>
            <div>
              <label style={{ ...labelStyle, marginBottom: '5px' }}>Pracovník</label>
              <select
                value={filterMeno}
                onChange={(e) => setFilterMeno(e.target.value)}
                style={{ ...inputStyle, backgroundColor: '#ffffff', cursor: 'pointer' } as any}
              >
                <option value="">Všetci pracovníci</option>
                {dostupneMena.map((meno) => (
                  <option key={meno} value={meno}>{meno}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ ...labelStyle, marginBottom: '5px' }}>Stavba</label>
              <select
                value={filterZakazka}
                onChange={(e) => setFilterZakazka(e.target.value)}
                style={{ ...inputStyle, backgroundColor: '#ffffff', cursor: 'pointer' } as any}
              >
                <option value="">Všetky stavby</option>
                {dostupneZakazky.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>

            <div>
              <label style={{ ...labelStyle, marginBottom: '5px' }}>Mesiac</label>
              <select
                value={filterMesiac}
                disabled={!!filterDen}
                onChange={(e) => {
                  setFilterMesiac(e.target.value)
                  setFilterProblem('vsetko')
                }}
                style={{ ...inputStyle, backgroundColor: '#ffffff', cursor: filterDen ? 'default' : 'pointer', opacity: filterDen ? 0.5 : 1 } as any}
              >
                {zoznamMesiacov.map((m) => <option key={m.hodnota} value={m.hodnota}>{m.nazov}</option>)}
              </select>
            </div>

            <div>
              <label style={{ ...labelStyle, marginBottom: '5px' }}>Konkrétny deň</label>
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
                style={{ ...inputStyle, backgroundColor: '#ffffff' } as any}
              />
            </div>
          </div>

          {(filterMeno || filterZakazka || filterDen || filterPolovica !== 'cely') && (
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '10px', color: '#86868b' }}>
                Aktívny výber ovplyvňuje tabuľku dochádzky a súvisiace súhrny.
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilterMeno('')
                  setFilterZakazka('')
                  setFilterDen('')
                  setFilterPolovica('cely')
                  setFilterProblem('vsetko')
                }}
                style={{ border: 'none', background: 'none', color: '#0071e3', cursor: 'pointer', fontSize: '10px', fontWeight: '650', padding: 0 }}
              >
                Vyčistiť filtre
              </button>
            </div>
          )}
        </div>

        <div style={{ ...cardStyle, padding: '0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '16px 18px', borderBottom: '1px solid #eeeeef', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '750', color: '#1d1d1f', letterSpacing: '-0.015em' }}>Záznamy dochádzky</div>
              <div style={{ fontSize: '10px', color: '#86868b', marginTop: '3px' }}>Dátum, osoba, stavba a hodiny sú klikateľné pre zoradenie.</div>
            </div>
            <div style={{ padding: '5px 9px', borderRadius: '12px', backgroundColor: '#f5f5f7', color: '#6e6e73', fontSize: '10px', fontWeight: '650' }}>
              {zoradeneZaznamy.length} záznamov
            </div>
          </div>
          {filterMeno && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '11px 18px', borderBottom: '1px solid #dbeafe', backgroundColor: '#f7fbff', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1d1d1f' }}>{filterMeno}</div>
                <div style={{ fontSize: '10px', color: '#86868b', marginTop: '2px' }}>Aktívny filter pracovníka</div>
              </div>
              <div style={{ fontSize: '16px', fontWeight: '750', color: '#0071e3' }}>{celkoveHodiny.toFixed(2)} h</div>
            </div>
          )}
          <div className="dashboard-scroll-table attendance-table-wrap" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '72vh' }}>
            <table className="attendance-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1020px', fontSize: '12px' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 5, backgroundColor: '#f7f7f8', boxShadow: '0 1px 0 #e5e5e7' }}>
                <tr style={{ textAlign: 'left' }}>
                  <th style={{ padding: '11px 14px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>
                    <button type="button" onClick={() => zmenTriedenie('datum')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', fontWeight: 'inherit' }}>Dátum{indikatorTriedenia('datum')}</button>
                  </th>
                  <th style={{ padding: '11px 14px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>
                    <button type="button" onClick={() => zmenTriedenie('meno')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', fontWeight: 'inherit' }}>Osoba{indikatorTriedenia('meno')}</button>
                  </th>
                  <th style={{ padding: '11px 14px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>
                    <button type="button" onClick={() => zmenTriedenie('zakazka')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', fontWeight: 'inherit' }}>Zákazka{indikatorTriedenia('zakazka')}</button>
                  </th>
                  <th style={{ padding: '11px 14px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Príchod</th>
                  <th style={{ padding: '11px 14px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700' }}>Odchod</th>
                  <th style={{ padding: '11px 14px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', textAlign: 'right' }}>
                    <button type="button" onClick={() => zmenTriedenie('hodiny')} style={{ border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: 'inherit', font: 'inherit', textTransform: 'inherit', letterSpacing: 'inherit', fontWeight: 'inherit' }}>Hodiny{indikatorTriedenia('hodiny')}</button>
                  </th>
                  <th style={{ padding: '11px 14px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.55px', fontWeight: '700', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {zoradeneZaznamy.length === 0 ? ( 
                  <tr className="attendance-empty-row"><td className="attendance-empty-cell" colSpan={7} style={{ padding: '34px 14px', color: '#a1a1a6', textAlign: 'center', fontSize: '11px' }}>{filterProblem === 'vsetko' ? 'Žiadne dáta.' : 'Žiadne záznamy pre vybraný kontrolný filter.'}</td></tr> 
                ) : (
                  zoradeneZaznamy.map((z) => {
                    const hodinyRiadku = upravovaneId === z.id ? parseFloat(upravovaneHodiny) || 0 : hodinyZaznamu(z)
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
                        className="attendance-row" 
                        style={{ 
                          borderBottom: '1px solid #eeeeef',
                          backgroundColor: farbaRiadku,
                          transition: 'filter 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(0.98)'}
                        onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                      >
                        <td className="attendance-cell" data-label="Dátum" style={{ padding: '11px 14px', color: '#1d1d1f', fontWeight: '500' }}>
                          {formatujDatumSK(z.datum)}
                          {jeVikend && <span style={{ fontSize: '8px', backgroundColor: '#ffedd5', color: '#9a3412', padding: '2px 5px', marginLeft: '6px', letterSpacing: '0.3px', textTransform: 'uppercase', borderRadius: '8px', fontWeight: '700' }}>Víkend</span>}
                        </td>
                        <td className="attendance-cell" data-label="Osoba" style={{ padding: '11px 14px', fontWeight: '600', color: '#1d1d1f' }}>
                          {z.meno}
                          {jeDuplicite && <span style={{ fontSize: '8px', backgroundColor: '#fde68a', color: '#92400e', padding: '2px 4px', marginLeft: '4px', borderRadius: '8px', fontWeight: '700' }}>DUP</span>}
                          {jePrekryv && <span style={{ fontSize: '8px', backgroundColor: '#fed7aa', color: '#9a3412', padding: '2px 4px', marginLeft: '4px', borderRadius: '8px', fontWeight: '700' }}>PREKRYV</span>}
                          {maViacUsekov && !jeDuplicite && !jePrekryv && <span style={{ fontSize: '8px', backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '2px 4px', marginLeft: '4px', borderRadius: '8px', fontWeight: '700' }}>VIAC</span>}
                        </td>
                        <td className="attendance-cell" data-label="Stavba" style={{ padding: '11px 14px', color: '#6e6e73', fontSize: '11px', fontWeight: '500' }}>{z.zakazka}</td>
                        
                        <td className="attendance-cell" data-label="Príchod" style={{ padding: '11px 14px', color: maCiasChybu ? '#ff3b30' : '#1d1d1f', fontWeight: maCiasChybu ? '600' : '500' }}>
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

                        <td className="attendance-cell" data-label="Odchod" style={{ padding: '11px 14px', color: maCiasChybu ? '#ff3b30' : '#1d1d1f', fontWeight: maCiasChybu ? '600' : '500' }}>
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

                        <td className="attendance-cell" data-label="Hodiny" style={{ padding: '11px 14px', color: jePodozrivy ? '#ff3b30' : '#1d1d1f', fontWeight: jePodozrivy ? '700' : '600', textAlign: 'right' }} title={jePodozrivy ? "Podozrivý čas" : ""}>
                          {upravovaneId === z.id ? (
                            <input 
                              type="number" 
                              value={upravovaneHodiny} 
                              readOnly
                              title="Hodiny sa počítajú automaticky z príchodu a odchodu"
                              style={{...inputStyle, width: '60px', fontSize: '11px', padding: '4px 6px', textAlign: 'right', opacity: 0.75}}
                            />
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '58px',
                              padding: '4px 8px',
                              borderRadius: '10px',
                              backgroundColor: jePodozrivy ? '#fee2e2' : '#f5f5f7',
                              color: jePodozrivy ? '#b42318' : '#1d1d1f',
                              fontWeight: '750'
                            }}>
                              {hodinyRiadku.toFixed(2)} h {jePodozrivy && <span style={{ fontSize: '9px', marginLeft: '3px' }}>⚠</span>}
                            </span>
                          )}
                        </td>

                        <td className="attendance-cell attendance-actions" data-label="Akcie" style={{ padding: '11px 14px', textAlign: 'right' }}>
                          {upravovaneId === z.id ? (
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                              <button 
                                onClick={() => zrusitUpravu()}
                                style={{ color: '#6e6e73', backgroundColor: '#f5f5f7', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '600', padding: '5px 8px', borderRadius: '8px', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#1d1d1f'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#86868b'}
                              >
                                Zrušiť
                              </button>
                              <button 
                                onClick={() => ulozitUpravu(z.id)}
                                style={{ color: '#047857', backgroundColor: '#ecfdf5', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '700', padding: '5px 8px', borderRadius: '8px', transition: 'all 0.2s' }}
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
                                style={{ color: '#0071e3', backgroundColor: '#e8f3ff', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '650', padding: '5px 8px', borderRadius: '8px', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#0077ed'}
                                onMouseLeave={(e) => e.currentTarget.style.color = '#0071e3'}
                              >
                                Upraviť
                              </button>
                              <button 
                                onClick={() => vymazat(z.id)}
                                style={{ color: '#86868b', backgroundColor: '#f5f5f7', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: '600', padding: '5px 8px', borderRadius: '8px', transition: 'all 0.2s' }}
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
            <div style={{ padding: '10px 14px', backgroundColor: '#fef2f2', borderTop: '1px solid #fee2e2', color: '#b42318', fontSize: '10px', fontWeight: '600' }}>
              ⚠️ {chybaUpravaHodiny}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}