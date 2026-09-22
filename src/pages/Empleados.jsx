import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import ImportarCSV from '@/components/ImportarCSV'
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
  { titulo: '🏭 Laboral', campos: [['sector', 'Sector ppal'], ['fecha_ingreso', 'Fecha ingreso', 'date'], ['fecha_egreso1', 'Fecha egreso 1', 'date'], ['renuncia', 'Renuncia'], ['fecha_ingreso2', 'Fecha ingreso 2', 'date'], ['fecha_egreso2', 'Fecha egreso 2', 'date']] },
  { titulo: '💳 Bancario', campos: [['cbu', 'CBU'], ['alias', 'Alias']] },
  { titulo: '📝 Otros', campos: [['referencia', 'Referencia'], ['comentarios', 'Comentarios', 'textarea']] },
]
const CAMPOS = GRUPOS.flatMap(g => g.campos)
const DATE_F = new Set(['nacimiento', 'fecha_ingreso', 'fecha_egreso1', 'fecha_ingreso2', 'fecha_egreso2'])
const NUM_F = new Set(['id_externo', 'hijos', 'monto', 'antiguedad'])
// Sectores de producción en los que puede participar el empleado
export const SECTORES_EMP = ['Corte', 'Armado', 'Alambre', 'Encuadre', 'Aguj N°2', 'Enduido+Lija', 'Pintura', 'Cables+Kits', 'Eléctrica+Embalaje', '1400w', 'Taller']
const EMPTY = { ...Object.fromEntries(CAMPOS.map(([k]) => [k, ''])), sectores: [] }
const COLS_CSV_EMP = [
  { key: 'apodo', label: 'apodo', required: true },
  ...CAMPOS.filter(([k]) => k !== 'apodo').map(([k]) => ({ key: k, label: k, type: DATE_F.has(k) ? 'date' : (k === 'monto' ? 'number' : NUM_F.has(k) ? 'int' : undefined) })),
  { key: 'sectores', label: 'sectores', type: 'list' },
]

export default function Empleados() {
  const { isAdmin, isAdmin2, isMantenimiento, user, profile } = useAuth()
  const navigate = useNavigate()
  const [suspOpen, setSuspOpen] = useState(false)
  const [charlasOpen, setCharlasOpen] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [guardando, setGuardando] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [expandido, setExpandido] = useState(null)
  const [susp, setSusp] = useState([])
  const [charlas, setCharlas] = useState([])
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => { if (isAdmin || isAdmin2 || isMantenimiento) cargar() }, [isAdmin, isAdmin2, isMantenimiento])

  async function cargar() {
    setLoading(true)
    const [data, s, c] = await Promise.all([
      fetchAllRows(() => supabase.from('empleados').select('*').order('apodo')),
      supabase.from('suspensiones').select('empleado_id,fecha,dias,motivo').order('fecha', { ascending: false }),
      supabase.from('charlas').select('empleado_id,fecha,motivo,responsable').order('fecha', { ascending: false }),
    ])
    setItems(data || [])
    setSusp(s.data || []); setCharlas(c.data || [])
    setLoading(false)
  }
  const recargarRegistros = async () => {
    const [s, c] = await Promise.all([
      supabase.from('suspensiones').select('empleado_id,fecha,dias,motivo').order('fecha', { ascending: false }),
      supabase.from('charlas').select('empleado_id,fecha,motivo,responsable').order('fecha', { ascending: false }),
    ])
    setSusp(s.data || []); setCharlas(c.data || [])
  }

  function abrirNuevo() { setForm(EMPTY); setEditId(null); setModalOpen(true) }
  function abrirEditar(e) {
    const f = {}
    for (const [k] of CAMPOS) f[k] = e[k] ?? ''
    f.sectores = Array.isArray(e.sectores) ? e.sectores : []
    setForm(f); setEditId(e.id); setModalOpen(true)
  }

  function buildPayload() {
    const p = {}
    for (const [k] of CAMPOS) {
      const v = form[k] ?? ''
      if (NUM_F.has(k)) p[k] = v === '' || v == null ? null : Number(v)
      else p[k] = String(v).trim() === '' ? null : (DATE_F.has(k) ? v : String(v).trim())
    }
    p.sectores = form.sectores || []
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

  if (!isAdmin && !isAdmin2 && !isMantenimiento) return null
  const readOnly = isAdmin2 || isMantenimiento

  const q = busqueda.trim().toLowerCase()
  const filtrados = items.filter(e => !q || [e.apodo, e.nombre, e.apellido, e.sector, e.cuil].some(v => (v || '').toLowerCase().includes(q)))

  const fmt = (k, v) => {
    if (v == null || v === '') return '—'
    if (DATE_F.has(k)) { try { return new Date(v + 'T12:00:00').toLocaleDateString('es-AR') } catch { return v } }
    return String(v)
  }

  // Antigüedad calculada desde la fecha de ingreso (suma períodos si hubo egreso + reingreso)
  const antiguedad = (e) => {
    const parse = s => s ? new Date(s + 'T12:00:00') : null
    const i1 = parse(e.fecha_ingreso), eg1 = parse(e.fecha_egreso1), i2 = parse(e.fecha_ingreso2), eg2 = parse(e.fecha_egreso2)
    const hoy = new Date()
    if (!i1 && !i2) return null
    let ms = 0
    if (i1) { const fin = (i2 ? eg1 : (eg1 || eg2)) || hoy; if (fin > i1) ms += fin - i1 }
    if (i2) { const fin = eg2 || hoy; if (fin > i2) ms += fin - i2 }
    const dias = ms / 86400000
    if (dias <= 0) return null
    const anios = Math.floor(dias / 365.25)
    const meses = Math.floor((dias - anios * 365.25) / 30.44)
    const activo = !((i2 ? eg2 : (eg1 || eg2)))
    return { anios, meses, activo, txt: `${anios} año${anios !== 1 ? 's' : ''}${meses ? ` ${meses} mes${meses !== 1 ? 'es' : ''}` : ''}` }
  }

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Empleados</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Ficha completa del personal de producción</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/produccion/asistencia')} style={{ background: 'var(--surface2)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>🕐 Ingreso/Egreso</button>
          <button onClick={() => setCharlasOpen(true)} style={{ background: 'var(--surface2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.35)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>💬 Charlas</button>
          <button onClick={() => setSuspOpen(true)} style={{ background: 'var(--surface2)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.35)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>🚫 Suspensiones</button>
          {!readOnly && <button onClick={() => setImportOpen(true)} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>📥 Importar CSV</button>}
          {!readOnly && <button onClick={abrirNuevo} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Nuevo empleado</button>}
        </div>
      </div>
      {importOpen && <ImportarCSV titulo="Empleados" tabla="empleados" columnas={COLS_CSV_EMP} onClose={() => setImportOpen(false)} onDone={cargar} />}
      {suspOpen && <SuspensionesModal empleados={items} puedeEditar={!readOnly} usuario={profile?.full_name || user?.email || 'Admin'} onClose={() => setSuspOpen(false)} onChange={recargarRegistros} />}
      {charlasOpen && <CharlasModal empleados={items} puedeEditar={!readOnly} usuario={profile?.full_name || user?.email || 'Admin'} onClose={() => setCharlasOpen(false)} onChange={recargarRegistros} />}

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
                    {Array.isArray(e.sectores) && e.sectores.length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 3 }}>Sectores</div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {e.sectores.map(s => <span key={s} style={{ fontSize: 11, fontWeight: 700, color: '#3dd68c', background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 20, padding: '2px 9px' }}>{s}</span>)}
                        </div>
                      </div>
                    )}
                    {(() => { const a = antiguedad(e); return a ? (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Antigüedad {a.activo ? '' : '(al egreso)'}</div>
                        <div style={{ fontSize: 13, color: '#3dd68c', fontWeight: 700 }}>{a.txt}</div>
                      </div>
                    ) : null })()}
                    {(() => {
                      const sE = susp.filter(x => x.empleado_id === e.id)
                      const cE = charlas.filter(x => x.empleado_id === e.id)
                      const diasT = sE.reduce((s, x) => s + (x.dias || 0), 0)
                      return (
                        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 2 }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: sE.length || cE.length ? 6 : 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#fb923c', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 20, padding: '2px 10px' }}>🚫 Suspensiones: {sE.length}{diasT ? ` · ${diasT} días` : ''}</span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 20, padding: '2px 10px' }}>💬 Charlas: {cE.length}</span>
                          </div>
                          {sE.slice(0, 3).map((x, i) => <div key={'s' + i} style={{ fontSize: 11, color: 'var(--text3)' }}>🚫 {new Date(x.fecha + 'T12:00:00').toLocaleDateString('es-AR')} · {x.dias} día{x.dias !== 1 ? 's' : ''}{x.motivo ? ` · ${x.motivo}` : ''}</div>)}
                          {cE.slice(0, 3).map((x, i) => <div key={'c' + i} style={{ fontSize: 11, color: 'var(--text3)' }}>💬 {new Date(x.fecha + 'T12:00:00').toLocaleDateString('es-AR')}{x.responsable ? ` · con ${x.responsable}` : ''}{x.motivo ? ` · ${x.motivo}` : ''}</div>)}
                        </div>
                      )
                    })()}
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
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>🏭 Sectores en los que participa</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SECTORES_EMP.map(s => {
                    const sel = (form.sectores || []).includes(s)
                    return <button key={s} type="button" onClick={() => setForm(f => ({ ...f, sectores: sel ? f.sectores.filter(x => x !== s) : [...(f.sectores || []), s] }))}
                      style={{ padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(61,214,140,0.15)' : 'var(--surface2)', color: sel ? '#3dd68c' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(61,214,140,0.45)' : 'var(--border)'}` }}>{s}</button>
                  })}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>Si no elegís ninguno, el empleado aparece en todas las OT.</div>
              </div>
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

function SuspensionesModal({ empleados, puedeEditar, usuario, onClose, onChange }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ empleado_id: '', motivo: '', fecha: new Date().toISOString().slice(0, 10), dias: 1 })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])
  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('suspensiones').select('*').order('fecha', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }
  const nombreDe = id => { const e = empleados.find(x => x.id === id); return e ? `${e.apodo}${e.nombre || e.apellido ? ` · ${[e.nombre, e.apellido].filter(Boolean).join(' ')}` : ''}` : '—' }
  const fmtF = f => f ? new Date(f + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  async function agregar() {
    if (!form.empleado_id) return toast.error('Elegí el empleado')
    if (!form.fecha) return toast.error('Ingresá la fecha')
    const dias = parseInt(form.dias) || 0
    if (dias <= 0) return toast.error('Los días deben ser mayor a 0')
    setGuardando(true)
    const { error } = await supabase.from('suspensiones').insert({ empleado_id: form.empleado_id, motivo: form.motivo.trim() || null, fecha: form.fecha, dias, creado_por: usuario })
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Suspensión registrada ✅')
    setForm({ empleado_id: '', motivo: '', fecha: new Date().toISOString().slice(0, 10), dias: 1 })
    cargar(); onChange && onChange()
  }
  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este registro de suspensión?')) return
    const { error } = await supabase.from('suspensiones').delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    setItems(prev => prev.filter(x => x.id !== id)); onChange && onChange()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 720, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>🚫 Suspensiones</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {puedeEditar && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 0.7fr auto', gap: 8, alignItems: 'end', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px', marginBottom: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Empleado *</label>
                <select value={form.empleado_id} onChange={e => setForm(f => ({ ...f, empleado_id: e.target.value }))} style={{ ...iSt, cursor: 'pointer' }}>
                  <option value="">Elegí un empleado…</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.apodo} · {[e.nombre, e.apellido].filter(Boolean).join(' ')}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Motivo</label><input value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Motivo de la suspensión" style={iSt} /></div>
              <div><label style={lbl}>Fecha *</label><input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={{ ...iSt, colorScheme: 'dark' }} /></div>
              <div><label style={lbl}>Días *</label><input type="number" min="1" value={form.dias} onChange={e => setForm(f => ({ ...f, dias: e.target.value }))} style={iSt} /></div>
              <button onClick={agregar} disabled={guardando} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '9px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', height: 38 }}>➕ Registrar</button>
            </div>
          )}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>Cargando…</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>Sin suspensiones registradas.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(s => (
                <div key={s.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{nombreDe(s.empleado_id)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtF(s.fecha)} · <b style={{ color: '#fb923c' }}>{s.dias} día{s.dias !== 1 ? 's' : ''}</b>{s.motivo ? ` · ${s.motivo}` : ''}{s.creado_por ? <span style={{ color: 'var(--text3)' }}> · cargó {s.creado_por}</span> : ''}</div>
                  </div>
                  {puedeEditar && <button onClick={() => eliminar(s.id)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '5px 9px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CharlasModal({ empleados, puedeEditar, usuario, onClose, onChange }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ empleado_id: '', motivo: '', fecha: new Date().toISOString().slice(0, 10), responsable: '', detalle: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])
  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('charlas').select('*').order('fecha', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }
  const nombreDe = id => { const e = empleados.find(x => x.id === id); return e ? `${e.apodo}${e.nombre || e.apellido ? ` · ${[e.nombre, e.apellido].filter(Boolean).join(' ')}` : ''}` : '—' }
  const fmtF = f => f ? new Date(f + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  async function agregar() {
    if (!form.empleado_id) return toast.error('Elegí el empleado')
    if (!form.fecha) return toast.error('Ingresá la fecha')
    setGuardando(true)
    const { error } = await supabase.from('charlas').insert({ empleado_id: form.empleado_id, motivo: form.motivo.trim() || null, fecha: form.fecha, responsable: form.responsable.trim() || null, detalle: form.detalle.trim() || null, creado_por: usuario })
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Charla registrada ✅')
    setForm({ empleado_id: '', motivo: '', fecha: new Date().toISOString().slice(0, 10), responsable: '', detalle: '' })
    cargar(); onChange && onChange()
  }
  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este registro de charla?')) return
    const { error } = await supabase.from('charlas').delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    setItems(prev => prev.filter(x => x.id !== id)); onChange && onChange()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 720, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>💬 Charlas</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {puedeEditar && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px', marginBottom: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={lbl}>Empleado *</label>
                <select value={form.empleado_id} onChange={e => setForm(f => ({ ...f, empleado_id: e.target.value }))} style={{ ...iSt, cursor: 'pointer' }}>
                  <option value="">Elegí un empleado…</option>
                  {empleados.map(e => <option key={e.id} value={e.id}>{e.apodo} · {[e.nombre, e.apellido].filter(Boolean).join(' ')}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Motivo</label><input value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} placeholder="Motivo de la charla" style={iSt} /></div>
              <div><label style={lbl}>Fecha *</label><input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={{ ...iSt, colorScheme: 'dark' }} /></div>
              <div><label style={lbl}>Quién dio la charla</label>
                <select value={form.responsable} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} style={{ ...iSt, cursor: 'pointer' }}>
                  <option value="">Elegí…</option>
                  {usuario && <option value={usuario}>{usuario} (yo)</option>}
                  {empleados.map(e => { const n = `${e.apodo}${[e.nombre, e.apellido].filter(Boolean).length ? ` · ${[e.nombre, e.apellido].filter(Boolean).join(' ')}` : ''}`; return <option key={e.id} value={n}>{n}</option> })}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Detalle de la charla</label><textarea value={form.detalle} onChange={e => setForm(f => ({ ...f, detalle: e.target.value }))} rows={3} placeholder="Escribí lo que se habló en la charla…" style={{ ...iSt, resize: 'vertical', lineHeight: 1.5 }} /></div>
              <button onClick={agregar} disabled={guardando} style={{ gridColumn: '1 / -1', background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Registrar charla</button>
            </div>
          )}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>Cargando…</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>Sin charlas registradas.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map(s => (
                <div key={s.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{nombreDe(s.empleado_id)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{fmtF(s.fecha)}{s.responsable ? ` · con ${s.responsable}` : ''}{s.motivo ? ` · ${s.motivo}` : ''}{s.creado_por ? <span style={{ color: 'var(--text3)' }}> · cargó {s.creado_por}</span> : ''}</div>
                    {s.detalle && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{s.detalle}</div>}
                  </div>
                  {puedeEditar && <button onClick={() => eliminar(s.id)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '5px 9px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>🗑</button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
