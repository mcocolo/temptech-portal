import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import { ExamenesModal, ValesModal } from '@/pages/Empleados'
import toast from 'react-hot-toast'

const iSt = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }

// Horario normal: Lun-Jue 7-17, Vie 7-15. Sáb/Dom = fin de semana.
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
function horarioNormal(fechaStr) {
  const dow = new Date(fechaStr + 'T12:00:00').getDay() // 0 dom … 6 sáb
  if (dow === 0 || dow === 6) return { finde: true, inicio: null, fin: null }
  return { finde: false, inicio: '07:00', fin: dow === 5 ? '15:00' : '17:00' }
}
const hm = t => { if (!t || !/^\d{1,2}:\d{2}/.test(t)) return null; const [h, m] = t.split(':'); return (+h) * 60 + (+m) }
const fmtHm = min => { if (min == null || min <= 0) return ''; const h = Math.floor(min / 60), m = min % 60; return `${h}:${String(m).padStart(2, '0')}` }
const hoyStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
const addDias = (f, n) => { const d = new Date(f + 'T12:00:00'); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
// activo = sin egreso final (mismo criterio que la ficha)
const esActivo = e => !(e.fecha_ingreso2 ? e.fecha_egreso2 : (e.fecha_egreso1 || e.fecha_egreso2))
const TOL_ENTRADA = 10 // minutos de tolerancia para el ingreso
// Estado del día: null (sin datos/finde), 'ok', 'no' (fuera de horario), 'aus', 'incompleto'
function estadoDia(r, fechaStr) {
  const hn = horarioNormal(fechaStr)
  if (hn.finde) return 'finde'
  if (!r) return null
  if (r.ausente) return 'aus'
  if (!r.entra || !r.sale) return 'incompleto'
  const tarde = hm(r.entra) > hm(hn.inicio) + TOL_ENTRADA
  const antes = hm(r.sale) < hm(hn.fin)
  return (!tarde && !antes) ? 'ok' : 'no'
}
const mesActual = () => hoyStr().slice(0, 7)
const diasDelMes = ym => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate() }
const addMes = (ym, n) => { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const NOM_MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function Asistencia() {
  const { isAdmin, isAdmin2, isMantenimiento, user, profile } = useAuth()
  const [fecha, setFecha] = useState(hoyStr())
  const [vista, setVista] = useState('dia') // 'dia' | 'mes'
  const [empleados, setEmpleados] = useState([])
  const [susp, setSusp] = useState([]) // suspensiones (para marcar SUSPENDIDO)
  const [examenes, setExamenes] = useState([]) // días de examen (para marcar EXAMEN)
  const [regs, setRegs] = useState({}) // empleado_id -> registro
  const [reporteOpen, setReporteOpen] = useState(false)
  const [examenGestion, setExamenGestion] = useState(false)
  const [valesOpen, setValesOpen] = useState(false)
  const esDuenoVales = (user?.email || '').toLowerCase() === 'martin.cocolo@gmail.com' || (profile?.full_name || '').trim().toLowerCase() === 'martin cocolo'
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [soloActivos, setSoloActivos] = useState(true)
  const [saving, setSaving] = useState({})

  const readOnly = isMantenimiento   // Admin2 puede cargar asistencia; Mantenimiento solo lee
  const usuario = profile?.full_name || user?.email || 'Admin'
  const hn = useMemo(() => horarioNormal(fecha), [fecha])

  useEffect(() => { if (isAdmin || isAdmin2 || isMantenimiento) cargarEmpleados() }, [isAdmin, isAdmin2, isMantenimiento])
  useEffect(() => { if (isAdmin || isAdmin2 || isMantenimiento) cargarRegs() }, [fecha, isAdmin, isAdmin2, isMantenimiento])

  async function cargarEmpleados() {
    const [data, s, ex] = await Promise.all([
      fetchAllRows(() => supabase.from('empleados').select('id,apodo,nombre,apellido,sector,fecha_ingreso,fecha_egreso1,fecha_ingreso2,fecha_egreso2').order('apodo')),
      supabase.from('suspensiones').select('empleado_id,fecha,fecha_hasta,dias'),
      supabase.from('dias_examen').select('empleado_id,fecha,fecha_hasta'),
    ])
    setEmpleados(data || [])
    setSusp(s.data || [])
    setExamenes(ex.data || [])
  }
  // ¿El empleado está suspendido / de examen en la fecha? (rango desde..hasta inclusive)
  const suspendidoEn = (empId, f) => susp.some(s => s.empleado_id === empId && f >= s.fecha && f <= (s.fecha_hasta || s.fecha))
  const examenEn = (empId, f) => examenes.some(s => s.empleado_id === empId && f >= s.fecha && f <= (s.fecha_hasta || s.fecha))
  async function cargarRegs() {
    setLoading(true)
    const { data } = await supabase.from('asistencias').select('*').eq('fecha', fecha)
    const map = {}
    for (const r of (data || [])) map[r.empleado_id] = r
    setRegs(map)
    setLoading(false)
  }

  // Guarda (upsert) un campo del registro del empleado en la fecha actual
  async function guardar(empId, cambios) {
    if (readOnly) return
    const prev = regs[empId] || {}
    const merged = { ...prev, ...cambios }
    // HE automática: si cambió la salida y no hay HE cargada manualmente, sugerir según horario normal
    if ('sale' in cambios && (merged.he == null || merged.he === '') && !hn.finde && merged.sale) {
      const extra = hm(merged.sale) - hm(hn.fin)
      if (extra > 0) merged.he = fmtHm(extra)
    }
    setRegs(r => ({ ...r, [empId]: merged }))
    // No persistir filas totalmente vacías que aún no existen
    const vacio = !merged.entra && !merged.sale && !merged.he && !merged.vale && !merged.ausente && !merged.medico
    if (vacio && !merged.id) return
    setSaving(s => ({ ...s, [empId]: true }))
    const payload = {
      empleado_id: empId, fecha,
      entra: merged.entra || null, sale: merged.sale || null,
      he: merged.he || null, vale: merged.vale || null,
      ausente: !!merged.ausente, medico: !!merged.medico, creado_por: usuario, updated_at: new Date().toISOString(),
    }
    const { data, error } = await supabase.from('asistencias').upsert(payload, { onConflict: 'empleado_id,fecha' }).select().single()
    setSaving(s => ({ ...s, [empId]: false }))
    if (error) { toast.error('Error: ' + error.message); return }
    if (data) setRegs(r => ({ ...r, [empId]: data }))
  }

  // Toggle por empleado: si está en horario lo borra, si no lo completa con el horario del día
  const marcarOk = empId => {
    const enHorario = estadoDia(regs[empId], fecha) === 'ok'
    guardar(empId, enHorario ? { entra: '', sale: '' } : { entra: hn.inicio, sale: hn.fin, ausente: false })
  }

  // Toggle masivo: si hay vacíos los completa; si ya está todo cargado, los borra (no toca ausentes)
  async function marcarTodosOk() {
    if (readOnly || hn.finde) return
    const vacios = lista.filter(e => { const r = regs[e.id] || {}; return !r.entra && !r.sale && !r.ausente })
    const limpiar = vacios.length === 0
    const objetivo = limpiar
      ? lista.filter(e => { const r = regs[e.id] || {}; return (r.entra || r.sale) && !r.ausente })
      : vacios
    if (objetivo.length === 0) return
    const payload = objetivo.map(e => ({
      empleado_id: e.id, fecha,
      entra: limpiar ? null : hn.inicio, sale: limpiar ? null : hn.fin,
      he: regs[e.id]?.he || null, vale: regs[e.id]?.vale || null, ausente: false,
      creado_por: usuario, updated_at: new Date().toISOString(),
    }))
    const { data, error } = await supabase.from('asistencias').upsert(payload, { onConflict: 'empleado_id,fecha' }).select()
    if (error) { toast.error('Error: ' + error.message); return }
    setRegs(r => { const m = { ...r }; for (const row of (data || [])) m[row.empleado_id] = row; return m })
    toast.success(limpiar ? `${objetivo.length} horarios borrados` : `${objetivo.length} completados con ${hn.inicio}-${hn.fin} ✅`)
  }

  if (!isAdmin && !isAdmin2 && !isMantenimiento) return null

  const q = busqueda.trim().toLowerCase()
  const lista = empleados
    .filter(e => !soloActivos || esActivo(e))
    .filter(e => !q || [e.apodo, e.nombre, e.apellido, e.sector].some(v => (v || '').toLowerCase().includes(q)))

  const dow = new Date(fecha + 'T12:00:00').getDay()
  // Totales del día
  const totHE = lista.reduce((s, e) => s + (hm(regs[e.id]?.he) || 0), 0)
  const totSusp = lista.filter(e => suspendidoEn(e.id, fecha)).length
  const totAus = lista.filter(e => !suspendidoEn(e.id, fecha) && regs[e.id]?.ausente).length
  const totPres = lista.filter(e => !suspendidoEn(e.id, fecha) && regs[e.id]?.entra).length

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Ingreso / Egreso</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Asistencia diaria · horario normal Lun-Jue 7:00-17:00 · Vie 7:00-15:00</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {esDuenoVales && <button onClick={() => setValesOpen(true)} style={{ background: 'var(--surface2)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.4)', borderRadius: 'var(--radius)', padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>💵 Vales</button>}
          {isAdmin && <button onClick={() => setExamenGestion(true)} style={{ background: 'var(--surface2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.4)', borderRadius: 'var(--radius)', padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>📚 Días de examen</button>}
          {isAdmin && <button onClick={() => setReporteOpen(true)} style={{ background: 'var(--surface2)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.4)', borderRadius: 'var(--radius)', padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>📊 Reporte</button>}
          <div style={{ display: 'flex', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 4 }}>
            <button onClick={() => setVista('dia')} style={tabBtn(vista === 'dia')}>📆 Ver día</button>
            <button onClick={() => setVista('mes')} style={tabBtn(vista === 'mes')}>🗓 Ver mes</button>
          </div>
        </div>
      </div>
      {reporteOpen && <ReporteModal empleados={empleados} susp={susp} examenes={examenes} onClose={() => setReporteOpen(false)} />}
      {examenGestion && <ExamenesModal empleados={empleados} usuario={usuario} onClose={() => setExamenGestion(false)} onChange={cargarEmpleados} />}
      {valesOpen && esDuenoVales && <ValesModal empleados={empleados} puedeEditar={true} usuario={usuario} onClose={() => setValesOpen(false)} />}

      {/* Selector de fecha (solo vista día) */}
      {vista === 'dia' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 6px' }}>
            <button onClick={() => setFecha(f => addDias(f, -1))} style={navBtn}>‹</button>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ ...iSt, padding: '6px 8px' }} />
            <button onClick={() => setFecha(f => addDias(f, 1))} style={navBtn}>›</button>
            <button onClick={() => setFecha(hoyStr())} style={{ ...navBtn, width: 'auto', padding: '0 10px', fontSize: 12, fontWeight: 700 }}>Hoy</button>
          </div>
          <span style={{ fontSize: 14, fontWeight: 800, color: hn.finde ? '#fbbf24' : 'var(--text)' }}>
            {DIAS[dow]}{hn.finde ? ' · Fin de semana' : ` · ${hn.inicio} a ${hn.fin}`}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <input type="text" placeholder="🔍 Buscar empleado…" value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...iSt, padding: '8px 11px', maxWidth: 320, flex: '1 1 220px' }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontWeight: 700 }}>
          <input type="checkbox" checked={soloActivos} onChange={e => setSoloActivos(e.target.checked)} /> Solo activos
        </label>
        {vista === 'dia' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginLeft: 'auto' }}>
            <span style={pill('#3dd68c')}>Presentes: {totPres}</span>
            <span style={pill('#ff5577')}>Ausentes: {totAus}</span>
            {totSusp > 0 && <span style={pill('#ff5577')}>Suspendidos: {totSusp}</span>}
            <span style={pill('#fbbf24')}>HE del día: {fmtHm(totHE) || '0'}</span>
          </div>
        )}
      </div>

      {vista === 'mes' ? (
        <VistaMes lista={lista} susp={susp} examenes={examenes} onAbrirDia={f => { setFecha(f); setVista('dia') }} />
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)' }}>Cargando…</div>
      ) : lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>Sin empleados.</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--surface)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720, fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                <th style={{ ...th, textAlign: 'left', minWidth: 180 }}>Empleado</th>
                <th style={{ ...th, width: 64 }}>
                  {!readOnly && !hn.finde
                    ? <button onClick={marcarTodosOk} title="Completar los vacíos con el horario del día · si ya están todos, los borra" style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.4)', borderRadius: 8, padding: '5px 8px', fontSize: 11, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font)' }}>✓ Todos</button>
                    : 'OK'}
                </th>
                <th style={{ ...th, width: 110 }}>Entra</th>
                <th style={{ ...th, width: 110 }}>Sale</th>
                <th style={{ ...th, width: 90 }}>HE</th>
                <th style={{ ...th, textAlign: 'left', minWidth: 200 }}>Vale / Motivo</th>
                <th style={{ ...th, width: 90 }}>Ausente</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(e => {
                const r = regs[e.id] || {}
                // Suspendido ese día: fila bloqueada mostrando SUSPENDIDO
                if (suspendidoEn(e.id, fecha)) return (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--border)', background: 'rgba(255,85,119,0.07)' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 700 }}>{e.apodo}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{[e.nombre, e.apellido].filter(Boolean).join(' ')}</div>
                    </td>
                    <td colSpan={6} style={{ padding: '8px 12px', textAlign: 'left' }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#ff5577', background: 'rgba(255,85,119,0.14)', border: '1px solid rgba(255,85,119,0.4)', borderRadius: 20, padding: '4px 12px' }}>🚫 SUSPENDIDO</span>
                    </td>
                  </tr>
                )
                // Día de examen: fila bloqueada mostrando EXAMEN
                if (examenEn(e.id, fecha)) return (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--border)', background: 'rgba(56,189,248,0.06)' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 700 }}>{e.apodo}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{[e.nombre, e.apellido].filter(Boolean).join(' ')}</div>
                    </td>
                    <td colSpan={6} style={{ padding: '8px 12px', textAlign: 'left' }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: '#38bdf8', background: 'rgba(56,189,248,0.14)', border: '1px solid rgba(56,189,248,0.4)', borderRadius: 20, padding: '4px 12px' }}>📚 EXAMEN</span>
                    </td>
                  </tr>
                )
                const saleMin = hm(r.sale), finMin = hn.fin ? hm(hn.fin) : null
                const salioAntes = !r.ausente && saleMin != null && finMin != null && saleMin < finMin
                const heMin = hm(r.he)
                return (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--border)', background: hn.finde ? 'rgba(251,191,36,0.05)' : r.ausente ? 'rgba(255,85,119,0.05)' : 'transparent' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <div style={{ fontWeight: 700 }}>{e.apodo}{saving[e.id] ? <span style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}> · guardando…</span> : ''}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{[e.nombre, e.apellido].filter(Boolean).join(' ')}</div>
                    </td>
                    <td style={{ ...celda, verticalAlign: 'middle' }}>
                      {!hn.finde && (() => {
                        const enHorario = estadoDia(r, fecha) === 'ok'
                        return (
                          <button disabled={readOnly} onClick={() => marcarOk(e.id)} title={enHorario ? 'Borrar horario (destildar)' : `Completar con ${hn.inicio}-${hn.fin}`}
                            style={{ width: 30, height: 30, borderRadius: 8, background: enHorario ? 'rgba(61,214,140,0.15)' : 'var(--surface2)', color: enHorario ? '#3dd68c' : 'var(--text3)', border: `1px solid ${enHorario ? 'rgba(61,214,140,0.45)' : 'var(--border)'}`, fontSize: 14, fontWeight: 800, cursor: readOnly ? 'default' : 'pointer', fontFamily: 'var(--font)' }}>✓</button>
                        )
                      })()}
                    </td>
                    <td style={celda}>
                      <input key={`en-${fecha}-${e.id}-${r.entra || ''}`} type="time" defaultValue={r.entra || ''} disabled={readOnly || r.ausente}
                        onBlur={ev => { const v = ev.target.value; if (v !== (r.entra || '')) guardar(e.id, { entra: v }) }}
                        style={{ ...iSt, width: '100%', opacity: r.ausente ? 0.4 : 1 }} />
                    </td>
                    <td style={celda}>
                      <input key={`sa-${fecha}-${e.id}-${r.sale || ''}`} type="time" defaultValue={r.sale || ''} disabled={readOnly || r.ausente}
                        onBlur={ev => { const v = ev.target.value; if (v !== (r.sale || '')) guardar(e.id, { sale: v }) }}
                        style={{ ...iSt, width: '100%', opacity: r.ausente ? 0.4 : 1, border: salioAntes ? '1px solid #fb923c' : '1px solid var(--border)' }} />
                      {salioAntes && <div style={{ fontSize: 9, color: '#fb923c', marginTop: 2, textAlign: 'center' }}>salió antes</div>}
                    </td>
                    <td style={celda}>
                      <input key={`he-${fecha}-${e.id}-${r.he || ''}`} type="text" defaultValue={r.he || ''} disabled={readOnly} placeholder="0:00"
                        onBlur={ev => { const v = ev.target.value.trim(); if (v !== (r.he || '')) guardar(e.id, { he: v }) }}
                        style={{ ...iSt, width: '100%', textAlign: 'center', color: heMin > 0 ? '#fbbf24' : 'var(--text)', fontWeight: heMin > 0 ? 700 : 400 }} />
                    </td>
                    <td style={celda}>
                      <input key={`va-${fecha}-${e.id}-${r.vale || ''}`} type="text" defaultValue={r.vale || ''} disabled={readOnly} placeholder="reposo, permiso, $, enfermo…"
                        onBlur={ev => { const v = ev.target.value.trim(); if (v !== (r.vale || '')) guardar(e.id, { vale: v || null }) }}
                        style={{ ...iSt, width: '100%' }} />
                    </td>
                    <td style={{ ...celda, textAlign: 'center' }}>
                      <button disabled={readOnly} onClick={() => guardar(e.id, { ausente: !r.ausente })}
                        style={{ background: r.ausente ? 'rgba(255,85,119,0.15)' : 'var(--surface2)', color: r.ausente ? '#ff5577' : 'var(--text3)', border: `1px solid ${r.ausente ? 'rgba(255,85,119,0.45)' : 'var(--border)'}`, borderRadius: 8, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: readOnly ? 'default' : 'pointer', fontFamily: 'var(--font)' }}>
                        {r.ausente ? '✓ Ausente' : 'Marcar'}
                      </button>
                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 5, fontSize: 11, fontWeight: 700, color: r.medico ? '#a78bfa' : 'var(--text3)', cursor: readOnly ? 'default' : 'pointer' }}>
                        <input type="checkbox" checked={!!r.medico} disabled={readOnly} onChange={() => guardar(e.id, { medico: !r.medico })} /> 🩺 Médico
                      </label>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {readOnly && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>Modo solo lectura.</div>}
    </div>
  )
}

const th = { padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.3px', textAlign: 'center' }
const celda = { padding: '6px 8px', textAlign: 'center', verticalAlign: 'top' }
const navBtn = { width: 30, height: 30, borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 16, fontWeight: 700, fontFamily: 'var(--font)' }
const pill = c => ({ fontSize: 11, fontWeight: 700, color: c, background: `${c}1a`, border: `1px solid ${c}55`, borderRadius: 20, padding: '4px 11px' })
const tabBtn = activo => ({ background: activo ? 'var(--brand-gradient)' : 'transparent', color: activo ? '#fff' : 'var(--text3)', border: 'none', borderRadius: 8, padding: '7px 13px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' })

// ─── Vista mensual: empleados × días, ✓ si el ingreso/egreso fue según lo estipulado ───
const MARCA = {
  ok:         { txt: '✓', color: '#3dd68c', bg: 'rgba(61,214,140,0.14)', label: 'En horario' },
  no:         { txt: '✕', color: '#fb923c', bg: 'rgba(251,146,60,0.14)', label: 'Fuera de horario' },
  aus:        { txt: 'A', color: '#ff5577', bg: 'rgba(255,85,119,0.14)', label: 'Ausente' },
  med:        { txt: 'M', color: '#a78bfa', bg: 'rgba(167,139,250,0.14)', label: 'Médico' },
  sus:        { txt: 'S', color: '#ff5577', bg: 'rgba(255,85,119,0.14)', label: 'Suspendido' },
  exa:        { txt: 'E', color: '#38bdf8', bg: 'rgba(56,189,248,0.14)', label: 'Examen' },
  incompleto: { txt: '·', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', label: 'Incompleto' },
}
function VistaMes({ lista, susp = [], examenes = [], onAbrirDia }) {
  const suspendidoEn = (empId, f) => susp.some(s => s.empleado_id === empId && f >= s.fecha && f <= (s.fecha_hasta || s.fecha))
  const examenEn = (empId, f) => examenes.some(s => s.empleado_id === empId && f >= s.fecha && f <= (s.fecha_hasta || s.fecha))
  const [mes, setMes] = useState(mesActual())
  const [regs, setRegs] = useState({}) // 'empId|fecha' -> registro
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let vivo = true
    setLoading(true)
    const desde = `${mes}-01`, hasta = `${mes}-${String(diasDelMes(mes)).padStart(2, '0')}`
    supabase.from('asistencias').select('*').gte('fecha', desde).lte('fecha', hasta).then(({ data }) => {
      if (!vivo) return
      const map = {}
      for (const r of (data || [])) map[`${r.empleado_id}|${r.fecha}`] = r
      setRegs(map); setLoading(false)
    })
    return () => { vivo = false }
  }, [mes])

  const [y, m] = mes.split('-').map(Number)
  const ndias = diasDelMes(mes)
  const dias = Array.from({ length: ndias }, (_, i) => i + 1)
  const fechaDe = d => `${mes}-${String(d).padStart(2, '0')}`
  const dowDe = d => new Date(y, m - 1, d).getDay()

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 6px' }}>
          <button onClick={() => setMes(mm => addMes(mm, -1))} style={navBtn}>‹</button>
          <span style={{ fontSize: 14, fontWeight: 800, minWidth: 150, textAlign: 'center' }}>{NOM_MES[m - 1]} {y}</span>
          <button onClick={() => setMes(mm => addMes(mm, 1))} style={navBtn}>›</button>
          <button onClick={() => setMes(mesActual())} style={{ ...navBtn, width: 'auto', padding: '0 10px', fontSize: 12, fontWeight: 700 }}>Este mes</button>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--text3)' }}>
          {Object.entries(MARCA).map(([k, v]) => <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><b style={{ color: v.color }}>{v.txt}</b> {v.label}</span>)}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)' }}>Cargando…</div>
      ) : lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>Sin empleados.</div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'var(--surface)' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                <th style={{ ...th, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--surface2)', zIndex: 2, minWidth: 150 }}>Empleado</th>
                {dias.map(d => {
                  const finde = [0, 6].includes(dowDe(d))
                  return <th key={d} style={{ ...th, padding: '6px 0', width: 26, minWidth: 26, color: finde ? '#fbbf24' : 'var(--text3)', background: finde ? 'rgba(251,191,36,0.08)' : 'var(--surface2)' }}>{d}</th>
                })}
                <th style={{ ...th, minWidth: 54 }}>✓</th>
                <th style={{ ...th, minWidth: 60 }}>HE</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(e => {
                let oks = 0, heTot = 0
                const celdas = dias.map(d => {
                  const f = fechaDe(d)
                  const r = regs[`${e.id}|${f}`]
                  const est = suspendidoEn(e.id, f) ? 'sus' : examenEn(e.id, f) ? 'exa' : (r?.medico ? 'med' : estadoDia(r, f))
                  if (est === 'ok') oks++
                  heTot += hm(r?.he) || 0
                  return { d, f, r, est }
                })
                return (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px 12px', fontWeight: 700, position: 'sticky', left: 0, background: 'var(--surface)', zIndex: 1 }}>
                      {e.apodo}
                      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 400 }}>{[e.nombre, e.apellido].filter(Boolean).join(' ')}</div>
                    </td>
                    {celdas.map(({ d, f, r, est }) => {
                      const finde = [0, 6].includes(dowDe(d))
                      const mk = MARCA[est]
                      const titulo = est === 'sus' ? `${f} · Suspendido` : r ? `${f} · ${r.ausente ? 'Ausente' : `${r.entra || '—'} a ${r.sale || '—'}`}${r.he ? ` · HE ${r.he}` : ''}${r.vale ? ` · ${r.vale}` : ''}` : f
                      return (
                        <td key={d} onClick={() => onAbrirDia(f)} title={titulo}
                          style={{ textAlign: 'center', padding: '5px 0', cursor: 'pointer', background: mk ? mk.bg : (finde ? 'rgba(251,191,36,0.05)' : 'transparent'), color: mk ? mk.color : 'var(--text3)', fontWeight: 800, borderLeft: '1px solid var(--border)' }}>
                          {mk ? mk.txt : (finde ? '' : '')}
                        </td>
                      )
                    })}
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#3dd68c', borderLeft: '1px solid var(--border)' }}>{oks}</td>
                    <td style={{ textAlign: 'center', fontWeight: 700, color: heTot > 0 ? '#fbbf24' : 'var(--text3)', borderLeft: '1px solid var(--border)' }}>{fmtHm(heTot) || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>Tocá una celda para abrir ese día y editarlo.</div>
    </div>
  )
}

// Cuenta días hábiles (Lun-Vie) en la intersección de dos rangos [a1,a2] y [b1,b2] (strings YYYY-MM-DD)
function diasHabilesInter(a1, a2, b1, b2) {
  const ini = a1 > b1 ? a1 : b1, fin = a2 < b2 ? a2 : b2
  if (!ini || !fin || ini > fin) return 0
  let d = new Date(ini + 'T12:00:00'); const end = new Date(fin + 'T12:00:00'); let n = 0
  while (d <= end) { const dw = d.getDay(); if (dw !== 0 && dw !== 6) n++; d.setDate(d.getDate() + 1) }
  return n
}

function ReporteModal({ empleados, susp, examenes, onClose }) {
  const [modo, setModo] = useState('mes') // 'mes' | 'anio'
  const [periodo, setPeriodo] = useState(mesActual())
  const [anio, setAnio] = useState(String(new Date().getFullYear()))
  const [regs, setRegs] = useState([])
  const [loading, setLoading] = useState(true)

  const rango = modo === 'mes'
    ? { desde: `${periodo}-01`, hasta: `${periodo}-${String(diasDelMes(periodo)).padStart(2, '0')}`, label: `${NOM_MES[Number(periodo.slice(5)) - 1]} ${periodo.slice(0, 4)}` }
    : { desde: `${anio}-01-01`, hasta: `${anio}-12-31`, label: `Año ${anio}` }

  useEffect(() => {
    let vivo = true; setLoading(true)
    supabase.from('asistencias').select('empleado_id,fecha,entra,ausente,medico').gte('fecha', rango.desde).lte('fecha', rango.hasta).then(({ data }) => {
      if (vivo) { setRegs(data || []); setLoading(false) }
    })
    return () => { vivo = false }
  }, [modo, periodo, anio])

  // Cálculo por empleado
  const filas = empleados.map(e => {
    let tarde = 0, aus = 0, med = 0
    for (const a of regs) {
      if (a.empleado_id !== e.id) continue
      const dow = new Date(a.fecha + 'T12:00:00').getDay(), finde = dow === 0 || dow === 6
      if (a.medico) med++
      else if (a.ausente) aus++
      if (a.entra && !finde && hm(a.entra) != null && hm(a.entra) > 430) tarde++   // 07:10
    }
    const exa = examenes.filter(x => x.empleado_id === e.id).reduce((s, x) => s + diasHabilesInter(x.fecha, x.fecha_hasta || x.fecha, rango.desde, rango.hasta), 0)
    const sus = susp.filter(x => x.empleado_id === e.id).reduce((s, x) => s + diasHabilesInter(x.fecha, x.fecha_hasta || x.fecha, rango.desde, rango.hasta), 0)
    return { e, tarde, aus, med, exa, sus, tot: tarde + aus + med + exa + sus }
  }).filter(f => f.tot > 0).sort((a, b) => b.tot - a.tot)

  const totCol = k => filas.reduce((s, f) => s + f[k], 0)
  const th2 = { padding: '8px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', textAlign: 'center' }
  const td2 = { padding: '7px 10px', fontSize: 13, textAlign: 'center', borderTop: '1px solid var(--border)' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 820, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>📊 Reporte de asistencia <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)' }}>· {rango.label}</span></div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 3 }}>
              <button onClick={() => setModo('mes')} style={tabBtn(modo === 'mes')}>Mensual</button>
              <button onClick={() => setModo('anio')} style={tabBtn(modo === 'anio')}>Anual</button>
            </div>
            {modo === 'mes'
              ? <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ ...iSt, padding: '7px 10px' }} />
              : <input type="number" value={anio} onChange={e => setAnio(e.target.value)} style={{ ...iSt, padding: '7px 10px', width: 110 }} />}
          </div>
          {loading ? <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>Cargando…</div>
            : filas.length === 0 ? <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>Sin novedades en el período.</div>
            : (
              <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                  <thead><tr style={{ background: 'var(--surface2)' }}>
                    <th style={{ ...th2, textAlign: 'left' }}>Empleado</th>
                    <th style={{ ...th2, color: '#fb923c' }}>Llegadas tarde</th>
                    <th style={{ ...th2, color: '#ff5577' }}>Ausentes</th>
                    <th style={{ ...th2, color: '#a78bfa' }}>Médico</th>
                    <th style={{ ...th2, color: '#38bdf8' }}>Examen</th>
                    <th style={{ ...th2, color: '#ff5577' }}>Suspensión</th>
                  </tr></thead>
                  <tbody>
                    {filas.map(({ e, tarde, aus, med, exa, sus }) => (
                      <tr key={e.id}>
                        <td style={{ ...td2, textAlign: 'left', fontWeight: 700 }}>{e.apodo} <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>{[e.nombre, e.apellido].filter(Boolean).join(' ')}</span></td>
                        <td style={{ ...td2, fontWeight: 700, color: tarde ? '#fb923c' : 'var(--border2)' }}>{tarde || '·'}</td>
                        <td style={{ ...td2, fontWeight: 700, color: aus ? '#ff5577' : 'var(--border2)' }}>{aus || '·'}</td>
                        <td style={{ ...td2, fontWeight: 700, color: med ? '#a78bfa' : 'var(--border2)' }}>{med || '·'}</td>
                        <td style={{ ...td2, fontWeight: 700, color: exa ? '#38bdf8' : 'var(--border2)' }}>{exa || '·'}</td>
                        <td style={{ ...td2, fontWeight: 700, color: sus ? '#ff5577' : 'var(--border2)' }}>{sus || '·'}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr style={{ background: 'var(--surface2)' }}>
                    <td style={{ ...td2, textAlign: 'left', fontWeight: 800 }}>TOTAL</td>
                    <td style={{ ...td2, fontWeight: 800, color: '#fb923c' }}>{totCol('tarde')}</td>
                    <td style={{ ...td2, fontWeight: 800, color: '#ff5577' }}>{totCol('aus')}</td>
                    <td style={{ ...td2, fontWeight: 800, color: '#a78bfa' }}>{totCol('med')}</td>
                    <td style={{ ...td2, fontWeight: 800, color: '#38bdf8' }}>{totCol('exa')}</td>
                    <td style={{ ...td2, fontWeight: 800, color: '#ff5577' }}>{totCol('sus')}</td>
                  </tr></tfoot>
                </table>
              </div>
            )}
          <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 10 }}>Llegada tarde = ingreso después de 07:10. Ausentes/Médico salen de la grilla diaria; Examen y Suspensión de sus registros (días hábiles del período).</div>
        </div>
      </div>
    </div>
  )
}
