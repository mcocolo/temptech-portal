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
  const { isAdmin, isAdmin2, user } = useAuth()
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
  const [incluirIVA, setIncluirIVA] = useState(false)
  const [guardando, setGuardando] = useState(false)

  // Registrar entrega de preventa
  const [entregandoPv, setEntregandoPv] = useState(null) // id de la preventa con entrega abierta
  const [cantEntrega, setCantEntrega] = useState({})     // { codigo: cantidad }
  const [entregaIVA, setEntregaIVA] = useState(false)
  const [entregaNotas, setEntregaNotas] = useState('')
  const [entregaFactura, setEntregaFactura] = useState(null)   // File
  const [subiendoFactura, setSubiendoFactura] = useState(false)
  const [registrandoEntrega, setRegistrandoEntrega] = useState(false)

  // Edición saldo cobrado inline
  const [editandoSaldo, setEditandoSaldo] = useState(null)  // id de preventa
  const [saldoInput, setSaldoInput] = useState('')

  async function guardarSaldo(pvId) {
    const valor = parseFloat(saldoInput) || 0
    const { error } = await supabase.from('preventas').update({ saldo_cobrado: valor }).eq('id', pvId)
    if (error) { toast.error('Error al guardar saldo'); return }
    setEditandoSaldo(null)
    cargar()
  }

  // Edición de preventa existente
  const [editandoPv, setEditandoPv] = useState(null)    // id de la preventa editándose
  const [pvItemsEdit, setPvItemsEdit] = useState([])
  const [pvNotasEdit, setPvNotasEdit] = useState('')
  const [pvFechaEdit, setPvFechaEdit] = useState('')
  const [pvShowPicker, setPvShowPicker] = useState(false)
  const [pvIVAEdit, setPvIVAEdit] = useState(false)
  const [guardandoPv, setGuardandoPv] = useState(false)

  const IVA_PCT = 0.21

  useEffect(() => { if (isAdmin) { cargar(); cargarDists(); cargarPrecios() } }, [isAdmin])

  async function cargar() {
    setLoading(true)
    let q = supabase
      .from('preventas')
      .select('*')
      .order('created_at', { ascending: false })
    if (filtroEstado !== 'todos') q = q.eq('estado', filtroEstado)
    const { data, error } = await q
    if (error) { toast.error('Error al cargar preventas'); setLoading(false); return }

    // Buscar datos de distribuidores por separado
    const ids = [...new Set((data || []).map(p => p.distribuidor_id).filter(Boolean))]
    let distMap = {}
    if (ids.length > 0) {
      const { data: dists } = await supabase
        .from('profiles')
        .select('id, full_name, email, razon_social')
        .in('id', ids)
      dists?.forEach(d => { distMap[d.id] = d })
    }

    setPreventas((data || []).map(p => ({ ...p, profiles: distMap[p.distribuidor_id] || null })))
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

    const totalNeto = itemsForm.reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0)
    const ivaMonto  = incluirIVA ? totalNeto * IVA_PCT : 0

    setGuardando(true)
    const { error } = await supabase.from('preventas').insert({
      distribuidor_id: distId,
      estado: 'activa',
      items: itemsForm,
      notas: notasForm.trim() || null,
      fecha_vencimiento: fechaVenc || null,
      incluir_iva: incluirIVA,
      iva_monto: ivaMonto,
      created_by: user.id,
    })

    if (error) { toast.error('Error al crear preventa: ' + error.message); setGuardando(false); return }

    toast.success('Preventa creada ✅')
    setDistId('')
    setItemsForm([])
    setNotasForm('')
    setFechaVenc('')
    setIncluirIVA(false)
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

  function abrirEdicionPv(pv) {
    setPvItemsEdit(pv.items.map(i => ({ ...i })))
    setPvNotasEdit(pv.notas || '')
    setPvFechaEdit(pv.fecha_vencimiento || '')
    setPvIVAEdit(pv.incluir_iva || false)
    setPvShowPicker(false)
    setEditandoPv(pv.id)
  }

  function cerrarEdicionPv() {
    setEditandoPv(null)
    setPvItemsEdit([])
    setPvNotasEdit('')
    setPvFechaEdit('')
    setPvIVAEdit(false)
    setPvShowPicker(false)
  }

  function pvActualizarPrecio(idx, val) {
    const precio = Math.max(0, parseFloat(val) || 0)
    setPvItemsEdit(prev => prev.map((item, i) => i !== idx ? item : { ...item, precio_unitario: precio }))
  }

  function pvActualizarCantidad(idx, val) {
    const n = Math.max(0, parseInt(val) || 0)
    setPvItemsEdit(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const min = item.cantidad_retirada || 0
      return { ...item, cantidad_total: Math.max(n, min) }
    }))
  }

  function pvQuitarItem(idx) {
    const item = pvItemsEdit[idx]
    if ((item.cantidad_retirada || 0) > 0) { toast.error('No se puede quitar un producto que ya tiene retiros'); return }
    setPvItemsEdit(prev => prev.filter((_, i) => i !== idx))
  }

  function pvAgregarProducto(prod) {
    if (pvItemsEdit.find(i => i.codigo === prod.codigo)) { toast('Ya está en la preventa', { icon: '⚠️' }); return }
    setPvItemsEdit(prev => [...prev, {
      codigo: prod.codigo, nombre: prod.nombre, modelo: prod.modelo,
      categoria: prod.categoria, precio_unitario: prod.precio,
      cantidad_total: 1, cantidad_retirada: 0,
    }])
    setPvShowPicker(false)
  }

  async function guardarEdicionPv(pv) {
    if (pvItemsEdit.length === 0) { toast.error('La preventa debe tener al menos un producto'); return }
    if (pvItemsEdit.some(i => i.precio_unitario <= 0)) { toast.error('Todos los precios deben ser mayores a 0'); return }
    if (pvItemsEdit.some(i => i.cantidad_total <= 0)) { toast.error('Todas las cantidades deben ser mayores a 0'); return }
    const totalNetoEdit = pvItemsEdit.reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0)
    const ivaMontoEdit  = pvIVAEdit ? totalNetoEdit * IVA_PCT : 0
    setGuardandoPv(true)
    const { error } = await supabase.from('preventas').update({
      items: pvItemsEdit,
      notas: pvNotasEdit.trim() || null,
      fecha_vencimiento: pvFechaEdit || null,
      incluir_iva: pvIVAEdit,
      iva_monto: ivaMontoEdit,
      updated_at: new Date().toISOString(),
    }).eq('id', pv.id)
    setGuardandoPv(false)
    if (error) { toast.error('Error al guardar: ' + error.message); return }
    toast.success('Preventa actualizada ✅')
    cerrarEdicionPv()
    cargar()
  }

  function abrirEntrega(pv) {
    setCantEntrega({})
    setEntregaIVA(pv.incluir_iva || false)
    setEntregaNotas('')
    setEntregandoPv(pv.id)
    setEditandoPv(null) // cerrar edición si estaba abierta
  }

  function cerrarEntrega() {
    setEntregandoPv(null)
    setCantEntrega({})
    setEntregaIVA(false)
    setEntregaNotas('')
    setEntregaFactura(null)
  }

  async function registrarEntrega(pv) {
    const itemsEntrega = pv.items
      .filter(i => (cantEntrega[i.codigo] || 0) > 0)
      .map(i => ({
        codigo: i.codigo, nombre: i.nombre, modelo: i.modelo,
        categoria: i.categoria,
        precio_unitario: i.precio_unitario,
        precio_base: i.precio_unitario,
        descuento_pct: 0,
        cantidad: cantEntrega[i.codigo],
        subtotal: i.precio_unitario * cantEntrega[i.codigo],
      }))

    if (itemsEntrega.length === 0) { toast.error('Indicá al menos una cantidad'); return }

    const totalNeto = itemsEntrega.reduce((s, i) => s + i.subtotal, 0)
    const ivaMonto  = entregaIVA ? totalNeto * IVA_PCT : 0
    const totalFinal = totalNeto + ivaMonto

    setRegistrandoEntrega(true)

    // 0. Subir factura si existe
    let facturaUrl = null
    if (entregaFactura) {
      setSubiendoFactura(true)
      const ext = entregaFactura.name.split('.').pop()
      const path = `preventas/${pv.id}/${Date.now()}_factura.${ext}`
      const { error: errUp } = await supabase.storage.from('facturas').upload(path, entregaFactura, { upsert: true })
      setSubiendoFactura(false)
      if (errUp) { toast.error('Error al subir factura: ' + errUp.message); setRegistrandoEntrega(false); return }
      const { data: urlData } = supabase.storage.from('facturas').getPublicUrl(path)
      facturaUrl = urlData.publicUrl
    }

    // 1. Crear pedido aprobado
    const { error: errPedido } = await supabase.from('pedidos').insert({
      distribuidor_id: pv.distribuidor_id,
      estado: 'aprobado',
      tipo: 'preventa',
      preventa_id: pv.id,
      items: itemsEntrega,
      total: totalFinal,
      iva_monto: ivaMonto,
      incluir_iva: entregaIVA,
      notas_admin: entregaNotas.trim() || null,
      ...(facturaUrl ? { factura_url: facturaUrl } : {}),
    })

    if (errPedido) { toast.error('Error al registrar: ' + errPedido.message); setRegistrandoEntrega(false); return }

    // 2. Actualizar cantidad_retirada en la preventa
    const itemsActualizados = pv.items.map(i => ({
      ...i,
      cantidad_retirada: (i.cantidad_retirada || 0) + (cantEntrega[i.codigo] || 0),
    }))

    const { error: errPv } = await supabase.from('preventas').update({
      items: itemsActualizados,
      updated_at: new Date().toISOString(),
    }).eq('id', pv.id)

    setRegistrandoEntrega(false)

    if (errPv) { toast.error('Pedido creado pero error al actualizar la preventa: ' + errPv.message); return }

    toast.success('Entrega registrada ✅')
    cerrarEntrega()
    cargar()
  }

  const totalPreventa = (items) => items.reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0)
  const totalRetirado = (items) => items.reduce((s, i) => s + i.precio_unitario * (i.cantidad_retirada || 0), 0)
  const totalPendiente = (items) => items.reduce((s, i) => s + i.precio_unitario * (i.cantidad_total - (i.cantidad_retirada || 0)), 0)

  if (!isAdmin && !isAdmin2) return null

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

                {itemsForm.length > 0 && (() => {
                  const totalNeto = itemsForm.reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0)
                  const ivaAmount = incluirIVA ? totalNeto * IVA_PCT : 0
                  return (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 16 }}>
                      {incluirIVA && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>
                            <span>Subtotal (neto)</span>
                            <span>{formatPrecio(totalNeto)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 6 }}>
                            <span>IVA (21%)</span>
                            <span>{formatPrecio(ivaAmount)}</span>
                          </div>
                        </>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, color: '#7b9fff' }}>
                        <span>Total{incluirIVA ? ' c/IVA' : ' preventa'}</span>
                        <span>{formatPrecio(totalNeto + ivaAmount)}</span>
                      </div>
                    </div>
                  )
                })()}

                {itemsForm.length > 0 && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={incluirIVA}
                      onChange={e => setIncluirIVA(e.target.checked)}
                      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#7b9fff' }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Incluir IVA (21%)</span>
                  </label>
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
                            {(() => {
                              const neto = totalPreventa(items)
                              const total = pv.incluir_iva ? neto + (pv.iva_monto || neto * IVA_PCT) : neto
                              const retirado = totalRetirado(items)
                              return (
                                <>
                                  Retirado: <span style={{ color: '#3dd68c', fontWeight: 700 }}>{formatPrecio(retirado)}</span>
                                  {' / '}
                                  <span style={{ fontWeight: 700 }}>{formatPrecio(total)}</span>
                                  {total > 0 && (
                                    <span style={{ marginLeft: 6, color: '#3dd68c', fontWeight: 700 }}>
                                      ({((retirado / total) * 100).toFixed(0)}%)
                                    </span>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 2 }}>
                            {pv.incluir_iva && (
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.12)', border: '1px solid rgba(74,108,247,0.3)', padding: '1px 7px', borderRadius: 10 }}>
                                IVA incl.
                              </span>
                            )}
                            {pv.fecha_vencimiento && (
                              <span style={{ fontSize: 11, color: 'var(--text3)' }}>
                                Vence: {new Date(pv.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-AR')}
                              </span>
                            )}
                          </div>
                        </div>
                        <span style={{ color: 'var(--text3)', fontSize: 14 }}>{abierta ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Detalle expandido */}
                    {abierta && (
                      <div style={{ padding: '16px 20px' }}>
                        {editandoPv === pv.id ? (
                          /* ── MODO EDICIÓN ── */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {pvItemsEdit.map((item, idx) => {
                              const retirado = item.cantidad_retirada || 0
                              return (
                                <div key={idx} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                    <div>
                                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4, marginRight: 8 }}>{item.codigo}</span>
                                      <span style={{ fontSize: 13, fontWeight: 600 }}>{item.nombre}</span>
                                      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>{item.modelo}</span>
                                    </div>
                                    <button onClick={() => pvQuitarItem(idx)}
                                      disabled={retirado > 0}
                                      title={retirado > 0 ? 'Ya tiene retiros' : 'Quitar'}
                                      style={{ background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: retirado > 0 ? 'var(--text3)' : '#ff5577', cursor: retirado > 0 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                                      ✕ Quitar
                                    </button>
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div>
                                      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Precio unitario</div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ fontSize: 11, color: 'var(--text3)' }}>$</span>
                                        <input type="number" min="0" step="0.01" value={item.precio_unitario}
                                          onChange={e => pvActualizarPrecio(idx, e.target.value)}
                                          style={{ width: '100%', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 7px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
                                      </div>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                                        Cantidad total {retirado > 0 && <span style={{ color: '#ffd166', textTransform: 'none' }}>(mín. {retirado} retirados)</span>}
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <button onClick={() => pvActualizarCantidad(idx, item.cantidad_total - 1)} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                        <input type="number" min={retirado} value={item.cantidad_total}
                                          onChange={e => pvActualizarCantidad(idx, e.target.value)}
                                          style={{ width: 56, textAlign: 'center', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
                                        <button onClick={() => pvActualizarCantidad(idx, item.cantidad_total + 1)} style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--brand-gradient)', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ marginTop: 6, fontSize: 12, color: '#7b9fff', fontWeight: 700, textAlign: 'right' }}>
                                    {formatPrecio(item.precio_unitario * item.cantidad_total)}
                                  </div>
                                </div>
                              )
                            })}

                            {/* Agregar producto */}
                            <button onClick={() => setPvShowPicker(v => !v)}
                              style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px dashed rgba(74,108,247,0.4)', borderRadius: 'var(--radius)', padding: '8px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              + Agregar producto
                            </button>

                            {pvShowPicker && (
                              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px', maxHeight: 280, overflowY: 'auto' }}>
                                {['calefones_calderas', 'paneles_calefactores', 'anafes'].map(cat => {
                                  const prods = precios.filter(p => p.categoria === cat)
                                  if (!prods.length) return null
                                  const labels = { calefones_calderas: '🚿 Calefones / Calderas', paneles_calefactores: '🔆 Paneles', anafes: '🔥 Anafes' }
                                  return (
                                    <div key={cat} style={{ marginBottom: 10 }}>
                                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 5 }}>{labels[cat]}</div>
                                      {prods.map(p => (
                                        <button key={p.codigo} onClick={() => pvAgregarProducto(p)}
                                          disabled={!!pvItemsEdit.find(i => i.codigo === p.codigo)}
                                          style={{ display: 'flex', justifyContent: 'space-between', width: '100%', background: pvItemsEdit.find(i => i.codigo === p.codigo) ? 'var(--surface3)' : 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', cursor: pvItemsEdit.find(i => i.codigo === p.codigo) ? 'default' : 'pointer', fontFamily: 'var(--font)', marginBottom: 4 }}>
                                          <span style={{ fontSize: 12, color: pvItemsEdit.find(i => i.codigo === p.codigo) ? 'var(--text3)' : 'var(--text)' }}>{p.nombre} <span style={{ color: 'var(--text3)', fontSize: 11 }}>{p.modelo}</span></span>
                                          <span style={{ fontSize: 12, fontWeight: 700, color: '#7b9fff' }}>{formatPrecio(p.precio)}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {/* Toggle IVA */}
                            {(() => {
                              const netoEdit = pvItemsEdit.reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0)
                              const ivaEdit  = pvIVAEdit ? netoEdit * IVA_PCT : 0
                              return (
                                <div style={{ padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', marginBottom: pvIVAEdit ? 8 : 0 }}>
                                    <input type="checkbox" checked={pvIVAEdit} onChange={e => setPvIVAEdit(e.target.checked)}
                                      style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#7b9fff' }} />
                                    <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Incluir IVA (21%)</span>
                                  </label>
                                  {pvIVAEdit && (
                                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text3)', flexWrap: 'wrap' }}>
                                      <span>Subtotal neto: <strong style={{ color: 'var(--text)' }}>{formatPrecio(netoEdit)}</strong></span>
                                      <span>IVA: <strong style={{ color: '#7b9fff' }}>{formatPrecio(ivaEdit)}</strong></span>
                                      <span>Total c/IVA: <strong style={{ color: '#7b9fff' }}>{formatPrecio(netoEdit + ivaEdit)}</strong></span>
                                    </div>
                                  )}
                                </div>
                              )
                            })()}

                            {/* Notas y fecha */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 5 }}>Fecha de vencimiento</div>
                                <input type="date" value={pvFechaEdit} onChange={e => setPvFechaEdit(e.target.value)}
                                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
                              </div>
                              <div>
                                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 5 }}>Notas</div>
                                <textarea value={pvNotasEdit} onChange={e => setPvNotasEdit(e.target.value)} rows={2}
                                  placeholder="Condiciones pactadas..."
                                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', resize: 'none', outline: 'none' }} />
                              </div>
                            </div>

                            {/* Botones */}
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                              <button onClick={() => guardarEdicionPv(pv)} disabled={guardandoPv}
                                style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 'var(--radius)', padding: '7px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                {guardandoPv ? 'Guardando...' : '✓ Guardar cambios'}
                              </button>
                              <button onClick={cerrarEdicionPv}
                                style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : entregandoPv === pv.id ? (
                          /* ── MODO ENTREGA ── */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#3dd68c', marginBottom: 2 }}>
                              📦 Registrar entrega — indicá las cantidades a entregar
                            </div>
                            {items.map((item, i) => {
                              const pendiente = item.cantidad_total - (item.cantidad_retirada || 0)
                              const cant = cantEntrega[item.codigo] || 0
                              return (
                                <div key={i} style={{ padding: '12px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', gap: 16, opacity: pendiente === 0 ? 0.5 : 1 }}>
                                  <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4 }}>{item.codigo}</span>
                                      <span style={{ fontSize: 13, fontWeight: 600 }}>{item.nombre}</span>
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.modelo}</div>
                                    <div style={{ fontSize: 11, color: pendiente > 0 ? '#ffd166' : '#3dd68c', marginTop: 2 }}>
                                      {pendiente > 0 ? `${pendiente} disponibles` : 'Completo ✓'}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <button onClick={() => setCantEntrega(p => ({ ...p, [item.codigo]: Math.max(0, (p[item.codigo] || 0) - 1) }))} disabled={pendiente === 0 || cant === 0}
                                      style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                                    <input type="number" min="0" max={pendiente} value={cant || ''}
                                      onChange={e => setCantEntrega(p => ({ ...p, [item.codigo]: Math.min(pendiente, Math.max(0, parseInt(e.target.value) || 0)) }))}
                                      placeholder="0" disabled={pendiente === 0}
                                      style={{ width: 52, textAlign: 'center', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
                                    <button onClick={() => setCantEntrega(p => ({ ...p, [item.codigo]: Math.min(pendiente, (p[item.codigo] || 0) + 1) }))} disabled={pendiente === 0 || cant >= pendiente}
                                      style={{ width: 28, height: 28, borderRadius: 6, background: pendiente > 0 ? 'var(--brand-gradient)' : 'var(--surface2)', border: 'none', color: '#fff', cursor: pendiente > 0 ? 'pointer' : 'default', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                                  </div>
                                </div>
                              )
                            })}

                            {/* Resumen entrega */}
                            {Object.values(cantEntrega).some(v => v > 0) && (() => {
                              const itemsEnt = items.filter(i => (cantEntrega[i.codigo] || 0) > 0)
                              return (
                                <div style={{ padding: '10px 14px', background: 'rgba(61,214,140,0.06)', border: '1px solid rgba(61,214,140,0.25)', borderRadius: 'var(--radius)' }}>
                                  {itemsEnt.map(i => (
                                    <div key={i.codigo} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)', marginBottom: 3 }}>
                                      <span>{i.nombre}</span>
                                      <span style={{ fontWeight: 700, color: '#3dd68c' }}>x{cantEntrega[i.codigo]}</span>
                                    </div>
                                  ))}
                                </div>
                              )
                            })()}

                            {/* Notas */}
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Nota interna (opcional)</div>
                              <textarea value={entregaNotas} onChange={e => setEntregaNotas(e.target.value)} rows={2}
                                placeholder="Observaciones de la entrega..."
                                style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', resize: 'none', outline: 'none' }} />
                            </div>

                            {/* Factura */}
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Factura (opcional)</div>
                              {entregaFactura ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(61,214,140,0.07)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                                  <span style={{ flex: 1, color: '#3dd68c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {entregaFactura.name}</span>
                                  <button onClick={() => setEntregaFactura(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>
                                </div>
                              ) : (
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>
                                  📎 Adjuntar factura
                                  <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setEntregaFactura(e.target.files[0] || null)} />
                                </label>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                              <button onClick={() => registrarEntrega(pv)} disabled={registrandoEntrega || subiendoFactura || !Object.values(cantEntrega).some(v => v > 0)}
                                style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 'var(--radius)', padding: '7px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', opacity: !Object.values(cantEntrega).some(v => v > 0) ? 0.5 : 1 }}>
                                {subiendoFactura ? 'Subiendo factura...' : registrandoEntrega ? 'Registrando...' : '📦 Confirmar entrega'}
                              </button>
                              <button onClick={cerrarEntrega}
                                style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* ── MODO VISTA ── */
                          <>
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
                                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>{formatPrecio(item.precio_unitario)} c/u</div>
                                    </div>
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
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 8 }}>
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

                            {/* Saldo cobrado */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: pv.incluir_iva ? 8 : 16 }}>
                              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center', position: 'relative' }}>
                                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Saldo cobrado</div>
                                {editandoSaldo === pv.id ? (
                                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>$</span>
                                    <input
                                      type="number" min="0" step="0.01"
                                      value={saldoInput}
                                      onChange={e => setSaldoInput(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') guardarSaldo(pv.id); if (e.key === 'Escape') setEditandoSaldo(null) }}
                                      autoFocus
                                      style={{ width: 110, background: 'var(--surface)', border: '2px solid #7b9fff', borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'var(--font)', textAlign: 'right', fontWeight: 700 }}
                                    />
                                    <button onClick={e => { e.stopPropagation(); guardarSaldo(pv.id) }} style={{ background: 'rgba(61,214,140,0.15)', border: '1px solid rgba(61,214,140,0.4)', borderRadius: 6, color: '#3dd68c', cursor: 'pointer', fontSize: 13, padding: '2px 8px', fontFamily: 'var(--font)' }}>✓</button>
                                    <button onClick={e => { e.stopPropagation(); setEditandoSaldo(null) }} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, padding: '2px 6px' }}>✕</button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 14, fontWeight: 800, color: '#a78bfa' }}>{formatPrecio(pv.saldo_cobrado || 0)}</span>
                                    <button onClick={e => { e.stopPropagation(); setEditandoSaldo(pv.id); setSaldoInput(pv.saldo_cobrado || 0) }}
                                      style={{ background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.4)', borderRadius: 6, color: '#a78bfa', cursor: 'pointer', fontSize: 12, padding: '2px 8px', fontFamily: 'var(--font)', fontWeight: 600 }}>✏️ Editar</button>
                                  </div>
                                )}
                              </div>
                              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center' }}>
                                <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Saldo deudor</div>
                                {(() => {
                                  const total = pv.incluir_iva ? totalPreventa(items) + (pv.iva_monto || totalPreventa(items) * IVA_PCT) : totalPreventa(items)
                                  const deuda = Math.max(0, total - (pv.saldo_cobrado || 0))
                                  return <div style={{ fontSize: 14, fontWeight: 800, color: deuda > 0 ? '#ff5577' : '#3dd68c' }}>{formatPrecio(deuda)}</div>
                                })()}
                              </div>
                            </div>
                            {pv.incluir_iva && (
                              <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 'var(--radius)', display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 12 }}>
                                <span style={{ color: 'var(--text3)' }}>Subtotal neto: <strong style={{ color: 'var(--text)' }}>{formatPrecio(totalPreventa(items))}</strong></span>
                                <span style={{ color: 'var(--text3)' }}>IVA (21%): <strong style={{ color: '#7b9fff' }}>{formatPrecio(pv.iva_monto || totalPreventa(items) * IVA_PCT)}</strong></span>
                                <span style={{ color: 'var(--text3)' }}>Total c/IVA: <strong style={{ color: '#7b9fff' }}>{formatPrecio(totalPreventa(items) + (pv.iva_monto || totalPreventa(items) * IVA_PCT))}</strong></span>
                              </div>
                            )}

                            {/* Notas */}
                            {pv.notas && (
                              <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                                <span style={{ fontWeight: 700, color: '#7b9fff' }}>Notas: </span>{pv.notas}
                              </div>
                            )}

                            {/* Acciones */}
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button onClick={() => abrirEdicionPv(pv)}
                                style={{ background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                ✏️ Editar preventa
                              </button>
                              {pv.estado === 'activa' && (
                                <>
                                  <button onClick={() => abrirEntrega(pv)}
                                    style={{ background: 'rgba(61,214,140,0.1)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                    📦 Registrar entrega
                                  </button>
                                  <button onClick={() => cambiarEstado(pv.id, 'completada')} style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                    ✓ Marcar completada
                                  </button>
                                  <button onClick={() => cambiarEstado(pv.id, 'cancelada')} style={{ background: 'rgba(255,85,119,0.08)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                                    Cancelar preventa
                                  </button>
                                </>
                              )}
                            </div>
                          </>
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
