import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

const ESTADOS_VALIDOS = ['aprobado', 'preparando', 'enviado', 'entregado', 'finalizado']

function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
}

function getHoy() {
  return new Date().toISOString().split('T')[0]
}

function getPrimerDiaMes() {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

function agruparKey(dateStr, agrupacion) {
  const d = new Date(dateStr + 'T12:00:00')
  if (agrupacion === 'dia') return dateStr
  if (agrupacion === 'mes') {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const lunes = new Date(d)
  lunes.setDate(d.getDate() + diff)
  return lunes.toISOString().split('T')[0]
}

function labelAgrupacion(key, agrupacion) {
  if (agrupacion === 'mes') {
    const [year, month] = key.split('-')
    const d = new Date(parseInt(year), parseInt(month) - 1, 1)
    return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  }
  const d = new Date(key + 'T12:00:00')
  if (agrupacion === 'dia') {
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
  }
  const startOfYear = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7)
  return `Sem ${week} · ${d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}`
}

const ESTADO_PV_CONFIG = {
  activa:     { label: 'Activa',     color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)' },
  completada: { label: 'Completada', color: '#7b9fff', bg: 'rgba(74,108,247,0.12)',  border: 'rgba(74,108,247,0.35)' },
}

const REPORTE_EMAIL = 'martin@temptech.com.ar'

export default function AdminReportes() {
  const { isAdmin, user } = useAuth()
  const [reporte, setReporte] = useState('ventas')

  // Ventas / Ranking state
  const [fechaDesde, setFechaDesde] = useState(getPrimerDiaMes())
  const [fechaHasta, setFechaHasta] = useState(getHoy())
  const [agrupacion, setAgrupacion] = useState('dia')
  const [datos, setDatos] = useState([])
  const [loading, setLoading] = useState(false)
  const [totales, setTotales] = useState({ pedidos: 0, monto: 0 })

  // Preventa state
  const [datosPv, setDatosPv] = useState([])
  const [loadingPv, setLoadingPv] = useState(false)
  const [filtroEstadoPv, setFiltroEstadoPv] = useState('activa')
  const [expandidoPv, setExpandidoPv] = useState(null)

  useEffect(() => {
    if (!isAdmin) return
    if (reporte === 'preventa') cargarPreventas()
    else cargar()
  }, [isAdmin, reporte, fechaDesde, fechaHasta, agrupacion, filtroEstadoPv])

  async function cargar() {
    if (!fechaDesde || !fechaHasta) return
    setLoading(true)
    setDatos([])

    const { data, error } = await supabase
      .from('pedidos')
      .select('id, created_at, total, tipo, distribuidor_id, profiles!distribuidor_id(razon_social, full_name)')
      .in('estado', ESTADOS_VALIDOS)
      .gte('created_at', fechaDesde + 'T00:00:00')
      .lte('created_at', fechaHasta + 'T23:59:59')

    if (error || !data) { setLoading(false); return }

    const montoTotal = data.reduce((s, p) => s + (p.total || 0), 0)
    setTotales({ pedidos: data.length, monto: montoTotal })

    if (reporte === 'ventas') {
      const grupos = {}
      data.forEach(p => {
        const key = agruparKey(p.created_at.split('T')[0], agrupacion)
        if (!grupos[key]) grupos[key] = { key, count: 0, monto: 0 }
        grupos[key].count++
        grupos[key].monto += p.total || 0
      })
      setDatos(Object.values(grupos).sort((a, b) => a.key.localeCompare(b.key)))
    } else {
      const grupos = {}
      data.forEach(p => {
        const id = p.distribuidor_id || 'sin'
        const nombre = p.profiles?.razon_social || p.profiles?.full_name || 'Sin nombre'
        if (!grupos[id]) grupos[id] = { id, nombre, count: 0, monto: 0 }
        grupos[id].count++
        grupos[id].monto += p.total || 0
      })
      setDatos(Object.values(grupos).sort((a, b) => b.monto - a.monto))
    }

    setLoading(false)
  }

  async function cargarPreventas() {
    setLoadingPv(true)
    setDatosPv([])

    let q = supabase
      .from('preventas')
      .select('id, estado, items, created_at, distribuidor_id')
      .neq('estado', 'cancelada')
      .order('created_at', { ascending: false })

    if (filtroEstadoPv !== 'todas') q = q.eq('estado', filtroEstadoPv)

    const { data: pvData, error } = await q
    if (error || !pvData) { setLoadingPv(false); return }

    // Buscar nombres de distribuidores
    const ids = [...new Set(pvData.map(p => p.distribuidor_id).filter(Boolean))]
    let distMap = {}
    if (ids.length > 0) {
      const { data: dists } = await supabase
        .from('profiles')
        .select('id, full_name, razon_social')
        .in('id', ids)
      dists?.forEach(d => { distMap[d.id] = d })
    }

    // Agrupar por distribuidor
    const grupos = {}
    pvData.forEach(pv => {
      const id = pv.distribuidor_id || 'sin'
      const dist = distMap[id]
      const nombre = dist?.razon_social || dist?.full_name || 'Sin nombre'
      if (!grupos[id]) grupos[id] = { id, nombre, preventas: [], totPreventa: 0, totRetirado: 0 }

      const items = pv.items || []
      const montoTotal = items.reduce((s, i) => s + (i.precio_unitario || 0) * (i.cantidad_total || 0), 0)
      const montoRetirado = items.reduce((s, i) => s + (i.precio_unitario || 0) * (i.cantidad_retirada || 0), 0)

      grupos[id].preventas.push({ ...pv, montoTotal, montoRetirado })
      grupos[id].totPreventa += montoTotal
      grupos[id].totRetirado += montoRetirado
    })

    const resultado = Object.values(grupos)
      .map(g => ({ ...g, totPendiente: g.totPreventa - g.totRetirado }))
      .sort((a, b) => b.totPendiente - a.totPendiente)

    setDatosPv(resultado)
    setLoadingPv(false)
  }

  if (!isAdmin || user?.email !== REPORTE_EMAIL) return null

  const maxMonto = datos.length > 0 ? Math.max(...datos.map(d => d.monto)) : 1

  const esPreventa = reporte === 'preventa'

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Reportes</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Análisis de ventas y distribuidores</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { key: 'ventas',    label: '📈 Ventas por período' },
          { key: 'ranking',   label: '🏆 Ranking distribuidores' },
          { key: 'preventa',  label: '📦 Saldos de preventa' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setReporte(tab.key)} style={{
            padding: '9px 20px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s',
            background: reporte === tab.key ? 'var(--brand-gradient)' : 'var(--surface)',
            color: reporte === tab.key ? '#fff' : 'var(--text2)',
            border: reporte === tab.key ? 'none' : '1px solid var(--border)',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>

        {esPreventa ? (
          // Filtro de estado para preventa
          <>
            <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>Estado</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[{ k: 'activa', l: 'Activas' }, { k: 'completada', l: 'Completadas' }, { k: 'todas', l: 'Todas' }].map(op => (
                <button key={op.k} onClick={() => setFiltroEstadoPv(op.k)} style={{
                  padding: '5px 14px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
                  background: filtroEstadoPv === op.k ? 'rgba(74,108,247,0.15)' : 'var(--surface2)',
                  color: filtroEstadoPv === op.k ? '#7b9fff' : 'var(--text3)',
                  border: filtroEstadoPv === op.k ? '1px solid rgba(74,108,247,0.4)' : '1px solid var(--border)',
                }}>
                  {op.l}
                </button>
              ))}
            </div>
            <button onClick={cargarPreventas} disabled={loadingPv} style={{ marginLeft: 'auto', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: loadingPv ? 'not-allowed' : 'pointer', color: 'var(--text2)', fontFamily: 'var(--font)', opacity: loadingPv ? 0.5 : 1 }}>
              🔄 Actualizar
            </button>
          </>
        ) : (
          // Filtros de fecha para ventas/ranking
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>Desde</span>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 600 }}>Hasta</span>
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 10px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { label: 'Este mes', desde: getPrimerDiaMes(), hasta: getHoy() },
                {
                  label: 'Mes anterior',
                  desde: (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0] })(),
                  hasta: (() => { const d = new Date(); d.setDate(0); return d.toISOString().split('T')[0] })(),
                },
                {
                  label: 'Últimos 90 días',
                  desde: (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d.toISOString().split('T')[0] })(),
                  hasta: getHoy(),
                },
              ].map(op => (
                <button key={op.label} onClick={() => { setFechaDesde(op.desde); setFechaHasta(op.hasta) }} style={{
                  padding: '5px 12px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
                  background: fechaDesde === op.desde && fechaHasta === op.hasta ? 'rgba(74,108,247,0.15)' : 'var(--surface2)',
                  color: fechaDesde === op.desde && fechaHasta === op.hasta ? '#7b9fff' : 'var(--text3)',
                  border: fechaDesde === op.desde && fechaHasta === op.hasta ? '1px solid rgba(74,108,247,0.4)' : '1px solid var(--border)',
                }}>
                  {op.label}
                </button>
              ))}
            </div>
            {reporte === 'ventas' && (
              <div style={{ display: 'flex', gap: 6 }}>
                {[{ k: 'dia', l: 'Por día' }, { k: 'semana', l: 'Por semana' }, { k: 'mes', l: 'Por mes' }].map(op => (
                  <button key={op.k} onClick={() => setAgrupacion(op.k)} style={{
                    padding: '5px 12px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
                    background: agrupacion === op.k ? 'rgba(61,214,140,0.12)' : 'var(--surface2)',
                    color: agrupacion === op.k ? '#3dd68c' : 'var(--text3)',
                    border: agrupacion === op.k ? '1px solid rgba(61,214,140,0.35)' : '1px solid var(--border)',
                  }}>
                    {op.l}
                  </button>
                ))}
              </div>
            )}
            <button onClick={cargar} disabled={loading} style={{ marginLeft: 'auto', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--text2)', fontFamily: 'var(--font)', opacity: loading ? 0.5 : 1 }}>
              🔄 Actualizar
            </button>
          </>
        )}
      </div>

      {/* Contenido */}
      {esPreventa ? (
        loadingPv ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
        ) : datosPv.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            Sin preventas para mostrar.
          </div>
        ) : (
          <SaldosPreventa datos={datosPv} expandido={expandidoPv} setExpandido={setExpandidoPv} />
        )
      ) : (
        <>
          {/* Tarjetas de totales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Pedidos</div>
              <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{totales.pedidos}</div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Monto Total</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#7b9fff', fontFamily: 'var(--font-display)' }}>{formatPrecio(totales.monto)}</div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Ticket Promedio</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#3dd68c', fontFamily: 'var(--font-display)' }}>{totales.pedidos > 0 ? formatPrecio(totales.monto / totales.pedidos) : '—'}</div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
          ) : datos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
              Sin datos para el período seleccionado.
            </div>
          ) : reporte === 'ventas' ? (
            <VentasPorPeriodo datos={datos} agrupacion={agrupacion} maxMonto={maxMonto} />
          ) : (
            <RankingDistribuidores datos={datos} maxMonto={maxMonto} />
          )}
        </>
      )}
    </div>
  )
}

// ── Ventas por período ──────────────────────────────────────────────────────

function VentasPorPeriodo({ datos, agrupacion, maxMonto }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 20 }}>
        Ventas por período · {datos.length} {datos.length === 1 ? 'período' : 'períodos'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {datos.map(d => (
          <div key={d.key} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 160px 70px', gap: 14, alignItems: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'right', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
              {labelAgrupacion(d.key, agrupacion)}
            </div>
            <div style={{ background: 'var(--surface2)', borderRadius: 6, height: 26, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #4a6cf7, #7b9fff)',
                borderRadius: 6,
                width: `${Math.max(2, (d.monto / maxMonto) * 100)}%`,
                transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
              }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#7b9fff', textAlign: 'right', whiteSpace: 'nowrap' }}>
              {formatPrecio(d.monto)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>
              {d.count} ped.
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Ranking distribuidores ──────────────────────────────────────────────────

function RankingDistribuidores({ datos, maxMonto }) {
  const totalGeneral = datos.reduce((s, d) => s + d.monto, 0)
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {datos.length} distribuidores · ordenado por monto total
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
            {['#', 'Distribuidor', 'Pedidos', 'Monto Total', 'Ticket Prom.', 'Part. %', 'Volumen'].map((h, i) => (
              <th key={h} style={{
                padding: '10px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text3)',
                textTransform: 'uppercase', letterSpacing: '0.8px',
                textAlign: i === 0 || i === 1 ? 'left' : i === 6 ? 'left' : 'right',
                width: i === 0 ? 40 : i === 6 ? 160 : undefined,
              }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {datos.map((d, idx) => {
            const participacion = totalGeneral > 0 ? (d.monto / totalGeneral) * 100 : 0
            return (
              <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 800, textAlign: 'center', color: idx < 3 ? ['#ffd166', '#a78bfa', '#38bdf8'][idx] : 'var(--text3)' }}>
                  {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                </td>
                <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{d.nombre}</td>
                <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text2)', textAlign: 'right' }}>{d.count}</td>
                <td style={{ padding: '13px 16px', fontSize: 13, fontWeight: 700, color: '#7b9fff', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatPrecio(d.monto)}</td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text3)', textAlign: 'right', whiteSpace: 'nowrap' }}>{formatPrecio(d.monto / d.count)}</td>
                <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text3)', textAlign: 'right' }}>{participacion.toFixed(1)}%</td>
                <td style={{ padding: '13px 24px 13px 16px' }}>
                  <div style={{ background: 'var(--surface3)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: idx === 0 ? 'linear-gradient(90deg, #ffd166, #fb923c)' : 'linear-gradient(90deg, #4a6cf7, #7b9fff)',
                      borderRadius: 6,
                      width: `${Math.max(2, (d.monto / maxMonto) * 100)}%`,
                    }} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Saldos de preventa ──────────────────────────────────────────────────────

function SaldosPreventa({ datos, expandido, setExpandido }) {
  const totalPendienteGeneral = datos.reduce((s, d) => s + d.totPendiente, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Resumen global */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Distribuidores</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{datos.length}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Total preventa</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#7b9fff', fontFamily: 'var(--font-display)' }}>{formatPrecio(datos.reduce((s, d) => s + d.totPreventa, 0))}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Total retirado</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#3dd68c', fontFamily: 'var(--font-display)' }}>{formatPrecio(datos.reduce((s, d) => s + d.totRetirado, 0))}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid rgba(251,146,60,0.4)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Saldo pendiente</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#fb923c', fontFamily: 'var(--font-display)' }}>{formatPrecio(totalPendienteGeneral)}</div>
        </div>
      </div>

      {/* Lista por distribuidor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {datos.map(dist => {
          const isOpen = expandido === dist.id
          const pctRetirado = dist.totPreventa > 0 ? (dist.totRetirado / dist.totPreventa) * 100 : 0

          return (
            <div key={dist.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              {/* Fila resumen del distribuidor */}
              <div
                onClick={() => setExpandido(isOpen ? null : dist.id)}
                style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Nombre */}
                <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{isOpen ? '▾' : '▸'}</span>
                    🏪 {dist.nombre}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {dist.preventas.length} preventa{dist.preventas.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Barra de progreso */}
                <div style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                    <span>Retirado {pctRetirado.toFixed(0)}%</span>
                    <span>Pendiente {(100 - pctRetirado).toFixed(0)}%</span>
                  </div>
                  <div style={{ background: 'var(--surface3)', borderRadius: 6, height: 10, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #3dd68c, #3dd68c)',
                      borderRadius: 6,
                      width: `${pctRetirado}%`,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>

                {/* Cifras */}
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Preventa</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#7b9fff' }}>{formatPrecio(dist.totPreventa)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Retirado</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#3dd68c' }}>{formatPrecio(dist.totRetirado)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Saldo</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: dist.totPendiente > 0 ? '#fb923c' : '#3dd68c' }}>{formatPrecio(dist.totPendiente)}</div>
                  </div>
                </div>
              </div>

              {/* Detalle expandido */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}>
                  {dist.preventas.map(pv => {
                    const cfg = ESTADO_PV_CONFIG[pv.estado] || ESTADO_PV_CONFIG.activa
                    const items = pv.items || []
                    const pendientePv = pv.montoTotal - pv.montoRetirado

                    return (
                      <div key={pv.id} style={{ borderBottom: '1px solid var(--border)', padding: '16px 24px' }}>
                        {/* Header de la preventa */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '2px 7px', borderRadius: 4 }}>
                            #{pv.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>
                            {cfg.label}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                            {new Date(pv.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                          <div style={{ marginLeft: 'auto', display: 'flex', gap: 20 }}>
                            <span style={{ fontSize: 12, color: '#7b9fff' }}>Preventa: {formatPrecio(pv.montoTotal)}</span>
                            <span style={{ fontSize: 12, color: '#3dd68c' }}>Retirado: {formatPrecio(pv.montoRetirado)}</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: pendientePv > 0 ? '#fb923c' : '#3dd68c' }}>
                              Saldo: {formatPrecio(pendientePv)}
                            </span>
                          </div>
                        </div>

                        {/* Tabla de productos */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                              {['Producto', 'Total', 'Retirado', 'Pendiente', 'Monto total', 'Monto retirado', 'Saldo'].map((h, i) => (
                                <th key={h} style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: i === 0 ? 'left' : 'right' }}>
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, idx) => {
                              const retirado = item.cantidad_retirada || 0
                              const pendienteUnd = item.cantidad_total - retirado
                              const montoItem = (item.precio_unitario || 0) * item.cantidad_total
                              const montoRet = (item.precio_unitario || 0) * retirado
                              const saldoItem = montoItem - montoRet
                              return (
                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                  <td style={{ padding: '8px 10px', color: 'var(--text)', fontWeight: 500 }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', marginRight: 8 }}>{item.codigo}</span>
                                    {item.nombre} {item.modelo ? `· ${item.modelo}` : ''}
                                  </td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text2)' }}>{item.cantidad_total}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#3dd68c' }}>{retirado}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', color: pendienteUnd > 0 ? '#fb923c' : 'var(--text3)', fontWeight: pendienteUnd > 0 ? 700 : 400 }}>{pendienteUnd}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', color: 'var(--text3)' }}>{formatPrecio(montoItem)}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#3dd68c' }}>{formatPrecio(montoRet)}</td>
                                  <td style={{ padding: '8px 10px', textAlign: 'right', color: saldoItem > 0 ? '#fb923c' : 'var(--text3)', fontWeight: saldoItem > 0 ? 700 : 400 }}>{formatPrecio(saldoItem)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
