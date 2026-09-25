import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import ImportarCSV from '@/components/ImportarCSV'
import toast from 'react-hot-toast'

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }
const SECTORES = ['Corte', 'Armado', 'Alambre', 'Encuadre', 'Aguj N°2', 'Enduido+Lija', 'Pintura', 'Cables+Kits', 'Eléctrica+Embalaje', '1400w', 'General']

// [key, label, tipo]  tipo: text | textarea | sectores
const CAMPOS = [
  ['nombre', 'Equipo *'], ['codigo', 'Código'], ['numero', 'N°'], ['sigla', 'Sigla'],
  ['marca', 'Marca'], ['modelo', 'Modelo'], ['voltaje', 'Voltaje'], ['potencia', 'Potencia'],
  ['ubicacion', 'Ubicación'], ['ubicacion_fisica', 'Ubicación física'],
  ['sectores', 'Sectores afectados', 'sectores'],
  ['servicio', 'Servicio'], ['proveedor', 'Proveedor'], ['repuestos', 'Repuestos'],
  ['anio_ingreso', 'Año ingreso'], ['anio_salida', 'Año salida'], ['motivo', 'Motivo'],
  ['descripcion', 'Descripción', 'textarea'], ['observaciones', 'Observaciones', 'textarea'],
]
const COLS_CSV = [
  { key: 'ubicacion', label: 'Ubicación' }, { key: 'numero', label: 'Nº' }, { key: 'codigo', label: 'Codigo' },
  { key: 'nombre', label: 'Equipo', required: true }, { key: 'marca', label: 'Marca' }, { key: 'modelo', label: 'Modelo' },
  { key: 'ubicacion_fisica', label: 'Ubicación Fisica' }, { key: 'sigla', label: 'Sigla' },
  { key: 'voltaje', label: 'Voltaje' }, { key: 'potencia', label: 'Potencia' },
  { key: 'sectores', label: 'Sectores Afectados', type: 'list' }, { key: 'descripcion', label: 'Descripcion' },
  { key: 'servicio', label: 'Servicio' }, { key: 'estado', label: 'Estado', def: 'Operativa' },
  { key: 'proveedor', label: 'Proveedor' }, { key: 'repuestos', label: 'Repuestos' },
  { key: 'anio_ingreso', label: 'Año Ingreso' }, { key: 'anio_salida', label: 'Año Salida' },
  { key: 'motivo', label: 'Motivo' }, { key: 'observaciones', label: 'Observaciones' },
]
const EMPTY = { ...Object.fromEntries(CAMPOS.map(([k]) => [k, k === 'sectores' ? [] : ''])), estado: 'Operativa', foto_url: '' }

const estColor = e => { const s = (e || '').toLowerCase(); if (/(no funciona|fuera)/.test(s)) return '#ff5577'; if (/(manten)/.test(s)) return '#fb923c'; if (/(funciona|operativa|ok)/.test(s)) return '#3dd68c'; return 'var(--text3)' }

export default function Maquinas() {
  const { isAdmin, isAdmin2, isMantenimiento, user, profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [importOpen, setImportOpen] = useState(false)
  const [expandido, setExpandido] = useState(null)
  const [moviendo, setMoviendo] = useState(null)
  const [filtroVida, setFiltroVida] = useState('activo')   // activo | discontinuado | eliminado | todos
  const [filtroSector, setFiltroSector] = useState('')
  const nombreUsuario = profile?.full_name || user?.email || 'Admin'

  async function cambiarEstadoVida(m, estado) {
    const labels = { activo: 'reactivar', discontinuado: 'discontinuar', eliminado: 'marcar como disposición final (eliminado)' }
    if (!window.confirm(`¿${labels[estado][0].toUpperCase() + labels[estado].slice(1)} "${m.nombre}"?`)) return
    const { error } = await supabase.from('maquinas').update({
      estado_vida: estado, estado_vida_at: new Date().toISOString(), estado_vida_por: nombreUsuario,
    }).eq('id', m.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Actualizado ✅')
    setItems(prev => prev.map(x => x.id === m.id ? { ...x, estado_vida: estado } : x))
  }

  // Mueve una máquina mal clasificada a la tabla Herramental (y la borra de Máquinas)
  async function moverAHerramental(m) {
    if (!window.confirm(`¿Mover "${m.nombre}" a Herramental? Se saca de Máquinas.`)) return
    setMoviendo(m.id)
    const payload = {
      nombre: m.nombre || '—',
      codigo: (m.codigo || m.sigla || '').trim() || null,
      sectores: Array.isArray(m.sectores) ? m.sectores : [],
      sector: (Array.isArray(m.sectores) && m.sectores[0]) || null,
      foto_url: m.foto_url || null,
    }
    const { error } = await supabase.from('herramental').insert(payload)
    if (error) { setMoviendo(null); toast.error('Error al crear en Herramental: ' + error.message); return }
    const { error: delErr } = await supabase.from('maquinas').delete().eq('id', m.id)
    setMoviendo(null)
    if (delErr) { toast.error('Se creó en Herramental pero no se borró de Máquinas: ' + delErr.message); cargar(); return }
    toast.success(`"${m.nombre}" movido a Herramental ✅`)
    setItems(prev => prev.filter(x => x.id !== m.id))
  }

  useEffect(() => { if (isAdmin || isAdmin2 || isMantenimiento) cargar() }, [isAdmin, isAdmin2, isMantenimiento])
  async function cargar() {
    setLoading(true)
    const data = await fetchAllRows(() => supabase.from('maquinas').select('*').order('nombre'))
    setItems(data || [])
    setLoading(false)
  }

  function abrirNuevo() { setForm({ ...EMPTY }); setEditId(null); setModalOpen(true) }
  function abrirEditar(m) {
    const f = {}
    for (const [k] of CAMPOS) f[k] = k === 'sectores' ? (Array.isArray(m.sectores) ? m.sectores : []) : (m[k] ?? '')
    f.estado = m.estado || 'Operativa'; f.foto_url = m.foto_url || ''
    setForm(f); setEditId(m.id); setModalOpen(true)
  }

  async function subirFoto(file) {
    if (!file) return
    setSubiendo(true)
    const ext = file.name.split('.').pop()
    const path = `maquinas/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('Imagenes').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir: ' + error.message); setSubiendo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('Imagenes').getPublicUrl(path)
    setForm(f => ({ ...f, foto_url: publicUrl })); setSubiendo(false); toast.success('Foto subida ✅')
  }

  async function guardar() {
    if (!String(form.nombre || '').trim()) return toast.error('Ingresá el equipo')
    const p = { estado: form.estado || 'Operativa', foto_url: form.foto_url || null, sectores: form.sectores || [] }
    for (const [k] of CAMPOS) { if (k === 'sectores') continue; p[k] = String(form[k] ?? '').trim() || null }
    setGuardando(true)
    const { error } = editId ? await supabase.from('maquinas').update(p).eq('id', editId) : await supabase.from('maquinas').insert(p)
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(editId ? 'Máquina actualizada ✅' : 'Máquina agregada ✅')
    setModalOpen(false); setEditId(null); cargar()
  }
  async function eliminar(id) { const { error } = await supabase.from('maquinas').delete().eq('id', id); setConfirmDel(null); if (error) { toast.error('Error: ' + error.message); return } cargar() }

  if (!isAdmin && !isAdmin2 && !isMantenimiento) return null
  const readOnly = isAdmin2   // mantenimiento edita todo
  const q = busqueda.trim().toLowerCase()
  const vidaDe = m => m.estado_vida || 'activo'
  const cuenta = est => items.filter(m => vidaDe(m) === est).length
  const filtrados = items.filter(m =>
    (filtroVida === 'todos' || vidaDe(m) === filtroVida) &&
    (!filtroSector || (m.sectores || []).includes(filtroSector)) &&
    (!q || [m.nombre, m.codigo, m.numero, m.sigla, m.marca, m.modelo, m.ubicacion, m.ubicacion_fisica, m.proveedor].some(v => (v || '').toLowerCase().includes(q)) || (m.sectores || []).some(s => s.toLowerCase().includes(q))))

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Máquinas</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Base de máquinas para mantenimiento · {items.length}</p>
        </div>
        {!readOnly && <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setImportOpen(true)} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>📥 Importar CSV</button>
          <button onClick={abrirNuevo} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Nueva máquina</button>
        </div>}
      </div>
      {importOpen && <ImportarCSV titulo="Máquinas" tabla="maquinas" columnas={COLS_CSV} onClose={() => setImportOpen(false)} onDone={cargar} />}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <input type="text" placeholder="🔍 Buscar por equipo, código, N°, sigla, marca, sector..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...iSt, maxWidth: 360 }} />
        <select value={filtroSector} onChange={e => setFiltroSector(e.target.value)} style={{ ...iSt, cursor: 'pointer', maxWidth: 200, color: filtroSector ? '#7b9fff' : 'var(--text3)', fontWeight: 700 }}>
          <option value="">🏭 Todos los sectores</option>
          {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 3 }}>
          {[['activo', 'Activas'], ['discontinuado', 'Discontinuadas'], ['eliminado', 'Eliminadas'], ['todos', 'Todas']].map(([v, l]) => (
            <button key={v} onClick={() => setFiltroVida(v)} style={{ padding: '7px 13px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', border: 'none', background: filtroVida === v ? 'rgba(74,108,247,0.2)' : 'transparent', color: filtroVida === v ? '#7b9fff' : 'var(--text3)' }}>
              {l}{v !== 'todos' && cuenta(v) > 0 ? ` (${cuenta(v)})` : ''}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>{busqueda ? 'Sin resultados.' : 'Todavía no hay máquinas. Importá tu CSV o agregá la primera.'}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.map(m => {
            const isDel = confirmDel === m.id, isExp = expandido === m.id
            return (
              <div key={m.id} style={{ background: 'var(--surface)', border: `1px solid ${isDel ? 'rgba(255,85,119,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setExpandido(isExp ? null : m.id)}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{m.nombre || '—'} {m.codigo && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>{m.codigo}</span>} {m.sigla && <span style={{ fontSize: 11, color: '#7b9fff', fontWeight: 700 }}>· {m.sigla}</span>}
                      {vidaDe(m) === 'discontinuado' && <span style={{ fontSize: 10, fontWeight: 700, color: '#fb923c', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.35)', borderRadius: 20, padding: '1px 8px', marginLeft: 6 }}>🚫 Discontinuada</span>}
                      {vidaDe(m) === 'eliminado' && <span style={{ fontSize: 10, fontWeight: 700, color: '#ff5577', background: 'rgba(255,85,119,0.12)', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 20, padding: '1px 8px', marginLeft: 6 }}>🗑 Disposición final</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{[m.marca, m.modelo, m.ubicacion, m.ubicacion_fisica].filter(Boolean).join(' · ') || '—'}</div>
                    {((m.usos_250w || 0) + (m.usos_500w || 0) + (m.usos_1400w || 0)) > 0 && (
                      <div style={{ marginTop: 4, display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#7b9fff', background: 'rgba(123,159,255,0.1)', border: '1px solid rgba(123,159,255,0.3)', borderRadius: 4, padding: '1px 7px' }}>250w: {m.usos_250w || 0}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#3dd68c', background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 4, padding: '1px 7px' }}>500w: {m.usos_500w || 0}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fb923c', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 4, padding: '1px 7px' }}>1400w: {m.usos_1400w || 0}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 7px' }}>🔩 Total usos: {(m.usos_250w || 0) + (m.usos_500w || 0) + (m.usos_1400w || 0)}</span>
                      </div>
                    )}
                  </div>
                  {m.estado && <span style={{ fontSize: 10, fontWeight: 700, color: estColor(m.estado), background: `${estColor(m.estado)}18`, border: `1px solid ${estColor(m.estado)}44`, borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' }}>{m.estado}</span>}
                  <button onClick={() => setExpandido(isExp ? null : m.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13 }}>{isExp ? '▲' : '▾'}</button>
                  {!readOnly && (isDel ? (
                    <div style={{ display: 'flex', gap: 5 }}>
                      <button onClick={() => eliminar(m.id)} style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Sí</button>
                      <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>No</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button onClick={() => moverAHerramental(m)} disabled={moviendo === m.id} title="Mover a Herramental" style={{ background: 'rgba(45,212,191,0.1)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.35)', borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>{moviendo === m.id ? '…' : '→ Herramental'}</button>
                      <button onClick={() => abrirEditar(m)} style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️</button>
                      {vidaDe(m) === 'activo' && <button onClick={() => cambiarEstadoVida(m, 'discontinuado')} title="Discontinuar" style={{ background: 'rgba(251,146,60,0.08)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>🚫</button>}
                      {vidaDe(m) !== 'eliminado' && <button onClick={() => cambiarEstadoVida(m, 'eliminado')} title="Disposición final" style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>♻</button>}
                      {vidaDe(m) !== 'activo' && <button onClick={() => cambiarEstadoVida(m, 'activo')} title="Reactivar" style={{ background: 'rgba(61,214,140,0.08)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>↩</button>}
                      <button onClick={() => setConfirmDel(m.id)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
                    </div>
                  ))}
                </div>
                {isExp && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '12px 16px', background: 'rgba(0,0,0,0.12)', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px 16px' }}>
                    {m.foto_url && <img src={m.foto_url} alt="" onClick={() => window.open(m.foto_url, '_blank')} style={{ gridColumn: '1 / -1', maxWidth: 220, height: 150, objectFit: 'contain', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)', cursor: 'zoom-in' }} />}
                    {[['N°', m.numero], ['Voltaje', m.voltaje], ['Potencia', m.potencia], ['Servicio', m.servicio], ['Proveedor', m.proveedor], ['Repuestos', m.repuestos], ['Año ingreso', m.anio_ingreso], ['Año salida', m.anio_salida], ['Motivo', m.motivo], ['Descripción', m.descripcion], ['Observaciones', m.observaciones]].map(([l, v]) => v ? (
                      <div key={l}><div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase' }}>{l}</div><div style={{ fontSize: 13, color: 'var(--text2)' }}>{v}</div></div>
                    ) : null)}
                    {(m.sectores || []).length > 0 && <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 3 }}>Sectores afectados</div><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{m.sectores.map(s => <span key={s} style={{ fontSize: 11, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 20, padding: '2px 9px' }}>{s}</span>)}</div></div>}
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Uso · paneles procesados</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#7b9fff', background: 'rgba(123,159,255,0.1)', border: '1px solid rgba(123,159,255,0.3)', borderRadius: 4, padding: '1px 7px' }}>250w: {m.usos_250w || 0}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#3dd68c', background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 4, padding: '1px 7px' }}>500w: {m.usos_500w || 0}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#fb923c', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 4, padding: '1px 7px' }}>1400w: {m.usos_1400w || 0}</span>
                        <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 7px' }}>🔩 Total usos: {(m.usos_250w || 0) + (m.usos_500w || 0) + (m.usos_1400w || 0)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{editId ? 'Editar máquina' : 'Nueva máquina'}</div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                {CAMPOS.map(([k, label, tipo]) => (
                  <div key={k} style={{ gridColumn: (tipo === 'textarea' || tipo === 'sectores') ? '1 / -1' : 'auto' }}>
                    <label style={lbl}>{label}</label>
                    {tipo === 'textarea' ? (
                      <textarea value={form[k] ?? ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} rows={2} style={{ ...iSt, resize: 'vertical' }} />
                    ) : tipo === 'sectores' ? (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {SECTORES.map(s => { const sel = (form.sectores || []).includes(s); return <button key={s} type="button" onClick={() => setForm(f => ({ ...f, sectores: sel ? f.sectores.filter(x => x !== s) : [...(f.sectores || []), s] }))} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(74,108,247,0.15)' : 'var(--surface2)', color: sel ? '#7b9fff' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(74,108,247,0.45)' : 'var(--border)'}` }}>{s}</button> })}
                      </div>
                    ) : (
                      <input value={form[k] ?? ''} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} style={iSt} autoFocus={k === 'nombre'} />
                    )}
                  </div>
                ))}
              </div>
              <div><label style={lbl}>Estado</label><input value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))} placeholder="Operativa / Funciona / En mantenimiento / NO FUNCIONA..." style={iSt} /></div>
              <div>
                <label style={lbl}>Foto</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {form.foto_url ? (
                    <div style={{ position: 'relative' }}><img src={form.foto_url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} /><button onClick={() => setForm(f => ({ ...f, foto_url: '' }))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ff5577', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', lineHeight: 1 }}>×</button></div>
                  ) : <div style={{ width: 72, height: 72, borderRadius: 8, border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 22 }}>📷</div>}
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: subiendo ? 'not-allowed' : 'pointer', opacity: subiendo ? 0.6 : 1 }}>{subiendo ? '⏳ Subiendo...' : '📁 Subir foto'}<input type="file" accept="image/*" style={{ display: 'none' }} disabled={subiendo} onChange={e => subirFoto(e.target.files?.[0])} /></label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
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
