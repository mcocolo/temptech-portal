import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Modal, Input, Textarea, Spinner, Empty } from '@/components/ui'
import { Plus, Download, Pencil, Trash2, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'

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
    emoji: '🚿',
    color: '#ff6b2b',
    bg: 'rgba(255,107,43,0.12)',
    border: 'rgba(255,107,43,0.35)',
    subs: [
      { value: 'calefones_calefon',  label: 'Calefones',       emoji: '▪' },
      { value: 'calefones_caldera',  label: 'Calderas Duales', emoji: '▪' },
    ],
  },
  {
    value: 'anafes',
    label: 'Anafes',
    emoji: '🔥',
    color: '#3dd68c',
    bg: 'rgba(61,214,140,0.12)',
    border: 'rgba(61,214,140,0.35)',
    subs: [
      {
        value: 'anafes_induccion',
        label: 'Anafe por Inducción',
        emoji: '⚡',
        subs: [
          { value: 'anafes_induccion_2h',           label: '2 Hornallas' },
          { value: 'anafes_induccion_4h',           label: '4 Hornallas' },
          { value: 'anafes_induccion_4h_extractor', label: '4 Hornallas con Extractor' },
        ],
      },
      {
        value: 'anafes_infrarrojo',
        label: 'Anafe por Infrarrojo',
        emoji: '🌡',
        subs: [
          { value: 'anafes_infrarrojo_2h',           label: '2 Hornallas' },
          { value: 'anafes_infrarrojo_4h_extractor', label: '4 Hornallas con Extractor' },
        ],
      },
    ],
  },
]

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
function getAllLeaves(node) {
  if (!node) return []
  if (!node.subs) return [node.value]
  return node.subs.flatMap(s => getAllLeaves(s))
}

const EMPTY_FORM = { title: '', description: '', url: '', pages: '', version: '', category: 'paneles_slim' }

export default function Documentacion() {
  const { isAdmin } = useAuth()
  const [docs, setDocs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [modalOpen, setModalOpen]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing]       = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm]             = useState(EMPTY_FORM)

  const [selParent, setSelParent] = useState(null)
  const [selMid, setSelMid]       = useState(null)
  const [selLeaf, setSelLeaf]     = useState(null)

  const [fParent, setFParent] = useState('paneles')
  const [fMid, setFMid]       = useState('paneles_slim')
  const [fLeaf, setFLeaf]     = useState(null)

  useEffect(() => { load() }, [selParent, selMid, selLeaf])

  async function load() {
    setLoading(true)
    let q = supabase.from('documentacion').select('*').order('created_at', { ascending: false })
    if (selLeaf) {
      q = q.eq('category', selLeaf)
    } else if (selMid) {
      const mid = findMid(selMid)
      q = q.in('category', getAllLeaves(mid))
    } else if (selParent) {
      const parent = CATALOG.find(c => c.value === selParent)
      q = q.in('category', getAllLeaves(parent))
    }
    const { data } = await q
    setDocs(data || [])
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
  function pickLeaf(val) { setSelLeaf(selLeaf === val ? null : val) }

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
  function openEdit(doc, e) {
    e.stopPropagation()
    setEditing(doc)
    const parent = findParent(doc.category)
    const mid    = findMid(doc.category)
    const leaf   = findLeaf(doc.category)
    setFParent(parent?.value || 'paneles')
    setFMid(mid?.value || parent?.subs?.[0]?.value || '')
    setFLeaf(leaf?.value || null)
    setForm({ title: doc.title, description: doc.description || '', url: doc.url, pages: doc.pages || '', version: doc.version || '', category: doc.category })
    setModalOpen(true)
  }

  async function submit() {
    if (!form.title.trim() || !form.url.trim()) return toast.error('Completá título y URL')
    setSubmitting(true)
    if (editing) {
      const { error } = await supabase.from('documentacion').update({ ...form }).eq('id', editing.id)
      if (error) { toast.error('Error al actualizar'); setSubmitting(false); return }
      toast.success('Documento actualizado ✅')
    } else {
      const { error } = await supabase.from('documentacion').insert({ ...form })
      if (error) { toast.error('Error al guardar'); setSubmitting(false); return }
      toast.success('Documento publicado ✅')
    }
    setModalOpen(false); setEditing(null); setForm(EMPTY_FORM); load(); setSubmitting(false)
  }

  async function deleteDoc() {
    const { error } = await supabase.from('documentacion').delete().eq('id', confirmDelete.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Documento eliminado')
    setConfirmDelete(null); load()
  }

  const parentActive = (val) => selParent === val
  const midActive    = (val) => selMid === val
  const leafActive   = (val) => selLeaf === val

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Documentación</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Fichas técnicas, especificaciones y documentación comercial por producto</p>
        </div>
        {isAdmin && <Button onClick={openAdd}><Plus size={14} /> Agregar documento</Button>}
      </div>

      <div className="sidebar-layout" style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 24, alignItems: 'start' }}>

        {/* SIDEBAR */}
        <div className="sidebar-sticky" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 12px', position: 'sticky', top: 88 }}>
          <div onClick={() => { setSelParent(null); setSelMid(null); setSelLeaf(null) }} style={{
            padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, marginBottom: 4,
            background: !selParent ? 'rgba(255,255,255,0.07)' : 'transparent',
            color: !selParent ? 'var(--text)' : 'var(--text3)', fontWeight: !selParent ? 600 : 400,
            transition: 'all .15s',
          }}>📄 Toda la documentación</div>

          {CATALOG.map(cat => (
            <div key={cat.value} style={{ marginBottom: 4 }}>
              <div onClick={() => pickParent(cat.value)} style={{
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                background: parentActive(cat.value) ? cat.bg : 'transparent',
                color: parentActive(cat.value) ? cat.color : 'var(--text2)',
                fontWeight: parentActive(cat.value) ? 700 : 400,
                borderLeft: `3px solid ${parentActive(cat.value) ? cat.color : 'transparent'}`,
                transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 8,
              }}
                onMouseEnter={e => { if (!parentActive(cat.value)) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' } }}
                onMouseLeave={e => { if (!parentActive(cat.value)) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' } }}
              >
                <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                <span style={{ flex: 1 }}>{cat.label}</span>
                <ChevronRight size={13} style={{ opacity: 0.5, transform: parentActive(cat.value) || (selMid && findParent(selMid)?.value === cat.value) ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
              </div>

              {(selParent === cat.value || (selMid && findParent(selMid)?.value === cat.value) || (selLeaf && findParent(selLeaf)?.value === cat.value)) && (
                <div style={{ paddingLeft: 14, marginTop: 2 }}>
                  {cat.subs.map(mid => (
                    <div key={mid.value} style={{ marginBottom: 2 }}>
                      <div onClick={() => pickMid(mid.value)} style={{
                        padding: '6px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                        background: midActive(mid.value) ? cat.bg : 'transparent',
                        color: midActive(mid.value) ? cat.color : 'var(--text3)',
                        fontWeight: midActive(mid.value) ? 600 : 400,
                        transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 7,
                        borderLeft: `2px solid ${midActive(mid.value) ? cat.color : 'var(--border)'}`,
                      }}
                        onMouseEnter={e => { if (!midActive(mid.value)) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' } }}
                        onMouseLeave={e => { if (!midActive(mid.value)) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' } }}
                      >
                        <span style={{ fontSize: 13 }}>{mid.emoji || '▸'}</span>
                        <span style={{ flex: 1 }}>{mid.label}</span>
                        {mid.subs && <ChevronRight size={12} style={{ opacity: 0.4, transform: (midActive(mid.value) || (selLeaf && findMid(selLeaf)?.value === mid.value)) ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />}
                      </div>

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

        {/* GRID */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={28} /></div>
        ) : docs.length === 0 ? (
          <Empty icon="📄" title="No hay documentos en esta categoría" description={isAdmin ? 'Agregá el primer documento desde el botón de arriba' : 'Todavía no hay documentos en esta categoría'} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {docs.map(doc => {
              const parent = findParent(doc.category)
              const mid    = findMid(doc.category)
              const leaf   = findLeaf(doc.category)
              return (
                <div key={doc.id} style={{
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
                  {isAdmin && (
                    <div className="admin-btns" style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 6, opacity: 0, transition: 'opacity .2s' }}>
                      <button onClick={e => openEdit(doc, e)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', cursor: 'pointer' }}>
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => setConfirmDelete(doc)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 7, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)', cursor: 'pointer' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}

                  <div style={{ width: 44, height: 44, borderRadius: 10, background: parent?.bg || 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {parent?.emoji || '📄'}
                  </div>

                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, marginBottom: 6, paddingRight: isAdmin ? 60 : 0 }}>{doc.title}</div>
                    {doc.description && <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.5 }}>{doc.description}</div>}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    {parent && (
                      <span style={{ background: parent.bg, color: parent.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>
                        {parent.emoji} {parent.label}
                      </span>
                    )}
                    {mid && mid.value !== doc.category && (
                      <>
                        <ChevronRight size={10} color="var(--text3)" />
                        <span style={{ background: 'var(--surface3)', color: 'var(--text2)', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                          {mid.emoji !== '▪' ? mid.emoji + ' ' : ''}{mid.label}
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
                    {doc.version && <span style={{ fontSize: 11, color: 'var(--text3)' }}>v{doc.version}</span>}
                    {doc.pages && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{doc.pages} págs</span>}
                    <button onClick={() => window.open(doc.url, '_blank')} style={{
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

      {/* MODAL AGREGAR/EDITAR */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={editing ? '✏️ Editar documento' : '📄 Agregar documento'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Categoría del producto</div>

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

            <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ color: fParentData?.color }}>{fParentData?.emoji} {fParentData?.label}</span>
              {fMidData && <><ChevronRight size={10} /> <span>{fMidData.emoji !== '▪' ? fMidData.emoji + ' ' : ''}{fMidData.label}</span></>}
              {fLeaf && (() => { const leaf = fMidData?.subs?.find(s => s.value === fLeaf); return leaf ? <><ChevronRight size={10} /><span>{leaf.label}</span></> : null })()}
            </div>
          </div>

          <Input label="Título del documento" placeholder="Ej: Ficha técnica Panel Slim 500w" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <Input label="URL del archivo (PDF)" placeholder="https://..." value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Versión (opcional)" placeholder="Ej: 2.1" value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))} />
            <Input label="Páginas (opcional)" placeholder="Ej: 4" value={form.pages} onChange={e => setForm(p => ({ ...p, pages: e.target.value }))} />
          </div>
          <Textarea label="Descripción (opcional)" placeholder="Breve descripción del documento..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={() => { setModalOpen(false); setEditing(null) }}>Cancelar</Button>
            <Button onClick={submit} loading={submitting}>{editing ? 'Guardar cambios' : 'Publicar'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="¿Eliminar documento?" width={420}>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24 }}>
          Vas a eliminar <strong>"{confirmDelete?.title}"</strong>. Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button variant="danger" onClick={deleteDoc}>Sí, eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
