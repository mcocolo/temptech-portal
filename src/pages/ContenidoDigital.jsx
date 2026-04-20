import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Button, Modal, Input, Textarea, Spinner, Empty } from '@/components/ui'
import { Plus, Download, Pencil, Trash2, ChevronRight, Upload, Image, FileText, Video, Package } from 'lucide-react'
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
      {
        value: 'paneles_slim', label: 'Panel Slim', emoji: '▪',
        subs: [
          { value: 'paneles_slim_250',    label: 'Slim 250w' },
          { value: 'paneles_slim_250ts',  label: 'Slim 250w Toallero Simple' },
          { value: 'paneles_slim_250td',  label: 'Slim 250w Toallero Doble' },
          { value: 'paneles_slim_500',    label: 'Slim 500w' },
          { value: 'paneles_slim_500ts',  label: 'Slim 500w Toallero Simple' },
          { value: 'paneles_slim_500td',  label: 'Slim 500w Toallero Doble' },
        ],
      },
      {
        value: 'paneles_firenze', label: 'Panel Firenze', emoji: '▪',
        subs: [
          { value: 'paneles_firenze_bco', label: '1400w Blanco' },
          { value: 'paneles_firenze_mv',  label: '1400w Madera Veteada' },
          { value: 'paneles_firenze_pa',  label: '1400w Piedra Azteca' },
          { value: 'paneles_firenze_pr',  label: '1400w Piedra Romana' },
          { value: 'paneles_firenze_mtg', label: '1400w Mármol Traviatta Gris' },
          { value: 'paneles_firenze_pcl', label: '1400w Piedra Cantera Luna' },
          { value: 'paneles_firenze_mco', label: '1400w Mármol Calacatta Ocre' },
        ],
      },
      {
        value: 'paneles_firenze_smart', label: 'Firenze Smart', emoji: '▪',
        subs: [
          { value: 'paneles_firenze_smart_wifi', label: '1400w Smart Wifi' },
        ],
      },
    ],
  },
  {
    value: 'calefones',
    label: 'Calefones / Calderas',
    emoji: '🚿',
    color: '#7b9fff',
    bg: 'rgba(74,108,247,0.12)',
    border: 'rgba(74,108,247,0.35)',
    subs: [
      {
        value: 'calefones_one', label: 'Calefón One', emoji: '▪',
        subs: [
          { value: 'calefones_one_sil', label: '3,5/5,5/7Kw Silver' },
        ],
      },
      {
        value: 'calefones_nova', label: 'Calefón Nova', emoji: '▪',
        subs: [
          { value: 'calefones_nova_black', label: '6/8/9/13,5Kw Black' },
          { value: 'calefones_nova_sil',   label: '6/8/9/13,5Kw Silver' },
          { value: 'calefones_nova_bl',    label: '6/8/9/13,5Kw Blanco' },
        ],
      },
      {
        value: 'calefones_pulse', label: 'Calefón Pulse', emoji: '▪',
        subs: [
          { value: 'calefones_pulse_18', label: '9/13,5/18Kw 380V' },
          { value: 'calefones_pulse_24', label: '12/18/24Kw 380V' },
        ],
      },
      {
        value: 'calefones_caldera', label: 'Caldera Dual Core', emoji: '▪',
        subs: [
          { value: 'calefones_caldera_14', label: '14,4Kw 220-380V' },
          { value: 'calefones_caldera_23', label: '23Kw 380V' },
        ],
      },
    ],
  },
  {
    value: 'anafes',
    label: 'Anafes',
    emoji: '🔥',
    color: '#ff6b2b',
    bg: 'rgba(255,107,43,0.12)',
    border: 'rgba(255,107,43,0.35)',
    subs: [
      {
        value: 'anafes_induccion', label: 'Por Inducción', emoji: '▪',
        subs: [
          { value: 'anafes_ind_2h_perilla', label: '2H Con Perilla' },
          { value: 'anafes_ind_2h_touch',   label: '2H Touch' },
          { value: 'anafes_ind_4he_perilla', label: '4H Extractor Con Perilla' },
          { value: 'anafes_ind_4he_touch',   label: '4H Extractor Touch' },
          { value: 'anafes_ind_4hs_perilla', label: '4H Simple Con Perilla' },
          { value: 'anafes_ind_4hs_touch',   label: '4H Simple Touch' },
        ],
      },
      {
        value: 'anafes_infrarrojo', label: 'Por Infrarrojo', emoji: '▪',
        subs: [
          { value: 'anafes_inf_2h_perilla',  label: '2H Con Perilla' },
          { value: 'anafes_inf_2h_touch',    label: '2H Touch' },
          { value: 'anafes_inf_4he_perilla', label: '4H Extractor Con Perilla' },
          { value: 'anafes_inf_4he_touch',   label: '4H Extractor Touch' },
          { value: 'anafes_inf_4hs_perilla', label: '4H Simple Con Perilla' },
          { value: 'anafes_inf_4hs_touch',   label: '4H Simple Touch' },
        ],
      },
    ],
  },
  {
    value: 'general',
    label: 'General / Marca',
    emoji: '🏷️',
    color: '#3dd68c',
    bg: 'rgba(61,214,140,0.12)',
    border: 'rgba(61,214,140,0.35)',
    subs: [
      { value: 'general_logos',     label: 'Logos',     emoji: '▪' },
      { value: 'general_catalogos', label: 'Catálogos', emoji: '▪' },
      { value: 'general_marketing', label: 'Marketing', emoji: '▪' },
    ],
  },
]

const TIPOS = {
  imagen:    { label: 'Imagen',    icon: Image,    color: '#fb923c', ext: 'JPG, PNG, WEBP' },
  video:     { label: 'Video',     icon: Video,    color: '#7b9fff', ext: 'MP4, MOV' },
  pdf:       { label: 'PDF',       icon: FileText, color: '#ff5577', ext: 'PDF' },
  pack:      { label: 'Pack',      icon: Package,  color: '#3dd68c', ext: 'ZIP, RAR' },
}

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

const STORAGE_URL = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/contenido-digital/'
const EMPTY_FORM = { title: '', description: '', url: '', tipo: 'imagen', categoria: 'paneles_slim' }

export default function ContenidoDigital() {
  const { isAdmin, isDistributor } = useAuth()

  if (!isAdmin && !isDistributor) return null
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null) // { index, images }
  const [masivo, setMasivo] = useState(false)   // panel carga masiva
  const fileRef = useRef()

  // Filtros
  const [selParent, setSelParent] = useState(null)
  const [selSub, setSelSub]       = useState(null)
  const [selLeaf, setSelLeaf]     = useState(null)
  const [selTipo, setSelTipo]     = useState(null)

  // Form selección
  const [fParent, setFParent]   = useState('paneles')
  const [fSub, setFSub]         = useState('paneles_slim')
  const [fLeaf, setFLeaf]       = useState('paneles_slim_250')

  useEffect(() => { load() }, [selParent, selSub, selLeaf, selTipo])

  async function load() {
    setLoading(true)
    let q = supabase.from('contenido_digital').select('*').order('created_at', { ascending: false })

    if (selLeaf) {
      q = q.eq('categoria', selLeaf)
    } else if (selSub) {
      const mid = findMid(selSub)
      q = q.in('categoria', getAllLeaves(mid))
    } else if (selParent) {
      const parent = CATALOG.find(c => c.value === selParent)
      q = q.in('categoria', getAllLeaves(parent))
    }
    if (selTipo) q = q.eq('tipo', selTipo)

    const { data } = await q
    setItems(data || [])
    setLoading(false)
  }

  function pickParent(val) {
    if (selParent === val) { setSelParent(null); setSelSub(null); setSelLeaf(null) }
    else { setSelParent(val); setSelSub(null); setSelLeaf(null) }
  }
  function pickSub(val) {
    if (selSub === val) { setSelSub(null); setSelLeaf(null) }
    else { setSelSub(val); setSelLeaf(null) }
  }
  function pickLeaf(val) { setSelLeaf(selLeaf === val ? null : val) }

  function handleFParent(val) {
    setFParent(val)
    const firstSub = CATALOG.find(c => c.value === val)?.subs?.[0]
    const firstLeaf = firstSub?.subs?.[0]?.value || null
    setFSub(firstSub?.value || '')
    setFLeaf(firstLeaf)
    setForm(p => ({ ...p, categoria: firstLeaf || firstSub?.value || '' }))
  }
  function handleFSub(val) {
    setFSub(val)
    const subData = CATALOG.flatMap(c => c.subs || []).find(s => s.value === val)
    const firstLeaf = subData?.subs?.[0]?.value || null
    setFLeaf(firstLeaf)
    setForm(p => ({ ...p, categoria: firstLeaf || val }))
  }
  function handleFLeaf(val) {
    setFLeaf(val)
    setForm(p => ({ ...p, categoria: val }))
  }

  function detectTipo(ext) {
    const imgExts = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg']
    const vidExts = ['mp4', 'mov', 'avi', 'webm']
    return imgExts.includes(ext.toLowerCase()) ? 'imagen'
         : vidExts.includes(ext.toLowerCase()) ? 'video'
         : ext.toLowerCase() === 'pdf' ? 'pdf' : 'pack'
  }

  // Upload múltiples archivos
  async function handleUpload(e) {
    const files = Array.from(e.target.files)
    if (!files.length) return

    // Si es un solo archivo en modo edición o primer archivo en modal
    if (files.length === 1 && modalOpen) {
      const file = files[0]
      setUploading(true)
      const ext = file.name.split('.').pop()
      const path = `${fSub}/${Date.now()}_${file.name.replace(/\s/g, '_')}`
      const { error } = await supabase.storage.from('contenido-digital').upload(path, file, { upsert: true })
      if (error) { toast.error('Error al subir: ' + error.message); setUploading(false); return }
      setForm(p => ({ ...p, url: STORAGE_URL + path, tipo: detectTipo(ext) }))
      setUploading(false)
      toast.success('Archivo subido ✅')
      e.target.value = ''
      return
    }

    // Múltiples archivos → subir y guardar en BD todos de una
    setUploading(true)
    let ok = 0
    let fail = 0
    for (const file of files) {
      const ext = file.name.split('.').pop()
      const path = `${fSub}/${Date.now()}_${file.name.replace(/\s/g, '_')}`
      const { error: upErr } = await supabase.storage.from('contenido-digital').upload(path, file, { upsert: true })
      if (upErr) { fail++; continue }
      const url = STORAGE_URL + path
      const tipo = detectTipo(ext)
      const title = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
      const { error: dbErr } = await supabase.from('contenido_digital').insert({
        title, url, tipo, categoria: fLeaf || fSub, description: null,
      })
      if (dbErr) fail++
      else ok++
    }
    setUploading(false)
    if (ok > 0) { toast.success(`${ok} archivo${ok > 1 ? 's' : ''} subido${ok > 1 ? 's' : ''} ✅`); load() }
    if (fail > 0) toast.error(`${fail} archivo${fail > 1 ? 's' : ''} fallaron`)
    e.target.value = ''
  }

  function openAdd() {
    setEditing(null)
    setFParent('paneles'); setFSub('paneles_slim'); setFLeaf('paneles_slim_250')
    setForm({ ...EMPTY_FORM, categoria: 'paneles_slim_250' })
    setModalOpen(true)
  }
  function openEdit(item, e) {
    e.stopPropagation()
    setEditing(item)
    const parent = findParent(item.categoria)
    const mid    = findMid(item.categoria)
    const leaf   = findLeaf(item.categoria)
    setFParent(parent?.value || 'paneles')
    setFSub(mid?.value || '')
    setFLeaf(leaf?.value || null)
    setForm({ title: item.title, description: item.description || '', url: item.url, tipo: item.tipo, categoria: item.categoria })
    setModalOpen(true)
  }

  async function submit() {
    if (!form.title.trim() || !form.url.trim()) return toast.error('Completá título y URL')
    setSubmitting(true)
    if (editing) {
      const { error } = await supabase.from('contenido_digital').update({ ...form }).eq('id', editing.id)
      if (error) { toast.error('Error al actualizar'); setSubmitting(false); return }
      toast.success('Actualizado ✅')
    } else {
      const { error } = await supabase.from('contenido_digital').insert({ ...form })
      if (error) { toast.error('Error al guardar'); setSubmitting(false); return }
      toast.success('Publicado ✅')
    }
    setModalOpen(false); setEditing(null); setForm(EMPTY_FORM); load(); setSubmitting(false)
  }

  async function deleteItem() {
    const { error } = await supabase.from('contenido_digital').delete().eq('id', confirmDelete.id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Eliminado')
    setConfirmDelete(null); load()
  }

  const fParentData = CATALOG.find(c => c.value === fParent)

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>

      {/* Input de archivo siempre en el DOM */}
      <input ref={fileRef} type="file" accept="image/*,video/*,.pdf,.zip,.rar" multiple onChange={handleUpload} style={{ display: 'none' }} />

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', cursor: 'zoom-out' }}>
          <img src={lightbox.images[lightbox.index]} alt="" style={{ maxWidth: '85vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 0 80px rgba(0,0,0,0.6)' }} onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} style={{ position: 'fixed', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: 40, height: 40, color: '#fff', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          {lightbox.index > 0 && (
            <button onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, index: lb.index - 1 })) }} style={{ position: 'fixed', left: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: 48, height: 48, color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          )}
          {lightbox.index < lightbox.images.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setLightbox(lb => ({ ...lb, index: lb.index + 1 })) }} style={{ position: 'fixed', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: 48, height: 48, color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          )}
          <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{lightbox.index + 1} / {lightbox.images.length}</div>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Contenido Digital</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Imágenes, fichas y material de producto para distribuidores</p>
        </div>
        {isAdmin && (
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => setMasivo(m => !m)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: masivo ? 'var(--surface3)' : 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}
          >
            <Upload size={14} /> Subir varios
          </button>
          <Button onClick={openAdd}><Plus size={14} /> Agregar uno</Button>
        </div>
      )}
      </div>

      {/* Panel carga masiva */}
      {masivo && isAdmin && (
        <div style={{ background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.25)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#7b9fff', marginBottom: 14 }}>📤 Carga masiva de archivos</div>
          <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', fontWeight: 600 }}>Categoría destino</label>

            {/* Nivel 1 */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {CATALOG.map(c => (
                <button key={c.value} onClick={() => handleFParent(c.value)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${fParent === c.value ? c.border : 'var(--border)'}`, background: fParent === c.value ? c.bg : 'transparent', color: fParent === c.value ? c.color : 'var(--text3)', fontWeight: fParent === c.value ? 700 : 400 }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>

            {/* Nivel 2 */}
            {(() => {
              const parentData = CATALOG.find(c => c.value === fParent)
              if (!parentData) return null
              return (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 8, borderLeft: `3px solid ${parentData.color}40` }}>
                  {parentData.subs.map(s => (
                    <button key={s.value} onClick={() => handleFSub(s.value)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', border: `1px solid ${fSub === s.value ? parentData.border : 'var(--border)'}`, background: fSub === s.value ? parentData.bg : 'transparent', color: fSub === s.value ? parentData.color : 'var(--text3)', fontWeight: fSub === s.value ? 600 : 400 }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )
            })()}

            {/* Nivel 3 */}
            {(() => {
              const parentData = CATALOG.find(c => c.value === fParent)
              const subData = parentData?.subs?.find(s => s.value === fSub)
              if (!subData?.subs?.length) return null
              return (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingLeft: 16, borderLeft: `3px solid rgba(74,108,247,0.3)` }}>
                  {subData.subs.map(ss => (
                    <button key={ss.value} onClick={() => handleFLeaf(ss.value)} style={{ padding: '4px 10px', borderRadius: 20, fontSize: 11, cursor: 'pointer', border: `1px solid ${fLeaf === ss.value ? 'rgba(74,108,247,0.6)' : 'var(--border)'}`, background: fLeaf === ss.value ? 'rgba(74,108,247,0.15)' : 'transparent', color: fLeaf === ss.value ? '#7b9fff' : 'var(--text3)', fontWeight: fLeaf === ss.value ? 700 : 400 }}>
                      {ss.label}
                    </button>
                  ))}
                </div>
              )
            })()}

            {/* Categoría seleccionada */}
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>
              Destino: <span style={{ color: '#7b9fff', fontWeight: 600 }}>{fLeaf || fSub || fParent}</span>
            </div>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
          >
            <Upload size={14} /> {uploading ? 'Subiendo...' : 'Elegir archivos'}
          </button>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 8 }}>
            Podés seleccionar múltiples archivos a la vez. Se publican automáticamente con el nombre del archivo como título.
          </div>
        </div>
      )}

      <div className="sidebar-layout" style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 24, alignItems: 'start' }}>

        {/* Sidebar */}
        <div className="sidebar-sticky" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 12px', position: 'sticky', top: 88, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>

          {/* Filtro tipo */}
          <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Tipo de archivo</div>
            <div onClick={() => setSelTipo(null)} style={{ padding: '6px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12, marginBottom: 3, background: !selTipo ? 'rgba(255,255,255,0.07)' : 'transparent', color: !selTipo ? 'var(--text)' : 'var(--text3)', fontWeight: !selTipo ? 600 : 400 }}>
              Todos los tipos
            </div>
            {Object.entries(TIPOS).map(([key, cfg]) => {
              const Icon = cfg.icon
              const active = selTipo === key
              return (
                <div key={key} onClick={() => setSelTipo(active ? null : key)} style={{ padding: '6px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 7, background: active ? `${cfg.color}18` : 'transparent', color: active ? cfg.color : 'var(--text3)', fontWeight: active ? 600 : 400, borderLeft: `2px solid ${active ? cfg.color : 'transparent'}`, transition: 'all .15s' }}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' } }}
                >
                  <Icon size={13} /> {cfg.label}
                </div>
              )
            })}
          </div>

          {/* Filtro categoría */}
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Categoría</div>
          <div onClick={() => { setSelParent(null); setSelSub(null) }} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, marginBottom: 4, background: !selParent ? 'rgba(255,255,255,0.07)' : 'transparent', color: !selParent ? 'var(--text)' : 'var(--text3)', fontWeight: !selParent ? 600 : 400 }}>
            📦 Todo el contenido
          </div>

          {CATALOG.map(cat => (
            <div key={cat.value} style={{ marginBottom: 4 }}>
              <div onClick={() => pickParent(cat.value)} style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 13, background: selParent === cat.value && !selSub ? cat.bg : 'transparent', color: selParent === cat.value ? cat.color : 'var(--text2)', fontWeight: selParent === cat.value ? 700 : 400, borderLeft: `3px solid ${selParent === cat.value ? cat.color : 'transparent'}`, transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => { if (selParent !== cat.value) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' } }}
                onMouseLeave={e => { if (selParent !== cat.value) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text2)' } }}
              >
                <span style={{ fontSize: 16 }}>{cat.emoji}</span>
                <span style={{ flex: 1 }}>{cat.label}</span>
                <ChevronRight size={13} style={{ opacity: 0.5, transform: selParent === cat.value ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />
              </div>

              {selParent === cat.value && (
                <div style={{ paddingLeft: 14, marginTop: 2 }}>
                  {cat.subs.map(sub => (
                    <div key={sub.value}>
                      <div onClick={() => pickSub(sub.value)} style={{ padding: '6px 10px', borderRadius: 7, cursor: 'pointer', fontSize: 12, marginBottom: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: selSub === sub.value && !selLeaf ? cat.bg : 'transparent', color: selSub === sub.value ? cat.color : 'var(--text3)', fontWeight: selSub === sub.value ? 600 : 400, borderLeft: `2px solid ${selSub === sub.value ? cat.color : 'var(--border)'}`, transition: 'all .15s' }}
                        onMouseEnter={e => { if (selSub !== sub.value) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' } }}
                        onMouseLeave={e => { if (selSub !== sub.value) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' } }}
                      >
                        <span>{sub.label}</span>
                        {sub.subs && <ChevronRight size={11} style={{ opacity: 0.4, transform: selSub === sub.value ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }} />}
                      </div>
                      {/* Nivel 3 */}
                      {sub.subs && selSub === sub.value && (
                        <div style={{ paddingLeft: 12, marginBottom: 4 }}>
                          {sub.subs.map(leaf => (
                            <div key={leaf.value} onClick={() => pickLeaf(leaf.value)} style={{ padding: '5px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11, marginBottom: 1, background: selLeaf === leaf.value ? cat.bg : 'transparent', color: selLeaf === leaf.value ? cat.color : 'var(--text3)', fontWeight: selLeaf === leaf.value ? 600 : 400, borderLeft: `2px solid ${selLeaf === leaf.value ? cat.color : 'transparent'}`, transition: 'all .15s' }}
                              onMouseEnter={e => { if (selLeaf !== leaf.value) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text)' } }}
                              onMouseLeave={e => { if (selLeaf !== leaf.value) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text3)' } }}
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

        {/* Grid de contenido */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={28} /></div>
        ) : items.length === 0 ? (
          <Empty icon="🖼️" title="No hay contenido en esta categoría" description={isAdmin ? 'Agregá el primer archivo desde el botón de arriba' : 'Próximamente habrá material disponible para descargar'} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {items.map(item => {
              const parent  = findParent(item.categoria)
              const mid     = findMid(item.categoria)
              const leaf    = findLeaf(item.categoria)
              const tipoCfg = TIPOS[item.tipo] || TIPOS.pack
              const TipoIcon = tipoCfg.icon
              const esImagen = item.tipo === 'imagen'

              return (
                <div key={item.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column', transition: 'all .2s', position: 'relative' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = parent?.color || 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-2px)'; const btns = e.currentTarget.querySelector('.admin-btns'); if (btns) btns.style.opacity = '1' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; const btns = e.currentTarget.querySelector('.admin-btns'); if (btns) btns.style.opacity = '0' }}
                >
                  {/* Admin buttons */}
                  {isAdmin && (
                    <div className="admin-btns" style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 5, opacity: 0, transition: 'opacity .2s', zIndex: 2 }}>
                      <button onClick={e => openEdit(item, e)} style={{ background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                        <Pencil size={11} />
                      </button>
                      <button onClick={() => setConfirmDelete(item)} style={{ background: 'rgba(255,85,119,0.8)', border: 'none', borderRadius: 6, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  )}

                  {/* Preview */}
                  <div
                    onClick={() => { if (!esImagen) return; const imgs = items.filter(i => i.tipo === 'imagen').map(i => i.url); setLightbox({ index: imgs.indexOf(item.url), images: imgs }) }}
                    style={{ height: 160, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', cursor: esImagen ? 'zoom-in' : 'default', borderBottom: '1px solid var(--border)' }}
                  >
                    {esImagen ? (
                      <img src={item.url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }} />
                    ) : null}
                    <div style={{ display: esImagen ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <TipoIcon size={36} color={tipoCfg.color} strokeWidth={1.5} />
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{tipoCfg.ext}</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 4 }}>{item.title}</div>
                      {item.description && <div style={{ fontSize: 11, color: 'var(--text3)', lineHeight: 1.5 }}>{item.description}</div>}
                    </div>

                    {/* Tags */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ background: `${tipoCfg.color}18`, color: tipoCfg.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 }}>
                        <TipoIcon size={9} /> {tipoCfg.label}
                      </span>
                      {parent && (
                        <span style={{ background: parent.bg, color: parent.color, fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20 }}>
                          {parent.emoji} {mid?.label || parent.label}
                        </span>
                      )}
                      {leaf && (
                        <span style={{ background: 'var(--surface3)', color: 'var(--text3)', fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 20 }}>
                          {leaf.label}
                        </span>
                      )}
                    </div>

                    {/* Descarga */}
                    <a href={item.url} download target="_blank" rel="noreferrer" style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px', fontSize: 12, fontWeight: 600, color: 'var(--text2)', textDecoration: 'none', transition: 'all .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = parent?.bg || 'var(--surface3)'; e.currentTarget.style.color = parent?.color || 'var(--text)'; e.currentTarget.style.borderColor = parent?.color || 'var(--border2)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      <Download size={13} /> Descargar
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal agregar/editar */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null) }} title={editing ? '✏️ Editar contenido' : '🖼️ Agregar contenido'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Categoría */}
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Categoría del producto</div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Línea</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CATALOG.map(c => (
                  <button key={c.value} onClick={() => handleFParent(c.value)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', transition: 'all .15s', border: `1px solid ${fParent === c.value ? c.border : 'var(--border)'}`, background: fParent === c.value ? c.bg : 'transparent', color: fParent === c.value ? c.color : 'var(--text3)', fontWeight: fParent === c.value ? 700 : 400 }}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>
            {fParentData && (
              <div>
                <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Modelo / Tipo</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {fParentData.subs.map(s => (
                    <button key={s.value} onClick={() => handleFSub(s.value)} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', transition: 'all .15s', border: `1px solid ${fSub === s.value ? fParentData.border : 'var(--border)'}`, background: fSub === s.value ? fParentData.bg : 'transparent', color: fSub === s.value ? fParentData.color : 'var(--text3)', fontWeight: fSub === s.value ? 600 : 400 }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {/* Nivel 3 — variante específica */}
            {(() => {
              const subData = fParentData?.subs?.find(s => s.value === fSub)
              if (!subData?.subs?.length) return null
              return (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6 }}>Variante</label>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {subData.subs.map(ss => (
                      <button key={ss.value} onClick={() => handleFLeaf(ss.value)} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 11, cursor: 'pointer', transition: 'all .15s', border: `1px solid ${fLeaf === ss.value ? fParentData.border : 'var(--border)'}`, background: fLeaf === ss.value ? fParentData.bg : 'transparent', color: fLeaf === ss.value ? fParentData.color : 'var(--text3)', fontWeight: fLeaf === ss.value ? 600 : 400 }}>
                        {ss.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Tipo de archivo */}
          <div>
            <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>Tipo de archivo</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(TIPOS).map(([key, cfg]) => {
                const Icon = cfg.icon
                return (
                  <button key={key} onClick={() => setForm(p => ({ ...p, tipo: key }))} style={{ padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5, border: `1px solid ${form.tipo === key ? cfg.color + '60' : 'var(--border)'}`, background: form.tipo === key ? `${cfg.color}18` : 'transparent', color: form.tipo === key ? cfg.color : 'var(--text3)', fontWeight: form.tipo === key ? 700 : 400 }}>
                    <Icon size={12} /> {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Upload */}
          <div style={{ background: 'var(--surface2)', border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '16px', textAlign: 'center' }}>
            {form.url ? (
              <div>
                {form.tipo === 'imagen' && <img src={form.url} alt="" style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain', borderRadius: 8, marginBottom: 8 }} />}
                <div style={{ fontSize: 12, color: '#3dd68c', marginBottom: 8 }}>✓ Archivo subido</div>
                <button onClick={() => fileRef.current?.click()} style={{ fontSize: 12, color: 'var(--text3)', background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer' }}>
                  Cambiar archivo
                </button>
              </div>
            ) : (
              <div>
                <Upload size={24} color="var(--text3)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 10 }}>
                  {uploading ? 'Subiendo...' : 'Subí el archivo desde tu computadora'}
                </div>
                <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  {uploading ? 'Subiendo...' : 'Elegir archivo'}
                </button>
              </div>
            )}
          </div>

          {/* O URL manual */}
          <Input
            label="O pegá una URL directa"
            placeholder="https://..."
            value={form.url}
            onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
          />

          <Input label="Título" placeholder="Ej: Ficha técnica Panel Slim 250w" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          <Textarea label="Descripción (opcional)" placeholder="Breve descripción del archivo..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={() => { setModalOpen(false); setEditing(null) }}>Cancelar</Button>
            <Button onClick={submit} loading={submitting}>{editing ? 'Guardar cambios' : 'Publicar'}</Button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="¿Eliminar contenido?" width={420}>
        <p style={{ fontSize: 14, color: 'var(--text2)', marginBottom: 24 }}>
          Vas a eliminar <strong>"{confirmDelete?.title}"</strong>. Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button>
          <Button variant="danger" onClick={deleteItem}>Sí, eliminar</Button>
        </div>
      </Modal>
    </div>
  )
}
