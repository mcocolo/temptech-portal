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
  const [tab, setTab] = useState('nuevo')        // 'nuevo' | 'historial'
  const [cantidades, setCantidades] = useState({})
  const [imagenAmpliada, setImagenAmpliada] = useState(null)
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [historial, setHistorial] = useState([])
  const [loadingHistorial, setLoadingHistorial] = useState(false)

  const descuentos = profile?.descuentos || {}

  function precioConDescuento(precio, categoria) {
    const desc = descuentos[categoria] || 0
    return precio * (1 - desc / 100)
  }

  function setCantidad(codigo, val) {
    const n = Math.max(0, parseInt(val) || 0)
    setCantidades(prev => ({ ...prev, [codigo]: n }))
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

  async function enviarPedido() {
    if (itemsCarrito.length === 0) { toast.error('Agregá al menos un producto'); return }
    setEnviando(true)
    const { error } = await supabase.from('pedidos').insert({
      distribuidor_id: user.id,
      estado: 'pendiente',
      items: itemsCarrito.map(i => ({
        codigo: i.codigo, nombre: i.nombre, modelo: i.modelo,
        categoria: i.categoria, cantidad: i.cantidad,
        precio_unitario: i.precioFinal, subtotal: i.subtotal,
      })),
      total,
      notas: notas.trim() || null,
    })
    if (error) { toast.error('Error al enviar el pedido'); setEnviando(false); return }
    toast.success('¡Pedido enviado! Quedó pendiente de aprobación.')
    setCantidades({})
    setNotas('')
    setEnviando(false)
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

  useEffect(() => { if (tab === 'historial') cargarHistorial() }, [tab])

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
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {[['nuevo', '🛒 Nuevo pedido'], ['historial', '📋 Historial']].map(([key, lbl]) => (
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
                    {desc > 0 && (
                      <span style={{ background: 'rgba(61,214,140,0.12)', color: 'var(--green)', border: '1px solid rgba(61,214,140,0.3)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                        {desc}% de descuento aplicado
                      </span>
                    )}
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
                            {desc > 0 && (
                              <div style={{ fontSize: 11, color: 'var(--text3)', textDecoration: 'line-through' }}>{formatPrecio(p.precio)}</div>
                            )}
                            <div style={{ fontSize: 14, fontWeight: 700, color: desc > 0 ? 'var(--green)' : 'var(--text)' }}>{formatPrecio(precioFinal)}</div>
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
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>Total</span>
                      <span style={{ fontWeight: 800, fontSize: 16, color: '#7b9fff' }}>{formatPrecio(total)}</span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 14, textAlign: 'center' }}>Precios en pesos · IVA no incluido</div>
                  </>
                )}

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Notas (opcional)</label>
                  <textarea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    placeholder="Indicaciones especiales, dirección de entrega, etc."
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
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontWeight: 700, color: '#7b9fff' }}>{formatPrecio(p.total)}</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>{new Date(p.created_at).toLocaleDateString('es-AR')}</span>
                  </div>
                </div>

                {/* Items */}
                <div style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: p.notas_admin ? 12 : 0 }}>
                    {(p.items || []).map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: 'var(--text2)' }}>{item.nombre} <span style={{ color: 'var(--text3)', fontSize: 11 }}>{item.modelo}</span></span>
                        <span style={{ color: 'var(--text3)' }}>x{item.cantidad} · {formatPrecio(item.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                  {p.notas_admin && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--text2)' }}>
                      <span style={{ fontWeight: 700, color: '#7b9fff' }}>Nota de TEMPTECH: </span>{p.notas_admin}
                    </div>
                  )}
                  {p.notas && (
                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text3)' }}>
                      <span style={{ fontWeight: 600 }}>Tu nota: </span>{p.notas}
                    </div>
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
