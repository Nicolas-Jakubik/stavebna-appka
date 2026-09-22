'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AdminSidebar from '../../components/AdminSidebar'
import { supabase } from '../../lib/adminSupabase'
import { vypocitajNakladyPracovnikov, zhrnNakladyPracovnikovPodlaZakazky } from '../../lib/laborCosts'
import { FINANCE_CATEGORIES, vytvorMesacnyRozpadNakladov } from '../../lib/financeBreakdown'
import { fakturyAkoNaklady, zhrnDodavatelskeFaktury } from '../../lib/supplierInvoices'
import { zhrnKlientskeFaktury } from '../../lib/clientInvoices'
import { vypocitajZiskovost } from '../../lib/profitability'
import { vytvorUpozorneniaFaktur } from '../../lib/financeAlerts'

type Project = {
  id: number | string
  nazov: string
  stav?: string | null
}

type Finance = {
  zakazka_id: number | string
  cena_zakazky: number | string
  budget_nakladov: number | string
  vyfakturovane: number | string
}

type Payment = {
  zakazka_id: number | string
  suma: number | string
}

type Expense = {
  zakazka_id: number | string
  datum: string
  kategoria: string
  suma: number | string
  uhradene: boolean
}

type Attendance = {
  id: number | string
  meno: string
  datum: string
  zakazka: string
  prichod: string
  odchod: string
}

type Employee = {
  meno: string
  sadzba: number | string | null
}

type WorkerPayment = {
  zakazka_id: number | string
  meno: string
  suma: number | string
}

type SupplierInvoice = {
  id: number | string
  zakazka_id: number | string
  dodavatel: string
  cislo_faktury: string
  datum_vystavenia: string
  datum_splatnosti: string
  kategoria: string
  suma: number | string
  uhradene: boolean
}

type ClientInvoice = {
  id: number | string
  zakazka_id: number | string
  cislo_faktury: string
  datum_vystavenia: string
  datum_splatnosti: string
  suma: number | string
  uhradene: boolean
}

function num(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function euro(value: number) {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: '14px',
  border: '1px solid rgba(0,0,0,.08)',
  boxShadow: '0 2px 8px rgba(0,0,0,.05)',
}

export default function FinanciePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [financeRows, setFinanceRows] = useState<Finance[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [workerPayments, setWorkerPayments] = useState<WorkerPayment[]>([])
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoice[]>([])
  const [clientInvoices, setClientInvoices] = useState<ClientInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'vsetky' | 'aktivne' | 'dokoncene'>('vsetky')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      const [
        { data: projectData, error: projectError },
        { data: financeData, error: financeError },
        { data: expenseData, error: expenseError },
        { data: paymentData, error: paymentError },
        { data: attendanceData, error: attendanceError },
        { data: employeeData, error: employeeError },
        { data: workerPaymentData, error: workerPaymentError },
        { data: supplierInvoiceData, error: supplierInvoiceError },
        { data: clientInvoiceData, error: clientInvoiceError },
      ] = await Promise.all([
        supabase.from('zoznam_zakaziek').select('id,nazov,stav').order('created_at', { ascending: false }),
        supabase.from('financie_stavby').select('zakazka_id,cena_zakazky,budget_nakladov,vyfakturovane'),
        supabase.from('naklady_stavby').select('zakazka_id,datum,kategoria,suma,uhradene'),
        supabase.from('platby_stavby').select('zakazka_id,suma'),
        supabase.from('dochadzka').select('id,meno,datum,zakazka,prichod,odchod'),
        supabase.from('zamestnanci').select('meno,sadzba'),
        supabase.from('uhrady_pracovnikov').select('zakazka_id,meno,suma'),
        supabase.from('faktury_dodavatelov').select('id,zakazka_id,dodavatel,cislo_faktury,datum_vystavenia,datum_splatnosti,kategoria,suma,uhradene'),
        supabase.from('faktury_klientov').select('id,zakazka_id,cislo_faktury,datum_vystavenia,datum_splatnosti,suma,uhradene'),
      ])

      if (cancelled) return

      if (projectError || financeError || expenseError || paymentError || attendanceError || employeeError || workerPaymentError || supplierInvoiceError || clientInvoiceError) {
        console.error('Chyba načítania finančného prehľadu:', projectError || financeError || expenseError || paymentError || attendanceError || employeeError || workerPaymentError || supplierInvoiceError || clientInvoiceError)
        setError('Finančný prehľad sa nepodarilo načítať kompletne.')
      }

      setProjects((projectData as Project[]) || [])
      setFinanceRows((financeData as Finance[]) || [])
      setExpenses((expenseData as Expense[]) || [])
      setPayments((paymentData as Payment[]) || [])
      setAttendance((attendanceData as Attendance[]) || [])
      setEmployees((employeeData as Employee[]) || [])
      setWorkerPayments((workerPaymentData as WorkerPayment[]) || [])
      setSupplierInvoices((supplierInvoiceData as SupplierInvoice[]) || [])
      setClientInvoices((clientInvoiceData as ClientInvoice[]) || [])
      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  const financeByProject = useMemo(() => {
    const map = new Map<string, Finance>()
    financeRows.forEach(row => map.set(String(row.zakazka_id), row))
    return map
  }, [financeRows])

  const costsByProject = useMemo(() => {
    const map = new Map<string, { total: number; paid: number }>()
    expenses.forEach(row => {
      const key = String(row.zakazka_id)
      const current = map.get(key) || { total: 0, paid: 0 }
      const amount = num(row.suma)
      current.total += amount
      if (row.uhradene !== false) current.paid += amount
      map.set(key, current)
    })
    return map
  }, [expenses])

  const paymentsByProject = useMemo(() => {
    const map = new Map<string, number>()
    payments.forEach(row => {
      const key = String(row.zakazka_id)
      map.set(key, (map.get(key) || 0) + num(row.suma))
    })
    return map
  }, [payments])

  const workerPaymentsByProject = useMemo(() => {
    const map = new Map<string, number>()
    workerPayments.forEach(row => {
      const key = String(row.zakazka_id)
      map.set(key, (map.get(key) || 0) + num(row.suma))
    })
    return map
  }, [workerPayments])

  const supplierInvoicesByProject = useMemo(() => {
    const map = new Map<string, ReturnType<typeof zhrnDodavatelskeFaktury>>()
    projects.forEach(project => {
      const projectInvoices = supplierInvoices.filter(invoice => String(invoice.zakazka_id) === String(project.id))
      map.set(String(project.id), zhrnDodavatelskeFaktury(projectInvoices, new Date().toISOString().slice(0, 10)))
    })
    return map
  }, [projects, supplierInvoices])

  const clientInvoicesByProject = useMemo(() => {
    const map = new Map<string, ReturnType<typeof zhrnKlientskeFaktury>>()
    projects.forEach(project => {
      const projectInvoices = clientInvoices.filter(invoice => String(invoice.zakazka_id) === String(project.id))
      map.set(String(project.id), zhrnKlientskeFaktury(projectInvoices, new Date().toISOString().slice(0, 10)))
    })
    return map
  }, [projects, clientInvoices])

  const laborEntries = useMemo(
    () => vypocitajNakladyPracovnikov(attendance, employees),
    [attendance, employees]
  )

  const laborByProject = useMemo(
    () => zhrnNakladyPracovnikovPodlaZakazky(laborEntries),
    [laborEntries]
  )

  const monthlyBreakdown = useMemo(
    () => vytvorMesacnyRozpadNakladov([...expenses, ...fakturyAkoNaklady(supplierInvoices)], laborEntries),
    [expenses, supplierInvoices, laborEntries]
  )

  const rows = useMemo(() => {
    return projects.map(project => {
      const finance = financeByProject.get(String(project.id))
      const projectCosts = costsByProject.get(String(project.id)) || { total: 0, paid: 0 }
      const labor = laborByProject.get(String(project.nazov || '').trim())
      const manualCosts = projectCosts.total
      const laborCosts = labor?.suma || 0
      const supplierSummary = supplierInvoicesByProject.get(String(project.id)) || { spolu: 0, uhradene: 0, neuhradene: 0, poSplatnosti: 0, pocetPoSplatnosti: 0 }
      const supplierCosts = supplierSummary.spolu
      const costs = manualCosts + laborCosts + supplierCosts
      const paidCosts = projectCosts.paid
      const unpaidCosts = manualCosts - paidCosts
      const price = num(finance?.cena_zakazky)
      const budget = num(finance?.budget_nakladov)
      const clientSummary = clientInvoicesByProject.get(String(project.id)) || { vyfakturovane: 0, prijate: 0, pohladavky: 0, poSplatnosti: 0, pocetPoSplatnosti: 0 }
      const projectClientInvoiceCount = clientInvoices.filter(invoice => String(invoice.zakazka_id) === String(project.id)).length
      const legacyInvoiced = num(finance?.vyfakturovane)
      const invoiced = projectClientInvoiceCount > 0 ? clientSummary.vyfakturovane : legacyInvoiced
      const otherReceived = paymentsByProject.get(String(project.id)) || 0
      const received = clientSummary.prijate + otherReceived
      const receivables = projectClientInvoiceCount > 0 ? clientSummary.pohladavky : Math.max(0, invoiced - otherReceived)
      const paidLabor = workerPaymentsByProject.get(String(project.id)) || 0
      const laborOutstanding = Math.max(0, laborCosts - paidLabor)
      const remaining = budget > 0 ? budget - costs : null
      const cashflow = received - paidCosts - paidLabor - supplierSummary.uhradene
      const usage = budget > 0 ? (costs / budget) * 100 : 0
      const profitability = vypocitajZiskovost({
        cenaZakazky: price,
        budgetNakladov: budget,
        aktualneNaklady: costs,
        vyfakturovane: invoiced,
        prijate: received,
      })

      return {
        ...project,
        price,
        budget,
        costs,
        manualCosts,
        laborCosts,
        supplierCosts,
        paidSupplierCosts: supplierSummary.uhradene,
        unpaidSupplierCosts: supplierSummary.neuhradene,
        overdueSupplierCosts: supplierSummary.poSplatnosti,
        overdueSupplierCount: supplierSummary.pocetPoSplatnosti,
        laborHours: labor?.hodiny || 0,
        laborWorkers: labor?.pracovnici.size || 0,
        laborMissingRates: labor?.bezSadzby.size || 0,
        remaining,
        invoiced,
        received,
        receivables,
        overdueClientReceivables: clientSummary.poSplatnosti,
        overdueClientInvoiceCount: clientSummary.pocetPoSplatnosti,
        paidCosts,
        paidLabor,
        laborOutstanding,
        unpaidCosts,
        cashflow,
        usage,
        plannedProfit: profitability.planovanyZisk,
        plannedMargin: profitability.planovanaMarzaPercent,
        currentReserve: profitability.aktualnaRezerva,
        budgetVariance: profitability.odchylkaOdBudgetu,
        hasBudget: budget > 0,
        hasPrice: price > 0,
        hasFinance: Boolean(finance) || costs > 0 || received > 0,
      }
    })
  }, [projects, financeByProject, costsByProject, paymentsByProject, workerPaymentsByProject, supplierInvoicesByProject, clientInvoicesByProject, clientInvoices, laborByProject])

  const filteredRows = useMemo(() => {
    const q = search.trim().toLocaleLowerCase('sk')
    return rows.filter(row => {
      const matchesSearch = !q || String(row.nazov || '').toLocaleLowerCase('sk').includes(q)
      const matchesStatus =
        status === 'vsetky' ||
        (status === 'aktivne' && row.stav !== 'Dokončená') ||
        (status === 'dokoncene' && row.stav === 'Dokončená')
      return matchesSearch && matchesStatus
    })
  }, [rows, search, status])

  const totals = useMemo(() => {
    return rows.reduce((acc, row) => {
      acc.price += row.price
      acc.budget += row.budget
      acc.costs += row.costs
      acc.laborCosts += row.laborCosts
      acc.supplierCosts += row.supplierCosts
      acc.paidSupplierCosts += row.paidSupplierCosts
      acc.unpaidSupplierCosts += row.unpaidSupplierCosts
      acc.overdueSupplierCosts += row.overdueSupplierCosts
      acc.paidCosts += row.paidCosts
      acc.paidLabor += row.paidLabor
      acc.unpaidCosts += row.unpaidCosts
      acc.invoiced += row.invoiced
      acc.received += row.received
      acc.receivables += row.receivables
      acc.overdueClientReceivables += row.overdueClientReceivables
      acc.cashflow += row.cashflow
      acc.plannedProfit += row.plannedProfit
      acc.currentReserve += row.currentReserve
      if (row.budget > 0) acc.budgetedCosts += row.costs
      else if (row.costs > 0) acc.withoutBudget += 1
      if (row.price > 0) acc.pricedCosts += row.costs
      else if (row.costs > 0) acc.withoutPrice += 1
      if (row.hasFinance) acc.withFinance += 1
      return acc
    }, {
      price: 0,
      budget: 0,
      costs: 0,
      laborCosts: 0,
      supplierCosts: 0,
      paidSupplierCosts: 0,
      unpaidSupplierCosts: 0,
      overdueSupplierCosts: 0,
      paidCosts: 0,
      paidLabor: 0,
      unpaidCosts: 0,
      invoiced: 0,
      received: 0,
      receivables: 0,
      overdueClientReceivables: 0,
      cashflow: 0,
      plannedProfit: 0,
      currentReserve: 0,
      budgetedCosts: 0,
      pricedCosts: 0,
      withoutBudget: 0,
      withoutPrice: 0,
      withFinance: 0,
    })
  }, [rows])

  const totalRemaining = totals.budget > 0 ? totals.budget - totals.budgetedCosts : null
  const totalUsage = totals.budget > 0 ? (totals.budgetedCosts / totals.budget) * 100 : 0
  const portfolioProfitability = vypocitajZiskovost({
    cenaZakazky: totals.price,
    budgetNakladov: totals.budget,
    aktualneNaklady: totals.pricedCosts,
    vyfakturovane: totals.invoiced,
    prijate: totals.received,
  })

  const todayKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Bratislava',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>()
    projects.forEach(project => map.set(String(project.id), project.nazov))
    return map
  }, [projects])

  const supplierAlerts = useMemo(
    () => vytvorUpozorneniaFaktur(supplierInvoices, todayKey, 7),
    [supplierInvoices, todayKey]
  )

  const clientAlerts = useMemo(
    () => vytvorUpozorneniaFaktur(clientInvoices, todayKey, 7),
    [clientInvoices, todayKey]
  )

  const budgetAlerts = useMemo(
    () => rows
      .filter(row => row.budget > 0 && row.usage >= 90)
      .sort((a, b) => b.usage - a.usage),
    [rows]
  )

  const setupAlerts = useMemo(
    () => rows.filter(row => row.costs > 0 && (!row.hasBudget || !row.hasPrice)),
    [rows]
  )

  const urgentAlertsCount =
    supplierAlerts.filter(alert => alert.stav === 'po_splatnosti').length +
    clientAlerts.filter(alert => alert.stav === 'po_splatnosti').length +
    budgetAlerts.filter(row => row.usage >= 100).length

  const allFinanceAlertsCount = supplierAlerts.length + clientAlerts.length + budgetAlerts.length + setupAlerts.length

  return (
    <div className="finances-shell" style={{
      minHeight: '100vh',
      backgroundColor: '#f5f5f7',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      color: '#1d1d1f',
      display: 'flex',
      gap: '24px',
      alignItems: 'flex-start',
    }}>
      <style>{`
        @media (max-width: 1024px) {
          .finances-shell {
            display: block !important;
            padding:
              calc(64px + env(safe-area-inset-top))
              max(12px, env(safe-area-inset-right))
              calc(20px + env(safe-area-inset-bottom))
              max(12px, env(safe-area-inset-left)) !important;
          }
          .finances-summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .finances-filter-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 640px) {
          .finances-summary-grid {
            grid-template-columns: 1fr !important;
          }
          .finances-table {
            display: block;
            width: 100% !important;
          }
          .finances-table thead {
            display: none;
          }
          .finances-table tbody {
            display: grid;
            gap: 10px;
          }
          .finances-table tr {
            display: block;
            background: #fff;
            border: 1px solid #e5e5e7 !important;
            border-radius: 14px;
            overflow: hidden;
          }
          .finances-table td {
            display: grid;
            grid-template-columns: 104px minmax(0, 1fr);
            gap: 10px;
            align-items: center;
            padding: 9px 12px !important;
            min-height: 42px;
            border-bottom: 1px solid rgba(0,0,0,.055);
            text-align: left !important;
          }
          .finances-table td::before {
            content: attr(data-label);
            color: #86868b;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: .04em;
            text-transform: uppercase;
          }
          .finances-table td:last-child {
            border-bottom: 0;
          }
          .finances-detail-link {
            justify-self: start;
          }
        }
      `}</style>

      <AdminSidebar active="financie" />

      <main style={{ width: '100%', flex: 1, minWidth: 0, maxWidth: '1540px', margin: '0 auto' }}>
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '10px', color: '#86868b', fontWeight: '700', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
            Firemná administrácia
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', lineHeight: 1.1, letterSpacing: '-.035em', fontWeight: '750' }}>
            Financie
          </h1>
          <div style={{ marginTop: '5px', color: '#86868b', fontSize: '11px' }}>
            Centrálny finančný prehľad všetkých stavieb. Detailné úpravy robíš po otvorení konkrétnej stavby.
          </div>
        </div>

        {error && (
          <div style={{ ...cardStyle, padding: '12px 14px', marginBottom: '14px', color: '#b42318', backgroundColor: '#fef2f2', fontSize: '11px' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ ...cardStyle, padding: '28px', color: '#86868b', fontSize: '12px' }}>
            Načítavam finančný prehľad…
          </div>
        ) : (
          <>
            <div className="finances-summary-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px', marginBottom: '14px' }}>
              <div style={{ ...cardStyle, padding: '17px 18px' }}>
                <div style={{ color: '#86868b', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.05em' }}>Celkový budget</div>
                <div style={{ marginTop: '8px', fontSize: '25px', fontWeight: '750', letterSpacing: '-.035em' }}>{euro(totals.budget)}</div>
                <div style={{ marginTop: '6px', color: '#86868b', fontSize: '10px' }}>{totals.withFinance} z {rows.length} stavieb má finančné dáta</div>
              </div>

              <div style={{ ...cardStyle, padding: '17px 18px' }}>
                <div style={{ color: '#86868b', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.05em' }}>Aktuálne náklady</div>
                <div style={{ marginTop: '8px', fontSize: '25px', fontWeight: '750', letterSpacing: '-.035em' }}>{euro(totals.costs)}</div>
                <div style={{ marginTop: '6px', color: '#86868b', fontSize: '10px' }}>{totals.budget > 0 ? `Vyčerpanie ${totalUsage.toFixed(0)} % · ` : ''}faktúry {euro(totals.supplierCosts)} · pracovníci {euro(totals.laborCosts)}</div>
              </div>

              <div style={{ ...cardStyle, padding: '17px 18px' }}>
                <div style={{ color: '#86868b', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.05em' }}>Zostáva z budgetu</div>
                <div style={{ marginTop: '8px', fontSize: '25px', fontWeight: '750', letterSpacing: '-.035em', color: totalRemaining !== null && totalRemaining < 0 ? '#b42318' : '#1d1d1f' }}>{totalRemaining === null ? '—' : euro(totalRemaining)}</div>
                <div style={{ marginTop: '6px', color: '#86868b', fontSize: '10px' }}>{totals.budget > 0 ? `Počíta sa iba zo stavieb s nastaveným budgetom${totals.withoutBudget > 0 ? ` · ${totals.withoutBudget} bez budgetu` : ''}` : 'Budget zatiaľ nie je nastavený na žiadnej stavbe'}</div>
              </div>

              <div style={{ ...cardStyle, padding: '17px 18px', backgroundColor: totals.cashflow < 0 ? '#fffafa' : '#f7fbff' }}>
                <div style={{ color: '#86868b', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.05em' }}>Aktuálny cashflow</div>
                <div style={{ marginTop: '8px', fontSize: '25px', fontWeight: '750', letterSpacing: '-.035em', color: totals.cashflow < 0 ? '#b42318' : '#0066cc' }}>{euro(totals.cashflow)}</div>
                <div style={{ marginTop: '6px', color: '#86868b', fontSize: '10px' }}>Prijaté {euro(totals.received)} · pohľadávky {euro(totals.receivables)} · po splatnosti {euro(totals.overdueClientReceivables)}</div>
              </div>
            </div>

            <div style={{ ...cardStyle, overflow: 'hidden', marginBottom: '14px', borderColor: urgentAlertsCount > 0 ? '#f3b4ae' : 'rgba(0,0,0,.08)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #ededf0', display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '750' }}>Finančné upozornenia</div>
                  <div style={{ marginTop: '3px', color: '#86868b', fontSize: '10px' }}>Faktúry po splatnosti, splatné do 7 dní a stavby s čerpaním budgetu od 90 %.</div>
                </div>
                <span style={{
                  padding: '5px 9px',
                  borderRadius: '999px',
                  backgroundColor: urgentAlertsCount > 0 ? '#fef2f2' : allFinanceAlertsCount > 0 ? '#fff7ed' : '#ecfdf5',
                  color: urgentAlertsCount > 0 ? '#b42318' : allFinanceAlertsCount > 0 ? '#9a6700' : '#047857',
                  fontSize: '9px',
                  fontWeight: '750',
                }}>
                  {allFinanceAlertsCount === 0 ? 'BEZ UPOZORNENÍ' : `${allFinanceAlertsCount} upozornení`}
                </span>
              </div>

              {allFinanceAlertsCount === 0 ? (
                <div style={{ padding: '20px 18px', color: '#047857', fontSize: '11px', fontWeight: '650' }}>
                  Momentálne nie je nič po splatnosti, nič nespadá do najbližších 7 dní, žiadna stavba nie je nad 90 % budgetu a finančný setup je kompletný.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 0 }}>
                  {supplierAlerts.map(alert => (
                    <Link key={`supplier-${alert.id}`} href={`/zakazky/${alert.zakazkaId}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1.4fr) minmax(160px,1fr) auto', gap: '12px', alignItems: 'center', padding: '11px 18px', borderBottom: '1px solid #ededf0', color: '#1d1d1f', textDecoration: 'none' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '750' }}>{projectNameById.get(alert.zakazkaId) || 'Neznáma stavba'} · dodávateľská FA {alert.cisloFaktury}</div>
                        <div style={{ marginTop: '3px', color: '#86868b', fontSize: '9px' }}>{alert.dodavatel || 'Dodávateľ'} · {euro(alert.suma)}</div>
                      </div>
                      <div style={{ color: alert.stav === 'po_splatnosti' ? '#b42318' : '#9a6700', fontSize: '10px', fontWeight: '700' }}>
                        {alert.stav === 'po_splatnosti'
                          ? `Po splatnosti ${Math.abs(alert.dniDoSplatnosti)} dní`
                          : alert.dniDoSplatnosti === 0 ? 'Splatná dnes' : `Splatná o ${alert.dniDoSplatnosti} dní`}
                      </div>
                      <div style={{ color: '#0071e3', fontSize: '10px', fontWeight: '750' }}>Detail →</div>
                    </Link>
                  ))}

                  {clientAlerts.map(alert => (
                    <Link key={`client-${alert.id}`} href={`/zakazky/${alert.zakazkaId}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1.4fr) minmax(160px,1fr) auto', gap: '12px', alignItems: 'center', padding: '11px 18px', borderBottom: '1px solid #ededf0', color: '#1d1d1f', textDecoration: 'none' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '750' }}>{projectNameById.get(alert.zakazkaId) || 'Neznáma stavba'} · pohľadávka FA {alert.cisloFaktury}</div>
                        <div style={{ marginTop: '3px', color: '#86868b', fontSize: '9px' }}>{euro(alert.suma)}</div>
                      </div>
                      <div style={{ color: alert.stav === 'po_splatnosti' ? '#b42318' : '#9a6700', fontSize: '10px', fontWeight: '700' }}>
                        {alert.stav === 'po_splatnosti'
                          ? `Klient mešká ${Math.abs(alert.dniDoSplatnosti)} dní`
                          : alert.dniDoSplatnosti === 0 ? 'Splatná dnes' : `Splatnosť o ${alert.dniDoSplatnosti} dní`}
                      </div>
                      <div style={{ color: '#0071e3', fontSize: '10px', fontWeight: '750' }}>Detail →</div>
                    </Link>
                  ))}

                  {setupAlerts.map(row => (
                    <Link key={`setup-${row.id}`} href={`/zakazky/${row.id}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1.4fr) minmax(160px,1fr) auto', gap: '12px', alignItems: 'center', padding: '11px 18px', borderBottom: '1px solid #ededf0', color: '#1d1d1f', textDecoration: 'none' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '750' }}>{row.nazov} · chýba finančný setup</div>
                        <div style={{ marginTop: '3px', color: '#86868b', fontSize: '9px' }}>Evidované náklady {euro(row.costs)}</div>
                      </div>
                      <div style={{ color: '#9a6700', fontSize: '10px', fontWeight: '700' }}>
                        {!row.hasPrice && !row.hasBudget ? 'Chýba cena aj budget' : !row.hasPrice ? 'Chýba cena zákazky' : 'Chýba budget'}
                      </div>
                      <div style={{ color: '#0071e3', fontSize: '10px', fontWeight: '750' }}>Doplniť →</div>
                    </Link>
                  ))}

                  {budgetAlerts.map(row => (
                    <Link key={`budget-${row.id}`} href={`/zakazky/${row.id}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1.4fr) minmax(160px,1fr) auto', gap: '12px', alignItems: 'center', padding: '11px 18px', borderBottom: '1px solid #ededf0', color: '#1d1d1f', textDecoration: 'none' }}>
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: '750' }}>{row.nazov} · budget</div>
                        <div style={{ marginTop: '3px', color: '#86868b', fontSize: '9px' }}>{euro(row.costs)} z {euro(row.budget)}</div>
                      </div>
                      <div style={{ color: row.usage >= 100 ? '#b42318' : '#9a6700', fontSize: '10px', fontWeight: '700' }}>
                        {row.usage >= 100 ? `Prekročený o ${euro(Math.abs(row.remaining ?? 0))}` : `Vyčerpané ${row.usage.toFixed(0)} %`}
                      </div>
                      <div style={{ color: '#0071e3', fontSize: '10px', fontWeight: '750' }}>Detail →</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div style={{ ...cardStyle, padding: '17px 18px', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: '750' }}>Ziskovosť všetkých stavieb</div>
              <div style={{ marginTop: '4px', color: '#86868b', fontSize: '10px' }}>Prehľad podľa nastavenej ceny zákaziek, budgetov a aktuálne zaevidovaných nákladov.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '10px', marginTop: '14px' }} className="finances-summary-grid">
                <div style={{ padding: '12px 13px', borderRadius: '11px', backgroundColor: '#f7f7f8' }}>
                  <div style={{ color: '#86868b', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase' }}>Plánovaný zisk</div>
                  <div style={{ marginTop: '6px', fontSize: '19px', fontWeight: '750', color: portfolioProfitability.planovanyZisk < 0 ? '#b42318' : '#047857' }}>{euro(portfolioProfitability.planovanyZisk)}</div>
                  <div style={{ marginTop: '3px', color: '#86868b', fontSize: '9px' }}>{portfolioProfitability.planovanaMarzaPercent === null ? '—' : `marža ${portfolioProfitability.planovanaMarzaPercent.toFixed(1)} %`}</div>
                </div>
                <div style={{ padding: '12px 13px', borderRadius: '11px', backgroundColor: '#f7f7f8' }}>
                  <div style={{ color: '#86868b', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase' }}>Aktuálna rezerva do ceny</div>
                  <div style={{ marginTop: '6px', fontSize: '19px', fontWeight: '750', color: totals.price > 0 && portfolioProfitability.aktualnaRezerva < 0 ? '#b42318' : '#1d1d1f' }}>{totals.price > 0 ? euro(portfolioProfitability.aktualnaRezerva) : '—'}</div>
                  <div style={{ marginTop: '3px', color: '#86868b', fontSize: '9px' }}>{totals.price > 0 ? `cena − náklady na ocenených stavbách${totals.withoutPrice > 0 ? ` · ${totals.withoutPrice} bez ceny` : ''}` : 'Cena zákaziek zatiaľ nie je nastavená'}</div>
                </div>
                <div style={{ padding: '12px 13px', borderRadius: '11px', backgroundColor: '#f7f7f8' }}>
                  <div style={{ color: '#86868b', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase' }}>Fakturácia</div>
                  <div style={{ marginTop: '6px', fontSize: '19px', fontWeight: '750' }}>{portfolioProfitability.fakturacnyProgressPercent === null ? '—' : `${portfolioProfitability.fakturacnyProgressPercent.toFixed(0)} %`}</div>
                  <div style={{ marginTop: '3px', color: '#86868b', fontSize: '9px' }}>{euro(totals.invoiced)} z {euro(totals.price)}</div>
                </div>
                <div style={{ padding: '12px 13px', borderRadius: '11px', backgroundColor: '#f7f7f8' }}>
                  <div style={{ color: '#86868b', fontSize: '8px', fontWeight: '700', textTransform: 'uppercase' }}>Inkaso</div>
                  <div style={{ marginTop: '6px', fontSize: '19px', fontWeight: '750' }}>{portfolioProfitability.inkasnyProgressPercent === null ? '—' : `${portfolioProfitability.inkasnyProgressPercent.toFixed(0)} %`}</div>
                  <div style={{ marginTop: '3px', color: '#86868b', fontSize: '9px' }}>{euro(totals.received)} prijaté</div>
                </div>
              </div>
            </div>

            <div style={{ ...cardStyle, padding: '14px 16px', marginBottom: '14px' }}>
              <div className="finances-filter-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#86868b', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.05em' }}>Vyhľadať stavbu</label>
                  <input
                    type="search"
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Napíš názov stavby..."
                    style={{ width: '100%', minHeight: '40px', padding: '8px 10px', borderRadius: '9px', border: '1px solid #d2d2d7', backgroundColor: '#fff', color: '#1d1d1f', outline: 'none', boxSizing: 'border-box', fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', color: '#86868b', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.05em' }}>Zobraziť</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {[
                      ['vsetky', 'Všetky'],
                      ['aktivne', 'Aktívne'],
                      ['dokoncene', 'Dokončené'],
                    ].map(([key, label]) => {
                      const active = status === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setStatus(key as typeof status)}
                          style={{ minHeight: '40px', padding: '8px 12px', borderRadius: '9px', border: active ? '1px solid #0071e3' : '1px solid #d2d2d7', backgroundColor: active ? '#e8f3ff' : '#fff', color: active ? '#0066cc' : '#6e6e73', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ ...cardStyle, overflow: 'hidden', marginBottom: '14px' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #ededf0', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '750' }}>Mesačné náklady firmy</div>
                  <div style={{ marginTop: '3px', color: '#86868b', fontSize: '10px' }}>Súčet všetkých stavieb podľa kategórií vrátane automatických nákladov pracovníkov.</div>
                </div>
                <span style={{ padding: '4px 8px', borderRadius: '999px', backgroundColor: '#f5f5f7', color: '#6e6e73', fontSize: '9px', fontWeight: '750' }}>{monthlyBreakdown.length} mes.</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="finances-table" style={{ width: '100%', minWidth: '840px', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f7f7f8', borderBottom: '1px solid #ededf0', textAlign: 'left' }}>
                      {['Mesiac', ...FINANCE_CATEGORIES, 'Spolu'].map(label => (
                        <th key={label} style={{ padding: '10px 12px', color: '#86868b', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '.045em', fontWeight: '700', whiteSpace: 'nowrap' }}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyBreakdown.length === 0 ? (
                      <tr><td colSpan={7} style={{ padding: '26px 18px', textAlign: 'center', color: '#a1a1a6', fontSize: '11px' }}>Zatiaľ nie sú finančné dáta na mesačný rozpad.</td></tr>
                    ) : monthlyBreakdown.map(row => (
                      <tr key={row.key} style={{ borderBottom: '1px solid #ededf0' }}>
                        <td data-label="Mesiac" style={{ padding: '12px', fontWeight: '700', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{row.label}</td>
                        {FINANCE_CATEGORIES.map(category => (
                          <td key={category} data-label={category} style={{ padding: '12px', whiteSpace: 'nowrap', color: row.categories[category] > 0 ? '#1d1d1f' : '#a1a1a6' }}>
                            {row.categories[category] > 0 ? euro(row.categories[category]) : '—'}
                          </td>
                        ))}
                        <td data-label="Spolu" style={{ padding: '12px', fontWeight: '750', whiteSpace: 'nowrap' }}>{euro(row.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #ededf0', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '750' }}>Financie podľa stavieb</div>
                  <div style={{ marginTop: '3px', color: '#86868b', fontSize: '10px' }}>{filteredRows.length} zobrazených stavieb</div>
                </div>
                <div style={{ color: '#86868b', fontSize: '9px' }}>Cashflow ≠ zisk</div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="finances-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f7f7f8', borderBottom: '1px solid #ededf0', textAlign: 'left' }}>
                      {['Stavba', 'Budget', 'Náklady', 'Zostáva', 'Vyfakturované', 'Prijaté', 'Plán. zisk', 'Cashflow', 'Budget %', ''].map(label => (
                        <th key={label || 'action'} style={{ padding: '10px 12px', color: '#86868b', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '.045em', fontWeight: '700', whiteSpace: 'nowrap' }}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr><td colSpan={10} style={{ padding: '28px 18px', textAlign: 'center', color: '#a1a1a6', fontSize: '11px' }}>Žiadna stavba nezodpovedá filtru.</td></tr>
                    ) : filteredRows.map(row => {
                      const budgetExceeded = row.budget > 0 && row.costs > row.budget
                      return (
                        <tr key={row.id} style={{ borderBottom: '1px solid #ededf0' }}>
                          <td data-label="Stavba" style={{ padding: '12px', minWidth: '180px' }}>
                            <div style={{ fontWeight: '750', color: '#1d1d1f' }}>{row.nazov}</div>
                            <div style={{ marginTop: '3px', color: '#86868b', fontSize: '9px' }}>{row.stav || 'Aktívna'}</div>
                          </td>
                          <td data-label="Budget" style={{ padding: '12px', whiteSpace: 'nowrap', fontWeight: '650' }}>{euro(row.budget)}</td>
                          <td data-label="Náklady" style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: '700' }}>{euro(row.costs)}</div>
                            <div style={{ marginTop: '3px', color: '#86868b', fontSize: '8px', fontWeight: '650' }}>
                              faktúry {euro(row.supplierCosts)} · pracovníci {euro(row.laborCosts)} · ručné {euro(row.manualCosts)}
                            </div>
                            {row.overdueSupplierCount > 0 && (
                              <div style={{ marginTop: '3px', color: '#b42318', fontSize: '8px', fontWeight: '700' }}>
                                {row.overdueSupplierCount} FA po splatnosti · {euro(row.overdueSupplierCosts)}
                              </div>
                            )}
                            {row.laborMissingRates > 0 && (
                              <div style={{ marginTop: '3px', color: '#b42318', fontSize: '8px', fontWeight: '700' }}>
                                {row.laborMissingRates} pracovník bez sadzby
                              </div>
                            )}
                          </td>
                          <td data-label="Zostáva" style={{ padding: '12px', whiteSpace: 'nowrap', fontWeight: '700', color: row.remaining !== null && row.remaining < 0 ? '#b42318' : '#1d1d1f' }}>{row.remaining === null ? <span style={{ color: '#a1a1a6' }}>Nenastavený</span> : euro(row.remaining)}</td>
                          <td data-label="Vyfakturované" style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                            <div>{euro(row.invoiced)}</div>
                            <div style={{ marginTop: '3px', color: row.receivables > 0 ? '#9a6700' : '#86868b', fontSize: '8px', fontWeight: '650' }}>
                              pohľadávky {euro(row.receivables)}
                            </div>
                            {row.overdueClientInvoiceCount > 0 && (
                              <div style={{ marginTop: '3px', color: '#b42318', fontSize: '8px', fontWeight: '700' }}>
                                {row.overdueClientInvoiceCount} FA po splatnosti · {euro(row.overdueClientReceivables)}
                              </div>
                            )}
                          </td>
                          <td data-label="Prijaté" style={{ padding: '12px', whiteSpace: 'nowrap' }}>{euro(row.received)}</td>
                          <td data-label="Plán. zisk" style={{ padding: '12px', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: '750', color: row.hasPrice && row.hasBudget && row.plannedProfit < 0 ? '#b42318' : row.hasPrice && row.hasBudget ? '#047857' : '#a1a1a6' }}>{row.hasPrice && row.hasBudget ? euro(row.plannedProfit) : 'Nenastavené'}</div>
                            <div style={{ marginTop: '3px', color: '#86868b', fontSize: '8px' }}>{row.hasPrice && row.hasBudget && row.plannedMargin !== null ? `${row.plannedMargin.toFixed(1)} % marža` : 'chýba cena alebo budget'}</div>
                          </td>
                          <td data-label="Cashflow" style={{ padding: '12px', whiteSpace: 'nowrap', fontWeight: '750', color: row.cashflow < 0 ? '#b42318' : '#0066cc' }}>{euro(row.cashflow)}</td>
                          <td data-label="Budget %" style={{ padding: '12px', minWidth: '108px' }}>
                            {row.budget > 0 ? (
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', fontSize: '9px', color: budgetExceeded ? '#b42318' : '#6e6e73', fontWeight: '700' }}>
                                  <span>{row.usage.toFixed(0)} %</span>
                                  {budgetExceeded && <span>PREKROČ.</span>}
                                </div>
                                <div style={{ height: '5px', backgroundColor: '#ededf0', borderRadius: '99px', overflow: 'hidden', marginTop: '5px' }}>
                                  <div style={{ height: '100%', width: `${Math.min(100, row.usage)}%`, backgroundColor: budgetExceeded ? '#b42318' : '#0071e3', borderRadius: '99px' }} />
                                </div>
                              </div>
                            ) : (
                              <span style={{ color: '#a1a1a6' }}>—</span>
                            )}
                          </td>
                          <td data-label="Detail" style={{ padding: '12px', textAlign: 'right' }}>
                            <Link
                              className="finances-detail-link"
                              href={`/zakazky/${row.id}`}
                              style={{ display: 'inline-flex', alignItems: 'center', minHeight: '34px', padding: '6px 10px', borderRadius: '8px', backgroundColor: '#eef6ff', color: '#0071e3', textDecoration: 'none', fontSize: '10px', fontWeight: '750', whiteSpace: 'nowrap' }}
                            >
                              Detail →
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ marginTop: '10px', color: '#86868b', fontSize: '9px', lineHeight: 1.5 }}>
              Súhrn používa rovnaké reálne finančné údaje ako detail stavby. Vyfakturované a pohľadávky sa počítajú z faktúr klientovi; uhradené faktúry a zálohy vstupujú do prijatých platieb a cashflow.
            </div>
          </>
        )}
      </main>
    </div>
  )
}
