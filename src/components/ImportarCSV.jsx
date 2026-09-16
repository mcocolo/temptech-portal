import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }

// Parser CSV: soporta comillas, y detecta separador , o ;
function parseCSV(text) {
  const first = text.split(/\r?\n/)[0] || ''
  const delim = (first.split(';').length > first.split(',').length) ? ';' : ','
  const rows = []; let row = [], cur = '', inQ = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++ } else inQ = false } else cur += ch }
    else if (ch === '"') inQ = true
    else if (ch === delim) { row.push(cur); cur = '' }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
    else if (ch === '\r') { /* skip */ }
    else cur += ch
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row) }
  return rows.filter(r => r.some(c => String(c).trim() !== ''))
}

function conv(val, type) {
  const s = (val == null ? '' : String(val)).trim()
  if (s === '') return null
  if (type === 'number') { const n = Number(s.replace(/\./g, '').replace(',', '.')); return isNaN(n) ? null : n }
  if (type === 'int') { const n = parseInt(s); return isNaN(n) ? null : n }
  if (type === 'date') {
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/); if (m) { let [, d, mo, y] = m; if (y.length === 2) y = '20' + y; return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}` }
    return null
  }
  if (type === 'list') return s.split(/[|,;]/).map(x => x.trim()).filter(Boolean)
  if (type === 'bool') return /^(si|sí|true|1|x)$/i.test(s)
  return s
}

export default function ImportarCSV({ titulo, tabla, columnas, fijos = {}, onClose, onDone }) {
  const [texto, setTexto] = useState('')
  const [rows, setRows] = useState(null)   // { validas:[], invalidas:[], headers:[] }
  const [importando, setImportando] = useState(false)

  function analizar(text) {
    const parsed = parseCSV(text)
    if (parsed.length < 2) { setRows({ validas: [], invalidas: [], headers: [] }); return }
    const headers = parsed[0].map(h => h.trim().toLowerCase())
    const idxDe = key => headers.indexOf(key.toLowerCase())
    const validas = [], invalidas = []
    for (const r of parsed.slice(1)) {
      const obj = { ...fijos }
      let faltaReq = false
      for (const c of columnas) {
        const i = idxDe(c.label)
        let v = i >= 0 ? conv(r[i], c.type) : null
        if ((v == null || v === '') && c.def != null) v = c.def
        if (c.required && (v == null || v === '')) faltaReq = true
        obj[c.key] = v
      }
      if (faltaReq) invalidas.push(obj); else validas.push(obj)
    }
    setRows({ validas, invalidas, headers })
  }

  function onFile(file) {
    if (!file) return
    const rd = new FileReader()
    rd.onload = e => { const t = e.target.result; setTexto(t); analizar(t) }
    rd.readAsText(file, 'UTF-8')
  }

  function descargarPlantilla() {
    const csv = columnas.map(c => c.label + (c.required ? '*' : '')).join(',') + '\n'
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `plantilla_${tabla}.csv`; a.click()
  }

  async function importar() {
    if (!rows?.validas.length) return toast.error('No hay filas válidas para importar')
    setImportando(true)
    let ok = 0, err = 0
    for (let i = 0; i < rows.validas.length; i += 200) {
      const lote = rows.validas.slice(i, i + 200)
      const { error } = await supabase.from(tabla).insert(lote)
      if (error) { err += lote.length; console.error(error) } else ok += lote.length
    }
    setImportando(false)
    if (err) toast.error(`Importadas ${ok}, con error ${err}. Revisá la consola.`)
    else toast.success(`✅ ${ok} filas importadas`)
    onClose(); onDone()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 620, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>📥 Importar CSV · {titulo}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
            Columnas esperadas (la 1ª fila del CSV son los encabezados; * = obligatorio):
            <div style={{ marginTop: 6, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {columnas.map(c => <span key={c.key} style={{ fontSize: 11, fontFamily: 'monospace', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', color: c.required ? '#fb923c' : 'var(--text3)' }}>{c.label}{c.required ? '*' : ''}{c.type ? ` (${c.type})` : ''}</span>)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={descargarPlantilla} style={{ ...iSt, width: 'auto', cursor: 'pointer', color: 'var(--text2)' }}>⬇️ Descargar plantilla</button>
            <label style={{ ...iSt, width: 'auto', cursor: 'pointer', color: 'var(--text2)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              📁 Elegir archivo .csv
              <input type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => onFile(e.target.files?.[0])} />
            </label>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>…o pegá el CSV acá:</div>
            <textarea value={texto} onChange={e => { setTexto(e.target.value); analizar(e.target.value) }} rows={6} placeholder={columnas.map(c => c.label).join(',')} style={{ ...iSt, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }} />
          </div>
          {rows && (
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13 }}>
              <b style={{ color: '#3dd68c' }}>{rows.validas.length}</b> válidas · {rows.invalidas.length > 0 && <b style={{ color: '#ff5577' }}>{rows.invalidas.length} sin campo obligatorio</b>}
              {rows.validas.length > 0 && (
                <div style={{ marginTop: 8, maxHeight: 160, overflowY: 'auto' }}>
                  {rows.validas.slice(0, 6).map((r, i) => <div key={i} style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{columnas.slice(0, 5).map(c => `${c.key}:${Array.isArray(r[c.key]) ? r[c.key].join('|') : (r[c.key] ?? '—')}`).join('  ·  ')}</div>)}
                  {rows.validas.length > 6 && <div style={{ fontSize: 11, color: 'var(--text3)' }}>… y {rows.validas.length - 6} más</div>}
                </div>
              )}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={importar} disabled={importando || !rows?.validas.length} style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: (importando || !rows?.validas.length) ? 'not-allowed' : 'pointer', opacity: (importando || !rows?.validas.length) ? 0.6 : 1, fontFamily: 'var(--font)' }}>{importando ? 'Importando...' : `✓ Importar ${rows?.validas.length || 0} filas`}</button>
            <button onClick={onClose} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
