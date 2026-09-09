import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import { imprimirPresupuesto } from '@/utils/exportDoc'
import { enviarPresupuestoPorEmail } from '@/lib/email'
import toast from 'react-hot-toast'

function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
}
function fmtFechaHora(s) {
  try { return new Date(s).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

export default function Presupuestos() {
  const { isAdmin, isVendedor } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [enviandoId, setEnviandoId] = useState(null)

  useEffect(() => { if (isAdmin || isVendedor) cargar() }, [isAdmin, isVendedor])

  async function cargar() {
    setLoading(true)
    const data = await fetchAllRows(() => supabase.from('presupuestos').select('*').order('created_at', { ascending: false }))
    setItems(data || [])
    setLoading(false)
  }

  function reimprimir(p) {
    imprimirPresupuesto({
      items: p.items || [],
      distribuidor: { razon_social: p.cliente_nombre, cuit: p.cliente_cuit_dni || '', direccion: p.cliente_direccion || '', localidad: p.cliente_localidad || '' },
      notas: p.notas || null,
      fecha: null,
      incluirIVA: p.incluir_iva,
      total: p.total,
      ivaMonto: p.iva_monto,
    })
  }

  async function reenviar(p) {
    let to = p.cliente_email
    if (!to) {
      to = window.prompt('Este presupuesto no tiene email guardado. Ingresá el email del cliente:', '')
      if (!to) return
    }
    setEnviandoId(p.id)
    try {
      await enviarPresupuestoPorEmail({
        to,
        clienteNombre: p.cliente_nombre,
        items: p.items || [],
        incluirIVA: p.incluir_iva,
        totalNeto: p.total_neto,
        ivaMonto: p.iva_monto,
        total: p.total,
        notas: p.notas || null,
      })
      toast.success('Presupuesto enviado por email ✅')
    } catch (e) {
      toast.error('No se pudo enviar: ' + (e?.message || e))
    } finally {
      setEnviandoId(null)
    }
  }

  if (!isAdmin && !isVendedor) return null

  const q = busqueda.trim().toLowerCase()
  const filtrados = !q ? items : items.filter(p =>
    (p.cliente_nombre || '').toLowerCase().includes(q) ||
    (p.cliente_cuit_dni || '').toLowerCase().includes(q) ||
    (p.cliente_email || '').toLowerCase().includes(q) ||
    (p.cliente_localidad || '').toLowerCase().includes(q) ||
    (p.created_by_nombre || '').toLowerCase().includes(q)
  )

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Presupuestos</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Historial de presupuestos enviados</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, color: 'var(--text3)' }}>
          {filtrados.length} presupuesto{filtrados.length !== 1 ? 's' : ''}
        </div>
      </div>

      <input
        type="text"
        placeholder="🔍 Buscar por cliente, CUIT/DNI, email, localidad o quién lo hizo..."
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        style={{ width: '100%', maxWidth: 460, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 14px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', marginBottom: 20 }}
      />

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          {busqueda ? 'Sin resultados.' : 'Todavía no hay presupuestos registrados.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtrados.map(p => {
            const isOpen = expandido === p.id
            const cantItems = (p.items || []).reduce((s, i) => s + (i.cantidad || 0), 0)
            return (
              <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandido(isOpen ? null : p.id)}
                  style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15 }}>{isOpen ? '▾' : '▸'}</span>
                      {p.cliente_nombre}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      {p.cliente_cuit_dni ? `${p.cliente_cuit_dni} · ` : ''}{[p.cliente_direccion, p.cliente_localidad].filter(Boolean).join(', ')}
                    </div>
                    {p.cliente_email && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>✉️ {p.cliente_email}</div>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtFechaHora(p.created_at)}</div>
                    {p.created_by_nombre && <div style={{ fontSize: 11, color: 'var(--text3)' }}>👤 {p.created_by_nombre}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Total {p.incluir_iva ? 'c/IVA' : ''}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#7b9fff' }}>{formatPrecio(p.total)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{cantItems} u. · {(p.items || []).length} ítems</div>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)', padding: '16px 20px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          {['Código', 'Producto', 'Cant.', 'Desc.', 'Precio U.', 'Subtotal'].map((h, i) => (
                            <th key={h} style={{ padding: '6px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', textAlign: i === 0 || i === 1 ? 'left' : 'right' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(p.items || []).map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '6px 10px', fontFamily: 'monospace', fontSize: 11, color: '#7b9fff' }}>{it.codigo}</td>
                            <td style={{ padding: '6px 10px' }}>{it.nombre} <span style={{ color: 'var(--text3)' }}>{it.modelo}</span></td>
                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>{it.cantidad}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', color: it.descuento_pct > 0 ? '#3dd68c' : 'var(--text3)' }}>{it.descuento_pct > 0 ? `${it.descuento_pct}%` : '—'}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>{formatPrecio(it.precio_unitario)}</td>
                            <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600 }}>{formatPrecio(it.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {p.notas && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 12 }}><strong style={{ color: 'var(--text2)' }}>Notas:</strong> {p.notas}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ fontSize: 13 }}>
                        {p.incluir_iva && <span style={{ color: 'var(--text3)', marginRight: 14 }}>Neto {formatPrecio(p.total_neto)} · IVA {formatPrecio(p.iva_monto)}</span>}
                        <strong>Total: {formatPrecio(p.total)}</strong>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => reenviar(p)} disabled={enviandoId === p.id}
                          style={{ background: 'none', color: enviandoId === p.id ? 'var(--text3)' : '#7b9fff', border: '1px solid rgba(74,108,247,0.4)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: enviandoId === p.id ? 'wait' : 'pointer', fontFamily: 'var(--font)', opacity: enviandoId === p.id ? 0.6 : 1 }}>
                          {enviandoId === p.id ? 'Enviando…' : '✉️ Enviar por email'}
                        </button>
                        <button onClick={() => reimprimir(p)}
                          style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                          🖨️ Reimprimir PDF
                        </button>
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
