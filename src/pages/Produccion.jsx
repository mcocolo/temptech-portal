import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import CorteOT from '@/components/CorteOT'
import toast from 'react-hot-toast'

// Modelos y rendimiento (cantidad de lote por defecto y hojas MPSTD6 que consume)
const MODELOS_PROD = [
  { modelo: '250w',    cantidad: 384, hojas: 48 },
  { modelo: '250w TD', cantidad: 384, hojas: 48 },
  { modelo: '500w',    cantidad: 400, hojas: 100 },
  { modelo: '500w TD', cantidad: 400, hojas: 100 },
  { modelo: '500w MB', cantidad: 400, hojas: 100 },
]
const HOJA_CODIGO = 'MPSTD6'

// Flujo de etapas — Fase 1 (hasta febrero). Cables+Kits / Eléctrica+Embalaje se suman después.
const ETAPAS = [
  { key: 'por_iniciar',  label: 'Por iniciar',            color: '#94a3b8' },
  { key: 'corte',        label: 'Corte',                  color: '#7b9fff' },
  { key: 'armado',       label: 'Aguj1 + Alambre + Pegado', color: '#38bdf8' },
  { key: 'encuadre',     label: 'Encuadre',               color: '#3dd68c' },
  { key: 'aguj2',        label: 'Aguj N°2',               color: '#a78bfa' },
  { key: 'enduido_lija', label: 'Enduido + Lija',         color: '#fbbf24' },
  { key: 'pintura',      label: 'Pintura',                color: '#fb923c' },
  { key: 'terminado',    label: 'Terminado (fase 1)',     color: '#2dd4bf' },
]
const FLUJO = ETAPAS.map(e => e.key)
const etapaLabel = k => (ETAPAS.find(e => e.key === k)?.label || k)
const etapaColor = k => (ETAPAS.find(e => e.key === k)?.color || '#888')

// Etapas "de proceso" (sin Por iniciar ni Terminado) para la matriz de estado
const ETAPAS_PROC = ETAPAS.filter(e => e.key !== 'por_iniciar' && e.key !== 'terminado')
// Estado de una etapa para un lote: 'done' (✓ completó), 'proc' (• en proceso), 'none'
function estadoEtapaLote(lote, etapaKey) {
  if (lote.etapa === 'terminado') return 'done'
  const c = FLUJO.indexOf(lote.etapa)
  const i = FLUJO.indexOf(etapaKey)
  if (i < c) return 'done'
  if (i === c) return 'proc'
  return 'none'
}
function estadoLoteLabel(lote) {
  if (lote.etapa === 'terminado') return { txt: 'Terminado', color: '#2dd4bf' }
  if (lote.etapa === 'por_iniciar') return { txt: 'Por iniciar', color: '#94a3b8' }
  return { txt: 'En proceso', color: '#fb923c' }
}
// Rellena el avance de las etapas ANTERIORES a `etapa` con la cantidad completa
function backfillAvance(existing, etapa, cantidad) {
  const c = FLUJO.indexOf(etapa)
  const av = { ...(existing || {}) }
  for (const e of ETAPAS_PROC) {
    const i = FLUJO.indexOf(e.key)
    if (etapa === 'terminado' || i < c) { if (av[e.key] == null) av[e.key] = cantidad }
  }
  return av
}

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }

export default function Produccion() {
  const { isAdmin, isAdmin2, user, profile } = useAuth()
  const [lotes, setLotes] = useState([])
  const [partes, setPartes] = useState([])
  const [ncf, setNcf] = useState([])
  const [loading, setLoading] = useState(true)
  const [nuevoOpen, setNuevoOpen] = useState(false)
  const [editandoLote, setEditandoLote] = useState(null)
  const [form, setForm] = useState({ numero: '', modelo: '500w', cantidad: 400, temporada: 2027, notas: '', etapa: 'por_iniciar' })
  const [guardando, setGuardando] = useState(false)
  const [modalParte, setModalParte] = useState(null)   // lote
  const [modalNcf, setModalNcf] = useState(null)       // lote
  const [modalAvance, setModalAvance] = useState(null) // lote (avance parcial → dividir)
  const [avanceCell, setAvanceCell] = useState(null)   // { lote, etapa } (avance dentro de una etapa)
  const [otLote, setOtLote] = useState(null)           // lote cuya OT de Corte se está cargando
  const [expandido, setExpandido] = useState(null)
  const [vista, setVista] = useState('tablero')        // tablero | listado
  const [busqueda, setBusqueda] = useState('')
  const [fModelo, setFModelo] = useState('')
  const [fTemporada, setFTemporada] = useState('')

  const nombreUsuario = profile?.full_name || user?.email || 'Producción'

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const [l, p, n] = await Promise.all([
      fetchAllRows(() => supabase.from('produccion_lotes').select('*').not('estado', 'eq', 'cancelado').order('numero')),
      fetchAllRows(() => supabase.from('produccion_partes').select('*').order('fecha', { ascending: false })),
      fetchAllRows(() => supabase.from('produccion_no_conformidades').select('*').order('created_at', { ascending: false })),
    ])
    setLotes(l || []); setPartes(p || []); setNcf(n || [])
    setLoading(false)
  }

  function abrirNuevo() {
    const maxNum = lotes.reduce((m, l) => Math.max(m, l.numero || 0), 510)
    setEditandoLote(null)
    setForm({ numero: maxNum + 1, modelo: '500w', cantidad: 400, temporada: 2027, notas: '', etapa: 'por_iniciar' })
    setNuevoOpen(true)
  }
  function abrirEditarLote(lote) {
    setEditandoLote(lote)
    setForm({ numero: lote.numero ?? '', modelo: lote.modelo, cantidad: lote.cantidad_objetivo, temporada: lote.temporada ?? '', notas: lote.notas ?? '', etapa: lote.etapa })
    setNuevoOpen(true)
  }
  function cerrarModal() { setNuevoOpen(false); setEditandoLote(null) }
  function onModelo(modelo) {
    const cfg = MODELOS_PROD.find(m => m.modelo === modelo)
    setForm(f => ({ ...f, modelo, cantidad: (!editandoLote && cfg) ? cfg.cantidad : f.cantidad }))
  }

  async function guardarLote() {
    const numero = parseInt(form.numero) || null
    const cantidad = parseInt(form.cantidad) || 0
    if (!numero) return toast.error('Ingresá el número de lote')
    if (cantidad <= 0) return toast.error('Ingresá la cantidad')
    if (lotes.some(l => l.numero === numero && l.id !== editandoLote?.id)) return toast.error(`Ya existe el lote ${numero}`)
    const cfg = MODELOS_PROD.find(m => m.modelo === form.modelo)
    const estadoDe = et => et === 'terminado' ? 'terminado' : et === 'por_iniciar' ? 'planificado' : 'en_proceso'
    setGuardando(true)
    let error
    if (editandoLote) {
      const nuevoActual = editandoLote.cantidad_actual === editandoLote.cantidad_objetivo ? cantidad : editandoLote.cantidad_actual
      const patch = {
        numero, modelo: form.modelo, cantidad_objetivo: cantidad,
        hojas: cfg?.hojas ?? editandoLote.hojas, temporada: parseInt(form.temporada) || null,
        etapa: form.etapa, estado: estadoDe(form.etapa), notas: form.notas.trim() || null,
        // Las etapas anteriores a la elegida se dan por hechas con la cantidad completa
        avance: backfillAvance(editandoLote.avance, form.etapa, nuevoActual),
      }
      if (editandoLote.cantidad_actual === editandoLote.cantidad_objetivo) patch.cantidad_actual = cantidad
      ;({ error } = await supabase.from('produccion_lotes').update(patch).eq('id', editandoLote.id))
    } else {
      ;({ error } = await supabase.from('produccion_lotes').insert({
        numero, modelo: form.modelo, cantidad_objetivo: cantidad, cantidad_actual: cantidad,
        hojas: cfg?.hojas ?? null, temporada: parseInt(form.temporada) || null,
        etapa: 'por_iniciar', estado: 'planificado', notas: form.notas.trim() || null, created_by: nombreUsuario,
      }))
    }
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(editandoLote ? `Lote ${numero} actualizado ✅` : `Lote ${numero} creado ✅`)
    cerrarModal(); cargar()
  }

  // Descuenta las hojas MPSTD6 del stock de insumos al iniciar el Corte
  async function descontarHojas(lote) {
    if (!lote.hojas) return
    try {
      const { data: ins } = await supabase.from('insumos').select('id,stock_actual').eq('codigo', HOJA_CODIGO).limit(1)
      const row = ins?.[0]
      if (!row) { toast('⚠️ No encontré el insumo ' + HOJA_CODIGO + ' para descontar', { icon: '⚠️' }); return }
      const nuevo = Math.max(0, (row.stock_actual || 0) - lote.hojas)
      await supabase.from('insumos').update({ stock_actual: nuevo, updated_at: new Date().toISOString() }).eq('id', row.id)
      await supabase.from('movimientos_insumos').insert({
        insumo_id: row.id, tipo: 'egreso', cantidad: lote.hojas, sector: 'Corte',
        motivo: `Lote ${lote.numero} · ${lote.modelo}`, usuario_id: user?.id, usuario_nombre: nombreUsuario,
      })
    } catch (e) { /* no bloquea el inicio del lote */ }
  }

  async function avanzarEtapa(lote, nuevaEtapa, descontar = false) {
    const patch = { etapa: nuevaEtapa }
    if (nuevaEtapa !== 'por_iniciar' && lote.estado === 'planificado') patch.estado = 'en_proceso'
    if (nuevaEtapa === 'terminado') patch.estado = 'terminado'
    // La etapa que se deja se da por completa con la cantidad actual
    if (ETAPAS_PROC.some(e => e.key === lote.etapa)) patch.avance = { ...(lote.avance || {}), [lote.etapa]: lote.cantidad_actual }
    const { error } = await supabase.from('produccion_lotes').update(patch).eq('id', lote.id)
    if (error) { toast.error('Error: ' + error.message); return }
    if (descontar) await descontarHojas(lote)
    cargar()
  }

  function siguienteEtapa(etapa) {
    const i = FLUJO.indexOf(etapa)
    return i >= 0 && i < FLUJO.length - 1 ? FLUJO[i + 1] : null
  }

  async function eliminarLote(lote) {
    if (!window.confirm(`¿Eliminar el lote ${lote.numero}? (se borra su historial)`)) return
    await supabase.from('produccion_lotes').delete().eq('id', lote.id)
    cargar()
  }

  if (!isAdmin && !isAdmin2) return null
  const readOnly = isAdmin2

  const lotesPorEtapa = k => lotes.filter(l => l.etapa === k)
  const partesLote = id => partes.filter(p => p.lote_id === id)
  const ncfLote = id => ncf.filter(n => n.lote_id === id)
  const avanceEtapa = (loteId, etapa) => partesLote(loteId).filter(p => p.etapa === etapa).reduce((s, p) => s + (p.cantidad || 0), 0)

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Producción</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Lotes por sector · el lote avanza etapa por etapa</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 3 }}>
            {[['tablero', '🗂 Tablero'], ['listado', '📋 Estado de lotes']].map(([v, l]) => (
              <button key={v} onClick={() => setVista(v)}
                style={{ padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', border: 'none', background: vista === v ? 'var(--brand-gradient)' : 'transparent', color: vista === v ? '#fff' : 'var(--text3)' }}>
                {l}
              </button>
            ))}
          </div>
          {!readOnly && (
            <button onClick={abrirNuevo} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Nuevo lote</button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
      ) : vista === 'tablero' ? (
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
          {ETAPAS.map(et => {
            const items = lotesPorEtapa(et.key)
            return (
              <div key={et.key} style={{ flex: '0 0 300px', width: 300, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', alignSelf: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderBottom: `2px solid ${et.color}`, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: et.color }}>{et.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '1px 9px' }}>{items.length}</span>
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 60 }}>
                  {items.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', padding: '14px 0' }}>—</div>}
                  {items.map(lote => {
                    const sig = siguienteEtapa(lote.etapa)
                    const isExp = expandido === lote.id
                    const hechoEtapa = (lote.avance && lote.avance[lote.etapa]) || 0
                    return (
                      <div key={lote.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 800 }}>#{lote.numero}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: etapaColor(lote.etapa), background: `${etapaColor(lote.etapa)}18`, border: `1px solid ${etapaColor(lote.etapa)}44`, borderRadius: 20, padding: '1px 9px' }}>{lote.modelo}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                          <b style={{ fontSize: 15 }}>{lote.cantidad_actual}</b> <span style={{ color: 'var(--text3)' }}>/ {lote.cantidad_objetivo} u.</span>
                          {lote.temporada ? <span style={{ color: 'var(--text3)' }}> · T{lote.temporada}</span> : ''}
                        </div>
                        {lote.etapa !== 'por_iniciar' && lote.etapa !== 'terminado' && (
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>Avance en {etapaLabel(lote.etapa)}: <b style={{ color: hechoEtapa >= lote.cantidad_actual ? '#3dd68c' : 'var(--text2)' }}>{hechoEtapa}/{lote.cantidad_actual}</b></div>
                        )}

                        {!readOnly && (
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 8 }}>
                            {lote.etapa === 'por_iniciar' ? (
                              <button onClick={() => setOtLote(lote)} style={btn('#7b9fff')}>📋 OT Corte</button>
                            ) : lote.etapa !== 'terminado' ? (
                              <>
                                {lote.etapa === 'corte' && <button onClick={() => setOtLote(lote)} style={btn('#7b9fff')}>📋 OT</button>}
                                <button onClick={() => setModalParte(lote)} style={btn('#3dd68c')}>＋ Parte</button>
                                <button onClick={() => setModalNcf(lote)} style={btn('#ff5577')}>⚠ No conf.</button>
                                {sig && <button onClick={() => avanzarEtapa(lote, sig)} style={btn('#fb923c')}>→ {sig === 'terminado' ? 'Terminar' : 'Avanzar'}</button>}
                                {sig && sig !== 'terminado' && <button onClick={() => setModalAvance(lote)} style={btn('var(--text3)')} title="Avanzar solo una parte (trabajo en paralelo)">⋯</button>}
                              </>
                            ) : null}
                            <button onClick={() => setExpandido(isExp ? null : lote.id)} style={btn('var(--text3)')}>{isExp ? '▲' : '📜'}</button>
                          </div>
                        )}

                        {isExp && (
                          <div style={{ marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>Trazabilidad</div>
                            {partesLote(lote.id).length === 0 && ncfLote(lote.id).length === 0 && <div style={{ fontSize: 11, color: 'var(--text3)' }}>Sin movimientos.</div>}
                            {partesLote(lote.id).map(p => (
                              <div key={p.id} style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 2 }}>📦 {etapaLabel(p.etapa)}: +{p.cantidad} · {p.fecha} {p.usuario ? `· ${p.usuario}` : ''}</div>
                            ))}
                            {ncfLote(lote.id).map(n => (
                              <div key={n.id} style={{ fontSize: 11, color: '#ff5577', marginBottom: 2 }}>⚠ {etapaLabel(n.etapa)}: -{n.cantidad}{n.recuperable ? ` (recup. ${n.cantidad_recuperada})` : ''} {n.motivo ? `· ${n.motivo}` : ''}</div>
                            ))}
                            {!readOnly && (
                              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                                <button onClick={() => abrirEditarLote(lote)} style={btn('#7b9fff')}>✏️ Editar</button>
                                <button onClick={() => eliminarLote(lote)} style={btn('#ff5577')}>🗑 Eliminar</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        (() => {
          const q = busqueda.trim()
          const modelos = [...new Set(lotes.map(l => l.modelo))].sort()
          const temporadas = [...new Set(lotes.map(l => l.temporada).filter(Boolean))].sort()
          const filtrados = lotes.filter(l =>
            (!fModelo || l.modelo === fModelo) &&
            (!fTemporada || String(l.temporada) === String(fTemporada)) &&
            (!q || String(l.numero).includes(q))
          )
          const th = { padding: '8px 6px', fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.4px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textAlign: 'center' }
          const td = { padding: '7px 6px', fontSize: 12, borderBottom: '1px solid var(--border)', textAlign: 'center' }
          return (
            <div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
                <input placeholder="🔍 N° de lote..." value={busqueda} onChange={e => setBusqueda(e.target.value)} style={{ ...iSt, width: 150 }} />
                <select value={fModelo} onChange={e => setFModelo(e.target.value)} style={{ ...iSt, width: 'auto', cursor: 'pointer' }}>
                  <option value="">Todos los modelos</option>
                  {modelos.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={fTemporada} onChange={e => setFTemporada(e.target.value)} style={{ ...iSt, width: 'auto', cursor: 'pointer' }}>
                  <option value="">Todas las temporadas</option>
                  {temporadas.map(t => <option key={t} value={t}>T{t}</option>)}
                </select>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>{filtrados.length} lotes</span>
              </div>
              <div style={{ overflowX: 'auto', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={{ ...th, textAlign: 'left', paddingLeft: 14 }}>Lote</th>
                    <th style={{ ...th, textAlign: 'left' }}>Modelo</th>
                    <th style={th}>Cant.</th>
                    {ETAPAS_PROC.map(e => <th key={e.key} style={{ ...th, color: e.color }}>{e.label}</th>)}
                    <th style={th}>Estado</th>
                    {!readOnly && <th style={th}></th>}
                  </tr></thead>
                  <tbody>
                    {filtrados.map(l => {
                      const est = estadoLoteLabel(l)
                      return (
                        <tr key={l.id} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ ...td, textAlign: 'left', paddingLeft: 14, fontWeight: 800 }}>#{l.numero}</td>
                          <td style={{ ...td, textAlign: 'left' }}><span style={{ color: etapaColor(l.etapa), fontWeight: 700 }}>{l.modelo}</span>{l.temporada ? <span style={{ color: 'var(--text3)' }}> · T{l.temporada}</span> : ''}</td>
                          <td style={td}>{l.cantidad_actual}{l.cantidad_actual !== l.cantidad_objetivo ? <span style={{ color: 'var(--text3)' }}>/{l.cantidad_objetivo}</span> : ''}</td>
                          {ETAPAS_PROC.map(e => {
                            const c = FLUJO.indexOf(l.etapa), i = FLUJO.indexOf(e.key)
                            const target = l.cantidad_actual
                            const raw = (l.avance && l.avance[e.key] != null) ? l.avance[e.key] : null
                            const completaPos = l.etapa === 'terminado' || i < c
                            const hecho = raw != null ? raw : (completaPos ? target : 0)
                            const completa = completaPos || (i === c && hecho >= target && hecho > 0)
                            const enProceso = i === c && !completa
                            const puedeClick = !readOnly && i <= c
                            let inner
                            if (completa) inner = <span style={{ color: '#3dd68c', fontWeight: 800 }}>{hecho}</span>
                            else if (enProceso && hecho > 0) inner = <span style={{ color: '#fb923c', fontWeight: 800 }}>{hecho}/{target}</span>
                            else if (enProceso) inner = <span style={{ color: '#fb923c', fontSize: 20, lineHeight: 1 }}>•</span>
                            else inner = <span style={{ color: 'var(--border2)' }}>·</span>
                            return <td key={e.key} style={{ ...td, cursor: puedeClick ? 'pointer' : 'default' }} title={puedeClick ? 'Cargar avance' : undefined}
                              onClick={puedeClick ? () => setAvanceCell({ lote: l, etapa: e.key }) : undefined}>{inner}</td>
                          })}
                          <td style={td}><span style={{ fontSize: 11, fontWeight: 700, color: est.color, background: `${est.color}18`, border: `1px solid ${est.color}44`, borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>{est.txt}</span></td>
                          {!readOnly && <td style={td}><button onClick={() => abrirEditarLote(l)} style={btn('#7b9fff')}>✏️</button></td>}
                        </tr>
                      )
                    })}
                    {filtrados.length === 0 && <tr><td colSpan={4 + ETAPAS_PROC.length + (readOnly ? 0 : 1)} style={{ ...td, padding: 30, color: 'var(--text3)' }}>Sin lotes.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()
      )}

      {/* MODAL NUEVO LOTE */}
      {nuevoOpen && (
        <Modal titulo={editandoLote ? `✏️ Editar lote #${editandoLote.numero}` : '➕ Nuevo lote'} onClose={cerrarModal}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>N° de lote *</label><input type="number" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))} placeholder="Ej: 511" style={iSt} /></div>
            <div><label style={lbl}>Temporada</label><input type="number" value={form.temporada} onChange={e => setForm(f => ({ ...f, temporada: e.target.value }))} style={iSt} /></div>
          </div>
          <div>
            <label style={lbl}>Modelo *</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MODELOS_PROD.map(m => (
                <button key={m.modelo} onClick={() => onModelo(m.modelo)}
                  style={{ padding: '7px 12px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: form.modelo === m.modelo ? 'rgba(74,108,247,0.15)' : 'var(--surface2)', color: form.modelo === m.modelo ? '#7b9fff' : 'var(--text3)', border: `1px solid ${form.modelo === m.modelo ? 'rgba(74,108,247,0.5)' : 'var(--border)'}` }}>
                  {m.modelo}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={lbl}>Cantidad *</label><input type="number" value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} style={iSt} /></div>
            <div><label style={lbl}>Hojas MPSTD6</label><input value={MODELOS_PROD.find(m => m.modelo === form.modelo)?.hojas ?? '—'} disabled style={{ ...iSt, opacity: 0.7 }} /></div>
          </div>
          {editandoLote && (
            <div>
              <label style={lbl}>Etapa</label>
              <select value={form.etapa} onChange={e => setForm(f => ({ ...f, etapa: e.target.value }))} style={{ ...iSt, cursor: 'pointer' }}>
                {ETAPAS.map(e => <option key={e.key} value={e.key}>{e.label}</option>)}
              </select>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>Podés mover el lote a cualquier etapa (ej. "Terminado" si ya se hizo hasta Pintura).</div>
            </div>
          )}
          <div><label style={lbl}>Notas</label><input value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} placeholder="Opcional" style={iSt} /></div>
          {!editandoLote && <div style={{ fontSize: 11, color: 'var(--text3)' }}>Al iniciar el Corte se descuentan las <b>{MODELOS_PROD.find(m => m.modelo === form.modelo)?.hojas}</b> hojas MPSTD6 del stock de insumos.</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={guardarLote} disabled={guardando} style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>{guardando ? 'Guardando...' : editandoLote ? '✓ Guardar cambios' : '✓ Crear lote'}</button>
            <button onClick={cerrarModal} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
          </div>
        </Modal>
      )}

      {/* MODAL PARTE DIARIO */}
      {modalParte && <ParteModal lote={modalParte} etapa={modalParte.etapa} usuario={nombreUsuario} onClose={() => setModalParte(null)} onDone={cargar} />}

      {/* MODAL NO CONFORMIDAD */}
      {modalNcf && <NcfModal lote={modalNcf} etapa={modalNcf.etapa} usuario={nombreUsuario} onClose={() => setModalNcf(null)} onDone={cargar} />}

      {/* MODAL AVANCE PARCIAL (dividir lote) */}
      {modalAvance && <AvanceParcialModal lote={modalAvance} siguiente={siguienteEtapa(modalAvance.etapa)} usuario={nombreUsuario} onClose={() => setModalAvance(null)} onDone={cargar} />}

      {/* MODAL AVANCE DENTRO DE UNA ETAPA (hecho/total) */}
      {avanceCell && <AvanceEtapaModal lote={avanceCell.lote} etapa={avanceCell.etapa} siguiente={siguienteEtapa(avanceCell.etapa)} onClose={() => setAvanceCell(null)} onDone={cargar} />}

      {/* OT DE CORTE */}
      {otLote && <CorteOT lote={otLote} onClose={() => setOtLote(null)} onDone={cargar} />}
    </div>
  )
}

function AvanceEtapaModal({ lote, etapa, siguiente, onClose, onDone }) {
  const target = lote.cantidad_actual
  const raw = (lote.avance && lote.avance[etapa] != null) ? lote.avance[etapa] : null
  const completaPos = lote.etapa === 'terminado' || FLUJO.indexOf(etapa) < FLUJO.indexOf(lote.etapa)
  const [cantidad, setCantidad] = useState(String(raw != null ? raw : (completaPos ? target : '')))
  const [g, setG] = useState(false)
  const hecho = Math.min(target, Math.max(0, parseInt(cantidad) || 0))
  const falta = Math.max(0, target - hecho)
  async function guardar() {
    setG(true)
    const nuevoAvance = { ...(lote.avance || {}), [etapa]: hecho }
    const patch = { avance: nuevoAvance }
    // Si es la etapa actual y se completó, el lote avanza a la siguiente
    if (etapa === lote.etapa && hecho >= target && siguiente) {
      patch.etapa = siguiente
      patch.estado = siguiente === 'terminado' ? 'terminado' : 'en_proceso'
    }
    const { error } = await supabase.from('produccion_lotes').update(patch).eq('id', lote.id)
    setG(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(hecho >= target ? `${etapaLabel(etapa)} completa ✅` : `Avance guardado: ${hecho}/${target}`)
    onClose(); onDone()
  }
  return (
    <Modal titulo={`Avance · Lote #${lote.numero}`} onClose={onClose}>
      <div style={{ fontSize: 13, color: 'var(--text2)' }}>Etapa: <b style={{ color: etapaColor(etapa) }}>{etapaLabel(etapa)}</b> · {lote.modelo}</div>
      <div style={{ fontSize: 13, color: 'var(--text3)' }}>Total de la etapa: <b style={{ color: 'var(--text2)' }}>{target}</b> u.</div>
      <div><label style={lbl}>Cantidad hecha en {etapaLabel(etapa)}</label><input type="number" min="0" max={target} value={cantidad} onChange={e => setCantidad(e.target.value)} style={iSt} autoFocus /></div>
      <div style={{ fontSize: 15, fontWeight: 800, color: falta > 0 ? '#fb923c' : '#3dd68c' }}>{falta > 0 ? `Falta: ${falta} u.` : '✅ Etapa completa'}</div>
      {falta === 0 && etapa === lote.etapa && siguiente && <div style={{ fontSize: 11, color: 'var(--text3)' }}>Al guardar, el lote pasa a <b>{etapaLabel(siguiente)}</b>.</div>}
      <button onClick={guardar} disabled={g} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: g ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>{g ? 'Guardando...' : 'Guardar avance'}</button>
    </Modal>
  )
}

function btn(color) {
  return { background: `${color === 'var(--text3)' ? 'var(--surface)' : color + '18'}`, color: color === 'var(--text3)' ? 'var(--text3)' : color, border: `1px solid ${color === 'var(--text3)' ? 'var(--border)' : color + '55'}`, borderRadius: 6, padding: '4px 9px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }
}

function Modal({ titulo, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{titulo}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      </div>
    </div>
  )
}

function ParteModal({ lote, etapa, usuario, onClose, onDone }) {
  const [cantidad, setCantidad] = useState('')
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState('')
  const [g, setG] = useState(false)
  async function guardar() {
    const c = parseInt(cantidad) || 0
    if (c <= 0) return toast.error('Ingresá una cantidad')
    setG(true)
    const { error } = await supabase.from('produccion_partes').insert({ lote_id: lote.id, etapa, fecha, cantidad: c, usuario, notas: notas.trim() || null })
    if (!error) {
      const prev = (lote.avance && lote.avance[etapa]) || 0
      await supabase.from('produccion_lotes').update({ avance: { ...(lote.avance || {}), [etapa]: Math.min(lote.cantidad_actual, prev + c) } }).eq('id', lote.id)
    }
    setG(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`Parte cargado: +${c} en ${etapaLabel(etapa)} ✅`)
    onClose(); onDone()
  }
  return (
    <Modal titulo={`＋ Parte · Lote #${lote.numero}`} onClose={onClose}>
      <div style={{ fontSize: 12, color: 'var(--text3)' }}>Etapa: <b style={{ color: etapaColor(etapa) }}>{etapaLabel(etapa)}</b> · {lote.modelo} · {lote.cantidad_actual} u.</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div><label style={lbl}>Cantidad hecha *</label><input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} style={iSt} autoFocus /></div>
        <div><label style={lbl}>Fecha</label><input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={iSt} /></div>
      </div>
      <div><label style={lbl}>Notas</label><input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Opcional" style={iSt} /></div>
      <button onClick={guardar} disabled={g} style={{ background: 'rgba(61,214,140,0.15)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.4)', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: g ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>{g ? 'Guardando...' : 'Guardar parte'}</button>
    </Modal>
  )
}

function NcfModal({ lote, etapa, usuario, onClose, onDone }) {
  const [cantidad, setCantidad] = useState('')
  const [motivo, setMotivo] = useState('')
  const [recuperable, setRecuperable] = useState(false)
  const [recuperada, setRecuperada] = useState('')
  const [g, setG] = useState(false)
  async function guardar() {
    const c = parseInt(cantidad) || 0
    if (c <= 0) return toast.error('Ingresá la cantidad')
    const rec = recuperable ? (parseInt(recuperada) || 0) : 0
    const baja = Math.max(0, c - rec)   // lo que se pierde definitivamente
    setG(true)
    const { error } = await supabase.from('produccion_no_conformidades').insert({ lote_id: lote.id, etapa, cantidad: c, motivo: motivo.trim() || null, recuperable, cantidad_recuperada: rec, usuario })
    if (!error) {
      const nuevo = Math.max(0, (lote.cantidad_actual || 0) - baja)
      await supabase.from('produccion_lotes').update({ cantidad_actual: nuevo }).eq('id', lote.id)
    }
    setG(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`No conformidad registrada (-${baja} u.)`)
    onClose(); onDone()
  }
  return (
    <Modal titulo={`⚠ No conformidad · Lote #${lote.numero}`} onClose={onClose}>
      <div style={{ fontSize: 12, color: 'var(--text3)' }}>Etapa: <b style={{ color: etapaColor(etapa) }}>{etapaLabel(etapa)}</b> · {lote.modelo} · actual {lote.cantidad_actual} u.</div>
      <div><label style={lbl}>Cantidad con problema *</label><input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} style={iSt} autoFocus /></div>
      <div><label style={lbl}>Motivo</label><input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: mal pegado, roto..." style={iSt} /></div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text2)' }}>
        <input type="checkbox" checked={recuperable} onChange={e => setRecuperable(e.target.checked)} style={{ width: 15, height: 15 }} />
        ¿Se puede recuperar parte?
      </label>
      {recuperable && <div><label style={lbl}>Cantidad recuperada</label><input type="number" value={recuperada} onChange={e => setRecuperada(e.target.value)} placeholder="0" style={iSt} /></div>}
      <div style={{ fontSize: 11, color: 'var(--text3)' }}>Se descuentan del lote las piezas perdidas (cantidad − recuperadas).</div>
      <button onClick={guardar} disabled={g} style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.4)', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: g ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>{g ? 'Guardando...' : 'Registrar no conformidad'}</button>
    </Modal>
  )
}

function AvanceParcialModal({ lote, siguiente, usuario, onClose, onDone }) {
  const [cantidad, setCantidad] = useState('')
  const [g, setG] = useState(false)
  async function guardar() {
    const c = parseInt(cantidad) || 0
    if (c <= 0 || c >= lote.cantidad_actual) return toast.error(`Ingresá entre 1 y ${lote.cantidad_actual - 1}`)
    setG(true)
    // Se crea un lote "hijo" con la parte que avanza; el original queda con el resto
    const { error } = await supabase.from('produccion_lotes').insert({
      numero: lote.numero, modelo: lote.modelo, cantidad_objetivo: c, cantidad_actual: c,
      hojas: null, temporada: lote.temporada, etapa: siguiente, estado: 'en_proceso',
      notas: `Parcial de lote ${lote.numero}`, created_by: usuario,
    })
    if (!error) await supabase.from('produccion_lotes').update({ cantidad_actual: lote.cantidad_actual - c }).eq('id', lote.id)
    setG(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success(`Avanzaron ${c} u. a ${etapaLabel(siguiente)}`)
    onClose(); onDone()
  }
  return (
    <Modal titulo={`⋯ Avance parcial · Lote #${lote.numero}`} onClose={onClose}>
      <div style={{ fontSize: 12, color: 'var(--text3)' }}>Pasás una parte a <b style={{ color: etapaColor(siguiente) }}>{etapaLabel(siguiente)}</b>; el resto queda en {etapaLabel(lote.etapa)}.</div>
      <div><label style={lbl}>Cantidad que avanza (de {lote.cantidad_actual})</label><input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} style={iSt} autoFocus /></div>
      <button onClick={guardar} disabled={g} style={{ background: 'rgba(251,146,60,0.15)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.4)', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: g ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>{g ? 'Guardando...' : 'Avanzar parcial'}</button>
    </Modal>
  )
}
