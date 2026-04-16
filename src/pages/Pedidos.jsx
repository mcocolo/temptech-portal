import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const IMG = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagenes%20productos/'

// ── Catálogo de productos ──────────────────────────────────────────
const CATALOGO = [
  {
    categoria: 'calefones_calderas',
    label: 'Calefones / Calderas',
    emoji: '🚿',
    productos: [
      { codigo: 'KF70SIL',    nombre: 'Calefón Eléctrico One',         modelo: '3,5/5,5/7Kw 220V Silver',        precio: 165585.15,  imagen: `${IMG}KF70SIL.png` },
      { codigo: 'FE150TBLACK',nombre: 'Calefón Eléctrico Nova',        modelo: '6/8/9/13,5Kw 220V Black',        precio: 213182.07,  imagen: `${IMG}FE150TBLACK.png` },
      { codigo: 'FE150TSIL',  nombre: 'Calefón Eléctrico Nova',        modelo: '6/8/9/13,5Kw 220V Silver',       precio: 213182.07,  imagen: `${IMG}FE150TSIL.png` },
      { codigo: 'FE150TBL',   nombre: 'Calefón Eléctrico Nova',        modelo: '6/8/9/13,5Kw 220V Blanco',       precio: 213182.07,  imagen: `${IMG}FE150TBL.png` },
      { codigo: 'FM318BL',    nombre: 'Calefón Eléctrico Pulse',       modelo: '9/13,5/18Kw 380V Blanco',        precio: 450250.68,  imagen: `${IMG}FM318BL.png` },
      { codigo: 'FM324BL',    nombre: 'Calefón Eléctrico Pulse',       modelo: '12/18/24Kw 380V Blanco',         precio: 493936.98,  imagen: `${IMG}FM324BL.png` },
      { codigo: 'BF14EBL',    nombre: 'Caldera Dual Core',             modelo: '220-380V 14,4Kw Blanco',         precio: 1701651.65, imagen: `${IMG}BF14EBL.png` },
      { codigo: 'BF323EBL',   nombre: 'Caldera Dual Core',             modelo: '380V 23Kw Blanco',               precio: 2029298.86, imagen: `${IMG}BF323EBL.png` },
    ],
  },
  {
    categoria: 'paneles_calefactores',
    label: 'Paneles Calefactores',
    emoji: '🔆',
    productos: [
      { codigo: 'C250STV1',     nombre: 'Panel Calefactor Slim',         modelo: '250w',                           precio: 39293.46,  imagen: `${IMG}C250STV1.png` },
      { codigo: 'C250STV1TS',   nombre: 'Panel Calefactor Slim',         modelo: '250w Toallero Simple',           precio: 44907.61,  imagen: `${IMG}C250STV1TS.png` },
      { codigo: 'C250STV1TD',   nombre: 'Panel Calefactor Slim',         modelo: '250w Toallero Doble',            precio: 53328.84,  imagen: `${IMG}C250STV1TD.png` },
      { codigo: 'C500STV1',     nombre: 'Panel Calefactor Slim',         modelo: '500w',                           precio: 56135.91,  imagen: `${IMG}C500STV1.png` },
      { codigo: 'C500STV1TS',   nombre: 'Panel Calefactor Slim',         modelo: '500w Toallero Simple',           precio: 67364.22,  imagen: `${IMG}C500STV1TS.png` },
      { codigo: 'C500STV1TD',   nombre: 'Panel Calefactor Slim',         modelo: '500w Toallero Doble',            precio: 72978.37,  imagen: `${IMG}C500STV1TD.png` },
      { codigo: 'F1400BCO',     nombre: 'Panel Calefactor Firenze',      modelo: '1400w Blanco',                   precio: 78592.53,  imagen: `${IMG}Firenze%20BL%201.png` },
      { codigo: 'F1400MV',      nombre: 'Panel Calefactor Firenze',      modelo: '1400w Madera Veteada',           precio: 78592.53,  imagen: `${IMG}F1400MV.png` },
      { codigo: 'F1400PA',      nombre: 'Panel Calefactor Firenze',      modelo: '1400w Piedra Azteca',            precio: 78592.53,  imagen: `${IMG}F1400PA.png` },
      { codigo: 'F1400PR',      nombre: 'Panel Calefactor Firenze',      modelo: '1400w Piedra Romana',            precio: 78592.53,  imagen: `${IMG}F1400PR.png` },
      { codigo: 'F1400MTG',     nombre: 'Panel Calefactor Firenze',      modelo: '1400w Mármol Traviatta Gris',    precio: 78592.53,  imagen: `${IMG}F1400MTG.png` },
      { codigo: 'F1400PCL',     nombre: 'Panel Calefactor Firenze',      modelo: '1400w Piedra Cantera Luna',      precio: 78592.53,  imagen: `${IMG}F1400PCL.png` },
      { codigo: 'F1400MCO',     nombre: 'Panel Calefactor Firenze',      modelo: '1400w Mármol Calacatta Ocre',    precio: 78592.53,  imagen: `${IMG}F1400MCO.png` },
      { codigo: 'F1400SMARTBL', nombre: 'Panel Calefactor Firenze Smart',modelo: '1400w Smart Wifi - App Temptech',precio: 157190.67, imagen: `${IMG}F1400SMARTBL.png` },
    ],
  },
]

function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

const STATUS_CONFIG = {
  pendiente:  { label: 'Pendiente',  color: '#ffd166', bg: 'rgba(255,209,102,0.12)' },
  aprobado:   { label: 'Aprobado',   color: '#3dd68c', bg: 'rgba(61,214,140,0.12)' },
  modificado: { label: 'Modificado', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  rechazado:  { label: 'Rechazado',  color: '#ff5577', bg: 'rgba(255,85,119,0.12)' },
}

export default function Pedidos() {
  const { user, profile, isDistributor } = useAuth()
  const [tab, setTab] = useState('nuevo')        // 'nuevo' | 'preventa' | 'historial'
  const [cantidades, setCantidades] = useState({})
  const [imagenAmpliada, setImagenAmpliada] = useState(null)
  const [notas, setNotas] = useState('')
  const [direccionEntrega, setDireccionEntrega] = useState('')
  const [incluirIVA, setIncluirIVA] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [historial, setHistorial] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)
  const [subiendoPago, setSubiendoPago] = useState(null)

  // Preventa
  const [preventas, setPreventas] = useState([])
  const [loadingPrev, setLoadingPrev] = useState(false)
  const [prevActiva, setPrevActiva] = useState(null)   // preventa seleccionada
  const [cantsPrev, setCantsPrev] = useState({})       // { codigo: cantidad a retirar }
  const [notasPrev, setNotasPrev] = useState('')
  const [incluirIVAPrev, setIncluirIVAPrev] = useState(false)
  const [enviandoPrev, setEnviandoPrev] = useState(false)

  const descuentos = profile?.descuentos || {}

  function precioConDescuento(precio, categoria) {
    const desc = descuentos[categoria]
    if (!desc || desc === 0) return precio
    if (Array.isArray(desc)) {
      return desc.reduce((p, d) => p * (1 - (parseFloat(d) || 0) / 100), precio)
    }
    return precio * (1 - parseFloat(desc) / 100)
  }

  function pctEfectivo(categoria) {
    const desc = descuentos[categoria]
    if (!desc || desc === 0) return 0
    const base = 100
    const final = precioConDescuento(base, categoria)
    return ((base - final) / base * 100).toFixed(1)
  }

  function setCantidad(codigo, val) {
    const n = Math.max(0, parseInt(val) || 0)
    setCantidades(prev => ({ ...prev, [codigo]: n }))
  }

  function setCantPrev(codigo, val, max) {
    const n = Math.min(max, Math.max(0, parseInt(val) || 0))
    setCantsPrev(prev => ({ ...prev, [codigo]: n }))
  }

  // Items en el carrito
  const itemsCarrito = CATALOGO.flatMap(cat =>
    cat.productos
      .filter(p => (cantidades[p.codigo] || 0) > 0)
      .map(p => ({
        ...p,
        categoria: cat.categoria,
        cantidad: cantidades[p.codigo],
        precioFinal: precioConDescuento(p.precio, cat.categoria),
        subtotal: precioConDescuento(p.precio, cat.categoria) * cantidades[p.codigo],
      }))
  )

  const total = itemsCarrito.reduce((s, i) => s + i.subtotal, 0)
  const IVA_PCT = 0.21
  const ivaAmount = incluirIVA ? total * IVA_PCT : 0
  const totalConIVA = total + ivaAmount

  async function enviarPedido() {
    if (itemsCarrito.length === 0) { toast.error('Agregá al menos un producto'); return }
    setEnviando(true)
    const { error } = await supabase.from('pedidos').insert({
      distribuidor_id: user.id,
      estado: 'pendiente',
      tipo: 'normal',
      items: itemsCarrito.map(i => ({
        codigo: i.codigo, nombre: i.nombre, modelo: i.modelo,
        categoria: i.categoria, cantidad: i.cantidad,
        precio_base: i.precio,
        descuento_pct: descuentos[i.categoria] || 0,
        precio_unitario: i.precioFinal, subtotal: i.subtotal,
      })),
      total: totalConIVA,
      iva_monto: ivaAmount,
      incluir_iva: incluirIVA,
      notas: notas.trim() || null,
      direccion_entrega: direccionEntrega || null,
    })
    if (error) { toast.error('Error al enviar el pedido'); setEnviando(false); return }
    toast.success('¡Pedido enviado! Quedó pendiente de aprobación.')
    setCantidades({})
    setNotas('')
    setDireccionEntrega('')
    setEnviando(false)
    cargarHistorial()
    setTab('historial')
  }

  async function enviarRetiro() {
    if (!prevActiva) return
    const itemsRetiro = prevActiva.items
      .filter(i => (cantsPrev[i.codigo] || 0) > 0)
      .map(i => ({
        codigo: i.codigo, nombre: i.nombre, modelo: i.modelo,
        categoria: i.categoria,
        precio_unitario: i.precio_unitario,
        precio_base: i.precio_unitario,
        descuento_pct: 0,
        cantidad: cantsPrev[i.codigo],
        subtotal: i.precio_unitario * cantsPrev[i.codigo],
      }))
    if (itemsRetiro.length === 0) { toast.error('Indicá al menos una cantidad a retirar'); return }
    const totalNetoRetiro = itemsRetiro.reduce((s, i) => s + i.subtotal, 0)
    const ivaMontoRetiro = incluirIVAPrev ? totalNetoRetiro * IVA_PCT : 0
    const totalRetiro = totalNetoRetiro + ivaMontoRetiro

    setEnviandoPrev(true)
    const { error } = await supabase.from('pedidos').insert({
      distribuidor_id: user.id,
      estado: 'pendiente',
      tipo: 'preventa',
      preventa_id: prevActiva.id,
      items: itemsRetiro,
      total: totalRetiro,
      iva_monto: ivaMontoRetiro,
      incluir_iva: incluirIVAPrev,
      notas: notasPrev.trim() || null,
    })
    if (error) { toast.error('Error al enviar el retiro'); setEnviandoPrev(false); return }
    toast.success('¡Solicitud de retiro enviada! Quedó pendiente de aprobación.')
    setCantsPrev({})
    setNotasPrev('')
    setPrevActiva(null)
    setEnviandoPrev(false)
    cargarHistorial()
    setTab('historial')
  }

  async function cargarHistorial() {
    setLoadingHistorial(true)
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('distribuidor_id', user.id)
      .order('created_at', { ascending: false })
    setHistorial(data || [])
    setLoadingHistorial(false)
  }

  async function cargarPreventas() {
    setLoadingPrev(true)
    const { data } = await supabase
      .from('preventas')
      .select('*')
      .eq('distribuidor_id', user.id)
      .eq('estado', 'activa')
      .order('created_at', { ascending: false })
    setPreventas(data || [])
    setLoadingPrev(false)
  }

  async function subirPago(pedido, file) {
    if (!file) return
    setSubiendoPago(pedido.id)
    const ext = file.name.split('.').pop()
    const path = `pedidos/${pedido.id}/pago_${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('facturas').upload(path, file, { upsert: true })
    if (uploadError) { toast.error('Error al subir: ' + uploadError.message); setSubiendoPago(null); return }
    const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)
    const archivosActuales = Array.isArray(pedido.pago_archivos) ? pedido.pago_archivos : (pedido.pago_url ? [pedido.pago_url] : [])
    const nuevosArchivos = [...archivosActuales, publicUrl]
    const { error } = await supabase.from('pedidos').update({ pago_archivos: nuevosArchivos, pago_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', pedido.id)
    setSubiendoPago(null)
    if (error) { toast.error('Error al guardar'); return }
    toast.success('Comprobante subido ✅')
    cargarHistorial()
  }

  async function eliminarPago(pedido, url) {
    const archivosActuales = Array.isArray(pedido.pago_archivos) ? pedido.pago_archivos : (pedido.pago_url ? [pedido.pago_url] : [])
    const nuevosArchivos = archivosActuales.filter(u => u !== url)
    const { error } = await supabase.from('pedidos').update({ pago_archivos: nuevosArchivos, pago_url: nuevosArchivos[nuevosArchivos.length - 1] || null, updated_at: new Date().toISOString() }).eq('id', pedido.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Comprobante eliminado')
    cargarHistorial()
  }

  useEffect(() => { if (tab === 'historial') cargarHistorial() }, [tab])
  useEffect(() => { if (tab === 'preventa') cargarPreventas() }, [tab])

  if (!isDistributor) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>

      {/* Lightbox */}
      {imagenAmpliada && (
        <div
          onClick={() => setImagenAmpliada(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', cursor: 'zoom-out' }}
        >
          <img
            src={imagenAmpliada}
            alt="Producto"
            style={{ maxWidth: '80vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 0 60px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setImagenAmpliada(null)}
            style={{ position: 'fixed', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >×</button>
        </div>
      )}
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Mis Pedidos</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Seleccioná los productos y enviá tu pedido</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {[['nuevo', '🛒 Nuevo pedido'], ['preventa', '📦 Preventa'], ['historial', '📋 Historial']].map(([key, lbl]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '8px 20px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
            background: tab === key ? 'var(--brand-gradient)' : 'var(--surface)',
            color: tab === key ? '#fff' : 'var(--text2)',
            border: tab === key ? 'none' : '1px solid var(--border)',
          }}>{lbl}</button>
        ))}
      </div>

      {tab === 'nuevo' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
          {/* Catálogo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {CATALOGO.map(cat => {
              const desc = descuentos[cat.categoria] || 0
              return (
                <div key={cat.categoria} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  {/* Header categoría */}
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{cat.label}</span>
                    </div>
                    {desc > 0 || (Array.isArray(desc) && desc.some(d => parseFloat(d) > 0)) ? (
                      <span style={{ background: 'rgba(61,214,140,0.12)', color: 'var(--green)', border: '1px solid rgba(61,214,140,0.3)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                        {pctEfectivo(cat.categoria)}% de descuento aplicado
                      </span>
                    ) : null}
                  </div>

                  {/* Productos */}
                  <div>
                    {cat.productos.map((p, i) => {
                      const precioFinal = precioConDescuento(p.precio, cat.categoria)
                      const cant = cantidades[p.codigo] || 0
                      return (
                        <div key={p.codigo} style={{
                          display: 'grid', gridTemplateColumns: '56px 1fr auto auto',
                          alignItems: 'center', gap: 16,
                          padding: '12px 20px',
                          borderBottom: i < cat.productos.length - 1 ? '1px solid var(--border)' : 'none',
                          background: cant > 0 ? 'rgba(74,108,247,0.04)' : 'transparent',
                          transition: 'background .15s',
                        }}>
                          {/* Imagen */}
                          <div
                            onClick={() => p.imagen && setImagenAmpliada(p.imagen)}
                            style={{ width: 56, height: 56, borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: p.imagen ? 'zoom-in' : 'default', transition: 'border-color .15s' }}
                            onMouseEnter={e => p.imagen && (e.currentTarget.style.borderColor = '#7b9fff')}
                            onMouseLeave={e => p.imagen && (e.currentTarget.style.borderColor = 'var(--border)')}
                          >
                            {p.imagen ? (
                              <img src={p.imagen} alt={p.nombre} style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { e.currentTarget.style.display = 'none' }} />
                            ) : (
                              <span style={{ fontSize: 22, opacity: 0.3 }}>📦</span>
                            )}
                          </div>

                          {/* Info */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '2px 7px', borderRadius: 4 }}>{p.codigo}</span>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{p.modelo}</div>
                          </div>

                          {/* Precio */}
                          <div style={{ textAlign: 'right', minWidth: 130 }}>
                            {pctEfectivo(cat.categoria) > 0 && (
                              <div style={{ fontSize: 11, color: 'var(--text3)', textDecoration: 'line-through' }}>{formatPrecio(p.precio)}</div>
                            )}
                            <div style={{ fontSize: 14, fontWeight: 700, color: pctEfectivo(cat.categoria) > 0 ? 'var(--green)' : 'var(--text)' }}>{formatPrecio(precioFinal)}</div>
                          </div>

                          {/* Cantidad */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button onClick={() => setCantidad(p.codigo, cant - 1)} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                            <input
                              type="number" min="0" value={cant || ''}
                              onChange={e => setCantidad(p.codigo, e.target.value)}
                              placeholder="0"
                              style={{ width: 48, textAlign: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
                            />
                            <button onClick={() => setCantidad(p.codigo, cant + 1)} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Resumen / Carrito */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
                🛒 Resumen del pedido
              </div>

              <div style={{ padding: '16px 20px' }}>
                {itemsCarrito.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>
                    Seleccioná productos del catálogo
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {itemsCarrito.map(item => (
                      <div key={item.codigo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.modelo}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>x{item.cantidad} × {formatPrecio(item.precioFinal)}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatPrecio(item.subtotal)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {itemsCarrito.length > 0 && (
                  <>
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 8 }}>
                      {incluirIVA && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, color: 'var(--text3)' }}>Subtotal (neto)</span>
                            <span style={{ fontSize: 13, color: 'var(--text3)' }}>{formatPrecio(total)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                            <span style={{ fontSize: 13, color: 'var(--text3)' }}>IVA (21%)</span>
                            <span style={{ fontSize: 13, color: 'var(--text3)' }}>{formatPrecio(ivaAmount)}</span>
                          </div>
                        </>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: incluirIVA ? 6 : 0, paddingTop: incluirIVA ? 6 : 0, borderTop: incluirIVA ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>Total{incluirIVA ? ' c/IVA' : ''}</span>
                        <span style={{ fontWeight: 800, fontSize: 16, color: '#7b9fff' }}>{formatPrecio(totalConIVA)}</span>
                      </div>
                    </div>
                    {/* Toggle IVA */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, cursor: 'pointer', userSelect: 'none' }}>
                      <input
                        type="checkbox"
                        checked={incluirIVA}
                        onChange={e => setIncluirIVA(e.target.checked)}
                        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#7b9fff' }}
                      />
                      <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Incluir IVA (21%)</span>
                    </label>
                  </>
                )}

                {/* Dirección de entrega */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Dirección de entrega</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {/* Dirección principal */}
                    {profile?.clientes?.direccion_entrega && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: direccionEntrega === '__principal__' ? 'rgba(74,108,247,0.08)' : 'var(--surface2)', border: `1px solid ${direccionEntrega === '__principal__' ? 'rgba(74,108,247,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: 13 }}>
                        <input type="radio" name="dir" value="__principal__" checked={direccionEntrega === '__principal__'} onChange={() => setDireccionEntrega('__principal__')} style={{ accentColor: '#7b9fff' }} />
                        <span>{profile.clientes.direccion_entrega}</span>
                        <span style={{ fontSize: 11, color: '#7b9fff', marginLeft: 'auto' }}>Principal</span>
                      </label>
                    )}
                    {/* Direcciones alternativas */}
                    {(profile?.direcciones_entrega || []).filter(d => d?.direccion).map((d, i) => (
                      <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: direccionEntrega === d.direccion ? 'rgba(74,108,247,0.08)' : 'var(--surface2)', border: `1px solid ${direccionEntrega === d.direccion ? 'rgba(74,108,247,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: 13 }}>
                        <input type="radio" name="dir" value={d.direccion} checked={direccionEntrega === d.direccion} onChange={() => setDireccionEntrega(d.direccion)} style={{ accentColor: '#7b9fff' }} />
                        <span>{d.direccion}{d.localidad ? ` — ${d.localidad}` : ''}</span>
                        {d.nombre && <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>{d.nombre}</span>}
                      </label>
                    ))}
                    {/* Retiro en fábrica */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: direccionEntrega === '__fabrica__' ? 'rgba(61,214,140,0.08)' : 'var(--surface2)', border: `1px solid ${direccionEntrega === '__fabrica__' ? 'rgba(61,214,140,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: 13 }}>
                      <input type="radio" name="dir" value="__fabrica__" checked={direccionEntrega === '__fabrica__'} onChange={() => setDireccionEntrega('__fabrica__')} style={{ accentColor: '#3dd68c' }} />
                      <span>🏭 Retiro en fábrica</span>
                      <span style={{ fontSize: 11, color: '#3dd68c', marginLeft: 'auto' }}>Obon 1327, Valentín Alsina</span>
                    </label>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Notas (opcional)</label>
                  <textarea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    placeholder="Indicaciones especiales, etc."
                    rows={3}
                    style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                  />
                </div>

                <button
                  onClick={enviarPedido}
                  disabled={enviando || itemsCarrito.length === 0}
                  style={{ width: '100%', background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: itemsCarrito.length === 0 ? 'not-allowed' : 'pointer', opacity: itemsCarrito.length === 0 ? 0.5 : 1, fontFamily: 'var(--font)' }}
                >
                  {enviando ? 'Enviando...' : '📤 Enviar pedido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'preventa' && (
        <div>
          {loadingPrev ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
          ) : preventas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No tenés preventas activas</div>
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>Contactá a TEMPTECH para acordar una preventa</div>
            </div>
          ) : !prevActiva ? (
            // Seleccionar preventa
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 4 }}>Seleccioná una preventa para solicitar un retiro:</div>
              {preventas.map(pv => {
                const items = pv.items || []
                const totalPv = items.reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0)
                const retirado = items.reduce((s, i) => s + i.precio_unitario * (i.cantidad_retirada || 0), 0)
                const pendiente = totalPv - retirado
                return (
                  <div key={pv.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '3px 8px', borderRadius: 4, marginRight: 10 }}>
                          #{pv.id.slice(0, 8).toUpperCase()}
                        </span>
                        {pv.fecha_vencimiento && (
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                            Vence: {new Date(pv.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-AR')}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => { setPrevActiva(pv); setCantsPrev({}) }}
                        style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '7px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
                      >
                        Solicitar retiro →
                      </button>
                    </div>
                    <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {items.map((item, i) => {
                        const ret = item.cantidad_retirada || 0
                        const pct = item.cantidad_total > 0 ? (ret / item.cantidad_total) * 100 : 0
                        return (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                              <span><span style={{ fontWeight: 600 }}>{item.nombre}</span> <span style={{ color: 'var(--text3)', fontSize: 11 }}>{item.modelo}</span></span>
                              <span style={{ color: 'var(--text3)', fontSize: 12 }}>{ret} / {item.cantidad_total} retirados</span>
                            </div>
                            <div style={{ height: 5, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#3dd68c' : 'var(--brand-gradient)', borderRadius: 3 }} />
                            </div>
                          </div>
                        )
                      })}
                      <div style={{ paddingTop: 8, borderTop: '1px solid var(--border)', marginTop: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: 'var(--text3)' }}>Retirado</span>
                          <span style={{ fontWeight: 700, color: '#3dd68c' }}>
                            {formatPrecio(retirado)}
                            {totalPv > 0 && <span style={{ fontSize: 11, marginLeft: 5 }}>({((retirado / totalPv) * 100).toFixed(0)}%)</span>}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: 'var(--text3)' }}>Saldo disponible</span>
                          <span style={{ fontWeight: 800, color: '#ffd166' }}>{formatPrecio(pendiente)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            // Formulario de retiro
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <button
                    onClick={() => setPrevActiva(null)}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >← Volver</button>
                  <span style={{ fontSize: 13, color: 'var(--text3)' }}>Preventa <span style={{ color: '#7b9fff', fontFamily: 'monospace' }}>#{prevActiva.id.slice(0, 8).toUpperCase()}</span></span>
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
                    Indicá cuánto querés retirar
                  </div>
                  {prevActiva.items.map((item, i) => {
                    const pendiente = item.cantidad_total - (item.cantidad_retirada || 0)
                    const cantRet = cantsPrev[item.codigo] || 0
                    return (
                      <div key={i} style={{ padding: '14px 20px', borderBottom: i < prevActiva.items.length - 1 ? '1px solid var(--border)' : 'none', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 16, opacity: pendiente === 0 ? 0.5 : 1 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4 }}>{item.codigo}</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{item.nombre}</span>
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.modelo}</div>
                          <div style={{ fontSize: 11, color: pendiente > 0 ? '#ffd166' : '#3dd68c', marginTop: 3 }}>
                            {pendiente > 0 ? `${pendiente} disponibles para retirar` : 'Retiro completo ✓'}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button onClick={() => setCantPrev(item.codigo, cantRet - 1, pendiente)} disabled={pendiente === 0} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                          <input
                            type="number" min="0" max={pendiente}
                            value={cantRet || ''}
                            onChange={e => setCantPrev(item.codigo, e.target.value, pendiente)}
                            placeholder="0"
                            disabled={pendiente === 0}
                            style={{ width: 52, textAlign: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
                          />
                          <button onClick={() => setCantPrev(item.codigo, cantRet + 1, pendiente)} disabled={pendiente === 0} style={{ width: 28, height: 28, borderRadius: 6, background: pendiente > 0 ? 'var(--brand-gradient)' : 'var(--surface2)', border: 'none', color: '#fff', cursor: pendiente > 0 ? 'pointer' : 'default', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Resumen retiro */}
              <div style={{ position: 'sticky', top: 80 }}>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
                    📦 Resumen del retiro
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    {Object.values(cantsPrev).every(v => !v) ? (
                      <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '16px 0' }}>
                        Indicá las cantidades a retirar
                      </div>
                    ) : (() => {
                      const itemsRetiroVista = prevActiva.items.filter(i => (cantsPrev[i.codigo] || 0) > 0)
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                          {itemsRetiroVista.map(item => (
                            <div key={item.codigo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                              <div>
                                <div style={{ fontWeight: 600 }}>{item.nombre}</div>
                                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.modelo}</div>
                              </div>
                              <div style={{ fontWeight: 700, color: '#7b9fff' }}>x{cantsPrev[item.codigo]}</div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Notas (opcional)</label>
                      <textarea
                        value={notasPrev}
                        onChange={e => setNotasPrev(e.target.value)}
                        placeholder="Indicaciones de entrega, etc."
                        rows={3}
                        style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', resize: 'vertical', outline: 'none' }}
                      />
                    </div>
                    <button
                      onClick={enviarRetiro}
                      disabled={enviandoPrev || Object.values(cantsPrev).every(v => !v)}
                      style={{ width: '100%', background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: Object.values(cantsPrev).every(v => !v) ? 'not-allowed' : 'pointer', opacity: Object.values(cantsPrev).every(v => !v) ? 0.5 : 1, fontFamily: 'var(--font)' }}
                    >
                      {enviandoPrev ? 'Enviando...' : '📤 Solicitar retiro'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'historial' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loadingHistorial ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
          ) : historial.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No tenés pedidos aún.</div>
          ) : historial.map(p => {
            const cfg = STATUS_CONFIG[p.estado] || STATUS_CONFIG.pendiente
            return (
              <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '3px 8px', borderRadius: 4 }}>#{p.id.slice(0, 8).toUpperCase()}</span>
                    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{cfg.label}</span>
                    {p.tipo === 'preventa' && (
                      <span style={{ background: 'rgba(255,209,102,0.12)', color: '#ffd166', border: '1px solid rgba(255,209,102,0.35)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>📦 Preventa</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: '#7b9fff' }}>{formatPrecio(p.total)}</span>
                      {p.incluir_iva && <div style={{ fontSize: 10, color: 'var(--text3)' }}>c/IVA incl.</div>}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(p.created_at).toLocaleDateString('es-AR')}</span>
                  </div>
                </div>

                {/* Items */}
                <div style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                    {(p.items || []).map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--text2)' }}>{item.nombre} <span style={{ color: 'var(--text3)', fontSize: 11 }}>{item.modelo}</span></span>
                        <span style={{ color: 'var(--text3)' }}>x{item.cantidad} · {formatPrecio(item.subtotal)}</span>
                      </div>
                    ))}
                    {p.incluir_iva && p.iva_monto > 0 && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)' }}>
                          <span>Subtotal neto</span>
                          <span>{formatPrecio(p.total - p.iva_monto)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)' }}>
                          <span>IVA (21%)</span>
                          <span>{formatPrecio(p.iva_monto)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                          <span>Total c/IVA</span>
                          <span style={{ color: '#7b9fff' }}>{formatPrecio(p.total)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {p.fecha_entrega && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(61,214,140,0.06)', border: '1px solid rgba(61,214,140,0.25)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                      <span style={{ fontWeight: 700, color: '#3dd68c' }}>📅 Fecha de entrega: </span>
                      {new Date(p.fecha_entrega + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  )}
                  {p.notas_admin && (
                    <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text2)' }}>
                      <span style={{ fontWeight: 700, color: '#7b9fff' }}>Nota de TEMPTECH: </span>{p.notas_admin}
                    </div>
                  )}
                  {p.notas && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
                      <span style={{ fontWeight: 600 }}>Tu nota: </span>{p.notas}
                    </div>
                  )}

                  {/* Factura */}
                  {p.factura_url && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,209,102,0.15)' }}>
                      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Factura</div>
                      <a href={p.factura_url} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(255,209,102,0.1)', border: '1px solid rgba(255,209,102,0.35)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#ffd166', textDecoration: 'none' }}>
                        📄 Ver factura
                      </a>
                    </div>
                  )}

                  {/* Comprobante de pago */}
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(61,214,140,0.15)' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Comprobante de pago</div>
                    {(() => {
                      const archivos = Array.isArray(p.pago_archivos) && p.pago_archivos.length > 0
                        ? p.pago_archivos
                        : p.pago_url ? [p.pago_url] : []
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {archivos.map((url, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <a href={url} target="_blank" rel="noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#3dd68c', textDecoration: 'none' }}>
                                💸 Comprobante {archivos.length > 1 ? i + 1 : ''}
                              </a>
                              <button onClick={() => eliminarPago(p, url)}
                                style={{ background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, padding: '5px 10px', fontSize: 12, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)' }}>✕</button>
                            </div>
                          ))}
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(61,214,140,0.08)', border: '1px dashed rgba(61,214,140,0.4)', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#3dd68c', cursor: 'pointer', marginTop: archivos.length ? 4 : 0 }}>
                            {subiendoPago === p.id ? '⏳ Subiendo...' : '+ Agregar comprobante'}
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => subirPago(p, e.target.files[0])} />
                          </label>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
