import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { imprimirPreventa, exportarPreventaExcel } from '@/utils/exportDoc'

function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

const ESTADO_CONFIG = {
  activa:     { label: 'Activa',     color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)' },
  completada: { label: 'Completada', color: '#7b9fff', bg: 'rgba(74,108,247,0.12)',  border: 'rgba(74,108,247,0.35)' },
  cancelada:  { label: 'Cancelada',  color: '#ff5577', bg: 'rgba(255,85,119,0.12)',  border: 'rgba(255,85,119,0.35)' },
}

export default function AdminPreventas() {
  const { isAdmin, isAdmin2, isVendedor, user, profile } = useAuth()
  const [tab, setTab] = useState('lista')           // 'lista' | 'nueva'
  const [preventas, setPreventas] = useState([])
  const [loading, setLoading] = useState(true)
  const [distribuidores, setDistribuidores] = useState([])
  const [precios, setPrecios] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('activa')
  const [expandida, setExpandida] = useState(null)

  // Form nueva preventa
  const [distId, setDistId] = useState('')
  const [distBusqueda, setDistBusqueda] = useState('')
  const [distSeleccionado, setDistSeleccionado] = useState(null)
  const [showDistDrop, setShowDistDrop] = useState(false)
  const [itemsForm, setItemsForm] = useState([])    // [{ codigo, nombre, modelo, categoria, precio_unitario, cantidad_total }]
  const [notasForm, setNotasForm] = useState('')
  const [fechaVenc, setFechaVenc] = useState('')
  const [incluirIVA, setIncluirIVA] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Registrar entrega de preventa
  const [entregandoPv, setEntregandoPv] = useState(null) // id de la preventa con entrega abierta
  const [cantEntrega, setCantEntrega] = useState({})     // { codigo: cantidad }
  const [entregaIVA, setEntregaIVA] = useState(false)
  const [entregaNotas, setEntregaNotas] = useState('')
  const [entregaFactura, setEntregaFactura] = useState(null)   // File
  const [subiendoFactura, setSubiendoFactura] = useState(false)
  const [registrandoEntrega, setRegistrandoEntrega] = useState(false)

  // Pagos
  const [agregandoPago, setAgregandoPago] = useState(null)
  const [pagoMonto, setPagoMonto] = useState('')
  const [pagoFecha, setPagoFecha] = useState('')
  const [pagoNotas, setPagoNotas] = useState('')
  const [pagoComprobante, setPagoComprobante] = useState(null)
  const [subiendoPagoComp, setSubiendoPagoComp] = useState(false)
  const [registrandoPago, setRegistrandoPago] = useState(false)
  const [exportDropPv, setExportDropPv] = useState(null) // id de preventa con dropdown abierto
  const exportDropRef = useRef(null)

  // Facturas adjuntas
  const [subiendoFacturaPvId, setSubiendoFacturaPvId] = useState(null)

  // Solicitar retiro (admin crea pedido de preventa)
  const [solicitandoRetiroPv, setSolicitandoRetiroPv] = useState(null)
  const [cantRetiro, setCantRetiro] = useState({})
  const [retiroIVA, setRetiroIVA] = useState(false)
  const [retiroNotas, setRetiroNotas] = useState('')
  const [enviandoRetiro, setEnviandoRetiro] = useState(false)

  const [recalculando, setRecalculando] = useState(null) // preventa id en recalculo

  // Edición saldo cobrado inline (legacy, mantenido para retrocompatibilidad)
  const [editandoSaldo, setEditandoSaldo] = useState(null)
  const [saldoInput, setSaldoInput] = useState('')

  async function recalcularSaldoPreventa(pv) {
    setRecalculando(pv.id)
    const { data: peds, error } = await supabase
      .from('pedidos')
      .select('items, items_pendientes')
      .eq('preventa_id', pv.id)
      .eq('stock_descontado', true)
    if (error) { toast.error('Error al leer pedidos: ' + error.message); setRecalculando(null); return }

    const retirado = {}
    for (const ped of (peds || [])) {
      for (const item of (ped.items || [])) {
        if (!item.codigo) continue
        const pendiente = (ped.items_pendientes || []).find(p => p.codigo === item.codigo)
        const entregado = Math.max(0, item.cantidad - (pendiente?.cantidad || 0))
        retirado[item.codigo] = (retirado[item.codigo] || 0) + entregado
      }
    }

    const updatedItems = (pv.items || []).map(pvItem => ({
      ...pvItem,
      cantidad_retirada: retirado[pvItem.codigo] || 0,
    }))

    const { error: updErr } = await supabase.from('preventas').update({ items: updatedItems, updated_at: new Date().toISOString() }).eq('id', pv.id)
    setRecalculando(null)
    if (updErr) { toast.error('Error al actualizar preventa: ' + updErr.message); return }
    toast.success('✅ Saldo recalculado desde ' + (peds?.length || 0) + ' pedido(s) entregado(s)')
    cargar()
  }

  async function guardarSaldo(pvId) {
    const valor = parseFloat(saldoInput) || 0
    const { error } = await supabase.from('preventas').update({ saldo_cobrado: valor }).eq('id', pvId)
    if (error) { toast.error('Error al guardar saldo'); return }
    setEditandoSaldo(null)
    cargar()
  }

  async function subirFacturaPv(pv, files) {
    const arr = Array.from(files || [])
    if (!arr.length) return
    setSubiendoFacturaPvId(pv.id)
    const actuales = pv.facturas || []
    const nuevasEntradas = []
    for (const file of arr) {
      const ext = file.name.split('.').pop()
      const path = `preventas/${pv.id}/facturas/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: errUp } = await supabase.storage.from('facturas').upload(path, file, { upsert: true })
      if (errUp) { toast.error('Error al subir ' + file.name + ': ' + errUp.message); continue }
      const { data: urlData } = supabase.storage.from('facturas').getPublicUrl(path)
      nuevasEntradas.push({ url: urlData.publicUrl, nombre: file.name, subido_por: profile?.full_name || user.email, created_at: new Date().toISOString() })
    }
    if (!nuevasEntradas.length) { setSubiendoFacturaPvId(null); return }
    const { error } = await supabase.from('preventas').update({ facturas: [...actuales, ...nuevasEntradas], updated_at: new Date().toISOString() }).eq('id', pv.id)
    setSubiendoFacturaPvId(null)
    if (error) { toast.error('Error al guardar facturas'); return }
    toast.success(`${nuevasEntradas.length} factura${nuevasEntradas.length > 1 ? 's' : ''} adjuntada${nuevasEntradas.length > 1 ? 's' : ''} ✅`)
    cargar()
  }

  async function eliminarFacturaPv(pv, idx) {
    const nuevas = (pv.facturas || []).filter((_, i) => i !== idx)
    const { error } = await supabase.from('preventas').update({ facturas: nuevas, updated_at: new Date().toISOString() }).eq('id', pv.id)
    if (error) { toast.error('Error al eliminar factura'); return }
    toast.success('Factura eliminada')
    cargar()
  }

  async function registrarPago(pv) {
    const monto = parseFloat(pagoMonto) || 0
    if (monto <= 0) { toast.error('Ingresá un monto válido'); return }
    setRegistrandoPago(true)
    let comprobanteUrl = null
    if (pagoComprobante) {
      setSubiendoPagoComp(true)
      const ext = pagoComprobante.name.split('.').pop()
      const path = `preventas/${pv.id}/pagos/${Date.now()}_comp.${ext}`
      const { error: errUp } = await supabase.storage.from('facturas').upload(path, pagoComprobante, { upsert: true })
      setSubiendoPagoComp(false)
      if (errUp) { toast.error('Error al subir comprobante: ' + errUp.message); setRegistrandoPago(false); return }
      const { data: urlData } = supabase.storage.from('facturas').getPublicUrl(path)
      comprobanteUrl = urlData.publicUrl
    }
    const nuevoPago = {
      id: crypto.randomUUID(),
      monto,
      fecha: pagoFecha || new Date().toISOString().split('T')[0],
      notas: pagoNotas.trim() || null,
      comprobante_url: comprobanteUrl,
      registrado_por: user.id,
      registrado_por_nombre: profile?.full_name || user.email,
      created_at: new Date().toISOString(),
    }
    const pagosActuales = pv.pagos || []
    const nuevosPagos = [...pagosActuales, nuevoPago]
    const nuevoSaldo = nuevosPagos.reduce((s, p) => s + p.monto, 0)
    const { error } = await supabase.from('preventas').update({
      pagos: nuevosPagos,
      saldo_cobrado: nuevoSaldo,
      updated_at: new Date().toISOString(),
    }).eq('id', pv.id)
    setRegistrandoPago(false)
    if (error) { toast.error('Error al registrar pago: ' + error.message); return }
    toast.success('Pago registrado ✅')
    setAgregandoPago(null); setPagoMonto(''); setPagoFecha(''); setPagoNotas(''); setPagoComprobante(null)
    cargar()
  }

  async function eliminarPago(pv, pagoId) {
    if (!window.confirm('¿Eliminar este pago?')) return
    const nuevosPagos = (pv.pagos || []).filter(p => p.id !== pagoId)
    const nuevoSaldo = nuevosPagos.reduce((s, p) => s + p.monto, 0)
    const { error } = await supabase.from('preventas').update({
      pagos: nuevosPagos,
      saldo_cobrado: nuevoSaldo,
      updated_at: new Date().toISOString(),
    }).eq('id', pv.id)
    if (error) { toast.error('Error al eliminar pago'); return }
    toast.success('Pago eliminado')
    cargar()
  }

  // Edición de preventa existente
  const [editandoPv, setEditandoPv] = useState(null)    // id de la preventa editándose
  const [pvItemsEdit, setPvItemsEdit] = useState([])
  const [pvNotasEdit, setPvNotasEdit] = useState('')
  const [pvFechaEdit, setPvFechaEdit] = useState('')
  const [pvShowPicker, setPvShowPicker] = useState(false)
  const [pvIVAEdit, setPvIVAEdit] = useState(false)
  const [guardandoPv, setGuardandoPv] = useState(false)

  const IVA_PCT = 0.21

  useEffect(() => {
    if (isAdmin || isVendedor) {
      cargar()
      if (isAdmin) { cargarDists(); cargarPrecios() }
    }
  }, [isAdmin, isVendedor])

  async function cargar() {
    setLoading(true)
    let q = supabase
      .from('preventas')
      .select('*')
      .order('created_at', { ascending: false })
    if (filtroEstado !== 'todos') q = q.eq('estado', filtroEstado)
    const { data, error } = await q
    if (error) { toast.error('Error al cargar preventas'); setLoading(false); return }

    // Buscar datos de distribuidores por separado
    const ids = [...new Set((data || []).map(p => p.distribuidor_id).filter(Boolean))]
    let distMap = {}
    if (ids.length > 0) {
      const { data: dists } = await supabase
        .from('profiles')
        .select('id, full_name, email, razon_social')
        .in('id', ids)
      dists?.forEach(d => { distMap[d.id] = d })
    }

    setPreventas((data || []).map(p => ({ ...p, profiles: distMap[p.distribuidor_id] || null })))
    setLoading(false)
  }

  useEffect(() => { if (isAdmin || isVendedor) cargar() }, [filtroEstado])

  async function cargarDists() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, razon_social')
      .eq('user_type', 'distributor')
      .order('razon_social')
    setDistribuidores(data || [])
  }

  async function cargarPrecios() {
    const { data } = await supabase.from('precios').select('*').order('categoria').order('nombre')
    setPrecios(data || [])
  }

  function agregarItem(producto) {
    if (itemsForm.find(i => i.codigo === producto.codigo)) {
      toast('Ya está en la preventa', { icon: '⚠️' })
      return
    }
    setItemsForm(prev => [...prev, {
      codigo: producto.codigo,
      nombre: producto.nombre,
      modelo: producto.modelo,
      categoria: producto.categoria,
      precio_unitario: producto.precio,
      cantidad_total: 1,
      cantidad_retirada: 0,
    }])
  }

  function actualizarItem(idx, campo, valor) {
    setItemsForm(prev => prev.map((item, i) => {
      if (i !== idx) return item
      return { ...item, [campo]: campo === 'precio_unitario' || campo === 'cantidad_total' ? parseFloat(valor) || 0 : valor }
    }))
  }

  function quitarItem(idx) {
    setItemsForm(prev => prev.filter((_, i) => i !== idx))
  }

  async function crearPreventa() {
    if (!distId) { toast.error('Seleccioná un distribuidor'); return }
    if (itemsForm.length === 0) { toast.error('Agregá al menos un producto'); return }
    if (itemsForm.some(i => i.cantidad_total <= 0)) { toast.error('Todas las cantidades deben ser mayores a 0'); return }
    if (itemsForm.some(i => i.precio_unitario <= 0)) { toast.error('Todos los precios deben ser mayores a 0'); return }

    const totalNeto = itemsForm.reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0)
    const ivaMonto  = incluirIVA ? totalNeto * IVA_PCT : 0

    setGuardando(true)
    const { error } = await supabase.from('preventas').insert({
      distribuidor_id: distId,
      estado: 'activa',
      items: itemsForm,
      notas: notasForm.trim() || null,
      fecha_vencimiento: fechaVenc || null,
      incluir_iva: incluirIVA,
      iva_monto: ivaMonto,
      created_by: user.id,
    })

    if (error) { toast.error('Error al crear preventa: ' + error.message); setGuardando(false); return }

    toast.success('Preventa creada ✅')
    setDistId('')
    setDistSeleccionado(null)
    setDistBusqueda('')
    setItemsForm([])
    setNotasForm('')
    setFechaVenc('')
    setIncluirIVA(false)
    setGuardando(false)
    setTab('lista')
    setFiltroEstado('activa')
    cargar()
  }

  async function cambiarEstado(id, nuevoEstado) {
    const { error } = await supabase.from('preventas').update({ estado: nuevoEstado, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Error al actualizar'); return }
    toast.success(`Preventa ${nuevoEstado}`)
    cargar()
  }

  function abrirEdicionPv(pv) {
    setPvItemsEdit(pv.items.map(i => ({ ...i })))
    setPvNotasEdit(pv.notas || '')
    setPvFechaEdit(pv.fecha_vencimiento || '')
    setPvIVAEdit(pv.incluir_iva || false)
    setPvShowPicker(false)
    setEditandoPv(pv.id)
  }

  function cerrarEdicionPv() {
    setEditandoPv(null)
    setPvItemsEdit([])
    setPvNotasEdit('')
    setPvFechaEdit('')
    setPvIVAEdit(false)
    setPvShowPicker(false)
  }

  function pvActualizarPrecio(idx, val) {
    const precio = Math.max(0, parseFloat(val) || 0)
    setPvItemsEdit(prev => prev.map((item, i) => i !== idx ? item : { ...item, precio_unitario: precio }))
  }

  function pvActualizarCantidad(idx, val) {
    const n = Math.max(0, parseInt(val) || 0)
    setPvItemsEdit(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const min = item.cantidad_retirada || 0
      return { ...item, cantidad_total: Math.max(n, min) }
    }))
  }

  function pvActualizarRetirado(idx, val) {
    const n = Math.max(0, parseInt(val) || 0)
    setPvItemsEdit(prev => prev.map((item, i) => {
      if (i !== idx) return item
      return { ...item, cantidad_retirada: Math.min(n, item.cantidad_total) }
    }))
  }

  function pvQuitarItem(idx) {
    const item = pvItemsEdit[idx]
    if ((item.cantidad_retirada || 0) > 0) { toast.error('No se puede quitar un producto que ya tiene retiros'); return }
    setPvItemsEdit(prev => prev.filter((_, i) => i !== idx))
  }

  function pvAgregarProducto(prod) {
    if (pvItemsEdit.find(i => i.codigo === prod.codigo)) { toast('Ya está en la preventa', { icon: '⚠️' }); return }
    setPvItemsEdit(prev => [...prev, {
      codigo: prod.codigo, nombre: prod.nombre, modelo: prod.modelo,
      categoria: prod.categoria, precio_unitario: prod.precio,
      cantidad_total: 1, cantidad_retirada: 0,
    }])
    setPvShowPicker(false)
  }

  async function guardarEdicionPv(pv) {
    if (pvItemsEdit.length === 0) { toast.error('La preventa debe tener al menos un producto'); return }
    if (pvItemsEdit.some(i => i.precio_unitario <= 0)) { toast.error('Todos los precios deben ser mayores a 0'); return }
    if (pvItemsEdit.some(i => i.cantidad_total <= 0)) { toast.error('Todas las cantidades deben ser mayores a 0'); return }
    const totalNetoEdit = pvItemsEdit.reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0)
    const ivaMontoEdit  = pvIVAEdit ? totalNetoEdit * IVA_PCT : 0
    setGuardandoPv(true)
    const { error } = await supabase.from('preventas').update({
      items: pvItemsEdit,
      notas: pvNotasEdit.trim() || null,
      fecha_vencimiento: pvFechaEdit || null,
      incluir_iva: pvIVAEdit,
      iva_monto: ivaMontoEdit,
      updated_at: new Date().toISOString(),
    }).eq('id', pv.id)
    setGuardandoPv(false)
    if (error) { toast.error('Error al guardar: ' + error.message); return }
    toast.success('Preventa actualizada ✅')
    cerrarEdicionPv()
    cargar()
  }

  function abrirEntrega(pv) {
    setCantEntrega({})
    setEntregaIVA(pv.incluir_iva || false)
    setEntregaNotas('')
    setEntregandoPv(pv.id)
    setEditandoPv(null) // cerrar edición si estaba abierta
  }

  function cerrarEntrega() {
    setEntregandoPv(null)
    setCantEntrega({})
    setEntregaIVA(false)
    setEntregaNotas('')
    setEntregaFactura(null)
  }

  async function registrarEntrega(pv) {
    const itemsEntrega = pv.items
      .filter(i => (cantEntrega[i.codigo] || 0) > 0)
      .map(i => ({
        codigo: i.codigo, nombre: i.nombre, modelo: i.modelo,
        categoria: i.categoria,
        precio_unitario: i.precio_unitario,
        precio_base: i.precio_unitario,
        descuento_pct: 0,
        cantidad: cantEntrega[i.codigo],
        subtotal: i.precio_unitario * cantEntrega[i.codigo],
      }))

    if (itemsEntrega.length === 0) { toast.error('Indicá al menos una cantidad'); return }

    const totalNeto = itemsEntrega.reduce((s, i) => s + i.subtotal, 0)
    const ivaMonto  = entregaIVA ? totalNeto * IVA_PCT : 0
    const totalFinal = totalNeto + ivaMonto

    setRegistrandoEntrega(true)

    // Actualizar cantidad_retirada en la preventa
    const itemsActualizados = pv.items.map(i => ({
      ...i,
      cantidad_retirada: (i.cantidad_retirada || 0) + (cantEntrega[i.codigo] || 0),
    }))

    const { error: errPv } = await supabase.from('preventas').update({
      items: itemsActualizados,
      updated_at: new Date().toISOString(),
    }).eq('id', pv.id)

    setRegistrandoEntrega(false)

    if (errPv) { toast.error('Error al actualizar la preventa: ' + errPv.message); return }

    toast.success('Entrega registrada ✅')
    cerrarEntrega()
    cargar()
  }

  const totalPreventa = (items) => items.reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0)
  const totalRetirado = (items) => items.reduce((s, i) => s + i.precio_unitario * (i.cantidad_retirada || 0), 0)
  const totalPendiente = (items) => items.reduce((s, i) => s + i.precio_unitario * (i.cantidad_total - (i.cantidad_retirada || 0)), 0)

  function abrirSolicitudRetiro(pv) {
    setCantRetiro({})
    setRetiroIVA(pv.incluir_iva || false)
    setRetiroNotas('')
    setSolicitandoRetiroPv(pv.id)
    setEditandoPv(null)
    setEntregandoPv(null)
  }

  function cerrarSolicitudRetiro() {
    setSolicitandoRetiroPv(null)
    setCantRetiro({})
    setRetiroIVA(false)
    setRetiroNotas('')
  }

  async function enviarSolicitudRetiro(pv) {
    const itemsRetiro = pv.items
      .filter(i => (cantRetiro[i.codigo] || 0) > 0)
      .map(i => ({
        codigo: i.codigo, nombre: i.nombre, modelo: i.modelo,
        categoria: i.categoria,
        precio_unitario: i.precio_unitario,
        precio_base: i.precio_unitario,
        descuento_pct: 0,
        cantidad: cantRetiro[i.codigo],
        subtotal: i.precio_unitario * cantRetiro[i.codigo],
      }))
    if (itemsRetiro.length === 0) { toast.error('Indicá al menos una cantidad'); return }
    const totalNeto = itemsRetiro.reduce((s, i) => s + i.subtotal, 0)
    const ivaMonto = retiroIVA ? totalNeto * IVA_PCT : 0
    setEnviandoRetiro(true)
    const { error } = await supabase.from('pedidos').insert({
      distribuidor_id: pv.distribuidor_id,
      estado: 'pendiente',
      tipo: 'preventa',
      preventa_id: pv.id,
      items: itemsRetiro,
      total: totalNeto + ivaMonto,
      iva_monto: ivaMonto,
      incluir_iva: retiroIVA,
      notas: retiroNotas.trim() || null,
    })
    setEnviandoRetiro(false)
    if (error) { toast.error('Error al crear el pedido: ' + error.message); return }
    toast.success('Solicitud de retiro creada ✅ — aparece en Pedidos Distribuidores')
    cerrarSolicitudRetiro()
    cargar()
  }

  function imprimirSaldo(pv) {
    const dist = pv.profiles
    const clienteNombre = dist?.razon_social || dist?.full_name || 'Cliente'
    const items = pv.items || []
    const iva = pv.incluir_iva ? IVA_PCT : 0

    const aplicarIva = (n) => n * (1 + iva)

    const filas = items.map(i => {
      const pendiente = i.cantidad_total - (i.cantidad_retirada || 0)
      const montoTotal = aplicarIva(i.precio_unitario * i.cantidad_total)
      const montoRetirado = aplicarIva(i.precio_unitario * (i.cantidad_retirada || 0))
      const montoPendiente = aplicarIva(i.precio_unitario * pendiente)
      return `
        <tr>
          <td>${i.codigo || ''}</td>
          <td>${i.nombre || ''}${i.modelo ? ' — ' + i.modelo : ''}</td>
          <td style="text-align:center">${i.cantidad_total}</td>
          <td style="text-align:center">${i.cantidad_retirada || 0}</td>
          <td style="text-align:center;font-weight:700;color:${pendiente > 0 ? '#c0392b' : '#27ae60'}">${pendiente}</td>
          <td style="text-align:right">${formatPrecio(montoTotal)}</td>
          <td style="text-align:right">${formatPrecio(montoRetirado)}</td>
          <td style="text-align:right;font-weight:700;color:${pendiente > 0 ? '#c0392b' : '#27ae60'}">${formatPrecio(montoPendiente)}</td>
        </tr>`
    }).join('')

    const totPreventa = aplicarIva(totalPreventa(items))
    const totRetirado = aplicarIva(totalRetirado(items))
    const totPendiente = aplicarIva(totalPendiente(items))
    const fechaHoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const ivaLabel = pv.incluir_iva ? ' (c/ IVA)' : ' (s/ IVA)'

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Saldo Pendiente — ${clienteNombre}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0 }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px }
  h1 { font-size: 20px; margin-bottom: 4px }
  .sub { color: #555; font-size: 12px; margin-bottom: 24px }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px }
  th { background: #222; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px }
  td { padding: 7px 10px; border-bottom: 1px solid #ddd; font-size: 12px }
  tr:last-child td { border-bottom: none }
  .totales { border: 2px solid #222; border-radius: 6px; padding: 16px; max-width: 360px; margin-left: auto }
  .totales div { display: flex; justify-content: space-between; padding: 4px 0 }
  .totales .pendiente { font-weight: 700; font-size: 15px; color: #c0392b; border-top: 1px solid #ccc; padding-top: 8px; margin-top: 4px }
  .btn-print { margin-bottom: 20px; padding: 8px 20px; font-size: 13px; cursor: pointer; background: #222; color: #fff; border: none; border-radius: 4px }
  @media print { .btn-print { display: none } }
</style>
</head>
<body>
<button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
<h1>Saldo Pendiente de Entrega</h1>
<div class="sub">
  Cliente: <strong>${clienteNombre}</strong> &nbsp;|&nbsp;
  Preventa: <strong>#${pv.id.slice(0, 8).toUpperCase()}</strong> &nbsp;|&nbsp;
  Fecha: <strong>${fechaHoy}</strong>
</div>
<table>
  <thead>
    <tr>
      <th>Código</th>
      <th>Producto</th>
      <th style="text-align:center">Total pactado</th>
      <th style="text-align:center">Retirado</th>
      <th style="text-align:center">Pendiente</th>
      <th style="text-align:right">Monto total${ivaLabel}</th>
      <th style="text-align:right">Retirado${ivaLabel}</th>
      <th style="text-align:right">Pendiente${ivaLabel}</th>
    </tr>
  </thead>
  <tbody>${filas}</tbody>
</table>
<div class="totales">
  <div><span>Total preventa${ivaLabel}</span><span>${formatPrecio(totPreventa)}</span></div>
  <div><span>Retirado${ivaLabel}</span><span>${formatPrecio(totRetirado)}</span></div>
  <div class="pendiente"><span>Saldo pendiente${ivaLabel}</span><span>${formatPrecio(totPendiente)}</span></div>
</div>
</body>
</html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  if (!isAdmin && !isAdmin2 && !isVendedor) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Preventas</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Gestioná las preventas de los distribuidores</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setTab(tab === 'nueva' ? 'lista' : 'nueva')}
            style={{ background: tab === 'nueva' ? 'var(--surface2)' : 'var(--brand-gradient)', color: tab === 'nueva' ? 'var(--text2)' : '#fff', border: tab === 'nueva' ? '1px solid var(--border)' : 'none', borderRadius: 'var(--radius)', padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
          >
            {tab === 'nueva' ? '← Volver' : '+ Nueva preventa'}
          </button>
        )}
      </div>

      {/* ── FORM NUEVA PREVENTA ── */}
      {tab === 'nueva' && (
        <div className="form-sidebar-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
          {/* Izquierda: catálogo */}
          <div>
            {/* Distribuidor + fechas */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>Datos de la preventa</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ position: 'relative' }}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5, fontWeight: 600 }}>Distribuidor *</label>
                  {distSeleccionado ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(74,108,247,0.08)', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                      <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                        🏪 {distSeleccionado.razon_social || distSeleccionado.full_name}
                        <span style={{ fontWeight: 400, color: 'var(--text3)', marginLeft: 6 }}>{distSeleccionado.email}</span>
                      </span>
                      <button
                        onClick={() => { setDistSeleccionado(null); setDistId(''); setDistBusqueda('') }}
                        style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}
                      >×</button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={distBusqueda}
                        onChange={e => { setDistBusqueda(e.target.value); setShowDistDrop(true) }}
                        onFocus={() => setShowDistDrop(true)}
                        placeholder="Buscar por nombre, empresa o email..."
                        style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box' }}
                      />
                      {showDistDrop && distBusqueda.length >= 1 && (() => {
                        const q = distBusqueda.toLowerCase()
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
                                onMouseDown={() => { setDistSeleccionado(d); setDistId(d.id); setDistBusqueda(''); setShowDistDrop(false) }}
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
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5, fontWeight: 600 }}>Fecha de vencimiento (opcional)</label>
                  <input
                    type="date"
                    value={fechaVenc}
                    onChange={e => setFechaVenc(e.target.value)}
                    style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5, fontWeight: 600 }}>Notas (opcional)</label>
                <textarea
                  value={notasForm}
                  onChange={e => setNotasForm(e.target.value)}
                  placeholder="Condiciones pactadas, observaciones..."
                  rows={2}
                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', resize: 'vertical', outline: 'none' }}
                />
              </div>
            </div>

            {/* Catálogo para agregar */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
                Seleccioná los productos
              </div>
              {['calefones_calderas', 'paneles_calefactores', 'anafes'].map(cat => {
                const prods = precios.filter(p => p.categoria === cat)
                if (!prods.length) return null
                const labels = { calefones_calderas: '🚿 Calefones / Calderas', paneles_calefactores: '🔆 Paneles Calefactores', anafes: '🔥 Anafes' }
                return (
                  <div key={cat}>
                    <div style={{ padding: '10px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
                      {labels[cat]}
                    </div>
                    {prods.map(p => {
                      const yaAgregado = itemsForm.find(i => i.codigo === p.codigo)
                      return (
                        <div key={p.codigo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4 }}>{p.codigo}</span>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{p.modelo}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, minWidth: 110, textAlign: 'right' }}>{formatPrecio(p.precio)}</div>
                          <button
                            onClick={() => agregarItem(p)}
                            disabled={!!yaAgregado}
                            style={{ background: yaAgregado ? 'var(--surface2)' : 'rgba(74,108,247,0.1)', color: yaAgregado ? 'var(--text3)' : '#7b9fff', border: yaAgregado ? '1px solid var(--border)' : '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: yaAgregado ? 'default' : 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}
                          >
                            {yaAgregado ? '✓ Agregado' : '+ Agregar'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Derecha: resumen preventa */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
                📋 Detalle de la preventa
              </div>
              <div style={{ padding: '16px 20px' }}>
                {itemsForm.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>
                    Agregá productos del catálogo
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {itemsForm.map((item, idx) => (
                      <div key={idx} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.modelo}</div>
                          </div>
                          <button onClick={() => quitarItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16, padding: '0 0 0 8px', lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Precio unit.</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 11, color: 'var(--text3)' }}>$</span>
                              <input
                                type="number" min="0" step="0.01"
                                value={item.precio_unitario}
                                onChange={e => actualizarItem(idx, 'precio_unitario', e.target.value)}
                                style={{ width: '100%', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 6px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'var(--font)' }}
                              />
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Cantidad total</div>
                            <input
                              type="number" min="1"
                              value={item.cantidad_total}
                              onChange={e => actualizarItem(idx, 'cantidad_total', e.target.value)}
                              style={{ width: '100%', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 6px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'var(--font)' }}
                            />
                          </div>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#7b9fff', textAlign: 'right' }}>
                          {formatPrecio(item.precio_unitario * item.cantidad_total)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {itemsForm.length > 0 && (() => {
                  const totalNeto = itemsForm.reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0)
                  const ivaAmount = incluirIVA ? totalNeto * IVA_PCT : 0
                  return (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 16 }}>
                      {incluirIVA && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>
                            <span>Subtotal (neto)</span>
                            <span>{formatPrecio(totalNeto)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                            <span>IVA (21%)</span>
                            <span>{formatPrecio(ivaAmount)}</span>
                          </div>
                        </>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, color: '#7b9fff' }}>
                        <span>Total{incluirIVA ? ' c/IVA' : ' preventa'}</span>
                        <span>{formatPrecio(totalNeto + ivaAmount)}</span>
                      </div>
                    </div>
                  )
                })()}

                {itemsForm.length > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={incluirIVA}
                      onChange={e => setIncluirIVA(e.target.checked)}
                      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#7b9fff' }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Incluir IVA (21%)</span>
                  </label>
                )}

                <button
                  onClick={crearPreventa}
                  disabled={guardando || itemsForm.length === 0 || !distId}
                  style={{ width: '100%', background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: (itemsForm.length === 0 || !distId) ? 'not-allowed' : 'pointer', opacity: (itemsForm.length === 0 || !distId) ? 0.5 : 1, fontFamily: 'var(--font)' }}
                >
                  {guardando ? 'Creando...' : '✓ Crear preventa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LISTA DE PREVENTAS ── */}
      {tab === 'lista' && (
        <>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {['todos', 'activa', 'completada', 'cancelada'].map(f => {
              const cfg = ESTADO_CONFIG[f]
              return (
                <button key={f} onClick={() => setFiltroEstado(f)} style={{
                  padding: '6px 16px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
                  background: filtroEstado === f ? (cfg?.bg || 'var(--surface3)') : 'var(--surface)',
                  color: filtroEstado === f ? (cfg?.color || 'var(--text)') : 'var(--text3)',
                  border: filtroEstado === f ? `1px solid ${cfg?.border || 'var(--border)'}` : '1px solid var(--border)',
                }}>
                  {f === 'todos' ? 'Todas' : cfg?.label}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando preventas...</div>
          ) : preventas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No hay preventas para mostrar.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {preventas.map(pv => {
                const cfg = ESTADO_CONFIG[pv.estado] || ESTADO_CONFIG.activa
                const dist = pv.profiles
                const abierta = expandida === pv.id
                const items = pv.items || []

                return (
                  <div key={pv.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    {/* Header */}
                    <div
                      onClick={() => setExpandida(abierta ? null : pv.id)}
                      style={{ padding: '14px 20px', borderBottom: abierta ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '3px 8px', borderRadius: 4 }}>
                          #{pv.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{cfg.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{dist?.razon_social || dist?.full_name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                            {(() => {
                              const neto = totalPreventa(items)
                              const total = pv.incluir_iva ? neto + (pv.iva_monto || neto * IVA_PCT) : neto
                              const retiradoNeto = totalRetirado(items)
                              const retirado = pv.incluir_iva ? retiradoNeto * (total / neto) : retiradoNeto
                              return (
                                <>
                                  Retirado: <span style={{ color: '#3dd68c', fontWeight: 700 }}>{formatPrecio(retirado)}</span>
                                  {' / '}
                                  <span style={{ fontWeight: 700 }}>{formatPrecio(total)}</span>
                                  {total > 0 && (
                                    <span style={{ marginLeft: 6, color: '#3dd68c', fontWeight: 700 }}>
                                      ({Math.min(100, Math.round((retiradoNeto / neto) * 100))}%)
                                    </span>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
                            {pv.incluir_iva && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.12)', border: '1px solid rgba(74,108,247,0.3)', padding: '1px 7px', borderRadius: 10 }}>
                                IVA incl.
                              </span>
                            )}
                            {pv.fecha_vencimiento && (
                              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                                Vence: {new Date(pv.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-AR')}
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ color: 'var(--text3)', fontSize: 14 }}>{abierta ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Detalle expandido */}
                    {abierta && (
                      <div style={{ padding: '16px 20px' }}>
                        {editandoPv === pv.id ? (
                          /* ── MODO EDICIÓN ── */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {pvItemsEdit.map((item, idx) => {
                              const retirado = item.cantidad_retirada || 0
                              return (
                                <div key={idx} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                    <div>
                                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4, marginRight: 8 }}>{item.codigo}</span>
                                      <span style={{ fontSize: 13, fontWeight: 600 }}>{item.nombre}</span>
                                      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>{item.modelo}</span>
                                    </div>
                                    <button onClick={() => pvQuitarItem(idx)}
                                      disabled={retirado > 0}
                                      title={retirado > 0 ? 'Ya tiene retiros' : 'Quitar'}
                                      style={{ background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: retirado > 0 ? 'var(--text3)' : '#ff5577', cursor: retirado > 0 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                                      ✕ Quitar
                                    </button>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                    <div>
                                      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Precio unitario</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>$</span>
                                        <input type="number" min="0" step="0.01" value={item.precio_unitario}
                                          onChange={e => pvActualizarPrecio(idx, e.target.value)}
                                          style={{ width: '100%', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 7px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                                        Cant. total {retirado > 0 && <span style={{ color: '#ffd166', textTransform: 'none' }}>(mín. {retirado})</span>}
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <button onClick={() => pvActualizarCantidad(idx, item.cantidad_total - 1)} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                        <input type="number" min={retirado} value={item.cantidad_total}
                                          onChange={e => pvActualizarCantidad(idx, e.target.value)}
                                          style={{ width: 56, textAlign: 'center', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
                                        <button onClick={() => pvActualizarCantidad(idx, item.cantidad_total + 1)} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 10, color: '#ffd166', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Cant. retirada</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <button onClick={() => pvActualizarRetirado(idx, retirado - 1)} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                        <input type="number" min="0" max={item.cantidad_total} value={retirado}
                                          onChange={e => pvActualizarRetirado(idx, e.target.value)}
                                          style={{ width: 52, textAlign: 'center', background: 'var(--surface3)', border: '1px solid rgba(255,209,102,0.4)', borderRadius: 6, padding: '5px', color: '#ffd166', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', fontWeight: 700 }} />
                                        <button onClick={() => pvActualizarRetirado(idx, retirado + 1)} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ marginTop: 6, fontSize: 12, color: '#7b9fff', fontWeight: 700, textAlign: 'right' }}>
                                    {formatPrecio(item.precio_unitario * item.cantidad_total)}
                                  </div>
                                </div>
                              )
                            })}

                            {/* Agregar producto */}
                            <button onClick={() => setPvShowPicker(v => !v)}
                              style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px dashed rgba(74,108,247,0.4)', borderRadius: 'var(--radius)', padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              + Agregar producto
                            </button>

                            {pvShowPicker && (
                              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px', maxHeight: 280, overflowY: 'auto' }}>
                                {['calefones_calderas', 'paneles_calefactores', 'anafes'].map(cat => {
                                  const prods = precios.filter(p => p.categoria === cat)
                                  if (!prods.length) return null
                                  const labels = { calefones_calderas: '🚿 Calefones / Calderas', paneles_calefactores: '🔆 Paneles', anafes: '🔥 Anafes' }
                                  return (
                                    <div key={cat} style={{ marginBottom: 10 }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 5 }}>{labels[cat]}</div>
                                      {prods.map(p => (
                                        <button key={p.codigo} onClick={() => pvAgregarProducto(p)}
                                          disabled={!!pvItemsEdit.find(i => i.codigo === p.codigo)}
                                          style={{ display: 'flex', justifyContent: 'space-between', width: '100%', background: pvItemsEdit.find(i => i.codigo === p.codigo) ? 'var(--surface3)' : 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', cursor: pvItemsEdit.find(i => i.codigo === p.codigo) ? 'default' : 'pointer', fontFamily: 'var(--font)', marginBottom: 4 }}>
                                          <span style={{ fontSize: 12, color: pvItemsEdit.find(i => i.codigo === p.codigo) ? 'var(--text3)' : 'var(--text)' }}>{p.nombre} <span style={{ color: 'var(--text3)', fontSize: 11 }}>{p.modelo}</span></span>
                                          <span style={{ fontSize: 12, fontWeight: 700, color: '#7b9fff' }}>{formatPrecio(p.precio)}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {/* Toggle IVA */}
                            {(() => {
                              const netoEdit = pvItemsEdit.reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0)
                              const ivaEdit  = pvIVAEdit ? netoEdit * IVA_PCT : 0
                              return (
                                <div style={{ padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', marginBottom: pvIVAEdit ? 8 : 0 }}>
                                    <input type="checkbox" checked={pvIVAEdit} onChange={e => setPvIVAEdit(e.target.checked)}
                                      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#7b9fff' }} />
                                    <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Incluir IVA (21%)</span>
                                  </label>
                                  {pvIVAEdit && (
                                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text3)', flexWrap: 'wrap' }}>
                                      <span>Subtotal neto: <strong style={{ color: 'var(--text)' }}>{formatPrecio(netoEdit)}</strong></span>
                                      <span>IVA: <strong style={{ color: '#7b9fff' }}>{formatPrecio(ivaEdit)}</strong></span>
                                      <span>Total c/IVA: <strong style={{ color: '#7b9fff' }}>{formatPrecio(netoEdit + ivaEdit)}</strong></span>
                                    </div>
                                  )}
                                </div>
                              )
                            })()}

                            {/* Notas y fecha */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 5 }}>Fecha de vencimiento</div>
                                <input type="date" value={pvFechaEdit} onChange={e => setPvFechaEdit(e.target.value)}
                                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 5 }}>Notas</div>
                                <textarea value={pvNotasEdit} onChange={e => setPvNotasEdit(e.target.value)} rows={2}
                                  placeholder="Condiciones pactadas..."
                                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', resize: 'none', outline: 'none' }} />
                              </div>
                            </div>

                            {/* Botones */}
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                              <button onClick={() => guardarEdicionPv(pv)} disabled={guardandoPv}
                                style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 'var(--radius)', padding: '7px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                {guardandoPv ? 'Guardando...' : '✓ Guardar cambios'}
                              </button>
                              <button onClick={cerrarEdicionPv}
                                style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : entregandoPv === pv.id ? (
                          /* ── MODO ENTREGA ── */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#3dd68c', marginBottom: 2 }}>
                              📦 Registrar entrega — indicá las cantidades a entregar
                            </div>
                            {items.map((item, i) => {
                              const pendiente = item.cantidad_total - (item.cantidad_retirada || 0)
                              const cant = cantEntrega[item.codigo] || 0
                              return (
                                <div key={i} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 16, opacity: pendiente === 0 ? 0.5 : 1 }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4 }}>{item.codigo}</span>
                                      <span style={{ fontSize: 13, fontWeight: 600 }}>{item.nombre}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.modelo}</div>
                                    <div style={{ fontSize: 11, color: pendiente > 0 ? '#ffd166' : '#3dd68c', marginTop: 2 }}>
                                      {pendiente > 0 ? `${pendiente} disponibles` : 'Completo ✓'}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <button onClick={() => setCantEntrega(p => ({ ...p, [item.codigo]: Math.max(0, (p[item.codigo] || 0) - 1) }))} disabled={pendiente === 0 || cant === 0}
                                      style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                    <input type="number" min="0" max={pendiente} value={cant || ''}
                                      onChange={e => setCantEntrega(p => ({ ...p, [item.codigo]: Math.min(pendiente, Math.max(0, parseInt(e.target.value) || 0)) }))}
                                      placeholder="0" disabled={pendiente === 0}
                                      style={{ width: 52, textAlign: 'center', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
                                    <button onClick={() => setCantEntrega(p => ({ ...p, [item.codigo]: Math.min(pendiente, (p[item.codigo] || 0) + 1) }))} disabled={pendiente === 0 || cant >= pendiente}
                                      style={{ width: 28, height: 28, borderRadius: 6, background: pendiente > 0 ? 'var(--brand-gradient)' : 'var(--surface2)', border: 'none', color: '#fff', cursor: pendiente > 0 ? 'pointer' : 'default', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                  </div>
                                </div>
                              )
                            })}

                            {/* Resumen entrega */}
                            {Object.values(cantEntrega).some(v => v > 0) && (() => {
                              const itemsEnt = items.filter(i => (cantEntrega[i.codigo] || 0) > 0)
                              return (
                                <div style={{ padding: '10px 14px', background: 'rgba(61,214,140,0.06)', border: '1px solid rgba(61,214,140,0.25)', borderRadius: 'var(--radius)' }}>
                                  {itemsEnt.map(i => (
                                    <div key={i.codigo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>
                                      <span>{i.nombre}{i.modelo ? ' ' + i.modelo : ''}</span>
                                      <span style={{ fontWeight: 700, color: '#3dd68c' }}>x{cantEntrega[i.codigo]}</span>
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}

                            {/* Notas */}
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Nota interna (opcional)</div>
                              <textarea value={entregaNotas} onChange={e => setEntregaNotas(e.target.value)} rows={2}
                                placeholder="Observaciones de la entrega..."
                                style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', resize: 'none', outline: 'none' }} />
                            </div>

                            {/* Factura */}
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Factura (opcional)</div>
                              {entregaFactura ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(61,214,140,0.07)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                                  <span style={{ flex: 1, color: '#3dd68c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {entregaFactura.name}</span>
                                  <button onClick={() => setEntregaFactura(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>
                                </div>
                              ) : (
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>
                                  📎 Adjuntar factura
                                  <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setEntregaFactura(e.target.files[0] || null)} />
                                </label>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => registrarEntrega(pv)} disabled={registrandoEntrega || subiendoFactura || !Object.values(cantEntrega).some(v => v > 0)}
                                style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 'var(--radius)', padding: '7px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', opacity: !Object.values(cantEntrega).some(v => v > 0) ? 0.5 : 1 }}>
                                {subiendoFactura ? 'Subiendo factura...' : registrandoEntrega ? 'Registrando...' : '📦 Confirmar entrega'}
                              </button>
                              <button onClick={cerrarEntrega}
                                style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : solicitandoRetiroPv === pv.id ? (
                          /* ── MODO SOLICITAR RETIRO ── */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#fb923c', marginBottom: 2 }}>
                              📋 Solicitar retiro — indicá las cantidades para este pedido
                            </div>
                            {items.map((item, i) => {
                              const pendiente = item.cantidad_total - (item.cantidad_retirada || 0)
                              const cant = cantRetiro[item.codigo] || 0
                              return (
                                <div key={i} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 16, opacity: pendiente === 0 ? 0.5 : 1 }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4 }}>{item.codigo}</span>
                                      <span style={{ fontSize: 13, fontWeight: 600 }}>{item.nombre}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.modelo}</div>
                                    <div style={{ fontSize: 11, color: pendiente > 0 ? '#ffd166' : '#3dd68c', marginTop: 2 }}>
                                      {pendiente > 0 ? `${pendiente} disponibles` : 'Completo ✓'}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <button onClick={() => setCantRetiro(p => ({ ...p, [item.codigo]: Math.max(0, (p[item.codigo] || 0) - 1) }))} disabled={pendiente === 0 || cant === 0}
                                      style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                    <input type="number" min="0" max={pendiente} value={cant || ''}
                                      onChange={e => setCantRetiro(p => ({ ...p, [item.codigo]: Math.min(pendiente, Math.max(0, parseInt(e.target.value) || 0)) }))}
                                      placeholder="0" disabled={pendiente === 0}
                                      style={{ width: 52, textAlign: 'center', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
                                    <button onClick={() => setCantRetiro(p => ({ ...p, [item.codigo]: Math.min(pendiente, (p[item.codigo] || 0) + 1) }))} disabled={pendiente === 0 || cant >= pendiente}
                                      style={{ width: 28, height: 28, borderRadius: 6, background: pendiente > 0 ? 'rgba(251,146,60,0.5)' : 'var(--surface2)', border: 'none', color: '#fff', cursor: pendiente > 0 ? 'pointer' : 'default', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                  </div>
                                </div>
                              )
                            })}

                            {/* Resumen */}
                            {Object.values(cantRetiro).some(v => v > 0) && (() => {
                              const itemsEnt = items.filter(i => (cantRetiro[i.codigo] || 0) > 0)
                              const totalNeto = itemsEnt.reduce((s, i) => s + i.precio_unitario * cantRetiro[i.codigo], 0)
                              const ivaAmt = retiroIVA ? totalNeto * IVA_PCT : 0
                              return (
                                <div style={{ padding: '10px 14px', background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 'var(--radius)' }}>
                                  {itemsEnt.map(i => (
                                    <div key={i.codigo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>
                                      <span>{i.nombre}{i.modelo ? ' ' + i.modelo : ''}</span>
                                      <span style={{ fontWeight: 700, color: '#fb923c' }}>×{cantRetiro[i.codigo]} — {formatPrecio(i.precio_unitario * cantRetiro[i.codigo])}</span>
                                    </div>
                                  ))}
                                  <div style={{ borderTop: '1px solid rgba(251,146,60,0.2)', marginTop: 6, paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12 }}>
                                    <span style={{ color: 'var(--text3)' }}>Total{retiroIVA ? ' c/IVA' : ''}</span>
                                    <span style={{ color: '#fb923c' }}>{formatPrecio(totalNeto + ivaAmt)}</span>
                                  </div>
                                </div>
                              )
                            })()}

                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>
                              <input type="checkbox" checked={retiroIVA} onChange={e => setRetiroIVA(e.target.checked)} style={{ width: 14, height: 14, accentColor: '#fb923c' }} />
                              Incluir IVA (21%)
                            </label>

                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Notas (opcional)</div>
                              <textarea value={retiroNotas} onChange={e => setRetiroNotas(e.target.value)} rows={2}
                                placeholder="Observaciones del retiro..."
                                style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', resize: 'none', outline: 'none' }} />
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => enviarSolicitudRetiro(pv)} disabled={enviandoRetiro || !Object.values(cantRetiro).some(v => v > 0)}
                                style={{ background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.4)', borderRadius: 'var(--radius)', padding: '7px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', opacity: !Object.values(cantRetiro).some(v => v > 0) ? 0.5 : 1 }}>
                                {enviandoRetiro ? 'Creando pedido...' : '📋 Confirmar solicitud'}
                              </button>
                              <button onClick={cerrarSolicitudRetiro}
                                style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── MODO VISTA ── */
                          <>
                            {/* Progreso por producto */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                              {items.map((item, i) => {
                                const retirado = item.cantidad_retirada || 0
                                const pct = item.cantidad_total > 0 ? (retirado / item.cantidad_total) * 100 : 0
                                const pendiente = item.cantidad_total - retirado
                                return (
                                  <div key={i} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                                      <div>
                                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4, marginRight: 8 }}>{item.codigo}</span>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>{item.nombre}</span>
                                        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>{item.modelo}</span>
                                      </div>
                                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{formatPrecio(item.precio_unitario)} c/u</div>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                                      <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#3dd68c' : 'var(--brand-gradient)', borderRadius: 3, transition: 'width 0.3s' }} />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                                      <span>Retirado: <strong style={{ color: '#3dd68c' }}>{retirado}</strong> / {item.cantidad_total}</span>
                                      <span>Pendiente: <strong style={{ color: pendiente > 0 ? '#ffd166' : 'var(--text3)' }}>{pendiente}</strong></span>
                                      <span>{formatPrecio(item.precio_unitario * retirado)} retirado</span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {/* Totales */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 8 }}>
                              {(() => {
                                const ivaFactor = pv.incluir_iva ? (1 + IVA_PCT) : 1
                                return [
                                  { label: 'Total preventa', value: totalPreventa(items) * ivaFactor, color: 'var(--text)' },
                                  { label: 'Retirado', value: totalRetirado(items) * ivaFactor, color: '#3dd68c' },
                                  { label: 'Pendiente', value: totalPendiente(items) * ivaFactor, color: '#ffd166' },
                                ]
                              })().map(({ label, value, color }) => (
                                <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center' }}>
                                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
                                  <div style={{ fontSize: 14, fontWeight: 800, color }}>{formatPrecio(value)}</div>
                                </div>
                              ))}
                            </div>

                            {/* Pagos */}
                            <div style={{ marginBottom: 8, paddingTop: 4 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>💳 Pagos</div>
                                {agregandoPago !== pv.id && (
                                  <button
                                    onClick={e => { e.stopPropagation(); setAgregandoPago(pv.id); setPagoFecha(new Date().toISOString().split('T')[0]) }}
                                    style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 'var(--radius)', padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                                  >
                                    + Agregar pago
                                  </button>
                                )}
                              </div>
                              {(pv.pagos || []).length === 0 ? (
                                <div style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0', marginBottom: 10 }}>Sin pagos registrados aún.</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                                  {(pv.pagos || []).map(pago => (
                                    <div key={pago.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                          <span style={{ fontWeight: 800, color: '#a78bfa', fontSize: 13 }}>{formatPrecio(pago.monto)}</span>
                                          <span style={{ color: 'var(--text3)', fontSize: 11 }}>{new Date(pago.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</span>
                                          {pago.notas && <span style={{ color: 'var(--text2)', fontSize: 11 }}>— {pago.notas}</span>}
                                        </div>
                                        <div style={{ color: 'var(--text3)', fontSize: 11, marginTop: 2 }}>
                                          Por {pago.registrado_por_nombre}
                                          {pago.comprobante_url && (
                                            <a href={pago.comprobante_url} target="_blank" rel="noreferrer" style={{ color: '#7b9fff', marginLeft: 8, textDecoration: 'none', fontWeight: 600 }}>
                                              📎 Ver comprobante
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                      {isAdmin && (
                                        <button onClick={e => { e.stopPropagation(); eliminarPago(pv, pago.id) }}
                                          style={{ background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, color: '#ff5577', cursor: 'pointer', fontSize: 11, padding: '3px 8px', fontFamily: 'var(--font)', marginTop: 2 }}>
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {agregandoPago === pv.id && (
                                <div style={{ padding: '14px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                                    <div>
                                      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Monto *</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>$</span>
                                        <input type="number" min="0" step="0.01" value={pagoMonto} onChange={e => setPagoMonto(e.target.value)}
                                          placeholder="0.00" autoFocus
                                          style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', fontWeight: 700 }} />
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Fecha</div>
                                      <input type="date" value={pagoFecha} onChange={e => setPagoFecha(e.target.value)}
                                        style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
                                    </div>
                                  </div>
                                  <div style={{ marginBottom: 10 }}>
                                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Descripción / referencia (opcional)</div>
                                    <input type="text" value={pagoNotas} onChange={e => setPagoNotas(e.target.value)} placeholder="Transferencia, efectivo, cheque..."
                                      style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'var(--font)' }} />
                                  </div>
                                  <div style={{ marginBottom: 12 }}>
                                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Comprobante (opcional)</div>
                                    {pagoComprobante ? (
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(61,214,140,0.07)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 6, fontSize: 12 }}>
                                        <span style={{ flex: 1, color: '#3dd68c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {pagoComprobante.name}</span>
                                        <button onClick={() => setPagoComprobante(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>
                                      </div>
                                    ) : (
                                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 11, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>
                                        📎 Adjuntar comprobante
                                        <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setPagoComprobante(e.target.files[0] || null)} />
                                      </label>
                                    )}
                                  </div>
                                  <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => registrarPago(pv)} disabled={registrandoPago || subiendoPagoComp || !pagoMonto}
                                      style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: !pagoMonto ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', opacity: !pagoMonto ? 0.5 : 1 }}>
                                      {subiendoPagoComp ? 'Subiendo...' : registrandoPago ? 'Registrando...' : '✓ Registrar pago'}
                                    </button>
                                    <button onClick={() => { setAgregandoPago(null); setPagoMonto(''); setPagoFecha(''); setPagoNotas(''); setPagoComprobante(null) }}
                                      style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                      Cancelar
                                    </button>
                                  </div>
                                </div>
                              )}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center' }}>
                                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Total pagado</div>
                                  <div style={{ fontSize: 14, fontWeight: 800, color: '#a78bfa' }}>{formatPrecio((pv.pagos || []).reduce((s, p) => s + p.monto, 0))}</div>
                                </div>
                                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center' }}>
                                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Saldo deudor</div>
                                  {(() => {
                                    const total = pv.incluir_iva ? totalPreventa(items) + (pv.iva_monto || totalPreventa(items) * IVA_PCT) : totalPreventa(items)
                                    const pagado = (pv.pagos || []).reduce((s, p) => s + p.monto, 0)
                                    const deuda = Math.max(0, total - pagado)
                                    return <div style={{ fontSize: 14, fontWeight: 800, color: deuda > 0 ? '#ff5577' : '#3dd68c' }}>{formatPrecio(deuda)}</div>
                                  })()}
                                </div>
                              </div>
                            </div>
                            {pv.incluir_iva && (
                              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 'var(--radius)', display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12 }}>
                                <span style={{ color: 'var(--text3)' }}>Subtotal neto: <strong style={{ color: 'var(--text)' }}>{formatPrecio(totalPreventa(items))}</strong></span>
                                <span style={{ color: 'var(--text3)' }}>IVA (21%): <strong style={{ color: '#7b9fff' }}>{formatPrecio(pv.iva_monto || totalPreventa(items) * IVA_PCT)}</strong></span>
                                <span style={{ color: 'var(--text3)' }}>Total c/IVA: <strong style={{ color: '#7b9fff' }}>{formatPrecio(totalPreventa(items) + (pv.iva_monto || totalPreventa(items) * IVA_PCT))}</strong></span>
                              </div>
                            )}

                            {/* Notas */}
                            {pv.notas && (
                              <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                                <span style={{ fontWeight: 700, color: '#7b9fff' }}>Notas: </span>{pv.notas}
                              </div>
                            )}

                            {/* Facturas adjuntas */}
                            <div style={{ marginBottom: 14 }}>
                              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>
                                📄 Facturas adjuntas {(pv.facturas || []).length > 0 && <span style={{ fontWeight: 400, color: 'var(--text3)' }}>({pv.facturas.length})</span>}
                              </div>
                              {(pv.facturas || []).length === 0 ? (
                                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 8 }}>Sin facturas adjuntas.</div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                                  {(pv.facturas || []).map((f, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                                      <a href={f.url} target="_blank" rel="noreferrer" style={{ flex: 1, color: '#7b9fff', textDecoration: 'none', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        📎 {f.nombre}
                                      </a>
                                      <span style={{ color: 'var(--text3)', fontSize: 11, whiteSpace: 'nowrap' }}>{f.subido_por} · {new Date(f.created_at).toLocaleDateString('es-AR')}</span>
                                      <button onClick={() => eliminarFacturaPv(pv, i)}
                                        style={{ background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>✕</button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(74,108,247,0.08)', border: '1px dashed rgba(74,108,247,0.4)', borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, color: '#7b9fff', cursor: subiendoFacturaPvId === pv.id ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', fontWeight: 600, opacity: subiendoFacturaPvId === pv.id ? 0.6 : 1 }}>
                                {subiendoFacturaPvId === pv.id ? '⏳ Subiendo...' : '📎 Adjuntar facturas'}
                                <input type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} disabled={subiendoFacturaPvId === pv.id}
                                  onChange={e => { const f = Array.from(e.target.files || []); e.target.value = ''; if (f.length) subirFacturaPv(pv, f) }} />
                              </label>
                            </div>

                            {/* Acciones */}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              {/* Exportar */}
                              <div style={{ position: 'relative' }} ref={exportDropPv === pv.id ? exportDropRef : null}>
                                <button
                                  onClick={() => setExportDropPv(exportDropPv === pv.id ? null : pv.id)}
                                  style={{ background: 'rgba(255,107,43,0.1)', color: '#ff6b2b', border: '1px solid rgba(255,107,43,0.35)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                  ⬇ Exportar
                                </button>
                                {exportDropPv === pv.id && (
                                  <div style={{ position: 'absolute', bottom: '110%', left: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', zIndex: 300, minWidth: 160, overflow: 'hidden' }}>
                                    <button onClick={() => { imprimirPreventa(pv); setExportDropPv(null) }}
                                      style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', cursor: 'pointer', textAlign: 'left' }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                      📄 Exportar PDF
                                    </button>
                                    <button onClick={() => { exportarPreventaExcel(pv); setExportDropPv(null) }}
                                      style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', cursor: 'pointer', textAlign: 'left' }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                      📊 Exportar Excel
                                    </button>
                                    <button onClick={() => { imprimirSaldo(pv); setExportDropPv(null) }}
                                      style={{ display: 'block', width: '100%', padding: '10px 16px', background: 'none', border: 'none', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', cursor: 'pointer', textAlign: 'left' }}
                                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                                      🖨️ Saldo Pendiente
                                    </button>
                                  </div>
                                )}
                              </div>
                              <button onClick={() => abrirEdicionPv(pv)}
                                style={{ background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                ✏️ Editar preventa
                              </button>
                              {pv.estado === 'activa' && (
                                <>
                                  <button onClick={() => recalcularSaldoPreventa(pv)} disabled={recalculando === pv.id}
                                    style={{ background: 'rgba(56,189,248,0.08)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                    {recalculando === pv.id ? 'Recalculando...' : '🔁 Recalcular saldo'}
                                  </button>
                                  <button onClick={() => abrirSolicitudRetiro(pv)}
                                    style={{ background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.35)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                    📋 Solicitar retiro
                                  </button>
                                  <button onClick={() => abrirEntrega(pv)}
                                    style={{ background: 'rgba(61,214,140,0.1)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                    📦 Registrar entrega
                                  </button>
                                  <button onClick={() => cambiarEstado(pv.id, 'completada')} style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                    ✓ Marcar completada
                                  </button>
                                  <button onClick={() => cambiarEstado(pv.id, 'cancelada')} style={{ background: 'rgba(255,85,119,0.08)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                    Cancelar preventa
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
