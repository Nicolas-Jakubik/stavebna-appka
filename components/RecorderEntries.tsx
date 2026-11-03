'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type Project = { id: number | string; nazov: string }
type ObjectRow = { id: number | string; nazov: string; zakazka_id: number | string; aktivny?: boolean }
type Entry = {
  id: number
  meno: string
  datum: string
  zakazka: string
  objekt_id: number | null
  prichod: string
  odchod: string
  created_at: string
  edit_revision: number
  edit_locked: boolean
  edited_at: string | null
  edited_by: string | null
}
type Change = {
  id: number; dochadzka_id: number; changed_at: string
  actor_label: string; actor_kind: 'admin' | 'recorder'
  old_values: Record<string, string | number | null>
  new_values: Record<string, string | number | null>
  revision: number
}
type Props = {
  date: string
  onDateChange: (date: string) => void
  activeJobs: Project[]
  objects: ObjectRow[]
  onSaved: () => void
}
const time = (value: string | null | undefined) => String(value || '').slice(0, 5)
const formatDate = (date: string) => date ? date.split('-').reverse().join('. ') : ''
const formatStamp = (value: string) => new Date(value).toLocaleString('sk-SK', {
  day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
})
const fieldStyle = {
  width: '100%', minHeight: 46, padding: '10px 12px',
  border: '1px solid #d2d2d7', borderRadius: 11, fontSize: 15,
  color: '#1d1d1f', background: '#fff', boxSizing: 'border-box' as const,
}
const buttonStyle = {
  border: '1px solid #e5e5e7', borderRadius: 11, padding: '9px 13px',
  fontSize: 13, background: '#fff', color: '#1d1d1f', cursor: 'pointer',
}

export default function RecorderEntries({ date, onDateChange, activeJobs, objects, onSaved }: Props) {
  const [rows, setRows] = useState<Entry[]>([])
  const [history, setHistory] = useState<Change[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<Entry | null>(null)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [actor, setActor] = useState('')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [site, setSite] = useState('')
  const [objectId, setObjectId] = useState('')

  const reload = useCallback(async () => {
    if (!date) return
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/recorder/attendance?date=' + encodeURIComponent(date), {
        credentials: 'same-origin', cache: 'no-store',
      })
      const d = await r.json()
      if (!r.ok) throw Error(d.error || 'Zoznam nie je dostupný.')
      setRows(d.rows || [])
      setHistory(d.history || [])
      setIsAdmin(Boolean(d.isAdmin))
    } catch (e) {
      setRows([])
      setHistory([])
      setError(e instanceof Error ? e.message : 'Zoznam sa nepodarilo načítať.')
    } finally {
      setBusy(false)
    }
  }, [date])

  useEffect(() => { void reload() }, [reload])
  useEffect(() => {
    try { setActor(localStorage.getItem('sd-evidencia-editor-name') || '') } catch {}
  }, [])

  const availableObjects = useMemo(() => {
    const project = activeJobs.find(p => p.nazov === site)
    return objects.filter(o => String(o.zakazka_id) === String(project?.id || '') && o.aktivny !== false)
  }, [site, activeJobs, objects])

  const openEdit = (entry: Entry) => {
    setEditing(entry)
    setStart(time(entry.prichod))
    setEnd(time(entry.odchod))
    setSite(entry.zakazka)
    setObjectId(entry.objekt_id === null ? '' : String(entry.objekt_id))
    setError('')
    setMessage('')
  }
  const closeEdit = () => { if (!saving) setEditing(null) }

  async function save() {
    if (!editing || saving) return
    const name = actor.trim()
    const valid = /^(?:[01]\d|2[0-3]):(?:00|15|30|45)$/
    if (!isAdmin && (!name || name.length > 60)) {
      setError('Napíšte svoje meno, aby sme vedeli, kto opravu vykonal.')
      return
    }
    if (!valid.test(start) || !valid.test(end) || start === end || !site) {
      setError('Vyberte stavbu a časy po 15 minútach.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const r = await fetch('/api/recorder/attendance', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id, revision: editing.edit_revision,
          actor: isAdmin ? 'Administrátor' : name,
          zakazka: site, objekt_id: objectId ? Number(objectId) : null,
          prichod: start, odchod: end,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw Error(d.error || 'Opravu sa nepodarilo uložiť.')
      if (!isAdmin) {
        try { localStorage.setItem('sd-evidencia-editor-name', name) } catch {}
      }
      setEditing(null)
      setMessage('Oprava bola uložená. Pôvodný čas zostal v histórii.')
      await reload()
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Oprava sa nepodarila.')
    } finally {
      setSaving(false)
    }
  }

  const onShiftDate = (days: number) => {
    const d = new Date(date + 'T12:00:00Z')
    if (Number.isNaN(d.getTime())) return
    d.setUTCDate(d.getUTCDate() + days)
    onDateChange(d.toISOString().slice(0, 10))
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const oldest = new Date(today + 'T12:00:00Z')
  oldest.setUTCDate(oldest.getUTCDate() - 31)
  const inWindow = date >= oldest.toISOString().slice(0, 10) && date <= today

  return (
    <section aria-label="Zápisy dochádzky" style={{ fontFamily: 'inherit', color: '#1d1d1f' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Zápisy za vybraný deň</h2>
          <p style={{ margin: '5px 0 0', fontSize: 12, color: '#86868b' }}>Všetky uložené zápisy, vrátane opráv.</p>
        </div>
        <button type="button" onClick={() => void reload()} disabled={busy} style={buttonStyle}>↻ Obnoviť</button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <button type="button" onClick={() => onShiftDate(-1)} aria-label="Predchádzajúci deň" style={buttonStyle}>‹</button>
        <input aria-label="Dátum zápisov" type="date" value={date} onChange={e => onDateChange(e.target.value)}
          style={{ ...fieldStyle, flex: 1, minWidth: 0, textAlign: 'center' }} />
        <button type="button" onClick={() => onShiftDate(1)} aria-label="Nasledujúci deň" style={buttonStyle}>›</button>
      </div>

      <div aria-live="polite" style={{ fontSize: 12, color: '#6e6e73', marginBottom: 14 }}>
        {busy ? 'Načítavam…' : `${rows.length} zápisov · ${formatDate(date)}`}
      </div>
      {message && <div role="status" style={{ padding: 11, borderRadius: 11, background: '#ecfdf5', color: '#047857', fontSize: 13, marginBottom: 12 }}>{message}</div>}
      {error && !editing && <div role="alert" style={{ padding: 11, borderRadius: 11, background: '#fef2f2', color: '#b91c1c', fontSize: 13, marginBottom: 12 }}>{error}</div>}
      {!busy && !error && rows.length === 0 && (
        <div style={{ padding: 24, textAlign: 'center', borderRadius: 15, background: '#f5f5f7', color: '#86868b', fontSize: 13 }}>
          V tento deň nie je uložený žiadny zápis.
        </div>
      )}
      <div style={{ display: 'grid', gap: 10 }}>
        {rows.map(entry => {
          const changes = history.filter(h => Number(h.dochadzka_id) === Number(entry.id))
          const canEdit = isAdmin || (!entry.edit_locked && inWindow)
          const isExpanded = expanded === entry.id
          const obj = objects.find(o => String(o.id) === String(entry.objekt_id))
          return (
            <article key={entry.id} style={{ padding: '15px 16px', border: '1px solid #e5e5e7', background: '#fff', borderRadius: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 9, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{entry.meno}</div>
                  <div style={{ marginTop: 4, fontSize: 12, color: '#86868b' }}>
                    {entry.zakazka}{obj ? ` · ${obj.nazov}` : ''}
                  </div>
                </div>
                <span style={{ flexShrink: 0, padding: '5px 9px', borderRadius: 100, background: entry.edit_locked ? '#fff7ed' : entry.edit_revision ? '#eff6ff' : '#f5f5f7', color: entry.edit_locked ? '#9a3412' : entry.edit_revision ? '#1d4ed8' : '#6e6e73', fontWeight: 650, fontSize: 10 }}>
                  {entry.edit_locked ? '🔒 Uzamknuté' : entry.edit_revision ? 'Upravené' : 'Zapísané'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 13 }}>
                <strong style={{ fontSize: 18 }}>{time(entry.prichod)} – {time(entry.odchod)}</strong>
                {canEdit
                  ? <button type="button" onClick={() => openEdit(entry)} style={buttonStyle}>✎ Upraviť</button>
                  : <span style={{ fontSize: 11, color: '#86868b', maxWidth: 165, textAlign: 'right' }}>
                    {entry.edit_locked ? 'Upraviť môže iba administrátor' : 'Starší zápis opravuje administrátor'}
                  </span>}
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: '#86868b', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                {entry.edited_at ? `Upravil: ${entry.edited_by} · ${formatStamp(entry.edited_at)}` : `Vytvorené: ${formatStamp(entry.created_at)}`}
                {changes.length > 0 && <button type="button" onClick={() => setExpanded(isExpanded ? null : entry.id)} style={{ ...buttonStyle, padding: '4px 9px', fontSize: 11 }}>
                  História ({changes.length}) {isExpanded ? '⌃' : '⌄'}
                </button>}
              </div>
              {isExpanded && changes.length > 0 && (
                <div style={{ marginTop: 11, padding: 12, borderRadius: 11, background: '#f5f5f7', display: 'grid', gap: 10 }}>
                  {changes.map(change => (
                    <div key={change.id} style={{ fontSize: 12 }}>
                      <div style={{ color: '#6e6e73', marginBottom: 3 }}>
                        {formatStamp(change.changed_at)} · {change.actor_kind === 'admin' ? 'Administrátor' : change.actor_label + ' (neoverené meno)'}
                      </div>
                      <div>
                        {time(String(change.old_values.prichod))} – {time(String(change.old_values.odchod))}
                        {' → '}
                        <strong>{time(String(change.new_values.prichod))} – {time(String(change.new_values.odchod))}</strong>
                      </div>
                      {change.old_values.zakazka !== change.new_values.zakazka && (
                        <div style={{ marginTop: 3 }}>Stavba: {String(change.old_values.zakazka)} → {String(change.new_values.zakazka)}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>

      {editing && (
        <div role="presentation" onClick={closeEdit} style={{ position: 'fixed', zIndex: 1000, inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', padding: 14 }}>
          <div role="dialog" aria-modal="true" aria-label="Upraviť zápis" onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 20, padding: 22, width: '100%', maxWidth: 430, maxHeight: '90dvh', overflowY: 'auto', boxShadow: '0 22px 80px #0003' }}>
            <h2 style={{ fontSize: 20, margin: '0 0 6px' }}>Upraviť zápis</h2>
            <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 18 }}>{editing.meno} · {formatDate(editing.datum)}</div>
            {!isAdmin && <label style={{ display: 'block', fontSize: 12, marginBottom: 14 }}>
              <span style={{ display: 'block', marginBottom: 6 }}>Kto opravuje? (stačí raz na tomto telefóne)</span>
              <input aria-label="Meno zapisovateľa" value={actor} maxLength={60} onChange={e => setActor(e.target.value)} placeholder="Vaše meno" style={fieldStyle}/>
            </label>}
            <label style={{ display: 'block', fontSize: 12, marginBottom: 14 }}>
              <span style={{ display: 'block', marginBottom: 6 }}>Stavba</span>
              <select value={site} onChange={e => { setSite(e.target.value); setObjectId('') }} style={fieldStyle}>
                {activeJobs.map(p => <option value={p.nazov} key={p.id}>{p.nazov}</option>)}
                {!activeJobs.some(p => p.nazov === site) && <option value={site}>{site}</option>}
              </select>
            </label>
            {availableObjects.length > 0 && <label style={{ display: 'block', fontSize: 12, marginBottom: 14 }}>
              <span style={{ display: 'block', marginBottom: 6 }}>Objekt (nepovinné)</span>
              <select value={objectId} onChange={e => setObjectId(e.target.value)} style={fieldStyle}>
                <option value="">Celá stavba</option>
                {availableObjects.map(o => <option key={o.id} value={o.id}>{o.nazov}</option>)}
              </select>
            </label>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <label style={{ fontSize: 12 }}>Príchod
                <input type="time" aria-label="Nový príchod" step={900} value={start} onChange={e => setStart(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} />
              </label>
              <label style={{ fontSize: 12 }}>Odchod
                <input type="time" aria-label="Nový odchod" step={900} value={end} onChange={e => setEnd(e.target.value)} style={{ ...fieldStyle, marginTop: 6 }} />
              </label>
            </div>
            {isAdmin && <p style={{ fontSize: 12, background: '#fff7ed', padding: 10, borderRadius: 10 }}>Administrátorská oprava tento zápis uzamkne.</p>}
            {error && <p role="alert" style={{ fontSize: 12, color: '#b91c1c' }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" disabled={saving} onClick={closeEdit} style={{ ...buttonStyle, flex: 1, minHeight: 46 }}>Zrušiť</button>
              <button type="button" disabled={saving} onClick={() => void save()} style={{ ...buttonStyle, flex: 1, minHeight: 46, color: '#fff', borderColor: '#0071e3', background: '#0071e3', opacity: saving ? .6 : 1 }}>
                {saving ? 'Ukladám…' : 'Uložiť opravu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
