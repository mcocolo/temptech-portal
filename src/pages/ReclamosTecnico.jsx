import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const T = {
  bg: '#1a1a2e', surface: '#16213e', surface2: '#1e2a45', surface3: '#243050',
  border: 'rgba(255,255,255,0.08)', border2: 'rgba(255,255,255,0.13)',
  text: '#f0f4ff', text2: '#b8c4e0', text3: '#6b7a9e',
  teal: '#2dd4bf', tealDim: 'rgba(45,212,191,0.12)',
  yellow: '#ffd166', yellowDim: 'rgba(255,209,102,0.1)',
  green: '#3dd68c', greenDim: 'rgba(61,214,140,0.1)',
  blue: '#7b9fff', blueDim: 'rgba(123,159,255,0.1)',
  red: '#ff5577',
  font: "'Inter', -apple-system, sans-serif",
  radius: '10px', radiusLg: '16px',
}

const STATUS_CFG = {
  'Ingresado':  { color: T.blue,   bg: T.blueDim,   label: 'Ingresado' },
  'pendiente':  { color: T.yellow, bg: T.yellowDim,  label: 'Pendiente' },
  'Resolucion': { color: '#b39dfa', bg: 'rgba(179,157,250,0.1)', label: 'Resolución' },
  'Devolucion': { color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  label: 'Devolución' },
  'Service':    { color: T.teal,   bg: T.tealDim,   label: 'Service' },
  'rechazado':  { color: T.red,    bg: 'rgba(255,85,119,0.1)', label: 'Rechazado' },
  'cerrado':    { color: T.text3,  bg: 'rgba(107,122,158,0.1)', label: 'Cerrado' },
}

function fmt(s) {
  if (!s) return '—'
  const d = new Date(s)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

async function subirFotoTecnico(trackingId, file) {
  const ext = file.name.split('.').pop()
  const path = `tecnico/${trackingId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('devoluciones').upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('devoluciones').getPublicUrl(path)
  return data.publicUrl
}

export default function ReclamosTecnico() {
  const { user } = useAuth()
  const [casos, setCasos] = useState([])
  const [loading, setLoading] = useState(true)
  const [abierto, setAbierto] = useState(null)
  const [reporte, setReporte] = useState({})
  const [guardando, setGuardando] = useState(null)
  const [subiendo, setSubiendo] = useState(null)
  const fileRefs = useRef({})
  const [filtro, setFiltro] = useState('activos')

  useEffect(() => { if (user?.id) cargar() }, [user?.id, filtro])

  async function cargar() {
    setLoading(true)
    let q = supabase.from('devoluciones')
      .select('id, tracking_id, estado, fecha_creacion, nombre_apellido, nombre, email, telefono, producto, modelo, motivo, descripcion_falla, imagenes_producto_urls, imagen_producto_url, comprobantes_urls, comprobante_url, tecnico_reporte, tecnico_fotos, localidad, provincia, direccion')
      .eq('tecnico_id', user.id)
      .order('fecha_creacion', { ascending: false })
    if (filtro === 'activos') q = q.not('estado', 'in', '("cerrado","rechazado")')
    const { data, error } = await q
    if (error) { toast.error('Error al cargar casos: ' + error.message); setLoading(false); return }
    setCasos(data || [])
    setLoading(false)
  }

  async function guardarReporte(caso) {
    const texto = (reporte[caso.id] || '').trim()
    if (!texto) { toast.error('Escribí el reporte antes de guardar'); return }
    setGuardando(caso.id)
    const { error } = await supabase.from('devoluciones')
      .update({ tecnico_reporte: texto })
      .eq('id', caso.id)
    setGuardando(null)
    if (error) { toast.error('Error al guardar: ' + error.message); return }
    toast.success('Reporte guardado ✅')
    await cargar()
  }

  async function subirFotos(caso, files) {
    if (!files?.length) return
    setSubiendo(caso.id)
    try {
      const existentes = caso.tecnico_fotos || []
      const nuevas = []
      for (const f of Array.from(files)) {
        const url = await subirFotoTecnico(caso.tracking_id || caso.id, f)
        nuevas.push(url)
      }
      const todas = [...existentes, ...nuevas]
      const { error } = await supabase.from('devoluciones')
        .update({ tecnico_fotos: todas })
        .eq('id', caso.id)
      if (error) throw error
      toast.success(`${nuevas.length} foto${nuevas.length > 1 ? 's' : ''} cargada${nuevas.length > 1 ? 's' : ''} ✅`)
      await cargar()
    } catch (e) {
      toast.error('Error al subir: ' + e.message)
    }
    setSubiendo(null)
  }

  async function eliminarFoto(caso, url) {
    if (!window.confirm('¿Eliminar esta foto?')) return
    const nuevas = (caso.tecnico_fotos || []).filter(u => u !== url)
    await supabase.from('devoluciones').update({ tecnico_fotos: nuevas }).eq('id', caso.id)
    await cargar()
  }

  const fotosCliente = (c) => {
    const imgs = c.imagenes_producto_urls?.length > 0 ? c.imagenes_producto_urls : c.imagen_producto_url ? [c.imagen_producto_url] : []
    const comps = c.comprobantes_urls?.length > 0 ? c.comprobantes_urls : c.comprobante_url ? [c.comprobante_url] : []
    return { imgs, comps }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 16px', fontFamily: T.font, color: T.text }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>Mis Casos Asignados</h1>
        <p style={{ color: T.text3, fontSize: 13, marginTop: 4 }}>Casos de service/garantía que te fueron derivados</p>
      </div>

      {/* Filtro */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['activos', 'Activos'], ['todos', 'Todos']].map(([v, l]) => (
          <button key={v} onClick={() => setFiltro(v)}
            style={{ background: filtro === v ? T.teal : T.surface2, color: filtro === v ? '#fff' : T.text2, border: `1px solid ${filtro === v ? T.teal : T.border2}`, borderRadius: T.radius, padding: '6px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: T.font }}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: T.text3 }}>Cargando casos...</div>
      ) : casos.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: T.text3 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔧</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No tenés casos asignados</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Cuando TEMPTECH te asigne un caso, aparecerá acá</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {casos.map(caso => {
            const stCfg = STATUS_CFG[caso.estado] || STATUS_CFG['Ingresado']
            const isOpen = abierto === caso.id
            const { imgs, comps } = fotosCliente(caso)
            return (
              <div key={caso.id} style={{ background: T.surface, border: `1px solid ${T.border2}`, borderRadius: T.radiusLg, overflow: 'hidden' }}>
                {/* Card header */}
                <div onClick={() => setAbierto(isOpen ? null : caso.id)}
                  style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: T.blue, background: T.blueDim, padding: '3px 9px', borderRadius: 6 }}>
                    {caso.tracking_id || `#${caso.id.slice(0,8).toUpperCase()}`}
                  </span>
                  <span style={{ background: stCfg.bg, color: stCfg.color, border: `1px solid ${stCfg.color}40`, fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20 }}>{stCfg.label}</span>
                  {caso.tecnico_reporte && <span style={{ background: T.greenDim, color: T.green, border: `1px solid ${T.green}40`, fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20 }}>✓ Reporte cargado</span>}
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{caso.producto} {caso.modelo ? `· ${caso.modelo}` : ''}</span>
                  <span style={{ fontSize: 11, color: T.text3 }}>{fmt(caso.fecha_creacion)}</span>
                  <span style={{ color: T.text3, fontSize: 16 }}>{isOpen ? '▲' : '▼'}</span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: `1px solid ${T.border}`, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {/* Info del caso */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px 32px' }}>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Cliente</div>
                        {[
                          ['Nombre', caso.nombre_apellido || caso.nombre],
                          ['Email', caso.email],
                          ['Teléfono', caso.telefono],
                          ['Dirección', caso.direccion],
                          ['Localidad', [caso.localidad, caso.provincia].filter(Boolean).join(', ')],
                        ].map(([l, v]) => v ? (
                          <div key={l} style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: T.text3, minWidth: 80 }}>{l}</span>
                            <span style={{ color: T.text2 }}>{v}</span>
                          </div>
                        ) : null)}
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Producto</div>
                        {[
                          ['Producto', caso.producto],
                          ['Modelo', caso.modelo],
                          ['Motivo', caso.motivo],
                        ].map(([l, v]) => v ? (
                          <div key={l} style={{ display: 'flex', gap: 8, fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: T.text3, minWidth: 80 }}>{l}</span>
                            <span style={{ color: T.text2 }}>{v}</span>
                          </div>
                        ) : null)}
                        {caso.descripcion_falla && (
                          <div style={{ marginTop: 8, padding: '8px 12px', background: T.surface2, borderRadius: 8, fontSize: 12, color: T.text2, lineHeight: 1.6 }}>
                            {caso.descripcion_falla}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Fotos del cliente */}
                    {(imgs.length > 0 || comps.length > 0) && (
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 8 }}>Fotos del cliente</div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {[...imgs, ...comps].map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt={`foto ${i+1}`} style={{ width: 90, height: 65, objectFit: 'cover', borderRadius: 8, border: `1px solid ${T.border2}` }}
                                onError={e => { e.currentTarget.style.display='none' }} />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Reporte del técnico */}
                    <div style={{ background: T.surface2, border: `1px solid ${T.border2}`, borderRadius: T.radius, padding: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.teal, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>🔧 Tu reporte</div>
                      <textarea
                        value={reporte[caso.id] !== undefined ? reporte[caso.id] : (caso.tecnico_reporte || '')}
                        onChange={e => setReporte(p => ({ ...p, [caso.id]: e.target.value }))}
                        placeholder="Describí el diagnóstico, los trabajos realizados y el resultado final..."
                        rows={4}
                        style={{ width: '100%', background: T.surface3, border: `1px solid ${T.border2}`, borderRadius: T.radius, padding: '10px 12px', color: T.text, fontSize: 13, fontFamily: T.font, resize: 'vertical', outline: 'none', lineHeight: 1.6, boxSizing: 'border-box' }}
                      />
                      <button onClick={() => guardarReporte(caso)} disabled={guardando === caso.id}
                        style={{ marginTop: 10, background: T.teal, color: '#fff', border: 'none', borderRadius: T.radius, padding: '8px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: T.font, opacity: guardando === caso.id ? 0.6 : 1 }}>
                        {guardando === caso.id ? 'Guardando...' : '💾 Guardar reporte'}
                      </button>
                    </div>

                    {/* Fotos del trabajo */}
                    <div style={{ background: T.surface2, border: `1px solid ${T.border2}`, borderRadius: T.radius, padding: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: T.teal, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>📷 Fotos del trabajo terminado</div>
                      {caso.tecnico_fotos?.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                          {caso.tecnico_fotos.map((url, i) => (
                            <div key={i} style={{ position: 'relative' }}>
                              <a href={url} target="_blank" rel="noreferrer">
                                <img src={url} alt={`trabajo ${i+1}`} style={{ width: 100, height: 75, objectFit: 'cover', borderRadius: 8, border: `1px solid rgba(45,212,191,0.3)` }} />
                              </a>
                              <button onClick={() => eliminarFoto(caso, url)}
                                style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 20, height: 20, color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <input
                        ref={el => fileRefs.current[caso.id] = el}
                        type="file" accept="image/*" multiple
                        style={{ display: 'none' }}
                        onChange={e => subirFotos(caso, e.target.files)}
                      />
                      <button onClick={() => fileRefs.current[caso.id]?.click()} disabled={subiendo === caso.id}
                        style={{ background: T.surface3, color: T.teal, border: `1px solid rgba(45,212,191,0.35)`, borderRadius: T.radius, padding: '8px 18px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: T.font, opacity: subiendo === caso.id ? 0.6 : 1 }}>
                        {subiendo === caso.id ? 'Subiendo...' : '📎 Adjuntar fotos'}
                      </button>
                      <span style={{ fontSize: 11, color: T.text3, marginLeft: 10 }}>Podés agregar varias fotos del producto reparado</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
