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

const IVA_PCT = 0.21

export default function MisPreventas() {
  const { user, profile, isDistributor } = useAuth()
  const [preventas, setPreventas] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandida, setExpandida] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('activa')

  const [agregandoPago, setAgregandoPago] = useState(null)
  const [pagoMonto, setPagoMonto] = useState('')
  const [pagoFecha, setPagoFecha] = useState('')
  const [pagoNotas, setPagoNotas] = useState('')
  const [pagoComprobante, setPagoComprobante] = useState(null)
  const [subiendoPagoComp, setSubiendoPagoComp] = useState(false)
  const [registrandoPago, setRegistrandoPago] = useState(false)

  useEffect(() => { if (user) cargar() }, [user, filtroEstado])

  async function cargar() {
    setLoading(true)
    let q = supabase.from('preventas').select('*').order('created_at', { ascending: false })
    if (filtroEstado !== 'todos') q = q.eq('estado', filtroEstado)
    if (isDistributor) q = q.eq('distribuidor_id', user.id)
    const { data, error } = await q
    if (error) { toast.error('Error al cargar preventas'); setLoading(false); return }
    setPreventas(data || [])
    setLoading(false)
  }

  async function registrarPago(pv) {
    const monto = parseFloat(pagoMonto) || 0
    if (monto <= 0) { toast.error('Ingresá un monto válido'); return }
    setRegistrandoPago(true)
    let comprobanteUrl = null
    if (pagoComprobante) {
      setSubiendoPagoComp(true)
      const ext = pagoComprobante.name.split('.').pop()
      const path = `preventas/${pv.id}/pagos/${Date.now()}_comp.${ext}`
      const { error: errUp } = await supabase.storage.from('facturas').upload(path, pagoComprobante, { upsert: true })
      setSubiendoPagoComp(false)
      if (errUp) { toast.error('Error al subir comprobante: ' + errUp.message); setRegistrandoPago(false); return }
      const { data: urlData } = supabase.storage.from('facturas').getPublicUrl(path)
      comprobanteUrl = urlData.publicUrl
    }
    const nuevoPago = {
      id: crypto.randomUUID(),
      monto,
      fecha: pagoFecha || new Date().toISOString().split('T')[0],
      notas: pagoNotas.trim() || null,
      comprobante_url: comprobanteUrl,
      registrado_por: user.id,
      registrado_por_nombre: profile?.full_name || user.email,
      created_at: new Date().toISOString(),
    }
    const nuevosPagos = [...(pv.pagos || []), nuevoPago]
    const nuevoSaldo = nuevosPagos.reduce((s, p) => s + p.monto, 0)
    const { error } = await supabase.from('preventas').update({
      pagos: nuevosPagos,
      saldo_cobrado: nuevoSaldo,
      updated_at: new Date().toISOString(),
    }).eq('id', pv.id)
    setRegistrandoPago(false)
    if (error) { toast.error('Error al registrar pago: ' + error.message); return }
    toast.success('Pago registrado ✅')
    setAgregandoPago(null); setPagoMonto(''); setPagoFecha(''); setPagoNotas(''); setPagoComprobante(null)
    cargar()
  }

  const totalPreventa = (items) => (items || []).reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0)
  const totalRetirado = (items) => (items || []).reduce((s, i) => s + i.precio_unitario * (i.cantidad_retirada || 0), 0)
  const totalPendiente = (items) => (items || []).reduce((s, i) => s + i.precio_unitario * (i.cantidad_total - (i.cantidad_retirada || 0)), 0)

  if (!isDistributor) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Mis Preventas</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Historial de preventas y pagos</p>
      </div>

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
            const abierta = expandida === pv.id
            const items = pv.items || []
            const neto = totalPreventa(items)
            const total = pv.incluir_iva ? neto + (pv.iva_monto || neto * IVA_PCT) : neto
            const retiradoNeto = totalRetirado(items)
            const retirado = neto > 0 && pv.incluir_iva ? retiradoNeto * (total / neto) : retiradoNeto
            const pct = neto > 0 ? Math.min(100, Math.round((retiradoNeto / neto) * 100)) : 0
            const pagado = (pv.pagos || []).reduce((s, p) => s + p.monto, 0)
            const deuda = Math.max(0, total - pagado)

            return (
              <div key={pv.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandida(abierta ? null : pv.id)}
                  style={{ padding: '14px 20px', borderBottom: abierta ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '3px 8px', borderRadius: 4 }}>
                      #{pv.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{cfg.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                        Retirado: <span style={{ color: '#3dd68c', fontWeight: 700 }}>{formatPrecio(retirado)}</span>
                        {' / '}
                        <span style={{ fontWeight: 700 }}>{formatPrecio(total)}</span>
                        {total > 0 && <span style={{ marginLeft: 6, color: '#3dd68c', fontWeight: 700 }}>({pct}%)</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 2 }}>
                        {pv.incluir_iva && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.12)', border: '1px solid rgba(74,108,247,0.3)', padding: '1px 7px', borderRadius: 10 }}>IVA incl.</span>
                        )}
                        {deuda > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#ff5577', background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', padding: '1px 7px', borderRadius: 10 }}>
                            Saldo: {formatPrecio(deuda)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ color: 'var(--text3)', fontSize: 14 }}>{abierta ? '▲' : '▼'}</span>
                  </div>
                </div>

                {abierta && (
                  <div style={{ padding: '16px 20px' }}>
                    {/* Productos */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {items.map((item, i) => {
                        const ret = item.cantidad_retirada || 0
                        const pend = item.cantidad_total - ret
                        const pctItem = item.cantidad_total > 0 ? (ret / item.cantidad_total) * 100 : 0
                        return (
                          <div key={i} style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                              <div>
                                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4, marginRight: 6 }}>{item.codigo}</span>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{item.nombre}</span>
                                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>{item.modelo}</span>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{formatPrecio(item.precio_unitario)} c/u</div>
                            </div>
                            <div style={{ height: 5, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
                              <div style={{ height: '100%', width: `${pctItem}%`, background: pctItem >= 100 ? '#3dd68c' : 'var(--brand-gradient)', borderRadius: 3 }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                              <span>Retirado: <strong style={{ color: '#3dd68c' }}>{ret}</strong> / {item.cantidad_total}</span>
                              <span>Pendiente: <strong style={{ color: pend > 0 ? '#ffd166' : 'var(--text3)' }}>{pend}</strong></span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Totales */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                      {(() => {
                        const ivaFactor = pv.incluir_iva ? (1 + IVA_PCT) : 1
                        return [
                          { label: 'Total preventa', value: totalPreventa(items) * ivaFactor, color: 'var(--text)' },
                          { label: 'Retirado', value: totalRetirado(items) * ivaFactor, color: '#3dd68c' },
                          { label: 'Pendiente', value: totalPendiente(items) * ivaFactor, color: '#ffd166' },
                        ]
                      })().map(({ label, value, color }) => (
                        <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color }}>{formatPrecio(value)}</div>
                        </div>
                      ))}
                    </div>

                    {pv.notas && (
                      <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: '#7b9fff' }}>Notas: </span>{pv.notas}
                      </div>
                    )}

                    {/* Pagos */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>💳 Pagos</div>
                        {pv.estado === 'activa' && agregandoPago !== pv.id && (
                          <button
                            onClick={e => { e.stopPropagation(); setAgregandoPago(pv.id); setPagoFecha(new Date().toISOString().split('T')[0]) }}
                            style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 'var(--radius)', padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                          >
                            + Registrar pago
                          </button>
                        )}
                      </div>

                      {(pv.pagos || []).length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0', marginBottom: 10 }}>Sin pagos registrados.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                          {(pv.pagos || []).map(pago => (
                            <div key={pago.id} style={{ padding: '8px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, color: '#a78bfa', fontSize: 13 }}>{formatPrecio(pago.monto)}</span>
                                <span style={{ color: 'var(--text3)', fontSize: 11 }}>{new Date(pago.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</span>
                                {pago.notas && <span style={{ color: 'var(--text2)', fontSize: 11 }}>— {pago.notas}</span>}
                                {pago.comprobante_url && (
                                  <a href={pago.comprobante_url} target="_blank" rel="noreferrer" style={{ color: '#7b9fff', textDecoration: 'none', fontWeight: 600, fontSize: 11 }}>
                                    📎 Comprobante
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {agregandoPago === pv.id && (
                        <div style={{ padding: '14px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Monto *</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text3)' }}>$</span>
                                <input type="number" min="0" step="0.01" value={pagoMonto} onChange={e => setPagoMonto(e.target.value)}
                                  placeholder="0.00" autoFocus
                                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', fontWeight: 700 }} />
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Fecha</div>
                              <input type="date" value={pagoFecha} onChange={e => setPagoFecha(e.target.value)}
                                style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
                            </div>
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Descripción / referencia (opcional)</div>
                            <input type="text" value={pagoNotas} onChange={e => setPagoNotas(e.target.value)} placeholder="Transferencia, efectivo, cheque..."
                              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'var(--font)' }} />
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Comprobante (opcional)</div>
                            {pagoComprobante ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(61,214,140,0.07)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 6, fontSize: 12 }}>
                                <span style={{ flex: 1, color: '#3dd68c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {pagoComprobante.name}</span>
                                <button onClick={() => setPagoComprobante(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>
                              </div>
                            ) : (
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 11, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>
                                📎 Adjuntar comprobante
                                <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setPagoComprobante(e.target.files[0] || null)} />
                              </label>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => registrarPago(pv)} disabled={registrandoPago || subiendoPagoComp || !pagoMonto}
                              style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: !pagoMonto ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', opacity: !pagoMonto ? 0.5 : 1 }}>
                              {subiendoPagoComp ? 'Subiendo...' : registrandoPago ? 'Registrando...' : '✓ Confirmar pago'}
                            </button>
                            <button onClick={() => { setAgregandoPago(null); setPagoMonto(''); setPagoFecha(''); setPagoNotas(''); setPagoComprobante(null) }}
                              style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Total pagado</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#a78bfa' }}>{formatPrecio(pagado)}</div>
                        </div>
                        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Saldo deudor</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: deuda > 0 ? '#ff5577' : '#3dd68c' }}>{formatPrecio(deuda)}</div>
                        </div>
                      </div>
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
