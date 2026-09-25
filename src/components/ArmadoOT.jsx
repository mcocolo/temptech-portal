import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }
const lbl = { fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4, letterSpacing: '0.3px' }
const int = v => parseInt(v) || 0
const num = v => parseFloat(v) || 0   // cantidades de insumo pueden ser decimales (ej. 0,94 kg)

// Duración: usa los horarios cargados (sin topar) y descuenta las pausas configurables
const DEFAULT_BREAKS = [[540, 555], [660, 665], [780, 810], [900, 905]]
const hm = s => { if (!s) return null; const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0) }
const overlap = (a1, a2, b1, b2) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1))
// Cada jornada es de un solo día: dura (fin - inicio) menos las pausas que se solapan
function calcularDuracion(fi, hi, ff, hf, breaks = DEFAULT_BREAKS) {
  const a = hm(hi), b = hm(hf)
  if (a == null || b == null || b < a) return null
  let mins = b - a
  for (const [b1, b2] of breaks) mins -= overlap(a, b, b1, b2)
  return Math.max(0, mins)
}
const fmtDur = m => m == null ? '—' : `${Math.floor(m / 60)}h ${m % 60}m`

const ESTACIONES = ['E1', 'E2', 'E3', 'E4', 'E5']
const ESTACION_LABEL = { E1: 'E1 · Molde + Alimentación', E2: 'E2 · Cinta + Prensa', E3: 'E3 · Terminación', E4: 'E4 · Terminación + Alim.', E5: 'E5 · Silicona + Prensa (Pegado)' }
const COLS = ['E1', 'E2', 'E3', 'E4', 'E5']
const SECTORES_ARMADO_INS = ['Alambre', 'Pegado']   // sectores (de Insumos) que usa el armado
const FALLBACK_INS = [
  { cod: 'CP12STI', label: 'Cinta papel 12' }, { cod: 'CP24STI', label: 'Cinta papel 24' }, { cod: 'CP48STI', label: 'Cinta papel 48' },
  { cod: 'CROMALNB025', label: 'Aluminio 0,25' }, { cod: 'CROMALNB04', label: 'Aluminio 0,4' }, { cod: 'SILNPT280', label: 'Silicona' }, { cod: 'RECFIB20', label: 'Fibrado' },
]
const FASES = [['aguj1', 'Aguj N°1'], ['alambre', 'Alambre'], ['pegado', 'Pegado']]
const TUBOS = Array.from({ length: 12 }, (_, i) => i + 1)

const emptyEst = () => ({ E1: '', E2: '', E3: '', E4: '', E5: '', lote: '' })
const FDEF = {
  // Una sola fecha de inicio para todo el sector; jornadas de trabajo por día; fecha fin = registro
  fechaInicio: '', fechaFin: '',
  jornadas: [{ fecha: '', hi: '', hf: '' }],
  personalEst: { E1: [], E2: [], E3: [], E4: [], E5: [] },
  mechas: [{ cod: 'MM2', lote: '', agujeros: '' }, { cod: 'MM2', lote: '', agujeros: '' }, { cod: 'MM3', lote: '', agujeros: '' }, { cod: 'MM3', lote: '', agujeros: '' }],
  tubos: [], maqSil1: '', maqSil2: '', prensaAlambre: '', maquinasUsadas: [],
  prodDiaria: { E3: [{ fecha: '', cant: '' }], E4: [{ fecha: '', cant: '' }] },  // terminación: cuánto por día
  insumosEst: {},
  prensas: { P1: { cant: '', pres: '' }, P2: { cant: '', pres: '' }, P3: { cant: '', pres: '' }, P4: { cant: '', pres: '' } },
  conforme: '', no_conforme: '', notas: '',
}
const clone = o => JSON.parse(JSON.stringify(o))

// Nivel de módulo (NO dentro del componente) para no re-montar y perder el foco al tipear
const Sec = ({ t, children }) => <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>{t}</div>{children}</div>

export default function ArmadoOT({ lote, onClose, onDone }) {
  const { user, profile } = useAuth()
  const nombreUsuario = profile?.full_name || user?.email || 'Producción'
  const target = lote.cantidad_actual || lote.cantidad_objetivo
  const [empleados, setEmpleados] = useState([])
  const [insumosCat, setInsumosCat] = useState(FALLBACK_INS)
  const [allInsumos, setAllInsumos] = useState([])   // todos los insumos directos (para buscar/agregar)
  const [extraCods, setExtraCods] = useState([])     // insumos agregados a mano
  const [removedCods, setRemovedCods] = useState([]) // insumos quitados de la tabla
  const [buscarIns, setBuscarIns] = useState('')
  const [prevOt, setPrevOt] = useState(null)
  const [maquinas, setMaquinas] = useState([])   // máquinas para el checklist (Maq-Sil / Prensa)
  const [herrLotes, setHerrLotes] = useState({}) // codigo -> [lotes] (herramental activo, para elegir en las mechas)
  const [g, setG] = useState(false)
  const [pausas, setPausas] = useState(DEFAULT_BREAKS)
  const [f, setF] = useState(clone(FDEF))

  useEffect(() => { cargar() }, [])
  async function cargar() {
    const [e, ins, ot, pau, maq, herr] = await Promise.all([
      supabase.from('empleados').select('apodo,nombre,sectores').eq('activo', true).order('apodo'),
      supabase.from('insumos').select('*').eq('tipo', 'directo').order('codigo'),
      supabase.from('produccion_ot').select('*').eq('lote_id', lote.id).eq('etapa', 'armado').maybeSingle(),
      supabase.from('pausas_produccion').select('desde,hasta,activo').eq('activo', true),
      supabase.from('maquinas').select('id,nombre,codigo,sigla,sectores,estado_vida').order('nombre'),
      supabase.from('herramental').select('codigo,lote,estado_vida'),
    ])
    if (pau.data && pau.data.length) setPausas(pau.data.map(p => [hm(p.desde), hm(p.hasta)]).filter(x => x[0] != null && x[1] != null))
    const maqAct = (maq.data || []).filter(m => !['discontinuado', 'eliminado'].includes(m.estado_vida))
    // Solo las máquinas con el sector "Alambre" (las que se cargan para esta etapa)
    setMaquinas(maqAct.filter(m => (m.sectores || []).includes('Alambre')))
    const lm = {}
    for (const h of (herr.data || [])) {
      if (['discontinuado', 'eliminado'].includes(h.estado_vida) || !h.codigo || !h.lote) continue
      const c = String(h.codigo).trim(); (lm[c] = lm[c] || []).push(String(h.lote).trim())
    }
    for (const k of Object.keys(lm)) lm[k] = [...new Set(lm[k])].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    setHerrLotes(lm)
    setEmpleados((e.data || []).filter(x => !(x.sectores || []).length || ['Armado', 'Alambre'].some(s => x.sectores.includes(s))))
    const arm = (ins.data || []).filter(i => !i.discontinuado && Array.isArray(i.sectores) && i.sectores.some(s => SECTORES_ARMADO_INS.includes(s)))
    setInsumosCat(arm.length ? arm.map(i => ({ cod: i.codigo, label: i.descripcion || i.codigo })) : FALLBACK_INS)
    setAllInsumos((ins.data || []).filter(i => !i.discontinuado).map(i => ({ cod: i.codigo, label: i.descripcion || i.codigo, unidad: i.unidad || '' })))
    if (ot.data) {
      setPrevOt(ot.data)
      const d = ot.data.datos || {}
      setExtraCods(Array.isArray(d.extraCods) ? d.extraCods : [])
      setRemovedCods(Array.isArray(d.removedCods) ? d.removedCods : [])
      setF({
        ...clone(FDEF), ...d,
        fechaInicio: d.fechaInicio ?? ot.data.fecha_inicio ?? '',
        fechaFin: d.fechaFin ?? ot.data.fecha_fin ?? '',
        jornadas: Array.isArray(d.jornadas) && d.jornadas.length ? d.jornadas : clone(FDEF.jornadas),
        personalEst: { ...FDEF.personalEst, ...(d.personalEst || {}) },
        mechas: d.mechas || clone(FDEF.mechas),
        prodDiaria: { E3: d.prodDiaria?.E3?.length ? d.prodDiaria.E3 : clone(FDEF.prodDiaria.E3), E4: d.prodDiaria?.E4?.length ? d.prodDiaria.E4 : clone(FDEF.prodDiaria.E4) },
        insumosEst: { ...(d.insumosEst || {}) },
        prensas: { ...FDEF.prensas, ...(d.prensas || {}) },
        conforme: ot.data.piezas ?? d.conforme ?? '', no_conforme: d.no_conforme ?? '', notas: ot.data.notas || '',
      })
    }
  }

  const setD = (path, val) => setF(s => { const n = clone(s); let o = n; const ks = path.split('.'); for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = val; return n })
  const togglePers = (est, ap) => setF(s => { const n = clone(s); const arr = n.personalEst[est]; n.personalEst[est] = arr.includes(ap) ? arr.filter(x => x !== ap) : [...arr, ap]; return n })
  const toggleTubo = t => setF(s => { const n = clone(s); n.tubos = n.tubos.includes(t) ? n.tubos.filter(x => x !== t) : [...n.tubos, t]; return n })
  const toggleMaquina = id => setF(s => { const n = clone(s); const arr = n.maquinasUsadas || []; n.maquinasUsadas = arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]; return n })
  const addProdDia = est => setF(s => { const n = clone(s); n.prodDiaria[est] = [...(n.prodDiaria[est] || []), { fecha: '', cant: '' }]; return n })
  const setProdDia = (est, i, campo, val) => setF(s => { const n = clone(s); n.prodDiaria[est][i][campo] = val; return n })
  const delProdDia = (est, i) => setF(s => { const n = clone(s); n.prodDiaria[est] = n.prodDiaria[est].filter((_, j) => j !== i); if (!n.prodDiaria[est].length) n.prodDiaria[est] = [{ fecha: '', cant: '' }]; return n })
  const sumProd = est => (f.prodDiaria?.[est] || []).reduce((s, r) => s + int(r.cant), 0)
  const setInsEst = (cod, col, val) => setF(s => { const n = clone(s); if (!n.insumosEst[cod]) n.insumosEst[cod] = emptyEst(); n.insumosEst[cod][col] = val; return n })

  const conforme = int(f.conforme)
  // Día de cada jornada: la primera usa la Fecha de Inicio; las siguientes su propia fecha
  const diaJornada = (j, i) => (i === 0 ? (j.fecha || f.fechaInicio) : (j.fecha || f.fechaInicio))
  const duracion = f.jornadas.reduce((sum, j, i) => { const dia = diaJornada(j, i); return sum + (calcularDuracion(dia, j.hi, dia, j.hf, pausas) || 0) }, 0) || null
  const setJornada = (i, campo, val) => setF(s => { const n = clone(s); n.jornadas[i][campo] = val; return n })
  const addJornada = () => setF(s => ({ ...s, jornadas: [...s.jornadas, { fecha: '', hi: '', hf: '' }] }))
  const delJornada = i => setF(s => ({ ...s, jornadas: s.jornadas.length > 1 ? s.jornadas.filter((_, j) => j !== i) : s.jornadas }))

  const totalInsumo = cod => COLS.reduce((s, c) => s + num(f.insumosEst[cod]?.[c]), 0)

  const round3 = n => Math.round(n * 1000) / 1000
  async function descontar(codigo, delta, lote_ins, motivo) {
    if (!codigo || !delta) return
    try {
      const { data: ins } = await supabase.from('insumos').select('id,stock_actual').eq('codigo', codigo).limit(1)
      const row = ins?.[0]
      if (row) {
        await supabase.from('insumos').update({ stock_actual: round3((row.stock_actual || 0) - delta), updated_at: new Date().toISOString() }).eq('id', row.id)
        await supabase.from('movimientos_insumos').insert({ insumo_id: row.id, tipo: delta > 0 ? 'egreso' : 'ingreso', cantidad: round3(Math.abs(delta)), sector: 'Alambre', motivo: motivo || `OT Alambre · Lote #${lote.numero}`, lote: lote_ins || null, usuario_id: user?.id, usuario_nombre: nombreUsuario })
      }
    } catch (_) { /* no bloquea */ }
  }

  async function guardar() {
    setG(true)
    // ── Reconciliar créditos (agujeros de mechas, usos de máquinas/tubos) por objetivo, no por delta global ──
    // Así, si cambia a qué lote/máquina/tubo va, se reversa lo anterior y se aplica a lo nuevo.
    const colAguj = (lote.modelo || '').includes('1400') ? 'agujeros_1400w' : (lote.modelo || '').includes('250') ? 'agujeros_250w' : 'agujeros_500w'
    const colUsos = (lote.modelo || '').includes('1400') ? 'usos_1400w_t' : (lote.modelo || '').includes('250') ? 'usos_250w' : 'usos_500w'
    const prevD = prevOt?.datos || {}
    const credF = int(prevD.agujCreditF)   // migración desde el esquema viejo (crédito único)
    const prevAguj = (prevD.agujCredit && typeof prevD.agujCredit === 'object') ? { ...prevD.agujCredit }
      : Object.fromEntries((prevD.mechas || []).filter(m => m.cod && String(m.lote || '').trim()).map(m => [`${m.cod}|${String(m.lote).trim()}`, credF]))
    const prevMaq = (prevD.maqCredit && typeof prevD.maqCredit === 'object') ? { ...prevD.maqCredit }
      : Object.fromEntries((prevD.maquinasUsadas || []).map(id => [id, credF]))
    const prevTubo = (prevD.tuboCredit && typeof prevD.tuboCredit === 'object') ? { ...prevD.tuboCredit }
      : Object.fromEntries((prevD.tubos || []).map(t => [String(t), credF]))
    const curAguj = Object.fromEntries(f.mechas.filter(m => m.cod && String(m.lote || '').trim()).map(m => [`${m.cod}|${String(m.lote).trim()}`, conforme]))
    const curMaq = Object.fromEntries((f.maquinasUsadas || []).map(id => [id, conforme]))
    const curTubo = Object.fromEntries((f.tubos || []).map(t => [String(t), conforme]))
    const acciones = []
    const nuevoAguj = {}, nuevoMaq = {}, nuevoTubo = {}
    for (const k of new Set([...Object.keys(prevAguj), ...Object.keys(curAguj)])) {
      const obj = k in curAguj ? curAguj[k] : 0, d = obj - int(prevAguj[k]); const [cod, l] = k.split('|')
      if (d) acciones.push({ t: 'herr', cod, lote: l, col: colAguj, delta: d }); if (obj) nuevoAguj[k] = obj
    }
    for (const k of new Set([...Object.keys(prevMaq), ...Object.keys(curMaq)])) {
      const obj = k in curMaq ? curMaq[k] : 0, d = obj - int(prevMaq[k])
      if (d) acciones.push({ t: 'maq', id: k, delta: d }); if (obj) nuevoMaq[k] = obj
    }
    for (const k of new Set([...Object.keys(prevTubo), ...Object.keys(curTubo)])) {
      const obj = k in curTubo ? curTubo[k] : 0, d = obj - int(prevTubo[k])
      if (d) acciones.push({ t: 'herr', cod: `TubAl${k}`, col: colUsos, delta: d }); if (obj) nuevoTubo[k] = obj
    }

    const datos = { fechaInicio: f.fechaInicio, fechaFin: f.fechaFin, jornadas: f.jornadas, personalEst: f.personalEst, mechas: f.mechas, tubos: f.tubos, maqSil1: f.maqSil1, maqSil2: f.maqSil2, prensaAlambre: f.prensaAlambre, maquinasUsadas: f.maquinasUsadas, prodDiaria: f.prodDiaria, insumosEst: f.insumosEst, prensas: f.prensas, no_conforme: int(f.no_conforme), extraCods, removedCods, agujCreditF: conforme, agujCredit: nuevoAguj, maqCredit: nuevoMaq, tuboCredit: nuevoTubo }
    const personalPlano = [...new Set(ESTACIONES.flatMap(e => f.personalEst[e]))]
    const ultJor = f.jornadas[f.jornadas.length - 1] || {}
    const payload = {
      lote_id: lote.id, etapa: 'armado',
      fecha_inicio: f.fechaInicio || null, hora_inicio: f.jornadas[0]?.hi || null,
      fecha_fin: f.fechaFin || ultJor.fecha || f.fechaInicio || null, hora_fin: ultJor.hf || null,
      personal: personalPlano, piezas: conforme, duracion_min: duracion, notas: f.notas.trim() || null,
      datos,
      ...(prevOt ? {} : { creado_por: nombreUsuario }),
      modificado_por: nombreUsuario, modificado_por_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('produccion_ot').upsert(payload, { onConflict: 'lote_id,etapa' })
    if (error) { setG(false); toast.error('Error: ' + error.message); return }

    // Descontar insumos por el delta respecto de lo ya descontado (incluye los agregados a mano)
    // y dejar un registro de consumo: "Consumo: xxx <unidad> · Lote <lote> · <paneles> paneles · <fecha>"
    const prev = prevOt?.datos || {}
    const prevTot = cod => COLS.reduce((s, c) => s + num(prev.insumosEst?.[cod]?.[c]), 0)
    const codsUsados = [...new Set([...insumosCat.map(x => x.cod), ...Object.keys(f.insumosEst || {})])]
    const uniDe = Object.fromEntries(allInsumos.map(x => [x.cod, x.unidad || '']))
    const fechaHoy = new Date().toLocaleDateString('es-AR')
    for (const cod of codsUsados) {
      const total = totalInsumo(cod)
      const loteIns = f.insumosEst[cod]?.lote || '—'
      const motivo = `OT Alambre · Lote #${lote.numero} · Consumo: ${total} ${uniDe[cod] || ''}`.trim() + ` · Lote ${loteIns} · ${conforme} paneles · ${fechaHoy}`
      await descontar(cod, total - prevTot(cod), f.insumosEst[cod]?.lote, motivo)
    }

    // Aplicar la reconciliación de agujeros/usos (mechas, máquinas, tubos)
    for (const a of acciones) {
      try {
        if (a.t === 'maq') {
          const { data: mq } = await supabase.from('maquinas').select('id,usos_paneles').eq('id', a.id).single()
          if (mq) await supabase.from('maquinas').update({ usos_paneles: Math.max(0, (mq.usos_paneles || 0) + a.delta) }).eq('id', a.id)
        } else {
          let query = supabase.from('herramental').select(`id,${a.col}`).eq('codigo', a.cod)
          if (a.lote != null) query = query.eq('lote', a.lote)
          const { data: hr } = await query.limit(1)
          if (hr?.[0]) await supabase.from('herramental').update({ [a.col]: Math.max(0, (hr[0][a.col] || 0) + a.delta) }).eq('id', hr[0].id)
        }
      } catch (_) { /* no bloquea */ }
    }

    // Actualizar el lote: avance de armado = conforme; si completó, pasa a Encuadre
    const completo = conforme >= target && conforme > 0
    await supabase.from('produccion_lotes').update({
      avance: { ...(lote.avance || {}), armado: conforme },
      etapa: completo ? 'encuadre' : 'armado', estado: 'en_proceso',
      cantidad_actual: conforme > 0 ? conforme : lote.cantidad_actual,
      modificado_por: nombreUsuario, modificado_por_at: new Date().toISOString(),
    }).eq('id', lote.id)

    setG(false)
    toast.success('OT de Armado guardada ✅')
    onClose(); onDone()
  }


  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 820, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>🧵 OT Alambre · Lote #{lote.numero}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{lote.modelo} · {target} u. a trabajar (viene de Corte)</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Tiempos: 1 fecha de inicio para todo el sector + jornadas por día */}
          <Sec t="⏱ Tiempos de trabajo (Aguj1 + Alambre + Pegado)">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <label style={lbl}>Fecha de inicio del sector</label>
                <input key={'ini' + f.fechaInicio} type="date" defaultValue={f.fechaInicio} onBlur={e => setF(s => ({ ...s, fechaInicio: e.target.value }))} style={{ ...iSt, maxWidth: 180 }} />
              </div>
              <span style={{ fontSize: 12 }}>Duración total: <b style={{ color: '#7b9fff' }}>{fmtDur(duracion)}</b></span>
            </div>
            <label style={lbl}>Jornadas (si no se termina, se suma otro día)</label>
            {f.jornadas.map((j, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <input key={'jf' + i + (i === 0 ? f.fechaInicio : j.fecha)} type="date" defaultValue={i === 0 ? (j.fecha || f.fechaInicio) : j.fecha} onBlur={e => setJornada(i, 'fecha', e.target.value)} style={iSt} title="Día" />
                <input key={'jhi' + i + j.hi} type="time" defaultValue={j.hi} onBlur={e => setJornada(i, 'hi', e.target.value)} style={iSt} title="Hora inicio" />
                <input key={'jhf' + i + j.hf} type="time" defaultValue={j.hf} onBlur={e => setJornada(i, 'hf', e.target.value)} style={iSt} title="Hora fin" />
                {f.jornadas.length > 1 ? <button onClick={() => delJornada(i)} style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', fontSize: 18 }}>×</button> : <span />}
              </div>
            ))}
            <button onClick={addJornada} style={{ fontSize: 11, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font)', marginTop: 2 }}>+ Agregar jornada (otro día)</button>
            <div style={{ marginTop: 10 }}>
              <label style={lbl}>Fecha de finalización (registro)</label>
              <input key={'fin' + f.fechaFin} type="date" defaultValue={f.fechaFin} onBlur={e => setF(s => ({ ...s, fechaFin: e.target.value }))} style={{ ...iSt, maxWidth: 180 }} />
            </div>
          </Sec>

          {/* Personal por estación */}
          <Sec t="👷 Personal por estación">
            {ESTACIONES.map(est => (
              <div key={est} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>{ESTACION_LABEL[est]}</div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  {empleados.map(e => { const sel = f.personalEst[est].includes(e.apodo); return (
                    <button key={e.apodo} onClick={() => togglePers(est, e.apodo)} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(61,214,140,0.15)' : 'var(--surface2)', color: sel ? '#3dd68c' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(61,214,140,0.45)' : 'var(--border)'}` }}>{e.apodo}</button>
                  ) })}
                  {empleados.length === 0 && <span style={{ fontSize: 12, color: 'var(--text3)' }}>Cargá empleados en Producción → Empleados.</span>}
                </div>
              </div>
            ))}
          </Sec>

          {/* Herramental */}
          <Sec t="🔧 Herramental">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              {f.mechas.map((m, i) => { const lotes = herrLotes[m.cod] || []; return (
                <div key={i}><label style={lbl}>Micromecha {m.cod}</label>
                  {lotes.length > 0 ? (
                    <select value={m.lote} onChange={e => setD(`mechas.${i}.lote`, e.target.value)} style={{ ...iSt, cursor: 'pointer' }}>
                      <option value="">— Sin lote —</option>
                      {lotes.map(l => <option key={l} value={l}>Lote {l}</option>)}
                      {m.lote && !lotes.includes(m.lote) && <option value={m.lote}>Lote {m.lote} (no existe)</option>}
                    </select>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--text3)', padding: '8px 0' }}>Sin lotes de {m.cod}. Cargalos en <b>Herramental</b>.</div>
                  )}
                </div>
              ) })}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: -2, marginBottom: 8 }}>A cada mecha con <b>lote cargado</b> se le suman automáticamente los <b>{conforme || 0} agujeros</b> (= paneles) en Herramental al guardar.</div>
            <label style={lbl}>Máquinas usadas (Maq-Sil / Prensa-Alambre)</label>
            {maquinas.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>Cargá las máquinas en <b>Mantenimiento → Máquinas</b> (podés asignarles el sector "Alambre").</div>
            ) : (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                {maquinas.map(m => { const sel = (f.maquinasUsadas || []).includes(m.id); const et = m.codigo || m.sigla || m.nombre; return (
                  <button key={m.id} onClick={() => toggleMaquina(m.id)} title={m.nombre} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(74,108,247,0.15)' : 'var(--surface2)', color: sel ? '#7b9fff' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(74,108,247,0.45)' : 'var(--border)'}` }}>{et}</button>
                ) })}
              </div>
            )}
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2, marginBottom: 8 }}>A cada máquina tildada se le suman los <b>{conforme || 0} paneles</b> a su historial de uso al guardar.</div>
            <label style={lbl}>Tubos de aluminio usados</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {TUBOS.map(t => { const sel = f.tubos.includes(t); return (
                <button key={t} onClick={() => toggleTubo(t)} style={{ padding: '4px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(74,108,247,0.15)' : 'var(--surface2)', color: sel ? '#7b9fff' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(74,108,247,0.45)' : 'var(--border)'}` }}>TubAl{t}</button>
              ) })}
            </div>
          </Sec>

          {/* Producción por día en las estaciones de terminación (E4/E5) */}
          <Sec t="📅 Producción por día — Terminación">
            {[['E3', 'E3 · Terminación'], ['E4', 'E4 · Terminación + Alim.']].map(([est, label]) => (
              <div key={est} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 6 }}>{label} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>· total {sumProd(est)} u.</span></div>
                {(f.prodDiaria?.[est] || []).map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                    <input type="date" value={r.fecha} onChange={e => setProdDia(est, i, 'fecha', e.target.value)} style={{ ...iSt, colorScheme: 'dark', maxWidth: 170 }} />
                    <input type="number" value={r.cant} onChange={e => setProdDia(est, i, 'cant', e.target.value)} placeholder="cantidad" style={{ ...iSt, maxWidth: 130 }} />
                    <button onClick={() => delProdDia(est, i)} title="Quitar" style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '6px 9px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
                  </div>
                ))}
                <button onClick={() => addProdDia(est)} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>+ Agregar día</button>
              </div>
            ))}
          </Sec>

          {/* Insumos por estación — arranca con los del sector, pero podés agregar cualquiera */}
          <Sec t="📦 Insumos por estación (E1–E5) — descuentan stock">
            {(() => {
              const labelMap = Object.fromEntries([...allInsumos, ...insumosCat].map(x => [x.cod, x.label]))
              const filaCods = [...new Set([...insumosCat.map(x => x.cod), ...Object.keys(f.insumosEst || {}), ...extraCods])].filter(c => !removedCods.includes(c))
              const q = buscarIns.trim().toLowerCase()
              const opciones = q ? allInsumos.filter(x => !filaCods.includes(x.cod) && ((x.label || '').toLowerCase().includes(q) || (x.cod || '').toLowerCase().includes(q))).slice(0, 8) : []
              return (
                <>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 620 }}>
                      <thead><tr>
                        <th style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'left', padding: '4px 6px' }}>Insumo</th>
                        {COLS.map(e => <th key={e} style={{ fontSize: 10, color: 'var(--text3)', padding: '4px 6px' }}>{e}</th>)}
                        <th style={{ fontSize: 10, color: 'var(--text3)', padding: '4px 6px' }}>Lote</th>
                        <th style={{ fontSize: 10, color: 'var(--text3)', padding: '4px 6px' }}>Total</th>
                        <th style={{ width: 20 }}></th>
                      </tr></thead>
                      <tbody>
                        {filaCods.map(cod => (
                          <tr key={cod}>
                            <td style={{ fontSize: 12, padding: '3px 6px' }}>{labelMap[cod] || cod} <span style={{ color: 'var(--text3)', fontFamily: 'monospace', fontSize: 10 }}>{cod}</span></td>
                            {COLS.map(e => (
                              <td key={e} style={{ padding: '3px 4px' }}><input type="number" step="any" value={f.insumosEst[cod]?.[e] ?? ''} onChange={ev => setInsEst(cod, e, ev.target.value)} style={{ ...iSt, width: 54, padding: '5px 6px', textAlign: 'center' }} /></td>
                            ))}
                            <td style={{ padding: '3px 4px' }}><input value={f.insumosEst[cod]?.lote ?? ''} onChange={ev => setInsEst(cod, 'lote', ev.target.value)} placeholder="lote" style={{ ...iSt, width: 70, padding: '5px 6px' }} /></td>
                            <td style={{ padding: '3px 6px', fontWeight: 800, color: '#7b9fff', textAlign: 'center' }}>{totalInsumo(cod)}</td>
                            <td style={{ padding: '3px 4px', textAlign: 'center' }}>
                              <button onClick={() => { setExtraCods(prev => prev.filter(c => c !== cod)); setRemovedCods(prev => [...new Set([...prev, cod])]); setF(s => { const n = clone(s); delete n.insumosEst[cod]; return n }) }} title="Quitar insumo" style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Buscador para agregar cualquier insumo */}
                  <div style={{ position: 'relative', marginTop: 8, maxWidth: 360 }}>
                    <input value={buscarIns} onChange={e => setBuscarIns(e.target.value)} placeholder="➕ Agregar insumo (buscá por nombre o código)…" style={{ ...iSt }} />
                    {opciones.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 20, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginTop: 2 }}>
                        {opciones.map(o => (
                          <div key={o.cod} onMouseDown={() => { setExtraCods(prev => [...new Set([...prev, o.cod])]); setRemovedCods(prev => prev.filter(c => c !== o.cod)); setInsEst(o.cod, 'lote', f.insumosEst[o.cod]?.lote ?? ''); setBuscarIns('') }}
                            style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'center' }}
                            onMouseEnter={ev => ev.currentTarget.style.background = 'var(--surface2)'} onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                            <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#7b9fff', minWidth: 70 }}>{o.cod}</span>
                            <span style={{ fontSize: 12 }}>{o.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>Arranca con los insumos de sector <b>Alambre</b> o <b>Pegado</b>. Podés agregar cualquier otro con el buscador. E5 = Pegado.</div>
                </>
              )
            })()}
          </Sec>

          {/* Prensas */}
          <Sec t="🗜 Prensas (cantidad y presión)">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
              {['P1', 'P2', 'P3', 'P4'].map(p => (
                <div key={p} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 4 }}>{p}</div>
                  <label style={lbl}>Cantidad</label><input type="number" value={f.prensas[p].cant} onChange={e => setD(`prensas.${p}.cant`, e.target.value)} placeholder="0" style={iSt} />
                  <label style={{ ...lbl, marginTop: 6 }}>Presión</label><input type="number" value={f.prensas[p].pres} onChange={e => setD(`prensas.${p}.pres`, e.target.value)} placeholder="0" style={iSt} />
                </div>
              ))}
            </div>
          </Sec>

          {/* Conformidad */}
          <Sec t="✅ Resultado">
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><label style={lbl}>Conforme (OK)</label><input type="number" value={f.conforme} onChange={e => setD('conforme', e.target.value)} placeholder="0" style={{ ...iSt, width: 110 }} /></div>
              <div><label style={lbl}>No conforme</label><input type="number" value={f.no_conforme} onChange={e => setD('no_conforme', e.target.value)} placeholder="0" style={{ ...iSt, width: 110, borderColor: int(f.no_conforme) > 0 ? 'rgba(255,85,119,0.5)' : 'var(--border)' }} /></div>
              <div><div style={lbl}>Objetivo</div><div style={{ fontSize: 20, fontWeight: 800, color: conforme >= target ? '#3dd68c' : '#fb923c' }}>{conforme} / {target}</div></div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Al llegar al objetivo, el lote pasa a <b>Encuadre</b>. La cantidad conforme se lleva a la etapa siguiente.</div>
          </Sec>

          <div><label style={lbl}>Notas</label><textarea value={f.notas} onChange={e => setD('notas', e.target.value)} rows={2} style={{ ...iSt, resize: 'vertical' }} /></div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={guardar} disabled={g} style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: g ? 'not-allowed' : 'pointer', opacity: g ? 0.7 : 1, fontFamily: 'var(--font)' }}>{g ? 'Guardando...' : '✓ Guardar OT'}</button>
            <button onClick={onClose} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
