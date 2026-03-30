import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Modal, Input, Textarea, Spinner, Empty } from '@/components/ui'
import { Plus, Download, Pencil, Trash2, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

// ── Catálogo de 3 niveles ──
const CATALOG = [
  {
    value: 'paneles',
    label: 'Paneles Calefactores',
    emoji: '🔆',
    color: '#ffd166',
    bg: 'rgba(255,209,102,0.12)',
    border: 'rgba(255,209,102,0.35)',
    subs: [
      { value: 'paneles_slim',    label: 'Panel Calefactor Slim',    emoji: '▪' },
      { value: 'paneles_firenze', label: 'Panel Calefactor Firenze', emoji: '▪' },
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
      { value: 'calefones_calefon',  label: 'Calefones',      emoji: '▪' },
      { value: 'calefones_caldera',  label: 'Calderas Duales', emoji: '▪' },
    ],
  },
  {
    value: 'cocinas',
    label: 'Cocinas',
    emoji: '🍳',
    color: '#3dd68c',
    bg: 'rgba(61,214,140,0.12)',
    border: 'rgba(61,214,140,0.35)',
    subs: [
      {
        value: 'cocinas_induccion',
        label: 'Anafe por Inducción',
        emoji: '⚡',
        subs: [
          { value: 'cocinas_induccion_2h', label: '2 Hornallas' },
          { value: 'cocinas_induccion_4h', label: '4 Hornallas' },
        ],
      },
      {
        value: 'cocinas_infrarrojo',
        label: 'Anafe por Infrarrojo',
        emoji: '🌡',
        subs: [
          { value: 'cocinas_infrarrojo_2h', label: '2 Hornallas' },
          { value: 'cocinas_infrarrojo_4h', label: '4 Hornallas' },
        ],
      },
    ],
  },
]

// ── Helpers de búsqueda ──
function findParent(catValue) {
  return CATALOG.find(c =>
    c.value === catValue ||
    c.subs?.some(s => s.value === catValue || s.subs?.some(ss => ss.value === catValue))
  )
}
function findMid(catValue) {
  for (const c of CATALOG) {
    for (const s of c.subs || []) {
      if (s.value === catValue || s.subs?.some(ss => ss.value === catValue)) return s
    }
  }
  return null
}
function findLeaf(catValue) {
  for (const c of CATALOG) {
    for (const s of c.subs || []) {
      const ss = s.subs?.find(ss => ss.value === catValue)
      if (ss) return ss
    }
  }
  return null
}

// Todos los values hoja o directos de un nodo
function getAllLeaves(node) {
  if (!node) return []
  if (!node.subs) return [node.value]
  return node.subs.flatMap(s => getAllLeaves(s))
}

const EMPTY_FORM = { title: '', description: '', url: '', pages: '', version: '', category: 'paneles_slim' }

export default function Manuales() {
  const { isAdmin } = useAuth()
  const [manuales, setManuales]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing]     = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm]           = useState(EMPTY_FORM)

  // Filtros jerárquicos
  const [selParent, setSelParent] = useState(null)  // 'paneles' | 'calefones' | 'cocinas'
  const [selMid, setSelMid]       = useState(null)  // sub de nivel 2
  const [selLeaf, setSelLeaf]     = useState(null)  // sub de nivel 3 (solo cocinas)

  // Form: selección jerárquica
  const [fParent, setFParent]     = useState('paneles')
  const [fMid, setFMid]           = useState('paneles_slim')
  const [fLeaf, setFLeaf]         = useState(null)

  useEffect(() => { load() }, [selParent, selMid, selLeaf])

  async function load() {
    setLoading(true)
    let q = supabase.from('manuales').select('*').order('created_at', { ascending: false })

    if (selLeaf) {
      q = q.eq('category', selLeaf)
    } else if (selMid) {
      const mid = findMid(selMid)
      const leaves = getAllLeaves(mid)
      q = q.in('category', leaves)
    } else if (selParent) {
      const parent = CATALOG.find(c => c.value === selParent)
      const leaves = getAllLeaves(parent)
      q = q.in('category', leaves)
    }

    const { data } = await q
    setManuales(data || [])
    setLoading(false)
  }

  function pickParent(val) {
    if (selParent === val) { setSelParent(null); setSelMid(null); setSelLeaf(null) }
    else { setSelParent(val); setSelMid(null); setSelLeaf(null) }
  }
  function pickMid(val) {
    if (selMid === val) { setSelMid(null); setSelLeaf(null) }
    else { setSelMid(val); setSelLeaf(null) }
  }
  function pickLeaf(val) {
    setSelLeaf(selLeaf === val ? null : val)
  }

  // Form helpers
  const fParentData = CATALOG.find(c => c.value === fParent)
  const fMidData    = fParentData?.subs?.find(s => s.value === fMid)
  const midHasSubs  = fMidData?.subs?.length > 0

  function handleFParent(val) {
    setFParent(val)
    const parent = CATALOG.find(c => c.value === val)
    const firstMid = parent?.subs?.[0]
    setFMid(firstMid?.value || '')
    setFLeaf(null)
    const firstLeaf = firstMid?.subs?.[0]?.value
    setForm(p => ({ ...p, category: firstLeaf || firstMid?.value || '' }))
  }
  function handleFMid(val) {
    setFMid(val)
    setFLeaf(null)
    const mid = fParentData?.subs?.find(s => s.value === val)
    const firstLeaf = mid?.subs?.[0]?.value
    setForm(p => ({ ...p, category: firstLeaf || val }))
  }
  function handleFLeaf(val) {
    setFLeaf(val)
    setForm(p => ({ ...p, category: val }))
  }

  function openAdd() {
    setEditing(null); setForm(EMPTY_FORM)
    setFParent('paneles'); setFMid('paneles_slim'); setFLeaf(null)
    setModalOpen(true)
  }
  function openEdit(m, e) {
    e.stopPropagation()
    setEditing(m)
    // Reconstruir selección jerárquica desde el category guardado
    const parent = findParent(m.category)
    const mid    = findMid(m.category)
    const leaf   = findLeaf(m.category)
    setFParent(parent?.value || 'paneles')
    setFMid(mid?.value || parent?.subs?.[0]?.value || '')
    setFLeaf(leaf?.value || null)
    setForm({ title: m.title, description: m.description || '', url: m.url, pages: m.pages || '', version: m.version || '', category: m.category })
    setModalOpen(true)
  }

  async function submit() {
    if (!form.title.trim() || !form.url.trim()) return toast.error('Completá título y URL')
    setSubmitting(true)
    if (editing) {
      const { error } = await supabase.from('manuales').update({ ...form }).eq('id', editing.id)
      if (error) { toast.error('Error al actualizar'); setSubmitting(false); return }
      toast.success('Manual actualizado ✅')
    } else {
      const { error } = await supabase.from('manuales').insert({ ...form })
      if (error) { toast.error('Error al guardar'); setSubmitting(false); return }
      toast.success('Manual publicado ✅')
    }
    setModalOpen(false); setEditing(null); setForm(EMPTY_FORM); load(); setSubmitting(false)
  }

  async function deleteManual() {
    const { error } = await supabase.from('manuales').delete().eq('id', confirmDelete.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Manual eliminado')
    setConfirmDelete(null); load()
  }

  // Sidebar tree node activo
  const parentActive = (val) => selParent === val
  const midActive    = (val) => selMid === val
  const leafActive   = (val) => selLeaf === val

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Biblioteca de Manuales</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Documentación técnica, guías de instalación y uso por producto</p>
        </div>
        {isAdmin && <Button onClick={openAdd}><Plus size={14} /> Agregar Manual</Button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 24, alignItems: 'start' }}>

        {/* ── SIDEBAR ÁRBOL ── */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 12px', position: 'sticky', top: 88 }}>
          {/* Todos */}
          <div onClick={() => { setSelParent(null); setSelMid(null); setSelLeaf(null) }} style={{
            padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, marginBottom: 4,
            background: !selParent ? 'rgba(255,255,255,0.07)' : 'transparent',
            color: !selParent ? 'var(--text)' : 'var(--text3)', fontWeight: !selParent ? 600 : 400,
            transition: 'all .15s',
          }}>📦 Todos los manuales</div>

          {CATALOG.map(cat => (
            <div key={cat.value} style={{ marginBottom: 4 }}>
              {/* Nivel 1 */}
              <div onClick={() => pickParent(cat.value)} style={{
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                background: parentActive(cat.value) ? cat.bg : 'transparent',
                color: parentActive(cat.value) ? cat.color : 'var(--text2)',
                fontWeight: parentActive(cat.value) ? 700 : 400,
                borderLeft: `3px solid ${parentActive(cat.value) ? cat.color : 'transparent'}`,
                transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 8,
              }}
                onMouseEnter={e => { if (!parentActive(cat.value)) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' } }}
                onMouseLeave={e => { if (!parentActive(cat.value)) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' } }}
              >
                <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                <span style={{ flex: 1 }}>{cat.label}</span>
                <ChevronRight size={13} style={{ opacity: 0.5, transform: parentActive(cat.value) || (selMid && findParent(selMid)?.value === cat.value) ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
              </div>

              {/* Nivel 2 — visible si el padre está activo o tiene un hijo activo */}
              {(selParent === cat.value || (selMid && findParent(selMid)?.value === cat.value) || (selLeaf && findParent(selLeaf)?.value === cat.value)) && (
                <div style={{ paddingLeft: 14, marginTop: 2 }}>
                  {cat.subs.map(mid => (
                    <div key={mid.value} style={{ marginBottom: 2 }}>
                      {/* Nivel 2 item */}
                      <div onClick={() => pickMid(mid.value)} style={{
                        padding: '6px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                        background: midActive(mid.value) ? cat.bg : 'transparent',
                        color: midActive(mid.value) ? cat.color : 'var(--text3)',
                        fontWeight: midActive(mid.value) ? 600 : 400,
                        transition: 'all .15s',
                        display: 'flex', alignItems: 'center', gap: 7,
                        borderLeft: `2px solid ${midActive(mid.value) ? cat.color : 'var(--border)'}`,
                      }}
                        onMouseEnter={e => { if (!midActive(mid.value)) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' } }}
                        onMouseLeave={e => { if (!midActive(mid.value)) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' } }}
                      >
                        <span style={{ fontSize: 13 }}>{mid.emoji || '▸'}</span>
                        <span style={{ flex: 1 }}>{mid.label}</span>
                        {mid.subs && <ChevronRight size={12} style={{ opacity: 0.4, transform: (midActive(mid.value) || (selLeaf && findMid(selLeaf)?.value === mid.value)) ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />}
                      </div>

                      {/* Nivel 3 — solo para cocinas */}
                      {mid.subs && (midActive(mid.value) || (selLeaf && findMid(selLeaf)?.value === mid.value)) && (
                        <div style={{ paddingLeft: 14, marginTop: 2 }}>
                          {mid.subs.map(leaf => (
                            <div key={leaf.value} onClick={() => pickLeaf(leaf.value)} style={{
                              padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                              background: leafActive(leaf.value) ? cat.bg : 'transparent',
                              color: leafActive(leaf.value) ? cat.color : 'var(--text3)',
                              fontWeight: leafActive(leaf.value) ? 600 : 400,
                              transition: 'all .15s',
                              borderLeft: `2px solid ${leafActive(leaf.value) ? cat.color : 'transparent'}`,
                            }}
                              onMouseEnter={e => { if (!leafActive(leaf.value)) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' } }}
                              onMouseLeave={e => { if (!leafActive(leaf.value)) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' } }}
                            >
                              {leaf.label}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── GRID DE MANUALES ── */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={28} /></div>
        ) : manuales.length === 0 ? (
          <Empty icon="📚" title="No hay manuales en esta categoría" description="Agregá el primer manual desde el botón de arriba" />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {manuales.map(m => {
              const parent = findParent(m.category)
              const mid    = findMid(m.category)
              const leaf   = findLeaf(m.category)
              return (
                <div key={m.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', padding: 22,
                  display: 'flex', flexDirection: 'column', gap: 12,
                  transition: 'all .2s', position: 'relative',
                }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = parent?.color || 'var(--border2)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    const btns = e.currentTarget.querySelector('.admin-btns')
                    if (btns) btns.style.opacity = '1'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    const btns = e.currentTarget.querySelector('.admin-btns')
                    if (btns) btns.style.opacity = '0'
                  }}
                >
                  {/* Admin buttons */}
                  {isAdmin && (
                    <div className="admin-btns" style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6, opacity: 0, transition: 'opacity .2s' }}>
                      <button onClick={e => openEdit(m, e)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', cursor: 'pointer' }}>
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => setConfirmDelete(m)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', cursor: 'pointer' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}

                  {/* Icono */}
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: parent?.bg || 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {parent?.emoji || '📄'}
                  </div>

                  {/* Título */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginBottom: 6, paddingRight: isAdmin ? 60 : 0 }}>{m.title}</div>
                    {m.description && <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>{m.description}</div>}
                  </div>

                  {/* Breadcrumb de categoría */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {parent && (
                      <span style={{ background: parent.bg, color: parent.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                        {parent.emoji} {parent.label}
                      </span>
                    )}
                    {mid && mid.value !== m.category && (
                      <>
                        <ChevronRight size={10} color="var(--text3)" />
                        <span style={{ background: 'var(--surface3)', color: 'var(--text2)', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                          {mid.emoji} {mid.label}
                        </span>
                      </>
                    )}
                    {leaf && (
                      <>
                        <ChevronRight size={10} color="var(--text3)" />
                        <span style={{ background: 'var(--surface3)', color: 'var(--text2)', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                          {leaf.label}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Footer */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                    {m.version && <span style={{ fontSize: 11, color: 'var(--text3)' }}>v{m.version}</span>}
                    {m.pages && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{m.pages} págs</span>}
                    <button onClick={() => window.open(m.url, '_blank')} style={{
                      marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                      background: 'transparent', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '5px 12px', fontSize: 12,
                      color: 'var(--text3)', cursor: 'pointer', transition: 'all .15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background = parent?.bg; e.currentTarget.style.color = parent?.color; e.currentTarget.style.borderColor = parent?.color }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      <Download size={12} /> Descargar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={editing ? '✏️ Editar Manual' : '📚 Agregar Manual'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Selector jerárquico */}
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Categoría del producto</div>

            {/* Nivel 1 */}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Línea de producto</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATALOG.map(c => (
                  <button key={c.value} onClick={() => handleFParent(c.value)} style={{
                    padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', transition: 'all .15s',
                    border: `1px solid ${fParent === c.value ? c.border : 'var(--border)'}`,
                    background: fParent === c.value ? c.bg : 'transparent',
                    color: fParent === c.value ? c.color : 'var(--text3)',
                    fontWeight: fParent === c.value ? 700 : 400,
                  }}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nivel 2 */}
            {fParentData && (
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Modelo / Tipo</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {fParentData.subs.map(s => (
                    <button key={s.value} onClick={() => handleFMid(s.value)} style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', transition: 'all .15s',
                      border: `1px solid ${fMid === s.value ? fParentData.border : 'var(--border)'}`,
                      background: fMid === s.value ? fParentData.bg : 'transparent',
                      color: fMid === s.value ? fParentData.color : 'var(--text3)',
                      fontWeight: fMid === s.value ? 600 : 400,
                    }}>
                      {s.emoji && s.emoji !== '▪' ? s.emoji + ' ' : ''}{s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Nivel 3 — solo si el mid tiene subs (cocinas) */}
            {midHasSubs && fMidData?.subs && (
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Variante</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {fMidData.subs.map(ss => (
                    <button key={ss.value} onClick={() => handleFLeaf(ss.value)} style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', transition: 'all .15s',
                      border: `1px solid ${fLeaf === ss.value ? fParentData.border : 'var(--border)'}`,
                      background: fLeaf === ss.value ? fParentData.bg : 'transparent',
                      color: fLeaf === ss.value ? fParentData.color : 'var(--text3)',
                      fontWeight: fLeaf === ss.value ? 600 : 400,
                    }}>
                      {ss.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Preview del path seleccionado */}
            <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: fParentData?.color }}>{fParentData?.emoji} {fParentData?.label}</span>
              {fMidData && <><ChevronRight size={10} /> <span>{fMidData.emoji !== '▪' ? fMidData.emoji + ' ' : ''}{fMidData.label}</span></>}
              {fLeaf && (() => { const leaf = fMidData?.subs?.find(s => s.value === fLeaf); return leaf ? <><ChevronRight size={10} /><span>{leaf.label}</span></> : null })()}
            </div>
          </div>

          <Input label="Título del manual" placeholder="Ej: Manual de instalación Panel Slim" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <Input label="URL del archivo (PDF)" placeholder="https://..." value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Versión (opcional)" placeholder="Ej: 2.1" value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} />
            <Input label="Páginas (opcional)" placeholder="Ej: 32" value={form.pages} onChange={e => setForm(p => ({ ...p, pages: e.target.value }))} />
          </div>
          <Textarea label="Descripción (opcional)" placeholder="Breve descripción del manual..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={() => { setModalOpen(false); setEditing(null) }}>Cancelar</Button>
            <Button onClick={submit} loading={submitting}>{editing ? 'Guardar cambios' : 'Publicar'}</Button>
          </div>
        </div>
      </Modal>

      {/* ── CONFIRM DELETE ── */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="¿Eliminar manual?" width={420}>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24 }}>
          Vas a eliminar <strong>"{confirmDelete?.title}"</strong>. Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button variant="danger" onClick={deleteManual}>Sí, eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
