'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AdminSidebar from '../../components/AdminSidebar'
import { supabase } from '../../lib/adminSupabase'
import { vypocitajNakladyPracovnikov, zhrnNakladyPracovnikovPodlaZakazky } from '../../lib/laborCosts'

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
      ] = await Promise.all([
        supabase.from('zoznam_zakaziek').select('id,nazov,stav').order('created_at', { ascending: false }),
        supabase.from('financie_stavby').select('zakazka_id,cena_zakazky,budget_nakladov,vyfakturovane'),
        supabase.from('naklady_stavby').select('zakazka_id,suma,uhradene'),
        supabase.from('platby_stavby').select('zakazka_id,suma'),
        supabase.from('dochadzka').select('id,meno,datum,zakazka,prichod,odchod'),
        supabase.from('zamestnanci').select('meno,sadzba'),
      ])

      if (cancelled) return

      if (projectError || financeError || expenseError || paymentError || attendanceError || employeeError) {
        console.error('Chyba načítania finančného prehľadu:', projectError || financeError || expenseError || paymentError || attendanceError || employeeError)
        setError('Finančný prehľad sa nepodarilo načítať kompletne.')
      }

      setProjects((projectData as Project[]) || [])
      setFinanceRows((financeData as Finance[]) || [])
      setExpenses((expenseData as Expense[]) || [])
      setPayments((paymentData as Payment[]) || [])
      setAttendance((attendanceData as Attendance[]) || [])
      setEmployees((employeeData as Employee[]) || [])
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

  const laborEntries = useMemo(
    () => vypocitajNakladyPracovnikov(attendance, employees),
    [attendance, employees]
  )

  const laborByProject = useMemo(
    () => zhrnNakladyPracovnikovPodlaZakazky(laborEntries),
    [laborEntries]
  )

  const rows = useMemo(() => {
    return projects.map(project => {
      const finance = financeByProject.get(String(project.id))
      const projectCosts = costsByProject.get(String(project.id)) || { total: 0, paid: 0 }
      const labor = laborByProject.get(String(project.nazov || '').trim())
      const manualCosts = projectCosts.total
      const laborCosts = labor?.suma || 0
      const costs = manualCosts + laborCosts
      const paidCosts = projectCosts.paid
      const unpaidCosts = manualCosts - paidCosts
      const price = num(finance?.cena_zakazky)
      const budget = num(finance?.budget_nakladov)
      const invoiced = num(finance?.vyfakturovane)
      const received = paymentsByProject.get(String(project.id)) || 0
      const remaining = budget - costs
      const cashflow = received - paidCosts
      const usage = budget > 0 ? (costs / budget) * 100 : 0

      return {
        ...project,
        price,
        budget,
        costs,
        manualCosts,
        laborCosts,
        laborHours: labor?.hodiny || 0,
        laborWorkers: labor?.pracovnici.size || 0,
        laborMissingRates: labor?.bezSadzby.size || 0,
        remaining,
        invoiced,
        received,
        paidCosts,
        unpaidCosts,
        cashflow,
        usage,
        hasFinance: Boolean(finance) || costs > 0 || received > 0,
      }
    })
  }, [projects, financeByProject, costsByProject, paymentsByProject, laborByProject])

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
      acc.paidCosts += row.paidCosts
      acc.unpaidCosts += row.unpaidCosts
      acc.invoiced += row.invoiced
      acc.received += row.received
      acc.cashflow += row.cashflow
      if (row.hasFinance) acc.withFinance += 1
      return acc
    }, {
      price: 0,
      budget: 0,
      costs: 0,
      laborCosts: 0,
      paidCosts: 0,
      unpaidCosts: 0,
      invoiced: 0,
      received: 0,
      cashflow: 0,
      withFinance: 0,
    })
  }, [rows])

  const totalRemaining = totals.budget - totals.costs
  const totalUsage = totals.budget > 0 ? (totals.costs / totals.budget) * 100 : 0

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
                <div style={{ marginTop: '6px', color: '#86868b', fontSize: '10px' }}>Vyčerpanie budgetu {totalUsage.toFixed(0)} % · pracovníci {euro(totals.laborCosts)}</div>
              </div>

              <div style={{ ...cardStyle, padding: '17px 18px' }}>
                <div style={{ color: '#86868b', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.05em' }}>Zostáva z budgetu</div>
                <div style={{ marginTop: '8px', fontSize: '25px', fontWeight: '750', letterSpacing: '-.035em', color: totalRemaining < 0 ? '#b42318' : '#1d1d1f' }}>{euro(totalRemaining)}</div>
                <div style={{ marginTop: '6px', color: '#86868b', fontSize: '10px' }}>Budget mínus ručné náklady a automatické mzdy</div>
              </div>

              <div style={{ ...cardStyle, padding: '17px 18px', backgroundColor: totals.cashflow < 0 ? '#fffafa' : '#f7fbff' }}>
                <div style={{ color: '#86868b', fontSize: '9px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '.05em' }}>Aktuálny cashflow</div>
                <div style={{ marginTop: '8px', fontSize: '25px', fontWeight: '750', letterSpacing: '-.035em', color: totals.cashflow < 0 ? '#b42318' : '#0066cc' }}>{euro(totals.cashflow)}</div>
                <div style={{ marginTop: '6px', color: '#86868b', fontSize: '10px' }}>Prijaté platby mínus náklady označené ako uhradené</div>
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
                      {['Stavba', 'Budget', 'Náklady', 'Zostáva', 'Vyfakturované', 'Prijaté', 'Cashflow', 'Budget %', ''].map(label => (
                        <th key={label || 'action'} style={{ padding: '10px 12px', color: '#86868b', fontSize: '8px', textTransform: 'uppercase', letterSpacing: '.045em', fontWeight: '700', whiteSpace: 'nowrap' }}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr><td colSpan={9} style={{ padding: '28px 18px', textAlign: 'center', color: '#a1a1a6', fontSize: '11px' }}>Žiadna stavba nezodpovedá filtru.</td></tr>
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
                              pracovníci {euro(row.laborCosts)} · ručné {euro(row.manualCosts)}
                            </div>
                            {row.laborMissingRates > 0 && (
                              <div style={{ marginTop: '3px', color: '#b42318', fontSize: '8px', fontWeight: '700' }}>
                                {row.laborMissingRates} pracovník bez sadzby
                              </div>
                            )}
                          </td>
                          <td data-label="Zostáva" style={{ padding: '12px', whiteSpace: 'nowrap', fontWeight: '700', color: row.remaining < 0 ? '#b42318' : '#1d1d1f' }}>{euro(row.remaining)}</td>
                          <td data-label="Vyfakturované" style={{ padding: '12px', whiteSpace: 'nowrap' }}>{euro(row.invoiced)}</td>
                          <td data-label="Prijaté" style={{ padding: '12px', whiteSpace: 'nowrap' }}>{euro(row.received)}</td>
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
              Súhrn používa rovnaké reálne finančné údaje ako detail stavby. Budget počíta všetky náklady, cashflow iba náklady označené ako uhradené.
            </div>
          </>
        )}
      </main>
    </div>
  )
}
