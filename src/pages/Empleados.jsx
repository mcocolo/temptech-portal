import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import toast from 'react-hot-toast'

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }
const EMPTY = { apodo: '', nombre: '', sector: '' }

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

  useEffect(() => { if (isAdmin || isAdmin2) cargar() }, [isAdmin, isAdmin2])

  async function cargar() {
    setLoading(true)
    const data = await fetchAllRows(() => supabase.from('empleados').select('*').order('apodo'))
    setItems(data || [])
    setLoading(false)
  }

  function abrirNuevo() { setForm(EMPTY); setEditId(null); setModalOpen(true) }
  function abrirEditar(e) { setForm({ apodo: e.apodo || '', nombre: e.nombre || '', sector: e.sector || '' }); setEditId(e.id); setModalOpen(true) }

  async function guardar() {
    if (!form.apodo.trim()) return toast.error('Ingresá el apodo / nombre corto')
    const payload = { apodo: form.apodo.trim(), nombre: form.nombre.trim() || null, sector: form.sector.trim() || null }
    setGuardando(true)
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
  const filtrados = items.filter(e => !q || [e.apodo, e.nombre, e.sector].some(v => (v || '').toLowerCase().includes(q)))

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Empleados</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Personal de producción (apodo + nombre completo)</p>
        </div>
        {!readOnly && (
          <button onClick={abrirNuevo} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Nuevo empleado</button>
        )}
      </div>

      <input type="text" placeholder="🔍 Buscar por apodo, nombre o sector..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...iSt, maxWidth: 420, marginBottom: 18 }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          {busqueda ? 'Sin resultados.' : 'Todavía no hay empleados. Agregá el primero.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {filtrados.map(e => {
            const isDel = confirmDel === e.id
            return (
              <div key={e.id} style={{ background: 'var(--surface)', border: `1px solid ${isDel ? 'rgba(255,85,119,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: 'var(--text2)', flexShrink: 0 }}>
                  {(e.apodo || '?').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{e.apodo}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{e.nombre || '—'}{e.sector ? ` · ${e.sector}` : ''}</div>
                </div>
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
            )
          })}
        </div>
      )}

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 440 }}>
            <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{editId ? 'Editar empleado' : 'Nuevo empleado'}</div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={lbl}>Apodo / Nombre corto *</label><input value={form.apodo} onChange={e => setForm(f => ({ ...f, apodo: e.target.value }))} placeholder="Ej: JONI" style={iSt} autoFocus /></div>
              <div><label style={lbl}>Nombre y apellido</label><input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Jonathan Ezequiel" style={iSt} /></div>
              <div><label style={lbl}>Sector (opcional)</label><input value={form.sector} onChange={e => setForm(f => ({ ...f, sector: e.target.value }))} placeholder="Ej: Corte, 1400w..." style={iSt} /></div>
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
