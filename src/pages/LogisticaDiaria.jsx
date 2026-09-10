import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import { CATEGORIAS_PROVEEDOR } from './Proveedores'
import toast from 'react-hot-toast'

const PRODUCTOS_LOG = [
  { codigo: 'C250STV1',    label: '250w' },
  { codigo: 'C250STV1TS',  label: 'B250' },
  { codigo: 'C500STV1',    label: '500w' },
  { codigo: 'C500STV1TS',  label: 'B500w' },
  { codigo: 'F1400BCO',    label: '1400w' },
  { codigo: 'KF70SIL',     label: 'KF70' },
  { codigo: 'FE150TBL',    label: 'FE150BI' },
  { codigo: 'FE150TBLACK', label: 'E150BLAC' },
  { codigo: 'FE150TSIL',   label: 'FE150SIL' },
  { codigo: 'FM318BL',     label: 'FM318' },
  { codigo: 'FM324BL',     label: 'FM324' },
  { codigo: 'BF14EBL',     label: 'BF14' },
  { codigo: 'BF323EBL',    label: 'BF23' },
]

const TIPOS = {
  entrega_pt:      { label: 'Entrega PT',        color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)',  emoji: '📦' },
  cambio_producto: { label: 'Cambio de Producto', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.35)',  emoji: '🔁' },
  cambio_garantia: { label: 'Cambio Garantía',   color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)',  emoji: '🔄' },
  retiro_insumos:  { label: 'Retiro Insumos',    color: '#7b9fff', bg: 'rgba(123,159,255,0.12)', border: 'rgba(123,159,255,0.35)', emoji: '📥' },
  retiro_service:  { label: 'Retiro Service',    color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)', emoji: '🔧' },
  retiro_items:    { label: 'Retiro de Items',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)', emoji: '📋' },
}

// Tipos que llevan lista de productos + datos de cliente
const TIPOS_CON_PRODUCTOS = ['entrega_pt', 'cambio_producto', 'cambio_garantia']

const ZONAS = ['Zona CABA 1', 'Zona CABA 2', 'Zona norte', 'Zona sur 1', 'Zona sur 2', 'Zona oeste', 'Zona GBA']

const EMPTY_FORM = {
  tipo: 'entrega_pt',
  nombre: '', direccion: '', localidad: '', zona: '',
  telefono: '', email: '', dni: '',
  descripcion: '', notas: '',
  productos: {},
  pedido_id: null,
  venta_id: null,
  proveedor_id: null,
  fecha: '',
}

const iSt = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)',
  fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
}
const lblSt = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }

function fmtFechaLarga(f) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

export default function LogisticaDiaria() {
  const { isAdmin, isAdmin2, isChofer, user, profile } = useAuth()
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [rutaItems, setRutaItems] = useState([])   // asignados a camioneta en la fecha
  const [porAsignar, setPorAsignar] = useState([]) // sin camioneta (tengan o no fecha)
  const [loading, setLoading] = useState(false)
  const [camionetas, setCamionetas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [choferes, setChoferes] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [guardando, setGuardando] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [pedidosPendientes, setPedidosPendientes] = useState([])
  const [ventasPendientes, setVentasPendientes] = useState([])
  const [choferInput, setChoferInput] = useState({})     // { camionetaId: nombre }
  const [asignar, setAsignar] = useState({})             // { itemId: { fecha, camioneta_id } }
  const [flotaOpen, setFlotaOpen] = useState(false)

  useEffect(() => { cargar() }, [fecha])

  async function cargar() {
    setLoading(true)

    const [cam, prov, chof] = await Promise.all([
      supabase.from('camionetas').select('*').eq('activa', true).order('nombre'),
      supabase.from('proveedores').select('id,nombre,categoria,telefono,direccion,localidad').order('nombre'),
      supabase.from('profiles').select('id,full_name').eq('role', 'chofer').order('full_name'),
    ])
    setCamionetas(cam.data || [])
    setProveedores(prov.data || [])
    setChoferes(chof.data || [])

    const [rutaData, pendData] = await Promise.all([
      fetchAllRows(() => supabase.from('logistica_diaria').select('*').eq('fecha', fecha).not('camioneta_id', 'is', null).order('camioneta_id').order('orden')),
      fetchAllRows(() => supabase.from('logistica_diaria').select('*').is('camioneta_id', null).order('created_at', { ascending: true })),
    ])
    setRutaItems(rutaData || [])
    setPorAsignar(pendData || [])

    // Pre-cargar chofer inputs por camioneta desde lo ya guardado
    const chIn = {}
    for (const it of (rutaData || [])) if (it.camioneta_id && it.chofer_asignado) chIn[it.camioneta_id] = it.chofer_asignado
    setChoferInput(chIn)

    // Pedidos / ventas por asignar (solo admin)
    if (!isChofer) {
      const [{ data: logAsign }, { data: pedidosData }, { data: ventasData }] = await Promise.all([
        supabase.from('logistica_diaria').select('pedido_id,venta_id'),
        supabase.from('pedidos').select('*').in('tipo_envio', ['correo', 'logistica']).in('estado', ['aprobado', 'preparando', 'modificado']).order('created_at', { ascending: false }),
        supabase.from('ventas').select('*').in('tipo_envio', ['correo', 'logistica']).not('estado', 'in', '("entregado","cancelado")').order('created_at', { ascending: false }),
      ])
      const asignadosPedidos = new Set((logAsign || []).map(l => l.pedido_id).filter(Boolean))
      const asignadosVentas = new Set((logAsign || []).map(l => l.venta_id).filter(Boolean))
      const pedidosFiltrados = (pedidosData || []).filter(p => !asignadosPedidos.has(p.id))
      if (pedidosFiltrados.length > 0) {
        const ids = [...new Set(pedidosFiltrados.map(p => p.distribuidor_id).filter(Boolean))]
        const { data: profsData } = await supabase.from('profiles').select('id,full_name,razon_social').in('id', ids)
        const profsMap = Object.fromEntries((profsData || []).map(p => [p.id, p]))
        setPedidosPendientes(pedidosFiltrados.map(p => ({ ...p, _profile: profsMap[p.distribuidor_id] || null })))
      } else setPedidosPendientes([])
      setVentasPendientes((ventasData || []).filter(v => !asignadosVentas.has(v.id)))
    }

    setLoading(false)
  }

  function abrirNuevo(tipo) { setForm({ ...EMPTY_FORM, tipo }); setEditId(null); setModalOpen(true) }

  function abrirEditar(item) {
    const productos = {}
    for (const p of (item.productos || [])) productos[p.codigo] = p.cantidad
    setForm({
      tipo: item.tipo, nombre: item.nombre || '', direccion: item.direccion || '', localidad: item.localidad || '',
      zona: item.zona || '', telefono: item.telefono || '', email: item.email || '', dni: item.dni || '',
      descripcion: item.descripcion || '', notas: item.notas || '', productos,
      pedido_id: item.pedido_id || null, venta_id: item.venta_id || null,
      proveedor_id: item.proveedor_id || null, fecha: item.fecha || '',
    })
    setEditId(item.id); setModalOpen(true)
  }

  function abrirDesdeVenta(venta) {
    const nombre = venta.cliente_nombre || venta.usuario_nombre || ''
    const productos = {}
    const codigosLog = new Set(PRODUCTOS_LOG.map(p => p.codigo))
    const fuente = (venta.tipo_envio === 'logistica' && (venta.envio_etiquetas || []).length > 0) ? venta.envio_etiquetas : venta.items || []
    for (const item of fuente) if (item.codigo && codigosLog.has(item.codigo) && item.cantidad > 0) productos[item.codigo] = (productos[item.codigo] || 0) + item.cantidad
    setForm({ ...EMPTY_FORM, tipo: 'entrega_pt', nombre, telefono: venta.cliente_telefono || '', email: venta.cliente_email || '', productos, venta_id: venta.id })
    setEditId(null); setModalOpen(true)
  }

  function abrirDesdePedido(pedido) {
    const nombre = pedido._profile?.razon_social || pedido._profile?.full_name || ''
    const productos = {}
    const codigosLog = new Set(PRODUCTOS_LOG.map(p => p.codigo))
    for (const item of (pedido.items || [])) if (item.codigo && codigosLog.has(item.codigo) && item.cantidad > 0) productos[item.codigo] = (productos[item.codigo] || 0) + item.cantidad
    setForm({ ...EMPTY_FORM, tipo: 'entrega_pt', nombre, productos, pedido_id: pedido.id })
    setEditId(null); setModalOpen(true)
  }

  function setProducto(codigo, val) {
    const n = parseInt(val) || 0
    setForm(prev => { const p = { ...prev.productos }; if (n > 0) p[codigo] = n; else delete p[codigo]; return { ...prev, productos: p } })
  }

  function onProveedorSelect(id) {
    const p = proveedores.find(x => x.id === id)
    if (!p) { setForm(prev => ({ ...prev, proveedor_id: null })); return }
    setForm(prev => ({
      ...prev, proveedor_id: id,
      nombre: prev.nombre || p.nombre,
      descripcion: prev.descripcion || `Retiro en ${p.nombre}`,
      direccion: prev.direccion || p.direccion || '',
      localidad: prev.localidad || p.localidad || '',
      telefono: prev.telefono || p.telefono || '',
    }))
  }

  async function guardar() {
    const conProductos = TIPOS_CON_PRODUCTOS.includes(form.tipo)
    const principal = conProductos ? form.nombre.trim() : (form.descripcion.trim() || form.nombre.trim())
    if (!principal) return toast.error(conProductos ? 'Ingresá el nombre' : 'Ingresá la descripción')

    const productosArr = PRODUCTOS_LOG.filter(p => (form.productos[p.codigo] || 0) > 0).map(p => ({ codigo: p.codigo, label: p.label, cantidad: form.productos[p.codigo] }))

    const payload = {
      tipo: form.tipo,
      fecha: form.fecha || null,
      nombre: form.nombre.trim() || null,
      direccion: form.direccion.trim() || null,
      localidad: form.localidad.trim() || null,
      zona: form.zona.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      dni: form.dni.trim() || null,
      descripcion: form.descripcion.trim() || null,
      notas: form.notas.trim() || null,
      productos: productosArr,
      pedido_id: form.pedido_id || null,
      venta_id: form.venta_id || null,
      proveedor_id: form.proveedor_id || null,
    }

    setGuardando(true)
    if (editId) {
      const { error } = await supabase.from('logistica_diaria').update(payload).eq('id', editId)
      if (error) { toast.error('Error: ' + error.message); setGuardando(false); return }
      toast.success('Actualizado ✅')
    } else {
      const { error } = await supabase.from('logistica_diaria').insert({ ...payload, orden: 0 })
      if (error) { toast.error('Error: ' + error.message); setGuardando(false); return }
      toast.success('Agregado a Por asignar ✅')
    }
    setGuardando(false); setModalOpen(false); setEditId(null); cargar()
  }

  // Asignar día + camioneta a una parada pendiente
  async function asignarRuta(item) {
    const a = asignar[item.id] || {}
    const camId = a.camioneta_id
    const f = a.fecha || item.fecha || fecha
    if (!camId) return toast.error('Elegí una camioneta')
    const maxOrden = rutaItems.filter(i => i.camioneta_id === camId).reduce((m, i) => Math.max(m, i.orden ?? 0), -1) + 1
    const { error } = await supabase.from('logistica_diaria').update({ camioneta_id: camId, fecha: f, orden: maxOrden }).eq('id', item.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Asignada a la ruta ✅')
    setAsignar(prev => { const n = { ...prev }; delete n[item.id]; return n })
    cargar()
  }

  async function desasignar(item) {
    const { error } = await supabase.from('logistica_diaria').update({ camioneta_id: null, chofer_asignado: null, chofer_id: null }).eq('id', item.id)
    if (error) { toast.error('Error: ' + error.message); return }
    cargar()
  }

  async function guardarChofer(camionetaId) {
    const nombre = (choferInput[camionetaId] || '').trim()
    const ids = rutaItems.filter(i => i.camioneta_id === camionetaId).map(i => i.id)
    if (!ids.length) return
    const { error } = await supabase.from('logistica_diaria').update({ chofer_asignado: nombre || null }).in('id', ids)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(nombre ? `Chofer asignado: ${nombre}` : 'Chofer quitado')
    cargar()
  }

  async function eliminar(id) { await supabase.from('logistica_diaria').delete().eq('id', id); setConfirmDel(null); cargar() }

  async function mover(item, dir, grupo) {
    const idx = grupo.findIndex(i => i.id === item.id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= grupo.length) return
    const a = grupo[idx], b = grupo[newIdx]
    await Promise.all([
      supabase.from('logistica_diaria').update({ orden: b.orden ?? newIdx }).eq('id', a.id),
      supabase.from('logistica_diaria').update({ orden: a.orden ?? idx }).eq('id', b.id),
    ])
    cargar()
  }

  async function confirmarEntrega(item) {
    const yaConfirmado = !!item.estado_entrega
    const payload = yaConfirmado
      ? { estado_entrega: null, entregado_at: null, chofer_nombre: null }
      : { estado_entrega: TIPOS_CON_PRODUCTOS.includes(item.tipo) ? 'entregado' : 'recibido', entregado_at: new Date().toISOString(), chofer_nombre: profile?.full_name || user?.email || 'Chofer' }
    const { error } = await supabase.from('logistica_diaria').update(payload).eq('id', item.id)
    if (error) { toast.error('Error: ' + error.message); return }
    cargar()
  }

  function imprimirRutaCamioneta(camNombre, chofer, grupo) {
    const fechaDisplay = fmtFechaLarga(fecha)
    const thSt = 'padding:5px 7px;background:#f3f4f6;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#6b7280;border:1px solid #d1d5db;white-space:nowrap;text-align:center'
    const tdSt = 'padding:5px 7px;font-size:10px;border:1px solid #d1d5db;vertical-align:top'
    const tdYellow = tdSt + ';background:#fefce8;text-align:center;font-weight:700'
    const tdCenter = tdSt + ';text-align:center'
    const YELLOW_CODES = ['C500STV1', 'F1400BCO']
    const headers = ['#', 'Tipo', 'Nombre / Descripción', 'Dirección', 'Localidad', 'Zona', 'Tel.', 'Camb.', ...PRODUCTOS_LOG.map(p => p.label), 'Notas', 'Recibió conforme', 'DNI', 'Email']
    const rows = grupo.map((item, i) => {
      const t = TIPOS[item.tipo]
      const esCambio = ['cambio_garantia', 'cambio_producto'].includes(item.tipo) ? '✓' : ''
      const prods = PRODUCTOS_LOG.map(p => { const f = (item.productos || []).find(x => x.codigo === p.codigo); return f ? f.cantidad : '' })
      return [i + 1, t?.label || item.tipo, item.nombre || item.descripcion || '', item.direccion || '', item.localidad || '', item.zona || '', item.telefono || '', esCambio, ...prods, item.notas || '', '', item.dni || '', item.email || '']
    })
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Ruta ${camNombre} — ${fechaDisplay}</title>
      <style>body{font-family:Arial,sans-serif;font-size:10px;color:#111;margin:0;padding:12px}h2{font-size:15px;margin:0 0 2px}.sub{font-size:11px;color:#374151;margin:0 0 12px}.sub b{color:#111}table{border-collapse:collapse;width:100%}@media print{body{padding:6px}@page{size:landscape;margin:1cm}}</style>
      </head><body>
      <h2>TEMPTECH — Ruta ${camNombre}</h2>
      <p class="sub">${fechaDisplay} &nbsp;·&nbsp; Chofer: <b>${chofer || '—'}</b> &nbsp;·&nbsp; ${grupo.length} parada${grupo.length !== 1 ? 's' : ''}</p>
      <table><thead><tr>${headers.map((h, hi) => { const isY = hi >= 8 && hi < 8 + PRODUCTOS_LOG.length && YELLOW_CODES.includes(PRODUCTOS_LOG[hi - 8]?.codigo); return `<th style="${thSt}${isY ? ';background:#fef08a' : ''}">${h}</th>` }).join('')}</tr></thead>
      <tbody>${rows.map(row => `<tr>${row.map((cell, ci) => { const isProd = ci >= 8 && ci < 8 + PRODUCTOS_LOG.length; const isY = isProd && YELLOW_CODES.includes(PRODUCTOS_LOG[ci - 8]?.codigo); const style = isY ? tdYellow : (isProd || ci === 7) ? tdCenter : tdSt; return `<td style="${style}">${cell !== '' ? cell : '&nbsp;'}</td>` }).join('')}</tr>`).join('')}</tbody></table>
      </body></html>`
    const w = window.open('', '_blank', 'width=1400,height=800')
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 350)
  }

  if (!isAdmin && !isAdmin2 && !isChofer) return null

  const conProductos = TIPOS_CON_PRODUCTOS.includes(form.tipo)
  const esInsumos = form.tipo === 'retiro_insumos'

  // Agrupar ruta por camioneta
  const grupos = camionetas
    .map(c => ({ camioneta: c, items: rutaItems.filter(i => i.camioneta_id === c.id) }))
    .filter(g => g.items.length > 0)
  // Paradas asignadas a una camioneta que ya no está en la lista activa
  const idsActivas = new Set(camionetas.map(c => c.id))
  const huerfanas = rutaItems.filter(i => !idsActivas.has(i.camioneta_id))

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Logística Diaria</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>
            {isChofer ? 'Confirmá cada parada a medida que la completás' : 'Cargá tareas, armá el recorrido por camioneta y asigná el chofer'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }} />
          {!isChofer && (
            <button onClick={() => setFlotaOpen(true)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              🚐 Camionetas
            </button>
          )}
        </div>
      </div>

      {/* Botones de tipo — solo admin */}
      {!isChofer && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {Object.entries(TIPOS).map(([key, t]) => (
            <button key={key} onClick={() => abrirNuevo(key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: t.bg, color: t.color, border: `1px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
              {t.emoji} + {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Pedidos / ventas por traer a ruta — solo admin */}
      {!isChofer && (pedidosPendientes.length > 0 || ventasPendientes.length > 0) && (
        <div style={{ marginBottom: 24, background: 'rgba(74,108,247,0.04)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7b9fff', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>
            🚚 Traer a logística ({pedidosPendientes.length + ventasPendientes.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pedidosPendientes.map(pedido => {
              const nombre = pedido._profile?.razon_social || pedido._profile?.full_name || pedido.distribuidor_id?.slice(0, 8)
              return (
                <div key={pedido.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '2px 7px', borderRadius: 4 }}>#{pedido.id.slice(0, 8).toUpperCase()}</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{nombre}</span>
                      <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 10 }}>Distribuidor</span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {(pedido.items || []).map((item, i) => (
                        <span key={i} style={{ background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.25)', color: '#3dd68c', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{item.codigo} ×{item.cantidad}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => abrirDesdePedido(pedido)} style={{ background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', flexShrink: 0 }}>➕ Traer</button>
                </div>
              )
            })}
            {ventasPendientes.map(venta => {
              const CANAL_LABEL = { meli: 'Mercado Libre', vo: 'Venta VO', pagina: 'Página Web' }
              const nombreVenta = venta.cliente_nombre || venta.usuario_nombre || '—'
              const itemsVenta = (venta.tipo_envio === 'logistica' && (venta.envio_etiquetas || []).length > 0) ? venta.envio_etiquetas : venta.items || []
              return (
                <div key={venta.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '2px 7px', borderRadius: 4 }}>#{venta.id.slice(0, 8).toUpperCase()}</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{nombreVenta}</span>
                      {venta.canal && <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 10 }}>{CANAL_LABEL[venta.canal] || venta.canal}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {itemsVenta.map((item, i) => (
                        <span key={i} style={{ background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.25)', color: '#3dd68c', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{item.codigo || item.nombre} ×{item.cantidad}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => abrirDesdeVenta(venta)} style={{ background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', flexShrink: 0 }}>➕ Traer</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── POR ASIGNAR ── */}
      {!isChofer && porAsignar.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            📥 Por asignar <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1px 9px' }}>{porAsignar.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {porAsignar.map(item => {
              const t = TIPOS[item.tipo]
              const prodsCon = (item.productos || []).filter(p => p.cantidad > 0)
              const a = asignar[item.id] || {}
              const isDel = confirmDel === item.id
              return (
                <div key={item.id} style={{ background: 'var(--surface)', border: `1px solid ${isDel ? 'rgba(255,85,119,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ background: t?.bg, color: t?.color, border: `1px solid ${t?.border}`, fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{t?.emoji} {t?.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{item.nombre || item.descripcion}</span>
                        {item.fecha && <span style={{ fontSize: 10, fontWeight: 700, color: '#fb923c', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', padding: '1px 8px', borderRadius: 10 }}>📅 {item.fecha.slice(8,10)}/{item.fecha.slice(5,7)}</span>}
                        {(item.pedido_id || item.venta_id || item.devolucion_id) && <span style={{ fontSize: 9, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', border: '1px solid rgba(74,108,247,0.25)', padding: '1px 7px', borderRadius: 10 }}>vinculado</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text3)' }}>
                        {item.direccion && <span>📍 {item.direccion}{item.localidad ? `, ${item.localidad}` : ''}</span>}
                        {item.zona && <span style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '1px 8px', borderRadius: 12, color: 'var(--text2)', fontWeight: 600 }}>{item.zona}</span>}
                        {item.telefono && <span>📞 {item.telefono}</span>}
                      </div>
                      {item.descripcion && item.nombre && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>📝 {item.descripcion}</div>}
                      {prodsCon.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          {prodsCon.map(p => <span key={p.codigo} style={{ background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', color: '#3dd68c', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{p.label} ×{p.cantidad}</span>)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button onClick={() => abrirEditar(item)} style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️</button>
                      {isDel ? (
                        <>
                          <button onClick={() => eliminar(item.id)} style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Eliminar</button>
                          <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>No</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDel(item.id)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
                      )}
                    </div>
                  </div>
                  {/* Asignar día + camioneta */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <input type="date" value={a.fecha ?? (item.fecha || fecha)} onChange={e => setAsignar(prev => ({ ...prev, [item.id]: { ...prev[item.id], fecha: e.target.value } }))}
                      style={{ ...iSt, width: 'auto' }} />
                    <select value={a.camioneta_id || ''} onChange={e => setAsignar(prev => ({ ...prev, [item.id]: { ...prev[item.id], camioneta_id: e.target.value || null } }))}
                      style={{ ...iSt, width: 'auto', cursor: 'pointer' }}>
                      <option value="">— Camioneta —</option>
                      {camionetas.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.patente ? ` (${c.patente})` : ''}</option>)}
                    </select>
                    <button onClick={() => asignarRuta(item)} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Asignar a ruta →</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── RUTAS POR CAMIONETA (fecha seleccionada) ── */}
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        🚐 Rutas del {fmtFechaLarga(fecha)}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
      ) : grupos.length === 0 && huerfanas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🚚</div>
          {isChofer ? 'No hay rutas asignadas para esta fecha.' : 'Todavía no asignaste paradas a ninguna camioneta para este día.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {grupos.map(({ camioneta, items: grupo }) => {
            const completadas = grupo.filter(i => i.estado_entrega).length
            const chofer = choferInput[camioneta.id] ?? ''
            return (
              <div key={camioneta.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                {/* Cabecera camioneta */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>🚐 {camioneta.nombre}</span>
                    {camioneta.patente && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>{camioneta.patente}</span>}
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{grupo.length} parada{grupo.length !== 1 ? 's' : ''} · {completadas}/{grupo.length} ok</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {isChofer ? (
                      chofer && <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700 }}>👤 {chofer}</span>
                    ) : (
                      <>
                        <input list="choferes-list" value={chofer} onChange={e => setChoferInput(prev => ({ ...prev, [camioneta.id]: e.target.value }))} placeholder="Chofer..."
                          style={{ ...iSt, width: 150, padding: '6px 10px' }} />
                        <button onClick={() => guardarChofer(camioneta.id)} style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.4)', borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Asignar chofer</button>
                        <button onClick={() => imprimirRutaCamioneta(camioneta.nombre, chofer, grupo)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>🖨️ Hoja</button>
                      </>
                    )}
                  </div>
                </div>
                {/* Paradas */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {grupo.map((item, idx) => (
                    <ParadaRow key={item.id} item={item} idx={idx} grupo={grupo} isChofer={isChofer}
                      onMover={mover} onEditar={abrirEditar} onConfirmar={confirmarEntrega} onDesasignar={desasignar}
                      confirmDel={confirmDel} setConfirmDel={setConfirmDel} onEliminar={eliminar} />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Huérfanas: asignadas a camioneta inactiva/borrada */}
          {huerfanas.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,209,102,0.35)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'rgba(255,209,102,0.08)', fontSize: 13, fontWeight: 700, color: '#ffd166' }}>
                ⚠️ Asignadas a una camioneta inactiva ({huerfanas.length}) — reasignalas
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {huerfanas.map((item, idx) => (
                  <ParadaRow key={item.id} item={item} idx={idx} grupo={huerfanas} isChofer={isChofer}
                    onMover={mover} onEditar={abrirEditar} onConfirmar={confirmarEntrega} onDesasignar={desasignar}
                    confirmDel={confirmDel} setConfirmDel={setConfirmDel} onEliminar={eliminar} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <datalist id="choferes-list">
        {choferes.map(c => <option key={c.id} value={c.full_name} />)}
      </datalist>

      {/* ── MODAL alta/edición de parada ── */}
      {!isChofer && modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{editId ? 'Editar parada' : 'Nueva tarea de logística'}</div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Tipo */}
              <div>
                <label style={lblSt}>Tipo *</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(TIPOS).map(([key, t]) => (
                    <button key={key} onClick={() => setForm(prev => ({ ...prev, tipo: key }))}
                      style={{ padding: '6px 12px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', background: form.tipo === key ? t.bg : 'var(--surface2)', color: form.tipo === key ? t.color : 'var(--text3)', border: form.tipo === key ? `1px solid ${t.border}` : '1px solid var(--border)' }}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Proveedor (solo retiro de insumos) */}
              {esInsumos && (
                <div>
                  <label style={lblSt}>Proveedor</label>
                  <select value={form.proveedor_id || ''} onChange={e => onProveedorSelect(e.target.value || null)} style={{ ...iSt, cursor: 'pointer' }}>
                    <option value="">— Elegir proveedor (autocompleta datos) —</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{(CATEGORIAS_PROVEEDOR[p.categoria]?.emoji || '')} {p.nombre}</option>)}
                  </select>
                </div>
              )}

              {/* Nombre / Descripción */}
              <div>
                <label style={lblSt}>{conProductos ? 'Nombre / Razón Social *' : 'Descripción *'}</label>
                <input value={conProductos ? form.nombre : form.descripcion}
                  onChange={e => setForm(prev => conProductos ? { ...prev, nombre: e.target.value } : { ...prev, descripcion: e.target.value })}
                  placeholder={conProductos ? 'Ej: Juan García / Bella Tienda SA' : 'Ej: Retirar chiller / Retirar silicona x2'} style={iSt} />
              </div>

              {/* Detalle / producto del caso (editable también en tipos con productos) */}
              {conProductos && (
                <div>
                  <label style={lblSt}>Detalle / producto del caso (opcional)</label>
                  <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                    placeholder="Ej: Panel Calefactor Slim 500w — No calienta" style={iSt} />
                </div>
              )}

              {/* Dirección + Localidad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lblSt}>Dirección</label><input value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} placeholder="Ej: Av. Rivadavia 1234" style={iSt} /></div>
                <div><label style={lblSt}>Localidad</label><input value={form.localidad} onChange={e => setForm(p => ({ ...p, localidad: e.target.value }))} placeholder="Ej: CABA" style={iSt} /></div>
              </div>

              {/* Zona + Teléfono */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lblSt}>Zona</label>
                  <input list="zonas-list" value={form.zona} onChange={e => setForm(p => ({ ...p, zona: e.target.value }))} placeholder="Ej: Zona CABA 1" style={iSt} />
                  <datalist id="zonas-list">{ZONAS.map(z => <option key={z} value={z} />)}</datalist>
                </div>
                <div><label style={lblSt}>Teléfono</label><input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="Ej: 1145573014" style={iSt} /></div>
              </div>

              {/* DNI + Email (solo con productos) */}
              {conProductos && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={lblSt}>DNI</label><input value={form.dni} onChange={e => setForm(p => ({ ...p, dni: e.target.value }))} placeholder="Ej: 30456789" style={iSt} /></div>
                  <div><label style={lblSt}>Email</label><input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Ej: cliente@mail.com" style={iSt} /></div>
                </div>
              )}

              {/* Fecha sugerida (opcional) */}
              <div>
                <label style={lblSt}>Fecha sugerida (opcional)</label>
                <input type="date" value={form.fecha || ''} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={{ ...iSt, width: 'auto' }} />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Si la dejás vacía, queda en "Por asignar" sin fecha.</div>
              </div>

              {/* Productos */}
              {conProductos && (
                <div>
                  <label style={lblSt}>Productos</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: 8 }}>
                    {PRODUCTOS_LOG.map(p => {
                      const qty = form.productos[p.codigo] || 0
                      return (
                        <div key={p.codigo} style={{ background: 'var(--surface2)', border: `1px solid ${qty > 0 ? 'rgba(61,214,140,0.45)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: qty > 0 ? '#3dd68c' : 'var(--text2)' }}>{p.label}</div>
                          <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'monospace' }}>{p.codigo}</div>
                          <input type="number" min="0" value={qty || ''} onChange={e => setProducto(p.codigo, e.target.value)} placeholder="0"
                            style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 6px', color: 'var(--text)', fontSize: 14, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Notas */}
              <div>
                <label style={lblSt}>Notas (opcional)</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2} placeholder="Observaciones, instrucciones especiales..." style={{ ...iSt, resize: 'vertical', lineHeight: 1.5 }} />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <button onClick={guardar} disabled={guardando} style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {guardando ? 'Guardando...' : editId ? '✓ Guardar cambios' : '✓ Agregar'}
                </button>
                <button onClick={() => setModalOpen(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL flota (camionetas) ── */}
      {!isChofer && flotaOpen && <FlotaModal camionetas={camionetas} onClose={() => setFlotaOpen(false)} onChange={cargar} />}
    </div>
  )
}

// ── Fila de parada (dentro de una ruta) ──
function ParadaRow({ item, idx, grupo, isChofer, onMover, onEditar, onConfirmar, onDesasignar, confirmDel, setConfirmDel, onEliminar }) {
  const t = TIPOS[item.tipo]
  const prodsCon = (item.productos || []).filter(p => p.cantidad > 0)
  const isDel = confirmDel === item.id
  return (
    <div style={{ display: 'flex', borderTop: idx > 0 ? '1px solid var(--border)' : 'none', background: item.estado_entrega ? 'rgba(61,214,140,0.04)' : 'transparent' }}>
      <div style={{ width: 40, background: item.estado_entrega ? 'rgba(61,214,140,0.12)' : 'var(--surface2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, flexShrink: 0, padding: '8px 0' }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: item.estado_entrega ? '#3dd68c' : 'var(--text3)' }}>{idx + 1}</span>
        {!isChofer && (
          <>
            <button onClick={() => onMover(item, -1, grupo)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? 'var(--border)' : 'var(--text3)', fontSize: 11, padding: 0, lineHeight: 1 }}>▲</button>
            <button onClick={() => onMover(item, 1, grupo)} disabled={idx === grupo.length - 1} style={{ background: 'none', border: 'none', cursor: idx === grupo.length - 1 ? 'default' : 'pointer', color: idx === grupo.length - 1 ? 'var(--border)' : 'var(--text3)', fontSize: 11, padding: 0, lineHeight: 1 }}>▼</button>
          </>
        )}
      </div>
      <div style={{ flex: 1, padding: '12px 16px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ background: t?.bg, color: t?.color, border: `1px solid ${t?.border}`, fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{t?.emoji} {t?.label}</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{item.nombre || item.descripcion}</span>
            {item.estado_entrega && <span style={{ fontSize: 10, fontWeight: 700, color: '#3dd68c', background: 'rgba(61,214,140,0.12)', border: '1px solid rgba(61,214,140,0.35)', padding: '2px 10px', borderRadius: 20 }}>{item.estado_entrega === 'entregado' ? '✅ Entregado' : '📥 Recibido'}{item.chofer_nombre ? ` · ${item.chofer_nombre}` : ''}</span>}
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {isChofer ? (
              <button onClick={() => onConfirmar(item)} style={{ background: item.estado_entrega ? 'rgba(255,85,119,0.08)' : 'rgba(61,214,140,0.12)', color: item.estado_entrega ? '#ff5577' : '#3dd68c', border: `1px solid ${item.estado_entrega ? 'rgba(255,85,119,0.35)' : 'rgba(61,214,140,0.4)'}`, borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                {item.estado_entrega ? '↩ Deshacer' : (TIPOS_CON_PRODUCTOS.includes(item.tipo) ? '✅ Entregado' : '📥 Recibido')}
              </button>
            ) : (
              <>
                <button onClick={() => onEditar(item)} style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️</button>
                <button onClick={() => onDesasignar(item)} title="Volver a Por asignar" style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>↩ Quitar</button>
                {isDel ? (
                  <>
                    <button onClick={() => onEliminar(item.id)} style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Eliminar</button>
                    <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>No</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDel(item.id)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
                )}
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text3)' }}>
          {item.direccion && <span>📍 {item.direccion}{item.localidad ? `, ${item.localidad}` : ''}</span>}
          {item.zona && <span style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '1px 8px', borderRadius: 12, color: 'var(--text2)', fontWeight: 600 }}>{item.zona}</span>}
          {item.telefono && <span>📞 {item.telefono}</span>}
          {item.dni && <span style={{ color: 'var(--text2)' }}>DNI: {item.dni}</span>}
        </div>
        {item.descripcion && item.nombre && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>📝 {item.descripcion}</div>}
        {prodsCon.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {prodsCon.map(p => <span key={p.codigo} style={{ background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', color: '#3dd68c', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{p.label} ×{p.cantidad}</span>)}
          </div>
        )}
        {item.notas && <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginTop: 6 }}>💬 {item.notas}</div>}
      </div>
    </div>
  )
}

// ── Modal de gestión de camionetas ──
function FlotaModal({ camionetas, onClose, onChange }) {
  const [nombre, setNombre] = useState('')
  const [patente, setPatente] = useState('')
  const [modelo, setModelo] = useState('')
  const [guardando, setGuardando] = useState(false)

  async function agregar() {
    if (!nombre.trim()) return toast.error('Ingresá un nombre')
    setGuardando(true)
    const { error } = await supabase.from('camionetas').insert({ nombre: nombre.trim(), patente: patente.trim() || null, modelo: modelo.trim() || null })
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    setNombre(''); setPatente(''); setModelo(''); onChange()
  }
  async function toggleActiva(c) { await supabase.from('camionetas').update({ activa: !c.activa }).eq('id', c.id); onChange() }
  async function eliminar(c) { await supabase.from('camionetas').delete().eq('id', c.id); onChange() }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>🚐 Camionetas</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {camionetas.length === 0 && <div style={{ fontSize: 13, color: 'var(--text3)' }}>Todavía no hay camionetas. Agregá la primera.</div>}
            {camionetas.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{c.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{[c.modelo, c.patente].filter(Boolean).join(' · ') || '—'}</div>
                </div>
                <button onClick={() => toggleActiva(c)} style={{ background: c.activa ? 'rgba(61,214,140,0.12)' : 'var(--surface)', color: c.activa ? '#3dd68c' : 'var(--text3)', border: `1px solid ${c.activa ? 'rgba(61,214,140,0.35)' : 'var(--border)'}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>{c.activa ? 'Activa' : 'Inactiva'}</button>
                <button onClick={() => eliminar(c)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Agregar camioneta</div>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre (ej: Camioneta 1)" style={iSt} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Modelo (ej: Kangoo)" style={iSt} />
              <input value={patente} onChange={e => setPatente(e.target.value)} placeholder="Patente" style={iSt} />
            </div>
            <button onClick={agregar} disabled={guardando} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '9px', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>➕ Agregar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
