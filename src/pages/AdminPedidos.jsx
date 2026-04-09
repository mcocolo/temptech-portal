import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const IMG = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagenes%20productos/'

const CATALOGO_ADMIN = [
  {
    categoria: 'calefones_calderas', label: 'Calefones / Calderas', emoji: '🚿',
    productos: [
      { codigo: 'KF70SIL',    nombre: 'Calefón Eléctrico One',          modelo: '3,5/5,5/7Kw 220V Silver',         precio: 165585.15 },
      { codigo: 'FE150TBLACK',nombre: 'Calefón Eléctrico Nova',         modelo: '6/8/9/13,5Kw 220V Black',         precio: 213182.07 },
      { codigo: 'FE150TSIL',  nombre: 'Calefón Eléctrico Nova',         modelo: '6/8/9/13,5Kw 220V Silver',        precio: 213182.07 },
      { codigo: 'FE150TBL',   nombre: 'Calefón Eléctrico Nova',         modelo: '6/8/9/13,5Kw 220V Blanco',        precio: 213182.07 },
      { codigo: 'FM318BL',    nombre: 'Calefón Eléctrico Pulse',        modelo: '9/13,5/18Kw 380V Blanco',         precio: 450250.68 },
      { codigo: 'FM324BL',    nombre: 'Calefón Eléctrico Pulse',        modelo: '12/18/24Kw 380V Blanco',          precio: 493936.98 },
      { codigo: 'BF14EBL',    nombre: 'Caldera Dual Core',              modelo: '220-380V 14,4Kw Blanco',          precio: 1701651.65 },
      { codigo: 'BF323EBL',   nombre: 'Caldera Dual Core',              modelo: '380V 23Kw Blanco',                precio: 2029298.86 },
    ],
  },
  {
    categoria: 'paneles_calefactores', label: 'Paneles Calefactores', emoji: '🔆',
    productos: [
      { codigo: 'C250STV1',     nombre: 'Panel Calefactor Slim',          modelo: '250w',                            precio: 39293.46 },
      { codigo: 'C250STV1TS',   nombre: 'Panel Calefactor Slim',          modelo: '250w Toallero Simple',            precio: 44907.61 },
      { codigo: 'C250STV1TD',   nombre: 'Panel Calefactor Slim',          modelo: '250w Toallero Doble',             precio: 53328.84 },
      { codigo: 'C500STV1',     nombre: 'Panel Calefactor Slim',          modelo: '500w',                            precio: 56135.91 },
      { codigo: 'C500STV1TS',   nombre: 'Panel Calefactor Slim',          modelo: '500w Toallero Simple',            precio: 67364.22 },
      { codigo: 'C500STV1TD',   nombre: 'Panel Calefactor Slim',          modelo: '500w Toallero Doble',             precio: 72978.37 },
      { codigo: 'F1400BCO',     nombre: 'Panel Calefactor Firenze',       modelo: '1400w Blanco',                    precio: 78592.53 },
      { codigo: 'F1400MV',      nombre: 'Panel Calefactor Firenze',       modelo: '1400w Madera Veteada',            precio: 78592.53 },
      { codigo: 'F1400PA',      nombre: 'Panel Calefactor Firenze',       modelo: '1400w Piedra Azteca',             precio: 78592.53 },
      { codigo: 'F1400PR',      nombre: 'Panel Calefactor Firenze',       modelo: '1400w Piedra Romana',             precio: 78592.53 },
      { codigo: 'F1400MTG',     nombre: 'Panel Calefactor Firenze',       modelo: '1400w Mármol Traviatta Gris',     precio: 78592.53 },
      { codigo: 'F1400PCL',     nombre: 'Panel Calefactor Firenze',       modelo: '1400w Piedra Cantera Luna',       precio: 78592.53 },
      { codigo: 'F1400MCO',     nombre: 'Panel Calefactor Firenze',       modelo: '1400w Mármol Calacatta Ocre',     precio: 78592.53 },
      { codigo: 'F1400SMARTBL', nombre: 'Panel Calefactor Firenze Smart', modelo: '1400w Smart Wifi - App Temptech', precio: 157190.67 },
    ],
  },
]

function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

function formatFecha(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const STATUS_CONFIG = {
  pendiente:   { label: 'Pendiente',   color: '#ffd166', bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.35)' },
  aprobado:    { label: 'Aprobado',    color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)' },
  modificado:  { label: 'Modificado',  color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)' },
  rechazado:   { label: 'Rechazado',   color: '#ff5577', bg: 'rgba(255,85,119,0.12)',  border: 'rgba(255,85,119,0.35)' },
  finalizado:  { label: 'Finalizado',  color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)' },
}

export default function AdminPedidos() {
  const { isAdmin } = useAuth()
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendiente')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null)
  const [itemsEdit, setItemsEdit] = useState([])
  const [notaAdmin, setNotaAdmin] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showProductPicker, setShowProductPicker] = useState(false)

  useEffect(() => { if (isAdmin) cargar() }, [isAdmin, filtro])

  async function cargar() {
    setLoading(true)
    let q = supabase
      .from('pedidos')
      .select('*, profiles(full_name, email, razon_social)')
      .order('created_at', { ascending: false })
    if (filtro !== 'todos') q = q.eq('estado', filtro)
    const { data, error } = await q
    if (error) toast.error('Error al cargar pedidos')
    else setPedidos(data || [])
    setLoading(false)
  }

  function abrirEdicion(pedido) {
    setItemsEdit(pedido.items.map(i => ({
      ...i,
      precio_base: i.precio_base || i.precio_unitario,
      descuento_pct: i.descuento_pct ?? 0,
    })))
    setNotaAdmin(pedido.notas_admin || '')
    setFechaEntrega(pedido.fecha_entrega || '')
    setEditando(pedido.id)
  }

  async function eliminarPedido(id) {
    const { error } = await supabase.from('pedidos').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar el pedido'); return }
    toast.success('Pedido eliminado')
    setConfirmDelete(null)
    cargar()
  }

  function eliminarItem(idx) {
    setItemsEdit(prev => prev.filter((_, i) => i !== idx))
  }

  function agregarProducto(prod) {
    const yaExiste = itemsEdit.findIndex(i => i.codigo === prod.codigo)
    if (yaExiste !== -1) {
      // Incrementar cantidad del existente
      setItemsEdit(prev => prev.map((item, i) => {
        if (i !== yaExiste) return item
        const nuevaCant = item.cantidad + 1
        return { ...item, cantidad: nuevaCant, subtotal: item.precio_unitario * nuevaCant }
      }))
    } else {
      setItemsEdit(prev => [...prev, {
        codigo: prod.codigo,
        nombre: prod.nombre,
        modelo: prod.modelo,
        precio_base: prod.precio,
        precio_unitario: prod.precio,
        descuento_pct: 0,
        cantidad: 1,
        subtotal: prod.precio,
        categoria: prod.categoria,
      }])
    }
    setShowProductPicker(false)
  }

  function cerrarEdicion() {
    setEditando(null)
    setItemsEdit([])
    setNotaAdmin('')
    setFechaEntrega('')
  }

  function actualizarCantidad(idx, val) {
    const n = Math.max(0, parseInt(val) || 0)
    setItemsEdit(prev => prev.map((item, i) => {
      if (i !== idx) return item
      return { ...item, cantidad: n, subtotal: item.precio_unitario * n }
    }))
  }

  function actualizarDescuento(idx, val) {
    const pct = Math.max(0, Math.min(100, parseFloat(val) || 0))
    setItemsEdit(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const base = item.precio_base || item.precio_unitario
      const precioUnit = base * (1 - pct / 100)
      return { ...item, descuento_pct: pct, precio_unitario: precioUnit, subtotal: precioUnit * item.cantidad }
    }))
  }

  async function confirmarPedido(pedido, nuevoEstado) {
    const itemsFinal = (nuevoEstado === 'modificado' || nuevoEstado === 'aprobado') ? itemsEdit : pedido.items
    const totalFinal = itemsFinal.reduce((s, i) => s + i.subtotal, 0)

    setGuardando(true)
    const { error } = await supabase.from('pedidos').update({
      estado: nuevoEstado,
      items: itemsFinal,
      total: totalFinal,
      notas_admin: notaAdmin.trim() || null,
      fecha_entrega: fechaEntrega || null,
      updated_at: new Date().toISOString(),
    }).eq('id', pedido.id)

    if (error) { toast.error('Error al guardar'); setGuardando(false); return }

    // Enviar email al distribuidor
    try {
      const emailDist = pedido.profiles?.email
      const nombreDist = pedido.profiles?.razon_social || pedido.profiles?.full_name || 'Distribuidor'
      const pedidoId = pedido.id.slice(0, 8).toUpperCase()

      const textoItems = itemsFinal
        .filter(i => i.cantidad > 0)
        .map(i => {
          const desc = i.descuento_pct ? ` (${i.descuento_pct}% desc.)` : ''
          return `• ${i.nombre} ${i.modelo}${desc} — x${i.cantidad} — ${formatPrecio(i.subtotal)}`
        }).join('\n')

      const lineaFecha = fechaEntrega ? `\n📅 Fecha de entrega estimada: ${formatFecha(fechaEntrega)}` : ''
      const lineaNota = notaAdmin ? `\n\nNota de TEMPTECH: ${notaAdmin}` : ''

      const asunto =
        nuevoEstado === 'aprobado'  ? `TEMPTECH - Pedido #${pedidoId} aprobado ✅` :
        nuevoEstado === 'modificado' ? `TEMPTECH - Pedido #${pedidoId} modificado ✏️` :
        `TEMPTECH - Pedido #${pedidoId} rechazado ❌`

      const texto =
        nuevoEstado === 'aprobado'
          ? `Hola ${nombreDist},\n\nTu pedido #${pedidoId} fue APROBADO.\n\nDetalle:\n${textoItems}\n\nTotal: ${formatPrecio(totalFinal)}${lineaFecha}${lineaNota}\n\nSaludos,\nEquipo TEMPTECH`
          : nuevoEstado === 'modificado'
          ? `Hola ${nombreDist},\n\nTu pedido #${pedidoId} fue MODIFICADO por nuestro equipo.\n\nNuevo detalle:\n${textoItems}\n\nTotal actualizado: ${formatPrecio(totalFinal)}${lineaFecha}${lineaNota}\n\nSaludos,\nEquipo TEMPTECH`
          : `Hola ${nombreDist},\n\nTu pedido #${pedidoId} fue RECHAZADO.${lineaNota}\n\nSaludos,\nEquipo TEMPTECH`

      await supabase.functions.invoke('enviar-email-resolucion', {
        body: {
          to: emailDist,
          subject: asunto,
          text: texto,
          tracking_id: pedidoId,
          empresa: '', tracking: '', fecha: '',
        },
      })
    } catch { /* email no crítico */ }

    const labels = { aprobado: 'aprobado', modificado: 'modificado con cambios', rechazado: 'rechazado' }
    toast.success(`Pedido ${labels[nuevoEstado]} · Email enviado ✅`)
    cerrarEdicion()
    setGuardando(false)
    cargar()
  }

  const pedidosFiltrados = pedidos.filter(p => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    const nombre = (p.profiles?.razon_social || p.profiles?.full_name || '').toLowerCase()
    const email = (p.profiles?.email || '').toLowerCase()
    const id = p.id.slice(0, 8).toLowerCase()
    return nombre.includes(q) || email.includes(q) || id.includes(q)
  })

  if (!isAdmin) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Pedidos</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Gestioná los pedidos de los distribuidores</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, color: 'var(--text3)' }}>
          {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['todos', 'pendiente', 'aprobado', 'modificado', 'rechazado', 'finalizado'].map(f => (
            <button key={f} onClick={() => setFiltro(f)} style={{
              padding: '6px 14px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              background: filtro === f ? (STATUS_CONFIG[f]?.bg || 'var(--surface3)') : 'var(--surface2)',
              color: filtro === f ? (STATUS_CONFIG[f]?.color || 'var(--text)') : 'var(--text3)',
              border: filtro === f ? `1px solid ${STATUS_CONFIG[f]?.border || 'var(--border)'}` : '1px solid var(--border)',
            }}>
              {f === 'todos' ? 'Todos' : STATUS_CONFIG[f]?.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="🔍 Buscar distribuidor o ID..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ flex: 1, minWidth: 200, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando pedidos...</div>
      ) : pedidosFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No hay pedidos para mostrar.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {pedidosFiltrados.map(pedido => {
            const cfg = STATUS_CONFIG[pedido.estado] || STATUS_CONFIG.pendiente
            const dist = pedido.profiles
            const isEdit = editando === pedido.id
            const totalEdit = itemsEdit.reduce((s, i) => s + i.subtotal, 0)

            return (
              <div key={pedido.id} style={{ background: 'var(--surface)', border: `1px solid ${isEdit ? 'rgba(74,108,247,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '3px 8px', borderRadius: 4 }}>
                      #{pedido.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{cfg.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: '#7b9fff' }}>{formatPrecio(isEdit ? totalEdit : pedido.total)}</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(pedido.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Distribuidor */}
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(74,108,247,0.03)' }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,209,102,0.15)', border: '1px solid rgba(255,209,102,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🏪</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{dist?.razon_social || dist?.full_name || 'Sin nombre'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{dist?.email}</div>
                  </div>
                </div>

                {/* Items */}
                <div style={{ padding: '16px 20px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Detalle del pedido</div>

                  {isEdit ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {itemsEdit.map((item, idx) => (
                        <div key={idx} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600 }}>{item.nombre}</div>
                              <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.modelo}</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#7b9fff' }}>{formatPrecio(item.subtotal)}</div>
                              <button onClick={() => eliminarItem(idx)} style={{ background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)' }}>✕ Quitar</button>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {/* Descuento */}
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                                Descuento % {item.precio_base && item.precio_base !== item.precio_unitario && (
                                  <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                                    (base: {formatPrecio(item.precio_base)})
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input
                                  type="number" min="0" max="100" step="0.5"
                                  value={item.descuento_pct}
                                  onChange={e => actualizarDescuento(idx, e.target.value)}
                                  style={{ width: 64, textAlign: 'center', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
                                />
                                <span style={{ fontSize: 12, color: 'var(--text3)' }}>%</span>
                                <span style={{ fontSize: 12, color: 'var(--green)', marginLeft: 4 }}>{formatPrecio(item.precio_unitario)} c/u</span>
                              </div>
                            </div>
                            {/* Cantidad */}
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Cantidad</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button onClick={() => actualizarCantidad(idx, item.cantidad - 1)} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                <input
                                  type="number" min="0" value={item.cantidad}
                                  onChange={e => actualizarCantidad(idx, e.target.value)}
                                  style={{ width: 52, textAlign: 'center', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
                                />
                                <button onClick={() => actualizarCantidad(idx, item.cantidad + 1)} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* Botón agregar producto */}
                      <button onClick={() => setShowProductPicker(showProductPicker === pedido.id ? null : pedido.id)}
                        style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px dashed rgba(74,108,247,0.4)', borderRadius: 'var(--radius)', padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        + Agregar producto
                      </button>

                      {/* Picker de productos */}
                      {showProductPicker === pedido.id && (
                        <div style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>Seleccioná un producto para agregar</div>
                          {CATALOGO_ADMIN.map(cat => (
                            <div key={cat.categoria}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>{cat.emoji} {cat.label}</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                {cat.productos.map(prod => (
                                  <button key={prod.codigo} onClick={() => agregarProducto({ ...prod, categoria: cat.categoria })}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' }}>
                                    <div>
                                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{prod.nombre}</span>
                                      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>{prod.modelo}</span>
                                    </div>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: '#7b9fff' }}>{formatPrecio(prod.precio)}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'flex-end', fontWeight: 800, fontSize: 15, color: '#7b9fff', paddingTop: 4 }}>
                        Total: {formatPrecio(totalEdit)}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      {pedido.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: i < pedido.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>{item.nombre}</span>
                            <span style={{ color: 'var(--text3)', fontSize: 11, marginLeft: 8 }}>{item.modelo}</span>
                            {item.descuento_pct > 0 && (
                              <span style={{ fontSize: 10, marginLeft: 8, color: '#3dd68c', background: 'rgba(61,214,140,0.1)', padding: '1px 6px', borderRadius: 4 }}>{item.descuento_pct}% desc.</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <span style={{ color: 'var(--text3)' }}>x{item.cantidad} · {formatPrecio(item.precio_unitario)}</span>
                            <span style={{ fontWeight: 700 }}>{formatPrecio(item.subtotal)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Notas distribuidor */}
                  {pedido.notas && !isEdit && (
                    <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--text3)' }}>
                      <span style={{ fontWeight: 600 }}>Nota del distribuidor: </span>{pedido.notas}
                    </div>
                  )}

                  {/* Fecha entrega (vista) */}
                  {pedido.fecha_entrega && !isEdit && (
                    <div style={{ marginBottom: 10, padding: '8px 12px', background: 'rgba(61,214,140,0.06)', border: '1px solid rgba(61,214,140,0.25)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: '#3dd68c' }}>📅 Fecha de entrega: </span>{formatFecha(pedido.fecha_entrega)}
                    </div>
                  )}

                  {/* Nota admin (vista) */}
                  {!isEdit && pedido.notas_admin && (
                    <div style={{ marginBottom: 10, padding: '8px 12px', background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: '#7b9fff' }}>Nota TEMPTECH: </span>{pedido.notas_admin}
                    </div>
                  )}

                  {/* Edición: fecha + nota */}
                  {isEdit && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 14 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>📅 Fecha de entrega</label>
                        <input
                          type="date"
                          value={fechaEntrega}
                          onChange={e => setFechaEntrega(e.target.value)}
                          style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Nota para el distribuidor</label>
                        <textarea
                          value={notaAdmin}
                          onChange={e => setNotaAdmin(e.target.value)}
                          placeholder="Condiciones, aclaraciones, motivo de cambios..."
                          rows={2}
                          style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isEdit ? (
                    <>
                      <button onClick={() => confirmarPedido(pedido, 'aprobado')} disabled={guardando} style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        ✓ Aprobar
                      </button>
                      <button onClick={() => confirmarPedido(pedido, 'modificado')} disabled={guardando} style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        ✏️ Aprobar con cambios
                      </button>
                      <button onClick={() => confirmarPedido(pedido, 'rechazado')} disabled={guardando} style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        ✕ Rechazar
                      </button>
                      <button onClick={cerrarEdicion} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => abrirEdicion(pedido)} style={{ background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        Gestionar pedido
                      </button>
                      {(pedido.estado === 'aprobado' || pedido.estado === 'modificado') && (
                        <button
                          onClick={async () => {
                            const { error } = await supabase.from('pedidos').update({ estado: 'finalizado' }).eq('id', pedido.id)
                            if (error) toast.error('Error: ' + error.message); else { toast.success('Pedido finalizado ✅'); cargar() }
                          }}
                          style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                        >
                          ✓ Finalizado
                        </button>
                      )}
                      {confirmDelete === pedido.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, color: '#ff5577' }}>¿Confirmar eliminación?</span>
                          <button onClick={() => eliminarPedido(pedido.id)} style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 'var(--radius)', padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>Sí, eliminar</button>
                          <button onClick={() => setConfirmDelete(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>No</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDelete(pedido.id)} style={{ background: 'rgba(255,85,119,0.08)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                          🗑 Eliminar
                        </button>
                      )}
                    </>
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
