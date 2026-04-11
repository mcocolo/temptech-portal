import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Modal, Input, Textarea, Spinner, Empty } from '@/components/ui'
import { Plus, X, Pencil, Trash2, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Estructura jerárquica de categorías ──
const CATALOG = [
  {
    value: 'paneles',
    label: 'Paneles Calefactores',
    emoji: '🔆',
    color: '#ffd166',
    bg: 'rgba(255,209,102,0.12)',
    border: 'rgba(255,209,102,0.35)',
    subs: [
      { value: 'paneles_instalacion',   label: 'Instalación' },
      { value: 'paneles_tutorial',      label: 'Tutoriales' },
      { value: 'paneles_mantenimiento', label: 'Mantenimiento' },
    ],
  },
  {
    value: 'calefones',
    label: 'Calefones / Calderas',
    emoji: '🔥',
    color: '#ff6b2b',
    bg: 'rgba(255,107,43,0.12)',
    border: 'rgba(255,107,43,0.35)',
    subs: [
      { value: 'calefones_instalacion',   label: 'Instalación' },
      { value: 'calefones_tutorial',      label: 'Tutoriales' },
      { value: 'calefones_mantenimiento', label: 'Mantenimiento' },
    ],
  },
  {
    value: 'anafes',
    label: 'Anafes Vitro',
    emoji: '🍳',
    color: '#3dd68c',
    bg: 'rgba(61,214,140,0.12)',
    border: 'rgba(61,214,140,0.35)',
    subs: [
      { value: 'anafes_instalacion',   label: 'Instalación' },
      { value: 'anafes_tutorial',      label: 'Tutoriales' },
      { value: 'anafes_mantenimiento', label: 'Mantenimiento' },
    ],
  },
]

// ── Helpers ──
function getParent(catValue) {
  if (!catValue) return null
  return CATALOG.find(c => c.value === catValue || c.subs.some(s => s.value === catValue))
}
function getSub(catValue) {
  for (const c of CATALOG) {
    const sub = c.subs.find(s => s.value === catValue)
    if (sub) return sub
  }
  return null
}

// ── YouTube ──
function getYouTubeId(url) {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\s]+)/,
    /(?:youtube\.com\/shorts\/)([^?\s]+)/,
    /(?:youtu\.be\/)([^?\s]+)/,
    /(?:youtube\.com\/embed\/)([^?\s]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}
const getThumb = (url) => { const id = getYouTubeId(url); return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null }
const getEmbed = (url) => { const id = getYouTubeId(url); return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : url }
const isShort  = (url) => url?.includes('/shorts/')

const EMPTY_FORM = { title: '', description: '', url: '', duration: '', category: 'paneles_tutorial', download_url: '' }

export default function Videos() {
  const { isAdmin } = useAuth()
  const [videos, setVideos]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [activeParent, setActiveParent]   = useState(null)
  const [activeSub, setActiveSub]         = useState(null)
  const [modalOpen, setModalOpen]         = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [playing, setPlaying]             = useState(null)
  const [editing, setEditing]             = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm]                   = useState(EMPTY_FORM)
  const [fParent, setFParent]             = useState('paneles')

  useEffect(() => { load() }, [activeParent, activeSub])

  async function load() {
    setLoading(true)
    let q = supabase.from('videos').select('*').order('created_at', { ascending: false })
    if (activeSub) {
      q = q.eq('category', activeSub)
    } else if (activeParent) {
      const parent = CATALOG.find(c => c.value === activeParent)
      q = q.in('category', parent?.subs.map(s => s.value) || [])
    }
    const { data } = await q
    setVideos(data || [])
    setLoading(false)
  }

  function selectParent(val) {
    if (activeParent === val) { setActiveParent(null); setActiveSub(null) }
    else { setActiveParent(val); setActiveSub(null) }
  }
  function selectSub(parentVal, subVal) {
    setActiveParent(parentVal)
    setActiveSub(activeSub === subVal ? null : subVal)
  }

  function openAdd() {
    setEditing(null)
    setFParent('paneles')
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }
  function openEdit(v, e) {
    e.stopPropagation()
    setEditing(v)
    const parent = getParent(v.category)
    setFParent(parent?.value || 'paneles')
    setForm({ title: v.title, description: v.description || '', url: v.url, duration: v.duration || '', category: v.category, download_url: v.download_url || '' })
    setModalOpen(true)
  }

  async function submit() {
    if (!form.title.trim() || !form.url.trim()) return toast.error('Completá título y URL')
    if (!getYouTubeId(form.url)) return toast.error('URL de YouTube no válida')
    setSubmitting(true)
    if (editing) {
      const { error } = await supabase.from('videos').update({ ...form }).eq('id', editing.id)
      if (error) { toast.error('Error al actualizar'); setSubmitting(false); return }
      toast.success('Video actualizado ✅')
    } else {
      const { error } = await supabase.from('videos').insert({ ...form })
      if (error) { toast.error('Error al guardar'); setSubmitting(false); return }
      toast.success('Video publicado ✅')
    }
    setModalOpen(false); setEditing(null); setForm(EMPTY_FORM); load(); setSubmitting(false)
  }

  async function deleteVideo() {
    const { error } = await supabase.from('videos').delete().eq('id', confirmDelete.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Video eliminado')
    setConfirmDelete(null); load()
  }

  const fParentData = CATALOG.find(c => c.value === fParent)
  const short = playing && isShort(playing.url)

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Centro de Videos</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Tutoriales y contenido del canal oficial TEMPTECH</p>
        </div>
        {isAdmin && <Button onClick={openAdd}><Plus size={14} /> Agregar Video</Button>}
      </div>

      {/* ── FILTROS JERÁRQUICOS ── */}
      <div style={{ marginBottom: 24 }}>
        {/* Fila 1: Todos + categorías principales */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
          <button onClick={() => { setActiveParent(null); setActiveSub(null) }} style={{
            padding: '8px 18px', borderRadius: 20, fontSize: 13, cursor: 'pointer', transition: 'all .15s',
            border: `1px solid ${!activeParent ? 'rgba(255,255,255,0.25)' : 'var(--border)'}`,
            background: !activeParent ? 'rgba(255,255,255,0.07)' : 'transparent',
            color: !activeParent ? 'var(--text)' : 'var(--text3)',
            fontWeight: !activeParent ? 600 : 400,
          }}>▶️ Todos</button>

          {CATALOG.map(c => (
            <button key={c.value} onClick={() => selectParent(c.value)} style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 13, cursor: 'pointer', transition: 'all .15s',
              border: `1px solid ${activeParent === c.value ? c.border : 'var(--border)'}`,
              background: activeParent === c.value ? c.bg : 'transparent',
              color: activeParent === c.value ? c.color : 'var(--text3)',
              fontWeight: activeParent === c.value ? 700 : 400,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <span style={{ fontSize: 16 }}>{c.emoji}</span>
              {c.label}
              <ChevronRight size={13} style={{
                opacity: 0.5,
                transform: activeParent === c.value ? 'rotate(90deg)' : 'none',
                transition: 'transform .2s',
              }} />
            </button>
          ))}
        </div>

        {/* Fila 2: subcategorías del padre activo */}
        {activeParent && (() => {
          const parent = CATALOG.find(c => c.value === activeParent)
          return (
            <div style={{
              display: 'flex', gap: 6, flexWrap: 'wrap',
              paddingLeft: 16,
              borderLeft: `3px solid ${parent.border}`,
            }}>
              {parent.subs.map(s => (
                <button key={s.value} onClick={() => selectSub(parent.value, s.value)} style={{
                  padding: '5px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', transition: 'all .15s',
                  border: `1px solid ${activeSub === s.value ? parent.border : 'var(--border)'}`,
                  background: activeSub === s.value ? parent.bg : 'var(--surface2)',
                  color: activeSub === s.value ? parent.color : 'var(--text3)',
                  fontWeight: activeSub === s.value ? 600 : 400,
                }}>
                  {s.label}
                </button>
              ))}
            </div>
          )
        })()}
      </div>

      {/* ── GRID ── */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={28} /></div>
      ) : videos.length === 0 ? (
        <Empty icon="▶️" title="No hay videos en esta categoría" description="Agregá el primer video desde el botón de arriba" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {videos.map((v) => {
            const thumb  = getThumb(v.url)
            const s      = isShort(v.url)
            const parent = getParent(v.category)
            const sub    = getSub(v.category)
            return (
              <div key={v.id} onClick={() => setPlaying(v)} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                cursor: 'pointer', transition: 'all .25s', position: 'relative',
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.borderColor = parent?.border || 'var(--border2)'
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'
                  const btns = e.currentTarget.querySelector('.admin-btns')
                  if (btns) btns.style.opacity = '1'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.boxShadow = 'none'
                  const btns = e.currentTarget.querySelector('.admin-btns')
                  if (btns) btns.style.opacity = '0'
                }}
              >
                {/* Admin buttons */}
                {isAdmin && (
                  <div className="admin-btns" style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6, zIndex: 10, opacity: 0, transition: 'opacity .2s' }}>
                    <button onClick={e => openEdit(v, e)} style={{ background: 'rgba(8,10,15,0.92)', border: '1px solid var(--border2)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', cursor: 'pointer' }}>
                      <Pencil size={13} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setConfirmDelete(v) }} style={{ background: 'rgba(8,10,15,0.92)', border: '1px solid var(--border2)', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}

                {/* Thumbnail */}
                <div style={{ aspectRatio: s ? '9/16' : '16/9', maxHeight: s ? 280 : undefined, position: 'relative', overflow: 'hidden', background: '#000' }}>
                  {thumb
                    ? <img src={thumb} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#1a2a4a,#0d1835)' }} />
                  }
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,107,43,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                  </div>
                  {/* Badges */}
                  <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                    {s && <span style={{ background: 'rgba(255,0,0,0.85)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>SHORT</span>}
                    {parent && (
                      <span style={{ background: parent.bg, color: parent.color, border: `1px solid ${parent.border}`, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {parent.emoji} {parent.label}
                      </span>
                    )}
                    {sub && (
                      <span style={{ background: 'rgba(0,0,0,0.65)', color: '#ccc', fontSize: 10, padding: '2px 7px', borderRadius: 4, backdropFilter: 'blur(4px)' }}>
                        {sub.label}
                      </span>
                    )}
                  </div>
                  {v.duration && <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: 11, padding: '3px 8px', borderRadius: 4 }}>{v.duration}</div>}
                </div>

                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6, lineHeight: 1.4 }}>{v.title}</div>
                  {v.description && <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{v.description}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {new Date(v.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    {v.download_url && (
                      <a href={v.download_url} download onClick={e => e.stopPropagation()} target="_blank" rel="noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: '#3dd68c', textDecoration: 'none' }}>
                        ⬇ Descargar
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── PLAYER ── */}
      {playing && (
        <div onClick={() => setPlaying(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: short ? 400 : 860, animation: 'fadeUp 0.25s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', flex: 1, marginRight: 16 }}>{playing.title}</div>
              <button onClick={() => setPlaying(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ position: 'relative', paddingBottom: short ? '177.7%' : '56.25%', height: 0, overflow: 'hidden', borderRadius: 'var(--radius-lg)', background: '#000' }}>
              <iframe src={getEmbed(playing.url)} title={playing.title} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: 'var(--radius-lg)' }} />
            </div>
            {playing.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 12, lineHeight: 1.6 }}>{playing.description}</p>}
            {playing.download_url && (
              <a href={playing.download_url} download target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(61,214,140,0.12)', border: '1px solid rgba(61,214,140,0.4)', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#3dd68c', textDecoration: 'none', marginTop: 10 }}>
                ⬇ Descargar video
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── ADD / EDIT MODAL ── */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={editing ? '✏️ Editar Video' : '▶️ Agregar Video de YouTube'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="URL de YouTube" placeholder="https://www.youtube.com/watch?v=... o /shorts/..." value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} />
          {getYouTubeId(form.url) && (
            <div style={{ borderRadius: 8, overflow: 'hidden' }}>
              <img src={getThumb(form.url)} alt="preview" style={{ width: '100%', display: 'block', maxHeight: 180, objectFit: 'cover' }} />
              <div style={{ fontSize: 11, color: 'var(--green)', padding: '6px 10px', background: 'var(--green-dim)' }}>✓ Video detectado correctamente</div>
            </div>
          )}
          <Input label="Título" placeholder="Nombre del video" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <Input label="Duración (opcional)" placeholder="Ej: 05:30" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} />

          {/* Selector en 2 niveles */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>Producto</label>
              <select value={fParent} onChange={e => {
                const p = e.target.value
                setFParent(p)
                const firstSub = CATALOG.find(c => c.value === p)?.subs[0]?.value || ''
                setForm(prev => ({ ...prev, category: firstSub }))
              }} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text)', fontSize: 14 }}>
                {CATALOG.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>Tipo</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text)', fontSize: 14 }}>
                {fParentData?.subs.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <Textarea label="Descripción (opcional)" placeholder="Breve descripción del video..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />
          <Input label="Link de descarga (opcional)" placeholder="https://... (Google Drive, Dropbox, Supabase Storage, etc.)" value={form.download_url} onChange={e => setForm(p => ({ ...p, download_url: e.target.value }))} />
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={() => { setModalOpen(false); setEditing(null) }}>Cancelar</Button>
            <Button onClick={submit} loading={submitting}>{editing ? 'Guardar cambios' : 'Publicar'}</Button>
          </div>
        </div>
      </Modal>

      {/* ── CONFIRM DELETE ── */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="¿Eliminar video?" width={420}>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24 }}>
          Vas a eliminar <strong>"{confirmDelete?.title}"</strong>. Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button variant="danger" onClick={deleteVideo}>Sí, eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
