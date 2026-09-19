import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const HOJA_CODIGO = 'MPSTD6'
// Medida objetivo del panel según modelo
const MEDIDAS = { '250w': '290x590mm', '250w TD': '290x590mm', '500w': '590x590mm', '500w TD': '590x590mm', '500w MB': '590x590mm' }
const medidaDe = modelo => MEDIDAS[modelo] || (modelo?.includes('250') ? '290x590mm' : modelo?.includes('500') ? '590x590mm' : '')
// Medidas objetivo de tapa (T) y contratapa (CT) — 1400w las tiene distintas
const MEDIDAS_TCT = { '1400w': { t: '560x560mm', ct: '558x558mm' } }
const normMed = s => String(s ?? '').trim().toLowerCase().replace(/\s/g, '').replace(/mm$/,'')

// 1400w: de una hoja salen 8 tapas u 8 contratapas
const ceilHojas = u => Math.ceil((parseInt(u) || 0) / 8)
// Colores cuya tapa (T) también sale de MPSTD6 (el resto usa una hoja propia del color)
const TAPA_FULL_MPSTD6 = ['Blanco', 'Smart Wifi']
// Código de hoja de la tapa por color (la contratapa siempre es MPSTD6). Patrón: SIM + código + 6
const TAPA_SHEET = {
  'Madera Veteada': 'SIMMV6',
  'Piedra Azteca': 'SIMPA6',
  'Madera Blanca': 'SIMMB6',
  'Piedra Romana': 'SIMPR6',
  'Marmol Traviatta Gris': 'SIMMTG6',
  'Piedra Cantera Luna': 'SIMPCL6',
  'Marmol Calacatta Ocre': 'SIMMCO6',
}
const insumoTapaDe = term => TAPA_FULL_MPSTD6.includes(term) ? 'MPSTD6' : (TAPA_SHEET[term] || '')
const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 11px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }
const lbl = { fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4, letterSpacing: '0.3px' }

// Pausas (min desde medianoche) y jornada
const BREAKS = [[540, 555], [660, 665], [780, 810], [900, 905]] // 9-9:15, 11-11:05, 13-13:30, 15-15:05
const DAY_START = 480 // 08:00 (asunción de inicio de jornada)
const hm = s => { if (!s) return null; const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0) }
const parseYMD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const fmtISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const overlap = (a1, a2, b1, b2) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1))
function calcularDuracion(fi, hi, ff, hf) {
  if (!fi || !hi || !ff || !hf) return null
  const start = parseYMD(fi), end = parseYMD(ff)
  if (end < start) return null
  let total = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay(); if (dow === 0 || dow === 6) continue
    const iso = fmtISO(d)
    const dayEnd = dow === 5 ? 840 : 990   // 14:00 viernes, 16:30 lun-jue
    const wStart = iso === fi ? hm(hi) : DAY_START
    const wEnd = iso === ff ? Math.min(hm(hf), dayEnd) : dayEnd
    let mins = Math.max(0, wEnd - wStart)
    for (const [b1, b2] of BREAKS) mins -= overlap(wStart, wEnd, b1, b2)
    total += Math.max(0, mins)
  }
  return total
}
const fmtDur = m => m == null ? '—' : `${Math.floor(m / 60)}h ${m % 60}m`

const int = v => parseInt(v) || 0
// Efectos de un corte sobre paneles y stocks de pulmón/NC
function efectosDe(o) {
  const ctOk = int(o.ct_ok ?? o.contratapas), tOk = int(o.t_ok ?? o.tapas)
  const takeCt = int(o.tomar_pulmon_ct), takeT = int(o.tomar_pulmon_t)
  const ctTot = ctOk + takeCt, tTot = tOk + takeT
  const paneles = Math.min(ctTot, tTot)
  return { paneles, pulmonCt: (ctTot - paneles) - takeCt, pulmonT: (tTot - paneles) - takeT, ncCt: int(o.ct_nc), ncT: int(o.t_nc) }
}

export default function CorteOT({ lote, onClose, onDone }) {
  const { user, profile } = useAuth()
  const nombreUsuario = profile?.full_name || user?.email || 'Producción'
  const es1400 = lote.modelo === '1400w'
  const termT = es1400 ? (lote.terminacion || '') : ''   // la tapa se distingue por color solo en 1400w
  const [herr, setHerr] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [pulmon, setPulmon] = useState([])
  const [prevOt, setPrevOt] = useState(null)
  const [g, setG] = useState(false)
  const [f, setF] = useState({
    disco_id: '', cinta_id: '', pie_id: '',
    disco_txt: '', cinta_txt: '', pie_txt: '', herramental_cambio: '',
    fecha_inicio: new Date().toISOString().split('T')[0], hora_inicio: '',
    fecha_fin: '', hora_fin: '',
    fecha_inicio2: '', hora_inicio2: '', fecha_fin2: '', hora_fin2: '',
    personal: [], mediciones: ['', '', '', '', ''],
    notas: '',
    ct_ok: '', t_ok: '', ct_nc: '', t_nc: '', hojas_ct: '', hojas_t: '',
    tomar_pulmon_ct: '', tomar_pulmon_t: '',
    lote_ct: '', lote_t: '',
    insumo_tapa: es1400 ? insumoTapaDe(lote.terminacion) : HOJA_CODIGO,
  })

  useEffect(() => { cargar() }, [])
  async function cargar() {
    const [h, e, ot, pl] = await Promise.all([
      supabase.from('herramental').select('*').eq('activo', true).order('nombre'),
      supabase.from('empleados').select('apodo,nombre,sectores').eq('activo', true).order('apodo'),
      supabase.from('produccion_ot').select('*').eq('lote_id', lote.id).eq('etapa', 'corte').maybeSingle(),
      supabase.from('produccion_pulmon').select('*').eq('modelo', lote.modelo).eq('estado', 'OK'),
    ])
    setHerr(h.data || [])
    setEmpleados((e.data || []).filter(x => !(x.sectores || []).length || x.sectores.includes('Corte')))
    setPulmon(pl.data || [])
    if (ot.data) {
      setPrevOt(ot.data)
      setF({
        disco_id: ot.data.disco_id || '', cinta_id: ot.data.cinta_id || '', pie_id: ot.data.pie_id || '',
        disco_txt: ot.data.disco_txt || '', cinta_txt: ot.data.cinta_txt || '', pie_txt: ot.data.pie_txt || '',
        herramental_cambio: ot.data.herramental_cambio || '',
        fecha_inicio: ot.data.fecha_inicio || '', hora_inicio: ot.data.hora_inicio || '',
        fecha_fin: ot.data.fecha_fin || '', hora_fin: ot.data.hora_fin || '',
        fecha_inicio2: ot.data.fecha_inicio2 || '', hora_inicio2: ot.data.hora_inicio2 || '', fecha_fin2: ot.data.fecha_fin2 || '', hora_fin2: ot.data.hora_fin2 || '',
        personal: ot.data.personal || [], mediciones: (ot.data.mediciones || ['', '', '', '', '']).concat(['', '', '', '', '']).slice(0, 5),
        notas: ot.data.notas || '',
        ct_ok: ot.data.contratapas ?? '', t_ok: ot.data.tapas ?? '', ct_nc: ot.data.ct_nc ?? '', t_nc: ot.data.t_nc ?? '',
        hojas_ct: ot.data.hojas_ct ?? '', hojas_t: ot.data.hojas_t ?? '',
        tomar_pulmon_ct: ot.data.tomar_pulmon_ct ?? '', tomar_pulmon_t: ot.data.tomar_pulmon_t ?? '',
        lote_ct: ot.data.lote_ct ?? '', lote_t: ot.data.lote_t ?? '',
        insumo_tapa: ot.data.insumo_tapa ?? (es1400 ? insumoTapaDe(lote.terminacion) : HOJA_CODIGO),
      })
    }
  }

  const herrTxt = h => `${h.nombre}${h.codigo ? ` · ${h.codigo}` : ''}${h.lote ? ` · L:${h.lote}` : ''}`
  const insumoTapa = (f.insumo_tapa || '').trim().toUpperCase()
  const hojasCtUsadas = int(f.hojas_ct), hojasTUsadas = int(f.hojas_t)
  const ctOk = int(f.ct_ok), tOk = int(f.t_ok)
  const mermaCt = Math.max(0, hojasCtUsadas * 8 - ctOk - int(f.ct_nc))
  const mermaT = Math.max(0, hojasTUsadas * 8 - tOk - int(f.t_nc))
  const hojasMpstd = hojasCtUsadas + (insumoTapa === HOJA_CODIGO ? hojasTUsadas : 0)
  const cur = efectosDe(f)
  const piezas = cur.paneles
  const dur1 = calcularDuracion(f.fecha_inicio, f.hora_inicio, f.fecha_fin, f.hora_fin)
  const dur2 = calcularDuracion(f.fecha_inicio2, f.hora_inicio2, f.fecha_fin2, f.hora_fin2)
  const duracion = (dur1 == null && dur2 == null) ? null : (dur1 || 0) + (dur2 || 0)
  const controlesOk = f.mediciones.every(m => (m || '').toUpperCase() === 'OK')   // los 5 controles en OK
  const togglePersona = ap => setF(s => ({ ...s, personal: s.personal.includes(ap) ? s.personal.filter(x => x !== ap) : [...s.personal, ap] }))

  // Pulmón OK disponible por tipo (para tomar). Suma el que ya tomó esta OT (ya descontado antes).
  const pulmonDe = (tipo, term) => (pulmon.find(p => p.tipo === tipo && (p.terminacion || '') === (term || ''))?.cantidad) || 0
  const maxTakeCt = pulmonDe('CT', '') + int(prevOt?.tomar_pulmon_ct)
  const maxTakeT = pulmonDe('T', termT) + int(prevOt?.tomar_pulmon_t)

  async function descontarInsumo(codigo, delta, label, loteInsumo) {
    if (!codigo || !delta) return
    try {
      const { data: ins } = await supabase.from('insumos').select('id,stock_actual').eq('codigo', codigo).limit(1)
      const row = ins?.[0]
      if (row) {
        await supabase.from('insumos').update({ stock_actual: Math.max(0, (row.stock_actual || 0) - delta), updated_at: new Date().toISOString() }).eq('id', row.id)
        await supabase.from('movimientos_insumos').insert({ insumo_id: row.id, tipo: delta > 0 ? 'egreso' : 'ingreso', cantidad: Math.abs(delta), sector: 'Corte', motivo: `OT Corte · Lote ${es1400 ? 'F' : ''}${lote.numero}${label ? ` · ${label}` : ''}`, lote: loteInsumo || null, usuario_id: user?.id, usuario_nombre: nombreUsuario })
      }
    } catch (_) { /* no bloquea */ }
  }

  async function ajustarPulmon(tipo, estado, term, delta) {
    if (!delta) return
    const t = term || ''
    try {
      const { data } = await supabase.from('produccion_pulmon').select('id,cantidad').eq('tipo', tipo).eq('estado', estado).eq('modelo', lote.modelo).eq('terminacion', t).limit(1)
      const row = data?.[0]
      if (row) await supabase.from('produccion_pulmon').update({ cantidad: Math.max(0, (row.cantidad || 0) + delta), updated_at: new Date().toISOString() }).eq('id', row.id)
      else await supabase.from('produccion_pulmon').insert({ tipo, estado, modelo: lote.modelo, terminacion: t, cantidad: Math.max(0, delta) })
    } catch (_) { /* no bloquea */ }
  }

  async function guardar() {
    // Guardado progresivo: se puede guardar solo con herramental + inicio y completar después.
    if (hojasTUsadas > 0 && !insumoTapa) return toast.error('Indicá el código de la hoja de la tapa (T)')
    if (int(f.tomar_pulmon_ct) > maxTakeCt) return toast.error(`Pulmón CT disponible: ${maxTakeCt}`)
    if (int(f.tomar_pulmon_t) > maxTakeT) return toast.error(`Pulmón T disponible: ${maxTakeT}`)
    setG(true)
    const payload = {
      lote_id: lote.id, etapa: 'corte',
      fecha_inicio: f.fecha_inicio || null, hora_inicio: f.hora_inicio || null,
      fecha_fin: f.fecha_fin || null, hora_fin: f.hora_fin || null,
      fecha_inicio2: f.fecha_inicio2 || null, hora_inicio2: f.hora_inicio2 || null,
      fecha_fin2: f.fecha_fin2 || null, hora_fin2: f.hora_fin2 || null,
      personal: f.personal,
      disco_id: f.disco_id || null, cinta_id: f.cinta_id || null, pie_id: f.pie_id || null,
      disco_txt: f.disco_txt || null, cinta_txt: f.cinta_txt || null, pie_txt: f.pie_txt || null,
      herramental_cambio: f.herramental_cambio.trim() || null,
      mediciones: f.mediciones.map(m => (m === '' || m == null) ? null : String(m).trim()),
      hojas_usadas: hojasMpstd,
      contratapas: ctOk, tapas: tOk, ct_nc: int(f.ct_nc), t_nc: int(f.t_nc),
      hojas_ct: hojasCtUsadas, hojas_t: hojasTUsadas,
      tomar_pulmon_ct: int(f.tomar_pulmon_ct), tomar_pulmon_t: int(f.tomar_pulmon_t),
      lote_ct: f.lote_ct.trim() || null, lote_t: f.lote_t.trim() || null,
      insumo_tapa: insumoTapa || null,
      piezas, duracion_min: duracion, notas: f.notas.trim() || null,
      ...(prevOt ? {} : { creado_por: nombreUsuario }),
      modificado_por: nombreUsuario, modificado_por_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('produccion_ot').upsert(payload, { onConflict: 'lote_id,etapa' })
    if (error) { setG(false); toast.error('Error: ' + error.message); return }

    // Descontar hojas del stock (solo el delta respecto de lo ya descontado en esta OT)
    await descontarInsumo(HOJA_CODIGO, hojasMpstd - int(prevOt?.hojas_usadas), 'CT', f.lote_ct.trim())
    if (insumoTapa && insumoTapa !== HOJA_CODIGO) await descontarInsumo(insumoTapa, hojasTUsadas - int(prevOt?.hojas_t), 'T', f.lote_t.trim())

    // Ajustar stocks de pulmón / NC (por el delta de efectos de esta OT)
    const prev = efectosDe(prevOt || {})
    await ajustarPulmon('CT', 'OK', '', cur.pulmonCt - prev.pulmonCt)
    await ajustarPulmon('T', 'OK', termT, cur.pulmonT - prev.pulmonT)
    await ajustarPulmon('CT', 'NC', '', cur.ncCt - prev.ncCt)
    await ajustarPulmon('T', 'NC', termT, cur.ncT - prev.ncT)

    // Actualizar el lote: avance de corte = paneles completos.
    // Solo avanza a la siguiente etapa si están las piezas Y los 5 controles en OK.
    // Firenze (1400w): Corte → Taller · Slim (250/500): Corte → Armado.
    const siguienteCorte = es1400 ? 'taller' : 'armado'
    const alcanzo = piezas >= (lote.cantidad_actual || lote.cantidad_objetivo)
    const completo = alcanzo && controlesOk
    await supabase.from('produccion_lotes').update({
      avance: { ...(lote.avance || {}), corte: piezas },
      etapa: completo ? siguienteCorte : 'corte', estado: 'en_proceso',
      modificado_por: nombreUsuario, modificado_por_at: new Date().toISOString(),
    }).eq('id', lote.id)

    // Sumar usos al herramental (por el delta de piezas OK cortadas)
    const ids = [f.disco_id, f.cinta_id, f.pie_id].filter(Boolean)
    if (es1400) {
      const dT = tOk - int(prevOt?.tapas), dC = ctOk - int(prevOt?.contratapas)
      if (dT || dC) for (const id of ids) {
        try {
          const { data: hr } = await supabase.from('herramental').select('usos_1400w_t,usos_1400w_ct').eq('id', id).single()
          if (hr) await supabase.from('herramental').update({ usos_1400w_t: Math.max(0, (hr.usos_1400w_t || 0) + dT), usos_1400w_ct: Math.max(0, (hr.usos_1400w_ct || 0) + dC) }).eq('id', id)
        } catch (_) { /* no bloquea */ }
      }
    } else {
      const col = lote.modelo.includes('250') ? 'usos_250w' : 'usos_500w'
      const d = (ctOk + tOk) - (int(prevOt?.contratapas) + int(prevOt?.tapas))
      if (d) for (const id of ids) {
        try {
          const { data: hr } = await supabase.from('herramental').select(col).eq('id', id).single()
          if (hr) await supabase.from('herramental').update({ [col]: Math.max(0, (hr[col] || 0) + d) }).eq('id', id)
        } catch (_) { /* no bloquea */ }
      }
    }

    setG(false)
    if (alcanzo && !controlesOk) toast('OT guardada. Marcá los 5 controles en OK para que el lote avance a Aguj1+Alambre+Pegado.', { icon: '⚠️', duration: 5000 })
    else toast.success('OT de Corte guardada ✅')
    onClose(); onDone()
  }

  const HerrSelect = ({ base, label }) => (
    <div>
      <label style={lbl}>{label}</label>
      <select value={f[base + '_id'] || ''} onChange={e => { const h = herr.find(x => x.id === e.target.value); setF(s => ({ ...s, [base + '_id']: e.target.value || '', [base + '_txt']: h ? herrTxt(h) : '' })) }} style={{ ...iSt, cursor: 'pointer' }}>
        <option value="">— Elegir —</option>
        {herr.map(h => <option key={h.id} value={h.id}>{herrTxt(h)}</option>)}
      </select>
    </div>
  )

  // Card de un lado (CT o T). Se invoca como función (no como <Componente/>) para no perder el foco al tipear.
  const ladoCard = ({ tit, color, hojasKey, okKey, ncKey, tomarKey, loteKey, loteLabel, objetivo, rinde, merma, disp, extra }) => (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 6 }}>{tit}</div>
      {objetivo && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>🎯 Medida objetivo: <b style={{ color: 'var(--text2)' }}>{objetivo}</b></div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div><label style={lbl}>Hojas usadas</label><input type="number" value={f[hojasKey]} onChange={e => setF(s => ({ ...s, [hojasKey]: e.target.value }))} placeholder="0" style={iSt} /></div>
        <div><label style={lbl}>OK</label><input type="number" value={f[okKey]} onChange={e => setF(s => ({ ...s, [okKey]: e.target.value }))} placeholder="0" style={iSt} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
        <div><label style={lbl}>NC (fallada)</label><input type="number" value={f[ncKey]} onChange={e => setF(s => ({ ...s, [ncKey]: e.target.value }))} placeholder="0" style={{ ...iSt, borderColor: int(f[ncKey]) > 0 ? 'rgba(255,85,119,0.5)' : 'var(--border)' }} /></div>
        <div><label style={lbl}>Tomar pulmón</label><input type="number" value={f[tomarKey]} onChange={e => setF(s => ({ ...s, [tomarKey]: e.target.value }))} placeholder="0" style={iSt} /><div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 2 }}>disp: {disp}</div></div>
      </div>
      {extra}
      <label style={{ ...lbl, marginTop: 8 }}>{loteLabel}</label>
      <input value={f[loteKey]} onChange={e => setF(s => ({ ...s, [loteKey]: e.target.value }))} placeholder="N° de lote de la hoja" style={iSt} />
      <div style={{ fontSize: 11, color: merma > 0 ? '#ff5577' : 'var(--text3)', marginTop: 6 }}>Rinde {rinde} · OK {int(f[okKey])} · NC {int(f[ncKey])} · <b>Merma {merma}</b></div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>📋 OT de Corte · Lote {es1400 ? 'F' : '#'}{lote.numero}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{lote.modelo}{lote.terminacion ? ` · ${lote.terminacion}` : ''} · {lote.cantidad_objetivo} u. (T + CT · 8 por hoja)</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Herramental */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>🔧 Herramental</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              <HerrSelect base="disco" label="Disco Diamantado" />
              <HerrSelect base="cinta" label="Cinta Métrica" />
              <HerrSelect base="pie" label="Pie Metálico" />
            </div>
          </div>

          {/* Tiempos (hasta 2 sesiones: arranca un día y termina otro) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)' }}>⏱ Tiempos</div>
              <div><span style={{ ...lbl, display: 'inline', marginRight: 6 }}>Duración total</span><b style={{ fontSize: 15, color: '#7b9fff' }}>{fmtDur(duracion)}</b></div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>Sesión 1</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
              <div><label style={lbl}>Fecha inicio</label><input key={'fi' + f.fecha_inicio} type="date" defaultValue={f.fecha_inicio} onBlur={e => setF(s => ({ ...s, fecha_inicio: e.target.value }))} style={iSt} /></div>
              <div><label style={lbl}>Hora inicio</label><input key={'hi' + f.hora_inicio} type="time" defaultValue={f.hora_inicio} onBlur={e => setF(s => ({ ...s, hora_inicio: e.target.value }))} style={iSt} /></div>
              <div><label style={lbl}>Fecha fin</label><input key={'ff' + f.fecha_fin} type="date" defaultValue={f.fecha_fin} onBlur={e => setF(s => ({ ...s, fecha_fin: e.target.value }))} style={iSt} /></div>
              <div><label style={lbl}>Hora fin</label><input key={'hf' + f.hora_fin} type="time" defaultValue={f.hora_fin} onBlur={e => setF(s => ({ ...s, hora_fin: e.target.value }))} style={iSt} /></div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', margin: '8px 0 4px' }}>Sesión 2 (si retomó otro día)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
              <div><label style={lbl}>Fecha inicio</label><input key={'fi2' + f.fecha_inicio2} type="date" defaultValue={f.fecha_inicio2} onBlur={e => setF(s => ({ ...s, fecha_inicio2: e.target.value }))} style={iSt} /></div>
              <div><label style={lbl}>Hora inicio</label><input key={'hi2' + f.hora_inicio2} type="time" defaultValue={f.hora_inicio2} onBlur={e => setF(s => ({ ...s, hora_inicio2: e.target.value }))} style={iSt} /></div>
              <div><label style={lbl}>Fecha fin</label><input key={'ff2' + f.fecha_fin2} type="date" defaultValue={f.fecha_fin2} onBlur={e => setF(s => ({ ...s, fecha_fin2: e.target.value }))} style={iSt} /></div>
              <div><label style={lbl}>Hora fin</label><input key={'hf2' + f.hora_fin2} type="time" defaultValue={f.hora_fin2} onBlur={e => setF(s => ({ ...s, hora_fin2: e.target.value }))} style={iSt} /></div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>Descuenta desayuno (9-9:15), descanso (11-11:05), almuerzo (13-13:30) y descanso (15-15:05). Jornada hasta 16:30 (L-J) / 14:00 (V), inicio 08:00. La duración suma ambas sesiones.</div>
          </div>

          {/* Personal */}
          <div>
            <label style={lbl}>Personal afectado</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {empleados.map(e => {
                const sel = f.personal.includes(e.apodo)
                return <button key={e.apodo} onClick={() => togglePersona(e.apodo)} title={e.nombre || ''}
                  style={{ padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(61,214,140,0.15)' : 'var(--surface2)', color: sel ? '#3dd68c' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(61,214,140,0.45)' : 'var(--border)'}` }}>{e.apodo}</button>
              })}
              {empleados.length === 0 && <span style={{ fontSize: 12, color: 'var(--text3)' }}>Cargá empleados en Producción → Empleados.</span>}
            </div>
          </div>

          {/* Controles de calidad: 5 chequeos que se marcan OK (obligatorios para avanzar) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)' }}>✅ Controles de calidad (5) · marcá OK</div>
              <span style={{ fontSize: 11, fontWeight: 700, color: controlesOk ? '#3dd68c' : '#fb923c' }}>{f.mediciones.filter(m => (m || '').toUpperCase() === 'OK').length}/5</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {f.mediciones.map((m, i) => {
                const ok = (m || '').toUpperCase() === 'OK'
                return <button key={i} type="button"
                  onClick={() => setF(s => ({ ...s, mediciones: s.mediciones.map((x, j) => j === i ? (ok ? '' : 'OK') : x) }))}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', borderRadius: 'var(--radius)', cursor: 'pointer', fontFamily: 'var(--font)', background: ok ? 'rgba(61,214,140,0.15)' : 'var(--surface2)', border: `1px solid ${ok ? 'rgba(61,214,140,0.5)' : 'var(--border)'}` }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)' }}>Ctrl {i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: ok ? '#3dd68c' : 'var(--text3)' }}>{ok ? 'OK ✓' : '—'}</span>
                </button>
              })}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>El lote no avanza a la siguiente etapa hasta que los 5 controles estén en OK.</div>
          </div>

          {/* Corte: T y CT con hojas reales, OK, NC y pulmón */}
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>📦 Corte de tapas (T) y contratapas (CT) · 8 piezas por hoja</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {ladoCard({ tit: 'Contratapas (CT) · MPSTD6', color: '#3dd68c', hojasKey: 'hojas_ct', okKey: 'ct_ok', ncKey: 'ct_nc', tomarKey: 'tomar_pulmon_ct', loteKey: 'lote_ct', loteLabel: 'Lote MPSTD6', objetivo: MEDIDAS_TCT[lote.modelo]?.ct, rinde: hojasCtUsadas * 8, merma: mermaCt, disp: maxTakeCt })}
              {ladoCard({ tit: `Tapas (T) · ${insumoTapa || '—'}`, color: '#7b9fff', hojasKey: 'hojas_t', okKey: 't_ok', ncKey: 't_nc', tomarKey: 'tomar_pulmon_t', loteKey: 'lote_t', loteLabel: `Lote ${insumoTapa || 'hoja'}`, objetivo: MEDIDAS_TCT[lote.modelo]?.t, rinde: hojasTUsadas * 8, merma: mermaT, disp: maxTakeT,
                extra: <><label style={{ ...lbl, marginTop: 8 }}>Hoja de la tapa</label><input value={f.insumo_tapa} onChange={e => setF(s => ({ ...s, insumo_tapa: e.target.value }))} placeholder="Ej: SIMMTG6" style={iSt} /></> })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
              <div><div style={lbl}>Paneles completos</div><div style={{ fontSize: 22, fontWeight: 800, color: piezas >= lote.cantidad_objetivo ? '#3dd68c' : '#fb923c' }}>{piezas}<span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400 }}> / {lote.cantidad_objetivo}</span></div></div>
              {(cur.pulmonCt !== 0 || cur.pulmonT !== 0 || cur.ncCt > 0 || cur.ncT > 0) && (
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                  {cur.pulmonCt !== 0 && <div>Pulmón CT: <b style={{ color: cur.pulmonCt > 0 ? '#3dd68c' : '#fb923c' }}>{cur.pulmonCt > 0 ? '+' : ''}{cur.pulmonCt}</b></div>}
                  {cur.pulmonT !== 0 && <div>Pulmón T: <b style={{ color: cur.pulmonT > 0 ? '#3dd68c' : '#fb923c' }}>{cur.pulmonT > 0 ? '+' : ''}{cur.pulmonT}</b></div>}
                  {(cur.ncCt > 0 || cur.ncT > 0) && <div style={{ color: '#ff5577' }}>NC → CT {cur.ncCt} · T {cur.ncT}</div>}
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Descuenta hojas reales: {hojasCtUsadas} de MPSTD6 (CT){insumoTapa && insumoTapa !== HOJA_CODIGO ? ` y ${hojasTUsadas} de ${insumoTapa} (T)` : insumoTapa === HOJA_CODIGO ? ` + ${hojasTUsadas} de MPSTD6 (T)` : ''}. Las conformes que sobran van a pulmón; las falladas a stock NC. Se puede reabrir la OT; el lote pasa a <b>Aguj1+Alambre+Pegado</b> al llegar a {lote.cantidad_objetivo} paneles.</div>
          </div>

          {/* Cambio de herramental */}
          <div><label style={lbl}>Cambio de herramental (si hubo)</label><input value={f.herramental_cambio} onChange={e => setF(s => ({ ...s, herramental_cambio: e.target.value }))} placeholder="Ej: se cambió el disco a las 12hs (cód/lote)" style={iSt} /></div>

          <div><label style={lbl}>Notas</label><textarea value={f.notas} onChange={e => setF(s => ({ ...s, notas: e.target.value }))} rows={2} style={{ ...iSt, resize: 'vertical' }} /></div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={guardar} disabled={g} style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: g ? 'not-allowed' : 'pointer', opacity: g ? 0.7 : 1, fontFamily: 'var(--font)' }}>{g ? 'Guardando...' : '✓ Guardar OT'}</button>
            <button onClick={onClose} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
