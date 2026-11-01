'use client'

import Link from 'next/link'
import { useState } from 'react'

type AdminSection = 'dashboard' | 'zakazky' | 'zamestnanci' | 'mzdy' | 'financie'

const links: { href: string; label: string; mobile: string; key: AdminSection }[] = [
  { href: '/dashboard', label: 'Dochádzka', mobile: 'Hodiny', key: 'dashboard' },
  { href: '/zakazky', label: 'Stavby', mobile: 'Stavby', key: 'zakazky' },
  { href: '/zamestnanci', label: 'Pracovníci', mobile: 'Tím', key: 'zamestnanci' },
  { href: '/mzdy', label: 'Výplaty', mobile: 'Výplaty', key: 'mzdy' },
  { href: '/financie', label: 'Financie', mobile: 'Financie', key: 'financie' },
]

function NavIcon({ name }: { name: AdminSection | 'logout' }) {
  const paths = {
    dashboard: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
    zakazky: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2M10 21v-3h4v3" /></>,
    zamestnanci: <><circle cx="9" cy="8" r="3" /><path d="M2.5 20v-2a6.5 6.5 0 0 1 13 0v2M17 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3.5 4.8V20" /></>,
    mzdy: <><rect x="3" y="6" width="18" height="15" rx="3" /><path d="M3 10h18M16 15h2M7 6V4h11" /></>,
    financie: <><path d="M4 20V11m5 9V5m5 15v-8m5 8V8" strokeLinecap="round" /><path d="M2 21h20" /></>,
    logout: <><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M14 8l4 4-4 4M9 12h9" /></>,
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" focusable="false">
      {paths[name]}
    </svg>
  )
}

function BrandMark() {
  return (
    <span className="sd-brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" focusable="false">
        <path d="M7 19v-4a9 9 0 0 1 6-8.5V5a3 3 0 0 1 6 0v1.5A9 9 0 0 1 25 15v4" />
        <path d="M13 6v7m6-7v7M5 20c-1.7 0-2.5 1.1-2.5 2.5S3.8 25 5.5 25h21c1.7 0 2.5-1.1 2.5-2.5S28.2 20 26.5 20H5z" />
      </svg>
    </span>
  )
}

export default function AdminSidebar({ active }: { active: AdminSection }) {
  const [odhlasuje, setOdhlasuje] = useState(false)
  const [chybaOdhlasenia, setChybaOdhlasenia] = useState('')

  async function odhlasit() {
    if (odhlasuje) return
    setOdhlasuje(true)
    setChybaOdhlasenia('')
    try {
      const response = await fetch('/api/admin/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Logout failed')
      window.location.assign('/admin-prihlasenie')
    } catch {
      // A rejected server request may leave the admin session active.
      setChybaOdhlasenia('Odhlásenie sa nepodarilo. Skúste to znova.')
    } finally {
      setOdhlasuje(false)
    }
  }

  const logoutButton = (isMobile: boolean) => (
    <button type="button"
      className={isMobile ? 'sd-mobile-logout' : 'sd-sidebar-logout'}
      onClick={odhlasit} disabled={odhlasuje} aria-busy={odhlasuje}
      aria-label={odhlasuje ? 'Odhlasujem' : 'Odhlásiť sa'}>
      <NavIcon name="logout" />
      {!isMobile && <span>{odhlasuje ? 'Odhlasujem…' : 'Odhlásiť sa'}</span>}
    </button>
  )

  return (
    <>
      <aside className="sd-admin-sidebar" aria-label="Administrácia SD Evidencia">
        <div>
          <Link href="/dashboard" className="sd-admin-brand" aria-label="SD Evidencia – dochádzka">
            <BrandMark />
            <span className="sd-brand-text">
              <strong>SD Evidencia</strong>
              <small>Firemná administrácia</small>
            </span>
          </Link>
          <div className="sd-nav-heading">PRACOVNÝ PRIESTOR</div>
          <nav className="sd-desktop-nav" aria-label="Hlavná navigácia">
            {links.map(link => (
              <Link key={link.key} href={link.href} className="sd-nav-link"
                aria-current={active === link.key ? 'page' : undefined}
                data-active={active === link.key}>
                <NavIcon name={link.key} />
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>
        </div>
        <div className="sd-sidebar-footer">
          <div className="sd-sidebar-footer-copy">
            <strong>Administrátor</strong>
            <span>Evidencia práce a stavieb</span>
          </div>
          {logoutButton(false)}
          {chybaOdhlasenia && <p role="alert" className="sd-logout-error">{chybaOdhlasenia}</p>}
        </div>
      </aside>

      <div className="sd-mobile-topbar">
        <Link href="/dashboard" className="sd-mobile-brand" aria-label="SD Evidencia – dochádzka">
          <BrandMark />
          <span>SD Evidencia</span>
        </Link>
        {logoutButton(true)}
      </div>
      {chybaOdhlasenia && <div role="alert" className="sd-mobile-logout-error">{chybaOdhlasenia}</div>}

      <nav className="sd-mobile-tabbar" aria-label="Mobilná navigácia">
        {links.map(link => (
          <Link key={link.key} href={link.href} className="sd-mobile-tab"
            aria-current={active === link.key ? 'page' : undefined}
            data-active={active === link.key}>
            <NavIcon name={link.key} />
            <span>{link.mobile}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}
