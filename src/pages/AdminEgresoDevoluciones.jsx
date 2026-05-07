import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_CFG = {
  pendiente:  { label: 'Pendiente',  color: '#ffd166', bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.35)' },
  preparando: { label: 'Preparando', color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)' },
  enviado:    { label: 'Enviado',    color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',   border: 'rgba(56,189,248,0.35)' },
  confirmado: { label: 'Confirmado', color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)' },
  cancelado:  { label: 'Cancelado',  color: '#ff5577', bg: 'rgba(255,85,119,0.12)',  border: 'rgba(255,85,119,0.35)' },
}

const inputSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', resize: 'vertical' }

export default function AdminEgresoDevoluciones() {
  const { isAdmin, isAdmin2 } = useAuth()
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [filtro, setFiltro]     = useState('pendiente')
  const [busqueda, setBusqueda] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [notaAbierta, setNotaAbierta] = useState(null)
  const [notaEdit, setNotaEdit]       = useState({})
  const [guardandoNota, setGuardandoNota] = useState(false)
  const [subiendoEtiqueta, setSubiendoEtiqueta] = useState(null) // item id

  useEffect(() => { if (isAdmin || isAdmin2) cargar() }, [isAdmin, isAdmin2])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('egresos_garantia')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) toast.error('Error al cargar: ' + error.message)
    else setItems(data || [])
    setLoading(false)
  }

  async function cambiarEstado(id, nuevoEstado) {
    const { error } = await supabase.from('egresos_garantia').update({ estado: nuevoEstado }).eq('id', id)
    if (error) toast.error('Error: ' + error.message)
    else { toast.success(`Estado actualizado: ${STATUS_CFG[nuevoEstado]?.label}`); cargar() }
  }

  async function cancelar(id) {
    if (!window.confirm('¿Cancelar este egreso?')) return
    cambiarEstado(id, 'cancelado')
  }

  async function guardarNota(it) {
    const texto = (notaEdit[it.id] ?? it.notas_admin ?? '').trim()
    setGuardandoNota(true)
    const { error } = await supabase.from('egresos_garantia').update({ notas_admin: texto || null }).eq('id', it.id)
    setGuardandoNota(false)
    if (error) { toast.error('Error al guardar nota'); return }
    toast.success('Nota guardada')
    setNotaAbierta(null)
    cargar()
  }

  function abrirNota(it) {
    setNotaEdit(prev => ({ ...prev, [it.id]: it.notas_admin || '' }))
    setNotaAbierta(it.id)
  }

  async function subirEtiqueta(it, files) {
    const arr = Array.from(files || [])
    if (!arr.length) return
    setSubiendoEtiqueta(it.id)
    const actuales = Array.isArray(it.etiqueta_urls) ? it.etiqueta_urls : []
    const nuevas = []
    for (const file of arr) {
      const ext = file.name.split('.').pop()
      const path = `egresos-garantia/${it.id}/etiqueta_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('facturas').upload(path, file, { upsert: true })
      if (error) { toast.error('Error al subir ' + file.name + ': ' + error.message); continue }
      const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)
      nuevas.push(publicUrl)
    }
    if (!nuevas.length) { setSubiendoEtiqueta(null); return }
    const todas = [...actuales, ...nuevas]
    const { error } = await supabase.from('egresos_garantia').update({ etiqueta_urls: todas }).eq('id', it.id)
    setSubiendoEtiqueta(null)
    if (error) { toast.error('Error al guardar etiqueta: ' + error.message); return }
    toast.success(`${nuevas.length} etiqueta${nuevas.length > 1 ? 's' : ''} adjuntada${nuevas.length > 1 ? 's' : ''} ✅`)
    cargar()
  }

  async function eliminarEtiqueta(it, url) {
    const nuevas = (it.etiqueta_urls || []).filter(u => u !== url)
    const { error } = await supabase.from('egresos_garantia').update({ etiqueta_urls: nuevas }).eq('id', it.id)
    if (error) { toast.error('Error al eliminar etiqueta'); return }
    toast.success('Etiqueta eliminada')
    cargar()
  }

  const filtrados = items.filter(it => {
    if (filtro !== 'todos' && it.estado !== filtro) return false
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      it.codigo?.toLowerCase().includes(q) ||
      it.nombre?.toLowerCase().includes(q) ||
      it.referencia_nombre?.toLowerCase().includes(q) ||
      String(it.id).slice(0,8).toLowerCase().includes(q)
    )
  }).sort((a, b) => {
    const ta = new Date(a.created_at).getTime(), tb = new Date(b.created_at).getTime()
    return sortOrder === 'newest' ? tb - ta : ta - tb
  })

  const counts = {
    pendiente:  items.filter(i => i.estado === 'pendiente').length,
    preparando: items.filter(i => i.estado === 'preparando').length,
    enviado:    items.filter(i => i.estado === 'enviado').length,
    confirmado: items.filter(i => i.estado === 'confirmado').length,
    cancelado:  items.filter(i => i.estado === 'cancelado').length,
  }

  if (!isAdmin && !isAdmin2) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>📤 Egreso Devoluciones</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Paneles enviados a clientes desde Service / Garantía — pendientes de confirmar en Ingreso/Egreso PT</p>
        </div>
        <button onClick={cargar} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 13, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>🔄</button>
      </div>

      {/* Cards estado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: 20 }}>
        {Object.entries(STATUS_CFG).map(([k, cfg]) => (
          <div key={k} onClick={() => setFiltro(filtro === k ? 'todos' : k)}
            style={{ background: filtro === k ? cfg.bg : 'var(--surface)', border: `1px solid ${filtro === k ? cfg.border : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer', transition: 'all .15s' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: cfg.color, fontFamily: 'var(--font-display)' }}>{counts[k] || 0}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{cfg.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['todos', 'Todos'], ...Object.entries(STATUS_CFG).map(([k, c]) => [k, c.label])].map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              style={{ padding: '6px 14px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: filtro === k ? (STATUS_CFG[k]?.bg || 'rgba(74,108,247,0.1)') : 'var(--surface2)', color: filtro === k ? (STATUS_CFG[k]?.color || '#7b9fff') : 'var(--text3)', border: filtro === k ? `1px solid ${STATUS_CFG[k]?.border || 'rgba(74,108,247,0.4)'}` : '1px solid var(--border)' }}>
              {l}
            </button>
          ))}
        </div>
        <input type="text" placeholder="🔍 Buscar por código, producto o cliente..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          style={{ flex: 1, minWidth: 200, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
        <button onClick={() => setSortOrder(s => s === 'newest' ? 'oldest' : 'newest')}
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
          {sortOrder === 'newest' ? '↓ Más nuevo' : '↑ Más antiguo'}
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No hay egresos para mostrar.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtrados.map(it => {
            const scfg = STATUS_CFG[it.estado] || STATUS_CFG.pendiente
            const notaActiva = notaAbierta === it.id
            return (
              <div key={it.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                    #{String(it.id).slice(0,8).toUpperCase()}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: scfg.bg, color: scfg.color, border: `1px solid ${scfg.border}` }}>{scfg.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, background: 'rgba(167,139,250,0.12)', color: '#b39dfa', padding: '2px 8px', borderRadius: 20 }}>🔧 Garantía</span>
                  {it.tipo_envio && (() => {
                    const cfg = {
                      'Logística':          { icon: '🚚', color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)'  },
                      'Correo Argentino':   { icon: '📮', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.35)'  },
                      'Andreani':           { icon: '📦', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)' },
                      'Retiro en fábrica':  { icon: '🏭', color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)'  },
                    }[it.tipo_envio] || { icon: '🚚', color: '#fb923c', bg: 'rgba(251,146,60,0.12)', border: 'rgba(251,146,60,0.35)' }
                    return (
                      <span style={{ fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, padding: '2px 10px', borderRadius: 20 }}>
                        {cfg.icon} {it.tipo_envio}
                      </span>
                    )
                  })()}
                  {it.fecha_envio ? (
                    <span style={{ fontSize: 12, fontWeight: 700, background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.4)', padding: '3px 10px', borderRadius: 20 }}>
                      📅 Enviar: {new Date(it.fecha_envio + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: 20 }}>
                      📅 Sin fecha de envío
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
                    {formatDistanceToNow(new Date(it.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Producto</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 700, color: '#ffd166', background: 'rgba(255,209,102,0.1)', padding: '2px 6px', borderRadius: 4 }}>{it.codigo}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{it.nombre}</span>
                      {it.modelo && it.modelo !== it.nombre && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{it.modelo}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Cantidad: <strong style={{ color: 'var(--text)' }}>{it.cantidad}</strong></div>
                  </div>
                  <div style={{ minWidth: 180 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Cliente</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{it.referencia_nombre || '—'}</div>
                    {it.observacion && (() => {
                      const tracking = it.observacion?.match(/Reclamo (DEV-[\w-]+)/)?.[1]
                      return tracking
                        ? <div style={{ fontSize: 11, marginTop: 2 }}>
                            <Link to={`/reclamos?tracking=${tracking}`} style={{ color: '#7b9fff', textDecoration: 'underline', cursor: 'pointer' }}>
                              {it.observacion} ↗
                            </Link>
                          </div>
                        : <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{it.observacion}</div>
                    })()}
                  </div>
                  <div style={{ minWidth: 140 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Operador</div>
                    <div style={{ fontSize: 12 }}>{it.usuario_nombre || '—'}</div>
                  </div>
                </div>

                {/* Nota interna */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 10 }}>
                  {!notaActiva && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {it.notas_admin
                        ? <span style={{ fontSize: 12, color: 'var(--text2)', fontStyle: 'italic', flex: 1 }}>📝 {it.notas_admin}</span>
                        : <span style={{ fontSize: 12, color: 'var(--text3)', flex: 1 }}>Sin nota interna</span>
                      }
                      <button onClick={() => abrirNota(it)}
                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 10px', fontSize: 11, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                        ✏ {it.notas_admin ? 'Editar nota' : 'Agregar nota'}
                      </button>
                    </div>
                  )}
                  {notaActiva && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea rows={2} value={notaEdit[it.id] ?? ''} onChange={e => setNotaEdit(prev => ({ ...prev, [it.id]: e.target.value }))}
                        placeholder="Nota interna (solo admins)..."
                        style={inputSt} />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => guardarNota(it)} disabled={guardandoNota}
                          style={{ background: '#7b9fff', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                          {guardandoNota ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button onClick={() => setNotaAbierta(null)}
                          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Etiquetas de envío */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Etiquetas de envío</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                    {(it.etiqueta_urls || []).map((url, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <a href={url} target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#38bdf8', textDecoration: 'none' }}>
                          🏷️ Etiqueta {(it.etiqueta_urls || []).length > 1 ? i + 1 : ''}
                        </a>
                        <button onClick={() => eliminarEtiqueta(it, url)}
                          style={{ background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, padding: '5px 8px', fontSize: 11, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)' }}>✕</button>
                      </div>
                    ))}
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(56,189,248,0.06)', border: '1px dashed rgba(56,189,248,0.4)', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 600, color: '#38bdf8', cursor: subiendoEtiqueta === it.id ? 'not-allowed' : 'pointer' }}>
                      {subiendoEtiqueta === it.id ? '⏳ Subiendo...' : '+ Adjuntar etiqueta'}
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple style={{ display: 'none' }} disabled={subiendoEtiqueta === it.id}
                        onChange={e => { const f = Array.from(e.target.files || []); e.target.value = ''; if (f.length) subirEtiqueta(it, f) }} />
                    </label>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
                  {it.estado === 'pendiente' && (
                    <>
                      <span style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', flex: 1 }}>📋 Pendiente de preparar</span>
                      <button onClick={() => cambiarEstado(it.id, 'preparando')}
                        style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.35)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#fb923c', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        → Preparando
                      </button>
                      <button onClick={() => cancelar(it.id)}
                        style={{ background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        Cancelar
                      </button>
                    </>
                  )}
                  {it.estado === 'preparando' && (
                    <>
                      <span style={{ fontSize: 12, color: '#fb923c', fontStyle: 'italic', flex: 1 }}>📦 En preparación — listo para marcar como enviado</span>
                      <button onClick={() => cambiarEstado(it.id, 'pendiente')}
                        style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        ↩ Pendiente
                      </button>
                      <button onClick={() => cambiarEstado(it.id, 'enviado')}
                        style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#38bdf8', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        🚚 Marcar como Enviado
                      </button>
                      <button onClick={() => cancelar(it.id)}
                        style={{ background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        Cancelar
                      </button>
                    </>
                  )}
                  {it.estado === 'enviado' && (
                    <span style={{ fontSize: 12, color: '#38bdf8', flex: 1 }}>🚚 Enviado — pendiente de confirmar egreso en Ingreso/Egreso PT</span>
                  )}
                  {it.estado === 'confirmado' && (
                    <span style={{ fontSize: 12, color: '#3dd68c', flex: 1 }}>✅ Egreso confirmado — stock descontado</span>
                  )}
                  {it.estado === 'cancelado' && (
                    <span style={{ fontSize: 12, color: '#ff5577', flex: 1 }}>✕ Cancelado</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
