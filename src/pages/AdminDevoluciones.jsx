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

export default function AdminDevoluciones() {
  const { isAdmin, isAdmin2, user, profile } = useAuth()

  const [devoluciones, setDevoluciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('pendiente')
  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [notaAdmin, setNotaAdmin] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [confirmRecibido, setConfirmRecibido] = useState(null)

  useEffect(() => { if (isAdmin || isAdmin2) cargar() }, [isAdmin, isAdmin2])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('devoluciones')
      .select('*, profiles(full_name, razon_social, email)')
      .or('distribuidor_id.not.is.null,origen.eq.garantia')
      .order('created_at', { ascending: false })
    if (error) toast.error('Error al cargar devoluciones')
    else setDevoluciones(data || [])
    setLoading(false)
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
    // Garantia returns: just mark received — stock ingress happens in Ingreso/Egreso PT
    if (dev.origen !== 'garantia') {
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

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>↩️ Devoluciones</h1>
        <button onClick={cargar} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 13, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>🔄</button>
      </div>

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
                  {dev.origen === 'garantia' && (
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'rgba(167,139,250,0.12)', color: '#b39dfa', border: '1px solid rgba(167,139,250,0.35)' }}>🔧 Garantía</span>
                  )}
                  <span style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 'auto' }}>
                    {formatDistanceToNow(new Date(dev.created_at), { addSuffix: true, locale: es })}
                  </span>
                </div>

                {/* Distribuidor o cliente garantía */}
                <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: dev.origen === 'garantia' ? 'linear-gradient(135deg,#b39dfa,#7c3aed)' : 'var(--brand-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {(dev.origen === 'garantia' ? (dev.referencia_nombre || 'G') : (dist?.razon_social || dist?.full_name || '?'))[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {dev.origen === 'garantia' ? (dev.referencia_nombre || 'Cliente garantía') : (dist?.razon_social || dist?.full_name || '—')}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {dev.origen === 'garantia'
                        ? `Reclamo vinculado · #${dev.reclamo_id ? String(dev.reclamo_id).slice(0,8).toUpperCase() : '—'}`
                        : dist?.email}
                    </div>
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

                    {dev.estado === 'pendiente' && (
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Nota para el distribuidor (opcional)</label>
                        <input value={notaAdmin} onChange={e => setNotaAdmin(e.target.value)}
                          placeholder="Ej: Por favor embalar correctamente y adjuntar remito..."
                          style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    )}

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
                            <span style={{ flex: 1, color: '#38bdf8' }}>
                              {dev.origen === 'garantia'
                                ? '¿Confirmar recepción? El stock se procesará en Ingreso/Egreso PT.'
                                : '¿Confirmar recepción? Se re-ingresará el stock automáticamente.'}
                            </span>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 0' }}>
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                            {dev.estado === 'recibido' ? '✅ Mercadería recibida — stock re-ingresado' : '❌ Devolución rechazada'}
                            {dev.updated_at && <span style={{ marginLeft: 8 }}>{formatFecha(dev.updated_at)}</span>}
                          </span>
                          {dev.estado === 'rechazado' && (
                            <button onClick={() => cambiarEstado(dev.id, 'pendiente')} disabled={guardando}
                              style={{ background: 'rgba(255,209,102,0.1)', border: '1px solid rgba(255,209,102,0.3)', borderRadius: 'var(--radius)', padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#ffd166', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              ↩ Volver a pendiente
                            </button>
                          )}
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
    </div>
  )
}
