import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import toast from 'react-hot-toast'

export const CATEGORIAS_PROVEEDOR = {
  directos:   { label: 'Insumos Directos',   emoji: '🧩', color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)' },
  indirectos: { label: 'Insumos Indirectos', emoji: '🧰', color: '#7b9fff', bg: 'rgba(123,159,255,0.12)', border: 'rgba(123,159,255,0.35)' },
  varios:     { label: 'Artículos Varios',   emoji: '📦', color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)' },
}

const EMPTY = { nombre: '', categoria: 'directos', contacto: '', telefono: '', direccion: '', localidad: '', notas: '' }

const iSt = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)',
  fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
}
const lblSt = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6 }

export default function Proveedores() {
  const { isAdmin, isAdmin2 } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroCat, setFiltroCat] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [guardando, setGuardando] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  useEffect(() => { if (isAdmin || isAdmin2) cargar() }, [isAdmin, isAdmin2])

  async function cargar() {
    setLoading(true)
    const data = await fetchAllRows(() => supabase.from('proveedores').select('*').order('nombre'))
    setItems(data || [])
    setLoading(false)
  }

  function abrirNuevo() { setForm({ ...EMPTY, categoria: filtroCat !== 'todos' ? filtroCat : 'directos' }); setEditId(null); setModalOpen(true) }
  function abrirEditar(p) {
    setForm({ nombre: p.nombre || '', categoria: p.categoria || 'directos', contacto: p.contacto || '', telefono: p.telefono || '', direccion: p.direccion || '', localidad: p.localidad || '', notas: p.notas || '' })
    setEditId(p.id); setModalOpen(true)
  }

  async function guardar() {
    if (!form.nombre.trim()) return toast.error('Ingresá el nombre del proveedor')
    const payload = {
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      contacto: form.contacto.trim() || null,
      telefono: form.telefono.trim() || null,
      direccion: form.direccion.trim() || null,
      localidad: form.localidad.trim() || null,
      notas: form.notas.trim() || null,
    }
    setGuardando(true)
    const { error } = editId
      ? await supabase.from('proveedores').update(payload).eq('id', editId)
      : await supabase.from('proveedores').insert(payload)
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(editId ? 'Proveedor actualizado ✅' : 'Proveedor agregado ✅')
    setModalOpen(false); setEditId(null); cargar()
  }

  async function eliminar(id) {
    const { error } = await supabase.from('proveedores').delete().eq('id', id)
    setConfirmDel(null)
    if (error) { toast.error('Error: ' + error.message); return }
    cargar()
  }

  if (!isAdmin && !isAdmin2) return null

  const q = busqueda.trim().toLowerCase()
  const filtrados = items.filter(p =>
    (filtroCat === 'todos' || p.categoria === filtroCat) &&
    (!q || [p.nombre, p.contacto, p.telefono, p.localidad, p.direccion].some(v => (v || '').toLowerCase().includes(q)))
  )

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Proveedores</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Insumos directos, indirectos y artículos varios</p>
        </div>
        <button onClick={abrirNuevo}
          style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
          ➕ Nuevo proveedor
        </button>
      </div>

      {/* Filtros de categoría */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[['todos', { label: 'Todos', emoji: '📇' }], ...Object.entries(CATEGORIAS_PROVEEDOR)].map(([key, c]) => {
          const active = filtroCat === key
          const count = key === 'todos' ? items.length : items.filter(p => p.categoria === key).length
          return (
            <button key={key} onClick={() => setFiltroCat(key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: active ? (c.bg || 'var(--surface2)') : 'var(--surface2)', color: active ? (c.color || 'var(--text)') : 'var(--text3)', border: `1px solid ${active ? (c.border || 'var(--border2)') : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              {c.emoji} {c.label} <span style={{ opacity: 0.7 }}>({count})</span>
            </button>
          )
        })}
      </div>

      <input type="text" placeholder="🔍 Buscar por nombre, contacto, teléfono o localidad..." value={busqueda} onChange={e => setBusqueda(e.target.value)}
        style={{ ...iSt, maxWidth: 460, marginBottom: 20 }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          {busqueda || filtroCat !== 'todos' ? 'Sin resultados.' : 'Todavía no hay proveedores. Agregá el primero.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {filtrados.map(p => {
            const c = CATEGORIAS_PROVEEDOR[p.categoria] || CATEGORIAS_PROVEEDOR.directos
            const isDel = confirmDel === p.id
            return (
              <div key={p.id} style={{ background: 'var(--surface)', border: `1px solid ${isDel ? 'rgba(255,85,119,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{p.nombre}</div>
                  <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, whiteSpace: 'nowrap' }}>{c.emoji} {c.label}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: 'var(--text3)' }}>
                  {p.contacto && <div>👤 {p.contacto}</div>}
                  {p.telefono && <div>📞 {p.telefono}</div>}
                  {(p.direccion || p.localidad) && <div>📍 {[p.direccion, p.localidad].filter(Boolean).join(', ')}</div>}
                  {p.notas && <div style={{ fontStyle: 'italic' }}>💬 {p.notas}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 6 }}>
                  <button onClick={() => abrirEditar(p)}
                    style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️ Editar</button>
                  {isDel ? (
                    <>
                      <button onClick={() => eliminar(p.id)} style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Eliminar</button>
                      <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>No</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDel(p.id)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal alta/edición */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{editId ? 'Editar proveedor' : 'Nuevo proveedor'}</div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={lblSt}>Nombre / Razón social *</label>
                <input value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Siliconas del Sur SA" style={iSt} />
              </div>
              <div>
                <label style={lblSt}>Categoría *</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(CATEGORIAS_PROVEEDOR).map(([key, c]) => (
                    <button key={key} onClick={() => setForm(p => ({ ...p, categoria: key }))}
                      style={{ padding: '7px 12px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: form.categoria === key ? c.bg : 'var(--surface2)', color: form.categoria === key ? c.color : 'var(--text3)', border: `1px solid ${form.categoria === key ? c.border : 'var(--border)'}` }}>
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lblSt}>Contacto</label><input value={form.contacto} onChange={e => setForm(p => ({ ...p, contacto: e.target.value }))} placeholder="Nombre de contacto" style={iSt} /></div>
                <div><label style={lblSt}>Teléfono</label><input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="11 5555-5555" style={iSt} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lblSt}>Dirección</label><input value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} placeholder="Calle y número" style={iSt} /></div>
                <div><label style={lblSt}>Localidad</label><input value={form.localidad} onChange={e => setForm(p => ({ ...p, localidad: e.target.value }))} placeholder="Localidad" style={iSt} /></div>
              </div>
              <div>
                <label style={lblSt}>Notas</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2} placeholder="Horarios de atención, observaciones..." style={{ ...iSt, resize: 'vertical', lineHeight: 1.5 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <button onClick={guardar} disabled={guardando}
                  style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {guardando ? 'Guardando...' : editId ? '✓ Guardar cambios' : '✓ Agregar proveedor'}
                </button>
                <button onClick={() => setModalOpen(false)}
                  style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
