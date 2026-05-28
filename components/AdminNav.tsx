import Link from 'next/link'

export default function AdminNav() {
  return (
    <nav style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
      <Link href="/" style={{ color: '#aaa' }}>← SPÄŤ</Link>
      <Link href="/zoznam" style={{ color: '#aaa' }}>DASHBOARD</Link>
      <Link href="/zakazky" style={{ color: '#aaa' }}>ZÁKAZKY</Link>
      <Link href="/vyplaty" style={{ color: '#f97316', fontWeight: 'bold' }}>VÝPLATY</Link>
    </nav>
  )
}