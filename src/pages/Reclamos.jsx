import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminReclamos from './AdminReclamos'
import Admin2Reclamos from './Admin2Reclamos'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Modal, Badge, Spinner, Empty } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, AlertTriangle, Package, Upload, X } from 'lucide-react'

// ── Catálogo de productos (igual que en Auth.jsx) ──
const PRODUCT_CATALOG = [
  {
    group: 'Paneles Calefactores', emoji: '🔆',
    subs: [
      { label: 'Slim', products: [
        'Panel Calefactor Eléctrico TEMPTECH Slim 250w',
        'Panel Calefactor Eléctrico Toallero Simple TEMPTECH Slim 250w',
        'Panel Calefactor Eléctrico Toallero Doble TEMPTECH Slim 250w',
        'Panel Calefactor Eléctrico TEMPTECH Slim 500w',
        'Panel Calefactor Eléctrico Toallero Simple TEMPTECH Slim 500w',
        'Panel Calefactor Eléctrico Toallero Doble TEMPTECH Slim 500w',
        'Panel Calefactor Eléctrico TEMPTECH Slim 500w Madera Blanca',
      ]},
      { label: 'Firenze', products: [
        'Panel Calefactor TEMPTECH Firenze 1400w Blanco',
        'Panel Calefactor TEMPTECH Firenze 1400w Madera Veteada',
        'Panel Calefactor TEMPTECH Firenze 1400w Piedra Azteca',
        'Panel Calefactor TEMPTECH Firenze 1400w Piedra Romana',
        'Panel Calefactor TEMPTECH Firenze 1400w Mármol Traviatta Gris',
        'Panel Calefactor TEMPTECH Firenze 1400w Piedra Cantera Luna',
        'Panel Calefactor TEMPTECH Firenze 1400w Mármol Calacatta Ocre',
        'Panel Calefactor TEMPTECH Firenze 1400w SMART WIFI Blanco',
      ]},
    ],
  },
  {
    group: 'Calefones', emoji: '🔥',
    subs: [{ label: 'Calefones Eléctricos', products: [
      'Calefón Eléctrico TEMPTECH One 3,5/5,5/7Kw 220V Silver',
      'Calefón Eléctrico TEMPTECH Nova 6/8/9/13,5Kw 220V Blanco',
      'Calefón Eléctrico TEMPTECH Nova 6/8/9/13,5Kw 220V Black',
      'Calefón Eléctrico TEMPTECH Nova 6/8/9/13,5Kw 220V Silver',
      'Calefón Eléctrico TEMPTECH Pulse 9/13,5/18Kw 380V Blanco',
      'Calefón Eléctrico TEMPTECH Pulse 12/18/24Kw 380V Blanco',
    ]}],
  },
  {
    group: 'Calderas', emoji: '⚡',
    subs: [{ label: 'Calderas Duales', products: [
      'Caldera Eléctrica Dual TEMPTECH Core 220-380V 14,4 Kw Blanco',
      'Caldera Eléctrica Dual TEMPTECH Core 380V 23 Kw Blanco',
    ]}],
  },
  {
    group: 'Anafes Vitro', emoji: '🍳',
    subs: [{ label: 'Anafes', products: ['Anafe Vitro (consulta general)'] }],
  },
]

const CANALES = ['Mercado Libre', 'Tienda Nube', 'WhatsApp', 'Instagram', 'Distribuidor', 'Otro']

const MOTIVOS_POR_CATEGORIA = {
  'Paneles Calefactores': [
    'No calienta', 'Detalle de pintura', 'Detalle en terminación',
    'Falla en Tecla', 'No enciende el led de Tecla', 'Golpe de transporte',
    'Faltante de Kit o piezas', 'Falta de patas Firenze', 'Marco mal terminado',
    'Ruido', 'Medida barral incorrecta', 'Cambio comercial', 'Envío Incorrecto', 'Otro',
  ],
  'Calefones': [
    'No calienta agua', 'Pierde agua', 'Falla eléctrica', 'Error instalación',
    'Golpe transporte', 'Error en Pantalla', 'Cambio Comercial', 'Devolución', 'Otro',
  ],
  'Calderas': [
    'No calienta agua', 'Pierde agua', 'Falla eléctrica', 'Error instalación',
    'Golpe transporte', 'Error en Pantalla', 'Cambio Comercial', 'Devolución', 'Otro',
  ],
  'Anafes Vitro': [
    'No enciende', 'No calienta', 'Pantalla no funciona', 'Ruido anormal',
    'Golpe de transporte', 'Falta de piezas', 'Cambio comercial', 'Envío Incorrecto', 'Otro',
  ],
}

function getMotivos(producto) {
  if (!producto) return ['Seleccioná el motivo...']
  const cat = PRODUCT_CATALOG.find(g => g.subs.flatMap(s => s.products).includes(producto))
  return MOTIVOS_POR_CATEGORIA[cat?.group] || [
    'No enciende', 'No calienta', 'Golpe de transporte', 'Falta de piezas', 'Ruido anormal', 'Otro',
  ]
}

const STATUS_CONFIG = {
  'Ingresado':  { label: 'Ingresado',   color: '#6eb5ff', bg: 'rgba(110,181,255,0.12)' },
  'pendiente':  { label: 'Pendiente',   color: '#ffd166', bg: 'rgba(255,209,102,0.12)' },
  'Resolucion': { label: 'Resolución',  color: '#b39dfa', bg: 'rgba(179,157,250,0.12)' },
  'Devolucion': { label: 'Devolución',  color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  'Service':    { label: 'Service',     color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)'  },
  'rechazado':  { label: 'Rechazado',   color: '#ff5577', bg: 'rgba(255,85,119,0.12)'  },
  'cerrado':    { label: 'Cerrado',     color: '#888888', bg: 'rgba(136,136,136,0.1)'  },
}

function StatusBadge({ estado }) {
  const cfg = STATUS_CONFIG[estado] || STATUS_CONFIG['Ingresado']
  return (
    <span style={{
      background: cfg.bg, color: cfg.color,
      border: `1px solid ${cfg.color}40`,
      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
    }}>{cfg.label}</span>
  )
}

function Field({ label, required, children, style = {} }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {label}{required && ' *'}
        </label>
      )}
      {children}
    </div>
  )
}

const inputStyle = {
  background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '10px 14px',
  color: 'var(--text)', fontSize: 14, outline: 'none', width: '100%',
  fontFamily: 'var(--font)',
}

export default function Reclamos() {
  const { user, profile, isAdmin, isAdmin2, isVendedor } = useAuth()
  const [searchParams] = useSearchParams()
  const openTracking = searchParams.get('tracking')
  const [reclamos, setReclamos] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(1)
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editSubmitting, setEditSubmitting] = useState(false)

  const [form, setForm] = useState({
    // Paso 1 — Producto
    producto: '',
    modelo: '',
    canal: '',
    numero_venta_manual: '',
    fecha_compra: '',
    // Paso 2 — Falla
    motivo: '',
    descripcion_falla: '',
    // Paso 3 — Datos de contacto
    direccion: '',
    localidad: '',
    provincia: '',
    codigo_postal: '',
    telefono: '',
    // Paso 4 — Archivos
    imagenes: [],
    comprobantes: [],
  })

  // Pre-cargar datos del perfil cuando abre el modal
  useEffect(() => {
    if (modalOpen && profile) {
      setForm(prev => ({
        ...prev,
        direccion:    profile.direccion    || '',
        localidad:    profile.localidad    || '',
        provincia:    profile.provincia    || '',
        codigo_postal: profile.codigo_postal || '',
        telefono:     profile.telefono     || '',
      }))
    }
  }, [modalOpen, profile])

  useEffect(() => { if (user) load() }, [user])

  async function load() {
    setLoading(true)
    let query = supabase.from('devoluciones').select('*').order('fecha_creacion', { ascending: false })

    if (isVendedor) {
      // Traer emails de los clientes del vendedor
      const { data: clientes } = await supabase
        .from('profiles')
        .select('email')
        .eq('vendedor_id', user.id)
      const emails = (clientes || []).map(c => c.email).filter(Boolean)
      if (emails.length === 0) { setReclamos([]); setLoading(false); return }
      query = query.in('email', emails)
    } else {
      query = query.eq('portal_user_id', user.id)
    }

    const { data } = await query
    setReclamos(data || [])
    setLoading(false)
  }

  function setF(key, val) { setForm(p => ({ ...p, [key]: val })) }

  function generateTrackingId() {
    const now = new Date()
    const date = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`
    const rand = Math.floor(10000 + Math.random() * 90000)
    return `DEV-${date}-${rand}`
  }

  async function uploadFile(file, folder) {
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `${folder}/${Date.now()}_${safeName}`
    const { error } = await supabase.storage.from('devoluciones').upload(path, file, { upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('devoluciones').getPublicUrl(path)
    return data.publicUrl
  }

  async function submit() {
    if (!form.producto) return toast.error('Seleccioná el producto')
    if (!form.motivo)   return toast.error('Seleccioná el motivo')
    if (!form.descripcion_falla.trim()) return toast.error('Describí la falla')

    setSubmitting(true)
    try {
      const tracking_id = generateTrackingId()

      // Subir imágenes y comprobantes
      let imagenes_urls = []
      let comprobantes_urls = []

      if (form.imagenes.length > 0) {
        imagenes_urls = await Promise.all(form.imagenes.map(f => uploadFile(f, 'productos')))
      }
      if (form.comprobantes.length > 0) {
        comprobantes_urls = await Promise.all(form.comprobantes.map(f => uploadFile(f, 'comprobantes')))
      }

      // Calcular días de garantía
      let dias_garantia = null
      if (form.fecha_compra) {
        const diff = Math.floor((new Date() - new Date(form.fecha_compra)) / (1000 * 60 * 60 * 24))
        dias_garantia = diff
      }

      const { error } = await supabase.from('devoluciones').insert({
        tracking_id,
        portal_user_id: user.id,
        nombre_apellido: profile?.full_name || '',
        email: user.email || '',
        telefono: form.telefono || profile?.telefono || '',
        direccion: form.direccion || profile?.direccion || '',
        localidad: form.localidad || profile?.localidad || '',
        provincia: form.provincia || profile?.provincia || '',
        codigo_postal: form.codigo_postal || profile?.codigo_postal || '',
        producto: form.producto,
        modelo: form.modelo || form.producto,
        canal: form.canal,
        numero_venta_manual: form.numero_venta_manual,
        fecha_compra: form.fecha_compra || null,
        dias_garantia,
        motivo: form.motivo,
        descripcion_falla: form.descripcion_falla,
        imagenes_producto_urls: imagenes_urls,
        comprobantes_urls,
        estado: 'Ingresado',
        fecha_ingreso: new Date().toISOString(),
        fecha_creacion: new Date().toISOString(),
      })

      if (error) throw error

      // Enviar email de confirmación al cliente
      try {
        const fechaIngreso = new Date().toLocaleString('es-AR', {
          timeZone: 'America/Argentina/Buenos_Aires',
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit',
        })
        await supabase.functions.invoke('alta-reclamo-email', {
          body: {
            email:              user.email || '',
            nombre:             profile?.full_name || '',
            trackingId:         tracking_id,
            fechaIngreso,
            direccion:          form.direccion    || profile?.direccion    || '',
            localidad:          form.localidad    || profile?.localidad    || '',
            provincia:          form.provincia    || profile?.provincia    || '',
            codigoPostal:       form.codigo_postal || profile?.codigo_postal || '',
            telefono:           form.telefono     || profile?.telefono     || '',
            fechaCompra:        form.fecha_compra || '',
            diasGarantia:       dias_garantia,
            canal:              form.canal || '',
            vendedor:           '',
            ventaManual:        form.numero_venta_manual || '',
            producto:           form.producto,
            modelo:             form.modelo || form.producto,
            motivo:             form.motivo,
            descripcion:        form.descripcion_falla,
            comprobantesUrls:   comprobantes_urls,
            imagenesProductoUrls: imagenes_urls,
          },
        })
      } catch (emailErr) {
        console.warn('Email de confirmación falló:', emailErr)
      }

      toast.success(`Reclamo registrado. Tracking: ${tracking_id}`)
      setModalOpen(false)
      resetForm()
      load()
    } catch (err) {
      toast.error(`Error: ${err.message}`)
    }
    setSubmitting(false)
  }

  function abrirEdicion(r) {
    setEditForm({
      producto: r.producto || '',
      canal: r.canal || '',
      numero_venta_manual: r.numero_venta_manual || '',
      fecha_compra: r.fecha_compra ? r.fecha_compra.slice(0, 10) : '',
      motivo: r.motivo || '',
      descripcion_falla: r.descripcion_falla || '',
      telefono: r.telefono || '',
      direccion: r.direccion || '',
      localidad: r.localidad || '',
      provincia: r.provincia || '',
      codigo_postal: r.codigo_postal || '',
    })
    setEditOpen(true)
  }

  async function guardarEdicion() {
    if (!editForm.producto) return toast.error('Seleccioná el producto')
    if (!editForm.motivo) return toast.error('Seleccioná el motivo')
    if (!editForm.descripcion_falla.trim()) return toast.error('Describí la falla')
    setEditSubmitting(true)
    const { error } = await supabase.from('devoluciones').update({
      producto: editForm.producto,
      modelo: editForm.producto,
      canal: editForm.canal,
      numero_venta_manual: editForm.numero_venta_manual,
      fecha_compra: editForm.fecha_compra || null,
      motivo: editForm.motivo,
      descripcion_falla: editForm.descripcion_falla,
      telefono: editForm.telefono,
      direccion: editForm.direccion,
      localidad: editForm.localidad,
      provincia: editForm.provincia,
      codigo_postal: editForm.codigo_postal,
    }).eq('id', selected.id)
    setEditSubmitting(false)
    if (error) { toast.error('Error al guardar los cambios'); return }
    toast.success('Reclamo actualizado')
    setEditOpen(false)
    await load()
    // Actualizar el selected con los nuevos datos
    setSelected(prev => ({ ...prev, ...editForm }))
  }

  function resetForm() {
    setForm({ producto: '', modelo: '', canal: '', numero_venta_manual: '', fecha_compra: '', motivo: '', descripcion_falla: '', direccion: '', localidad: '', provincia: '', codigo_postal: '', telefono: '', imagenes: [], comprobantes: [] })
    setStep(1)
  }

  function addFiles(key, files) {
    setForm(p => ({ ...p, [key]: [...p[key], ...Array.from(files)] }))
  }
  function removeFile(key, idx) {
    setForm(p => ({ ...p, [key]: p[key].filter((_, i) => i !== idx) }))
  }

  // ── Vista admin ──
  if (isAdmin || isAdmin2) return <AdminReclamos openTracking={openTracking} />

  // ── Vista detalle ──
  if (selected) return (
    <div style={{ animation: 'fadeUp 0.3s ease', maxWidth: 720 }}>
      <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, cursor: 'pointer' }}>
        <ChevronLeft size={15} /> Volver a mis reclamos
      </button>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4, fontFamily: 'monospace' }}>{selected.tracking_id}</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{selected.producto}</h2>
            {selected.modelo && selected.modelo !== selected.producto && (
              <div style={{ fontSize: 13, color: 'var(--text3)', marginTop: 2 }}>{selected.modelo}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <StatusBadge estado={selected.estado} />
            {selected.estado === 'Ingresado' && (
              <button
                onClick={() => abrirEdicion(selected)}
                style={{ background: 'rgba(74,108,247,0.1)', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#7b9fff', cursor: 'pointer' }}
              >
                ✏️ Editar
              </button>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="rec-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 20, padding: '16px', background: 'var(--surface2)', borderRadius: 10 }}>
          {[
            { label: 'Motivo', val: selected.motivo },
            { label: 'Canal de compra', val: selected.canal },
            { label: 'N° de venta', val: selected.numero_venta_manual },
            { label: 'Fecha de compra', val: selected.fecha_compra ? new Date(selected.fecha_compra).toLocaleDateString('es-AR') : null },
            { label: 'Días de garantía', val: selected.dias_garantia != null ? `${selected.dias_garantia} días` : null },
            { label: 'Fecha de ingreso', val: selected.fecha_ingreso ? new Date(selected.fecha_ingreso).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : null },
          ].filter(r => r.val).map(r => (
            <div key={r.label}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{r.label}</div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{r.val}</div>
            </div>
          ))}
        </div>

        {/* Descripción */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Descripción de la falla</div>
          <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text2)', background: 'var(--surface2)', padding: '14px 16px', borderRadius: 8, whiteSpace: 'pre-wrap' }}>
            {selected.descripcion_falla}
          </div>
        </div>

        {/* Novedades / notas del equipo */}
        {selected.notas && (
          <div style={{ padding: '14px 16px', background: 'var(--accent-dim)', border: '1px solid rgba(255,107,43,0.3)', borderRadius: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>⭐ Novedades del equipo TEMPTECH</div>
            {selected.notas.split('\n').filter(l => l.trim()).map((linea, i) => (
              <div key={i} style={{ fontSize: 13, color: 'var(--text2)', padding: '6px 0', borderBottom: i < selected.notas.split('\n').filter(l => l.trim()).length - 1 ? '1px solid rgba(255,107,43,0.15)' : 'none', lineHeight: 1.6 }}>
                {linea}
              </div>
            ))}
          </div>
        )}

        {/* Datos de envío con link de tracking */}
        {(selected.empresa_envio || selected.codigo_seguimiento || selected.fecha_envio) && (
          <div style={{ padding: '14px 16px', background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.25)', borderRadius: 10, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#2dd4bf', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.8px' }}>🚚 Datos de envío</div>
            {selected.empresa_envio && (
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--text3)' }}>Empresa: </span>
                <span style={{ fontWeight: 500 }}>{selected.empresa_envio}</span>
              </div>
            )}
            {selected.codigo_seguimiento && (
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: 'var(--text3)' }}>Código: </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2dd4bf' }}>{selected.codigo_seguimiento}</span>
              </div>
            )}
            {selected.fecha_envio && (
              <div style={{ fontSize: 13, marginBottom: 10 }}>
                <span style={{ color: 'var(--text3)' }}>Fecha de envío: </span>
                {new Date(selected.fecha_envio).toLocaleDateString('es-AR')}
              </div>
            )}
            {selected.codigo_seguimiento && selected.empresa_envio && (
              (() => {
                const links = {
                  'Correo Argentino': `https://www.correoargentino.com.ar/formularios/e-commerce?id=${selected.codigo_seguimiento}`,
                  'Andreani': `https://www.andreani.com/#!/informacionEnvio/${selected.codigo_seguimiento}`,
                }
                const link = links[selected.empresa_envio]
                if (!link) return null
                return (
                  <a href={link} target="_blank" rel="noreferrer" style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 13, fontWeight: 600, color: '#2dd4bf',
                    background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)',
                    borderRadius: 8, padding: '7px 14px', textDecoration: 'none',
                  }}>
                    🔍 Rastrear envío →
                  </a>
                )
              })()
            )}
          </div>
        )}
      </div>
    </div>
  )

  // ── Vista lista ──
  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{isVendedor ? 'Reclamos de mis clientes' : 'Mis Reclamos'}</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>{isVendedor ? 'Reclamos de tus clientes' : 'Registrá y seguí el estado de tus reclamos de garantía'}</p>
        </div>
        {user && (
          <Button variant="danger" onClick={() => { setModalOpen(true); setStep(1) }}>
            <AlertTriangle size={14} /> Nuevo Reclamo
          </Button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Ingresados',  val: reclamos.filter(r => ['Ingresado','pendiente'].includes(r.estado)).length, color: '#6eb5ff', bg: 'rgba(110,181,255,0.08)' },
          { label: 'En proceso',  val: reclamos.filter(r => ['Resolucion','Devolucion','Service'].includes(r.estado)).length, color: '#ffd166', bg: 'rgba(255,209,102,0.08)' },
          { label: 'Cerrados',    val: reclamos.filter(r => r.estado === 'cerrado').length, color: '#3dd68c', bg: 'rgba(61,214,140,0.08)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--radius-lg)', padding: '18px 22px', border: `1px solid ${s.color}25` }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>
      ) : reclamos.length === 0 ? (
        <Empty icon="✅" title="Sin reclamos" description="No tenés reclamos registrados todavía">
          <Button variant="danger" style={{ marginTop: 16 }} onClick={() => setModalOpen(true)}>Registrar reclamo</Button>
        </Empty>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reclamos.map(r => (
            <div
              key={r.id}
              onClick={() => setSelected(r)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '18px 22px',
                display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer', transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateX(4px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateX(0)' }}
            >
              <Package size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>
                  {r.producto}
                  {isVendedor && r.nombre_apellido && (
                    <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 400, color: 'var(--text3)' }}>👤 {r.nombre_apellido}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                  <span style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{r.tracking_id}</span>
                  {' · '}{r.motivo}
                  {' · '}{formatDistanceToNow(new Date(r.fecha_creacion), { addSuffix: true, locale: es })}
                </div>
              </div>
              <StatusBadge estado={r.estado} />
            </div>
          ))}
        </div>
      )}

      {/* ── Modal editar reclamo ── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="✏️ Editar Reclamo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ padding: '10px 14px', background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.2)', borderRadius: 10, fontSize: 13, color: 'var(--text2)' }}>
            ⚠️ Solo podés editar reclamos en estado <strong>Ingresado</strong>.
          </div>

          <Field label="Producto *">
            <select value={editForm.producto} onChange={e => setEditForm(p => ({ ...p, producto: e.target.value }))} style={inputStyle}>
              <option value="">Seleccioná el producto...</option>
              {PRODUCT_CATALOG.map(g => (
                <optgroup key={g.group} label={`${g.emoji} ${g.group}`}>
                  {g.subs.flatMap(s => s.products).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Canal de compra">
              <select value={editForm.canal} onChange={e => setEditForm(p => ({ ...p, canal: e.target.value }))} style={inputStyle}>
                <option value="">Seleccioná...</option>
                {CANALES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="N° de pedido / venta">
              <input value={editForm.numero_venta_manual} onChange={e => setEditForm(p => ({ ...p, numero_venta_manual: e.target.value }))} placeholder="Ej: 88421" style={inputStyle} />
            </Field>
          </div>

          <Field label="Fecha de compra">
            <input type="date" value={editForm.fecha_compra} onChange={e => setEditForm(p => ({ ...p, fecha_compra: e.target.value }))} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </Field>

          <Field label="Motivo del reclamo *">
            <select value={editForm.motivo} onChange={e => setEditForm(p => ({ ...p, motivo: e.target.value }))} style={inputStyle}>
              <option value="">Seleccioná el motivo...</option>
              {getMotivos(editForm.producto).map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>

          <Field label="Descripción de la falla *">
            <textarea
              value={editForm.descripcion_falla}
              onChange={e => setEditForm(p => ({ ...p, descripcion_falla: e.target.value }))}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
            />
          </Field>

          <Field label="Teléfono">
            <input value={editForm.telefono} onChange={e => setEditForm(p => ({ ...p, telefono: e.target.value }))} style={inputStyle} />
          </Field>

          <Field label="Dirección">
            <input value={editForm.direccion} onChange={e => setEditForm(p => ({ ...p, direccion: e.target.value }))} style={inputStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Localidad">
              <input value={editForm.localidad} onChange={e => setEditForm(p => ({ ...p, localidad: e.target.value }))} style={inputStyle} />
            </Field>
            <Field label="Código Postal">
              <input value={editForm.codigo_postal} onChange={e => setEditForm(p => ({ ...p, codigo_postal: e.target.value }))} style={inputStyle} />
            </Field>
          </div>

          <Field label="Provincia">
            <select value={editForm.provincia} onChange={e => setEditForm(p => ({ ...p, provincia: e.target.value }))} style={inputStyle}>
              <option value="">Seleccioná...</option>
              {['Buenos Aires','CABA','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Field>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={guardarEdicion} loading={editSubmitting}>💾 Guardar cambios</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal nuevo reclamo ── */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title="⚠️ Registrar Reclamo de Garantía">
        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24 }}>
          {['Producto', 'Falla', 'Contacto', 'Archivos'].map((label, i) => {
            const n = i + 1
            const done = step > n
            const active = step === n
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: done || active ? 'linear-gradient(135deg,#e8215a,#4a6cf7)' : 'var(--surface2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: done || active ? '#fff' : 'var(--text3)',
                  }}>{done ? '✓' : n}</div>
                  <span style={{ fontSize: 10, color: active ? 'var(--text)' : 'var(--text3)', fontWeight: active ? 600 : 400 }}>{label}</span>
                </div>
                {i < 3 && <div style={{ height: 2, flex: 1, background: step > n ? 'linear-gradient(90deg,#e8215a,#4a6cf7)' : 'var(--border)', marginBottom: 18 }} />}
              </div>
            )
          })}
        </div>

        {/* PASO 1 — Producto */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Producto *">
              <select value={form.producto} onChange={e => setF('producto', e.target.value)} style={inputStyle}>
                <option value="">Seleccioná el producto...</option>
                {PRODUCT_CATALOG.map(g => (
                  <optgroup key={g.group} label={`${g.emoji} ${g.group}`}>
                    {g.subs.flatMap(s => s.products).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Canal de compra">
                <select value={form.canal} onChange={e => setF('canal', e.target.value)} style={inputStyle}>
                  <option value="">Seleccioná...</option>
                  {CANALES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="N° de pedido / venta">
                <input value={form.numero_venta_manual} onChange={e => setF('numero_venta_manual', e.target.value)} placeholder="Ej: 88421" style={inputStyle} />
              </Field>
            </div>

            <Field label="Fecha de compra">
              <input type="date" value={form.fecha_compra} onChange={e => setF('fecha_compra', e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
            </Field>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Button variant="ghost" onClick={() => { setModalOpen(false); resetForm() }}>Cancelar</Button>
              <Button onClick={() => { if (!form.producto) return toast.error('Seleccioná el producto'); setStep(2) }}>Continuar →</Button>
            </div>
          </div>
        )}

        {/* PASO 2 — Falla */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Motivo del reclamo *">
              <select value={form.motivo} onChange={e => setF('motivo', e.target.value)} style={inputStyle}>
                <option value="">Seleccioná el motivo...</option>
                {getMotivos(form.producto).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>

            <Field label="Descripción de la falla *">
              <textarea
                value={form.descripcion_falla}
                onChange={e => setF('descripcion_falla', e.target.value)}
                placeholder="Describí el problema con el mayor detalle posible. ¿Cuándo empezó? ¿En qué condiciones ocurre?"
                rows={5}
                style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
              />
            </Field>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Button variant="ghost" onClick={() => setStep(1)}>← Atrás</Button>
              <Button onClick={() => { if (!form.motivo || !form.descripcion_falla.trim()) return toast.error('Completá los campos requeridos'); setStep(3) }}>Continuar →</Button>
            </div>
          </div>
        )}

        {/* PASO 3 — Contacto */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '10px 14px', background: 'rgba(110,181,255,0.08)', border: '1px solid rgba(110,181,255,0.2)', borderRadius: 10, fontSize: 13, color: 'var(--text2)' }}>
              📋 Verificá que tus datos de contacto sean correctos para coordinar el reclamo.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Teléfono *</label>
              <input value={form.telefono} onChange={e => setF('telefono', e.target.value)} placeholder="+54 11 1234-5678" style={inputStyle} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Dirección</label>
              <input value={form.direccion} onChange={e => setF('direccion', e.target.value)} placeholder="Av. Corrientes 1234, Piso 3" style={inputStyle} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Localidad</label>
                <input value={form.localidad} onChange={e => setF('localidad', e.target.value)} placeholder="Buenos Aires" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Código Postal</label>
                <input value={form.codigo_postal} onChange={e => setF('codigo_postal', e.target.value)} placeholder="1234" style={inputStyle} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Provincia</label>
              <select value={form.provincia} onChange={e => setF('provincia', e.target.value)} style={inputStyle}>
                <option value="">Seleccioná...</option>
                {['Buenos Aires','CABA','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán'].map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Button variant="ghost" onClick={() => setStep(2)}>← Atrás</Button>
              <Button onClick={() => { if (!form.telefono.trim()) return toast.error('Ingresá tu teléfono'); setStep(4) }}>Continuar →</Button>
            </div>
          </div>
        )}

        {/* PASO 4 — Archivos */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ padding: '12px 16px', background: 'rgba(110,181,255,0.08)', border: '1px solid rgba(110,181,255,0.2)', borderRadius: 10, fontSize: 13, color: 'var(--text2)' }}>
              📎 Adjuntá fotos del producto y el comprobante de compra para agilizar el proceso.
            </div>

            {/* Fotos del producto */}
            <Field label="Fotos del producto (opcional)">
              {form.imagenes.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {form.imagenes.map((f, i) => (
                    <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      🖼 <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text2)' }}>{f.name}</span>
                      <button onClick={() => removeFile('imagenes', i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 13, color: 'var(--text2)' }}>
                <Upload size={14} /> Agregar fotos
                <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => addFiles('imagenes', e.target.files)} />
              </label>
            </Field>

            {/* Comprobante de compra */}
            <Field label="Comprobante de compra (opcional)">
              {form.comprobantes.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {form.comprobantes.map((f, i) => (
                    <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                      📄 <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text2)' }}>{f.name}</span>
                      <button onClick={() => removeFile('comprobantes', i)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 13, color: 'var(--text2)' }}>
                <Upload size={14} /> Agregar comprobante
                <input type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }} onChange={e => addFiles('comprobantes', e.target.files)} />
              </label>
            </Field>

            {/* Resumen */}
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', fontSize: 13 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Resumen del reclamo</div>
              <div style={{ color: 'var(--text2)', lineHeight: 1.9 }}>
                <div><span style={{ color: 'var(--text3)' }}>Producto: </span>{form.producto}</div>
                {form.canal && <div><span style={{ color: 'var(--text3)' }}>Canal: </span>{form.canal}</div>}
                <div><span style={{ color: 'var(--text3)' }}>Motivo: </span>{form.motivo}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
              <Button variant="ghost" onClick={() => setStep(3)}>← Atrás</Button>
              <Button variant="danger" onClick={submit} loading={submitting}>
                <AlertTriangle size={14} /> Enviar reclamo
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
