import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import toast from 'react-hot-toast'

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 5, letterSpacing: '0.5px' }

const fmt = n => '$ ' + new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)
const fmtF = d => { try { return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return d || '' } }
const num = v => { if (v === '' || v == null) return 0; const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : n }
const hoyISO = () => new Date().toISOString().slice(0, 10)

export default function CajaDiaria() {
  const { isAdmin, isAdmin2, user, profile } = useAuth()
  const puede = isAdmin || isAdmin2
  const nombreUsuario = profile?.full_name || profile?.razon_social || user?.email || 'Usuario'

  const [cajas, setCajas] = useState([])
  const [gastos, setGastos] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [expand, setExpand] = useState(null)

  // Modal caja
  const [modalCaja, setModalCaja] = useState(false)
  const [cajaForm, setCajaForm] = useState({ empleado_id: '', concepto: '', monto_asignado: '', fecha: hoyISO() })
  const [editCajaId, setEditCajaId] = useState(null)
  const [guardandoCaja, setGuardandoCaja] = useState(false)

  // Modal gasto
  const [modalGasto, setModalGasto] = useState(null)   // caja_id al que se agrega
  const [gastoForm, setGastoForm] = useState({ fecha: hoyISO(), descripcion: '', monto: '', factura_a: false, pagado_por: '', comprobante_url: '' })
  const [editGastoId, setEditGastoId] = useState(null)
  const [guardandoGasto, setGuardandoGasto] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => { if (puede) cargar() }, [isAdmin, isAdmin2])
  async function cargar() {
    setLoading(true)
    const [cj, gs, emp] = await Promise.all([
      fetchAllRows(() => supabase.from('caja_diaria').select('*').order('created_at', { ascending: false })),
      fetchAllRows(() => supabase.from('caja_gastos').select('*').order('fecha', { ascending: false })),
      fetchAllRows(() => supabase.from('empleados').select('id,apodo,nombre,apellido').order('apodo')),
    ])
    setCajas(cj || []); setGastos(gs || []); setEmpleados(emp || [])
    setLoading(false)
  }

  const nombreEmp = e => e ? `${e.apodo}${e.nombre || e.apellido ? ` (${[e.nombre, e.apellido].filter(Boolean).join(' ')})` : ''}` : ''
  const gastadoDe = cajaId => gastos.filter(g => g.caja_id === cajaId).reduce((s, g) => s + Number(g.monto || 0), 0)

  // ---- Caja ----
  function abrirNuevaCaja() { setEditCajaId(null); setCajaForm({ empleado_id: '', concepto: '', monto_asignado: '', fecha: hoyISO() }); setModalCaja(true) }
  function abrirEditarCaja(c) { setEditCajaId(c.id); setCajaForm({ empleado_id: c.empleado_id || '', concepto: c.concepto || '', monto_asignado: c.monto_asignado != null ? String(c.monto_asignado) : '', fecha: c.fecha || hoyISO() }); setModalCaja(true) }
  async function guardarCaja() {
    if (!cajaForm.empleado_id) return toast.error('Elegí el empleado responsable')
    if (num(cajaForm.monto_asignado) <= 0) return toast.error('Ingresá el monto de la caja')
    setGuardandoCaja(true)
    const emp = empleados.find(e => e.id === cajaForm.empleado_id)
    const payload = {
      empleado_id: cajaForm.empleado_id,
      empleado_nombre: emp ? emp.apodo : null,
      concepto: cajaForm.concepto.trim() || null,
      monto_asignado: num(cajaForm.monto_asignado),
      fecha: cajaForm.fecha || hoyISO(),
      updated_at: new Date().toISOString(),
    }
    const { error } = editCajaId
      ? await supabase.from('caja_diaria').update(payload).eq('id', editCajaId)
      : await supabase.from('caja_diaria').insert({ ...payload, created_by: nombreUsuario })
    setGuardandoCaja(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(editCajaId ? 'Caja actualizada ✅' : 'Caja creada ✅')
    setModalCaja(false); cargar()
  }
  async function toggleEstadoCaja(c) {
    const nuevo = c.estado === 'cerrada' ? 'abierta' : 'cerrada'
    const { error } = await supabase.from('caja_diaria').update({ estado: nuevo, updated_at: new Date().toISOString() }).eq('id', c.id)
    if (error) { toast.error('Error: ' + error.message); return }
    cargar()
  }
  async function eliminarCaja(c) {
    if (!window.confirm(`¿Eliminar la caja de ${c.empleado_nombre || ''} y todos sus gastos?`)) return
    const { error } = await supabase.from('caja_diaria').delete().eq('id', c.id)
    if (error) { toast.error('Error: ' + error.message); return }
    cargar()
  }

  // ---- Gasto ----
  function abrirNuevoGasto(cajaId, responsable) {
    setEditGastoId(null)
    setGastoForm({ fecha: hoyISO(), descripcion: '', monto: '', factura_a: false, pagado_por: responsable || '', comprobante_url: '' })
    setModalGasto(cajaId)
  }
  function abrirEditarGasto(g) {
    setEditGastoId(g.id)
    setGastoForm({ fecha: g.fecha || hoyISO(), descripcion: g.descripcion || '', monto: g.monto != null ? String(g.monto) : '', factura_a: !!g.factura_a, pagado_por: g.pagado_por || '', comprobante_url: g.comprobante_url || '' })
    setModalGasto(g.caja_id)
  }
  async function subirComprobante(file) {
    if (!file) return
    setSubiendo(true)
    const ext = file.name.split('.').pop()
    const path = `caja/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('Imagenes').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir: ' + error.message); setSubiendo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('Imagenes').getPublicUrl(path)
    setGastoForm(f => ({ ...f, comprobante_url: publicUrl }))
    setSubiendo(false); toast.success('Comprobante subido ✅')
  }
  async function guardarGasto() {
    if (!gastoForm.descripcion.trim()) return toast.error('Ingresá la descripción del gasto')
    if (num(gastoForm.monto) <= 0) return toast.error('Ingresá el monto')
    setGuardandoGasto(true)
    const payload = {
      caja_id: modalGasto,
      fecha: gastoForm.fecha || hoyISO(),
      descripcion: gastoForm.descripcion.trim(),
      monto: num(gastoForm.monto),
      factura_a: !!gastoForm.factura_a,
      pagado_por: gastoForm.pagado_por.trim() || null,
      comprobante_url: gastoForm.comprobante_url || null,
    }
    const { error } = editGastoId
      ? await supabase.from('caja_gastos').update(payload).eq('id', editGastoId)
      : await supabase.from('caja_gastos').insert({ ...payload, created_by: nombreUsuario })
    setGuardandoGasto(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(editGastoId ? 'Gasto actualizado ✅' : 'Gasto cargado ✅')
    setModalGasto(null); cargar()
  }
  async function eliminarGasto(g) {
    if (!window.confirm('¿Eliminar este gasto?')) return
    const { error } = await supabase.from('caja_gastos').delete().eq('id', g.id)
    if (error) { toast.error('Error: ' + error.message); return }
    setGastos(prev => prev.filter(x => x.id !== g.id))
  }

  if (!puede) return null

  const totalAsig = cajas.reduce((s, c) => s + Number(c.monto_asignado || 0), 0)
  const totalGast = gastos.reduce((s, g) => s + Number(g.monto || 0), 0)

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>💵 Caja Diaria</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Dinero entregado a cada responsable y sus gastos con comprobantes.</p>
        </div>
        <button onClick={abrirNuevaCaja} style={{ background: 'var(--brand-gradient, #7b9fff)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Nueva caja</button>
      </div>

      {/* Resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[['Asignado total', totalAsig, '#7b9fff'], ['Gastado total', totalGast, '#fb923c'], ['Saldo total', totalAsig - totalGast, '#3dd68c']].map(([l, v, c]) => (
          <div key={l} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c, marginTop: 4 }}>{fmt(v)}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)' }}>Cargando…</div>
      ) : cajas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>Todavía no hay cajas. Creá la primera con “Nueva caja”.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cajas.map(c => {
            const gast = gastadoDe(c.id)
            const saldo = Number(c.monto_asignado || 0) - gast
            const misGastos = gastos.filter(g => g.caja_id === c.id)
            const abierta = c.estado !== 'cerrada'
            const isExp = expand === c.id
            return (
              <div key={c.id} style={{ background: 'var(--surface)', border: `1px solid ${isExp ? 'rgba(123,159,255,0.35)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => setExpand(isExp ? null : c.id)}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: '#7b9fff' }}>👤 {c.empleado_nombre || '—'}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: abierta ? 'rgba(61,214,140,0.12)' : 'rgba(139,152,169,0.15)', color: abierta ? '#3dd68c' : '#8b98a9', border: `1px solid ${abierta ? 'rgba(61,214,140,0.35)' : 'rgba(139,152,169,0.4)'}` }}>{abierta ? 'Abierta' : 'Cerrada'}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtF(c.fecha)}</span>
                    </div>
                    {c.concepto && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 2 }}>{c.concepto}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Asignado</div><div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(c.monto_asignado)}</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Gastado</div><div style={{ fontSize: 14, fontWeight: 700, color: '#fb923c' }}>{fmt(gast)}</div></div>
                    <div style={{ textAlign: 'right' }}><div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>Saldo</div><div style={{ fontSize: 15, fontWeight: 800, color: saldo < 0 ? '#ff5577' : '#3dd68c' }}>{fmt(saldo)}</div></div>
                    <span style={{ fontSize: 18, color: 'var(--text3)' }}>{isExp ? '▴' : '▾'}</span>
                  </div>
                </div>

                {isExp && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                      {abierta && <button onClick={() => abrirNuevoGasto(c.id, c.empleado_nombre)} style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.4)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Agregar gasto</button>}
                      <button onClick={() => abrirEditarCaja(c)} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️ Editar caja</button>
                      <button onClick={() => toggleEstadoCaja(c)} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>{abierta ? '🔒 Cerrar' : '🔓 Reabrir'}</button>
                      {isAdmin && <button onClick={() => eliminarCaja(c)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑 Eliminar</button>}
                    </div>

                    {misGastos.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--text3)', padding: '10px 0' }}>Sin gastos cargados.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {misGastos.map(g => (
                          <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 66 }}>{fmtF(g.fecha)}</span>
                            <div style={{ flex: 1, minWidth: 140 }}>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{g.descripcion}</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 3, alignItems: 'center' }}>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 12, background: g.factura_a ? 'rgba(61,214,140,0.12)' : 'rgba(139,152,169,0.12)', color: g.factura_a ? '#3dd68c' : '#8b98a9', border: `1px solid ${g.factura_a ? 'rgba(61,214,140,0.35)' : 'var(--border)'}` }}>{g.factura_a ? '🧾 Factura A' : 'Sin Factura A'}</span>
                                {g.pagado_por && <span style={{ fontSize: 10, color: 'var(--text3)' }}>Pagó: <b style={{ color: 'var(--text2)' }}>{g.pagado_por}</b></span>}
                                {g.comprobante_url && <a href={g.comprobante_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#7b9fff', textDecoration: 'none', fontWeight: 600 }}>📎 Comprobante</a>}
                              </div>
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#fb923c' }}>{fmt(g.monto)}</span>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button onClick={() => abrirEditarGasto(g)} style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️</button>
                              <button onClick={() => eliminarGasto(g)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal caja */}
      {modalCaja && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 460 }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{editCajaId ? '✏️ Editar caja' : '➕ Nueva caja'}</div>
              <button onClick={() => setModalCaja(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={lbl}>Empleado responsable *</label>
                <select value={cajaForm.empleado_id} onChange={e => setCajaForm(f => ({ ...f, empleado_id: e.target.value }))} style={iSt}>
                  <option value="">— Elegí un empleado —</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{nombreEmp(e)}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Monto de la caja *</label><input value={cajaForm.monto_asignado} onChange={e => setCajaForm(f => ({ ...f, monto_asignado: e.target.value }))} placeholder="Ej: 50000" style={iSt} /></div>
                <div><label style={lbl}>Fecha</label><input type="date" value={cajaForm.fecha} onChange={e => setCajaForm(f => ({ ...f, fecha: e.target.value }))} style={iSt} /></div>
              </div>
              <div><label style={lbl}>Concepto (opcional)</label><input value={cajaForm.concepto} onChange={e => setCajaForm(f => ({ ...f, concepto: e.target.value }))} placeholder="Ej: Caja chica compras de planta" style={iSt} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={guardarCaja} disabled={guardandoCaja} style={{ flex: 1, background: 'var(--brand-gradient, #7b9fff)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 700, cursor: guardandoCaja ? 'not-allowed' : 'pointer', opacity: guardandoCaja ? 0.7 : 1, fontFamily: 'var(--font)' }}>{guardandoCaja ? 'Guardando…' : editCajaId ? '✓ Guardar' : '✓ Crear caja'}</button>
                <button onClick={() => setModalCaja(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal gasto */}
      {modalGasto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{editGastoId ? '✏️ Editar gasto' : '➕ Nuevo gasto'}</div>
              <button onClick={() => setModalGasto(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Descripción *</label><input value={gastoForm.descripcion} onChange={e => setGastoForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Ferretería tornillos" style={iSt} autoFocus /></div>
                <div><label style={lbl}>Monto *</label><input value={gastoForm.monto} onChange={e => setGastoForm(f => ({ ...f, monto: e.target.value }))} placeholder="Ej: 3500" style={iSt} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Fecha</label><input type="date" value={gastoForm.fecha} onChange={e => setGastoForm(f => ({ ...f, fecha: e.target.value }))} style={iSt} /></div>
                <div><label style={lbl}>¿Quién realizó el pago?</label>
                  <input list="empleados-list" value={gastoForm.pagado_por} onChange={e => setGastoForm(f => ({ ...f, pagado_por: e.target.value }))} placeholder="Empleado o nombre" style={iSt} />
                  <datalist id="empleados-list">{empleados.map(e => <option key={e.id} value={e.apodo}>{nombreEmp(e)}</option>)}</datalist>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: gastoForm.factura_a ? 'rgba(61,214,140,0.06)' : 'var(--surface2)', border: `1px solid ${gastoForm.factura_a ? 'rgba(61,214,140,0.35)' : 'var(--border)'}`, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>
                <input type="checkbox" checked={gastoForm.factura_a} onChange={e => setGastoForm(f => ({ ...f, factura_a: e.target.checked }))} style={{ width: 16, height: 16 }} />
                <div><div style={{ fontSize: 13, fontWeight: 700, color: gastoForm.factura_a ? '#3dd68c' : 'var(--text2)' }}>🧾 Incluye Factura A</div><div style={{ fontSize: 11, color: 'var(--text3)' }}>Marcá si el gasto viene con Factura A</div></div>
              </label>
              <div>
                <label style={lbl}>Comprobante (opcional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {gastoForm.comprobante_url ? (
                    <div style={{ position: 'relative' }}>
                      <a href={gastoForm.comprobante_url} target="_blank" rel="noreferrer"><img src={gastoForm.comprobante_url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} onError={e => { e.currentTarget.style.opacity = 0.3 }} /></a>
                      <button onClick={() => setGastoForm(f => ({ ...f, comprobante_url: '' }))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ff5577', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer' }}>×</button>
                    </div>
                  ) : <div style={{ width: 60, height: 60, borderRadius: 8, border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 20 }}>📷</div>}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(123,159,255,0.12)', border: '1px solid rgba(123,159,255,0.4)', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#7b9fff', cursor: subiendo ? 'not-allowed' : 'pointer' }}>
                      {subiendo ? '⏳' : '📷 Tomar foto'}
                      <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} disabled={subiendo} onChange={e => { if (e.target.files?.[0]) subirComprobante(e.target.files[0]); e.target.value = '' }} />
                    </label>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: subiendo ? 'not-allowed' : 'pointer' }}>
                      {subiendo ? '⏳' : '📁 Subir'}
                      <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} disabled={subiendo} onChange={e => { if (e.target.files?.[0]) subirComprobante(e.target.files[0]); e.target.value = '' }} />
                    </label>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={guardarGasto} disabled={guardandoGasto} style={{ flex: 1, background: 'linear-gradient(135deg, #fb923c, #f97316)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 700, cursor: guardandoGasto ? 'not-allowed' : 'pointer', opacity: guardandoGasto ? 0.7 : 1, fontFamily: 'var(--font)' }}>{guardandoGasto ? 'Guardando…' : editGastoId ? '✓ Guardar' : '✓ Cargar gasto'}</button>
                <button onClick={() => setModalGasto(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
