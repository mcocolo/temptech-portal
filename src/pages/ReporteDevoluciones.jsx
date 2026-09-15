import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import { MOTIVOS } from '@/lib/reclamos'

const iSt = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 11px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }

const ESTADO_LABEL = { Ingresado: 'Ingresado', pendiente: 'Pendiente', Resolucion: 'Resolución', Devolucion: 'Devolución', Service: 'Service', rechazado: 'Rechazado', cerrado: 'Cerrado' }
const ESTADO_COLOR = { Ingresado: '#7b9fff', pendiente: '#ffd166', Resolucion: '#a78bfa', Devolucion: '#fb923c', Service: '#2dd4bf', rechazado: '#ff5577', cerrado: '#8b98a9' }
const ESTADOS = ['Ingresado', 'pendiente', 'Resolucion', 'Devolucion', 'Service', 'rechazado', 'cerrado']

const modeloDe = d => (d.modelo || d.producto || '').trim() || '(sin dato)'
const val = v => (v == null || String(v).trim() === '') ? '(sin dato)' : String(v).trim()
const aprobLabel = d => d.aprobado === 'SI' ? 'Aprobado' : d.aprobado === 'NO' ? 'Rechazado' : '(sin decidir)'
const diasEntre = (a, b) => (!a || !b) ? null : Math.round((new Date(b) - new Date(a)) / 86400000)
const fotosDe = c => [...(Array.isArray(c.imagenes_producto_urls) ? c.imagenes_producto_urls : []), ...(c.imagen_producto_url ? [c.imagen_producto_url] : [])].filter(Boolean)

const DIMS = ['estado', 'modelo', 'motivo', 'provincia', 'localidad', 'canal', 'envio', 'aprob']
const DIM_LABEL = { estado: 'Estado', modelo: 'Modelo', motivo: 'Falla', provincia: 'Provincia', localidad: 'Localidad', canal: 'Canal', envio: 'Resolución', aprob: 'Aprobación' }
const keyOf = (dim, d) => dim === 'estado' ? val(d.estado) : dim === 'modelo' ? modeloDe(d) : dim === 'motivo' ? val(d.motivo) : dim === 'provincia' ? val(d.provincia) : dim === 'localidad' ? val(d.localidad) : dim === 'canal' ? val(d.canal) : dim === 'envio' ? val(d.empresa_envio) : aprobLabel(d)

function conteo(rows, keyFn) {
  const m = new Map()
  for (const r of rows) { const k = keyFn(r); m.set(k, (m.get(k) || 0) + 1) }
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

function BarList({ data, total, color = '#7b9fff', max: maxItems, colorByLabel, labelFn = l => l, onPick, active }) {
  const shown = maxItems ? data.slice(0, maxItems) : data
  const max = Math.max(1, ...data.map(d => d.value))
  if (data.length === 0) return <div style={{ fontSize: 12, color: 'var(--text3)', padding: '10px 0' }}>Sin datos.</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
      {shown.map(d => {
        const c = colorByLabel ? (colorByLabel[d.label] || color) : color
        const pct = total ? Math.round(d.value / total * 100) : 0
        const isActive = active === d.label
        return (
          <div key={d.label} onClick={onPick ? () => onPick(d.label) : undefined}
            style={{ cursor: onPick ? 'pointer' : 'default', padding: '3px 5px', margin: '0 -5px', borderRadius: 6, background: isActive ? `${c}22` : 'transparent', border: `1px solid ${isActive ? c + '66' : 'transparent'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
              <span style={{ color: isActive ? c : 'var(--text2)', fontWeight: isActive ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '68%' }} title={labelFn(d.label)}>{labelFn(d.label)}</span>
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
  const [filtros, setFiltros] = useState({})   // { estado, modelo, motivo, provincia, localidad, canal, envio, aprob }
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [galeria, setGaleria] = useState(null)   // { titulo, fotos:[{url,...}], idx }
  const setFiltro = (dim, label) => setFiltros(p => ({ ...p, [dim]: p[dim] === label ? undefined : label }))

  useEffect(() => { if (isAdmin || isAdmin2) cargar() }, [isAdmin, isAdmin2])

  useEffect(() => {
    if (!galeria) return
    const h = e => {
      if (e.key === 'Escape') setGaleria(null)
      else if (e.key === 'ArrowRight') setGaleria(g => g && g.fotos.length ? { ...g, idx: (g.idx + 1) % g.fotos.length } : g)
      else if (e.key === 'ArrowLeft') setGaleria(g => g && g.fotos.length ? { ...g, idx: (g.idx - 1 + g.fotos.length) % g.fotos.length } : g)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [galeria])
  async function cargar() {
    setLoading(true)
    const data = await fetchAllRows(() => supabase.from('devoluciones').select('*').not('tracking_id', 'is', null).order('fecha_creacion', { ascending: false }))
    setRows(data || [])
    setLoading(false)
  }

  if (!isAdmin && !isAdmin2) return null

  // Base por rango de fechas
  const baseFecha = rows.filter(d => {
    const fc = d.fecha_creacion ? d.fecha_creacion.slice(0, 10) : ''
    if (desde && fc && fc < desde) return false
    if (hasta && fc && fc > hasta) return false
    return true
  })
  const pasa = (d, except) => DIMS.every(dim => dim === except || filtros[dim] == null || keyOf(dim, d) === filtros[dim])
  const rowsExcept = dim => baseFecha.filter(d => pasa(d, dim))
  const f = baseFecha.filter(d => pasa(d, null))   // todos los filtros aplicados
  const total = f.length

  // KPIs (sobre f)
  const cerrados = f.filter(d => d.estado === 'cerrado').length
  const rechazados = f.filter(d => d.estado === 'rechazado').length
  const abiertos = total - cerrados - rechazados
  const aprobadosSI = f.filter(d => d.aprobado === 'SI').length
  const aprobadosNO = f.filter(d => d.aprobado === 'NO').length
  const pctAprob = (aprobadosSI + aprobadosNO) ? Math.round(aprobadosSI / (aprobadosSI + aprobadosNO) * 100) : 0
  const resolTiempos = f.map(d => diasEntre(d.fecha_creacion, d.fecha_resolucion)).filter(v => v != null && v >= 0)
  const promResol = resolTiempos.length ? Math.round(resolTiempos.reduce((s, v) => s + v, 0) / resolTiempos.length) : null
  const garantias = f.map(d => Number(d.dias_garantia)).filter(v => !isNaN(v) && v > 0)
  const promGar = garantias.length ? Math.round(garantias.reduce((s, v) => s + v, 0) / garantias.length) : null

  // Charts (cruzados: cada uno ignora su propia dimensión para poder cambiar la selección)
  const rM = rowsExcept('modelo'), rF = rowsExcept('motivo'), rE = rowsExcept('estado'), rC = rowsExcept('canal')
  const rP = rowsExcept('provincia'), rL = rowsExcept('localidad'), rV = rowsExcept('envio'), rA = rowsExcept('aprob')
  const porModelo = conteo(rM, modeloDe)
  const porFalla = conteo(rF, d => val(d.motivo))
  const porEstado = conteo(rE, d => val(d.estado))
  const porCanal = conteo(rC, d => val(d.canal))
  const porProvincia = conteo(rP, d => val(d.provincia))
  const porLocalidad = conteo(rL, d => val(d.localidad))
  const porEnvio = conteo(rV.filter(d => d.empresa_envio), d => val(d.empresa_envio))
  const porAprob = conteo(rA, aprobLabel)

  // Evolución mensual + matriz (sobre f)
  const mesMap = new Map()
  for (const d of f) { if (!d.fecha_creacion) continue; const k = d.fecha_creacion.slice(0, 7); mesMap.set(k, (mesMap.get(k) || 0) + 1) }
  const porMes = [...mesMap.entries()].sort((a, b) => a[0] < b[0] ? -1 : 1).map(([label, value]) => ({ label, value }))

  const motivosSet = [...new Set(f.map(d => val(d.motivo)))]
  const motivosCol = [...MOTIVOS.filter(m => motivosSet.includes(m)), ...motivosSet.filter(m => !MOTIVOS.includes(m))]
  const modelosMat = conteo(f, modeloDe).map(x => x.label)
  const matriz = modelosMat.map(mod => {
    const fila = { modelo: mod, total: 0, celdas: {} }
    for (const d of f.filter(x => modeloDe(x) === mod)) { const mot = val(d.motivo); fila.celdas[mot] = (fila.celdas[mot] || 0) + 1; fila.total++ }
    return fila
  })

  const chips = DIMS.filter(dim => filtros[dim] != null).map(dim => ({ dim, label: dim === 'estado' ? (ESTADO_LABEL[filtros[dim]] || filtros[dim]) : filtros[dim] }))

  const abrirGaleria = (mod, mot) => {
    const casos = f.filter(d => modeloDe(d) === mod && val(d.motivo) === mot)
    const fotos = []
    for (const c of casos) for (const url of fotosDe(c)) fotos.push({ url, tracking: c.tracking_id, cliente: c.nombre_apellido || c.nombre || '—', fecha: c.fecha_creacion, desc: c.descripcion_falla || '', ubic: [c.localidad, c.provincia].filter(Boolean).join(', ') })
    setGaleria({ titulo: `${mod} · ${mot}`, casos: casos.length, fotos, idx: 0 })
  }

  const th = { padding: '7px 8px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }
  const td = { padding: '6px 8px', fontSize: 12, borderBottom: '1px solid var(--border)', textAlign: 'center' }

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Reporte de Devoluciones</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Service / Garantía · tocá cualquier barra para cruzar el resto de los gráficos</p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>Estado</span>
          <select value={filtros.estado || ''} onChange={e => setFiltros(p => ({ ...p, estado: e.target.value || undefined }))} style={{ ...iSt, cursor: 'pointer' }}>
            <option value="">Todos</option>
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
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--text2)', fontWeight: 700 }}>{total} caso{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Chips de filtros activos */}
      {(chips.length > 0 || desde || hasta) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          {chips.map(c => (
            <span key={c.dim} onClick={() => setFiltros(p => ({ ...p, [c.dim]: undefined }))} style={{ cursor: 'pointer', fontSize: 12, fontWeight: 700, background: 'rgba(123,159,255,0.12)', border: '1px solid rgba(123,159,255,0.4)', color: '#7b9fff', borderRadius: 20, padding: '4px 12px' }}>
              {DIM_LABEL[c.dim]}: {c.label} ✕
            </span>
          ))}
          <button onClick={() => { setFiltros({}); setDesde(''); setHasta('') }} style={{ ...iSt, cursor: 'pointer', color: 'var(--text3)', padding: '4px 12px' }}>Limpiar todo</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
            <Kpi label="Total de casos" value={total} color="#7b9fff" />
            <Kpi label="Abiertos (en curso)" value={abiertos} color="#fb923c" />
            <Kpi label="Cerrados" value={cerrados} color="#3dd68c" />
            <Kpi label="Rechazados" value={rechazados} color="#ff5577" />
            <Kpi label="Aprobados" value={`${pctAprob}%`} color="#a78bfa" sub={`${aprobadosSI} SI · ${aprobadosNO} NO`} />
            <Kpi label="Tiempo prom. resolución" value={promResol != null ? `${promResol} d` : '—'} color="#2dd4bf" />
            <Kpi label="Días prom. desde compra" value={promGar != null ? `${promGar} d` : '—'} color="#ffd166" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
            <Card titulo="🔧 Por modelo / producto"><BarList data={porModelo} total={rM.length} color="#7b9fff" onPick={l => setFiltro('modelo', l)} active={filtros.modelo} /></Card>
            <Card titulo="⚠️ Por falla / motivo"><BarList data={porFalla} total={rF.length} color="#fb923c" onPick={l => setFiltro('motivo', l)} active={filtros.motivo} /></Card>
            <Card titulo="📊 Por estado"><BarList data={porEstado} total={rE.length} colorByLabel={ESTADO_COLOR} labelFn={l => ESTADO_LABEL[l] || l} onPick={l => setFiltros(p => ({ ...p, estado: p.estado === l ? undefined : l }))} active={filtros.estado} /></Card>
            <Card titulo="🛒 Por canal de compra"><BarList data={porCanal} total={rC.length} color="#3dd68c" onPick={l => setFiltro('canal', l)} active={filtros.canal} /></Card>
            <Card titulo="📍 Por provincia"><BarList data={porProvincia} total={rP.length} color="#a78bfa" onPick={l => setFiltro('provincia', l)} active={filtros.provincia} /></Card>
            <Card titulo="🏙️ Por localidad (top 15)"><BarList data={porLocalidad} total={rL.length} color="#38bdf8" max={15} onPick={l => setFiltro('localidad', l)} active={filtros.localidad} /></Card>
            <Card titulo="🚚 Por resolución / envío"><BarList data={porEnvio} total={rV.length} color="#f472b6" onPick={l => setFiltro('envio', l)} active={filtros.envio} /></Card>
            <Card titulo="✅ Aprobación"><BarList data={porAprob} total={rA.length} colorByLabel={{ Aprobado: '#3dd68c', Rechazado: '#ff5577', '(sin decidir)': '#8b98a9' }} onPick={l => setFiltro('aprob', l)} active={filtros.aprob} /></Card>
          </div>

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

          <div style={{ marginTop: 14 }}>
            <Card titulo="🧩 Matriz Modelo × Falla" span>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640 }}>
                  <thead><tr>
                    <th style={{ ...th, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--surface)' }}>Modelo</th>
                    {motivosCol.map(mot => <th key={mot} style={th}>{mot}</th>)}
                    <th style={{ ...th, color: 'var(--text)' }}>Total</th>
                  </tr></thead>
                  <tbody>
                    {matriz.map(row => (
                      <tr key={row.modelo}>
                        <td style={{ ...td, textAlign: 'left', fontWeight: 700, position: 'sticky', left: 0, background: 'var(--surface)' }}>{row.modelo}</td>
                        {motivosCol.map(mot => {
                          const v = row.celdas[mot] || 0
                          return <td key={mot} onClick={v ? () => abrirGaleria(row.modelo, mot) : undefined} title={v ? `Ver fotos · ${row.modelo} · ${mot}` : undefined}
                            style={{ ...td, color: v ? 'var(--text)' : 'var(--border2)', background: v ? `rgba(251,146,60,${Math.min(0.35, 0.08 + v / Math.max(1, row.total) * 0.4)})` : 'transparent', fontWeight: v ? 700 : 400, cursor: v ? 'pointer' : 'default' }}>{v || '·'}</td>
                        })}
                        <td style={{ ...td, fontWeight: 800, color: '#7b9fff' }}>{row.total}</td>
                      </tr>
                    ))}
                    {matriz.length === 0 && <tr><td colSpan={motivosCol.length + 2} style={{ ...td, padding: 24, color: 'var(--text3)' }}>Sin datos.</td></tr>}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Lightbox de fotos del cruce Modelo × Falla */}
      {galeria && (() => {
        const g = galeria, fo = g.fotos[g.idx], n = g.fotos.length
        const nav = dir => setGaleria(x => ({ ...x, idx: (x.idx + dir + x.fotos.length) % x.fotos.length }))
        return (
          <div onClick={() => setGaleria(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 760, maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800 }}>📷 {g.titulo}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{g.casos} caso{g.casos !== 1 ? 's' : ''} · {n} foto{n !== 1 ? 's' : ''}</div>
                </div>
                <button onClick={() => setGaleria(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 24 }}>×</button>
              </div>
              {n === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>Estos casos no tienen fotos adjuntas.</div>
              ) : (
                <>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)', padding: 12 }}>
                    <button onClick={() => nav(-1)} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)', color: '#fff', borderRadius: '50%', width: 38, height: 38, fontSize: 20, cursor: 'pointer' }}>‹</button>
                    <img src={fo.url} alt="" onClick={() => window.open(fo.url, '_blank')} style={{ maxWidth: '100%', maxHeight: '58vh', objectFit: 'contain', borderRadius: 8, cursor: 'zoom-in' }} onError={e => { e.currentTarget.style.opacity = 0.3 }} />
                    <button onClick={() => nav(1)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.5)', border: '1px solid var(--border)', color: '#fff', borderRadius: '50%', width: 38, height: 38, fontSize: 20, cursor: 'pointer' }}>›</button>
                    <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>{g.idx + 1} / {n}</div>
                  </div>
                  <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', fontSize: 12 }}>
                    <div style={{ color: 'var(--text2)' }}>
                      <b style={{ color: '#7b9fff', fontFamily: 'monospace' }}>{fo.tracking || '—'}</b> · {fo.cliente}{fo.ubic ? ` · ${fo.ubic}` : ''}{fo.fecha ? ` · ${new Date(fo.fecha).toLocaleDateString('es-AR')}` : ''}
                    </div>
                    {fo.desc && <div style={{ color: 'var(--text3)', marginTop: 4 }}>📝 {fo.desc}</div>}
                  </div>
                  {/* Tira de miniaturas */}
                  <div style={{ display: 'flex', gap: 6, padding: '8px 12px', overflowX: 'auto', borderTop: '1px solid var(--border)' }}>
                    {g.fotos.map((ph, i) => (
                      <img key={i} src={ph.url} alt="" onClick={() => setGaleria(x => ({ ...x, idx: i }))} style={{ width: 46, height: 46, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', flexShrink: 0, border: `2px solid ${i === g.idx ? '#7b9fff' : 'transparent'}`, opacity: i === g.idx ? 1 : 0.6 }} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
