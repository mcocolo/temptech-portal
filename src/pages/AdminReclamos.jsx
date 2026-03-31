import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx-js-style'
import { supabase } from '@/lib/supabase'


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

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 5 }}>
      <span style={{ color: T.text3, minWidth: 140, flexShrink: 0 }}>{label}</span>
      <span style={{ color: T.text2 }}>{value}</span>
    </div>
  )
}

function formatearFecha(fecha) {
  if (!fecha) return '-'
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return fecha
  return d.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

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
    ? `Nos pondremos en contacto para indicarte la fecha de cambio del producto.\nPara realizar el cambio, un miembro de nuestra logística le entregará una unidad de reemplazo para que pueda utilizar mientras realizamos la reparación de su producto.\nSolicitamos por favor, ser tan amable, el día de cambio tener el equipo listo para ser retirado y entregar sólo el Panel, es decir, conservar el kit de instalación (y sus respectivas patas en el caso de corresponder) para ser utilizadas con la unidad de reemplazo.\n\nSaludos.\nEquipo Soporte TEMPTECH`
    : null // generado dinámicamente para Resolución

  const linkSeguimiento = (emp, cod) => {
    if (!cod) return ''
    const links = {
      'Correo Argentino': `https://www.correoargentino.com.ar/formularios/e-commerce?id=${cod}`,
      'Andreani': `https://www.andreani.com/#!/informacionEnvio/${cod}`,
    }
    return links[emp] || cod
  }

  const textoResolucion = (emp, cod) =>
    `Nos contactamos de TEMPTECH por el reclamo "${item.tracking_id}".\nNuevamente queremos pedirle disculpas por los inconvenientes ocasionados.\nA continuación le dejamos los datos para el seguimiento de su envío.\n\nEmpresa: ${emp || ''}\nCódigo de seguimiento: ${cod || ''}\nLink de seguimiento: ${linkSeguimiento(emp, cod)}`

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

  const datosFiltrados = datos.filter(item => !busquedaTracking || item.tracking_id?.toLowerCase().includes(busquedaTracking.toLowerCase()))

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
      <style>{`* { box-sizing: border-box; } select option { background: ${T.surface2}; color: ${T.text}; } input::placeholder { color: ${T.text3}; } input[type="date"] { color-scheme: dark; }`}</style>

      {/* Topbar */}
      <header style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: T.text }}>Panel Admin — Gestión de Reclamos</span>
        </div>
      </header>

      <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Filtros */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: '18px 22px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
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
            <input type="text" placeholder="🔍 Buscar por tracking..." value={busquedaTracking} onChange={e => setBusquedaTracking(e.target.value)} style={inputStyle} />
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
                    <div style={{ padding: '16px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '4px 10px', borderRadius: 6 }}>{item.tracking_id || `#${item.id}`}</span>
                        <Badge estado={item.estado} aprobado={item.aprobado} />
                      </div>
                      <div style={{ fontSize: 12, color: T.text3 }}>{formatearFecha(item.fecha_creacion)}</div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0 32px' }}>
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
                        <InfoRow label="Fecha ingreso" value={formatearFecha(item.fecha_ingreso)} />
                        {(item.fecha_envio || item.fecha_resolucion) && <InfoRow label="Fecha de envío" value={formatearFecha(item.fecha_envio || item.fecha_resolucion)} />}
                      </div>
                    </div>

                    {/* Notas y archivos */}
                    <div style={{ margin: '0 22px 16px', padding: 14, background: T.surface2, borderRadius: T.radius, border: `1px solid ${T.border}` }}>
                        {item.motivo_rechazo && <div style={{ fontSize: 13, color: T.red, marginBottom: 8 }}><strong>Motivo rechazo:</strong> {item.motivo_rechazo}</div>}
                        {item.empresa_envio && <InfoRow label="Empresa envío" value={item.empresa_envio} />}
                        {item.codigo_seguimiento && <InfoRow label="Código seguimiento" value={item.codigo_seguimiento} />}
                        {item.fecha_envio && <InfoRow label="Fecha de envío" value={formatearFecha(item.fecha_envio)} />}
                        {item.fecha_resolucion && !item.fecha_envio && <InfoRow label="Fecha de envío" value={formatearFecha(item.fecha_resolucion)} />}
                        {item.notas && <div style={{ fontSize: 12, color: T.text3, whiteSpace: 'pre-line', marginTop: 8, borderTop: `1px solid ${T.border}`, paddingTop: 8 }}>{item.notas}</div>}

                        {/* Nota manual */}
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                          <textarea
                            value={notasInput[item.id] || ''}
                            onChange={e => setNotasInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Agregar nota..."
                            rows={2}
                            style={{ flex: 1, background: T.surface3, border: `1px solid ${T.border2}`, borderRadius: T.radius, padding: '8px 12px', color: T.text, fontSize: 12, fontFamily: T.font, resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                          />
                          <Btn variant="ghost" onClick={() => guardarNotaManual(item)}>💾 Guardar nota</Btn>
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
                      <Btn onClick={() => cambiarEstado(item, 'pendiente')} disabled={esCerrado}>Pendiente</Btn>
                      <Btn onClick={() => setPanelAbierto({ id: item.id, tipo: 'Resolucion' })} disabled={!aprobadoSI} variant="primary">🚚 Resolución</Btn>
                      <Btn onClick={() => setPanelAbierto({ id: item.id, tipo: 'Devolucion' })} disabled={!aprobadoSI} variant="orange">📦 Devolución</Btn>
                      <Btn onClick={() => setPanelAbierto({ id: item.id, tipo: 'Service' })} disabled={esCerrado} variant="teal">🔧 Service</Btn>
                      <Btn onClick={() => setNotificarServiceId(item.id)} disabled={esCerrado} variant="teal">📅 Notificar Service</Btn>
                      <Btn onClick={() => marcarAprobado(item)} disabled={aprobadoSI} variant="success">✓ Aprobar</Btn>
                      <Btn onClick={() => handleDesaprobar(item)} disabled={desaprobarBloqueado} variant="warn">Desaprobar</Btn>
                      <Btn onClick={() => { setRechazoAbiertoId(item.id); setTextoRechazo(item.motivo_rechazo || DEFAULT_RECHAZO(item.tracking_id)); setNotaRechazo('') }} disabled={esCerrado} variant="danger">Rechazar</Btn>
                      <Btn onClick={() => cerrarCaso(item)}>Cerrar</Btn>
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
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
