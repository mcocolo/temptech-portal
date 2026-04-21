import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_CFG = {
  pendiente: { label: 'Pendiente',  color: '#ffd166', bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.35)' },
  aprobado:  { label: 'Aprobado',   color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)' },
  recibido:  { label: 'Recibido',   color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.35)' },
  rechazado: { label: 'Rechazado',  color: '#ff5577', bg: 'rgba(255,85,119,0.12)',  border: 'rgba(255,85,119,0.35)' },
}
const TIPO_CFG = {
  falla:  { label: 'Falla / Defecto', emoji: '🔴' },
  cambio: { label: 'Cambio',          emoji: '🔄' },
  exceso: { label: 'Exceso de stock', emoji: '📦' },
}

const inputSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }

const emptyItem = () => ({ codigo: '', nombre: '', modelo: '', cantidad: 1, motivo: '' })

export default function Devoluciones() {
  const { user, profile, isDistributor, isAdmin, isAdmin2, isVendedor } = useAuth()
  const [devoluciones, setDevoluciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [catalogo, setCatalogo] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [distribuidores, setDistribuidores] = useState([])

  // Form
  const [tipo, setTipo] = useState('falla')
  const [referencia, setReferencia] = useState('')
  const [notas, setNotas] = useState('')
  const [items, setItems] = useState([emptyItem()])
  const [creando, setCreando] = useState(false)
  const [distId, setDistId] = useState('')

  useEffect(() => { cargar(); cargarCatalogo(); if (isAdmin || isAdmin2) cargarDistribuidores() }, [user])

  async function cargar() {
    if (!user) return
    setLoading(true)
    let q = supabase.from('devoluciones').select('*').not('distribuidor_id', 'is', null).order('created_at', { ascending: false })
    if (!isAdmin && !isAdmin2) q = q.eq('distribuidor_id', user.id)
    const { data, error } = await q
    if (error) toast.error('Error al cargar')
    else setDevoluciones(data || [])
    setLoading(false)
  }

  async function cargarDistribuidores() {
    const { data } = await supabase.from('profiles').select('id, full_name, razon_social, email').eq('user_type', 'distributor').order('razon_social')
    setDistribuidores(data || [])
  }

  async function cargarCatalogo() {
    const { data } = await supabase.from('precios').select('codigo,nombre,modelo,categoria').order('categoria').order('nombre')
    if (!data) return
    const grupos = {}
    data.forEach(p => {
      if (!grupos[p.categoria]) grupos[p.categoria] = []
      grupos[p.categoria].push(p)
    })
    setCatalogo(Object.entries(grupos).map(([cat, prods]) => ({ cat, prods })))
  }

  function selProducto(idx, codigo) {
    const all = catalogo.flatMap(g => g.prods)
    const prod = all.find(p => p.codigo === codigo)
    setItems(prev => prev.map((it, i) => i !== idx ? it : {
      ...it, codigo, nombre: prod?.nombre || '', modelo: prod?.modelo || '',
    }))
  }

  async function crear() {
    const validItems = items.filter(i => i.codigo && i.cantidad > 0)
    if (validItems.length === 0) return toast.error('Agregá al menos un producto')
    if ((isAdmin || isAdmin2) && !distId) return toast.error('Seleccioná un distribuidor')
    setCreando(true)
    const { error } = await supabase.from('devoluciones').insert({
      distribuidor_id: (isAdmin || isAdmin2) ? distId : user.id,
      estado: 'pendiente',
      tipo,
      items: validItems,
      pedido_referencia: referencia.trim() || null,
      notas: notas.trim() || null,
    })
    setCreando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('✅ Orden de devolución enviada')
    setModal(false)
    setTipo('falla'); setReferencia(''); setNotas(''); setItems([emptyItem()]); setDistId('')
    cargar()

    // Notificación para admin
    await supabase.from('notificaciones').insert({
      tipo: 'pedido',
      titulo: '↩️ Nueva devolución',
      mensaje: `${profile?.razon_social || profile?.full_name || user.email} generó una orden de devolución (${TIPO_CFG[tipo]?.label})`,
      url: '/admin-devoluciones',
    })
  }

  if (!user) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>↩️ Mis Devoluciones</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Generá y seguí tus órdenes de devolución</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.4)', borderRadius: 'var(--radius)', padding: '9px 20px', fontSize: 13, fontWeight: 700, color: '#fb923c', cursor: 'pointer', fontFamily: 'var(--font)' }}>
          + Nueva devolución
        </button>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
      ) : devoluciones.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>↩️</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No hay devoluciones registradas</div>
          <div style={{ fontSize: 13 }}>Usá el botón "Nueva devolución" para generar una orden.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {devoluciones.map(dev => {
            const scfg = STATUS_CFG[dev.estado] || STATUS_CFG.pendiente
            const tcfg = TIPO_CFG[dev.tipo] || TIPO_CFG.falla
            const isExp = expandido === dev.id
            return (
              <div key={dev.id} style={{ background: 'var(--surface)', border: `1px solid ${isExp ? 'rgba(74,108,247,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => setExpandido(isExp ? null : dev.id)}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                    #{String(dev.id).slice(0,8).toUpperCase()}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: scfg.bg, color: scfg.color, border: `1px solid ${scfg.border}` }}>{scfg.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text3)' }}>{tcfg.emoji} {tcfg.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 'auto' }}>
                    {dev.created_at ? formatDistanceToNow(new Date(dev.created_at), { addSuffix: true, locale: es }) : '—'}
                  </span>
                </div>

                {isExp && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '14px 20px' }}>
                    <div style={{ marginBottom: 10 }}>
                      {(dev.items || []).map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 4, alignItems: 'baseline' }}>
                          <span style={{ fontWeight: 700 }}>{item.nombre}</span>
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{item.modelo}</span>
                          <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff' }}>#{item.codigo}</span>
                          <span style={{ marginLeft: 'auto', fontWeight: 700 }}>x{item.cantidad}</span>
                          {item.motivo && <span style={{ fontSize: 11, color: 'var(--text3)', fontStyle: 'italic' }}>— {item.motivo}</span>}
                        </div>
                      ))}
                    </div>
                    {dev.pedido_referencia && <div style={{ fontSize: 12, color: 'var(--text3)' }}>📋 Ref. pedido: <span style={{ fontFamily: 'monospace', color: '#7b9fff' }}>{dev.pedido_referencia}</span></div>}
                    {dev.notas && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>"{dev.notas}"</div>}
                    {dev.notas_admin && (
                      <div style={{ marginTop: 10, background: 'rgba(255,209,102,0.08)', border: '1px solid rgba(255,209,102,0.2)', borderRadius: 'var(--radius)', padding: '8px 12px', fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: '#ffd166' }}>Respuesta TEMPTECH: </span>
                        <span style={{ color: 'var(--text2)' }}>{dev.notas_admin}</span>
                      </div>
                    )}
                    {dev.estado === 'recibido' && (
                      <div style={{ marginTop: 10, fontSize: 12, color: '#38bdf8', fontWeight: 600 }}>✅ Mercadería recibida por TEMPTECH</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL NUEVA DEVOLUCIÓN */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, maxHeight: '94vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#fb923c' }}>↩️ Nueva Orden de Devolución</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>Completá los datos para enviar la solicitud a TEMPTECH</div>
              </div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Distribuidor (solo admin) */}
              {(isAdmin || isAdmin2) && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Distribuidor *</label>
                  <select value={distId} onChange={e => setDistId(e.target.value)} style={inputSt}>
                    <option value="">— Seleccioná distribuidor —</option>
                    {distribuidores.map(d => (
                      <option key={d.id} value={d.id}>{d.razon_social || d.full_name} — {d.email}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tipo */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Motivo de devolución *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {Object.entries(TIPO_CFG).map(([k, c]) => (
                    <button key={k} type="button" onClick={() => setTipo(k)}
                      style={{ flex: 1, padding: '10px 8px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'center', background: tipo === k ? 'rgba(251,146,60,0.15)' : 'var(--surface2)', color: tipo === k ? '#fb923c' : 'var(--text3)', border: tipo === k ? '1px solid rgba(251,146,60,0.5)' : '1px solid var(--border)' }}>
                      <div style={{ fontSize: 18, marginBottom: 2 }}>{c.emoji}</div>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Referencia pedido */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>N° de pedido de referencia (opcional)</label>
                <input value={referencia} onChange={e => setReferencia(e.target.value)} placeholder="Ej: 5D3449AD" style={inputSt} />
              </div>

              {/* Productos */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 10 }}>Productos a devolver *</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {items.map((it, idx) => (
                    <div key={idx} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select value={it.codigo} onChange={e => selProducto(idx, e.target.value)} style={{ ...inputSt, flex: 2 }}>
                          <option value="">— Seleccioná producto —</option>
                          {catalogo.map(g => (
                            <optgroup key={g.cat} label={g.cat}>
                              {g.prods.map(p => <option key={p.codigo} value={p.codigo}>{p.codigo} — {p.nombre} {p.modelo}</option>)}
                            </optgroup>
                          ))}
                        </select>
                        <input type="number" min="1" value={it.cantidad}
                          onChange={e => setItems(prev => prev.map((p, i) => i !== idx ? p : { ...p, cantidad: parseInt(e.target.value) || 1 }))}
                          style={{ ...inputSt, width: 80, textAlign: 'center', fontWeight: 700 }} />
                        {items.length > 1 && (
                          <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                            style={{ background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, color: '#ff5577', cursor: 'pointer', fontSize: 16, padding: '0 10px', fontFamily: 'var(--font)' }}>×</button>
                        )}
                      </div>
                      <input value={it.motivo} onChange={e => setItems(prev => prev.map((p, i) => i !== idx ? p : { ...p, motivo: e.target.value }))}
                        placeholder="Motivo específico del producto (opcional)" style={{ ...inputSt, fontSize: 12 }} />
                    </div>
                  ))}
                </div>
                <button onClick={() => setItems(prev => [...prev, emptyItem()])}
                  style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(251,146,60,0.08)', border: '1px dashed rgba(251,146,60,0.4)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, color: '#fb923c', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  + Agregar otro producto
                </button>
              </div>

              {/* Notas */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Notas adicionales</label>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
                  placeholder="Describí el problema o cualquier información relevante..."
                  style={{ ...inputSt, resize: 'vertical', lineHeight: 1.5 }} />
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={crear} disabled={creando}
                  style={{ flex: 1, background: 'linear-gradient(135deg,#fb923c,#f97316)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 800, cursor: creando ? 'not-allowed' : 'pointer', opacity: creando ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {creando ? '⏳ Enviando...' : '↩️ Enviar orden de devolución'}
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
    </div>
  )
}
