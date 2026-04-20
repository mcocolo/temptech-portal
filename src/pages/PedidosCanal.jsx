import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui'
import { Plus, Upload, FileText, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const CANAL_CONFIG = {
  meli:   { label: 'Mercado Libre', color: '#ffe600', bg: 'rgba(255,230,0,0.1)',   border: 'rgba(255,230,0,0.35)',   emoji: '🛒', textColor: '#000' },
  pagina: { label: 'Página Web',   color: '#7b9fff', bg: 'rgba(123,159,255,0.1)', border: 'rgba(123,159,255,0.35)', emoji: '🌐', textColor: '#fff' },
  vo:     { label: 'Venta VO',     color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', border: 'rgba(167,139,250,0.35)', emoji: '📦', textColor: '#fff' },
}

const ESTADO_CONFIG = {
  pendiente:  { label: 'Pendiente',  color: '#fb923c', bg: 'rgba(251,146,60,0.12)',   border: 'rgba(251,146,60,0.35)' },
  preparando: { label: 'Preparando', color: '#ffd166', bg: 'rgba(255,209,102,0.12)', border: 'rgba(255,209,102,0.35)' },
  enviado:    { label: 'Enviado',    color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',   border: 'rgba(56,189,248,0.35)' },
  entregado:  { label: 'Entregado', color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',   border: 'rgba(61,214,140,0.35)' },
  cancelado:  { label: 'Cancelado', color: '#ff5577', bg: 'rgba(255,85,119,0.12)',   border: 'rgba(255,85,119,0.35)' },
}

const CATALOGO_PRODUCTOS = [
  { codigo: 'KF70SIL',     nombre: 'Calefón One 3,5/5,5/7Kw 220V Silver' },
  { codigo: 'FE150TBLACK', nombre: 'Calefón Nova 6/8/9/13,5Kw 220V Black' },
  { codigo: 'FE150TSIL',   nombre: 'Calefón Nova 6/8/9/13,5Kw 220V Silver' },
  { codigo: 'FE150TBL',    nombre: 'Calefón Nova 6/8/9/13,5Kw 220V Blanco' },
  { codigo: 'FM318BL',     nombre: 'Calefón Pulse 9/13,5/18Kw 380V Blanco' },
  { codigo: 'FM324BL',     nombre: 'Calefón Pulse 12/18/24Kw 380V Blanco' },
  { codigo: 'BF14EBL',     nombre: 'Caldera Core 220-380V 14,4Kw Blanco' },
  { codigo: 'BF323EBL',    nombre: 'Caldera Core 380V 23Kw Blanco' },
  { codigo: 'C250STV1',    nombre: 'Slim 250w' },
  { codigo: 'C250STV1TS',  nombre: 'Slim 250w Toallero Simple' },
  { codigo: 'C250STV1TD',  nombre: 'Slim 250w Toallero Doble' },
  { codigo: 'C500STV1',    nombre: 'Slim 500w' },
  { codigo: 'C500STV1TS',  nombre: 'Slim 500w Toallero Simple' },
  { codigo: 'C500STV1TD',  nombre: 'Slim 500w Toallero Doble' },
  { codigo: 'C500STV1MB',  nombre: 'Slim 500w Madera Blanca' },
  { codigo: 'F1400BCO',    nombre: 'Firenze 1400w Blanco' },
  { codigo: 'F1400MB',     nombre: 'Firenze 1400w Madera Blanca' },
  { codigo: 'F1400MV',     nombre: 'Firenze 1400w Madera Veteada' },
  { codigo: 'F1400PA',     nombre: 'Firenze 1400w Piedra Azteca' },
  { codigo: 'F1400PR',     nombre: 'Firenze 1400w Piedra Romana' },
  { codigo: 'F1400MTG',    nombre: 'Firenze 1400w Mármol Traviatta Gris' },
  { codigo: 'F1400PCL',    nombre: 'Firenze 1400w Piedra Cantera Luna' },
  { codigo: 'F1400MCO',    nombre: 'Firenze 1400w Mármol Calacatta Ocre' },
  { codigo: 'F1400SMARTBL',nombre: 'Firenze Smart 1400w Smart Wifi' },
  { codigo: 'K40010', nombre: 'Anafe Inducción + Extractor 4 Hornallas Touch' },
  { codigo: 'K40011', nombre: 'Anafe Inducción + Extractor 4 Hornallas Knob' },
  { codigo: 'DT4',    nombre: 'Anafe Infrarrojo + Extractor 4 Hornallas Touch' },
  { codigo: 'DT4W',   nombre: 'Anafe Infrarrojo + Extractor 4 Hornallas Knob' },
  { codigo: 'K1002',  nombre: 'Anafe Inducción 2 Hornallas Touch' },
  { codigo: 'K2002',  nombre: 'Anafe Infrarrojo 2 Hornallas Touch' },
  { codigo: 'DT4-1',  nombre: 'Anafe Inducción 4 Hornallas Touch' },
]

function formatFecha(d) {
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: es }) } catch { return '' }
}
function formatPrecio(v) {
  if (!v && v !== 0) return '—'
  return '$' + Number(v).toLocaleString('es-AR', { minimumFractionDigits: 0 })
}

const inputSt = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)',
  fontSize: 13, fontFamily: 'var(--font)', outline: 'none',
}

function canalFromPath(pathname) {
  if (pathname.includes('meli'))   return 'meli'
  if (pathname.includes('pagina')) return 'pagina'
  return 'vo'
}

function emptyItem() {
  return { codigo: '', nombre: '', cantidad: 1, precio_unitario: 0 }
}

// ── Meli-specific: bulk shipment view ──────────────────────────────────────

function MeliCard({ v, cc, onEdit, onDelete, onCambiarEstado }) {
  const ecfg = ESTADO_CONFIG[v.estado] || ESTADO_CONFIG.pendiente
  const etiquetas = Array.isArray(v.etiquetas_urls) ? v.etiquetas_urls : []
  const totalPkgs = (v.items || []).reduce((s, it) => s + (parseInt(it.cantidad) || 0), 0)

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', fontFamily: 'monospace' }}>#{v.id?.slice(0,8).toUpperCase()}</span>
            {v.nro_orden && <span style={{ fontSize: 11, fontWeight: 700, color: cc.color, background: cc.bg, border: `1px solid ${cc.border}`, padding: '1px 8px', borderRadius: 10 }}>{v.nro_orden}</span>}
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 12, background: ecfg.bg, color: ecfg.color }}>{ecfg.label}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>{formatFecha(v.created_at)}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: cc.color }}>📦 {totalPkgs} paq.</div>
      </div>

      {/* Productos */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: etiquetas.length > 0 ? 12 : 0 }}>
        {(v.items || []).map((it, i) => (
          <span key={i} style={{ fontSize: 12, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 12px', fontWeight: 600 }}>
            {it.codigo && <span style={{ fontFamily: 'monospace', color: cc.color, marginRight: 6 }}>{it.codigo}</span>}
            {it.nombre} <strong style={{ marginLeft: 4 }}>×{it.cantidad}</strong>
          </span>
        ))}
      </div>

      {/* Etiquetas PDF */}
      {etiquetas.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 6 }}>Etiquetas</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {etiquetas.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,230,0,0.08)', border: '1px solid rgba(255,230,0,0.3)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: cc.color, textDecoration: 'none' }}>
                <FileText size={13} /> Etiqueta {etiquetas.length > 1 ? i + 1 : ''} — Imprimir
              </a>
            ))}
          </div>
        </div>
      )}

      {v.observaciones && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>💬 {v.observaciones}</div>}

      {/* Acciones */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
        {Object.entries(ESTADO_CONFIG).filter(([k]) => k !== v.estado).map(([k, ecf]) => (
          <button key={k} onClick={() => onCambiarEstado(v.id, k)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)', background: ecf.bg, color: ecf.color, border: `1px solid ${ecf.border}`, fontWeight: 600 }}>
            → {ecf.label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={() => onEdit(v)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)', background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', fontWeight: 600 }}>✏️ Editar</button>
        <button onClick={() => onDelete(v.id)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)', background: 'rgba(255,85,119,0.08)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', fontWeight: 600 }}>🗑 Eliminar</button>
      </div>
    </div>
  )
}

// ── Meli modal: bulk shipment form ─────────────────────────────────────────

function MeliModal({ cc, editando, onClose, onSaved, user }) {
  const [fNroOrden, setFNroOrden]   = useState(editando?.nro_orden || '')
  const [fItems, setFItems]         = useState(editando?.items?.length ? editando.items.map(i => ({...i})) : [emptyItem()])
  const [fObs, setFObs]             = useState(editando?.observaciones || '')
  const [fEstado, setFEstado]       = useState(editando?.estado || 'pendiente')
  const [etiquetasFiles, setEtiquetasFiles]   = useState([])
  const [etiquetasExist, setEtiquetasExist]   = useState(Array.isArray(editando?.etiquetas_urls) ? editando.etiquetas_urls : [])
  const [guardando, setGuardando]   = useState(false)

  function updateItem(i, field, val) {
    setFItems(prev => prev.map((it, j) => {
      if (j !== i) return it
      if (field === 'codigo') {
        const prod = CATALOGO_PRODUCTOS.find(p => p.codigo === val)
        return { ...it, codigo: val, nombre: prod?.nombre || it.nombre }
      }
      return { ...it, [field]: val }
    }))
  }

  async function guardar() {
    const itemsValidos = fItems.filter(it => it.codigo || it.nombre)
    if (!itemsValidos.length) return toast.error('Agregá al menos un producto')
    setGuardando(true)

    // Subir etiquetas nuevas
    const nuevasUrls = []
    for (const file of etiquetasFiles) {
      const ext = file.name.split('.').pop()
      const path = `meli-etiquetas/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('facturas').upload(path, file, { upsert: true })
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)
        nuevasUrls.push(publicUrl)
      }
    }

    const payload = {
      canal: 'meli',
      nro_orden: fNroOrden.trim() || null,
      cliente_nombre: fNroOrden.trim() || 'Envío Meli',
      items: itemsValidos,
      total: 0,
      estado: fEstado,
      observaciones: fObs.trim() || null,
      etiquetas_urls: [...etiquetasExist, ...nuevasUrls],
      usuario_id: user.id,
      updated_at: new Date().toISOString(),
    }

    if (editando) {
      const { error } = await supabase.from('ventas').update(payload).eq('id', editando.id)
      if (error) { toast.error('Error: ' + error.message); setGuardando(false); return }
      toast.success('Envío actualizado ✅')
    } else {
      const { error } = await supabase.from('ventas').insert(payload)
      if (error) { toast.error('Error: ' + error.message); setGuardando(false); return }
      toast.success('Envío creado ✅')
    }
    setGuardando(false); onSaved()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{editando ? '✏️ Editar envío Meli' : '🛒 Nuevo envío Meli'}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* N° referencia + Estado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>N° de referencia / lote</label>
              <input value={fNroOrden} onChange={e => setFNroOrden(e.target.value)} placeholder="Ej: ML-20250419" style={inputSt} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Estado</label>
              <select value={fEstado} onChange={e => setFEstado(e.target.value)} style={inputSt}>
                {Object.entries(ESTADO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Productos */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Productos / Cantidades *</label>
              <button onClick={() => setFItems(prev => [...prev, emptyItem()])} style={{ fontSize: 11, padding: '3px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--font)', background: cc.bg, color: cc.color, border: `1px solid ${cc.border}`, fontWeight: 700 }}>
                + Agregar fila
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fItems.map((it, i) => (
                <div key={i} className="prod-row-grid" style={{ display: 'grid', gridTemplateColumns: '140px 1fr 72px auto', gap: 6, alignItems: 'center' }}>
                  <select value={it.codigo} onChange={e => updateItem(i, 'codigo', e.target.value)} style={{ ...inputSt, padding: '7px 6px', fontSize: 12 }}>
                    <option value="">Código...</option>
                    {CATALOGO_PRODUCTOS.map(p => <option key={p.codigo} value={p.codigo}>{p.codigo}</option>)}
                  </select>
                  <input value={it.nombre} onChange={e => updateItem(i, 'nombre', e.target.value)} placeholder="Descripción del producto" style={{ ...inputSt, padding: '7px 10px', fontSize: 12 }} />
                  <input type="number" min="1" value={it.cantidad} onChange={e => updateItem(i, 'cantidad', e.target.value)} placeholder="Cant." style={{ ...inputSt, padding: '7px 8px', fontSize: 12, textAlign: 'center' }} />
                  {fItems.length > 1
                    ? <button onClick={() => setFItems(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', fontSize: 20, padding: '0 2px', lineHeight: 1 }}>×</button>
                    : <span />}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, textAlign: 'right', fontSize: 13, color: 'var(--text3)' }}>
              Total paquetes: <strong style={{ color: cc.color }}>{fItems.reduce((s, it) => s + (parseInt(it.cantidad) || 0), 0)}</strong>
            </div>
          </div>

          {/* Etiquetas PDF */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Etiquetas (PDF)</label>

            {/* Etiquetas existentes */}
            {etiquetasExist.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                {etiquetasExist.map((url, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px' }}>
                    <FileText size={14} style={{ color: cc.color }} />
                    <span style={{ fontSize: 12, flex: 1, color: 'var(--text2)' }}>Etiqueta {i + 1}</span>
                    <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: cc.color, fontWeight: 700, textDecoration: 'none' }}>Ver</a>
                    <button onClick={() => setEtiquetasExist(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {/* Nuevas etiquetas a subir */}
            {etiquetasFiles.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                {etiquetasFiles.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px' }}>
                    <FileText size={14} style={{ color: cc.color }} />
                    <span style={{ fontSize: 12, flex: 1, color: '#3dd68c' }}>✅ {f.name}</span>
                    <button onClick={() => setEtiquetasFiles(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            )}

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px dashed var(--border)', borderRadius: 'var(--radius)', padding: '9px 16px', cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
              <Upload size={14} /> Adjuntar etiquetas PDF
              <input type="file" accept=".pdf,image/*" multiple style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.length) setEtiquetasFiles(prev => [...prev, ...Array.from(e.target.files)]); e.target.value = '' }} />
            </label>
          </div>

          {/* Observaciones */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Observaciones</label>
            <textarea value={fObs} onChange={e => setFObs(e.target.value)} rows={2} placeholder="Notas internas..." style={{ ...inputSt, resize: 'vertical', lineHeight: 1.5 }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={guardar} disabled={guardando} style={{ flex: 1, background: cc.color, color: cc.textColor, border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>
              {guardando ? '⏳ Guardando...' : editando ? '✅ Guardar cambios' : '✅ Crear envío'}
            </button>
            <button onClick={onClose} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────

export default function PedidosCanal() {
  const location = useLocation()
  const canal = canalFromPath(location.pathname)
  const cc = CANAL_CONFIG[canal]
  const { user, isAdmin, isAdmin2 } = useAuth()
  const canEdit = isAdmin || isAdmin2

  const [ventas, setVentas]       = useState([])
  const [loading, setLoading]     = useState(true)
  const [filtroEstado, setFiltro] = useState('todos')
  const [busqueda, setBusqueda]   = useState('')
  const [modal, setModal]         = useState(false)
  const [editando, setEditando]   = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Formulario (pagina / vo)
  const [fNroOrden, setFNroOrden] = useState('')
  const [fNombre, setFNombre]     = useState('')
  const [fEmail, setFEmail]       = useState('')
  const [fTel, setFTel]           = useState('')
  const [fItems, setFItems]       = useState([emptyItem()])
  const [fObs, setFObs]           = useState('')
  const [fEstado, setFEstado]     = useState('pendiente')
  const [fTipoEnvio, setFTipoEnvio]               = useState('')
  const [fEnvioEtiquetas, setFEnvioEtiquetas]     = useState([]) // correo: { file?, url?, productos:[{codigo,nombre}] }[]
  const [fEnvioItems, setFEnvioItems]             = useState([{ codigo: '', nombre: '', cantidad: 1 }]) // logistica/retiro
  const [fEnvioRetiroPersona, setFEnvioRetiroPersona] = useState('')

  useEffect(() => { setBusqueda(''); setFiltro('todos'); cargar() }, [canal])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('ventas').select('*').eq('canal', canal).order('created_at', { ascending: false })
    setVentas(data || [])
    setLoading(false)
  }

  function resetEnvio() { setFTipoEnvio(''); setFEnvioEtiquetas([]); setFEnvioItems([{ codigo: '', nombre: '', cantidad: 1 }]); setFEnvioRetiroPersona('') }
  function abrirNueva() { setEditando(null); setFNroOrden(''); setFNombre(''); setFEmail(''); setFTel(''); setFItems([emptyItem()]); setFObs(''); setFEstado('pendiente'); resetEnvio(); setModal(true) }
  function abrirEditar(v) {
    setEditando(v); setFNroOrden(v.nro_orden||''); setFNombre(v.cliente_nombre||''); setFEmail(v.cliente_email||''); setFTel(v.cliente_telefono||'')
    setFItems(v.items?.length ? v.items.map(i=>({...i})) : [emptyItem()]); setFObs(v.observaciones||''); setFEstado(v.estado||'pendiente')
    setFTipoEnvio(v.tipo_envio||'')
    setFEnvioEtiquetas((v.envio_etiquetas||[]).map(e => typeof e === 'object' && e.url ? { url: e.url, productos: e.productos||[] } : { url: e, productos: [] }))
    setFEnvioItems(v.tipo_envio && v.tipo_envio !== 'correo' && v.envio_etiquetas?.length ? v.envio_etiquetas : [{ codigo: '', nombre: '', cantidad: 1 }])
    setFEnvioRetiroPersona(v.envio_retiro_persona||'')
    setModal(true)
  }

  function calcTotal() { return fItems.reduce((s, it) => s + (parseFloat(it.precio_unitario)||0) * (parseInt(it.cantidad)||0), 0) }

  function updateItem(i, field, val) {
    setFItems(prev => prev.map((it, j) => {
      if (j !== i) return it
      if (field === 'codigo') { const prod = CATALOGO_PRODUCTOS.find(p => p.codigo === val); return { ...it, codigo: val, nombre: prod?.nombre || it.nombre } }
      return { ...it, [field]: val }
    }))
  }

  async function guardar() {
    if (canal !== 'pagina' && !fNombre.trim()) return toast.error('Ingresá el nombre del cliente')
    const itemsValidos = fItems.filter(it => it.codigo || it.nombre)
    if (canal !== 'pagina' && !itemsValidos.length) return toast.error('Agregá al menos un producto')
    setGuardando(true)

    // Procesar envío
    let envioEtiquetasFinal = []
    if (fTipoEnvio === 'correo') {
      for (const et of fEnvioEtiquetas) {
        if (et.file) {
          const ext = et.file.name.split('.').pop()
          const path = `envio-etiquetas/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error } = await supabase.storage.from('facturas').upload(path, et.file, { upsert: true })
          if (!error) {
            const { data: { publicUrl } } = supabase.storage.from('facturas').getPublicUrl(path)
            envioEtiquetasFinal.push({ url: publicUrl, productos: et.productos || [] })
          }
        } else if (et.url) {
          envioEtiquetasFinal.push({ url: et.url, productos: et.productos || [] })
        }
      }
    } else if (fTipoEnvio === 'logistica' || fTipoEnvio === 'retiro') {
      envioEtiquetasFinal = fEnvioItems.filter(it => it.codigo || it.nombre)
    }

    const payload = {
      canal, nro_orden: fNroOrden.trim()||null,
      cliente_nombre: fNombre.trim(), cliente_email: fEmail.trim()||null, cliente_telefono: fTel.trim()||null,
      items: itemsValidos, total: calcTotal(), estado: fEstado, observaciones: fObs.trim()||null,
      tipo_envio: fTipoEnvio || null,
      envio_etiquetas: envioEtiquetasFinal,
      envio_retiro_persona: fTipoEnvio === 'retiro' ? (fEnvioRetiroPersona.trim() || null) : null,
      usuario_id: user.id, updated_at: new Date().toISOString(),
    }
    const { error } = editando
      ? await supabase.from('ventas').update(payload).eq('id', editando.id)
      : await supabase.from('ventas').insert(payload)
    if (error) { toast.error('Error: ' + error.message); setGuardando(false); return }
    toast.success(editando ? 'Venta actualizada ✅' : 'Venta creada ✅')
    setGuardando(false); setModal(false); cargar()
  }

  async function cambiarEstado(id, nuevoEstado) {
    await supabase.from('ventas').update({ estado: nuevoEstado, updated_at: new Date().toISOString() }).eq('id', id)
    setVentas(prev => prev.map(v => v.id === id ? { ...v, estado: nuevoEstado } : v))
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar esta venta?')) return
    await supabase.from('ventas').delete().eq('id', id)
    setVentas(prev => prev.filter(v => v.id !== id))
    toast.success('Eliminada')
  }

  const filtradas = ventas.filter(v => {
    if (filtroEstado !== 'todos' && v.estado !== filtroEstado) return false
    if (busqueda) { const q = busqueda.toLowerCase(); return v.cliente_nombre?.toLowerCase().includes(q) || v.nro_orden?.toLowerCase().includes(q) }
    return true
  })

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>{cc.emoji} Pedidos {cc.label}</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Gestión de {canal === 'meli' ? 'envíos' : 'ventas'} del canal {cc.label}</p>
        </div>
        {canEdit && (
          <button onClick={abrirNueva} style={{ display: 'flex', alignItems: 'center', gap: 8, background: cc.bg, border: `1px solid ${cc.border}`, borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, color: cc.color, cursor: 'pointer', fontFamily: 'var(--font)' }}>
            <Plus size={15} /> {canal === 'meli' ? 'Nuevo envío' : 'Nueva venta'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
        {Object.entries(ESTADO_CONFIG).map(([k, ecfg]) => {
          const count = ventas.filter(v => v.estado === k).length
          const active = filtroEstado === k
          return (
            <div key={k} onClick={() => setFiltro(active ? 'todos' : k)} style={{ background: active ? ecfg.bg : 'var(--surface)', border: `1px solid ${active ? ecfg.border : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '12px 16px', cursor: 'pointer' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: ecfg.color }}>{count}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase' }}>{ecfg.label}</div>
            </div>
          )
        })}
      </div>

      {/* Búsqueda + filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder={`🔍 Buscar...`} style={{ ...inputSt, maxWidth: 300 }} />
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['todos', ...Object.keys(ESTADO_CONFIG)].map(e => {
            const ecfg = e === 'todos' ? { label: 'Todos', color: 'var(--text)', bg: 'transparent', border: 'var(--border)' } : ESTADO_CONFIG[e]
            const active = filtroEstado === e
            return <button key={e} onClick={() => setFiltro(e)} style={{ padding: '5px 13px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', border: `1px solid ${active ? (ecfg.border||'var(--border)') : 'var(--border)'}`, background: active ? ecfg.bg : 'transparent', color: active ? ecfg.color : 'var(--text3)', fontWeight: active ? 700 : 400 }}>{ecfg.label}</button>
          })}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spinner size={28} /></div>
      ) : filtradas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>No hay {canal === 'meli' ? 'envíos' : 'ventas'}{filtroEstado !== 'todos' ? ` con estado "${ESTADO_CONFIG[filtroEstado]?.label}"` : ''}</div>
      ) : canal === 'meli' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtradas.map(v => (
            <MeliCard key={v.id} v={v} cc={cc}
              onEdit={abrirEditar}
              onDelete={eliminar}
              onCambiarEstado={cambiarEstado} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtradas.map(v => {
            const ecfg = ESTADO_CONFIG[v.estado] || ESTADO_CONFIG.pendiente
            return (
              <div key={v.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', fontFamily: 'monospace' }}>#{v.id?.slice(0,8).toUpperCase()}</span>
                      {v.nro_orden && <span style={{ fontSize: 11, fontWeight: 700, color: cc.color, background: cc.bg, border: `1px solid ${cc.border}`, padding: '1px 8px', borderRadius: 10 }}>{v.nro_orden}</span>}
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 12, background: ecfg.bg, color: ecfg.color }}>{ecfg.label}</span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{v.cliente_nombre}</div>
                    {v.cliente_email && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 1 }}>{v.cliente_email}</div>}
                    {v.cliente_telefono && <div style={{ fontSize: 12, color: 'var(--text3)' }}>📞 {v.cliente_telefono}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: cc.color }}>{formatPrecio(v.total)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{formatFecha(v.created_at)}</div>
                  </div>
                </div>
                {(v.items || []).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {v.items.map((it, i) => (
                      <span key={i} style={{ fontSize: 11, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px' }}>
                        {it.codigo && <span style={{ fontFamily: 'monospace', color: cc.color, marginRight: 4 }}>{it.codigo}</span>}
                        {it.nombre} ×{it.cantidad}
                        {it.precio_unitario > 0 && <span style={{ color: 'var(--text3)', marginLeft: 4 }}>{formatPrecio(it.precio_unitario * it.cantidad)}</span>}
                      </span>
                    ))}
                  </div>
                )}
                {v.observaciones && <div style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 10 }}>💬 {v.observaciones}</div>}
                {/* Envío */}
                {v.tipo_envio && (() => {
                  const ENVIO_LABELS = { correo: '📬 Correo Argentino / Andreani', logistica: '🚛 Logística', retiro: '🏭 Retiro en Fábrica' }
                  const etiquetas = v.envio_etiquetas || []
                  return (
                    <div style={{ marginBottom: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: cc.color, marginBottom: 8 }}>{ENVIO_LABELS[v.tipo_envio]}</div>
                      {v.tipo_envio === 'retiro' && v.envio_retiro_persona && (
                        <div style={{ fontSize: 12, marginBottom: 6 }}>👤 Retira: <strong>{v.envio_retiro_persona}</strong></div>
                      )}
                      {v.tipo_envio === 'correo' && etiquetas.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {etiquetas.map((et, i) => {
                            const url = typeof et === 'string' ? et : et.url
                            const prods = typeof et === 'object' ? (et.productos || []) : []
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <a href={url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: cc.color, textDecoration: 'none', background: cc.bg, border: `1px solid ${cc.border}`, borderRadius: 6, padding: '3px 10px', fontWeight: 700 }}>
                                  <FileText size={11} /> Etiqueta {i + 1}
                                </a>
                                {prods.map((p, pi) => (
                                  <span key={pi} style={{ fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px' }}>
                                    {p.codigo && <span style={{ fontFamily: 'monospace', color: cc.color, marginRight: 4 }}>{p.codigo}</span>}{p.nombre}
                                  </span>
                                ))}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      {(v.tipo_envio === 'logistica' || v.tipo_envio === 'retiro') && etiquetas.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {etiquetas.map((it, i) => (
                            <span key={i} style={{ fontSize: 11, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px' }}>
                              {it.codigo && <span style={{ fontFamily: 'monospace', color: cc.color, marginRight: 4 }}>{it.codigo}</span>}{it.nombre} ×{it.cantidad}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  {Object.entries(ESTADO_CONFIG).filter(([k]) => k !== v.estado).map(([k, ecf]) => (
                    <button key={k} onClick={() => cambiarEstado(v.id, k)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)', background: ecf.bg, color: ecf.color, border: `1px solid ${ecf.border}`, fontWeight: 600 }}>→ {ecf.label}</button>
                  ))}
                  <div style={{ flex: 1 }} />
                  <button onClick={() => abrirEditar(v)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)', background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', fontWeight: 600 }}>✏️ Editar</button>
                  <button onClick={() => eliminar(v.id)} style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)', background: 'rgba(255,85,119,0.08)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', fontWeight: 600 }}>🗑 Eliminar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Meli */}
      {modal && canal === 'meli' && (
        <MeliModal cc={cc} editando={editando} user={user} onClose={() => setModal(false)} onSaved={() => { setModal(false); cargar() }} />
      )}

      {/* Modal Pagina / VO */}
      {modal && canal !== 'meli' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{editando ? '✏️ Editar venta' : `${cc.emoji} Nueva venta — ${cc.label}`}</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {canal !== 'pagina' && (<>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>N° de orden</label>
                  <input value={fNroOrden} onChange={e => setFNroOrden(e.target.value)} placeholder="Ej: ORD-00123" style={inputSt} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Estado</label>
                  <select value={fEstado} onChange={e => setFEstado(e.target.value)} style={inputSt}>
                    {Object.entries(ESTADO_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Nombre del cliente *</label>
                <input value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder="Nombre y apellido" style={inputSt} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email</label>
                  <input type="email" value={fEmail} onChange={e => setFEmail(e.target.value)} placeholder="correo@ejemplo.com" style={inputSt} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Teléfono</label>
                  <input value={fTel} onChange={e => setFTel(e.target.value)} placeholder="+54 11 1234-5678" style={inputSt} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Productos *</label>
                  <button onClick={() => setFItems(prev => [...prev, emptyItem()])} style={{ fontSize: 11, padding: '3px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--font)', background: cc.bg, color: cc.color, border: `1px solid ${cc.border}`, fontWeight: 700 }}>+ Agregar</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {fItems.map((it, i) => (
                    <div key={i} className="prod-row-grid" style={{ display: 'grid', gridTemplateColumns: '130px 1fr 60px 100px auto', gap: 6, alignItems: 'center' }}>
                      <select value={it.codigo} onChange={e => updateItem(i, 'codigo', e.target.value)} style={{ ...inputSt, padding: '7px 6px', fontSize: 12 }}>
                        <option value="">Código...</option>
                        {CATALOGO_PRODUCTOS.map(p => <option key={p.codigo} value={p.codigo}>{p.codigo}</option>)}
                      </select>
                      <input value={it.nombre} onChange={e => updateItem(i, 'nombre', e.target.value)} placeholder="Descripción" style={{ ...inputSt, padding: '7px 10px', fontSize: 12 }} />
                      <input type="number" min="1" value={it.cantidad} onChange={e => updateItem(i, 'cantidad', e.target.value)} style={{ ...inputSt, padding: '7px 8px', fontSize: 12 }} />
                      <input type="number" min="0" value={it.precio_unitario} onChange={e => updateItem(i, 'precio_unitario', e.target.value)} placeholder="Precio" style={{ ...inputSt, padding: '7px 8px', fontSize: 12 }} />
                      {fItems.length > 1 ? <button onClick={() => setFItems(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', fontSize: 20, padding: '0 2px' }}>×</button> : <span />}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 8, textAlign: 'right', fontSize: 15, fontWeight: 800, color: cc.color }}>Total: {formatPrecio(calcTotal())}</div>
              </div>
              </>)}
              {/* Tipo de envío */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: cc.color, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>🚚 Tipo de envío</label>
                <select value={fTipoEnvio} onChange={e => { setFTipoEnvio(e.target.value); setFEnvioEtiquetas([]); setFEnvioItems([{ codigo: '', nombre: '', cantidad: 1 }]); setFEnvioRetiroPersona('') }} style={inputSt}>
                  <option value="">Sin especificar</option>
                  <option value="correo">📬 Correo Argentino / Andreani</option>
                  <option value="logistica">🚛 Logística</option>
                  <option value="retiro">🏭 Retiro en Fábrica</option>
                </select>
              </div>

              {/* CORREO: etiquetas PDF + productos por etiqueta */}
              {fTipoEnvio === 'correo' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Etiquetas de envío</label>
                    <button onClick={() => setFEnvioEtiquetas(prev => [...prev, { file: null, productos: [] }])} style={{ fontSize: 11, padding: '3px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--font)', background: cc.bg, color: cc.color, border: `1px solid ${cc.border}`, fontWeight: 700 }}>+ Agregar etiqueta</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {fEnvioEtiquetas.map((et, i) => (
                      <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: cc.color }}>Etiqueta {i + 1}</span>
                          {et.url && <a href={et.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: cc.color, textDecoration: 'none' }}>📄 Ver PDF</a>}
                          {!et.file && !et.url && (
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', fontSize: 11, color: 'var(--text2)' }}>
                              <Upload size={12} /> Subir PDF
                              <input type="file" accept=".pdf,image/*" style={{ display: 'none' }}
                                onChange={e => { if (e.target.files?.[0]) { const f = e.target.files[0]; setFEnvioEtiquetas(prev => prev.map((x, j) => j === i ? { ...x, file: f } : x)); e.target.value = '' } }} />
                            </label>
                          )}
                          {et.file && <span style={{ fontSize: 11, color: '#3dd68c' }}>✅ {et.file.name}</span>}
                          <button onClick={() => setFEnvioEtiquetas(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', fontSize: 18, marginLeft: 'auto', lineHeight: 1 }}>×</button>
                        </div>
                        {/* Productos en esta etiqueta */}
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase' }}>Productos en esta etiqueta:</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {fItems.filter(it => it.codigo || it.nombre).map((it, pi) => {
                            const checked = (et.productos || []).some(p => p.codigo === it.codigo && p.nombre === it.nombre)
                            return (
                              <label key={pi} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 12, padding: '3px 0' }}>
                                <input type="checkbox" checked={checked} onChange={e => {
                                  setFEnvioEtiquetas(prev => prev.map((x, j) => {
                                    if (j !== i) return x
                                    const prods = e.target.checked
                                      ? [...(x.productos || []), { codigo: it.codigo, nombre: it.nombre }]
                                      : (x.productos || []).filter(p => !(p.codigo === it.codigo && p.nombre === it.nombre))
                                    return { ...x, productos: prods }
                                  }))
                                }} style={{ accentColor: cc.color }} />
                                {it.codigo && <span style={{ fontFamily: 'monospace', fontSize: 11, color: cc.color }}>{it.codigo}</span>}
                                <span>{it.nombre}</span>
                                <span style={{ color: 'var(--text3)' }}>×{it.cantidad}</span>
                              </label>
                            )
                          })}
                          {fItems.filter(it => it.codigo || it.nombre).length === 0 && (
                            <span style={{ fontSize: 11, color: 'var(--text3)' }}>Agregá productos al pedido primero</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {fEnvioEtiquetas.length === 0 && (
                      <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>Hacé clic en "+ Agregar etiqueta" para cargar las etiquetas de envío</div>
                    )}
                  </div>
                </div>
              )}

              {/* LOGÍSTICA: items que salen */}
              {(fTipoEnvio === 'logistica' || fTipoEnvio === 'retiro') && (
                <div>
                  {fTipoEnvio === 'retiro' && (
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Nombre y apellido del que retira *</label>
                      <input value={fEnvioRetiroPersona} onChange={e => setFEnvioRetiroPersona(e.target.value)} placeholder="Ej: Juan Pérez" style={inputSt} />
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase' }}>Items que {fTipoEnvio === 'logistica' ? 'salen por logística' : 'se retiran'}</label>
                    <button onClick={() => setFEnvioItems(prev => [...prev, { codigo: '', nombre: '', cantidad: 1 }])} style={{ fontSize: 11, padding: '3px 12px', borderRadius: 12, cursor: 'pointer', fontFamily: 'var(--font)', background: cc.bg, color: cc.color, border: `1px solid ${cc.border}`, fontWeight: 700 }}>+ Agregar</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {fEnvioItems.map((it, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 60px auto', gap: 6, alignItems: 'center' }}>
                        <select value={it.codigo} onChange={e => {
                          const prod = CATALOGO_PRODUCTOS.find(p => p.codigo === e.target.value)
                          setFEnvioItems(prev => prev.map((x, j) => j === i ? { ...x, codigo: e.target.value, nombre: prod?.nombre || x.nombre } : x))
                        }} style={{ ...inputSt, padding: '7px 6px', fontSize: 12 }}>
                          <option value="">Código...</option>
                          {CATALOGO_PRODUCTOS.map(p => <option key={p.codigo} value={p.codigo}>{p.codigo}</option>)}
                        </select>
                        <input value={it.nombre} onChange={e => setFEnvioItems(prev => prev.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} placeholder="Descripción" style={{ ...inputSt, padding: '7px 10px', fontSize: 12 }} />
                        <input type="number" min="1" value={it.cantidad} onChange={e => setFEnvioItems(prev => prev.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x))} style={{ ...inputSt, padding: '7px 8px', fontSize: 12, textAlign: 'center' }} />
                        {fEnvioItems.length > 1
                          ? <button onClick={() => setFEnvioItems(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', fontSize: 20, padding: '0 2px' }}>×</button>
                          : <span />}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Observaciones</label>
                <textarea value={fObs} onChange={e => setFObs(e.target.value)} rows={2} style={{ ...inputSt, resize: 'vertical', lineHeight: 1.5 }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={guardar} disabled={guardando} style={{ flex: 1, background: cc.color, color: cc.textColor, border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {guardando ? '⏳ Guardando...' : editando ? '✅ Guardar cambios' : '✅ Crear venta'}
                </button>
                <button onClick={() => setModal(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
