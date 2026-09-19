'use client'

import Link from 'next/link'

type AdminSection = 'dashboard' | 'zakazky' | 'zamestnanci' | 'mzdy'

export default function AdminSidebar({
  active,
  onLogout,
}: {
  active: AdminSection
  onLogout: () => void
}) {
  const links: { href: string; label: string; key: AdminSection; short: string }[] = [
    { href: '/dashboard', label: 'Dochádzka', key: 'dashboard', short: 'D' },
    { href: '/zakazky', label: 'Stavby', key: 'zakazky', short: 'S' },
    { href: '/zamestnanci', label: 'Zamestnanci', key: 'zamestnanci', short: 'Z' },
    { href: '/mzdy', label: 'Výplaty', key: 'mzdy', short: 'V' },
  ]

  return (
    <aside
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
          onClick={onLogout}
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
  )
}
