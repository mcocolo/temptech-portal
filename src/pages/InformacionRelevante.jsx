import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import toast from 'react-hot-toast'

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }

const FABRICAS = ['Obon', 'Darragueira']
const FABRICA_COLOR = { Obon: '#fb923c', Darragueira: '#2dd4bf' }

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
  const [filtroFabrica, setFiltroFabrica] = useState('')
  const [filtroVehiculo, setFiltroVehiculo] = useState('')
  const [ordenFecha, setOrdenFecha] = useState('desc')   // 'desc' = más nuevas primero
  const [flota, setFlota] = useState([])   // camionetas activas
  const [modal, setModal] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ titulo: '', contenido: '', tags: '', fabrica: '', adjuntos: [], vehiculos: [] })
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  useEffect(() => { if (isAdmin || isAdmin2 || isMantenimiento) cargar() }, [isAdmin, isAdmin2, isMantenimiento])
  async function cargar() {
    setLoading(true)
    const [data, flotaRes] = await Promise.all([
      fetchAllRows(() => supabase.from('info_relevante').select('*').order('updated_at', { ascending: false })),
      supabase.from('camionetas').select('nombre,patente,activa').eq('activa', true).order('nombre'),
    ])
    setItems(data || [])
    setFlota((flotaRes.data || []).map(c => c.nombre).filter(Boolean))
    setLoading(false)
  }

  function abrirNueva() { setEditId(null); setForm({ titulo: '', contenido: '', tags: '', fabrica: '', adjuntos: [], vehiculos: [] }); setModal(true) }
  function abrirEditar(n) { setEditId(n.id); setForm({ titulo: n.titulo || '', contenido: n.contenido || '', tags: n.tags || '', fabrica: n.fabrica || '', adjuntos: Array.isArray(n.adjuntos) ? n.adjuntos : [], vehiculos: Array.isArray(n.vehiculos) ? n.vehiculos : [] }); setModal(true) }
  async function subirAdjunto(file) {
    if (!file) return
    setSubiendo(true)
    const ext = file.name.split('.').pop()
    const path = `info-relevante/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('Imagenes').upload(path, file, { upsert: true })
    if (error) { toast.error('Error al subir: ' + error.message); setSubiendo(false); return }
    const { data: { publicUrl } } = supabase.storage.from('Imagenes').getPublicUrl(path)
    setForm(f => ({ ...f, adjuntos: [...(f.adjuntos || []), publicUrl] }))
    setSubiendo(false)
  }
  async function guardar() {
    if (!form.titulo.trim() || !form.contenido.trim()) return toast.error('Completá título y contenido')
    setGuardando(true)
    const payload = { titulo: form.titulo.trim(), contenido: form.contenido.trim(), tags: form.tags.trim() || null, fabrica: form.fabrica || null, adjuntos: form.adjuntos || [], vehiculos: form.vehiculos || [], updated_at: new Date().toISOString() }
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

  // Vehículos para filtrar: los de la flota + los que ya aparecen en notas
  const vehiculosFiltro = Array.from(new Set([...flota, ...items.flatMap(n => Array.isArray(n.vehiculos) ? n.vehiculos : [])])).sort()

  // Filtro por fábrica + vehículo + buscador flexible
  let base = filtroFabrica ? items.filter(n => n.fabrica === filtroFabrica) : items
  if (filtroVehiculo) base = base.filter(n => Array.isArray(n.vehiculos) && n.vehiculos.includes(filtroVehiculo))
  const porFecha = (a, b) => ordenFecha === 'desc'
    ? new Date(b.updated_at) - new Date(a.updated_at)
    : new Date(a.updated_at) - new Date(b.updated_at)
  const qTokens = tokens(busqueda)
  const resultados = (qTokens.length === 0 ? [...base].sort(porFecha) : base
    .map(n => { const texto = norm(`${n.titulo} ${n.contenido} ${n.tags || ''} ${n.fabrica || ''} ${(n.vehiculos || []).join(' ')}`); const score = qTokens.filter(t => texto.includes(t)).length; return { n, score } })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score || porFecha(a.n, b.n))
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
        style={{ ...iSt, fontSize: 15, padding: '12px 16px', marginBottom: 12, maxWidth: 640 }} autoFocus />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 2 }}>🏭 Fábrica:</span>
        <button onClick={() => setFiltroFabrica('')}
          style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: !filtroFabrica ? 'rgba(255,255,255,0.1)' : 'var(--surface2)', color: !filtroFabrica ? 'var(--text)' : 'var(--text3)', border: '1px solid var(--border)' }}>
          Todas
        </button>
        {FABRICAS.map(f => {
          const fc = FABRICA_COLOR[f]
          return (
            <button key={f} onClick={() => setFiltroFabrica(f === filtroFabrica ? '' : f)}
              style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: filtroFabrica === f ? `${fc}22` : 'var(--surface2)', color: filtroFabrica === f ? fc : 'var(--text3)', border: `1px solid ${filtroFabrica === f ? fc + '66' : 'var(--border)'}` }}>
              {f}
            </button>
          )
        })}
        <button onClick={() => setOrdenFecha(o => o === 'desc' ? 'asc' : 'desc')} title="Cambiar orden por fecha"
          style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>
          {ordenFecha === 'desc' ? '↓ Más nuevas' : '↑ Más viejas'}
        </button>
      </div>

      {vehiculosFiltro.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', marginRight: 2 }}>🚚 Vehículo:</span>
          <button onClick={() => setFiltroVehiculo('')}
            style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: !filtroVehiculo ? 'rgba(255,255,255,0.1)' : 'var(--surface2)', color: !filtroVehiculo ? 'var(--text)' : 'var(--text3)', border: '1px solid var(--border)' }}>
            Todos
          </button>
          {vehiculosFiltro.map(v => (
            <button key={v} onClick={() => setFiltroVehiculo(v === filtroVehiculo ? '' : v)}
              style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: filtroVehiculo === v ? 'rgba(123,159,255,0.18)' : 'var(--surface2)', color: filtroVehiculo === v ? '#7b9fff' : 'var(--text3)', border: `1px solid ${filtroVehiculo === v ? 'rgba(123,159,255,0.5)' : 'var(--border)'}` }}>
              🚚 {v}
            </button>
          ))}
        </div>
      )}

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#7b9fff' }}>{n.titulo}</div>
                    {n.fabrica && (() => { const fc = FABRICA_COLOR[n.fabrica] || '#888'; return <span style={{ fontSize: 10, fontWeight: 700, color: fc, background: `${fc}1a`, border: `1px solid ${fc}55`, borderRadius: 20, padding: '2px 9px' }}>🏭 {n.fabrica}</span> })()}
                    {Array.isArray(n.vehiculos) && n.vehiculos.map(v => <span key={v} style={{ fontSize: 10, fontWeight: 700, color: '#7b9fff', background: 'rgba(123,159,255,0.12)', border: '1px solid rgba(123,159,255,0.4)', borderRadius: 20, padding: '2px 9px' }}>🚚 {v}</span>)}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--text2)', marginTop: 4, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{n.contenido}</div>
                  {Array.isArray(n.adjuntos) && n.adjuntos.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                      {n.adjuntos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} onError={e => { e.currentTarget.style.opacity = 0.3 }} />
                        </a>
                      ))}
                    </div>
                  )}
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
              <div>
                <label style={lbl}>Fábrica</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setForm(f => ({ ...f, fabrica: '' }))}
                    style={{ padding: '6px 14px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: !form.fabrica ? 'rgba(255,255,255,0.1)' : 'var(--surface2)', color: !form.fabrica ? 'var(--text)' : 'var(--text3)', border: '1px solid var(--border)' }}>
                    General
                  </button>
                  {FABRICAS.map(f => { const fc = FABRICA_COLOR[f]; return (
                    <button key={f} type="button" onClick={() => setForm(ff => ({ ...ff, fabrica: f }))}
                      style={{ padding: '6px 14px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: form.fabrica === f ? `${fc}22` : 'var(--surface2)', color: form.fabrica === f ? fc : 'var(--text3)', border: `1px solid ${form.fabrica === f ? fc + '66' : 'var(--border)'}` }}>
                      🏭 {f}
                    </button>
                  )})}
                </div>
              </div>
              <div>
                <label style={lbl}>Vehículos (opcional)</label>
                {flota.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>No hay vehículos activos en la flota. Cargalos en Logística → Camionetas y choferes.</div>
                ) : (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {flota.map(v => { const sel = form.vehiculos.includes(v); return (
                      <button key={v} type="button" onClick={() => setForm(f => ({ ...f, vehiculos: sel ? f.vehiculos.filter(x => x !== v) : [...f.vehiculos, v] }))}
                        style={{ padding: '6px 14px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(123,159,255,0.18)' : 'var(--surface2)', color: sel ? '#7b9fff' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(123,159,255,0.5)' : 'var(--border)'}` }}>
                        {sel ? '✓ ' : ''}🚚 {v}
                      </button>
                    )})}
                  </div>
                )}
              </div>
              <div>
                <label style={lbl}>Fotos (opcional)</label>
                {form.adjuntos.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {form.adjuntos.map((url, i) => (
                      <div key={i} style={{ position: 'relative' }}>
                        <img src={url} alt="" style={{ width: 70, height: 70, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
                        <button type="button" onClick={() => setForm(f => ({ ...f, adjuntos: f.adjuntos.filter(u => u !== url) }))}
                          style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#ff5577', border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(123,159,255,0.12)', border: '1px solid rgba(123,159,255,0.4)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 12, fontWeight: 700, color: '#7b9fff', cursor: subiendo ? 'not-allowed' : 'pointer' }}>
                    {subiendo ? '⏳ Subiendo…' : '📷 Tomar foto'}
                    <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }} disabled={subiendo} onChange={e => { if (e.target.files?.[0]) subirAdjunto(e.target.files[0]); e.target.value = '' }} />
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: subiendo ? 'not-allowed' : 'pointer' }}>
                    {subiendo ? '⏳ Subiendo…' : '📁 Subir imagen'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={subiendo} onChange={e => { if (e.target.files?.[0]) subirAdjunto(e.target.files[0]); e.target.value = '' }} />
                  </label>
                </div>
              </div>
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
