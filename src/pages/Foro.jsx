import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Input, Textarea, Modal, Badge, Spinner, Empty } from '@/components/ui'
import { notifyNewPost, notifyNewReply } from '@/lib/email'
import { MessageSquare, ThumbsUp, Eye, Clock, ChevronLeft, Star, ChevronDown, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

// ── Catálogo completo de productos TEMPTECH ──
const PRODUCT_CATALOG = [
  {
    group: 'Paneles Calefactores',
    emoji: '🔆',
    color: '#ffd166',
    bg: 'rgba(255,209,102,0.12)',
    border: 'rgba(255,209,102,0.35)',
    subs: [
      {
        label: 'Slim',
        products: [
          { value: 'slim_250w',               label: 'Panel Calefactor Eléctrico TEMPTECH Slim 250w' },
          { value: 'slim_toallero_simple_250w',label: 'Panel Calefactor Eléctrico Toallero Simple TEMPTECH Slim 250w' },
          { value: 'slim_toallero_doble_250w', label: 'Panel Calefactor Eléctrico Toallero Doble TEMPTECH Slim 250w' },
          { value: 'slim_500w',               label: 'Panel Calefactor Eléctrico TEMPTECH Slim 500w' },
          { value: 'slim_toallero_simple_500w',label: 'Panel Calefactor Eléctrico Toallero Simple TEMPTECH Slim 500w' },
          { value: 'slim_toallero_doble_500w', label: 'Panel Calefactor Eléctrico Toallero Doble TEMPTECH Slim 500w' },
          { value: 'slim_500w_madera_blanca',  label: 'Panel Calefactor Eléctrico TEMPTECH Slim 500w Madera Blanca' },
        ],
      },
      {
        label: 'Firenze',
        products: [
          { value: 'firenze_blanco',           label: 'Panel Calefactor TEMPTECH Firenze 1400w Blanco' },
          { value: 'firenze_madera_veteada',   label: 'Panel Calefactor TEMPTECH Firenze 1400w Madera Veteada' },
          { value: 'firenze_piedra_azteca',    label: 'Panel Calefactor TEMPTECH Firenze 1400w Piedra Azteca' },
          { value: 'firenze_piedra_romana',    label: 'Panel Calefactor TEMPTECH Firenze 1400w Piedra Romana' },
          { value: 'firenze_marmol_traviatta', label: 'Panel Calefactor TEMPTECH Firenze 1400w Mármol Traviatta Gris' },
          { value: 'firenze_piedra_cantera',   label: 'Panel Calefactor TEMPTECH Firenze 1400w Piedra Cantera Luna' },
          { value: 'firenze_marmol_calacatta', label: 'Panel Calefactor TEMPTECH Firenze 1400w Mármol Calacatta Ocre' },
          { value: 'firenze_smart_wifi',       label: 'Panel Calefactor TEMPTECH Firenze 1400w SMART WIFI Blanco' },
        ],
      },
    ],
  },
  {
    group: 'Calefones',
    emoji: '🔥',
    color: '#ff6b2b',
    bg: 'rgba(255,107,43,0.12)',
    border: 'rgba(255,107,43,0.35)',
    subs: [
      {
        label: 'Calefones Eléctricos',
        products: [
          { value: 'one_silver',        label: 'Calefón Eléctrico TEMPTECH One 3,5/5,5/7Kw 220V Silver' },
          { value: 'nova_blanco',       label: 'Calefón Eléctrico TEMPTECH Nova 6/8/9/13,5Kw 220V Blanco' },
          { value: 'nova_black',        label: 'Calefón Eléctrico TEMPTECH Nova 6/8/9/13,5Kw 220V Black' },
          { value: 'nova_silver',       label: 'Calefón Eléctrico TEMPTECH Nova 6/8/9/13,5Kw 220V Silver' },
          { value: 'pulse_9_18_blanco', label: 'Calefón Eléctrico TEMPTECH Pulse 9/13,5/18Kw 380V Blanco' },
          { value: 'pulse_12_24_blanco',label: 'Calefón Eléctrico TEMPTECH Pulse 12/18/24Kw 380V Blanco' },
        ],
      },
    ],
  },
  {
    group: 'Calderas',
    emoji: '⚡',
    color: '#4a9eff',
    bg: 'rgba(74,158,255,0.12)',
    border: 'rgba(74,158,255,0.35)',
    subs: [
      {
        label: 'Calderas Duales',
        products: [
          { value: 'core_220_380_14kw', label: 'Caldera Eléctrica Dual TEMPTECH Core 220-380V 14,4 Kw Blanco' },
          { value: 'core_380_23kw',     label: 'Caldera Eléctrica Dual TEMPTECH Core 380V 23 Kw Blanco' },
        ],
      },
    ],
  },
  {
    group: 'Anafes Vitro',
    emoji: '🍳',
    color: '#3dd68c',
    bg: 'rgba(61,214,140,0.12)',
    border: 'rgba(61,214,140,0.35)',
    subs: [
      {
        label: 'General',
        products: [
          { value: 'anafe_general', label: 'Anafes Vitro (consulta general)' },
        ],
      },
    ],
  },
  {
    group: 'Otros',
    emoji: '💡',
    color: '#9196a8',
    bg: 'rgba(145,150,168,0.08)',
    border: 'rgba(145,150,168,0.2)',
    subs: [
      {
        label: 'General',
        products: [
          { value: 'garantia',  label: 'Garantía y devoluciones' },
          { value: 'envios',    label: 'Envíos y logística' },
          { value: 'factura',   label: 'Facturación y pagos' },
          { value: 'tecnico',   label: 'Soporte técnico general' },
          { value: 'otro',      label: 'Otro' },
        ],
      },
    ],
  },
]

// Helpers para buscar info de un value
function findProduct(value) {
  for (const g of PRODUCT_CATALOG) {
    for (const s of g.subs) {
      const p = s.products.find(p => p.value === value)
      if (p) return p
    }
  }
  return null
}
function findGroup(value) {
  for (const g of PRODUCT_CATALOG) {
    for (const s of g.subs) {
      if (s.products.some(p => p.value === value)) return g
    }
  }
  return null
}

const STATUS_FILTER = [
  { value: '', label: 'Todos' },
  { value: 'open', label: 'Pendientes' },
  { value: 'resolved', label: 'Resueltos' },
]
const STATUS_COLORS = { open: 'orange', resolved: 'green', closed: 'blue' }
const STATUS_LABELS = { open: 'Pendiente', resolved: 'Resuelto', closed: 'Cerrado' }

function Avatar({ name, size = 32 }) {
  const colors = ['#e8215a','#4a6cf7','#3dd68c','#ff4d6d','#ffd166','#8b2fc9']
  const idx = (name?.charCodeAt(0) || 0) % colors.length
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: colors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
      {name?.charAt(0)?.toUpperCase() || 'U'}
    </div>
  )
}

// ── Selector de producto en cascada ──
function ProductSelector({ value, onChange }) {
  const [openGroup, setOpenGroup] = useState(() => {
    const g = findGroup(value)
    return g?.group || PRODUCT_CATALOG[0].group
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {PRODUCT_CATALOG.map(g => {
        const isOpen = openGroup === g.group
        const allProducts = g.subs.flatMap(s => s.products)
        const selected = allProducts.find(p => p.value === value)
        return (
          <div key={g.group} style={{ border: `1px solid ${isOpen ? g.border : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden', transition: 'border .2s' }}>
            {/* Header del grupo */}
            <div
              onClick={() => setOpenGroup(isOpen ? null : g.group)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                cursor: 'pointer', background: isOpen ? g.bg : 'var(--surface2)',
                transition: 'background .15s',
              }}
            >
              <span style={{ fontSize: 18 }}>{g.emoji}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: isOpen ? g.color : 'var(--text2)' }}>{g.group}</span>
              {selected && !isOpen && (
                <span style={{ fontSize: 11, color: g.color, background: g.bg, padding: '2px 8px', borderRadius: 20, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selected.label.replace('TEMPTECH ', '')}
                </span>
              )}
              <ChevronDown size={14} color={isOpen ? g.color : 'var(--text3)'} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
            </div>

            {/* Lista de productos */}
            {isOpen && (
              <div style={{ background: 'var(--surface)', borderTop: `1px solid ${g.border}`, maxHeight: 280, overflowY: 'auto' }}>
                {g.subs.map(sub => (
                  <div key={sub.label}>
                    {g.subs.length > 1 && (
                      <div style={{ padding: '7px 14px 4px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', background: 'var(--surface2)' }}>
                        {sub.label}
                      </div>
                    )}
                    {sub.products.map(p => (
                      <div
                        key={p.value}
                        onClick={() => onChange(p.value)}
                        style={{
                          padding: '9px 16px', fontSize: 13, cursor: 'pointer',
                          background: value === p.value ? g.bg : 'transparent',
                          color: value === p.value ? g.color : 'var(--text2)',
                          fontWeight: value === p.value ? 600 : 400,
                          borderLeft: `3px solid ${value === p.value ? g.color : 'transparent'}`,
                          transition: 'all .1s',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}
                        onMouseEnter={e => { if (value !== p.value) { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text)' } }}
                        onMouseLeave={e => { if (value !== p.value) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' } }}
                      >
                        {value === p.value && <span style={{ fontSize: 10 }}>✓</span>}
                        {p.label}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Foro() {
  const { user, profile, isAdmin, isAdmin2 } = useAuth()
  const [posts, setPosts]         = useState([])
  const [selected, setSelected]   = useState(null)
  const [replies, setReplies]     = useState([])
  const [loading, setLoading]     = useState(true)
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [newPostOpen, setNewPostOpen] = useState(false)
  const [groupFilter, setGroupFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm]           = useState({ title: '', body: '', category: 'slim_250w' })
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadPosts() }, [groupFilter, statusFilter])

  async function loadPosts() {
    setLoading(true)
    let q = supabase.from('posts').select('*, profiles(full_name), replies(id)').order('created_at', { ascending: false })

    if (groupFilter) {
      const group = PRODUCT_CATALOG.find(g => g.group === groupFilter)
      const vals = group?.subs.flatMap(s => s.products.map(p => p.value)) || []
      q = q.in('category', vals)
    }
    if (statusFilter) q = q.eq('status', statusFilter)

    const { data, error } = await q
    if (!error) setPosts(data || [])
    setLoading(false)
  }

  async function openPost(post) {
    setSelected(post)
    setLoadingReplies(true)
    const { data } = await supabase.from('replies').select('*, profiles(full_name, role)').eq('post_id', post.id).order('created_at', { ascending: true })
    setReplies(data || [])
    setLoadingReplies(false)
    await supabase.from('posts').update({ views: (post.views || 0) + 1 }).eq('id', post.id)
  }

  async function submitPost() {
    if (!form.title.trim() || !form.body.trim()) return toast.error('Completá todos los campos')
    setSubmitting(true)
    const { data, error } = await supabase.from('posts').insert({
      title: form.title.trim(), body: form.body.trim(),
      category: form.category, user_id: user.id, status: 'open',
    }).select().single()
    if (error) { toast.error('Error al publicar'); setSubmitting(false); return }
    toast.success('¡Consulta publicada!')
    await notifyNewPost({ postId: data.id, title: data.title, authorName: profile?.full_name, category: data.category })
    setNewPostOpen(false)
    setForm({ title: '', body: '', category: 'slim_250w' })
    loadPosts()
    setSubmitting(false)
  }

  async function submitReply() {
    if (!replyText.trim()) return
    setSubmitting(true)
    const { error } = await supabase.from('replies').insert({ post_id: selected.id, user_id: user.id, body: replyText.trim(), is_official: isAdmin })
    if (error) { toast.error('Error al responder'); setSubmitting(false); return }
    toast.success('Respuesta publicada')
    if (isAdmin) await supabase.from('posts').update({ status: 'resolved' }).eq('id', selected.id)
    const { data: postData } = await supabase.from('posts').select('*, profiles(email)').eq('id', selected.id).single()
    if (postData?.profiles?.email) {
      await notifyNewReply({ postId: selected.id, postTitle: selected.title, replyAuthor: profile?.full_name, replyText: replyText.trim().substring(0, 200), recipientEmail: postData.profiles.email })
    }
    setReplyText('')
    openPost(selected)
    setSubmitting(false)
  }

  async function vote(postId, currentVotes) {
    await supabase.from('posts').update({ votes: currentVotes + 1 }).eq('id', postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, votes: currentVotes + 1 } : p))
  }

  async function deletePost(postId) {
    if (!window.confirm('¿Eliminar esta consulta?')) return
    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Consulta eliminada')
    setSelected(null)
    loadPosts()
  }

  async function deleteReply(replyId) {
    if (!window.confirm('¿Eliminar esta respuesta?')) return
    const { error } = await supabase.from('replies').delete().eq('id', replyId)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Respuesta eliminada')
    openPost(selected)
  }

  // ── POST DETAIL ──
  if (selected) return (
    <div style={{ animation: 'fadeUp 0.3s ease', maxWidth: 760 }}>
      <button onClick={() => { setSelected(null); loadPosts() }} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
      >
        <ChevronLeft size={15} /> Volver al foro
      </button>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <Badge color={STATUS_COLORS[selected.status]}>{STATUS_LABELS[selected.status]}</Badge>
          {selected.category && (() => {
            const g = findGroup(selected.category)
            const p = findProduct(selected.category)
            if (!g) return null
            return (
              <span style={{ background: g.bg, color: g.color, border: `1px solid ${g.border}`, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                {g.emoji} {p?.label || selected.category}
              </span>
            )
          })()}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, lineHeight: 1.3 }}>{selected.title}</h1>
          {isAdmin && (
            <button onClick={() => deletePost(selected.id)}
              style={{ flexShrink: 0, background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 'var(--radius)', padding: '5px 12px', fontSize: 12, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>
              🗑 Eliminar consulta
            </button>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <Avatar name={selected.profiles?.full_name} size={28} />
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>{selected.profiles?.full_name}</span>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>· {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true, locale: es })}</span>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: '#c8cad4', whiteSpace: 'pre-wrap' }}>{selected.body}</p>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text3)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          {replies.length} Respuesta{replies.length !== 1 ? 's' : ''}
        </div>
        {loadingReplies ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div> : (
          replies.map(r => (
            <div key={r.id} style={{ background: r.is_official ? 'rgba(74,108,247,0.05)' : 'var(--surface)', border: `1px solid ${r.is_official ? 'rgba(74,108,247,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: 22, marginBottom: 12 }}>
              {r.is_official && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', background: 'var(--brand-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  <Star size={12} color="#8b2fc9" fill="#8b2fc9" /> Respuesta Oficial de TEMPTECH
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Avatar name={r.profiles?.full_name} size={26} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{r.profiles?.full_name}</span>
                <span style={{ fontSize: 12, color: 'var(--text3)' }}>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: es })}</span>
                {isAdmin && (
                  <button onClick={() => deleteReply(r.id)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, padding: '2px 6px', borderRadius: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ff5577'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                    title="Eliminar respuesta">
                    🗑
                  </button>
                )}
              </div>
              <p style={{ fontSize: 14, lineHeight: 1.75, color: '#c0c2cc', whiteSpace: 'pre-wrap' }}>{r.body}</p>
            </div>
          ))
        )}
      </div>

      {user && !isAdmin2 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            {isAdmin ? '⭐ Responder como TEMPTECH (oficial)' : 'Agregar una respuesta'}
          </div>
          <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Escribí tu respuesta..." rows={4} />
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <Button onClick={submitReply} loading={submitting} variant={isAdmin ? 'primary' : 'ghost'}>Publicar respuesta</Button>
          </div>
        </div>
      )}
    </div>
  )

  // ── POST LIST ──
  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Foro de Consultas</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Todas las consultas son públicas y visibles por la comunidad</p>
        </div>
        {user && !isAdmin2 && <Button onClick={() => setNewPostOpen(true)}>+ Nueva Consulta</Button>}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {STATUS_FILTER.map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)} style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer', transition: 'all .15s',
            border: `1px solid ${statusFilter === f.value ? 'var(--brand-blue)' : 'var(--border)'}`,
            background: statusFilter === f.value ? 'rgba(74,108,247,0.1)' : 'transparent',
            color: statusFilter === f.value ? 'var(--brand-blue)' : 'var(--text3)',
            fontWeight: statusFilter === f.value ? 600 : 400,
          }}>{f.label}</button>
        ))}
      </div>

      {/* Filtro por grupo de producto */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <button onClick={() => setGroupFilter('')} style={{
          padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', transition: 'all .15s',
          border: `1px solid ${!groupFilter ? 'rgba(255,255,255,0.25)' : 'var(--border)'}`,
          background: !groupFilter ? 'rgba(255,255,255,0.07)' : 'transparent',
          color: !groupFilter ? 'var(--text)' : 'var(--text3)',
          fontWeight: !groupFilter ? 600 : 400,
        }}>💬 Todos</button>
        {PRODUCT_CATALOG.map(g => (
          <button key={g.group} onClick={() => setGroupFilter(groupFilter === g.group ? '' : g.group)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', transition: 'all .15s',
            border: `1px solid ${groupFilter === g.group ? g.border : 'var(--border)'}`,
            background: groupFilter === g.group ? g.bg : 'transparent',
            color: groupFilter === g.group ? g.color : 'var(--text3)',
            fontWeight: groupFilter === g.group ? 600 : 400,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {g.emoji} {g.group}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={28} /></div>
      ) : posts.length === 0 ? (
        <Empty icon="💬" title="No hay consultas" description="Sé el primero en hacer una consulta" />
      ) : posts.map(post => {
        const g = findGroup(post.category)
        const p = findProduct(post.category)
        return (
          <div key={post.id} onClick={() => openPost(post)} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)', padding: 20, marginBottom: 12,
            display: 'flex', gap: 16, cursor: 'pointer', transition: 'all .2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateX(4px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateX(0)' }}
          >
            {/* Votos */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 44 }}>
              <button onClick={e => { e.stopPropagation(); vote(post.id, post.votes || 0) }} style={{
                background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 8, width: 34, height: 30,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', transition: 'all .15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(74,108,247,0.15)'; e.currentTarget.style.color = 'var(--brand-blue)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text3)' }}
              >
                <ThumbsUp size={13} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{post.votes || 0}</span>
            </div>

            {/* Contenido */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>{post.title}</div>
              <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.body}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Badge color={STATUS_COLORS[post.status]}>{STATUS_LABELS[post.status]}</Badge>
                {g && (
                  <span style={{ background: g.bg, color: g.color, border: `1px solid ${g.border}`, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {g.emoji} {p?.label?.replace('TEMPTECH ', '') || post.category}
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                  <Avatar name={post.profiles?.full_name} size={18} />
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{post.profiles?.full_name}</span>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}><MessageSquare size={12} /> {post.replies?.length || 0}</span>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={12} /> {post.views || 0}</span>
                <span style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: es })}</span>
                {isAdmin && (
                  <button onClick={e => { e.stopPropagation(); deletePost(post.id) }}
                    style={{ marginLeft: 4, background: 'rgba(255,85,119,0.08)', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#ff5577', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>
                    🗑
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* MODAL NUEVA CONSULTA */}
      <Modal open={newPostOpen} onClose={() => setNewPostOpen(false)} title="💬 Nueva Consulta" width={600}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 8 }}>
              Producto / Tema
            </label>
            <ProductSelector value={form.category} onChange={val => setForm(p => ({ ...p, category: val }))} />
          </div>
          <Input label="Título de tu consulta" placeholder="¿Cuál es tu consulta?" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <Textarea label="Descripción" placeholder="Explicá tu consulta en detalle..." value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={4} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setNewPostOpen(false)}>Cancelar</Button>
            <Button onClick={submitPost} loading={submitting}>Publicar Consulta</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
