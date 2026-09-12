import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import toast from 'react-hot-toast'

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 11px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4, letterSpacing: '0.3px' }

// Campos: [key, label, tipo]  (tipo: text | number | date | textarea)
const GRUPOS = [
  { titulo: '👤 Datos personales', campos: [
    ['id_externo', 'ID', 'number'], ['apodo', 'Apodo *'], ['nombre', 'Nombre'], ['apellido', 'Apellido'],
    ['cuil', 'CUIL'], ['nacimiento', 'Nacimiento', 'date'], ['estado_civil', 'Estado civil'], ['hijos', 'Hijos', 'number'], ['parentesco', 'Parentesco (contacto)'],
  ]},
  { titulo: '📞 Contacto', campos: [
    ['celular', 'Celular'], ['contacto_alt', 'Contacto alternativo'], ['direccion', 'Dirección'], ['localidad', 'Localidad'], ['cp', 'CP'],
  ]},
  { titulo: '👕 Talles', campos: [['zapato', 'Zapato'], ['remera', 'Remera']] },
  { titulo: '🏦 Beneficios / social', campos: [['plan', 'Plan'], ['plan2', 'Plan 2'], ['auh', 'AUH'], ['tarjeta', 'Tarjeta'], ['monto', 'Monto', 'number'], ['preocupacional', 'Preocupacional']] },
  { titulo: '🏭 Laboral', campos: [['sector', 'Sector ppal'], ['fecha_ingreso', 'Fecha ingreso', 'date'], ['fecha_egreso1', 'Fecha egreso 1', 'date'], ['renuncia', 'Renuncia'], ['antiguedad', 'Antigüedad', 'number'], ['fecha_ingreso2', 'Fecha ingreso 2', 'date'], ['fecha_egreso2', 'Fecha egreso 2', 'date']] },
  { titulo: '💳 Bancario', campos: [['cbu', 'CBU'], ['alias', 'Alias']] },
  { titulo: '📝 Otros', campos: [['referencia', 'Referencia'], ['comentarios', 'Comentarios', 'textarea']] },
]
const CAMPOS = GRUPOS.flatMap(g => g.campos)
const DATE_F = new Set(['nacimiento', 'fecha_ingreso', 'fecha_egreso1', 'fecha_ingreso2', 'fecha_egreso2'])
const NUM_F = new Set(['id_externo', 'hijos', 'monto', 'antiguedad'])
const EMPTY = Object.fromEntries(CAMPOS.map(([k]) => [k, '']))

export default function Empleados() {
  const { isAdmin, isAdmin2 } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [guardando, setGuardando] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [expandido, setExpandido] = useState(null)

  useEffect(() => { if (isAdmin || isAdmin2) cargar() }, [isAdmin, isAdmin2])

  async function cargar() {
    setLoading(true)
    const data = await fetchAllRows(() => supabase.from('empleados').select('*').order('apodo'))
    setItems(data || [])
    setLoading(false)
  }

  function abrirNuevo() { setForm(EMPTY); setEditId(null); setModalOpen(true) }
  function abrirEditar(e) {
    const f = {}
    for (const [k] of CAMPOS) f[k] = e[k] ?? ''
    setForm(f); setEditId(e.id); setModalOpen(true)
  }

  function buildPayload() {
    const p = {}
    for (const [k] of CAMPOS) {
      const v = form[k] ?? ''
      if (NUM_F.has(k)) p[k] = v === '' || v == null ? null : Number(v)
      else p[k] = String(v).trim() === '' ? null : (DATE_F.has(k) ? v : String(v).trim())
    }
    return p
  }

  async function guardar() {
    if (!String(form.apodo || '').trim()) return toast.error('Ingresá el apodo / nombre corto')
    setGuardando(true)
    const payload = buildPayload()
    const { error } = editId
      ? await supabase.from('empleados').update(payload).eq('id', editId)
      : await supabase.from('empleados').insert(payload)
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(editId ? 'Empleado actualizado ✅' : 'Empleado agregado ✅')
    setModalOpen(false); setEditId(null); cargar()
  }

  async function eliminar(id) {
    const { error } = await supabase.from('empleados').delete().eq('id', id)
    setConfirmDel(null)
    if (error) { toast.error('Error: ' + error.message); return }
    cargar()
  }

  if (!isAdmin && !isAdmin2) return null
  const readOnly = isAdmin2

  const q = busqueda.trim().toLowerCase()
  const filtrados = items.filter(e => !q || [e.apodo, e.nombre, e.apellido, e.sector, e.cuil].some(v => (v || '').toLowerCase().includes(q)))

  const fmt = (k, v) => {
    if (v == null || v === '') return '—'
    if (DATE_F.has(k)) { try { return new Date(v + 'T12:00:00').toLocaleDateString('es-AR') } catch { return v } }
    return String(v)
  }

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Empleados</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Ficha completa del personal de producción</p>
        </div>
        {!readOnly && (
          <button onClick={abrirNuevo} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Nuevo empleado</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
        <input type="text" placeholder="🔍 Buscar por apodo, nombre, apellido o CUIL..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...iSt, maxWidth: 420 }} />
        <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>{filtrados.length} empleados</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          {busqueda ? 'Sin resultados.' : 'Todavía no hay empleados. Agregá el primero.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.map(e => {
            const isDel = confirmDel === e.id
            const isExp = expandido === e.id
            return (
              <div key={e.id} style={{ background: 'var(--surface)', border: `1px solid ${isDel ? 'rgba(255,85,119,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: 'var(--text2)', flexShrink: 0 }}>{(e.apodo || '?').slice(0, 2).toUpperCase()}</div>
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpandido(isExp ? null : e.id)}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{e.apodo} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text3)' }}>· {[e.nombre, e.apellido].filter(Boolean).join(' ') || '—'}</span></div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{[e.sector, e.celular, e.cuil].filter(Boolean).join(' · ') || '—'}</div>
                  </div>
                  <button onClick={() => setExpandido(isExp ? null : e.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13 }}>{isExp ? '▲' : '▾'}</button>
                  {!readOnly && (isDel ? (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => eliminar(e.id)} style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Sí</button>
                      <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>No</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => abrirEditar(e)} style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️</button>
                      <button onClick={() => setConfirmDel(e.id)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
                    </div>
                  ))}
                </div>
                {isExp && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: 'rgba(0,0,0,0.12)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px 16px' }}>
                    {CAMPOS.filter(([k]) => k !== 'apodo' && e[k] != null && e[k] !== '').map(([k, label]) => (
                      <div key={k}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{label.replace(' *', '')}</div>
                        <div style={{ fontSize: 13, color: 'var(--text2)' }}>{fmt(k, e[k])}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{editId ? 'Editar empleado' : 'Nuevo empleado'}</div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {GRUPOS.map(g => (
                <div key={g.titulo}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>{g.titulo}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                    {g.campos.map(([k, label, tipo]) => (
                      <div key={k} style={{ gridColumn: tipo === 'textarea' ? '1 / -1' : 'auto' }}>
                        <label style={lbl}>{label}</label>
                        {tipo === 'textarea'
                          ? <textarea value={form[k] ?? ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} rows={2} style={{ ...iSt, resize: 'vertical' }} />
                          : <input type={tipo === 'number' ? 'number' : tipo === 'date' ? 'date' : 'text'} value={form[k] ?? ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={{ ...iSt, colorScheme: 'dark' }} />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, position: 'sticky', bottom: 0, background: 'var(--surface)', paddingTop: 6 }}>
                <button onClick={guardar} disabled={guardando} style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>{guardando ? 'Guardando...' : editId ? '✓ Guardar' : '✓ Agregar'}</button>
                <button onClick={() => setModalOpen(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
