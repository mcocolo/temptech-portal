import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui'
import { ArrowDownCircle, ArrowUpCircle, Package, History, ShoppingBag, Upload } from 'lucide-react'
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
      { codigo: 'F1400BCO',     nombre: 'Firenze',       modelo: '1400w Blanco' },
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
  const [pFotoRemito, setPFotoRemito]       = useState(null)
  const [confirmandoPed, setConfirmandoPed] = useState(false)

  // Modal stock inicial (solo admin)
  const [modalStock, setModalStock]     = useState(false)
  const [sProducto, setSProducto]       = useState(null)
  const [sCantidad, setSCantidad]       = useState('')
  const [guardandoStock, setGuardandoStock] = useState(false)

  useEffect(() => { cargar() }, [])
  useEffect(() => { if (view === 'pedidos') cargarPedidos() }, [view])

  async function cargarPedidos() {
    setLoadingPedidos(true)
    const { data } = await supabase
      .from('pedidos')
      .select('*, profiles(full_name, razon_social, email)')
      .eq('estado', 'aprobado')
      .order('created_at', { ascending: false })
    setPedidos(data || [])
    setLoadingPedidos(false)
  }

  async function confirmarEgresoPedido() {
    if (!pedidoSel) return
    if (!pNroRemito.trim()) return toast.error('Ingresá el número de remito')
    setConfirmandoPed(true)

    let remitoUrl = null
    if (pFotoRemito) {
      const ext = pFotoRemito.name.split('.').pop()
      const path = `remitos/${pedidoSel.id}/${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('facturas').upload(path, pFotoRemito, { upsert: true })
      if (!upErr) {
        const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)
        remitoUrl = publicUrl
      }
    }

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

    await supabase.from('pedidos').update({
      nro_remito: pNroRemito.trim(),
      ...(remitoUrl ? { remito_url: remitoUrl } : {}),
      estado: isComplete ? 'entregado' : 'aprobado',
      items_pendientes: newPending,
      updated_at: new Date().toISOString(),
    }).eq('id', pedidoSel.id)

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
        observacion: `Pedido #${pedidoSel.id?.slice(0,8).toUpperCase()} · Remito ${pNroRemito}`,
        usuario_id: user.id, usuario_nombre: profile?.full_name || user.email,
      })
    }

    toast.success(isComplete ? '✅ Entrega completa — Pedido marcado como Entregado' : '✅ Entrega parcial registrada — saldo pendiente guardado')
    setConfirmandoPed(false)
    setModalPedido(false); setPedidoSel(null); setPNroRemito(''); setPFotoRemito(null); setPItems([])
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

  const todosProductos = CATALOGO.flatMap(c => c.productos.map(p => ({ ...p, categoria: c.categoria, catLabel: c.label, catEmoji: c.emoji })))
  const filtrados = catFilter ? CATALOGO.filter(c => c.categoria === catFilter) : CATALOGO

  const totalProductos = todosProductos.length
  const conStock = Object.values(stock).filter(s => s.stock_actual > 0).length
  const sinStock = Object.values(stock).filter(s => s.stock_actual === 0 && s.stock_inicial > 0).length
  const totalMovs = movs.length

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Ingreso / Egreso PT</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Control de stock de Producto Terminado</p>
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
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[{ v: 'stock', icon: <Package size={13} />, label: 'Stock' }, { v: 'pedidos', icon: <ShoppingBag size={13} />, label: 'Egresos por Pedido' }, { v: 'historial', icon: <History size={13} />, label: 'Historial' }].map(t => (
          <button key={t.v} onClick={() => setView(t.v)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
            background: view === t.v ? 'rgba(74,108,247,0.15)' : 'var(--surface)', color: view === t.v ? '#7b9fff' : 'var(--text3)',
            border: view === t.v ? '1px solid rgba(74,108,247,0.4)' : '1px solid var(--border)',
          }}>{t.icon} {t.label}</button>
        ))}
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
                  <button onClick={() => { setPedidoSel(ped); setPNroRemito(''); setPFotoRemito(null); const pending = ped.items_pendientes?.length > 0 ? ped.items_pendientes : (ped.items || []); setPItems(pending.map(it => ({ ...it }))); setModalPedido(true) }}
                    style={{ background: 'rgba(74,108,247,0.12)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                    📋 Registrar egreso
                  </button>
                </div>
              ))}
            </div>
          )}
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
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Código', 'Producto', 'Modelo', 'Stock Inicial', 'Stock Actual', 'Acciones'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Acciones' ? 'center' : 'left', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cat.productos.map((p, i) => {
                      const s = stock[p.codigo]
                      const actual = s?.stock_actual ?? '—'
                      const inicial = s?.stock_inicial ?? '—'
                      const bajo = typeof actual === 'number' && actual <= 5 && actual > 0
                      const agotado = typeof actual === 'number' && actual === 0 && s
                      return (
                        <tr key={p.codigo} style={{ borderBottom: i < cat.productos.length - 1 ? '1px solid var(--border)' : 'none', background: agotado ? 'rgba(255,85,119,0.04)' : bajo ? 'rgba(255,165,0,0.04)' : 'transparent' }}>
                          <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: cc.color, fontFamily: 'monospace' }}>{p.codigo}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>{p.nombre}</td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text3)' }}>{p.modelo}</td>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text2)' }}>{inicial}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              fontWeight: 700, fontSize: 15,
                              color: agotado ? '#ff5577' : bajo ? '#fb923c' : typeof actual === 'number' ? '#3dd68c' : 'var(--text3)'
                            }}>
                              {actual}
                              {agotado && <span style={{ fontSize: 10, marginLeft: 6, background: 'rgba(255,85,119,0.15)', color: '#ff5577', padding: '1px 6px', borderRadius: 10 }}>AGOTADO</span>}
                              {bajo && <span style={{ fontSize: 10, marginLeft: 6, background: 'rgba(251,146,60,0.15)', color: '#fb923c', padding: '1px 6px', borderRadius: 10 }}>BAJO</span>}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                              {isAdmin && (
                                <button onClick={() => { setSProducto({ ...p, categoria: cat.categoria }); setSCantidad(s?.stock_inicial ? String(s.stock_inicial) : ''); setModalStock(true) }}
                                  title="Editar stock inicial"
                                  style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(74,108,247,0.1)', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#7b9fff', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                  📋 Stock Inicial
                                </button>
                              )}
                              <button onClick={() => { setIProducto({ ...p, categoria: cat.categoria }); setICantidad(''); setIObs(''); setModalIngreso(true) }}
                                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#3dd68c', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                <ArrowDownCircle size={12} /> Ingreso
                              </button>
                              <button onClick={() => { setEProducto({ ...p, categoria: cat.categoria }); setECantidad(''); setEObs(''); setECanal('Distribuidor'); setModalEgreso(true) }}
                                title="Registrar egreso"
                                style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                <ArrowUpCircle size={12} /> Egreso
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
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
                    <td style={{ padding: '11px 14px', fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{formatFecha(m.created_at)}</td>
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

              {/* Foto remito */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Foto del remito (opcional)</label>
                {pFotoRemito ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: '#3dd68c' }}>✅ {pFotoRemito.name}</span>
                    <button onClick={() => setPFotoRemito(null)} style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', fontSize: 18 }}>×</button>
                  </div>
                ) : (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '9px 16px', cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
                    <Upload size={14} /> Adjuntar foto / PDF
                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) setPFotoRemito(e.target.files[0]); e.target.value = '' }} />
                  </label>
                )}
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
    </div>
  )
}
