import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { usePersistedState } from '@/hooks/usePersistedState'
import { Spinner } from '@/components/ui'
import { ArrowDownCircle, ArrowUpCircle, Package, History, ShoppingBag, Upload, FileText, Info, Bell, Briefcase } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const CATALOGO = [
  {
    categoria: 'calefones_calderas', label: 'Calefones / Calderas', emoji: '🚿',
    productos: [
      { codigo: 'KF70SIL',     nombre: 'Calefón One',    modelo: '3,5/5,5/7Kw 220V Silver' },
      { codigo: 'FE150TBLACK', nombre: 'Calefón Nova',   modelo: '6/8/9/13,5Kw 220V Black' },
      { codigo: 'FE150TSIL',   nombre: 'Calefón Nova',   modelo: '6/8/9/13,5Kw 220V Silver' },
      { codigo: 'FE150TBL',    nombre: 'Calefón Nova',   modelo: '6/8/9/13,5Kw 220V Blanco' },
      { codigo: 'FM318BL',     nombre: 'Calefón Pulse',  modelo: '9/13,5/18Kw 380V Blanco' },
      { codigo: 'FM324BL',     nombre: 'Calefón Pulse',  modelo: '12/18/24Kw 380V Blanco' },
      { codigo: 'BF14EBL',     nombre: 'Caldera Core',   modelo: '220-380V 14,4Kw Blanco' },
      { codigo: 'BF323EBL',    nombre: 'Caldera Core',   modelo: '380V 23Kw Blanco' },
    ],
  },
  {
    categoria: 'paneles_calefactores', label: 'Paneles Calefactores', emoji: '🔆',
    productos: [
      { codigo: 'C250STV1',     nombre: 'Slim',          modelo: '250w' },
      { codigo: 'C250STV1TS',   nombre: 'Slim',          modelo: '250w Toallero Simple' },
      { codigo: 'C250STV1TD',   nombre: 'Slim',          modelo: '250w Toallero Doble' },
      { codigo: 'C500STV1',     nombre: 'Slim',          modelo: '500w' },
      { codigo: 'C500STV1TS',   nombre: 'Slim',          modelo: '500w Toallero Simple' },
      { codigo: 'C500STV1TD',   nombre: 'Slim',          modelo: '500w Toallero Doble' },
      { codigo: 'C500STV1MB',   nombre: 'Slim',          modelo: '500w Madera Blanca' },
      { codigo: 'F1400BCO',     nombre: 'Firenze',       modelo: '1400w Blanco' },
      { codigo: 'F1400MB',      nombre: 'Firenze',       modelo: '1400w Madera Blanca' },
      { codigo: 'F1400MV',      nombre: 'Firenze',       modelo: '1400w Madera Veteada' },
      { codigo: 'F1400PA',      nombre: 'Firenze',       modelo: '1400w Piedra Azteca' },
      { codigo: 'F1400PR',      nombre: 'Firenze',       modelo: '1400w Piedra Romana' },
      { codigo: 'F1400MTG',     nombre: 'Firenze',       modelo: '1400w Mármol Traviatta Gris' },
      { codigo: 'F1400PCL',     nombre: 'Firenze',       modelo: '1400w Piedra Cantera Luna' },
      { codigo: 'F1400MCO',     nombre: 'Firenze',       modelo: '1400w Mármol Calacatta Ocre' },
      { codigo: 'F1400SMARTBL', nombre: 'Firenze Smart', modelo: '1400w Smart Wifi' },
    ],
  },
  {
    categoria: 'anafes', label: 'Anafes', emoji: '🍳',
    productos: [
      { codigo: 'K40010', nombre: 'Anafe Inducción + Extractor',  modelo: '4 Hornallas Touch' },
      { codigo: 'K40011', nombre: 'Anafe Inducción + Extractor',  modelo: '4 Hornallas Knob' },
      { codigo: 'DT4',    nombre: 'Anafe Infrarrojo + Extractor', modelo: '4 Hornallas Touch' },
      { codigo: 'DT4W',   nombre: 'Anafe Infrarrojo + Extractor', modelo: '4 Hornallas Knob' },
      { codigo: 'K1002',  nombre: 'Anafe Inducción',              modelo: '2 Hornallas Touch' },
      { codigo: 'K2002',  nombre: 'Anafe Infrarrojo',             modelo: '2 Hornallas Knob' },
      { codigo: 'DT4-1',  nombre: 'Anafe Inducción',              modelo: '4 Hornallas Touch' },
    ],
  },
]

const PRODUCTOS_TODOS = CATALOGO.flatMap(cat =>
  cat.productos.map(p => ({ ...p, categoria: cat.categoria, catLabel: cat.label }))
)

const CANALES_EGRESO = ['Distribuidor', 'Mercado Libre', 'Web TEMPTECH']
const CAT_COLORS = {
  calefones_calderas:   { color: '#ff6b2b', bg: 'rgba(255,107,43,0.12)',  border: 'rgba(255,107,43,0.35)' },
  paneles_calefactores: { color: '#ffd166', bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.35)' },
  anafes:               { color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)' },
}

function formatFecha(d) {
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: es }) } catch { return '' }
}

const inputSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }

export default function IngresoEgresoPT() {
  const { user, profile, isAdmin, isAdmin2 } = useAuth()
  const [view, setView]         = usePersistedState('iept_view', 'pedidos')  // 'stock' | 'historial'
  const [stock, setStock]       = useState({})         // { [codigo]: { stock_inicial, stock_actual } }
  const [movs, setMovs]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [preciosDB, setPreciosDB] = useState([])
  const [busquedaHist, setBusquedaHist] = useState('')
  const [sortOrderHist, setSortOrderHist] = useState('newest')
  const [fechaHist, setFechaHist]       = useState('')
  const [catFilter, setCatFilter] = useState('')

  // Modal egreso
  const [modalEgreso, setModalEgreso]   = useState(false)
  const [eProducto, setEProducto]       = useState(null)
  const [eCantidad, setECantidad]       = useState('')
  const [eCanal, setECanal]             = useState('Distribuidor')
  const [eObs, setEObs]                 = useState('')
  const [guardando, setGuardando]       = useState(false)

  // Modal ingreso
  const [modalIngreso, setModalIngreso]   = useState(false)
  const [iProducto, setIProducto]         = useState(null)
  const [iCantidad, setICantidad]         = useState('')
  const [iObs, setIObs]                   = useState('')
  const [guardandoIngreso, setGuardandoIngreso] = useState(false)

  // Tab pedidos
  const [pedidos, setPedidos]               = useState([])
  const [loadingPedidos, setLoadingPedidos] = useState(false)
  const [busquedaPed, setBusquedaPed]       = useState('')
  const [modalPedido, setModalPedido]       = useState(false)
  const [pedidoSel, setPedidoSel]           = useState(null)
  const [pItems, setPItems]                 = useState([])  // items editables
  const [pNroRemito, setPNroRemito]         = useState('')
  const [pFotosRemito, setPFotosRemito]     = useState([])
  const [confirmandoPed, setConfirmandoPed] = useState(false)
  const confirmingPedRef = useRef(false)

  // Modal stock inicial (solo admin)
  const [modalStock, setModalStock]     = useState(false)
  const [sProducto, setSProducto]       = useState(null)
  const [sCantidad, setSCantidad]       = useState('')
  const [guardandoStock, setGuardandoStock] = useState(false)

  // Tabs egreso canal (meli/pagina/vo)
  // Modal producción
  const [modalProd, setModalProd]           = useState(false)
  const [prodFecha, setProdFecha]           = useState(() => new Date().toISOString().split('T')[0])
  const [prodLote, setProdLote]             = useState('')
  const [prodItems, setProdItems]           = useState([{ codigo: '', nombre: '', modelo: '', categoria: '', cantidad: 1 }])
  const [guardandoProd, setGuardandoProd]   = useState(false)

  const [minimoEdit, setMinimoEdit]       = useState({})
  const [enviandoAlerta, setEnviandoAlerta] = useState(false)

  // Modal edición de movimiento
  const [editandoMov, setEditandoMov]         = useState(null)
  const [editCantidad, setEditCantidad]       = useState('')
  const [editObs, setEditObs]                 = useState('')
  const [guardandoEditMov, setGuardandoEditMov] = useState(false)

  // Modal tránsito
  const [modalTransito, setModalTransito]       = useState(false)
  const [transitoPendiente, setTransitoPendiente] = useState([])
  const [loadingTransito, setLoadingTransito]   = useState(false)
  const [confirmandoTransito, setConfirmandoTransito] = useState(null)

  // Tab: Egreso Devoluciones (egresos_garantia pendientes)
  const [egresosGarantia, setEgresosGarantia]           = useState([])
  const [loadingEgresosGar, setLoadingEgresosGar]       = useState(false)
  const [modalEgresoGar, setModalEgresoGar]             = useState(false)
  const [egresoGarSel, setEgresoGarSel]                 = useState(null)
  const [confirmandoEgresoGar, setConfirmandoEgresoGar] = useState(false)

  // Tab: Dev. Entrada (devoluciones origen=garantia recibidas)
  const [devGarantia, setDevGarantia]               = useState([])
  const [loadingDevGar, setLoadingDevGar]           = useState(false)
  const [modalDevGar, setModalDevGar]               = useState(false)
  const [devGarSel, setDevGarSel]                   = useState(null)
  const [devGarItemsEdit, setDevGarItemsEdit]       = useState([])
  const [devGarRecuperable, setDevGarRecuperable]   = useState(true)
  const [confirmandoDevGar, setConfirmandoDevGar]   = useState(false)

  // Tab: Préstamos
  const [prestamos, setPrestamos]               = useState([])
  const [loadingPrestamos, setLoadingPrestamos] = useState(false)
  const [modalPrestamo, setModalPrestamo]       = useState(false)
  const [prItems, setPrItems]                   = useState([{ codigo: '', nombre: '', modelo: '', cantidad: 1 }])
  const [prDestino, setPrDestino]               = useState('')
  const [prObservacion, setPrObservacion]       = useState('')
  const [prFechaRetorno, setPrFechaRetorno]     = useState('')
  const [guardandoPrestamo, setGuardandoPrestamo] = useState(false)
  const [verHistorialPrestamos, setVerHistorialPrestamos] = useState(false)
  const [editandoPrestamo, setEditandoPrestamo]   = useState(null)   // prestamo | null
  const [prEditItems, setPrEditItems]             = useState([])
  const [prEditDestino, setPrEditDestino]         = useState('')
  const [prEditObservacion, setPrEditObservacion] = useState('')
  const [prEditFechaRetorno, setPrEditFechaRetorno] = useState('')
  const [guardandoEditPr, setGuardandoEditPr]     = useState(false)

  const [ventas, setVentas]               = useState([])
  const [ventaDetalle, setVentaDetalle]   = useState(null)
  const [loadingVentas, setLoadingVentas] = useState(false)
  const [busquedaVenta, setBusquedaVenta] = useState('')
  const [filtroEstadoVenta, setFiltroEstadoVenta] = useState('pendiente')
  const [modalVenta, setModalVenta]       = useState(false)
  const [ventaSel, setVentaSel]           = useState(null)
  const [vItems, setVItems]               = useState([])
  const [vNroRemito, setVNroRemito]       = useState('')
  const [vArchivosRemito, setVArchivosRemito] = useState([])
  const [confirmandoVenta, setConfirmandoVenta] = useState(false)

  const CANAL_VIEWS = ['egreso-meli', 'egreso-pagina', 'egreso-vo']
  const CANAL_LABELS = { 'egreso-meli': 'Mercado Libre', 'egreso-pagina': 'Página Web', 'egreso-vo': 'Venta VO' }
  const CANAL_KEYS   = { 'egreso-meli': 'meli', 'egreso-pagina': 'pagina', 'egreso-vo': 'vo' }
  const CANAL_COLORS = { 'egreso-meli': '#ffe600', 'egreso-pagina': '#7b9fff', 'egreso-vo': '#a78bfa' }

  useEffect(() => {
    cargar()
    supabase.from('precios').select('codigo,nombre,modelo,categoria').order('categoria').order('nombre').then(({ data }) => setPreciosDB(data || []))
  }, [])
  useEffect(() => { if (view === 'pedidos') cargarPedidos() }, [view])
  useEffect(() => { if (CANAL_VIEWS.includes(view)) cargarVentas(CANAL_KEYS[view]) }, [view])
  useEffect(() => { if (view === 'egreso-dev') cargarEgresosGarantia() }, [view])
  useEffect(() => { if (view === 'dev-entrada') cargarDevGarantia() }, [view])
  useEffect(() => { if (view === 'prestamos') cargarPrestamos() }, [view])

  async function cargarPedidos() {
    setLoadingPedidos(true)
    const { data } = await supabase
      .from('pedidos')
      .select('*, profiles!distribuidor_id(full_name, razon_social, email)')
      .in('estado', ['enviado', 'entregado'])
      .or('stock_descontado.is.null,stock_descontado.eq.false')
      .order('created_at', { ascending: false })
    setPedidos(data || [])
    setLoadingPedidos(false)
  }

  async function cargarVentas(canal) {
    setLoadingVentas(true)
    const { data } = await supabase
      .from('ventas')
      .select('*')
      .eq('canal', canal)
      .eq('estado', 'enviado')
      .or('stock_descontado.is.null,stock_descontado.eq.false')
      .order('created_at', { ascending: false })
    setVentas(data || [])
    setLoadingVentas(false)
  }

  async function confirmarEgresoVenta() {
    if (!ventaSel) return
    setConfirmandoVenta(true)

    // Descontar stock por items de la venta
    for (const item of vItems) {
      if (!item.codigo || !item.cantidad) continue
      const actual = stock[item.codigo]?.stock_actual ?? 0
      const nuevo = Math.max(0, actual - item.cantidad)
      await supabase.from('stock_pt').upsert({
        codigo: item.codigo, nombre: item.nombre || '', modelo: item.modelo || '', categoria: item.categoria || '',
        stock_actual: nuevo, stock_inicial: stock[item.codigo]?.stock_inicial ?? 0,
      }, { onConflict: 'codigo' })
      const sMinV = stock[item.codigo]?.stock_minimo
      if (nuevo === 0 || (sMinV != null && nuevo <= sMinV)) {
        await notificarAdminsStockBajo(item.codigo, item.nombre || '', item.modelo || '', nuevo, sMinV)
      }
      await supabase.from('movimientos_pt').insert({
        codigo: item.codigo, nombre: item.nombre || '', modelo: item.modelo || '', categoria: item.categoria || '',
        tipo: 'egreso', cantidad: item.cantidad, canal: (() => {
          const base = CANAL_LABELS[view] || ventaSel.canal
          if (ventaSel.tipo_envio === 'correo') return `${base} · Correo/Andreani`
          if (ventaSel.tipo_envio === 'logistica') return `${base} · Logística`
          if (ventaSel.tipo_envio === 'retiro') return `${base} · Retiro Fábrica`
          return base
        })(),
        observacion: `Venta ${ventaSel.canal.toUpperCase()} ${ventaSel.nro_orden ? '· ' + ventaSel.nro_orden : ''} · ${ventaSel.cliente_nombre}${vNroRemito ? ' · Remito ' + vNroRemito : ''}`,
        usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
        referencia_nombre: ventaSel.cliente_nombre || null,
      })
    }

    // Subir archivos de remito
    const remitoUrls = []
    for (const file of vArchivosRemito) {
      const ext = file.name.split('.').pop()
      const path = `remitos-canal/${ventaSel.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('facturas').upload(path, file, { upsert: true })
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)
        remitoUrls.push(publicUrl)
      }
    }

    await supabase.from('ventas').update({
      stock_descontado: true,
      ...(vNroRemito.trim() ? { nro_remito: vNroRemito.trim() } : {}),
      ...(remitoUrls.length > 0 ? { remito_urls: remitoUrls } : {}),
      estado: 'entregado',
      updated_at: new Date().toISOString(),
    }).eq('id', ventaSel.id)

    toast.success('✅ Egreso registrado — venta marcada como Enviada')
    setConfirmandoVenta(false)
    setModalVenta(false); setVentaSel(null); setVItems([]); setVNroRemito(''); setVArchivosRemito([])
    cargar(); cargarVentas(CANAL_KEYS[view])
  }

  async function confirmarEgresoPedido() {
    if (!pedidoSel || confirmingPedRef.current) return
    if (!pNroRemito.trim()) return toast.error('Ingresá el número de remito')
    const itemsAEntregar = pItems.filter(it => it.codigo && it.cantidad > 0)
    if (itemsAEntregar.length === 0) return toast.error('No hay productos con cantidad para entregar')
    confirmingPedRef.current = true
    setConfirmandoPed(true)

    const remitoUrls = []
    for (const file of pFotosRemito) {
      const ext = file.name.split('.').pop()
      const path = `remitos/${pedidoSel.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('facturas').upload(path, file, { upsert: true })
      if (upErr) {
        toast.error('Error al subir remito: ' + upErr.message)
        setConfirmandoPed(false); confirmingPedRef.current = false; return
      }
      const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)
      remitoUrls.push(publicUrl)
    }
    const remitoUrl = remitoUrls[0] || null

    // Calcular saldo pendiente después de esta entrega
    const originalPending = pedidoSel.items_pendientes?.length > 0
      ? pedidoSel.items_pendientes
      : (pedidoSel.items || [])
    const newPending = originalPending
      .map(orig => {
        const entregado = pItems.find(p => p.codigo === orig.codigo)?.cantidad ?? 0
        return { ...orig, cantidad: Math.max(0, orig.cantidad - entregado) }
      })
      .filter(p => p.cantidad > 0)
    const isComplete = newPending.length === 0

    // Actualizar estado y remito (separado de items_pendientes por si la columna no existe aún)
    const { error: errEstado } = await supabase.from('pedidos').update({
      nro_remito: pNroRemito.trim(),
      ...(remitoUrls.length > 0 ? { remito_url: remitoUrl, remito_urls: remitoUrls } : {}),
      estado: isComplete ? 'entregado' : 'aprobado',
      stock_descontado: true,
      updated_at: new Date().toISOString(),
    }).eq('id', pedidoSel.id)
    if (errEstado) { toast.error('Error al actualizar pedido: ' + errEstado.message); setConfirmandoPed(false); confirmingPedRef.current = false; return }

    // Guardar saldo pendiente (requiere columna items_pendientes)
    await supabase.from('pedidos').update({ items_pendientes: newPending }).eq('id', pedidoSel.id)

    // Descontar stock por las cantidades efectivamente entregadas
    for (const item of itemsAEntregar) {
      const actual = stock[item.codigo]?.stock_actual ?? 0
      const nuevo = Math.max(0, actual - item.cantidad)
      const { error: stockErr } = await supabase.from('stock_pt').upsert({
        codigo: item.codigo,
        nombre: item.nombre || '',
        modelo: item.modelo || '',
        categoria: item.categoria || '',
        stock_actual: nuevo,
        stock_inicial: stock[item.codigo]?.stock_inicial ?? 0,
      }, { onConflict: 'codigo' })
      if (stockErr) { toast.error('Error al actualizar stock de ' + item.codigo + ': ' + stockErr.message); setConfirmandoPed(false); confirmingPedRef.current = false; return }
      const sMinPed = stock[item.codigo]?.stock_minimo
      if (nuevo === 0 || (sMinPed != null && nuevo <= sMinPed)) {
        await notificarAdminsStockBajo(item.codigo, item.nombre || '', item.modelo || '', nuevo, sMinPed)
      }
      const { error: movErr } = await supabase.from('movimientos_pt').insert({
        codigo: item.codigo, nombre: item.nombre || '', modelo: item.modelo || '', categoria: item.categoria || '',
        tipo: 'egreso', cantidad: item.cantidad, canal: 'Distribuidor',
        observacion: `Pedido #${pedidoSel.id?.slice(0,8).toUpperCase()} · ${pedidoSel.profiles?.razon_social || pedidoSel.profiles?.full_name || ''}${pNroRemito ? ' · Remito ' + pNroRemito : ''}${!isComplete ? ' · Entrega parcial' : ''}`,
        usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
        referencia_nombre: pedidoSel.profiles?.razon_social || pedidoSel.profiles?.full_name || null,
        es_parcial: !isComplete,
      })
      if (movErr) { toast.error('Error al registrar movimiento de ' + item.codigo + ': ' + movErr.message); setConfirmandoPed(false); confirmingPedRef.current = false; return }
    }

    // Actualizar cantidad_retirada en la preventa si corresponde
    if (pedidoSel.preventa_id) {
      const { data: pv, error: pvReadErr } = await supabase.from('preventas').select('items').eq('id', pedidoSel.preventa_id).single()
      if (pvReadErr) {
        toast.error('⚠️ Stock descontado pero no se pudo leer la preventa para actualizar el saldo')
      } else if (pv?.items) {
        const updatedItems = pv.items.map(pvItem => {
          const entregado = itemsAEntregar.find(i => i.codigo === pvItem.codigo)
          if (!entregado || !entregado.cantidad) return pvItem
          return { ...pvItem, cantidad_retirada: (pvItem.cantidad_retirada || 0) + entregado.cantidad }
        })
        const { error: pvWriteErr } = await supabase.from('preventas').update({ items: updatedItems }).eq('id', pedidoSel.preventa_id)
        if (pvWriteErr) toast.error('⚠️ Stock descontado pero no se pudo actualizar el saldo de preventa')
      }
    }

    toast.success(isComplete ? '✅ Entrega completa — Pedido marcado como Entregado' : '✅ Entrega parcial registrada — saldo pendiente guardado')
    setConfirmandoPed(false)
    confirmingPedRef.current = false
    setModalPedido(false); setPedidoSel(null); setPNroRemito(''); setPFotosRemito([]); setPItems([])
    cargar(); cargarPedidos()
  }

  async function cargarEgresosGarantia() {
    setLoadingEgresosGar(true)
    const { data } = await supabase
      .from('egresos_garantia')
      .select('*')
      .eq('estado', 'enviado')
      .order('created_at', { ascending: false })
    setEgresosGarantia(data || [])
    setLoadingEgresosGar(false)
  }

  async function cargarDevGarantia() {
    setLoadingDevGar(true)
    const { data } = await supabase
      .from('devoluciones')
      .select('*')
      .eq('origen', 'garantia')
      .eq('estado', 'recibido')
      .not('stock_ingresado', 'eq', true)
      .order('created_at', { ascending: false })
    setDevGarantia(data || [])
    setLoadingDevGar(false)
  }

  async function confirmarEgresoGarantia() {
    if (!egresoGarSel) return
    setConfirmandoEgresoGar(true)
    const { codigo, nombre, modelo, categoria, cantidad, referencia_nombre, observacion } = egresoGarSel
    const actual = stock[codigo]?.stock_actual ?? 0
    const nuevo = Math.max(0, actual - cantidad)
    await supabase.from('stock_pt').upsert({
      codigo, nombre, modelo: modelo || '', categoria: categoria || '',
      stock_actual: nuevo,
      stock_inicial: stock[codigo]?.stock_inicial ?? 0,
    }, { onConflict: 'codigo' })
    const sMin = stock[codigo]?.stock_minimo
    if (nuevo === 0 || (sMin != null && nuevo <= sMin)) {
      await notificarAdminsStockBajo(codigo, nombre, modelo || '', nuevo, sMin)
    }
    await supabase.from('movimientos_pt').insert({
      codigo, nombre, modelo: modelo || '', categoria: categoria || '',
      tipo: 'egreso', cantidad, canal: 'Garantía',
      observacion: observacion ? `Panel garantía · ${observacion}` : 'Panel garantía',
      usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
      referencia_nombre: referencia_nombre || null,
    })
    await supabase.from('egresos_garantia').update({ estado: 'confirmado' }).eq('id', egresoGarSel.id)
    toast.success('✅ Egreso garantía confirmado — stock descontado')
    setConfirmandoEgresoGar(false)
    setModalEgresoGar(false); setEgresoGarSel(null)
    cargar(); cargarEgresosGarantia()
  }

  async function confirmarDevGarantia() {
    if (!devGarSel) return
    setConfirmandoDevGar(true)
    const items = devGarItemsEdit.filter(it => it.codigo && it.cantidad > 0)
    if (devGarRecuperable) {
      for (const item of items) {
        if (!item.codigo || !item.cantidad) continue
        const actual = stock[item.codigo]?.stock_actual ?? 0
        const nuevo = actual + item.cantidad
        await supabase.from('stock_pt').upsert({
          codigo: item.codigo, nombre: item.nombre || '', modelo: item.modelo || '', categoria: item.categoria || '',
          stock_actual: nuevo,
          stock_inicial: stock[item.codigo]?.stock_inicial ?? 0,
        }, { onConflict: 'codigo' })
        await supabase.from('movimientos_pt').insert({
          codigo: item.codigo, nombre: item.nombre || '', modelo: item.modelo || '', categoria: item.categoria || '',
          tipo: 'ingreso', cantidad: item.cantidad, canal: 'Devolución Garantía',
          observacion: `Dev. garantía · ${devGarSel.referencia_nombre || ''}`,
          usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
          referencia_nombre: devGarSel.referencia_nombre || null,
        })
      }
    }
    await supabase.from('devoluciones').update({ stock_ingresado: true }).eq('id', devGarSel.id)
    toast.success(devGarRecuperable ? '✅ Stock ingresado — devolución confirmada' : '✅ Devolución cerrada — sin cambios en stock')
    setConfirmandoDevGar(false)
    setModalDevGar(false); setDevGarSel(null); setDevGarItemsEdit([]); setDevGarRecuperable(true)
    cargar(); cargarDevGarantia()
  }

  // ── PRÉSTAMOS ──────────────────────────────────────────────
  async function cargarPrestamos() {
    setLoadingPrestamos(true)
    const { data } = await supabase
      .from('prestamos_stock')
      .select('*')
      .order('created_at', { ascending: false })
    setPrestamos(data || [])
    setLoadingPrestamos(false)
  }

  async function registrarPrestamo() {
    const itemsValidos = prItems.filter(it => it.codigo && it.cantidad > 0)
    if (!itemsValidos.length) { toast.error('Agregá al menos un producto'); return }
    if (!prDestino.trim()) { toast.error('Ingresá el destino o cliente'); return }
    setGuardandoPrestamo(true)
    for (const item of itemsValidos) {
      const actual = stock[item.codigo]?.stock_actual ?? 0
      const nuevo = Math.max(0, actual - item.cantidad)
      await supabase.from('stock_pt').upsert({
        codigo: item.codigo, nombre: item.nombre || '', modelo: item.modelo || '', categoria: item.categoria || '',
        stock_actual: nuevo, stock_inicial: stock[item.codigo]?.stock_inicial ?? 0,
      }, { onConflict: 'codigo' })
      const sMin = stock[item.codigo]?.stock_minimo
      if (nuevo === 0 || (sMin != null && nuevo <= sMin)) {
        await notificarAdminsStockBajo(item.codigo, item.nombre || '', item.modelo || '', nuevo, sMin)
      }
      await supabase.from('movimientos_pt').insert({
        codigo: item.codigo, nombre: item.nombre || '', modelo: item.modelo || '', categoria: item.categoria || '',
        tipo: 'egreso', cantidad: item.cantidad, canal: 'Préstamo',
        observacion: `Préstamo → ${prDestino}${prObservacion ? ' · ' + prObservacion : ''}`,
        usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
        referencia_nombre: prDestino,
      })
    }
    const { error: errPr } = await supabase.from('prestamos_stock').insert({
      items: itemsValidos,
      destino: prDestino.trim(),
      observacion: prObservacion.trim() || null,
      fecha_retorno_estimada: prFechaRetorno || null,
      estado: 'activo',
      usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
    })
    if (errPr) { toast.error('Error al guardar préstamo: ' + errPr.message); setGuardandoPrestamo(false); return }
    toast.success('📤 Préstamo registrado — stock descontado')
    setGuardandoPrestamo(false)
    setModalPrestamo(false)
    setPrItems([{ codigo: '', nombre: '', modelo: '', cantidad: 1 }])
    setPrDestino(''); setPrObservacion(''); setPrFechaRetorno('')
    cargar(); cargarPrestamos()
  }

  async function devolverPrestamo(p) {
    for (const item of (p.items || [])) {
      if (!item.codigo || !item.cantidad) continue
      const actual = stock[item.codigo]?.stock_actual ?? 0
      await supabase.from('stock_pt').upsert({
        codigo: item.codigo, nombre: item.nombre || '', modelo: item.modelo || '', categoria: item.categoria || '',
        stock_actual: actual + item.cantidad, stock_inicial: stock[item.codigo]?.stock_inicial ?? 0,
      }, { onConflict: 'codigo' })
      await supabase.from('movimientos_pt').insert({
        codigo: item.codigo, nombre: item.nombre || '', modelo: item.modelo || '', categoria: item.categoria || '',
        tipo: 'ingreso', cantidad: item.cantidad, canal: 'Devolución Préstamo',
        observacion: `Devuelto por ${p.destino}`,
        usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
        referencia_nombre: p.destino,
      })
    }
    await supabase.from('prestamos_stock').update({ estado: 'devuelto', fecha_devolucion: new Date().toISOString() }).eq('id', p.id)
    toast.success('✅ Préstamo devuelto — stock re-ingresado')
    cargar(); cargarPrestamos()
  }

  async function cerrarComoPerdido(p) {
    await supabase.from('prestamos_stock').update({ estado: 'perdido', fecha_devolucion: new Date().toISOString() }).eq('id', p.id)
    toast.success('📌 Cerrado como pérdida — stock ya descontado')
    cargarPrestamos()
  }

  function abrirEditPrestamo(p) {
    setEditandoPrestamo(p)
    setPrEditItems((p.items || []).map(it => ({ ...it })))
    setPrEditDestino(p.destino || '')
    setPrEditObservacion(p.observacion || '')
    setPrEditFechaRetorno(p.fecha_retorno_estimada || '')
  }

  async function guardarEditPrestamo() {
    if (!prEditDestino.trim()) { toast.error('Ingresá el destino'); return }
    const itemsValidos = prEditItems.filter(it => it.codigo && it.cantidad > 0)
    if (!itemsValidos.length) { toast.error('Agregá al menos un producto'); return }
    setGuardandoEditPr(true)
    const { error } = await supabase.from('prestamos_stock').update({
      items: itemsValidos,
      destino: prEditDestino.trim(),
      observacion: prEditObservacion.trim() || null,
      fecha_retorno_estimada: prEditFechaRetorno || null,
    }).eq('id', editandoPrestamo.id)
    setGuardandoEditPr(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('✅ Préstamo actualizado')
    setEditandoPrestamo(null)
    cargarPrestamos()
  }
  // ─────────────────────────────────────────────────────────

  function imprimirCategoria(categoriaKey) {
    const cat = CATALOGO.find(c => c.categoria === categoriaKey)
    if (!cat) return
    const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })
    const rows = cat.productos.map(p => {
      const s = stock[p.codigo]
      const actual = s?.stock_actual ?? '—'
      const inicial = s?.stock_inicial ?? '—'
      const estado = typeof actual === 'number' && actual === 0 && s ? 'AGOTADO' : typeof actual === 'number' && actual <= 5 && actual > 0 ? 'BAJO' : ''
      return `<tr>
        <td style="font-family:monospace;font-size:12px;color:#444;padding:8px 12px;border-bottom:1px solid #eee">${p.codigo}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${p.nombre}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#666">${p.modelo}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${inicial}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-weight:700;font-size:16px;color:${actual === 0 && s ? '#e53e3e' : typeof actual === 'number' && actual <= 5 ? '#d97706' : '#16a34a'}">${actual}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;font-size:11px;color:${estado === 'AGOTADO' ? '#e53e3e' : '#d97706'};font-weight:600">${estado}</td>
      </tr>`
    }).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Stock ${cat.label} — ${fecha}</title>
    <style>body{font-family:Arial,sans-serif;margin:32px;color:#111}h1{font-size:18px;margin-bottom:4px}p{color:#666;font-size:13px;margin:0 0 20px}table{width:100%;border-collapse:collapse}th{background:#f4f4f4;padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#666;border-bottom:2px solid #ddd}@media print{body{margin:16px}}</style>
    </head><body>
    <h1>${cat.emoji} Stock — ${cat.label}</h1>
    <p>Impreso el ${fecha}</p>
    <table><thead><tr><th>Código</th><th>Producto</th><th>Modelo</th><th>Inicial</th><th>Actual</th><th>Estado</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}<\/script>
    </body></html>`
    const w = window.open('', '_blank', 'width=900,height=600')
    w.document.write(html)
    w.document.close()
  }

  async function cargar() {
    setLoading(true)
    const [{ data: stockData }, { data: movsData }] = await Promise.all([
      supabase.from('stock_pt').select('*'),
      supabase.from('movimientos_pt').select('*').order('created_at', { ascending: false }).limit(200),
    ])
    const map = {}
    for (const row of stockData || []) map[row.codigo] = row
    setStock(map)
    setMovs(movsData || [])
    setLoading(false)
  }

  async function guardarEditMov() {
    if (!editandoMov) return
    const nuevaCant = parseInt(editCantidad) || 0
    if (nuevaCant <= 0) { toast.error('La cantidad debe ser mayor a 0'); return }
    setGuardandoEditMov(true)

    // Calcular ajuste de stock: diff = nuevaCant - cantidadOriginal
    // Para egreso: si baja la cantidad, el stock sube (se "devuelven" unidades)
    // Para ingreso: si baja la cantidad, el stock baja
    const diff = nuevaCant - editandoMov.cantidad
    if (diff !== 0) {
      const actual = stock[editandoMov.codigo]?.stock_actual ?? 0
      const stockAdj = editandoMov.tipo === 'egreso' ? -diff : diff
      const nuevoStock = Math.max(0, actual + stockAdj)
      await supabase.from('stock_pt').update({ stock_actual: nuevoStock }).eq('codigo', editandoMov.codigo)
    }

    const { error } = await supabase.from('movimientos_pt')
      .update({ cantidad: nuevaCant, observacion: editObs.trim() || null })
      .eq('id', editandoMov.id)

    setGuardandoEditMov(false)
    if (error) { toast.error('Error al guardar: ' + error.message); return }
    toast.success('Movimiento actualizado ✅')
    setEditandoMov(null)
    cargar()
  }

  async function guardarIngreso() {
    if (!iProducto) return toast.error('Seleccioná un producto')
    const cant = parseInt(iCantidad)
    if (!cant || cant <= 0) return toast.error('Ingresá una cantidad válida')
    setGuardandoIngreso(true)
    const actual = stock[iProducto.codigo]?.stock_actual ?? 0
    const nuevoStock = actual + cant
    const { error: e1 } = await supabase.from('stock_pt').upsert({
      codigo: iProducto.codigo, nombre: iProducto.nombre, modelo: iProducto.modelo, categoria: iProducto.categoria,
      stock_actual: nuevoStock,
      stock_inicial: stock[iProducto.codigo]?.stock_inicial ?? 0,
    }, { onConflict: 'codigo' })
    if (e1) { toast.error('Error al actualizar stock'); setGuardandoIngreso(false); return }
    await supabase.from('movimientos_pt').insert({
      codigo: iProducto.codigo, nombre: iProducto.nombre, modelo: iProducto.modelo, categoria: iProducto.categoria,
      tipo: 'ingreso', cantidad: cant, canal: 'Ingreso manual',
      observacion: iObs.trim() || null,
      usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
    })
    toast.success('Ingreso registrado ✅')
    setGuardandoIngreso(false)
    setModalIngreso(false); setIProducto(null); setICantidad(''); setIObs('')
    cargar()
  }

  async function guardarEgreso() {
    if (!eProducto) return toast.error('Seleccioná un producto')
    const cant = parseInt(eCantidad)
    if (!cant || cant <= 0) return toast.error('Ingresá una cantidad válida')
    const actual = stock[eProducto.codigo]?.stock_actual ?? 0
    if (cant > actual) return toast.error(`Stock insuficiente. Disponible: ${actual}`)
    setGuardando(true)
    const nuevoStock = actual - cant
    const { error: e1 } = await supabase.from('stock_pt').upsert({
      codigo: eProducto.codigo,
      nombre: eProducto.nombre,
      modelo: eProducto.modelo,
      categoria: eProducto.categoria,
      stock_actual: nuevoStock,
      stock_inicial: stock[eProducto.codigo]?.stock_inicial ?? 0,
    }, { onConflict: 'codigo' })
    if (e1) { toast.error('Error al actualizar stock'); setGuardando(false); return }
    const { error: e2 } = await supabase.from('movimientos_pt').insert({
      codigo: eProducto.codigo,
      nombre: eProducto.nombre,
      modelo: eProducto.modelo,
      categoria: eProducto.categoria,
      tipo: 'egreso',
      cantidad: cant,
      canal: eCanal,
      observacion: eObs.trim() || null,
      usuario_id: user.id,
      usuario_nombre: profile?.full_name || user.email,
    })
    if (e2) { toast.error('Error al registrar movimiento'); setGuardando(false); return }
    toast.success('Egreso registrado ✅')
    setGuardando(false)
    const stockMinCheck = stock[eProducto.codigo]?.stock_minimo
    if (nuevoStock === 0 || (stockMinCheck != null && nuevoStock <= stockMinCheck)) {
      notificarAdminsStockBajo(eProducto.codigo, eProducto.nombre, eProducto.modelo, nuevoStock, stockMinCheck)
    }
    setModalEgreso(false)
    setEProducto(null); setECantidad(''); setEObs('')
    cargar()
  }

  async function guardarStockInicial() {
    if (!sProducto) return toast.error('Seleccioná un producto')
    const cant = parseInt(sCantidad)
    if (!cant || cant < 0) return toast.error('Ingresá una cantidad válida')
    setGuardandoStock(true)
    const stockActual = stock[sProducto.codigo]
    const nuevoActual = stockActual
      ? stockActual.stock_actual + (cant - stockActual.stock_inicial)
      : cant
    const { error } = await supabase.from('stock_pt').upsert({
      codigo: sProducto.codigo,
      nombre: sProducto.nombre,
      modelo: sProducto.modelo,
      categoria: sProducto.categoria,
      stock_inicial: cant,
      stock_actual: Math.max(0, nuevoActual),
    }, { onConflict: 'codigo' })
    if (error) { toast.error('Error: ' + error.message); setGuardandoStock(false); return }
    await supabase.from('movimientos_pt').insert({
      codigo: sProducto.codigo,
      nombre: sProducto.nombre,
      modelo: sProducto.modelo,
      categoria: sProducto.categoria,
      tipo: 'ingreso',
      cantidad: cant,
      canal: 'Stock inicial',
      observacion: 'Carga de stock inicial',
      usuario_id: user.id,
      usuario_nombre: profile?.full_name || user.email,
    })
    toast.success('Stock actualizado ✅')
    setGuardandoStock(false)
    setModalStock(false)
    setSProducto(null); setSCantidad('')
    cargar()
  }

  function prodSelectProducto(idx, codigo) {
    const prod = todosProductosFlat.find(p => p.codigo === codigo)
    setProdItems(prev => prev.map((it, i) => i !== idx ? it : prod
      ? { codigo: prod.codigo, nombre: prod.nombre, modelo: prod.modelo, categoria: prod.categoria, cantidad: it.cantidad || 1 }
      : { ...it, codigo, nombre: '', modelo: '', categoria: '' }
    ))
  }

  async function guardarProduccion() {
    const validos = prodItems.filter(it => it.codigo && parseInt(it.cantidad) > 0)
    if (!validos.length) return toast.error('Agregá al menos un producto con cantidad')
    setGuardandoProd(true)
    const obs = `Ingreso de producción — ${prodFecha}${prodLote ? ` — Lote: ${prodLote}` : ''}`
    for (const item of validos) {
      const actual = stock[item.codigo]?.stock_actual ?? 0
      const nuevo = actual + parseInt(item.cantidad)
      await supabase.from('stock_pt').upsert({
        codigo: item.codigo, nombre: item.nombre, modelo: item.modelo, categoria: item.categoria,
        stock_actual: nuevo,
        stock_inicial: stock[item.codigo]?.stock_inicial ?? 0,
      }, { onConflict: 'codigo' })
      await supabase.from('movimientos_pt').insert({
        codigo: item.codigo, nombre: item.nombre, modelo: item.modelo, categoria: item.categoria,
        tipo: 'ingreso', cantidad: parseInt(item.cantidad),
        canal: 'Producción', observacion: obs,
        nro_lote: prodLote || null,
        usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
      })
    }
    toast.success(`✅ Producción registrada: ${validos.length} producto${validos.length > 1 ? 's' : ''}`)
    setGuardandoProd(false)
    setModalProd(false)
    setProdFecha(new Date().toISOString().split('T')[0])
    setProdLote('')
    setProdItems([{ codigo: '', nombre: '', modelo: '', categoria: '', cantidad: 1 }])
    cargar()
  }

  async function notificarAdminsStockBajo(codigo, nombre, modelo, nuevoStock, stockMinimo) {
    const esNulo = nuevoStock === 0
    const mensaje = esNulo
      ? `⚠️ Stock NULO — ${nombre} ${modelo} (${codigo})`
      : `⚠️ Bajo stock — ${nombre} ${modelo} (${codigo}): quedan ${nuevoStock} unidades (mínimo: ${stockMinimo})`
    await supabase.from('notificaciones').insert({
      tipo: 'stock', mensaje, leida: false, link: '/ingreso-egreso-pt', user_id: null,
    })
  }

  async function guardarMinimo(codigo, valor) {
    const num = parseInt(valor)
    if (isNaN(num) || num < 0) return toast.error('Valor inválido')
    const { error } = await supabase.from('stock_pt').update({ stock_minimo: num }).eq('codigo', codigo)
    if (error) return toast.error('Error: ' + error.message)
    setStock(prev => ({ ...prev, [codigo]: { ...prev[codigo], stock_minimo: num } }))
    setMinimoEdit(prev => { const n = { ...prev }; delete n[codigo]; return n })
    toast.success('Stock mínimo actualizado ✅')
  }

  async function enviarAlertaStock(items, destino) {
    setEnviandoAlerta(true)
    const userTypes = destino === 'vendedores' ? ['vendedor'] : destino === 'distribuidores' ? ['distributor'] : ['vendedor', 'distributor']
    const { data: recipients } = await supabase.from('profiles').select('id').in('user_type', userTypes)
    if (!recipients?.length) { toast.error('No hay destinatarios registrados'); setEnviandoAlerta(false); return }
    const notifs = []
    for (const item of items) {
      const s = stock[item.codigo]
      const esNulo = !s || s.stock_actual === 0
      const msg = esNulo
        ? `⚠️ Stock NULO — ${item.nombre} ${item.modelo}`
        : `⚠️ Bajo stock — ${item.nombre} ${item.modelo}: quedan ${s.stock_actual} unidades`
      for (const r of recipients) notifs.push({ tipo: 'stock', mensaje: msg, leida: false, user_id: r.id })
    }
    const { error } = await supabase.from('notificaciones').insert(notifs)
    if (error) toast.error('Error al enviar: ' + error.message)
    else toast.success(`✅ Alerta enviada a ${recipients.length} usuario${recipients.length > 1 ? 's' : ''}`)
    setEnviandoAlerta(false)
  }

  async function cargarTransitoPendiente() {
    setLoadingTransito(true)
    const { data } = await supabase.from('ingresos_transito').select('*').eq('estado', 'pendiente').order('created_at', { ascending: false })
    setTransitoPendiente(data || [])
    setLoadingTransito(false)
  }

  async function confirmarTransito(registro) {
    setConfirmandoTransito(registro.id)
    for (const item of (registro.items || [])) {
      const actual = stock[item.codigo]?.stock_actual ?? 0
      const nuevo = actual + parseInt(item.cantidad)
      await supabase.from('stock_pt').upsert({
        codigo: item.codigo, nombre: item.nombre, modelo: item.modelo, categoria: item.categoria,
        stock_actual: nuevo,
        stock_inicial: stock[item.codigo]?.stock_inicial ?? 0,
      }, { onConflict: 'codigo' })
      await supabase.from('movimientos_pt').insert({
        codigo: item.codigo, nombre: item.nombre, modelo: item.modelo, categoria: item.categoria,
        tipo: 'ingreso', cantidad: parseInt(item.cantidad),
        canal: registro.canal, observacion: `Ingreso en tránsito (${registro.canal}) — ${registro.fecha}${registro.observacion ? ' — ' + registro.observacion : ''}`,
        usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
      })
    }
    await supabase.from('ingresos_transito').update({
      estado: 'confirmado',
      confirmado_por: profile?.full_name || user.email,
      confirmado_at: new Date().toISOString(),
    }).eq('id', registro.id)
    toast.success(`✅ Ingreso de tránsito confirmado — stock actualizado`)
    setConfirmandoTransito(null)
    setTransitoPendiente(prev => prev.filter(r => r.id !== registro.id))
    cargar()
  }

  const todosProductosFlat = CATALOGO.flatMap(c => c.productos.map(p => ({ ...p, categoria: c.categoria, catLabel: c.label, catEmoji: c.emoji })))
  const todosProductos = todosProductosFlat
  const filtrados = catFilter ? CATALOGO.filter(c => c.categoria === catFilter) : CATALOGO

  const totalProductos = todosProductos.length
  const conStock = Object.values(stock).filter(s => s.stock_actual > 0).length
  const sinStock = Object.values(stock).filter(s => s.stock_actual === 0 && s.stock_inicial > 0).length
  const totalMovs = movs.length

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Ingreso / Egreso PT</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Control de stock de Producto Terminado</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => { setModalTransito(true); cargarTransitoPendiente() }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.35)', borderRadius: 'var(--radius)', padding: '11px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
            🚛 Ingreso Tránsito
          </button>
          <button
            onClick={() => { setModalProd(true); setProdFecha(new Date().toISOString().split('T')[0]); setProdLote(''); setProdItems([{ codigo: '', nombre: '', modelo: '', categoria: '', cantidad: 1 }]) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#3dd68c,#2ab573)', color: '#0a1a12', border: 'none', borderRadius: 'var(--radius)', padding: '11px 22px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: '0 4px 16px rgba(61,214,140,0.3)' }}>
            🏭 Ingresar Producción
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Productos', val: totalProductos, icon: '📦', color: '#7b9fff' },
          { label: 'Con stock', val: conStock, icon: '✅', color: '#3dd68c' },
          { label: 'Sin stock', val: sinStock, icon: '⚠️', color: '#ff5577' },
          { label: 'Movimientos', val: totalMovs, icon: '📋', color: '#a78bfa' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 24 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { v: 'stock',         icon: <Package size={13} />,     label: 'Stock' },
          { v: 'pedidos',       icon: <ShoppingBag size={13} />, label: 'Egresos por Pedido' },
          { v: 'egreso-meli',   icon: <ArrowUpCircle size={13} />, label: 'Egreso Meli',   color: '#ffe600' },
          { v: 'egreso-pagina', icon: <ArrowUpCircle size={13} />, label: 'Egreso Página', color: '#7b9fff' },
          { v: 'egreso-vo',     icon: <ArrowUpCircle size={13} />, label: 'Egreso VO',     color: '#a78bfa' },
          { v: 'egreso-dev',    icon: <ArrowUpCircle size={13} />, label: 'Egreso Dev.',  color: '#fb923c' },
          { v: 'dev-entrada',   icon: <ArrowDownCircle size={13} />, label: 'Dev. Entrada', color: '#38bdf8' },
          { v: 'prestamos',     icon: <Briefcase size={13} />,   label: 'Préstamos',    color: '#34d399' },
          { v: 'historial',     icon: <History size={13} />,     label: 'Historial' },
          { v: 'alertas',       icon: <Bell size={13} />,        label: 'Alertas Stock', color: '#ff5577' },
        ].map(t => {
          const isActive = view === t.v
          const col = t.color || '#7b9fff'
          return (
            <button key={t.v} onClick={() => { setView(t.v); setFiltroEstadoVenta('pendiente') }} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              background: isActive ? `${col}22` : 'var(--surface)',
              color: isActive ? col : 'var(--text3)',
              border: isActive ? `1px solid ${col}66` : '1px solid var(--border)',
            }}>{t.icon} {t.label}</button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={28} /></div>
      ) : view === 'pedidos' ? (
        <div>
          <input value={busquedaPed} onChange={e => setBusquedaPed(e.target.value)} placeholder="🔍 Buscar por distribuidor o ID..." style={{ ...inputSt, marginBottom: 16, maxWidth: 400 }} />
          {loadingPedidos ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={24} /></div>
          ) : pedidos.filter(p => {
            const q = busquedaPed.toLowerCase()
            return !q || p.profiles?.full_name?.toLowerCase().includes(q) || p.profiles?.razon_social?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q)
          }).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>No hay pedidos aprobados pendientes de egreso</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pedidos.filter(p => {
                const q = busquedaPed.toLowerCase()
                return !q || p.profiles?.full_name?.toLowerCase().includes(q) || p.profiles?.razon_social?.toLowerCase().includes(q) || p.id?.toLowerCase().includes(q)
              }).map(ped => (
                <div key={ped.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#7b9fff', fontFamily: 'monospace' }}>#{ped.id?.slice(0,8).toUpperCase()}</span>
                      <span style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20 }}>APROBADO</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{ped.profiles?.razon_social || ped.profiles?.full_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      {(Array.isArray(ped.items) ? ped.items : []).map(it => `${it.codigo} ×${it.cantidad}`).join(' · ')}
                    </div>
                    {Array.isArray(ped.items_pendientes) && ped.items_pendientes.length > 0 && (
                      <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(251,146,60,0.15)', color: '#fb923c', padding: '2px 8px', borderRadius: 10 }}>ENTREGA PARCIAL</span>
                        <span style={{ fontSize: 11, color: '#fb923c' }}>Pendiente: {ped.items_pendientes.map(it => `${it.codigo} ×${it.cantidad}`).join(' · ')}</span>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatFecha(ped.created_at)}</div>
                  <button onClick={() => { setPedidoSel(ped); setPNroRemito(''); setPFotosRemito([]); const base = (ped.items || []); const pending = ped.items_pendientes?.length > 0 ? ped.items_pendientes : base; setPItems(pending.map(it => ({ ...it, _max: it.cantidad }))); setModalPedido(true) }}
                    style={{ background: 'rgba(74,108,247,0.12)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                    📋 Registrar egreso
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : CANAL_VIEWS.includes(view) ? (
        /* EGRESO CANAL (MELI / PAGINA / VO) */
        <div>
          {(() => {
            const canalColor = CANAL_COLORS[view]
            const canalLabel = CANAL_LABELS[view]
            const filtradas = ventas.filter(v => {
              if (!busquedaVenta) return true
              const q = busquedaVenta.toLowerCase()
              return v.cliente_nombre?.toLowerCase().includes(q) || v.nro_orden?.toLowerCase().includes(q)
            })
            return (
              <>
                <input value={busquedaVenta} onChange={e => setBusquedaVenta(e.target.value)} placeholder={`🔍 Buscar por cliente o N° de orden ${canalLabel}...`} style={{ ...inputSt, marginBottom: 16, maxWidth: 420 }} />
                {loadingVentas ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={24} /></div>
                ) : filtradas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>No hay ventas {canalLabel} pendientes de egreso</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {filtradas.map(v => (
                      <div key={v.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: canalColor, fontFamily: 'monospace' }}>{v.nro_orden || `#${v.id?.slice(0,8).toUpperCase()}`}</span>
                              <span style={{ background: `${canalColor}22`, color: canalColor, fontSize: 10, fontWeight: 700, padding: '1px 8px', borderRadius: 20, border: `1px solid ${canalColor}55` }}>{canalLabel.toUpperCase()}</span>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700 }}>{v.cliente_nombre}</div>
                            {v.cliente_email && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{v.cliente_email}</div>}
                            {v.cliente_telefono && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{v.cliente_telefono}</div>}
                            {(() => {
                              let displayItems = (Array.isArray(v.items) ? v.items : []).filter(it => it.codigo || it.nombre)
                              if (displayItems.length === 0 && Array.isArray(v.envio_etiquetas)) {
                                const map = {}
                                v.envio_etiquetas.forEach(et => {
                                  if (!et || typeof et !== 'object') return
                                  const prods = et.productos ? et.productos : (et.codigo ? [et] : [])
                                  prods.forEach(p => {
                                    if (!p.codigo) return
                                    if (map[p.codigo]) map[p.codigo].cantidad += parseInt(p.cantidad) || 1
                                    else map[p.codigo] = { ...p, cantidad: parseInt(p.cantidad) || 1 }
                                  })
                                })
                                displayItems = Object.values(map)
                              }
                              if (displayItems.length === 0) return null
                              return (
                                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                  {displayItems.map((it, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12 }}>
                                      <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: canalColor, background: `${canalColor}15`, padding: '1px 6px', borderRadius: 4 }}>{it.codigo}</span>
                                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{it.nombre}{it.modelo ? ` ${it.modelo}` : ''}</span>
                                      <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--text2)' }}>×{it.cantidad}</span>
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{formatFecha(v.created_at)}</div>
                        </div>

                        {/* Etiquetas de envío */}
                        {Array.isArray(v.envio_etiquetas) && v.envio_etiquetas.length > 0 && v.tipo_envio === 'correo' && (
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Etiquetas de envío</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {v.envio_etiquetas.map((et, i) => {
                                const url = typeof et === 'string' ? et : et?.url
                                if (!url) return null
                                return (
                                  <a key={i} href={url} target="_blank" rel="noreferrer"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${canalColor}12`, border: `1px solid ${canalColor}44`, borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: canalColor, textDecoration: 'none' }}>
                                    <FileText size={12} /> Etiqueta {v.envio_etiquetas.length > 1 ? i + 1 : ''} — Imprimir
                                  </a>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Envío logística / retiro */}
                        {v.tipo_envio && v.tipo_envio !== 'correo' && (
                          <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--text3)' }}>
                            🚛 Envío: <strong style={{ color: 'var(--text2)' }}>{v.tipo_envio === 'logistica' ? 'Logística' : 'Retiro en fábrica'}</strong>
                            {v.envio_retiro_persona && <span> — {v.envio_retiro_persona}</span>}
                          </div>
                        )}

                        {/* Acciones */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                          <button
                            onClick={() => setVentaDetalle({ ...v, _canalView: view })}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                            <Info size={13} /> Ver detalles
                          </button>
                          <button
                            onClick={() => {
  setVentaSel(v)
  let items = (v.items || []).filter(it => it.codigo || it.nombre)
  if (items.length === 0 && Array.isArray(v.envio_etiquetas)) {
    const map = {}
    v.envio_etiquetas.forEach(et => {
      if (!et || typeof et !== 'object') return
      // Correo: { url, productos: [{codigo, nombre, cantidad}] }
      // Logística/retiro: { codigo, nombre, cantidad }
      const prods = et.productos ? et.productos : (et.codigo ? [et] : [])
      prods.forEach(p => {
        if (!p.codigo) return
        if (map[p.codigo]) map[p.codigo].cantidad += parseInt(p.cantidad) || 1
        else map[p.codigo] = { ...p, cantidad: parseInt(p.cantidad) || 1 }
      })
    })
    items = Object.values(map)
  }
  setVItems(items.map(it => ({ ...it })))
  setVNroRemito('')
  setModalVenta(true)
}}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: `${canalColor}22`, color: canalColor, border: `1px solid ${canalColor}55`, borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                            <ArrowUpCircle size={13} /> Registrar egreso
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )
          })()}
        </div>
      ) : view === 'stock' ? (
        <>
          {/* Filtro categoría + botones imprimir */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setCatFilter('')} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${!catFilter ? 'rgba(255,255,255,0.3)' : 'var(--border)'}`, background: !catFilter ? 'rgba(255,255,255,0.07)' : 'transparent', color: !catFilter ? 'var(--text)' : 'var(--text3)', fontWeight: !catFilter ? 600 : 400, fontFamily: 'var(--font)' }}>
              📦 Todos
            </button>
            {CATALOGO.map(c => { const cc = CAT_COLORS[c.categoria]; return (
              <button key={c.categoria} onClick={() => setCatFilter(catFilter === c.categoria ? '' : c.categoria)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${catFilter === c.categoria ? cc.border : 'var(--border)'}`, background: catFilter === c.categoria ? cc.bg : 'transparent', color: catFilter === c.categoria ? cc.color : 'var(--text3)', fontWeight: catFilter === c.categoria ? 600 : 400, fontFamily: 'var(--font)' }}>
                {c.emoji} {c.label}
              </button>
            )})}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATALOGO.map(c => (
                <button key={c.categoria} onClick={() => imprimirCategoria(c.categoria)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', fontFamily: 'var(--font)' }}>
                  🖨️ {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabla de stock */}
          {filtrados.map(cat => {
            const cc = CAT_COLORS[cat.categoria]
            return (
              <div key={cat.categoria} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: 20, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: cc.bg, borderBottom: `1px solid ${cc.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{cat.emoji}</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: cc.color }}>{cat.label}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {cat.productos.map((p, i) => {
                      const s = stock[p.codigo]
                      const actual = s?.stock_actual ?? '—'
                      const inicial = s?.stock_inicial ?? '—'
                      const bajo = typeof actual === 'number' && actual <= 5 && actual > 0
                      const agotado = typeof actual === 'number' && actual === 0 && s
                      return (
                        <div key={p.codigo} style={{
                          borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                          padding: '12px 16px',
                          background: agotado ? 'rgba(255,85,119,0.04)' : bajo ? 'rgba(255,165,0,0.04)' : 'transparent',
                          display: 'flex', flexDirection: 'column', gap: 8,
                        }}>
                          {/* Fila superior: código + nombre + stocks */}
                          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: cc.color, fontFamily: 'monospace', background: cc.bg, border: `1px solid ${cc.border}`, borderRadius: 5, padding: '2px 7px' }}>{p.codigo}</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</span>
                            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{p.modelo}</span>
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 1 }}>Inicial</div>
                                <div style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>{inicial}</div>
                              </div>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 1 }}>Actual</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontWeight: 800, fontSize: 16, color: agotado ? '#ff5577' : bajo ? '#fb923c' : typeof actual === 'number' ? '#3dd68c' : 'var(--text3)' }}>{actual}</span>
                                  {agotado && <span style={{ fontSize: 9, background: 'rgba(255,85,119,0.15)', color: '#ff5577', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>AGOTADO</span>}
                                  {bajo && <span style={{ fontSize: 9, background: 'rgba(251,146,60,0.15)', color: '#fb923c', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>BAJO</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                          {/* Acciones */}
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {isAdmin && (
                              <button onClick={() => { setSProducto({ ...p, categoria: cat.categoria }); setSCantidad(s?.stock_inicial ? String(s.stock_inicial) : ''); setModalStock(true) }}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(74,108,247,0.1)', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#7b9fff', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                📋 Stock Inicial
                              </button>
                            )}
                            {!isAdmin2 && (<>
                            <button onClick={() => { setIProducto({ ...p, categoria: cat.categoria }); setICantidad(''); setIObs(''); setModalIngreso(true) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#3dd68c', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              <ArrowDownCircle size={12} /> Ingreso
                            </button>
                            <button onClick={() => { setEProducto({ ...p, categoria: cat.categoria }); setECantidad(''); setEObs(''); setECanal('Distribuidor'); setModalEgreso(true) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              <ArrowUpCircle size={12} /> Egreso
                            </button>
                            </>)}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )
          })}
        </>
      ) : view === 'egreso-dev' ? (
        /* EGRESO DEVOLUCIONES (egresos_garantia estado=enviado) */
        <div>
          {loadingEgresosGar ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={24} /></div>
          ) : egresosGarantia.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>No hay egresos de garantía enviados — confirmá el estado "Enviado" en Egreso Devoluciones primero</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {egresosGarantia.map(it => (
                <div key={it.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#7b9fff', fontFamily: 'monospace' }}>#{String(it.id).slice(0,8).toUpperCase()}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(167,139,250,0.12)', color: '#b39dfa', padding: '1px 8px', borderRadius: 20 }}>GARANTÍA</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#fb923c', fontFamily: 'monospace', background: 'rgba(251,146,60,0.1)', padding: '2px 6px', borderRadius: 4 }}>{it.codigo}</span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{it.nombre}</span>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{it.modelo}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      Cliente: <strong style={{ color: 'var(--text2)' }}>{it.referencia_nombre || '—'}</strong>
                      {it.observacion && <span> · {it.observacion}</span>}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 2 }}>
                      Cantidad a egresar: <strong style={{ color: '#fb923c' }}>{it.cantidad}</strong>
                      {' · '}Stock actual: <strong style={{ color: typeof stock[it.codigo]?.stock_actual === 'number' ? (stock[it.codigo].stock_actual >= it.cantidad ? '#3dd68c' : '#ff5577') : 'var(--text3)' }}>
                        {stock[it.codigo]?.stock_actual ?? '—'}
                      </strong>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{it.created_at ? new Date(it.created_at).toLocaleDateString('es-AR') : ''}</div>
                  <button onClick={() => { setEgresoGarSel(it); setModalEgresoGar(true) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(251,146,60,0.12)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.35)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                    <ArrowUpCircle size={13} /> Confirmar egreso
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Modal confirmar egreso garantía */}
          {modalEgresoGar && egresoGarSel && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 460 }}>
                <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#fb923c' }}>📤 Confirmar Egreso Garantía</div>
                  <button onClick={() => setModalEgresoGar(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
                </div>
                <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{egresoGarSel.codigo} — {egresoGarSel.nombre}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)' }}>{egresoGarSel.modelo}</div>
                    <div style={{ fontSize: 12, marginTop: 6 }}>Cantidad: <strong style={{ color: '#fb923c' }}>{egresoGarSel.cantidad}</strong></div>
                    <div style={{ fontSize: 12 }}>Cliente: <strong>{egresoGarSel.referencia_nombre || '—'}</strong></div>
                    <div style={{ fontSize: 12, marginTop: 4, color: stock[egresoGarSel.codigo]?.stock_actual >= egresoGarSel.cantidad ? '#3dd68c' : '#ff5577', fontWeight: 700 }}>
                      Stock disponible: {stock[egresoGarSel.codigo]?.stock_actual ?? '—'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: '#fb923c' }}>
                    Al confirmar se descuenta el stock y queda registrado como movimiento de egreso.
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={confirmarEgresoGarantia} disabled={confirmandoEgresoGar}
                      style={{ flex: 1, background: '#fb923c', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: confirmandoEgresoGar ? 'not-allowed' : 'pointer', opacity: confirmandoEgresoGar ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                      {confirmandoEgresoGar ? '⏳ Procesando...' : '📤 Confirmar y descontar stock'}
                    </button>
                    <button onClick={() => setModalEgresoGar(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : view === 'dev-entrada' ? (
        /* DEV. ENTRADA (devoluciones garantia recibidas) */
        <div>
          {loadingDevGar ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={24} /></div>
          ) : devGarantia.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>No hay devoluciones de garantía recibidas pendientes de confirmar</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {devGarantia.map(dev => (
                <div key={dev.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#7b9fff', fontFamily: 'monospace' }}>#{String(dev.id).slice(0,8).toUpperCase()}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(56,189,248,0.12)', color: '#38bdf8', padding: '1px 8px', borderRadius: 20 }}>RECIBIDO</span>
                      <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(167,139,250,0.12)', color: '#b39dfa', padding: '1px 8px', borderRadius: 20 }}>GARANTÍA</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{dev.referencia_nombre || 'Cliente garantía'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>
                      {(dev.items || []).map(it => `${it.codigo} ×${it.cantidad}`).join(' · ')}
                    </div>
                    {dev.notas && <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>"{dev.notas}"</div>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{dev.created_at ? new Date(dev.created_at).toLocaleDateString('es-AR') : ''}</div>
                  <button onClick={() => { setDevGarSel(dev); setDevGarRecuperable(true); setDevGarItemsEdit((dev.items || []).map(it => ({ ...it, cantidad: it.cantidad || 1 }))); setModalDevGar(true) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.35)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                    <ArrowDownCircle size={13} /> Confirmar ingreso
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Modal confirmar ingreso garantía */}
          {modalDevGar && devGarSel && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480 }}>
                <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#38bdf8' }}>📥 Confirmar Entrada Garantía</div>
                  <button onClick={() => setModalDevGar(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
                </div>
                <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{devGarSel.referencia_nombre || 'Cliente garantía'}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {devGarItemsEdit.map((it, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <select
                            value={it.codigo || ''}
                            onChange={e => {
                              const prod = preciosDB.find(p => p.codigo === e.target.value)
                              setDevGarItemsEdit(prev => prev.map((row, idx) => idx !== i ? row : {
                                ...row,
                                codigo: prod?.codigo || '',
                                nombre: prod?.nombre || '',
                                modelo: prod?.modelo || '',
                                categoria: prod?.categoria || '',
                              }))
                            }}
                            style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', outline: 'none', cursor: 'pointer' }}
                          >
                            <option value="">— Elegir producto —</option>
                            {Object.entries(
                              preciosDB.reduce((acc, p) => {
                                const cat = p.categoria || 'otros'
                                if (!acc[cat]) acc[cat] = []
                                acc[cat].push(p)
                                return acc
                              }, {})
                            ).map(([cat, prods]) => (
                              <optgroup key={cat} label={CATALOGO.find(c => c.categoria === cat)?.label || cat}>
                                {prods.map(p => (
                                  <option key={p.codigo} value={p.codigo}>{p.codigo} · {p.nombre} {p.modelo}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <input
                            type="number" min="1" value={it.cantidad || ''}
                            onChange={e => setDevGarItemsEdit(prev => prev.map((row, idx) => idx !== i ? row : { ...row, cantidad: Math.max(1, parseInt(e.target.value) || 1) }))}
                            style={{ width: 60, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 6px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }}
                          />
                          <button
                            onClick={() => setDevGarItemsEdit(prev => prev.filter((_, idx) => idx !== i))}
                            style={{ background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, padding: '6px 9px', fontSize: 13, color: '#ff5577', cursor: 'pointer', flexShrink: 0 }}
                          >✕</button>
                        </div>
                      ))}
                      <button
                        onClick={() => setDevGarItemsEdit(prev => [...prev, { codigo: '', nombre: '', modelo: '', categoria: '', cantidad: 1 }])}
                        style={{ alignSelf: 'flex-start', background: 'none', border: '1px dashed rgba(56,189,248,0.4)', borderRadius: 'var(--radius)', padding: '5px 14px', fontSize: 12, fontWeight: 600, color: '#38bdf8', cursor: 'pointer', fontFamily: 'var(--font)' }}
                      >+ Agregar producto</button>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>¿El panel es recuperable?</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {[{ v: true, label: '✅ Recuperable', desc: 'Suma al stock' }, { v: false, label: '❌ No recuperable', desc: 'Sin cambios en stock' }].map(({ v, label, desc }) => (
                        <button key={String(v)} onClick={() => setDevGarRecuperable(v)}
                          style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font)', border: 'none', textAlign: 'left',
                            background: devGarRecuperable === v ? (v ? 'rgba(61,214,140,0.12)' : 'rgba(255,85,119,0.12)') : 'var(--surface2)',
                            color: devGarRecuperable === v ? (v ? '#3dd68c' : '#ff5577') : 'var(--text3)',
                            outline: devGarRecuperable === v ? `1.5px solid ${v ? '#3dd68c' : '#ff5577'}` : 'none' }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
                          <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>{desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={confirmarDevGarantia} disabled={confirmandoDevGar}
                      style={{ flex: 1, background: '#38bdf8', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: confirmandoDevGar ? 'not-allowed' : 'pointer', opacity: confirmandoDevGar ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                      {confirmandoDevGar ? '⏳ Procesando...' : devGarRecuperable ? '📥 Confirmar e ingresar stock' : '✓ Confirmar sin stock'}
                    </button>
                    <button onClick={() => setModalDevGar(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : view === 'prestamos' ? (
        /* PRÉSTAMOS */
        <div>
          {/* Header + botón nuevo */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#34d399' }}>💼 Préstamos de stock</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Salidas temporales — muestras, demostraciones, etc.</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={cargarPrestamos}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 12px', fontSize: 13, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                🔄
              </button>
              <button onClick={() => setVerHistorialPrestamos(v => !v)}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                {verHistorialPrestamos ? 'Ocultar historial' : 'Ver historial'}
              </button>
              <button onClick={() => setModalPrestamo(true)}
                style={{ background: '#34d399', color: '#0a0e1a', border: 'none', borderRadius: 'var(--radius)', padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                + Nuevo préstamo
              </button>
            </div>
          </div>

          {loadingPrestamos ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={24} /></div>
          ) : (() => {
            const activos  = prestamos.filter(p => p.estado === 'activo')
            const cerrados = prestamos.filter(p => p.estado !== 'activo')
            const lista = verHistorialPrestamos ? prestamos : activos
            if (lista.length === 0) return (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>
                {verHistorialPrestamos ? 'No hay préstamos registrados' : 'No hay préstamos activos'}
              </div>
            )
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activos.length > 0 && !verHistorialPrestamos && (
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>
                    {activos.length} préstamo{activos.length !== 1 ? 's' : ''} activo{activos.length !== 1 ? 's' : ''}
                  </div>
                )}
                {lista.map(p => {
                  const isActivo = p.estado === 'activo'
                  const isPerdido = p.estado === 'perdido'
                  const estadoCfg = isActivo
                    ? { color: '#34d399', bg: 'rgba(52,211,153,0.1)', border: 'rgba(52,211,153,0.35)', label: 'Activo' }
                    : isPerdido
                    ? { color: '#ff5577', bg: 'rgba(255,85,119,0.1)', border: 'rgba(255,85,119,0.35)', label: 'No volvió' }
                    : { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.35)', label: 'Devuelto' }
                  return (
                    <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                          #{String(p.id).slice(0,8).toUpperCase()}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: estadoCfg.bg, color: estadoCfg.color, border: `1px solid ${estadoCfg.border}` }}>
                          {estadoCfg.label}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>📍 {p.destino}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
                          {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: es })}
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        {(p.items || []).map((it, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: '#ffd166', fontFamily: 'monospace' }}>{it.codigo}</span>
                            <span style={{ fontSize: 13 }}>{it.nombre} {it.modelo}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>×{it.cantidad}</span>
                          </div>
                        ))}
                      </div>

                      {(p.observacion || p.fecha_retorno_estimada) && (
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>
                          {p.observacion && <span>{p.observacion}</span>}
                          {p.fecha_retorno_estimada && <span style={{ marginLeft: p.observacion ? ' · ' : '' }}>📅 Retorno estimado: <strong style={{ color: 'var(--text2)' }}>{new Date(p.fecha_retorno_estimada).toLocaleDateString('es-AR')}</strong></span>}
                        </div>
                      )}

                      {isActivo && (
                        <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
                          <button onClick={() => devolverPrestamo(p)}
                            style={{ background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 700, color: '#38bdf8', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            ↩ Devuelto
                          </button>
                          <button onClick={() => cerrarComoPerdido(p)}
                            style={{ background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            ✗ No vuelve
                          </button>
                          {isAdmin && (
                            <button onClick={() => abrirEditPrestamo(p)}
                              style={{ background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.3)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, color: '#ffd166', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              ✏ Editar
                            </button>
                          )}
                          <span style={{ fontSize: 11, color: 'var(--text3)', alignSelf: 'center', marginLeft: 4 }}>
                            {p.usuario_nombre}
                          </span>
                        </div>
                      )}
                      {!isActivo && p.fecha_devolucion && (
                        <div style={{ fontSize: 12, color: 'var(--text3)', paddingTop: 8, borderTop: '1px solid var(--border)' }}>
                          {p.estado === 'devuelto' ? '✅ Devuelto' : '❌ No volvió'} · {new Date(p.fecha_devolucion).toLocaleDateString('es-AR')}
                          <span style={{ marginLeft: 8 }}>{p.usuario_nombre}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      ) : view === 'alertas' ? (
        /* ALERTAS DE STOCK */
        <>
          {/* Summary cards */}
          {(() => {
            const sinStockItems = todosProductosFlat.filter(p => { const s = stock[p.codigo]; return s && (s.stock_actual === 0 || s.stock_actual === null) })
            const bajoStockItems = todosProductosFlat.filter(p => { const s = stock[p.codigo]; return s && s.stock_minimo != null && s.stock_actual > 0 && s.stock_actual <= s.stock_minimo })
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
                {[
                  { label: 'Sin stock / Nulo', val: sinStockItems.length, icon: '🔴', color: '#ff5577' },
                  { label: 'Bajo mínimo', val: bajoStockItems.length, icon: '🟡', color: '#fb923c' },
                  { label: 'Críticos total', val: sinStockItems.length + bajoStockItems.length, icon: '⚠️', color: '#ffd166' },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 22 }}>{s.icon}</span>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.val}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Bulk notify */}
          {(() => {
            const criticos = todosProductosFlat.filter(p => {
              const s = stock[p.codigo]
              if (!s) return false
              return s.stock_actual === 0 || s.stock_actual === null || (s.stock_minimo != null && s.stock_actual <= s.stock_minimo)
            })
            if (!criticos.length) return (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 20, fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>
                ✅ Todos los productos están dentro del stock mínimo
              </div>
            )
            return (
              <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#ff5577', marginBottom: 6 }}>📣 Notificar alerta masiva</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>{criticos.length} producto{criticos.length > 1 ? 's' : ''} con stock crítico o nulo</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[{ key: 'vendedores', label: '👤 Vendedores' }, { key: 'distribuidores', label: '🏪 Distribuidores' }, { key: 'ambos', label: '👥 Ambos' }].map(d => (
                    <button key={d.key} onClick={() => enviarAlertaStock(criticos, d.key)} disabled={enviandoAlerta}
                      style={{ padding: '8px 18px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: enviandoAlerta ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', opacity: enviandoAlerta ? 0.6 : 1, background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', color: '#ff5577' }}>
                      {enviandoAlerta ? '⏳...' : d.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Products table with editable stock_minimo */}
          {CATALOGO.map(cat => {
            const cc = CAT_COLORS[cat.categoria]
            return (
              <div key={cat.categoria} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', marginBottom: 20, overflow: 'hidden' }}>
                <div style={{ padding: '12px 20px', background: cc.bg, borderBottom: `1px solid ${cc.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: cc.color }}>{cat.label}</span>
                </div>
                {cat.productos.map((p, i) => {
                  const s = stock[p.codigo]
                  const actual = s?.stock_actual ?? null
                  const minimo = s?.stock_minimo ?? null
                  const editVal = minimoEdit[p.codigo]
                  const sinStockItem = actual === 0 || actual === null
                  const bajoStockItem = !sinStockItem && minimo != null && actual <= minimo
                  const statusColor = sinStockItem ? '#ff5577' : bajoStockItem ? '#fb923c' : '#3dd68c'
                  return (
                    <div key={p.codigo} style={{
                      borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                      padding: '10px 16px',
                      background: sinStockItem ? 'rgba(255,85,119,0.04)' : bajoStockItem ? 'rgba(251,146,60,0.04)' : 'transparent',
                      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                    }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: cc.color, fontFamily: 'monospace', background: cc.bg, border: `1px solid ${cc.border}`, borderRadius: 4, padding: '2px 6px', minWidth: 90 }}>{p.codigo}</span>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</span>
                        <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>{p.modelo}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>Actual:</span>
                        <span style={{ fontWeight: 800, fontSize: 15, color: s ? statusColor : 'var(--text3)' }}>{actual ?? '—'}</span>
                        {sinStockItem && s && <span style={{ fontSize: 9, background: 'rgba(255,85,119,0.15)', color: '#ff5577', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>NULO</span>}
                        {bajoStockItem && <span style={{ fontSize: 9, background: 'rgba(251,146,60,0.15)', color: '#fb923c', padding: '1px 5px', borderRadius: 8, fontWeight: 700 }}>BAJO</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>Mínimo:</span>
                        {editVal !== undefined ? (
                          <>
                            <input type="number" min="0" value={editVal}
                              onChange={e => setMinimoEdit(prev => ({ ...prev, [p.codigo]: e.target.value }))}
                              style={{ width: 60, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 7px', color: 'var(--text)', fontSize: 13, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font)', outline: 'none' }} />
                            <button onClick={() => guardarMinimo(p.codigo, editVal)}
                              style={{ background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: '#3dd68c', cursor: 'pointer', fontFamily: 'var(--font)' }}>✓</button>
                            <button onClick={() => setMinimoEdit(prev => { const n = { ...prev }; delete n[p.codigo]; return n })}
                              style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
                          </>
                        ) : (
                          <button onClick={() => setMinimoEdit(prev => ({ ...prev, [p.codigo]: minimo ?? '' }))}
                            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: minimo != null ? 'var(--text2)' : 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            {minimo != null ? minimo : 'Sin mínimo'}
                          </button>
                        )}
                      </div>
                      {(sinStockItem || bajoStockItem) && s && (
                        <button onClick={() => enviarAlertaStock([{ ...p, categoria: cat.categoria }], 'ambos')} disabled={enviandoAlerta}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)', opacity: enviandoAlerta ? 0.6 : 1 }}>
                          <Bell size={11} /> Notificar
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </>
      ) : (
        /* HISTORIAL */
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              value={busquedaHist}
              onChange={e => setBusquedaHist(e.target.value)}
              placeholder="🔍 Buscar por nombre, #reclamo, #pedido, canal..."
              style={{ ...inputSt, flex: 1, minWidth: 220, maxWidth: 420 }}
            />
            <input
              type="date"
              value={fechaHist}
              onChange={e => setFechaHist(e.target.value)}
              style={{ ...inputSt, width: 160 }}
            />
            {(busquedaHist || fechaHist) && (
              <button onClick={() => { setBusquedaHist(''); setFechaHist('') }}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                ✕ Limpiar
              </button>
            )}
            <button onClick={() => setSortOrderHist(s => s === 'newest' ? 'oldest' : 'newest')}
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
              {sortOrderHist === 'newest' ? '↓ Más nuevo' : '↑ Más antiguo'}
            </button>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: 860, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Tipo', 'Código', 'Producto / Modelo', 'Cantidad', 'Canal', 'Distribuidor / Cliente', 'Operador', 'Observación', 'Fecha'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
                {isAdmin && <th style={{ padding: '11px 14px' }} />}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const q = busquedaHist.toLowerCase().trim()
                const filtrados = movs.filter(m => {
                  if (fechaHist) {
                    const d = m.created_at ? m.created_at.slice(0, 10) : ''
                    if (d !== fechaHist) return false
                  }
                  if (!q) return true
                  return (
                    m.referencia_nombre?.toLowerCase().includes(q) ||
                    m.usuario_nombre?.toLowerCase().includes(q) ||
                    m.observacion?.toLowerCase().includes(q) ||
                    m.canal?.toLowerCase().includes(q) ||
                    m.codigo?.toLowerCase().includes(q) ||
                    m.nombre?.toLowerCase().includes(q)
                  )
                }).sort((a, b) => {
                  const ta = new Date(a.created_at).getTime(), tb = new Date(b.created_at).getTime()
                  return sortOrderHist === 'newest' ? tb - ta : ta - tb
                })
                if (filtrados.length === 0) return (
                  <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>
                    {q || fechaHist ? 'Sin resultados para la búsqueda' : 'No hay movimientos registrados'}
                  </td></tr>
                )
                return filtrados.map((m, i) => {
                const isEgreso = m.tipo === 'egreso'
                const isParcial = m.es_parcial === true || m.observacion?.toLowerCase().includes('parcial')
                const cc = CAT_COLORS[m.categoria] || {}
                return (
                  <tr key={m.id} style={{ borderBottom: i < movs.length - 1 ? '1px solid var(--border)' : 'none', background: isParcial ? 'rgba(255,209,102,0.07)' : 'transparent' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: isEgreso ? 'rgba(255,85,119,0.12)' : 'rgba(61,214,140,0.12)', color: isEgreso ? '#ff5577' : '#3dd68c' }}>
                          {isEgreso ? '↑ EGRESO' : '↓ INGRESO'}
                        </span>
                        {isParcial && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(255,209,102,0.18)', color: '#ffd166', border: '1px solid rgba(255,209,102,0.4)' }}>⏳ PARCIAL</span>}
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 700, color: cc.color, fontFamily: 'monospace' }}>{m.codigo}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{m.nombre}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.modelo}</div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 15, fontWeight: 800, color: isEgreso ? '#ff5577' : '#3dd68c' }}>
                      {isEgreso ? '-' : '+'}{m.cantidad}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text2)' }}>{m.canal}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: '#ffd166' }}>{m.referencia_nombre || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: '#a78bfa' }}>{m.usuario_nombre}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text3)', maxWidth: 180 }}>{m.observacion || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                      {m.created_at ? new Date(m.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '8px 14px' }}>
                        <button
                          onClick={() => { setEditandoMov(m); setEditCantidad(String(m.cantidad)); setEditObs(m.observacion || '') }}
                          style={{ background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}
                        >
                          ✏️ Editar
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })
              })()}
            </tbody>
          </table>
          </div>
        </>
      )}

      {/* MODAL EDITAR MOVIMIENTO */}
      {editandoMov && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 460 }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>✏️ Editar movimiento</div>
              <button onClick={() => setEditandoMov(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Info del movimiento */}
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: editandoMov.tipo === 'egreso' ? 'rgba(255,85,119,0.12)' : 'rgba(61,214,140,0.12)', color: editandoMov.tipo === 'egreso' ? '#ff5577' : '#3dd68c' }}>
                    {editandoMov.tipo === 'egreso' ? '↑ EGRESO' : '↓ INGRESO'}
                  </span>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#7b9fff' }}>{editandoMov.codigo}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{editandoMov.nombre} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>{editandoMov.modelo}</span></div>
                {editandoMov.referencia_nombre && <div style={{ fontSize: 12, color: '#ffd166' }}>📦 {editandoMov.referencia_nombre}</div>}
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>Canal: {editandoMov.canal}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  Stock actual: <strong style={{ color: 'var(--text)' }}>{stock[editandoMov.codigo]?.stock_actual ?? '—'}</strong>
                  {' '}→ al guardar:{' '}
                  <strong style={{ color: '#7b9fff' }}>
                    {(() => {
                      const nuevaCant = parseInt(editCantidad) || 0
                      const diff = nuevaCant - editandoMov.cantidad
                      const actual = stock[editandoMov.codigo]?.stock_actual ?? 0
                      const stockAdj = editandoMov.tipo === 'egreso' ? -diff : diff
                      return Math.max(0, actual + stockAdj)
                    })()}
                  </strong>
                </div>
              </div>

              {/* Cantidad */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Cantidad <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(original: {editandoMov.cantidad})</span>
                </label>
                <input
                  type="number" min="1" autoFocus
                  value={editCantidad}
                  onChange={e => setEditCantidad(e.target.value)}
                  style={inputSt}
                />
              </div>

              {/* Observación */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Observación</label>
                <textarea
                  value={editObs}
                  onChange={e => setEditObs(e.target.value)}
                  rows={2}
                  style={{ ...inputSt, resize: 'vertical', lineHeight: 1.5 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={guardarEditMov}
                  disabled={guardandoEditMov || !editCantidad || parseInt(editCantidad) <= 0}
                  style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', opacity: (!editCantidad || parseInt(editCantidad) <= 0) ? 0.5 : 1 }}
                >
                  {guardandoEditMov ? 'Guardando...' : '💾 Guardar cambios'}
                </button>
                <button
                  onClick={() => setEditandoMov(null)}
                  style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EGRESO POR PEDIDO */}
      {modalPedido && pedidoSel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>📋 Registrar egreso — Pedido #{pedidoSel.id?.slice(0,8).toUpperCase()}</div>
              <button onClick={() => setModalPedido(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Distribuidor */}
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Distribuidor</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{pedidoSel.profiles?.razon_social || pedidoSel.profiles?.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)' }}>{pedidoSel.profiles?.email}</div>
              </div>

              {/* Items del pedido — editables, SIN precios para Admin2 */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Productos del pedido</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pItems.map((it, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#7b9fff', fontFamily: 'monospace', marginRight: 8 }}>{it.codigo}</span>
                        <span style={{ fontSize: 13 }}>{it.nombre} {it.modelo}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isAdmin && it.precio_unitario > 0 && (
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>${it.precio_unitario?.toLocaleString('es-AR')}</span>
                        )}
                        <span style={{ fontSize: 11, background: stock[it.codigo]?.stock_actual >= it.cantidad ? 'rgba(61,214,140,0.12)' : 'rgba(255,85,119,0.12)', color: stock[it.codigo]?.stock_actual >= it.cantidad ? '#3dd68c' : '#ff5577', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                          Stock: {stock[it.codigo]?.stock_actual ?? '—'}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <input
                            type="number" min="0" max={it._max ?? it.cantidad}
                            value={it.cantidad}
                            onChange={e => {
                              const val = Math.min(parseInt(e.target.value) || 0, it._max ?? it.cantidad)
                              setPItems(prev => prev.map((p, j) => j === i ? { ...p, cantidad: val } : p))
                            }}
                            style={{ width: 64, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: 13, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font)' }}
                          />
                          <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>de {it._max ?? it.cantidad}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nro remito */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Número de remito *</label>
                <input value={pNroRemito} onChange={e => setPNroRemito(e.target.value)} placeholder="Ej: 0001-00001234" style={inputSt} />
              </div>

              {/* Fotos remito — múltiples */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Fotos / PDFs del remito (opcional)</label>
                {pFotosRemito.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                    {pFotosRemito.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px' }}>
                        <span style={{ fontSize: 13, color: '#3dd68c', flex: 1 }}>✅ {f.name}</span>
                        <button onClick={() => setPFotosRemito(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '9px 16px', cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
                  <Upload size={14} /> Adjuntar foto / PDF
                  <input type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }} onChange={e => { if (e.target.files?.length) setPFotosRemito(prev => [...prev, ...Array.from(e.target.files)]); e.target.value = '' }} />
                </label>
              </div>

              <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: '#a78bfa' }}>
                👤 Registrado por: <strong>{profile?.full_name || user?.email}</strong>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmarEgresoPedido} disabled={confirmandoPed} style={{ flex: 1, background: '#7b9fff', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: confirmandoPed ? 'not-allowed' : 'pointer', opacity: confirmandoPed ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {confirmandoPed ? '⏳ Procesando...' : '✅ Confirmar egreso y finalizar pedido'}
                </button>
                <button onClick={() => setModalPedido(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE VENTA (Página / VO) */}
      {ventaDetalle && (() => {
        const vc = CANAL_COLORS[ventaDetalle._canalView] || '#7b9fff'
        const vl = CANAL_LABELS[ventaDetalle._canalView] || ''
        const etiquetas = Array.isArray(ventaDetalle.envio_etiquetas) && ventaDetalle.tipo_envio === 'correo'
          ? ventaDetalle.envio_etiquetas : []
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
              {/* Header */}
              <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>📋 Detalle — {vl}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontFamily: 'monospace' }}>{ventaDetalle.nro_orden || `#${ventaDetalle.id?.slice(0,8).toUpperCase()}`}</div>
                </div>
                <button onClick={() => setVentaDetalle(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
              </div>

              <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Cliente */}
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Cliente</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{ventaDetalle.cliente_nombre}</div>
                  {ventaDetalle.cliente_email && <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{ventaDetalle.cliente_email}</div>}
                  {ventaDetalle.cliente_telefono && <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>📞 {ventaDetalle.cliente_telefono}</div>}
                  {ventaDetalle.nro_orden && <div style={{ fontSize: 13, color: vc, fontWeight: 600, marginTop: 4 }}>Orden: {ventaDetalle.nro_orden}</div>}
                </div>

                {/* Productos */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Productos</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(ventaDetalle.items || []).map((it, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', gap: 8, flexWrap: 'wrap' }}>
                        <div>
                          {it.codigo && <span style={{ fontSize: 11, fontWeight: 700, color: vc, fontFamily: 'monospace', marginRight: 8 }}>{it.codigo}</span>}
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{it.nombre}</span>
                          {it.modelo && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>{it.modelo}</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>×{it.cantidad}</span>
                          {it.precio_unitario > 0 && <span style={{ fontSize: 12, color: 'var(--text3)' }}>${Number(it.precio_unitario).toLocaleString('es-AR')}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {ventaDetalle.total > 0 && (
                    <div style={{ textAlign: 'right', marginTop: 8, fontSize: 14, fontWeight: 800, color: vc }}>
                      Total: ${Number(ventaDetalle.total).toLocaleString('es-AR')}
                    </div>
                  )}
                </div>

                {/* Envío */}
                {ventaDetalle.tipo_envio && (
                  <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Envío</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                      {ventaDetalle.tipo_envio === 'correo' ? '📬 Correo Argentino / Andreani' : ventaDetalle.tipo_envio === 'logistica' ? '🚛 Logística' : '🏭 Retiro en Fábrica'}
                      {ventaDetalle.envio_retiro_persona && <span style={{ color: 'var(--text3)', fontWeight: 400 }}> — {ventaDetalle.envio_retiro_persona}</span>}
                    </div>

                    {/* Etiquetas correo */}
                    {etiquetas.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, marginBottom: 6 }}>Etiquetas de envío</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {etiquetas.map((et, i) => {
                            const url = typeof et === 'string' ? et : et?.url
                            const prods = typeof et === 'object' ? (et?.productos || []) : []
                            if (!url) return null
                            return (
                              <div key={i} style={{ background: `${vc}0f`, border: `1px solid ${vc}44`, borderRadius: 8, padding: '8px 12px' }}>
                                <a href={url} target="_blank" rel="noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: vc, textDecoration: 'none' }}>
                                  <FileText size={14} /> Etiqueta {etiquetas.length > 1 ? i + 1 : ''} — Descargar / Imprimir
                                </a>
                                {prods.length > 0 && (
                                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                                    {prods.map(p => `${p.codigo || ''} ${p.nombre || ''}`).filter(Boolean).join(' · ')}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Productos logística */}
                    {ventaDetalle.tipo_envio !== 'correo' && Array.isArray(ventaDetalle.envio_etiquetas) && ventaDetalle.envio_etiquetas.length > 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                        {ventaDetalle.envio_etiquetas.map(it => `${it.codigo || ''} ×${it.cantidad}`).filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Observaciones */}
                {ventaDetalle.observaciones && (
                  <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13, color: 'var(--text2)' }}>
                    <span style={{ color: 'var(--text3)', fontWeight: 600 }}>Observaciones: </span>{ventaDetalle.observaciones}
                  </div>
                )}

                {/* Remito si ya fue registrado */}
                {ventaDetalle.nro_remito && (
                  <div style={{ background: 'rgba(61,214,140,0.08)', border: '1px solid rgba(61,214,140,0.25)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13 }}>
                    <span style={{ color: '#3dd68c', fontWeight: 700 }}>✅ Egreso registrado — Remito: </span>{ventaDetalle.nro_remito}
                  </div>
                )}

                <button onClick={() => setVentaDetalle(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* MODAL INGRESO */}
      {modalIngreso && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 420 }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#3dd68c' }}>↓ Registrar Ingreso PT</div>
              <button onClick={() => setModalIngreso(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {iProducto && (
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{iProducto.codigo} — {iProducto.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{iProducto.modelo}</div>
                  <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text3)' }}>Stock actual: <strong style={{ color: '#3dd68c' }}>{stock[iProducto.codigo]?.stock_actual ?? 0}</strong></div>
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Cantidad *</label>
                <input type="number" min="1" value={iCantidad} onChange={e => setICantidad(e.target.value)} placeholder="Ej: 50" style={inputSt} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Observación (opcional)</label>
                <textarea value={iObs} onChange={e => setIObs(e.target.value)} rows={2} placeholder="Ej: Remito 0001-00001234..." style={{ ...inputSt, resize: 'vertical', lineHeight: 1.5 }} />
              </div>
              <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: '#a78bfa' }}>
                👤 Registrado por: <strong>{profile?.full_name || user?.email}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={guardarIngreso} disabled={guardandoIngreso} style={{ flex: 1, background: '#3dd68c', color: '#0a0e1a', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: guardandoIngreso ? 'not-allowed' : 'pointer', opacity: guardandoIngreso ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {guardandoIngreso ? '⏳ Guardando...' : '↓ Confirmar ingreso'}
                </button>
                <button onClick={() => setModalIngreso(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EGRESO */}
      {modalEgreso && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 460 }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#ff5577' }}>↑ Registrar Egreso PT</div>
              <button onClick={() => setModalEgreso(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {eProducto && (
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Producto</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{eProducto.codigo} — {eProducto.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{eProducto.modelo}</div>
                  <div style={{ fontSize: 12, marginTop: 6, color: stock[eProducto.codigo]?.stock_actual > 0 ? '#3dd68c' : '#ff5577', fontWeight: 700 }}>
                    Stock disponible: {stock[eProducto.codigo]?.stock_actual ?? 0}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Canal de salida *</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {CANALES_EGRESO.map(c => (
                    <button key={c} onClick={() => setECanal(c)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', border: `1px solid ${eCanal === c ? 'rgba(255,85,119,0.5)' : 'var(--border)'}`, background: eCanal === c ? 'rgba(255,85,119,0.12)' : 'transparent', color: eCanal === c ? '#ff5577' : 'var(--text3)', fontWeight: eCanal === c ? 700 : 400 }}>{c}</button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Cantidad *</label>
                <input type="number" min="1" value={eCantidad} onChange={e => setECantidad(e.target.value)} placeholder="Ej: 10" style={inputSt} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Observación (opcional)</label>
                <textarea value={eObs} onChange={e => setEObs(e.target.value)} rows={2} placeholder="Ej: Pedido #12345, distribuidor Boedo Luz..." style={{ ...inputSt, resize: 'vertical', lineHeight: 1.5 }} />
              </div>

              <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: '#a78bfa' }}>
                👤 Registrado por: <strong>{profile?.full_name || user?.email}</strong>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={guardarEgreso} disabled={guardando} style={{ flex: 1, background: '#ff5577', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {guardando ? '⏳ Guardando...' : '↑ Confirmar egreso'}
                </button>
                <button onClick={() => setModalEgreso(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EGRESO CANAL (MELI / PAGINA / VO) */}
      {modalVenta && ventaSel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>↑ Registrar egreso — {CANAL_LABELS[view]}</div>
              <button onClick={() => setModalVenta(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Cliente */}
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Cliente</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{ventaSel.cliente_nombre}</div>
                {ventaSel.nro_orden && <div style={{ fontSize: 12, color: CANAL_COLORS[view], fontWeight: 700 }}>Orden: {ventaSel.nro_orden}</div>}
                {ventaSel.cliente_email && <div style={{ fontSize: 12, color: 'var(--text3)' }}>{ventaSel.cliente_email}</div>}
              </div>

              {/* Items editables */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>Productos</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {vItems.map((it, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        {it.codigo && <span style={{ fontSize: 11, fontWeight: 700, color: CANAL_COLORS[view], fontFamily: 'monospace', marginRight: 8 }}>{it.codigo}</span>}
                        <span style={{ fontSize: 13 }}>{it.nombre}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, background: stock[it.codigo]?.stock_actual >= it.cantidad ? 'rgba(61,214,140,0.12)' : 'rgba(255,85,119,0.12)', color: stock[it.codigo]?.stock_actual >= it.cantidad ? '#3dd68c' : '#ff5577', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                          Stock: {stock[it.codigo]?.stock_actual ?? '—'}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                          <input type="number" min="0" max={it.cantidad} value={it.cantidad}
                            onChange={e => { const val = Math.min(parseInt(e.target.value)||0, it.cantidad); setVItems(prev => prev.map((p,j) => j===i ? {...p,cantidad:val} : p)) }}
                            style={{ width: 64, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: 13, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font)' }} />
                          <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>de {it.cantidad}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nro remito + archivos */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Número de remito (opcional)</label>
                <input value={vNroRemito} onChange={e => setVNroRemito(e.target.value)} placeholder="Ej: 0001-00001234" style={inputSt} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Adjuntar remito / fotos (opcional)</label>
                {vArchivosRemito.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                    {vArchivosRemito.map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px' }}>
                        <span style={{ fontSize: 13, color: '#3dd68c', flex: 1 }}>✅ {f.name}</span>
                        <button onClick={() => setVArchivosRemito(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '9px 16px', cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
                  <Upload size={14} /> Adjuntar foto / PDF
                  <input type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }}
                    onChange={e => { if (e.target.files?.length) setVArchivosRemito(prev => [...prev, ...Array.from(e.target.files)]); e.target.value = '' }} />
                </label>
              </div>

              <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: '#a78bfa' }}>
                👤 Registrado por: <strong>{profile?.full_name || user?.email}</strong>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={confirmarEgresoVenta} disabled={confirmandoVenta} style={{ flex: 1, background: CANAL_COLORS[view], color: view === 'egreso-meli' ? '#000' : '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: confirmandoVenta ? 'not-allowed' : 'pointer', opacity: confirmandoVenta ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {confirmandoVenta ? '⏳ Procesando...' : '↑ Confirmar egreso'}
                </button>
                <button onClick={() => setModalVenta(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PRÉSTAMO */}
      {editandoPrestamo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#ffd166' }}>✏ Editar Préstamo</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Solo modifica el registro — no ajusta stock</div>
              </div>
              <button onClick={() => setEditandoPrestamo(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Destino / Cliente *</label>
                <input value={prEditDestino} onChange={e => setPrEditDestino(e.target.value)} style={inputSt} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Productos *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {prEditItems.map((it, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px auto', gap: 8, alignItems: 'center' }}>
                      <select value={it.codigo} onChange={e => {
                        const p = todosProductosFlat.find(p => p.codigo === e.target.value)
                        setPrEditItems(prev => prev.map((x, j) => j === i ? { ...x, codigo: e.target.value, nombre: p?.nombre || '', modelo: p?.modelo || '', categoria: p?.categoria || '' } : x))
                      }} style={{ ...inputSt, cursor: 'pointer' }}>
                        <option value="">— Producto —</option>
                        {CATALOGO.map(cat => (
                          <optgroup key={cat.categoria} label={`${cat.emoji} ${cat.label}`}>
                            {cat.productos.map(p => (
                              <option key={p.codigo} value={p.codigo}>{p.codigo} — {p.nombre} {p.modelo}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <input type="number" min="1" value={it.cantidad} onChange={e => setPrEditItems(prev => prev.map((x, j) => j === i ? { ...x, cantidad: parseInt(e.target.value) || 1 } : x))} style={inputSt} />
                      <button onClick={() => setPrEditItems(prev => prev.filter((_, j) => j !== i))} disabled={prEditItems.length === 1}
                        style={{ background: 'none', border: 'none', color: '#ff5577', cursor: prEditItems.length === 1 ? 'not-allowed' : 'pointer', fontSize: 18, opacity: prEditItems.length === 1 ? 0.3 : 1 }}>×</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setPrEditItems(prev => [...prev, { codigo: '', nombre: '', modelo: '', cantidad: 1 }])}
                  style={{ marginTop: 8, background: 'none', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  + Agregar producto
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Retorno estimado</label>
                  <input type="date" value={prEditFechaRetorno} onChange={e => setPrEditFechaRetorno(e.target.value)} style={inputSt} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Observación</label>
                  <input value={prEditObservacion} onChange={e => setPrEditObservacion(e.target.value)} placeholder="Opcional..." style={inputSt} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={guardarEditPrestamo} disabled={guardandoEditPr}
                  style={{ flex: 1, background: 'rgba(255,209,102,0.15)', color: '#ffd166', border: '1px solid rgba(255,209,102,0.4)', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: guardandoEditPr ? 'not-allowed' : 'pointer', opacity: guardandoEditPr ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {guardandoEditPr ? '⏳ Guardando...' : '💾 Guardar cambios'}
                </button>
                <button onClick={() => setEditandoPrestamo(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO PRÉSTAMO */}
      {modalPrestamo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#34d399' }}>💼 Nuevo Préstamo</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>El stock se descuenta ahora. Si vuelve, se re-ingresa.</div>
              </div>
              <button onClick={() => setModalPrestamo(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Destino */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Destino / Cliente *</label>
                <input value={prDestino} onChange={e => setPrDestino(e.target.value)} placeholder="Ej: Constructora Rossi, Arq. García..."
                  style={inputSt} />
              </div>

              {/* Productos */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Productos *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {prItems.map((it, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px auto', gap: 8, alignItems: 'center' }}>
                      <select value={it.codigo} onChange={e => {
                        const p = todosProductosFlat.find(p => p.codigo === e.target.value)
                        setPrItems(prev => prev.map((x, j) => j === i ? { ...x, codigo: e.target.value, nombre: p?.nombre || '', modelo: p?.modelo || '', categoria: p?.categoria || '' } : x))
                      }} style={{ ...inputSt, cursor: 'pointer' }}>
                        <option value="">— Producto —</option>
                        {CATALOGO.map(cat => (
                          <optgroup key={cat.categoria} label={`${cat.emoji} ${cat.label}`}>
                            {cat.productos.map(p => (
                              <option key={p.codigo} value={p.codigo}>
                                {p.codigo} — {p.nombre} {p.modelo} {stock[p.codigo] ? `(${stock[p.codigo].stock_actual} en stock)` : ''}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <input type="number" min="1" value={it.cantidad} onChange={e => setPrItems(prev => prev.map((x, j) => j === i ? { ...x, cantidad: parseInt(e.target.value) || 1 } : x))}
                        style={inputSt} />
                      <button onClick={() => setPrItems(prev => prev.filter((_, j) => j !== i))} disabled={prItems.length === 1}
                        style={{ background: 'none', border: 'none', color: '#ff5577', cursor: prItems.length === 1 ? 'not-allowed' : 'pointer', fontSize: 18, opacity: prItems.length === 1 ? 0.3 : 1 }}>×</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => setPrItems(prev => [...prev, { codigo: '', nombre: '', modelo: '', cantidad: 1 }])}
                  style={{ marginTop: 8, background: 'none', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  + Agregar producto
                </button>
              </div>

              {/* Fecha retorno estimada */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Retorno estimado</label>
                  <input type="date" value={prFechaRetorno} onChange={e => setPrFechaRetorno(e.target.value)} style={inputSt} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Observación</label>
                  <input value={prObservacion} onChange={e => setPrObservacion(e.target.value)} placeholder="Opcional..." style={inputSt} />
                </div>
              </div>

              <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: '#a78bfa' }}>
                👤 Registrado por: <strong>{profile?.full_name || user?.email}</strong>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={registrarPrestamo} disabled={guardandoPrestamo}
                  style={{ flex: 1, background: '#34d399', color: '#0a0e1a', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: guardandoPrestamo ? 'not-allowed' : 'pointer', opacity: guardandoPrestamo ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {guardandoPrestamo ? '⏳ Registrando...' : '💼 Registrar préstamo'}
                </button>
                <button onClick={() => setModalPrestamo(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INGRESO / STOCK INICIAL */}
      {modalStock && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 420 }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#3dd68c' }}>↓ Ingreso / Stock inicial</div>
              <button onClick={() => setModalStock(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {sProducto && (
                <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{sProducto.codigo} — {sProducto.nombre}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{sProducto.modelo}</div>
                  {stock[sProducto.codigo] && (
                    <div style={{ fontSize: 12, marginTop: 4, color: 'var(--text3)' }}>Stock actual: {stock[sProducto.codigo].stock_actual}</div>
                  )}
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Cantidad *</label>
                <input type="number" min="0" value={sCantidad} onChange={e => setSCantidad(e.target.value)} placeholder="Ej: 100" style={inputSt} />
              </div>

              <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: '#a78bfa' }}>
                👤 Registrado por: <strong>{profile?.full_name || user?.email}</strong>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={guardarStockInicial} disabled={guardandoStock} style={{ flex: 1, background: '#3dd68c', color: '#0a0e1a', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: guardandoStock ? 'not-allowed' : 'pointer', opacity: guardandoStock ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {guardandoStock ? '⏳ Guardando...' : '↓ Confirmar ingreso'}
                </button>
                <button onClick={() => setModalStock(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL INGRESO TRÁNSITO */}
      {modalTransito && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid rgba(251,146,60,0.4)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 640, maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fb923c' }}>🚛 Ingreso en Tránsito → Stock</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Confirmá los ingresos pendientes para sumarlos oficialmente al stock</div>
              </div>
              <button onClick={() => setModalTransito(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loadingTransito ? (
                <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Cargando...</div>
              ) : transitoPendiente.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>✅</div>
                  <div style={{ color: 'var(--text3)', fontSize: 14 }}>No hay ingresos en tránsito pendientes</div>
                </div>
              ) : (
                transitoPendiente.map(reg => {
                  const CANAL_COLOR = { Meli: '#ffd166', Página: '#7b9fff', VO: '#3dd68c' }
                  const CANAL_EMOJI = { Meli: '🛒', Página: '🌐', VO: '📦' }
                  const cc = CANAL_COLOR[reg.canal] || '#7b9fff'
                  return (
                    <div key={reg.id} style={{ background: 'var(--surface2)', border: `1px solid ${cc}30`, borderRadius: 'var(--radius)', padding: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: cc, background: `${cc}18`, border: `1px solid ${cc}40`, borderRadius: 6, padding: '3px 10px' }}>
                            {CANAL_EMOJI[reg.canal]} {reg.canal}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(reg.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</span>
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>— {reg.usuario_nombre}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 10 }}>
                        {(reg.items || []).map((it, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4 }}>{it.codigo}</span>
                            <span style={{ color: 'var(--text2)', flex: 1 }}>{it.nombre} <span style={{ color: 'var(--text3)', fontSize: 11 }}>{it.modelo}</span></span>
                            <span style={{ fontWeight: 700 }}>×{it.cantidad}</span>
                            <span style={{ fontSize: 11, color: '#3dd68c' }}>
                              → stock: {(stock[it.codigo]?.stock_actual ?? 0)} + {it.cantidad} = <strong>{(stock[it.codigo]?.stock_actual ?? 0) + parseInt(it.cantidad)}</strong>
                            </span>
                          </div>
                        ))}
                      </div>

                      {reg.observacion && (
                        <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10, padding: '5px 10px', background: 'var(--surface)', borderRadius: 6 }}>{reg.observacion}</div>
                      )}

                      <button
                        onClick={() => confirmarTransito(reg)}
                        disabled={confirmandoTransito === reg.id}
                        style={{ background: 'linear-gradient(135deg,#3dd68c,#2ab573)', color: '#0a1a12', border: 'none', borderRadius: 'var(--radius)', padding: '9px 20px', fontSize: 13, fontWeight: 800, cursor: confirmandoTransito === reg.id ? 'not-allowed' : 'pointer', opacity: confirmandoTransito === reg.id ? 0.7 : 1, fontFamily: 'var(--font)' }}
                      >
                        {confirmandoTransito === reg.id ? '⏳ Confirmando...' : '✅ Confirmar → Sumar a Stock'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL INGRESAR PRODUCCIÓN */}
      {modalProd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#3dd68c' }}>🏭 Ingresar Producción</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Registrá los productos fabricados hoy — se suma al stock automáticamente</div>
              </div>
              <button onClick={() => setModalProd(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Fecha */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Fecha de producción *</label>
                <input
                  type="date"
                  value={prodFecha}
                  onChange={e => setProdFecha(e.target.value)}
                  style={{ ...inputSt, maxWidth: 200 }}
                />
              </div>

              {/* Número de lote */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Número de lote</label>
                <input
                  type="text"
                  value={prodLote}
                  onChange={e => setProdLote(e.target.value)}
                  placeholder="Ej: L2026-001"
                  style={{ ...inputSt, maxWidth: 220 }}
                />
              </div>

              {/* Filas de producto */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 10 }}>Productos fabricados</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {prodItems.map((it, idx) => {
                    const stockActual = it.codigo ? (stock[it.codigo]?.stock_actual ?? 0) : null
                    const catInfo = it.categoria ? CAT_COLORS[it.categoria] : null
                    return (
                      <div key={idx} style={{ background: 'var(--surface2)', border: `1px solid ${catInfo ? catInfo.border : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', minWidth: 20 }}>{idx + 1}.</span>
                          <select
                            value={it.codigo}
                            onChange={e => prodSelectProducto(idx, e.target.value)}
                            style={{ ...inputSt, flex: 1 }}
                          >
                            <option value="">— Seleccioná producto —</option>
                            {CATALOGO.map(cat => (
                              <optgroup key={cat.categoria} label={`${cat.emoji} ${cat.label}`}>
                                {cat.productos.map(p => (
                                  <option key={p.codigo} value={p.codigo}>{p.codigo} — {p.nombre} {p.modelo}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          {prodItems.length > 1 && (
                            <button
                              onClick={() => setProdItems(prev => prev.filter((_, i) => i !== idx))}
                              style={{ background: 'rgba(255,85,119,0.12)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, color: '#ff5577', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '4px 8px', fontFamily: 'var(--font)' }}>
                              ×
                            </button>
                          )}
                        </div>

                        {it.codigo && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                            {catInfo && (
                              <span style={{ fontSize: 11, fontWeight: 700, color: catInfo.color, background: catInfo.bg, border: `1px solid ${catInfo.border}`, borderRadius: 5, padding: '2px 8px', fontFamily: 'monospace' }}>{it.codigo}</span>
                            )}
                            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{it.nombre} — {it.modelo}</span>
                            <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
                              Stock actual: <strong style={{ color: typeof stockActual === 'number' && stockActual > 0 ? '#3dd68c' : '#ff5577' }}>{stockActual ?? '—'}</strong>
                            </span>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Cantidad fabricada *</label>
                          <input
                            type="number" min="1"
                            value={it.cantidad}
                            onChange={e => setProdItems(prev => prev.map((p, i) => i !== idx ? p : { ...p, cantidad: parseInt(e.target.value) || 1 }))}
                            style={{ ...inputSt, maxWidth: 100, textAlign: 'center', fontWeight: 700, fontSize: 15 }}
                          />
                          {it.codigo && stockActual !== null && (
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                              → Nuevo stock: <strong style={{ color: '#3dd68c' }}>{stockActual + (parseInt(it.cantidad) || 0)}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <button
                  onClick={() => setProdItems(prev => [...prev, { codigo: '', nombre: '', modelo: '', categoria: '', cantidad: 1 }])}
                  style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(61,214,140,0.08)', border: '1px dashed rgba(61,214,140,0.4)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#3dd68c', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  + Agregar otro producto
                </button>
              </div>

              <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12, color: '#a78bfa' }}>
                👤 Registrado por: <strong>{profile?.full_name || user?.email}</strong>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={guardarProduccion} disabled={guardandoProd} style={{ flex: 1, background: 'linear-gradient(135deg,#3dd68c,#2ab573)', color: '#0a1a12', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 800, cursor: guardandoProd ? 'not-allowed' : 'pointer', opacity: guardandoProd ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {guardandoProd ? '⏳ Registrando...' : '🏭 Confirmar Producción'}
                </button>
                <button onClick={() => setModalProd(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
