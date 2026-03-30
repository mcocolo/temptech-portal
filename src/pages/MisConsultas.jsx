import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Badge, Spinner, Empty, Button } from '@/components/ui'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { MessageSquare, AlertTriangle } from 'lucide-react'

export default function MisConsultas() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [reclamos, setReclamos] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('posts')

  useEffect(() => {
    if (!user) return
    async function load() {
      setLoading(true)
      const [postsRes, reclamosRes] = await Promise.all([
        supabase.from('posts').select('*, replies(id)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('reclamos').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ])
      setPosts(postsRes.data || [])
      setReclamos(reclamosRes.data || [])
      setLoading(false)
    }
    load()
  }, [user])

  const STATUS_POST = { open: { label: 'Pendiente', color: 'orange' }, resolved: { label: 'Resuelto', color: 'green' } }
  const STATUS_REC = { open: { label: 'Abierto', color: 'red' }, in_progress: { label: 'En proceso', color: 'orange' }, closed: { label: 'Cerrado', color: 'green' } }

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Mis Consultas</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Historial de consultas y reclamos de tu cuenta</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 28 }}>
        <div style={{ background: 'var(--accent-dim)', border: '1px solid rgba(255,107,43,0.2)', borderRadius: 'var(--radius-lg)', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <MessageSquare size={22} color="var(--accent)" />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Mis Consultas</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.2 }}>{posts.length}</div>
          </div>
        </div>
        <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(255,77,109,0.2)', borderRadius: 'var(--radius-lg)', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <AlertTriangle size={22} color="var(--red)" />
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>Mis Reclamos</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--red)', lineHeight: 1.2 }}>{reclamos.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {['posts', 'reclamos'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? 'var(--accent)' : 'var(--text3)',
            borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
            marginBottom: -1, transition: 'all .15s',
          }}>{t === 'posts' ? 'Consultas del foro' : 'Reclamos'}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>
      ) : tab === 'posts' ? (
        posts.length === 0 ? (
          <Empty icon="💬" title="Sin consultas" description="No publicaste ninguna consulta todavía">
            <Button style={{ marginTop: 16 }} onClick={() => navigate('/foro')}>Ir al foro</Button>
          </Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {posts.map(p => (
              <div key={p.id} onClick={() => navigate('/foro')} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', padding: '18px 22px',
                display: 'flex', alignItems: 'center', gap: 16,
                cursor: 'pointer', transition: 'all .2s',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateX(4px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateX(0)' }}
              >
                <MessageSquare size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {p.replies?.length || 0} respuestas · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: es })}
                  </div>
                </div>
                <Badge color={STATUS_POST[p.status]?.color}>{STATUS_POST[p.status]?.label}</Badge>
              </div>
            ))}
          </div>
        )
      ) : (
        reclamos.length === 0 ? (
          <Empty icon="✅" title="Sin reclamos" description="No tenés reclamos registrados">
            <Button variant="danger" style={{ marginTop: 16 }} onClick={() => navigate('/reclamos')}>Registrar reclamo</Button>
          </Empty>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Nº', 'Tipo', 'Prioridad', 'Estado', 'Fecha', ''].map(h => (
                    <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reclamos.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid rgba(37,40,54,0.5)' }}>
                    <td style={{ padding: '12px 18px', fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>#{r.id.slice(0,8).toUpperCase()}</td>
                    <td style={{ padding: '12px 18px', fontSize: 13 }}>{r.type}</td>
                    <td style={{ padding: '12px 18px', fontSize: 12, color: r.priority === 'high' ? 'var(--red)' : r.priority === 'medium' ? 'var(--yellow)' : 'var(--text3)' }}>
                      {r.priority === 'high' ? '● Alta' : r.priority === 'medium' ? '● Media' : '● Baja'}
                    </td>
                    <td style={{ padding: '12px 18px' }}><Badge color={STATUS_REC[r.status]?.color}>{STATUS_REC[r.status]?.label}</Badge></td>
                    <td style={{ padding: '12px 18px', fontSize: 12, color: 'var(--text3)' }}>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: es })}</td>
                    <td style={{ padding: '12px 18px' }}><Button size="sm" variant="ghost" onClick={() => navigate('/reclamos')}>Ver</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}
