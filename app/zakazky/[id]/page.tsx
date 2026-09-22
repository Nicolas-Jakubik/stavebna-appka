'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import AdminSidebar from '../../../components/AdminSidebar'
import ProjectFinanceDashboard from '../../../components/ProjectFinanceDashboard'
import { supabase } from '../../../lib/adminSupabase'

type Project = {
  id: number | string
  nazov: string
  stav?: string | null
  datum_pridania?: string | null
}

type Tab = 'prehlad' | 'hodiny' | 'financie' | 'dokumenty'

export default function ZakazkaDetailPage() {
  const params = useParams<{ id: string }>()
  const projectId = String(params?.id || '')
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('financie')

  useEffect(() => {
    let cancelled = false

    async function loadProject() {
      if (!projectId) return
      setLoading(true)
      setError('')

      const { data, error: loadError } = await supabase
        .from('zoznam_zakaziek')
        .select('id,nazov,stav,datum_pridania')
        .eq('id', projectId)
        .maybeSingle()

      if (cancelled) return

      if (loadError || !data) {
        console.error('Chyba načítania stavby:', loadError)
        setError('Stavbu sa nepodarilo načítať alebo už neexistuje.')
        setProject(null)
      } else {
        setProject(data as Project)
      }
      setLoading(false)
    }

    loadProject()
    return () => { cancelled = true }
  }, [projectId])

  const tabs: { key: Tab; label: string }[] = [
    { key: 'prehlad', label: 'Prehľad' },
    { key: 'hodiny', label: 'Hodiny' },
    { key: 'financie', label: 'Financie' },
    { key: 'dokumenty', label: 'Dokumenty' },
  ]

  return (
    <div className="project-detail-shell" style={{
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
          .project-detail-shell {
            display: block !important;
            padding:
              calc(64px + env(safe-area-inset-top))
              max(12px, env(safe-area-inset-right))
              calc(20px + env(safe-area-inset-bottom))
              max(12px, env(safe-area-inset-left)) !important;
          }
        }
        @media (max-width: 640px) {
          .project-detail-header {
            align-items: flex-start !important;
            flex-direction: column !important;
          }
          .project-detail-tabs {
            overflow-x: auto;
            flex-wrap: nowrap !important;
            padding-bottom: 3px;
          }
          .project-detail-tabs button {
            white-space: nowrap;
          }
        }
      `}</style>

      <AdminSidebar active="zakazky" />

      <main style={{ width: '100%', flex: 1, minWidth: 0, maxWidth: '1540px', margin: '0 auto' }}>
        <div style={{ marginBottom: '14px' }}>
          <Link href="/zakazky" style={{ color: '#0071e3', textDecoration: 'none', fontSize: '11px', fontWeight: '700' }}>
            ← Späť na stavby
          </Link>
        </div>

        {loading ? (
          <div style={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '14px', padding: '28px', color: '#86868b', fontSize: '12px' }}>
            Načítavam detail stavby…
          </div>
        ) : error || !project ? (
          <div style={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '14px', padding: '28px' }}>
            <div style={{ fontSize: '17px', fontWeight: '750' }}>Stavba nie je dostupná</div>
            <div style={{ marginTop: '6px', color: '#86868b', fontSize: '11px' }}>{error}</div>
          </div>
        ) : (
          <>
            <div className="project-detail-header" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              gap: '18px',
              marginBottom: '16px',
            }}>
              <div>
                <div style={{ fontSize: '10px', color: '#86868b', fontWeight: '700', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Detail stavby
                </div>
                <h1 style={{ margin: 0, fontSize: '29px', lineHeight: 1.1, fontWeight: '750', letterSpacing: '-.035em' }}>
                  {project.nazov}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '7px', flexWrap: 'wrap' }}>
                  <span style={{
                    display: 'inline-flex',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    backgroundColor: project.stav === 'Dokončená' ? '#f0f0f2' : '#ecfdf5',
                    color: project.stav === 'Dokončená' ? '#6e6e73' : '#047857',
                    fontSize: '9px',
                    fontWeight: '750',
                  }}>
                    {project.stav || 'Aktívna'}
                  </span>
                  {project.datum_pridania && (
                    <span style={{ color: '#86868b', fontSize: '10px' }}>
                      Pridaná {new Date(project.datum_pridania + 'T12:00:00').toLocaleDateString('sk-SK')}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ color: '#86868b', fontSize: '10px', textAlign: 'right', maxWidth: '360px', lineHeight: 1.45 }}>
                Finančné údaje sú oddelené od dochádzky a viazané na ID tejto stavby.
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              border: '1px solid rgba(0,0,0,.08)',
              borderRadius: '14px',
              padding: '7px',
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,.04)',
            }}>
              <div className="project-detail-tabs" style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {tabs.map(tab => {
                  const active = activeTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      style={{
                        border: 'none',
                        minHeight: '38px',
                        padding: '8px 14px',
                        borderRadius: '9px',
                        cursor: 'pointer',
                        backgroundColor: active ? '#e8f3ff' : 'transparent',
                        color: active ? '#0066cc' : '#6e6e73',
                        fontSize: '11px',
                        fontWeight: active ? '750' : '600',
                      }}
                    >
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {activeTab === 'financie' && <ProjectFinanceDashboard projectId={projectId} projectName={project.nazov} />}

            {activeTab === 'prehlad' && (
              <div style={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '14px', padding: '24px' }}>
                <div style={{ fontSize: '16px', fontWeight: '750' }}>Prehľad stavby</div>
                <div style={{ marginTop: '7px', color: '#86868b', fontSize: '11px', lineHeight: 1.55 }}>
                  Táto karta je zatiaľ iba súčasťou prototypu detailu stavby. Existujúcu evidenciu stavieb nemeníme.
                </div>
              </div>
            )}

            {activeTab === 'hodiny' && (
              <div style={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '14px', padding: '24px' }}>
                <div style={{ fontSize: '16px', fontWeight: '750' }}>Hodiny</div>
                <div style={{ marginTop: '7px', color: '#86868b', fontSize: '11px', lineHeight: 1.55 }}>
                  Dochádzka zostáva v existujúcom systéme bez zmeny. V ďalšej fáze sem môžeme pridať prehľad hodín iba pre túto stavbu.
                </div>
                <Link href="/dashboard" style={{ display: 'inline-flex', marginTop: '14px', color: '#0071e3', fontSize: '11px', fontWeight: '700', textDecoration: 'none' }}>
                  Otvoriť existujúcu dochádzku →
                </Link>
              </div>
            )}

            {activeTab === 'dokumenty' && (
              <div style={{ backgroundColor: '#fff', border: '1px solid rgba(0,0,0,.08)', borderRadius: '14px', padding: '24px' }}>
                <div style={{ fontSize: '16px', fontWeight: '750' }}>Dokumenty</div>
                <div style={{ marginTop: '7px', color: '#86868b', fontSize: '11px', lineHeight: 1.55 }}>
                  Zatiaľ iba pripravená karta v navigácii. Dokumenty, faktúry ani Gmail v tejto verzii nepripájame.
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
