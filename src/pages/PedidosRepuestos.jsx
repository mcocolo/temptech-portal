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

const TIPO_CFG = {
  tecnico:     { label: 'Servicio Técnico', color: '#2dd4bf', bg: 'rgba(45,212,191,0.1)',   border: 'rgba(45,212,191,0.3)'   },
  distributor: { label: 'Distribuidor',     color: '#ffd166', bg: 'rgba(255,209,102,0.1)',  border: 'rgba(255,209,102,0.3)'  },
  client:      { label: 'Cliente',          color: '#7b9fff', bg: 'rgba(123,159,255,0.1)',  border: 'rgba(123,159,255,0.3)'  },
}

function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

export default function PedidosRepuestos() {
  const { isAdmin, isAdmin2 } = useAuth()
  const [pedidos, setPedidos]           = useState([])
  const [loading, setLoading]           = useState(true)
  const [pedidoAbierto, setPedidoAbierto] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [filtroTipo, setFiltroTipo]     = useState('todos')
  const [busqueda, setBusqueda]         = useState('')
  const [notasAdmin, setNotasAdmin]     = useState('')
  const [guardandoAdmin, setGuardandoAdmin] = useState(false)
  const [envioEmpresa, setEnvioEmpresa] = useState('Correo Argentino')
  const [envioTracking, setEnvioTracking] = useState('')
  const [envioGuiaFile, setEnvioGuiaFile] = useState(null)
  const [subiendoGuia, setSubiendoGuia] = useState(false)

  // Eliminar
  const [confirmEliminar, setConfirmEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  // Nuevo pedido para técnico
  const [modalNuevo, setModalNuevo]   = useState(false)
  const [tecnicos, setTecnicos]       = useState([])
  const [repuestos, setRepuestos]     = useState([])
  const [tecnicoSel, setTecnicoSel]   = useState(null)
  const [carritoNuevo, setCarritoNuevo] = useState({})
  const [busqRepuesto, setBusqRepuesto] = useState('')
  const [notasNuevo, setNotasNuevo]   = useState('')
  const [enviandoNuevo, setEnviandoNuevo] = useState(false)

  useEffect(() => { if (isAdmin || isAdmin2) cargar() }, [isAdmin, isAdmin2])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('pedidos_repuestos')
      .select('*')
      .order('created_at', { ascending: false })
    setPedidos(data || [])
    setLoading(false)
  }

  async function cambiarEstado(id, estado) {
    const { error } = await supabase.from('pedidos_repuestos').update({ estado, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Error al cambiar estado'); return }
    toast.success('Estado actualizado')
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado } : p))
  }

  async function guardarNotasAdmin(id) {
    setGuardandoAdmin(true)
    const { error } = await supabase.from('pedidos_repuestos').update({ notas_admin: notasAdmin.trim() || null, updated_at: new Date().toISOString() }).eq('id', id)
    setGuardandoAdmin(false)
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Notas guardadas ✅')
    setPedidos(prev => prev.map(p => p.id === id ? { ...p, notas_admin: notasAdmin.trim() || null } : p))
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
    setPedidos(prev => prev.map(p => p.id === pedidoId ? { ...p, envio_empresa: envioEmpresa, envio_tracking: envioTracking.trim() || null, envio_guia_url: guiaUrl } : p))
    if (envioTracking.trim()) cambiarEstado(pedidoId, 'enviado')
  }

  async function eliminarPedido(id) {
    setEliminando(true)
    const { error } = await supabase.from('pedidos_repuestos').delete().eq('id', id)
    setEliminando(false)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Pedido eliminado')
    setConfirmEliminar(null)
    setPedidoAbierto(null)
    setPedidos(prev => prev.filter(p => p.id !== id))
  }

  async function abrirModalNuevo() {
    setModalNuevo(true)
    setTecnicoSel(null)
    setCarritoNuevo({})
    setBusqRepuesto('')
    setNotasNuevo('')
    if (!tecnicos.length) {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, razon_social')
        .eq('user_type', 'tecnico')
        .order('full_name')
      setTecnicos(data || [])
    }
    if (!repuestos.length) {
      const { data } = await supabase
        .from('insumos')
        .select('id, codigo, descripcion, unidad, precio_tecnico, modelo, es_kit')
        .eq('es_repuesto', true)
        .order('descripcion')
      setRepuestos(data || [])
    }
  }

  async function crearPedido() {
    if (!tecnicoSel) return toast.error('Seleccioná un servicio técnico')
    const items = repuestos
      .filter(r => carritoNuevo[r.id] > 0)
      .map(r => ({
        insumo_id: r.id,
        codigo: r.codigo,
        descripcion: r.descripcion,
        unidad: r.unidad,
        precio_tecnico: r.precio_tecnico || null,
        cantidad: carritoNuevo[r.id],
      }))
    if (!items.length) return toast.error('Agregá al menos un repuesto')
    setEnviandoNuevo(true)
    const { error } = await supabase.from('pedidos_repuestos').insert({
      tecnico_id: tecnicoSel.id,
      tecnico_nombre: tecnicoSel.full_name || null,
      tecnico_email: tecnicoSel.email,
      razon_social: tecnicoSel.razon_social || null,
      destinatario_tipo: 'tecnico',
      items,
      notas: notasNuevo.trim() || null,
      estado: 'pendiente',
    })
    setEnviandoNuevo(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Pedido creado ✅')
    setModalNuevo(false)
    cargar()
  }

  function abrirPedido(p) {
    const mismoId = pedidoAbierto === p.id
    setPedidoAbierto(mismoId ? null : p.id)
    if (!mismoId) {
      setNotasAdmin(p.notas_admin || '')
      setEnvioEmpresa(p.envio_empresa || 'Correo Argentino')
      setEnvioTracking(p.envio_tracking || '')
      setEnvioGuiaFile(null)
    }
  }

  const filtrados = pedidos.filter(p => {
    if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false
    if (filtroTipo !== 'todos' && p.destinatario_tipo !== filtroTipo) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      const match = (p.razon_social || '').toLowerCase().includes(q)
        || (p.tecnico_email || '').toLowerCase().includes(q)
        || (p.tecnico_nombre || '').toLowerCase().includes(q)
        || (p.id || '').toLowerCase().includes(q)
      if (!match) return false
    }
    return true
  })

  const contadores = Object.fromEntries(
    Object.keys(ESTADO_CFG).map(e => [e, pedidos.filter(p => p.estado === e).length])
  )

  const repuestosFiltrados = repuestos.filter(r => {
    if (!busqRepuesto) return true
    const q = busqRepuesto.toLowerCase()
    return (r.descripcion || '').toLowerCase().includes(q) || (r.codigo || '').toLowerCase().includes(q)
  })

  const itemsCarritoNuevo = repuestos.filter(r => carritoNuevo[r.id] > 0)
  const totalCarritoNuevo = itemsCarritoNuevo.reduce((s, r) => s + (r.precio_tecnico || 0) * (carritoNuevo[r.id] || 0), 0)

  if (!isAdmin && !isAdmin2) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>🔩 Pedidos de Repuestos</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Pedidos de repuestos de técnicos, distribuidores y clientes</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px' }}>
            {filtrados.length} pedido{filtrados.length !== 1 ? 's' : ''}
          </div>
          <button onClick={abrirModalNuevo}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.35)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
            + Armar pedido para técnico
          </button>
        </div>
      </div>

      {/* Stats por estado */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {Object.entries(ESTADO_CFG).map(([e, cfg]) => contadores[e] > 0 && (
          <div key={e} style={{ background: cfg.bg, border: `1px solid ${cfg.color}40`, borderRadius: 10, padding: '8px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase' }}>{cfg.label}</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: cfg.color, lineHeight: 1 }}>{contadores[e]}</span>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['todos', 'Todos'], ...Object.entries(ESTADO_CFG).map(([k, v]) => [k, v.label])].map(([key, label]) => (
            <button key={key} onClick={() => setFiltroEstado(key)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              background: filtroEstado === key ? 'rgba(45,212,191,0.15)' : 'var(--surface)',
              color: filtroEstado === key ? '#2dd4bf' : 'var(--text3)',
              border: filtroEstado === key ? '1px solid rgba(45,212,191,0.4)' : '1px solid var(--border)',
            }}>{label}</button>
          ))}
        </div>
        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
        {[['todos', 'Todos los tipos'], ...Object.entries(TIPO_CFG).map(([k, v]) => [k, v.label])].map(([key, label]) => (
          <button key={key} onClick={() => setFiltroTipo(key)} style={{
            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
            background: filtroTipo === key ? 'rgba(123,159,255,0.15)' : 'var(--surface)',
            color: filtroTipo === key ? '#7b9fff' : 'var(--text3)',
            border: filtroTipo === key ? '1px solid rgba(123,159,255,0.4)' : '1px solid var(--border)',
          }}>{label}</button>
        ))}
      </div>

      {/* Búsqueda */}
      <div style={{ marginBottom: 18 }}>
        <input type="text" placeholder="🔍 Buscar por nombre, email o ID..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)} style={{ ...inputSt, maxWidth: 400 }} />
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>
          {pedidos.length === 0 ? 'No hay pedidos de repuestos aún' : 'Sin resultados para los filtros aplicados'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtrados.map(p => {
            const cfg = ESTADO_CFG[p.estado] || ESTADO_CFG.pendiente
            const tipoCfg = TIPO_CFG[p.destinatario_tipo] || TIPO_CFG.tecnico
            const abierto = pedidoAbierto === p.id
            const totalPedido = (p.items || []).reduce((s, i) => s + (i.precio_tecnico || 0) * (i.cantidad || 0), 0)

            return (
              <div key={p.id} style={{ background: 'var(--surface)', border: `1px solid ${abierto ? 'rgba(45,212,191,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'border-color .2s' }}>

                {/* Cabecera */}
                <div onClick={() => abrirPedido(p)} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(123,159,255,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                      #{p.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: tipoCfg.bg, color: tipoCfg.color, border: `1px solid ${tipoCfg.border}` }}>
                      {tipoCfg.label}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {p.razon_social || p.tecnico_nombre || p.tecnico_email}
                    </span>
                    {p.razon_social && p.tecnico_email && (
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{p.tecnico_email}</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                      {(p.items || []).length} ítem{(p.items || []).length !== 1 ? 's' : ''}
                      {totalPedido > 0 && <> · <strong style={{ color: 'var(--text2)' }}>{formatPrecio(totalPedido)}</strong></>}
                      {' · '}{new Date(p.created_at).toLocaleDateString('es-AR')}
                    </span>
                    <span style={{ fontSize: 16, color: 'var(--text3)' }}>{abierto ? '▲' : '▼'}</span>
                  </div>
                </div>

                {/* Panel expandido */}
                {abierto && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '18px 20px', background: 'rgba(45,212,191,0.02)', display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* Items */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Ítems solicitados</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {(p.items || []).map((item, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', minWidth: 80 }}>{item.codigo}</span>
                            <span style={{ flex: 1 }}>{item.descripcion}</span>
                            <span style={{ fontWeight: 700 }}>×{item.cantidad} {item.unidad}</span>
                            {item.precio_tecnico > 0 && (
                              <span style={{ color: '#2dd4bf', fontWeight: 700, minWidth: 80, textAlign: 'right' }}>{formatPrecio(item.precio_tecnico * item.cantidad)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      {totalPedido > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end', fontSize: 13, fontWeight: 700, color: '#2dd4bf' }}>
                          Total: {formatPrecio(totalPedido)}
                        </div>
                      )}
                    </div>

                    {/* Notas del solicitante */}
                    {p.notas && (
                      <div style={{ padding: '10px 12px', background: 'rgba(123,159,255,0.06)', border: '1px solid rgba(123,159,255,0.2)', borderRadius: 6, fontSize: 13 }}>
                        <span style={{ fontWeight: 700, color: '#7b9fff' }}>Notas del solicitante: </span>{p.notas}
                      </div>
                    )}

                    {/* Cambiar estado */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>Estado</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {Object.entries(ESTADO_CFG).map(([estado, c]) => (
                          <button key={estado} onClick={() => cambiarEstado(p.id, estado)} style={{
                            padding: '5px 12px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
                            background: p.estado === estado ? c.bg : 'var(--surface2)',
                            color: p.estado === estado ? c.color : 'var(--text3)',
                            border: p.estado === estado ? `1px solid ${c.color}50` : '1px solid var(--border)',
                          }}>{c.label}</button>
                        ))}
                      </div>
                    </div>

                    {/* Notas admin */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>Notas internas / respuesta al solicitante</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <textarea value={notasAdmin} onChange={e => setNotasAdmin(e.target.value)} rows={2}
                          style={{ ...inputSt, resize: 'vertical', lineHeight: 1.5 }}
                          placeholder="Ej: Enviamos el martes, número de seguimiento..." />
                        <button onClick={() => guardarNotasAdmin(p.id)} disabled={guardandoAdmin}
                          style={{ background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.35)', borderRadius: 'var(--radius)', padding: '0 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', opacity: guardandoAdmin ? 0.6 : 1 }}>
                          💾 Guardar
                        </button>
                      </div>
                    </div>

                    {/* Datos de envío */}
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
                            {subiendoGuia ? '⏳...' : '💾 Guardar envío'}
                          </button>
                        </div>
                        {p.envio_tracking && (
                          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                            Tracking actual: <strong style={{ color: '#7b9fff' }}>{p.envio_empresa} — {p.envio_tracking}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Eliminar */}
                    <div style={{ paddingTop: 6, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                      {confirmEliminar === p.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: '#ff5577' }}>¿Eliminar este pedido?</span>
                          <button onClick={() => eliminarPedido(p.id)} disabled={eliminando}
                            style={{ background: 'rgba(255,85,119,0.15)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.4)', borderRadius: 'var(--radius)', padding: '5px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', opacity: eliminando ? 0.6 : 1 }}>
                            {eliminando ? '⏳...' : 'Sí, eliminar'}
                          </button>
                          <button onClick={() => setConfirmEliminar(null)}
                            style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button onClick={e => { e.stopPropagation(); setConfirmEliminar(p.id) }}
                          style={{ background: 'none', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                          🗑 Eliminar pedido
                        </button>
                      )}
                    </div>

                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL: Armar pedido para técnico */}
      {modalNuevo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Header modal */}
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#2dd4bf' }}>🔩 Armar pedido para servicio técnico</div>
              <button onClick={() => setModalNuevo(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Seleccionar técnico */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Servicio técnico destinatario *</label>
                {tecnicos.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>Cargando técnicos...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 180, overflowY: 'auto' }}>
                    {tecnicos.map(t => (
                      <div key={t.id} onClick={() => setTecnicoSel(t)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 'var(--radius)', cursor: 'pointer', border: `1px solid ${tecnicoSel?.id === t.id ? 'rgba(45,212,191,0.5)' : 'var(--border)'}`, background: tecnicoSel?.id === t.id ? 'rgba(45,212,191,0.08)' : 'var(--surface2)', transition: 'all .15s' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: tecnicoSel?.id === t.id ? '#2dd4bf' : 'var(--border)', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{t.razon_social || t.full_name || t.email}</div>
                          {(t.razon_social || t.full_name) && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{t.email}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Catálogo de repuestos */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
                  Repuestos {itemsCarritoNuevo.length > 0 && <span style={{ color: '#2dd4bf' }}>— {itemsCarritoNuevo.length} seleccionado{itemsCarritoNuevo.length !== 1 ? 's' : ''}</span>}
                </label>
                <input type="text" placeholder="🔍 Buscar repuesto..." value={busqRepuesto}
                  onChange={e => setBusqRepuesto(e.target.value)}
                  style={{ ...inputSt, marginBottom: 8 }} />
                {repuestos.length === 0 ? (
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>Cargando catálogo...</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
                    {repuestosFiltrados.map(r => {
                      const cant = carritoNuevo[r.id] || 0
                      return (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--radius)', border: `1px solid ${cant > 0 ? 'rgba(45,212,191,0.4)' : 'var(--border)'}`, background: cant > 0 ? 'rgba(45,212,191,0.05)' : 'var(--surface2)' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#7b9fff', minWidth: 70 }}>{r.codigo}</span>
                          <span style={{ flex: 1, fontSize: 13 }}>{r.descripcion}</span>
                          <span style={{ fontSize: 11, color: 'var(--text3)', minWidth: 30 }}>{r.unidad}</span>
                          {r.precio_tecnico > 0 && (
                            <span style={{ fontSize: 11, color: '#2dd4bf', minWidth: 70, textAlign: 'right' }}>{formatPrecio(r.precio_tecnico)}</span>
                          )}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <button onClick={() => setCarritoNuevo(prev => ({ ...prev, [r.id]: Math.max(0, (prev[r.id] || 0) - 1) }))}
                              style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text2)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)' }}>−</button>
                            <input type="number" min="0" value={cant || ''} placeholder="0"
                              onChange={e => setCarritoNuevo(prev => ({ ...prev, [r.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                              style={{ width: 44, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', fontSize: 12, padding: '3px 4px', fontFamily: 'var(--font)', outline: 'none' }} />
                            <button onClick={() => setCarritoNuevo(prev => ({ ...prev, [r.id]: (prev[r.id] || 0) + 1 }))}
                              style={{ width: 24, height: 24, borderRadius: 4, border: '1px solid rgba(45,212,191,0.4)', background: 'rgba(45,212,191,0.1)', color: '#2dd4bf', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)' }}>+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Resumen carrito */}
              {itemsCarritoNuevo.length > 0 && (
                <div style={{ background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#2dd4bf', textTransform: 'uppercase', marginBottom: 6 }}>Resumen del pedido</div>
                  {itemsCarritoNuevo.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text2)', marginBottom: 3 }}>
                      <span>{r.descripcion} ×{carritoNuevo[r.id]}</span>
                      {r.precio_tecnico > 0 && <span style={{ color: '#2dd4bf' }}>{formatPrecio(r.precio_tecnico * carritoNuevo[r.id])}</span>}
                    </div>
                  ))}
                  {totalCarritoNuevo > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6, fontWeight: 700, fontSize: 13, color: '#2dd4bf', borderTop: '1px solid rgba(45,212,191,0.2)', paddingTop: 6 }}>
                      Total: {formatPrecio(totalCarritoNuevo)}
                    </div>
                  )}
                </div>
              )}

              {/* Notas */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Notas internas (opcional)</label>
                <textarea value={notasNuevo} onChange={e => setNotasNuevo(e.target.value)} rows={2}
                  style={{ ...inputSt, resize: 'vertical', lineHeight: 1.5 }}
                  placeholder="Observaciones para el técnico o para el despacho..." />
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={crearPedido} disabled={enviandoNuevo || !tecnicoSel || itemsCarritoNuevo.length === 0}
                  style={{ flex: 1, background: '#2dd4bf', color: '#0a0e1a', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 13, fontWeight: 700, cursor: (enviandoNuevo || !tecnicoSel || itemsCarritoNuevo.length === 0) ? 'not-allowed' : 'pointer', opacity: (enviandoNuevo || !tecnicoSel || itemsCarritoNuevo.length === 0) ? 0.5 : 1, fontFamily: 'var(--font)' }}>
                  {enviandoNuevo ? '⏳ Creando...' : '✅ Crear pedido'}
                </button>
                <button onClick={() => setModalNuevo(false)}
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
