import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import ImportarCSV from '@/components/ImportarCSV'
import toast from 'react-hot-toast'

const COLS_CSV = [
  { key: 'nombre', label: 'nombre', required: true },
  { key: 'codigo', label: 'codigo' }, { key: 'lote', label: 'lote' },
  { key: 'sectores', label: 'sectores', type: 'list' },
  { key: 'fecha_ingreso', label: 'fecha_ingreso', type: 'date' },
  { key: 'usos_250w', label: 'usos_250w', type: 'int', def: 0 },
  { key: 'usos_500w', label: 'usos_500w', type: 'int', def: 0 },
  { key: 'usos_1400w_t', label: 'usos_1400w_t', type: 'int', def: 0 },
  { key: 'usos_1400w_ct', label: 'usos_1400w_ct', type: 'int', def: 0 },
]

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }
const EMPTY = { nombre: '', codigo: '', lote: '', sectores: [], fecha_ingreso: '', foto_url: '', usos_250w: '', usos_500w: '', usos_1400w_t: '', usos_1400w_ct: '', agujeros_250w: '', agujeros_500w: '', agujeros_1400w: '', cortes_250w: '', cortes_500w: '', cortes_1400w: '' }
const SECTORES_HERR = ['Corte', 'Aguj1+Alambre+Pegado', 'Encuadre', 'Aguj N°2', 'Enduido+Lija', 'Pintura', 'Cables+Kits', 'Eléctrica+Embalaje', '1400w']
const secsDe = h => (Array.isArray(h.sectores) && h.sectores.length) ? h.sectores : (h.sector ? [h.sector] : [])

// Agrupa las filas por código (un card por código con sus lotes adentro)
const CNT = ['usos_250w', 'usos_500w', 'usos_1400w_t', 'usos_1400w_ct', 'agujeros_250w', 'agujeros_500w', 'agujeros_1400w', 'cortes_250w', 'cortes_500w', 'cortes_1400w']
const sumarContadores = lotes => { const o = {}; for (const k of CNT) o[k] = lotes.reduce((s, h) => s + (h[k] || 0), 0); return o }
function agruparPorCodigo(rows) {
  const map = new Map()
  for (const h of rows) {
    const key = h.codigo ? `c:${h.codigo}` : `i:${h.id}`
    if (!map.has(key)) map.set(key, { key, codigo: h.codigo || '', nombre: h.nombre, sectores: secsDe(h), foto_url: h.foto_url || '', lotes: [] })
    const g = map.get(key); g.lotes.push(h); if (!g.foto_url && h.foto_url) g.foto_url = h.foto_url
  }
  return [...map.values()]
}
function Chips({ o, aguj, cortes, usos = true }) {
  const totUsos = (o.usos_250w || 0) + (o.usos_500w || 0) + (o.usos_1400w_t || 0) + (o.usos_1400w_ct || 0)
  return <>
    {usos && <>
      <span style={{ background: 'rgba(123,159,255,0.1)', border: '1px solid rgba(123,159,255,0.3)', color: '#7b9fff', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>250w: {o.usos_250w || 0}</span>
      <span style={{ background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', color: '#3dd68c', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>500w: {o.usos_500w || 0}</span>
      <span style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', color: '#fb923c', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>1400w T: {o.usos_1400w_t || 0}</span>
      <span style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', color: '#fb923c', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>1400w CT: {o.usos_1400w_ct || 0}</span>
      <span style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 800 }}>Total usos: {totUsos}</span>
    </>}
    {aguj && <span style={{ background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)', color: '#a78bfa', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>Agujeros · 250w: {o.agujeros_250w || 0} · 500w: {o.agujeros_500w || 0} · 1400w: {o.agujeros_1400w || 0} · <b style={{ color: '#fff' }}>Total: {(o.agujeros_250w || 0) + (o.agujeros_500w || 0) + (o.agujeros_1400w || 0)}</b></span>}
    {cortes && <span style={{ background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.35)', color: '#2dd4bf', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>Cortes · 250w: {o.cortes_250w || 0} · 500w: {o.cortes_500w || 0} · 1400w: {o.cortes_1400w || 0} · <b style={{ color: '#fff' }}>Total: {(o.cortes_250w || 0) + (o.cortes_500w || 0) + (o.cortes_1400w || 0)}</b></span>}
  </>
}

export default function Herramental() {
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
  const [filtroVida, setFiltroVida] = useState('activo')   // activo | discontinuado | eliminado | todos
  const [filtroSector, setFiltroSector] = useState('')
  const nombreUsuario = profile?.full_name || user?.email || 'Admin'

  async function cambiarEstadoVida(h, estado) {
    const labels = { activo: 'reactivar', discontinuado: 'discontinuar', eliminado: 'marcar como disposición final (eliminado)' }
    if (!window.confirm(`¿${labels[estado] ? labels[estado][0].toUpperCase() + labels[estado].slice(1) : estado} "${h.nombre}"?`)) return
    const { error } = await supabase.from('herramental').update({
      estado_vida: estado, estado_vida_at: new Date().toISOString(), estado_vida_por: nombreUsuario,
    }).eq('id', h.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Actualizado ✅')
    setItems(prev => prev.map(x => x.id === h.id ? { ...x, estado_vida: estado } : x))
  }

  useEffect(() => { if (isAdmin || isAdmin2 || isMantenimiento) cargar() }, [isAdmin, isAdmin2, isMantenimiento])

  async function cargar() {
    setLoading(true)
    const data = await fetchAllRows(() => supabase.from('herramental').select('*').order('nombre'))
    setItems(data || [])
    setLoading(false)
  }

  function abrirNuevo() { setForm({ ...EMPTY }); setEditId(null); setModalOpen(true) }
  function agregarLote(g) { setForm({ ...EMPTY, nombre: g.nombre, codigo: g.codigo, sectores: g.sectores || [] }); setEditId(null); setModalOpen(true) }
  function abrirEditar(h) { setForm({ nombre: h.nombre || '', codigo: h.codigo || '', lote: h.lote || '', sectores: secsDe(h), fecha_ingreso: h.fecha_ingreso || '', foto_url: h.foto_url || '', usos_250w: h.usos_250w ?? '', usos_500w: h.usos_500w ?? '', usos_1400w_t: h.usos_1400w_t ?? '', usos_1400w_ct: h.usos_1400w_ct ?? '', agujeros_250w: h.agujeros_250w ?? '', agujeros_500w: h.agujeros_500w ?? '', agujeros_1400w: h.agujeros_1400w ?? '', cortes_250w: h.cortes_250w ?? '', cortes_500w: h.cortes_500w ?? '', cortes_1400w: h.cortes_1400w ?? '' }); setEditId(h.id); setModalOpen(true) }

  async function subirFoto(file) {
    if (!file) return
    setSubiendo(true)
    const ext = file.name.split('.').pop()
    const path = `herramental/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('Imagenes').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir: ' + error.message); setSubiendo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('Imagenes').getPublicUrl(path)
    setForm(f => ({ ...f, foto_url: publicUrl }))
    setSubiendo(false); toast.success('Foto subida ✅')
  }

  async function guardar() {
    if (!form.nombre.trim()) return toast.error('Ingresá el nombre')
    const payload = { nombre: form.nombre.trim(), codigo: form.codigo.trim() || null, lote: form.lote.trim() || null, sectores: form.sectores, sector: form.sectores[0] || null, fecha_ingreso: form.fecha_ingreso || null, foto_url: form.foto_url || null, usos_250w: parseInt(form.usos_250w) || 0, usos_500w: parseInt(form.usos_500w) || 0, usos_1400w_t: parseInt(form.usos_1400w_t) || 0, usos_1400w_ct: parseInt(form.usos_1400w_ct) || 0, agujeros_250w: parseInt(form.agujeros_250w) || 0, agujeros_500w: parseInt(form.agujeros_500w) || 0, agujeros_1400w: parseInt(form.agujeros_1400w) || 0, cortes_250w: parseInt(form.cortes_250w) || 0, cortes_500w: parseInt(form.cortes_500w) || 0, cortes_1400w: parseInt(form.cortes_1400w) || 0 }
    setGuardando(true)
    const { error } = editId
      ? await supabase.from('herramental').update(payload).eq('id', editId)
      : await supabase.from('herramental').insert(payload)
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(editId ? 'Herramienta actualizada ✅' : 'Herramienta agregada ✅')
    setModalOpen(false); setEditId(null); cargar()
  }

  async function eliminar(id) {
    const { error } = await supabase.from('herramental').delete().eq('id', id)
    setConfirmDel(null)
    if (error) { toast.error('Error: ' + error.message); return }
    cargar()
  }

  if (!isAdmin && !isAdmin2 && !isMantenimiento) return null
  const readOnly = isAdmin2   // mantenimiento edita todo

  const q = busqueda.trim().toLowerCase()
  const vidaDe = h => h.estado_vida || 'activo'
  const cuenta = est => items.filter(h => vidaDe(h) === est).length
  const filtrados = items.filter(h =>
    (filtroVida === 'todos' || vidaDe(h) === filtroVida) &&
    (!filtroSector || secsDe(h).includes(filtroSector)) &&
    (!q || [h.nombre, h.codigo, h.lote, ...secsDe(h)].some(v => (v || '').toLowerCase().includes(q)))
  )

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Herramental</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Discos, cintas, pies y demás herramientas (con código y lote)</p>
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setImportOpen(true)} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>📥 Importar CSV</button>
            <button onClick={abrirNuevo} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Nueva herramienta</button>
          </div>
        )}
      </div>
      {importOpen && <ImportarCSV titulo="Herramental" tabla="herramental" columnas={COLS_CSV} onClose={() => setImportOpen(false)} onDone={cargar} />}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18, marginTop: 4 }}>
        <input type="text" placeholder="🔍 Buscar por nombre, código, lote o sector..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...iSt, maxWidth: 360 }} />
        <select value={filtroSector} onChange={e => setFiltroSector(e.target.value)} style={{ ...iSt, cursor: 'pointer', maxWidth: 220, color: filtroSector ? '#7b9fff' : 'var(--text3)', fontWeight: 700 }}>
          <option value="">🏭 Todos los sectores</option>
          {SECTORES_HERR.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 3 }}>
          {[['activo', 'Activos'], ['discontinuado', 'Discontinuados'], ['eliminado', 'Eliminados'], ['todos', 'Todos']].map(([v, l]) => (
            <button key={v} onClick={() => setFiltroVida(v)} style={{ padding: '7px 13px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', border: 'none', background: filtroVida === v ? 'rgba(74,108,247,0.2)' : 'transparent', color: filtroVida === v ? '#7b9fff' : 'var(--text3)' }}>
              {l}{v !== 'todos' && cuenta(v) > 0 ? ` (${cuenta(v)})` : ''}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          {busqueda ? 'Sin resultados.' : 'Todavía no hay herramental. Agregá la primera herramienta.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
          {agruparPorCodigo(filtrados).map(g => {
            const tot = sumarContadores(g.lotes)
            const esMecha = /^MM/i.test(g.codigo)
            const aguj = esMecha || (tot.agujeros_250w + tot.agujeros_500w + tot.agujeros_1400w) > 0
            const cortes = /^DISC/i.test(g.codigo) || (tot.cortes_250w + tot.cortes_500w + tot.cortes_1400w) > 0
            const usos = !esMecha   // las mechas miden desgaste en agujeros, no en usos
            return (
              <div key={g.key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 800 }}>{g.nombre}</span>
                  {g.codigo && <span style={{ fontSize: 12, color: '#7b9fff', fontFamily: 'monospace', fontWeight: 700 }}>{g.codigo}</span>}
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '1px 8px' }}>{g.lotes.length} lote{g.lotes.length !== 1 ? 's' : ''}</span>
                </div>
                {g.foto_url && <img src={g.foto_url} alt="" onClick={() => window.open(g.foto_url, '_blank')} style={{ width: '100%', height: 110, objectFit: 'contain', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 8, cursor: 'zoom-in' }} />}
                {g.sectores.length > 0 && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>Sectores: <span style={{ color: 'var(--text2)' }}>{g.sectores.join(', ')}</span></div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {g.lotes.map(h => {
                    const isDel = confirmDel === h.id
                    const vida = vidaDe(h)
                    return (
                      <div key={h.id} style={{ border: `1px solid ${isDel ? 'rgba(255,85,119,0.4)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 10px', background: 'var(--surface2)', opacity: vida !== 'activo' ? 0.6 : 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 800 }}>Lote {h.lote || '—'}</span>
                          {vida === 'discontinuado' && <span style={{ fontSize: 9, fontWeight: 700, color: '#fb923c', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.35)', borderRadius: 20, padding: '1px 7px' }}>🚫 Discontinuado</span>}
                          {vida === 'eliminado' && <span style={{ fontSize: 9, fontWeight: 700, color: '#ff5577', background: 'rgba(255,85,119,0.12)', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 20, padding: '1px 7px' }}>🗑 Disp. final</span>}
                          {h.fecha_ingreso && <span style={{ fontSize: 10, color: 'var(--text3)' }}>· ingreso {new Date(h.fecha_ingreso + 'T12:00:00').toLocaleDateString('es-AR')}</span>}
                          {!readOnly && (
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              <button onClick={() => abrirEditar(h)} title="Editar" style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️</button>
                              {vida === 'activo' && <button onClick={() => cambiarEstadoVida(h, 'discontinuado')} title="Discontinuar" style={{ background: 'rgba(251,146,60,0.08)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🚫</button>}
                              {vida !== 'activo' && <button onClick={() => cambiarEstadoVida(h, 'activo')} title="Reactivar" style={{ background: 'rgba(61,214,140,0.08)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>↩</button>}
                              {vida !== 'eliminado' && <button onClick={() => cambiarEstadoVida(h, 'eliminado')} title="Disposición final" style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>♻</button>}
                              {isDel ? (
                                <>
                                  <button onClick={() => eliminar(h.id)} style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Sí</button>
                                  <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>No</button>
                                </>
                              ) : (
                                <button onClick={() => setConfirmDel(h.id)} title="Eliminar" style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', borderRadius: 6, padding: '3px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}><Chips o={h} aguj={aguj} cortes={cortes} usos={usos} /></div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text2)' }}>TOTAL {g.codigo}:</span>
                  <Chips o={tot} aguj={aguj} cortes={cortes} usos={usos} />
                </div>

                {!readOnly && g.codigo && <button onClick={() => agregarLote(g)} style={{ marginTop: 10, background: 'var(--surface2)', color: 'var(--text2)', border: '1px dashed var(--border)', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', width: '100%' }}>+ Agregar lote de {g.codigo}</button>}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 460 }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{editId ? 'Editar herramienta' : 'Nueva herramienta'}</div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={lbl}>Nombre *</label><input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Disco Diamantado 230mm" style={iSt} autoFocus /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Código</label><input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Código" style={iSt} /></div>
                <div><label style={lbl}>Lote</label><input value={form.lote} onChange={e => setForm(f => ({ ...f, lote: e.target.value }))} placeholder="Lote" style={iSt} /></div>
              </div>
              <div>
                <label style={lbl}>Sectores (uno o varios)</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SECTORES_HERR.map(s => {
                    const sel = form.sectores.includes(s)
                    return <button key={s} onClick={() => setForm(f => ({ ...f, sectores: sel ? f.sectores.filter(x => x !== s) : [...f.sectores, s] }))}
                      style={{ padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(74,108,247,0.15)' : 'var(--surface2)', color: sel ? '#7b9fff' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(74,108,247,0.45)' : 'var(--border)'}` }}>{s}</button>
                  })}
                </div>
              </div>
              <div><label style={lbl}>Fecha de ingreso</label><input type="date" value={form.fecha_ingreso} onChange={e => setForm(f => ({ ...f, fecha_ingreso: e.target.value }))} style={{ ...iSt, colorScheme: 'dark' }} /></div>
              <div>
                <label style={lbl}>Usos acumulados (se suman con las OT)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  <div><div style={{ fontSize: 10, color: '#7b9fff', marginBottom: 3 }}>250w</div><input type="number" min="0" value={form.usos_250w} onChange={e => setForm(f => ({ ...f, usos_250w: e.target.value }))} placeholder="0" style={iSt} /></div>
                  <div><div style={{ fontSize: 10, color: '#3dd68c', marginBottom: 3 }}>500w</div><input type="number" min="0" value={form.usos_500w} onChange={e => setForm(f => ({ ...f, usos_500w: e.target.value }))} placeholder="0" style={iSt} /></div>
                  <div><div style={{ fontSize: 10, color: '#fb923c', marginBottom: 3 }}>1400w T</div><input type="number" min="0" value={form.usos_1400w_t} onChange={e => setForm(f => ({ ...f, usos_1400w_t: e.target.value }))} placeholder="0" style={iSt} /></div>
                  <div><div style={{ fontSize: 10, color: '#fb923c', marginBottom: 3 }}>1400w CT</div><input type="number" min="0" value={form.usos_1400w_ct} onChange={e => setForm(f => ({ ...f, usos_1400w_ct: e.target.value }))} placeholder="0" style={iSt} /></div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: '#a78bfa', marginBottom: 3 }}>Agujeros mechas (250w · 500w · 1400w)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <input type="number" min="0" value={form.agujeros_250w} onChange={e => setForm(f => ({ ...f, agujeros_250w: e.target.value }))} placeholder="250w" style={iSt} />
                    <input type="number" min="0" value={form.agujeros_500w} onChange={e => setForm(f => ({ ...f, agujeros_500w: e.target.value }))} placeholder="500w" style={iSt} />
                    <input type="number" min="0" value={form.agujeros_1400w} onChange={e => setForm(f => ({ ...f, agujeros_1400w: e.target.value }))} placeholder="1400w" style={iSt} />
                  </div>
                </div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 10, color: '#2dd4bf', marginBottom: 3 }}>Cortes del disco (250w · 500w · 1400w)</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    <input type="number" min="0" value={form.cortes_250w} onChange={e => setForm(f => ({ ...f, cortes_250w: e.target.value }))} placeholder="250w" style={iSt} />
                    <input type="number" min="0" value={form.cortes_500w} onChange={e => setForm(f => ({ ...f, cortes_500w: e.target.value }))} placeholder="500w" style={iSt} />
                    <input type="number" min="0" value={form.cortes_1400w} onChange={e => setForm(f => ({ ...f, cortes_1400w: e.target.value }))} placeholder="1400w" style={iSt} />
                  </div>
                </div>
              </div>
              <div>
                <label style={lbl}>Foto</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {form.foto_url ? (
                    <div style={{ position: 'relative' }}>
                      <img src={form.foto_url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                      <button onClick={() => setForm(f => ({ ...f, foto_url: '' }))} style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ff5577', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', lineHeight: 1 }}>×</button>
                    </div>
                  ) : <div style={{ width: 72, height: 72, borderRadius: 8, border: '2px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 22 }}>📷</div>}
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: subiendo ? 'not-allowed' : 'pointer', opacity: subiendo ? 0.6 : 1 }}>
                    {subiendo ? '⏳ Subiendo...' : '📁 Subir foto'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={subiendo} onChange={e => subirFoto(e.target.files?.[0])} />
                  </label>
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
