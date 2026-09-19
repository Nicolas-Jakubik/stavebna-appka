'use client'

import Link from 'next/link'
import { useState } from 'react'

type AdminSection = 'dashboard' | 'zakazky' | 'zamestnanci' | 'mzdy'

export default function AdminSidebar({
  active,
}: {
  active: AdminSection
}) {
  const [mobileOpen, setMobileOpen] = useState(false)

  async function odhlasit() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      window.location.assign('/admin-prihlasenie')
    }
  }

  const links: { href: string; label: string; key: AdminSection; short: string }[] = [
    { href: '/dashboard', label: 'Dochádzka', key: 'dashboard', short: 'D' },
    { href: '/zakazky', label: 'Stavby', key: 'zakazky', short: 'S' },
    { href: '/zamestnanci', label: 'Zamestnanci', key: 'zamestnanci', short: 'Z' },
    { href: '/mzdy', label: 'Výplaty', key: 'mzdy', short: 'V' },
  ]

  return (
    <>
      <style>{`
        .admin-mobile-menu-button,
        .admin-mobile-backdrop {
          display: none;
        }

        @media (max-width: 1024px) {
          .admin-sidebar {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            z-index: 1002 !important;
            width: min(84vw, 300px) !important;
            min-width: 0 !important;
            height: 100dvh !important;
            border-radius: 0 18px 18px 0 !important;
            padding:
              max(20px, env(safe-area-inset-top))
              max(14px, env(safe-area-inset-right))
              max(20px, env(safe-area-inset-bottom))
              max(14px, env(safe-area-inset-left)) !important;
            transform: translateX(-105%);
            transition: transform 180ms ease;
            box-shadow: 12px 0 36px rgba(0,0,0,0.16) !important;
          }

          .admin-sidebar[data-mobile-open="true"] {
            transform: translateX(0);
          }

          .admin-mobile-menu-button {
            position: fixed;
            top: max(12px, env(safe-area-inset-top));
            left: max(12px, env(safe-area-inset-left));
            z-index: 1001;
            width: 44px;
            height: 44px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(0,0,0,0.09);
            border-radius: 12px;
            background: rgba(255,255,255,0.96);
            color: #1d1d1f;
            box-shadow: 0 4px 16px rgba(0,0,0,0.10);
            font-size: 20px;
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
          }

          .admin-mobile-backdrop {
            position: fixed;
            inset: 0;
            z-index: 1000;
            display: block;
            background: rgba(0,0,0,0.26);
            opacity: 0;
            pointer-events: none;
            transition: opacity 180ms ease;
          }

          .admin-mobile-backdrop[data-mobile-open="true"] {
            opacity: 1;
            pointer-events: auto;
          }

          .admin-sidebar a,
          .admin-sidebar button {
            min-height: 44px;
          }
        }
      `}</style>

      <button
        type="button"
        className="admin-mobile-menu-button"
        aria-label={mobileOpen ? 'Zavrieť administráciu' : 'Otvoriť administráciu'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen(open => !open)}
      >
        {mobileOpen ? '×' : '☰'}
      </button>

      <div
        className="admin-mobile-backdrop"
        data-mobile-open={mobileOpen}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside
        className="admin-sidebar"
        data-mobile-open={mobileOpen}
        aria-label="Administrácia"
        style={{
          position: 'sticky',
          top: '24px',
          alignSelf: 'flex-start',
          width: '220px',
          minWidth: '220px',
          height: 'calc(100vh - 48px)',
          padding: '18px 14px',
          borderRadius: '18px',
          backgroundColor: '#ffffff',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 8px 28px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ padding: '4px 8px 24px' }}>
            <div style={{ fontSize: '10px', color: '#86868b', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Stavby Domy
            </div>
            <div style={{ fontSize: '21px', color: '#1d1d1f', fontWeight: '700', letterSpacing: '-0.035em', marginTop: '4px' }}>
              Administrácia
            </div>
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {links.map(link => {
              const isActive = active === link.key
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: '11px',
                    textDecoration: 'none',
                    backgroundColor: isActive ? '#e8f3ff' : 'transparent',
                    color: isActive ? '#0066cc' : '#4b4b4f',
                    fontWeight: isActive ? '650' : '500',
                    fontSize: '13px',
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: isActive ? '#0071e3' : '#f0f0f2',
                      color: isActive ? '#ffffff' : '#86868b',
                      fontSize: '10px',
                      fontWeight: '700',
                    }}
                  >
                    {link.short}
                  </span>
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>

        <div style={{ borderTop: '1px solid #ededf0', paddingTop: '14px' }}>
          <div style={{ padding: '0 10px 10px', fontSize: '10px', color: '#a1a1a6', lineHeight: '1.45' }}>
            Firemný prehľad dochádzky a stavieb
          </div>
          <button
            type="button"
            onClick={odhlasit}
            style={{
              width: '100%',
              border: '1px solid #e5e5e7',
              backgroundColor: '#ffffff',
              color: '#6e6e73',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '9px 12px',
              borderRadius: '10px',
              textAlign: 'left',
              fontWeight: '500',
            }}
          >
            Odhlásiť sa
          </button>
        </div>
      </aside>
    </>
  )
}
