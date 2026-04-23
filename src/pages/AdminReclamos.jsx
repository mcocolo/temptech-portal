import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx-js-style'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'


const T = {
  bg: '#222222', surface: '#2b2b2b', surface2: '#333333', surface3: '#3d3d3d',
  border: '#444444', border2: '#505050',
  grad: 'linear-gradient(135deg,#e8215a,#8b2fc9,#4a6cf7)',
  text: '#ffffff', text2: '#cccccc', text3: '#888888',
  green: '#3dd68c', greenDim: 'rgba(61,214,140,0.15)',
  red: '#ff5577', redDim: 'rgba(255,85,119,0.15)',
  yellow: '#ffd166', yellowDim: 'rgba(255,209,102,0.15)',
  blue: '#6eb5ff', blueDim: 'rgba(110,181,255,0.15)',
  purple: '#b39dfa', orange: '#fb923c', teal: '#2dd4bf',
  font: "'Inter', -apple-system, sans-serif",
  radius: '10px', radiusLg: '16px',
}

const STATUS_CONFIG = {
  'Ingresado':  { color: T.blue,   bg: T.blueDim,                     label: 'Ingresado' },
  'pendiente':  { color: T.yellow, bg: T.yellowDim,                    label: 'Pendiente' },
  'Resolucion': { color: T.purple, bg: 'rgba(167,139,250,0.12)',       label: 'Resolución' },
  'Devolucion': { color: T.orange, bg: 'rgba(251,146,60,0.12)',        label: 'Devolución' },
  'Service':    { color: T.teal,   bg: 'rgba(45,212,191,0.12)',        label: 'Service' },
  'rechazado':  { color: T.red,    bg: T.redDim,                       label: 'Rechazado' },
  'cerrado':    { color: T.text3,  bg: T.surface2,                     label: 'Cerrado' },
}

function Badge({ estado, aprobado }) {
  const cfg = STATUS_CONFIG[estado] || STATUS_CONFIG['Ingresado']
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{cfg.label}</span>
      {aprobado === 'SI' && <span style={{ background: T.greenDim, color: T.green, border: `1px solid ${T.green}40`, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>✓ Aprobado</span>}
    </div>
  )
}

function Btn({ children, onClick, disabled, variant = 'ghost' }) {
  const variants = {
    ghost:   { bg: T.surface3, color: T.text2,   border: `1px solid ${T.border2}` },
    primary: { bg: T.grad,     color: '#fff',     border: 'none' },
    success: { bg: T.greenDim, color: T.green,    border: `1px solid ${T.green}40` },
    danger:  { bg: T.redDim,   color: T.red,      border: `1px solid ${T.red}40` },
    warn:    { bg: T.yellowDim,color: T.yellow,   border: `1px solid ${T.yellow}40` },
    orange:  { bg: 'rgba(251,146,60,0.12)', color: T.orange, border: `1px solid rgba(251,146,60,0.35)` },
    teal:    { bg: 'rgba(45,212,191,0.12)', color: T.teal,   border: `1px solid rgba(45,212,191,0.35)` },
  }
  const v = variants[variant] || variants.ghost
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: v.bg, color: v.color, border: v.border, borderRadius: T.radius, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1, fontFamily: T.font, transition: 'opacity .15s', whiteSpace: 'nowrap' }}>
      {children}
    </button>
  )
}

function InfoRow({ label, value, highlight }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 5 }}>
      <span className="ar-info-lbl" style={{ color: T.text3, minWidth: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ color: highlight || T.text2, fontWeight: highlight ? 700 : 400 }}>{value}</span>
    </div>
  )
}

function tiempoSinRespuesta(fechaIngreso) {
  if (!fechaIngreso) return null
  const ingreso = new Date(fechaIngreso)
  if (isNaN(ingreso.getTime())) return null
  const ahora = new Date()
  const diffMs = ahora - ingreso
  if (diffMs < 0) return null
  const totalMinutos = Math.floor(diffMs / 60000)
  const dias = Math.floor(totalMinutos / (60 * 24))
  const horas = Math.floor((totalMinutos % (60 * 24)) / 60)
  const minutos = totalMinutos % 60
  if (dias > 0) return `${dias}d ${horas}h ${minutos}m`
  if (horas > 0) return `${horas}h ${minutos}m`
  return `${minutos}m`
}

function formatearFecha(fecha) {
  if (!fecha) return '-'
  // Si es solo fecha sin hora (YYYY-MM-DD), mostrar sin hora para evitar desfase UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(fecha))) {
    const [y, m, d] = String(fecha).split('-')
    return `${d}/${m}/${y}`
  }
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return fecha
  return d.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const CATALOGO_PT = [
  { codigo: 'KF70SIL',      nombre: 'Calefón One 3,5/5,5/7Kw 220V Silver' },
  { codigo: 'FE150TBLACK',  nombre: 'Calefón Nova 6/8/9/13,5Kw 220V Black' },
  { codigo: 'FE150TSIL',    nombre: 'Calefón Nova 6/8/9/13,5Kw 220V Silver' },
  { codigo: 'FE150TBL',     nombre: 'Calefón Nova 6/8/9/13,5Kw 220V Blanco' },
  { codigo: 'FM318BL',      nombre: 'Calefón Pulse 9/13,5/18Kw 380V Blanco' },
  { codigo: 'FM324BL',      nombre: 'Calefón Pulse 12/18/24Kw 380V Blanco' },
  { codigo: 'BF14EBL',      nombre: 'Caldera Core 220-380V 14,4Kw Blanco' },
  { codigo: 'BF323EBL',     nombre: 'Caldera Core 380V 23Kw Blanco' },
  { codigo: 'C250STV1',     nombre: 'Panel Calefactor Slim 250w' },
  { codigo: 'C250STV1TS',   nombre: 'Panel Calefactor Slim 250w Toallero Simple' },
  { codigo: 'C250STV1TD',   nombre: 'Panel Calefactor Slim 250w Toallero Doble' },
  { codigo: 'C500STV1',     nombre: 'Panel Calefactor Slim 500w' },
  { codigo: 'C500STV1TS',   nombre: 'Panel Calefactor Slim 500w Toallero Simple' },
  { codigo: 'C500STV1TD',   nombre: 'Panel Calefactor Slim 500w Toallero Doble' },
  { codigo: 'C500STV1MB',   nombre: 'Panel Calefactor Slim 500w Madera Blanca' },
  { codigo: 'F1400BCO',     nombre: 'Panel Calefactor Firenze 1400w Blanco' },
  { codigo: 'F1400MB',      nombre: 'Panel Calefactor Firenze 1400w Madera Blanca' },
  { codigo: 'F1400MV',      nombre: 'Panel Calefactor Firenze 1400w Madera Veteada' },
  { codigo: 'F1400PA',      nombre: 'Panel Calefactor Firenze 1400w Piedra Azteca' },
  { codigo: 'F1400PR',      nombre: 'Panel Calefactor Firenze 1400w Piedra Romana' },
  { codigo: 'F1400MTG',     nombre: 'Panel Calefactor Firenze 1400w Mármol Traviatta Gris' },
  { codigo: 'F1400PCL',     nombre: 'Panel Calefactor Firenze 1400w Piedra Cantera Luna' },
  { codigo: 'F1400MCO',     nombre: 'Panel Calefactor Firenze 1400w Mármol Calacatta Ocre' },
  { codigo: 'F1400SMARTBL', nombre: 'Panel Calefactor Firenze Smart 1400w Wifi' },
  { codigo: 'K40010',       nombre: 'Anafe Inducción + Extractor 4 Hornallas Touch' },
  { codigo: 'K40011',       nombre: 'Anafe Inducción + Extractor 4 Hornallas Knob' },
  { codigo: 'DT4',          nombre: 'Anafe Infrarrojo + Extractor 4 Hornallas Touch' },
  { codigo: 'DT4W',         nombre: 'Anafe Infrarrojo + Extractor 4 Hornallas Knob' },
  { codigo: 'K1002',        nombre: 'Anafe Inducción 2 Hornallas Touch' },
  { codigo: 'K2002',        nombre: 'Anafe Infrarrojo 2 Hornallas Touch' },
  { codigo: 'DT4-1',        nombre: 'Anafe Inducción 4 Hornallas Touch' },
]

function sanitizeFileName(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function subirArchivoAdmin(file, trackingId) {
  if (!file) return null
  const safeName = sanitizeFileName(file.name)
  const path = `etiquetas/${trackingId}/${Date.now()}_${safeName}`
  const { error } = await supabase.storage.from('devoluciones').upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('devoluciones').getPublicUrl(path)
  return data.publicUrl
}

const DEFAULT_RECHAZO = (trackingId = 'XXXXXXXXX') =>
  `Por medio de la presente le comunicamos que en el día de la fecha se realizó el control de documentación correspondiente al reclamo "${trackingId}" y el mismo no fue aprobado.\n\nMOTIVO: FUERA DE GARANTÍA ---> Podemos ofrecerte el servicio de reparación de fábrica, para lo cual, deberás enviar el producto a Obon 1327, Valentín Alsina, CP 1822, Buenos Aires. Podés enviarlo a través de la logística que creas conveniente u acercarte a fábrica, donde lo revisarán y determinarán si es posible su reparación.\n\nMOTIVO: NO APLICA GARANTÍA ---> El producto sufrió modificaciones físicas que imposibilitan su reparación.`

const PRODUCTOS_SUPERVISION = [
  'Panel Calefactor Slim 250w', 'Panel Calefactor Slim 250w Toallero Simple', 'Panel Calefactor Slim 250w Toallero Doble',
  'Panel Calefactor Slim 500w', 'Panel Calefactor Slim 500w Toallero Simple', 'Panel Calefactor Slim 500w Toallero Doble',
  'Panel Calefactor Firenze 1400w Blanco', 'Panel Calefactor Firenze 1400w Madera Veteada', 'Panel Calefactor Firenze 1400w Piedra Azteca',
  'Panel Calefactor Firenze 1400w Piedra Romana', 'Panel Calefactor Firenze 1400w Mármol Traviatta Gris', 'Panel Calefactor Firenze 1400w Piedra Cantera Luna',
  'Panel Calefactor Firenze 1400w Mármol Calacatta Ocre', 'Panel Calefactor Firenze Smart 1400w Wifi',
  'Calefón Eléctrico One', 'Calefón Eléctrico Nova', 'Calefón Eléctrico Pulse', 'Caldera Dual Core',
]

function esFirenze(producto) {
  return typeof producto === 'string' && producto.toLowerCase().includes('firenze')
}

function SupervisionFabrica({ item, onClose, onGuardar, usuarioNombre, usuarioId }) {
  const productoReclamo = (item.modelo && item.modelo !== item.producto) ? `${item.producto} ${item.modelo}` : item.producto || ''
  const sv = item.supervision_fabrica || {}
  const [coincide, setCoincide] = useState(sv.coincide_producto ?? null)
  const [productoReal, setProductoReal] = useState(sv.producto_real || '')
  const [roto, setRoto] = useState(sv.roto ?? null)
  const [golpeado, setGolpeado] = useState(sv.golpeado ?? null)
  const [funciona, setFunciona] = useState(sv.funciona ?? null)
  const [tieneKit, setTieneKit] = useState(sv.tiene_kit ?? null)
  const [cantTacos, setCantTacos] = useState(sv.kit_tacos != null ? String(sv.kit_tacos) : '')
  const [cantTornillos, setCantTornillos] = useState(sv.kit_tornillos != null ? String(sv.kit_tornillos) : '')
  const [cantEmbellecedores, setCantEmbellecedores] = useState(sv.kit_embellecedores != null ? String(sv.kit_embellecedores) : '')
  const [tienePatas, setTienePatas] = useState(sv.tiene_patas ?? null)
  const [recuperable, setRecuperable] = useState(sv.recuperable ?? null)
  const [nota, setNota] = useState(sv.nota || '')
  const [imagenesExistentes, setImagenesExistentes] = useState(sv.imagenes || [])
  const [imagenes, setImagenes] = useState([])
  const [guardando, setGuardando] = useState(false)

  const productoEval = coincide === false ? productoReal : productoReclamo
  const mostrarPatas = esFirenze(productoEval)

  function SiNo({ label, value, onChange, ayuda }) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: T.surface2, borderRadius: T.radius, border: `1px solid ${T.border}` }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{label}</div>
          {ayuda && <div style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{ayuda}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {[true, false].map(v => (
            <button key={String(v)} onClick={() => onChange(value === v ? null : v)}
              style={{ padding: '5px 16px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: T.font, border: 'none',
                background: value === v ? (v ? T.greenDim : T.redDim) : T.surface3,
                color: value === v ? (v ? T.green : T.red) : T.text3,
                outline: value === v ? `1.5px solid ${v ? T.green : T.red}` : 'none',
              }}>
              {v ? 'SÍ' : 'NO'}
            </button>
          ))}
        </div>
      </div>
    )
  }

  async function guardar() {
    setGuardando(true)
    const urls = []
    for (const img of imagenes) {
      try {
        const safeName = sanitizeFileName(img.name)
        const path = `supervision/${item.id}/${Date.now()}_${safeName}`
        const { error } = await supabase.storage.from('devoluciones').upload(path, img, { upsert: false })
        if (!error) {
          const { data } = supabase.storage.from('devoluciones').getPublicUrl(path)
          urls.push(data.publicUrl)
        }
      } catch {}
    }
    const supervision = {
      fecha: new Date().toISOString(),
      usuario_id: usuarioId || null,
      usuario_nombre: usuarioNombre || null,
      coincide_producto: coincide,
      producto_real: coincide === false ? productoReal : null,
      roto, golpeado, funciona,
      tiene_kit: tieneKit,
      kit_tacos: tieneKit === false ? (parseInt(cantTacos) || null) : null,
      kit_tornillos: tieneKit === false ? (parseInt(cantTornillos) || null) : null,
      kit_embellecedores: tieneKit === false ? (parseInt(cantEmbellecedores) || null) : null,
      tiene_patas: mostrarPatas ? tienePatas : null,
      recuperable,
      nota: nota.trim() || null,
      imagenes: [...imagenesExistentes, ...urls],
    }
    await onGuardar(supervision)
    setGuardando(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(6px)' }}>
      <div style={{ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: T.radiusLg, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: T.surface, zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>🏭 Supervisión Fábrica</div>
            <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>Reclamo #{item.tracking_id || item.id?.slice(0,8).toUpperCase()}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.text3, cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Producto del reclamo */}
          <div style={{ padding: '10px 14px', background: 'rgba(74,108,247,0.08)', border: '1px solid rgba(74,108,247,0.25)', borderRadius: T.radius, fontSize: 13, color: T.blue }}>
            <span style={{ fontWeight: 600 }}>Producto del reclamo: </span>{productoReclamo || '—'}
          </div>

          <SiNo label="¿El producto coincide con el reclamo?" value={coincide} onChange={setCoincide} />

          {coincide === false && (
            <div>
              <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, textTransform: 'uppercase', marginBottom: 5 }}>Seleccioná el producto recibido</div>
              <select value={productoReal} onChange={e => setProductoReal(e.target.value)}
                style={{ width: '100%', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '9px 12px', color: productoReal ? T.text : T.text3, fontSize: 13, fontFamily: T.font, outline: 'none' }}>
                <option value="">Seleccioná un producto...</option>
                {PRODUCTOS_SUPERVISION.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          <SiNo label="¿Está roto?" value={roto} onChange={setRoto} />
          <SiNo label="¿Está golpeado?" value={golpeado} onChange={setGolpeado} />
          <SiNo label="¿Funciona?" value={funciona} onChange={setFunciona} />
          <SiNo label="¿Contiene kit?" value={tieneKit} onChange={setTieneKit} ayuda="No incluye tarugos" />
          {tieneKit === false && (
            <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 11, color: T.text3, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Contenido del kit recibido</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Tacos', val: cantTacos, set: setCantTacos },
                  { label: 'Tornillos', val: cantTornillos, set: setCantTornillos },
                  { label: 'Embellecedores', val: cantEmbellecedores, set: setCantEmbellecedores },
                ].map(({ label, val, set }) => (
                  <div key={label}>
                    <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, marginBottom: 5 }}>{label}</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1, 2].map(n => (
                        <button key={n} onClick={() => set(val === String(n) ? '' : String(n))}
                          style={{ flex: 1, padding: '6px 0', borderRadius: T.radius, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: T.font, border: 'none',
                            background: val === String(n) ? 'rgba(74,108,247,0.2)' : T.surface3,
                            color: val === String(n) ? '#7b9fff' : T.text3,
                            outline: val === String(n) ? '1.5px solid #7b9fff' : 'none',
                          }}>{n}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {mostrarPatas && <SiNo label="¿Contiene patas?" value={tienePatas} onChange={setTienePatas} />}

          <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
            <SiNo label="¿El producto es recuperable?" value={recuperable} onChange={setRecuperable} />
          </div>

          {/* Imágenes */}
          <div>
            <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Adjuntar imágenes (opcional)</div>
            {(imagenesExistentes.length > 0 || imagenes.length > 0) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {imagenesExistentes.map((url, i) => (
                  <div key={'ex_' + i} style={{ position: 'relative' }}>
                    <img src={url} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}` }} />
                    <button onClick={() => setImagenesExistentes(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: -6, right: -6, background: T.red, border: 'none', borderRadius: '50%', width: 18, height: 18, color: '#fff', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>×</button>
                  </div>
                ))}
                {imagenes.map((f, i) => (
                  <div key={'new_' + i} style={{ position: 'relative' }}>
                    <img src={URL.createObjectURL(f)} alt="" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}` }} />
                    <button onClick={() => setImagenes(prev => prev.filter((_, j) => j !== i))}
                      style={{ position: 'absolute', top: -6, right: -6, background: T.red, border: 'none', borderRadius: '50%', width: 18, height: 18, color: '#fff', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.surface3, border: `1px dashed ${T.border2}`, borderRadius: T.radius, padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: T.text2 }}>
                🖼 {imagenes.length > 0 ? `Agregar más (${imagenes.length})` : 'Elegir archivo'}
                <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.length) setImagenes(prev => [...prev, ...Array.from(e.target.files)]); e.target.value = '' }} />
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: T.surface3, border: `1px dashed ${T.border2}`, borderRadius: T.radius, padding: '8px 14px', cursor: 'pointer', fontSize: 13, color: T.text2 }}>
                📷 Tomar foto
                <input type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => { if (e.target.files?.length) setImagenes(prev => [...prev, ...Array.from(e.target.files)]); e.target.value = '' }} />
              </label>
            </div>
          </div>

          {/* Nota */}
          <div>
            <div style={{ fontSize: 11, color: T.text3, fontWeight: 600, textTransform: 'uppercase', marginBottom: 5 }}>Nota (opcional)</div>
            <textarea value={nota} onChange={e => setNota(e.target.value)} rows={3}
              placeholder="Observaciones de la revisión..."
              style={{ width: '100%', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '8px 12px', color: T.text, fontSize: 13, fontFamily: T.font, resize: 'vertical', outline: 'none', lineHeight: 1.6 }} />
          </div>

          {/* Botones */}
          <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
            <Btn variant="success" onClick={guardar} disabled={guardando || coincide === null}>
              {guardando ? 'Guardando...' : '✓ Guardar supervisión'}
            </Btn>
            <Btn onClick={onClose}>Cancelar</Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Panel unificado Resolución / Devolución / Service ──
function PanelEnvio({ item, tipo, onClose, onGuardar }) {
  const isDevolucion = tipo === 'Devolucion'
  const isService    = tipo === 'Service'

  const defaultTexto = isDevolucion
    ? `Ante todo, le pedimos disculpas por los inconvenientes ocasionados. Trabajamos día a día 
    para brindarle el mejor producto y servicio. Estamos a su disposición para resolverlo con la mayor celeridad posible.
    \nTenemos que gestionar el cambio de la unidad. Te indicamos cuales los pasos a seguir:\n\nTe enviaremos una etiqueta de correo argentino que deberás adherir a la caja del producto que falla y despacharlo en la sucursal de correo ubicada 
    en\nPILAR UP 21 | AV LUIS LAGOMARSINO 905. Buenos aires.\n\nLuego de despacharlo, te pediremos que nos envíes el comprobante de dicho despacho para que podamos activar el reenvío de una unidad nueva.\n\nLEER IMPORTANTE: Conservar el kit de instalación (no despacharlo con la unidad defectuosa) para poder utilizar con esta nueva unidad*\n\n
    Aguardamos confirmación para poder enviarte la etiqueta.`
    : isService
    ? `Podemos ofrecerte el servicio de reparación de fábrica, para lo cual, deberás enviar el producto a Obon 1327, Valentín Alsina, CP 1822, Buenos Aires.\nPodés enviarlo a través de la logística que creas conveniente u acercarte a fábrica donde lo revisarán y determinarán si es posible su reparación.\nTe pedimos que nos contactes vía Whatsapp al 11 7237-5839, indicando nombre y apellido en el caso de querer avanzar con nuestro servicio de reparación.`
    : null // generado dinámicamente para Resolución

  const linkSeguimiento = (emp, cod) => {
    if (!cod) return ''
    const links = {
      'Correo Argentino': `https://www.correoargentino.com.ar/formularios/e-commerce?id=${cod}`,
      'Andreani': `https://www.andreani.com/#!/informacionEnvio/${cod}`,
    }
    return links[emp] || cod
  }

  const textoResolucion = (emp, cod) => {
    if (emp === 'Logistica Propia') {
      return `Nos contactamos de TEMPTECH por el reclamo "${item.tracking_id}".\nNos pondremos en contacto para coordinar el retiro de la unidad con nuestra logística propia y la entrega de un reemplazo. Recuerde tener el equipo listo para ser retirado y entregar sólo el Panel, conservando el kit de instalación para ser utilizado con la nueva unidad de reemplazo.\n\nSaludos.\nEquipo Soporte TEMPTECH`
    }
    return `Nos contactamos de TEMPTECH por el reclamo "${item.tracking_id}".\nNuevamente queremos pedirle disculpas por los inconvenientes ocasionados.\nA continuación le dejamos los datos para el seguimiento de su envío.\n\nEmpresa: ${emp || ''}\nCódigo de seguimiento: ${cod || ''}\nLink de seguimiento: ${linkSeguimiento(emp, cod)}`
  }

  const [empresa, setEmpresa]       = useState(item.empresa_envio || 'Correo Argentino')
  const [codigo, setCodigo]         = useState(item.codigo_seguimiento || '')
  const [fechaEnvio, setFechaEnvio] = useState(item.fecha_envio || '')
  const [textoEmail, setTextoEmail] = useState(
    !isDevolucion && !isService ? textoResolucion(item.empresa_envio || 'Correo Argentino', item.codigo_seguimiento || '') : defaultTexto
  )
  // Múltiples archivos adjuntos para Devolución
  const [adjuntos, setAdjuntos]     = useState([])
  const [subiendo, setSubiendo]     = useState(false)

  const addAdjuntos    = (files) => setAdjuntos(prev => [...prev, ...files])
  const removeAdjunto  = (idx)   => setAdjuntos(prev => prev.filter((_, i) => i !== idx))

  const color     = isDevolucion ? T.orange : isService ? T.teal : T.purple
  const colorBg   = isDevolucion ? 'rgba(251,146,60,0.08)' : isService ? 'rgba(45,212,191,0.08)' : 'rgba(167,139,250,0.08)'
  const colorBord = isDevolucion ? 'rgba(251,146,60,0.3)'  : isService ? 'rgba(45,212,191,0.3)'  : 'rgba(167,139,250,0.3)'

  async function handleGuardar() {
    if (!isDevolucion && !isService) {
      if (!empresa) { alert('Seleccioná una empresa'); return }
      if (empresa !== 'Logistica Propia' && !codigo) { alert('Ingresá el código de seguimiento'); return }
      if (empresa === 'Logistica Propia' && !fechaEnvio) { alert('Seleccioná una fecha de envío'); return }
    }

    // Subir todos los adjuntos
    let adjuntosUrls = []
    if (isDevolucion && adjuntos.length > 0) {
      setSubiendo(true)
      try {
        adjuntosUrls = await Promise.all(adjuntos.map(f => subirArchivoAdmin(f, item.tracking_id)))
        adjuntosUrls = adjuntosUrls.filter(Boolean)
      } catch (err) {
        alert(`Error subiendo archivo: ${err.message}`)
        setSubiendo(false)
        return
      }
      setSubiendo(false)
    }

    onGuardar({ empresa, codigo, fechaEnvio, textoEmail, tipo, adjuntosUrls })
  }

  return (
    <div style={{ margin: '0 22px 18px', padding: 18, background: colorBg, border: `1px solid ${colorBord}`, borderRadius: T.radius }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 16 }}>
        {isDevolucion ? '📦 Datos de devolución' : isService ? '🔧 Service' : '🚚 Datos de resolución'}
      </div>

      {/* Empresa + código/fecha — solo Resolución */}
      {!isDevolucion && !isService && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Empresa</label>
            <select value={empresa} onChange={e => { setEmpresa(e.target.value); if (!isDevolucion && !isService) setTextoEmail(textoResolucion(e.target.value, codigo)) }} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '8px 12px', color: T.text, fontSize: 13, fontFamily: T.font, width: '100%' }}>
              <option value="Correo Argentino">Correo Argentino</option>
              <option value="Andreani">Andreani</option>
              <option value="Logistica Propia">Logística Propia</option>
            </select>
          </div>
          {empresa !== 'Logistica Propia' ? (
            <div>
              <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Código de seguimiento</label>
              <input type="text" value={codigo} onChange={e => { setCodigo(e.target.value); if (!isDevolucion && !isService) setTextoEmail(textoResolucion(empresa, e.target.value)) }} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '8px 12px', color: T.text, fontSize: 13, fontFamily: T.font, width: '100%', outline: 'none' }} placeholder="Código de seguimiento" />
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Fecha de envío</label>
              <input type="date" value={fechaEnvio} onChange={e => setFechaEnvio(e.target.value)} style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '8px 12px', color: T.text, fontSize: 13, fontFamily: T.font, width: '100%', outline: 'none', colorScheme: 'dark' }} />
            </div>
          )}
        </div>
      )}

      {/* Adjuntos múltiples — Devolución y Service */}
      {(isDevolucion || isService) && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Adjuntar archivos (etiqueta, instrucciones, etc.)
          </label>

          {/* Previews */}
          {adjuntos.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {adjuntos.map((f, idx) => (
                <div key={idx} style={{ background: T.surface2, border: `1px solid ${T.border2}`, borderRadius: 8, padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ fontSize: 16 }}>{f.type?.startsWith('image/') ? '🖼' : '📄'}</span>
                  <span style={{ color: T.text2, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <button type="button" onClick={() => removeAdjunto(idx)} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', fontSize: 16, padding: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Botón agregar */}
          <label style={{ background: T.surface3, border: 'none', borderRadius: T.radius, padding: '8px 14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: T.text2 }}>
            <span>📎</span>
            <span>{adjuntos.length > 0 ? `Agregar más (${adjuntos.length} adjunto${adjuntos.length !== 1 ? 's' : ''})` : 'Agregar archivo'}</span>
            <input type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.length) addAdjuntos(Array.from(e.target.files)); e.target.value = '' }}
            />
          </label>
          {adjuntos.length > 0 && <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>Los links se adjuntarán al final del email</div>}
        </div>
      )}

      {/* Texto editable */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Texto del email (editable)
        </label>
        <textarea
          value={textoEmail}
          onChange={e => setTextoEmail(e.target.value)}
          rows={isDevolucion ? 6 : 8}
          style={{ width: '100%', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '10px 12px', color: T.text2, fontSize: 12, fontFamily: T.font, resize: 'vertical', outline: 'none', lineHeight: 1.7 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Btn variant={isDevolucion ? 'orange' : isService ? 'teal' : 'primary'} onClick={handleGuardar} disabled={subiendo}>
          {subiendo ? 'Subiendo archivos...' : 'Guardar y enviar email'}
        </Btn>
        <Btn onClick={onClose}>Cancelar</Btn>
      </div>
    </div>
  )
}

// ── Panel Notificar Service ──
function PanelNotificarService({ item, onClose, onGuardar }) {
  const [fechaVisita, setFechaVisita] = useState('')
  const defaultTexto = (fecha) =>
    `Nos contactamos de TEMPTECH por el reclamo "${item.tracking_id}".\nLe informamos que el día "${fecha || '[FECHA]'}" estaremos realizando el retiro de la unidad y la entrega de un reemplazo. Recuerde que el día del cambio tener el equipo listo para ser retirado y entregar sólo el Panel, es decir, conservar el kit de instalación (y sus respectivas patas en el caso de corresponder) para ser utilizadas con la nueva unidad de reemplazo.`
  const [textoEmail, setTextoEmail] = useState(defaultTexto(''))

  // Actualizar texto cuando cambia la fecha
  const handleFecha = (val) => {
    setFechaVisita(val)
    const fechaFormateada = val ? new Date(val + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '[FECHA]'
    setTextoEmail(defaultTexto(fechaFormateada))
  }

  return (
    <div style={{ margin: '0 22px 18px', padding: 18, background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.3)', borderRadius: T.radius }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: T.teal, marginBottom: 16 }}>📅 Notificar fecha de Service</div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Fecha de visita</label>
        <input
          type="date"
          value={fechaVisita}
          onChange={e => handleFecha(e.target.value)}
          style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '8px 12px', color: T.text, fontSize: 13, fontFamily: T.font, outline: 'none', colorScheme: 'dark', width: 200 }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Texto del email (editable)</label>
        <textarea
          value={textoEmail}
          onChange={e => setTextoEmail(e.target.value)}
          rows={7}
          style={{ width: '100%', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '10px 12px', color: T.text2, fontSize: 12, fontFamily: T.font, resize: 'vertical', outline: 'none', lineHeight: 1.7 }}
        />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Btn variant="teal" onClick={() => {
          if (!fechaVisita) { alert('Seleccioná la fecha de visita'); return }
          onGuardar({ fechaVisita, textoEmail })
        }}>Guardar y enviar email</Btn>
        <Btn onClick={onClose}>Cancelar</Btn>
      </div>
    </div>
  )
}

function PanelStock({ item, tipo, onClose, onGuardar }) {
  const isEnviado = tipo === 'enviado'

  // Intentar auto-detectar el producto del catálogo por nombre
  function detectarProducto() {
    const haystack = ((item.producto || '') + ' ' + (item.modelo || '')).toLowerCase()
    return CATALOGO_PT.find(p => haystack.includes(p.codigo.toLowerCase())) || null
  }
  const inicial = detectarProducto()

  const [selCodigo, setSelCodigo] = useState(inicial?.codigo || '')
  const [nombre, setNombre] = useState(inicial?.nombre || item.producto || '')
  const [cantidad, setCantidad] = useState(1)
  const [guardando, setGuardando] = useState(false)

  function handleSelect(e) {
    const val = e.target.value
    setSelCodigo(val)
    const prod = CATALOGO_PT.find(p => p.codigo === val)
    if (prod) setNombre(prod.nombre)
  }

  async function handleGuardar() {
    if (!selCodigo.trim()) { alert('Seleccioná o ingresá el código del producto'); return }
    if (cantidad < 1) { alert('La cantidad debe ser mayor a 0'); return }
    setGuardando(true)
    await onGuardar({ codigo: selCodigo.trim(), nombre, modelo: '', cantidad })
    setGuardando(false)
  }

  const color   = isEnviado ? T.red   : T.green
  const colorBg = isEnviado ? T.redDim : T.greenDim
  const colorBd = isEnviado ? `${T.red}40` : `${T.green}40`
  const inputSt = { background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '8px 12px', color: T.text, fontSize: 13, fontFamily: T.font, width: '100%', outline: 'none', boxSizing: 'border-box' }

  return (
    <div style={{ margin: '0 22px 18px', padding: 18, background: colorBg, border: `1px solid ${colorBd}`, borderRadius: T.radius }}>
      <div style={{ fontSize: 13, fontWeight: 700, color, marginBottom: 6 }}>
        {isEnviado ? '📤 Enviar Panel al cliente' : '📥 Recibir Panel en fábrica'}
      </div>
      <div style={{ fontSize: 12, color: T.text3, marginBottom: 14 }}>
        {isEnviado
          ? 'Se registra como egreso pendiente — el stock se descuenta cuando Admin confirma en Ingreso/Egreso PT.'
          : 'Se registra como devolución pendiente — el stock ingresa cuando Admin confirma en Ingreso/Egreso PT.'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Producto *</label>
          <select value={selCodigo} onChange={handleSelect}
            style={{ ...inputSt, cursor: 'pointer' }}>
            <option value="">— Seleccioná un producto —</option>
            {CATALOGO_PT.map(p => (
              <option key={p.codigo} value={p.codigo}>{p.codigo} — {p.nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Cantidad</label>
          <input type="number" min="1" value={cantidad} onChange={e => setCantidad(parseInt(e.target.value) || 1)}
            style={inputSt} />
        </div>
      </div>

      {selCodigo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 12, color: T.text3 }}>
          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#ffd166', background: 'rgba(255,209,102,0.1)', padding: '2px 8px', borderRadius: 4 }}>{selCodigo}</span>
          <span style={{ color: T.text2 }}>{nombre}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Btn variant={isEnviado ? 'danger' : 'success'} onClick={handleGuardar} disabled={guardando}>
          {guardando ? 'Registrando...' : isEnviado ? '📤 Registrar envío pendiente' : '📥 Registrar recepción pendiente'}
        </Btn>
        <Btn onClick={onClose}>Cancelar</Btn>
      </div>
    </div>
  )
}

export default function AdminReclamos() {
  const [busquedaTracking, setBusquedaTracking] = useState('')
  const [datos, setDatos]             = useState([])
  const [cargando, setCargando]       = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('Ingresado')
  const [errorTexto, setErrorTexto]   = useState('')
  const [rechazoAbiertoId, setRechazoAbiertoId] = useState(null)
  const [textoRechazo, setTextoRechazo]         = useState('')
  const [notaRechazo, setNotaRechazo]           = useState('')
  const [desaprobarAbiertoId, setDesaprobarAbiertoId] = useState(null)
  const [textoDesaprobar, setTextoDesaprobar]         = useState('')
  const [notaDesaprobar, setNotaDesaprobar]           = useState('')
  const [panelAbierto, setPanelAbierto]         = useState(null)
  const [notificarServiceId, setNotificarServiceId] = useState(null)
  const [notasInput, setNotasInput] = useState({})
  const [notasInternas, setNotasInternas] = useState({})
  const [editandoId, setEditandoId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [supervisionAbierto, setSupervisionAbierto] = useState(null)  // item abierto para cargar
  const [supervisionVer, setSupervisionVer] = useState(null)           // item para ver resultado
  const [panelStockAbierto, setPanelStockAbierto] = useState(null)     // { id, tipo } | null
  const [confirmarEliminar, setConfirmarEliminar] = useState(null)     // item | null
  const [eliminando, setEliminando] = useState(false)

  const { isAdmin, isAdmin2, user, profile } = useAuth()

  const datosFiltrados = datos.filter(item => {
    if (!busquedaTracking) return true
    const q = busquedaTracking.toLowerCase()
    return (
      item.tracking_id?.toLowerCase().includes(q) ||
      item.nombre_apellido?.toLowerCase().includes(q) ||
      item.nombre?.toLowerCase().includes(q) ||
      item.email?.toLowerCase().includes(q)
    )
  })

  function armarLineaNota(tipo, texto) {
    const fecha = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    return `${fecha} - ${tipo}: ${texto || ''}`.trim()
  }
  function unirNotas(n, l) { return (!n || !n.trim()) ? l : `${n}\n${l}` }

  async function cargar() {
    setCargando(true); setErrorTexto('')
    let q = supabase.from('devoluciones').select('*').order('fecha_creacion', { ascending: false })
    if (filtroEstado !== 'todos') q = q.eq('estado', filtroEstado)
    const { data, error } = await q
    if (error) { setErrorTexto(error.message); setDatos([]) } else setDatos(data || [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [filtroEstado])
  async function cambiarEstado(item, nuevoEstado) {
    if (item.estado === 'cerrado' && nuevoEstado !== 'cerrado') return
    const payload = { estado: nuevoEstado }
    if (nuevoEstado !== 'rechazado') payload.motivo_rechazo = null
    await supabase.from('devoluciones').update(payload).eq('id', item.id)
    await cargar()
  }

  async function marcarAprobado(item) {
    const texto = window.prompt('Nota para APROBADO:', '')
    if (texto === null) return
    const nuevaNota = armarLineaNota('APROBADO', texto)
    const { error } = await supabase.from('devoluciones').update({ aprobado: 'SI', estado: 'pendiente', fecha_aprobado: new Date().toISOString(), fecha_desaprobado: null, motivo_rechazo: null, notas: unirNotas(item.notas, nuevaNota) }).eq('id', item.id)
    if (error) { alert('No se pudo actualizar el aprobado'); return }
    try {
      const respAprobado = await fetch('https://vite-latest-temptech-rma.vercel.app/api/enviar-aprobado', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: (item.email || '').trim(), nombre: item.nombre_apellido || item.nombre || '', apellido: '', tracking_id: item.tracking_id || '' })
      })
      if (!respAprobado.ok) console.warn('Error mail aprobado: HTTP', respAprobado.status)
    } catch { console.warn('Se aprobó, pero falló el envío del mail') }
    await cargar()
  }

  function handleDesaprobar(item) {
    if (item.estado === 'cerrado' || !item?.id) return
    const nombre = item.nombre_apellido || item.nombre || 'cliente'
    const tracking_id = item.tracking_id || ''
    setTextoDesaprobar(`Estimado/a ${nombre},\n\nLe comunicamos que su proceso ${tracking_id} fue revisado por nuestro equipo y el mismo fue DESAPROBADO.\n\nEsto quiere decir que la información cargada se encuentra incompleta. Le solicitamos por favor volver a ingresar la información completando todos los campos requeridos.\n\nSaludos cordiales,\nEquipo Soporte TEMPTECH`)
    setNotaDesaprobar('')
    setDesaprobarAbiertoId(item.id)
  }

  async function confirmarDesaprobar(item) {
    const nuevaNota = armarLineaNota('DESAPROBADO', notaDesaprobar)
    const { error } = await supabase.from('devoluciones').update({ estado: 'Ingresado', aprobado: 'NO', fecha_aprobado: null, fecha_desaprobado: new Date().toISOString(), motivo_rechazo: null, notas: unirNotas(item.notas, nuevaNota) }).eq('id', item.id)
    if (error) { alert('Error al desaprobar'); return }
    await fetch('https://vite-latest-temptech-rma.vercel.app/api/enviar-desaprobado', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: (item.email || '').trim(), nombre: item.nombre_apellido || item.nombre || '', tracking_id: item.tracking_id || '', texto: textoDesaprobar })
    })
    setDesaprobarAbiertoId(null)
    setTextoDesaprobar('')
    setNotaDesaprobar('')
    await cargar()
  }

  async function rechazarCaso(item) {
    if (item.estado === 'cerrado') return
    if (!textoRechazo?.trim()) { alert('Ingresá el texto del email de rechazo'); return }

    const notaInterna = window.prompt('Nota para RECHAZADO:', '')
    if (notaInterna === null) return

    const motivo = textoRechazo.trim()
    const nuevaNota = armarLineaNota('RECHAZADO', notaInterna || '-')

    const { error } = await supabase.from('devoluciones').update({
      aprobado: 'NO', estado: 'rechazado',
      motivo_rechazo: notaInterna || '-',
      fecha_aprobado: null, fecha_desaprobado: new Date().toISOString(),
      notas: unirNotas(item.notas, nuevaNota),
    }).eq('id', item.id)
    if (error) { alert('No se pudo rechazar el caso'); return }

    try {
      const respRechazo = await fetch('https://vite-latest-temptech-rma.vercel.app/api/enviar-rechazo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: (item.email || '').trim(),
          nombre: item.nombre_apellido || '',
          tracking_id: item.tracking_id || '',
          textoCompleto: motivo,
        })
      })
      if (!respRechazo.ok) console.warn('Error mail rechazo: HTTP', respRechazo.status)
    } catch { alert('Se rechazó, pero falló el envío del mail') }

    setRechazoAbiertoId(null)
    setTextoRechazo('')
    setNotaRechazo('')
    await cargar()
  }

  async function guardarEnvio(item, { empresa, codigo, fechaEnvio, textoEmail, tipo, adjuntosUrls }) {
    const notaTexto = window.prompt(`Nota para ${tipo.toUpperCase()}:`, '')
    if (notaTexto === null) return
    const nuevaNota = armarLineaNota(tipo.toUpperCase(), notaTexto)

    // Armar texto final con datos de envío para Resolución
    let textoFinal = textoEmail
    if (tipo !== 'Devolucion' && empresa !== 'Logistica Propia' && codigo) {
      const linkMap = {
        'Correo Argentino': `https://www.correoargentino.com.ar/formularios/e-commerce?id=${codigo}`,
        'Andreani': `https://www.andreani.com/#!/informacionEnvio/${codigo}`,
      }
      const link = linkMap[empresa] || codigo
      textoFinal += `\nEmpresa: "${empresa}"\nCódigo de seguimiento: "${codigo}"\nLink de seguimiento: ${link}`
    }
    // Agregar links de adjuntos al final del texto
    if (adjuntosUrls && adjuntosUrls.length > 0) {
      textoFinal += '\n\nArchivos adjuntos:\n' + adjuntosUrls.map((url, i) => `${i + 1}. ${url}`).join('\n')
    }

    const { error } = await supabase.from('devoluciones').update({
      estado: tipo,
      empresa_envio: empresa || null,
      codigo_seguimiento: empresa !== 'Logistica Propia' ? codigo : null,
      fecha_envio: empresa === 'Logistica Propia' ? fechaEnvio : null,
      fecha_resolucion: new Date().toISOString(),
      notas: unirNotas(item.notas, nuevaNota),
    }).eq('id', item.id)

    if (error) { alert(`Error al guardar ${tipo}`); return }

    try {
      const { error: emailError } = await supabase.functions.invoke('enviar-email-resolucion', {
        body: {
          to: String(item.email || '').trim(),
          subject: `TEMPTECH - ${tipo === 'Devolucion' ? 'Devolución' : 'Resolución'} de reclamo ${item.tracking_id}`,
          text: textoFinal,
          tracking_id: item.tracking_id || '',
          empresa: empresa || '',
          tracking: empresa !== 'Logistica Propia' ? codigo : '',
          fecha: empresa === 'Logistica Propia' ? fechaEnvio : '',
        },
      })
      if (emailError) alert(`Se guardó pero falló el email: ${emailError.message}`)
    } catch (err) { alert(`Error al enviar email: ${err.message}`) }

    setPanelAbierto(null)
    await cargar()
    alert(`${tipo === 'Devolucion' ? 'Devolución' : 'Resolución'} guardada y email enviado ✅`)
  }

  async function guardarNotificarService(item, { fechaVisita, textoEmail }) {
    const notaTexto = window.prompt('Nota para NOTIFICAR SERVICE:', '')
    if (notaTexto === null) return
    const nuevaNota = armarLineaNota('NOTIFICAR SERVICE', notaTexto)

    const { error } = await supabase.from('devoluciones').update({
      fecha_resolucion: new Date().toISOString(),
      fecha_envio: fechaVisita || null,
      notas: unirNotas(item.notas, nuevaNota),
    }).eq('id', item.id)
    if (error) { alert('Error al guardar'); return }

    try {
      const { error: emailError } = await supabase.functions.invoke('enviar-email-resolucion', {
        body: {
          to: String(item.email || '').trim(),
          subject: `TEMPTECH - Notificación de Service ${item.tracking_id}`,
          text: textoEmail,
          tracking_id: item.tracking_id || '',
          empresa: 'Logistica Propia',
          tracking: '',
          fecha: fechaVisita,
        },
      })
      if (emailError) alert(`Se guardó pero falló el email: ${emailError.message}`)
    } catch (err) { alert(`Error al enviar email: ${err.message}`) }

    setNotificarServiceId(null)
    await cargar()
    alert('Notificación de Service enviada ✅')
  }

  function abrirEdicion(item) {
    setEditForm({
      nombre_apellido: item.nombre_apellido || item.nombre || '',
      email: item.email || '',
      telefono: item.telefono || '',
      direccion: item.direccion || '',
      localidad: item.localidad || '',
      provincia: item.provincia || '',
      codigo_postal: item.codigo_postal || '',
      producto: item.producto || '',
      modelo: item.modelo || '',
      motivo: item.motivo || '',
      descripcion_falla: item.descripcion_falla || '',
      canal: item.canal || '',
      numero_venta_manual: item.numero_venta_manual || '',
      fecha_compra: item.fecha_compra ? item.fecha_compra.slice(0, 10) : '',
    })
    setEditandoId(item.id)
  }

  async function guardarEdicion(item) {
    const { error } = await supabase.from('devoluciones').update({
      nombre_apellido: editForm.nombre_apellido,
      email: editForm.email,
      telefono: editForm.telefono,
      direccion: editForm.direccion,
      localidad: editForm.localidad,
      provincia: editForm.provincia,
      codigo_postal: editForm.codigo_postal,
      producto: editForm.producto,
      modelo: editForm.modelo,
      motivo: editForm.motivo,
      descripcion_falla: editForm.descripcion_falla,
      canal: editForm.canal,
      numero_venta_manual: editForm.numero_venta_manual,
      fecha_compra: editForm.fecha_compra || null,
    }).eq('id', item.id)
    if (error) { alert('Error al guardar los cambios'); return }
    setEditandoId(null)
    await cargar()
  }

  async function guardarSupervision(item, supervision) {
    const { error } = await supabase.from('devoluciones').update({
      supervision_fabrica: supervision,
    }).eq('id', item.id)
    if (error) { alert('Error al guardar supervisión: ' + error.message); return }
    setSupervisionAbierto(null)
    await cargar()
  }

  async function guardarPanelStock(item, { codigo, nombre, modelo, cantidad }) {
    const isEnviado = panelStockAbierto?.tipo === 'enviado'
    const clienteNombre = item.nombre_apellido || item.nombre || item.email || ''
    const reclamoRef = item.tracking_id || String(item.id).slice(0,8).toUpperCase()

    if (isEnviado) {
      const { error } = await supabase.from('egresos_garantia').insert({
        codigo, nombre, modelo: modelo || nombre, categoria: '',
        cantidad, canal: 'Garantía', estado: 'pendiente',
        referencia_nombre: clienteNombre || null,
        observacion: `Reclamo ${reclamoRef}`,
        usuario_id: user?.id, usuario_nombre: profile?.full_name || user?.email,
      })
      if (error) { alert('Error: ' + error.message); return }
      const nuevaNota = armarLineaNota('ENVIAR PANEL', `Pendiente de egreso · Cód: ${codigo} · Cant: ${cantidad}`)
      await supabase.from('devoluciones').update({ notas: unirNotas(item.notas, nuevaNota) }).eq('id', item.id)
      setPanelStockAbierto(null)
      await cargar()
      alert('✅ Envío registrado como pendiente — se descuenta en Ingreso/Egreso PT.')
    } else {
      const { error } = await supabase.from('devoluciones').insert({
        origen: 'garantia',
        estado: 'pendiente',
        tipo: 'falla',
        items: [{ codigo, nombre, modelo: modelo || nombre, cantidad }],
        referencia_nombre: clienteNombre || null,
        notas: `Panel devuelto · Reclamo ${reclamoRef} · ID:${item.id}`,
      })
      if (error) { alert('Error: ' + error.message); return }
      const nuevaNota = armarLineaNota('RECIBIR PANEL', `Pendiente de ingreso · Cód: ${codigo} · Cant: ${cantidad}`)
      await supabase.from('devoluciones').update({ notas: unirNotas(item.notas, nuevaNota) }).eq('id', item.id)
      setPanelStockAbierto(null)
      await cargar()
      alert('✅ Recepción registrada como pendiente — el stock ingresa en Ingreso/Egreso PT.')
    }
  }

  async function eliminarReclamo(item) {
    setConfirmarEliminar(item)
  }

  async function confirmarYEliminar() {
    if (!confirmarEliminar) return
    setEliminando(true)
    const { error } = await supabase.from('devoluciones').delete().eq('id', confirmarEliminar.id)
    setEliminando(false)
    if (error) { alert('Error al eliminar: ' + error.message); return }
    setConfirmarEliminar(null)
    await cargar()
  }

  async function cerrarCaso(item) {
    const texto = window.prompt('Nota para CERRAR:', '')
    if (texto === null) return
    const nuevaNota = armarLineaNota('CERRADO', texto)
    await supabase.from('devoluciones').update({ estado: 'cerrado', notas: unirNotas(item.notas, nuevaNota) }).eq('id', item.id)
    await cargar()
  }

  async function guardarNotaManual(item) {
    const texto = (notasInput[item.id] || '').trim()
    if (!texto) { alert('Escribí una nota antes de guardar'); return }
    const nuevaNota = armarLineaNota('NOTA', texto)
    const { error } = await supabase.from('devoluciones').update({ notas: unirNotas(item.notas, nuevaNota) }).eq('id', item.id)
    if (error) { alert('Error al guardar la nota'); return }
    setNotasInput(prev => ({ ...prev, [item.id]: '' }))
    await cargar()
  }

  async function guardarNotaInterna(item) {
    const texto = (notasInternas[item.id] || '').trim()
    if (!texto) { alert('Escribí una nota interna antes de guardar'); return }
    const nuevaNota = armarLineaNota('INTERNO', texto)
    const { error } = await supabase.from('devoluciones').update({ notas_internas: unirNotas(item.notas_internas, nuevaNota) }).eq('id', item.id)
    if (error) { alert('Error al guardar la nota interna'); return }
    setNotasInternas(prev => ({ ...prev, [item.id]: '' }))
    await cargar()
  }

  function imprimirReclamo(item) {
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>
<title>Reclamo ${item.tracking_id || item.id}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: #fff; padding: 32px; }
  @page { size: A4; margin: 20mm; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a1a2e; padding-bottom: 14px; margin-bottom: 20px; }
  .logo-text { font-size: 22px; font-weight: 900; letter-spacing: -1px; color: #1a1a2e; }
  .logo-sub { font-size: 10px; color: #555; margin-top: 2px; letter-spacing: 2px; text-transform: uppercase; }
  .tracking { font-size: 18px; font-weight: 700; color: #1a1a2e; font-family: monospace; }
  .estado-badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #e8eaf6; color: #1a1a2e; margin-top: 4px; }
  .aprobado-badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #e8f5e9; color: #2e7d32; margin-left: 6px; }
  .section { margin-bottom: 18px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #555; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 24px; }
  .row { display: flex; gap: 8px; margin-bottom: 6px; }
  .label { color: #555; min-width: 130px; flex-shrink: 0; }
  .value { color: #111; font-weight: 500; }
  .notas { background: #f5f5f5; border: 1px solid #ddd; border-radius: 6px; padding: 12px; font-size: 11px; white-space: pre-line; color: #333; margin-top: 8px; }
  .footer { margin-top: 32px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 10px; color: #888; display: flex; justify-content: space-between; }
</style></head><body>
<div class="header">
  <div>
    <div class="logo-text">TEMPTECH</div>
    <div class="logo-sub">Portal de Atención al Cliente</div>
  </div>
  <div style="text-align:right">
    <div class="tracking">${item.tracking_id || `#${item.id}`}</div>
    <span class="estado-badge">${item.estado || 'Ingresado'}</span>
    ${item.aprobado === 'SI' ? '<span class="aprobado-badge">✓ Aprobado</span>' : ''}
    <div style="font-size:11px;color:#555;margin-top:6px">Ingreso: ${formatearFecha(item.fecha_creacion)}</div>
  </div>
</div>

<div class="grid">
  <div class="section">
    <div class="section-title">Cliente</div>
    ${item.nombre_apellido || item.nombre ? `<div class="row"><span class="label">Nombre</span><span class="value">${item.nombre_apellido || item.nombre}</span></div>` : ''}
    ${item.email ? `<div class="row"><span class="label">Email</span><span class="value">${item.email}</span></div>` : ''}
    ${item.telefono ? `<div class="row"><span class="label">Teléfono</span><span class="value">${item.telefono}</span></div>` : ''}
    ${item.direccion ? `<div class="row"><span class="label">Dirección</span><span class="value">${item.direccion}</span></div>` : ''}
    ${(item.localidad || item.provincia) ? `<div class="row"><span class="label">Localidad</span><span class="value">${[item.localidad, item.provincia, item.codigo_postal].filter(Boolean).join(' ')}</span></div>` : ''}
  </div>
  <div class="section">
    <div class="section-title">Producto</div>
    ${item.producto ? `<div class="row"><span class="label">Producto</span><span class="value">${item.producto}</span></div>` : ''}
    ${item.modelo ? `<div class="row"><span class="label">Modelo</span><span class="value">${item.modelo}</span></div>` : ''}
    ${item.motivo ? `<div class="row"><span class="label">Motivo</span><span class="value">${item.motivo}</span></div>` : ''}
    ${item.descripcion_falla ? `<div class="row"><span class="label">Descripción</span><span class="value">${item.descripcion_falla}</span></div>` : ''}
    ${item.dias_garantia != null ? `<div class="row"><span class="label">Días garantía</span><span class="value">${item.dias_garantia} días</span></div>` : ''}
  </div>
  <div class="section">
    <div class="section-title">Compra</div>
    ${item.canal ? `<div class="row"><span class="label">Canal</span><span class="value">${item.canal}</span></div>` : ''}
    ${item.vendedor ? `<div class="row"><span class="label">Vendedor</span><span class="value">${item.vendedor}</span></div>` : ''}
    ${item.numero_venta_manual ? `<div class="row"><span class="label"># Venta</span><span class="value">${item.numero_venta_manual}</span></div>` : ''}
    ${item.fecha_compra ? `<div class="row"><span class="label">Fecha compra</span><span class="value">${formatearFecha(item.fecha_compra)}</span></div>` : ''}
    ${item.fecha_ingreso ? `<div class="row"><span class="label">Fecha ingreso</span><span class="value">${formatearFecha(item.fecha_ingreso)}</span></div>` : ''}
    ${item.empresa_envio ? `<div class="row"><span class="label">Empresa envío</span><span class="value">${item.empresa_envio}</span></div>` : ''}
    ${item.codigo_seguimiento ? `<div class="row"><span class="label">Cód. seguimiento</span><span class="value">${item.codigo_seguimiento}</span></div>` : ''}
    ${item.fecha_envio ? `<div class="row"><span class="label">Fecha envío</span><span class="value">${formatearFecha(item.fecha_envio)}</span></div>` : ''}
    ${item.motivo_rechazo ? `<div class="row"><span class="label">Motivo rechazo</span><span class="value">${item.motivo_rechazo}</span></div>` : ''}
  </div>
</div>

${item.notas ? `<div class="section"><div class="section-title">Historial de notas</div><div class="notas">${item.notas}</div></div>` : ''}

<div class="footer">
  <span>TEMPTECH · Reclamo ${item.tracking_id || item.id}</span>
  <span>Impreso: ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</span>
</div>
</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 400)
  }

  async function exportarExcel() {
    try {
      const { data, error } = await supabase.from('devoluciones').select('*').order('fecha_creacion', { ascending: false })
      if (error) { alert('No se pudo exportar'); return }
      const filas = (data || []).map(item => ({ ID: item.id || '', Tracking: item.tracking_id || '', Estado: item.estado || '', Aprobado: item.aprobado || '', 'Fecha ingreso': formatearFecha(item.fecha_ingreso), 'Fecha creación': formatearFecha(item.fecha_creacion), 'Fecha compra': formatearFecha(item.fecha_compra), 'Días garantía': item.dias_garantia ?? '', Cliente: item.nombre_apellido || '', Dirección: item.direccion || '', Localidad: item.localidad || '', Provincia: item.provincia || '', 'CP': item.codigo_postal || '', Teléfono: item.telefono || '', Email: item.email || '', Canal: item.canal || '', Vendedor: item.vendedor || '', '# Venta': item.numero_venta_manual || '', Producto: item.producto || '', Modelo: item.modelo || '', Motivo: item.motivo || '', Descripción: item.descripcion_falla || '', 'Motivo rechazo': item.motivo_rechazo || '', Notas: item.notas || '', 'Empresa envío': item.empresa_envio || '', 'Código seguimiento': item.codigo_seguimiento || '', 'Fecha envío': formatearFecha(item.fecha_envio), 'Fecha resolución': formatearFecha(item.fecha_resolucion) }))
      const ws = XLSX.utils.json_to_sheet(filas)
      ws['!cols'] = [8,22,14,12,20,20,20,14,28,32,18,18,8,18,30,18,20,20,24,20,24,40,30,60,20,22,20,20].map(wch => ({ wch }))
      ws['!autofilter'] = { ref: ws['!ref'] }
      const range = XLSX.utils.decode_range(ws['!ref'])
      for (let col = range.s.c; col <= range.e.c; col++) {
        const ca = XLSX.utils.encode_cell({ r: 0, c: col })
        if (ws[ca]) ws[ca].s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1F4E78' } }, alignment: { horizontal: 'center' } }
      }
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Reclamos')
      XLSX.writeFile(wb, `reclamos_temptech_${new Date().toISOString().slice(0, 10)}.xlsx`)
    } catch { alert('Error al exportar') }
  }

  const inputStyle = { background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '8px 12px', color: T.text, fontSize: 13, outline: 'none', fontFamily: T.font, width: '100%' }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.font }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        select option { background: ${T.surface2}; color: ${T.text}; }
        input::placeholder, textarea::placeholder { color: ${T.text3}; }
        input[type="date"] { color-scheme: dark; }
        @media (max-width: 600px) {
          .ar-header   { padding: 0 14px !important; }
          .ar-wrap     { padding: 16px 14px !important; }
          .ar-filtros  { flex-direction: column !important; align-items: stretch !important; }
          .ar-card-hdr { padding: 12px 14px !important; flex-direction: column !important; align-items: flex-start !important; }
          .ar-card-hdr-inner { flex-wrap: wrap !important; }
          .ar-body     { padding: 14px !important; }
          .ar-notes    { margin: 0 14px 14px !important; }
          .ar-nota-row { flex-direction: column !important; align-items: stretch !important; }
          .ar-nota-row button { width: 100% !important; }
          .ar-actions  { padding: 12px 14px !important; flex-wrap: wrap !important; }
          .ar-cf-panel { margin: 0 14px 14px !important; }
          .ar-info-lbl { min-width: 100px !important; }
        }
      `}</style>

      {/* Topbar */}
      <header className="ar-header" style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: T.text }}>Panel Admin — Gestión de Reclamos</span>
        </div>
      </header>

      <div className="ar-wrap" style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Filtros */}
        <div className="ar-filtros" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: '18px 22px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: T.text3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Estado</label>
            <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
              <option value="todos">Todos</option>
              <option value="Ingresado">Ingresado</option>
              <option value="pendiente">Pendiente</option>
              <option value="Resolucion">Resolución</option>
              <option value="Devolucion">Devolución</option>
              <option value="Service">Service</option>
              <option value="rechazado">Rechazado</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
            <input type="text" placeholder="🔍 Buscar por tracking, nombre o email..." value={busquedaTracking} onChange={e => setBusquedaTracking(e.target.value)} style={inputStyle} />
            {busquedaTracking && <button onClick={() => setBusquedaTracking('')} style={{ background: T.surface3, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '8px 12px', color: T.text2, fontSize: 12, cursor: 'pointer', fontFamily: T.font, whiteSpace: 'nowrap' }}>Limpiar</button>}
          </div>
          <button onClick={exportarExcel} style={{ background: T.greenDim, color: T.green, border: `1px solid ${T.green}40`, borderRadius: T.radius, padding: '8px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: T.font, whiteSpace: 'nowrap' }}>📊 Exportar Excel</button>
          <div style={{ fontSize: 12, color: T.text3, marginLeft: 'auto' }}>{datosFiltrados.length} reclamo{datosFiltrados.length !== 1 ? 's' : ''}</div>
        </div>

        {errorTexto && <div style={{ background: T.redDim, border: `1px solid ${T.red}40`, color: T.red, padding: '14px 18px', borderRadius: T.radiusLg, marginBottom: 20, fontSize: 13 }}>⚠ Error: {errorTexto}</div>}

        {cargando ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.text3 }}>Cargando reclamos...</div>
        ) : datosFiltrados.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.text3 }}>No hay reclamos para mostrar.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {datosFiltrados.map(item => {
              // ── Reglas de habilitación de botones ──
              const esCerrado    = item.estado === 'cerrado'
              const esResolucion = item.estado === 'Resolucion'
              const esDevolucion = item.estado === 'Devolucion'
              const aprobadoSI   = item.aprobado === 'SI'

              // Desaprobar: habilitado siempre excepto cerrado
              const desaprobarBloqueado = esCerrado

              return (
                <div key={item.id} style={{ background: T.surface, border: `1px solid ${aprobadoSI ? T.green + '40' : T.border}`, borderRadius: T.radiusLg, overflow: 'hidden', position: 'relative' }}>
                  {aprobadoSI && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%) rotate(-25deg)', fontSize: 54, fontWeight: 800, color: 'rgba(61,214,140,0.06)', pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap', zIndex: 0 }}>APROBADO</div>
                  )}

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    {/* Header */}
                    <div className="ar-card-hdr" style={{ padding: '16px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <div className="ar-card-hdr-inner" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '4px 10px', borderRadius: 6 }}>{item.tracking_id || `#${item.id}`}</span>
                        <Badge estado={item.estado} aprobado={item.aprobado} />
                      </div>
                      <div style={{ fontSize: 12, color: T.text3 }}>{formatearFecha(item.fecha_creacion)}</div>
                    </div>

                    {/* Body */}
                    <div className="ar-body" style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0 32px' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Cliente</div>
                        <InfoRow label="Nombre" value={item.nombre_apellido || item.nombre} />
                        <InfoRow label="Email" value={item.email} />
                        {item.telefono && (
                          <div style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 5 }}>
                            <span style={{ color: T.text3, minWidth: 140, flexShrink: 0 }}>Teléfono</span>
                            <a
                              href={`https://wa.me/${item.telefono.replace(/\D/g, '')}?text=${encodeURIComponent('Hola como estas. Nos comunicamos del area de Post Venta de TEMPTECH')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: '#25D366', textDecoration: 'none', fontWeight: 600 }}
                            >
                              {item.telefono}
                            </a>
                          </div>
                        )}
                        <InfoRow label="Dirección" value={item.direccion} />
                        <InfoRow label="Localidad" value={`${item.localidad || ''} ${item.provincia || ''} ${item.codigo_postal || ''}`} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Producto</div>
                        <InfoRow label="Producto" value={item.producto} />
                        <InfoRow label="Modelo" value={item.modelo} />
                        <InfoRow label="Motivo" value={item.motivo} />
                        <InfoRow label="Descripción" value={item.descripcion_falla} />
                        <InfoRow label="Días garantía" value={item.dias_garantia != null ? `${item.dias_garantia} días` : null} />
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Compra</div>
                        <InfoRow label="Canal" value={item.canal} />
                        <InfoRow label="Vendedor" value={item.vendedor} />
                        <InfoRow label="# Venta" value={item.numero_venta_manual} />
                        <InfoRow label="Fecha compra" value={formatearFecha(item.fecha_compra)} />
                        {/* Supervisión fábrica */}
                        <div style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 5 }}>
                          <span className="ar-info-lbl" style={{ color: T.text3, minWidth: 140, flexShrink: 0 }}>Supervisión fábrica</span>
                          {item.supervision_fabrica ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: T.green, fontWeight: 700 }}>✓ Completada</span>
                              <button onClick={() => setSupervisionVer(item)}
                                style={{ background: 'rgba(74,108,247,0.12)', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 6, padding: '1px 10px', fontSize: 11, fontWeight: 600, color: '#7b9fff', cursor: 'pointer', fontFamily: T.font }}>
                                VER
                              </button>
                            </span>
                          ) : (
                            <span style={{ color: T.text3 }}>—</span>
                          )}
                        </div>
                        <InfoRow label="Fecha ingreso" value={
                          /^\d{4}-\d{2}-\d{2}$/.test(String(item.fecha_ingreso || ''))
                            ? formatearFecha(item.fecha_creacion || item.fecha_ingreso)
                            : formatearFecha(item.fecha_ingreso)
                        } />
                        {item.estado !== 'cerrado' && item.estado !== 'rechazado' && (() => {
                          const fechaBase = item.fecha_creacion || item.fecha_ingreso
                          const t = tiempoSinRespuesta(fechaBase)
                          if (!t) return null
                          const diffH = (new Date() - new Date(fechaBase)) / 3600000
                          const color = diffH > 48 ? T.red : diffH > 24 ? T.yellow : T.green
                          return <InfoRow label="Tiempo desde inicio reclamo" value={t} highlight={color} />
                        })()}
                        {item.estado !== 'cerrado' && item.estado !== 'rechazado' && item.updated_at && (() => {
                          const t = tiempoSinRespuesta(item.updated_at)
                          if (!t) return null
                          const diffH = (new Date() - new Date(item.updated_at)) / 3600000
                          const color = diffH > 48 ? T.red : diffH > 24 ? T.yellow : T.green
                          return <InfoRow label="Tiempo sin respuesta" value={t} highlight={color} />
                        })()}
                        {(item.fecha_envio || item.fecha_resolucion) && <InfoRow label="Fecha de envío" value={formatearFecha(item.fecha_envio || item.fecha_resolucion)} />}
                        <div style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 5, alignItems: 'center' }}>
                          <span className="ar-info-lbl" style={{ color: T.text3, minWidth: 140, flexShrink: 0 }}>Supervisión fábrica</span>
                          {item.supervision_fabrica ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: T.green, fontWeight: 700 }}>SÍ</span>
                              <button onClick={() => setSupervisionVer(item)}
                                style={{ background: 'rgba(74,108,247,0.12)', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 6, padding: '2px 10px', fontSize: 11, color: '#7b9fff', cursor: 'pointer', fontWeight: 600, fontFamily: T.font }}>
                                VER
                              </button>
                            </span>
                          ) : (
                            <span style={{ color: T.text3 }}>NO</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notas y archivos */}
                    <div className="ar-notes" style={{ margin: '0 22px 16px', padding: 14, background: T.surface2, borderRadius: T.radius, border: `1px solid ${T.border}` }}>
                        {item.motivo_rechazo && <div style={{ fontSize: 13, color: T.red, marginBottom: 8 }}><strong>Motivo rechazo:</strong> {item.motivo_rechazo}</div>}
                        {item.empresa_envio && <InfoRow label="Empresa envío" value={item.empresa_envio} />}
                        {item.codigo_seguimiento && <InfoRow label="Código seguimiento" value={item.codigo_seguimiento} />}
                        {item.fecha_envio && <InfoRow label="Fecha de envío" value={formatearFecha(item.fecha_envio)} />}
                        {item.fecha_resolucion && !item.fecha_envio && <InfoRow label="Fecha de envío" value={formatearFecha(item.fecha_resolucion)} />}
                        {item.notas && <div style={{ fontSize: 12, color: T.text3, whiteSpace: 'pre-line', marginTop: 8, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>{item.notas}</div>}

                        {/* Nota manual */}
                        <div className="ar-nota-row" style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                          <textarea
                            value={notasInput[item.id] || ''}
                            onChange={e => setNotasInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Agregar nota..."
                            rows={2}
                            style={{ flex: 1, background: T.surface3, border: `1px solid ${T.border2}`, borderRadius: T.radius, padding: '8px 12px', color: T.text, fontSize: 12, fontFamily: T.font, resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                          />
                          <Btn variant="ghost" onClick={() => guardarNotaManual(item)}>💾 Guardar nota</Btn>
                        </div>

                        {/* Nota interna — solo admins */}
                        {item.notas_internas && (
                          <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(255,209,102,0.08)', border: `1px solid rgba(255,209,102,0.25)`, borderRadius: T.radius }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T.yellow, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.6px' }}>🔒 Notas internas</div>
                            <div style={{ fontSize: 12, color: T.text3, whiteSpace: 'pre-line' }}>{item.notas_internas}</div>
                          </div>
                        )}
                        <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                          <textarea
                            value={notasInternas[item.id] || ''}
                            onChange={e => setNotasInternas(prev => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Nota interna (solo admins)..."
                            rows={2}
                            style={{ flex: 1, background: 'rgba(255,209,102,0.05)', border: `1px solid rgba(255,209,102,0.25)`, borderRadius: T.radius, padding: '8px 12px', color: T.text, fontSize: 12, fontFamily: T.font, resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                          />
                          <Btn variant="warn" onClick={() => guardarNotaInterna(item)}>🔒 Guardar interno</Btn>
                        </div>

                        {/* Comprobantes — mostrar todos */}
                        {(() => {
                          const urls = item.comprobantes_urls?.length > 0
                            ? item.comprobantes_urls
                            : item.comprobante_url ? [item.comprobante_url] : []
                          if (urls.length === 0) return null
                          return (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontSize: 11, color: T.text3, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                Comprobantes ({urls.length})
                              </div>
                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {urls.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noreferrer">
                                    <img src={url} alt={`Comprobante ${i + 1}`}
                                      style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}` }}
                                      onError={e => {
                                        e.currentTarget.style.display = 'none'
                                        e.currentTarget.nextSibling.style.display = 'flex'
                                      }}
                                    />
                                    <div style={{ display: 'none', width: 100, height: 70, borderRadius: 8, border: `1px solid ${T.border}`, alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#7b9fff', textDecoration: 'underline', background: T.surface3 }}>
                                      Ver archivo {i + 1}
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )
                        })()}

                        {/* Imágenes del producto — mostrar todas */}
                        {(() => {
                          const urls = item.imagenes_producto_urls?.length > 0
                            ? item.imagenes_producto_urls
                            : item.imagen_producto_url ? [item.imagen_producto_url] : []
                          if (urls.length === 0) return null
                          return (
                            <div style={{ marginTop: 12 }}>
                              <div style={{ fontSize: 11, color: T.text3, marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                Imágenes del producto ({urls.length})
                              </div>
                              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {urls.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noreferrer">
                                    <img src={url} alt={`Producto ${i + 1}`}
                                      style={{ width: 100, height: 70, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}` }}
                                      onError={e => {
                                        e.currentTarget.style.display = 'none'
                                        e.currentTarget.nextSibling.style.display = 'flex'
                                      }}
                                    />
                                    <div style={{ display: 'none', width: 100, height: 70, borderRadius: 8, border: `1px solid ${T.border}`, alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#7b9fff', textDecoration: 'underline', background: T.surface3 }}>
                                      Ver archivo {i + 1}
                                    </div>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )
                        })()}
                      </div>

                    {/* Acciones */}
                    <div style={{ padding: '14px 22px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <Btn onClick={() => imprimirReclamo(item)} variant="ghost">🖨️ Imprimir</Btn>
                      {isAdmin && <Btn onClick={() => editandoId === item.id ? setEditandoId(null) : abrirEdicion(item)} variant="ghost">✏️ Editar</Btn>}
                      {isAdmin && <Btn onClick={() => cambiarEstado(item, 'pendiente')} disabled={esCerrado}>Pendiente</Btn>}
                      {isAdmin && <Btn onClick={() => setPanelAbierto({ id: item.id, tipo: 'Resolucion' })} disabled={!aprobadoSI} variant="primary">🚚 Resolución</Btn>}
                      {isAdmin && <Btn onClick={() => setPanelAbierto({ id: item.id, tipo: 'Devolucion' })} disabled={!aprobadoSI} variant="orange">📦 Devolución</Btn>}
                      {isAdmin && <Btn onClick={() => setPanelAbierto({ id: item.id, tipo: 'Service' })} disabled={esCerrado} variant="teal">🔧 Service</Btn>}
                      {isAdmin && <Btn onClick={() => setNotificarServiceId(item.id)} disabled={esCerrado} variant="teal">📅 Notificar Service</Btn>}
                      {isAdmin && <Btn onClick={() => marcarAprobado(item)} disabled={aprobadoSI} variant="success">✓ Aprobar</Btn>}
                      {isAdmin && <Btn onClick={() => handleDesaprobar(item)} disabled={desaprobarBloqueado} variant="warn">Desaprobar</Btn>}
                      {isAdmin && <Btn onClick={() => { setRechazoAbiertoId(item.id); setTextoRechazo(item.motivo_rechazo || DEFAULT_RECHAZO(item.tracking_id)); setNotaRechazo('') }} disabled={esCerrado} variant="danger">Rechazar</Btn>}
                      {isAdmin && <Btn onClick={() => cerrarCaso(item)}>Cerrar</Btn>}
                      <Btn onClick={() => setSupervisionAbierto(item)} variant="teal">🏭 Supervisión</Btn>
                      {isAdmin && <Btn onClick={() => setPanelStockAbierto(panelStockAbierto?.id === item.id && panelStockAbierto?.tipo === 'enviado' ? null : { id: item.id, tipo: 'enviado' })} variant="danger">📤 Enviar Panel</Btn>}
                      {isAdmin && <Btn onClick={() => setPanelStockAbierto(panelStockAbierto?.id === item.id && panelStockAbierto?.tipo === 'recibido' ? null : { id: item.id, tipo: 'recibido' })} variant="success">📥 Recibir Panel</Btn>}
                      {isAdmin && <Btn onClick={() => eliminarReclamo(item)} variant="danger">🗑 Eliminar</Btn>}
                    </div>

                    {/* Panel desaprobar */}
                    {desaprobarAbiertoId === item.id && (
                      <div style={{ margin: '0 22px 18px', padding: 16, background: 'rgba(234,179,8,0.08)', border: `1px solid ${T.yellow}40`, borderRadius: T.radius }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.yellow, marginBottom: 10 }}>Desaprobar — texto del email al cliente (editable)</div>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Nota interna</label>
                          <input type="text" value={notaDesaprobar} onChange={e => setNotaDesaprobar(e.target.value)} placeholder="Nota interna (opcional)" style={{ width: '100%', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '8px 12px', color: T.text, fontSize: 13, fontFamily: T.font, outline: 'none', marginBottom: 10 }} />
                        </div>
                        <textarea
                          value={textoDesaprobar}
                          onChange={e => setTextoDesaprobar(e.target.value)}
                          rows={8}
                          style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '10px 12px', color: T.text, fontSize: 13, fontFamily: T.font, resize: 'vertical', outline: 'none', marginBottom: 10, lineHeight: 1.7 }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Btn variant="warn" onClick={() => confirmarDesaprobar(item)}>Confirmar y enviar email</Btn>
                          <Btn onClick={() => { setDesaprobarAbiertoId(null); setTextoDesaprobar(''); setNotaDesaprobar('') }}>Cancelar</Btn>
                        </div>
                      </div>
                    )}

                    {/* Panel rechazo — solo textarea email editable */}
                    {rechazoAbiertoId === item.id && (
                      <div style={{ margin: '0 22px 18px', padding: 16, background: T.redDim, border: `1px solid ${T.red}40`, borderRadius: T.radius }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: T.red, marginBottom: 10 }}>Texto del email al cliente (editable)</div>
                        <textarea
                          value={textoRechazo}
                          onChange={e => setTextoRechazo(e.target.value)}
                          rows={8}
                          style={{ width: '100%', background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '10px 12px', color: T.text, fontSize: 13, fontFamily: T.font, resize: 'vertical', outline: 'none', marginBottom: 10, lineHeight: 1.7 }}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Btn variant="danger" onClick={() => rechazarCaso(item)}>Confirmar y enviar email</Btn>
                          <Btn onClick={() => { setRechazoAbiertoId(null); setTextoRechazo(''); setNotaRechazo('') }}>Cancelar</Btn>
                        </div>
                      </div>
                    )}

                    {/* Panel resolución / devolución / service */}
                    {panelAbierto?.id === item.id && (
                      <PanelEnvio
                        item={item}
                        tipo={panelAbierto.tipo}
                        onClose={() => setPanelAbierto(null)}
                        onGuardar={(datos) => guardarEnvio(item, datos)}
                      />
                    )}

                    {/* Panel notificar service */}
                    {notificarServiceId === item.id && (
                      <PanelNotificarService
                        item={item}
                        onClose={() => setNotificarServiceId(null)}
                        onGuardar={(datos) => guardarNotificarService(item, datos)}
                      />
                    )}

                    {/* Panel enviado / recibido stock */}
                    {panelStockAbierto?.id === item.id && (
                      <PanelStock
                        item={item}
                        tipo={panelStockAbierto.tipo}
                        onClose={() => setPanelStockAbierto(null)}
                        onGuardar={(datos) => guardarPanelStock(item, datos)}
                      />
                    )}

                    {/* Panel edición — solo admin */}
                    {isAdmin && editandoId === item.id && (
                      <div style={{ margin: '0 22px 18px', padding: 18, background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.25)', borderRadius: T.radius }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#7b9fff', marginBottom: 14 }}>✏️ Editar datos del reclamo</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                          {[
                            { label: 'Nombre y Apellido', key: 'nombre_apellido' },
                            { label: 'Email', key: 'email' },
                            { label: 'Teléfono', key: 'telefono' },
                            { label: 'Dirección', key: 'direccion' },
                            { label: 'Localidad', key: 'localidad' },
                            { label: 'Provincia', key: 'provincia' },
                            { label: 'Código Postal', key: 'codigo_postal' },
                            { label: 'Canal', key: 'canal' },
                            { label: '# Venta', key: 'numero_venta_manual' },
                            { label: 'Fecha compra', key: 'fecha_compra', type: 'date' },
                          ].map(({ label, key, type }) => (
                            <div key={key}>
                              <label style={{ fontSize: 10, color: T.text3, display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</label>
                              <input type={type || 'text'} value={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: 10, color: T.text3, display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Producto</label>
                          <input value={editForm.producto} onChange={e => setEditForm(f => ({ ...f, producto: e.target.value }))} style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }} />
                        </div>
                        <div style={{ marginBottom: 10 }}>
                          <label style={{ fontSize: 10, color: T.text3, display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Motivo</label>
                          <input value={editForm.motivo} onChange={e => setEditForm(f => ({ ...f, motivo: e.target.value }))} style={{ ...inputStyle, padding: '7px 10px', fontSize: 12 }} />
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <label style={{ fontSize: 10, color: T.text3, display: 'block', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Descripción de la falla</label>
                          <textarea value={editForm.descripcion_falla} onChange={e => setEditForm(f => ({ ...f, descripcion_falla: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6, padding: '7px 10px', fontSize: 12 }} />
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Btn variant="primary" onClick={() => guardarEdicion(item)}>💾 Guardar cambios</Btn>
                          <Btn onClick={() => setEditandoId(null)}>Cancelar</Btn>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Supervisión Fábrica — cargar nueva */}
      {supervisionAbierto && (
        <SupervisionFabrica
          item={supervisionAbierto}
          onClose={() => setSupervisionAbierto(null)}
          onGuardar={(data) => guardarSupervision(supervisionAbierto, data)}
          usuarioNombre={profile?.full_name || user?.email}
          usuarioId={user?.id}
        />
      )}

      {/* Modal Ver Supervisión */}
      {supervisionVer && (() => {
        const sv = supervisionVer.supervision_fabrica
        const productoReclamo = (supervisionVer.modelo && supervisionVer.modelo !== supervisionVer.producto) ? `${supervisionVer.producto} ${supervisionVer.modelo}` : supervisionVer.producto || ''
        const yn = (v) => v === true ? <span style={{ color: T.green, fontWeight: 700 }}>SÍ</span> : v === false ? <span style={{ color: T.red, fontWeight: 700 }}>NO</span> : <span style={{ color: T.text3 }}>—</span>
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(6px)' }}>
            <div style={{ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: T.radiusLg, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ padding: '18px 22px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>🏭 Supervisión Fábrica</div>
                  <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>#{supervisionVer.tracking_id} · {sv.fecha ? formatearFecha(sv.fecha) : '—'}</div>
                </div>
                <button onClick={() => setSupervisionVer(null)} style={{ background: 'none', border: 'none', color: T.text3, cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
              </div>
              <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sv.usuario_nombre && (
                  <div style={{ padding: '8px 14px', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: T.radius, fontSize: 12, color: '#a78bfa', display: 'flex', alignItems: 'center', gap: 6 }}>
                    👤 Supervisado por: <strong>{sv.usuario_nombre}</strong>
                    {sv.fecha && <span style={{ color: T.text3, marginLeft: 4 }}>· {formatearFecha(sv.fecha)}</span>}
                  </div>
                )}
                <div style={{ padding: '10px 14px', background: 'rgba(74,108,247,0.08)', border: '1px solid rgba(74,108,247,0.25)', borderRadius: T.radius, fontSize: 13, color: T.blue }}>
                  <span style={{ fontWeight: 600 }}>Producto del reclamo: </span>{productoReclamo || '—'}
                </div>
                {sv.coincide_producto === false && sv.producto_real && (
                  <div style={{ padding: '8px 14px', background: T.redDim, border: `1px solid ${T.red}40`, borderRadius: T.radius, fontSize: 13, color: T.red }}>
                    ⚠️ Producto recibido: <strong>{sv.producto_real}</strong>
                  </div>
                )}
                {[
                  ['¿Coincide con el reclamo?', sv.coincide_producto],
                  ['¿Está roto?', sv.roto],
                  ['¿Está golpeado?', sv.golpeado],
                  ['¿Funciona?', sv.funciona],
                  ['¿Contiene kit?', sv.tiene_kit],
                  ...(sv.tiene_patas !== null && sv.tiene_patas !== undefined ? [['¿Contiene patas?', sv.tiene_patas]] : []),
                  ['¿Es recuperable?', sv.recuperable],
                ].map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: T.surface2, borderRadius: T.radius, border: `1px solid ${T.border}`, fontSize: 13 }}>
                    <span style={{ color: T.text2 }}>{label}</span>
                    {yn(val)}
                  </div>
                ))}
                {sv.tiene_kit === false && (sv.kit_tacos || sv.kit_tornillos || sv.kit_embellecedores) && (
                  <div style={{ padding: '10px 14px', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius }}>
                    <div style={{ fontSize: 10, color: T.text3, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Contenido del kit recibido</div>
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {[['Tacos', sv.kit_tacos], ['Tornillos', sv.kit_tornillos], ['Embellecedores', sv.kit_embellecedores]].map(([label, val]) => val != null && (
                        <div key={label} style={{ fontSize: 13 }}>
                          <span style={{ color: T.text3 }}>{label}: </span>
                          <strong style={{ color: T.text }}>{val}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {sv.nota && (
                  <div style={{ padding: '10px 14px', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius }}>
                    <div style={{ fontSize: 10, color: T.text3, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Nota</div>
                    <div style={{ fontSize: 13, color: T.text2, whiteSpace: 'pre-wrap' }}>{sv.nota}</div>
                  </div>
                )}
                {sv.imagenes?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, color: T.text3, fontWeight: 600, textTransform: 'uppercase', marginBottom: 8 }}>Imágenes ({sv.imagenes.length})</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {sv.imagenes.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="" style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border}` }} />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
                  <Btn onClick={() => { setSupervisionVer(null); setSupervisionAbierto(supervisionVer) }}>✏️ Editar</Btn>
                  <Btn onClick={() => setSupervisionVer(null)}>Cerrar</Btn>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal confirmar eliminación */}
      {confirmarEliminar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: T.radiusLg, width: '100%', maxWidth: 420, padding: '28px 28px 24px' }}>
            <div style={{ fontSize: 22, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>¿Eliminar reclamo?</div>
            <div style={{ fontSize: 13, color: T.text3, marginBottom: 24 }}>
              Vas a eliminar el reclamo <span style={{ color: T.text, fontWeight: 600 }}>#{confirmarEliminar.tracking_id || String(confirmarEliminar.id).slice(0,8).toUpperCase()}</span>. Esta acción no se puede deshacer.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={confirmarYEliminar} disabled={eliminando}
                style={{ flex: 1, background: T.redDim, border: `1px solid ${T.red}40`, borderRadius: T.radius, padding: '10px', fontSize: 13, fontWeight: 700, color: T.red, cursor: eliminando ? 'not-allowed' : 'pointer', opacity: eliminando ? 0.5 : 1, fontFamily: T.font }}>
                {eliminando ? 'Eliminando...' : '🗑 Sí, eliminar'}
              </button>
              <button onClick={() => setConfirmarEliminar(null)} disabled={eliminando}
                style={{ flex: 1, background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '10px', fontSize: 13, fontWeight: 600, color: T.text2, cursor: 'pointer', fontFamily: T.font }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
