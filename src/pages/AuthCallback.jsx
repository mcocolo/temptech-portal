import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui'
import { ChevronRight, ChevronDown, Check } from 'lucide-react'
import toast from 'react-hot-toast'

const LOGO_URL = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagen-Corporativa/Temptech_LogoHorizontal.png'

const PROVINCIAS = [
  'Buenos Aires','CABA','Catamarca','Chaco','Chubut','Córdoba',
  'Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja',
  'Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan',
  'San Luis','Santa Cruz','Santa Fe','Santiago del Estero',
  'Tierra del Fuego','Tucumán',
]

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

const USER_TYPES = [
  { value: 'client',       label: 'Soy Usuario',         emoji: '👤', desc: 'Uso personal',          color: '#7b9fff', bg: 'rgba(74,108,247,0.1)',   border: 'rgba(74,108,247,0.35)' },
  { value: 'distributor',  label: 'Soy Distribuidor',     emoji: '🏪', desc: 'Distribuidor comercial', color: '#ffd166', bg: 'rgba(255,209,102,0.1)', border: 'rgba(255,209,102,0.35)' },
  { value: 'tech_service', label: 'Soy Servicio Técnico', emoji: '🔧', desc: 'Técnico instalador',     color: '#3dd68c', bg: 'rgba(61,214,140,0.1)',  border: 'rgba(61,214,140,0.35)' },
]

function Field({ label, required, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}{required && ' *'}</label>}
      <input style={{
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '10px 14px',
        color: 'var(--text)', fontSize: 14, outline: 'none',
        transition: 'border .2s', width: '100%', fontFamily: 'var(--font)',
      }}
        onFocus={e => e.target.style.borderColor = 'rgba(74,108,247,0.6)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
        {...props}
      />
    </div>
  )
}

function SelectField({ label, options, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</label>}
      <select style={{
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '10px 14px',
        color: 'var(--text)', fontSize: 14, outline: 'none', width: '100%', fontFamily: 'var(--font)',
      }} {...props}>
        <option value="">Seleccioná...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function ProductMultiSelect({ selected, onChange }) {
  const [open, setOpen] = useState(null)
  const toggle = (p) => onChange(selected.includes(p) ? selected.filter(x => x !== p) : [...selected, p])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        Productos de interés <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none' }}>(opcional)</span>
      </label>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {selected.map(p => (
            <span key={p} style={{ background: 'rgba(74,108,247,0.15)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', fontSize: 11, padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
              {p.replace('TEMPTECH ', '').replace('Eléctrico ', '').substring(0, 28)}
              <button onClick={() => toggle(p)} style={{ background: 'none', border: 'none', color: '#7b9fff', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
        </div>
      )}
      {PRODUCT_CATALOG.map(g => {
        const isOpen = open === g.group
        const cnt = g.subs.flatMap(s => s.products).filter(p => selected.includes(p)).length
        return (
          <div key={g.group} style={{ border: `1px solid ${isOpen ? 'rgba(74,108,247,0.4)' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden' }}>
            <div onClick={() => setOpen(isOpen ? null : g.group)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', cursor: 'pointer', background: isOpen ? 'rgba(74,108,247,0.08)' : 'var(--surface2)' }}>
              <span>{g.emoji}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: isOpen ? '#7b9fff' : 'var(--text2)' }}>{g.group}</span>
              {cnt > 0 && <span style={{ fontSize: 11, background: 'rgba(74,108,247,0.2)', color: '#7b9fff', padding: '1px 7px', borderRadius: 20 }}>{cnt}</span>}
              <ChevronDown size={13} color={isOpen ? '#7b9fff' : 'var(--text3)'} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid rgba(74,108,247,0.2)', background: 'var(--surface)', maxHeight: 180, overflowY: 'auto' }}>
                {g.subs.map(sub => (
                  <div key={sub.label}>
                    {g.subs.length > 1 && <div style={{ padding: '5px 12px 2px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', background: 'var(--surface2)' }}>{sub.label}</div>}
                    {sub.products.map(p => (
                      <div key={p} onClick={() => toggle(p)} style={{ padding: '8px 14px', fontSize: 12, cursor: 'pointer', background: selected.includes(p) ? 'rgba(74,108,247,0.1)' : 'transparent', color: selected.includes(p) ? '#7b9fff' : 'var(--text2)', display: 'flex', alignItems: 'center', gap: 8 }}
                        onMouseEnter={e => { if (!selected.includes(p)) e.currentTarget.style.background = 'var(--surface3)' }}
                        onMouseLeave={e => { if (!selected.includes(p)) e.currentTarget.style.background = 'transparent' }}
                      >
                        <div style={{ width: 16, height: 16, borderRadius: 4, flexShrink: 0, border: `2px solid ${selected.includes(p) ? '#7b9fff' : 'var(--border2)'}`, background: selected.includes(p) ? '#7b9fff' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selected.includes(p) && <Check size={10} color="#fff" strokeWidth={3} />}
                        </div>
                        {p}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function AuthCallback() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [step, setStep]         = useState(1) // 1=tipo, 2=datos extra
  const [saving, setSaving]     = useState(false)
  const [userType, setUserType] = useState('')
  const [googleUser, setGoogleUser] = useState(null) // datos que ya vienen de Google

  // Datos extra mínimos
  const [telefono, setTelefono]     = useState('')
  const [direccion, setDireccion]   = useState('')
  const [localidad, setLocalidad]   = useState('')
  const [provincia, setProvincia]   = useState('')
  const [productos, setProductos]   = useState([])
  const [razonSocial, setRazonSocial] = useState('')
  const [cuit, setCuit]             = useState('')

  useEffect(() => {
    async function check() {
      // Pequeña espera para que Supabase procese el token OAuth
      await new Promise(r => setTimeout(r, 1000))

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { navigate('/auth'); return }

      const u = session.user
      setGoogleUser({
        id:        u.id,
        email:     u.email,
        full_name: u.user_metadata?.full_name || u.user_metadata?.name || '',
        avatar:    u.user_metadata?.avatar_url || '',
      })

      // Verificar si ya completó el perfil
      const { data: cliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('profile_id', u.id)
        .single()

      if (cliente?.id) {
        // Ya tiene perfil completo → dashboard directo
        navigate('/dashboard')
      } else {
        // Primera vez → mostrar formulario mínimo
        setChecking(false)
      }
    }
    check()
  }, [])

  async function saveData() {
    if (!userType) return toast.error('Seleccioná tu tipo de cuenta')
    if (!telefono.trim()) return toast.error('Ingresá tu teléfono')
    if ((userType === 'distributor' || userType === 'tech_service') && !razonSocial.trim()) return toast.error('Ingresá la razón social')
    if ((userType === 'distributor' || userType === 'tech_service') && !cuit.trim()) return toast.error('Ingresá el CUIT')

    setSaving(true)

    // Actualizar profiles
    await supabase.from('profiles').update({
      full_name:  googleUser.full_name,
      email:      googleUser.email,
      user_type:  userType,
      telefono,
      ...(userType === 'client' ? {
        direccion, localidad, provincia,
        productos_interesados: productos,
      } : {
        razon_social: razonSocial,
        cuit,
      }),
    }).eq('id', googleUser.id)

    // Insertar en clientes
    const { error } = await supabase.from('clientes').upsert({
      profile_id: googleUser.id,
      user_type:  userType,
      full_name:  googleUser.full_name,
      email:      googleUser.email,
      telefono,
      ...(userType === 'client' ? {
        direccion, localidad, provincia,
        productos_interesados: productos,
      } : {
        razon_social: razonSocial,
        cuit,
      }),
    }, { onConflict: 'profile_id' })

    if (error) {
      toast.error('Error al guardar los datos')
      setSaving(false)
      return
    }

    toast.success('¡Bienvenido a TEMPTECH!')
    navigate('/dashboard')
    setSaving(false)
  }

  // ── Cargando ──
  if (checking) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <img src={LOGO_URL} alt="TEMPTECH" style={{ height: 36, objectFit: 'contain', marginBottom: 8 }} onError={e => e.currentTarget.style.display = 'none'} />
      <Spinner size={28} />
      <div style={{ fontSize: 13, color: 'var(--text3)' }}>Verificando tu cuenta...</div>
    </div>
  )

  const selectedType = USER_TYPES.find(t => t.value === userType)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(42,69,201,0.12) 0%, transparent 70%)' }} />

      <div style={{ width: '100%', maxWidth: 520, position: 'relative', zIndex: 1, animation: 'fadeUp 0.35s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <img src={LOGO_URL} alt="TEMPTECH" style={{ height: 36, objectFit: 'contain' }} onError={e => e.currentTarget.style.display = 'none'} />
        </div>

        {/* Bienvenida con datos de Google */}
        {googleUser?.avatar && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
            <img src={googleUser.avatar} alt="" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{googleUser.full_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{googleUser.email}</div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--green)', background: 'var(--green-dim)', padding: '3px 10px', borderRadius: 20, fontWeight: 600 }}>
              ✓ Google
            </div>
          </div>
        )}

        <div style={{ width: '100%', height: 3, borderRadius: '3px 3px 0 0', background: 'var(--brand-gradient)', marginBottom: -1 }} />
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: 32 }}>

          {/* PASO 1 — Solo el tipo de cuenta */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>¡Un último paso!</h2>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>¿Cómo vas a usar el portal TEMPTECH?</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {USER_TYPES.map(t => (
                  <div key={t.value} onClick={() => setUserType(t.value)} style={{
                    border: `2px solid ${userType === t.value ? t.border : 'var(--border)'}`,
                    background: userType === t.value ? t.bg : 'var(--surface2)',
                    borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14, transition: 'all .15s',
                  }}
                    onMouseEnter={e => { if (userType !== t.value) e.currentTarget.style.borderColor = t.border }}
                    onMouseLeave={e => { if (userType !== t.value) e.currentTarget.style.borderColor = 'var(--border)' }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: userType === t.value ? t.bg : 'var(--surface3)', border: `1px solid ${userType === t.value ? t.border : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                      {t.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: userType === t.value ? t.color : 'var(--text)', marginBottom: 2 }}>{t.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{t.desc}</div>
                    </div>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${userType === t.value ? t.color : 'var(--border)'}`, background: userType === t.value ? t.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {userType === t.value && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff' }} />}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => { if (!userType) return toast.error('Seleccioná un tipo de cuenta'); setStep(2) }} style={{
                  background: 'var(--brand-gradient)', border: 'none', borderRadius: 'var(--radius)',
                  color: '#fff', padding: '11px 24px', fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  Continuar <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* PASO 2 — Datos mínimos según tipo */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                {selectedType?.emoji} {selectedType?.label}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>
                Solo necesitamos un par de datos más
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 13, maxHeight: '50vh', overflowY: 'auto', paddingRight: 4 }}>

                {/* Teléfono — siempre */}
                <Field label="Teléfono" required placeholder="+54 11 1234-5678" value={telefono} onChange={e => setTelefono(e.target.value)} />

                {/* Cliente: dirección + productos */}
                {userType === 'client' && (
                  <>
                    <Field label="Dirección" placeholder="Av. Corrientes 1234 (opcional)" value={direccion} onChange={e => setDireccion(e.target.value)} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="Localidad" placeholder="Buenos Aires" value={localidad} onChange={e => setLocalidad(e.target.value)} />
                      <SelectField label="Provincia" options={PROVINCIAS} value={provincia} onChange={e => setProvincia(e.target.value)} />
                    </div>
                    <ProductMultiSelect selected={productos} onChange={setProductos} />
                  </>
                )}

                {/* Distribuidor / Técnico: razón social + CUIT */}
                {(userType === 'distributor' || userType === 'tech_service') && (
                  <>
                    <Field label="Razón Social" required placeholder="Mi Empresa S.A." value={razonSocial} onChange={e => setRazonSocial(e.target.value)} />
                    <Field label="CUIT" required placeholder="20-12345678-9" value={cuit} onChange={e => setCuit(e.target.value)} />
                  </>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>
                  ← Atrás
                </button>
                <button onClick={saveData} disabled={saving} style={{
                  background: saving ? 'var(--surface3)' : 'var(--brand-gradient)',
                  border: 'none', borderRadius: 'var(--radius)', color: '#fff',
                  padding: '11px 28px', fontSize: 14, fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {saving && <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
                  Guardar y entrar
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text3)' }}>
          © {new Date().getFullYear()} TEMPTECH · Todos los derechos reservados
        </div>
      </div>
    </div>
  )
}
