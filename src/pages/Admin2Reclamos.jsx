import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const T = {
  bg: '#222222', surface: '#2b2b2b', surface2: '#333333', surface3: '#3d3d3d',
  border: '#444444', border2: '#505050',
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

function Badge({ estado, aprobado, controlFisico }) {
  const cfg = STATUS_CONFIG[estado] || STATUS_CONFIG['Ingresado']
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>{cfg.label}</span>
      {aprobado === 'SI' && <span style={{ background: T.greenDim, color: T.green, border: `1px solid ${T.green}40`, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>✓ Aprobado</span>}
      {controlFisico === 'SI' && <span style={{ background: 'rgba(251,146,60,0.15)', color: T.orange, border: `1px solid rgba(251,146,60,0.4)`, fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>📦 Control Físico</span>}
    </div>
  )
}

function Btn({ children, onClick, disabled, variant = 'ghost' }) {
  const variants = {
    ghost:   { bg: T.surface3, color: T.text2,   border: `1px solid ${T.border2}` },
    orange:  { bg: 'rgba(251,146,60,0.12)', color: T.orange, border: `1px solid rgba(251,146,60,0.35)` },
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

export default function Admin2Reclamos() {
  const [busquedaTracking, setBusquedaTracking] = useState('')
  const [datos, setDatos]           = useState([])
  const [cargando, setCargando]     = useState(false)
  const [errorTexto, setErrorTexto] = useState('')
  const [notasInput, setNotasInput] = useState({})
  const [controlFisicoAbiertoId, setControlFisicoAbiertoId] = useState(null)
  const [notaControlFisico, setNotaControlFisico] = useState('')
  const [guardando, setGuardando]   = useState(false)

  function armarLineaNota(tipo, texto) {
    const fecha = new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    return `${fecha} - ${tipo}: ${texto || ''}`.trim()
  }
  function unirNotas(n, l) { return (!n || !n.trim()) ? l : `${n}\n${l}` }

  async function buscar() {
    const q = busquedaTracking.trim()
    if (!q) { setDatos([]); return }
    setCargando(true); setErrorTexto('')
    const { data, error } = await supabase
      .from('devoluciones')
      .select('*')
      .ilike('tracking_id', `%${q}%`)
      .order('fecha_creacion', { ascending: false })
      .limit(50)
    if (error) { setErrorTexto(error.message); setDatos([]) } else setDatos(data || [])
    setCargando(false)
  }

  async function guardarControlFisico(item) {
    setGuardando(true)
    const nuevaNota = armarLineaNota('CONTROL FÍSICO', notaControlFisico.trim())
    const { error } = await supabase
      .from('devoluciones')
      .update({ control_fisico: 'SI', notas: unirNotas(item.notas, nuevaNota) })
      .eq('id', item.id)
    if (error) { alert('Error al guardar el Control Físico'); setGuardando(false); return }
    setControlFisicoAbiertoId(null)
    setNotaControlFisico('')
    setGuardando(false)
    // Refrescar el item en el estado local
    setDatos(prev => prev.map(d => d.id === item.id ? { ...d, control_fisico: 'SI', notas: unirNotas(item.notas, nuevaNota) } : d))
  }

  async function guardarNota(item) {
    const texto = (notasInput[item.id] || '').trim()
    if (!texto) { alert('Escribí una nota antes de guardar'); return }
    const nuevaNota = armarLineaNota('NOTA', texto)
    const { error } = await supabase
      .from('devoluciones')
      .update({ notas: unirNotas(item.notas, nuevaNota) })
      .eq('id', item.id)
    if (error) { alert('Error al guardar la nota'); return }
    setNotasInput(prev => ({ ...prev, [item.id]: '' }))
    setDatos(prev => prev.map(d => d.id === item.id ? { ...d, notas: unirNotas(item.notas, nuevaNota) } : d))
  }

  const inputStyle = { background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '8px 12px', color: T.text, fontSize: 13, outline: 'none', fontFamily: T.font, width: '100%' }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.font }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Syne:wght@700;800&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: ${T.text3}; }
        @media (max-width: 600px) {
          .rc-header   { padding: 0 14px !important; }
          .rc-wrap     { padding: 16px 14px !important; }
          .rc-search   { flex-direction: column !important; }
          .rc-card-hdr { padding: 12px 14px !important; flex-direction: column !important; align-items: flex-start !important; }
          .rc-card-hdr-inner { flex-wrap: wrap !important; }
          .rc-body     { padding: 14px 14px !important; }
          .rc-notes    { margin: 0 14px 14px !important; }
          .rc-nota-row { flex-direction: column !important; align-items: stretch !important; }
          .rc-nota-row button { width: 100% !important; }
          .rc-actions  { padding: 12px 14px !important; }
          .rc-cf-panel { margin: 0 14px 14px !important; }
          .rc-info-lbl { min-width: 100px !important; }
        }
      `}</style>

      {/* Topbar */}
      <header className="rc-header" style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '0 32px', height: 56, display: 'flex', alignItems: 'center' }}>
        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: T.text }}>Panel Control Físico — Reclamos</span>
      </header>

      <div className="rc-wrap" style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>
        {/* Buscador */}
        <div className="rc-search" style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, padding: '18px 22px', marginBottom: 24, display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="🔍 Buscar por número de tracking..."
            value={busquedaTracking}
            onChange={e => setBusquedaTracking(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && buscar()}
            style={inputStyle}
          />
          <button
            onClick={buscar}
            style={{ background: 'linear-gradient(135deg,#e8215a,#8b2fc9,#4a6cf7)', color: '#fff', border: 'none', borderRadius: T.radius, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: T.font, whiteSpace: 'nowrap' }}
          >
            Buscar
          </button>
          {busquedaTracking && (
            <button onClick={() => { setBusquedaTracking(''); setDatos([]) }} style={{ background: T.surface3, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '8px 12px', color: T.text2, fontSize: 12, cursor: 'pointer', fontFamily: T.font, whiteSpace: 'nowrap' }}>
              Limpiar
            </button>
          )}
        </div>

        {errorTexto && <div style={{ background: T.redDim, border: `1px solid ${T.red}40`, color: T.red, padding: '14px 18px', borderRadius: T.radiusLg, marginBottom: 20, fontSize: 13 }}>⚠ Error: {errorTexto}</div>}

        {cargando ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.text3 }}>Buscando...</div>
        ) : datos.length === 0 && busquedaTracking ? (
          <div style={{ textAlign: 'center', padding: 60, color: T.text3 }}>No se encontraron reclamos para "{busquedaTracking}".</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {datos.map(item => (
              <div key={item.id} style={{ background: T.surface, border: `1px solid ${item.control_fisico === 'SI' ? T.orange + '50' : T.border}`, borderRadius: T.radiusLg, overflow: 'hidden' }}>
                {/* Header */}
                <div className="rc-card-hdr" style={{ padding: '16px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div className="rc-card-hdr-inner" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '4px 10px', borderRadius: 6 }}>{item.tracking_id || `#${item.id}`}</span>
                    <Badge estado={item.estado} aprobado={item.aprobado} controlFisico={item.control_fisico} />
                  </div>
                  <div style={{ fontSize: 12, color: T.text3 }}>{formatearFecha(item.fecha_creacion)}</div>
                </div>

                {/* Body */}
                <div className="rc-body" style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0 32px' }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Cliente</div>
                    <InfoRow label="Nombre" value={item.nombre_apellido || item.nombre} />
                    <InfoRow label="Email" value={item.email} />
                    <InfoRow label="Teléfono" value={item.telefono} />
                    <InfoRow label="Localidad" value={`${item.localidad || ''} ${item.provincia || ''}`.trim()} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Producto</div>
                    <InfoRow label="Producto" value={item.producto} />
                    <InfoRow label="Modelo" value={item.modelo} />
                    <InfoRow label="Motivo" value={item.motivo} />
                    <InfoRow label="Fecha ingreso" value={formatearFecha(item.fecha_ingreso)} />
                  </div>
                </div>

                {/* Notas */}
                <div className="rc-notes" style={{ margin: '0 22px 16px', padding: 14, background: T.surface2, borderRadius: T.radius, border: `1px solid ${T.border}` }}>
                  {item.notas && (
                    <div style={{ fontSize: 12, color: T.text3, whiteSpace: 'pre-line', marginBottom: 10 }}>{item.notas}</div>
                  )}

                  {/* Nota manual */}
                  <div className="rc-nota-row" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', borderTop: item.notas ? `1px solid ${T.border}` : 'none', paddingTop: item.notas ? 10 : 0 }}>
                    <textarea
                      value={notasInput[item.id] || ''}
                      onChange={e => setNotasInput(prev => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder="Agregar nota..."
                      rows={2}
                      style={{ flex: 1, background: T.surface3, border: `1px solid ${T.border2}`, borderRadius: T.radius, padding: '8px 12px', color: T.text, fontSize: 12, fontFamily: T.font, resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                    />
                    <Btn onClick={() => guardarNota(item)}>💾 Guardar nota</Btn>
                  </div>
                </div>

                {/* Acción Control Físico */}
                <div className="rc-actions" style={{ padding: '14px 22px', borderTop: `1px solid ${T.border}`, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Btn
                    variant="orange"
                    disabled={item.control_fisico === 'SI'}
                    onClick={() => { setControlFisicoAbiertoId(item.id); setNotaControlFisico('') }}
                  >
                    📦 Control Físico {item.control_fisico === 'SI' ? '(ya registrado)' : ''}
                  </Btn>
                </div>

                {/* Panel Control Físico */}
                {controlFisicoAbiertoId === item.id && (
                  <div className="rc-cf-panel" style={{ margin: '0 22px 18px', padding: 16, background: 'rgba(251,146,60,0.08)', border: `1px solid rgba(251,146,60,0.3)`, borderRadius: T.radius }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.orange, marginBottom: 12 }}>📦 Confirmar Control Físico</div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, color: T.text3, display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Nota (opcional)</label>
                      <textarea
                        value={notaControlFisico}
                        onChange={e => setNotaControlFisico(e.target.value)}
                        placeholder="Observaciones del control físico..."
                        rows={3}
                        style={{ width: '100%', background: T.surface2, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '8px 12px', color: T.text, fontSize: 12, fontFamily: T.font, resize: 'vertical', outline: 'none', lineHeight: 1.6 }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Btn variant="orange" onClick={() => guardarControlFisico(item)} disabled={guardando}>
                        {guardando ? 'Guardando...' : 'Confirmar'}
                      </Btn>
                      <Btn onClick={() => { setControlFisicoAbiertoId(null); setNotaControlFisico('') }}>Cancelar</Btn>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
