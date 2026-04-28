import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const IMG = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagenes%20productos/'

const CATEGORIAS_META = {
  calefones_calderas:  { label: 'Calefones / Calderas',  emoji: '🚿' },
  paneles_calefactores:{ label: 'Paneles Calefactores',  emoji: '🔆' },
  anafes:              { label: 'Anafes',                emoji: '🔥' },
}

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
      { codigo: 'C500STV1MB',   nombre: 'Panel Calefactor Slim',          modelo: '500w Madera Blanca',              precio: 59430 },
      { codigo: 'F1400BCO',     nombre: 'Panel Calefactor Firenze',       modelo: '1400w Blanco',                    precio: 78592.53 },
      { codigo: 'F1400MB',      nombre: 'Panel Calefactor Firenze',       modelo: '1400w Madera Blanca',             precio: 78990 },
      { codigo: 'F1400MV',      nombre: 'Panel Calefactor Firenze',       modelo: '1400w Madera Veteada',            precio: 78592.53 },
      { codigo: 'F1400PA',      nombre: 'Panel Calefactor Firenze',       modelo: '1400w Piedra Azteca',             precio: 78592.53 },
      { codigo: 'F1400PR',      nombre: 'Panel Calefactor Firenze',       modelo: '1400w Piedra Romana',             precio: 78592.53 },
      { codigo: 'F1400MTG',     nombre: 'Panel Calefactor Firenze',       modelo: '1400w Mármol Traviatta Gris',     precio: 78592.53 },
      { codigo: 'F1400PCL',     nombre: 'Panel Calefactor Firenze',       modelo: '1400w Piedra Cantera Luna',       precio: 78592.53 },
      { codigo: 'F1400MCO',     nombre: 'Panel Calefactor Firenze',       modelo: '1400w Mármol Calacatta Ocre',     precio: 78592.53 },
      { codigo: 'F1400SMARTBL', nombre: 'Panel Calefactor Firenze Smart', modelo: '1400w Smart Wifi - App Temptech', precio: 157190.67 },
    ],
  },
  {
    categoria: 'anafes', label: 'Anafes', emoji: '🔥',
    productos: [
      { codigo: 'K40010', nombre: 'Anafe Inducción + Extractor',  modelo: '4 Hornallas Touch', precio: 468818.67 },
      { codigo: 'K40011', nombre: 'Anafe Inducción + Extractor',  modelo: '4 Hornallas Knob',  precio: 468818.67 },
      { codigo: 'DT4',    nombre: 'Anafe Infrarrojo + Extractor', modelo: '4 Hornallas Touch', precio: 424768.60 },
      { codigo: 'DT4W',   nombre: 'Anafe Infrarrojo + Extractor', modelo: '4 Hornallas Knob',  precio: 424768.60 },
      { codigo: 'K1002',  nombre: 'Anafe Inducción',              modelo: '2 Hornallas Touch', precio: 137184.52 },
      { codigo: 'K2002',  nombre: 'Anafe Infrarrojo',             modelo: '2 Hornallas Touch', precio: 125857.36 },
      { codigo: 'DT4-1',  nombre: 'Anafe Inducción',              modelo: '4 Hornallas Touch', precio: 245421.86 },
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
  pendiente:        { label: 'Pendiente',        color: '#ffd166', bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.35)' },
  aprobado:         { label: 'Aprobado',         color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)' },
  modificado:       { label: 'Modificado',       color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)' },
  preparando:       { label: 'Preparando',       color: '#ffd166', bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.35)' },
  enviado:          { label: 'Enviado',          color: '#34d399', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.35)' },
  rechazado:        { label: 'Rechazado',        color: '#ff5577', bg: 'rgba(255,85,119,0.12)',  border: 'rgba(255,85,119,0.35)' },
  finalizado:       { label: 'Finalizado',       color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)' },
  entregado:        { label: 'Entregado',        color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.35)' },
  pendiente_pago:   { label: 'Pendiente Pago',   color: '#ff5577', bg: 'rgba(255,85,119,0.12)',  border: 'rgba(255,85,119,0.35)' },
}

export default function AdminPedidos() {
  const { isAdmin, isAdmin2, isVendedor, user, profile } = useAuth()
  const [vista, setVista] = useState('lista')          // 'lista' | 'nuevo'
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendiente')
  const [busqueda, setBusqueda] = useState('')
  const [filtroFecha, setFiltroFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [editando, setEditando] = useState(null)
  const [itemsEdit, setItemsEdit] = useState([])
  const [notaAdmin, setNotaAdmin] = useState('')
  const [fechaEntrega, setFechaEntrega] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [showProductPicker, setShowProductPicker] = useState(false)
  const [incluirIVAEdit, setIncluirIVAEdit] = useState(false)
  const [esActualizacionPrecios, setEsActualizacionPrecios] = useState(false)

  // Datos internos (remito, notas internas, factura) — editables sin gestionar el pedido
  const [editingInternals, setEditingInternals] = useState(null) // pedido.id
  const [internalsForm, setInternalsForm] = useState({ nro_remito: '', notas_internas: '' })
  const [guardandoInternals, setGuardandoInternals] = useState(false)
  const [subiendoFactura, setSubiendoFactura] = useState(null)  // pedido.id
  const [subiendoPago, setSubiendoPago] = useState(null)  // pedido.id
  const [subiendoRemito, setSubiendoRemito] = useState(null)  // pedido.id

  // Catálogo desde DB
  const [catalogoDB, setCatalogoDB] = useState([])

  // Nuevo pedido (admin crea en nombre de distribuidor)
  const [distribuidores, setDistribuidores] = useState([])
  const [npDistId, setNpDistId] = useState('')
  const [npDistBusqueda, setNpDistBusqueda] = useState('')
  const [npDistSeleccionado, setNpDistSeleccionado] = useState(null)
  const [npShowDistDrop, setNpShowDistDrop] = useState(false)
  const [npItems, setNpItems] = useState([])           // [{ codigo, nombre, modelo, categoria, precio_base, precio_unitario, descuento_pct, cantidad, subtotal }]
  const [npNotas, setNpNotas] = useState('')
  const [npFecha, setNpFecha] = useState('')
  const [npIVA, setNpIVA] = useState(false)
  const [npEstado, setNpEstado] = useState('pendiente') // 'pendiente' | 'aprobado'
  const [npAplicarDesc, setNpAplicarDesc] = useState(true)
  const [creando, setCreando] = useState(false)

  const IVA_PCT = 0.21

  useEffect(() => { if (isAdmin2) setFiltro('todos') }, [isAdmin2])

  useEffect(() => {
    if (isAdmin) { cargar(); cargarDistribuidores(); cargarCatalogo() }
    else if (isVendedor && user) { cargar(); cargarDistribuidoresVendedor(); cargarCatalogo() }
    else if (isAdmin2) { cargar() }
  }, [isAdmin, isAdmin2, isVendedor, filtro, user])

  // Realtime: recargar cuando un distribuidor actualiza su pedido (ej: sube comprobante)
  useEffect(() => {
    if (!isAdmin && !isVendedor && !isAdmin2) return
    const channel = supabase
      .channel('pedidos-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pedidos' }, () => { cargar() })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [isAdmin, isAdmin2, isVendedor])


  async function cargar() {
    setLoading(true)
    let q = supabase
      .from('pedidos')
      .select('*, profiles!distribuidor_id(full_name, email, razon_social)')
      .order('fecha_entrega', { ascending: true })
    if (isAdmin2) {
      const admin2Estados = ['pendiente', 'aprobado', 'preparando', 'enviado']
      if (admin2Estados.includes(filtro)) q = q.eq('estado', filtro)
      else q = q.in('estado', admin2Estados)
    }
    else if (filtro === 'pendiente_pago') q = q.eq('estado', 'aprobado')
    else if (filtro !== 'todos') q = q.eq('estado', filtro)

    if (isVendedor && user) {
      // Pedidos de clientes asignados a este vendedor O creados directamente por él
      const { data: clientes } = await supabase
        .from('profiles')
        .select('id')
        .eq('vendedor_id', user.id)
      const ids = (clientes || []).map(c => c.id)
      if (ids.length > 0) {
        q = q.or(`distribuidor_id.in.(${ids.join(',')}),vendedor_id.eq.${user.id}`)
      } else {
        q = q.eq('vendedor_id', user.id)
      }
    }

    const { data, error } = await q
    if (error) toast.error('Error al cargar pedidos')
    else {
      const result = data || []
      const final = filtro === 'pendiente_pago'
        ? result.filter(p => p.tipo !== 'preventa' && !p.pago_archivos?.length)
        : result
      setPedidos(final)
      // Si no hay pedidos para hoy, avanzar a mañana automáticamente
      setFiltroFecha(prev => {
        const hoy = new Date().toISOString().split('T')[0]
        if (prev === hoy && !final.some(p => p.fecha_entrega === hoy)) {
          const manana = new Date(); manana.setDate(manana.getDate() + 1)
          return manana.toISOString().split('T')[0]
        }
        return prev
      })
    }
    setLoading(false)
  }

  async function cargarCatalogo() {
    const { data } = await supabase.from('precios').select('*').order('categoria').order('nombre')
    if (!data) return
    const grupos = {}
    data.forEach(p => {
      if (!grupos[p.categoria]) grupos[p.categoria] = []
      grupos[p.categoria].push(p)
    })
    const cat = Object.entries(grupos).map(([categoria, productos]) => ({
      categoria,
      label: CATEGORIAS_META[categoria]?.label || categoria,
      emoji: CATEGORIAS_META[categoria]?.emoji || '📦',
      productos,
    }))
    setCatalogoDB(cat)
  }

  async function cargarDistribuidores() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, razon_social, email, descuentos')
      .eq('user_type', 'distributor')
      .order('razon_social')
    setDistribuidores(data || [])
  }

  async function cargarDistribuidoresVendedor() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, razon_social, email, descuentos')
      .eq('user_type', 'distributor')
      .eq('vendedor_id', user.id)
      .order('razon_social')
    setDistribuidores(data || [])
  }

  function calcDescPct(descValue) {
    if (!descValue || descValue === 0) return 0
    if (Array.isArray(descValue)) {
      const factor = descValue.reduce((f, d) => f * (1 - (parseFloat(d) || 0) / 100), 1)
      return (1 - factor) * 100
    }
    return parseFloat(descValue) || 0
  }

  function npAgregarProducto(prod) {
    const dist = distribuidores.find(d => d.id === npDistId)
    const descPct = npAplicarDesc ? calcDescPct(dist?.descuentos?.[prod.categoria]) : 0
    const precioUnit = prod.precio * (1 - descPct / 100)
    const idx = npItems.findIndex(i => i.codigo === prod.codigo)
    if (idx !== -1) {
      setNpItems(prev => prev.map((item, i) => {
        if (i !== idx) return item
        const cant = item.cantidad + 1
        return { ...item, cantidad: cant, subtotal: item.precio_unitario * cant }
      }))
    } else {
      setNpItems(prev => [...prev, {
        codigo: prod.codigo, nombre: prod.nombre, modelo: prod.modelo,
        categoria: prod.categoria, precio_base: prod.precio,
        precio_unitario: precioUnit, descuento_pct: descPct,
        cantidad: 1, subtotal: precioUnit,
      }])
    }
  }

  function npActualizarDescuento(idx, val) {
    const pct = Math.max(0, Math.min(100, parseFloat(val) || 0))
    setNpItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const precioUnit = item.precio_base * (1 - pct / 100)
      return { ...item, descuento_pct: pct, precio_unitario: precioUnit, subtotal: precioUnit * item.cantidad }
    }))
  }

  function npActualizarCantidad(idx, val) {
    const n = Math.max(0, parseInt(val) || 0)
    setNpItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      return { ...item, cantidad: n, subtotal: item.precio_unitario * n }
    }))
  }

  function npQuitarItem(idx) {
    setNpItems(prev => prev.filter((_, i) => i !== idx))
  }

  function npToggleDescuento(aplicar) {
    setNpAplicarDesc(aplicar)
    const dist = distribuidores.find(d => d.id === npDistId)
    setNpItems(prev => prev.map(item => {
      const descPct = aplicar ? calcDescPct(dist?.descuentos?.[item.categoria]) : 0
      const precioUnit = item.precio_base * (1 - descPct / 100)
      return { ...item, descuento_pct: descPct, precio_unitario: precioUnit, subtotal: precioUnit * item.cantidad }
    }))
  }

  function npReset() {
    setNpDistId(''); setNpDistSeleccionado(null); setNpDistBusqueda('')
    setNpItems([]); setNpNotas(''); setNpFecha('')
    setNpIVA(false); setNpEstado('pendiente'); setNpAplicarDesc(true)
  }

  async function crearPedido() {
    if (!npDistId) { toast.error('Seleccioná un distribuidor'); return }
    const itemsValidos = npItems.filter(i => i.cantidad > 0)
    if (itemsValidos.length === 0) { toast.error('Agregá al menos un producto'); return }
    const totalNeto = itemsValidos.reduce((s, i) => s + i.subtotal, 0)
    const ivaMonto = npIVA ? totalNeto * IVA_PCT : 0
    const totalFinal = totalNeto + ivaMonto
    setCreando(true)
    const { error } = await supabase.from('pedidos').insert({
      distribuidor_id: npDistId,
      estado: isAdmin ? npEstado : 'pendiente',
      tipo: 'normal',
      items: itemsValidos,
      total: totalFinal,
      iva_monto: ivaMonto,
      incluir_iva: npIVA,
      notas_admin: npNotas.trim() || null,
      fecha_entrega: npFecha || null,
      ...(isVendedor && { vendedor_id: user.id }),
    })
    if (error) { toast.error('Error al crear el pedido: ' + error.message); setCreando(false); return }
    const estadoCreado = isAdmin ? npEstado : 'pendiente'
    toast.success('Pedido creado ✅')
    npReset()
    setCreando(false)
    setVista('lista')
    setFiltro(estadoCreado)
    cargar()
  }

  function abrirEdicion(pedido) {
    setItemsEdit(pedido.items.map(i => ({
      ...i,
      precio_base: i.precio_base || i.precio_unitario,
      descuento_pct: i.descuento_pct ?? 0,
    })))
    setNotaAdmin(pedido.notas_admin || '')
    setFechaEntrega(pedido.fecha_entrega || '')
    setIncluirIVAEdit(pedido.incluir_iva || false)
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
    setIncluirIVAEdit(false)
    setEsActualizacionPrecios(false)
  }

  function abrirActualizacionPrecios(pedido) {
    abrirEdicion(pedido)
    setEsActualizacionPrecios(true)
  }

  async function registrarEgresoStock(pedido) {
    const items = pedido.items_pendientes?.length > 0 ? pedido.items_pendientes : (pedido.items || [])
    const distNombre = pedido.profiles?.razon_social || pedido.profiles?.full_name || ''
    for (const item of items) {
      if (!item.codigo || !item.cantidad) continue
      const { data: stockRow } = await supabase.from('stock_pt').select('stock_actual, stock_inicial').eq('codigo', item.codigo).single()
      const actual = stockRow?.stock_actual ?? 0
      await supabase.from('stock_pt').upsert({
        codigo: item.codigo, nombre: item.nombre || '', modelo: item.modelo || '', categoria: item.categoria || '',
        stock_actual: Math.max(0, actual - item.cantidad), stock_inicial: stockRow?.stock_inicial ?? 0,
      }, { onConflict: 'codigo' })
      await supabase.from('movimientos_pt').insert({
        codigo: item.codigo, nombre: item.nombre || '', modelo: item.modelo || '', categoria: item.categoria || '',
        tipo: 'egreso', cantidad: item.cantidad, canal: 'Distribuidor',
        observacion: `Pedido #${pedido.id?.slice(0,8).toUpperCase()} · ${distNombre}${pedido.nro_remito ? ' · Remito ' + pedido.nro_remito : ''}`,
        usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
        referencia_nombre: distNombre || null,
      })
    }
  }

  async function finalizarPedido(pedido) {
    const yaFinalizado = pedido.estado === 'finalizado'

    const { error } = await supabase.from('pedidos').update({ estado: 'finalizado', updated_at: new Date().toISOString() }).eq('id', pedido.id)
    if (error) { toast.error('Error: ' + error.message); return }

    // Solo actualizar cantidad_retirada si NO estaba ya finalizado (evita duplicar al re-finalizar)
    if (!yaFinalizado && pedido.tipo === 'preventa' && pedido.preventa_id) {
      const { data: pv } = await supabase.from('preventas').select('items').eq('id', pedido.preventa_id).single()
      if (pv?.items) {
        const updatedItems = pv.items.map(pvItem => {
          const pedidoItem = pedido.items.find(i => i.codigo === pvItem.codigo)
          if (!pedidoItem) return pvItem
          return { ...pvItem, cantidad_retirada: (pvItem.cantidad_retirada || 0) + pedidoItem.cantidad }
        })
        await supabase.from('preventas').update({ items: updatedItems }).eq('id', pedido.preventa_id)
      }
    }

    toast.success('Pedido finalizado ✅')
    cargar()
  }

  async function entregarPedido(pedido) {
    const { error } = await supabase.from('pedidos').update({ estado: 'entregado', updated_at: new Date().toISOString() }).eq('id', pedido.id)
    if (error) { toast.error('Error: ' + error.message); return }
    await registrarEgresoStock(pedido)
    toast.success('Pedido marcado como entregado ✅')
    cargar()
  }

  async function actualizarPrecios(pedido) {
    const itemsFinal = itemsEdit.filter(i => i.cantidad > 0)
    if (itemsFinal.length === 0) { toast.error('El pedido no puede quedar sin items'); return }
    const totalNeto = itemsFinal.reduce((s, i) => s + i.subtotal, 0)
    const ivaFinal = incluirIVAEdit ? totalNeto * IVA_PCT : 0
    const totalFinal = totalNeto + ivaFinal

    setGuardando(true)
    const { error } = await supabase.from('pedidos').update({
      items: itemsFinal,
      total: totalFinal,
      iva_monto: ivaFinal,
      incluir_iva: incluirIVAEdit,
      updated_at: new Date().toISOString(),
    }).eq('id', pedido.id)
    setGuardando(false)
    if (error) { toast.error('Error al guardar: ' + error.message); return }
    toast.success('Precios actualizados ✅')
    cerrarEdicion()
    cargar()
  }

  function abrirInternals(pedido) {
    setInternalsForm({ nro_remito: pedido.nro_remito || '', notas_internas: pedido.notas_internas || '' })
    setEditingInternals(pedido.id)
  }

  async function guardarInternals(pedidoId) {
    setGuardandoInternals(true)
    const { error } = await supabase.from('pedidos').update({
      nro_remito: internalsForm.nro_remito.trim() || null,
      notas_internas: internalsForm.notas_internas.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', pedidoId)
    setGuardandoInternals(false)
    if (error) { toast.error('Error al guardar: ' + error.message); return }
    toast.success('Datos internos guardados')
    setEditingInternals(null)
    cargar()
  }

  async function subirFactura(pedido, file) {
    if (!file) return
    setSubiendoFactura(pedido.id)
    const ext = file.name.split('.').pop()
    const path = `pedidos/${pedido.id}/factura_${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('facturas').upload(path, file, { upsert: true })
    if (uploadError) { toast.error('Error al subir: ' + uploadError.message); setSubiendoFactura(null); return }
    const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)
    const { error } = await supabase.from('pedidos').update({ factura_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', pedido.id)
    setSubiendoFactura(null)
    if (error) { toast.error('Error al guardar URL'); return }
    toast.success('Factura subida ✅')
    cargar()
  }

  async function eliminarFactura(pedido) {
    const { error } = await supabase.from('pedidos').update({ factura_url: null, updated_at: new Date().toISOString() }).eq('id', pedido.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Factura eliminada')
    cargar()
  }

  async function subirRemitoMultiple(pedido, files) {
    if (!files || files.length === 0) return
    setSubiendoRemito(pedido.id)
    const actuales = Array.isArray(pedido.remito_urls) && pedido.remito_urls.length > 0 ? pedido.remito_urls : pedido.remito_url ? [pedido.remito_url] : []
    const nuevasUrls = []
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `remitos/${pedido.id}/remito_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('facturas').upload(path, file, { upsert: true })
      if (error) { toast.error('Error al subir ' + file.name); continue }
      const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)
      nuevasUrls.push(publicUrl)
    }
    if (nuevasUrls.length === 0) { setSubiendoRemito(null); return }
    const todas = [...actuales, ...nuevasUrls]
    const { error } = await supabase.from('pedidos').update({ remito_urls: todas, remito_url: todas[0], updated_at: new Date().toISOString() }).eq('id', pedido.id)
    setSubiendoRemito(null)
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Remito subido ✅')
    cargar()
  }

  async function subirPagoMultiple(pedido, files) {
    if (!files || files.length === 0) return
    setSubiendoPago(pedido.id)
    const archivosActuales = Array.isArray(pedido.pago_archivos) ? pedido.pago_archivos : (pedido.pago_url ? [pedido.pago_url] : [])
    const nuevasUrls = []
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `pedidos/${pedido.id}/pago_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage.from('facturas').upload(path, file, { upsert: true })
      if (uploadError) { toast.error('Error al subir ' + file.name + ': ' + uploadError.message); continue }
      const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)
      nuevasUrls.push(publicUrl)
    }
    if (nuevasUrls.length === 0) { setSubiendoPago(null); return }
    const nuevosArchivos = [...archivosActuales, ...nuevasUrls]
    const { error } = await supabase.from('pedidos').update({ pago_archivos: nuevosArchivos, pago_url: nuevosArchivos[nuevosArchivos.length - 1], updated_at: new Date().toISOString() }).eq('id', pedido.id)
    setSubiendoPago(null)
    if (error) { toast.error('Error al guardar: ' + error.message); return }
    toast.success(`${nuevasUrls.length} comprobante${nuevasUrls.length > 1 ? 's' : ''} subido${nuevasUrls.length > 1 ? 's' : ''} ✅`)
    cargar()
  }

  async function eliminarPago(pedido, url) {
    const archivosActuales = Array.isArray(pedido.pago_archivos) ? pedido.pago_archivos : (pedido.pago_url ? [pedido.pago_url] : [])
    const nuevosArchivos = archivosActuales.filter(u => u !== url)
    const { error } = await supabase.from('pedidos').update({ pago_archivos: nuevosArchivos, pago_url: nuevosArchivos[nuevosArchivos.length - 1] || null, updated_at: new Date().toISOString() }).eq('id', pedido.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Comprobante eliminado')
    cargar()
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

  function actualizarPrecioUnitario(idx, val) {
    const precio = Math.max(0, parseFloat(val) || 0)
    setItemsEdit(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const base = item.precio_base || item.precio_unitario
      const descPct = base > 0 ? Math.max(0, (base - precio) / base * 100) : 0
      return { ...item, precio_unitario: precio, descuento_pct: Math.round(descPct * 100) / 100, subtotal: precio * item.cantidad }
    }))
  }

  async function confirmarPedido(pedido, nuevoEstado) {
    const itemsFinal = (nuevoEstado === 'modificado' || nuevoEstado === 'aprobado') ? itemsEdit : pedido.items
    const totalNeto = itemsFinal.reduce((s, i) => s + i.subtotal, 0)
    const ivaFinal = incluirIVAEdit ? totalNeto * IVA_PCT : 0
    const totalFinal = totalNeto + ivaFinal

    setGuardando(true)
    const { error } = await supabase.from('pedidos').update({
      estado: nuevoEstado,
      items: itemsFinal,
      total: totalFinal,
      iva_monto: ivaFinal,
      incluir_iva: incluirIVAEdit,
      notas_admin: notaAdmin.trim() || null,
      fecha_entrega: fechaEntrega || null,
      nro_remito: pedido.nro_remito || null,
      notas_internas: pedido.notas_internas || null,
      updated_at: new Date().toISOString(),
    }).eq('id', pedido.id)

    if (error) { toast.error('Error al guardar: ' + error.message); setGuardando(false); return }

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
      const lineaIVA = incluirIVAEdit ? `\nSubtotal neto: ${formatPrecio(totalNeto)}\nIVA (21%): ${formatPrecio(ivaFinal)}\nTotal c/IVA: ${formatPrecio(totalFinal)}` : `\nTotal: ${formatPrecio(totalFinal)}`

      const asunto =
        nuevoEstado === 'aprobado'  ? `TEMPTECH - Pedido #${pedidoId} aprobado ✅` :
        nuevoEstado === 'modificado' ? `TEMPTECH - Pedido #${pedidoId} modificado ✏️` :
        `TEMPTECH - Pedido #${pedidoId} rechazado ❌`

      const texto =
        nuevoEstado === 'aprobado'
          ? `Hola ${nombreDist},\n\nTu pedido #${pedidoId} fue APROBADO.\n\nDetalle:\n${textoItems}\n${lineaIVA}${lineaFecha}${lineaNota}\n\nSaludos,\nEquipo TEMPTECH`
          : nuevoEstado === 'modificado'
          ? `Hola ${nombreDist},\n\nTu pedido #${pedidoId} fue MODIFICADO por nuestro equipo.\n\nNuevo detalle:\n${textoItems}\n${lineaIVA}${lineaFecha}${lineaNota}\n\nSaludos,\nEquipo TEMPTECH`
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

  function imprimirPedido(pedido) {
    const dist = pedido.profiles
    const fecha = new Date(pedido.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
    const items = (pedido.items || []).map(it =>
      `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-family:monospace;font-size:12px;color:#4b5563">${it.codigo || ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px">${it.nombre} ${it.modelo || ''}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:center;font-weight:700">${it.cantidad}</td>
      </tr>`
    ).join('')
    const pendientes = Array.isArray(pedido.items_pendientes) && pedido.items_pendientes.length > 0
      ? `<div style="margin-top:16px;padding:10px 14px;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px">
          <div style="font-size:11px;font-weight:700;color:#c2410c;text-transform:uppercase;margin-bottom:6px">⏳ Saldo pendiente de entrega</div>
          ${pedido.items_pendientes.map(it => `<div style="font-size:12px;color:#7c2d12">${it.nombre} ${it.modelo} <b>#${it.codigo}</b> — ×${it.cantidad}</div>`).join('')}
        </div>` : ''
    const notaDist  = pedido.notas       ? `<p style="margin:0;font-size:12px"><b>Nota del distribuidor:</b> ${pedido.notas}</p>` : ''
    const notaAdmin = pedido.notas_admin ? `<p style="margin:0;font-size:12px"><b>Nota TEMPTECH:</b> ${pedido.notas_admin}</p>` : ''
    const fechaEnt  = pedido.fecha_entrega ? `<p style="margin:0;font-size:12px"><b>Fecha de entrega estimada:</b> ${formatFecha(pedido.fecha_entrega)}</p>` : ''
    const remito    = pedido.nro_remito  ? `<p style="margin:0;font-size:12px"><b>N° Remito:</b> ${pedido.nro_remito}</p>` : ''

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Pedido #${pedido.id.slice(0,8).toUpperCase()}</title>
      <style>
        body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 32px; font-size: 13px; }
        h1 { font-size: 20px; margin: 0 0 4px; }
        .sub { font-size: 12px; color: #6b7280; margin: 0 0 24px; }
        .section { margin-bottom: 20px; }
        .label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: #9ca3af; margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        th { padding: 8px 12px; background: #f3f4f6; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; color: #6b7280; text-align: left; }
        .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #dcfce7; color: #166534; }
        .info-box { padding: 12px 14px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; display: flex; flex-direction: column; gap: 4px; }
        @media print { body { padding: 16px; } }
      </style>
    </head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;border-bottom:2px solid #e5e7eb;padding-bottom:16px">
        <div>
          <h1>Pedido <span style="font-family:monospace">#${pedido.id.slice(0,8).toUpperCase()}</span></h1>
          <p class="sub">Emitido el ${fecha}</p>
        </div>
        <div>
          <span class="badge">APROBADO</span>
          ${pedido.nro_remito ? `<div style="margin-top:6px;font-size:12px;color:#374151">Remito: <b>${pedido.nro_remito}</b></div>` : ''}
        </div>
      </div>

      <div class="section">
        <div class="label">Distribuidor</div>
        <div class="info-box">
          <div style="font-size:14px;font-weight:700">${dist?.razon_social || dist?.full_name || '—'}</div>
          <div style="color:#6b7280">${dist?.email || ''}</div>
        </div>
      </div>

      <div class="section">
        <div class="label">Detalle del pedido</div>
        <table>
          <thead><tr>
            <th>Código</th><th>Producto</th><th style="text-align:center">Cantidad</th>
          </tr></thead>
          <tbody>${items}</tbody>
        </table>
        ${pendientes}
      </div>

      ${notaDist || notaAdmin || fechaEnt || remito ? `<div class="section info-box">${fechaEnt}${notaDist}${notaAdmin}${remito}</div>` : ''}

      <div style="margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center">
        TEMPTECH · Portal de Clientes · mi.temptech.com.ar
      </div>
    </body></html>`

    const w = window.open('', '_blank', 'width=800,height=600')
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 300)
  }

  const pedidosFiltrados = pedidos.filter(p => {
    if (filtroFecha && p.fecha_entrega && p.fecha_entrega !== filtroFecha) return false
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    const nombre = (p.profiles?.razon_social || p.profiles?.full_name || '').toLowerCase()
    const email = (p.profiles?.email || '').toLowerCase()
    const id = p.id.slice(0, 8).toLowerCase()
    return nombre.includes(q) || email.includes(q) || id.includes(q)
  })

  if (!isAdmin && !isVendedor && !isAdmin2) return null

  // ── Vista: Nuevo pedido ──────────────────────────────────────────────────────
  if (vista === 'nuevo') {
    const npTotalNeto = npItems.filter(i => i.cantidad > 0).reduce((s, i) => s + i.subtotal, 0)
    const npIVAMonto  = npIVA ? npTotalNeto * IVA_PCT : 0
    const npTotal     = npTotalNeto + npIVAMonto

    return (
      <div style={{ animation: 'fadeUp 0.35s ease' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Nuevo pedido</h1>
            <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Creá un pedido en nombre de un distribuidor</p>
          </div>
          <button onClick={() => { setVista('lista'); npReset() }}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text2)' }}>
            ← Volver
          </button>
        </div>

        <div className="form-sidebar-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
          {/* Izquierda: distribuidor + catálogo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Selector de distribuidor */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Distribuidor *</div>
              <div style={{ position: 'relative' }}>
                {npDistSeleccionado ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(74,108,247,0.08)', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '9px 12px' }}>
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                      🏪 {npDistSeleccionado.razon_social || npDistSeleccionado.full_name}
                      <span style={{ fontWeight: 400, color: 'var(--text3)', marginLeft: 6 }}>{npDistSeleccionado.email}</span>
                    </span>
                    <button
                      onClick={() => { setNpDistSeleccionado(null); setNpDistId(''); setNpDistBusqueda(''); setNpItems([]) }}
                      style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
                    >×</button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      value={npDistBusqueda}
                      onChange={e => { setNpDistBusqueda(e.target.value); setNpShowDistDrop(true) }}
                      onFocus={() => setNpShowDistDrop(true)}
                      placeholder="Buscar por nombre, empresa o email..."
                      style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box' }}
                    />
                    {npShowDistDrop && npDistBusqueda.length >= 1 && (() => {
                      const q = npDistBusqueda.toLowerCase()
                      const resultados = distribuidores.filter(d =>
                        (d.razon_social || '').toLowerCase().includes(q) ||
                        (d.full_name    || '').toLowerCase().includes(q) ||
                        (d.email        || '').toLowerCase().includes(q)
                      ).slice(0, 8)
                      if (!resultados.length) return null
                      return (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 50, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', marginTop: 2 }}>
                          {resultados.map(d => (
                            <div
                              key={d.id}
                              onMouseDown={() => {
                                setNpDistSeleccionado(d)
                                setNpDistId(d.id)
                                setNpDistBusqueda('')
                                setNpShowDistDrop(false)
                                if (npItems.length > 0) {
                                  setNpItems(prev => prev.map(item => {
                                    const descPct = npAplicarDesc ? calcDescPct(d.descuentos?.[item.categoria]) : 0
                                    const precioUnit = item.precio_base * (1 - descPct / 100)
                                    return { ...item, descuento_pct: descPct, precio_unitario: precioUnit, subtotal: precioUnit * item.cantidad }
                                  }))
                                }
                              }}
                              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 2 }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>🏪 {d.razon_social || d.full_name || 'Sin nombre'}</span>
                              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{d.email}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </>
                )}
              </div>
              {npDistId && (() => {
                const dist = distribuidores.find(d => d.id === npDistId)
                const tieneDesc = dist?.descuentos && Object.values(dist.descuentos).some(v => v && v !== 0 && !(Array.isArray(v) && v.every(x => !x || x === 0)))
                if (!tieneDesc) return null
                return (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, cursor: 'pointer', fontSize: 13, userSelect: 'none' }}>
                    <input type="checkbox" checked={npAplicarDesc} onChange={e => npToggleDescuento(e.target.checked)} style={{ accentColor: 'var(--brand-blue)', width: 15, height: 15 }} />
                    <span style={{ fontWeight: 600 }}>Aplicar descuentos del distribuidor</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                      ({Object.entries(dist.descuentos || {}).filter(([,v]) => v && v !== 0).map(([k, v]) => {
                        const pct = calcDescPct(v)
                        return pct > 0 ? `${k.replace('calefones_calderas','Cal').replace('paneles_calefactores','Pan').replace('anafes','Ana')}: ${pct.toFixed(1)}%` : null
                      }).filter(Boolean).join(' · ')})
                    </span>
                  </label>
                )
              })()}
            </div>

            {/* Catálogo */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
                Seleccioná los productos
              </div>
              {(catalogoDB.length > 0 ? catalogoDB : CATALOGO_ADMIN).map(cat => (
                <div key={cat.categoria}>
                  <div style={{ padding: '10px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
                    {cat.emoji} {cat.label}
                  </div>
                  {cat.productos.map(prod => {
                    const enCarrito = npItems.find(i => i.codigo === prod.codigo)
                    return (
                      <div key={prod.codigo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4 }}>{prod.codigo}</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{prod.nombre}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{prod.modelo}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, minWidth: 110, textAlign: 'right' }}>{formatPrecio(prod.precio)}</div>
                        <button
                          onClick={() => npAgregarProducto({ ...prod, categoria: cat.categoria })}
                          style={{ background: enCarrito ? 'rgba(61,214,140,0.1)' : 'rgba(74,108,247,0.1)', color: enCarrito ? '#3dd68c' : '#7b9fff', border: enCarrito ? '1px solid rgba(61,214,140,0.35)' : '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}
                        >
                          {enCarrito ? `✓ x${enCarrito.cantidad}` : '+ Agregar'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Derecha: resumen del pedido */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
                🧾 Resumen del pedido
              </div>
              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {npItems.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '16px 0' }}>
                    Agregá productos del catálogo
                  </div>
                ) : (
                  npItems.map((item, idx) => (
                    <div key={idx} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.modelo}</div>
                          {item.codigo && <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace', marginTop: 2 }}>#{item.codigo}</div>}
                        </div>
                        <button onClick={() => npQuitarItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16, padding: '0 0 0 8px', lineHeight: 1 }}>×</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Descuento %</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <input
                              type="number" min="0" max="100" step="0.5"
                              value={item.descuento_pct}
                              onChange={e => npActualizarDescuento(idx, e.target.value)}
                              style={{ width: '100%', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 6px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'var(--font)' }}
                            />
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>%</span>
                          </div>
                          <div style={{ fontSize: 10, color: '#3dd68c', marginTop: 2 }}>{formatPrecio(item.precio_unitario)} c/u</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Cantidad</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button onClick={() => npActualizarCantidad(idx, item.cantidad - 1)} style={{ width: 26, height: 26, borderRadius: 5, background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                            <input
                              type="number" min="0" value={item.cantidad}
                              onChange={e => npActualizarCantidad(idx, e.target.value)}
                              style={{ width: 44, textAlign: 'center', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'var(--font)' }}
                            />
                            <button onClick={() => npActualizarCantidad(idx, item.cantidad + 1)} style={{ width: 26, height: 26, borderRadius: 5, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#7b9fff', textAlign: 'right' }}>
                        {formatPrecio(item.subtotal)}
                      </div>
                    </div>
                  ))
                )}

                {npItems.length > 0 && (
                  <>
                    {/* Total */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                      {npIVA && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>
                            <span>Subtotal neto</span><span>{formatPrecio(npTotalNeto)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                            <span>IVA (21%)</span><span>{formatPrecio(npIVAMonto)}</span>
                          </div>
                        </>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, color: '#7b9fff' }}>
                        <span>Total{npIVA ? ' c/IVA' : ''}</span>
                        <span>{formatPrecio(npTotal)}</span>
                      </div>
                    </div>

                    {/* Toggle IVA */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                      <input type="checkbox" checked={npIVA} onChange={e => setNpIVA(e.target.checked)}
                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#7b9fff' }} />
                      <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Incluir IVA (21%)</span>
                    </label>
                  </>
                )}

                {/* Estado inicial — solo admins */}
                {isAdmin && (
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>Estado inicial</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[{ k: 'aprobado', label: 'Aprobado', color: '#3dd68c', bg: 'rgba(61,214,140,0.12)' }, { k: 'pendiente', label: 'Pendiente', color: '#ffd166', bg: 'rgba(255,209,102,0.12)' }].map(op => (
                        <button key={op.k} onClick={() => setNpEstado(op.k)}
                          style={{ flex: 1, padding: '7px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: npEstado === op.k ? op.bg : 'var(--surface2)', color: npEstado === op.k ? op.color : 'var(--text3)', border: npEstado === op.k ? `1px solid ${op.color}50` : '1px solid var(--border)' }}>
                          {op.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fecha de entrega */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>📅 Fecha de entrega (opcional)</div>
                  <input type="date" value={npFecha} onChange={e => setNpFecha(e.target.value)}
                    style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
                </div>

                {/* Notas admin */}
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 5 }}>Nota interna (opcional)</div>
                  <textarea value={npNotas} onChange={e => setNpNotas(e.target.value)}
                    placeholder="Condiciones, aclaraciones..." rows={2}
                    style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', resize: 'vertical', outline: 'none', lineHeight: 1.6 }} />
                </div>

                <button onClick={crearPedido} disabled={creando || !npDistId || npItems.filter(i => i.cantidad > 0).length === 0}
                  style={{ width: '100%', background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', opacity: (!npDistId || npItems.filter(i => i.cantidad > 0).length === 0) ? 0.5 : 1 }}>
                  {creando ? 'Creando...' : '✓ Crear pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Pedidos</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Gestioná los pedidos de los distribuidores</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, color: 'var(--text3)' }}>
            {pedidosFiltrados.length} pedido{pedidosFiltrados.length !== 1 ? 's' : ''}
          </div>
          <button onClick={cargar} disabled={loading}
            style={{ background: 'var(--surface)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1, fontFamily: 'var(--font)' }}
            title="Actualizar pedidos">
            🔄
          </button>
          {!isAdmin2 && (
            <button onClick={() => setVista('nuevo')}
              style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              + Nuevo pedido
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {isAdmin2 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['todos', 'pendiente', 'aprobado', 'preparando', 'enviado'].map(f => (
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
        )}
        {!isAdmin2 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['todos', 'pendiente', 'aprobado', 'preparando', 'enviado', 'pendiente_pago', 'entregado', 'finalizado'].map(f => (
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
        )}
        <input
          type="text"
          placeholder="🔍 Buscar distribuidor o ID..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ flex: 1, minWidth: 200, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="date"
            value={filtroFecha}
            onChange={e => setFiltroFecha(e.target.value)}
            style={{ background: 'var(--surface2)', border: `1px solid ${filtroFecha ? 'rgba(74,108,247,0.5)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '7px 10px', color: filtroFecha ? 'var(--text)' : 'var(--text3)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', cursor: 'pointer' }}
          />
          {filtroFecha && (
            <button onClick={() => setFiltroFecha('')} title="Limpiar filtro de fecha"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              ✕
            </button>
          )}
        </div>
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
            const totalNetoEdit = itemsEdit.reduce((s, i) => s + i.subtotal, 0)
            const ivaEdit = incluirIVAEdit ? totalNetoEdit * IVA_PCT : 0
            const totalEdit = totalNetoEdit + ivaEdit
            const archivosRemito = Array.isArray(pedido.remito_urls) && pedido.remito_urls.length > 0
              ? pedido.remito_urls
              : pedido.remito_url ? [pedido.remito_url] : []

            return (
              <div key={pedido.id} style={{ background: 'var(--surface)', border: `1px solid ${isEdit ? 'rgba(74,108,247,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '3px 8px', borderRadius: 4 }}>
                      #{pedido.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{cfg.label}</span>
                    {pedido.tipo === 'preventa' && (
                      <span style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.4)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                        📦 RETIRO DE PREVENTA
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {pedido.tipo !== 'preventa' && !isAdmin2 && (
                      <span style={{ fontWeight: 800, fontSize: 15, color: '#7b9fff' }}>{formatPrecio(isEdit ? totalEdit : pedido.total)}</span>
                    )}
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
                              {item.codigo && <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'monospace', marginTop: 2 }}>#{item.codigo}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#7b9fff' }}>{formatPrecio(item.subtotal)}</div>
                              <button onClick={() => eliminarItem(idx)} style={{ background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)' }}>✕ Quitar</button>
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                            {/* Precio unitario */}
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                                Precio c/u
                                {item.precio_base && (
                                  <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 4 }}>
                                    (lista: {formatPrecio(item.precio_base)})
                                  </span>
                                )}
                              </div>
                              <input
                                type="number" min="0" step="0.01"
                                value={item.precio_unitario}
                                onChange={e => actualizarPrecioUnitario(idx, e.target.value)}
                                style={{ width: '100%', background: 'var(--surface3)', border: '1px solid rgba(74,108,247,0.4)', borderRadius: 6, padding: '5px 8px', color: '#7b9fff', fontSize: 13, fontWeight: 700, outline: 'none', fontFamily: 'var(--font)' }}
                              />
                            </div>
                            {/* Descuento */}
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Descuento %</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input
                                  type="number" min="0" max="100" step="0.5"
                                  value={item.descuento_pct}
                                  onChange={e => actualizarDescuento(idx, e.target.value)}
                                  style={{ width: '100%', textAlign: 'center', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
                                />
                                <span style={{ fontSize: 12, color: 'var(--text3)' }}>%</span>
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
                                  style={{ width: 44, textAlign: 'center', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
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
                          {(catalogoDB.length > 0 ? catalogoDB : CATALOGO_ADMIN).map(cat => (
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

                      {/* Toggle IVA en edición */}
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', marginTop: 4 }}>
                        <input
                          type="checkbox"
                          checked={incluirIVAEdit}
                          onChange={e => setIncluirIVAEdit(e.target.checked)}
                          style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#7b9fff' }}
                        />
                        <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Incluir IVA (21%)</span>
                      </label>

                      <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 8 }}>
                        {incluirIVAEdit && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>
                              <span>Subtotal neto</span>
                              <span>{formatPrecio(totalNetoEdit)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                              <span>IVA (21%)</span>
                              <span>{formatPrecio(ivaEdit)}</span>
                            </div>
                          </>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', fontWeight: 800, fontSize: 15, color: '#7b9fff' }}>
                          Total{incluirIVAEdit ? ' c/IVA' : ''}: {formatPrecio(totalEdit)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                      {pedido.items.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: i < pedido.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div>
                            <span style={{ fontWeight: 600 }}>{item.nombre}</span>
                            <span style={{ color: 'var(--text3)', fontSize: 11, marginLeft: 8 }}>{item.modelo}</span>
                            {item.codigo && <span style={{ color: 'var(--text3)', fontSize: 10, marginLeft: 8, fontFamily: 'monospace' }}>#{item.codigo}</span>}
                            {item.descuento_pct > 0 && (
                              <span style={{ fontSize: 10, marginLeft: 8, color: '#3dd68c', background: 'rgba(61,214,140,0.1)', padding: '1px 6px', borderRadius: 4 }}>{item.descuento_pct}% desc.</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            {isAdmin2 ? (
                              <span style={{ fontWeight: 700, color: 'var(--text2)' }}>x{item.cantidad}</span>
                            ) : (
                              <>
                                <span style={{ color: 'var(--text3)' }}>x{item.cantidad} · {formatPrecio(item.precio_unitario)}</span>
                                <span style={{ fontWeight: 700 }}>{formatPrecio(item.subtotal)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                      {!isAdmin2 && pedido.incluir_iva && pedido.iva_monto > 0 && (
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)' }}>
                            <span>Subtotal neto</span>
                            <span>{formatPrecio(pedido.total - pedido.iva_monto)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)' }}>
                            <span>IVA (21%)</span>
                            <span>{formatPrecio(pedido.iva_monto)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, color: '#7b9fff' }}>
                            <span>Total c/IVA</span>
                            <span>{formatPrecio(pedido.total)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Saldo pendiente de entrega */}
                  {!isEdit && Array.isArray(pedido.items_pendientes) && pedido.items_pendientes.length > 0 && (
                    <div style={{ marginBottom: 12, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#fb923c', textTransform: 'uppercase', marginBottom: 6 }}>⏳ Saldo pendiente de entrega</div>
                      {pedido.items_pendientes.map((item, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: i < pedido.items_pendientes.length - 1 ? '1px solid rgba(251,146,60,0.15)' : 'none' }}>
                          <span style={{ color: 'var(--text2)' }}>{item.nombre} {item.modelo} <span style={{ fontFamily: 'monospace', fontSize: 10, color: 'var(--text3)' }}>#{item.codigo}</span></span>
                          <span style={{ fontWeight: 700, color: '#fb923c' }}>×{item.cantidad}</span>
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

                  {/* ── Datos internos ── */}
                  {!isEdit && (
                    <div style={{ marginTop: 12, padding: '12px 14px', background: 'rgba(255,209,102,0.04)', border: '1px solid rgba(255,209,102,0.2)', borderRadius: 'var(--radius)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: editingInternals === pedido.id ? 10 : 0 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#ffd166', textTransform: 'uppercase', letterSpacing: '0.7px' }}>🔒 Datos internos</span>
                        {!isAdmin2 && editingInternals !== pedido.id && (
                          <button onClick={() => abrirInternals(pedido)}
                            style={{ background: 'none', border: 'none', color: '#ffd166', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '2px 6px' }}>
                            ✏️ Editar
                          </button>
                        )}
                      </div>

                      {editingInternals === pedido.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          <div>
                            <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>N° de remito</label>
                            <input
                              type="text"
                              value={internalsForm.nro_remito}
                              onChange={e => setInternalsForm(f => ({ ...f, nro_remito: e.target.value }))}
                              placeholder="Ej: 0001-00012345"
                              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>Notas internas</label>
                            <textarea
                              value={internalsForm.notas_internas}
                              onChange={e => setInternalsForm(f => ({ ...f, notas_internas: e.target.value }))}
                              placeholder="Observaciones internas, solo visibles para el equipo..."
                              rows={2}
                              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => guardarInternals(pedido.id)} disabled={guardandoInternals}
                              style={{ background: 'rgba(255,209,102,0.12)', color: '#ffd166', border: '1px solid rgba(255,209,102,0.35)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              {guardandoInternals ? 'Guardando...' : '✓ Guardar'}
                            </button>
                            <button onClick={() => setEditingInternals(null)}
                              style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 8 }}>
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>N° Remito</div>
                              <div style={{ fontSize: 13, fontFamily: 'monospace', color: pedido.nro_remito ? 'var(--text)' : 'var(--text3)' }}>
                                {pedido.nro_remito || '—'}
                              </div>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>Notas internas</div>
                              <div style={{ fontSize: 12, color: pedido.notas_internas ? 'var(--text2)' : 'var(--text3)' }}>
                                {pedido.notas_internas || '—'}
                              </div>
                            </div>
                          </div>
                          <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,209,102,0.15)' }}>
                            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Remitos</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                              {archivosRemito.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,209,102,0.1)', border: '1px solid rgba(255,209,102,0.35)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#ffd166', textDecoration: 'none' }}>
                                  📎 Remito {archivosRemito.length > 1 ? i + 1 : ''}
                                </a>
                              ))}
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,209,102,0.06)', border: '1px dashed rgba(255,209,102,0.35)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#ffd166', cursor: subiendoRemito === pedido.id ? 'not-allowed' : 'pointer', opacity: subiendoRemito === pedido.id ? 0.6 : 1 }}>
                                {subiendoRemito === pedido.id ? '⏳ Subiendo...' : '+ Adjuntar remito'}
                                <input type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }} disabled={subiendoRemito === pedido.id}
                                  onChange={e => { if (e.target.files?.length) subirRemitoMultiple(pedido, e.target.files); e.target.value = '' }} />
                              </label>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Factura — solo Admin */}
                      {isAdmin && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,209,102,0.15)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Factura</div>
                        {pedido.factura_url ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <a href={pedido.factura_url} target="_blank" rel="noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#3dd68c', textDecoration: 'none' }}>
                              📄 Ver factura
                            </a>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(74,108,247,0.08)', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#7b9fff', cursor: 'pointer' }}>
                              🔄 Reemplazar
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                                onChange={e => subirFactura(pedido, e.target.files[0])} />
                            </label>
                            <button onClick={() => eliminarFactura(pedido)}
                              style={{ background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              ✕
                            </button>
                            {subiendoFactura === pedido.id && <span style={{ fontSize: 11, color: 'var(--text3)' }}>Subiendo...</span>}
                          </div>
                        ) : (
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,209,102,0.08)', border: '1px dashed rgba(255,209,102,0.4)', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#ffd166', cursor: 'pointer' }}>
                            {subiendoFactura === pedido.id ? '⏳ Subiendo...' : '📎 Adjuntar factura'}
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                              onChange={e => subirFactura(pedido, e.target.files[0])} />
                          </label>
                        )}
                      </div>
                      )}

                      {/* Comprobante de pago — solo Admin */}
                      {isAdmin && (
                      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(61,214,140,0.15)' }}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Comprobantes de Pagos + Retenciones</div>
                        {(() => {
                          const archivos = Array.isArray(pedido.pago_archivos) && pedido.pago_archivos.length > 0
                            ? pedido.pago_archivos
                            : pedido.pago_url ? [pedido.pago_url] : []
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {archivos.map((url, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <a href={url} target="_blank" rel="noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#3dd68c', textDecoration: 'none' }}>
                                    💸 Comprobante {archivos.length > 1 ? i + 1 : ''}
                                  </a>
                                  <button onClick={() => eliminarPago(pedido, url)}
                                    style={{ background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)' }}>✕</button>
                                </div>
                              ))}
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(61,214,140,0.08)', border: '1px dashed rgba(61,214,140,0.4)', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#3dd68c', cursor: 'pointer', marginTop: archivos.length ? 4 : 0 }}>
                                {subiendoPago === pedido.id ? '⏳ Subiendo...' : '+ Agregar comprobante'}
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple style={{ display: 'none' }}
                                  onChange={e => { subirPagoMultiple(pedido, e.target.files); e.target.value = '' }} />
                              </label>
                            </div>
                          )
                        })()}
                      </div>
                      )}
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
                {!isAdmin2 && <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isEdit ? (
                    <>
                      {esActualizacionPrecios ? (
                        <>
                          <button onClick={() => actualizarPrecios(pedido)} disabled={guardando} style={{ background: 'rgba(74,108,247,0.12)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.4)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            {guardando ? 'Guardando...' : '💾 Guardar cambios de precios'}
                          </button>
                          <button onClick={cerrarEdicion} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            Cancelar
                          </button>
                        </>
                      ) : (
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
                      )}
                    </>
                  ) : (
                    <>
                      <button onClick={() => abrirEdicion(pedido)} style={{ background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        Gestionar pedido
                      </button>
                      <button onClick={() => abrirActualizacionPrecios(pedido)} style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        💲 Actualizar precios
                      </button>
                      {(pedido.estado === 'pendiente' || pedido.estado === 'aprobado' || pedido.estado === 'modificado') && (
                        <button
                          onClick={async () => { await supabase.from('pedidos').update({ estado: 'preparando', updated_at: new Date().toISOString() }).eq('id', pedido.id); cargar(); toast.success('Pedido en Preparando 🔧') }}
                          style={{ background: 'rgba(255,209,102,0.12)', color: '#ffd166', border: '1px solid rgba(255,209,102,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                        >
                          🔧 Preparando
                        </button>
                      )}
                      {pedido.estado === 'preparando' && (
                        <button
                          onClick={async () => {
                            const { error } = await supabase.from('pedidos').update({ estado: 'enviado', updated_at: new Date().toISOString() }).eq('id', pedido.id)
                            if (error) { toast.error('Error: ' + error.message); return }
                            await registrarEgresoStock(pedido)
                            cargar()
                            toast.success('Pedido marcado como Enviado 🚚 — stock descontado')
                          }}
                          style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                        >
                          🚚 Enviado
                        </button>
                      )}
                      {pedido.estado !== 'pendiente' && !['finalizado', 'entregado', 'rechazado'].includes(pedido.estado) && (
                        <button
                          onClick={async () => { await supabase.from('pedidos').update({ estado: 'pendiente', updated_at: new Date().toISOString() }).eq('id', pedido.id); cargar(); toast.success('Pedido revertido a Pendiente') }}
                          style={{ background: 'rgba(255,85,119,0.08)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                        >
                          ↩ Pendiente
                        </button>
                      )}
                      {pedido.estado !== 'aprobado' && !['finalizado', 'entregado', 'rechazado'].includes(pedido.estado) && (
                        <button
                          onClick={async () => { await supabase.from('pedidos').update({ estado: 'aprobado', updated_at: new Date().toISOString() }).eq('id', pedido.id); cargar(); toast.success('Pedido marcado como Aprobado ✓') }}
                          style={{ background: 'rgba(61,214,140,0.08)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.25)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                        >
                          ✓ Aprobado
                        </button>
                      )}
                      {(pedido.estado === 'pendiente' || pedido.estado === 'aprobado' || pedido.estado === 'modificado' || pedido.estado === 'preparando' || pedido.estado === 'entregado') && (
                        <button
                          onClick={() => finalizarPedido(pedido)}
                          style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                        >
                          ✓ Finalizado
                        </button>
                      )}
                      {(pedido.estado === 'pendiente' || pedido.estado === 'aprobado' || pedido.estado === 'modificado' || pedido.estado === 'preparando' || pedido.estado === 'finalizado') && (
                        <button
                          onClick={() => entregarPedido(pedido)}
                          style={{ background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                        >
                          📦 Entregado
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
                </div>}
                {isAdmin2 && (
                  <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {(pedido.estado === 'pendiente' || pedido.estado === 'aprobado' || pedido.estado === 'modificado') && (
                      <button
                        onClick={async () => { const { error } = await supabase.from('pedidos').update({ estado: 'preparando', updated_at: new Date().toISOString() }).eq('id', pedido.id); if (error) { toast.error('Error al actualizar: ' + error.message); return; } cargar(); toast.success('Pedido en Preparando 🔧') }}
                        style={{ background: 'rgba(255,209,102,0.12)', color: '#ffd166', border: '1px solid rgba(255,209,102,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                      >
                        🔧 Preparando
                      </button>
                    )}
                    {pedido.estado === 'preparando' && (
                      <button
                        onClick={async () => {
                          const { error } = await supabase.from('pedidos').update({ estado: 'enviado', updated_at: new Date().toISOString() }).eq('id', pedido.id)
                          if (error) { toast.error('Error al actualizar: ' + error.message); return }
                          await registrarEgresoStock(pedido)
                          cargar()
                          toast.success('Pedido marcado como Enviado 🚚 — stock descontado')
                        }}
                        style={{ background: 'rgba(52,211,153,0.12)', color: '#34d399', border: '1px solid rgba(52,211,153,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                      >
                        🚚 Enviado
                      </button>
                    )}
                    <button
                      onClick={() => imprimirPedido(pedido)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '7px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                      🖨️ Imprimir pedido
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
