import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import "../preview.css";
import "./screens.css";

export const metadata: Metadata = {
  title: "Ukážka obrazoviek – SD Evidencia",
  description: "Bezpečná statická ukážka dochádzky, výplat, stavieb, pracovníkov a financií s fiktívnymi údajmi.",
  robots: { index: false, follow: false },
};

type Screen = "dochadzka" | "vyplaty" | "stavby" | "pracovnici" | "financie";

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
    {href:"/design-preview/stavby",label:"Stavby",icon:"building" as const, current:screen==="stavby"},
    {href:"/design-preview/pracovnici",label:"Pracovníci",icon:"users" as const, current:screen==="pracovnici"},
    {href:"/design-preview/financie",label:"Financie",icon:"wallet" as const, current:screen==="financie"},
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
      <footer className="sdp-footer">SD Evidencia · Návrh dizajnu · Žiadne skutočné záznamy ani zmeny v databáze</footer>
    </main>
    <nav className="sdp-tabbar" aria-label="Mobilná ukážková navigácia">
      <Link href="/design-preview"><SvgIcon name="home"/><span>Prehľad</span></Link>
      <Link href="/design-preview/dochadzka" aria-current={screen==="dochadzka"?"page":undefined}><SvgIcon name="clock"/><span>Dochádzka</span></Link>
      <Link href="/design-preview/vyplaty" aria-current={screen==="vyplaty"?"page":undefined}><SvgIcon name="wallet"/><span>Výplaty</span></Link>
      <Link href="/design-preview/stavby" aria-current={screen==="stavby"?"page":undefined}><SvgIcon name="building"/><span>Stavby</span></Link>
      <Link href="/design-preview/pracovnici" aria-current={screen==="pracovnici"?"page":undefined}><SvgIcon name="users"/><span>Tím</span></Link>
      <Link href="/design-preview/financie" aria-current={screen==="financie"?"page":undefined}><SvgIcon name="wallet"/><span>Financie</span></Link>
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


const sampleProjects = [
  { name: "Stavba Alfa – rodinný dom", code: "2026-001", state: "Aktívna", hours: "426,5 h", records: 39, last: "30.10.2026", style:"" },
  { name: "Stavba Beta – rekonštrukcia", code: "2026-002", state: "Aktívna", hours: "318,0 h", records: 28, last: "29.10.2026", style:"" },
  { name: "Stavba Gama – fasáda", code: "2026-003", state: "Aktívna", hours: "212,0 h", records: 17, last: "28.10.2026", style:"" },
  { name: "Stavba Delta – interiér", code: "2026-004", state: "Dokončená", hours: "145,0 h", records: 13, last: "15.10.2026", style:"complete" },
];

const sampleWorkers = [
  { name:"Pracovník A", initials:"PA", rate:"10,00 €", hours:"160,5 h", last:"30.10.2026", absences:"0", status:"Aktívny" },
  { name:"Pracovník B", initials:"PB", rate:"11,00 €", hours:"152,0 h", last:"30.10.2026", absences:"1", status:"Aktívny" },
  { name:"Pracovník C", initials:"PC", rate:"10,50 €", hours:"148,0 h", last:"29.10.2026", absences:"0", status:"Aktívny" },
  { name:"Pracovník D", initials:"PD", rate:"12,00 €", hours:"141,5 h", last:"28.10.2026", absences:"2", status:"Aktívny" },
];

function ProjectsScreen() {
  return <Shell screen="stavby">
    <ScreenHeader eyebrow="SD EVIDENCIA / STAVBY" title="Stavby" description="Správa zákaziek, hodín a stavu realizácie v jednom prehľade."/>
    <section className="sdx-stat-grid" aria-label="Fiktívne súhrny stavieb">
      <Stat label="Aktívne stavby" value="3" detail="rozpracované zákazky"/>
      <Stat label="Dokončené stavby" value="1" detail="uzavretá zákazka" tone="green"/>
      <Stat label="Spolu evidovaných" value="4" detail="všetky projekty"/>
      <Stat label="Hodiny na stavbách" value="1 101,5 h" detail="ukážka súčtu" tone="blue"/>
    </section>
    <section className="sdx-section sdx-action-panel" id="sdx-project-add">
      <div>
        <span className="sdx-mini-label">RÝCHLE AKCIE</span>
        <h2>Nová stavba</h2>
        <p>V administrácii tu môžeš pridať stavbu bez ďalších krokov.</p>
      </div>
      <span className="sdx-blue-button" aria-label="Ukážka tlačidla pridať stavbu">+ Pridať stavbu</span>
    </section>
    <section className="sdx-section" aria-labelledby="sdx-projects-list-title">
      <div className="sdx-section-title">
        <div><h2 id="sdx-projects-list-title">Prehľad stavieb</h2><p>Všetky zákazky a ich odpracované hodiny.</p></div>
        <span className="sdx-count">4 stavby</span>
      </div>
      <div className="sdx-filter-grid sdx-project-filter-grid">
        <div><label>Vyhľadať stavbu</label><FakeControl>Všetky názvy</FakeControl></div>
        <div><label>Stav</label><FakeControl>Aktívne a dokončené</FakeControl></div>
        <div><label>Zoradenie</label><FakeControl>Posledná aktivita</FakeControl></div>
      </div>
      <div className="sdx-table-scroll sdx-table-after-filters">
        <table className="sdx-table">
          <thead><tr><th>Stavba</th><th>Stav</th><th>Zápisy</th><th>Odpracované</th><th>Posledná práca</th></tr></thead>
          <tbody>
            {sampleProjects.map((p,i)=><tr key={p.code} className={p.style}>
              <td data-label="Stavba"><div className="sdx-name">{p.name}</div><small className="sdx-code">{p.code}</small></td>
              <td data-label="Stav"><span className={"sdx-chip "+(p.state==="Dokončená"?"neutral":"")}>{p.state}</span></td>
              <td data-label="Zápisy">{p.records}</td>
              <td data-label="Odpracované"><strong>{p.hours}</strong></td>
              <td data-label="Posledná práca">{p.last}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className="sdx-disclaimer">V reálnej aplikácii zostane dostupný detail každej stavby, financie a dokumenty.</p>
    </section>
    <div className="sdx-next"><Link href="/design-preview/pracovnici">Pozrieť návrh pracovníkov <span aria-hidden="true">→</span></Link></div>
  </Shell>;
}

function WorkersScreen() {
  return <Shell screen="pracovnici">
    <ScreenHeader eyebrow="SD EVIDENCIA / TÍM" title="Pracovníci" description="Zoznam pracovníkov, hodinové sadzby, dochádzka a neprítomnosti."/>
    <section className="sdx-stat-grid" aria-label="Fiktívne súhrny pracovníkov">
      <Stat label="Pracovníci" value="4" detail="v zozname tímu"/>
      <Stat label="Priemerná sadzba" value="10,88 €" detail="za hodinu"/>
      <Stat label="Odpracované spolu" value="602,0 h" detail="za zvolené obdobie" tone="green"/>
      <Stat label="Neprítomnosti" value="3" detail="evidované prípady" tone="orange"/>
    </section>
    <section className="sdx-section sdx-action-panel">
      <div>
        <span className="sdx-mini-label">SPRÁVA TÍMU</span>
        <h2>Pridať pracovníka</h2>
        <p>V administrácii zadáš meno a hodinovú sadzbu.</p>
      </div>
      <span className="sdx-blue-button" aria-label="Ukážka tlačidla pridať pracovníka">+ Pridať pracovníka</span>
    </section>
    <section className="sdx-section">
      <div className="sdx-section-title">
        <div><h2>Prehľad pracovníkov</h2><p>Hodiny, sadzby a posledné zápisy na jednom mieste.</p></div>
        <span className="sdx-count">4 pracovníci</span>
      </div>
      <div className="sdx-filter-grid sdx-worker-filter-grid">
        <div><label>Vyhľadať pracovníka</label><FakeControl>Všetci pracovníci</FakeControl></div>
        <div><label>Zoradenie</label><FakeControl>Meno A–Z</FakeControl></div>
      </div>
      <div className="sdx-table-scroll sdx-table-after-filters">
        <table className="sdx-table">
          <thead><tr><th>Pracovník</th><th>Sadzba</th><th>Hodiny</th><th>Posledná práca</th><th>Neprítomnosti</th><th>Stav</th></tr></thead>
          <tbody>
            {sampleWorkers.map(p=><tr key={p.initials}>
              <td data-label="Pracovník">
                <span className="sdx-person-cell"><span className="sdp-avatar">{p.initials}</span><strong>{p.name}</strong></span>
              </td>
              <td data-label="Sadzba">{p.rate}/h</td>
              <td data-label="Hodiny"><strong>{p.hours}</strong></td>
              <td data-label="Posledná práca">{p.last}</td>
              <td data-label="Neprítomnosti">{p.absences}</td>
              <td data-label="Stav"><span className="sdx-chip">{p.status}</span></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className="sdx-disclaimer">V administrácii zostanú úpravy sadzieb a pracovníkov aj ich prepojenie na dochádzku a výplaty.</p>
    </section>
    <div className="sdx-next"><Link href="/design-preview/stavby">Pozrieť návrh stavieb <span aria-hidden="true">→</span></Link></div>
  </Shell>;
}


const sampleFinanceProjects = [
  { name:"Stavba Alfa – rodinný dom", price:30000,costs:17000,received:20000,paid:14000,budget:24000 },
  { name:"Stavba Beta – rekonštrukcia", price:18000,costs:12600,received:8500,paid:11000,budget:16000 },
  { name:"Stavba Gama – fasáda", price:14000,costs:14600,received:10000,paid:13000,budget:13000 },
] as const;

function eurDemo(value:number) {
  return new Intl.NumberFormat('sk-SK', { style:'currency',currency:'EUR',maximumFractionDigits:0 }).format(value);
}

function FinanceScreen() {
  const amounts = sampleFinanceProjects.reduce((s,p)=>({
    price:s.price+p.price,
    costs:s.costs+p.costs,
    received:s.received+p.received,
    paid:s.paid+p.paid,
  }),{price:0,costs:0,received:0,paid:0});
  const cashflow=amounts.received-amounts.paid;
  return <Shell screen="financie">
    <ScreenHeader eyebrow="SD EVIDENCIA / FINANCIE" title="Financie" description="Náklady, fakturácia a cashflow stavieb v jednoduchom prehľade."/>
    <section className="sdx-stat-grid" aria-label="Fiktívne finančné ukazovatele">
      <Stat label="Aktívne stavby" value={String(sampleFinanceProjects.length)} detail="s finančnými údajmi"/>
      <Stat label="Aktuálne náklady" value={eurDemo(amounts.costs)} detail="práca, materiál a ďalšie náklady"/>
      <Stat label="Prijaté platby" value={eurDemo(amounts.received)} detail="spolu od klientov" tone="green"/>
      <Stat label="Cashflow firmy" value={eurDemo(cashflow)} detail="prijaté mínus uhradené" tone={cashflow<0?"orange":"blue"}/>
    </section>
    <section className="sdx-section sdx-finance-alert-section">
      <div className="sdx-section-title"><div><h2>Vyžaduje pozornosť</h2><p>Riziká, ktoré sa oplatí skontrolovať.</p></div><span className="sdx-count sdx-warn-count">2 upozornenia</span></div>
      <div className="sdx-finance-alert-grid">
        <div><span>Faktúry po splatnosti</span><strong>1</strong><small>Fiktívny doklad</small></div>
        <div><span>Budget prekročený</span><strong>1</strong><small>Stavba Gama</small></div>
        <div><span>Splatné do 7 dní</span><strong>0</strong><small>Bez upozornenia</small></div>
        <div><span>Chýba nastavenie</span><strong>0</strong><small>V poriadku</small></div>
      </div>
    </section>
    <section className="sdx-section" aria-labelledby="sdx-finance-sites-title">
      <div className="sdx-section-title">
        <div><h2 id="sdx-finance-sites-title">Financie podľa stavieb</h2><p>Cena, náklady, zostávajúca suma a cashflow.</p></div>
        <span className="sdx-demo-label">UKÁŽKA</span>
      </div>
      <div className="sdx-filter-grid sdx-worker-filter-grid">
        <div><label>Vyhľadať stavbu</label><FakeControl>Všetky zákazky</FakeControl></div>
        <div><label>Stav</label><FakeControl>Aktívne stavby</FakeControl></div>
      </div>
      <div className="sdx-finance-project-grid">
        {sampleFinanceProjects.map(p=>{
          const remaining = p.price-p.costs;
          const cash=p.received-p.paid;
          const usage=p.costs/p.budget*100;
          return <article className="sdx-finance-card" key={p.name}>
            <div className="sdx-finance-card-top">
              <div><h3>{p.name}</h3><small>Aktívna stavba</small></div>
              {usage>=100?<span className="sdx-chip warm">Pozor na rozpočet</span>:<span className="sdx-chip">V rozpočte</span>}
            </div>
            <div className="sdx-finance-card-metrics">
              <div><span>Cena</span><strong>{eurDemo(p.price)}</strong></div>
              <div><span>Náklady</span><strong>{eurDemo(p.costs)}</strong></div>
              <div><span>Zostáva</span><strong className={remaining<0?"sdx-negative":""}>{eurDemo(remaining)}</strong></div>
              <div><span>Cashflow</span><strong className={cash<0?"sdx-negative":"sdx-positive"}>{eurDemo(cash)}</strong></div>
            </div>
            <div className="sdx-finance-budget-head"><span>Čerpanie budgetu</span><strong>{usage.toFixed(0)} %</strong></div>
            <div className="sdx-finance-budget-track"><div className={usage>=100?"over":""} style={{width:Math.min(100,usage)+"%"}}/></div>
          </article>;
        })}
      </div>
      <p className="sdx-disclaimer">Všetky čísla sú fiktívne. V reálnej administrácii sa jednotlivé stavby otvoria do detailného finančného prehľadu.</p>
    </section>
    <div className="sdx-next"><Link href="/design-preview/stavby">Pozrieť návrh stavieb <span aria-hidden="true">→</span></Link></div>
  </Shell>;
}

export default async function PreviewScreen({params}:{params:Promise<{section:string}>}) {
  if(process.env.VERCEL_ENV === "production") notFound();
  const {section} = await params;
  if(section==="dochadzka")return <AttendanceScreen/>;
  if(section==="vyplaty")return <PayrollScreen/>;
  if(section==="stavby")return <ProjectsScreen/>;
  if(section==="pracovnici")return <WorkersScreen/>;
  if(section==="financie")return <FinanceScreen/>;
  notFound();
}
