import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { ChevronDown, ChevronRight, Check, Mail } from 'lucide-react'

const LOGO_URL = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagen-Corporativa/Temptech_LogoHorizontal.png'

// ── Catálogo de productos ──
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

const PROVINCIAS = [
  'Buenos Aires','CABA','Catamarca','Chaco','Chubut','Córdoba',
  'Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja',
  'Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan',
  'San Luis','Santa Cruz','Santa Fe','Santiago del Estero',
  'Tierra del Fuego','Tucumán',
]

const USER_TYPES = [
  { value: 'client',       label: 'Soy Usuario',          emoji: '👤', desc: 'Compro productos TEMPTECH para uso personal',      color: '#7b9fff', bg: 'rgba(74,108,247,0.1)',   border: 'rgba(74,108,247,0.35)' },
  { value: 'distributor',  label: 'Soy Distribuidor',      emoji: '🏪', desc: 'Distribuyo o comercializo productos TEMPTECH',     color: '#ffd166', bg: 'rgba(255,209,102,0.1)', border: 'rgba(255,209,102,0.35)' },
  { value: 'tech_service', label: 'Soy Servicio Técnico',  emoji: '🔧', desc: 'Realizo instalaciones y reparaciones TEMPTECH',    color: '#3dd68c', bg: 'rgba(61,214,140,0.1)',  border: 'rgba(61,214,140,0.35)' },
]

// ── Helpers de UI ──
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

function SelectField({ label, options, required, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}{required && ' *'}</label>}
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

function GradientBtn({ children, loading, onClick, style = {} }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      background: loading ? 'var(--surface3)' : 'var(--brand-gradient)',
      border: 'none', borderRadius: 'var(--radius)', color: '#fff',
      padding: '11px 24px', fontSize: 14, fontWeight: 600,
      cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      opacity: loading ? 0.7 : 1, transition: 'opacity .2s',
      ...style,
    }}>
      {loading && <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
      {children}
    </button>
  )
}

// ── Multi-select productos ──
function ProductMultiSelect({ selected, onChange }) {
  const [open, setOpen] = useState(null)
  const toggle = (p) => onChange(selected.includes(p) ? selected.filter(x => x !== p) : [...selected, p])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        Productos de interés (opcional)
      </label>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 4 }}>
          {selected.map(p => (
            <span key={p} style={{ background: 'rgba(74,108,247,0.15)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', fontSize: 11, padding: '3px 8px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
              {p.replace('TEMPTECH ', '').replace('Eléctrico ', '').replace('Eléctrica ', '').substring(0, 30)}
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
              <div style={{ borderTop: '1px solid rgba(74,108,247,0.2)', background: 'var(--surface)', maxHeight: 200, overflowY: 'auto' }}>
                {g.subs.map(sub => (
                  <div key={sub.label}>
                    {g.subs.length > 1 && <div style={{ padding: '5px 12px 2px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', background: 'var(--surface2)' }}>{sub.label}</div>}
                    {sub.products.map(p => (
                      <div key={p} onClick={() => toggle(p)} style={{
                        padding: '8px 14px', fontSize: 12, cursor: 'pointer',
                        background: selected.includes(p) ? 'rgba(74,108,247,0.1)' : 'transparent',
                        color: selected.includes(p) ? '#7b9fff' : 'var(--text2)',
                        display: 'flex', alignItems: 'center', gap: 8, transition: 'all .1s',
                      }}
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

// ── Stepper ──
function Stepper({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 28 }}>
      {['Tipo de cuenta', 'Tus datos', 'Acceso'].map((label, i) => {
        const n = i + 1
        const done = step > n
        const active = step === n
        return (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: done || active ? 'var(--brand-gradient)' : 'var(--surface2)',
                border: `2px solid ${done || active ? 'transparent' : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: done || active ? '#fff' : 'var(--text3)',
              }}>
                {done ? <Check size={14} /> : n}
              </div>
              <span style={{ fontSize: 11, color: active ? 'var(--text)' : 'var(--text3)', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < 2 && <div style={{ width: 60, height: 2, background: step > n ? 'var(--brand-gradient)' : 'var(--border)', margin: '0 8px', marginBottom: 20, flexShrink: 0 }} />}
          </div>
        )
      })}
    </div>
  )
}

export default function Auth() {
  const [mode, setMode]         = useState('login')
  const [step, setStep]         = useState(1)
  const [loading, setLoading]   = useState(false)
  const [registered, setRegistered] = useState(false) // pantalla de confirmación
  const { signIn, signInWithGoogle, signUp } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  // Login
  const [loginEmail, setLoginEmail]       = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Registro
  const [userType, setUserType] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')

  const [clientData, setClientData] = useState({
    full_name: '', direccion: '', localidad: '', provincia: '',
    telefono: '', productos_interesados: [],
  })
  const [bizData, setBizData] = useState({
    razon_social: '', cuit: '', full_name: '', telefono: '',
  })

  // Detectar callback de Google OAuth
  useEffect(() => {
    const hash = location.hash
    if (hash && hash.includes('access_token')) {
      navigate('/dashboard')
    }
  }, [location])

  // ── LOGIN ──
  async function handleLogin() {
    if (!loginEmail || !loginPassword) return toast.error('Completá email y contraseña')
    setLoading(true)
    const { error } = await signIn(loginEmail, loginPassword)
    if (error) {
      if (error.message.includes('Email not confirmed')) {
        toast.error('Confirmá tu email antes de ingresar. Revisá tu bandeja de entrada.')
      } else {
        toast.error('Email o contraseña incorrectos')
      }
      setLoading(false)
      return
    }
    navigate('/dashboard')
    setLoading(false)
  }

  // ── GOOGLE LOGIN ──
  async function handleGoogle() {
    setLoading(true)
    const { error } = await signInWithGoogle()
    if (error) { toast.error('Error al conectar con Google'); setLoading(false) }
    // Supabase redirige automáticamente, no hace falta navigate
  }

  // ── VALIDACIONES POR PASO ──
  function validateStep2() {
    if (userType === 'client') {
      if (!clientData.full_name.trim()) return 'Ingresá tu nombre completo'
      if (!clientData.telefono.trim()) return 'Ingresá tu teléfono'
    } else {
      if (!bizData.razon_social.trim()) return 'Ingresá la razón social'
      if (!bizData.cuit.trim()) return 'Ingresá el CUIT'
      if (!bizData.full_name.trim()) return 'Ingresá nombre y apellido'
      if (!bizData.telefono.trim()) return 'Ingresá el teléfono'
    }
    return null
  }

  function validateStep3() {
    if (!email.trim()) return 'Ingresá tu email'
    if (!email.includes('@')) return 'El email no es válido'
    if (!password) return 'Ingresá una contraseña'
    if (password.length < 6) return 'La contraseña debe tener al menos 6 caracteres'
    if (password !== confirmPass) return 'Las contraseñas no coinciden'
    return null
  }

  // ── REGISTRO ──
  async function handleRegister() {
    const err = validateStep3()
    if (err) return toast.error(err)

    setLoading(true)
    const fullName = userType === 'client' ? clientData.full_name : bizData.full_name

    // 1. Crear usuario en Auth
    const { data, error } = await signUp(email, password, fullName)
    if (error) {
      toast.error(error.message === 'User already registered' ? 'Ya existe una cuenta con ese email' : error.message)
      setLoading(false)
      return
    }

    const userId = data?.user?.id
    if (!userId) {
      // Supabase requiere confirmación de email → el user no está disponible aún
      // Guardamos los datos pendientes para cuando confirme
      setRegistered(true)
      setLoading(false)
      return
    }

    // 2. Actualizar profiles
    await supabase.from('profiles').update({
      full_name: fullName,
      email,
      user_type: userType,
      telefono: userType === 'client' ? clientData.telefono : bizData.telefono,
      ...(userType === 'client' ? {
        direccion: clientData.direccion,
        localidad: clientData.localidad,
        provincia: clientData.provincia,
        productos_interesados: clientData.productos_interesados,
      } : {
        razon_social: bizData.razon_social,
        cuit: bizData.cuit,
      }),
    }).eq('id', userId)

    // 3. Insertar en tabla clientes
    await supabase.from('clientes').insert({
      profile_id: userId,
      user_type:  userType,
      full_name:  fullName,
      email,
      telefono: userType === 'client' ? clientData.telefono : bizData.telefono,
      ...(userType === 'client' ? {
        direccion:  clientData.direccion,
        localidad:  clientData.localidad,
        provincia:  clientData.provincia,
        productos_interesados: clientData.productos_interesados,
      } : {
        razon_social: bizData.razon_social,
        cuit:         bizData.cuit,
      }),
    })

    setRegistered(true)
    setLoading(false)
  }

  // ── PANTALLA: EMAIL CONFIRMACIÓN ENVIADO ──
  if (registered) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, width: '100%', textAlign: 'center', animation: 'fadeUp 0.4s ease' }}>
        <img src={LOGO_URL} alt="TEMPTECH" style={{ height: 40, objectFit: 'contain', marginBottom: 32 }} onError={e => e.currentTarget.style.display = 'none'} />
        <div style={{ width: '100%', height: 3, borderRadius: '3px 3px 0 0', background: 'var(--brand-gradient)', marginBottom: -1 }} />
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: '40px 36px' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(74,108,247,0.15)', border: '2px solid rgba(74,108,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Mail size={28} color="#7b9fff" />
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, marginBottom: 12 }}>
            ¡Revisá tu email!
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 8 }}>
            Te enviamos un email de confirmación a
          </p>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#7b9fff', marginBottom: 20 }}>{email}</div>
          <p style={{ fontSize: 13, color: 'var(--text3)', lineHeight: 1.7, marginBottom: 28 }}>
            Hacé click en el link del email para activar tu cuenta. Si no lo encontrás, revisá la carpeta de spam.
          </p>
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: 'var(--text2)', marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>Resumen de tu cuenta:</div>
            <div>Tipo: <span style={{ color: USER_TYPES.find(t => t.value === userType)?.color }}>{USER_TYPES.find(t => t.value === userType)?.emoji} {USER_TYPES.find(t => t.value === userType)?.label}</span></div>
            <div>Nombre: {userType === 'client' ? clientData.full_name : bizData.full_name}</div>
            {(userType === 'distributor' || userType === 'tech_service') && <div>Razón Social: {bizData.razon_social}</div>}
          </div>
          <button onClick={() => { setMode('login'); setRegistered(false) }} style={{
            background: 'var(--brand-gradient)', border: 'none', borderRadius: 'var(--radius)',
            color: '#fff', padding: '11px 28px', fontSize: 14, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font)', width: '100%',
          }}>
            Ir al login
          </button>
        </div>
      </div>
    </div>
  )

  // ── PANTALLA: LOGIN ──
  if (mode === 'login') return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(42,69,201,0.15) 0%, transparent 70%)' }} />

      {/* Panel izquierdo */}
      <div className="auth-left-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, borderRight: '1px solid var(--border)' }}>
        <div style={{ maxWidth: 400, textAlign: 'center' }}>
          <img src={LOGO_URL} alt="TEMPTECH" style={{ width: 240, objectFit: 'contain', marginBottom: 40 }} onError={e => e.currentTarget.style.display = 'none'} />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, marginBottom: 16, lineHeight: 1.3 }}>Portal de Atención al Cliente</h2>
          <p style={{ fontSize: 15, color: 'var(--text2)', lineHeight: 1.8, marginBottom: 36 }}>Consultas, reclamos, manuales y videos tutoriales de todos los productos TEMPTECH.</p>
          {[
            { icon: '💬', label: 'Foro de consultas público' },
            { icon: '⚠️', label: 'Seguimiento de reclamos' },
            { icon: '📚', label: 'Manuales técnicos' },
            { icon: '▶️', label: 'Videos del canal oficial' },
          ].map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{f.icon}</div>
              <span style={{ fontSize: 14, color: 'var(--text2)', textAlign: 'left' }}>{f.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Formulario login */}
      <div style={{ width: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px' }}>
        <img src={LOGO_URL} alt="TEMPTECH" className="auth-mobile-logo" style={{ width: 180, objectFit: 'contain', marginBottom: 32, display: 'none' }} onError={e => e.currentTarget.style.display = 'none'} />
        <div style={{ width: '100%', height: 3, borderRadius: '3px 3px 0 0', background: 'var(--brand-gradient)', marginBottom: -1 }} />
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: '36px 32px', width: '100%' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Iniciá sesión</h2>
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Accedé a tu cuenta TEMPTECH</p>

          {/* Google Button */}
          <button onClick={handleGoogle} disabled={loading} style={{
            width: '100%', padding: '11px', marginBottom: 16,
            background: '#fff', border: '1px solid #e0e0e0',
            borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            color: '#333', fontFamily: 'var(--font)', transition: 'box-shadow .2s',
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Continuar con Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 12, color: 'var(--text3)' }}>o con email</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Email" type="email" placeholder="tu@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} />
            <Field label="Contraseña" type="password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>

          <GradientBtn onClick={handleLogin} loading={loading} style={{ width: '100%', marginTop: 20 }}>
            Ingresar
          </GradientBtn>

          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--text3)' }}>
            ¿No tenés cuenta?{' '}
            <button onClick={() => { setMode('register'); setStep(1) }} style={{ background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Registrarte gratis
            </button>
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text3)' }}>© {new Date().getFullYear()} TEMPTECH · Todos los derechos reservados</div>
      </div>

      <style>{`
        @media (max-width: 900px) { .auth-left-panel { display: none !important; } .auth-mobile-logo { display: block !important; } }
      `}</style>
    </div>
  )

  // ── PANTALLA: REGISTRO (3 pasos) ──
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(42,69,201,0.12) 0%, transparent 70%)' }} />
      <div style={{ width: '100%', maxWidth: 600, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src={LOGO_URL} alt="TEMPTECH" style={{ height: 38, objectFit: 'contain' }} onError={e => e.currentTarget.style.display = 'none'} />
        </div>
        <Stepper step={step} />
        <div style={{ width: '100%', height: 3, borderRadius: '3px 3px 0 0', background: 'var(--brand-gradient)', marginBottom: -1 }} />
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', padding: '32px' }}>

          {/* PASO 1 — Tipo de usuario */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>¿Cómo querés registrarte?</h2>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>Elegí el tipo de cuenta que mejor te describe</p>

              {/* Google OAuth también en registro */}
              <button onClick={handleGoogle} disabled={loading} style={{
                width: '100%', padding: '11px', marginBottom: 20,
                background: '#fff', border: '1px solid #e0e0e0',
                borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                color: '#333', fontFamily: 'var(--font)',
              }}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Registrarse con Google
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>o elegí tu tipo de cuenta</span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {USER_TYPES.map(t => (
                  <div key={t.value} onClick={() => setUserType(t.value)} style={{
                    border: `2px solid ${userType === t.value ? t.border : 'var(--border)'}`,
                    background: userType === t.value ? t.bg : 'var(--surface2)',
                    borderRadius: 12, padding: '14px 18px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 14, transition: 'all .15s',
                  }}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: userType === t.value ? t.bg : 'var(--surface3)', border: `1px solid ${userType === t.value ? t.border : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button onClick={() => setMode('login')} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>← Volver al login</button>
                <GradientBtn onClick={() => { if (!userType) return toast.error('Seleccioná un tipo de cuenta'); setStep(2) }}>
                  Continuar <ChevronRight size={15} />
                </GradientBtn>
              </div>
            </div>
          )}

          {/* PASO 2 — Datos */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
                {userType === 'client' ? '👤 Tus datos personales' : userType === 'distributor' ? '🏪 Datos del distribuidor' : '🔧 Datos del servicio técnico'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Completá tu información</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13, maxHeight: '52vh', overflowY: 'auto', paddingRight: 4 }}>
                {userType === 'client' ? (
                  <>
                    <Field label="Nombre y Apellido" required placeholder="Juan Pérez" value={clientData.full_name} onChange={e => setClientData(p => ({ ...p, full_name: e.target.value }))} />
                    <Field label="Dirección" placeholder="Av. Corrientes 1234, Piso 3" value={clientData.direccion} onChange={e => setClientData(p => ({ ...p, direccion: e.target.value }))} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Field label="Localidad" placeholder="Buenos Aires" value={clientData.localidad} onChange={e => setClientData(p => ({ ...p, localidad: e.target.value }))} />
                      <SelectField label="Provincia" options={PROVINCIAS} value={clientData.provincia} onChange={e => setClientData(p => ({ ...p, provincia: e.target.value }))} />
                    </div>
                    <Field label="Teléfono" required placeholder="+54 11 1234-5678" value={clientData.telefono} onChange={e => setClientData(p => ({ ...p, telefono: e.target.value }))} />
                    <ProductMultiSelect selected={clientData.productos_interesados} onChange={val => setClientData(p => ({ ...p, productos_interesados: val }))} />
                  </>
                ) : (
                  <>
                    <Field label="Razón Social" required placeholder="Mi Empresa S.A." value={bizData.razon_social} onChange={e => setBizData(p => ({ ...p, razon_social: e.target.value }))} />
                    <Field label="CUIT" required placeholder="20-12345678-9" value={bizData.cuit} onChange={e => setBizData(p => ({ ...p, cuit: e.target.value }))} />
                    <Field label="Nombre y Apellido" required placeholder="Juan Pérez" value={bizData.full_name} onChange={e => setBizData(p => ({ ...p, full_name: e.target.value }))} />
                    <Field label="Teléfono" required placeholder="+54 11 1234-5678" value={bizData.telefono} onChange={e => setBizData(p => ({ ...p, telefono: e.target.value }))} />
                  </>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>← Atrás</button>
                <GradientBtn onClick={() => { const err = validateStep2(); if (err) return toast.error(err); setStep(3) }}>
                  Continuar <ChevronRight size={15} />
                </GradientBtn>
              </div>
            </div>
          )}

          {/* PASO 3 — Email y contraseña */}
          {step === 3 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Datos de acceso</h2>
              <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 20 }}>Vas a usar estos datos para iniciar sesión</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <Field label="Email" required type="email" placeholder="tu@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                <Field label="Contraseña" required type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} />
                <Field label="Confirmar contraseña" required type="password" placeholder="Repetí la contraseña" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} />
              </div>
              {/* Resumen */}
              <div style={{ marginTop: 18, background: 'var(--surface2)', borderRadius: 10, padding: '13px 16px', border: '1px solid var(--border)', fontSize: 13, color: 'var(--text2)' }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Tu cuenta</div>
                <div>Tipo: <span style={{ color: USER_TYPES.find(t => t.value === userType)?.color }}>{USER_TYPES.find(t => t.value === userType)?.emoji} {USER_TYPES.find(t => t.value === userType)?.label}</span></div>
                <div>Nombre: {userType === 'client' ? clientData.full_name : bizData.full_name}</div>
                {(userType === 'distributor' || userType === 'tech_service') && <div>Razón Social: {bizData.razon_social}</div>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <button onClick={() => setStep(2)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer' }}>← Atrás</button>
                <GradientBtn onClick={handleRegister} loading={loading}>
                  Crear cuenta
                </GradientBtn>
              </div>
            </div>
          )}
        </div>
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 11, color: 'var(--text3)' }}>© {new Date().getFullYear()} TEMPTECH · Todos los derechos reservados</div>
      </div>
    </div>
  )
}
