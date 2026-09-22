import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'

const iSt = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 11px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }

const ETAPAS = [
  { key: 'corte', label: 'Corte', color: '#7b9fff' },
  { key: 'armado', label: 'Aguj1+Al+Peg', color: '#38bdf8' },
  { key: 'encuadre', label: 'Encuadre', color: '#3dd68c' },
  { key: 'aguj2', label: 'Aguj N°2', color: '#a78bfa' },
  { key: 'enduido_lija', label: 'Enduido+Lija', color: '#fbbf24' },
  { key: 'pintura', label: 'Pintura', color: '#fb923c' },
]
const OT_ETAPAS = ['corte', 'armado']   // estas vienen de la OT
const MODOS = [['dia', 'Día'], ['semana', 'Semana'], ['mes', 'Mes'], ['anio', 'Año']]
const ETAPA_LABEL = { corte: 'Corte', armado: 'Aguj1+Alambre+Pegado', taller: 'Taller', encuadre: 'Encuadre', aguj2: 'Aguj N°2', enduido_lija: 'Enduido+Lija', pintura: 'Pintura' }
const fmtDur = m => (m == null || m === '') ? '—' : `${Math.floor(m / 60)}h ${m % 60}m`
const fmtF = f => f ? new Date(f + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

const dOf = s => s ? String(s).slice(0, 10) : ''
function isoWeek(iso) {
  const d = new Date(iso + 'T12:00:00'); const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day + 3); const firstThu = new Date(d.getFullYear(), 0, 4)
  const week = 1 + Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getDay() + 6) % 7)) / 7)
  return `${d.getFullYear()}-S${String(week).padStart(2, '0')}`
}
// Filtro por familia/modelo específico
const matchFamilia = (familia, modelo) => {
  const m = modelo || ''
  if (familia === '1400') return m.includes('1400')
  if (familia === '250') return m.includes('250')
  if (familia === '500') return m.includes('500')
  return true   // '' = Todos
}
const periodKey = (iso, modo) => modo === 'dia' ? iso : modo === 'mes' ? iso.slice(0, 7) : modo === 'anio' ? iso.slice(0, 4) : isoWeek(iso)
const periodLabel = (k, modo) => modo === 'dia' ? new Date(k + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : k

export default function ReporteProduccion() {
  const { isAdmin, isAdmin2, isMantenimiento } = useAuth()
  const [ot, setOt] = useState([])
  const [partes, setPartes] = useState([])
  const [lotes, setLotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [modo, setModo] = useState('dia')
  const [familia, setFamilia] = useState('')   // '' | '1400' | 'otros'
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [vista, setVista] = useState('resumen')   // 'resumen' | 'detalle'
  const [loteNum, setLoteNum] = useState({})

  useEffect(() => { if (isAdmin || isAdmin2 || isMantenimiento) cargar() }, [isAdmin, isAdmin2, isMantenimiento])
  async function cargar() {
    setLoading(true)
    const [otD, parD, lotD] = await Promise.all([
      fetchAllRows(() => supabase.from('produccion_ot').select('lote_id,etapa,piezas,fecha_fin,hora_fin,fecha_inicio,hora_inicio,duracion_min,personal,created_at')),
      fetchAllRows(() => supabase.from('produccion_partes').select('lote_id,etapa,cantidad,fecha,created_at')),
      fetchAllRows(() => supabase.from('produccion_lotes').select('id,modelo,numero')),
    ])
    setOt(otD || []); setPartes(parD || [])
    setLotes(Object.fromEntries((lotD || []).map(l => [l.id, l.modelo || ''])))
    setLoteNum(Object.fromEntries((lotD || []).map(l => [l.id, l.numero])))
    setLoading(false)
  }

  // Filas de detalle: cada OT (corte/armado/taller) con fecha, lote, etapa, duración y personal
  const detalle = useMemo(() => {
    const rows = (ot || []).map(o => {
      const fecha = dOf(o.fecha_fin || o.fecha_inicio || o.created_at)
      const modelo = lotes[o.lote_id] || ''
      const personal = Array.isArray(o.personal) ? o.personal : []
      return { fecha, lote: loteNum[o.lote_id], modelo, etapa: o.etapa, inicio: o.fecha_inicio, fin: o.fecha_fin, dur: o.duracion_min, personal, piezas: Number(o.piezas) || 0 }
    })
    return rows.filter(r => {
      if (!r.fecha) return false
      if (!matchFamilia(familia, r.modelo)) return false
      if (desde && r.fecha < desde) return false
      if (hasta && r.fecha > hasta) return false
      return true
    }).sort((a, b) => a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0)
  }, [ot, lotes, loteNum, familia, desde, hasta])

  const eventos = useMemo(() => {
    const ev = []
    // Corte / Armado desde la OT
    for (const o of ot) {
      if (!OT_ETAPAS.includes(o.etapa)) continue
      const cant = Number(o.piezas) || 0; if (cant <= 0) continue
      const fecha = dOf(o.fecha_fin || o.fecha_inicio || o.created_at)
      if (fecha) ev.push({ fecha, etapa: o.etapa, cantidad: cant, modelo: lotes[o.lote_id] || '' })
    }
    // Resto de etapas desde los Partes
    for (const p of partes) {
      if (OT_ETAPAS.includes(p.etapa)) continue
      const cant = Number(p.cantidad) || 0; if (cant <= 0) continue
      const fecha = dOf(p.fecha || p.created_at)
      if (fecha) ev.push({ fecha, etapa: p.etapa, cantidad: cant, modelo: lotes[p.lote_id] || '' })
    }
    return ev
  }, [ot, partes, lotes])

  const filtrados = eventos.filter(e => {
    if (!matchFamilia(familia, e.modelo)) return false
    if (desde && e.fecha < desde) return false
    if (hasta && e.fecha > hasta) return false
    return true
  })

  // Agrupar por período × etapa
  const filas = useMemo(() => {
    const m = new Map()
    for (const e of filtrados) {
      const k = periodKey(e.fecha, modo)
      if (!m.has(k)) m.set(k, { periodo: k, total: 0, celdas: {} })
      const row = m.get(k)
      row.celdas[e.etapa] = (row.celdas[e.etapa] || 0) + e.cantidad
      row.total += e.cantidad
    }
    return [...m.values()].sort((a, b) => a.periodo < b.periodo ? 1 : -1)   // más reciente primero
  }, [filtrados, modo])

  const totalesEtapa = useMemo(() => {
    const t = {}; let g = 0
    for (const r of filas) { for (const e of ETAPAS) t[e.key] = (t[e.key] || 0) + (r.celdas[e.key] || 0); g += r.total }
    return { t, g }
  }, [filas])

  if (!isAdmin && !isAdmin2 && !isMantenimiento) return null

  const th = { padding: '8px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }
  const td = { padding: '7px 10px', fontSize: 13, borderBottom: '1px solid var(--border)', textAlign: 'center' }

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Reporte de Producción</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Unidades por etapa · por día, semana, mes o año</p>
      </div>

      {/* Vista */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {[['resumen', '📊 Resumen por período'], ['detalle', '🧾 Detalle por OT / etapa']].map(([v, l]) => (
          <button key={v} onClick={() => setVista(v)} style={{ padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', border: `1px solid ${vista === v ? 'transparent' : 'var(--border)'}`, background: vista === v ? 'var(--brand-gradient)' : 'var(--surface2)', color: vista === v ? '#fff' : 'var(--text3)' }}>{l}</button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
        {vista === 'resumen' && <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 3 }}>
          {MODOS.map(([v, l]) => (
            <button key={v} onClick={() => setModo(v)} style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', border: 'none', background: modo === v ? 'var(--brand-gradient)' : 'transparent', color: modo === v ? '#fff' : 'var(--text3)' }}>{l}</button>
          ))}
        </div>}
        <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 3 }}>
          {[['', 'Todos'], ['1400', '1400w (F)'], ['500', '500w'], ['250', '250w']].map(([v, l]) => (
            <button key={v || 't'} onClick={() => setFamilia(v)} style={{ padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', border: 'none', background: familia === v ? 'rgba(74,108,247,0.2)' : 'transparent', color: familia === v ? '#7b9fff' : 'var(--text3)' }}>{l}</button>
          ))}
        </div>
        {(() => { const h = new Date(); const hoy = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`; const activo = desde === hoy && hasta === hoy
          return <button onClick={() => { setModo('dia'); setDesde(hoy); setHasta(hoy) }} style={{ ...iSt, cursor: 'pointer', fontWeight: 700, background: activo ? 'var(--brand-gradient)' : 'var(--surface2)', color: activo ? '#fff' : 'var(--text2)', border: activo ? '1px solid transparent' : '1px solid var(--border)' }}>Hoy</button> })()}
        <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>Desde</span>
        <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={iSt} />
        <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>Hasta</span>
        <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={iSt} />
        {(desde || hasta) && <button onClick={() => { setDesde(''); setHasta('') }} style={{ ...iSt, cursor: 'pointer', color: 'var(--text3)' }}>Limpiar</button>}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text2)', fontWeight: 700 }}>{vista === 'resumen' ? `Total: ${totalesEtapa.g} u.` : `${detalle.length} OT(s)`}</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
      ) : vista === 'detalle' ? (
        <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 820 }}>
            <thead><tr>
              <th style={{ ...th, textAlign: 'left' }}>Fecha</th>
              <th style={{ ...th, textAlign: 'left' }}>Lote</th>
              <th style={{ ...th, textAlign: 'left' }}>Etapa</th>
              <th style={th}>Inicio</th>
              <th style={th}>Fin</th>
              <th style={th}>Duración</th>
              <th style={{ ...th, textAlign: 'left' }}>Personal</th>
              <th style={th}>Piezas</th>
            </tr></thead>
            <tbody>
              {detalle.map((r, i) => (
                <tr key={i} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...td, textAlign: 'left', whiteSpace: 'nowrap' }}>{fmtF(r.fecha)}</td>
                  <td style={{ ...td, textAlign: 'left', fontWeight: 700, whiteSpace: 'nowrap' }}>{r.modelo.includes('1400') ? 'F' : '#'}{r.lote ?? '—'} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>{r.modelo}</span></td>
                  <td style={{ ...td, textAlign: 'left', whiteSpace: 'nowrap' }}>{ETAPA_LABEL[r.etapa] || r.etapa}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtF(r.inicio)}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtF(r.fin)}</td>
                  <td style={{ ...td, fontWeight: 700, color: r.dur ? '#7b9fff' : 'var(--text3)', whiteSpace: 'nowrap' }}>{fmtDur(r.dur)}</td>
                  <td style={{ ...td, textAlign: 'left' }}>{r.personal.length ? <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{r.personal.map((p, j) => <span key={j} style={{ fontSize: 11, fontWeight: 700, color: '#3dd68c', background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 12, padding: '1px 8px' }}>{p}</span>)}</div> : <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{r.piezas || '·'}</td>
                </tr>
              ))}
              {detalle.length === 0 && <tr><td colSpan={8} style={{ ...td, padding: 30, color: 'var(--text3)' }}>Sin OT registradas en el período. (El detalle sale de las OT de Corte, Alambre y Taller.)</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 720 }}>
            <thead><tr>
              <th style={{ ...th, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--surface)' }}>{MODOS.find(m => m[0] === modo)[1]}</th>
              {ETAPAS.map(e => <th key={e.key} style={{ ...th, color: e.color }}>{e.label}</th>)}
              <th style={{ ...th, color: 'var(--text)' }}>Total</th>
            </tr></thead>
            <tbody>
              {filas.map(r => (
                <tr key={r.periodo} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...td, textAlign: 'left', fontWeight: 700, textTransform: 'capitalize', position: 'sticky', left: 0, background: 'var(--surface)' }}>{periodLabel(r.periodo, modo)}</td>
                  {ETAPAS.map(e => { const v = r.celdas[e.key] || 0; return <td key={e.key} style={{ ...td, color: v ? 'var(--text)' : 'var(--border2)', fontWeight: v ? 700 : 400 }}>{v || '·'}</td> })}
                  <td style={{ ...td, fontWeight: 800, color: '#7b9fff' }}>{r.total}</td>
                </tr>
              ))}
              {filas.length === 0 && <tr><td colSpan={ETAPAS.length + 2} style={{ ...td, padding: 30, color: 'var(--text3)' }}>Sin producción registrada en el período.</td></tr>}
            </tbody>
            {filas.length > 0 && (
              <tfoot><tr>
                <td style={{ ...td, textAlign: 'left', fontWeight: 800, position: 'sticky', left: 0, background: 'var(--surface)' }}>TOTAL</td>
                {ETAPAS.map(e => <td key={e.key} style={{ ...td, fontWeight: 800, color: e.color }}>{totalesEtapa.t[e.key] || 0}</td>)}
                <td style={{ ...td, fontWeight: 800, color: '#7b9fff' }}>{totalesEtapa.g}</td>
              </tr></tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  )
}
