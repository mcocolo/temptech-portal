import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

const CATEGORIAS_DESC = [
  { key: 'calefones_calderas',   label: 'Calefones / Calderas',  color: '#7b9fff', bg: 'rgba(74,108,247,0.1)' },
  { key: 'paneles_calefactores', label: 'Paneles Calefactores',  color: '#ffd166', bg: 'rgba(255,209,102,0.1)' },
  { key: 'anafes',               label: 'Anafes',                color: '#ff6b2b', bg: 'rgba(255,107,43,0.1)' },
]

const PROVINCIAS = [
  'Buenos Aires','CABA','Catamarca','Chaco','Chubut','Córdoba','Corrientes',
  'Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones',
  'Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe',
  'Santiago del Estero','Tierra del Fuego','Tucumán',
]

const inputSt = {
  background: 'var(--surface3)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 12px', color: 'var(--text)',
  fontSize: 13, outline: 'none', width: '100%', fontFamily: 'var(--font)',
}

function calcPrecioFinal(base, dtos) {
  return dtos.reduce((p, d) => {
    const n = parseFloat(d) || 0
    return p * (1 - n / 100)
  }, base)
}

function descToArrays(descObj) {
  const result = {}
  CATEGORIAS_DESC.forEach(({ key }) => {
    const v = descObj?.[key]
    if (Array.isArray(v)) result[key] = [v[0] ?? '', v[1] ?? '', v[2] ?? '']
    else if (v != null && v !== 0 && v !== '') result[key] = [String(v), '', '']
    else result[key] = ['', '', '']
  })
  return result
}

function arraysToDesc(arrObj) {
  const result = {}
  CATEGORIAS_DESC.forEach(({ key }) => {
    const arr = (arrObj[key] || ['', '', '']).map(v => parseFloat(v) || 0)
    const nonZero = arr.filter(v => v > 0)
    if (nonZero.length === 0) result[key] = 0
    else if (nonZero.length === 1 && arr[1] === 0 && arr[2] === 0) result[key] = arr[0]
    else result[key] = arr
  })
  return result
}

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

function DescuentosCascada({ dtos, onChange }) {
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
              type="number" min="0" max="100" step="0.1"
              value={dtos[i] ?? ''}
              onChange={e => { const next = [...dtos]; next[i] = e.target.value; onChange(next) }}
              placeholder="0"
              style={{ width: 68, background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 8px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', textAlign: 'center' }}
            />
            <span style={{ color: 'var(--text3)', fontSize: 13 }}>%</span>
          </div>
        ))}
      </div>
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

const EMPTY_FORM = {
  email: '', full_name: '', razon_social: '',
  cuit: '', telefono: '', localidad: '', provincia: '',
}

export default function MisClientes() {
  const { user, isVendedor } = useAuth()
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creando, setCreando] = useState(false)
  const [editandoDesc, setEditandoDesc] = useState(null)
  const [descuentos, setDescuentos] = useState({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { if (isVendedor && user) cargar() }, [isVendedor, user])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, razon_social, cuit, localidad, provincia, telefono, descuentos, created_at')
      .eq('vendedor_id', user.id)
      .order('created_at', { ascending: false })
    if (error) toast.error('Error al cargar clientes')
    else setClientes(data || [])
    setLoading(false)
  }

  async function crearCliente() {
    if (!form.email) { toast.error('El email es obligatorio'); return }
    setCreando(true)
    // Generar contraseña aleatoria — el vendedor maneja al cliente, no necesita login
    const autoPass = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-4).toUpperCase()

    const { data, error } = await supabase.rpc('crear_cliente_vendedor', {
      p_email:        form.email.trim(),
      p_password:     autoPass,
      p_full_name:    form.full_name.trim(),
      p_razon_social: form.razon_social.trim(),
      p_cuit:         form.cuit.trim(),
      p_telefono:     form.telefono.trim(),
      p_localidad:    form.localidad.trim(),
      p_provincia:    form.provincia,
      p_vendedor_id:  user.id,
    })

    if (error) {
      toast.error('Error al crear cliente: ' + error.message)
    } else {
      toast.success('Cliente creado ✅')
      setModalNuevo(false)
      setForm(EMPTY_FORM)
      cargar()
    }
    setCreando(false)
  }

  function abrirDescuentos(cliente) {
    setDescuentos(descToArrays(cliente.descuentos))
    setEditandoDesc(cliente.id)
  }

  async function guardarDescuentos(clienteId) {
    setGuardando(true)
    const payload = arraysToDesc(descuentos)
    const { error } = await supabase.from('profiles').update({ descuentos: payload }).eq('id', clienteId)
    if (error) {
      toast.error('Error al guardar')
    } else {
      toast.success('Descuentos guardados ✅')
      setClientes(prev => prev.map(c => c.id === clienteId ? { ...c, descuentos: payload } : c))
      setEditandoDesc(null)
      setDescuentos({})
    }
    setGuardando(false)
  }

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    return !q || (c.razon_social || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q) || (c.full_name || '').toLowerCase().includes(q)
  })

  if (!isVendedor) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Mis Clientes</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Gestioná tus clientes y sus descuentos por categoría</p>
        </div>
        <button
          onClick={() => setModalNuevo(true)}
          style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
        >
          + Nuevo cliente
        </button>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, razón social o email..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 14px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>
          {busqueda ? `Sin resultados para "${busqueda}"` : 'Todavía no tenés clientes. Creá el primero.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtrados.map(cliente => (
            <div key={cliente.id} style={{ background: 'var(--surface)', border: `1px solid ${editandoDesc === cliente.id ? 'rgba(74,108,247,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'border-color .2s' }}>
              {/* Info */}
              <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(74,108,247,0.15)', border: '1px solid rgba(74,108,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>👤</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{cliente.razon_social || cliente.full_name || 'Sin nombre'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      {cliente.email}
                      {cliente.cuit && <span style={{ marginLeft: 10 }}>CUIT: {cliente.cuit}</span>}
                      {(cliente.localidad || cliente.provincia) && <span style={{ marginLeft: 10 }}>{[cliente.localidad, cliente.provincia].filter(Boolean).join(', ')}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {CATEGORIAS_DESC.map(({ key, label, color, bg }) => {
                    const fmt = formatDescuento(cliente.descuentos?.[key])
                    if (!fmt) return null
                    return (
                      <span key={key} style={{ background: bg, border: `1px solid ${color}50`, color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                        {label}: {fmt}
                      </span>
                    )
                  })}
                  <button
                    onClick={() => editandoDesc === cliente.id ? setEditandoDesc(null) : abrirDescuentos(cliente)}
                    style={{ background: editandoDesc === cliente.id ? 'var(--surface3)' : 'rgba(74,108,247,0.1)', border: `1px solid ${editandoDesc === cliente.id ? 'var(--border)' : 'rgba(74,108,247,0.35)'}`, color: editandoDesc === cliente.id ? 'var(--text2)' : '#7b9fff', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {editandoDesc === cliente.id ? 'Cancelar' : '✏️ Descuentos'}
                  </button>
                </div>
              </div>

              {/* Panel descuentos */}
              {editandoDesc === cliente.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '20px 22px', background: 'rgba(74,108,247,0.03)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 18 }}>
                    Descuentos por categoría — hasta 3 descuentos acumulativos
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {CATEGORIAS_DESC.map(({ key, label, color, bg }) => (
                      <div key={key} style={{ background: 'var(--surface2)', border: `1px solid ${color}30`, borderRadius: 'var(--radius)', padding: '14px 16px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 10 }}>
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
                      onClick={() => guardarDescuentos(cliente.id)}
                      disabled={guardando}
                      style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '9px 22px', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.6 : 1, fontFamily: 'var(--font)' }}
                    >
                      {guardando ? 'Guardando...' : '💾 Guardar descuentos'}
                    </button>
                    <button
                      onClick={() => setEditandoDesc(null)}
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

      {/* Modal nuevo cliente */}
      {modalNuevo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>Nuevo cliente</div>
              <button onClick={() => { setModalNuevo(false); setForm(EMPTY_FORM) }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Acceso al portal</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} style={inputSt} placeholder="cliente@email.com" />
                </div>
              </div>

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginTop: 4 }}>Datos del cliente</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Nombre y apellido</label>
                  <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} style={inputSt} placeholder="Juan Pérez" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Razón social</label>
                  <input type="text" value={form.razon_social} onChange={e => setForm(p => ({ ...p, razon_social: e.target.value }))} style={inputSt} placeholder="Empresa S.A." />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>CUIT</label>
                  <input type="text" value={form.cuit} onChange={e => setForm(p => ({ ...p, cuit: e.target.value }))} style={inputSt} placeholder="20-12345678-9" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Teléfono</label>
                  <input type="text" value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} style={inputSt} placeholder="11 1234-5678" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Localidad</label>
                  <input type="text" value={form.localidad} onChange={e => setForm(p => ({ ...p, localidad: e.target.value }))} style={inputSt} placeholder="Rosario" />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 4 }}>Provincia</label>
                  <select value={form.provincia} onChange={e => setForm(p => ({ ...p, provincia: e.target.value }))} style={{ ...inputSt, color: form.provincia ? 'var(--text)' : 'var(--text3)' }}>
                    <option value="">Seleccioná...</option>
                    {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button
                  onClick={crearCliente}
                  disabled={creando}
                  style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 22px', fontSize: 13, fontWeight: 700, cursor: creando ? 'not-allowed' : 'pointer', opacity: creando ? 0.6 : 1, fontFamily: 'var(--font)' }}
                >
                  {creando ? 'Creando...' : 'Crear cliente'}
                </button>
                <button
                  onClick={() => { setModalNuevo(false); setForm(EMPTY_FORM) }}
                  style={{ background: 'var(--surface3)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
