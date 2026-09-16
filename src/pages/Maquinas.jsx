import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import ImportarCSV from '@/components/ImportarCSV'
import toast from 'react-hot-toast'

const COLS_CSV = [
  { key: 'nombre', label: 'nombre', required: true },
  { key: 'codigo', label: 'codigo' }, { key: 'tipo', label: 'tipo' }, { key: 'sector', label: 'sector' },
  { key: 'marca', label: 'marca' }, { key: 'modelo', label: 'modelo' }, { key: 'nro_serie', label: 'nro_serie' },
  { key: 'fecha_ingreso', label: 'fecha_ingreso', type: 'date' },
  { key: 'estado', label: 'estado', def: 'Operativa' }, { key: 'ubicacion', label: 'ubicacion' }, { key: 'notas', label: 'notas' },
]

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }
const SECTORES = ['Corte', 'Armado', 'Alambre', 'Encuadre', 'Aguj N°2', 'Enduido+Lija', 'Pintura', 'Cables+Kits', 'Eléctrica+Embalaje', '1400w', 'General']
const ESTADOS = [
  { v: 'Operativa', c: '#3dd68c' },
  { v: 'En mantenimiento', c: '#fb923c' },
  { v: 'Fuera de servicio', c: '#ff5577' },
]
const estColor = e => ESTADOS.find(x => x.v === e)?.c || 'var(--text3)'
const EMPTY = { nombre: '', codigo: '', tipo: '', sector: '', marca: '', modelo: '', nro_serie: '', fecha_ingreso: '', estado: 'Operativa', ubicacion: '', foto_url: '', notas: '' }

export default function Maquinas() {
  const { isAdmin, isAdmin2 } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [fEstado, setFEstado] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [importOpen, setImportOpen] = useState(false)

  useEffect(() => { if (isAdmin || isAdmin2) cargar() }, [isAdmin, isAdmin2])
  async function cargar() {
    setLoading(true)
    const data = await fetchAllRows(() => supabase.from('maquinas').select('*').order('nombre'))
    setItems(data || [])
    setLoading(false)
  }

  function abrirNuevo() { setForm({ ...EMPTY }); setEditId(null); setModalOpen(true) }
  function abrirEditar(m) { setForm({ nombre: m.nombre || '', codigo: m.codigo || '', tipo: m.tipo || '', sector: m.sector || '', marca: m.marca || '', modelo: m.modelo || '', nro_serie: m.nro_serie || '', fecha_ingreso: m.fecha_ingreso || '', estado: m.estado || 'Operativa', ubicacion: m.ubicacion || '', foto_url: m.foto_url || '', notas: m.notas || '' }); setEditId(m.id); setModalOpen(true) }

  async function subirFoto(file) {
    if (!file) return
    setSubiendo(true)
    const ext = file.name.split('.').pop()
    const path = `maquinas/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('Imagenes').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir: ' + error.message); setSubiendo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('Imagenes').getPublicUrl(path)
    setForm(f => ({ ...f, foto_url: publicUrl }))
    setSubiendo(false); toast.success('Foto subida ✅')
  }

  async function guardar() {
    if (!form.nombre.trim()) return toast.error('Ingresá el nombre')
    const payload = { ...form, nombre: form.nombre.trim(), codigo: form.codigo.trim() || null, fecha_ingreso: form.fecha_ingreso || null, foto_url: form.foto_url || null }
    setGuardando(true)
    const { error } = editId ? await supabase.from('maquinas').update(payload).eq('id', editId) : await supabase.from('maquinas').insert(payload)
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(editId ? 'Máquina actualizada ✅' : 'Máquina agregada ✅')
    setModalOpen(false); setEditId(null); cargar()
  }
  async function eliminar(id) {
    const { error } = await supabase.from('maquinas').delete().eq('id', id)
    setConfirmDel(null)
    if (error) { toast.error('Error: ' + error.message); return }
    cargar()
  }

  if (!isAdmin && !isAdmin2) return null
  const readOnly = isAdmin2
  const q = busqueda.trim().toLowerCase()
  const filtrados = items.filter(m =>
    (!fEstado || m.estado === fEstado) &&
    (!q || [m.nombre, m.codigo, m.marca, m.modelo, m.nro_serie, m.sector, m.ubicacion].some(v => (v || '').toLowerCase().includes(q)))
  )

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Máquinas</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Base de máquinas para mantenimiento</p>
        </div>
        {!readOnly && <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setImportOpen(true)} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>📥 Importar CSV</button>
          <button onClick={abrirNuevo} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Nueva máquina</button>
        </div>}
      </div>
      {importOpen && <ImportarCSV titulo="Máquinas" tabla="maquinas" columnas={COLS_CSV} onClose={() => setImportOpen(false)} onDone={cargar} />}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="🔍 Buscar por nombre, código, marca, serie, sector..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...iSt, maxWidth: 380 }} />
        {['', ...ESTADOS.map(e => e.v)].map(e => {
          const active = fEstado === e
          return <button key={e || 'todas'} onClick={() => setFEstado(e)} style={{ background: active ? 'rgba(74,108,247,0.15)' : 'var(--surface2)', color: active ? '#7b9fff' : 'var(--text3)', border: `1px solid ${active ? 'rgba(74,108,247,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>{e || 'Todas'}</button>
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>{busqueda || fEstado ? 'Sin resultados.' : 'Todavía no hay máquinas. Agregá la primera.'}</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
          {filtrados.map(m => {
            const isDel = confirmDel === m.id
            return (
              <div key={m.id} style={{ background: 'var(--surface)', border: `1px solid ${isDel ? 'rgba(255,85,119,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{m.nombre}{m.codigo && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace', marginLeft: 6 }}>{m.codigo}</span>}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: estColor(m.estado), background: `${estColor(m.estado)}18`, border: `1px solid ${estColor(m.estado)}44`, borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' }}>{m.estado}</span>
                </div>
                {m.foto_url && <img src={m.foto_url} alt="" onClick={() => window.open(m.foto_url, '_blank')} style={{ width: '100%', height: 120, objectFit: 'contain', background: 'rgba(0,0,0,0.2)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 8, cursor: 'zoom-in' }} />}
                <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {(m.marca || m.modelo) && <div>{[m.marca, m.modelo].filter(Boolean).join(' · ')}</div>}
                  {m.nro_serie && <div>N° serie: <span style={{ color: 'var(--text2)', fontFamily: 'monospace' }}>{m.nro_serie}</span></div>}
                  {m.sector && <div>Sector: <span style={{ color: 'var(--text2)' }}>{m.sector}</span></div>}
                  {m.ubicacion && <div>Ubicación: <span style={{ color: 'var(--text2)' }}>{m.ubicacion}</span></div>}
                  {m.fecha_ingreso && <div>Ingreso: {new Date(m.fecha_ingreso + 'T12:00:00').toLocaleDateString('es-AR')}</div>}
                  {m.notas && <div style={{ fontStyle: 'italic' }}>💬 {m.notas}</div>}
                </div>
                {!readOnly && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                    <button onClick={() => abrirEditar(m)} style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️ Editar</button>
                    {isDel ? (
                      <>
                        <button onClick={() => eliminar(m.id)} style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Eliminar</button>
                        <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>No</button>
                      </>
                    ) : <button onClick={() => setConfirmDel(m.id)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{editId ? 'Editar máquina' : 'Nueva máquina'}</div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={lbl}>Nombre *</label><input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Maq-Sil1" style={iSt} autoFocus /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Código</label><input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} placeholder="Código interno" style={iSt} /></div>
                <div><label style={lbl}>Tipo</label><input value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} placeholder="Ej: Prensa, Silicona..." style={iSt} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Marca</label><input value={form.marca} onChange={e => setForm(f => ({ ...f, marca: e.target.value }))} style={iSt} /></div>
                <div><label style={lbl}>Modelo</label><input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} style={iSt} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>N° de serie</label><input value={form.nro_serie} onChange={e => setForm(f => ({ ...f, nro_serie: e.target.value }))} style={iSt} /></div>
                <div><label style={lbl}>Fecha de ingreso</label><input type="date" value={form.fecha_ingreso} onChange={e => setForm(f => ({ ...f, fecha_ingreso: e.target.value }))} style={{ ...iSt, colorScheme: 'dark' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Sector</label>
                  <select value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} style={{ ...iSt, cursor: 'pointer' }}>
                    <option value="">—</option>{SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div><label style={lbl}>Ubicación</label><input value={form.ubicacion} onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))} placeholder="Ej: Planta baja" style={iSt} /></div>
              </div>
              <div><label style={lbl}>Estado</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {ESTADOS.map(e => <button key={e.v} onClick={() => setForm(f => ({ ...f, estado: e.v }))} style={{ padding: '6px 12px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: form.estado === e.v ? `${e.c}22` : 'var(--surface2)', color: form.estado === e.v ? e.c : 'var(--text3)', border: `1px solid ${form.estado === e.v ? e.c + '66' : 'var(--border)'}` }}>{e.v}</button>)}
                </div>
              </div>
              <div><label style={lbl}>Notas</label><textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} rows={2} style={{ ...iSt, resize: 'vertical' }} /></div>
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
