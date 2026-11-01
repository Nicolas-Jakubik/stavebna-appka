import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "./preview.css";

export const metadata: Metadata = {
  title: "Ukážka dizajnu",
  description: "Read-only vizuálny koncept SD Evidencia s fiktívnymi údajmi.",
  robots: { index: false, follow: false },
};

type IconName = "home" | "clock" | "building" | "wallet" | "team" | "chart" | "arrow";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const content: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/></>,
    building: <><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2m4 0h2M8 11h2m4 0h2M8 15h2m4 0h2"/></>,
    wallet: <><rect x="3" y="6" width="18" height="15" rx="3"/><path d="M3 10h18M16 15h2M7 6V4h11"/></>,
    team: <><circle cx="9" cy="8" r="3"/><path d="M2.5 20v-2a6.5 6.5 0 0 1 13 0v2M17 5.5a3 3 0 0 1 0 5.8M18 14a5 5 0 0 1 3.5 4.8V20"/></>,
    chart: <><path d="M4 20V11m5 9V5m5 15v-8m5 8V8M2 21h20"/></>,
    arrow: <><path d="M5 12h14m-6-6 6 6-6 6"/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {content[name]}
    </svg>
  );
}

const nav = [
  { label: "Prehľad", href: "#prehlad", icon: "home" as IconName },
  { label: "Hodiny", href: "#dochadzka", icon: "clock" as IconName },
  { label: "Stavby", href: "#stavby", icon: "building" as IconName },
  { label: "Výplaty", href: "#vyplaty", icon: "wallet" as IconName },
];

const week = [
  { label: "1.–5.", value: 47 },
  { label: "6.–12.", value: 62 },
  { label: "13.–19.", value: 79 },
  { label: "20.–26.", value: 68 },
  { label: "27.–31.", value: 89 },
];
const workers = [
  { initials: "JK", name: "Ján Kováč", project: "Rodinný dom", hours: "10,5 h", state: "Zaznamenané" },
  { initials: "MB", name: "Martin Bielik", project: "Rekonštrukcia", hours: "10,5 h", state: "Zaznamenané" },
  { initials: "PT", name: "Peter Tóth", project: "Rodinný dom", hours: "10,5 h", state: "Zaznamenané" },
  { initials: "MH", name: "Marek Horváth", project: "Administratíva", hours: "—", state: "Chýba zápis" },
];
const projects = [
  { name: "Rodinný dom", code: "01", status: "Aktívna", progress: 72, color: "blue" },
  { name: "Rekonštrukcia", code: "02", status: "Aktívna", progress: 48, color: "green" },
  { name: "Administratíva", code: "03", status: "Príprava", progress: 12, color: "orange" },
];

export default function DesignPreviewPage() {
  // This read-only mock-up is never available in the production deployment.
  if (process.env.VERCEL_ENV === "production") notFound();

  return (
    <div className="sdp-root">
      <aside className="sdp-sidebar">
        <div>
          <a href="#prehlad" className="sdp-brand"><span className="sdp-logo"><Icon name="building" size={25}/></span><span><strong>SD Evidencia</strong><small>Firemná administrácia</small></span></a>
          <div className="sdp-side-title">PRACOVNÝ PRIESTOR</div>
          <nav aria-label="Ukážková navigácia">
            {nav.map((item,i) => <a className={i===0 ? "sdp-side-item active" : "sdp-side-item"} href={item.href} key={item.label}><Icon name={item.icon}/>{item.label}</a>)}
            <a className="sdp-side-item" href="#dochadzka"><Icon name="team"/>Pracovníci</a>
            <a className="sdp-side-item" href="#vykon"><Icon name="chart"/>Reporty</a>
          </nav>
        </div>
        <div className="sdp-side-foot"><span className="sdp-avatar">SD</span><span><strong>Ukážkový režim</strong><small>Bez prístupu k databáze</small></span></div>
      </aside>

      <header className="sdp-mobile-header"><span className="sdp-logo"><Icon name="building" size={22}/></span><strong>SD Evidencia</strong><span className="sdp-small-demo">DEMO</span></header>
      <main className="sdp-main" id="prehlad">
        <div className="sdp-banner" role="status"><span className="sdp-dot"/> DIZAJNOVÁ UKÁŽKA – všetky údaje sú fiktívne. Žiadne zápisy ani výplaty sa nemenia.</div>
        <nav aria-label="Ukážky nových obrazoviek" style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:24}}>
          <Link href="/design-preview/dochadzka" style={{display:"inline-flex",alignItems:"center",minHeight:44,padding:"10px 17px",borderRadius:12,color:"#fff",background:"#007aff",fontWeight:750,fontSize:12}}>
            Pozrieť novú dochádzku
          </Link>
          <Link href="/design-preview/vyplaty" style={{display:"inline-flex",alignItems:"center",minHeight:44,padding:"10px 17px",borderRadius:12,color:"#1c5b9e",background:"#e9f3ff",fontWeight:750,fontSize:12}}>
            Pozrieť nové výplaty
          </Link>
        </nav>
        <div className="sdp-page-top">
          <div><span className="sdp-eyebrow">FIREMNÝ PREHĽAD</span><h1>Prehľad</h1><p>Všetko dôležité o práci vašej firmy na jednom mieste.</p></div>
          <span className="sdp-period">Október 2026 <span aria-hidden="true">⌄</span></span>
        </div>
        <section className="sdp-stat-grid" aria-label="Ukážkové ukazovatele">
          <div className="sdp-stat-card"><div className="sdp-stat-heading"><span className="sdp-stat-icon blue"><Icon name="clock"/></span><span>Odpracované hodiny</span></div><strong>1 988,0 <small>h</small></strong><p><span className="sdp-green">↑ 4,8 %</span> oproti predošlému mesiacu</p></div>
          <div className="sdp-stat-card"><div className="sdp-stat-heading"><span className="sdp-stat-icon cyan"><Icon name="team"/></span><span>Aktívni pracovníci</span></div><strong>8</strong><p>z 9 evidovaných pracovníkov</p></div>
          <div className="sdp-stat-card"><div className="sdp-stat-heading"><span className="sdp-stat-icon purple"><Icon name="building"/></span><span>Aktívne stavby</span></div><strong>3</strong><p>1 stavba v príprave</p></div>
          <div className="sdp-stat-card"><div className="sdp-stat-heading"><span className="sdp-stat-icon green"><Icon name="wallet"/></span><span>Výplaty za obdobie</span></div><strong>12 640 <small>€</small></strong><p>Obe polovice mesiaca</p></div>
        </section>
        <div className="sdp-analytics">
          <section className="sdp-panel" id="vykon" aria-labelledby="sdp-chart-title">
            <div className="sdp-section-head"><div><h2 id="sdp-chart-title">Odpracované hodiny</h2><p>Týždenný prehľad za október</p></div><span className="sdp-chip">Mesiac</span></div>
            <div className="sdp-graph" role="img" aria-label="Ilustračný stĺpcový graf odpracovaných hodín za päť týždňov">
              <div className="sdp-grid-lines"><span>100 h</span><span>75 h</span><span>50 h</span><span>25 h</span><span>0 h</span></div>
              <div className="sdp-bars">{week.map((w,i)=><div className="sdp-bar-col" key={w.label}><div className="sdp-bar-track"><div className="sdp-bar" style={{height:w.value+"%"}}/></div><span>{w.label}</span></div>)}</div>
            </div>
          </section>
          <section className="sdp-panel" aria-labelledby="sdp-dist-title">
            <div className="sdp-section-head"><div><h2 id="sdp-dist-title">Hodiny podľa stavieb</h2><p>Rozdelenie odpracovaného času</p></div></div>
            <div className="sdp-donut-row"><div className="sdp-donut" role="img" aria-label="Rodinný dom 45 %, Rekonštrukcia 35 %, Administratíva 20 %"><div><strong>1 988 h</strong><small>Spolu</small></div></div>
              <div className="sdp-legend"><div><span className="sdp-legend-dot blue"/>Rodinný dom <strong>45 %</strong></div><div><span className="sdp-legend-dot green"/>Rekonštrukcia <strong>35 %</strong></div><div><span className="sdp-legend-dot orange"/>Administratíva <strong>20 %</strong></div></div>
            </div>
          </section>
        </div>
        <div className="sdp-bottom-grid">
          <section className="sdp-panel" id="dochadzka" aria-labelledby="sdp-att-title">
            <div className="sdp-section-head"><div><h2 id="sdp-att-title">Posledné zápisy</h2><p>Ukážka dennej dochádzky</p></div><span className="sdp-chip">31. októbra</span></div>
            <div className="sdp-worker-table">{workers.map(w=><div className="sdp-worker" key={w.name}><span className="sdp-avatar">{w.initials}</span><div className="sdp-worker-name"><strong>{w.name}</strong><small>{w.project}</small></div><span className="sdp-worker-hours">{w.hours}</span><span className={w.state==="Chýba zápis"?"sdp-status alert":"sdp-status"}>{w.state}</span></div>)}</div>
          </section>
          <section className="sdp-panel" id="stavby" aria-labelledby="sdp-project-title">
            <div className="sdp-section-head"><div><h2 id="sdp-project-title">Aktívne stavby</h2><p>Ukážkový priebeh zákaziek</p></div></div>
            <div className="sdp-projects">{projects.map(p=><div className="sdp-project" key={p.name}><div className={"sdp-project-icon "+p.color}><Icon name="building"/></div><div className="sdp-project-details"><div className="sdp-project-title"><strong>{p.name}</strong><small>{p.progress} %</small></div><div className="sdp-progress-track"><div style={{width:p.progress+"%"}}/></div><small>{p.status}</small></div></div>)}</div>
          </section>
        </div>
        <section className="sdp-payroll" id="vyplaty"><span className="sdp-stat-icon green"><Icon name="wallet"/></span><div><h2>Výplaty a reporty</h2><p>V skutočnej aplikácii zostanú výplatné obdobia a exporty dostupné v administrácii.</p></div><Link href="/dashboard" className="sdp-real-link">Prejsť do administrácie <Icon name="arrow" size={17}/></Link></section>
        <footer className="sdp-footer">SD Evidencia · Vizuálna ukážka · Fiktívne údaje · Žiadne prepojenie s produkčnou databázou</footer>
      </main>
      <nav className="sdp-tabbar" aria-label="Ukážková mobilná navigácia">{nav.map(item=><a href={item.href} key={item.href}><Icon name={item.icon}/><span>{item.label}</span></a>)}</nav>
    </div>
  );
}
