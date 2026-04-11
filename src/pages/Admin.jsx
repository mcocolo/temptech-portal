import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Badge, Spinner, Modal, Textarea } from '@/components/ui'
import { notifyReclamoUpdate, notifyNewReply } from '@/lib/email'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Shield, MessageSquare, AlertTriangle, Users, CheckCircle } from 'lucide-react'

const TABS = ['Consultas', 'Reclamos', 'Usuarios']

const STATUS_RECLAMO = { open: { label: 'Abierto', color: 'red' }, in_progress: { label: 'En proceso', color: 'orange' }, closed: { label: 'Cerrado', color: 'green' } }
const STATUS_POST = { open: { label: 'Pendiente', color: 'orange' }, resolved: { label: 'Resuelto', color: 'green' } }

export default function Admin() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState('Consultas')
  const [posts, setPosts] = useState([])
  const [reclamos, setReclamos] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedReclamo, setSelectedReclamo] = useState(null)
  const [adminNote, setAdminNote] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    loadAll()
  }, [isAdmin])

  async function loadAll() {
    setLoading(true)
    const [postsRes, reclamosRes, usersRes] = await Promise.all([
      supabase.from('posts').select('*, profiles(full_name, email), replies(id)').order('created_at', { ascending: false }),
      supabase.from('reclamos').select('*, profiles(full_name, email)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
    ])
    setPosts(postsRes.data || [])
    setReclamos(reclamosRes.data || [])
    setUsers(usersRes.data || [])
    setStats({
      openPosts: (postsRes.data || []).filter(p => p.status === 'open').length,
      openReclamos: (reclamosRes.data || []).filter(r => r.status !== 'closed').length,
      totalUsers: (usersRes.data || []).length,
      resolved: (reclamosRes.data || []).filter(r => r.status === 'closed').length,
    })
    setLoading(false)
  }

  async function updateReclamo() {
    if (!newStatus) return toast.error('Seleccioná un estado')
    setSubmitting(true)
    const { error } = await supabase.from('reclamos').update({
      status: newStatus,
      admin_note: adminNote,
    }).eq('id', selectedReclamo.id)
    if (error) { toast.error('Error al actualizar'); setSubmitting(false); return }
    toast.success('Reclamo actualizado')
    if (selectedReclamo.profiles?.email) {
      await notifyReclamoUpdate({
        reclamoId: selectedReclamo.id,
        title: selectedReclamo.type,
        newStatus,
        recipientEmail: selectedReclamo.profiles.email,
      })
    }
    setSelectedReclamo(null)
    setAdminNote('')
    setNewStatus('')
    loadAll()
    setSubmitting(false)
  }

  async function markPostResolved(postId) {
    await supabase.from('posts').update({ status: 'resolved' }).eq('id', postId)
    toast.success('Marcado como resuelto')
    loadAll()
  }

  async function deletePost(postId) {
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Consulta eliminada')
    loadAll()
  }

  async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === 'admin' ? 'client' : 'admin'
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    toast.success(`Rol actualizado a ${newRole}`)
    loadAll()
  }

  if (!isAdmin) return (
    <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text3)' }}>
      <Shield size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>Acceso restringido</h2>
      <p>Solo administradores pueden acceder a este panel</p>
    </div>
  )

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={24} color="var(--accent)" /> Panel de Administración
        </h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Gestión completa de consultas, reclamos y usuarios</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Consultas Abiertas', val: stats.openPosts,    icon: MessageSquare, color: 'var(--accent)' },
          { label: 'Reclamos Activos',  val: stats.openReclamos, icon: AlertTriangle,  color: 'var(--red)' },
          { label: 'Usuarios',          val: stats.totalUsers,   icon: Users,          color: 'var(--blue)' },
          { label: 'Reclamos Cerrados', val: stats.resolved,     icon: CheckCircle,    color: 'var(--green)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <s.icon size={22} color={s.color} />
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.val ?? '—'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: tab === t ? 600 : 400,
            color: tab === t ? 'var(--accent)' : 'var(--text3)',
            borderBottom: `2px solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
            marginBottom: -1, transition: 'all .15s',
          }}>{t}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>
      ) : (
        <>
          {/* ─ POSTS TAB ─ */}
          {tab === 'Consultas' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    {['Usuario', 'Título', 'Categoría', 'Respuestas', 'Estado', 'Fecha', 'Acción'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {posts.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(37,40,54,0.5)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{p.profiles?.full_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text3)' }}>{p.category}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, textAlign: 'center' }}>{p.replies?.length || 0}</td>
                      <td style={{ padding: '12px 16px' }}><Badge color={STATUS_POST[p.status]?.color}>{STATUS_POST[p.status]?.label}</Badge></td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text3)' }}>{formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: es })}</td>
                      <td style={{ padding: '12px 16px', display: 'flex', gap: 6, alignItems: 'center' }}>
                        {p.status === 'open' && (
                          <Button size="sm" variant="success" onClick={() => markPostResolved(p.id)}>
                            <CheckCircle size={12} /> Resolver
                          </Button>
                        )}
                        <Button size="sm" variant="danger" onClick={() => { if (window.confirm('¿Eliminar esta consulta?')) deletePost(p.id) }}>
                          🗑
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ─ RECLAMOS TAB ─ */}
          {tab === 'Reclamos' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    {['Nº', 'Usuario', 'Tipo', 'Prioridad', 'Estado', 'Fecha', 'Acción'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reclamos.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(37,40,54,0.5)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--accent)', fontFamily: 'monospace' }}>#{r.id.slice(0,8).toUpperCase()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{r.profiles?.full_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13 }}>{r.type}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12 }}>
                        <span style={{ color: r.priority === 'high' ? 'var(--red)' : r.priority === 'medium' ? 'var(--yellow)' : 'var(--text3)' }}>
                          {r.priority === 'high' ? '● Alta' : r.priority === 'medium' ? '● Media' : '● Baja'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}><Badge color={STATUS_RECLAMO[r.status]?.color}>{STATUS_RECLAMO[r.status]?.label}</Badge></td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text3)' }}>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: es })}</td>
                      <td style={{ padding: '12px 16px' }}> 
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedReclamo(r); setNewStatus(r.status); setAdminNote(r.admin_note || '') }}>
                          Gestionar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ─ USERS TAB ─ */}
          {tab === 'Usuarios' && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface2)' }}>
                    {['Nombre', 'Email', 'Rol', 'Registrado', 'Acción'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(37,40,54,0.5)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500 }}>{u.full_name}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text3)' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge color={u.role === 'admin' ? 'orange' : 'blue'}>{u.role === 'admin' ? '⭐ Admin' : 'Cliente'}</Badge>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text3)' }}>
                        {formatDistanceToNow(new Date(u.created_at), { addSuffix: true, locale: es })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Button size="sm" variant="ghost" onClick={() => toggleUserRole(u.id, u.role)}>
                          {u.role === 'admin' ? 'Quitar Admin' : 'Hacer Admin'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Gestionar reclamo modal */}
      <Modal open={!!selectedReclamo} onClose={() => setSelectedReclamo(null)} title="Gestionar Reclamo">
        {selectedReclamo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'var(--surface2)', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 4 }}>#{selectedReclamo.id.slice(0,8).toUpperCase()} · {selectedReclamo.profiles?.full_name}</div>
              <div style={{ fontSize: 14 }}>{selectedReclamo.description}</div>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>Cambiar estado</label>
              <select value={newStatus} onChange={e => setNewStatus(e.target.value)} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text)', fontSize: 14 }}>
                <option value="open">Abierto</option>
                <option value="in_progress">En proceso</option>
                <option value="closed">Cerrado / Resuelto</option>
              </select>
            </div>
            <Textarea label="Nota para el cliente (se enviará por email)" placeholder="Explicá cómo se resolvió el problema o qué pasos se van a tomar..." value={adminNote} onChange={e => setAdminNote(e.target.value)} rows={4} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Button variant="ghost" onClick={() => setSelectedReclamo(null)}>Cancelar</Button>
              <Button onClick={updateReclamo} loading={submitting}>Guardar y Notificar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
