import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Card, Spinner } from '@/components/ui'
import { MessageSquare, AlertTriangle, CheckCircle, Clock, TrendingUp, ArrowRight } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

function StatCard({ label, value, delta, icon: Icon, color }) {
  const colors = {
    orange: { bg: 'var(--accent-dim)', accent: 'var(--accent)', border: 'rgba(255,107,43,0.2)' },
    red:    { bg: 'var(--red-dim)',    accent: 'var(--red)',    border: 'rgba(255,77,109,0.2)' },
    green:  { bg: 'var(--green-dim)', accent: 'var(--green)',  border: 'rgba(61,214,140,0.2)' },
    blue:   { bg: 'var(--blue-dim)',  accent: 'var(--blue)',   border: 'rgba(74,158,255,0.2)' },
  }
  const c = colors[color]
  return (
    <div style={{
      background: c.bg, border: `1px solid ${c.border}`,
      borderRadius: 'var(--radius-lg)', padding: '22px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `rgba(${color === 'orange' ? '255,107,43' : color === 'red' ? '255,77,109' : color === 'green' ? '61,214,140' : '74,158,255'}, 0.2)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={20} color={c.accent} />
      </div>
      <div>
        <div style={{ fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: '30px', fontFamily: 'var(--font-display)', fontWeight: 700, lineHeight: 1.2, color: c.accent }}>{value}</div>
        {delta && <div style={{ fontSize: '12px', color: 'var(--text3)', marginTop: '2px' }}>{delta}</div>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({ posts: 0, reclamos: 0, resolved: 0 })
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [postsRes, reclamosRes, resolvedRes, recentRes] = await Promise.all([
        supabase.from('posts').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('reclamos').select('id', { count: 'exact', head: true }).in('status', ['open', 'in_progress']),
        supabase.from('reclamos').select('id', { count: 'exact', head: true }).eq('status', 'closed'),
        supabase.from('posts').select('id, title, created_at, status, profiles(full_name)').order('created_at', { ascending: false }).limit(5),
      ])
      setStats({
        posts: postsRes.count || 0,
        reclamos: reclamosRes.count || 0,
        resolved: resolvedRes.count || 0,
      })
      setRecent(recentRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <Spinner size={28} />
    </div>
  )

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Bienvenido, {profile?.full_name?.split(' ')[0] || 'Usuario'} 👋
        </h1>
        <p style={{ color: 'var(--text3)', marginTop: 6, fontSize: 14 }}>
          Este es tu portal de atención al cliente TEMPTECH
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Consultas Abiertas" value={stats.posts} icon={MessageSquare} color="orange" delta="En el foro público" />
        <StatCard label="Reclamos Activos"   value={stats.reclamos} icon={AlertTriangle} color="red"    delta="Pendientes de resolución" />
        <StatCard label="Casos Resueltos"    value={stats.resolved} icon={CheckCircle}  color="green"  delta="Total histórico" />
        <StatCard label="Tiempo Respuesta"   value="< 4h" icon={Clock} color="blue" delta="Promedio del equipo" />
      </div>

      <div className="dash-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        {/* Recent posts */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700 }}>Consultas Recientes</div>
            <button onClick={() => navigate('/foro')} style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              Ver todas <ArrowRight size={12} />
            </button>
          </div>
          {recent.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>No hay consultas todavía.</p>
          ) : recent.map(p => (
            <div key={p.id} onClick={() => navigate('/foro')} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 0', borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.status === 'resolved' ? 'var(--green)' : 'var(--accent)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {p.profiles?.full_name} · {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: es })}
                </div>
              </div>
            </div>
          ))}
        </Card>

        {/* Quick links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Hacer una consulta',    emoji: '💬', path: '/foro',         desc: 'Publicar en el foro' },
            { label: 'Registrar un reclamo',  emoji: '⚠️', path: '/reclamos',     desc: 'Centro de reclamos' },
            { label: 'Ver manuales',          emoji: '📚', path: '/manuales',     desc: 'Guías y documentación' },
            { label: 'Videos tutoriales',     emoji: '▶️', path: '/videos',       desc: 'Aprender a usar' },
          ].map(item => (
            <div
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)' }}
            >
              <span style={{ fontSize: 22 }}>{item.emoji}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
