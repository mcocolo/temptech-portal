import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import toast from 'react-hot-toast'

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }
const EMPTY = { nombre: '', tipo: 'Disco', codigo: '', lote: '', sectores: [], fecha_ingreso: '', foto_url: '', usos_250w: '', usos_500w: '', usos_1400w: '' }
export const TIPOS_HERR = ['Disco', 'Cinta', 'Pie', 'Otro']
const SECTORES_HERR = ['Corte', 'Aguj1+Alambre+Pegado', 'Encuadre', 'Aguj N°2', 'Enduido+Lija', 'Pintura', 'Cables+Kits', 'Eléctrica+Embalaje', '1400w']
const secsDe = h => (Array.isArray(h.sectores) && h.sectores.length) ? h.sectores : (h.sector ? [h.sector] : [])

export default function Herramental() {
  const { isAdmin, isAdmin2 } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  useEffect(() => { if (isAdmin || isAdmin2) cargar() }, [isAdmin, isAdmin2])

  async function cargar() {
    setLoading(true)
    const data = await fetchAllRows(() => supabase.from('herramental').select('*').order('tipo').order('nombre'))
    setItems(data || [])
    setLoading(false)
  }

  function abrirNuevo() { setForm({ ...EMPTY, tipo: filtroTipo || 'Disco' }); setEditId(null); setModalOpen(true) }
  function abrirEditar(h) { setForm({ nombre: h.nombre || '', tipo: h.tipo || 'Disco', codigo: h.codigo || '', lote: h.lote || '', sectores: secsDe(h), fecha_ingreso: h.fecha_ingreso || '', foto_url: h.foto_url || '', usos_250w: h.usos_250w ?? '', usos_500w: h.usos_500w ?? '', usos_1400w: h.usos_1400w ?? '' }); setEditId(h.id); setModalOpen(true) }

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
    const payload = { nombre: form.nombre.trim(), tipo: form.tipo || null, codigo: form.codigo.trim() || null, lote: form.lote.trim() || null, sectores: form.sectores, sector: form.sectores[0] || null, fecha_ingreso: form.fecha_ingreso || null, foto_url: form.foto_url || null, usos_250w: parseInt(form.usos_250w) || 0, usos_500w: parseInt(form.usos_500w) || 0, usos_1400w: parseInt(form.usos_1400w) || 0 }
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

  if (!isAdmin && !isAdmin2) return null
  const readOnly = isAdmin2

  const q = busqueda.trim().toLowerCase()
  const filtrados = items.filter(h =>
    (!filtroTipo || h.tipo === filtroTipo) &&
    (!q || [h.nombre, h.codigo, h.lote, h.sector].some(v => (v || '').toLowerCase().includes(q)))
  )

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Herramental</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Discos, cintas, pies y demás herramientas (con código y lote)</p>
        </div>
        {!readOnly && (
          <button onClick={abrirNuevo} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Nueva herramienta</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['', ...TIPOS_HERR].map(t => {
          const active = filtroTipo === t
          const count = t ? items.filter(h => h.tipo === t).length : items.length
          return (
            <button key={t || 'todos'} onClick={() => setFiltroTipo(t)}
              style={{ background: active ? 'rgba(74,108,247,0.15)' : 'var(--surface2)', color: active ? '#7b9fff' : 'var(--text3)', border: `1px solid ${active ? 'rgba(74,108,247,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              {t || 'Todos'} <span style={{ opacity: 0.7 }}>({count})</span>
            </button>
          )
        })}
      </div>

      <input type="text" placeholder="🔍 Buscar por nombre, código, lote o sector..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...iSt, maxWidth: 420, marginBottom: 18 }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          {busqueda || filtroTipo ? 'Sin resultados.' : 'Todavía no hay herramental. Agregá la primera herramienta.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {filtrados.map(h => {
            const isDel = confirmDel === h.id
            return (
              <div key={h.id} style={{ background: 'var(--surface)', border: `1px solid ${isDel ? 'rgba(255,85,119,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{h.nombre}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' }}>{h.tipo || '—'}</span>
                </div>
                {h.foto_url && <img src={h.foto_url} alt="" onClick={() => window.open(h.foto_url, '_blank')} style={{ width: '100%', height: 110, objectFit: 'contain', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 8, cursor: 'zoom-in' }} />}
                <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {h.codigo && <div>Código: <span style={{ color: 'var(--text2)', fontFamily: 'monospace' }}>{h.codigo}</span></div>}
                  {h.lote && <div>Lote: <span style={{ color: 'var(--text2)', fontFamily: 'monospace' }}>{h.lote}</span></div>}
                  {secsDe(h).length > 0 && <div>Sectores: <span style={{ color: 'var(--text2)' }}>{secsDe(h).join(', ')}</span></div>}
                  {h.fecha_ingreso && <div>Ingreso: {new Date(h.fecha_ingreso + 'T12:00:00').toLocaleDateString('es-AR')}</div>}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                    <span style={{ background: 'rgba(123,159,255,0.1)', border: '1px solid rgba(123,159,255,0.3)', color: '#7b9fff', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>250w: {h.usos_250w || 0}</span>
                    <span style={{ background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', color: '#3dd68c', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>500w: {h.usos_500w || 0}</span>
                    <span style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', color: '#fb923c', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 700 }}>1400w: {h.usos_1400w || 0}</span>
                  </div>
                </div>
                {!readOnly && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button onClick={() => abrirEditar(h)} style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️ Editar</button>
                    {isDel ? (
                      <>
                        <button onClick={() => eliminar(h.id)} style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Eliminar</button>
                        <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>No</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDel(h.id)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
                    )}
                  </div>
                )}
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
              <div>
                <label style={lbl}>Tipo</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {TIPOS_HERR.map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))} style={{ padding: '6px 12px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: form.tipo === t ? 'rgba(74,108,247,0.15)' : 'var(--surface2)', color: form.tipo === t ? '#7b9fff' : 'var(--text3)', border: `1px solid ${form.tipo === t ? 'rgba(74,108,247,0.5)' : 'var(--border)'}` }}>{t}</button>
                  ))}
                </div>
              </div>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div><div style={{ fontSize: 10, color: '#7b9fff', marginBottom: 3 }}>250w</div><input type="number" min="0" value={form.usos_250w} onChange={e => setForm(f => ({ ...f, usos_250w: e.target.value }))} placeholder="0" style={iSt} /></div>
                  <div><div style={{ fontSize: 10, color: '#3dd68c', marginBottom: 3 }}>500w</div><input type="number" min="0" value={form.usos_500w} onChange={e => setForm(f => ({ ...f, usos_500w: e.target.value }))} placeholder="0" style={iSt} /></div>
                  <div><div style={{ fontSize: 10, color: '#fb923c', marginBottom: 3 }}>1400w</div><input type="number" min="0" value={form.usos_1400w} onChange={e => setForm(f => ({ ...f, usos_1400w: e.target.value }))} placeholder="0" style={iSt} /></div>
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
