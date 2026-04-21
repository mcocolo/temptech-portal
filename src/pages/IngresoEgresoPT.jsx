import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui'
import { ArrowDownCircle, ArrowUpCircle, Package, History, ShoppingBag, Upload, FileText, Info } from 'lucide-react'
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
      { codigo: 'K2002',  nombre: 'Anafe Infrarrojo',             modelo: '2 Hornallas Touch' },
      { codigo: 'DT4-1',  nombre: 'Anafe Inducción',              modelo: '4 Hornallas Touch' },
    ],
  },
]

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
  const [view, setView]         = useState('stock')   // 'stock' | 'historial'
  const [stock, setStock]       = useState({})         // { [codigo]: { stock_inicial, stock_actual } }
  const [movs, setMovs]         = useState([])
  const [loading, setLoading]   = useState(true)
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

  // Modal stock inicial (solo admin)
  const [modalStock, setModalStock]     = useState(false)
  const [sProducto, setSProducto]       = useState(null)
  const [sCantidad, setSCantidad]       = useState('')
  const [guardandoStock, setGuardandoStock] = useState(false)

  // Tabs egreso canal (meli/pagina/vo)
  // Modal producción
  const [modalProd, setModalProd]           = useState(false)
  const [prodFecha, setProdFecha]           = useState(() => new Date().toISOString().split('T')[0])
  const [prodItems, setProdItems]           = useState([{ codigo: '', nombre: '', modelo: '', categoria: '', cantidad: 1 }])
  const [guardandoProd, setGuardandoProd]   = useState(false)

  const [ventas, setVentas]               = useState([])
  const [ventaDetalle, setVentaDetalle]   = useState(null)
  const [loadingVentas, setLoadingVentas] = useState(false)
  const [busquedaVenta, setBusquedaVenta] = useState('')
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

  useEffect(() => { cargar() }, [])
  useEffect(() => { if (view === 'pedidos') cargarPedidos() }, [view])
  useEffect(() => { if (CANAL_VIEWS.includes(view)) cargarVentas(CANAL_KEYS[view]) }, [view])

  async function cargarPedidos() {
    setLoadingPedidos(true)
    const { data } = await supabase
      .from('pedidos')
      .select('*, profiles(full_name, razon_social, email)')
      .eq('estado', 'aprobado')
      .is('nro_remito', null)
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
      .or('stock_descontado.is.null,stock_descontado.eq.false')
      .neq('estado', 'cancelado')
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
      await supabase.from('movimientos_pt').insert({
        codigo: item.codigo, nombre: item.nombre || '', modelo: item.modelo || '', categoria: item.categoria || '',
        tipo: 'egreso', cantidad: item.cantidad, canal: CANAL_LABELS[view] || ventaSel.canal,
        observacion: `Venta ${ventaSel.canal.toUpperCase()} ${ventaSel.nro_orden ? '· ' + ventaSel.nro_orden : ''} · ${ventaSel.cliente_nombre}${vNroRemito ? ' · Remito ' + vNroRemito : ''}`,
        usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
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
      estado: 'enviado',
      updated_at: new Date().toISOString(),
    }).eq('id', ventaSel.id)

    toast.success('✅ Egreso registrado — venta marcada como Enviada')
    setConfirmandoVenta(false)
    setModalVenta(false); setVentaSel(null); setVItems([]); setVNroRemito(''); setVArchivosRemito([])
    cargar(); cargarVentas(CANAL_KEYS[view])
  }

  async function confirmarEgresoPedido() {
    if (!pedidoSel) return
    if (!pNroRemito.trim()) return toast.error('Ingresá el número de remito')
    setConfirmandoPed(true)

    const remitoUrls = []
    for (const file of pFotosRemito) {
      const ext = file.name.split('.').pop()
      const path = `remitos/${pedidoSel.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('facturas').upload(path, file, { upsert: true })
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)
        remitoUrls.push(publicUrl)
      }
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
      updated_at: new Date().toISOString(),
    }).eq('id', pedidoSel.id)
    if (errEstado) { toast.error('Error al actualizar pedido: ' + errEstado.message); setConfirmandoPed(false); return }

    // Guardar saldo pendiente (requiere columna items_pendientes)
    await supabase.from('pedidos').update({ items_pendientes: newPending }).eq('id', pedidoSel.id)

    // Descontar stock por las cantidades efectivamente entregadas
    for (const item of pItems) {
      if (!item.codigo || !item.cantidad) continue
      const actual = stock[item.codigo]?.stock_actual ?? 0
      const nuevo = Math.max(0, actual - item.cantidad)
      await supabase.from('stock_pt').upsert({
        codigo: item.codigo,
        nombre: item.nombre || '',
        modelo: item.modelo || '',
        categoria: item.categoria || '',
        stock_actual: nuevo,
        stock_inicial: stock[item.codigo]?.stock_inicial ?? 0,
      }, { onConflict: 'codigo' })
      await supabase.from('movimientos_pt').insert({
        codigo: item.codigo, nombre: item.nombre || '', modelo: item.modelo || '', categoria: item.categoria || '',
        tipo: 'egreso', cantidad: item.cantidad, canal: 'Distribuidor',
        observacion: `Pedido #${pedidoSel.id?.slice(0,8).toUpperCase()} · ${pedidoSel.profiles?.razon_social || pedidoSel.profiles?.full_name || ''}${pNroRemito ? ' · Remito ' + pNroRemito : ''}`,
        usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
      })
    }

    toast.success(isComplete ? '✅ Entrega completa — Pedido marcado como Entregado' : '✅ Entrega parcial registrada — saldo pendiente guardado')
    setConfirmandoPed(false)
    setModalPedido(false); setPedidoSel(null); setPNroRemito(''); setPFotosRemito([]); setPItems([])
    cargar(); cargarPedidos()
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
    const obs = `Ingreso de producción — ${prodFecha}`
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
        usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
      })
    }
    toast.success(`✅ Producción registrada: ${validos.length} producto${validos.length > 1 ? 's' : ''}`)
    setGuardandoProd(false)
    setModalProd(false)
    setProdFecha(new Date().toISOString().split('T')[0])
    setProdItems([{ codigo: '', nombre: '', modelo: '', categoria: '', cantidad: 1 }])
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
        <button
          onClick={() => { setModalProd(true); setProdFecha(new Date().toISOString().split('T')[0]); setProdItems([{ codigo: '', nombre: '', modelo: '', categoria: '', cantidad: 1 }]) }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#3dd68c,#2ab573)', color: '#0a1a12', border: 'none', borderRadius: 'var(--radius)', padding: '11px 22px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: '0 4px 16px rgba(61,214,140,0.3)' }}>
          🏭 Ingresar Producción
        </button>
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
          { v: 'historial',     icon: <History size={13} />,     label: 'Historial' },
        ].map(t => {
          const isActive = view === t.v
          const col = t.color || '#7b9fff'
          return (
            <button key={t.v} onClick={() => setView(t.v)} style={{
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
                  <button onClick={() => { setPedidoSel(ped); setPNroRemito(''); setPFotosRemito([]); const pending = ped.items_pendientes?.length > 0 ? ped.items_pendientes : (ped.items || []); setPItems(pending.map(it => ({ ...it }))); setModalPedido(true) }}
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
                            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                              {(Array.isArray(v.items) ? v.items : []).map(it => `${it.codigo || ''} ×${it.cantidad}`).join(' · ')}
                            </div>
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
                            onClick={() => { setVentaSel(v); setVItems((v.items || []).map(it => ({ ...it }))); setVNroRemito(''); setModalVenta(true) }}
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
          {/* Filtro categoría */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            <button onClick={() => setCatFilter('')} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${!catFilter ? 'rgba(255,255,255,0.3)' : 'var(--border)'}`, background: !catFilter ? 'rgba(255,255,255,0.07)' : 'transparent', color: !catFilter ? 'var(--text)' : 'var(--text3)', fontWeight: !catFilter ? 600 : 400, fontFamily: 'var(--font)' }}>
              📦 Todos
            </button>
            {CATALOGO.map(c => { const cc = CAT_COLORS[c.categoria]; return (
              <button key={c.categoria} onClick={() => setCatFilter(catFilter === c.categoria ? '' : c.categoria)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${catFilter === c.categoria ? cc.border : 'var(--border)'}`, background: catFilter === c.categoria ? cc.bg : 'transparent', color: catFilter === c.categoria ? cc.color : 'var(--text3)', fontWeight: catFilter === c.categoria ? 600 : 400, fontFamily: 'var(--font)' }}>
                {c.emoji} {c.label}
              </button>
            )})}
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
                            <button onClick={() => { setIProducto({ ...p, categoria: cat.categoria }); setICantidad(''); setIObs(''); setModalIngreso(true) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#3dd68c', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              <ArrowDownCircle size={12} /> Ingreso
                            </button>
                            <button onClick={() => { setEProducto({ ...p, categoria: cat.categoria }); setECantidad(''); setEObs(''); setECanal('Distribuidor'); setModalEgreso(true) }}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              <ArrowUpCircle size={12} /> Egreso
                            </button>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )
          })}
        </>
      ) : (
        /* HISTORIAL */
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Tipo', 'Código', 'Producto / Modelo', 'Cantidad', 'Canal', 'Operador', 'Observación', 'Fecha'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movs.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>No hay movimientos registrados</td></tr>
              ) : movs.map((m, i) => {
                const isEgreso = m.tipo === 'egreso'
                const cc = CAT_COLORS[m.categoria] || {}
                return (
                  <tr key={m.id} style={{ borderBottom: i < movs.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: isEgreso ? 'rgba(255,85,119,0.12)' : 'rgba(61,214,140,0.12)', color: isEgreso ? '#ff5577' : '#3dd68c' }}>
                        {isEgreso ? '↑ EGRESO' : '↓ INGRESO'}
                      </span>
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
                    <td style={{ padding: '11px 14px', fontSize: 12, fontWeight: 600, color: '#a78bfa' }}>{m.usuario_nombre}</td>
                    <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--text3)', maxWidth: 180 }}>{m.observacion || '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                      {m.created_at ? new Date(m.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
                            type="number" min="0" max={it.cantidad}
                            value={it.cantidad}
                            onChange={e => {
                              const val = Math.min(parseInt(e.target.value) || 0, it.cantidad)
                              setPItems(prev => prev.map((p, j) => j === i ? { ...p, cantidad: val } : p))
                            }}
                            style={{ width: 64, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: 13, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font)' }}
                          />
                          <span style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>de {it.cantidad}</span>
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
