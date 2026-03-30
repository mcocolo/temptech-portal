import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Modal, Input, Textarea, Badge, Spinner, Empty } from '@/components/ui'
import { Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const TYPES = [
  { value: 'launch', label: '🚀 Lanzamiento', color: 'blue' },
  { value: 'maintenance', label: '⚙️ Mantenimiento', color: 'yellow' },
  { value: 'update', label: '📋 Actualización', color: 'green' },
  { value: 'news', label: '📰 Noticia', color: 'orange' },
]

const BG_GRADIENTS = [
  'linear-gradient(135deg,#1a2a4a,#0d1835)',
  'linear-gradient(135deg,#2a1a0a,#1a0d00)',
  'linear-gradient(135deg,#0a2a1a,#001a0d)',
  'linear-gradient(135deg,#2a1a2a,#1a0d24)',
]

export default function Novedades() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ title: '', body: '', type: 'news', emoji: '📢' })

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('novedades').select('*').order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function submit() {
    if (!form.title.trim() || !form.body.trim()) return toast.error('Completá todos los campos')
    setSubmitting(true)
    const { error } = await supabase.from('novedades').insert({ ...form })
    if (error) { toast.error('Error al publicar'); setSubmitting(false); return }
    toast.success('Novedad publicada')
    setModalOpen(false)
    setForm({ title: '', body: '', type: 'news', emoji: '📢' })
    load()
    setSubmitting(false)
  }

  if (selected) return (
    <div style={{ animation: 'fadeUp 0.3s ease', maxWidth: 720 }}>
      <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 24, cursor: 'pointer' }}>
        ← Volver a novedades
      </button>
      <div style={{ background: BG_GRADIENTS[0], borderRadius: 'var(--radius-lg)', padding: 40, textAlign: 'center', marginBottom: 24, fontSize: 64 }}>
        {selected.emoji}
      </div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 32 }}>
        <div style={{ marginBottom: 16 }}>
          <Badge color={TYPES.find(t => t.value === selected.type)?.color || 'blue'}>
            {TYPES.find(t => t.value === selected.type)?.label}
          </Badge>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, lineHeight: 1.3, marginBottom: 16 }}>{selected.title}</h1>
        <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 24 }}>
          {formatDistanceToNow(new Date(selected.created_at), { addSuffix: true, locale: es })}
        </p>
        <div style={{ fontSize: 15, lineHeight: 1.9, color: '#c8cad4', whiteSpace: 'pre-wrap' }}>{selected.body}</div>
      </div>
    </div>
  )

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Novedades</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Actualizaciones, lanzamientos y comunicados de TEMPTECH</p>
        </div>
        {isAdmin && <Button onClick={() => setModalOpen(true)}><Plus size={14} /> Publicar novedad</Button>}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={28} /></div>
      ) : items.length === 0 ? (
        <Empty icon="📰" title="Sin novedades" description="Próximamente se publicarán novedades" />
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {items.map((item, i) => (
            <div
              key={item.id}
              onClick={() => setSelected(item)}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                display: 'flex', cursor: 'pointer', transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateX(4px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateX(0)' }}
            >
              <div style={{
                width: 100, flexShrink: 0,
                background: BG_GRADIENTS[i % BG_GRADIENTS.length],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36,
              }}>{item.emoji}</div>
              <div style={{ padding: '20px 24px', flex: 1, minWidth: 0 }}>
                <div style={{ marginBottom: 8 }}>
                  <Badge color={TYPES.find(t => t.value === item.type)?.color || 'blue'}>
                    {TYPES.find(t => t.value === item.type)?.label}
                  </Badge>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.body}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 10 }}>
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: es })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="📰 Publicar Novedad">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 12 }}>
            <Input label="Título" placeholder="Título de la novedad" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
            <Input label="Emoji" placeholder="🚀" value={form.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))} />
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>Tipo</label>
            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text)', fontSize: 14 }}>
              {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <Textarea label="Contenido" placeholder="Escribí el cuerpo de la novedad..." value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} rows={6} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={submit} loading={submitting}>Publicar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
