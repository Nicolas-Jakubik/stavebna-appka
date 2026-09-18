'use client'

import Link from 'next/link'

type AdminSection = 'dashboard' | 'zakazky' | 'zamestnanci' | 'mzdy'

export default function AdminNav({
  active,
  onLogout,
}: {
  active: AdminSection
  onLogout: () => void
}) {
  const links: { href: string; label: string; key: AdminSection }[] = [
    { href: '/dashboard', label: 'Dochádzka', key: 'dashboard' },
    { href: '/zakazky', label: 'Stavby', key: 'zakazky' },
    { href: '/zamestnanci', label: 'Zamestnanci', key: 'zamestnanci' },
    { href: '/mzdy', label: 'Výplaty', key: 'mzdy' },
  ]

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      zIndex: 30,
      marginBottom: '28px',
      padding: '10px 0 14px',
      backgroundColor: 'rgba(251, 251, 253, 0.94)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid #e5e5e5',
    }}>
      <nav aria-label="Administrácia" style={{
        display: 'flex',
        gap: '28px',
        alignItems: 'center',
        flexWrap: 'wrap',
        minHeight: '34px',
      }}>
        {links.map(link => {
          const isActive = active === link.key
          return (
            <Link key={link.key} href={link.href} style={{
              textDecoration: 'none',
              color: isActive ? '#1d1d1f' : '#86868b',
              fontWeight: isActive ? '600' : '400',
              fontSize: '13px',
              borderBottom: isActive ? '2px solid #0071e3' : '2px solid transparent',
              paddingBottom: '4px',
              whiteSpace: 'nowrap',
              transition: 'color 0.2s, border-color 0.2s',
            }}>
              {link.label}
            </Link>
          )
        })}

        <button type="button" onClick={onLogout} style={{
          border: 'none',
          background: 'none',
          color: '#86868b',
          marginLeft: 'auto',
          cursor: 'pointer',
          fontSize: '13px',
          padding: '4px 0',
          fontWeight: '400',
        }}>
          Odhlásiť sa
        </button>
      </nav>
    </div>
  )
}
