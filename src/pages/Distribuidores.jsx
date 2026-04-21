import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

const CATEGORIAS = [
  { key: 'calefones_calderas',   label: 'Calefones / Calderas',  color: '#7b9fff', bg: 'rgba(74,108,247,0.1)' },
  { key: 'paneles_calefactores', label: 'Paneles Calefactores',  color: '#ffd166', bg: 'rgba(255,209,102,0.1)' },
  { key: 'anafes',               label: 'Anafes',                color: '#ff6b2b', bg: 'rgba(255,107,43,0.1)' },
]

// Precio base * (1 - d1/100) * (1 - d2/100) * (1 - d3/100)
function calcPrecioFinal(base, dtos) {
  return dtos.reduce((p, d) => {
    const n = parseFloat(d) || 0
    return p * (1 - n / 100)
  }, base)
}

function formatPct(val) {
  const n = parseFloat(val) || 0
  return n > 0 ? `${n}%` : null
}

function DescuentosCascada({ dtos, onChange }) {
  // dtos: [d1, d2, d3]
  const BASE = 100000
  const final = calcPrecioFinal(BASE, dtos)
  const totalEfectivo = (((BASE - final) / BASE) * 100).toFixed(2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600 }}>Dto {i + 1}</div>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={dtos[i] ?? ''}
              onChange={e => {
                const next = [...dtos]
                next[i] = e.target.value
                onChange(next)
              }}
              placeholder="0"
              style={{ width: 68, background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 8px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', textAlign: 'center' }}
            />
            <span style={{ color: 'var(--text3)', fontSize: 13 }}>%</span>
            {i < 2 && (dtos[i] || dtos[i + 1]) ? <span style={{ color: 'var(--text3)', fontSize: 12 }}>×</span> : null}
          </div>
        ))}
      </div>
      {/* Preview */}
      {dtos.some(d => parseFloat(d) > 0) && (
        <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>Sobre $100.000:</span>
          {dtos.map((d, i) => parseFloat(d) > 0 ? (
            <span key={i}>
              {i > 0 && <span style={{ color: 'var(--text3)' }}>→ </span>}
              <span style={{ color: '#7b9fff' }}>-{d}%</span>
            </span>
          ) : null)}
          <span>= <strong style={{ color: '#3dd68c' }}>${calcPrecioFinal(100000, dtos).toLocaleString('es-AR', { maximumFractionDigits: 0 })}</strong></span>
          <span style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.3)', padding: '1px 8px', borderRadius: 20, fontWeight: 700 }}>
            {totalEfectivo}% efectivo
          </span>
        </div>
      )}
    </div>
  )
}

// Convierte el objeto guardado en arrays de 3 slots: [d1, d2, d3]
function descToArrays(descObj) {
  const result = {}
  CATEGORIAS.forEach(({ key }) => {
    const v = descObj?.[key]
    if (Array.isArray(v)) {
      result[key] = [v[0] ?? '', v[1] ?? '', v[2] ?? '']
    } else if (v != null && v !== 0 && v !== '') {
      result[key] = [String(v), '', '']
    } else {
      result[key] = ['', '', '']
    }
  })
  return result
}

// Convierte arrays → objeto para guardar (filtra vacíos y ceros)
function arraysToDesc(arrObj) {
  const result = {}
  CATEGORIAS.forEach(({ key }) => {
    const arr = (arrObj[key] || ['', '', '']).map(v => parseFloat(v) || 0)
    // Si todos son 0, guardar 0 simple; si hay más de uno, guardar array
    const nonZero = arr.filter(v => v > 0)
    if (nonZero.length === 0) result[key] = 0
    else if (nonZero.length === 1 && arr[1] === 0 && arr[2] === 0) result[key] = arr[0]
    else result[key] = arr
  })
  return result
}

// Formatea el descuento para mostrar en el badge
function formatDescuento(val) {
  if (!val || val === 0) return null
  if (Array.isArray(val)) {
    const activos = val.filter(v => v > 0)
    if (activos.length === 0) return null
    if (activos.length === 1) return `${activos[0]}%`
    return activos.map(v => `${v}%`).join(' + ')
  }
  return `${val}%`
}

const inputSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }

const emptyNuevo = () => ({ email: '', full_name: '', razon_social: '', cuit: '', telefono: '', localidad: '', provincia: '' })

export default function Distribuidores() {
  const { isAdmin, isAdmin2 } = useAuth()
  const [distribuidores, setDistribuidores] = useState([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(null)
  const [descuentos, setDescuentos] = useState({})  // { key: [d1, d2, d3] }
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [nuevo, setNuevo] = useState(emptyNuevo())
  const [invitando, setInvitando] = useState(false)

  useEffect(() => { if (isAdmin) cargar() }, [isAdmin])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, razon_social, cuit, localidad, provincia, telefono, descuentos, created_at')
      .eq('user_type', 'distributor')
      .order('created_at', { ascending: false })
    if (error) toast.error('Error al cargar distribuidores')
    else setDistribuidores(data || [])
    setLoading(false)
  }

  function abrirEdicion(dist) {
    setDescuentos(descToArrays(dist.descuentos))
    setEditando(dist.id)
  }

  function cerrarEdicion() { setEditando(null); setDescuentos({}) }

  async function invitarDistribuidor() {
    if (!nuevo.email.trim()) { toast.error('El email es requerido'); return }
    setInvitando(true)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-distributor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify(nuevo),
    })
    const result = await res.json()
    if (result.error) {
      toast.error('Error: ' + result.error)
    } else {
      toast.success('Invitación enviada ✅')
      setModalNuevo(false)
      setNuevo(emptyNuevo())
      cargar()
    }
    setInvitando(false)
  }

  async function guardarDescuentos(distId) {
    setGuardando(true)
    const payload = arraysToDesc(descuentos)
    const { error } = await supabase.from('profiles').update({ descuentos: payload }).eq('id', distId)
    if (error) {
      toast.error('Error al guardar')
    } else {
      toast.success('Descuentos guardados ✅')
      setDistribuidores(prev => prev.map(d => d.id === distId ? { ...d, descuentos: payload } : d))
      cerrarEdicion()
    }
    setGuardando(false)
  }

  const filtrados = distribuidores.filter(d => {
    const q = busqueda.toLowerCase()
    return !q || (d.razon_social || '').toLowerCase().includes(q) || (d.email || '').toLowerCase().includes(q) || (d.full_name || '').toLowerCase().includes(q)
  })

  if (!isAdmin && !isAdmin2) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Distribuidores</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Gestioná los descuentos por categoría de cada distribuidor</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, color: 'var(--text3)' }}>
            {filtrados.length} distribuidor{filtrados.length !== 1 ? 'es' : ''}
          </div>
          {isAdmin && (
            <button onClick={() => setModalNuevo(true)} style={{ background: 'rgba(74,108,247,0.12)', border: '1px solid rgba(74,108,247,0.35)', color: '#7b9fff', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              + Nuevo distribuidor
            </button>
          )}
        </div>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="🔍 Buscar por razón social, email o nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 14px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>
          {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay distribuidores registrados'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtrados.map(dist => (
            <div key={dist.id} style={{ background: 'var(--surface)', border: `1px solid ${editando === dist.id ? 'rgba(74,108,247,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'border-color .2s' }}>

              {/* Info del distribuidor */}
              <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,209,102,0.15)', border: '1px solid rgba(255,209,102,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🏪</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{dist.razon_social || dist.full_name || 'Sin nombre'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      {dist.email}
                      {dist.cuit && <span style={{ marginLeft: 10 }}>CUIT: {dist.cuit}</span>}
                      {(dist.localidad || dist.provincia) && <span style={{ marginLeft: 10 }}>{[dist.localidad, dist.provincia].filter(Boolean).join(', ')}</span>}
                    </div>
                  </div>
                </div>

                {/* Badges descuentos actuales */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {CATEGORIAS.map(({ key, label, color, bg }) => {
                    const fmt = formatDescuento(dist.descuentos?.[key])
                    if (!fmt) return null
                    return (
                      <span key={key} style={{ background: bg, border: `1px solid ${color}50`, color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                        {label}: {fmt}
                      </span>
                    )
                  })}
                  <button
                    onClick={() => editando === dist.id ? cerrarEdicion() : abrirEdicion(dist)}
                    style={{ background: editando === dist.id ? 'var(--surface3)' : 'rgba(74,108,247,0.1)', border: `1px solid ${editando === dist.id ? 'var(--border)' : 'rgba(74,108,247,0.35)'}`, color: editando === dist.id ? 'var(--text2)' : '#7b9fff', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {editando === dist.id ? 'Cancelar' : '✏️ Editar descuentos'}
                  </button>
                </div>
              </div>

              {/* Panel edición */}
              {editando === dist.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '20px 22px', background: 'rgba(74,108,247,0.03)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 18 }}>
                    Descuentos por categoría — hasta 3 descuentos acumulativos
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {CATEGORIAS.map(({ key, label, color, bg }) => (
                      <div key={key} style={{ background: 'var(--surface2)', border: `1px solid ${color}30`, borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ background: bg, border: `1px solid ${color}40`, padding: '2px 10px', borderRadius: 20 }}>{label}</span>
                        </div>
                        <DescuentosCascada
                          dtos={descuentos[key] || ['', '', '']}
                          onChange={val => setDescuentos(prev => ({ ...prev, [key]: val }))}
                        />
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                    <button
                      onClick={() => guardarDescuentos(dist.id)}
                      disabled={guardando}
                      style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.6 : 1, fontFamily: 'var(--font)' }}
                    >
                      {guardando ? 'Guardando...' : '💾 Guardar descuentos'}
                    </button>
                    <button
                      onClick={cerrarEdicion}
                      style={{ background: 'var(--surface3)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal nuevo distribuidor */}
      {modalNuevo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 480 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Nuevo distribuidor</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email *</div>
                <input type="email" value={nuevo.email} onChange={e => setNuevo(p => ({ ...p, email: e.target.value }))} placeholder="distribuidor@empresa.com" style={inputSt} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre</div>
                  <input value={nuevo.full_name} onChange={e => setNuevo(p => ({ ...p, full_name: e.target.value }))} placeholder="Nombre completo" style={inputSt} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Razón social</div>
                  <input value={nuevo.razon_social} onChange={e => setNuevo(p => ({ ...p, razon_social: e.target.value }))} placeholder="Empresa S.A." style={inputSt} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>CUIT</div>
                  <input value={nuevo.cuit} onChange={e => setNuevo(p => ({ ...p, cuit: e.target.value }))} placeholder="20-12345678-9" style={inputSt} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Teléfono</div>
                  <input value={nuevo.telefono} onChange={e => setNuevo(p => ({ ...p, telefono: e.target.value }))} placeholder="+54 11 1234-5678" style={inputSt} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Localidad</div>
                  <input value={nuevo.localidad} onChange={e => setNuevo(p => ({ ...p, localidad: e.target.value }))} placeholder="Buenos Aires" style={inputSt} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Provincia</div>
                  <input value={nuevo.provincia} onChange={e => setNuevo(p => ({ ...p, provincia: e.target.value }))} placeholder="CABA" style={inputSt} />
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', background: 'rgba(74,108,247,0.07)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                Se enviará un email de invitación para que el distribuidor active su cuenta y configure su contraseña.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={invitarDistribuidor} disabled={invitando} style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: invitando ? 'not-allowed' : 'pointer', opacity: invitando ? 0.6 : 1, fontFamily: 'var(--font)' }}>
                {invitando ? 'Enviando...' : 'Enviar invitación'}
              </button>
              <button onClick={() => { setModalNuevo(false); setNuevo(emptyNuevo()) }} style={{ background: 'var(--surface3)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
