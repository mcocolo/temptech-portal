import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import { MOTIVOS } from '@/lib/reclamos'

const iSt = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 11px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }

const ESTADO_LABEL = {
  Ingresado: 'Ingresado', pendiente: 'Pendiente', Resolucion: 'Resolución',
  Devolucion: 'Devolución', Service: 'Service', rechazado: 'Rechazado', cerrado: 'Cerrado',
}
const ESTADO_COLOR = {
  Ingresado: '#7b9fff', pendiente: '#ffd166', Resolucion: '#a78bfa',
  Devolucion: '#fb923c', Service: '#2dd4bf', rechazado: '#ff5577', cerrado: '#8b98a9',
}
const ESTADOS = ['Ingresado', 'pendiente', 'Resolucion', 'Devolucion', 'Service', 'rechazado', 'cerrado']
const PALETA = ['#7b9fff', '#fb923c', '#3dd68c', '#a78bfa', '#2dd4bf', '#ffd166', '#ff5577', '#f472b6', '#38bdf8', '#a3e635']

const modeloDe = d => (d.modelo || d.producto || '').trim() || '(sin dato)'
const val = v => (v == null || String(v).trim() === '') ? '(sin dato)' : String(v).trim()
const diasEntre = (a, b) => (!a || !b) ? null : Math.round((new Date(b) - new Date(a)) / 86400000)

function conteo(rows, keyFn) {
  const m = new Map()
  for (const r of rows) { const k = keyFn(r); m.set(k, (m.get(k) || 0) + 1) }
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

// ── Barras horizontales ──
function BarList({ data, total, color = '#7b9fff', max: maxItems, colorByLabel }) {
  const shown = maxItems ? data.slice(0, maxItems) : data
  const max = Math.max(1, ...data.map(d => d.value))
  if (data.length === 0) return <div style={{ fontSize: 12, color: 'var(--text3)', padding: '10px 0' }}>Sin datos.</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 300, overflowY: 'auto' }}>
      {shown.map((d, i) => {
        const c = colorByLabel ? (colorByLabel[d.label] || color) : color
        const pct = total ? Math.round(d.value / total * 100) : 0
        return (
          <div key={d.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
              <span style={{ color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }} title={d.label}>{d.label}</span>
              <span style={{ color: 'var(--text3)', fontWeight: 700, whiteSpace: 'nowrap' }}><b style={{ color: 'var(--text)' }}>{d.value}</b> · {pct}%</span>
            </div>
            <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(2, d.value / max * 100)}%`, height: '100%', background: c, borderRadius: 6 }} />
            </div>
          </div>
        )
      })}
      {maxItems && data.length > maxItems && <div style={{ fontSize: 11, color: 'var(--text3)' }}>+{data.length - maxItems} más…</div>}
    </div>
  )
}

function Card({ titulo, children, span }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 18px', gridColumn: span ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12 }}>{titulo}</div>
      {children}
    </div>
  )
}

function Kpi({ label, value, color, sub }) {
  return (
    <div style={{ background: `${color}14`, border: `1px solid ${color}33`, borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
      <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export default function ReporteDevoluciones() {
  const { isAdmin, isAdmin2 } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [fEstado, setFEstado] = useState('todos')
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')

  useEffect(() => { if (isAdmin || isAdmin2) cargar() }, [isAdmin, isAdmin2])
  async function cargar() {
    setLoading(true)
    const data = await fetchAllRows(() => supabase.from('devoluciones').select('*').not('tracking_id', 'is', null).order('fecha_creacion', { ascending: false }))
    setRows(data || [])
    setLoading(false)
  }

  const f = useMemo(() => {
    return rows.filter(d => {
      if (fEstado !== 'todos' && d.estado !== fEstado) return false
      const fc = d.fecha_creacion ? d.fecha_creacion.slice(0, 10) : ''
      if (desde && fc && fc < desde) return false
      if (hasta && fc && fc > hasta) return false
      return true
    })
  }, [rows, fEstado, desde, hasta])

  const total = f.length
  const stats = useMemo(() => {
    const porEstado = conteo(f, d => val(d.estado))
    const cerrados = f.filter(d => d.estado === 'cerrado').length
    const rechazados = f.filter(d => d.estado === 'rechazado').length
    const abiertos = total - cerrados - rechazados
    const aprobadosSI = f.filter(d => d.aprobado === 'SI').length
    const aprobadosNO = f.filter(d => d.aprobado === 'NO').length
    const decididos = aprobadosSI + aprobadosNO
    const pctAprob = decididos ? Math.round(aprobadosSI / decididos * 100) : 0
    const resolTiempos = f.map(d => diasEntre(d.fecha_creacion, d.fecha_resolucion)).filter(v => v != null && v >= 0)
    const promResol = resolTiempos.length ? Math.round(resolTiempos.reduce((s, v) => s + v, 0) / resolTiempos.length) : null
    const garantias = f.map(d => Number(d.dias_garantia)).filter(v => !isNaN(v) && v > 0)
    const promGar = garantias.length ? Math.round(garantias.reduce((s, v) => s + v, 0) / garantias.length) : null
    return { porEstado, cerrados, rechazados, abiertos, aprobadosSI, aprobadosNO, pctAprob, promResol, promGar }
  }, [f, total])

  const porModelo = useMemo(() => conteo(f, modeloDe), [f])
  const porFalla = useMemo(() => conteo(f, d => val(d.motivo)), [f])
  const porProvincia = useMemo(() => conteo(f, d => val(d.provincia)), [f])
  const porLocalidad = useMemo(() => conteo(f, d => val(d.localidad)), [f])
  const porCanal = useMemo(() => conteo(f, d => val(d.canal)), [f])
  const porEstado = stats.porEstado
  const porEnvio = useMemo(() => conteo(f.filter(d => d.empresa_envio), d => val(d.empresa_envio)), [f])
  const porAprob = useMemo(() => conteo(f, d => d.aprobado === 'SI' ? 'Aprobado' : d.aprobado === 'NO' ? 'Rechazado' : '(sin decidir)'), [f])

  // Evolución mensual
  const porMes = useMemo(() => {
    const m = new Map()
    for (const d of f) { if (!d.fecha_creacion) continue; const k = d.fecha_creacion.slice(0, 7); m.set(k, (m.get(k) || 0) + 1) }
    return [...m.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([label, value]) => ({ label, value }))
  }, [f])

  // Matriz Modelo × Falla
  const matriz = useMemo(() => {
    const motivosSet = [...new Set(f.map(d => val(d.motivo)))]
    const motivos = [...MOTIVOS.filter(m => motivosSet.includes(m)), ...motivosSet.filter(m => !MOTIVOS.includes(m))]
    const modelos = porModelo.map(x => x.label)
    const grid = modelos.map(mod => {
      const fila = { modelo: mod, total: 0, celdas: {} }
      for (const mot of motivos) fila.celdas[mot] = 0
      return fila
    })
    const idx = Object.fromEntries(grid.map((g, i) => [g.modelo, i]))
    for (const d of f) {
      const g = grid[idx[modeloDe(d)]]; if (!g) continue
      const mot = val(d.motivo); g.celdas[mot] = (g.celdas[mot] || 0) + 1; g.total++
    }
    return { motivos, grid }
  }, [f, porModelo])

  if (!isAdmin && !isAdmin2) return null

  const th = { padding: '7px 8px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }
  const td = { padding: '6px 8px', fontSize: 12, borderBottom: '1px solid var(--border)', textAlign: 'center' }

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Reporte de Devoluciones</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Service / Garantía · por modelo, falla, ubicación, estado, canal y resolución</p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 18, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>Estado</span>
          <select value={fEstado} onChange={e => setFEstado(e.target.value)} style={{ ...iSt, cursor: 'pointer' }}>
            <option value="todos">Todos</option>
            {ESTADOS.map(s => <option key={s} value={s}>{ESTADO_LABEL[s]}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>Desde</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ ...iSt, colorScheme: 'dark' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>Hasta</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ ...iSt, colorScheme: 'dark' }} />
        </div>
        {(fEstado !== 'todos' || desde || hasta) && <button onClick={() => { setFEstado('todos'); setDesde(''); setHasta('') }} style={{ ...iSt, cursor: 'pointer', color: 'var(--text3)' }}>Limpiar</button>}
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text2)', fontWeight: 700 }}>{total} caso{total !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            <Kpi label="Total de casos" value={total} color="#7b9fff" />
            <Kpi label="Abiertos (en curso)" value={stats.abiertos} color="#fb923c" />
            <Kpi label="Cerrados" value={stats.cerrados} color="#3dd68c" />
            <Kpi label="Rechazados" value={stats.rechazados} color="#ff5577" />
            <Kpi label="Aprobados" value={`${stats.pctAprob}%`} color="#a78bfa" sub={`${stats.aprobadosSI} SI · ${stats.aprobadosNO} NO`} />
            <Kpi label="Tiempo prom. resolución" value={stats.promResol != null ? `${stats.promResol} d` : '—'} color="#2dd4bf" />
            <Kpi label="Días prom. desde compra" value={stats.promGar != null ? `${stats.promGar} d` : '—'} color="#ffd166" />
          </div>

          {/* Gráficos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            <Card titulo="🔧 Por modelo / producto"><BarList data={porModelo} total={total} color="#7b9fff" /></Card>
            <Card titulo="⚠️ Por falla / motivo"><BarList data={porFalla} total={total} color="#fb923c" /></Card>
            <Card titulo="📊 Por estado"><BarList data={porEstado.map(x => ({ label: ESTADO_LABEL[x.label] || x.label, value: x.value, raw: x.label }))} total={total} colorByLabel={Object.fromEntries(porEstado.map(x => [ESTADO_LABEL[x.label] || x.label, ESTADO_COLOR[x.label] || '#7b9fff']))} /></Card>
            <Card titulo="🛒 Por canal de compra"><BarList data={porCanal} total={total} color="#3dd68c" /></Card>
            <Card titulo="📍 Por provincia"><BarList data={porProvincia} total={total} color="#a78bfa" /></Card>
            <Card titulo="🏙️ Por localidad (top 15)"><BarList data={porLocalidad} total={total} color="#38bdf8" max={15} /></Card>
            <Card titulo="🚚 Por resolución / envío"><BarList data={porEnvio} total={total} color="#f472b6" /></Card>
            <Card titulo="✅ Aprobación"><BarList data={porAprob} total={total} colorByLabel={{ Aprobado: '#3dd68c', Rechazado: '#ff5577', '(sin decidir)': '#8b98a9' }} /></Card>
          </div>

          {/* Evolución mensual */}
          <div style={{ marginTop: 14 }}>
            <Card titulo="📈 Evolución mensual (por fecha de ingreso)" span>
              {porMes.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text3)' }}>Sin datos.</div> : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, overflowX: 'auto', paddingTop: 10 }}>
                  {(() => { const mx = Math.max(1, ...porMes.map(m => m.value)); return porMes.map(m => (
                    <div key={m.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 42 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)' }}>{m.value}</div>
                      <div style={{ width: 26, height: `${m.value / mx * 130}px`, minHeight: 3, background: 'var(--brand-gradient)', borderRadius: '4px 4px 0 0' }} />
                      <div style={{ fontSize: 10, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{m.label}</div>
                    </div>
                  )) })()}
                </div>
              )}
            </Card>
          </div>

          {/* Matriz Modelo × Falla */}
          <div style={{ marginTop: 14 }}>
            <Card titulo="🧩 Matriz Modelo × Falla" span>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640 }}>
                  <thead><tr>
                    <th style={{ ...th, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--surface)' }}>Modelo</th>
                    {matriz.motivos.map(mot => <th key={mot} style={th}>{mot}</th>)}
                    <th style={{ ...th, color: 'var(--text)' }}>Total</th>
                  </tr></thead>
                  <tbody>
                    {matriz.grid.map(row => (
                      <tr key={row.modelo}>
                        <td style={{ ...td, textAlign: 'left', fontWeight: 700, position: 'sticky', left: 0, background: 'var(--surface)' }}>{row.modelo}</td>
                        {matriz.motivos.map(mot => {
                          const v = row.celdas[mot] || 0
                          return <td key={mot} style={{ ...td, color: v ? 'var(--text)' : 'var(--border2)', background: v ? `rgba(251,146,60,${Math.min(0.35, 0.08 + v / Math.max(1, row.total) * 0.4)})` : 'transparent', fontWeight: v ? 700 : 400 }}>{v || '·'}</td>
                        })}
                        <td style={{ ...td, fontWeight: 800, color: '#7b9fff' }}>{row.total}</td>
                      </tr>
                    ))}
                    {matriz.grid.length === 0 && <tr><td colSpan={matriz.motivos.length + 2} style={{ ...td, padding: 24, color: 'var(--text3)' }}>Sin datos.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
