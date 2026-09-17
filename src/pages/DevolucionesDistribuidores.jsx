import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import toast from 'react-hot-toast'

function formatFecha(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
const inputSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }
const FILTROS = [['pendiente', 'Por revisar'], ['revisado', 'Revisadas'], ['resuelto', 'Cerradas'], ['todos', 'Todas']]
const emptyItem = () => ({ codigo: '', nombre: '', modelo: '', cantidad: 1 })

export default function DevolucionesDistribuidores() {
  const { isAdmin, isAdmin2, user, profile } = useAuth()
  const nombreUsuario = profile?.full_name || user?.email || 'Admin'

  const [rows, setRows] = useState([])
  const [perfiles, setPerfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendiente')
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(null)

  // Modal "Nueva devolución" (admin en nombre de un distribuidor)
  const [modal, setModal] = useState(false)
  const [distribuidores, setDistribuidores] = useState([])
  const [catalogo, setCatalogo] = useState([])
  const [fDistId, setFDistId] = useState('')
  const [fItems, setFItems] = useState([emptyItem()])
  const [fNotas, setFNotas] = useState('')
  const [fFecha, setFFecha] = useState('')
  const [fModo, setFModo] = useState('fabrica')
  const [creando, setCreando] = useState(false)

  useEffect(() => { cargar() }, [])
  async function cargar() {
    setLoading(true)
    const data = await fetchAllRows(() =>
      supabase.from('devoluciones_distribuidor').select('*').order('created_at', { ascending: false })
    )
    const list = data || []
    setRows(list)
    const ids = [...new Set(list.map(r => r.distribuidor_id).filter(Boolean))]
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id,full_name,razon_social,email').in('id', ids)
      setPerfiles(Object.fromEntries((profs || []).map(p => [p.id, p])))
    }
    setLoading(false)
  }

  async function abrirNueva() {
    setFDistId(''); setFItems([emptyItem()]); setFNotas(''); setFFecha(''); setFModo('fabrica'); setModal(true)
    if (!distribuidores.length) {
      const { data } = await supabase.from('profiles').select('id,full_name,razon_social,email').eq('user_type', 'distributor').order('razon_social')
      setDistribuidores(data || [])
    }
    if (!catalogo.length) {
      const { data } = await supabase.from('precios').select('codigo,nombre,modelo,categoria').order('nombre')
      setCatalogo(data || [])
    }
  }

  function selProducto(idx, codigo) {
    const p = catalogo.find(x => x.codigo === codigo)
    setFItems(prev => prev.map((it, i) => i === idx ? { ...it, codigo, nombre: p?.nombre || '', modelo: p?.modelo || '' } : it))
  }

  async function crearDevolucion() {
    if (!fDistId) return toast.error('Elegí un distribuidor')
    const items = fItems.filter(i => i.codigo && (parseInt(i.cantidad) || 0) > 0).map(i => ({ codigo: i.codigo, nombre: i.nombre, modelo: i.modelo, cantidad: parseInt(i.cantidad) }))
    if (!items.length) return toast.error('Agregá al menos un producto con cantidad')
    setCreando(true)
    const { error } = await supabase.from('devoluciones_distribuidor').insert({
      distribuidor_id: fDistId, origen: 'admin', items, notas: fNotas.trim() || null,
      fecha_devolucion: fFecha || null, modo_entrega: fModo,
      estado: 'pendiente', creado_por: nombreUsuario,
    })
    setCreando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Devolución cargada ✅')
    setModal(false); cargar()
  }

  async function marcarRevisado(row, revisado) {
    setGuardando(row.id)
    const { error } = await supabase.from('devoluciones_distribuidor').update({
      estado: revisado ? 'revisado' : 'pendiente',
      revisado_por: revisado ? nombreUsuario : null,
      revisado_at: revisado ? new Date().toISOString() : null,
    }).eq('id', row.id)
    setGuardando(null)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(revisado ? 'Marcada como revisada ✅' : 'Reabierta')
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, estado: revisado ? 'revisado' : 'pendiente', revisado_por: revisado ? nombreUsuario : null, revisado_at: revisado ? new Date().toISOString() : null } : r))
  }

  if (!isAdmin && !isAdmin2) return null

  const q = busqueda.trim().toLowerCase()
  const filtradas = rows.filter(r => {
    if (filtro !== 'todos' && r.estado !== filtro) return false
    if (q) {
      const prof = perfiles[r.distribuidor_id] || {}
      const nom = (prof.razon_social || prof.full_name || '').toLowerCase()
      return nom.includes(q) || (prof.email || '').toLowerCase().includes(q)
    }
    return true
  })
  const porRevisar = rows.filter(r => r.estado === 'pendiente').length

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Devoluciones Distribuidores</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Mercadería que el distribuidor devuelve (ingresa) — para revisar. La carga el distribuidor o vos en su nombre.</p>
        </div>
        <button onClick={abrirNueva} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Nueva devolución</button>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 3 }}>
          {FILTROS.map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)}
              style={{ padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', border: 'none', background: filtro === v ? 'rgba(251,146,60,0.2)' : 'transparent', color: filtro === v ? '#fb923c' : 'var(--text3)' }}>
              {l}{v === 'pendiente' && porRevisar > 0 ? ` (${porRevisar})` : ''}
            </button>
          ))}
        </div>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar distribuidor…"
          style={{ ...inputSt, maxWidth: 260, padding: '8px 12px' }} />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>{filtradas.length} devolución(es)</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando…</div>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>No hay devoluciones {filtro === 'pendiente' ? 'por revisar' : filtro === 'revisado' ? 'revisadas' : ''}.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtradas.map(r => {
            const prof = perfiles[r.distribuidor_id] || {}
            const nombre = prof.razon_social || prof.full_name || 'Distribuidor'
            const items = (r.items || []).filter(i => i.cantidad > 0)
            const totalUnid = items.reduce((s, i) => s + (parseInt(i.cantidad) || 0), 0)
            const revisado = r.estado === 'revisado'
            const resuelto = r.estado === 'resuelto'
            return (
              <div key={r.id} style={{ background: 'var(--surface)', border: `1px solid ${resuelto ? 'rgba(56,189,248,0.3)' : revisado ? 'rgba(61,214,140,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '14px 18px', opacity: resuelto ? 0.85 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {r.codigo && <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'monospace', color: '#fb923c', background: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.35)', borderRadius: 6, padding: '2px 8px' }}>{r.codigo}</span>}
                      <span style={{ fontSize: 15, fontWeight: 800 }}>🏪 {nombre}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: r.origen === 'admin' ? '#7b9fff' : '#a78bfa', background: r.origen === 'admin' ? 'rgba(74,108,247,0.12)' : 'rgba(167,139,250,0.12)', border: `1px solid ${r.origen === 'admin' ? 'rgba(74,108,247,0.35)' : 'rgba(167,139,250,0.35)'}`, borderRadius: 20, padding: '2px 9px' }}>Cargada por {r.creado_por || (r.origen === 'admin' ? 'admin' : 'distribuidor')}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: r.modo_entrega === 'logistica' ? '#22d3ee' : 'var(--text3)', background: r.modo_entrega === 'logistica' ? 'rgba(34,211,238,0.12)' : 'var(--surface2)', border: `1px solid ${r.modo_entrega === 'logistica' ? 'rgba(34,211,238,0.35)' : 'var(--border)'}`, borderRadius: 20, padding: '2px 9px' }}>{r.modo_entrega === 'logistica' ? '🚛 Logística' : '🏭 En fábrica'}</span>
                      {revisado && <span style={{ fontSize: 11, fontWeight: 700, color: '#3dd68c', background: 'rgba(61,214,140,0.12)', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 20, padding: '2px 10px' }}>✓ Revisada</span>}
                      {resuelto && <span style={{ fontSize: 11, fontWeight: 700, color: '#38bdf8', background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: 20, padding: '2px 10px' }}>🔒 Cerrada (repuesta)</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                      {r.fecha_devolucion ? <>Devolución {formatFecha(r.fecha_devolucion)} · </> : ''}Cargada {formatFecha(r.created_at)} · {totalUnid} u.
                      {revisado && r.revisado_por ? <span style={{ color: '#3dd68c' }}> · revisada por {r.revisado_por}</span> : ''}
                      {resuelto && r.resuelto_por ? <span style={{ color: '#38bdf8' }}> · cerrada por {r.resuelto_por}</span> : ''}
                    </div>
                  </div>
                  {resuelto
                    ? null
                    : revisado
                      ? <button onClick={() => marcarRevisado(r, false)} disabled={guardando === r.id} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>↩ Reabrir</button>
                      : <button onClick={() => marcarRevisado(r, true)} disabled={guardando === r.id} style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.4)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>{guardando === r.id ? '…' : '✓ Marcar revisada'}</button>}
                </div>
                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {items.map((i, idx) => (
                    <span key={idx} style={{ fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 10px' }}>
                      {i.codigo ? <b style={{ fontFamily: 'monospace', fontSize: 10, color: '#7b9fff' }}>{i.codigo} </b> : ''}{i.nombre} {i.modelo || ''} · <b>x{i.cantidad}</b>
                    </span>
                  ))}
                  {items.length === 0 && <span style={{ fontSize: 12, color: 'var(--text3)' }}>Sin ítems.</span>}
                </div>
                {r.notas && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)' }}>📝 {r.notas}</div>}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Nueva devolución */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>➕ Nueva devolución pendiente</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Distribuidor *</label>
                <select value={fDistId} onChange={e => setFDistId(e.target.value)} style={{ ...inputSt, cursor: 'pointer' }}>
                  <option value="">Elegí un distribuidor…</option>
                  {distribuidores.map(d => <option key={d.id} value={d.id}>{d.razon_social || d.full_name || d.email}</option>)}
                </select>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Productos que devuelve</label>
                  <button onClick={() => setFItems(prev => [...prev, emptyItem()])} style={{ fontSize: 11, padding: '3px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--font)', background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', fontWeight: 700 }}>+ Agregar</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {fItems.map((it, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px auto', gap: 6, alignItems: 'center' }}>
                      <select value={it.codigo} onChange={e => selProducto(i, e.target.value)} style={{ ...inputSt, padding: '7px 8px', fontSize: 12, cursor: 'pointer' }}>
                        <option value="">Buscar producto…</option>
                        {catalogo.map(p => <option key={p.codigo} value={p.codigo}>{p.codigo} — {p.nombre} {p.modelo || ''}</option>)}
                      </select>
                      <input type="number" min="1" value={it.cantidad} onChange={e => setFItems(prev => prev.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))} style={{ ...inputSt, padding: '7px 8px', fontSize: 12, textAlign: 'center' }} />
                      {fItems.length > 1
                        ? <button onClick={() => setFItems(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', fontSize: 20, padding: '0 2px' }}>×</button>
                        : <span />}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>📅 Fecha de devolución</label>
                  <input type="date" value={fFecha} onChange={e => setFFecha(e.target.value)} style={{ ...inputSt, colorScheme: 'dark' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Modo de entrega</label>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[{ k: 'logistica', label: '🚛 Logística' }, { k: 'fabrica', label: '🏭 En fábrica' }].map(op => (
                      <button key={op.k} type="button" onClick={() => setFModo(op.k)}
                        style={{ flex: 1, padding: '9px 6px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: fModo === op.k ? 'rgba(74,108,247,0.15)' : 'var(--surface2)', color: fModo === op.k ? '#7b9fff' : 'var(--text3)', border: `1px solid ${fModo === op.k ? 'rgba(74,108,247,0.5)' : 'var(--border)'}` }}>{op.label}</button>
                    ))}
                  </div>
                </div>
              </div>
              {fModo === 'logistica' && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: -6, lineHeight: 1.4 }}>La retiramos nosotros → aparece en <b>Logística Diaria</b> para traer.</div>}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Notas (opcional)</label>
                <textarea value={fNotas} onChange={e => setFNotas(e.target.value)} rows={2} placeholder="Motivo, aclaraciones…" style={{ ...inputSt, resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={crearDevolucion} disabled={creando} style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: creando ? 'not-allowed' : 'pointer', opacity: creando ? 0.7 : 1, fontFamily: 'var(--font)' }}>{creando ? 'Guardando…' : '✓ Cargar devolución'}</button>
                <button onClick={() => setModal(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
