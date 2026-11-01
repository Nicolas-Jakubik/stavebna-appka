import Link from 'next/link'

type QuickLink = {
  href: string
  label: string
  primary?: boolean
}

type AdminPageHeroProps = {
  eyebrow: string
  title: string
  description: string
  links?: QuickLink[]
}

export default function AdminPageHero({ eyebrow, title, description, links = [] }: AdminPageHeroProps) {
  return (
    <header className="sd-admin-page-hero">
      <div className="sd-admin-page-heading">
        <span className="sd-admin-page-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {links.length > 0 && (
        <nav className="sd-admin-page-quicklinks" aria-label={`Rýchle odkazy: ${title}`}>
          {links.map(link => (
            <Link href={link.href} key={link.href}
              className={link.primary ? 'sd-admin-quicklink primary' : 'sd-admin-quicklink'}>
              {link.label}
              <span aria-hidden="true">{link.href.startsWith('#') ? '↓' : '→'}</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
