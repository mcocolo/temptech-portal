import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import toast from 'react-hot-toast'

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }

const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const STOP = new Set(['cuantas', 'cuantos', 'cuanta', 'cuanto', 'cuales', 'cual', 'hay', 'de', 'del', 'en', 'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'que', 'por', 'para', 'es', 'son', 'al', 'y', 'o', 'con', 'sin', 'se', 'su', 'sus', 'me', 'lo', 'mi', 'tengo', 'tenemos', 'quiero', 'saber', 'dato', 'datos'])
const tokens = s => norm(s).split(/[^a-z0-9]+/).filter(t => t.length >= 2 && !STOP.has(t))

export default function InformacionRelevante() {
  const { isAdmin, isAdmin2, isMantenimiento, user, profile } = useAuth()
  const puedeEditar = isAdmin || isAdmin2
  const nombreUsuario = profile?.full_name || profile?.razon_social || user?.email || 'Usuario'

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ titulo: '', contenido: '', tags: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { if (isAdmin || isAdmin2 || isMantenimiento) cargar() }, [isAdmin, isAdmin2, isMantenimiento])
  async function cargar() {
    setLoading(true)
    const data = await fetchAllRows(() => supabase.from('info_relevante').select('*').order('updated_at', { ascending: false }))
    setItems(data || [])
    setLoading(false)
  }

  function abrirNueva() { setEditId(null); setForm({ titulo: '', contenido: '', tags: '' }); setModal(true) }
  function abrirEditar(n) { setEditId(n.id); setForm({ titulo: n.titulo || '', contenido: n.contenido || '', tags: n.tags || '' }); setModal(true) }
  async function guardar() {
    if (!form.titulo.trim() || !form.contenido.trim()) return toast.error('Completá título y contenido')
    setGuardando(true)
    const payload = { titulo: form.titulo.trim(), contenido: form.contenido.trim(), tags: form.tags.trim() || null, updated_at: new Date().toISOString() }
    const { error } = editId
      ? await supabase.from('info_relevante').update(payload).eq('id', editId)
      : await supabase.from('info_relevante').insert({ ...payload, created_by: nombreUsuario })
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(editId ? 'Nota actualizada ✅' : 'Nota creada ✅')
    setModal(false); setEditId(null); cargar()
  }
  async function eliminar(id) {
    if (!window.confirm('¿Eliminar esta nota?')) return
    const { error } = await supabase.from('info_relevante').delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    setItems(prev => prev.filter(x => x.id !== id))
  }

  if (!isAdmin && !isAdmin2 && !isMantenimiento) return null

  // Buscador flexible: puntúa cada nota por cuántas palabras de la búsqueda aparecen en su texto
  const qTokens = tokens(busqueda)
  const resultados = (qTokens.length === 0 ? items : items
    .map(n => { const texto = norm(`${n.titulo} ${n.contenido} ${n.tags || ''}`); const score = qTokens.filter(t => texto.includes(t)).length; return { n, score } })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(x => x.n))

  const fmtF = d => { try { return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) } catch { return '' } }

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>📌 Información Relevante</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Notas importantes consultables. Preguntá en lenguaje natural (ej: “cuántas posiciones de racks hay en Darragueira”).</p>
        </div>
        {puedeEditar && <button onClick={abrirNueva} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Nueva nota</button>}
      </div>

      <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Escribí lo que querés saber…"
        style={{ ...iSt, fontSize: 15, padding: '12px 16px', marginBottom: 16, maxWidth: 640 }} autoFocus />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)' }}>Cargando…</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>Todavía no hay notas.{puedeEditar ? ' Creá la primera con “Nueva nota”.' : ''}</div>
      ) : resultados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)' }}>Sin resultados para “{busqueda}”. Probá con otras palabras.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {resultados.map(n => (
            <div key={n.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#7b9fff' }}>{n.titulo}</div>
                  <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{n.contenido}</div>
                  {n.tags && <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>{n.tags.split(',').map((t, i) => t.trim() && <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 20, padding: '2px 9px' }}>#{t.trim()}</span>)}</div>}
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{n.created_by ? `${n.created_by} · ` : ''}actualizada {fmtF(n.updated_at)}</div>
                </div>
                {puedeEditar && (
                  <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                    <button onClick={() => abrirEditar(n)} style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️</button>
                    <button onClick={() => eliminar(n.id)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{editId ? '✏️ Editar nota' : '➕ Nueva nota'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div><label style={lbl}>Título *</label><input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Posiciones de racks en Darragueira" style={iSt} autoFocus /></div>
              <div><label style={lbl}>Contenido *</label><textarea value={form.contenido} onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))} rows={4} placeholder="Ej: Cantidad de posiciones en racks de pallets disponibles: 143" style={{ ...iSt, resize: 'vertical', lineHeight: 1.5 }} /></div>
              <div><label style={lbl}>Etiquetas (opcional, separadas por coma)</label><input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Ej: racks, darragueira, depósito, pallets" style={iSt} /></div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={guardar} disabled={guardando} style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>{guardando ? 'Guardando…' : editId ? '✓ Guardar' : '✓ Crear nota'}</button>
                <button onClick={() => setModal(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
