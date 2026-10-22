import { lineTotal, totals } from "./lib/pricing.mjs";

const STORAGE = "ponkaro_clean_rebuild_demo_v1";
const KINDS = {
  supis: { title: "Súpisy prác", one: "Súpis prác", code: "SUP", partner: "Objednávateľ", statuses: [["draft", "Rozpracovaný"], ["sent", "Odoslaný"], ["approved", "Schválený"], ["invoiced", "Fakturovaný"]] },
  ponuka: { title: "Cenové ponuky", one: "Cenová ponuka", code: "CP", partner: "Zákazník", statuses: [["draft", "Rozpracovaná"], ["sent", "Odoslaná"], ["approved", "Schválená"], ["rejected", "Zamietnutá"]] },
  objednavka: { title: "Objednávky", one: "Objednávka", code: "OBJ", partner: "Dodávateľ", statuses: [["draft", "Pripravená"], ["ordered", "Objednaná"], ["partial", "Čiastočne dodaná"], ["delivered", "Dodaná"]] }
};
const $ = (id) => document.getElementById(id);
const text = (v) => String(v ?? "");
const escapeHtml = (v) => text(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const eur = (v) => new Intl.NumberFormat("sk-SK", { style: "currency", currency: "EUR" }).format(v || 0);
const dateNow = () => new Date().toISOString().slice(0, 10);
const clone = (x) => JSON.parse(JSON.stringify(x));
const number = (value) => Number(String(value || 0).replace(",", "."));

let documents = [];
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE) || "[]");
  if (Array.isArray(saved)) documents = saved;
} catch { /* nechaj prázdne */ }
let kind = "supis";
let currentId = null;

function makeNumber(k) {
  const year = new Date().getFullYear();
  const prefix = KINDS[k].code + "-" + year + "-";
  const max = documents.filter((d) => d.kind === k && typeof d.number === "string" && d.number.startsWith(prefix))
    .reduce((m, d) => Math.max(m, Number(d.number.slice(prefix.length)) || 0), 0);
  return prefix + String(max + 1).padStart(3, "0");
}

function settings() {
  return {
    workMarkupPercent: $("workMarkup").value,
    materialMarkupPercent: $("materialMarkup").value,
    includeVat: $("includeVat").checked,
    roundTotalTo: $("rounding").value
  };
}

function addItem(item = {}) {
  const tr = document.createElement("tr");
  tr.innerHTML = '<td><input data-key="description" placeholder="Popis položky"></td>' +
    '<td><input data-key="quantity" inputmode="decimal" type="number" min="0" step="any"></td>' +
    '<td><input data-key="unit" placeholder="MJ"></td>' +
    '<td><input data-key="workUnitPrice" inputmode="decimal" type="number" min="0" step="any"></td>' +
    '<td><input data-key="materialUnitPrice" inputmode="decimal" type="number" min="0" step="any"></td>' +
    '<td><input data-key="combinedUnitPrice" inputmode="decimal" type="number" min="0" step="any"></td>' +
    '<td class="line-total">0,00 €</td><td><button class="row-del" aria-label="Odstrániť položku">×</button></td>';
  for (const key of ["description", "quantity", "unit", "workUnitPrice", "materialUnitPrice", "combinedUnitPrice"]) {
    const input = tr.querySelector('[data-key="' + key + '"]');
    input.value = item[key] ?? (key === "quantity" ? 1 : key === "unit" ? "ks" : "");
  }
  $("items").appendChild(tr);
  recalc();
}

function rowData(tr) {
  const get = (key) => tr.querySelector('[data-key="' + key + '"]').value;
  return {
    type: "item",
    description: get("description").trim(),
    quantity: get("quantity"),
    unit: get("unit").trim() || "ks",
    workUnitPrice: get("workUnitPrice"),
    materialUnitPrice: get("materialUnitPrice"),
    combinedUnitPrice: get("combinedUnitPrice")
  };
}

function collect() {
  return {
    id: currentId || crypto.randomUUID(),
    kind,
    number: $("docNumber").textContent,
    project: $("project").value.trim(),
    partner: $("partner").value.trim(),
    title: $("title").value.trim(),
    date: $("date").value,
    status: $("status").value,
    note: $("note").value.trim(),
    settings: settings(),
    items: Array.from($("items").querySelectorAll("tr")).map(rowData),
    updatedAt: new Date().toISOString()
  };
}

function recalc() {
  try {
    const d = collect();
    let i = 0;
    for (const tr of $("items").querySelectorAll("tr")) {
      tr.querySelector(".line-total").textContent = eur(lineTotal(d.items[i++], d.settings));
    }
    const t = totals(d.items, d.settings);
    $("subtotal").textContent = eur(t.subtotal);
    $("vat").textContent = eur(t.vat);
    $("grand").textContent = eur(t.total);
    $("message").textContent = "";
    return t;
  } catch (err) {
    $("message").textContent = "Skontroluj jednotkové ceny, množstvá a prirážky: " + err.message;
    return null;
  }
}

function renderList() {
  const matched = documents.filter((d) => d.kind === kind).sort((a, b) => text(b.updatedAt).localeCompare(text(a.updatedAt)));
  $("docCount").textContent = String(matched.length);
  $("docList").innerHTML = "";
  if (!matched.length) $("docList").innerHTML = '<div class="empty">Zatiaľ nemáš uložené dokumenty.</div>';
  for (const d of matched) {
    const btn = document.createElement("button");
    btn.className = "doc-card" + (currentId === d.id ? " selected" : "");
    btn.innerHTML = "<b>" + escapeHtml(d.number) + "</b><small>" + escapeHtml(d.project || d.title || "Bez názvu") +
      "</small><small>" + escapeHtml(d.date || "") + "</small>";
    btn.addEventListener("click", () => loadDocument(d));
    $("docList").appendChild(btn);
  }
}

function updateKind(k) {
  kind = k;
  for (const b of $("nav").querySelectorAll("button")) b.classList.toggle("active", b.dataset.kind === k);
  $("pageTitle").textContent = KINDS[k].title;
  $("partnerLabel").firstChild.textContent = KINDS[k].partner;
  $("copyMailBtn").hidden = k !== "objednavka";
  $("status").innerHTML = "";
  for (const [value, caption] of KINDS[k].statuses) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = caption;
    $("status").appendChild(opt);
  }
}

function freshDoc() {
  currentId = null;
  $("docNumber").textContent = makeNumber(kind);
  $("editorTitle").textContent = "Nový dokument";
  for (const id of ["project", "partner", "title", "note"]) $(id).value = "";
  $("date").value = dateNow();
  $("status").value = "draft";
  $("workMarkup").value = "0";
  $("materialMarkup").value = "0";
  $("rounding").value = "0.01";
  $("includeVat").checked = true;
  $("items").innerHTML = "";
  addItem();
  $("message").textContent = "";
  renderList();
}

function loadDocument(doc) {
  updateKind(doc.kind);
  currentId = doc.id;
  $("docNumber").textContent = doc.number;
  $("editorTitle").textContent = doc.title || KINDS[doc.kind].one;
  for (const id of ["project", "partner", "title", "date", "status", "note"]) $(id).value = doc[id] || "";
  $("workMarkup").value = doc.settings?.workMarkupPercent ?? 0;
  $("materialMarkup").value = doc.settings?.materialMarkupPercent ?? 0;
  $("rounding").value = doc.settings?.roundTotalTo ?? 0.01;
  $("includeVat").checked = doc.settings?.includeVat !== false;
  $("items").innerHTML = "";
  (doc.items?.length ? doc.items : [{}]).forEach(addItem);
  recalc();
  renderList();
}

function save() {
  const t = recalc();
  if (!t) return;
  const d = collect();
  if (!d.items.some((i) => i.description)) {
    $("message").textContent = "Doplň aspoň jednu položku s popisom.";
    return;
  }
  const pos = documents.findIndex((x) => x.id === d.id);
  if (pos < 0) documents.push(d);
  else documents[pos] = d;
  try {
    localStorage.setItem(STORAGE, JSON.stringify(documents));
  } catch (err) {
    $("message").textContent = "Ukladanie zlyhalo: " + err.message;
    return;
  }
  currentId = d.id;
  $("message").textContent = "Skúšobný dokument uložený v tomto prehliadači.";
  renderList();
}

function copyMail() {
  if (kind !== "objednavka") return;
  const d = collect();
  const content = "Dobrý deň,\n\nprosím o objednanie nasledovného materiálu pre zákazku " + (d.project || "") +
    ":\n\n" + d.items.filter((i) => i.description).map((i) => "- " + i.description + " – " + i.quantity + " " + i.unit).join("\n") +
    "\n\n" + (d.note ? d.note + "\n\n" : "") + "Ďakujem a prajem pekný deň.";
  navigator.clipboard.writeText(content).then(
    () => { $("message").textContent = "Text objednávky skopírovaný. Môžeš ho vložiť do webmailu."; },
    () => { $("message").textContent = "Kopírovanie nebolo povolené prehliadačom."; }
  );
}

function printDocument() {
  const t = recalc();
  if (!t) return;
  const d = collect();
  const lines = d.items.filter((i) => i.description).map((i) => "<tr><td>" + escapeHtml(i.description) + "</td><td>" + escapeHtml(i.quantity) +
    "</td><td>" + escapeHtml(i.unit) + "</td><td>" + eur(lineTotal(i, d.settings)) + "</td></tr>").join("");
  $("printArea").innerHTML = "<h1>" + escapeHtml(KINDS[kind].one) + "</h1>" +
    '<div class="print-meta"><div>Číslo: ' + escapeHtml(d.number) + "</div><div>Dátum: " + escapeHtml(d.date) +
    "</div><div>Zákazka: " + escapeHtml(d.project) + "</div><div>" + escapeHtml(KINDS[kind].partner) + ": " + escapeHtml(d.partner) +
    "</div></div><p>" + escapeHtml(d.title) + "</p><table><thead><tr><th>Popis</th><th>Množstvo</th><th>MJ</th><th>Spolu</th></tr></thead><tbody>" +
    lines + '</tbody></table><div class="print-total">Celkom: ' + eur(t.total) + "</div><div>DPH: " + eur(t.vat) +
    '</div><p class="print-note">' + escapeHtml(d.note) + "</p>";
  window.print();
}

$("nav").addEventListener("click", (event) => {
  const btn = event.target.closest("[data-kind]");
  if (!btn) return;
  updateKind(btn.dataset.kind);
  freshDoc();
});
$("newBtn").addEventListener("click", freshDoc);
$("addRow").addEventListener("click", () => addItem());
$("items").addEventListener("click", (event) => {
  if (!event.target.closest(".row-del")) return;
  event.target.closest("tr").remove();
  if (!$("items").querySelector("tr")) addItem();
  recalc();
});
$("items").addEventListener("input", recalc);
for (const id of ["workMarkup", "materialMarkup", "rounding", "includeVat"]) $(id).addEventListener("change", recalc);
$("saveBtn").addEventListener("click", save);
$("copyMailBtn").addEventListener("click", copyMail);
$("printBtn").addEventListener("click", printDocument);
$("duplicateBtn").addEventListener("click", () => {
  const d = collect();
  d.id = crypto.randomUUID();
  d.number = makeNumber(kind);
  d.status = "draft";
  currentId = null;
  loadDocument(d);
  currentId = null;
  $("message").textContent = "Kópia je pripravená. Pre uloženie klikni Uložiť dokument.";
});
$("deleteBtn").addEventListener("click", () => {
  if (!currentId) return;
  if (!confirm("Odstrániť skúšobný dokument?")) return;
  documents = documents.filter((d) => d.id !== currentId);
  localStorage.setItem(STORAGE, JSON.stringify(documents));
  freshDoc();
});
$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify({ version: 1, documents }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ponkaro-skusobna-zaloha-" + dateNow() + ".json";
  a.click();
  URL.revokeObjectURL(url);
});
$("importInput").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (imported.version !== 1 || !Array.isArray(imported.documents) || imported.documents.length > 1000 ||
        !imported.documents.every((d) => KINDS[d.kind] && Array.isArray(d.items))) throw new Error("Nesprávny formát zálohy");
    if (!confirm("Nahradiť skúšobné dokumenty obsahom zálohy?")) return;
    documents = clone(imported.documents);
    localStorage.setItem(STORAGE, JSON.stringify(documents));
    freshDoc();
  } catch (err) { $("message").textContent = "Import zlyhal: " + err.message; }
  event.target.value = "";
});
updateKind(kind);
freshDoc();
