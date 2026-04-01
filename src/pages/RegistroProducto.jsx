import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Modal, Spinner, Empty } from '@/components/ui'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Package, Upload, CheckCircle } from 'lucide-react'

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
  { group: 'Anafes Vitro', emoji: '🍳', subs: [{ label: 'Anafes', products: ['Anafe Vitro (consulta general)'] }] },
]

const CANALES = ['Mercado Libre', 'Tienda Nube', 'WhatsApp', 'Instagram', 'Distribuidor', 'Otro']
const PROVINCIAS = ['Buenos Aires','CABA','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán']

const inputStyle = {
  background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '10px 14px',
  color: 'var(--text)', fontSize: 14, outline: 'none', width: '100%',
  fontFamily: 'var(--font)',
}

function Field({ label, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}{required && ' *'}</label>}
      {children}
    </div>
  )
}

export default function RegistroProducto() {
  const { user, profile } = useAuth()
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [comprobante, setComprobante] = useState(null)

  const [form, setForm] = useState({
    producto: '', canal: '', numero_pedido: '', fecha_compra: '',
    direccion: '', localidad: '', provincia: '', codigo_postal: '', telefono: '',
  })

  useEffect(() => { if (user) load() }, [user])

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

  function setF(k, v) { setForm(p => ({ ...p, [k]: v })) }

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('productos_registrados')
      .select('*')
      .eq('portal_user_id', user.id)
      .order('created_at', { ascending: false })
    setProductos(data || [])
    setLoading(false)
  }

  async function submit() {
    if (!form.producto) return toast.error('Seleccioná el producto')
    if (!form.fecha_compra) return toast.error('Ingresá la fecha de compra')

    setSubmitting(true)
    try {
      let comprobante_url = null
      if (comprobante) {
        const safeName = comprobante.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `comprobantes/${user.id}/${Date.now()}_${safeName}`
        const { error: upErr } = await supabase.storage.from('devoluciones').upload(path, comprobante, { upsert: false })
        if (upErr) throw upErr
        const { data } = supabase.storage.from('devoluciones').getPublicUrl(path)
        comprobante_url = data.publicUrl
      }

      const { error } = await supabase.from('productos_registrados').insert({
        portal_user_id: user.id,
        nombre_apellido: profile?.full_name || '',
        email: user.email || '',
        telefono: form.telefono,
        direccion: form.direccion,
        localidad: form.localidad,
        provincia: form.provincia,
        codigo_postal: form.codigo_postal,
        producto: form.producto,
        canal: form.canal,
        numero_pedido: form.numero_pedido,
        fecha_compra: form.fecha_compra,
        comprobante_url,
      })

      if (error) throw error
      toast.success('Producto registrado exitosamente ✅')
      setModalOpen(false)
      resetForm()
      load()
    } catch (err) {
      toast.error(`Error: ${err.message}`)
    }
    setSubmitting(false)
  }

  function resetForm() {
    setForm({ producto: '', canal: '', numero_pedido: '', fecha_compra: '', direccion: '', localidad: '', provincia: '', codigo_postal: '', telefono: '' })
    setComprobante(null)
  }

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Registrá tu producto</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Registrá tu compra para activar la garantía y acceder a soporte prioritario</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Package size={14} /> Registrar producto
        </Button>
      </div>

      {/* Beneficios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { emoji: '🛡️', title: 'Garantía activada', desc: 'Tu garantía queda registrada desde la fecha de compra' },
          { emoji: '⚡', title: 'Soporte prioritario', desc: 'Acceso más rápido al equipo de soporte técnico' },
          { emoji: '📦', title: 'Historial de compras', desc: 'Todos tus productos TEMPTECH en un solo lugar' },
        ].map(b => (
          <div key={b.title} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>{b.emoji}</div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{b.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>{b.desc}</div>
          </div>
        ))}
      </div>

      {/* Lista de productos registrados */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>
      ) : productos.length === 0 ? (
        <Empty icon="📦" title="Sin productos registrados" description="Registrá tu primera compra TEMPTECH">
          <Button style={{ marginTop: 16 }} onClick={() => setModalOpen(true)}>Registrar producto</Button>
        </Empty>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {productos.map(p => (
            <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CheckCircle size={20} color="var(--green)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.producto}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                  {p.canal && <span>{p.canal} · </span>}
                  {p.fecha_compra && <span>Comprado el {new Date(p.fecha_compra).toLocaleDateString('es-AR')} · </span>}
                  {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: es })}
                </div>
              </div>
              <span style={{ background: 'rgba(61,214,140,0.1)', color: 'var(--green)', border: '1px solid rgba(61,214,140,0.25)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>
                ✓ Registrado
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={null} title="📦 Registrar Producto">
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
            <Field label="N° de pedido / factura">
              <input value={form.numero_pedido} onChange={e => setF('numero_pedido', e.target.value)} placeholder="Ej: 88421" style={inputStyle} />
            </Field>
          </div>

          <Field label="Fecha de compra *">
            <input type="date" value={form.fecha_compra} onChange={e => setF('fecha_compra', e.target.value)} style={{ ...inputStyle, colorScheme: 'dark' }} />
          </Field>

          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
          <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Datos de contacto</div>

          <Field label="Teléfono">
            <input value={form.telefono} onChange={e => setF('telefono', e.target.value)} placeholder="+54 11 1234-5678" style={inputStyle} />
          </Field>

          <Field label="Dirección">
            <input value={form.direccion} onChange={e => setF('direccion', e.target.value)} placeholder="Av. Corrientes 1234" style={inputStyle} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Localidad">
              <input value={form.localidad} onChange={e => setF('localidad', e.target.value)} placeholder="Buenos Aires" style={inputStyle} />
            </Field>
            <Field label="Código Postal">
              <input value={form.codigo_postal} onChange={e => setF('codigo_postal', e.target.value)} placeholder="1234" style={inputStyle} />
            </Field>
          </div>

          <Field label="Provincia">
            <select value={form.provincia} onChange={e => setF('provincia', e.target.value)} style={inputStyle}>
              <option value="">Seleccioná...</option>
              {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          <Field label="Comprobante de compra (opcional)">
            {comprobante ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📎 {comprobante.name}</span>
                <button onClick={() => setComprobante(null)} style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', fontSize: 18, padding: 0 }}>×</button>
              </div>
            ) : (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 13, color: 'var(--text2)' }}>
                <Upload size={14} /> Adjuntar comprobante
                <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => setComprobante(e.target.files?.[0] || null)} />
              </label>
            )}
          </Field>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={() => { setModalOpen(false); resetForm() }}>Cancelar</Button>
            <Button onClick={submit} loading={submitting}>
              <Package size={14} /> Registrar producto
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
