import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import toast from 'react-hot-toast'

function formatFecha(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const ESTADO_CFG = {
  pendiente:  { label: 'Pendiente',  color: '#ffd166' },
  aprobado:   { label: 'Aprobado',   color: '#3dd68c' },
  preparando: { label: 'Preparando', color: '#a78bfa' },
  modificado: { label: 'Modificado', color: '#fb923c' },
  enviado:    { label: 'Enviado',    color: '#38bdf8' },
  entregado:  { label: 'Entregado',  color: '#38bdf8' },
  finalizado: { label: 'Finalizado', color: '#3dd68c' },
  rechazado:  { label: 'Rechazado',  color: '#ff5577' },
}

const FILTROS = [['por_revisar', 'Por revisar'], ['revisados', 'Revisados'], ['todos', 'Todos']]

export default function DevolucionesDistribuidores() {
  const { isAdmin, isAdmin2, user, profile } = useAuth()
  const nombreUsuario = profile?.full_name || user?.email || 'Admin'
  const puedeRevisar = isAdmin || isAdmin2

  const [pedidos, setPedidos] = useState([])
  const [perfiles, setPerfiles] = useState({})
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('por_revisar')
  const [busqueda, setBusqueda] = useState('')
  const [guardando, setGuardando] = useState(null)

  useEffect(() => { cargar() }, [])
  async function cargar() {
    setLoading(true)
    const data = await fetchAllRows(() =>
      supabase.from('pedidos').select('*').eq('concepto', 'devoluciones_pendientes').order('created_at', { ascending: false })
    )
    const rows = data || []
    setPedidos(rows)
    const ids = [...new Set(rows.map(p => p.distribuidor_id).filter(Boolean))]
    if (ids.length) {
      const { data: profs } = await supabase.from('profiles').select('id,full_name,razon_social,email').in('id', ids)
      setPerfiles(Object.fromEntries((profs || []).map(p => [p.id, p])))
    }
    setLoading(false)
  }

  async function marcarRevisado(pedido, revisado) {
    setGuardando(pedido.id)
    const { error } = await supabase.from('pedidos').update({
      dev_revisado: revisado,
      dev_revisado_por: revisado ? nombreUsuario : null,
      dev_revisado_at: revisado ? new Date().toISOString() : null,
    }).eq('id', pedido.id)
    setGuardando(null)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(revisado ? 'Marcado como revisado ✅' : 'Reabierto')
    setPedidos(prev => prev.map(p => p.id === pedido.id ? { ...p, dev_revisado: revisado, dev_revisado_por: revisado ? nombreUsuario : null, dev_revisado_at: revisado ? new Date().toISOString() : null } : p))
  }

  if (!isAdmin && !isAdmin2) return null

  const q = busqueda.trim().toLowerCase()
  const filtrados = pedidos.filter(p => {
    if (filtro === 'por_revisar' && p.dev_revisado) return false
    if (filtro === 'revisados' && !p.dev_revisado) return false
    if (q) {
      const prof = perfiles[p.distribuidor_id] || {}
      const nom = (prof.razon_social || prof.full_name || '').toLowerCase()
      return nom.includes(q) || (prof.email || '').toLowerCase().includes(q) || String(p.id).slice(0, 8).includes(q)
    }
    return true
  })
  const porRevisar = pedidos.filter(p => !p.dev_revisado).length

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Devoluciones Distribuidores</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Pedidos entregados contra mercadería que ingresó por devoluciones — para revisar</p>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
        <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 3 }}>
          {FILTROS.map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)}
              style={{ padding: '7px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', border: 'none', background: filtro === v ? 'rgba(251,146,60,0.2)' : 'transparent', color: filtro === v ? '#fb923c' : 'var(--text3)' }}>
              {l}{v === 'por_revisar' && porRevisar > 0 ? ` (${porRevisar})` : ''}
            </button>
          ))}
        </div>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar distribuidor…"
          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', maxWidth: 260 }} />
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>{filtrados.length} pedido(s)</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando…</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>No hay pedidos {filtro === 'por_revisar' ? 'por revisar' : filtro === 'revisados' ? 'revisados' : ''}.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtrados.map(p => {
            const prof = perfiles[p.distribuidor_id] || {}
            const nombre = prof.razon_social || prof.full_name || 'Distribuidor'
            const est = ESTADO_CFG[p.estado] || { label: p.estado, color: 'var(--text3)' }
            const items = (p.items || []).filter(i => i.cantidad > 0)
            const totalUnid = items.reduce((s, i) => s + (parseInt(i.cantidad) || 0), 0)
            return (
              <div key={p.id} style={{ background: 'var(--surface)', border: `1px solid ${p.dev_revisado ? 'rgba(61,214,140,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 800 }}>🏪 {nombre}</span>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text3)' }}>#{String(p.id).slice(0, 8).toUpperCase()}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: est.color, background: `${est.color}18`, border: `1px solid ${est.color}44`, borderRadius: 20, padding: '2px 10px' }}>{est.label}</span>
                      {p.dev_revisado && <span style={{ fontSize: 11, fontWeight: 700, color: '#3dd68c', background: 'rgba(61,214,140,0.12)', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 20, padding: '2px 10px' }}>✓ Revisado</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                      Creado {formatFecha(p.created_at)}{p.fecha_entrega ? ` · Entrega ${formatFecha(p.fecha_entrega)}` : ''} · {totalUnid} u.
                      {p.dev_revisado && p.dev_revisado_por ? <span style={{ color: '#3dd68c' }}> · revisado por {p.dev_revisado_por}</span> : ''}
                    </div>
                  </div>
                  {puedeRevisar && (
                    p.dev_revisado
                      ? <button onClick={() => marcarRevisado(p, false)} disabled={guardando === p.id} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>↩ Reabrir</button>
                      : <button onClick={() => marcarRevisado(p, true)} disabled={guardando === p.id} style={{ background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.4)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>{guardando === p.id ? '…' : '✓ Marcar revisado'}</button>
                  )}
                </div>

                <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {items.map((i, idx) => (
                    <span key={idx} style={{ fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '4px 10px' }}>
                      {i.codigo ? <b style={{ fontFamily: 'monospace', fontSize: 10, color: '#7b9fff' }}>{i.codigo} </b> : ''}{i.nombre} {i.modelo || ''} · <b>x{i.cantidad}</b>
                    </span>
                  ))}
                  {items.length === 0 && <span style={{ fontSize: 12, color: 'var(--text3)' }}>Sin ítems.</span>}
                </div>
                {p.notas_admin && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text2)' }}>📝 {p.notas_admin}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
