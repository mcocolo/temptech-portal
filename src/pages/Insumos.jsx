import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, Plus, Package, TrendingUp, TrendingDown, History, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

const SECTORES = ['Corte', 'Alambre', 'Pegado', 'Encuadre', 'Aguj2', 'Lija', 'Pintura', 'Cables + Kits', 'Electrica', 'Embalaje', '1400w']
const UNIDADES = ['unidades', 'kg', 'litros', 'metros', 'rollos', 'cajas', 'pares', 'pliegos']

const inputSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }

const MODELOS = ['Slim', 'Firenze', 'Slim/Firenze']
const MODELO_COLOR = { Slim: '#7b9fff', Firenze: '#fb923c', 'Slim/Firenze': '#a78bfa' }

const EMPTY_FORM = {
  codigo: '', descripcion: '', unidad: 'unidades',
  proveedor_nombre: '', proveedor_direccion: '', proveedor_telefono: '', proveedor_horario: '', proveedor_contacto: '',
  sectores: [], stock_actual: 0, stock_minimo: 0, modelo: '',
}

function stockColor(actual, minimo) {
  if (actual <= 0) return '#ff5577'
  if (actual <= minimo) return '#fb923c'
  return '#3dd68c'
}
function stockLabel(actual, minimo) {
  if (actual <= 0) return 'Sin stock'
  if (actual <= minimo) return 'Stock bajo'
  return 'OK'
}

export default function Insumos() {
  const { isAdmin, isAdmin2, user, profile } = useAuth()
  const location = useLocation()
  const tipo = location.pathname.includes('indirectos') ? 'indirecto' : 'directo'
  const titulo = tipo === 'directo' ? 'Insumos Directos' : 'Insumos Indirectos'
  const color  = tipo === 'directo' ? '#7b9fff' : '#a78bfa'

  const [insumos, setInsumos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroSector, setFiltroSector] = useState('')
  const [filtroModelo, setFiltroModelo] = useState('')
  const [expandido, setExpandido] = useState(null)

  // Modal insumo
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [guardando, setGuardando] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  // Modal stock
  const [modalStock, setModalStock] = useState(null) // insumo obj
  const [stockTipo, setStockTipo] = useState('ingreso') // ingreso | egreso | ajuste
  const [stockCantidad, setStockCantidad] = useState('')
  const [stockSector, setStockSector] = useState('')
  const [stockMotivo, setStockMotivo] = useState('')
  const [guardandoStock, setGuardandoStock] = useState(false)

  // Historial
  const [historial, setHistorial] = useState([])
  const [loadingHist, setLoadingHist] = useState(false)
  const [tabDetalle, setTabDetalle] = useState('info') // info | historial

  useEffect(() => { cargar() }, [tipo])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('insumos')
      .select('*')
      .eq('tipo', tipo)
      .order('codigo')
    if (error) toast.error('Error al cargar insumos')
    else setInsumos(data || [])
    setLoading(false)
  }

  async function cargarHistorial(insumoId) {
    setLoadingHist(true)
    const { data } = await supabase
      .from('movimientos_insumos')
      .select('*')
      .eq('insumo_id', insumoId)
      .order('created_at', { ascending: false })
      .limit(50)
    setHistorial(data || [])
    setLoadingHist(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ ...EMPTY_FORM })
    setModal(true)
  }

  function abrirEditar(ins) {
    setEditando(ins)
    setForm({
      codigo: ins.codigo, descripcion: ins.descripcion, unidad: ins.unidad || 'unidades',
      proveedor_nombre: ins.proveedor_nombre || '', proveedor_direccion: ins.proveedor_direccion || '',
      proveedor_telefono: ins.proveedor_telefono || '', proveedor_horario: ins.proveedor_horario || '',
      proveedor_contacto: ins.proveedor_contacto || '',
      sectores: ins.sectores || [], stock_actual: ins.stock_actual || 0, stock_minimo: ins.stock_minimo || 0, modelo: ins.modelo || '',
    })
    setModal(true)
  }

  async function guardar() {
    if (!form.codigo.trim()) return toast.error('Ingresá el código')
    if (!form.descripcion.trim()) return toast.error('Ingresá la descripción')
    setGuardando(true)
    const payload = {
      ...form,
      codigo: form.codigo.trim().toUpperCase(),
      tipo,
      stock_actual: parseFloat(form.stock_actual) || 0,
      stock_minimo: parseFloat(form.stock_minimo) || 0,
      updated_at: new Date().toISOString(),
    }
    const { error } = editando
      ? await supabase.from('insumos').update(payload).eq('id', editando.id)
      : await supabase.from('insumos').insert(payload)
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(editando ? 'Insumo actualizado ✅' : 'Insumo creado ✅')
    setModal(false)
    cargar()
  }

  async function eliminar(id) {
    const { error } = await supabase.from('insumos').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Insumo eliminado')
    setConfirmDel(null)
    setExpandido(null)
    cargar()
  }

  async function registrarMovimiento() {
    if (!stockCantidad || parseFloat(stockCantidad) <= 0) return toast.error('Ingresá una cantidad válida')
    if (stockTipo === 'egreso' && !stockSector) return toast.error('Seleccioná el sector de uso')
    setGuardandoStock(true)

    const cantidad = parseFloat(stockCantidad)
    const actual = modalStock.stock_actual || 0
    let nuevo
    if (stockTipo === 'ingreso') nuevo = actual + cantidad
    else if (stockTipo === 'egreso') nuevo = Math.max(0, actual - cantidad)
    else nuevo = cantidad // ajuste directo

    await supabase.from('insumos').update({ stock_actual: nuevo, updated_at: new Date().toISOString() }).eq('id', modalStock.id)
    await supabase.from('movimientos_insumos').insert({
      insumo_id: modalStock.id,
      tipo: stockTipo,
      cantidad,
      sector: stockSector || null,
      motivo: stockMotivo || null,
      usuario_id: user?.id,
      usuario_nombre: profile?.full_name || user?.email,
    })

    toast.success(stockTipo === 'ingreso' ? '📦 Ingreso registrado' : stockTipo === 'egreso' ? '📤 Egreso registrado' : '🔧 Stock ajustado')
    setGuardandoStock(false)
    setModalStock(null)
    setStockCantidad(''); setStockSector(''); setStockMotivo('')
    cargar()
  }

  function toggleExpand(id) {
    if (expandido === id) { setExpandido(null); return }
    setExpandido(id)
    setTabDetalle('info')
  }

  function verHistorial(ins) {
    setExpandido(ins.id)
    setTabDetalle('historial')
    cargarHistorial(ins.id)
  }

  const filtrados = insumos.filter(ins => {
    if (filtroSector && !ins.sectores?.includes(filtroSector)) return false
    if (filtroModelo && ins.modelo !== filtroModelo) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return ins.codigo.toLowerCase().includes(q) || ins.descripcion.toLowerCase().includes(q) || (ins.proveedor_nombre || '').toLowerCase().includes(q)
    }
    return true
  })

  const bajosStock = insumos.filter(i => (i.stock_actual || 0) <= (i.stock_minimo || 0))

  if (!isAdmin && !isAdmin2) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: color }}>{titulo}</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>
            {tipo === 'directo' ? 'Insumos propios del producto (pintura, materiales, componentes)' : 'Insumos de apoyo a la producción (EPP, herramientas, consumibles)'}
          </p>
        </div>
        <button onClick={abrirNuevo}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: color === '#7b9fff' ? 'rgba(123,159,255,0.15)' : 'rgba(167,139,250,0.15)', border: `1px solid ${color}40`, borderRadius: 'var(--radius)', padding: '9px 18px', fontSize: 13, fontWeight: 700, color, cursor: 'pointer', fontFamily: 'var(--font)' }}>
          <Plus size={15} /> Nuevo insumo
        </button>
      </div>

      {/* Cards resumen */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total insumos', value: insumos.length, color: color, bg: `${color}18` },
          { label: 'Stock bajo / sin stock', value: bajosStock.length, color: bajosStock.length > 0 ? '#fb923c' : '#3dd68c', bg: bajosStock.length > 0 ? 'rgba(251,146,60,0.12)' : 'rgba(61,214,140,0.12)' },
          { label: 'Sectores cubiertos', value: [...new Set(insumos.flatMap(i => i.sectores || []))].length, color: '#3dd68c', bg: 'rgba(61,214,140,0.12)' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, border: `1px solid ${c.color}30`, borderRadius: 'var(--radius-lg)', padding: '16px 18px' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.color, fontFamily: 'var(--font-display)' }}>{c.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Alertas stock bajo */}
      {bajosStock.length > 0 && (
        <div style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle size={16} color="#fb923c" style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fb923c', marginBottom: 4 }}>⚠️ {bajosStock.length} insumo{bajosStock.length > 1 ? 's' : ''} con stock bajo o sin stock</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {bajosStock.map(i => (
                <span key={i.id} style={{ fontSize: 11, background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.35)', borderRadius: 4, padding: '2px 8px', color: '#fb923c', cursor: 'pointer', fontFamily: 'monospace' }}
                  onClick={() => { setExpandido(i.id); setTabDetalle('info') }}>
                  {i.codigo} ({i.stock_actual} {i.unidad})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: 20, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Buscar código, descripción o proveedor..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ ...inputSt, flex: 1, minWidth: 200 }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setFiltroSector('')}
            style={{ padding: '5px 12px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: !filtroSector ? `${color}20` : 'var(--surface2)', color: !filtroSector ? color : 'var(--text3)', border: !filtroSector ? `1px solid ${color}50` : '1px solid var(--border)' }}>
            Todos
          </button>
          {SECTORES.map(s => (
            <button key={s} onClick={() => setFiltroSector(s === filtroSector ? '' : s)}
              style={{ padding: '5px 12px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: filtroSector === s ? `${color}20` : 'var(--surface2)', color: filtroSector === s ? color : 'var(--text3)', border: filtroSector === s ? `1px solid ${color}50` : '1px solid var(--border)' }}>
              {s}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 6, borderTop: '1px solid var(--border)' }}>
          <span style={{ fontSize: 11, color: 'var(--text3)', alignSelf: 'center', marginRight: 2 }}>Modelo:</span>
          <button onClick={() => setFiltroModelo('')}
            style={{ padding: '5px 12px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: !filtroModelo ? 'rgba(255,255,255,0.1)' : 'var(--surface2)', color: !filtroModelo ? 'var(--text)' : 'var(--text3)', border: !filtroModelo ? '1px solid var(--border)' : '1px solid var(--border)' }}>
            Todos
          </button>
          {MODELOS.map(m => {
            const mc = MODELO_COLOR[m]
            return (
              <button key={m} onClick={() => setFiltroModelo(m === filtroModelo ? '' : m)}
                style={{ padding: '5px 12px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: filtroModelo === m ? `${mc}20` : 'var(--surface2)', color: filtroModelo === m ? mc : 'var(--text3)', border: filtroModelo === m ? `1px solid ${mc}50` : '1px solid var(--border)' }}>
                {m}
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No hay insumos{filtroSector ? ` para el sector "${filtroSector}"` : ''}.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.map(ins => {
            const sc = stockColor(ins.stock_actual, ins.stock_minimo)
            const sl = stockLabel(ins.stock_actual, ins.stock_minimo)
            const isExp = expandido === ins.id
            return (
              <div key={ins.id} style={{ background: 'var(--surface)', border: `1px solid ${isExp ? color + '40' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'border-color .2s' }}>
                {/* Fila principal */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggleExpand(ins.id)}>
                  <div style={{ minWidth: 90, fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color }}>
                    {ins.codigo}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{ins.descripcion}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                      {ins.modelo && (() => { const mc = MODELO_COLOR[ins.modelo] || '#888'; return <span style={{ fontSize: 10, background: `${mc}20`, border: `1px solid ${mc}40`, color: mc, borderRadius: 3, padding: '1px 6px', fontWeight: 700 }}>{ins.modelo}</span> })()}
                      {(ins.sectores || []).map(s => (
                        <span key={s} style={{ fontSize: 10, background: `${color}15`, border: `1px solid ${color}30`, color, borderRadius: 3, padding: '1px 6px' }}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: sc, fontFamily: 'var(--font-display)' }}>
                        {ins.stock_actual ?? 0}
                        <span style={{ fontSize: 11, fontWeight: 400, marginLeft: 3 }}>{ins.unidad}</span>
                      </div>
                      <div style={{ fontSize: 10, color: sc, fontWeight: 700 }}>{sl}</div>
                    </div>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sc, flexShrink: 0 }} />
                    {isExp ? <ChevronUp size={14} color="var(--text3)" /> : <ChevronDown size={14} color="var(--text3)" />}
                  </div>
                </div>

                {/* Detalle expandido */}
                {isExp && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                      {['info', 'historial'].map(t => (
                        <button key={t} onClick={() => { setTabDetalle(t); if (t === 'historial') cargarHistorial(ins.id) }}
                          style={{ padding: '5px 14px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: tabDetalle === t ? `${color}20` : 'var(--surface2)', color: tabDetalle === t ? color : 'var(--text3)', border: tabDetalle === t ? `1px solid ${color}50` : '1px solid var(--border)' }}>
                          {t === 'info' ? '📋 Info' : '📜 Historial'}
                        </button>
                      ))}
                    </div>

                    {tabDetalle === 'info' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Proveedor */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>📦 Proveedor</div>
                          {[
                            { label: 'Nombre',    val: ins.proveedor_nombre },
                            { label: 'Dirección', val: ins.proveedor_direccion },
                            { label: 'Teléfono',  val: ins.proveedor_telefono },
                            { label: 'Horario',   val: ins.proveedor_horario },
                            { label: 'Contacto',  val: ins.proveedor_contacto },
                          ].map(f => f.val ? (
                            <div key={f.label} style={{ fontSize: 12, marginBottom: 4 }}>
                              <span style={{ color: 'var(--text3)' }}>{f.label}: </span>
                              <span style={{ color: 'var(--text2)' }}>{f.val}</span>
                            </div>
                          ) : null)}
                          {!ins.proveedor_nombre && <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>Sin datos de proveedor</div>}
                        </div>
                        {/* Stock info */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 8 }}>📊 Stock</div>
                          <div style={{ fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: 'var(--text3)' }}>Stock actual: </span>
                            <strong style={{ color: sc }}>{ins.stock_actual ?? 0} {ins.unidad}</strong>
                          </div>
                          <div style={{ fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: 'var(--text3)' }}>Stock mínimo: </span>
                            <strong style={{ color: 'var(--text2)' }}>{ins.stock_minimo ?? 0} {ins.unidad}</strong>
                          </div>
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: 'var(--text3)' }}>Unidad: </span>
                            <strong style={{ color: 'var(--text2)' }}>{ins.unidad}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {tabDetalle === 'historial' && (
                      <div>
                        {loadingHist ? (
                          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)' }}>Cargando historial...</div>
                        ) : historial.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)' }}>Sin movimientos registrados</div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 280, overflowY: 'auto' }}>
                            {historial.map(m => (
                              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--surface2)', borderRadius: 6, fontSize: 12 }}>
                                <span style={{ fontSize: 16 }}>{m.tipo === 'ingreso' ? '📦' : m.tipo === 'egreso' ? '📤' : '🔧'}</span>
                                <div style={{ flex: 1 }}>
                                  <span style={{ fontWeight: 700, color: m.tipo === 'ingreso' ? '#3dd68c' : m.tipo === 'egreso' ? '#fb923c' : '#ffd166' }}>
                                    {m.tipo === 'ingreso' ? '+' : m.tipo === 'egreso' ? '-' : '='}{m.cantidad} {ins.unidad}
                                  </span>
                                  {m.sector && <span style={{ color: 'var(--text3)', marginLeft: 6 }}>· {m.sector}</span>}
                                  {m.motivo && <span style={{ color: 'var(--text3)', marginLeft: 6 }}>· {m.motivo}</span>}
                                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                                    {m.usuario_nombre} · {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: es })}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                      <button onClick={() => { setModalStock(ins); setStockTipo('ingreso') }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#3dd68c', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        <TrendingUp size={13} /> Ingreso
                      </button>
                      <button onClick={() => { setModalStock(ins); setStockTipo('egreso') }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#fb923c', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        <TrendingDown size={13} /> Egreso
                      </button>
                      <button onClick={() => { setModalStock(ins); setStockTipo('ajuste') }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,209,102,0.1)', border: '1px solid rgba(255,209,102,0.3)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#ffd166', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        🔧 Ajuste
                      </button>
                      <button onClick={() => abrirEditar(ins)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        <Edit2 size={13} /> Editar
                      </button>
                      <button onClick={() => setConfirmDel(ins.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 12, fontWeight: 600, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)', marginLeft: 'auto' }}>
                        <Trash2 size={13} /> Eliminar
                      </button>
                    </div>

                    {confirmDel === ins.id && (
                      <div style={{ marginTop: 10, background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 'var(--radius)', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, color: '#ff5577', flex: 1 }}>¿Eliminás este insumo y todo su historial?</span>
                        <button onClick={() => eliminar(ins.id)} style={{ background: '#ff5577', border: 'none', borderRadius: 6, padding: '5px 14px', fontSize: 12, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'var(--font)' }}>Sí, eliminar</button>
                        <button onClick={() => setConfirmDel(null)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text3)' }}>Cancelar</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL AGREGAR / EDITAR */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 620, maxHeight: '94vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color }}>{editando ? '✏️ Editar insumo' : '+ Nuevo insumo'}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Código + Descripción */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Código *</label>
                  <input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} placeholder="Ej: INS-001" style={inputSt} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Descripción *</label>
                  <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej: Pintura blanca base agua 20L" style={inputSt} />
                </div>
              </div>

              {/* Stock actual + mínimo + unidad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Stock actual</label>
                  <input type="number" min="0" value={form.stock_actual} onChange={e => setForm(p => ({ ...p, stock_actual: e.target.value }))} style={inputSt} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Stock mínimo</label>
                  <input type="number" min="0" value={form.stock_minimo} onChange={e => setForm(p => ({ ...p, stock_minimo: e.target.value }))} placeholder="Punto de reposición" style={inputSt} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Unidad</label>
                  <select value={form.unidad} onChange={e => setForm(p => ({ ...p, unidad: e.target.value }))} style={inputSt}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>

              {/* Modelo */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Modelo</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setForm(p => ({ ...p, modelo: '' }))}
                    style={{ padding: '5px 12px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: !form.modelo ? `${color}20` : 'var(--surface2)', color: !form.modelo ? color : 'var(--text3)', border: !form.modelo ? `1px solid ${color}50` : '1px solid var(--border)' }}>
                    Sin definir
                  </button>
                  {MODELOS.map(m => {
                    const mc = MODELO_COLOR[m]
                    return (
                      <button key={m} type="button" onClick={() => setForm(p => ({ ...p, modelo: m }))}
                        style={{ padding: '5px 12px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: form.modelo === m ? `${mc}20` : 'var(--surface2)', color: form.modelo === m ? mc : 'var(--text3)', border: form.modelo === m ? `1px solid ${mc}50` : '1px solid var(--border)' }}>
                        {m}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Sectores */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Sectores de uso</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SECTORES.map(s => {
                    const sel = form.sectores.includes(s)
                    return (
                      <button key={s} type="button"
                        onClick={() => setForm(p => ({ ...p, sectores: sel ? p.sectores.filter(x => x !== s) : [...p.sectores, s] }))}
                        style={{ padding: '5px 12px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? `${color}20` : 'var(--surface2)', color: sel ? color : 'var(--text3)', border: sel ? `1px solid ${color}50` : '1px solid var(--border)' }}>
                        {s}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Proveedor */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 10 }}>📦 Datos del proveedor</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { key: 'proveedor_nombre',    label: 'Nombre / Empresa',  placeholder: 'Ej: Pinturas ABC' },
                    { key: 'proveedor_telefono',  label: 'Teléfono',          placeholder: 'Ej: 011 4567-8900' },
                    { key: 'proveedor_direccion', label: 'Dirección',         placeholder: 'Ej: Av. Corrientes 1234' },
                    { key: 'proveedor_horario',   label: 'Horario de atención', placeholder: 'Ej: Lun-Vie 8-17hs' },
                    { key: 'proveedor_contacto',  label: 'Persona de contacto', placeholder: 'Ej: Juan García' },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>{f.label}</label>
                      <input value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inputSt} />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={guardar} disabled={guardando}
                  style={{ flex: 1, background: `linear-gradient(135deg, ${color}, ${color}bb)`, color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {guardando ? '⏳ Guardando...' : editando ? '✓ Guardar cambios' : '+ Crear insumo'}
                </button>
                <button onClick={() => setModal(false)}
                  style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOVIMIENTO DE STOCK */}
      {modalStock && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 460 }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>
                  {stockTipo === 'ingreso' ? '📦 Registrar ingreso' : stockTipo === 'egreso' ? '📤 Registrar egreso' : '🔧 Ajustar stock'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{modalStock.codigo} — {modalStock.descripcion}</div>
              </div>
              <button onClick={() => setModalStock(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Tipo */}
              <div style={{ display: 'flex', gap: 6 }}>
                {[['ingreso', '📦 Ingreso', '#3dd68c'], ['egreso', '📤 Egreso', '#fb923c'], ['ajuste', '🔧 Ajuste', '#ffd166']].map(([t, l, c]) => (
                  <button key={t} onClick={() => setStockTipo(t)}
                    style={{ flex: 1, padding: '7px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', background: stockTipo === t ? `${c}20` : 'var(--surface2)', color: stockTipo === t ? c : 'var(--text3)', border: stockTipo === t ? `1px solid ${c}50` : '1px solid var(--border)' }}>
                    {l}
                  </button>
                ))}
              </div>

              {/* Stock actual */}
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '10px 14px', fontSize: 13 }}>
                Stock actual: <strong style={{ color: stockColor(modalStock.stock_actual, modalStock.stock_minimo) }}>{modalStock.stock_actual ?? 0} {modalStock.unidad}</strong>
                {stockCantidad && parseFloat(stockCantidad) > 0 && (
                  <> → <strong style={{ color: '#7b9fff' }}>
                    {stockTipo === 'ingreso' ? (modalStock.stock_actual || 0) + parseFloat(stockCantidad)
                      : stockTipo === 'egreso' ? Math.max(0, (modalStock.stock_actual || 0) - parseFloat(stockCantidad))
                      : parseFloat(stockCantidad)} {modalStock.unidad}
                  </strong></>
                )}
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  {stockTipo === 'ajuste' ? 'Nuevo stock total *' : 'Cantidad *'}
                </label>
                <input type="number" min="0" value={stockCantidad} onChange={e => setStockCantidad(e.target.value)}
                  placeholder={stockTipo === 'ajuste' ? `Stock actual: ${modalStock.stock_actual}` : `Ej: 5`}
                  style={inputSt} autoFocus />
              </div>

              {stockTipo === 'egreso' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Sector que lo usa *</label>
                  <select value={stockSector} onChange={e => setStockSector(e.target.value)} style={inputSt}>
                    <option value="">— Seleccioná sector —</option>
                    {SECTORES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Motivo / Observación</label>
                <input value={stockMotivo} onChange={e => setStockMotivo(e.target.value)} placeholder="Opcional" style={inputSt} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={registrarMovimiento} disabled={guardandoStock}
                  style={{ flex: 1, background: stockTipo === 'ingreso' ? 'rgba(61,214,140,0.2)' : stockTipo === 'egreso' ? 'rgba(251,146,60,0.2)' : 'rgba(255,209,102,0.2)', color: stockTipo === 'ingreso' ? '#3dd68c' : stockTipo === 'egreso' ? '#fb923c' : '#ffd166', border: `1px solid ${stockTipo === 'ingreso' ? 'rgba(61,214,140,0.4)' : stockTipo === 'egreso' ? 'rgba(251,146,60,0.4)' : 'rgba(255,209,102,0.4)'}`, borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: guardandoStock ? 'not-allowed' : 'pointer', opacity: guardandoStock ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {guardandoStock ? '⏳ Registrando...' : 'Confirmar'}
                </button>
                <button onClick={() => { setModalStock(null); setStockCantidad(''); setStockSector(''); setStockMotivo('') }}
                  style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
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
