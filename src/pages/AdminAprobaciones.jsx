import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const TYPE_LABEL = { distributor: 'Distribuidor', tecnico: 'Servicio Técnico' }
const TYPE_COLOR = { distributor: '#ffd166', tecnico: '#3dd68c' }

export default function AdminAprobaciones() {
  const { isAdmin } = useAuth()
  const [pendientes, setPendientes] = useState([])
  const [rechazados, setRechazados] = useState([])
  const [aprobados, setAprobados] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pendientes')
  const [procesando, setProcesando] = useState(null)

  useEffect(() => { if (isAdmin) cargar() }, [isAdmin])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, razon_social, email, telefono, user_type, aprobado, created_at, provincia, cuit')
      .in('user_type', ['distributor', 'tecnico'])
      .order('created_at', { ascending: false })
    if (error) { toast.error('Error al cargar: ' + error.message); setLoading(false); return }
    setPendientes((data || []).filter(u => u.aprobado === null))
    setRechazados((data || []).filter(u => u.aprobado === false))
    setAprobados((data || []).filter(u => u.aprobado === true))
    setLoading(false)
  }

  async function aprobar(u) {
    setProcesando(u.id)
    const { error } = await supabase.from('profiles').update({ aprobado: true }).eq('id', u.id)
    setProcesando(null)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`✅ ${u.razon_social || u.full_name} aprobado`)
    cargar()
  }

  async function rechazar(u) {
    if (!window.confirm(`¿Rechazar a ${u.razon_social || u.full_name}? El usuario verá un mensaje de cuenta rechazada.`)) return
    setProcesando(u.id)
    const { error } = await supabase.from('profiles').update({ aprobado: false }).eq('id', u.id)
    setProcesando(null)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`Cuenta de ${u.razon_social || u.full_name} rechazada`)
    cargar()
  }

  async function revertirAPendiente(u) {
    setProcesando(u.id)
    const { error } = await supabase.from('profiles').update({ aprobado: null }).eq('id', u.id)
    setProcesando(null)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Revertido a pendiente')
    cargar()
  }

  if (!isAdmin) return null

  const tabs = [
    { key: 'pendientes', label: `Pendientes (${pendientes.length})`, color: '#ffd166' },
    { key: 'aprobados',  label: `Aprobados (${aprobados.length})`,   color: '#3dd68c' },
    { key: 'rechazados', label: `Rechazados (${rechazados.length})`, color: '#ff5577' },
  ]

  const lista = tab === 'pendientes' ? pendientes : tab === 'aprobados' ? aprobados : rechazados

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Aprobaciones</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Gestioná el acceso de distribuidores y servicios técnicos</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '6px 16px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font)',
            background: tab === t.key ? `${t.color}20` : 'var(--surface)',
            color: tab === t.key ? t.color : 'var(--text3)',
            border: tab === t.key ? `1px solid ${t.color}50` : '1px solid var(--border)',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text3)', fontSize: 14 }}>Cargando...</div>
      ) : lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text3)', fontSize: 14 }}>
          No hay usuarios en esta categoría
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lista.map(u => (
            <div key={u.id} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)', padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
            }}>
              {/* Avatar */}
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: `${TYPE_COLOR[u.user_type] || '#7b9fff'}20`,
                border: `1px solid ${TYPE_COLOR[u.user_type] || '#7b9fff'}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>
                {u.user_type === 'distributor' ? '🏪' : '🔧'}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {u.razon_social || u.full_name || '—'}
                </div>
                {u.razon_social && u.full_name && (
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>{u.full_name}</div>
                )}
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{u.email}</div>
              </div>

              {/* Detalles */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text3)' }}>
                {u.cuit && <span>CUIT: <b style={{ color: 'var(--text2)' }}>{u.cuit}</b></span>}
                {u.telefono && <span>Tel: <b style={{ color: 'var(--text2)' }}>{u.telefono}</b></span>}
                {u.provincia && <span>Prov: <b style={{ color: 'var(--text2)' }}>{u.provincia}</b></span>}
                <span>
                  <span style={{
                    background: `${TYPE_COLOR[u.user_type]}20`,
                    color: TYPE_COLOR[u.user_type],
                    border: `1px solid ${TYPE_COLOR[u.user_type]}40`,
                    borderRadius: 6, padding: '2px 8px', fontWeight: 600,
                  }}>
                    {TYPE_LABEL[u.user_type] || u.user_type}
                  </span>
                </span>
                <span style={{ color: 'var(--text3)' }}>
                  {new Date(u.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </span>
              </div>

              {/* Acciones */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {tab === 'pendientes' && (
                  <>
                    <button
                      onClick={() => aprobar(u)}
                      disabled={procesando === u.id}
                      style={{ background: 'rgba(61,214,140,0.1)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      {procesando === u.id ? '...' : '✓ Aprobar'}
                    </button>
                    <button
                      onClick={() => rechazar(u)}
                      disabled={procesando === u.id}
                      style={{ background: 'rgba(255,85,119,0.1)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      Rechazar
                    </button>
                  </>
                )}
                {tab === 'aprobados' && (
                  <button
                    onClick={() => rechazar(u)}
                    disabled={procesando === u.id}
                    style={{ background: 'rgba(255,85,119,0.08)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    Revocar acceso
                  </button>
                )}
                {tab === 'rechazados' && (
                  <>
                    <button
                      onClick={() => aprobar(u)}
                      disabled={procesando === u.id}
                      style={{ background: 'rgba(61,214,140,0.1)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      {procesando === u.id ? '...' : '✓ Aprobar'}
                    </button>
                    <button
                      onClick={() => revertirAPendiente(u)}
                      disabled={procesando === u.id}
                      style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      Pendiente
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
