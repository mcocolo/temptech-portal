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

const MEDIOS = {
  caja: { label: 'Caja', color: '#7b9fff', icon: '💵' },
  transferencia_mp: { label: 'Transf. / MP empresa', color: '#2dd4bf', icon: '🏦' },
  propio: { label: 'Tarjeta / dinero propio', color: '#fb923c', icon: '💳' },
}

export default function Gastos() {
  const { isAdmin, isAdmin2, isMantenimiento, user, profile } = useAuth()
  const puede = isAdmin || isAdmin2 || isMantenimiento
  const nombreUsuario = profile?.full_name || profile?.razon_social || user?.email || 'Usuario'

  const [gastos, setGastos] = useState([])
  const [cajas, setCajas] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroMedio, setFiltroMedio] = useState('')
  const [soloFactA, setSoloFactA] = useState(false)

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ fecha: hoyISO(), descripcion: '', monto: '', factura_a: false, pagado_por: '', medio_pago: 'propio', caja_id: '', comprobante_url: '' })
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => { if (puede) cargar() }, [isAdmin, isAdmin2, isMantenimiento])
  async function cargar() {
    setLoading(true)
    const [gs, cj, emp] = await Promise.all([
      fetchAllRows(() => supabase.from('gastos').select('*').order('fecha', { ascending: false })),
      fetchAllRows(() => supabase.from('caja_diaria').select('id,empleado_nombre,concepto').order('created_at', { ascending: false })),
      fetchAllRows(() => supabase.from('empleados').select('id,apodo,nombre,apellido').order('apodo')),
    ])
    setGastos(gs || []); setCajas(cj || []); setEmpleados(emp || [])
    setLoading(false)
  }
  const nombreEmp = e => e ? `${e.apodo}${e.nombre || e.apellido ? ` (${[e.nombre, e.apellido].filter(Boolean).join(' ')})` : ''}` : ''
  const cajaLabel = id => { const c = cajas.find(x => x.id === id); return c ? `${c.empleado_nombre || 'Caja'}${c.concepto ? ` · ${c.concepto}` : ''}` : '' }

  function abrirNuevo() { setEditId(null); setForm({ fecha: hoyISO(), descripcion: '', monto: '', factura_a: false, pagado_por: nombreUsuario, medio_pago: 'propio', caja_id: '', comprobante_url: '' }); setModal(true) }
  function abrirEditar(g) { setEditId(g.id); setForm({ fecha: g.fecha || hoyISO(), descripcion: g.descripcion || '', monto: g.monto != null ? String(g.monto) : '', factura_a: !!g.factura_a, pagado_por: g.pagado_por || '', medio_pago: g.medio_pago || 'propio', caja_id: g.caja_id || '', comprobante_url: g.comprobante_url || '' }); setModal(true) }

  async function subirComprobante(file) {
    if (!file) return
    setSubiendo(true)
    const ext = file.name.split('.').pop()
    const path = `gastos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('Imagenes').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir: ' + error.message); setSubiendo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('Imagenes').getPublicUrl(path)
    setForm(f => ({ ...f, comprobante_url: publicUrl }))
    setSubiendo(false); toast.success('Comprobante subido ✅')
  }
  async function guardar() {
    if (!form.descripcion.trim()) return toast.error('Ingresá la descripción')
    if (num(form.monto) <= 0) return toast.error('Ingresá el monto')
    if (form.medio_pago === 'caja' && !form.caja_id) return toast.error('Elegí de qué caja sale el gasto')
    setGuardando(true)
    const payload = {
      fecha: form.fecha || hoyISO(),
      descripcion: form.descripcion.trim(),
      monto: num(form.monto),
      factura_a: !!form.factura_a,
      pagado_por: form.pagado_por.trim() || null,
      medio_pago: form.medio_pago,
      caja_id: form.medio_pago === 'caja' ? (form.caja_id || null) : null,
      comprobante_url: form.comprobante_url || null,
    }
    const { error } = editId
      ? await supabase.from('gastos').update(payload).eq('id', editId)
      : await supabase.from('gastos').insert({ ...payload, created_by: nombreUsuario })
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(editId ? 'Gasto actualizado ✅' : 'Gasto cargado ✅')
    setModal(false); cargar()
  }
  async function eliminar(g) {
    if (!window.confirm('¿Eliminar este gasto?')) return
    const { error } = await supabase.from('gastos').delete().eq('id', g.id)
    if (error) { toast.error('Error: ' + error.message); return }
    setGastos(prev => prev.filter(x => x.id !== g.id))
  }

  if (!puede) return null

  const q = busqueda.trim().toLowerCase()
  const filtrados = gastos.filter(g => {
    if (filtroMedio && g.medio_pago !== filtroMedio) return false
    if (soloFactA && !g.factura_a) return false
    if (q && !`${g.descripcion || ''} ${g.pagado_por || ''} ${cajaLabel(g.caja_id)}`.toLowerCase().includes(q)) return false
    return true
  })
  const totalPorMedio = Object.keys(MEDIOS).reduce((acc, m) => { acc[m] = gastos.filter(g => g.medio_pago === m).reduce((s, g) => s + Number(g.monto || 0), 0); return acc }, {})
  const totalFiltrado = filtrados.reduce((s, g) => s + Number(g.monto || 0), 0)

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>🧾 Gastos</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Registro de gastos por medio de pago (caja, transferencia/MP de la empresa o dinero propio).</p>
        </div>
        <button onClick={abrirNuevo} style={{ background: 'var(--brand-gradient, #7b9fff)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Nuevo gasto</button>
      </div>

      {/* Totales por medio */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
        {Object.entries(MEDIOS).map(([m, cfg]) => (
          <div key={m} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{cfg.icon} {cfg.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: cfg.color, marginTop: 4 }}>{fmt(totalPorMedio[m])}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar por descripción, quién pagó o caja…" style={{ ...iSt, maxWidth: 480, marginBottom: 10 }} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: 'var(--text3)' }}>Medio:</span>
        <button onClick={() => setFiltroMedio('')} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: !filtroMedio ? 'rgba(255,255,255,0.1)' : 'var(--surface2)', color: !filtroMedio ? 'var(--text)' : 'var(--text3)', border: '1px solid var(--border)' }}>Todos</button>
        {Object.entries(MEDIOS).map(([m, cfg]) => (
          <button key={m} onClick={() => setFiltroMedio(m === filtroMedio ? '' : m)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: filtroMedio === m ? `${cfg.color}22` : 'var(--surface2)', color: filtroMedio === m ? cfg.color : 'var(--text3)', border: `1px solid ${filtroMedio === m ? cfg.color + '66' : 'var(--border)'}` }}>{cfg.icon} {cfg.label}</button>
        ))}
        <button onClick={() => setSoloFactA(v => !v)} style={{ marginLeft: 8, padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: soloFactA ? 'rgba(61,214,140,0.18)' : 'var(--surface2)', color: soloFactA ? '#3dd68c' : 'var(--text3)', border: `1px solid ${soloFactA ? 'rgba(61,214,140,0.5)' : 'var(--border)'}` }}>🧾 Con Factura A</button>
        <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: 'var(--text2)' }}>Total: {fmt(totalFiltrado)} <span style={{ fontWeight: 400, color: 'var(--text3)', fontSize: 11 }}>({filtrados.length})</span></span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)' }}>Cargando…</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>No hay gastos{gastos.length ? ' para este filtro' : ' cargados'}.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.map(g => { const cfg = MEDIOS[g.medio_pago] || MEDIOS.propio; return (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 66 }}>{fmtF(g.fecha)}</span>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{g.descripcion}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, alignItems: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: cfg.color, background: `${cfg.color}1a`, border: `1px solid ${cfg.color}55`, borderRadius: 12, padding: '1px 9px' }}>{cfg.icon} {cfg.label}</span>
                  {g.medio_pago === 'caja' && g.caja_id && <span style={{ fontSize: 10, color: 'var(--text3)' }}>{cajaLabel(g.caja_id)}</span>}
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 12, background: g.factura_a ? 'rgba(61,214,140,0.12)' : 'rgba(139,152,169,0.12)', color: g.factura_a ? '#3dd68c' : '#8b98a9', border: `1px solid ${g.factura_a ? 'rgba(61,214,140,0.35)' : 'var(--border)'}` }}>{g.factura_a ? '🧾 Factura A' : 'Sin Factura A'}</span>
                  {g.pagado_por && <span style={{ fontSize: 10, color: 'var(--text3)' }}>Pagó: <b style={{ color: 'var(--text2)' }}>{g.pagado_por}</b></span>}
                  {g.comprobante_url && <a href={g.comprobante_url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: '#7b9fff', textDecoration: 'none', fontWeight: 600 }}>📎 Comprobante</a>}
                </div>
              </div>
              <span style={{ fontSize: 15, fontWeight: 800, color: cfg.color }}>{fmt(g.monto)}</span>
              <div style={{ display: 'flex', gap: 5 }}>
                <button onClick={() => abrirEditar(g)} style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️</button>
                <button onClick={() => eliminar(g)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
              </div>
            </div>
          )})}
        </div>
      )}

      {/* Modal gasto */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 500, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{editId ? '✏️ Editar gasto' : '➕ Nuevo gasto'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Descripción *</label><input value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Ej: Combustible camioneta" style={iSt} autoFocus /></div>
                <div><label style={lbl}>Monto *</label><input value={form.monto} onChange={e => setForm(f => ({ ...f, monto: e.target.value }))} placeholder="Ej: 15000" style={iSt} /></div>
              </div>
              <div>
                <label style={lbl}>Medio de pago *</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(MEDIOS).map(([m, cfg]) => { const sel = form.medio_pago === m; return (
                    <button key={m} type="button" onClick={() => setForm(f => ({ ...f, medio_pago: m }))} style={{ padding: '7px 14px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? `${cfg.color}22` : 'var(--surface2)', color: sel ? cfg.color : 'var(--text3)', border: `1px solid ${sel ? cfg.color + '66' : 'var(--border)'}` }}>{cfg.icon} {cfg.label}</button>
                  )})}
                </div>
                {form.medio_pago === 'propio' && <div style={{ fontSize: 11, color: '#fb923c', marginTop: 6 }}>💳 Lo compró con su tarjeta/dinero — queda registrado como gasto a reembolsar.</div>}
              </div>
              {form.medio_pago === 'caja' && (
                <div><label style={lbl}>¿De qué caja? *</label>
                  <select value={form.caja_id} onChange={e => setForm(f => ({ ...f, caja_id: e.target.value }))} style={iSt}>
                    <option value="">— Elegí una caja —</option>
                    {cajas.map(c => <option key={c.id} value={c.id}>{c.empleado_nombre || 'Caja'}{c.concepto ? ` · ${c.concepto}` : ''}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Fecha</label><input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={iSt} /></div>
                <div><label style={lbl}>¿Quién realizó el pago?</label>
                  <input list="emp-list-g" value={form.pagado_por} onChange={e => setForm(f => ({ ...f, pagado_por: e.target.value }))} placeholder="Empleado o nombre" style={iSt} />
                  <datalist id="emp-list-g">{empleados.map(e => <option key={e.id} value={e.apodo}>{nombreEmp(e)}</option>)}</datalist>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, background: form.factura_a ? 'rgba(61,214,140,0.06)' : 'var(--surface2)', border: `1px solid ${form.factura_a ? 'rgba(61,214,140,0.35)' : 'var(--border)'}`, borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.factura_a} onChange={e => setForm(f => ({ ...f, factura_a: e.target.checked }))} style={{ width: 16, height: 16 }} />
                <div><div style={{ fontSize: 13, fontWeight: 700, color: form.factura_a ? '#3dd68c' : 'var(--text2)' }}>🧾 Incluye Factura A</div></div>
              </label>
              <div>
                <label style={lbl}>Comprobante (opcional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {form.comprobante_url ? (
                    <div style={{ position: 'relative' }}>
                      <a href={form.comprobante_url} target="_blank" rel="noreferrer"><img src={form.comprobante_url} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} onError={e => { e.currentTarget.style.opacity = 0.3 }} /></a>
                      <button onClick={() => setForm(f => ({ ...f, comprobante_url: '' }))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ff5577', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer' }}>×</button>
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
                <button onClick={guardar} disabled={guardando} style={{ flex: 1, background: 'var(--brand-gradient, #7b9fff)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>{guardando ? 'Guardando…' : editId ? '✓ Guardar' : '✓ Cargar gasto'}</button>
                <button onClick={() => setModal(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
