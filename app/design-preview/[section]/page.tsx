import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../preview.css";
import "./screens.css";

export const metadata: Metadata = {
  title: "Ukážka obrazoviek – SD Evidencia",
  description: "Bezpečná statická ukážka dochádzky a výplat s fiktívnymi údajmi.",
  robots: { index: false, follow: false },
};

type Screen = "dochadzka" | "vyplaty";

const records = [
  {name:"Ukážkový pracovník A", initials:"UA", date:"30.10.2026", site:"Stavba Alfa", arrival:"07:00", departure:"18:00", hours:"10,50 h", kind:"", highlight:""},
  {name:"Ukážkový pracovník B", initials:"UB", date:"30.10.2026", site:"Stavba Beta", arrival:"07:00", departure:"18:00", hours:"10,50 h", kind:"", highlight:""},
  {name:"Ukážkový pracovník C", initials:"UC", date:"30.10.2026", site:"Stavba Alfa", arrival:"07:00", departure:"18:00", hours:"10,50 h", kind:"", highlight:""},
  {name:"Ukážkový pracovník A", initials:"UA", date:"29.10.2026", site:"Stavba Alfa", arrival:"07:00", departure:"18:00", hours:"10,50 h", kind:"", highlight:""},
  {name:"Ukážkový pracovník B", initials:"UB", date:"24.10.2026", site:"Stavba Beta", arrival:"07:00", departure:"17:00", hours:"9,50 h", kind:"Sobota", highlight:"weekend"},
];

const payroll = [
  {name:"Ukážkový pracovník A", first:"120,5 h", firstPay:"1 205,00 €", second:"115,0 h", secondPay:"1 150,00 €", total:"2 355,00 €"},
  {name:"Ukážkový pracovník B", first:"110,0 h", firstPay:"1 100,00 €", second:"120,0 h", secondPay:"1 200,00 €", total:"2 300,00 €"},
  {name:"Ukážkový pracovník C", first:"104,0 h", firstPay:"1 040,00 €", second:"112,0 h", secondPay:"1 120,00 €", total:"2 160,00 €"},
];

function SvgIcon({name}: {name:"clock"|"wallet"|"home"|"building"|"users"}) {
  const d = {
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
    wallet: <><rect x="3" y="6" width="18" height="15" rx="3"/><path d="M3 10h18M16 15h2"/></>,
    home: <><path d="m3 10 9-7 9 7v10H3z"/></>,
    building: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h3m3 0h3M8 12h3m3 0h3"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M2 20v-2a7 7 0 0 1 14 0v2M17 6a3 3 0 0 1 0 6M18 14a5 5 0 0 1 4 5"/></>,
  };
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d[name]}</svg>;
}

function Shell({screen,children}: {screen:Screen;children:React.ReactNode}) {
  const items = [
    {href:"/design-preview",label:"Prehľad",icon:"home" as const, current:false},
    {href:"/design-preview/dochadzka",label:"Dochádzka",icon:"clock" as const, current:screen==="dochadzka"},
    {href:"/design-preview/vyplaty",label:"Výplaty",icon:"wallet" as const, current:screen==="vyplaty"},
  ];
  return <div className="sdp-root sdx-root">
    <aside className="sdp-sidebar">
      <div>
        <Link className="sdp-brand" href="/design-preview">
          <span className="sdp-logo"><SvgIcon name="building"/></span>
          <span><strong>SD Evidencia</strong><small>Ukážka dizajnu</small></span>
        </Link>
        <div className="sdp-side-title">VIZUÁLNE UKÁŽKY</div>
        <nav aria-label="Navigácia ukážkových obrazoviek">
          {items.map(x=><Link key={x.href} className={"sdp-side-item"+(x.current?" active":"")} href={x.href} aria-current={x.current?"page":undefined}><SvgIcon name={x.icon}/>{x.label}</Link>)}
        </nav>
      </div>
      <div className="sdp-side-foot"><span className="sdp-avatar">SD</span><span><strong>Režim bez zápisov</strong><small>Len fiktívne údaje</small></span></div>
    </aside>
    <header className="sdp-mobile-header"><span className="sdp-logo"><SvgIcon name="building"/></span><strong>SD Evidencia</strong><span className="sdp-small-demo">DEMO</span></header>
    <main className="sdp-main">
      <div className="sdp-banner"><span className="sdp-dot"/> VIZUÁLNA UKÁŽKA – nepoužíva heslo ani databázu. Zobrazené údaje a sumy sú fiktívne.</div>
      {children}
      <footer className="sdp-footer">SD Evidencia · Návrh dizajnu · Žiadne skutočné zápisy ani výplaty</footer>
    </main>
    <nav className="sdp-tabbar" aria-label="Mobilná ukážková navigácia">
      <Link href="/design-preview"><SvgIcon name="home"/><span>Prehľad</span></Link>
      <Link href="/design-preview/dochadzka" aria-current={screen==="dochadzka"?"page":undefined}><SvgIcon name="clock"/><span>Dochádzka</span></Link>
      <Link href="/design-preview/vyplaty" aria-current={screen==="vyplaty"?"page":undefined}><SvgIcon name="wallet"/><span>Výplaty</span></Link>
      <Link href="/design-preview"><SvgIcon name="building"/><span>Stavby</span></Link>
    </nav>
  </div>;
}

function ScreenHeader({eyebrow,title,description}: {eyebrow:string;title:string;description:string}) {
  return <div className="sdx-header"><div><span className="sdp-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div><span className="sdp-period">Október 2026</span></div>;
}

function Stat({label,value,detail,tone}: {label:string;value:string;detail:string;tone?:"blue"|"green"|"orange"}) {
  return <div className={"sdx-stat "+(tone||"blue")}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function FakeControl({children}: {children:React.ReactNode}) {
  return <span className="sdx-faux-control" aria-label={String(children)}>{children}<span aria-hidden="true">⌄</span></span>;
}

function AttendanceScreen() {
  return <Shell screen="dochadzka">
    <ScreenHeader eyebrow="SD EVIDENCIA / ADMINISTRÁCIA" title="Evidencia hodín" description="Denná dochádzka, kontrola zápisov a prehľad odpracovaného času."/>
    <section className="sdx-stat-grid" aria-label="Ukážkové údaje dochádzky">
      <Stat label="Dnes v práci" value="8" detail="pracovníkov"/>
      <Stat label="Záznamy tento mesiac" value="134" detail="uložených zápisov"/>
      <Stat label="Odpracované" value="1 250,5 h" detail="spolu za mesiac" tone="green"/>
      <Stat label="Vyžaduje kontrolu" value="2" detail="chýbajúce zápisy" tone="orange"/>
    </section>
    <section className="sdx-section sdx-action-panel">
      <div><span className="sdx-mini-label">RÝCHLE AKCIE</span><h2>Správa dochádzky</h2><p>Ukážka rozloženia. Funkčné tlačidlá zostanú v administrácii.</p></div>
      <div className="sdx-faux-buttons"><span className="sdx-blue-button">+ Pridať dochádzku</span><span className="sdx-white-button">+ Neprítomnosť</span></div>
    </section>
    <section className="sdx-section">
      <div className="sdx-section-title"><div><h2>Filtre dochádzky</h2><p>Rýchly výber obdobia a pracovníkov.</p></div><span className="sdx-demo-label">UKÁŽKA</span></div>
      <div className="sdx-segments"><span className="selected">Celý mesiac</span><span>1.–15.</span><span>16.–koniec</span><span>Dnes</span><span>Včera</span></div>
      <div className="sdx-filter-grid"><div><label>Pracovník</label><FakeControl>Všetci pracovníci</FakeControl></div><div><label>Stavba</label><FakeControl>Všetky stavby</FakeControl></div><div><label>Mesiac</label><FakeControl>Október 2026</FakeControl></div><div><label>Deň</label><FakeControl>Vybrať dátum</FakeControl></div></div>
    </section>
    <section className="sdx-section" id="sdx-attendance-records">
      <div className="sdx-section-title"><div><h2>Záznamy dochádzky</h2><p>Ukážka tabuľky s piatimi fiktívnymi zápismi.</p></div><span className="sdx-count">5 záznamov</span></div>
      <div className="sdx-table-scroll"><table className="sdx-table sdx-attendance-table"><thead><tr><th>Dátum</th><th>Pracovník</th><th>Stavba</th><th>Príchod</th><th>Odchod</th><th>Hodiny</th><th>Stav</th></tr></thead><tbody>{records.map((r,i)=><tr key={i} className={r.highlight}><td data-label="Dátum">{r.date}</td><td data-label="Pracovník"><span className="sdx-name">{r.name}</span></td><td data-label="Stavba">{r.site}</td><td data-label="Príchod">{r.arrival}</td><td data-label="Odchod">{r.departure}</td><td data-label="Hodiny"><strong>{r.hours}</strong></td><td data-label="Stav"><span className={"sdx-chip "+(r.kind?"warm":"")}>{r.kind||"Zapísané"}</span></td></tr>)}</tbody></table></div>
      <p className="sdx-disclaimer">V skutočnej aplikácii zostanú k dispozícii úpravy časov, kontrola duplicít a PDF exporty.</p>
    </section>
    <div className="sdx-next"><Link href="/design-preview/vyplaty">Pozrieť návrh výplat <span aria-hidden="true">→</span></Link></div>
  </Shell>;
}

function PayrollScreen() {
  return <Shell screen="vyplaty">
    <ScreenHeader eyebrow="SD EVIDENCIA / MZDY" title="Výplaty" description="Výplatné obdobia, odpracované hodiny a prehľad miezd pracovníkov."/>
    <section className="sdx-stat-grid" aria-label="Ukážkové súhrny výplat">
      <Stat label="Prvá polovica" value="3 345 €" detail="1.–15. októbra"/>
      <Stat label="Druhá polovica" value="3 470 €" detail="16.–31. októbra"/>
      <Stat label="Spolu na výplatu" value="6 815 €" detail="3 pracovníci" tone="green"/>
      <Stat label="Pracovný fond" value="278,5 h" detail="na pracovníka / mesiac" tone="blue"/>
    </section>
    <section className="sdx-section" id="sdx-period">
      <div className="sdx-section-title"><div><h2>Výplatné obdobie</h2><p>Rozdelenie mesiaca na dve výplaty.</p></div><span className="sdx-demo-label">UKÁŽKA</span></div>
      <div className="sdx-segments"><span className="selected">Celý mesiac</span><span>1.–15.</span><span>16.–koniec</span></div>
      <div className="sdx-pay-period-grid"><div><span>1.–15. októbra</span><strong>134,5 h</strong><small>Fond jednej osoby</small></div><div><span>16.–31. októbra</span><strong>144,0 h</strong><small>Fond jednej osoby</small></div><div><span>Celý október</span><strong>278,5 h</strong><small>Fond jednej osoby</small></div></div>
      <p className="sdx-disclaimer">Fond je ilustračný údaj z rozvrhu, nie súčet skutočne odpracovaných hodín.</p>
    </section>
    <section className="sdx-section">
      <div className="sdx-section-title"><div><h2>Pracovníci za mesiac</h2><p>Obe výplatné obdobia pri každom pracovníkovi.</p></div><span className="sdx-count">3 pracovníci</span></div>
      <div className="sdx-table-scroll"><table className="sdx-table sdx-pay-table"><thead><tr><th>Pracovník</th><th>1.–15. hodiny</th><th>Výplata 1</th><th>16.–koniec</th><th>Výplata 2</th><th>Spolu</th></tr></thead><tbody>{payroll.map((r,i)=><tr key={i}><td data-label="Pracovník"><strong>{r.name}</strong></td><td data-label="1.–15. hodiny">{r.first}</td><td data-label="Výplata 1" className="money">{r.firstPay}</td><td data-label="16.–koniec">{r.second}</td><td data-label="Výplata 2" className="money">{r.secondPay}</td><td data-label="Spolu"><strong>{r.total}</strong></td></tr>)}</tbody></table></div>
    </section>
    <section className="sdx-section sdx-action-panel">
      <div><span className="sdx-mini-label">PDF EXPORTY</span><h2>Podklady k výplatám</h2><p>V skutočnej aplikácii bude možné exportovať 1. aj 2. polovicu mesiaca.</p></div>
      <span className="sdx-white-button">PDF export – ukážka</span>
    </section>
    <div className="sdx-next"><Link href="/design-preview/dochadzka">Pozrieť návrh dochádzky <span aria-hidden="true">→</span></Link></div>
  </Shell>;
}

export default async function PreviewScreen({params}:{params:Promise<{section:string}>}) {
  if(process.env.VERCEL_ENV === "production") notFound();
  const {section} = await params;
  if(section==="dochadzka")return <AttendanceScreen/>;
  if(section==="vyplaty")return <PayrollScreen/>;
  notFound();
}
