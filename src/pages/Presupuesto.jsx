import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { imprimirPresupuesto, exportarPresupuestoExcel } from '@/utils/exportDoc'

const IMG = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagenes%20productos/'

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
      { codigo: 'C500STV1MB',   nombre: 'Panel Calefactor Slim',         modelo: '500w Madera Blanca',             precio: 59430,     imagen: `${IMG}C500STV1MB.png` },
      { codigo: 'F1400BCO',     nombre: 'Panel Calefactor Firenze',      modelo: '1400w Blanco',                   precio: 78592.53,  imagen: `${IMG}Firenze%20BL%201.png` },
      { codigo: 'F1400MB',      nombre: 'Panel Calefactor Firenze',      modelo: '1400w Madera Blanca',            precio: 78990,     imagen: `${IMG}F1400MB.png` },
      { codigo: 'F1400MV',      nombre: 'Panel Calefactor Firenze',      modelo: '1400w Madera Veteada',           precio: 78592.53,  imagen: `${IMG}F1400MV.png` },
      { codigo: 'F1400PA',      nombre: 'Panel Calefactor Firenze',      modelo: '1400w Piedra Azteca',            precio: 78592.53,  imagen: `${IMG}F1400PA.png` },
      { codigo: 'F1400PR',      nombre: 'Panel Calefactor Firenze',      modelo: '1400w Piedra Romana',            precio: 78592.53,  imagen: `${IMG}F1400PR.png` },
      { codigo: 'F1400MTG',     nombre: 'Panel Calefactor Firenze',      modelo: '1400w Mármol Traviatta Gris',    precio: 78592.53,  imagen: `${IMG}F1400MTG.png` },
      { codigo: 'F1400PCL',     nombre: 'Panel Calefactor Firenze',      modelo: '1400w Piedra Cantera Luna',      precio: 78592.53,  imagen: `${IMG}F1400PCL.png` },
      { codigo: 'F1400MCO',     nombre: 'Panel Calefactor Firenze',      modelo: '1400w Mármol Calacatta Ocre',    precio: 78592.53,  imagen: `${IMG}F1400MCO.png` },
      { codigo: 'F1400SMARTBL', nombre: 'Panel Calefactor Firenze Smart',modelo: '1400w Smart Wifi - App Temptech',precio: 157190.67, imagen: `${IMG}F1400SMARTBL.png` },
      { codigo: 'KITSLIM',      nombre: 'Kit Instalación Slim',          modelo: '250/500w',                       precio: 0,         imagen: '' },
      { codigo: 'KITFIRENZE',   nombre: 'Kit Instalación Firenze',       modelo: '1400w',                          precio: 0,         imagen: '' },
      { codigo: 'PATASFIRENZE', nombre: 'Patas Firenze',                 modelo: 'x2',                             precio: 0,         imagen: '' },
    ],
  },
  {
    categoria: 'anafes',
    label: 'Anafes',
    emoji: '🔥',
    productos: [
      { codigo: 'K40010', nombre: 'Anafe Inducción + Extractor',  modelo: '4 Hornallas Touch', precio: 468818.67, imagen: `${IMG}K40010.png` },
      { codigo: 'K40011', nombre: 'Anafe Inducción + Extractor',  modelo: '4 Hornallas Knob',  precio: 468818.67, imagen: `${IMG}K40011.png` },
      { codigo: 'DT4',    nombre: 'Anafe Infrarrojo + Extractor', modelo: '4 Hornallas Touch', precio: 424768.60, imagen: `${IMG}DT4.png` },
      { codigo: 'DT4W',   nombre: 'Anafe Infrarrojo + Extractor', modelo: '4 Hornallas Knob',  precio: 424768.60, imagen: `${IMG}DT4W.png` },
      { codigo: 'K1002',  nombre: 'Anafe Inducción',              modelo: '2 Hornallas Touch', precio: 137184.52, imagen: `${IMG}K1002.png` },
      { codigo: 'K2002',  nombre: 'Anafe Infrarrojo',             modelo: '2 Hornallas Touch', precio: 125857.36, imagen: `${IMG}K2002.png` },
      { codigo: 'DT4-1',  nombre: 'Anafe Inducción',              modelo: '4 Hornallas Touch', precio: 245421.86, imagen: `${IMG}DT4-1.png` },
    ],
  },
]

function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

export default function Presupuesto() {
  const { profile, isDistributor, isAdmin } = useAuth()
  const [cantidades, setCantidades] = useState({})
  const [imagenAmpliada, setImagenAmpliada] = useState(null)
  const [notas, setNotas] = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [incluirIVA, setIncluirIVA] = useState(false)

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

  const itemsPresupuesto = CATALOGO.flatMap(cat =>
    cat.productos
      .filter(p => (cantidades[p.codigo] || 0) > 0)
      .map(p => ({
        ...p,
        categoria: cat.categoria,
        cantidad: cantidades[p.codigo],
        precio_unitario: precioConDescuento(p.precio, cat.categoria),
        descuento_pct: parseFloat(pctEfectivo(cat.categoria)) || 0,
        subtotal: precioConDescuento(p.precio, cat.categoria) * cantidades[p.codigo],
      }))
  )

  const total = itemsPresupuesto.reduce((s, i) => s + i.subtotal, 0)
  const IVA_PCT = 0.21
  const ivaMonto = incluirIVA ? total * IVA_PCT : 0
  const totalConIVA = total + ivaMonto

  const distribuidor = {
    razon_social: clienteNombre || profile?.razon_social || profile?.full_name,
    email: profile?.email || '',
  }

  function exportPayload() {
    return {
      items: itemsPresupuesto,
      distribuidor,
      notas: notas.trim() || null,
      fecha: null,
      incluirIVA,
      total: totalConIVA,
      ivaMonto,
    }
  }

  function limpiar() {
    setCantidades({})
    setNotas('')
    setClienteNombre('')
    setIncluirIVA(false)
  }

  if (!isDistributor && !isAdmin) return null

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
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Presupuesto</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Armá un presupuesto y exportalo en PDF o Excel</p>
        </div>
      </div>

      <div className="form-sidebar-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        {/* Catálogo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {CATALOGO.map(cat => {
            const desc = descuentos[cat.categoria] || 0
            return (
              <div key={cat.categoria} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{cat.emoji}</span>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{cat.label}</span>
                  </div>
                  {(desc > 0 || (Array.isArray(desc) && desc.some(d => parseFloat(d) > 0))) ? (
                    <span style={{ background: 'rgba(61,214,140,0.12)', color: 'var(--green)', border: '1px solid rgba(61,214,140,0.3)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                      {pctEfectivo(cat.categoria)}% de descuento aplicado
                    </span>
                  ) : null}
                </div>

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

        {/* Panel lateral */}
        <div style={{ position: 'sticky', top: 80, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
              📋 Resumen del presupuesto
            </div>

            <div style={{ padding: '16px 20px' }}>
              {/* Cliente */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Cliente / Destinatario</label>
                <input
                  type="text"
                  value={clienteNombre}
                  onChange={e => setClienteNombre(e.target.value)}
                  placeholder={profile?.razon_social || profile?.full_name || 'Nombre del cliente'}
                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }}
                />
              </div>

              {/* Items seleccionados */}
              {itemsPresupuesto.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>
                  Seleccioná productos del catálogo
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                  {itemsPresupuesto.map(item => (
                    <div key={item.codigo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.modelo}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>x{item.cantidad} × {formatPrecio(item.precio_unitario)}</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>{formatPrecio(item.subtotal)}</div>
                    </div>
                  ))}
                </div>
              )}

              {itemsPresupuesto.length > 0 && (
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
                          <span style={{ fontSize: 13, color: 'var(--text3)' }}>{formatPrecio(ivaMonto)}</span>
                        </div>
                      </>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: incluirIVA ? 6 : 0, paddingTop: incluirIVA ? 6 : 0, borderTop: incluirIVA ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>Total{incluirIVA ? ' c/IVA' : ''}</span>
                      <span style={{ fontWeight: 800, fontSize: 16, color: '#7b9fff' }}>{formatPrecio(totalConIVA)}</span>
                    </div>
                  </div>
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

              {/* Notas */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Condiciones / Notas</label>
                <textarea
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  placeholder="Condiciones de pago, plazo de entrega, etc."
                  rows={3}
                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                />
              </div>

              {/* Botones de exportación */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => imprimirPresupuesto(exportPayload())}
                  disabled={itemsPresupuesto.length === 0}
                  style={{ width: '100%', background: itemsPresupuesto.length === 0 ? 'var(--surface2)' : 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: itemsPresupuesto.length === 0 ? 'not-allowed' : 'pointer', opacity: itemsPresupuesto.length === 0 ? 0.5 : 1, fontFamily: 'var(--font)' }}
                >
                  🖨️ Imprimir / Guardar PDF
                </button>
                <button
                  onClick={() => exportarPresupuestoExcel(exportPayload())}
                  disabled={itemsPresupuesto.length === 0}
                  style={{ width: '100%', background: itemsPresupuesto.length === 0 ? 'var(--surface2)' : 'rgba(61,214,140,0.1)', color: itemsPresupuesto.length === 0 ? 'var(--text3)' : '#3dd68c', border: `1px solid ${itemsPresupuesto.length === 0 ? 'var(--border)' : 'rgba(61,214,140,0.4)'}`, borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: itemsPresupuesto.length === 0 ? 'not-allowed' : 'pointer', opacity: itemsPresupuesto.length === 0 ? 0.5 : 1, fontFamily: 'var(--font)' }}
                >
                  📊 Exportar a Excel
                </button>
                {itemsPresupuesto.length > 0 && (
                  <button
                    onClick={limpiar}
                    style={{ width: '100%', background: 'none', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    🗑️ Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Info validez */}
          <div style={{ background: 'rgba(255,209,102,0.06)', border: '1px solid rgba(255,209,102,0.2)', borderRadius: 'var(--radius)', padding: '12px 14px', fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
            ⚠️ Los presupuestos tienen validez de <strong style={{ color: 'var(--text2)' }}>7 días corridos</strong>. Precios sujetos a disponibilidad de stock.
          </div>
        </div>
      </div>
    </div>
  )
}
