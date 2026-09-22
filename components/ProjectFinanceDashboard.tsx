'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/adminSupabase'
import { vypocitajNakladyPracovnikov } from '../lib/laborCosts'
import { FINANCE_CATEGORIES, vytvorMesacnyRozpadNakladov } from '../lib/financeBreakdown'
import { fakturyAkoNaklady, stavDodavatelskejFaktury, zhrnDodavatelskeFaktury } from '../lib/supplierInvoices'
import { stavKlientskejFaktury, zhrnKlientskeFaktury } from '../lib/clientInvoices'
import { vypocitajZiskovost } from '../lib/profitability'
import { vytvorUpozorneniaFaktur } from '../lib/financeAlerts'

type FinanceRow = {
  id?: number | string
  zakazka_id: number | string
  cena_zakazky: number | string
  budget_nakladov: number | string
  vyfakturovane: number | string
  prijate_platby: number | string
}

type ExpenseRow = {
  id: number | string
  zakazka_id: number | string
  datum: string
  popis: string
  kategoria: Category
  suma: number | string
  uhradene: boolean
  poznamka?: string | null
}

type PaymentRow = {
  id: number | string
  zakazka_id: number | string
  datum: string
  suma: number | string
  popis: string
  poznamka?: string | null
}

type AttendanceRow = {
  id: number | string
  meno: string
  datum: string
  zakazka: string
  prichod: string
  odchod: string
}

type EmployeeRow = {
  meno: string
  sadzba: number | string | null
}

type WorkerPaymentRow = {
  id: number | string
  zakazka_id: number | string
  meno: string
  datum: string
  suma: number | string
  poznamka?: string | null
}

type SupplierInvoiceRow = {
  id: number | string
  zakazka_id: number | string
  dodavatel: string
  cislo_faktury: string
  datum_vystavenia: string
  datum_splatnosti: string
  kategoria: Category
  suma: number | string
  uhradene: boolean
  datum_uhrady?: string | null
  poznamka?: string | null
}

type ClientInvoiceRow = {
  id: number | string
  zakazka_id: number | string
  cislo_faktury: string
  datum_vystavenia: string
  datum_splatnosti: string
  suma: number | string
  uhradene: boolean
  datum_uhrady?: string | null
  poznamka?: string | null
}

type ChartPoint = {
  month: string
  costs: number
  payments: number
}

type Category = 'Pracovníci' | 'Materiál' | 'Subdodávatelia' | 'Mechanizácia' | 'Ostatné'

const CATEGORIES: Category[] = ['Pracovníci', 'Materiál', 'Subdodávatelia', 'Mechanizácia', 'Ostatné']

const EMPTY_FINANCE = {
  cena_zakazky: 0,
  budget_nakladov: 0,
}

const cardStyle = {
  backgroundColor: '#ffffff',
  borderRadius: '14px',
  border: '1px solid rgba(0,0,0,0.08)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
}

const inputStyle = {
  width: '100%',
  minHeight: '44px',
  padding: '9px 11px',
  borderRadius: '9px',
  border: '1px solid #d2d2d7',
  backgroundColor: '#ffffff',
  color: '#1d1d1f',
  outline: 'none',
  fontSize: '13px',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block',
  marginBottom: '5px',
  color: '#86868b',
  fontSize: '9px',
  fontWeight: '700',
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
}

function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('sk-SK', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return year && month && day ? `${day}.${month}.${year}` : value
}

function today() {
  const date = new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function MetricCard({
  label,
  value,
  detail,
  tone = 'default',
}: {
  label: string
  value: string
  detail?: string
  tone?: 'default' | 'positive' | 'warning' | 'negative'
}) {
  const valueColor =
    tone === 'positive' ? '#047857' :
    tone === 'warning' ? '#9a6700' :
    tone === 'negative' ? '#b42318' :
    '#1d1d1f'

  return (
    <div style={{ ...cardStyle, padding: '17px 18px', minWidth: 0 }}>
      <div style={{ fontSize: '9px', color: '#86868b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.055em' }}>
        {label}
      </div>
      <div style={{ marginTop: '8px', color: valueColor, fontSize: '24px', fontWeight: '750', letterSpacing: '-0.035em', lineHeight: 1.1 }}>
        {value}
      </div>
      {detail && <div style={{ marginTop: '7px', color: '#86868b', fontSize: '10px', lineHeight: 1.45 }}>{detail}</div>}
    </div>
  )
}

function FinanceChart({ data }: { data: ChartPoint[] }) {
  if (data.length === 0) {
    return (
      <div style={{ padding: '30px 12px', textAlign: 'center', color: '#a1a1a6', fontSize: '11px' }}>
        Graf sa zobrazí po pridaní prvého nákladu alebo platby od klienta.
      </div>
    )
  }

  const maxValue = Math.max(1, ...data.flatMap(point => [point.costs, point.payments]))
  const roundedMax = Math.max(1000, Math.ceil(maxValue / 1000) * 1000)
  const left = 58
  const right = 655
  const top = 18
  const bottom = 194
  const denominator = Math.max(1, data.length - 1)
  const x = (index: number) => data.length === 1 ? (left + right) / 2 : left + (index / denominator) * (right - left)
  const y = (value: number) => bottom - (value / roundedMax) * (bottom - top)
  const path = (key: 'costs' | 'payments') =>
    data.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point[key])}`).join(' ')
  const ticks = [0, roundedMax * 0.25, roundedMax * 0.5, roundedMax * 0.75, roundedMax]

  return (
    <div>
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <svg viewBox="0 0 680 235" role="img" aria-label="Graf kumulatívnych nákladov a prijatých platieb" style={{ width: '100%', minWidth: '560px', display: 'block' }}>
          {ticks.map(tick => (
            <g key={tick}>
              <line x1={left} y1={y(tick)} x2={right} y2={y(tick)} stroke="#ededf0" strokeWidth="1" />
              <text x="8" y={y(tick) + 4} fontSize="10" fill="#86868b">{formatCurrency(tick)}</text>
            </g>
          ))}
          <line x1={left} y1={top} x2={left} y2={bottom} stroke="#c7c7cc" strokeWidth="1" />
          <line x1={left} y1={bottom} x2={right} y2={bottom} stroke="#c7c7cc" strokeWidth="1" />
          <path d={path('costs')} fill="none" stroke="#5f6368" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d={path('payments')} fill="none" stroke="#0071e3" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {data.map((point, index) => (
            <g key={point.month}>
              <circle cx={x(index)} cy={y(point.costs)} r="3.5" fill="#5f6368" />
              <circle cx={x(index)} cy={y(point.payments)} r="3.5" fill="#0071e3" />
              <text x={x(index)} y="218" textAnchor="middle" fontSize="10" fill="#86868b">{point.month}</text>
            </g>
          ))}
        </svg>
      </div>
      <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginTop: '8px', fontSize: '10px', color: '#6e6e73' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '18px', height: '3px', backgroundColor: '#5f6368', borderRadius: '99px' }} /> Kumulatívne náklady
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '18px', height: '3px', backgroundColor: '#0071e3', borderRadius: '99px' }} /> Prijaté platby
        </span>
      </div>
    </div>
  )
}

export default function ProjectFinanceDashboard({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [finance, setFinance] = useState<FinanceRow | null>(null)
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [attendance, setAttendance] = useState<AttendanceRow[]>([])
  const [employees, setEmployees] = useState<EmployeeRow[]>([])
  const [workerPayments, setWorkerPayments] = useState<WorkerPaymentRow[]>([])
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoiceRow[]>([])
  const [clientInvoices, setClientInvoices] = useState<ClientInvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [financeOpen, setFinanceOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [workerPaymentOpen, setWorkerPaymentOpen] = useState(false)
  const [supplierInvoiceOpen, setSupplierInvoiceOpen] = useState(false)
  const [clientInvoiceOpen, setClientInvoiceOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<ExpenseRow | null>(null)
  const [editingPayment, setEditingPayment] = useState<PaymentRow | null>(null)
  const [editingWorkerPayment, setEditingWorkerPayment] = useState<WorkerPaymentRow | null>(null)
  const [editingSupplierInvoice, setEditingSupplierInvoice] = useState<SupplierInvoiceRow | null>(null)
  const [editingClientInvoice, setEditingClientInvoice] = useState<ClientInvoiceRow | null>(null)
  const [saving, setSaving] = useState(false)

  const [financeForm, setFinanceForm] = useState(EMPTY_FINANCE)
  const [expenseForm, setExpenseForm] = useState({
    datum: today(),
    popis: '',
    kategoria: 'Materiál' as Category,
    suma: 0,
    uhradene: true,
    poznamka: '',
  })
  const [paymentForm, setPaymentForm] = useState({
    datum: today(),
    suma: 0,
    popis: 'Prijatá záloha',
    poznamka: '',
  })
  const [workerPaymentForm, setWorkerPaymentForm] = useState({
    meno: '',
    datum: today(),
    suma: 0,
    poznamka: '',
  })
  const [supplierInvoiceForm, setSupplierInvoiceForm] = useState({
    dodavatel: '',
    cislo_faktury: '',
    datum_vystavenia: today(),
    datum_splatnosti: today(),
    kategoria: 'Materiál' as Category,
    suma: 0,
    uhradene: false,
    datum_uhrady: '',
    poznamka: '',
  })
  const [clientInvoiceForm, setClientInvoiceForm] = useState({
    cislo_faktury: '',
    datum_vystavenia: today(),
    datum_splatnosti: today(),
    suma: 0,
    uhradene: false,
    datum_uhrady: '',
    poznamka: '',
  })

  async function loadFinance() {
    setLoading(true)
    setMessage('')

    const [
      { data: financeData, error: financeError },
      { data: expenseData, error: expenseError },
      { data: paymentData, error: paymentError },
      { data: attendanceData, error: attendanceError },
      { data: employeeData, error: employeeError },
      { data: workerPaymentData, error: workerPaymentError },
      { data: supplierInvoiceData, error: supplierInvoiceError },
      { data: clientInvoiceData, error: clientInvoiceError },
    ] = await Promise.all([
      supabase
        .from('financie_stavby')
        .select('*')
        .eq('zakazka_id', projectId)
        .maybeSingle(),
      supabase
        .from('naklady_stavby')
        .select('*')
        .eq('zakazka_id', projectId)
        .order('datum', { ascending: false })
        .order('id', { ascending: false }),
      supabase
        .from('platby_stavby')
        .select('*')
        .eq('zakazka_id', projectId)
        .order('datum', { ascending: false })
        .order('id', { ascending: false }),
      supabase
        .from('dochadzka')
        .select('id,meno,datum,zakazka,prichod,odchod'),
      supabase
        .from('zamestnanci')
        .select('meno,sadzba'),
      supabase
        .from('uhrady_pracovnikov')
        .select('*')
        .eq('zakazka_id', projectId)
        .order('datum', { ascending: false })
        .order('id', { ascending: false }),
      supabase
        .from('faktury_dodavatelov')
        .select('*')
        .eq('zakazka_id', projectId)
        .order('datum_splatnosti', { ascending: true })
        .order('id', { ascending: false }),
      supabase
        .from('faktury_klientov')
        .select('*')
        .eq('zakazka_id', projectId)
        .order('datum_vystavenia', { ascending: false })
        .order('id', { ascending: false }),
    ])

    if (financeError || expenseError || paymentError || attendanceError || employeeError || workerPaymentError || supplierInvoiceError || clientInvoiceError) {
      console.error('Chyba načítania financií:', financeError || expenseError || paymentError || attendanceError || employeeError || workerPaymentError || supplierInvoiceError || clientInvoiceError)
      setMessage('Finančné údaje sa nepodarilo načítať kompletne.')
    }

    setFinance((financeData as FinanceRow | null) || null)
    setExpenses((expenseData as ExpenseRow[]) || [])
    setPayments((paymentData as PaymentRow[]) || [])
    setAttendance((attendanceData as AttendanceRow[]) || [])
    setEmployees((employeeData as EmployeeRow[]) || [])
    setWorkerPayments((workerPaymentData as WorkerPaymentRow[]) || [])
    setSupplierInvoices((supplierInvoiceData as SupplierInvoiceRow[]) || [])
    setClientInvoices((clientInvoiceData as ClientInvoiceRow[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    loadFinance()
  }, [projectId])

  const otherReceivedPayments = useMemo(
    () => payments.reduce((sum, payment) => sum + numberValue(payment.suma), 0),
    [payments]
  )

  const clientInvoiceSummary = useMemo(
    () => zhrnKlientskeFaktury(clientInvoices, today()),
    [clientInvoices]
  )

  const legacyInvoiced = numberValue(finance?.vyfakturovane)
  const values = useMemo(() => ({
    cena: numberValue(finance?.cena_zakazky),
    budget: numberValue(finance?.budget_nakladov),
    vyfakturovane: clientInvoices.length > 0 ? clientInvoiceSummary.vyfakturovane : legacyInvoiced,
    prijate: clientInvoiceSummary.prijate + otherReceivedPayments,
  }), [finance, clientInvoices.length, clientInvoiceSummary, legacyInvoiced, otherReceivedPayments])

  const laborEntries = useMemo(
    () => vypocitajNakladyPracovnikov(attendance, employees)
      .filter(entry => entry.zakazka === projectName.trim()),
    [attendance, employees, projectName]
  )

  const laborCosts = useMemo(
    () => laborEntries.reduce((sum, entry) => sum + entry.suma, 0),
    [laborEntries]
  )
  const laborHours = useMemo(
    () => laborEntries.reduce((sum, entry) => sum + entry.hodiny, 0),
    [laborEntries]
  )
  const laborWorkers = useMemo(
    () => new Set(laborEntries.map(entry => entry.meno)).size,
    [laborEntries]
  )
  const laborMissingRates = useMemo(
    () => Array.from(new Set(laborEntries.filter(entry => !entry.maSadzbu && entry.hodiny > 0).map(entry => entry.meno))),
    [laborEntries]
  )
  const laborByWorker = useMemo(() => {
    const map = new Map<string, { hodiny: number; suma: number; sadzba: number }>()
    laborEntries.forEach(entry => {
      const current = map.get(entry.meno) || { hodiny: 0, suma: 0, sadzba: entry.sadzba }
      current.hodiny += entry.hodiny
      current.suma += entry.suma
      current.sadzba = entry.sadzba
      map.set(entry.meno, current)
    })
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'sk'))
  }, [laborEntries])

  const paidLaborByWorker = useMemo(() => {
    const map = new Map<string, number>()
    workerPayments.forEach(payment => {
      map.set(payment.meno, (map.get(payment.meno) || 0) + numberValue(payment.suma))
    })
    return map
  }, [workerPayments])

  const paidLaborCosts = useMemo(
    () => workerPayments.reduce((sum, payment) => sum + numberValue(payment.suma), 0),
    [workerPayments]
  )
  const outstandingLaborCosts = Math.max(0, laborCosts - paidLaborCosts)

  const manualCosts = useMemo(
    () => expenses.reduce((sum, expense) => sum + numberValue(expense.suma), 0),
    [expenses]
  )
  const supplierInvoiceSummary = useMemo(
    () => zhrnDodavatelskeFaktury(supplierInvoices, today()),
    [supplierInvoices]
  )
  const supplierInvoiceCosts = supplierInvoiceSummary.spolu
  const paidSupplierInvoiceCosts = supplierInvoiceSummary.uhradene
  const currentCosts = manualCosts + laborCosts + supplierInvoiceCosts

  const paidCosts = useMemo(
    () => expenses.filter(expense => expense.uhradene !== false).reduce((sum, expense) => sum + numberValue(expense.suma), 0),
    [expenses]
  )
  const unpaidCosts = manualCosts - paidCosts

  const remainingBudget = values.budget - currentCosts
  const unpaid = clientInvoices.length > 0
    ? clientInvoiceSummary.pohladavky
    : Math.max(0, values.vyfakturovane - otherReceivedPayments)
  const profitability = useMemo(
    () => vypocitajZiskovost({
      cenaZakazky: values.cena,
      budgetNakladov: values.budget,
      aktualneNaklady: currentCosts,
      vyfakturovane: values.vyfakturovane,
      prijate: values.prijate,
    }),
    [values.cena, values.budget, values.vyfakturovane, values.prijate, currentCosts]
  )
  const currentCashflow = values.prijate - paidCosts - paidLaborCosts - paidSupplierInvoiceCosts
  const budgetPercent = values.budget > 0 ? (currentCosts / values.budget) * 100 : 0
  const budgetExceeded = values.budget > 0 && currentCosts > values.budget

  const supplierAlerts = useMemo(
    () => vytvorUpozorneniaFaktur(supplierInvoices, today(), 7),
    [supplierInvoices]
  )
  const clientAlerts = useMemo(
    () => vytvorUpozorneniaFaktur(clientInvoices, today(), 7),
    [clientInvoices]
  )
  const budgetAlert = values.budget > 0 && budgetPercent >= 90
  const missingPrice = values.cena <= 0 && currentCosts > 0
  const missingBudget = values.budget <= 0 && currentCosts > 0
  const financeSetupAlert = missingPrice || missingBudget
  const financeAlertCount = supplierAlerts.length + clientAlerts.length + (budgetAlert ? 1 : 0) + (financeSetupAlert ? 1 : 0)

  const categoryTotals = useMemo(() => {
    const totals = Object.fromEntries(CATEGORIES.map(category => [category, 0])) as Record<Category, number>
    expenses.forEach(expense => {
      totals[expense.kategoria] = (totals[expense.kategoria] || 0) + numberValue(expense.suma)
    })
    supplierInvoices.forEach(invoice => {
      totals[invoice.kategoria] = (totals[invoice.kategoria] || 0) + numberValue(invoice.suma)
    })
    totals['Pracovníci'] += laborCosts
    return totals
  }, [expenses, supplierInvoices, laborCosts])

  const monthlyBreakdown = useMemo(
    () => vytvorMesacnyRozpadNakladov([...expenses, ...fakturyAkoNaklady(supplierInvoices)], laborEntries),
    [expenses, supplierInvoices, laborEntries]
  )

  const chartData = useMemo<ChartPoint[]>(() => {
    const months = new Set<string>()
    expenses.forEach(expense => expense.datum && months.add(expense.datum.slice(0, 7)))
    supplierInvoices.forEach(invoice => invoice.datum_vystavenia && months.add(invoice.datum_vystavenia.slice(0, 7)))
    payments.forEach(payment => payment.datum && months.add(payment.datum.slice(0, 7)))
    clientInvoices.forEach(invoice => invoice.uhradene && invoice.datum_uhrady && months.add(invoice.datum_uhrady.slice(0, 7)))
    laborEntries.forEach(entry => entry.datum && months.add(entry.datum.slice(0, 7)))
    const sorted = Array.from(months).sort()
    if (sorted.length === 0) return []

    const [startYear, startMonth] = sorted[0].split('-').map(Number)
    const [endYear, endMonth] = sorted[sorted.length - 1].split('-').map(Number)
    const monthKeys: string[] = []
    let year = startYear
    let month = startMonth
    while (year < endYear || (year === endYear && month <= endMonth)) {
      monthKeys.push(`${year}-${String(month).padStart(2, '0')}`)
      month += 1
      if (month === 13) {
        month = 1
        year += 1
      }
    }

    const costsByMonth = new Map<string, number>()
    const paymentsByMonth = new Map<string, number>()
    expenses.forEach(expense => {
      const key = expense.datum.slice(0, 7)
      costsByMonth.set(key, (costsByMonth.get(key) || 0) + numberValue(expense.suma))
    })
    supplierInvoices.forEach(invoice => {
      const key = invoice.datum_vystavenia.slice(0, 7)
      costsByMonth.set(key, (costsByMonth.get(key) || 0) + numberValue(invoice.suma))
    })
    laborEntries.forEach(entry => {
      const key = entry.datum.slice(0, 7)
      costsByMonth.set(key, (costsByMonth.get(key) || 0) + entry.suma)
    })
    payments.forEach(payment => {
      const key = payment.datum.slice(0, 7)
      paymentsByMonth.set(key, (paymentsByMonth.get(key) || 0) + numberValue(payment.suma))
    })
    clientInvoices.forEach(invoice => {
      if (!invoice.uhradene || !invoice.datum_uhrady) return
      const key = invoice.datum_uhrady.slice(0, 7)
      paymentsByMonth.set(key, (paymentsByMonth.get(key) || 0) + numberValue(invoice.suma))
    })

    let cumulativeCosts = 0
    let cumulativePayments = 0
    return monthKeys.map(key => {
      cumulativeCosts += costsByMonth.get(key) || 0
      cumulativePayments += paymentsByMonth.get(key) || 0
      const [y, m] = key.split('-').map(Number)
      return {
        month: new Date(y, m - 1, 1).toLocaleDateString('sk-SK', { month: 'short', year: '2-digit' }),
        costs: cumulativeCosts,
        payments: cumulativePayments,
      }
    })
  }, [expenses, supplierInvoices, payments, clientInvoices, laborEntries])

  function openFinanceEditor() {
    setFinanceForm({
      cena_zakazky: values.cena,
      budget_nakladov: values.budget,
    })
    setFinanceOpen(true)
  }

  async function saveFinance(event: FormEvent) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setMessage('')

    const payload = {
      zakazka_id: Number(projectId),
      cena_zakazky: Math.max(0, numberValue(financeForm.cena_zakazky)),
      budget_nakladov: Math.max(0, numberValue(financeForm.budget_nakladov)),
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('financie_stavby')
      .upsert(payload, { onConflict: 'zakazka_id' })

    setSaving(false)
    if (error) {
      console.error('Chyba uloženia financií:', error)
      setMessage('Financie sa nepodarilo uložiť.')
      return
    }

    setFinanceOpen(false)
    setMessage('Finančný prehľad bol uložený.')
    await loadFinance()
  }

  function openNewExpense() {
    setEditingExpense(null)
    setExpenseForm({
      datum: today(),
      popis: '',
      kategoria: 'Materiál',
      suma: 0,
      uhradene: true,
      poznamka: '',
    })
    setExpenseOpen(true)
  }

  function openExpenseEdit(expense: ExpenseRow) {
    setEditingExpense(expense)
    setExpenseForm({
      datum: expense.datum,
      popis: expense.popis,
      kategoria: expense.kategoria,
      suma: numberValue(expense.suma),
      uhradene: expense.uhradene !== false,
      poznamka: expense.poznamka || '',
    })
    setExpenseOpen(true)
  }

  async function saveExpense(event: FormEvent) {
    event.preventDefault()
    if (saving) return

    const popis = expenseForm.popis.trim()
    const suma = numberValue(expenseForm.suma)
    if (!expenseForm.datum || !popis || suma <= 0) {
      setMessage('Vyplňte dátum, popis a sumu vyššiu ako 0 €.')
      return
    }

    setSaving(true)
    setMessage('')
    const payload = {
      zakazka_id: Number(projectId),
      datum: expenseForm.datum,
      popis,
      kategoria: expenseForm.kategoria,
      suma,
      uhradene: expenseForm.uhradene,
      poznamka: expenseForm.poznamka.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const query = editingExpense
      ? supabase.from('naklady_stavby').update(payload).eq('id', editingExpense.id).eq('zakazka_id', projectId)
      : supabase.from('naklady_stavby').insert([payload])

    const { error } = await query
    setSaving(false)

    if (error) {
      console.error('Chyba uloženia nákladu:', error)
      setMessage('Náklad sa nepodarilo uložiť.')
      return
    }

    setExpenseOpen(false)
    setEditingExpense(null)
    setMessage(editingExpense ? 'Náklad bol upravený.' : 'Náklad bol pridaný.')
    await loadFinance()
  }

  function openNewClientInvoice() {
    setEditingClientInvoice(null)
    setClientInvoiceForm({
      cislo_faktury: '',
      datum_vystavenia: today(),
      datum_splatnosti: today(),
      suma: 0,
      uhradene: false,
      datum_uhrady: '',
      poznamka: '',
    })
    setClientInvoiceOpen(true)
  }

  function openClientInvoiceEdit(invoice: ClientInvoiceRow) {
    setEditingClientInvoice(invoice)
    setClientInvoiceForm({
      cislo_faktury: invoice.cislo_faktury,
      datum_vystavenia: invoice.datum_vystavenia,
      datum_splatnosti: invoice.datum_splatnosti,
      suma: numberValue(invoice.suma),
      uhradene: invoice.uhradene === true,
      datum_uhrady: invoice.datum_uhrady || '',
      poznamka: invoice.poznamka || '',
    })
    setClientInvoiceOpen(true)
  }

  async function saveClientInvoice(event: FormEvent) {
    event.preventDefault()
    if (saving) return

    const cisloFaktury = clientInvoiceForm.cislo_faktury.trim()
    const suma = numberValue(clientInvoiceForm.suma)
    if (!cisloFaktury || !clientInvoiceForm.datum_vystavenia || !clientInvoiceForm.datum_splatnosti || suma <= 0) {
      setMessage('Vyplňte číslo faktúry, dátumy a sumu vyššiu ako 0 €.')
      return
    }
    if (clientInvoiceForm.datum_splatnosti < clientInvoiceForm.datum_vystavenia) {
      setMessage('Dátum splatnosti nemôže byť pred dátumom vystavenia.')
      return
    }

    setSaving(true)
    setMessage('')
    const payload = {
      zakazka_id: Number(projectId),
      cislo_faktury: cisloFaktury,
      datum_vystavenia: clientInvoiceForm.datum_vystavenia,
      datum_splatnosti: clientInvoiceForm.datum_splatnosti,
      suma,
      uhradene: clientInvoiceForm.uhradene,
      datum_uhrady: clientInvoiceForm.uhradene ? (clientInvoiceForm.datum_uhrady || today()) : null,
      poznamka: clientInvoiceForm.poznamka.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const query = editingClientInvoice
      ? supabase.from('faktury_klientov').update(payload).eq('id', editingClientInvoice.id).eq('zakazka_id', projectId)
      : supabase.from('faktury_klientov').insert([payload])

    const { error } = await query
    setSaving(false)

    if (error) {
      console.error('Chyba uloženia faktúry klientovi:', error)
      setMessage((error as { code?: string }).code === '23505'
        ? 'Faktúra s týmto číslom už existuje.'
        : 'Faktúru klientovi sa nepodarilo uložiť.')
      return
    }

    setClientInvoiceOpen(false)
    setEditingClientInvoice(null)
    setMessage(editingClientInvoice ? 'Faktúra klientovi bola upravená.' : 'Faktúra klientovi bola pridaná.')
    await loadFinance()
  }

  async function deleteClientInvoice(invoice: ClientInvoiceRow) {
    if (!confirm(`Naozaj odstrániť vystavenú faktúru ${invoice.cislo_faktury}?`)) return
    const { error } = await supabase
      .from('faktury_klientov')
      .delete()
      .eq('id', invoice.id)
      .eq('zakazka_id', projectId)

    if (error) {
      console.error('Chyba mazania faktúry klientovi:', error)
      setMessage('Faktúru klientovi sa nepodarilo odstrániť.')
      return
    }

    setMessage('Faktúra klientovi bola odstránená.')
    await loadFinance()
  }

  function openNewSupplierInvoice() {
    setEditingSupplierInvoice(null)
    setSupplierInvoiceForm({
      dodavatel: '',
      cislo_faktury: '',
      datum_vystavenia: today(),
      datum_splatnosti: today(),
      kategoria: 'Materiál',
      suma: 0,
      uhradene: false,
      datum_uhrady: '',
      poznamka: '',
    })
    setSupplierInvoiceOpen(true)
  }

  function openSupplierInvoiceEdit(invoice: SupplierInvoiceRow) {
    setEditingSupplierInvoice(invoice)
    setSupplierInvoiceForm({
      dodavatel: invoice.dodavatel,
      cislo_faktury: invoice.cislo_faktury,
      datum_vystavenia: invoice.datum_vystavenia,
      datum_splatnosti: invoice.datum_splatnosti,
      kategoria: invoice.kategoria,
      suma: numberValue(invoice.suma),
      uhradene: invoice.uhradene === true,
      datum_uhrady: invoice.datum_uhrady || '',
      poznamka: invoice.poznamka || '',
    })
    setSupplierInvoiceOpen(true)
  }

  async function saveSupplierInvoice(event: FormEvent) {
    event.preventDefault()
    if (saving) return

    const dodavatel = supplierInvoiceForm.dodavatel.trim()
    const cisloFaktury = supplierInvoiceForm.cislo_faktury.trim()
    const suma = numberValue(supplierInvoiceForm.suma)

    if (!dodavatel || !cisloFaktury || !supplierInvoiceForm.datum_vystavenia || !supplierInvoiceForm.datum_splatnosti || suma <= 0) {
      setMessage('Vyplňte dodávateľa, číslo faktúry, dátumy a sumu vyššiu ako 0 €.')
      return
    }
    if (supplierInvoiceForm.datum_splatnosti < supplierInvoiceForm.datum_vystavenia) {
      setMessage('Dátum splatnosti nemôže byť pred dátumom vystavenia.')
      return
    }

    setSaving(true)
    setMessage('')
    const payload = {
      zakazka_id: Number(projectId),
      dodavatel,
      cislo_faktury: cisloFaktury,
      datum_vystavenia: supplierInvoiceForm.datum_vystavenia,
      datum_splatnosti: supplierInvoiceForm.datum_splatnosti,
      kategoria: supplierInvoiceForm.kategoria,
      suma,
      uhradene: supplierInvoiceForm.uhradene,
      datum_uhrady: supplierInvoiceForm.uhradene ? (supplierInvoiceForm.datum_uhrady || today()) : null,
      poznamka: supplierInvoiceForm.poznamka.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const query = editingSupplierInvoice
      ? supabase.from('faktury_dodavatelov').update(payload).eq('id', editingSupplierInvoice.id).eq('zakazka_id', projectId)
      : supabase.from('faktury_dodavatelov').insert([payload])

    const { error } = await query
    setSaving(false)

    if (error) {
      console.error('Chyba uloženia dodávateľskej faktúry:', error)
      setMessage('Dodávateľskú faktúru sa nepodarilo uložiť.')
      return
    }

    setSupplierInvoiceOpen(false)
    setEditingSupplierInvoice(null)
    setMessage(editingSupplierInvoice ? 'Dodávateľská faktúra bola upravená.' : 'Dodávateľská faktúra bola pridaná.')
    await loadFinance()
  }

  async function deleteSupplierInvoice(invoice: SupplierInvoiceRow) {
    if (!confirm(`Naozaj odstrániť faktúru ${invoice.cislo_faktury} od ${invoice.dodavatel}?`)) return
    const { error } = await supabase
      .from('faktury_dodavatelov')
      .delete()
      .eq('id', invoice.id)
      .eq('zakazka_id', projectId)

    if (error) {
      console.error('Chyba mazania dodávateľskej faktúry:', error)
      setMessage('Dodávateľskú faktúru sa nepodarilo odstrániť.')
      return
    }

    setMessage('Dodávateľská faktúra bola odstránená.')
    await loadFinance()
  }

  function getWorkerOutstanding(meno: string) {
    const labor = laborByWorker.find(([workerName]) => workerName === meno)?.[1]
    const accrued = labor?.suma || 0
    const paid = paidLaborByWorker.get(meno) || 0
    return Math.max(0, accrued - paid)
  }

  function openNewWorkerPayment(meno?: string) {
    const selectedName = meno || laborByWorker.find(([workerName]) => getWorkerOutstanding(workerName) > 0)?.[0] || laborByWorker[0]?.[0] || ''
    setEditingWorkerPayment(null)
    setWorkerPaymentForm({
      meno: selectedName,
      datum: today(),
      suma: selectedName ? getWorkerOutstanding(selectedName) : 0,
      poznamka: '',
    })
    setWorkerPaymentOpen(true)
  }

  function openWorkerPaymentEdit(payment: WorkerPaymentRow) {
    setEditingWorkerPayment(payment)
    setWorkerPaymentForm({
      meno: payment.meno,
      datum: payment.datum,
      suma: numberValue(payment.suma),
      poznamka: payment.poznamka || '',
    })
    setWorkerPaymentOpen(true)
  }

  async function saveWorkerPayment(event: FormEvent) {
    event.preventDefault()
    if (saving) return

    const meno = workerPaymentForm.meno.trim()
    const suma = numberValue(workerPaymentForm.suma)
    if (!meno || !workerPaymentForm.datum || suma <= 0) {
      setMessage('Vyberte pracovníka, dátum a sumu vyššiu ako 0 €.')
      return
    }

    setSaving(true)
    setMessage('')
    const payload = {
      zakazka_id: Number(projectId),
      meno,
      datum: workerPaymentForm.datum,
      suma,
      poznamka: workerPaymentForm.poznamka.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const query = editingWorkerPayment
      ? supabase.from('uhrady_pracovnikov').update(payload).eq('id', editingWorkerPayment.id).eq('zakazka_id', projectId)
      : supabase.from('uhrady_pracovnikov').insert([payload])

    const { error } = await query
    setSaving(false)

    if (error) {
      console.error('Chyba uloženia úhrady pracovníka:', error)
      setMessage('Úhradu pracovníka sa nepodarilo uložiť.')
      return
    }

    setWorkerPaymentOpen(false)
    setEditingWorkerPayment(null)
    setMessage(editingWorkerPayment ? 'Úhrada pracovníka bola upravená.' : 'Úhrada pracovníka bola pridaná do cashflow.')
    await loadFinance()
  }

  async function deleteWorkerPayment(payment: WorkerPaymentRow) {
    if (!confirm(`Naozaj odstrániť úhradu ${payment.meno} vo výške ${formatCurrency(numberValue(payment.suma))}?`)) return
    const { error } = await supabase
      .from('uhrady_pracovnikov')
      .delete()
      .eq('id', payment.id)
      .eq('zakazka_id', projectId)

    if (error) {
      console.error('Chyba mazania úhrady pracovníka:', error)
      setMessage('Úhradu pracovníka sa nepodarilo odstrániť.')
      return
    }

    setMessage('Úhrada pracovníka bola odstránená.')
    await loadFinance()
  }

  function openNewPayment() {
    setEditingPayment(null)
    setPaymentForm({
      datum: today(),
      suma: 0,
      popis: 'Prijatá záloha',
      poznamka: '',
    })
    setPaymentOpen(true)
  }

  function openPaymentEdit(payment: PaymentRow) {
    setEditingPayment(payment)
    setPaymentForm({
      datum: payment.datum,
      suma: numberValue(payment.suma),
      popis: payment.popis,
      poznamka: payment.poznamka || '',
    })
    setPaymentOpen(true)
  }

  async function savePayment(event: FormEvent) {
    event.preventDefault()
    if (saving) return

    const suma = numberValue(paymentForm.suma)
    const popis = paymentForm.popis.trim()
    if (!paymentForm.datum || !popis || suma <= 0) {
      setMessage('Vyplňte dátum, popis a sumu platby vyššiu ako 0 €.')
      return
    }

    setSaving(true)
    setMessage('')
    const payload = {
      zakazka_id: Number(projectId),
      datum: paymentForm.datum,
      suma,
      popis,
      poznamka: paymentForm.poznamka.trim() || null,
      updated_at: new Date().toISOString(),
    }

    const query = editingPayment
      ? supabase.from('platby_stavby').update(payload).eq('id', editingPayment.id).eq('zakazka_id', projectId)
      : supabase.from('platby_stavby').insert([payload])

    const { error } = await query
    setSaving(false)

    if (error) {
      console.error('Chyba uloženia platby:', error)
      setMessage('Platbu sa nepodarilo uložiť.')
      return
    }

    setPaymentOpen(false)
    setEditingPayment(null)
    setMessage(editingPayment ? 'Platba bola upravená.' : 'Platba bola pridaná.')
    await loadFinance()
  }

  async function deletePayment(payment: PaymentRow) {
    if (!confirm(`Naozaj odstrániť platbu „${payment.popis}“?`)) return
    const { error } = await supabase
      .from('platby_stavby')
      .delete()
      .eq('id', payment.id)
      .eq('zakazka_id', projectId)

    if (error) {
      console.error('Chyba mazania platby:', error)
      setMessage('Platbu sa nepodarilo odstrániť.')
      return
    }

    setMessage('Platba bola odstránená.')
    await loadFinance()
  }

  async function deleteExpense(expense: ExpenseRow) {
    if (!confirm(`Naozaj odstrániť náklad „${expense.popis}“?`)) return
    const { error } = await supabase
      .from('naklady_stavby')
      .delete()
      .eq('id', expense.id)
      .eq('zakazka_id', projectId)

    if (error) {
      console.error('Chyba mazania nákladu:', error)
      setMessage('Náklad sa nepodarilo odstrániť.')
      return
    }

    setMessage('Náklad bol odstránený.')
    await loadFinance()
  }

  if (loading) {
    return <div style={{ ...cardStyle, padding: '28px', color: '#86868b', fontSize: '12px' }}>Načítavam finančný prehľad…</div>
  }

  return (
    <div>
      <style>{`
        .finance-metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
        }
        .finance-two-column {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(300px, .65fr);
          gap: 14px;
        }
        .finance-expense-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        @media (max-width: 1180px) {
          .finance-metrics-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .finance-two-column {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .finance-metrics-grid {
            grid-template-columns: 1fr;
          }
          .finance-action-row > button {
            width: 100%;
          }
          .finance-modal-card {
            border-radius: 16px 16px 0 0 !important;
            width: 100% !important;
            max-height: 92dvh;
            overflow: auto;
          }
          .finance-modal-backdrop {
            align-items: flex-end !important;
            padding: 0 !important;
          }
          .finance-form-grid {
            grid-template-columns: 1fr !important;
          }
          .finance-expense-table {
            display: block;
          }
          .finance-expense-table thead {
            display: none;
          }
          .finance-expense-table tbody {
            display: grid;
            gap: 10px;
          }
          .finance-expense-table tr {
            display: block;
            border: 1px solid #e5e5e7;
            border-radius: 13px;
            overflow: hidden;
          }
          .finance-expense-table td {
            display: grid;
            grid-template-columns: 82px minmax(0,1fr);
            gap: 10px;
            align-items: center;
            min-height: 42px;
            padding: 9px 12px !important;
            border-bottom: 1px solid rgba(0,0,0,.055);
          }
          .finance-expense-table td::before {
            content: attr(data-label);
            color: #86868b;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .04em;
          }
          .finance-expense-table td:last-child {
            border-bottom: 0;
          }
        }
      `}</style>

      <div className="finance-action-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
        <div>
          <div style={{ fontSize: '17px', fontWeight: '750', letterSpacing: '-0.02em' }}>Finančný prehľad stavby</div>
          <div style={{ marginTop: '3px', color: '#86868b', fontSize: '10px' }}>Mzdy sa počítajú automaticky z dochádzky. Vyfakturované a prijaté platby sa počítajú z vystavených faktúr klientovi a prípadných záloh.</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button type="button" onClick={openFinanceEditor} style={{ minHeight: '38px', padding: '8px 14px', border: '1px solid #d2d2d7', borderRadius: '10px', backgroundColor: '#fff', color: '#1d1d1f', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>
            Upraviť financie
          </button>
          <button type="button" onClick={openNewClientInvoice} style={{ minHeight: '38px', padding: '8px 14px', border: '1px solid #b9d8f8', borderRadius: '10px', backgroundColor: '#eef6ff', color: '#0066cc', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>
            + Faktúra klientovi
          </button>
          <button type="button" onClick={openNewSupplierInvoice} style={{ minHeight: '38px', padding: '8px 14px', border: '1px solid #d2d2d7', borderRadius: '10px', backgroundColor: '#fff', color: '#1d1d1f', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>
            + Faktúra dodávateľa
          </button>
          <button type="button" onClick={() => openNewWorkerPayment()} disabled={laborByWorker.length === 0} style={{ minHeight: '38px', padding: '8px 14px', border: '1px solid #d2d2d7', borderRadius: '10px', backgroundColor: '#fff', color: '#1d1d1f', cursor: laborByWorker.length === 0 ? 'not-allowed' : 'pointer', fontSize: '11px', fontWeight: '700', opacity: laborByWorker.length === 0 ? .5 : 1 }}>
            + Vyplatiť pracovníka
          </button>
          <button type="button" onClick={openNewPayment} style={{ minHeight: '38px', padding: '8px 14px', border: '1px solid #b9d8f8', borderRadius: '10px', backgroundColor: '#eef6ff', color: '#0066cc', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>
            + Prijatá záloha
          </button>
          <button type="button" onClick={openNewExpense} style={{ minHeight: '38px', padding: '8px 14px', border: 'none', borderRadius: '10px', backgroundColor: '#0071e3', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>
            + Pridať náklad
          </button>
        </div>
      </div>

      {message && (
        <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#f7f7f8', border: '1px solid #e5e5e7', color: '#4b4b4f', fontSize: '11px' }}>
          {message}
        </div>
      )}

      <div className="finance-metrics-grid">
        <MetricCard label="Cena zákazky" value={values.cena > 0 ? formatCurrency(values.cena) : '—'} detail={values.cena > 0 ? 'Dohodnutá cena s klientom' : 'Cena zákazky nie je nastavená'} />
        <MetricCard label="Budget nákladov" value={values.budget > 0 ? formatCurrency(values.budget) : '—'} detail={values.budget > 0 ? 'Maximálny plánovaný náklad' : 'Budget nákladov nie je nastavený'} />
        <MetricCard label="Aktuálne náklady" value={formatCurrency(currentCosts)} detail={`Ručné ${formatCurrency(manualCosts)} + faktúry ${formatCurrency(supplierInvoiceCosts)} + pracovníci ${formatCurrency(laborCosts)}`} />
        <MetricCard label="Zostáva z budgetu" value={values.budget > 0 ? formatCurrency(remainingBudget) : '—'} detail={values.budget > 0 ? 'Budget mínus aktuálne náklady' : 'Najprv nastav budget'} tone={values.budget > 0 && remainingBudget < 0 ? 'negative' : 'default'} />
        <MetricCard label="Vyfakturované" value={formatCurrency(values.vyfakturovane)} detail={clientInvoices.length > 0 ? `${clientInvoices.length} vystavených faktúr` : 'Zatiaľ bez vystavených faktúr'} />
        <MetricCard label="Prijaté platby" value={formatCurrency(values.prijate)} detail={`FA ${formatCurrency(clientInvoiceSummary.prijate)} + zálohy ${formatCurrency(otherReceivedPayments)}`} tone={values.prijate > 0 ? 'positive' : 'default'} />
        <MetricCard label="Pohľadávky" value={formatCurrency(unpaid)} detail={clientInvoiceSummary.pocetPoSplatnosti > 0 ? `Po splatnosti ${formatCurrency(clientInvoiceSummary.poSplatnosti)}` : 'Neuhradené faktúry klientovi'} tone={unpaid > 0 ? 'warning' : 'default'} />
        <MetricCard label="Plánovaný zisk" value={values.cena > 0 && values.budget > 0 ? formatCurrency(profitability.planovanyZisk) : '—'} detail={values.cena <= 0 || values.budget <= 0 ? 'Nastav cenu zákazky aj budget' : `Plánovaná marža ${profitability.planovanaMarzaPercent?.toFixed(1)} %`} tone={values.cena > 0 && values.budget > 0 ? (profitability.planovanyZisk < 0 ? 'negative' : 'positive') : 'default'} />
      </div>

      {financeAlertCount > 0 && (
        <div style={{ ...cardStyle, marginTop: '14px', overflow: 'hidden', borderColor: (supplierAlerts.some(alert => alert.stav === 'po_splatnosti') || clientAlerts.some(alert => alert.stav === 'po_splatnosti') || budgetExceeded) ? '#f3b4ae' : '#f0d7a3' }}>
          <div style={{ padding: '13px 16px', borderBottom: '1px solid #ededf0', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '750' }}>Finančné upozornenia</div>
              <div style={{ marginTop: '3px', color: '#86868b', fontSize: '9px' }}>Veci, ktoré si na tejto stavbe zaslúžia pozornosť.</div>
            </div>
            <span style={{ padding: '4px 8px', borderRadius: '999px', backgroundColor: '#fff7ed', color: '#9a6700', fontSize: '9px', fontWeight: '750' }}>{financeAlertCount}</span>
          </div>

          {financeSetupAlert && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '12px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #ededf0' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700' }}>Chýba finančný setup</div>
                <div style={{ marginTop: '3px', color: '#86868b', fontSize: '9px' }}>Náklady už existujú ({formatCurrency(currentCosts)}), ale {!values.cena && !values.budget ? 'cena zákazky ani budget nie sú nastavené' : !values.cena ? 'cena zákazky nie je nastavená' : 'budget nie je nastavený'}.</div>
              </div>
              <button type="button" onClick={openFinanceEditor} style={{ padding: '6px 9px', border: 'none', borderRadius: '8px', backgroundColor: '#fff7ed', color: '#9a6700', cursor: 'pointer', fontSize: '9px', fontWeight: '750' }}>Doplniť</button>
            </div>
          )}

          {supplierAlerts.map(alert => (
            <div key={`supplier-alert-${alert.id}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '12px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #ededf0' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700' }}>Dodávateľská FA {alert.cisloFaktury} · {alert.dodavatel || 'Dodávateľ'}</div>
                <div style={{ marginTop: '3px', color: '#86868b', fontSize: '9px' }}>{formatCurrency(alert.suma)} · splatnosť {formatDate(alert.datumSplatnosti)}</div>
              </div>
              <div style={{ color: alert.stav === 'po_splatnosti' ? '#b42318' : '#9a6700', fontSize: '9px', fontWeight: '750', whiteSpace: 'nowrap' }}>
                {alert.stav === 'po_splatnosti'
                  ? `Po splatnosti ${Math.abs(alert.dniDoSplatnosti)} dní`
                  : alert.dniDoSplatnosti === 0 ? 'Splatná dnes' : `O ${alert.dniDoSplatnosti} dní`}
              </div>
            </div>
          ))}

          {clientAlerts.map(alert => (
            <div key={`client-alert-${alert.id}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '12px', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #ededf0' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700' }}>Pohľadávka · FA {alert.cisloFaktury}</div>
                <div style={{ marginTop: '3px', color: '#86868b', fontSize: '9px' }}>{formatCurrency(alert.suma)} · splatnosť {formatDate(alert.datumSplatnosti)}</div>
              </div>
              <div style={{ color: alert.stav === 'po_splatnosti' ? '#b42318' : '#9a6700', fontSize: '9px', fontWeight: '750', whiteSpace: 'nowrap' }}>
                {alert.stav === 'po_splatnosti'
                  ? `Klient mešká ${Math.abs(alert.dniDoSplatnosti)} dní`
                  : alert.dniDoSplatnosti === 0 ? 'Splatná dnes' : `O ${alert.dniDoSplatnosti} dní`}
              </div>
            </div>
          ))}

          {budgetAlert && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) auto', gap: '12px', alignItems: 'center', padding: '10px 16px' }}>
              <div>
                <div style={{ fontSize: '10px', fontWeight: '700' }}>Čerpanie budgetu</div>
                <div style={{ marginTop: '3px', color: '#86868b', fontSize: '9px' }}>{formatCurrency(currentCosts)} z {formatCurrency(values.budget)}</div>
              </div>
              <div style={{ color: budgetExceeded ? '#b42318' : '#9a6700', fontSize: '9px', fontWeight: '750', whiteSpace: 'nowrap' }}>
                {budgetExceeded ? `Prekročené o ${formatCurrency(Math.abs(remainingBudget))}` : `${budgetPercent.toFixed(0)} % vyčerpané`}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ ...cardStyle, padding: '18px', marginTop: '14px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '750' }}>Ziskovosť stavby</div>
          <div style={{ marginTop: '4px', color: '#86868b', fontSize: '10px' }}>Plánovaný zisk vychádza z ceny zákazky a budgetu. Aktuálna rezerva ukazuje rozdiel medzi cenou zákazky a doteraz zaevidovanými nákladmi.</div>
        </div>
        <div className="finance-metrics-grid" style={{ marginTop: '15px' }}>
          <div style={{ padding: '13px 14px', borderRadius: '12px', backgroundColor: '#f7f7f8' }}>
            <div style={{ color: '#86868b', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' }}>Plánovaný zisk</div>
            <div style={{ marginTop: '7px', fontSize: '19px', fontWeight: '750', color: values.cena > 0 && values.budget > 0 && profitability.planovanyZisk < 0 ? '#b42318' : values.cena > 0 && values.budget > 0 ? '#047857' : '#a1a1a6' }}>{values.cena > 0 && values.budget > 0 ? formatCurrency(profitability.planovanyZisk) : '—'}</div>
            <div style={{ marginTop: '4px', color: '#86868b', fontSize: '9px' }}>{values.cena > 0 && values.budget > 0 && profitability.planovanaMarzaPercent !== null ? `marža ${profitability.planovanaMarzaPercent.toFixed(1)} %` : 'chýba cena alebo budget'}</div>
          </div>
          <div style={{ padding: '13px 14px', borderRadius: '12px', backgroundColor: '#f7f7f8' }}>
            <div style={{ color: '#86868b', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' }}>Aktuálna rezerva do ceny</div>
            <div style={{ marginTop: '7px', fontSize: '19px', fontWeight: '750', color: values.cena > 0 && profitability.aktualnaRezerva < 0 ? '#b42318' : '#1d1d1f' }}>{values.cena > 0 ? formatCurrency(profitability.aktualnaRezerva) : '—'}</div>
            <div style={{ marginTop: '4px', color: '#86868b', fontSize: '9px' }}>{values.cena > 0 ? 'cena zákazky − doterajšie náklady' : 'cena zákazky nie je nastavená'}</div>
          </div>
          <div style={{ padding: '13px 14px', borderRadius: '12px', backgroundColor: profitability.odchylkaOdBudgetu < 0 ? '#fff5f5' : '#f7f7f8' }}>
            <div style={{ color: '#86868b', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' }}>Rezerva budgetu</div>
            <div style={{ marginTop: '7px', fontSize: '19px', fontWeight: '750', color: values.budget > 0 && profitability.odchylkaOdBudgetu < 0 ? '#b42318' : '#1d1d1f' }}>{values.budget > 0 ? formatCurrency(profitability.odchylkaOdBudgetu) : '—'}</div>
            <div style={{ marginTop: '4px', color: '#86868b', fontSize: '9px' }}>{values.budget > 0 && profitability.odchylkaOdBudgetuPercent !== null ? `${profitability.odchylkaOdBudgetuPercent.toFixed(1)} % budgetu zostáva` : 'budget nie je nastavený'}</div>
          </div>
          <div style={{ padding: '13px 14px', borderRadius: '12px', backgroundColor: '#f7f7f8' }}>
            <div style={{ color: '#86868b', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase' }}>Fakturácia / inkaso</div>
            <div style={{ marginTop: '7px', fontSize: '19px', fontWeight: '750' }}>{profitability.fakturacnyProgressPercent === null ? '—' : `${profitability.fakturacnyProgressPercent.toFixed(0)} %`}</div>
            <div style={{ marginTop: '4px', color: '#86868b', fontSize: '9px' }}>inkaso {profitability.inkasnyProgressPercent === null ? '—' : `${profitability.inkasnyProgressPercent.toFixed(0)} %`} z ceny zákazky</div>
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: '18px', marginTop: '14px', borderColor: budgetExceeded ? '#f3b4ae' : 'rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '750' }}>Vyčerpanie budgetu</div>
            <div style={{ marginTop: '4px', color: '#86868b', fontSize: '10px' }}>
              {values.budget > 0
                ? <>Aktuálne náklady {formatCurrency(currentCosts)} z budgetu {formatCurrency(values.budget)} · faktúry {formatCurrency(supplierInvoiceCosts)} · pracovníci {formatCurrency(laborCosts)}</>
                : <>Aktuálne náklady {formatCurrency(currentCosts)} · budget ešte nie je nastavený</>}
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: '750', color: budgetExceeded ? '#b42318' : '#1d1d1f' }}>
            {values.budget > 0 ? `${budgetPercent.toFixed(0)} %` : '—'}
          </div>
        </div>
        <div style={{ height: '12px', marginTop: '14px', borderRadius: '99px', backgroundColor: '#ededf0', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, Math.max(0, budgetPercent))}%`, height: '100%', borderRadius: '99px', backgroundColor: budgetExceeded ? '#b42318' : '#0071e3', transition: 'width 220ms ease' }} />
        </div>
        {budgetExceeded && (
          <div style={{ marginTop: '10px', padding: '9px 11px', borderRadius: '9px', backgroundColor: '#fef2f2', color: '#b42318', fontSize: '11px', fontWeight: '700' }}>
            Budget je prekročený o {formatCurrency(currentCosts - values.budget)}.
          </div>
        )}
        {values.budget === 0 && (
          <div style={{ marginTop: '9px', color: '#86868b', fontSize: '10px' }}>Zadajte budget nákladov, aby sa vyčerpanie začalo počítať.</div>
        )}
      </div>

      <div className="finance-two-column" style={{ marginTop: '14px' }}>
        <div style={{ ...cardStyle, padding: '18px' }}>
          <div style={{ fontSize: '14px', fontWeight: '750' }}>Rozdelenie nákladov</div>
          <div style={{ marginTop: '4px', color: '#86868b', fontSize: '10px' }}>Podiel kategórií na celkových zaevidovaných nákladoch.</div>
          <div style={{ display: 'grid', gap: '13px', marginTop: '18px' }}>
            {CATEGORIES.map(category => {
              const amount = categoryTotals[category]
              const share = currentCosts > 0 ? (amount / currentCosts) * 100 : 0
              return (
                <div key={category}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '11px' }}>
                    <div style={{ fontWeight: '650' }}>{category}</div>
                    <div style={{ color: '#6e6e73' }}>{formatCurrency(amount)} · {share.toFixed(0)} %</div>
                  </div>
                  <div style={{ marginTop: '6px', height: '7px', backgroundColor: '#ededf0', borderRadius: '99px', overflow: 'hidden' }}>
                    <div style={{ width: `${share}%`, height: '100%', backgroundColor: category === 'Pracovníci' ? '#5f6368' : '#0071e3', opacity: category === 'Pracovníci' ? 0.8 : 0.72, borderRadius: '99px' }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop: '15px', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#f2f8ff', color: '#4b4b4f', fontSize: '10px', lineHeight: 1.5 }}>
            <strong style={{ color: '#0066cc' }}>Pracovníci automaticky:</strong> {formatCurrency(laborCosts)} za {laborHours.toFixed(2)} h · {laborWorkers} pracovníkov. Výpočet používa rovnakú dennú prestávku ako dochádzka a mzdy.
          </div>
        </div>

        <div style={{ ...cardStyle, padding: '18px' }}>
          <div style={{ fontSize: '14px', fontWeight: '750' }}>Cashflow stavby</div>
          <div style={{ marginTop: '4px', color: '#86868b', fontSize: '10px' }}>Cashflow je tok peňazí, nie zisk.</div>
          <div style={{ marginTop: '20px', display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid #ededf0' }}>
              <span style={{ color: '#6e6e73', fontSize: '11px' }}>Prijaté platby</span>
              <strong style={{ fontSize: '12px' }}>{formatCurrency(values.prijate)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid #ededf0' }}>
              <span style={{ color: '#6e6e73', fontSize: '11px' }}>Zaplatené ručné náklady</span>
              <strong style={{ fontSize: '12px' }}>− {formatCurrency(paidCosts)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid #ededf0' }}>
              <span style={{ color: '#6e6e73', fontSize: '11px' }}>Uhradené faktúry dodávateľov</span>
              <strong style={{ fontSize: '12px' }}>− {formatCurrency(paidSupplierInvoiceCosts)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid #ededf0' }}>
              <span style={{ color: '#6e6e73', fontSize: '11px' }}>Vyplatené pracovníkom</span>
              <strong style={{ fontSize: '12px' }}>− {formatCurrency(paidLaborCosts)}</strong>
            </div>
            <div style={{ padding: '14px', borderRadius: '12px', backgroundColor: currentCashflow < 0 ? '#fef2f2' : '#f2f8ff' }}>
              <div style={{ fontSize: '9px', textTransform: 'uppercase', color: '#86868b', letterSpacing: '0.05em', fontWeight: '700' }}>Aktuálny cashflow</div>
              <div style={{ marginTop: '6px', fontSize: '28px', lineHeight: 1, fontWeight: '750', color: currentCashflow < 0 ? '#b42318' : '#0066cc', letterSpacing: '-0.04em' }}>
                {formatCurrency(currentCashflow)}
              </div>
            </div>
          </div>
          <div style={{ marginTop: '12px', color: '#86868b', fontSize: '9px', lineHeight: 1.5 }}>
            Neuhradené ručné náklady: <strong style={{ color: unpaidCosts > 0 ? '#9a6700' : '#6e6e73' }}>{formatCurrency(unpaidCosts)}</strong>. Neuhradené faktúry: <strong style={{ color: supplierInvoiceSummary.neuhradene > 0 ? '#9a6700' : '#6e6e73' }}>{formatCurrency(supplierInvoiceSummary.neuhradene)}</strong>. Pracovníci: náklad <strong>{formatCurrency(laborCosts)}</strong>, vyplatené <strong>{formatCurrency(paidLaborCosts)}</strong>, zostáva <strong style={{ color: outstandingLaborCosts > 0 ? '#9a6700' : '#047857' }}>{formatCurrency(outstandingLaborCosts)}</strong>.
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '15px 18px', borderBottom: '1px solid #ededf0', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '750' }}>Automatické náklady pracovníkov</div>
            <div style={{ marginTop: '3px', color: '#86868b', fontSize: '10px' }}>{laborHours.toFixed(2)} h · náklad {formatCurrency(laborCosts)} · vyplatené {formatCurrency(paidLaborCosts)} · zostáva {formatCurrency(outstandingLaborCosts)}</div>
          </div>
          <span style={{ padding: '4px 8px', borderRadius: '999px', backgroundColor: '#eef6ff', color: '#0066cc', fontSize: '9px', fontWeight: '750' }}>AUTOMATICKY</span>
        </div>
        {laborMissingRates.length > 0 && (
          <div style={{ margin: '12px 14px 0', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#b42318', fontSize: '10px', fontWeight: '650' }}>
            Chýba hodinová sadzba: {laborMissingRates.join(', ')}. Ich hodiny sú započítané, ale náklad je zatiaľ 0 €.
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table className="finance-expense-table">
            <thead>
              <tr style={{ backgroundColor: '#f7f7f8', borderBottom: '1px solid #ededf0', textAlign: 'left' }}>
                {['Pracovník', 'Hodiny', 'Sadzba', 'Náklad', 'Vyplatené', 'Zostáva', ''].map(label => (
                  <th key={label} style={{ padding: '10px 14px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {laborByWorker.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '24px 18px', textAlign: 'center', color: '#a1a1a6', fontSize: '11px' }}>Na tejto stavbe zatiaľ nie sú evidované hodiny pracovníkov.</td></tr>
              ) : laborByWorker.map(([meno, labor]) => (
                <tr key={meno} style={{ borderBottom: '1px solid #ededf0' }}>
                  <td data-label="Pracovník" style={{ padding: '11px 14px', fontWeight: '650' }}>{meno}</td>
                  <td data-label="Hodiny" style={{ padding: '11px 14px' }}>{labor.hodiny.toFixed(2)} h</td>
                  <td data-label="Sadzba" style={{ padding: '11px 14px', color: labor.sadzba > 0 ? '#6e6e73' : '#b42318' }}>{labor.sadzba > 0 ? `${labor.sadzba.toFixed(2)} €/h` : 'Nenastavená'}</td>
                  <td data-label="Náklad" style={{ padding: '11px 14px', fontWeight: '750' }}>{formatCurrency(labor.suma)}</td>
                  <td data-label="Vyplatené" style={{ padding: '11px 14px', color: '#047857', fontWeight: '650' }}>{formatCurrency(paidLaborByWorker.get(meno) || 0)}</td>
                  <td data-label="Zostáva" style={{ padding: '11px 14px', color: getWorkerOutstanding(meno) > 0 ? '#9a6700' : '#047857', fontWeight: '700' }}>{formatCurrency(getWorkerOutstanding(meno))}</td>
                  <td data-label="Akcia" style={{ padding: '11px 14px' }}>
                    <button type="button" disabled={getWorkerOutstanding(meno) <= 0} onClick={() => openNewWorkerPayment(meno)} style={{ padding: '6px 9px', border: 'none', borderRadius: '8px', backgroundColor: getWorkerOutstanding(meno) > 0 ? '#eef6ff' : '#f5f5f7', color: getWorkerOutstanding(meno) > 0 ? '#0071e3' : '#a1a1a6', cursor: getWorkerOutstanding(meno) > 0 ? 'pointer' : 'default', fontSize: '10px', fontWeight: '700' }}>
                      Vyplatiť
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '15px 18px', borderBottom: '1px solid #ededf0', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '750' }}>Vyplatené pracovníkom</div>
            <div style={{ marginTop: '3px', color: '#86868b', fontSize: '10px' }}>{workerPayments.length} úhrad · spolu {formatCurrency(paidLaborCosts)}</div>
          </div>
          <button type="button" onClick={() => openNewWorkerPayment()} disabled={laborByWorker.length === 0} style={{ padding: '7px 11px', border: '1px solid #d2d2d7', borderRadius: '9px', backgroundColor: '#fff', color: '#0071e3', cursor: laborByWorker.length === 0 ? 'not-allowed' : 'pointer', fontSize: '10px', fontWeight: '700', opacity: laborByWorker.length === 0 ? .5 : 1 }}>
            + Vyplatiť pracovníka
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="finance-expense-table">
            <thead>
              <tr style={{ backgroundColor: '#f7f7f8', borderBottom: '1px solid #ededf0', textAlign: 'left' }}>
                {['Dátum', 'Pracovník', 'Suma', 'Poznámka', 'Akcie'].map(label => (
                  <th key={label} style={{ padding: '10px 14px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {workerPayments.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '24px 18px', textAlign: 'center', color: '#a1a1a6', fontSize: '11px' }}>Zatiaľ nie je zaevidovaná žiadna vyplatená mzda na tejto stavbe.</td></tr>
              ) : workerPayments.map(payment => (
                <tr key={payment.id} style={{ borderBottom: '1px solid #ededf0' }}>
                  <td data-label="Dátum" style={{ padding: '11px 14px', color: '#6e6e73' }}>{formatDate(payment.datum)}</td>
                  <td data-label="Pracovník" style={{ padding: '11px 14px', fontWeight: '650' }}>{payment.meno}</td>
                  <td data-label="Suma" style={{ padding: '11px 14px', fontWeight: '750' }}>{formatCurrency(numberValue(payment.suma))}</td>
                  <td data-label="Poznámka" style={{ padding: '11px 14px', color: '#6e6e73' }}>{payment.poznamka || '—'}</td>
                  <td data-label="Akcie" style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => openWorkerPaymentEdit(payment)} style={{ padding: '6px 9px', border: 'none', borderRadius: '8px', backgroundColor: '#eef6ff', color: '#0071e3', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Upraviť</button>
                      <button type="button" onClick={() => deleteWorkerPayment(payment)} style={{ padding: '6px 9px', border: 'none', borderRadius: '8px', backgroundColor: '#f5f5f7', color: '#86868b', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Odstrániť</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '15px 18px', borderBottom: '1px solid #ededf0', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '750' }}>Faktúry klientovi</div>
            <div style={{ marginTop: '3px', color: '#86868b', fontSize: '10px' }}>
              {clientInvoices.length} faktúr · vyfakturované {formatCurrency(clientInvoiceSummary.vyfakturovane)} · prijaté {formatCurrency(clientInvoiceSummary.prijate)} · pohľadávky {formatCurrency(clientInvoiceSummary.pohladavky)}
            </div>
          </div>
          <button type="button" onClick={openNewClientInvoice} style={{ padding: '7px 11px', border: '1px solid #b9d8f8', borderRadius: '9px', backgroundColor: '#eef6ff', color: '#0071e3', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>
            + Pridať faktúru
          </button>
        </div>
        {clientInvoiceSummary.pocetPoSplatnosti > 0 && (
          <div style={{ margin: '12px 14px 0', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#b42318', fontSize: '10px', fontWeight: '700' }}>
            Pohľadávky po splatnosti: {clientInvoiceSummary.pocetPoSplatnosti} faktúr · {formatCurrency(clientInvoiceSummary.poSplatnosti)}
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table className="finance-expense-table" style={{ minWidth: '820px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7f7f8', borderBottom: '1px solid #ededf0', textAlign: 'left' }}>
                {['Číslo FA', 'Vystavená', 'Splatnosť', 'Suma', 'Stav', 'Úhrada', 'Akcie'].map(label => (
                  <th key={label} style={{ padding: '10px 14px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', whiteSpace: 'nowrap' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientInvoices.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '26px 18px', textAlign: 'center', color: '#a1a1a6', fontSize: '11px' }}>Zatiaľ nie je zaevidovaná žiadna vystavená faktúra klientovi.</td></tr>
              ) : clientInvoices.map(invoice => {
                const status = stavKlientskejFaktury(invoice, today())
                return (
                  <tr key={invoice.id} style={{ borderBottom: '1px solid #ededf0' }}>
                    <td data-label="Číslo FA" style={{ padding: '11px 14px', fontWeight: '700' }}>{invoice.cislo_faktury}</td>
                    <td data-label="Vystavená" style={{ padding: '11px 14px', color: '#6e6e73' }}>{formatDate(invoice.datum_vystavenia)}</td>
                    <td data-label="Splatnosť" style={{ padding: '11px 14px', color: status === 'Po splatnosti' ? '#b42318' : '#6e6e73', fontWeight: status === 'Po splatnosti' ? '700' : '400' }}>{formatDate(invoice.datum_splatnosti)}</td>
                    <td data-label="Suma" style={{ padding: '11px 14px', fontWeight: '750', whiteSpace: 'nowrap' }}>{formatCurrency(numberValue(invoice.suma))}</td>
                    <td data-label="Stav" style={{ padding: '11px 14px' }}>
                      <span style={{
                        display: 'inline-flex', padding: '4px 7px', borderRadius: '999px',
                        backgroundColor: status === 'Uhradená' ? '#ecfdf5' : status === 'Po splatnosti' ? '#fef2f2' : '#fff7ed',
                        color: status === 'Uhradená' ? '#047857' : status === 'Po splatnosti' ? '#b42318' : '#9a6700',
                        fontSize: '9px', fontWeight: '750'
                      }}>{status}</span>
                    </td>
                    <td data-label="Úhrada" style={{ padding: '11px 14px', color: '#6e6e73' }}>{invoice.datum_uhrady ? formatDate(invoice.datum_uhrady) : '—'}</td>
                    <td data-label="Akcie" style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => openClientInvoiceEdit(invoice)} style={{ padding: '6px 9px', border: 'none', borderRadius: '8px', backgroundColor: '#eef6ff', color: '#0071e3', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Upraviť</button>
                        <button type="button" onClick={() => deleteClientInvoice(invoice)} style={{ padding: '6px 9px', border: 'none', borderRadius: '8px', backgroundColor: '#f5f5f7', color: '#86868b', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Odstrániť</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '15px 18px', borderBottom: '1px solid #ededf0', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '750' }}>Iné prijaté platby / zálohy</div>
            <div style={{ marginTop: '3px', color: '#86868b', fontSize: '10px' }}>{payments.length} platieb · spolu {formatCurrency(otherReceivedPayments)}</div>
          </div>
          <button type="button" onClick={openNewPayment} style={{ padding: '7px 11px', border: '1px solid #b9d8f8', borderRadius: '9px', backgroundColor: '#eef6ff', color: '#0071e3', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>
            + Pridať zálohu
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="finance-expense-table">
            <thead>
              <tr style={{ backgroundColor: '#f7f7f8', borderBottom: '1px solid #ededf0', textAlign: 'left' }}>
                {['Dátum', 'Popis', 'Suma', 'Akcie'].map(label => (
                  <th key={label} style={{ padding: '10px 14px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: '24px 18px', textAlign: 'center', color: '#a1a1a6', fontSize: '11px' }}>Zatiaľ nie sú zaevidované žiadne platby od klienta.</td></tr>
              ) : payments.map(payment => (
                <tr key={payment.id} style={{ borderBottom: '1px solid #ededf0' }}>
                  <td data-label="Dátum" style={{ padding: '11px 14px', color: '#6e6e73' }}>{formatDate(payment.datum)}</td>
                  <td data-label="Popis" style={{ padding: '11px 14px' }}>
                    <div style={{ fontWeight: '650' }}>{payment.popis}</div>
                    {payment.poznamka && <div style={{ marginTop: '3px', color: '#86868b', fontSize: '10px' }}>{payment.poznamka}</div>}
                  </td>
                  <td data-label="Suma" style={{ padding: '11px 14px', fontWeight: '750', whiteSpace: 'nowrap', color: '#047857' }}>{formatCurrency(numberValue(payment.suma))}</td>
                  <td data-label="Akcie" style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => openPaymentEdit(payment)} style={{ padding: '6px 9px', border: 'none', borderRadius: '8px', backgroundColor: '#eef6ff', color: '#0071e3', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Upraviť</button>
                      <button type="button" onClick={() => deletePayment(payment)} style={{ padding: '6px 9px', border: 'none', borderRadius: '8px', backgroundColor: '#f5f5f7', color: '#86868b', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Odstrániť</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '15px 18px', borderBottom: '1px solid #ededf0', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '750' }}>Faktúry od dodávateľov</div>
            <div style={{ marginTop: '3px', color: '#86868b', fontSize: '10px' }}>
              {supplierInvoices.length} faktúr · spolu {formatCurrency(supplierInvoiceCosts)} · neuhradené {formatCurrency(supplierInvoiceSummary.neuhradene)}
            </div>
          </div>
          <button type="button" onClick={openNewSupplierInvoice} style={{ padding: '7px 11px', border: '1px solid #d2d2d7', borderRadius: '9px', backgroundColor: '#fff', color: '#0071e3', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>
            + Pridať faktúru
          </button>
        </div>
        {supplierInvoiceSummary.pocetPoSplatnosti > 0 && (
          <div style={{ margin: '12px 14px 0', padding: '10px 12px', borderRadius: '10px', backgroundColor: '#fef2f2', color: '#b42318', fontSize: '10px', fontWeight: '700' }}>
            Po splatnosti: {supplierInvoiceSummary.pocetPoSplatnosti} faktúr · {formatCurrency(supplierInvoiceSummary.poSplatnosti)}
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table className="finance-expense-table" style={{ minWidth: '900px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7f7f8', borderBottom: '1px solid #ededf0', textAlign: 'left' }}>
                {['Dodávateľ', 'Číslo FA', 'Vystavená', 'Splatnosť', 'Kategória', 'Suma', 'Stav', 'Akcie'].map(label => (
                  <th key={label} style={{ padding: '10px 14px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', whiteSpace: 'nowrap' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {supplierInvoices.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '26px 18px', textAlign: 'center', color: '#a1a1a6', fontSize: '11px' }}>Zatiaľ nie sú zaevidované žiadne faktúry od dodávateľov.</td></tr>
              ) : supplierInvoices.map(invoice => {
                const status = stavDodavatelskejFaktury(invoice, today())
                return (
                  <tr key={invoice.id} style={{ borderBottom: '1px solid #ededf0' }}>
                    <td data-label="Dodávateľ" style={{ padding: '11px 14px', fontWeight: '650' }}>{invoice.dodavatel}</td>
                    <td data-label="Číslo FA" style={{ padding: '11px 14px' }}>{invoice.cislo_faktury}</td>
                    <td data-label="Vystavená" style={{ padding: '11px 14px', color: '#6e6e73' }}>{formatDate(invoice.datum_vystavenia)}</td>
                    <td data-label="Splatnosť" style={{ padding: '11px 14px', color: status === 'Po splatnosti' ? '#b42318' : '#6e6e73', fontWeight: status === 'Po splatnosti' ? '700' : '400' }}>{formatDate(invoice.datum_splatnosti)}</td>
                    <td data-label="Kategória" style={{ padding: '11px 14px' }}><span style={{ display: 'inline-flex', padding: '4px 7px', borderRadius: '999px', backgroundColor: '#f5f5f7', color: '#6e6e73', fontSize: '9px', fontWeight: '700' }}>{invoice.kategoria}</span></td>
                    <td data-label="Suma" style={{ padding: '11px 14px', fontWeight: '750', whiteSpace: 'nowrap' }}>{formatCurrency(numberValue(invoice.suma))}</td>
                    <td data-label="Stav" style={{ padding: '11px 14px' }}>
                      <span style={{
                        display: 'inline-flex', padding: '4px 7px', borderRadius: '999px',
                        backgroundColor: status === 'Uhradená' ? '#ecfdf5' : status === 'Po splatnosti' ? '#fef2f2' : '#fff7ed',
                        color: status === 'Uhradená' ? '#047857' : status === 'Po splatnosti' ? '#b42318' : '#9a6700',
                        fontSize: '9px', fontWeight: '750'
                      }}>{status}</span>
                    </td>
                    <td data-label="Akcie" style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => openSupplierInvoiceEdit(invoice)} style={{ padding: '6px 9px', border: 'none', borderRadius: '8px', backgroundColor: '#eef6ff', color: '#0071e3', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Upraviť</button>
                        <button type="button" onClick={() => deleteSupplierInvoice(invoice)} style={{ padding: '6px 9px', border: 'none', borderRadius: '8px', backgroundColor: '#f5f5f7', color: '#86868b', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Odstrániť</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '15px 18px', borderBottom: '1px solid #ededf0', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '750' }}>Náklady podľa mesiacov a kategórií</div>
            <div style={{ marginTop: '3px', color: '#86868b', fontSize: '10px' }}>Automatické mzdy + ručne evidované náklady v jednom mesačnom prehľade.</div>
          </div>
          <span style={{ padding: '4px 8px', borderRadius: '999px', backgroundColor: '#f5f5f7', color: '#6e6e73', fontSize: '9px', fontWeight: '750' }}>{monthlyBreakdown.length} mes.</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="finance-expense-table" style={{ minWidth: '840px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f7f7f8', borderBottom: '1px solid #ededf0', textAlign: 'left' }}>
                {['Mesiac', ...FINANCE_CATEGORIES, 'Spolu'].map(label => (
                  <th key={label} style={{ padding: '10px 14px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', whiteSpace: 'nowrap' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlyBreakdown.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '26px 18px', textAlign: 'center', color: '#a1a1a6', fontSize: '11px' }}>Mesačný prehľad sa zobrazí po zaevidovaní prvých nákladov alebo hodín pracovníkov.</td></tr>
              ) : monthlyBreakdown.map(row => (
                <tr key={row.key} style={{ borderBottom: '1px solid #ededf0' }}>
                  <td data-label="Mesiac" style={{ padding: '11px 14px', fontWeight: '700', textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{row.label}</td>
                  {FINANCE_CATEGORIES.map(category => (
                    <td key={category} data-label={category} style={{ padding: '11px 14px', whiteSpace: 'nowrap', color: row.categories[category] > 0 ? '#1d1d1f' : '#a1a1a6' }}>
                      {row.categories[category] > 0 ? formatCurrency(row.categories[category]) : '—'}
                    </td>
                  ))}
                  <td data-label="Spolu" style={{ padding: '11px 14px', fontWeight: '750', whiteSpace: 'nowrap' }}>{formatCurrency(row.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ ...cardStyle, padding: '18px', marginTop: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '750' }}>Vývoj financií stavby</div>
            <div style={{ marginTop: '4px', color: '#86868b', fontSize: '10px' }}>Kumulatívny vývoj ručných nákladov, automatických nákladov pracovníkov a platieb klienta.</div>
          </div>
          <span style={{ padding: '4px 8px', borderRadius: '999px', backgroundColor: '#ecfdf5', color: '#047857', fontSize: '9px', fontWeight: '750' }}>REÁLNE DÁTA</span>
        </div>
        <div style={{ marginTop: '14px' }}><FinanceChart data={chartData} /></div>
      </div>

      <div style={{ ...cardStyle, marginTop: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '15px 18px', borderBottom: '1px solid #ededf0', display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '750' }}>Ostatné ručné náklady</div>
            <div style={{ marginTop: '3px', color: '#86868b', fontSize: '10px' }}>{expenses.length} položiek mimo dodávateľských faktúr · spolu {formatCurrency(manualCosts)}</div>
          </div>
          <button type="button" onClick={openNewExpense} style={{ padding: '7px 11px', border: '1px solid #d2d2d7', borderRadius: '9px', backgroundColor: '#fff', color: '#0071e3', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>
            + Pridať náklad
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="finance-expense-table">
            <thead>
              <tr style={{ backgroundColor: '#f7f7f8', borderBottom: '1px solid #ededf0', textAlign: 'left' }}>
                {['Dátum', 'Popis', 'Kategória', 'Suma', 'Stav', 'Akcie'].map(label => (
                  <th key={label} style={{ padding: '10px 14px', color: '#86868b', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '28px 18px', textAlign: 'center', color: '#a1a1a6', fontSize: '11px' }}>Zatiaľ nie sú zaevidované žiadne náklady.</td></tr>
              ) : expenses.map(expense => (
                <tr key={expense.id} style={{ borderBottom: '1px solid #ededf0' }}>
                  <td data-label="Dátum" style={{ padding: '11px 14px', color: '#6e6e73' }}>{formatDate(expense.datum)}</td>
                  <td data-label="Popis" style={{ padding: '11px 14px' }}>
                    <div style={{ fontWeight: '650' }}>{expense.popis}</div>
                    {expense.poznamka && <div style={{ marginTop: '3px', color: '#86868b', fontSize: '10px' }}>{expense.poznamka}</div>}
                  </td>
                  <td data-label="Kategória" style={{ padding: '11px 14px' }}>
                    <span style={{ display: 'inline-flex', padding: '4px 7px', borderRadius: '999px', backgroundColor: '#f5f5f7', color: '#6e6e73', fontSize: '9px', fontWeight: '700' }}>{expense.kategoria}</span>
                  </td>
                  <td data-label="Suma" style={{ padding: '11px 14px', fontWeight: '750', whiteSpace: 'nowrap' }}>{formatCurrency(numberValue(expense.suma))}</td>
                  <td data-label="Stav" style={{ padding: '11px 14px' }}>
                    <span style={{
                      display: 'inline-flex',
                      padding: '4px 7px',
                      borderRadius: '999px',
                      backgroundColor: expense.uhradene !== false ? '#ecfdf5' : '#fff7ed',
                      color: expense.uhradene !== false ? '#047857' : '#9a6700',
                      fontSize: '9px',
                      fontWeight: '750'
                    }}>
                      {expense.uhradene !== false ? 'Uhradené' : 'Neuhradené'}
                    </span>
                  </td>
                  <td data-label="Akcie" style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button type="button" onClick={() => openExpenseEdit(expense)} style={{ padding: '6px 9px', border: 'none', borderRadius: '8px', backgroundColor: '#eef6ff', color: '#0071e3', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Upraviť</button>
                      <button type="button" onClick={() => deleteExpense(expense)} style={{ padding: '6px 9px', border: 'none', borderRadius: '8px', backgroundColor: '#f5f5f7', color: '#86868b', cursor: 'pointer', fontSize: '10px', fontWeight: '700' }}>Odstrániť</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {clientInvoiceOpen && (
        <div className="finance-modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setClientInvoiceOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 1200, backgroundColor: 'rgba(0,0,0,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="finance-modal-card" role="dialog" aria-modal="true" aria-label={editingClientInvoice ? 'Upraviť faktúru klientovi' : 'Pridať faktúru klientovi'} style={{ width: 'min(680px, 100%)', backgroundColor: '#fff', borderRadius: '18px', padding: '20px', boxShadow: '0 24px 70px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: '18px', fontWeight: '750' }}>{editingClientInvoice ? 'Upraviť faktúru klientovi' : 'Pridať faktúru klientovi'}</div>
            <div style={{ marginTop: '4px', color: '#86868b', fontSize: '10px' }}>Faktúra automaticky zvýši vyfakturovanú sumu. Po označení ako uhradená sa jej suma započíta medzi prijaté platby a do cashflow.</div>
            <form onSubmit={saveClientInvoice}>
              <div className="finance-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '18px' }}>
                <div>
                  <label style={labelStyle}>Číslo faktúry</label>
                  <input type="text" required maxLength={120} value={clientInvoiceForm.cislo_faktury} onChange={event => setClientInvoiceForm(current => ({ ...current, cislo_faktury: event.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Suma</label>
                  <input type="number" min="0.01" step="0.01" required value={clientInvoiceForm.suma || ''} onChange={event => setClientInvoiceForm(current => ({ ...current, suma: Number(event.target.value) }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Dátum vystavenia</label>
                  <input type="date" required value={clientInvoiceForm.datum_vystavenia} onChange={event => setClientInvoiceForm(current => ({ ...current, datum_vystavenia: event.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Dátum splatnosti</label>
                  <input type="date" required min={clientInvoiceForm.datum_vystavenia} value={clientInvoiceForm.datum_splatnosti} onChange={event => setClientInvoiceForm(current => ({ ...current, datum_splatnosti: event.target.value }))} style={inputStyle} />
                </div>
                <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '9px', padding: '11px 12px', borderRadius: '10px', backgroundColor: '#f7f7f8', cursor: 'pointer', fontSize: '11px', fontWeight: '650' }}>
                  <input
                    type="checkbox"
                    checked={clientInvoiceForm.uhradene}
                    onChange={event => setClientInvoiceForm(current => ({ ...current, uhradene: event.target.checked, datum_uhrady: event.target.checked ? (current.datum_uhrady || today()) : '' }))}
                    style={{ width: '17px', height: '17px', accentColor: '#0071e3' }}
                  />
                  Faktúra je uhradená
                </label>
                {clientInvoiceForm.uhradene && (
                  <div>
                    <label style={labelStyle}>Dátum úhrady</label>
                    <input type="date" required value={clientInvoiceForm.datum_uhrady} onChange={event => setClientInvoiceForm(current => ({ ...current, datum_uhrady: event.target.value }))} style={inputStyle} />
                  </div>
                )}
                <div style={{ gridColumn: clientInvoiceForm.uhradene ? 'auto' : '1 / -1' }}>
                  <label style={labelStyle}>Poznámka</label>
                  <input type="text" maxLength={500} placeholder="Voliteľné" value={clientInvoiceForm.poznamka} onChange={event => setClientInvoiceForm(current => ({ ...current, poznamka: event.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
                <button type="button" onClick={() => setClientInvoiceOpen(false)} style={{ padding: '9px 13px', border: '1px solid #d2d2d7', borderRadius: '9px', background: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>Zrušiť</button>
                <button type="submit" disabled={saving} style={{ padding: '9px 14px', border: 0, borderRadius: '9px', background: '#0071e3', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700', opacity: saving ? .6 : 1 }}>{saving ? 'Ukladám…' : (editingClientInvoice ? 'Uložiť zmenu' : 'Pridať faktúru')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {supplierInvoiceOpen && (
        <div className="finance-modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setSupplierInvoiceOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 1200, backgroundColor: 'rgba(0,0,0,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="finance-modal-card" role="dialog" aria-modal="true" aria-label={editingSupplierInvoice ? 'Upraviť faktúru dodávateľa' : 'Pridať faktúru dodávateľa'} style={{ width: 'min(680px, 100%)', backgroundColor: '#fff', borderRadius: '18px', padding: '20px', boxShadow: '0 24px 70px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: '18px', fontWeight: '750' }}>{editingSupplierInvoice ? 'Upraviť faktúru dodávateľa' : 'Pridať faktúru dodávateľa'}</div>
            <div style={{ marginTop: '4px', color: '#86868b', fontSize: '10px' }}>Faktúra vstúpi do nákladov stavby. Do cashflow sa odpočíta až po označení ako uhradená.</div>
            <form onSubmit={saveSupplierInvoice}>
              <div className="finance-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '18px' }}>
                <div>
                  <label style={labelStyle}>Dodávateľ</label>
                  <input type="text" required maxLength={200} value={supplierInvoiceForm.dodavatel} onChange={event => setSupplierInvoiceForm(current => ({ ...current, dodavatel: event.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Číslo faktúry</label>
                  <input type="text" required maxLength={120} value={supplierInvoiceForm.cislo_faktury} onChange={event => setSupplierInvoiceForm(current => ({ ...current, cislo_faktury: event.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Dátum vystavenia</label>
                  <input type="date" required value={supplierInvoiceForm.datum_vystavenia} onChange={event => setSupplierInvoiceForm(current => ({ ...current, datum_vystavenia: event.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Dátum splatnosti</label>
                  <input type="date" required min={supplierInvoiceForm.datum_vystavenia} value={supplierInvoiceForm.datum_splatnosti} onChange={event => setSupplierInvoiceForm(current => ({ ...current, datum_splatnosti: event.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Kategória</label>
                  <select value={supplierInvoiceForm.kategoria} onChange={event => setSupplierInvoiceForm(current => ({ ...current, kategoria: event.target.value as Category }))} style={inputStyle}>
                    {CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Suma</label>
                  <input type="number" min="0.01" step="0.01" required value={supplierInvoiceForm.suma || ''} onChange={event => setSupplierInvoiceForm(current => ({ ...current, suma: Number(event.target.value) }))} style={inputStyle} />
                </div>
                <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '9px', padding: '11px 12px', borderRadius: '10px', backgroundColor: '#f7f7f8', cursor: 'pointer', fontSize: '11px', fontWeight: '650' }}>
                  <input
                    type="checkbox"
                    checked={supplierInvoiceForm.uhradene}
                    onChange={event => setSupplierInvoiceForm(current => ({ ...current, uhradene: event.target.checked, datum_uhrady: event.target.checked ? (current.datum_uhrady || today()) : '' }))}
                    style={{ width: '17px', height: '17px', accentColor: '#0071e3' }}
                  />
                  Faktúra je uhradená
                </label>
                {supplierInvoiceForm.uhradene && (
                  <div>
                    <label style={labelStyle}>Dátum úhrady</label>
                    <input type="date" required value={supplierInvoiceForm.datum_uhrady} onChange={event => setSupplierInvoiceForm(current => ({ ...current, datum_uhrady: event.target.value }))} style={inputStyle} />
                  </div>
                )}
                <div style={{ gridColumn: supplierInvoiceForm.uhradene ? 'auto' : '1 / -1' }}>
                  <label style={labelStyle}>Poznámka</label>
                  <input type="text" maxLength={500} placeholder="Voliteľné" value={supplierInvoiceForm.poznamka} onChange={event => setSupplierInvoiceForm(current => ({ ...current, poznamka: event.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
                <button type="button" onClick={() => setSupplierInvoiceOpen(false)} style={{ padding: '9px 13px', border: '1px solid #d2d2d7', borderRadius: '9px', background: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>Zrušiť</button>
                <button type="submit" disabled={saving} style={{ padding: '9px 14px', border: 0, borderRadius: '9px', background: '#0071e3', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700', opacity: saving ? .6 : 1 }}>{saving ? 'Ukladám…' : (editingSupplierInvoice ? 'Uložiť zmenu' : 'Pridať faktúru')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {workerPaymentOpen && (
        <div className="finance-modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setWorkerPaymentOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 1200, backgroundColor: 'rgba(0,0,0,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="finance-modal-card" role="dialog" aria-modal="true" aria-label={editingWorkerPayment ? 'Upraviť úhradu pracovníka' : 'Vyplatiť pracovníka'} style={{ width: 'min(620px, 100%)', backgroundColor: '#fff', borderRadius: '18px', padding: '20px', boxShadow: '0 24px 70px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: '18px', fontWeight: '750' }}>{editingWorkerPayment ? 'Upraviť úhradu pracovníka' : 'Vyplatiť pracovníka'}</div>
            <div style={{ marginTop: '4px', color: '#86868b', fontSize: '10px' }}>Táto suma predstavuje reálny odchod peňazí a po uložení sa odpočíta z cashflow stavby.</div>
            <form onSubmit={saveWorkerPayment}>
              <div className="finance-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '18px' }}>
                <div>
                  <label style={labelStyle}>Pracovník</label>
                  <select
                    required
                    value={workerPaymentForm.meno}
                    onChange={event => {
                      const meno = event.target.value
                      setWorkerPaymentForm(current => ({ ...current, meno, suma: editingWorkerPayment ? current.suma : getWorkerOutstanding(meno) }))
                    }}
                    style={inputStyle}
                  >
                    <option value="">Vyberte pracovníka</option>
                    {laborByWorker.map(([meno]) => <option key={meno} value={meno}>{meno}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Dátum úhrady</label>
                  <input type="date" required value={workerPaymentForm.datum} onChange={event => setWorkerPaymentForm(current => ({ ...current, datum: event.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Suma</label>
                  <input type="number" min="0.01" step="0.01" required value={workerPaymentForm.suma || ''} onChange={event => setWorkerPaymentForm(current => ({ ...current, suma: Number(event.target.value) }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Zostáva podľa evidencie</label>
                  <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', backgroundColor: '#f7f7f8', color: '#6e6e73' }}>
                    {workerPaymentForm.meno ? formatCurrency(getWorkerOutstanding(workerPaymentForm.meno)) : '—'}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Poznámka</label>
                  <input type="text" maxLength={500} placeholder="Napr. výplata 1.–15. september" value={workerPaymentForm.poznamka} onChange={event => setWorkerPaymentForm(current => ({ ...current, poznamka: event.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
                <button type="button" onClick={() => setWorkerPaymentOpen(false)} style={{ padding: '9px 13px', border: '1px solid #d2d2d7', borderRadius: '9px', background: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>Zrušiť</button>
                <button type="submit" disabled={saving} style={{ padding: '9px 14px', border: 0, borderRadius: '9px', background: '#0071e3', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700', opacity: saving ? .6 : 1 }}>{saving ? 'Ukladám…' : (editingWorkerPayment ? 'Uložiť zmenu' : 'Zaúčtovať úhradu')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {financeOpen && (
        <div className="finance-modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setFinanceOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 1200, backgroundColor: 'rgba(0,0,0,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="finance-modal-card" role="dialog" aria-modal="true" aria-label="Upraviť financie" style={{ width: 'min(620px, 100%)', backgroundColor: '#fff', borderRadius: '18px', padding: '20px', boxShadow: '0 24px 70px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: '18px', fontWeight: '750' }}>Upraviť financie</div>
            <div style={{ marginTop: '4px', color: '#86868b', fontSize: '10px' }}>Cena zákazky a budget sú manuálne. Vyfakturované a prijaté sa počítajú z faktúr klientovi.</div>
            <form onSubmit={saveFinance}>
              <div className="finance-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '18px' }}>
                {[
                  ['cena_zakazky', 'Cena zákazky'],
                  ['budget_nakladov', 'Budget nákladov'],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label style={labelStyle}>{label}</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={financeForm[key as keyof typeof financeForm]}
                      onChange={event => setFinanceForm(current => ({ ...current, [key]: Number(event.target.value) }))}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
                <button type="button" onClick={() => setFinanceOpen(false)} style={{ padding: '9px 13px', border: '1px solid #d2d2d7', borderRadius: '9px', background: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>Zrušiť</button>
                <button type="submit" disabled={saving} style={{ padding: '9px 14px', border: 0, borderRadius: '9px', background: '#0071e3', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700', opacity: saving ? .6 : 1 }}>{saving ? 'Ukladám…' : 'Uložiť'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {paymentOpen && (
        <div className="finance-modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setPaymentOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 1200, backgroundColor: 'rgba(0,0,0,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="finance-modal-card" role="dialog" aria-modal="true" aria-label={editingPayment ? 'Upraviť zálohu' : 'Pridať zálohu'} style={{ width: 'min(620px, 100%)', backgroundColor: '#fff', borderRadius: '18px', padding: '20px', boxShadow: '0 24px 70px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: '18px', fontWeight: '750' }}>{editingPayment ? 'Upraviť zálohu' : 'Pridať prijatú zálohu'}</div>
            <div style={{ marginTop: '4px', color: '#86868b', fontSize: '10px' }}>Použi na zálohu alebo inú platbu, ktorá nie je úhradou konkrétnej vystavenej faktúry.</div>
            <form onSubmit={savePayment}>
              <div className="finance-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '18px' }}>
                <div>
                  <label style={labelStyle}>Dátum</label>
                  <input type="date" required value={paymentForm.datum} onChange={event => setPaymentForm(current => ({ ...current, datum: event.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Suma</label>
                  <input type="number" min="0.01" step="0.01" required value={paymentForm.suma || ''} onChange={event => setPaymentForm(current => ({ ...current, suma: Number(event.target.value) }))} style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Popis</label>
                  <input type="text" required maxLength={300} value={paymentForm.popis} onChange={event => setPaymentForm(current => ({ ...current, popis: event.target.value }))} style={inputStyle} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Poznámka</label>
                  <input type="text" maxLength={500} placeholder="Voliteľné" value={paymentForm.poznamka} onChange={event => setPaymentForm(current => ({ ...current, poznamka: event.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
                <button type="button" onClick={() => setPaymentOpen(false)} style={{ padding: '9px 13px', border: '1px solid #d2d2d7', borderRadius: '9px', background: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>Zrušiť</button>
                <button type="submit" disabled={saving} style={{ padding: '9px 14px', border: 0, borderRadius: '9px', background: '#0071e3', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700', opacity: saving ? .6 : 1 }}>{saving ? 'Ukladám…' : (editingPayment ? 'Uložiť zmenu' : 'Pridať platbu')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {expenseOpen && (
        <div className="finance-modal-backdrop" role="presentation" onMouseDown={event => { if (event.currentTarget === event.target) setExpenseOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 1200, backgroundColor: 'rgba(0,0,0,.32)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div className="finance-modal-card" role="dialog" aria-modal="true" aria-label={editingExpense ? 'Upraviť náklad' : 'Pridať náklad'} style={{ width: 'min(620px, 100%)', backgroundColor: '#fff', borderRadius: '18px', padding: '20px', boxShadow: '0 24px 70px rgba(0,0,0,.2)' }}>
            <div style={{ fontSize: '18px', fontWeight: '750' }}>{editingExpense ? 'Upraviť náklad' : 'Pridať náklad'}</div>
            <form onSubmit={saveExpense}>
              <div className="finance-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '18px' }}>
                <div>
                  <label style={labelStyle}>Dátum</label>
                  <input type="date" required value={expenseForm.datum} onChange={event => setExpenseForm(current => ({ ...current, datum: event.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Kategória</label>
                  <select value={expenseForm.kategoria} onChange={event => setExpenseForm(current => ({ ...current, kategoria: event.target.value as Category }))} style={inputStyle}>
                    {CATEGORIES.map(category => <option key={category} value={category}>{category}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Názov / popis</label>
                  <input type="text" required maxLength={300} placeholder="Napr. Betonáž základovej dosky" value={expenseForm.popis} onChange={event => setExpenseForm(current => ({ ...current, popis: event.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Suma</label>
                  <input type="number" min="0.01" step="0.01" required value={expenseForm.suma || ''} onChange={event => setExpenseForm(current => ({ ...current, suma: Number(event.target.value) }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Poznámka</label>
                  <input type="text" maxLength={500} placeholder="Voliteľné" value={expenseForm.poznamka} onChange={event => setExpenseForm(current => ({ ...current, poznamka: event.target.value }))} style={inputStyle} />
                </div>
                <label style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '9px', padding: '11px 12px', borderRadius: '10px', backgroundColor: '#f7f7f8', cursor: 'pointer', fontSize: '11px', fontWeight: '650' }}>
                  <input
                    type="checkbox"
                    checked={expenseForm.uhradene}
                    onChange={event => setExpenseForm(current => ({ ...current, uhradene: event.target.checked }))}
                    style={{ width: '17px', height: '17px', accentColor: '#0071e3' }}
                  />
                  Náklad je už uhradený
                </label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px' }}>
                <button type="button" onClick={() => setExpenseOpen(false)} style={{ padding: '9px 13px', border: '1px solid #d2d2d7', borderRadius: '9px', background: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700' }}>Zrušiť</button>
                <button type="submit" disabled={saving} style={{ padding: '9px 14px', border: 0, borderRadius: '9px', background: '#0071e3', color: '#fff', cursor: 'pointer', fontSize: '11px', fontWeight: '700', opacity: saving ? .6 : 1 }}>{saving ? 'Ukladám…' : (editingExpense ? 'Uložiť zmenu' : 'Pridať náklad')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
