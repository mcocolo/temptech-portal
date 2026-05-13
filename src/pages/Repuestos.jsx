import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const inputSt = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)',
  fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
}

const ESTADO_CFG = {
  pendiente:  { label: 'Pendiente',  color: '#ffd166', bg: 'rgba(255,209,102,0.12)' },
  aprobado:   { label: 'Aprobado',   color: '#3dd68c', bg: 'rgba(61,214,140,0.12)'  },
  enviado:    { label: 'Enviado',    color: '#7b9fff', bg: 'rgba(123,159,255,0.12)' },
  entregado:  { label: 'Entregado',  color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)'  },
  rechazado:  { label: 'Rechazado',  color: '#ff5577', bg: 'rgba(255,85,119,0.12)'  },
  cancelado:  { label: 'Cancelado',  color: '#888888', bg: 'rgba(136,136,136,0.1)'  },
}

function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

export default function Repuestos() {
  const { user, profile, isAdmin, isAdmin2, isTechService } = useAuth()
  const [tab, setTab] = useState('catalogo')
  const [subTab, setSubTab] = useState('individual') // 'individual' | 'kit'

  // Catálogo
  const [repuestos, setRepuestos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  // Carrito
  const [carrito, setCarrito] = useState({}) // { id: cantidad }
  const [modalCarrito, setModalCarrito] = useState(false)
  const [notasPedido, setNotasPedido] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Pedidos
  const [pedidos, setPedidos] = useState([])
  const [loadingPedidos, setLoadingPedidos] = useState(false)
  const [pedidoAbierto, setPedidoAbierto] = useState(null)
  const [notasAdmin, setNotasAdmin] = useState('')
  const [guardandoAdmin, setGuardandoAdmin] = useState(false)

  // Envío
  const [envioEmpresa, setEnvioEmpresa] = useState('Correo Argentino')
  const [envioTracking, setEnvioTracking] = useState('')
  const [envioGuiaFile, setEnvioGuiaFile] = useState(null)
  const [subiendoGuia, setSubiendoGuia] = useState(false)

  const esAdmin = isAdmin || isAdmin2

  useEffect(() => { cargarRepuestos() }, [])
  useEffect(() => { if (tab === 'pedidos') cargarPedidos() }, [tab])

  async function cargarRepuestos() {
    setLoading(true)
    const { data } = await supabase
      .from('insumos')
      .select('id, codigo, descripcion, unidad, stock_actual, es_repuesto, precio_tecnico, modelo, imagen_url, es_kit, componentes')
      .eq('es_repuesto', true)
      .order('descripcion')
    setRepuestos(data || [])
    setLoading(false)
  }

  async function cargarPedidos() {
    setLoadingPedidos(true)
    let q = supabase.from('pedidos_repuestos').select('*').order('created_at', { ascending: false })
    if (!esAdmin) q = q.eq('tecnico_id', user.id)
    const { data } = await q
    setPedidos(data || [])
    setLoadingPedidos(false)
  }

  function setCantidad(id, val) {
    const n = Math.max(0, parseInt(val) || 0)
    setCarrito(prev => n === 0 ? (({ [id]: _, ...rest }) => rest)(prev) : { ...prev, [id]: n })
  }

  const itemsCarrito = repuestos.filter(r => carrito[r.id])
  const totalCarrito = itemsCarrito.reduce((s, r) => s + (r.precio_tecnico || 0) * (carrito[r.id] || 0), 0)

  async function enviarPedido() {
    if (!itemsCarrito.length) return toast.error('Agregá al menos un repuesto')
    setEnviando(true)
    const items = itemsCarrito.map(r => ({
      insumo_id: r.id,
      codigo: r.codigo,
      descripcion: r.descripcion,
      unidad: r.unidad,
      precio_tecnico: r.precio_tecnico || null,
      cantidad: carrito[r.id],
    }))
    const { error } = await supabase.from('pedidos_repuestos').insert({
      tecnico_id: user.id,
      tecnico_nombre: profile?.full_name || null,
      tecnico_email: user.email,
      razon_social: profile?.razon_social || null,
      items,
      notas: notasPedido.trim() || null,
      estado: 'pendiente',
    })
    setEnviando(false)
    if (error) { toast.error('Error al enviar: ' + error.message); return }
    await supabase.from('notificaciones').insert({
      tipo: 'pedido',
      titulo: '🔩 Nuevo pedido de repuestos',
      mensaje: `${profile?.full_name || user.email} solicitó ${items.length} repuesto${items.length !== 1 ? 's' : ''}: ${items.map(i => i.descripcion).join(', ')}`,
      leida: false,
      link: '/repuestos',
      user_id: null,
    })
    toast.success('Pedido enviado ✅ — TEMPTECH lo revisará a la brevedad')
    setCarrito({})
    setNotasPedido('')
    setModalCarrito(false)
    setTab('pedidos')
    cargarPedidos()
  }

  async function cambiarEstado(id, estado) {
    const { error } = await supabase.from('pedidos_repuestos').update({ estado, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Error'); return }
    toast.success('Estado actualizado')
    cargarPedidos()
  }

  async function guardarNotasAdmin(id) {
    setGuardandoAdmin(true)
    const { error } = await supabase.from('pedidos_repuestos').update({ notas_admin: notasAdmin.trim() || null, updated_at: new Date().toISOString() }).eq('id', id)
    setGuardandoAdmin(false)
    if (error) { toast.error('Error'); return }
    toast.success('Notas guardadas')
    cargarPedidos()
  }

  async function guardarEnvio(pedidoId) {
    setSubiendoGuia(true)
    let guiaUrl = pedidos.find(p => p.id === pedidoId)?.envio_guia_url || null
    if (envioGuiaFile) {
      const safeName = envioGuiaFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `guias-repuestos/${pedidoId}/${Date.now()}_${safeName}`
      const { error: uploadError } = await supabase.storage.from('Imagenes').upload(path, envioGuiaFile, { upsert: true })
      if (uploadError) { toast.error('Error al subir guía: ' + uploadError.message); setSubiendoGuia(false); return }
      const { data: urlData } = supabase.storage.from('Imagenes').getPublicUrl(path)
      guiaUrl = urlData.publicUrl
    }
    const { error } = await supabase.from('pedidos_repuestos').update({
      envio_empresa: envioEmpresa || null,
      envio_tracking: envioTracking.trim() || null,
      envio_guia_url: guiaUrl,
      updated_at: new Date().toISOString(),
    }).eq('id', pedidoId)
    setSubiendoGuia(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Datos de envío guardados ✅')
    setEnvioGuiaFile(null)
    cargarPedidos()
  }

  const filtrados = repuestos.filter(r => {
    if (subTab === 'individual' && r.es_kit) return false
    if (subTab === 'kit' && !r.es_kit) return false
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return r.codigo.toLowerCase().includes(q) || r.descripcion.toLowerCase().includes(q)
  })

  const cantCarrito = Object.values(carrito).reduce((s, n) => s + n, 0)

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>🔩 Repuestos</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>
            {esAdmin ? 'Catálogo de repuestos y pedidos de servicios técnicos' : 'Catálogo de repuestos disponibles para solicitar'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['catalogo', 'pedidos'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 18px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              background: tab === t ? 'rgba(45,212,191,0.15)' : 'var(--surface)',
              color: tab === t ? '#2dd4bf' : 'var(--text3)',
              border: tab === t ? '1px solid rgba(45,212,191,0.4)' : '1px solid var(--border)',
            }}>
              {t === 'catalogo' ? '📦 Catálogo' : `🛒 Mis pedidos${pedidos.length ? ` (${pedidos.length})` : ''}`}
            </button>
          ))}
          {cantCarrito > 0 && (
            <button onClick={() => setModalCarrito(true)} style={{
              padding: '8px 18px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)',
              background: 'rgba(45,212,191,0.2)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.5)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              🛒 Carrito
              <span style={{ background: '#2dd4bf', color: '#000', borderRadius: 10, fontSize: 11, fontWeight: 800, padding: '1px 7px' }}>{cantCarrito}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── CATÁLOGO ── */}
      {tab === 'catalogo' && (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {[['individual', '🔩 Repuestos'], ['kit', '🔧 Repuestos Completos']].map(([val, label]) => (
              <button key={val} onClick={() => setSubTab(val)} style={{
                padding: '7px 18px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
                background: subTab === val ? (val === 'kit' ? 'rgba(251,191,36,0.15)' : 'rgba(45,212,191,0.15)') : 'var(--surface)',
                color: subTab === val ? (val === 'kit' ? '#fbbf24' : '#2dd4bf') : 'var(--text3)',
                border: subTab === val ? `1px solid ${val === 'kit' ? 'rgba(251,191,36,0.4)' : 'rgba(45,212,191,0.4)'}` : '1px solid var(--border)',
              }}>{label}</button>
            ))}
          </div>
          <div style={{ marginBottom: 20 }}>
            <input
              type="text"
              placeholder="🔍 Buscar por código o descripción..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              style={{ ...inputSt, maxWidth: 420 }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
          ) : filtrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>
              {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay repuestos cargados aún'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {filtrados.map(r => {
                const cant = carrito[r.id] || 0
                const sinStock = (r.stock_actual || 0) <= 0
                return (
                  <div key={r.id} style={{
                    background: 'var(--surface)', border: `1px solid ${cant > 0 ? 'rgba(45,212,191,0.4)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-lg)', padding: '16px 18px', transition: 'border-color .2s',
                  }}>
                    {r.imagen_url && (
                      <img src={r.imagen_url} alt={r.descripcion}
                        style={{ width: '100%', height: 140, objectFit: 'contain', borderRadius: 8, background: 'rgba(0,0,0,0.2)', marginBottom: 12, display: 'block', cursor: 'pointer' }}
                        onClick={() => window.open(r.imagen_url, '_blank')}
                        onError={e => { e.currentTarget.style.display = 'none' }}
                      />
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', marginBottom: 4 }}>{r.codigo}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>{r.descripcion}</div>
                      </div>
                      {esAdmin && (
                        <div style={{ fontSize: 11, fontWeight: 700, color: sinStock ? '#ff5577' : '#3dd68c', background: sinStock ? 'rgba(255,85,119,0.1)' : 'rgba(61,214,140,0.1)', border: `1px solid ${sinStock ? 'rgba(255,85,119,0.3)' : 'rgba(61,214,140,0.3)'}`, borderRadius: 4, padding: '2px 8px', flexShrink: 0 }}>
                          {r.stock_actual ?? 0} {r.unidad}
                        </div>
                      )}
                    </div>

                    {r.es_kit && (r.componentes || []).length > 0 && (
                      <div style={{ marginTop: 10, marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: 4 }}>Incluye:</div>
                        {(r.componentes || []).map((c, i) => (
                          <div key={i} style={{ display: 'flex', gap: 6, fontSize: 11, color: 'var(--text3)' }}>
                            <span style={{ fontFamily: 'monospace', color: '#fbbf24', minWidth: 70 }}>{c.codigo}</span>
                            <span style={{ flex: 1 }}>{c.descripcion}</span>
                            <span style={{ fontWeight: 700, color: 'var(--text2)' }}>×{c.cantidad}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: r.precio_tecnico ? '#2dd4bf' : 'var(--text3)' }}>
                        {r.precio_tecnico ? formatPrecio(r.precio_tecnico) : 'Sin cargo'}
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text3)', marginLeft: 4 }}>/ {r.unidad}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => setCantidad(r.id, cant - 1)} disabled={cant === 0}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 16, cursor: cant === 0 ? 'not-allowed' : 'pointer', opacity: cant === 0 ? 0.4 : 1, fontFamily: 'var(--font)' }}>−</button>
                        <span style={{ minWidth: 24, textAlign: 'center', fontSize: 14, fontWeight: 700 }}>{cant}</span>
                        <button onClick={() => setCantidad(r.id, cant + 1)}
                          style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid rgba(45,212,191,0.4)', background: 'rgba(45,212,191,0.1)', color: '#2dd4bf', fontSize: 16, cursor: 'pointer', fontFamily: 'var(--font)' }}>+</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── PEDIDOS ── */}
      {tab === 'pedidos' && (
        <div>
          {loadingPedidos ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
          ) : pedidos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>No hay pedidos aún</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pedidos.map(p => {
                const cfg = ESTADO_CFG[p.estado] || ESTADO_CFG.pendiente
                const abierto = pedidoAbierto === p.id
                return (
                  <div key={p.id} style={{ background: 'var(--surface)', border: `1px solid ${abierto ? 'rgba(45,212,191,0.35)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <div
                      onClick={() => {
                        setPedidoAbierto(abierto ? null : p.id)
                        setNotasAdmin(p.notas_admin || '')
                        setEnvioEmpresa(p.envio_empresa || 'Correo Argentino')
                        setEnvioTracking(p.envio_tracking || '')
                        setEnvioGuiaFile(null)
                      }}
                      style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(123,159,255,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                          #{p.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>{cfg.label}</span>
                        {esAdmin && p.razon_social && <span style={{ fontSize: 13, fontWeight: 600 }}>{p.razon_social}</span>}
                        {esAdmin && !p.razon_social && <span style={{ fontSize: 13, color: 'var(--text3)' }}>{p.tecnico_email}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                          {(p.items || []).length} ítem{(p.items || []).length !== 1 ? 's' : ''} ·{' '}
                          {new Date(p.created_at).toLocaleDateString('es-AR')}
                        </span>
                        <span style={{ fontSize: 16, color: 'var(--text3)' }}>{abierto ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {abierto && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '16px 18px', background: 'rgba(45,212,191,0.02)' }}>
                        {/* Items */}
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Ítems solicitados</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {(p.items || []).map((item, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', minWidth: 80 }}>{item.codigo}</span>
                                <span style={{ flex: 1 }}>{item.descripcion}</span>
                                <span style={{ fontWeight: 700 }}>x{item.cantidad} {item.unidad}</span>
                                {item.precio_tecnico && <span style={{ color: '#2dd4bf', fontWeight: 700 }}>{formatPrecio(item.precio_tecnico * item.cantidad)}</span>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {p.notas && (
                          <div style={{ marginBottom: 14, padding: '10px 12px', background: 'rgba(123,159,255,0.06)', border: '1px solid rgba(123,159,255,0.2)', borderRadius: 6, fontSize: 13 }}>
                            <span style={{ fontWeight: 700, color: '#7b9fff' }}>Notas del técnico: </span>{p.notas}
                          </div>
                        )}

                        {/* Admin: cambiar estado + notas */}
                        {esAdmin && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>Cambiar estado</div>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {Object.entries(ESTADO_CFG).map(([estado, cfg]) => (
                                  <button key={estado} onClick={() => cambiarEstado(p.id, estado)}
                                    style={{ padding: '5px 12px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: p.estado === estado ? cfg.bg : 'var(--surface2)', color: p.estado === estado ? cfg.color : 'var(--text3)', border: p.estado === estado ? `1px solid ${cfg.color}50` : '1px solid var(--border)' }}>
                                    {cfg.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>Notas internas / respuesta al técnico</div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                <textarea value={notasAdmin} onChange={e => setNotasAdmin(e.target.value)} rows={2}
                                  style={{ ...inputSt, resize: 'vertical', lineHeight: 1.5 }} placeholder="Ej: Enviamos el martes, número de seguimiento..." />
                                <button onClick={() => guardarNotasAdmin(p.id)} disabled={guardandoAdmin}
                                  style={{ background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.35)', borderRadius: 'var(--radius)', padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                                  💾 Guardar
                                </button>
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>📦 Datos de envío</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <select value={envioEmpresa} onChange={e => setEnvioEmpresa(e.target.value)}
                                    style={{ ...inputSt, flex: '0 0 200px', cursor: 'pointer' }}>
                                    <option value="Correo Argentino">📮 Correo Argentino</option>
                                    <option value="Andreani">📦 Andreani</option>
                                    <option value="Logística Propia">🚚 Logística Propia</option>
                                    <option value="Otro">Otro</option>
                                  </select>
                                  <input type="text" placeholder="N° de seguimiento" value={envioTracking} onChange={e => setEnvioTracking(e.target.value)}
                                    style={{ ...inputSt, flex: 1 }} />
                                </div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <label style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', fontSize: 13, color: envioGuiaFile ? 'var(--text)' : 'var(--text3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    📎 {envioGuiaFile ? envioGuiaFile.name : (p.envio_guia_url ? 'Reemplazar guía PDF...' : 'Adjuntar guía PDF...')}
                                    <input type="file" accept=".pdf,image/*" onChange={e => setEnvioGuiaFile(e.target.files[0] || null)} style={{ display: 'none' }} />
                                  </label>
                                  {p.envio_guia_url && !envioGuiaFile && (
                                    <a href={p.envio_guia_url} target="_blank" rel="noreferrer"
                                      style={{ color: '#7b9fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                      Ver guía ↗
                                    </a>
                                  )}
                                  <button onClick={() => guardarEnvio(p.id)} disabled={subiendoGuia}
                                    style={{ background: 'rgba(123,159,255,0.12)', color: '#7b9fff', border: '1px solid rgba(123,159,255,0.35)', borderRadius: 'var(--radius)', padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: subiendoGuia ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', height: 38, opacity: subiendoGuia ? 0.6 : 1 }}>
                                    {subiendoGuia ? '⏳...' : '💾 Guardar'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tech: ver notas_admin */}
                        {!esAdmin && p.notas_admin && (
                          <div style={{ padding: '10px 12px', background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 6, fontSize: 13 }}>
                            <span style={{ fontWeight: 700, color: '#2dd4bf' }}>Respuesta TEMPTECH: </span>{p.notas_admin}
                          </div>
                        )}

                        {/* Tech: info de envío */}
                        {!esAdmin && (p.envio_empresa || p.envio_tracking || p.envio_guia_url) && (
                          <div style={{ padding: '12px 14px', background: 'rgba(123,159,255,0.06)', border: '1px solid rgba(123,159,255,0.25)', borderRadius: 6, fontSize: 13, marginTop: 8 }}>
                            <div style={{ fontWeight: 700, color: '#7b9fff', marginBottom: 8 }}>📦 Información de envío</div>
                            {p.envio_empresa && (
                              <div style={{ marginBottom: 4 }}>Empresa: <b>{p.envio_empresa}</b></div>
                            )}
                            {p.envio_tracking && (
                              <div style={{ marginBottom: 4 }}>
                                Seguimiento:{' '}
                                <a href={
                                  p.envio_empresa === 'Correo Argentino'
                                    ? `https://www.correoargentino.com.ar/formularios/e-commerce?id=${p.envio_tracking}`
                                    : p.envio_empresa === 'Andreani'
                                    ? `https://www.andreani.com/#!/informacionEnvio/${p.envio_tracking}`
                                    : '#'
                                } target="_blank" rel="noreferrer"
                                  style={{ color: '#7b9fff', fontWeight: 700 }}>
                                  {p.envio_tracking} ↗
                                </a>
                              </div>
                            )}
                            {p.envio_guia_url && (
                              <div>
                                <a href={p.envio_guia_url} target="_blank" rel="noreferrer"
                                  style={{ color: '#2dd4bf', fontWeight: 700, textDecoration: 'none' }}>
                                  📎 Descargar guía ↗
                                </a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MODAL CARRITO ── */}
      {modalCarrito && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>🛒 Confirmar pedido</div>
              <button onClick={() => setModalCarrito(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {itemsCarrito.map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', borderRadius: 6, padding: '10px 12px', fontSize: 13 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', minWidth: 80 }}>{r.codigo}</span>
                    <span style={{ flex: 1 }}>{r.descripcion}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => setCantidad(r.id, (carrito[r.id] || 0) - 1)} style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font)' }}>−</button>
                      <span style={{ minWidth: 20, textAlign: 'center', fontWeight: 700 }}>{carrito[r.id]}</span>
                      <button onClick={() => setCantidad(r.id, (carrito[r.id] || 0) + 1)} style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid rgba(45,212,191,0.4)', background: 'rgba(45,212,191,0.1)', color: '#2dd4bf', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font)' }}>+</button>
                    </div>
                    {r.precio_tecnico && <span style={{ color: '#2dd4bf', fontWeight: 700, minWidth: 70, textAlign: 'right' }}>{formatPrecio(r.precio_tecnico * carrito[r.id])}</span>}
                  </div>
                ))}
              </div>

              {totalCarrito > 0 && (
                <div style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                  <span>Total estimado</span>
                  <span style={{ color: '#2dd4bf' }}>{formatPrecio(totalCarrito)}</span>
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Notas / referencia del equipo</label>
                <textarea value={notasPedido} onChange={e => setNotasPedido(e.target.value)} rows={3}
                  style={{ ...inputSt, resize: 'vertical', lineHeight: 1.6 }}
                  placeholder="Ej: Para reparación de equipo N° de serie 12345, cliente Pérez..." />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={enviarPedido} disabled={enviando}
                  style={{ flex: 1, background: 'rgba(45,212,191,0.15)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.4)', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: enviando ? 'not-allowed' : 'pointer', opacity: enviando ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {enviando ? '⏳ Enviando...' : '📤 Enviar pedido'}
                </button>
                <button onClick={() => setModalCarrito(false)}
                  style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
