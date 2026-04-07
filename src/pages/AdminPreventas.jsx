import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

const ESTADO_CONFIG = {
  activa:     { label: 'Activa',     color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)' },
  completada: { label: 'Completada', color: '#7b9fff', bg: 'rgba(74,108,247,0.12)',  border: 'rgba(74,108,247,0.35)' },
  cancelada:  { label: 'Cancelada',  color: '#ff5577', bg: 'rgba(255,85,119,0.12)',  border: 'rgba(255,85,119,0.35)' },
}

export default function AdminPreventas() {
  const { isAdmin, user } = useAuth()
  const [tab, setTab] = useState('lista')           // 'lista' | 'nueva'
  const [preventas, setPreventas] = useState([])
  const [loading, setLoading] = useState(true)
  const [distribuidores, setDistribuidores] = useState([])
  const [precios, setPrecios] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('activa')
  const [expandida, setExpandida] = useState(null)

  // Form nueva preventa
  const [distId, setDistId] = useState('')
  const [itemsForm, setItemsForm] = useState([])    // [{ codigo, nombre, modelo, categoria, precio_unitario, cantidad_total }]
  const [notasForm, setNotasForm] = useState('')
  const [fechaVenc, setFechaVenc] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { if (isAdmin) { cargar(); cargarDists(); cargarPrecios() } }, [isAdmin])

  async function cargar() {
    setLoading(true)
    let q = supabase
      .from('preventas')
      .select('*, profiles(full_name, email, razon_social)')
      .order('created_at', { ascending: false })
    if (filtroEstado !== 'todos') q = q.eq('estado', filtroEstado)
    const { data, error } = await q
    if (error) toast.error('Error al cargar preventas')
    else setPreventas(data || [])
    setLoading(false)
  }

  useEffect(() => { if (isAdmin) cargar() }, [filtroEstado])

  async function cargarDists() {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, razon_social')
      .eq('user_type', 'distributor')
      .order('razon_social')
    setDistribuidores(data || [])
  }

  async function cargarPrecios() {
    const { data } = await supabase.from('precios').select('*').order('categoria').order('nombre')
    setPrecios(data || [])
  }

  function agregarItem(producto) {
    if (itemsForm.find(i => i.codigo === producto.codigo)) {
      toast('Ya está en la preventa', { icon: '⚠️' })
      return
    }
    setItemsForm(prev => [...prev, {
      codigo: producto.codigo,
      nombre: producto.nombre,
      modelo: producto.modelo,
      categoria: producto.categoria,
      precio_unitario: producto.precio,
      cantidad_total: 1,
      cantidad_retirada: 0,
    }])
  }

  function actualizarItem(idx, campo, valor) {
    setItemsForm(prev => prev.map((item, i) => {
      if (i !== idx) return item
      return { ...item, [campo]: campo === 'precio_unitario' || campo === 'cantidad_total' ? parseFloat(valor) || 0 : valor }
    }))
  }

  function quitarItem(idx) {
    setItemsForm(prev => prev.filter((_, i) => i !== idx))
  }

  async function crearPreventa() {
    if (!distId) { toast.error('Seleccioná un distribuidor'); return }
    if (itemsForm.length === 0) { toast.error('Agregá al menos un producto'); return }
    if (itemsForm.some(i => i.cantidad_total <= 0)) { toast.error('Todas las cantidades deben ser mayores a 0'); return }
    if (itemsForm.some(i => i.precio_unitario <= 0)) { toast.error('Todos los precios deben ser mayores a 0'); return }

    setGuardando(true)
    const { error } = await supabase.from('preventas').insert({
      distribuidor_id: distId,
      estado: 'activa',
      items: itemsForm,
      notas: notasForm.trim() || null,
      fecha_vencimiento: fechaVenc || null,
      created_by: user.id,
    })

    if (error) { toast.error('Error al crear preventa: ' + error.message); setGuardando(false); return }

    toast.success('Preventa creada ✅')
    setDistId('')
    setItemsForm([])
    setNotasForm('')
    setFechaVenc('')
    setGuardando(false)
    setTab('lista')
    setFiltroEstado('activa')
    cargar()
  }

  async function cambiarEstado(id, nuevoEstado) {
    const { error } = await supabase.from('preventas').update({ estado: nuevoEstado, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Error al actualizar'); return }
    toast.success(`Preventa ${nuevoEstado}`)
    cargar()
  }

  const totalPreventa = (items) => items.reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0)
  const totalRetirado = (items) => items.reduce((s, i) => s + i.precio_unitario * (i.cantidad_retirada || 0), 0)
  const totalPendiente = (items) => items.reduce((s, i) => s + i.precio_unitario * (i.cantidad_total - (i.cantidad_retirada || 0)), 0)

  if (!isAdmin) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Preventas</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Gestioná las preventas de los distribuidores</p>
        </div>
        <button
          onClick={() => setTab(tab === 'nueva' ? 'lista' : 'nueva')}
          style={{ background: tab === 'nueva' ? 'var(--surface2)' : 'var(--brand-gradient)', color: tab === 'nueva' ? 'var(--text2)' : '#fff', border: tab === 'nueva' ? '1px solid var(--border)' : 'none', borderRadius: 'var(--radius)', padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
        >
          {tab === 'nueva' ? '← Volver' : '+ Nueva preventa'}
        </button>
      </div>

      {/* ── FORM NUEVA PREVENTA ── */}
      {tab === 'nueva' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 24, alignItems: 'start' }}>
          {/* Izquierda: catálogo */}
          <div>
            {/* Distribuidor + fechas */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>Datos de la preventa</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5, fontWeight: 600 }}>Distribuidor *</label>
                  <select
                    value={distId}
                    onChange={e => setDistId(e.target.value)}
                    style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: distId ? 'var(--text)' : 'var(--text3)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
                  >
                    <option value="">Seleccioná un distribuidor...</option>
                    {distribuidores.map(d => (
                      <option key={d.id} value={d.id}>{d.razon_social || d.full_name} — {d.email}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5, fontWeight: 600 }}>Fecha de vencimiento (opcional)</label>
                  <input
                    type="date"
                    value={fechaVenc}
                    onChange={e => setFechaVenc(e.target.value)}
                    style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: 14 }}>
                <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5, fontWeight: 600 }}>Notas (opcional)</label>
                <textarea
                  value={notasForm}
                  onChange={e => setNotasForm(e.target.value)}
                  placeholder="Condiciones pactadas, observaciones..."
                  rows={2}
                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', resize: 'vertical', outline: 'none' }}
                />
              </div>
            </div>

            {/* Catálogo para agregar */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 700 }}>
                Seleccioná los productos
              </div>
              {['calefones_calderas', 'paneles_calefactores', 'anafes'].map(cat => {
                const prods = precios.filter(p => p.categoria === cat)
                if (!prods.length) return null
                const labels = { calefones_calderas: '🚿 Calefones / Calderas', paneles_calefactores: '🔆 Paneles Calefactores', anafes: '🔥 Anafes' }
                return (
                  <div key={cat}>
                    <div style={{ padding: '10px 20px', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
                      {labels[cat]}
                    </div>
                    {prods.map(p => {
                      const yaAgregado = itemsForm.find(i => i.codigo === p.codigo)
                      return (
                        <div key={p.codigo} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4 }}>{p.codigo}</span>
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{p.nombre}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{p.modelo}</div>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, minWidth: 110, textAlign: 'right' }}>{formatPrecio(p.precio)}</div>
                          <button
                            onClick={() => agregarItem(p)}
                            disabled={!!yaAgregado}
                            style={{ background: yaAgregado ? 'var(--surface2)' : 'rgba(74,108,247,0.1)', color: yaAgregado ? 'var(--text3)' : '#7b9fff', border: yaAgregado ? '1px solid var(--border)' : '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: yaAgregado ? 'default' : 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}
                          >
                            {yaAgregado ? '✓ Agregado' : '+ Agregar'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Derecha: resumen preventa */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
                📋 Detalle de la preventa
              </div>
              <div style={{ padding: '16px 20px' }}>
                {itemsForm.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>
                    Agregá productos del catálogo
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                    {itemsForm.map((item, idx) => (
                      <div key={idx} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.modelo}</div>
                          </div>
                          <button onClick={() => quitarItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16, padding: '0 0 0 8px', lineHeight: 1 }}>×</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Precio unit.</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span style={{ fontSize: 11, color: 'var(--text3)' }}>$</span>
                              <input
                                type="number" min="0" step="0.01"
                                value={item.precio_unitario}
                                onChange={e => actualizarItem(idx, 'precio_unitario', e.target.value)}
                                style={{ width: '100%', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 6px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'var(--font)' }}
                              />
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 3 }}>Cantidad total</div>
                            <input
                              type="number" min="1"
                              value={item.cantidad_total}
                              onChange={e => actualizarItem(idx, 'cantidad_total', e.target.value)}
                              style={{ width: '100%', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 6px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'var(--font)' }}
                            />
                          </div>
                        </div>
                        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: '#7b9fff', textAlign: 'right' }}>
                          {formatPrecio(item.precio_unitario * item.cantidad_total)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {itemsForm.length > 0 && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, color: '#7b9fff' }}>
                      <span>Total preventa</span>
                      <span>{formatPrecio(itemsForm.reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0))}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={crearPreventa}
                  disabled={guardando || itemsForm.length === 0 || !distId}
                  style={{ width: '100%', background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: (itemsForm.length === 0 || !distId) ? 'not-allowed' : 'pointer', opacity: (itemsForm.length === 0 || !distId) ? 0.5 : 1, fontFamily: 'var(--font)' }}
                >
                  {guardando ? 'Creando...' : '✓ Crear preventa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LISTA DE PREVENTAS ── */}
      {tab === 'lista' && (
        <>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {['todos', 'activa', 'completada', 'cancelada'].map(f => {
              const cfg = ESTADO_CONFIG[f]
              return (
                <button key={f} onClick={() => setFiltroEstado(f)} style={{
                  padding: '6px 16px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
                  background: filtroEstado === f ? (cfg?.bg || 'var(--surface3)') : 'var(--surface)',
                  color: filtroEstado === f ? (cfg?.color || 'var(--text)') : 'var(--text3)',
                  border: filtroEstado === f ? `1px solid ${cfg?.border || 'var(--border)'}` : '1px solid var(--border)',
                }}>
                  {f === 'todos' ? 'Todas' : cfg?.label}
                </button>
              )
            })}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando preventas...</div>
          ) : preventas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No hay preventas para mostrar.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {preventas.map(pv => {
                const cfg = ESTADO_CONFIG[pv.estado] || ESTADO_CONFIG.activa
                const dist = pv.profiles
                const abierta = expandida === pv.id
                const items = pv.items || []

                return (
                  <div key={pv.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    {/* Header */}
                    <div
                      onClick={() => setExpandida(abierta ? null : pv.id)}
                      style={{ padding: '14px 20px', borderBottom: abierta ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '3px 8px', borderRadius: 4 }}>
                          #{pv.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{cfg.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{dist?.razon_social || dist?.full_name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                            Retirado: <span style={{ color: '#3dd68c', fontWeight: 700 }}>{formatPrecio(totalRetirado(items))}</span>
                            {' / '}
                            <span style={{ fontWeight: 700 }}>{formatPrecio(totalPreventa(items))}</span>
                          </div>
                          {pv.fecha_vencimiento && (
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                              Vence: {new Date(pv.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-AR')}
                            </div>
                          )}
                        </div>
                        <span style={{ color: 'var(--text3)', fontSize: 14 }}>{abierta ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Detalle expandido */}
                    {abierta && (
                      <div style={{ padding: '16px 20px' }}>
                        {/* Progreso por producto */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                          {items.map((item, i) => {
                            const retirado = item.cantidad_retirada || 0
                            const pct = item.cantidad_total > 0 ? (retirado / item.cantidad_total) * 100 : 0
                            const pendiente = item.cantidad_total - retirado
                            return (
                              <div key={i} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                                  <div>
                                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4, marginRight: 8 }}>{item.codigo}</span>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.nombre}</span>
                                    <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>{item.modelo}</span>
                                  </div>
                                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                                    {formatPrecio(item.precio_unitario)} c/u
                                  </div>
                                </div>
                                {/* Barra de progreso */}
                                <div style={{ height: 6, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: pct >= 100 ? '#3dd68c' : 'var(--brand-gradient)', borderRadius: 3, transition: 'width 0.3s' }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                                  <span>Retirado: <strong style={{ color: '#3dd68c' }}>{retirado}</strong> / {item.cantidad_total}</span>
                                  <span>Pendiente: <strong style={{ color: pendiente > 0 ? '#ffd166' : 'var(--text3)' }}>{pendiente}</strong></span>
                                  <span>{formatPrecio(item.precio_unitario * retirado)} retirado</span>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Totales */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                          {[
                            { label: 'Total preventa', value: totalPreventa(items), color: 'var(--text)' },
                            { label: 'Retirado', value: totalRetirado(items), color: '#3dd68c' },
                            { label: 'Pendiente', value: totalPendiente(items), color: '#ffd166' },
                          ].map(({ label, value, color }) => (
                            <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center' }}>
                              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
                              <div style={{ fontSize: 14, fontWeight: 800, color }}>{formatPrecio(value)}</div>
                            </div>
                          ))}
                        </div>

                        {/* Notas */}
                        {pv.notas && (
                          <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                            <span style={{ fontWeight: 700, color: '#7b9fff' }}>Notas: </span>{pv.notas}
                          </div>
                        )}

                        {/* Acciones */}
                        {pv.estado === 'activa' && (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => cambiarEstado(pv.id, 'completada')} style={{ background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              ✓ Marcar completada
                            </button>
                            <button onClick={() => cambiarEstado(pv.id, 'cancelada')} style={{ background: 'rgba(255,85,119,0.08)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              Cancelar preventa
                            </button>
                          </div>
                        )}
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
