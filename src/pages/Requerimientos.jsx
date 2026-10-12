import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import toast from 'react-hot-toast'

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 5, letterSpacing: '0.5px' }
const fmtF = d => { try { return new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }
const ROL_LABEL = { admin: 'Admin', admin2: 'Supervisor', mantenimiento: 'Mantenimiento' }

export default function Requerimientos() {
  const { isAdmin, isAdmin2, isMantenimiento, user, profile } = useAuth()
  const puede = isAdmin || isAdmin2 || isMantenimiento
  const nombreUsuario = profile?.full_name || profile?.razon_social || user?.email || 'Usuario'
  const miId = user?.id

  const [items, setItems] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('para_mi')   // para_mi | creados | todos

  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ titulo: '', detalle: '', destinatarios: [] })
  const [guardando, setGuardando] = useState(false)

  // Responder
  const [respAbierto, setRespAbierto] = useState(null)
  const [respTexto, setRespTexto] = useState('')

  useEffect(() => { if (puede) cargar() }, [isAdmin, isAdmin2, isMantenimiento])
  async function cargar() {
    setLoading(true)
    const [reqs, us] = await Promise.all([
      fetchAllRows(() => supabase.from('requerimientos').select('*').order('created_at', { ascending: false })),
      supabase.from('profiles').select('id, full_name, email, role').in('role', ['admin', 'admin2', 'mantenimiento']).order('full_name'),
    ])
    setItems(reqs || [])
    setUsuarios((us.data || []).map(u => ({ id: u.id, nombre: u.full_name || u.email || 'Usuario', role: u.role })))
    setLoading(false)
  }

  function abrirNuevo() { setEditId(null); setForm({ titulo: '', detalle: '', destinatarios: [] }); setModal(true) }
  function abrirEditar(r) { setEditId(r.id); setForm({ titulo: r.titulo || '', detalle: r.detalle || '', destinatarios: Array.isArray(r.destinatarios) ? r.destinatarios : [] }); setModal(true) }
  function toggleDest(u) {
    setForm(f => { const has = f.destinatarios.some(d => d.id === u.id); return { ...f, destinatarios: has ? f.destinatarios.filter(d => d.id !== u.id) : [...f.destinatarios, { id: u.id, nombre: u.nombre }] } })
  }
  async function guardar() {
    if (!form.titulo.trim()) return toast.error('Ingresá el requerimiento')
    if (form.destinatarios.length === 0) return toast.error('Elegí al menos un destinatario')
    setGuardando(true)
    const payload = { titulo: form.titulo.trim(), detalle: form.detalle.trim() || null, destinatarios: form.destinatarios, updated_at: new Date().toISOString() }
    const { error } = editId
      ? await supabase.from('requerimientos').update(payload).eq('id', editId)
      : await supabase.from('requerimientos').insert({ ...payload, estado: 'pendiente', created_by: nombreUsuario, created_by_id: miId })
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(editId ? 'Requerimiento actualizado ✅' : 'Requerimiento enviado ✅')
    setModal(false); cargar()
  }
  async function eliminar(r) {
    if (!window.confirm('¿Eliminar este requerimiento?')) return
    const { error } = await supabase.from('requerimientos').delete().eq('id', r.id)
    if (error) { toast.error('Error: ' + error.message); return }
    setItems(prev => prev.filter(x => x.id !== r.id))
  }
  async function marcarCumplido(r, cumplido) {
    const payload = cumplido
      ? { estado: 'cumplido', respondido_por: nombreUsuario, respondido_at: new Date().toISOString(), updated_at: new Date().toISOString() }
      : { estado: 'pendiente', updated_at: new Date().toISOString() }
    const { error } = await supabase.from('requerimientos').update(payload).eq('id', r.id)
    if (error) { toast.error('Error: ' + error.message); return }
    cargar()
  }
  async function guardarRespuesta(r) {
    const { error } = await supabase.from('requerimientos').update({
      respuesta: respTexto.trim() || null, respondido_por: nombreUsuario, respondido_at: new Date().toISOString(),
      estado: 'cumplido', updated_at: new Date().toISOString(),
    }).eq('id', r.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Respuesta enviada ✅')
    setRespAbierto(null); setRespTexto(''); cargar()
  }

  if (!puede) return null

  const esParaMi = r => Array.isArray(r.destinatarios) && r.destinatarios.some(d => d.id === miId)
  const esMio = r => r.created_by_id === miId
  const filtrados = items.filter(r => tab === 'todos' ? true : tab === 'creados' ? esMio(r) : esParaMi(r))
  const countParaMi = items.filter(r => esParaMi(r) && r.estado !== 'cumplido').length

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>📋 Requerimientos</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Pedidos para el equipo. Cada uno ve lo que se le solicita y con quién se comparte.</p>
        </div>
        <button onClick={abrirNuevo} style={{ background: 'var(--brand-gradient, #7b9fff)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Nuevo requerimiento</button>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18 }}>
        {[['para_mi', `Para mí${countParaMi ? ` (${countParaMi})` : ''}`], ['creados', 'Creados por mí'], ['todos', 'Todos']].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: tab === v ? 'rgba(123,159,255,0.18)' : 'var(--surface2)', color: tab === v ? '#7b9fff' : 'var(--text3)', border: `1px solid ${tab === v ? 'rgba(123,159,255,0.5)' : 'var(--border)'}` }}>{l}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)' }}>Cargando…</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>{tab === 'para_mi' ? 'No tenés requerimientos asignados.' : tab === 'creados' ? 'Todavía no creaste requerimientos.' : 'No hay requerimientos.'}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtrados.map(r => {
            const cumplido = r.estado === 'cumplido'
            const mio = esMio(r)
            const paraMi = esParaMi(r)
            return (
              <div key={r.id} style={{ background: 'var(--surface)', border: `1px solid ${cumplido ? 'rgba(61,214,140,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>{r.titulo}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: cumplido ? 'rgba(61,214,140,0.12)' : 'rgba(255,209,102,0.12)', color: cumplido ? '#3dd68c' : '#ffd166', border: `1px solid ${cumplido ? 'rgba(61,214,140,0.35)' : 'rgba(255,209,102,0.35)'}` }}>{cumplido ? '✓ Cumplido' : '⏳ Pendiente'}</span>
                    </div>
                    {r.detalle && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{r.detalle}</div>}
                    {/* Con quién se comparte */}
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text3)' }}>Para:</span>
                      {(r.destinatarios || []).map(d => (
                        <span key={d.id} style={{ fontSize: 10, fontWeight: 700, color: d.id === miId ? '#7b9fff' : 'var(--text3)', background: d.id === miId ? 'rgba(123,159,255,0.12)' : 'var(--surface2)', border: `1px solid ${d.id === miId ? 'rgba(123,159,255,0.4)' : 'var(--border)'}`, borderRadius: 20, padding: '2px 9px' }}>👤 {d.nombre}{d.id === miId ? ' (vos)' : ''}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>De: {r.created_by || '—'} · {fmtF(r.created_at)}</div>
                    {r.respuesta && (
                      <div style={{ marginTop: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#3dd68c', textTransform: 'uppercase', marginBottom: 3 }}>Respuesta</div>
                        <div style={{ fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>{r.respuesta}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>{r.respondido_por} · {fmtF(r.respondido_at)}</div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {mio && <button onClick={() => abrirEditar(r)} style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 9px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️</button>}
                    {(mio || isAdmin) && <button onClick={() => eliminar(r)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>}
                  </div>
                </div>

                {/* Acciones del destinatario */}
                {paraMi && !cumplido && (
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                    {respAbierto === r.id ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <textarea value={respTexto} onChange={e => setRespTexto(e.target.value)} rows={2} placeholder="Escribí tu respuesta (ej: 12 baldes conformes, 3 no conformes)…" style={{ ...iSt, resize: 'vertical' }} autoFocus />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => guardarRespuesta(r)} style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.4)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>✓ Responder y cumplir</button>
                          <button onClick={() => { setRespAbierto(null); setRespTexto('') }} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => { setRespAbierto(r.id); setRespTexto(r.respuesta || '') }} style={{ background: 'rgba(123,159,255,0.12)', color: '#7b9fff', border: '1px solid rgba(123,159,255,0.4)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>✍️ Responder</button>
                        <button onClick={() => marcarCumplido(r, true)} style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.4)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>✓ Marcar cumplido</button>
                      </div>
                    )}
                  </div>
                )}
                {cumplido && (mio || paraMi) && <div style={{ marginTop: 10 }}><button onClick={() => marcarCumplido(r, false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>↩ Reabrir</button></div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nuevo/editar */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{editId ? '✏️ Editar requerimiento' : '➕ Nuevo requerimiento'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={lbl}>Requerimiento *</label><input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Indicar cantidad de baldes de enduido Alto Impacto conformes y no conformes" style={iSt} autoFocus /></div>
              <div><label style={lbl}>Detalle (opcional)</label><textarea value={form.detalle} onChange={e => setForm(f => ({ ...f, detalle: e.target.value }))} rows={3} placeholder="Aclaraciones, plazo, etc." style={{ ...iSt, resize: 'vertical', lineHeight: 1.5 }} /></div>
              <div>
                <label style={lbl}>¿A quién se lo pedís? *</label>
                {usuarios.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text3)' }}>No hay usuarios internos cargados.</div> : (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {usuarios.map(u => { const sel = form.destinatarios.some(d => d.id === u.id); return (
                      <button key={u.id} type="button" onClick={() => toggleDest(u)} style={{ padding: '7px 12px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(123,159,255,0.18)' : 'var(--surface2)', color: sel ? '#7b9fff' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(123,159,255,0.5)' : 'var(--border)'}` }}>
                        {sel ? '✓ ' : ''}👤 {u.nombre} <span style={{ fontSize: 9, opacity: 0.7 }}>· {ROL_LABEL[u.role] || u.role}</span>
                      </button>
                    )})}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={guardar} disabled={guardando} style={{ flex: 1, background: 'var(--brand-gradient, #7b9fff)', color: '#fff', border: 'none', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>{guardando ? 'Guardando…' : editId ? '✓ Guardar' : '✓ Enviar requerimiento'}</button>
                <button onClick={() => setModal(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
