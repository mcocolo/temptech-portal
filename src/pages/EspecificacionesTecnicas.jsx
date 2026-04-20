import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner, Empty } from '@/components/ui'
import { Plus, Trash2, ChevronRight, FileText, Image, Upload, X } from 'lucide-react'
import toast from 'react-hot-toast'

const CATALOG = [
  {
    value: 'paneles', label: 'Paneles Calefactores', emoji: '🔆',
    color: '#ffd166', bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.35)',
    subs: [
      { value: 'paneles_slim',         label: 'Panel Slim' },
      { value: 'paneles_slim_250w',    label: 'Slim 250w' },
      { value: 'paneles_slim_500w',    label: 'Slim 500w' },
      { value: 'paneles_firenze',      label: 'Panel Firenze' },
      { value: 'paneles_firenze_smart',label: 'Firenze Smart' },
    ],
  },
  {
    value: 'calefones', label: 'Calefones / Calderas', emoji: '🚿',
    color: '#ff6b2b', bg: 'rgba(255,107,43,0.12)', border: 'rgba(255,107,43,0.35)',
    subs: [
      { value: 'calefon_one',   label: 'Calefón One' },
      { value: 'calefon_nova',  label: 'Calefón Nova' },
      { value: 'calefon_pulse', label: 'Calefón Pulse' },
      { value: 'caldera_core',  label: 'Caldera Core' },
    ],
  },
  {
    value: 'anafes', label: 'Anafes', emoji: '🍳',
    color: '#3dd68c', bg: 'rgba(61,214,140,0.12)', border: 'rgba(61,214,140,0.35)',
    subs: [
      { value: 'anafe_induccion_2h',           label: 'Inducción 2 Hornallas' },
      { value: 'anafe_induccion_4h',           label: 'Inducción 4 Hornallas' },
      { value: 'anafe_induccion_4h_extractor', label: 'Inducción 4H + Extractor' },
      { value: 'anafe_infrarrojo_2h',          label: 'Infrarrojo 2 Hornallas' },
      { value: 'anafe_infrarrojo_4h_extractor',label: 'Infrarrojo 4H + Extractor' },
    ],
  },
]

function findCat(catValue) {
  return CATALOG.find(c => c.value === catValue || c.subs?.some(s => s.value === catValue))
}
function findSub(catValue) {
  for (const c of CATALOG) {
    const s = c.subs?.find(s => s.value === catValue)
    if (s) return s
  }
  return null
}
function getAllValues(cat) {
  return [cat.value, ...(cat.subs?.map(s => s.value) || [])]
}

export default function EspecificacionesTecnicas() {
  const { isAdmin } = useAuth()
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [selCat, setSelCat]       = useState(null)
  const [selSub, setSelSub]       = useState(null)

  // Modal
  const [modalOpen, setModalOpen]   = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [fCat, setFCat]             = useState('paneles')
  const [fSub, setFSub]             = useState('paneles_slim')
  const [fTitle, setFTitle]         = useState('')
  const [fDesc, setFDesc]           = useState('')
  const [fFiles, setFFiles]         = useState([])
  const [lightbox, setLightbox]     = useState(null)

  useEffect(() => { load() }, [selCat, selSub])

  async function load() {
    setLoading(true)
    let q = supabase.from('especificaciones').select('*').order('created_at', { ascending: false })
    if (selSub) {
      q = q.eq('category', selSub)
    } else if (selCat) {
      const cat = CATALOG.find(c => c.value === selCat)
      q = q.in('category', getAllValues(cat))
    }
    const { data } = await q
    setItems(data || [])
    setLoading(false)
  }

  function openModal() {
    setFCat('paneles'); setFSub('paneles_slim')
    setFTitle(''); setFDesc(''); setFFiles([])
    setModalOpen(true)
  }

  function handleFileChange(e) {
    const newFiles = Array.from(e.target.files || [])
    setFFiles(prev => [...prev, ...newFiles])
    e.target.value = ''
  }

  async function upload() {
    if (!fTitle.trim()) return toast.error('Ingresá un título')
    if (fFiles.length === 0) return toast.error('Seleccioná al menos un archivo')
    setUploading(true)
    for (const file of fFiles) {
      const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')
      const tipo = isPdf ? 'pdf' : 'imagen'
      const ext = file.name.split('.').pop()
      const path = `especificaciones/${fSub}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('facturas').upload(path, file, { upsert: false })
      if (uploadErr) { toast.error('Error subiendo ' + file.name); continue }
      const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)
      const { error } = await supabase.from('especificaciones').insert({
        title: fTitle.trim(),
        description: fDesc.trim() || null,
        url: publicUrl,
        tipo,
        category: fSub,
      })
      if (error) toast.error('Error guardando ' + file.name)
    }
    toast.success('Archivos subidos ✅')
    setUploading(false)
    setModalOpen(false)
    load()
  }

  async function eliminar(item) {
    if (!window.confirm('¿Eliminar este archivo?')) return
    const { error } = await supabase.from('especificaciones').delete().eq('id', item.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Eliminado')
    load()
  }

  const catActive = v => selCat === v
  const subActive = v => selSub === v

  const fCatData = CATALOG.find(c => c.value === fCat)

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Especificaciones Técnicas</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Imágenes y archivos técnicos por producto y modelo</p>
        </div>
        {isAdmin && (
          <button onClick={openModal} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--brand-blue)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
            <Plus size={14} /> Agregar archivo
          </button>
        )}
      </div>

      <div className="sidebar-layout" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>

        {/* SIDEBAR */}
        <div className="sidebar-sticky" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 10px', position: 'sticky', top: 88 }}>
          <div onClick={() => { setSelCat(null); setSelSub(null) }} style={{
            padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, marginBottom: 6,
            background: !selCat ? 'rgba(255,255,255,0.07)' : 'transparent',
            color: !selCat ? 'var(--text)' : 'var(--text3)', fontWeight: !selCat ? 600 : 400,
          }}>📐 Todo</div>

          {CATALOG.map(cat => (
            <div key={cat.value} style={{ marginBottom: 2 }}>
              <div onClick={() => { setSelSub(null); setSelCat(selCat === cat.value ? null : cat.value) }} style={{
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                background: catActive(cat.value) ? cat.bg : 'transparent',
                color: catActive(cat.value) ? cat.color : 'var(--text2)',
                fontWeight: catActive(cat.value) ? 700 : 400,
                borderLeft: `3px solid ${catActive(cat.value) ? cat.color : 'transparent'}`,
                display: 'flex', alignItems: 'center', gap: 8, transition: 'all .15s',
              }}>
                <span>{cat.emoji}</span>
                <span style={{ flex: 1 }}>{cat.label}</span>
                <ChevronRight size={13} style={{ opacity: 0.5, transform: (catActive(cat.value) || cat.subs?.some(s => subActive(s.value))) ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
              </div>

              {(catActive(cat.value) || cat.subs?.some(s => subActive(s.value))) && (
                <div style={{ paddingLeft: 14, marginTop: 2, marginBottom: 4 }}>
                  {cat.subs.map(sub => (
                    <div key={sub.value} onClick={() => setSelSub(selSub === sub.value ? null : sub.value)} style={{
                      padding: '6px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                      background: subActive(sub.value) ? cat.bg : 'transparent',
                      color: subActive(sub.value) ? cat.color : 'var(--text3)',
                      fontWeight: subActive(sub.value) ? 600 : 400,
                      borderLeft: `2px solid ${subActive(sub.value) ? cat.color : 'var(--border)'}`,
                      transition: 'all .15s', marginBottom: 1,
                    }}>
                      {sub.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CONTENIDO */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={28} /></div>
        ) : items.length === 0 ? (
          <Empty icon="📐" title="No hay archivos en esta categoría" description={isAdmin ? 'Subí el primer archivo desde el botón de arriba' : 'Todavía no hay archivos en esta categoría'} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {items.map(item => {
              const cat = findCat(item.category)
              const sub = findSub(item.category)
              const isImg = item.tipo === 'imagen'
              return (
                <div key={item.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column', transition: 'all .2s', position: 'relative',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = cat?.color || 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-2px)'; const b = e.currentTarget.querySelector('.adm'); if (b) b.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; const b = e.currentTarget.querySelector('.adm'); if (b) b.style.opacity = '0' }}
                >
                  {/* Preview */}
                  {isImg ? (
                    <div onClick={() => setLightbox(item.url)} style={{ height: 160, overflow: 'hidden', cursor: 'zoom-in', background: 'var(--surface2)' }}>
                      <img src={item.url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ) : (
                    <div style={{ height: 100, background: cat?.bg || 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={40} color={cat?.color || 'var(--text3)'} />
                    </div>
                  )}

                  {/* Info */}
                  <div style={{ padding: '14px 14px 12px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                    {isAdmin && (
                      <div className="adm" style={{ position: 'absolute', top: 8, right: 8, opacity: 0, transition: 'opacity .2s' }}>
                        <button onClick={() => eliminar(item)} style={{ background: 'rgba(255,85,119,0.85)', border: 'none', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    )}

                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4 }}>{item.title}</div>
                    {item.description && <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{item.description}</div>}

                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 'auto' }}>
                      {cat && <span style={{ background: cat.bg, color: cat.color, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>{cat.emoji} {cat.label}</span>}
                      {sub && <span style={{ background: 'var(--surface3)', color: 'var(--text2)', fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>{sub.label}</span>}
                      <span style={{ background: 'var(--surface3)', color: 'var(--text3)', fontSize: 10, padding: '2px 8px', borderRadius: 20 }}>{isImg ? '🖼 Imagen' : '📄 PDF'}</span>
                    </div>

                    <button onClick={() => window.open(item.url, '_blank')} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      background: 'transparent', border: `1px solid ${cat?.color || 'var(--border)'}`,
                      borderRadius: 6, padding: '6px 12px', fontSize: 12,
                      color: cat?.color || 'var(--text3)', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600,
                    }}>
                      {isImg ? <><Image size={12} /> Ver imagen</> : <><FileText size={12} /> Descargar PDF</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* LIGHTBOX */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}>
          <button onClick={() => setLightbox(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 40, height: 40, color: '#fff', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          <img src={lightbox} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} onClick={e => e.stopPropagation()} />
        </div>
      )}

      {/* MODAL AGREGAR */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>📐 Agregar especificaciones</div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>

            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Categoría */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>Categoría</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {CATALOG.map(c => (
                    <button key={c.value} onClick={() => { setFCat(c.value); setFSub(c.subs[0].value) }} style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
                      border: `1px solid ${fCat === c.value ? c.border : 'var(--border)'}`,
                      background: fCat === c.value ? c.bg : 'transparent',
                      color: fCat === c.value ? c.color : 'var(--text3)',
                      fontWeight: fCat === c.value ? 700 : 400,
                    }}>{c.emoji} {c.label}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {fCatData?.subs.map(s => (
                    <button key={s.value} onClick={() => setFSub(s.value)} style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer',
                      border: `1px solid ${fSub === s.value ? fCatData.border : 'var(--border)'}`,
                      background: fSub === s.value ? fCatData.bg : 'transparent',
                      color: fSub === s.value ? fCatData.color : 'var(--text3)',
                      fontWeight: fSub === s.value ? 600 : 400,
                    }}>{s.label}</button>
                  ))}
                </div>
              </div>

              {/* Título */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'block', marginBottom: 6 }}>Título *</label>
                <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder="Ej: Ficha técnica Slim 250w" style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }} />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'block', marginBottom: 6 }}>Descripción (opcional)</label>
                <textarea value={fDesc} onChange={e => setFDesc(e.target.value)} rows={2} placeholder="Breve descripción del archivo..." style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', resize: 'vertical', outline: 'none', lineHeight: 1.5 }} />
              </div>

              {/* Archivos */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'block', marginBottom: 6 }}>Archivos (imágenes y/o PDFs) *</label>
                {fFiles.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                    {fFiles.map((f, i) => {
                      const isPdf = f.type === 'application/pdf' || f.name.endsWith('.pdf')
                      return (
                        <div key={i} style={{ position: 'relative', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                          {isPdf ? (
                            <div style={{ width: 72, height: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                              <FileText size={24} color="var(--text3)" />
                              <span style={{ fontSize: 9, color: 'var(--text3)', textAlign: 'center', padding: '0 4px', wordBreak: 'break-all' }}>{f.name.slice(0, 12)}</span>
                            </div>
                          ) : (
                            <img src={URL.createObjectURL(f)} alt="" style={{ width: 72, height: 72, objectFit: 'cover' }} />
                          )}
                          <button onClick={() => setFFiles(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(255,85,119,0.9)', border: 'none', borderRadius: '50%', width: 18, height: 18, color: '#fff', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '10px 18px', cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
                  <Upload size={14} /> {fFiles.length > 0 ? `Agregar más (${fFiles.length} seleccionados)` : 'Elegir archivos'}
                  <input type="file" accept="image/*,.pdf" multiple style={{ display: 'none' }} onChange={handleFileChange} />
                </label>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                <button onClick={upload} disabled={uploading} style={{ flex: 1, background: 'var(--brand-blue)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {uploading ? '⏳ Subiendo...' : '⬆ Subir archivos'}
                </button>
                <button onClick={() => setModalOpen(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
