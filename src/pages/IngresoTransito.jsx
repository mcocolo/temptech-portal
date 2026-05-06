import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const CATALOGO = [
  {
    categoria: 'calefones_calderas', label: 'Calefones / Calderas',
    productos: [
      { codigo: 'KF70SIL',     nombre: 'Calefón One',    modelo: '3,5/5,5/7Kw 220V Silver' },
      { codigo: 'FE150TBLACK', nombre: 'Calefón Nova',   modelo: '6/8/9/13,5Kw 220V Black' },
      { codigo: 'FE150TSIL',   nombre: 'Calefón Nova',   modelo: '6/8/9/13,5Kw 220V Silver' },
      { codigo: 'FE150TBL',    nombre: 'Calefón Nova',   modelo: '6/8/9/13,5Kw 220V Blanco' },
      { codigo: 'FM318BL',     nombre: 'Calefón Pulse',  modelo: '9/13,5/18Kw 380V Blanco' },
      { codigo: 'FM324BL',     nombre: 'Calefón Pulse',  modelo: '12/18/24Kw 380V Blanco' },
      { codigo: 'BF14EBL',     nombre: 'Caldera Core',   modelo: '220-380V 14,4Kw Blanco' },
      { codigo: 'BF323EBL',    nombre: 'Caldera Core',   modelo: '380V 23Kw Blanco' },
    ],
  },
  {
    categoria: 'paneles_calefactores', label: 'Paneles Calefactores',
    productos: [
      { codigo: 'C250STV1',     nombre: 'Slim', modelo: '250w' },
      { codigo: 'C250STV1TS',   nombre: 'Slim', modelo: '250w Toallero Simple' },
      { codigo: 'C250STV1TD',   nombre: 'Slim', modelo: '250w Toallero Doble' },
      { codigo: 'C500STV1',     nombre: 'Slim', modelo: '500w' },
      { codigo: 'C500STV1TS',   nombre: 'Slim', modelo: '500w Toallero Simple' },
      { codigo: 'C500STV1TD',   nombre: 'Slim', modelo: '500w Toallero Doble' },
      { codigo: 'C500STV1MB',   nombre: 'Slim', modelo: '500w Madera Blanca' },
      { codigo: 'F1400BCO',     nombre: 'Firenze', modelo: '1400w Blanco' },
      { codigo: 'F1400MB',      nombre: 'Firenze', modelo: '1400w Madera Blanca' },
      { codigo: 'F1400MV',      nombre: 'Firenze', modelo: '1400w Madera Veteada' },
      { codigo: 'F1400PA',      nombre: 'Firenze', modelo: '1400w Piedra Azteca' },
      { codigo: 'F1400PR',      nombre: 'Firenze', modelo: '1400w Piedra Romana' },
      { codigo: 'F1400MTG',     nombre: 'Firenze', modelo: '1400w Mármol Traviatta Gris' },
      { codigo: 'F1400PCL',     nombre: 'Firenze', modelo: '1400w Piedra Cantera Luna' },
      { codigo: 'F1400MCO',     nombre: 'Firenze', modelo: '1400w Mármol Calacatta Ocre' },
      { codigo: 'F1400SMARTBL', nombre: 'Firenze Smart', modelo: '1400w Smart Wifi' },
    ],
  },
  {
    categoria: 'anafes', label: 'Anafes',
    productos: [
      { codigo: 'K40010', nombre: 'Anafe Inducción + Extractor',  modelo: '4 Hornallas Touch' },
      { codigo: 'K40011', nombre: 'Anafe Inducción + Extractor',  modelo: '4 Hornallas Knob' },
      { codigo: 'DT4',    nombre: 'Anafe Infrarrojo + Extractor', modelo: '4 Hornallas Touch' },
      { codigo: 'DT4W',   nombre: 'Anafe Infrarrojo + Extractor', modelo: '4 Hornallas Knob' },
      { codigo: 'K1002',  nombre: 'Anafe Inducción',              modelo: '2 Hornallas Touch' },
      { codigo: 'K2002',  nombre: 'Anafe Infrarrojo',             modelo: '2 Hornallas Knob' },
      { codigo: 'DT4-1',  nombre: 'Anafe Inducción',              modelo: '4 Hornallas Touch' },
    ],
  },
]

const TODOS = CATALOGO.flatMap(c => c.productos.map(p => ({ ...p, categoria: c.categoria })))

const CANALES = [
  { key: 'Meli',   label: 'Mercado Libre', color: '#ffd166', emoji: '🛒' },
  { key: 'Página', label: 'Página Web',    color: '#7b9fff', emoji: '🌐' },
  { key: 'VO',     label: 'VO',            color: '#3dd68c', emoji: '📦' },
]

const CANAL_FROM_PATH = { '/ingreso-transito/meli': 'Meli', '/ingreso-transito/pagina': 'Página', '/ingreso-transito/vo': 'VO' }

const inputSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }

function formatFecha(d) {
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: es }) } catch { return '' }
}

export default function IngresoTransito() {
  const { user, profile, isAdmin, isAdmin2 } = useAuth()
  const location = useLocation()

  const canalFromPath = CANAL_FROM_PATH[location.pathname]
  const [canal, setCanal] = useState(canalFromPath || 'Meli')

  useEffect(() => {
    if (canalFromPath) setCanal(canalFromPath)
  }, [location.pathname])

  // Form
  const [fecha, setFecha]     = useState(() => new Date().toISOString().split('T')[0])
  const [items, setItems]     = useState([{ codigo: '', nombre: '', modelo: '', categoria: '', cantidad: 1 }])
  const [obs, setObs]         = useState('')
  const [guardando, setGuardando] = useState(false)

  // Historial
  const [historial, setHistorial] = useState([])
  const [loadingHist, setLoadingHist] = useState(true)

  useEffect(() => { cargarHistorial() }, [])

  async function cargarHistorial() {
    setLoadingHist(true)
    const { data } = await supabase
      .from('ingresos_transito')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setHistorial(data || [])
    setLoadingHist(false)
  }

  function selectProducto(idx, codigo) {
    const prod = TODOS.find(p => p.codigo === codigo)
    setItems(prev => prev.map((it, i) => i !== idx ? it : prod
      ? { codigo: prod.codigo, nombre: prod.nombre, modelo: prod.modelo, categoria: prod.categoria, cantidad: it.cantidad || 1 }
      : { ...it, codigo, nombre: '', modelo: '', categoria: '' }
    ))
  }

  async function registrar() {
    const validos = items.filter(it => it.codigo && parseInt(it.cantidad) > 0)
    if (!validos.length) return toast.error('Agregá al menos un producto con cantidad')
    setGuardando(true)
    const { error } = await supabase.from('ingresos_transito').insert({
      canal,
      fecha,
      items: validos.map(it => ({ ...it, cantidad: parseInt(it.cantidad) })),
      observacion: obs.trim() || null,
      estado: 'pendiente',
      usuario_id: user.id,
      usuario_nombre: profile?.full_name || user.email,
    })
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('✅ Ingreso en tránsito registrado')
    setItems([{ codigo: '', nombre: '', modelo: '', categoria: '', cantidad: 1 }])
    setObs('')
    setFecha(new Date().toISOString().split('T')[0])
    cargarHistorial()
  }

  const canalInfo = CANALES.find(c => c.key === canal)

  const ESTADO_CFG = {
    pendiente:   { label: 'Pendiente',   color: '#ffd166', bg: 'rgba(255,209,102,0.12)' },
    confirmado:  { label: 'Confirmado',  color: '#3dd68c', bg: 'rgba(61,214,140,0.12)' },
  }

  if (!isAdmin && !isAdmin2) return null

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 4 }}>
          🚛 Ingreso en Tránsito
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>
          Mercadería no entregada de canales de venta que vuelve a stock
        </div>
      </div>

      {/* Canal selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {CANALES.map(c => (
          <button
            key={c.key}
            onClick={() => setCanal(c.key)}
            style={{
              padding: '9px 20px', borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font)', border: `1.5px solid ${canal === c.key ? c.color : 'var(--border)'}`,
              background: canal === c.key ? `${c.color}18` : 'var(--surface2)',
              color: canal === c.key ? c.color : 'var(--text3)',
            }}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Form card */}
      <div style={{ background: 'var(--surface)', border: `1px solid ${canalInfo.color}40`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ padding: '14px 20px', borderBottom: `1px solid ${canalInfo.color}30`, background: `${canalInfo.color}0a`, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: canalInfo.color }}>{canalInfo.emoji} Registrar Ingreso — {canalInfo.label}</span>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Fecha */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={{ ...inputSt, maxWidth: 200 }} />
          </div>

          {/* Productos */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Productos</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map((it, idx) => (
                <div key={idx} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 12 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* Selector */}
                    <div style={{ flex: 1 }}>
                      <select
                        value={it.codigo}
                        onChange={e => selectProducto(idx, e.target.value)}
                        style={{ ...inputSt, fontSize: 12 }}
                      >
                        <option value="">— Seleccionar producto —</option>
                        {CATALOGO.map(cat => (
                          <optgroup key={cat.categoria} label={cat.label}>
                            {cat.productos.map(p => (
                              <option key={p.codigo} value={p.codigo}>{p.codigo} — {p.nombre} {p.modelo}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    {/* Cantidad */}
                    <div style={{ width: 90 }}>
                      <input
                        type="number" min="1"
                        value={it.cantidad}
                        onChange={e => setItems(prev => prev.map((p, i) => i !== idx ? p : { ...p, cantidad: parseInt(e.target.value) || 1 }))}
                        style={{ ...inputSt, textAlign: 'center', fontWeight: 700 }}
                      />
                    </div>
                    {/* Quitar */}
                    {items.length > 1 && (
                      <button
                        onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                        style={{ background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, color: '#ff5577', cursor: 'pointer', padding: '9px 10px', fontFamily: 'var(--font)' }}
                      >×</button>
                    )}
                  </div>
                  {/* Badge producto seleccionado */}
                  {it.codigo && (
                    <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                      <span style={{ fontSize: 11, background: 'rgba(74,108,247,0.12)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.25)', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>{it.codigo}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{it.nombre} — {it.modelo}</span>
                    </div>
                  )}
                </div>
              ))}
              <button
                onClick={() => setItems(prev => [...prev, { codigo: '', nombre: '', modelo: '', categoria: '', cantidad: 1 }])}
                style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(61,214,140,0.08)', border: '1px dashed rgba(61,214,140,0.4)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 600, color: '#3dd68c', cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                + Agregar producto
              </button>
            </div>
          </div>

          {/* Observación */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Observación</label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Motivo, número de orden, aclaraciones..."
              rows={2}
              style={{ ...inputSt, resize: 'vertical', lineHeight: 1.5 }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={registrar}
            disabled={guardando}
            style={{ background: `linear-gradient(135deg, ${canalInfo.color}, ${canalInfo.color}cc)`, color: '#0a0a0a', border: 'none', borderRadius: 'var(--radius)', padding: '12px', fontSize: 14, fontWeight: 800, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}
          >
            {guardando ? '⏳ Registrando...' : `🚛 Registrar en Tránsito`}
          </button>

        </div>
      </div>

      {/* Historial */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Historial de Ingresos en Tránsito
        </div>

        {loadingHist ? (
          <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 32 }}>Cargando...</div>
        ) : historial.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 32, fontSize: 13 }}>No hay registros aún</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historial.map(h => {
              const cInfo = CANALES.find(c => c.key === h.canal) || { color: '#7b9fff', emoji: '📦', label: h.canal }
              const eCfg = ESTADO_CFG[h.estado] || ESTADO_CFG.pendiente
              return (
                <div key={h.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: cInfo.color, background: `${cInfo.color}15`, border: `1px solid ${cInfo.color}40`, borderRadius: 6, padding: '3px 10px' }}>{cInfo.emoji} {cInfo.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: eCfg.color, background: eCfg.bg, borderRadius: 6, padding: '3px 10px' }}>{eCfg.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(h.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>{formatFecha(h.created_at)}</span>
                  </div>

                  {/* Items */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: h.observacion ? 8 : 0 }}>
                    {(h.items || []).map((it, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4 }}>{it.codigo}</span>
                        <span style={{ color: 'var(--text2)' }}>{it.nombre}</span>
                        <span style={{ color: 'var(--text3)', fontSize: 11 }}>{it.modelo}</span>
                        <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--text)' }}>×{it.cantidad}</span>
                      </div>
                    ))}
                  </div>

                  {h.observacion && (
                    <div style={{ fontSize: 12, color: 'var(--text3)', padding: '6px 10px', background: 'var(--surface2)', borderRadius: 6, marginTop: 6 }}>
                      {h.observacion}
                    </div>
                  )}

                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)' }}>
                    Registrado por <strong style={{ color: 'var(--text2)' }}>{h.usuario_nombre}</strong>
                    {h.confirmado_por && <span> · Confirmado por <strong style={{ color: '#3dd68c' }}>{h.confirmado_por}</strong></span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
