import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import { CATEGORIAS_PROVEEDOR } from './Proveedores'
import { PRODUCTOS_LOG } from '@/lib/productosLog'
import toast from 'react-hot-toast'

const TIPOS = {
  entrega_pt:      { label: 'Entrega PT',        color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)',  emoji: '📦' },
  cambio_producto: { label: 'Cambio de Producto', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.35)',  emoji: '🔁' },
  cambio_garantia: { label: 'Cambio Garantía',   color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)',  emoji: '🔄' },
  retiro_insumos:  { label: 'Retiro Insumos',    color: '#7b9fff', bg: 'rgba(123,159,255,0.12)', border: 'rgba(123,159,255,0.35)', emoji: '📥' },
  llevar_insumo:   { label: 'Llevar Insumo',     color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)',  border: 'rgba(45,212,191,0.35)',  emoji: '📤' },
  retiro_service:  { label: 'Retiro Service',    color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)', emoji: '🔧' },
  retiro_items:    { label: 'Retiro de Items',   color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)', emoji: '📋' },
}

// Tipos que llevan lista de productos + datos de cliente
const TIPOS_CON_PRODUCTOS = ['entrega_pt', 'cambio_producto', 'cambio_garantia']

const ZONAS = ['Zona CABA 1', 'Zona CABA 2', 'Zona norte', 'Zona sur 1', 'Zona sur 2', 'Zona oeste', 'Zona GBA']

const EMPTY_FORM = {
  tipo: 'entrega_pt',
  nombre: '', direccion: '', localidad: '', zona: '',
  telefono: '', email: '', dni: '',
  descripcion: '', notas: '',
  productos: {},
  pedido_id: null,
  venta_id: null,
  repuesto_id: null,
  proveedor_id: null,
  fecha: '',
}

const iSt = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)',
  fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
}
const lblSt = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }

function fmtFechaLarga(f) {
  return new Date(f + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

function diasDesde(iso) {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  return d <= 0 ? 'hoy' : d === 1 ? 'hace 1 día' : `hace ${d} días`
}

export default function LogisticaDiaria() {
  const { isAdmin, isAdmin2, isChofer, user, profile } = useAuth()
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [rutaItems, setRutaItems] = useState([])   // asignados a camioneta en la fecha
  const [porAsignar, setPorAsignar] = useState([]) // sin camioneta (tengan o no fecha)
  const [loading, setLoading] = useState(false)
  const [camionetas, setCamionetas] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [choferes, setChoferes] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [guardando, setGuardando] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)
  const [pedidosPendientes, setPedidosPendientes] = useState([])
  const [ventasPendientes, setVentasPendientes] = useState([])
  const [repuestosPendientes, setRepuestosPendientes] = useState([])
  const [choferInput, setChoferInput] = useState({})     // { camionetaId: nombre }
  const [asignar, setAsignar] = useState({})             // { itemId: { fecha, camioneta_id } }
  const [flotaOpen, setFlotaOpen] = useState(false)
  const [reporteOpen, setReporteOpen] = useState(false)
  const [kmInput, setKmInput] = useState({})             // { camionetaId: { km_inicial, km_final } }
  const [ultimoKm, setUltimoKm] = useState({})           // { camionetaId: ultimo km_final conocido }

  useEffect(() => { cargar() }, [fecha])

  async function cargar() {
    setLoading(true)

    const [cam, prov, chof] = await Promise.all([
      supabase.from('camionetas').select('*').eq('activa', true).order('nombre'),
      supabase.from('proveedores').select('id,nombre,categoria,telefono,direccion,localidad').order('nombre'),
      supabase.from('choferes').select('*').eq('activo', true).order('nombre'),
    ])
    setCamionetas(cam.data || [])
    setProveedores(prov.data || [])
    setChoferes(chof.data || [])

    let fechaEfectiva = fecha
    let rutaData = []
    if (isChofer) {
      // El chofer ve SOLO su ruta pendiente (fecha >= hoy, la más próxima). No ve las viejas.
      const hoy = new Date().toISOString().split('T')[0]
      // Resolver el nombre del chofer por su email (vínculo robusto); fallback al nombre del perfil
      let nombre = (profile?.full_name || '').trim().toLowerCase()
      const { data: chRow } = await supabase.from('choferes').select('nombre').eq('email', user?.email || '').limit(1)
      if (chRow?.[0]?.nombre) nombre = chRow[0].nombre.trim().toLowerCase()
      const misTodos = await fetchAllRows(() => supabase.from('logistica_diaria').select('*').not('camioneta_id', 'is', null).gte('fecha', hoy).order('fecha').order('camioneta_id').order('orden'))
      const mineTodos = (misTodos || []).filter(i => nombre && (i.chofer_asignado || '').trim().toLowerCase() === nombre)
      // Excluir rutas ya cerradas (día cerrado por el chofer)
      const { data: cerradosData } = await supabase.from('logistica_km').select('fecha,camioneta_id').eq('cerrado', true).gte('fecha', hoy)
      const cerrados = new Set((cerradosData || []).map(r => `${r.fecha}_${r.camioneta_id}`))
      const mine = mineTodos.filter(i => !cerrados.has(`${i.fecha}_${i.camioneta_id}`))
      const fechas = [...new Set(mine.map(i => i.fecha))].sort()
      fechaEfectiva = fechas[0] || hoy
      rutaData = mine.filter(i => i.fecha === fechaEfectiva)
      setPorAsignar([])
      if (fechaEfectiva !== fecha) setFecha(fechaEfectiva)
    } else {
      const [rd, pendData] = await Promise.all([
        fetchAllRows(() => supabase.from('logistica_diaria').select('*').eq('fecha', fecha).not('camioneta_id', 'is', null).order('camioneta_id').order('orden')),
        fetchAllRows(() => supabase.from('logistica_diaria').select('*').is('camioneta_id', null).order('created_at', { ascending: true })),
      ])
      rutaData = rd || []
      setPorAsignar(pendData || [])
    }
    setRutaItems(rutaData)

    // Pre-cargar chofer inputs por camioneta desde lo ya guardado
    const chIn = {}
    for (const it of rutaData) if (it.camioneta_id && it.chofer_asignado) chIn[it.camioneta_id] = it.chofer_asignado
    setChoferInput(chIn)

    // Kilometraje / cierre: último km conocido (autocompleta inicial) + registro del día
    const [{ data: kmHist }, { data: kmData }] = await Promise.all([
      supabase.from('logistica_km').select('camioneta_id,km_final,fecha').not('km_final', 'is', null).order('fecha', { ascending: false }),
      supabase.from('logistica_km').select('*').eq('fecha', fechaEfectiva),
    ])
    const ultimo = {}
    for (const r of (kmHist || [])) if (!(r.camioneta_id in ultimo)) ultimo[r.camioneta_id] = r.km_final
    setUltimoKm(ultimo)
    // Km inicial del día = último km cargado, o el km base de la camioneta si nunca salió
    const base = {}
    for (const c of (cam.data || [])) base[c.id] = c.km_inicial
    const baseKm = c => (ultimo[c] != null ? ultimo[c] : (base[c] != null ? base[c] : ''))
    const emptyRec = c => ({ km_inicial: baseKm(c), km_final: '', combustible_monto: '', combustible_litros: '', foto_vehiculo_url: '', foto_planilla_url: '', fotos_tickets: [], cerrado: false })
    const kmIn = {}
    for (const c of (cam.data || [])) kmIn[c.id] = emptyRec(c.id)
    for (const r of (kmData || [])) kmIn[r.camioneta_id] = {
      km_inicial: r.km_inicial ?? baseKm(r.camioneta_id),
      km_final: r.km_final ?? '',
      combustible_monto: r.combustible_monto ?? '',
      combustible_litros: r.combustible_litros ?? '',
      foto_vehiculo_url: r.foto_vehiculo_url || '',
      foto_planilla_url: r.foto_planilla_url || '',
      fotos_tickets: Array.isArray(r.fotos_tickets) ? r.fotos_tickets : [],
      cerrado: !!r.cerrado,
    }
    setKmInput(kmIn)

    // Pedidos / ventas por asignar (solo admin)
    if (!isChofer) {
      const [{ data: logAsign }, { data: pedidosData }, { data: ventasData }, { data: repuestosData }] = await Promise.all([
        supabase.from('logistica_diaria').select('pedido_id,venta_id,repuesto_id'),
        supabase.from('pedidos').select('*').in('tipo_envio', ['correo', 'logistica']).in('estado', ['aprobado', 'preparando', 'modificado']).order('created_at', { ascending: false }),
        supabase.from('ventas').select('*').in('tipo_envio', ['correo', 'logistica']).not('estado', 'in', '("entregado","cancelado")').order('created_at', { ascending: false }),
        supabase.from('pedidos_repuestos').select('*').not('estado', 'in', '("enviado","entregado","cancelado")').order('created_at', { ascending: false }),
      ])
      const asignadosPedidos = new Set((logAsign || []).map(l => l.pedido_id).filter(Boolean))
      const asignadosVentas = new Set((logAsign || []).map(l => l.venta_id).filter(Boolean))
      const asignadosRepuestos = new Set((logAsign || []).map(l => l.repuesto_id).filter(Boolean))
      const pedidosFiltrados = (pedidosData || []).filter(p => !asignadosPedidos.has(p.id))
      if (pedidosFiltrados.length > 0) {
        const ids = [...new Set(pedidosFiltrados.map(p => p.distribuidor_id).filter(Boolean))]
        const { data: profsData } = await supabase.from('profiles').select('id,full_name,razon_social').in('id', ids)
        const profsMap = Object.fromEntries((profsData || []).map(p => [p.id, p]))
        setPedidosPendientes(pedidosFiltrados.map(p => ({ ...p, _profile: profsMap[p.distribuidor_id] || null })))
      } else setPedidosPendientes([])
      setVentasPendientes((ventasData || []).filter(v => !asignadosVentas.has(v.id)))

      // Repuestos: pedidos pendientes que no estén ya en logística (traer los que se entregan por logística propia)
      const repFiltrados = (repuestosData || []).filter(r => !asignadosRepuestos.has(r.id))
      if (repFiltrados.length > 0) {
        const ids = [...new Set(repFiltrados.map(r => r.tecnico_id).filter(Boolean))]
        const { data: profsRep } = await supabase.from('profiles').select('id,domicilio,localidad,telefono').in('id', ids)
        const repMap = Object.fromEntries((profsRep || []).map(p => [p.id, p]))
        setRepuestosPendientes(repFiltrados.map(r => ({ ...r, _profile: repMap[r.tecnico_id] || null })))
      } else setRepuestosPendientes([])
    }

    setLoading(false)
  }

  function abrirNuevo(tipo) { setForm({ ...EMPTY_FORM, tipo }); setEditId(null); setModalOpen(true) }

  function abrirEditar(item) {
    const productos = {}
    for (const p of (item.productos || [])) productos[p.codigo] = p.cantidad
    setForm({
      tipo: item.tipo, nombre: item.nombre || '', direccion: item.direccion || '', localidad: item.localidad || '',
      zona: item.zona || '', telefono: item.telefono || '', email: item.email || '', dni: item.dni || '',
      descripcion: item.descripcion || '', notas: item.notas || '', productos,
      pedido_id: item.pedido_id || null, venta_id: item.venta_id || null, repuesto_id: item.repuesto_id || null,
      proveedor_id: item.proveedor_id || null, fecha: item.fecha || '',
    })
    setEditId(item.id); setModalOpen(true)
  }

  function abrirDesdeVenta(venta) {
    const nombre = venta.cliente_nombre || venta.usuario_nombre || ''
    const productos = {}
    const codigosLog = new Set(PRODUCTOS_LOG.map(p => p.codigo))
    const fuente = (venta.tipo_envio === 'logistica' && (venta.envio_etiquetas || []).length > 0) ? venta.envio_etiquetas : venta.items || []
    for (const item of fuente) if (item.codigo && codigosLog.has(item.codigo) && item.cantidad > 0) productos[item.codigo] = (productos[item.codigo] || 0) + item.cantidad
    setForm({ ...EMPTY_FORM, tipo: 'entrega_pt', nombre, telefono: venta.cliente_telefono || '', email: venta.cliente_email || '', productos, venta_id: venta.id })
    setEditId(null); setModalOpen(true)
  }

  function abrirDesdePedido(pedido) {
    const nombre = pedido._profile?.razon_social || pedido._profile?.full_name || ''
    const productos = {}
    const codigosLog = new Set(PRODUCTOS_LOG.map(p => p.codigo))
    for (const item of (pedido.items || [])) if (item.codigo && codigosLog.has(item.codigo) && item.cantidad > 0) productos[item.codigo] = (productos[item.codigo] || 0) + item.cantidad
    setForm({ ...EMPTY_FORM, tipo: 'entrega_pt', nombre, productos, pedido_id: pedido.id })
    setEditId(null); setModalOpen(true)
  }

  function abrirDesdeRepuesto(r) {
    const nombre = r.razon_social || r.tecnico_nombre || r.tecnico_email || 'Repuestos'
    const items = (r.items || []).map(i => `${i.codigo || i.descripcion || ''} x${i.cantidad}`).filter(Boolean).join(', ')
    const prof = r._profile || {}
    setForm({
      ...EMPTY_FORM, tipo: 'entrega_pt', nombre,
      descripcion: items ? `Repuestos: ${items}` : 'Repuestos',
      telefono: prof.telefono || '', direccion: prof.domicilio || '', localidad: prof.localidad || '',
      email: r.tecnico_email || '', repuesto_id: r.id,
    })
    setEditId(null); setModalOpen(true)
  }

  function setProducto(codigo, val) {
    const n = parseInt(val) || 0
    setForm(prev => { const p = { ...prev.productos }; if (n > 0) p[codigo] = n; else delete p[codigo]; return { ...prev, productos: p } })
  }

  function onProveedorSelect(id) {
    const p = proveedores.find(x => x.id === id)
    if (!p) { setForm(prev => ({ ...prev, proveedor_id: null })); return }
    setForm(prev => ({
      ...prev, proveedor_id: id,
      nombre: prev.nombre || p.nombre,
      descripcion: prev.descripcion || `${prev.tipo === 'llevar_insumo' ? 'Llevar a' : 'Retiro en'} ${p.nombre}`,
      direccion: prev.direccion || p.direccion || '',
      localidad: prev.localidad || p.localidad || '',
      telefono: prev.telefono || p.telefono || '',
    }))
  }

  async function guardar() {
    const conProductos = TIPOS_CON_PRODUCTOS.includes(form.tipo)
    const principal = conProductos ? form.nombre.trim() : (form.descripcion.trim() || form.nombre.trim())
    if (!principal) return toast.error(conProductos ? 'Ingresá el nombre' : 'Ingresá la descripción')

    const productosArr = PRODUCTOS_LOG.filter(p => (form.productos[p.codigo] || 0) > 0).map(p => ({ codigo: p.codigo, label: p.label, cantidad: form.productos[p.codigo] }))

    const payload = {
      tipo: form.tipo,
      fecha: form.fecha || null,
      nombre: form.nombre.trim() || null,
      direccion: form.direccion.trim() || null,
      localidad: form.localidad.trim() || null,
      zona: form.zona.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      dni: form.dni.trim() || null,
      descripcion: form.descripcion.trim() || null,
      notas: form.notas.trim() || null,
      productos: productosArr,
      pedido_id: form.pedido_id || null,
      venta_id: form.venta_id || null,
      repuesto_id: form.repuesto_id || null,
      proveedor_id: form.proveedor_id || null,
    }

    setGuardando(true)
    if (editId) {
      const { error } = await supabase.from('logistica_diaria').update(payload).eq('id', editId)
      if (error) { toast.error('Error: ' + error.message); setGuardando(false); return }
      toast.success('Actualizado ✅')
    } else {
      const { error } = await supabase.from('logistica_diaria').insert({ ...payload, orden: 0 })
      if (error) { toast.error('Error: ' + error.message); setGuardando(false); return }
      toast.success('Agregado a Por asignar ✅')
    }
    setGuardando(false); setModalOpen(false); setEditId(null); cargar()
  }

  // Asignar día + camioneta a una parada pendiente
  async function asignarRuta(item) {
    const a = asignar[item.id] || {}
    const camId = a.camioneta_id
    const f = a.fecha || item.fecha || fecha
    if (!camId) return toast.error('Elegí una camioneta')
    const maxOrden = rutaItems.filter(i => i.camioneta_id === camId).reduce((m, i) => Math.max(m, i.orden ?? 0), -1) + 1
    const { error } = await supabase.from('logistica_diaria').update({ camioneta_id: camId, fecha: f, orden: maxOrden }).eq('id', item.id)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Asignada a la ruta ✅')
    setAsignar(prev => { const n = { ...prev }; delete n[item.id]; return n })
    cargar()
  }

  async function desasignar(item) {
    const { error } = await supabase.from('logistica_diaria').update({ camioneta_id: null, chofer_asignado: null, chofer_id: null }).eq('id', item.id)
    if (error) { toast.error('Error: ' + error.message); return }
    cargar()
  }

  async function guardarChofer(camionetaId) {
    const nombre = (choferInput[camionetaId] || '').trim()
    const ids = rutaItems.filter(i => i.camioneta_id === camionetaId).map(i => i.id)
    if (!ids.length) return
    const { error } = await supabase.from('logistica_diaria').update({ chofer_asignado: nombre || null }).in('id', ids)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(nombre ? `Chofer asignado: ${nombre}` : 'Chofer quitado')
    cargar()
  }

  function setKm(camId, field, val) {
    setKmInput(prev => ({ ...prev, [camId]: { ...(prev[camId] || {}), [field]: val } }))
  }

  const numOrNull = v => (v === '' || v == null ? null : Number(v))

  // Upsert del registro completo del día (km + combustible + fotos) para no pisar campos
  async function upsertRegistro(camId, rec, extra = {}) {
    const { error } = await supabase.from('logistica_km').upsert({
      fecha,
      camioneta_id: camId,
      km_inicial: numOrNull(rec.km_inicial),
      km_final: numOrNull(rec.km_final),
      combustible_monto: numOrNull(rec.combustible_monto),
      combustible_litros: numOrNull(rec.combustible_litros),
      foto_vehiculo_url: rec.foto_vehiculo_url || null,
      foto_planilla_url: rec.foto_planilla_url || null,
      fotos_tickets: Array.isArray(rec.fotos_tickets) ? rec.fotos_tickets : [],
      ...extra,
    }, { onConflict: 'fecha,camioneta_id' })
    return error
  }

  async function guardarKm(camId) {
    const v = kmInput[camId] || {}
    const ki = numOrNull(v.km_inicial), kf = numOrNull(v.km_final)
    if (ki != null && kf != null && kf < ki) return toast.error('El Km final no puede ser menor al inicial')
    const error = await upsertRegistro(camId, v)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Guardado ✅')
    cargar()
  }

  async function subirArchivo(file) {
    const safe = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_')
    const path = `logistica/${fecha}_${Date.now()}_${safe}`
    const { error: upErr } = await supabase.storage.from('devoluciones').upload(path, file, { upsert: false })
    if (upErr) throw upErr
    return supabase.storage.from('devoluciones').getPublicUrl(path).data.publicUrl
  }

  // Fotos de campo único (vehículo, planilla)
  async function subirFotoCierre(camId, campo, file) {
    if (!file) return
    try {
      const url = await subirArchivo(file)
      const rec = { ...(kmInput[camId] || {}), [campo]: url }
      setKmInput(prev => ({ ...prev, [camId]: rec }))
      const error = await upsertRegistro(camId, rec)
      if (error) throw new Error(error.message)
      toast.success('Foto subida ✅')
    } catch (e) { toast.error('Error al subir: ' + (e?.message || e)) }
  }

  // Tickets (varios)
  async function agregarTicket(camId, file) {
    if (!file) return
    try {
      const url = await subirArchivo(file)
      const actual = kmInput[camId] || {}
      const rec = { ...actual, fotos_tickets: [...(actual.fotos_tickets || []), url] }
      setKmInput(prev => ({ ...prev, [camId]: rec }))
      const error = await upsertRegistro(camId, rec)
      if (error) throw new Error(error.message)
      toast.success('Ticket agregado ✅')
    } catch (e) { toast.error('Error al subir: ' + (e?.message || e)) }
  }
  async function quitarTicket(camId, idx) {
    const actual = kmInput[camId] || {}
    const rec = { ...actual, fotos_tickets: (actual.fotos_tickets || []).filter((_, i) => i !== idx) }
    setKmInput(prev => ({ ...prev, [camId]: rec }))
    await upsertRegistro(camId, rec)
  }

  async function cerrarDia(camId) {
    if (!window.confirm('¿Cerrar el día de esta camioneta? La ruta deja de aparecer como pendiente.')) return
    const error = await upsertRegistro(camId, kmInput[camId] || {}, { cerrado: true, cerrado_at: new Date().toISOString() })
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Día cerrado ✅')
    cargar()
  }
  async function reabrirDia(camId) {
    const error = await upsertRegistro(camId, kmInput[camId] || {}, { cerrado: false, cerrado_at: null })
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Día reabierto')
    cargar()
  }

  async function eliminar(id) { await supabase.from('logistica_diaria').delete().eq('id', id); setConfirmDel(null); cargar() }

  async function mover(item, dir, grupo) {
    const idx = grupo.findIndex(i => i.id === item.id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= grupo.length) return
    const a = grupo[idx], b = grupo[newIdx]
    await Promise.all([
      supabase.from('logistica_diaria').update({ orden: b.orden ?? newIdx }).eq('id', a.id),
      supabase.from('logistica_diaria').update({ orden: a.orden ?? idx }).eq('id', b.id),
    ])
    cargar()
  }

  // Reordena una parada a la posición escrita (1..N) y renumera todo el grupo
  async function setOrdenManual(item, grupo, pos) {
    const n = Math.max(1, Math.min(grupo.length, parseInt(pos) || 0))
    const idx = grupo.findIndex(i => i.id === item.id)
    if (idx === -1 || idx === n - 1) return
    const arr = grupo.filter(i => i.id !== item.id)
    arr.splice(n - 1, 0, item)
    await Promise.all(arr.map((it, i) => supabase.from('logistica_diaria').update({ orden: i }).eq('id', it.id)))
    cargar()
  }

  async function confirmarEntrega(item) {
    const yaConfirmado = !!item.estado_entrega
    const payload = yaConfirmado
      ? { estado_entrega: null, entregado_at: null, chofer_nombre: null }
      : { estado_entrega: TIPOS_CON_PRODUCTOS.includes(item.tipo) ? 'entregado' : 'recibido', entregado_at: new Date().toISOString(), chofer_nombre: profile?.full_name || user?.email || 'Chofer' }
    const { error } = await supabase.from('logistica_diaria').update(payload).eq('id', item.id)
    if (error) { toast.error('Error: ' + error.message); return }
    cargar()
  }

  const RUTA_STYLES = `
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:12px}
    .ruta{page-break-before:always}
    .ruta:first-child{page-break-before:auto}
    h2{font-size:15px;margin:0 0 2px}
    .sub{font-size:11px;color:#374151;margin:0 0 8px}
    .sub b{color:#111}
    .chofer{display:inline-block;background:#111827;color:#fff;font-weight:700;padding:2px 12px;border-radius:4px}
    table{border-collapse:collapse;width:100%}
    th{background:#f3f4f6;font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:.2px;color:#374151;border:1px solid #b9c0cc;padding:4px 3px;text-align:center;word-break:break-word}
    th.y{background:#fde047}
    td{border:1px solid #b9c0cc;padding:5px;font-size:10px;vertical-align:top;height:46px}
    td.c{text-align:center}
    td.y{background:#fefce8;text-align:center;font-weight:800}
    td.num{text-align:center;font-weight:800}
    td.cambio{text-align:center;font-weight:800;color:#c2560f}
    .det{font-size:9px;color:#555;margin-top:2px}
    tr{page-break-inside:avoid}
    .resumen{margin-top:8px;font-size:11px;color:#374151;border-top:1px dashed #b9c0cc;padding-top:6px}
    .resumen b{color:#111}
    @media print{body{padding:6px}@page{size:landscape;margin:0.7cm}th,th.y,td.y,.chofer{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  `

  function bloqueRuta(camNombre, chofer, grupo) {
    const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const fechaDisplay = fmtFechaLarga(fecha)
    const YELLOW = new Set(['C500STV1', 'F1400BCO'])
    const thProd = PRODUCTOS_LOG.map(p => `<th class="${YELLOW.has(p.codigo) ? 'y' : ''}" style="width:26px">${esc(p.label)}</th>`).join('')
    const filas = grupo.map((item, i) => {
      const t = TIPOS[item.tipo]
      const cambio = ['cambio_garantia', 'cambio_producto'].includes(item.tipo) ? 'SI' : ''
      const detalle = item.nombre && item.descripcion ? `<div class="det">${esc(item.descripcion)}</div>` : ''
      const prodTds = PRODUCTOS_LOG.map(p => {
        const f = (item.productos || []).find(x => x.codigo === p.codigo)
        return `<td class="${YELLOW.has(p.codigo) ? 'y' : 'c'}">${f && f.cantidad ? f.cantidad : ''}</td>`
      }).join('')
      return `<tr>
        <td class="num">${i + 1}</td>
        <td class="c" style="font-size:9px">${esc(t?.label || item.tipo)}</td>
        <td><b>${esc(item.nombre || item.descripcion || '')}</b>${detalle}</td>
        <td>${esc(item.direccion || '')}</td>
        <td>${esc(item.localidad || '')}</td>
        <td class="c">${esc(item.zona || '')}</td>
        <td class="c">${esc(item.telefono || '')}</td>
        <td class="cambio">${cambio}</td>
        ${prodTds}
        <td>${esc(item.notas || '')}</td>
        <td></td>
      </tr>`
    }).join('')
    const totales = {}
    grupo.forEach(it => (it.productos || []).forEach(p => { if (p.cantidad > 0) totales[p.label] = (totales[p.label] || 0) + p.cantidad }))
    const resumen = Object.entries(totales).map(([l, c]) => `${esc(l)} &times;${c}`).join(' &nbsp;·&nbsp; ')
    return `<div class="ruta">
      <h2>TEMPTECH — Logística</h2>
      <p class="sub"><b>${esc(camNombre)}</b> &nbsp;·&nbsp; Chofer: <span class="chofer">${esc(chofer || '—')}</span> &nbsp;·&nbsp; ${fechaDisplay} &nbsp;·&nbsp; ${grupo.length} parada${grupo.length !== 1 ? 's' : ''}</p>
      <table>
        <thead><tr>
          <th style="width:20px">#</th><th style="width:56px">Tipo</th><th style="width:150px">Nombre / Detalle</th>
          <th style="width:130px">Dirección</th><th style="width:66px">Localidad</th><th style="width:56px">Zona</th><th style="width:72px">Tel.</th>
          <th style="width:30px">Camb.</th>${thProd}<th style="width:70px">Notas</th><th style="width:110px">Recibió conforme</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
      ${resumen ? `<div class="resumen"><b>Total a cargar:</b> ${resumen}</div>` : ''}
    </div>`
  }

  function abrirImpresion(titulo, cuerpo) {
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${titulo}</title><style>${RUTA_STYLES}</style></head><body>${cuerpo}</body></html>`
    const w = window.open('', '_blank', 'width=1400,height=800')
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400)
  }

  function imprimirRutaCamioneta(camNombre, chofer, grupo) {
    abrirImpresion(`Ruta ${camNombre} — ${fmtFechaLarga(fecha)}`, bloqueRuta(camNombre, chofer, grupo))
  }

  function imprimirTodas() {
    if (!grupos.length) return
    const cuerpo = grupos.map(({ camioneta, items }) => bloqueRuta(camioneta.nombre, choferInput[camioneta.id] || '', items)).join('')
    abrirImpresion(`Rutas del ${fmtFechaLarga(fecha)}`, cuerpo)
  }

  if (!isAdmin && !isAdmin2 && !isChofer) return null

  const conProductos = TIPOS_CON_PRODUCTOS.includes(form.tipo)
  const usaProveedor = ['retiro_insumos', 'llevar_insumo'].includes(form.tipo)

  // Agrupar ruta por camioneta
  const grupos = camionetas
    .map(c => ({ camioneta: c, items: rutaItems.filter(i => i.camioneta_id === c.id) }))
    .filter(g => g.items.length > 0)
  // Paradas asignadas a una camioneta que ya no está en la lista activa
  const idsActivas = new Set(camionetas.map(c => c.id))
  const huerfanas = rutaItems.filter(i => !idsActivas.has(i.camioneta_id))

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Logística Diaria</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>
            {isChofer ? 'Confirmá cada parada a medida que la completás' : 'Cargá tareas, armá el recorrido por camioneta y asigná el chofer'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {isChofer ? (
            <span style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 13, fontWeight: 700, color: 'var(--text2)', textTransform: 'capitalize' }}>
              📅 {fmtFechaLarga(fecha)}
            </span>
          ) : (
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }} />
          )}
          {!isChofer && (
            <>
              <button onClick={() => setReporteOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                📊 Reporte Km
              </button>
              <button onClick={() => setFlotaOpen(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                🚐 Camionetas y choferes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Botones de tipo — solo admin */}
      {!isChofer && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {Object.entries(TIPOS).map(([key, t]) => (
            <button key={key} onClick={() => abrirNuevo(key)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: t.bg, color: t.color, border: `1px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
              {t.emoji} + {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Pedidos / ventas por traer a ruta — solo admin */}
      {!isChofer && (pedidosPendientes.length > 0 || ventasPendientes.length > 0 || repuestosPendientes.length > 0) && (
        <div style={{ marginBottom: 24, background: 'rgba(74,108,247,0.04)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#7b9fff', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 12 }}>
            🚚 Traer a logística ({pedidosPendientes.length + ventasPendientes.length + repuestosPendientes.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pedidosPendientes.map(pedido => {
              const nombre = pedido._profile?.razon_social || pedido._profile?.full_name || pedido.distribuidor_id?.slice(0, 8)
              return (
                <div key={pedido.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '2px 7px', borderRadius: 4 }}>#{pedido.id.slice(0, 8).toUpperCase()}</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{nombre}</span>
                      <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 10 }}>Distribuidor</span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {(pedido.items || []).map((item, i) => (
                        <span key={i} style={{ background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.25)', color: '#3dd68c', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{item.codigo} ×{item.cantidad}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => abrirDesdePedido(pedido)} style={{ background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', flexShrink: 0 }}>➕ Traer</button>
                </div>
              )
            })}
            {ventasPendientes.map(venta => {
              const CANAL_LABEL = { meli: 'Mercado Libre', vo: 'Venta VO', pagina: 'Página Web' }
              const nombreVenta = venta.cliente_nombre || venta.usuario_nombre || '—'
              const itemsVenta = (venta.tipo_envio === 'logistica' && (venta.envio_etiquetas || []).length > 0) ? venta.envio_etiquetas : venta.items || []
              return (
                <div key={venta.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '2px 7px', borderRadius: 4 }}>#{venta.id.slice(0, 8).toUpperCase()}</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{nombreVenta}</span>
                      {venta.canal && <span style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '1px 7px', borderRadius: 10 }}>{CANAL_LABEL[venta.canal] || venta.canal}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {itemsVenta.map((item, i) => (
                        <span key={i} style={{ background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.25)', color: '#3dd68c', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{item.codigo || item.nombre} ×{item.cantidad}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => abrirDesdeVenta(venta)} style={{ background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', flexShrink: 0 }}>➕ Traer</button>
                </div>
              )
            })}
            {repuestosPendientes.map(r => {
              const nombre = r.razon_social || r.tecnico_nombre || r.tecnico_email || 'Repuestos'
              return (
                <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '2px 7px', borderRadius: 4 }}>#{r.id.slice(0, 8).toUpperCase()}</span>
                      <span style={{ fontWeight: 700, fontSize: 13 }}>{nombre}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#2dd4bf', background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)', padding: '1px 7px', borderRadius: 10 }}>🔧 Repuestos</span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {(r.items || []).map((it, i) => (
                        <span key={i} style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.25)', color: '#2dd4bf', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{it.codigo || it.descripcion} ×{it.cantidad}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => abrirDesdeRepuesto(r)} style={{ background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', flexShrink: 0 }}>➕ Traer</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── POR ASIGNAR ── */}
      {!isChofer && porAsignar.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            📥 Por asignar <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 12, padding: '1px 9px' }}>{porAsignar.length}</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}>
            Tareas cargadas que todavía no tienen día/camioneta. Asignáles cuando decidas hacerlas.
          </div>
          {/* Desglose por tipo */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {Object.entries(TIPOS).map(([key, t]) => {
              const n = porAsignar.filter(i => i.tipo === key).length
              if (!n) return null
              return (
                <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: t.bg, color: t.color, border: `1px solid ${t.border}`, borderRadius: 20, padding: '3px 11px', fontSize: 11, fontWeight: 700 }}>
                  {t.emoji} {t.label}: {n}
                </span>
              )
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {porAsignar.map(item => {
              const t = TIPOS[item.tipo]
              const prodsCon = (item.productos || []).filter(p => p.cantidad > 0)
              const a = asignar[item.id] || {}
              const isDel = confirmDel === item.id
              return (
                <div key={item.id} style={{ background: 'var(--surface)', border: `1px solid ${isDel ? 'rgba(255,85,119,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '12px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ background: t?.bg, color: t?.color, border: `1px solid ${t?.border}`, fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{t?.emoji} {t?.label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>{item.nombre || item.descripcion}</span>
                        {item.fecha && <span style={{ fontSize: 10, fontWeight: 700, color: '#fb923c', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', padding: '1px 8px', borderRadius: 10 }}>📅 {item.fecha.slice(8,10)}/{item.fecha.slice(5,7)}</span>}
                        {item.created_at && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '1px 8px', borderRadius: 10 }}>🕒 {diasDesde(item.created_at)}</span>}
                        {(item.pedido_id || item.venta_id || item.devolucion_id || item.repuesto_id) && <span style={{ fontSize: 9, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', border: '1px solid rgba(74,108,247,0.25)', padding: '1px 7px', borderRadius: 10 }}>vinculado</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text3)' }}>
                        {item.direccion && <span>📍 {item.direccion}{item.localidad ? `, ${item.localidad}` : ''}</span>}
                        {item.zona && <span style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '1px 8px', borderRadius: 12, color: 'var(--text2)', fontWeight: 600 }}>{item.zona}</span>}
                        {item.telefono && <span>📞 {item.telefono}</span>}
                      </div>
                      {item.descripcion && item.nombre && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>📝 {item.descripcion}</div>}
                      {prodsCon.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          {prodsCon.map(p => <span key={p.codigo} style={{ background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', color: '#3dd68c', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{p.label} ×{p.cantidad}</span>)}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button onClick={() => abrirEditar(item)} style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️</button>
                      {isDel ? (
                        <>
                          <button onClick={() => eliminar(item.id)} style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Eliminar</button>
                          <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>No</button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDel(item.id)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
                      )}
                    </div>
                  </div>
                  {/* Asignar día + camioneta */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                    <input type="date" value={a.fecha ?? (item.fecha || fecha)} onChange={e => setAsignar(prev => ({ ...prev, [item.id]: { ...prev[item.id], fecha: e.target.value } }))}
                      style={{ ...iSt, width: 'auto' }} />
                    <select value={a.camioneta_id || ''} onChange={e => setAsignar(prev => ({ ...prev, [item.id]: { ...prev[item.id], camioneta_id: e.target.value || null } }))}
                      style={{ ...iSt, width: 'auto', cursor: 'pointer' }}>
                      <option value="">— Camioneta —</option>
                      {camionetas.map(c => <option key={c.id} value={c.id}>{c.nombre}{c.patente ? ` (${c.patente})` : ''}</option>)}
                    </select>
                    <button onClick={() => asignarRuta(item)} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Asignar a ruta →</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── RUTAS POR CAMIONETA (fecha seleccionada) ── */}
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
          🚐 Rutas del {fmtFechaLarga(fecha)}
        </div>
        {!isChofer && grupos.length > 1 && (
          <button onClick={imprimirTodas}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            🖨️ Imprimir todas ({grupos.length})
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
      ) : grupos.length === 0 && huerfanas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🚚</div>
          {isChofer ? 'No hay rutas asignadas para esta fecha.' : 'Todavía no asignaste paradas a ninguna camioneta para este día.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {grupos.map(({ camioneta, items: grupo }) => {
            const completadas = grupo.filter(i => i.estado_entrega).length
            const chofer = choferInput[camioneta.id] ?? ''
            return (
              <div key={camioneta.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                {/* Cabecera camioneta */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>🚐 {camioneta.nombre}</span>
                    {camioneta.patente && <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'monospace' }}>{camioneta.patente}</span>}
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{grupo.length} parada{grupo.length !== 1 ? 's' : ''} · {completadas}/{grupo.length} ok</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    {isChofer ? (
                      chofer && <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700 }}>👤 {chofer}</span>
                    ) : (
                      <>
                        <input list="choferes-list" value={chofer} onChange={e => setChoferInput(prev => ({ ...prev, [camioneta.id]: e.target.value }))} placeholder="Chofer..."
                          style={{ ...iSt, width: 150, padding: '6px 10px' }} />
                        <button onClick={() => guardarChofer(camioneta.id)} style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.4)', borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Asignar chofer</button>
                        <button onClick={() => imprimirRutaCamioneta(camioneta.nombre, chofer, grupo)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>🖨️ Hoja</button>
                      </>
                    )}
                  </div>
                </div>
                {/* Km del día */}
                {(() => {
                  const km = kmInput[camioneta.id] || {}
                  const ki = km.km_inicial === '' || km.km_inicial == null ? null : Number(km.km_inicial)
                  const kf = km.km_final === '' || km.km_final == null ? null : Number(km.km_final)
                  const rec = (ki != null && kf != null && kf >= ki) ? kf - ki : null
                  const kmSt = { width: 96, padding: '6px 8px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }
                  return (
                    <div style={{ padding: '9px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
                      <span style={{ color: 'var(--text3)', fontWeight: 700 }}>🛣️ Km</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text3)' }}>
                        Inicial <b style={{ color: 'var(--text2)', fontSize: 13 }}>{ki != null ? ki : '—'}</b>
                      </span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text3)' }}>
                        Final <input type="number" value={km.km_final ?? ''} onChange={e => setKm(camioneta.id, 'km_final', e.target.value)} placeholder="—" style={kmSt} />
                      </label>
                      <span style={{ color: 'var(--text3)' }}>Recorrido: <b style={{ color: rec != null ? '#3dd68c' : 'var(--text3)' }}>{rec != null ? `${rec} km` : '—'}</b></span>
                      <button onClick={() => guardarKm(camioneta.id)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>Guardar km</button>
                    </div>
                  )
                })()}
                {/* Paradas */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {grupo.map((item, idx) => (
                    <ParadaRow key={item.id} item={item} idx={idx} grupo={grupo} isChofer={isChofer}
                      onMover={mover} onSetOrden={setOrdenManual} onEditar={abrirEditar} onConfirmar={confirmarEntrega} onDesasignar={desasignar}
                      confirmDel={confirmDel} setConfirmDel={setConfirmDel} onEliminar={eliminar} />
                  ))}
                </div>
                {/* Cierre del día */}
                {(() => {
                  const rec = kmInput[camioneta.id] || {}
                  const cerrado = !!rec.cerrado
                  const cin = { padding: '6px 8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }
                  const fileBtn = (campo, label, icon) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {rec[campo]
                        ? <a href={rec[campo]} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#3dd68c', fontWeight: 700, textDecoration: 'none' }}>{icon} Ver</a>
                        : <span style={{ fontSize: 12, color: 'var(--text3)' }}>{icon} {label}</span>}
                      <label style={{ cursor: 'pointer', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.08)', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 10px', fontWeight: 700 }}>
                        {rec[campo] ? 'Cambiar' : 'Subir'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => subirFotoCierre(camioneta.id, campo, e.target.files?.[0])} />
                      </label>
                    </div>
                  )
                  return (
                    <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cierre del día</span>
                        {cerrado && <span style={{ fontSize: 11, fontWeight: 700, color: '#3dd68c', background: 'rgba(61,214,140,0.12)', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 20, padding: '2px 10px' }}>✓ Día cerrado</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                        {fileBtn('foto_vehiculo_url', 'Foto vehículo', '🚐')}
                        {fileBtn('foto_planilla_url', 'Foto planilla firmada', '📄')}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text3)' }}>
                          ⛽ $ <input type="number" value={rec.combustible_monto ?? ''} onChange={e => setKm(camioneta.id, 'combustible_monto', e.target.value)} placeholder="0" style={{ ...cin, width: 90 }} />
                          Litros <input type="number" value={rec.combustible_litros ?? ''} onChange={e => setKm(camioneta.id, 'combustible_litros', e.target.value)} placeholder="0" style={{ ...cin, width: 70 }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text3)' }}>🧾 Tickets:</span>
                        {(rec.fotos_tickets || []).map((url, i) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}>
                            <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#3dd68c', fontWeight: 700, textDecoration: 'none' }}>#{i + 1}</a>
                            <button onClick={() => quitarTicket(camioneta.id, i)} style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                          </span>
                        ))}
                        {(rec.fotos_tickets || []).length === 0 && <span style={{ fontSize: 12, color: 'var(--text3)' }}>—</span>}
                        <label style={{ cursor: 'pointer', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.08)', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 10px', fontWeight: 700 }}>
                          + Agregar ticket
                          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => agregarTicket(camioneta.id, e.target.files?.[0])} />
                        </label>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => guardarKm(camioneta.id)} style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.4)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>💾 Guardar</button>
                        {!cerrado
                          ? <button onClick={() => cerrarDia(camioneta.id)} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>✅ Cerrar día</button>
                          : (!isChofer && <button onClick={() => reabrirDia(camioneta.id)} style={{ background: 'var(--surface)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>↩ Reabrir</button>)}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })}

          {/* Huérfanas: asignadas a camioneta inactiva/borrada */}
          {huerfanas.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid rgba(255,209,102,0.35)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', background: 'rgba(255,209,102,0.08)', fontSize: 13, fontWeight: 700, color: '#ffd166' }}>
                ⚠️ Asignadas a una camioneta inactiva ({huerfanas.length}) — reasignalas
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {huerfanas.map((item, idx) => (
                  <ParadaRow key={item.id} item={item} idx={idx} grupo={huerfanas} isChofer={isChofer}
                    onMover={mover} onEditar={abrirEditar} onConfirmar={confirmarEntrega} onDesasignar={desasignar}
                    confirmDel={confirmDel} setConfirmDel={setConfirmDel} onEliminar={eliminar} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <datalist id="choferes-list">
        {choferes.map(c => <option key={c.id} value={c.nombre} />)}
      </datalist>

      {/* ── MODAL alta/edición de parada ── */}
      {!isChofer && modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{editId ? 'Editar parada' : 'Nueva tarea de logística'}</div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Tipo */}
              <div>
                <label style={lblSt}>Tipo *</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(TIPOS).map(([key, t]) => (
                    <button key={key} onClick={() => setForm(prev => ({ ...prev, tipo: key }))}
                      style={{ padding: '6px 12px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', background: form.tipo === key ? t.bg : 'var(--surface2)', color: form.tipo === key ? t.color : 'var(--text3)', border: form.tipo === key ? `1px solid ${t.border}` : '1px solid var(--border)' }}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Proveedor (retiro o llevar insumo) */}
              {usaProveedor && (
                <div>
                  <label style={lblSt}>{form.tipo === 'llevar_insumo' ? 'Proveedor / Destino' : 'Proveedor'}</label>
                  <select value={form.proveedor_id || ''} onChange={e => onProveedorSelect(e.target.value || null)} style={{ ...iSt, cursor: 'pointer' }}>
                    <option value="">— Elegir proveedor (autocompleta datos) —</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{(CATEGORIAS_PROVEEDOR[p.categoria]?.emoji || '')} {p.nombre}</option>)}
                  </select>
                </div>
              )}

              {/* Nombre / Descripción */}
              <div>
                <label style={lblSt}>{conProductos ? 'Nombre / Razón Social *' : 'Descripción *'}</label>
                <input value={conProductos ? form.nombre : form.descripcion}
                  onChange={e => setForm(prev => conProductos ? { ...prev, nombre: e.target.value } : { ...prev, descripcion: e.target.value })}
                  placeholder={conProductos ? 'Ej: Juan García / Bella Tienda SA' : 'Ej: Retirar chiller / Retirar silicona x2'} style={iSt} />
              </div>

              {/* Detalle / producto del caso (editable también en tipos con productos) */}
              {conProductos && (
                <div>
                  <label style={lblSt}>Detalle / producto del caso (opcional)</label>
                  <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                    placeholder="Ej: Panel Calefactor Slim 500w — No calienta" style={iSt} />
                </div>
              )}

              {/* Dirección + Localidad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lblSt}>Dirección</label><input value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} placeholder="Ej: Av. Rivadavia 1234" style={iSt} /></div>
                <div><label style={lblSt}>Localidad</label><input value={form.localidad} onChange={e => setForm(p => ({ ...p, localidad: e.target.value }))} placeholder="Ej: CABA" style={iSt} /></div>
              </div>

              {/* Zona + Teléfono */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lblSt}>Zona</label>
                  <input list="zonas-list" value={form.zona} onChange={e => setForm(p => ({ ...p, zona: e.target.value }))} placeholder="Ej: Zona CABA 1" style={iSt} />
                  <datalist id="zonas-list">{ZONAS.map(z => <option key={z} value={z} />)}</datalist>
                </div>
                <div><label style={lblSt}>Teléfono</label><input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="Ej: 1145573014" style={iSt} /></div>
              </div>

              {/* DNI + Email (solo con productos) */}
              {conProductos && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div><label style={lblSt}>DNI</label><input value={form.dni} onChange={e => setForm(p => ({ ...p, dni: e.target.value }))} placeholder="Ej: 30456789" style={iSt} /></div>
                  <div><label style={lblSt}>Email</label><input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Ej: cliente@mail.com" style={iSt} /></div>
                </div>
              )}

              {/* Fecha sugerida (opcional) */}
              <div>
                <label style={lblSt}>Fecha sugerida (opcional)</label>
                <input type="date" value={form.fecha || ''} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={{ ...iSt, width: 'auto' }} />
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Si la dejás vacía, queda en "Por asignar" sin fecha.</div>
              </div>

              {/* Productos */}
              {conProductos && (
                <div>
                  <label style={lblSt}>Productos</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: 8 }}>
                    {PRODUCTOS_LOG.map(p => {
                      const qty = form.productos[p.codigo] || 0
                      return (
                        <div key={p.codigo} style={{ background: 'var(--surface2)', border: `1px solid ${qty > 0 ? 'rgba(61,214,140,0.45)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: qty > 0 ? '#3dd68c' : 'var(--text2)' }}>{p.label}</div>
                          <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'monospace' }}>{p.codigo}</div>
                          <input type="number" min="0" value={qty || ''} onChange={e => setProducto(p.codigo, e.target.value)} placeholder="0"
                            style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 6px', color: 'var(--text)', fontSize: 14, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Notas */}
              <div>
                <label style={lblSt}>Notas (opcional)</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2} placeholder="Observaciones, instrucciones especiales..." style={{ ...iSt, resize: 'vertical', lineHeight: 1.5 }} />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <button onClick={guardar} disabled={guardando} style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {guardando ? 'Guardando...' : editId ? '✓ Guardar cambios' : '✓ Agregar'}
                </button>
                <button onClick={() => setModalOpen(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL flota (camionetas) ── */}
      {!isChofer && flotaOpen && <FlotaModal camionetas={camionetas} choferes={choferes} onClose={() => setFlotaOpen(false)} onChange={cargar} />}

      {/* ── MODAL reporte de km / combustible ── */}
      {!isChofer && reporteOpen && <ReporteKmModal onClose={() => setReporteOpen(false)} />}
    </div>
  )
}

function fmtMoney(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
}

// ── Reporte de kilometraje y combustible por camioneta ──
function ReporteKmModal({ onClose }) {
  const hoy = new Date().toISOString().split('T')[0]
  const [desde, setDesde] = useState(hoy.slice(0, 8) + '01')
  const [hasta, setHasta] = useState(hoy)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { cargar() }, [desde, hasta])
  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('logistica_km').select('*, camionetas(nombre,patente)').gte('fecha', desde).lte('fecha', hasta).order('fecha')
    setRows(data || [])
    setLoading(false)
  }

  const recorrido = r => (r.km_inicial != null && r.km_final != null && r.km_final >= r.km_inicial) ? (r.km_final - r.km_inicial) : null

  const porCam = {}
  for (const r of rows) {
    const key = r.camioneta_id || 'sin'
    if (!porCam[key]) porCam[key] = { nombre: r.camionetas?.nombre || 'Camioneta', patente: r.camionetas?.patente || '', dias: 0, km: 0, comb: 0, litros: 0 }
    const g = porCam[key]
    const rec = recorrido(r)
    if (rec != null) g.km += rec
    if (r.combustible_monto) g.comb += Number(r.combustible_monto)
    if (r.combustible_litros) g.litros += Number(r.combustible_litros)
    if (r.km_final != null || r.combustible_monto != null) g.dias += 1
  }
  const grupos = Object.values(porCam).sort((a, b) => b.km - a.km)
  const totKm = grupos.reduce((s, g) => s + g.km, 0)
  const totComb = grupos.reduce((s, g) => s + g.comb, 0)
  const totLitros = grupos.reduce((s, g) => s + g.litros, 0)
  const rend = (km, l) => (l > 0 ? (km / l).toFixed(1) : '—')

  function imprimir() {
    const per = `${new Date(desde + 'T12:00:00').toLocaleDateString('es-AR')} — ${new Date(hasta + 'T12:00:00').toLocaleDateString('es-AR')}`
    const filResumen = grupos.map(g => `<tr><td>${g.nombre}${g.patente ? ` (${g.patente})` : ''}</td><td class="c">${g.dias}</td><td class="r">${g.km} km</td><td class="r">${g.litros || '—'}</td><td class="r">${fmtMoney(g.comb)}</td><td class="r">${rend(g.km, g.litros)}</td><td class="r">${g.km > 0 ? fmtMoney(g.comb / g.km) : '—'}</td></tr>`).join('')
    const filDet = rows.map(r => `<tr><td>${new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-AR')}</td><td>${r.camionetas?.nombre || ''}</td><td class="r">${r.km_inicial ?? '—'}</td><td class="r">${r.km_final ?? '—'}</td><td class="r">${recorrido(r) != null ? recorrido(r) + ' km' : '—'}</td><td class="r">${r.combustible_litros != null ? r.combustible_litros + ' L' : '—'}</td><td class="r">${r.combustible_monto != null ? fmtMoney(r.combustible_monto) : '—'}</td></tr>`).join('')
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte Km — ${per}</title>
      <style>body{font-family:Arial,sans-serif;color:#111;margin:0;padding:16px;font-size:12px}h2{margin:0 0 2px;color:#25374d}.sub{color:#374151;margin:0 0 12px}h3{margin:16px 0 6px;color:#25374d;font-size:13px}table{border-collapse:collapse;width:100%;margin-bottom:8px}th{background:#25374d;color:#fff;font-size:10px;text-transform:uppercase;padding:6px 8px;text-align:left}td{border:1px solid #b9c0cc;padding:6px 8px}.c{text-align:center}.r{text-align:right}tfoot td{font-weight:800;background:#eef1f5}@media print{@page{size:landscape;margin:1cm}th{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
      </head><body>
      <h2>TEMPTECH — Reporte de Km y Combustible</h2><p class="sub">${per}</p>
      <h3>Resumen por camioneta</h3>
      <table><thead><tr><th>Camioneta</th><th class="c">Días</th><th class="r">Km recorridos</th><th class="r">Litros</th><th class="r">Combustible</th><th class="r">km/L</th><th class="r">$ / km</th></tr></thead>
      <tbody>${filResumen}</tbody>
      <tfoot><tr><td>TOTAL</td><td class="c"></td><td class="r">${totKm} km</td><td class="r">${totLitros || '—'}</td><td class="r">${fmtMoney(totComb)}</td><td class="r">${rend(totKm, totLitros)}</td><td class="r">${totKm > 0 ? fmtMoney(totComb / totKm) : '—'}</td></tr></tfoot></table>
      <h3>Detalle por día</h3>
      <table><thead><tr><th>Fecha</th><th>Camioneta</th><th class="r">Km inicial</th><th class="r">Km final</th><th class="r">Recorrido</th><th class="r">Litros</th><th class="r">Combustible</th></tr></thead>
      <tbody>${filDet}</tbody></table>
      </body></html>`
    const w = window.open('', '_blank', 'width=1200,height=800')
    w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 350)
  }

  const inSt = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }
  const th = { padding: '8px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', borderBottom: '1px solid var(--border)' }
  const td = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid var(--border)' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 820, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>📊 Reporte de Km y Combustible</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Rango + acciones */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>Desde <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={inSt} /></label>
            <label style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>Hasta <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={inSt} /></label>
            <button onClick={imprimir} disabled={!rows.length} style={{ marginLeft: 'auto', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text2)', cursor: rows.length ? 'pointer' : 'not-allowed', opacity: rows.length ? 1 : 0.5, fontFamily: 'var(--font)' }}>🖨️ Imprimir</button>
          </div>

          {/* Totales */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160, background: 'rgba(61,214,140,0.08)', border: '1px solid rgba(61,214,140,0.25)', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>Km recorridos</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#3dd68c' }}>{totKm} <span style={{ fontSize: 14 }}>km</span></div>
            </div>
            <div style={{ flex: 1, minWidth: 150, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>Combustible</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#fb923c' }}>{fmtMoney(totComb)}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{totLitros > 0 ? `${totLitros} L · ${fmtMoney(totComb / totLitros)}/L` : '— L'}</div>
            </div>
            <div style={{ flex: 1, minWidth: 150, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', fontWeight: 700 }}>Rendimiento</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{rend(totKm, totLitros)} <span style={{ fontSize: 13 }}>km/L</span></div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{totKm > 0 ? `${fmtMoney(totComb / totKm)}/km` : '—'}</div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>Cargando...</div>
          ) : grupos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>Sin datos de km en el período.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>Camioneta</th>
                <th style={{ ...th, textAlign: 'center' }}>Días</th>
                <th style={{ ...th, textAlign: 'right' }}>Km</th>
                <th style={{ ...th, textAlign: 'right' }}>Litros</th>
                <th style={{ ...th, textAlign: 'right' }}>Combustible</th>
                <th style={{ ...th, textAlign: 'right' }}>km/L</th>
                <th style={{ ...th, textAlign: 'right' }}>$ / km</th>
              </tr></thead>
              <tbody>
                {grupos.map((g, i) => (
                  <tr key={i}>
                    <td style={{ ...td, fontWeight: 700 }}>{g.nombre}{g.patente ? <span style={{ color: 'var(--text3)', fontWeight: 400, fontSize: 11 }}> · {g.patente}</span> : ''}</td>
                    <td style={{ ...td, textAlign: 'center' }}>{g.dias}</td>
                    <td style={{ ...td, textAlign: 'right', fontWeight: 700, color: '#3dd68c' }}>{g.km} km</td>
                    <td style={{ ...td, textAlign: 'right' }}>{g.litros || '—'}</td>
                    <td style={{ ...td, textAlign: 'right' }}>{fmtMoney(g.comb)}</td>
                    <td style={{ ...td, textAlign: 'right', color: 'var(--text2)' }}>{rend(g.km, g.litros)}</td>
                    <td style={{ ...td, textAlign: 'right', color: 'var(--text3)' }}>{g.km > 0 ? fmtMoney(g.comb / g.km) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Fila de parada (dentro de una ruta) ──
function ParadaRow({ item, idx, grupo, isChofer, onMover, onSetOrden, onEditar, onConfirmar, onDesasignar, confirmDel, setConfirmDel, onEliminar }) {
  const t = TIPOS[item.tipo]
  const prodsCon = (item.productos || []).filter(p => p.cantidad > 0)
  const isDel = confirmDel === item.id
  return (
    <div style={{ display: 'flex', borderTop: idx > 0 ? '1px solid var(--border)' : 'none', background: item.estado_entrega ? 'rgba(61,214,140,0.04)' : 'transparent' }}>
      <div style={{ width: 46, background: item.estado_entrega ? 'rgba(61,214,140,0.12)' : 'var(--surface2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, flexShrink: 0, padding: '8px 4px' }}>
        {!isChofer ? (
          <>
            <input type="number" min="1" defaultValue={idx + 1} key={`${item.id}_${idx}`}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
              onBlur={e => onSetOrden(item, grupo, e.target.value)}
              title="Número de orden (escribilo para reordenar)"
              style={{ width: 36, textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '3px 2px', color: 'var(--text)', fontSize: 14, fontWeight: 800, fontFamily: 'var(--font)', outline: 'none' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => onMover(item, -1, grupo)} disabled={idx === 0} style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? 'var(--border)' : 'var(--text3)', fontSize: 11, padding: 0, lineHeight: 1 }}>▲</button>
              <button onClick={() => onMover(item, 1, grupo)} disabled={idx === grupo.length - 1} style={{ background: 'none', border: 'none', cursor: idx === grupo.length - 1 ? 'default' : 'pointer', color: idx === grupo.length - 1 ? 'var(--border)' : 'var(--text3)', fontSize: 11, padding: 0, lineHeight: 1 }}>▼</button>
            </div>
          </>
        ) : (
          <span style={{ fontSize: 16, fontWeight: 800, color: item.estado_entrega ? '#3dd68c' : 'var(--text3)' }}>{idx + 1}</span>
        )}
      </div>
      <div style={{ flex: 1, padding: '12px 16px', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ background: t?.bg, color: t?.color, border: `1px solid ${t?.border}`, fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>{t?.emoji} {t?.label}</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{item.nombre || item.descripcion}</span>
            {item.estado_entrega && <span style={{ fontSize: 10, fontWeight: 700, color: '#3dd68c', background: 'rgba(61,214,140,0.12)', border: '1px solid rgba(61,214,140,0.35)', padding: '2px 10px', borderRadius: 20 }}>{item.estado_entrega === 'entregado' ? '✅ Entregado' : '📥 Recibido'}{item.chofer_nombre ? ` · ${item.chofer_nombre}` : ''}</span>}
          </div>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            {isChofer ? (
              <button onClick={() => onConfirmar(item)} style={{ background: item.estado_entrega ? 'rgba(255,85,119,0.08)' : 'rgba(61,214,140,0.12)', color: item.estado_entrega ? '#ff5577' : '#3dd68c', border: `1px solid ${item.estado_entrega ? 'rgba(255,85,119,0.35)' : 'rgba(61,214,140,0.4)'}`, borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                {item.estado_entrega ? '↩ Deshacer' : (TIPOS_CON_PRODUCTOS.includes(item.tipo) ? '✅ Entregado' : '📥 Recibido')}
              </button>
            ) : (
              <>
                <button onClick={() => onEditar(item)} style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>✏️</button>
                <button onClick={() => onDesasignar(item)} title="Volver a Por asignar" style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>↩ Quitar</button>
                {isDel ? (
                  <>
                    <button onClick={() => onEliminar(item.id)} style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>Eliminar</button>
                    <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>No</button>
                  </>
                ) : (
                  <button onClick={() => setConfirmDel(item.id)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
                )}
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text3)' }}>
          {item.direccion && <span>📍 {item.direccion}{item.localidad ? `, ${item.localidad}` : ''}</span>}
          {item.zona && <span style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '1px 8px', borderRadius: 12, color: 'var(--text2)', fontWeight: 600 }}>{item.zona}</span>}
          {item.telefono && <span>📞 {item.telefono}</span>}
          {item.dni && <span style={{ color: 'var(--text2)' }}>DNI: {item.dni}</span>}
        </div>
        {item.descripcion && item.nombre && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 6 }}>📝 {item.descripcion}</div>}
        {prodsCon.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {prodsCon.map(p => <span key={p.codigo} style={{ background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', color: '#3dd68c', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{p.label} ×{p.cantidad}</span>)}
          </div>
        )}
        {item.notas && <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginTop: 6 }}>💬 {item.notas}</div>}
      </div>
    </div>
  )
}

// ── Modal de gestión de camionetas ──
function FlotaModal({ camionetas, choferes, onClose, onChange }) {
  const [nombre, setNombre] = useState('')
  const [patente, setPatente] = useState('')
  const [modelo, setModelo] = useState('')
  const [kmInicial, setKmInicial] = useState('')
  const [guardando, setGuardando] = useState(false)

  // Choferes
  const [chNombre, setChNombre] = useState('')
  const [chTel, setChTel] = useState('')
  const [chEmail, setChEmail] = useState('')
  const [guardandoCh, setGuardandoCh] = useState(false)

  async function agregar() {
    if (!nombre.trim()) return toast.error('Ingresá un nombre')
    setGuardando(true)
    const { error } = await supabase.from('camionetas').insert({
      nombre: nombre.trim(), patente: patente.trim() || null, modelo: modelo.trim() || null,
      km_inicial: kmInicial === '' ? null : Number(kmInicial),
    })
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    setNombre(''); setPatente(''); setModelo(''); setKmInicial(''); onChange()
  }
  async function toggleActiva(c) { await supabase.from('camionetas').update({ activa: !c.activa }).eq('id', c.id); onChange() }
  async function eliminar(c) { await supabase.from('camionetas').delete().eq('id', c.id); onChange() }

  async function agregarChofer() {
    if (!chNombre.trim()) return toast.error('Ingresá el nombre del chofer')
    setGuardandoCh(true)
    const { error } = await supabase.from('choferes').insert({ nombre: chNombre.trim(), telefono: chTel.trim() || null, email: chEmail.trim() || null })
    setGuardandoCh(false)
    if (error) { toast.error('Error: ' + error.message); return }
    setChNombre(''); setChTel(''); setChEmail(''); onChange()
  }
  async function eliminarChofer(c) { await supabase.from('choferes').delete().eq('id', c.id); onChange() }

  async function crearAcceso(c) {
    if (!c.email) return toast.error('Cargá el email del chofer primero (editá el chofer)')
    const password = window.prompt(`Contraseña para el acceso de ${c.nombre}\n(email: ${c.email}) — mínimo 6 caracteres:`, '')
    if (password === null) return
    if (password.trim().length < 6) return toast.error('La contraseña debe tener al menos 6 caracteres')
    const { data, error } = await supabase.functions.invoke('crear-acceso-chofer', {
      body: { email: c.email, password: password.trim(), nombre: c.nombre, chofer_id: c.id },
    })
    if (error || data?.error) { toast.error('Error: ' + (data?.error || error?.message)); return }
    toast.success(`Acceso creado ✅  ${c.email}`)
    onChange()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>🚐 Camionetas</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {camionetas.length === 0 && <div style={{ fontSize: 13, color: 'var(--text3)' }}>Todavía no hay camionetas. Agregá la primera.</div>}
            {camionetas.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{c.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{[c.modelo, c.patente].filter(Boolean).join(' · ') || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>🛣️ Km inicial: <b style={{ color: 'var(--text2)' }}>{c.km_inicial != null ? c.km_inicial : '—'}</b> <span style={{ opacity: 0.6 }}>(fijo)</span></div>
                </div>
                <button onClick={() => toggleActiva(c)} style={{ background: c.activa ? 'rgba(61,214,140,0.12)' : 'var(--surface)', color: c.activa ? '#3dd68c' : 'var(--text3)', border: `1px solid ${c.activa ? 'rgba(61,214,140,0.35)' : 'var(--border)'}`, borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>{c.activa ? 'Activa' : 'Inactiva'}</button>
                <button onClick={() => eliminar(c)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Agregar camioneta</div>
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre (ej: Camioneta 1)" style={iSt} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Modelo (ej: Kangoo)" style={iSt} />
              <input value={patente} onChange={e => setPatente(e.target.value)} placeholder="Patente" style={iSt} />
            </div>
            <input type="number" value={kmInicial} onChange={e => setKmInicial(e.target.value)} placeholder="Km inicial del vehículo (odómetro actual)" style={iSt} />
            <button onClick={agregar} disabled={guardando} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '9px', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>➕ Agregar camioneta</button>
          </div>

          {/* ── Choferes ── */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>👤 Choferes</div>
            {(choferes || []).length === 0 && <div style={{ fontSize: 13, color: 'var(--text3)' }}>Todavía no hay choferes. Agregá el primero.</div>}
            {(choferes || []).map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{c.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{[c.telefono, c.email].filter(Boolean).join(' · ') || '—'}</div>
                </div>
                {c.user_id
                  ? <span style={{ fontSize: 11, fontWeight: 700, color: '#3dd68c', background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 6, padding: '4px 10px' }}>✓ Acceso</span>
                  : <button onClick={() => crearAcceso(c)} style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>🔑 Crear acceso</button>}
                <button onClick={() => eliminarChofer(c)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Agregar chofer</div>
              <input value={chNombre} onChange={e => setChNombre(e.target.value)} placeholder="Nombre y apellido" style={iSt} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input value={chTel} onChange={e => setChTel(e.target.value)} placeholder="Teléfono" style={iSt} />
                <input value={chEmail} onChange={e => setChEmail(e.target.value)} placeholder="Email" style={iSt} />
              </div>
              <button onClick={agregarChofer} disabled={guardandoCh} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '9px', fontSize: 13, fontWeight: 700, cursor: guardandoCh ? 'not-allowed' : 'pointer', opacity: guardandoCh ? 0.7 : 1, fontFamily: 'var(--font)' }}>➕ Agregar chofer</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
