import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

function formatFecha(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const STATUS_CFG = {
  pendiente: { label: 'Pendiente',  color: '#ffd166', bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.35)' },
  aprobado:  { label: 'Aprobado',   color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)' },
  recibido:  { label: 'Recibido',   color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.35)' },
  rechazado: { label: 'Rechazado',  color: '#ff5577', bg: 'rgba(255,85,119,0.12)',  border: 'rgba(255,85,119,0.35)' },
}
const TIPO_CFG = {
  falla:   { label: 'Falla / Defecto', emoji: '🔴', color: '#ff5577', bg: 'rgba(255,85,119,0.1)',   border: 'rgba(255,85,119,0.3)' },
  cambio:  { label: 'Cambio',          emoji: '🔄', color: '#fb923c', bg: 'rgba(251,146,60,0.1)',   border: 'rgba(251,146,60,0.3)' },
  exceso:  { label: 'Exceso de stock', emoji: '📦', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)',  border: 'rgba(167,139,250,0.3)' },
}

const ENVIO_LABELS = { correo: 'Correo / Andreani', logistica: 'Logística Propia', retiro: 'Retiro en Fábrica' }
const emptyItem = () => ({ codigo: '', nombre: '', modelo: '', cantidad: 1 })

export default function AdminDevoluciones() {
  const { isAdmin, isAdmin2, user, profile } = useAuth()

  // Tab principal
  const [tab, setTab] = useState('distribuidores') // 'distribuidores' | 'clientes'

  // Devoluciones distribuidores
  const [devoluciones, setDevoluciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [notaAdmin, setNotaAdmin] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmRecibido, setConfirmRecibido] = useState(null)

  // Cambios clientes
  const [cambios, setCambios] = useState([])
  const [loadingCambios, setLoadingCambios] = useState(false)
  const [busquedaCambio, setBusquedaCambio] = useState('')
  const [modalCambio, setModalCambio] = useState(false)
  const [guardandoCambio, setGuardandoCambio] = useState(false)
  const [expandidoCambio, setExpandidoCambio] = useState(null)
  const [confirmandoEntrada, setConfirmandoEntrada] = useState(null)
  // Formulario nuevo cambio
  const [cNroReclamo, setCNroReclamo] = useState('')
  const [cCliente, setCCliente] = useState('')
  const [cEnvio, setCEnvio] = useState('correo')
  const [cObs, setCObs] = useState('')
  const [cSalida, setCSalida] = useState([emptyItem()])
  const [cEntrada, setCEntrada] = useState([emptyItem()])

  useEffect(() => { if (isAdmin || isAdmin2) cargar() }, [isAdmin, isAdmin2])
  useEffect(() => { if ((isAdmin || isAdmin2) && tab === 'clientes') cargarCambios() }, [isAdmin, isAdmin2, tab])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('devoluciones')
      .select('*, profiles(full_name, razon_social, email)')
      .not('distribuidor_id', 'is', null)
      .order('created_at', { ascending: false })
    if (error) toast.error('Error al cargar devoluciones')
    else setDevoluciones(data || [])
    setLoading(false)
  }

  async function cargarCambios() {
    setLoadingCambios(true)
    const { data } = await supabase.from('cambios_cliente').select('*').order('created_at', { ascending: false })
    setCambios(data || [])
    setLoadingCambios(false)
  }

  async function crearCambio() {
    const salida = cSalida.filter(i => i.codigo && i.cantidad)
    if (!cCliente.trim()) return toast.error('Ingresá el nombre del cliente')
    if (!salida.length) return toast.error('Agregá al menos un producto de salida')
    setGuardandoCambio(true)
    const entrada = cEntrada.filter(i => i.codigo && i.cantidad)

    // Descontar stock por items de salida
    for (const item of salida) {
      const { data: st } = await supabase.from('stock_pt').select('stock_actual, stock_inicial, nombre, modelo, categoria').eq('codigo', item.codigo).single()
      if (st) {
        await supabase.from('stock_pt').update({ stock_actual: Math.max(0, (st.stock_actual || 0) - item.cantidad) }).eq('codigo', item.codigo)
        await supabase.from('movimientos_pt').insert({
          codigo: item.codigo, nombre: item.nombre || st.nombre, modelo: item.modelo || st.modelo, categoria: st.categoria || '',
          tipo: 'egreso', cantidad: item.cantidad, canal: 'Cambio Cliente',
          observacion: `Cambio cliente${cNroReclamo ? ' · Reclamo #' + cNroReclamo : ''} · ${cCliente}`,
          usuario_id: user?.id, usuario_nombre: profile?.full_name || user?.email,
          referencia_nombre: cCliente,
        })
      }
    }

    const { error } = await supabase.from('cambios_cliente').insert({
      nro_reclamo: cNroReclamo.trim() || null,
      cliente_nombre: cCliente.trim(),
      tipo_envio: cEnvio,
      items_salida: salida,
      items_entrada: entrada,
      observaciones: cObs.trim() || null,
      admin_id: user?.id,
      admin_nombre: profile?.full_name || user?.email,
      estado: entrada.length > 0 ? 'pendiente' : 'completado',
    })
    setGuardandoCambio(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Cambio registrado ✅')
    setModalCambio(false)
    setCNroReclamo(''); setCCliente(''); setCEnvio('correo'); setCObs(''); setCSalida([emptyItem()]); setCEntrada([emptyItem()])
    cargarCambios()
  }

  async function validarEntrada(cambio) {
    setGuardando(true)
    for (const item of (cambio.items_entrada || [])) {
      if (!item.codigo || !item.cantidad) continue
      const { data: st } = await supabase.from('stock_pt').select('stock_actual, stock_inicial, nombre, modelo, categoria').eq('codigo', item.codigo).single()
      if (st) {
        await supabase.from('stock_pt').update({ stock_actual: (st.stock_actual || 0) + item.cantidad }).eq('codigo', item.codigo)
        await supabase.from('movimientos_pt').insert({
          codigo: item.codigo, nombre: item.nombre || st.nombre, modelo: item.modelo || st.modelo, categoria: st.categoria || '',
          tipo: 'ingreso', cantidad: item.cantidad, canal: 'Cambio Cliente',
          observacion: `Devolución cambio${cambio.nro_reclamo ? ' · Reclamo #' + cambio.nro_reclamo : ''} · ${cambio.cliente_nombre}`,
          usuario_id: user?.id, usuario_nombre: profile?.full_name || user?.email,
          referencia_nombre: cambio.cliente_nombre,
        })
      }
    }
    await supabase.from('cambios_cliente').update({ estado: 'completado', updated_at: new Date().toISOString() }).eq('id', cambio.id)
    setGuardando(false)
    toast.success('Mercadería ingresada al stock ✅')
    setConfirmandoEntrada(null)
    cargarCambios()
  }

  async function cambiarEstado(id, estado) {
    setGuardando(true)
    const extra = {}
    if (notaAdmin.trim()) extra.notas_admin = notaAdmin.trim()
    const { error } = await supabase.from('devoluciones').update({ estado, ...extra, updated_at: new Date().toISOString() }).eq('id', id)
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(estado === 'aprobado' ? '✅ Devolución aprobada' : estado === 'rechazado' ? '❌ Devolución rechazada' : '📦 Mercadería recibida')
    setNotaAdmin('')
    setExpandido(null)
    setConfirmRecibido(null)
    cargar()
  }

  async function marcarRecibido(dev) {
    // Re-ingresar stock de los items devueltos
    for (const item of (dev.items || [])) {
      if (!item.codigo || !item.cantidad) continue
      const { data: st } = await supabase.from('stock_pt').select('stock_actual, stock_inicial, nombre, modelo, categoria').eq('codigo', item.codigo).single()
      if (st) {
        await supabase.from('stock_pt').update({ stock_actual: (st.stock_actual || 0) + item.cantidad }).eq('codigo', item.codigo)
        await supabase.from('movimientos_pt').insert({
          codigo: item.codigo, nombre: st.nombre || '', modelo: st.modelo || '', categoria: st.categoria || '',
          tipo: 'ingreso', cantidad: item.cantidad, canal: 'Devolución',
          observacion: `Devolución #${String(dev.id).slice(0,8).toUpperCase()} — ${TIPO_CFG[dev.tipo]?.label || dev.tipo}`,
          usuario_id: user?.id, usuario_nombre: profile?.full_name || user?.email,
          referencia_nombre: dev.profiles?.razon_social || dev.profiles?.full_name || null,
        })
      }
    }
    await cambiarEstado(dev.id, 'recibido')
  }

  const filtrados = devoluciones.filter(d => {
    if (filtro !== 'todos' && d.estado !== filtro) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      const nombre = (d.profiles?.razon_social || d.profiles?.full_name || '').toLowerCase()
      return nombre.includes(q) || String(d.id).slice(0,8).toLowerCase().includes(q)
    }
    return true
  })

  const counts = Object.fromEntries(Object.keys(STATUS_CFG).map(k => [k, devoluciones.filter(d => d.estado === k).length]))

  if (!isAdmin && !isAdmin2) return null

  const inputSt = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', width: '100%', boxSizing: 'border-box' }

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>↩️ Devoluciones</h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'clientes' && isAdmin && (
            <button onClick={() => setModalCambio(true)} style={{ background: 'linear-gradient(135deg,#7b9fff,#a78bfa)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>+ Nuevo cambio</button>
          )}
          <button onClick={() => tab === 'distribuidores' ? cargar() : cargarCambios()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 13, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>🔄</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[{ k: 'distribuidores', label: '🏭 Distribuidores' }, { k: 'clientes', label: '👤 Cambios Clientes' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{ padding: '8px 18px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', border: tab === t.k ? '1px solid rgba(74,108,247,0.5)' : '1px solid var(--border)', background: tab === t.k ? 'rgba(74,108,247,0.12)' : 'var(--surface)', color: tab === t.k ? '#7b9fff' : 'var(--text3)' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'clientes' ? (
        <>
          {/* Buscador */}
          <input value={busquedaCambio} onChange={e => setBusquedaCambio(e.target.value)} placeholder="🔍 Buscar por N° de reclamo o nombre de cliente..." style={{ ...inputSt, marginBottom: 16, maxWidth: 460 }} />

          {loadingCambios ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
          ) : cambios.filter(c => !busquedaCambio || c.cliente_nombre?.toLowerCase().includes(busquedaCambio.toLowerCase()) || c.nro_reclamo?.toLowerCase().includes(busquedaCambio.toLowerCase())).length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No hay cambios registrados.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cambios.filter(c => !busquedaCambio || c.cliente_nombre?.toLowerCase().includes(busquedaCambio.toLowerCase()) || c.nro_reclamo?.toLowerCase().includes(busquedaCambio.toLowerCase())).map(cambio => {
                const isExp = expandidoCambio === cambio.id
                const isPendiente = cambio.estado === 'pendiente'
                return (
                  <div key={cambio.id} style={{ background: 'var(--surface)', border: `1px solid ${isPendiente ? 'rgba(251,146,60,0.35)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => setExpandidoCambio(isExp ? null : cambio.id)}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '2px 8px', borderRadius: 4 }}>#{String(cambio.id).slice(0,8).toUpperCase()}</span>
                      {cambio.nro_reclamo && <span style={{ fontSize: 12, color: '#a78bfa', fontWeight: 600 }}>Reclamo #{cambio.nro_reclamo}</span>}
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{cambio.cliente_nombre}</span>
                      <span style={{ fontSize: 11, background: isPendiente ? 'rgba(251,146,60,0.12)' : 'rgba(61,214,140,0.12)', color: isPendiente ? '#fb923c' : '#3dd68c', border: `1px solid ${isPendiente ? 'rgba(251,146,60,0.35)' : 'rgba(61,214,140,0.35)'}`, padding: '2px 10px', borderRadius: 20, fontWeight: 700 }}>{isPendiente ? 'Pendiente ingreso' : 'Completado'}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', background: 'var(--surface2)', padding: '2px 8px', borderRadius: 10 }}>🚚 {ENVIO_LABELS[cambio.tipo_envio] || cambio.tipo_envio}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>{formatFecha(cambio.created_at)}</span>
                    </div>
                    {isExp && (
                      <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#ff5577', textTransform: 'uppercase', marginBottom: 6 }}>📤 Productos enviados al cliente</div>
                            {(cambio.items_salida || []).map((it, i) => (
                              <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                                <span style={{ fontFamily: 'monospace', color: '#7b9fff', marginRight: 6 }}>{it.codigo}</span>
                                <span style={{ fontWeight: 600 }}>{it.nombre}</span> {it.modelo && <span style={{ color: 'var(--text3)', fontSize: 11 }}>{it.modelo}</span>} <span style={{ color: '#ff5577', fontWeight: 700 }}>×{it.cantidad}</span>
                              </div>
                            ))}
                          </div>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#3dd68c', textTransform: 'uppercase', marginBottom: 6 }}>📥 Productos a recibir del cliente</div>
                            {(cambio.items_entrada || []).length === 0 ? <div style={{ fontSize: 12, color: 'var(--text3)' }}>Sin devolución de producto</div> : (cambio.items_entrada || []).map((it, i) => (
                              <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>
                                <span style={{ fontFamily: 'monospace', color: '#7b9fff', marginRight: 6 }}>{it.codigo}</span>
                                <span style={{ fontWeight: 600 }}>{it.nombre}</span> {it.modelo && <span style={{ color: 'var(--text3)', fontSize: 11 }}>{it.modelo}</span>} <span style={{ color: '#3dd68c', fontWeight: 700 }}>×{it.cantidad}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {cambio.observaciones && <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>"{cambio.observaciones}"</div>}
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>Registrado por: {cambio.admin_nombre}</div>
                        {isPendiente && (cambio.items_entrada || []).length > 0 && isAdmin2 && (
                          confirmandoEntrada === cambio.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(61,214,140,0.08)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                              <span style={{ flex: 1, color: '#3dd68c', fontSize: 13 }}>¿Confirmar recepción? Se sumará al stock.</span>
                              <button onClick={() => validarEntrada(cambio)} disabled={guardando} style={{ background: '#3dd68c', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 700, color: '#000', cursor: 'pointer', fontFamily: 'var(--font)' }}>Sí, ingresar</button>
                              <button onClick={() => setConfirmandoEntrada(null)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmandoEntrada(cambio.id)} style={{ alignSelf: 'flex-start', background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 'var(--radius)', padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#3dd68c', cursor: 'pointer', fontFamily: 'var(--font)' }}>📦 Confirmar recepción e ingresar stock</button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Modal nuevo cambio */}
          {modalCambio && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Nuevo cambio de cliente</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>N° Reclamo (opcional)</label><input value={cNroReclamo} onChange={e => setCNroReclamo(e.target.value)} placeholder="Ej: 12345" style={inputSt} /></div>
                    <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Cliente *</label><input value={cCliente} onChange={e => setCCliente(e.target.value)} placeholder="Nombre y apellido" style={inputSt} /></div>
                  </div>
                  <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Tipo de envío</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {Object.entries(ENVIO_LABELS).map(([k, l]) => (
                        <button key={k} onClick={() => setCEnvio(k)} style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', border: cEnvio === k ? '1px solid #7b9fff' : '1px solid var(--border)', background: cEnvio === k ? 'rgba(74,108,247,0.12)' : 'var(--surface2)', color: cEnvio === k ? '#7b9fff' : 'var(--text3)' }}>{l}</button>
                      ))}
                    </div>
                  </div>

                  {/* Items salida */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#ff5577', textTransform: 'uppercase', marginBottom: 6 }}>📤 Productos que salen (se entregan al cliente)</div>
                    {cSalida.map((it, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 60px 32px', gap: 6, marginBottom: 6 }}>
                        <input value={it.codigo} onChange={e => setCSalida(prev => prev.map((x,j) => j===i ? {...x, codigo: e.target.value} : x))} placeholder="Código" style={inputSt} />
                        <input value={it.nombre} onChange={e => setCSalida(prev => prev.map((x,j) => j===i ? {...x, nombre: e.target.value} : x))} placeholder="Nombre" style={inputSt} />
                        <input value={it.modelo} onChange={e => setCSalida(prev => prev.map((x,j) => j===i ? {...x, modelo: e.target.value} : x))} placeholder="Modelo" style={inputSt} />
                        <input type="number" min="1" value={it.cantidad} onChange={e => setCSalida(prev => prev.map((x,j) => j===i ? {...x, cantidad: parseInt(e.target.value)||1} : x))} style={inputSt} />
                        <button onClick={() => setCSalida(prev => prev.filter((_,j) => j!==i))} style={{ background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, color: '#ff5577', cursor: 'pointer', fontSize: 16, fontFamily: 'var(--font)' }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => setCSalida(prev => [...prev, emptyItem()])} style={{ fontSize: 12, color: '#7b9fff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 }}>+ Agregar producto</button>
                  </div>

                  {/* Items entrada */}
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#3dd68c', textTransform: 'uppercase', marginBottom: 6 }}>📥 Productos que ingresan (devuelve el cliente)</div>
                    {cEntrada.map((it, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 60px 32px', gap: 6, marginBottom: 6 }}>
                        <input value={it.codigo} onChange={e => setCEntrada(prev => prev.map((x,j) => j===i ? {...x, codigo: e.target.value} : x))} placeholder="Código" style={inputSt} />
                        <input value={it.nombre} onChange={e => setCEntrada(prev => prev.map((x,j) => j===i ? {...x, nombre: e.target.value} : x))} placeholder="Nombre" style={inputSt} />
                        <input value={it.modelo} onChange={e => setCEntrada(prev => prev.map((x,j) => j===i ? {...x, modelo: e.target.value} : x))} placeholder="Modelo" style={inputSt} />
                        <input type="number" min="1" value={it.cantidad} onChange={e => setCEntrada(prev => prev.map((x,j) => j===i ? {...x, cantidad: parseInt(e.target.value)||1} : x))} style={inputSt} />
                        <button onClick={() => setCEntrada(prev => prev.filter((_,j) => j!==i))} style={{ background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, color: '#ff5577', cursor: 'pointer', fontSize: 16, fontFamily: 'var(--font)' }}>×</button>
                      </div>
                    ))}
                    <button onClick={() => setCEntrada(prev => [...prev, emptyItem()])} style={{ fontSize: 12, color: '#7b9fff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 }}>+ Agregar producto</button>
                  </div>

                  <div><label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Observaciones</label><textarea value={cObs} onChange={e => setCObs(e.target.value)} rows={2} style={{ ...inputSt, resize: 'vertical' }} /></div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                    <button onClick={crearCambio} disabled={guardandoCambio} style={{ flex: 1, background: 'linear-gradient(135deg,#7b9fff,#a78bfa)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: guardandoCambio ? 'not-allowed' : 'pointer', opacity: guardandoCambio ? 0.7 : 1, fontFamily: 'var(--font)' }}>{guardandoCambio ? '⏳ Guardando...' : '✅ Registrar cambio'}</button>
                    <button onClick={() => setModalCambio(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <>

      {/* Cards estado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px,1fr))', gap: 10, marginBottom: 20 }}>
        {Object.entries(STATUS_CFG).map(([k, cfg]) => (
          <div key={k} onClick={() => setFiltro(filtro === k ? 'todos' : k)}
            style={{ background: filtro === k ? cfg.bg : 'var(--surface)', border: `1px solid ${filtro === k ? cfg.border : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer', transition: 'all .15s' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: cfg.color, fontFamily: 'var(--font-display)' }}>{counts[k] || 0}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{cfg.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[['todos', 'Todos'], ...Object.entries(STATUS_CFG).map(([k, c]) => [k, c.label])].map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              style={{ padding: '6px 14px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: filtro === k ? (STATUS_CFG[k]?.bg || 'rgba(74,108,247,0.1)') : 'var(--surface2)', color: filtro === k ? (STATUS_CFG[k]?.color || '#7b9fff') : 'var(--text3)', border: filtro === k ? `1px solid ${STATUS_CFG[k]?.border || 'rgba(74,108,247,0.4)'}` : '1px solid var(--border)' }}>
              {l}
            </button>
          ))}
        </div>
        <input type="text" placeholder="🔍 Buscar distribuidor o ID..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          style={{ flex: 1, minWidth: 200, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No hay devoluciones para mostrar.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtrados.map(dev => {
            const scfg = STATUS_CFG[dev.estado] || STATUS_CFG.pendiente
            const tcfg = TIPO_CFG[dev.tipo] || TIPO_CFG.falla
            const dist = dev.profiles
            const isExp = expandido === dev.id

            return (
              <div key={dev.id} style={{ background: 'var(--surface)', border: `1px solid ${isExp ? 'rgba(74,108,247,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                {/* Cabecera */}
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => setExpandido(isExp ? null : dev.id)}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                    #{String(dev.id).slice(0,8).toUpperCase()}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: scfg.bg, color: scfg.color, border: `1px solid ${scfg.border}` }}>{scfg.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: tcfg.bg, color: tcfg.color, border: `1px solid ${tcfg.border}` }}>{tcfg.emoji} {tcfg.label}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>
                    {formatDistanceToNow(new Date(dev.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>

                {/* Distribuidor */}
                <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {(dist?.razon_social || dist?.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{dist?.razon_social || dist?.full_name || '—'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{dist?.email}</div>
                  </div>
                </div>

                {/* Items resumidos */}
                <div style={{ padding: '0 20px 12px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>Productos a devolver</div>
                  {(dev.items || []).map((item, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>{item.nombre}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{item.modelo}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff' }}>#{item.codigo}</span>
                      <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--text2)' }}>x{item.cantidad}</span>
                      {item.motivo && <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>— {item.motivo}</span>}
                    </div>
                  ))}
                  {dev.pedido_referencia && (
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text3)' }}>📋 Ref. pedido: <span style={{ fontFamily: 'monospace', color: '#7b9fff' }}>{dev.pedido_referencia}</span></div>
                  )}
                  {dev.notas && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>"{dev.notas}"</div>}
                </div>

                {/* Detalle expandido */}
                {isExp && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', background: 'rgba(0,0,0,0.12)' }}>
                    {dev.notas_admin && (
                      <div style={{ background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.2)', borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 14, fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: '#ffd166' }}>Nota admin: </span>
                        <span style={{ color: 'var(--text2)' }}>{dev.notas_admin}</span>
                      </div>
                    )}

                    {/* Nota admin input */}
                    {dev.estado === 'pendiente' && (
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Nota para el distribuidor (opcional)</label>
                        <input value={notaAdmin} onChange={e => setNotaAdmin(e.target.value)}
                          placeholder="Ej: Por favor embalar correctamente y adjuntar remito..."
                          style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    )}

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {dev.estado === 'pendiente' && (
                        <>
                          <button onClick={() => cambiarEstado(dev.id, 'aprobado')} disabled={guardando}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(61,214,140,0.12)', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 'var(--radius)', padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#3dd68c', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            ✅ Aprobar devolución
                          </button>
                          <button onClick={() => cambiarEstado(dev.id, 'rechazado')} disabled={guardando}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 'var(--radius)', padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            ❌ Rechazar
                          </button>
                        </>
                      )}
                      {dev.estado === 'aprobado' && (
                        confirmRecibido === dev.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13, width: '100%' }}>
                            <span style={{ flex: 1, color: '#38bdf8' }}>¿Confirmar recepción? Se re-ingresará el stock automáticamente.</span>
                            <button onClick={() => marcarRecibido(dev)} disabled={guardando}
                              style={{ background: '#38bdf8', border: 'none', borderRadius: 6, padding: '6px 16px', fontSize: 12, fontWeight: 700, color: '#000', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              Sí, confirmar
                            </button>
                            <button onClick={() => setConfirmRecibido(null)}
                              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, color: 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmRecibido(dev.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: 'var(--radius)', padding: '8px 18px', fontSize: 13, fontWeight: 700, color: '#38bdf8', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            📦 Marcar como recibida
                          </button>
                        )
                      )}
                      {(dev.estado === 'recibido' || dev.estado === 'rechazado') && (
                        <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>
                          {dev.estado === 'recibido' ? '✅ Mercadería recibida — stock re-ingresado' : '❌ Devolución rechazada'}
                          {dev.updated_at && <span style={{ marginLeft: 8 }}>{formatFecha(dev.updated_at)}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </>
      )}
    </div>
  )
}
