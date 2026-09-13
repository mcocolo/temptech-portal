import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const HOJA_CODIGO = 'MPSTD6'
// Medida objetivo del panel según modelo
const MEDIDAS = { '250w': '290x590mm', '250w TD': '290x590mm', '500w': '590x590mm', '500w TD': '590x590mm', '500w MB': '590x590mm' }
const medidaDe = modelo => MEDIDAS[modelo] || (modelo?.includes('250') ? '290x590mm' : modelo?.includes('500') ? '590x590mm' : '')
const normMed = s => String(s ?? '').trim().toLowerCase().replace(/\s/g, '').replace(/mm$/,'')

// 1400w: de una hoja salen 8 tapas u 8 contratapas
const ceilHojas = u => Math.ceil((parseInt(u) || 0) / 8)
// Colores cuya tapa (T) también sale de MPSTD6 (el resto usa una hoja propia del color)
const TAPA_FULL_MPSTD6 = ['Blanco', 'Smart Wifi']
// Código de hoja de la tapa por color (la contratapa siempre es MPSTD6)
const TAPA_SHEET = { 'Marmol Traviatta Gris': 'SIMMTG6' }
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

export default function CorteOT({ lote, onClose, onDone }) {
  const { user, profile } = useAuth()
  const nombreUsuario = profile?.full_name || user?.email || 'Producción'
  const es1400 = lote.modelo === '1400w'
  const ratio = lote.hojas ? (lote.cantidad_objetivo / lote.hojas) : 0
  const [herr, setHerr] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [prevOt, setPrevOt] = useState(null)
  const [g, setG] = useState(false)
  const [f, setF] = useState({
    disco_id: '', cinta_id: '', pie_id: '',
    disco_txt: '', cinta_txt: '', pie_txt: '', herramental_cambio: '',
    fecha_inicio: new Date().toISOString().split('T')[0], hora_inicio: '',
    fecha_fin: '', hora_fin: '',
    personal: [], mediciones: ['', '', '', '', ''], medida_objetivo: medidaDe(lote.modelo),
    hojas_usadas: '', notas: '',
    tapas: '', contratapas: '', insumo_tapa: insumoTapaDe(lote.terminacion),
  })

  useEffect(() => { cargar() }, [])
  async function cargar() {
    const [h, e, ot] = await Promise.all([
      supabase.from('herramental').select('*').eq('activo', true).order('nombre'),
      supabase.from('empleados').select('apodo,nombre').eq('activo', true).order('apodo'),
      supabase.from('produccion_ot').select('*').eq('lote_id', lote.id).eq('etapa', 'corte').maybeSingle(),
    ])
    setHerr(h.data || [])
    setEmpleados(e.data || [])
    if (ot.data) {
      setPrevOt(ot.data)
      setF({
        disco_id: ot.data.disco_id || '', cinta_id: ot.data.cinta_id || '', pie_id: ot.data.pie_id || '',
        disco_txt: ot.data.disco_txt || '', cinta_txt: ot.data.cinta_txt || '', pie_txt: ot.data.pie_txt || '',
        herramental_cambio: ot.data.herramental_cambio || '',
        fecha_inicio: ot.data.fecha_inicio || '', hora_inicio: ot.data.hora_inicio || '',
        fecha_fin: ot.data.fecha_fin || '', hora_fin: ot.data.hora_fin || '',
        personal: ot.data.personal || [], mediciones: (ot.data.mediciones || ['', '', '', '', '']).concat(['', '', '', '', '']).slice(0, 5),
        medida_objetivo: ot.data.medida_objetivo ?? medidaDe(lote.modelo), hojas_usadas: ot.data.hojas_usadas ?? '', notas: ot.data.notas || '',
        tapas: ot.data.tapas ?? '', contratapas: ot.data.contratapas ?? '', insumo_tapa: ot.data.insumo_tapa ?? insumoTapaDe(lote.terminacion),
      })
    }
  }

  const herrTxt = h => `${h.nombre}${h.codigo ? ` · ${h.codigo}` : ''}${h.lote ? ` · L:${h.lote}` : ''}`
  const hojas = parseInt(f.hojas_usadas) || 0
  // 1400w: dos cortes (T y CT)
  const tapas = parseInt(f.tapas) || 0
  const contratapas = parseInt(f.contratapas) || 0
  const insumoTapa = (f.insumo_tapa || '').trim().toUpperCase()
  const hojasTapa = ceilHojas(tapas)
  const hojasCt = ceilHojas(contratapas)
  const hojasMpstd = hojasCt + (insumoTapa === HOJA_CODIGO ? hojasTapa : 0)   // MPSTD6 total (CT + T si es Blanco/Smart)
  const piezas = es1400 ? Math.min(tapas, contratapas) : Math.round(hojas * ratio)   // paneles completos = min(T, CT)
  const duracion = calcularDuracion(f.fecha_inicio, f.hora_inicio, f.fecha_fin, f.hora_fin)
  const togglePersona = ap => setF(s => ({ ...s, personal: s.personal.includes(ap) ? s.personal.filter(x => x !== ap) : [...s.personal, ap] }))

  async function descontarInsumo(codigo, delta, label) {
    if (!codigo || !delta) return
    try {
      const { data: ins } = await supabase.from('insumos').select('id,stock_actual').eq('codigo', codigo).limit(1)
      const row = ins?.[0]
      if (row) {
        await supabase.from('insumos').update({ stock_actual: Math.max(0, (row.stock_actual || 0) - delta), updated_at: new Date().toISOString() }).eq('id', row.id)
        await supabase.from('movimientos_insumos').insert({ insumo_id: row.id, tipo: delta > 0 ? 'egreso' : 'ingreso', cantidad: Math.abs(delta), sector: 'Corte', motivo: `OT Corte · Lote ${es1400 ? 'F' : ''}${lote.numero}${label ? ` · ${label}` : ''}`, usuario_id: user?.id, usuario_nombre: nombreUsuario })
      }
    } catch (_) { /* no bloquea */ }
  }

  async function guardar() {
    if (es1400) {
      if (tapas <= 0 && contratapas <= 0) return toast.error('Ingresá tapas (T) y/o contratapas (CT) cortadas')
      if (tapas > 0 && !insumoTapa) return toast.error('Indicá el código de la hoja de la tapa (T)')
    } else if (hojas <= 0) return toast.error('Ingresá las hojas usadas')
    setG(true)
    const payload = {
      lote_id: lote.id, etapa: 'corte',
      fecha_inicio: f.fecha_inicio || null, hora_inicio: f.hora_inicio || null,
      fecha_fin: f.fecha_fin || null, hora_fin: f.hora_fin || null,
      personal: f.personal,
      disco_id: f.disco_id || null, cinta_id: f.cinta_id || null, pie_id: f.pie_id || null,
      disco_txt: f.disco_txt || null, cinta_txt: f.cinta_txt || null, pie_txt: f.pie_txt || null,
      herramental_cambio: f.herramental_cambio.trim() || null,
      mediciones: f.mediciones.map(m => (m === '' || m == null) ? null : String(m).trim()),
      medida_objetivo: f.medida_objetivo.trim() || null,
      hojas_usadas: es1400 ? hojasMpstd : hojas,
      tapas: es1400 ? tapas : null, contratapas: es1400 ? contratapas : null, insumo_tapa: es1400 ? (insumoTapa || null) : null,
      piezas, duracion_min: duracion, notas: f.notas.trim() || null,
      ...(prevOt ? {} : { creado_por: nombreUsuario }),
      modificado_por: nombreUsuario, modificado_por_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('produccion_ot').upsert(payload, { onConflict: 'lote_id,etapa' })
    if (error) { setG(false); toast.error('Error: ' + error.message); return }

    // Descontar hojas del stock (solo el delta respecto de lo ya descontado en esta OT)
    if (es1400) {
      await descontarInsumo(HOJA_CODIGO, hojasMpstd - (prevOt?.hojas_usadas || 0), 'CT')
      if (insumoTapa && insumoTapa !== HOJA_CODIGO) await descontarInsumo(insumoTapa, hojasTapa - ceilHojas(prevOt?.tapas || 0), 'T')
    } else {
      await descontarInsumo(HOJA_CODIGO, hojas - (prevOt?.hojas_usadas || 0), null)
    }

    // Actualizar el lote: avance de corte = piezas; si completó, avanza a Armado
    const completo = piezas >= (lote.cantidad_actual || lote.cantidad_objetivo)
    const patch = {
      avance: { ...(lote.avance || {}), corte: piezas },
      etapa: completo ? 'armado' : 'corte',
      estado: 'en_proceso',
      modificado_por: nombreUsuario, modificado_por_at: new Date().toISOString(),
    }
    await supabase.from('produccion_lotes').update(patch).eq('id', lote.id)

    // Sumar usos al herramental usado (por el delta de este guardado)
    if (es1400) {
      const dT = tapas - (prevOt?.tapas || 0), dC = contratapas - (prevOt?.contratapas || 0)
      if (dT || dC) for (const id of [f.disco_id, f.cinta_id, f.pie_id].filter(Boolean)) {
        try {
          const { data: hr } = await supabase.from('herramental').select('usos_1400w_t,usos_1400w_ct').eq('id', id).single()
          if (hr) await supabase.from('herramental').update({ usos_1400w_t: Math.max(0, (hr.usos_1400w_t || 0) + dT), usos_1400w_ct: Math.max(0, (hr.usos_1400w_ct || 0) + dC) }).eq('id', id)
        } catch (_) { /* no bloquea */ }
      }
    } else {
      const deltaPiezas = piezas - (prevOt?.piezas || 0)
      if (deltaPiezas !== 0) {
        const col = lote.modelo.includes('250') ? 'usos_250w' : 'usos_500w'
        for (const id of [f.disco_id, f.cinta_id, f.pie_id].filter(Boolean)) {
          try {
            const { data: hr } = await supabase.from('herramental').select(col).eq('id', id).single()
            if (hr) await supabase.from('herramental').update({ [col]: Math.max(0, (hr[col] || 0) + deltaPiezas) }).eq('id', id)
          } catch (_) { /* no bloquea */ }
        }
      }
    }

    setG(false)
    toast.success('OT de Corte guardada ✅')
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

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>📋 OT de Corte · Lote {lote.modelo === '1400w' ? 'F' : '#'}{lote.numero}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{lote.modelo}{lote.terminacion ? ` · ${lote.terminacion}` : ''} · {lote.cantidad_objetivo} u. {es1400 ? '(320 T + 320 CT · 8 por hoja)' : <>→ <b style={{ color: 'var(--text2)' }}>{lote.hojas} hojas STD</b> ({ratio} u/hoja)</>}</div>
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

          {/* Inicio */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>▶ Inicio</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={lbl}>Fecha inicio</label><input type="date" value={f.fecha_inicio} onChange={e => setF(s => ({ ...s, fecha_inicio: e.target.value }))} style={iSt} /></div>
              <div><label style={lbl}>Hora inicio</label><input type="time" value={f.hora_inicio} onChange={e => setF(s => ({ ...s, hora_inicio: e.target.value }))} style={iSt} /></div>
            </div>
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

          {/* Mediciones */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)' }}>📏 Controles de medición (5)</div>
              <label style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 6 }}>Medida objetivo <input type="text" value={f.medida_objetivo} onChange={e => setF(s => ({ ...s, medida_objetivo: e.target.value }))} placeholder="Ej: 290x590mm" style={{ ...iSt, width: 130, padding: '5px 8px' }} /></label>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {f.mediciones.map((m, i) => {
                const obj = f.medida_objetivo.trim() === '' ? null : f.medida_objetivo
                const val = m === '' ? null : m
                const desvio = obj != null && val != null && normMed(val) !== normMed(obj)
                return <div key={i}>
                  <label style={{ ...lbl, textAlign: 'center' }}>#{i + 1}</label>
                  <input type="text" value={m} placeholder={f.medida_objetivo || '—'} onChange={e => setF(s => ({ ...s, mediciones: s.mediciones.map((x, j) => j === i ? e.target.value : x) }))}
                    style={{ ...iSt, textAlign: 'center', borderColor: desvio ? 'rgba(255,85,119,0.5)' : 'var(--border)', color: desvio ? '#ff5577' : 'var(--text)' }} />
                </div>
              })}
            </div>
          </div>

          {/* Producción (insumos → entregó) */}
          {es1400 ? (
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>📦 Corte de tapas (T) y contratapas (CT)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#3dd68c', marginBottom: 6 }}>Contratapas (CT)</div>
                  <label style={lbl}>CT cortadas</label>
                  <input type="number" value={f.contratapas} onChange={e => setF(s => ({ ...s, contratapas: e.target.value }))} placeholder={String(lote.cantidad_objetivo)} style={iSt} />
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Hoja: <b style={{ color: 'var(--text2)' }}>MPSTD6</b> · {hojasCt} hojas</div>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#7b9fff', marginBottom: 6 }}>Tapas (T)</div>
                  <label style={lbl}>T cortadas</label>
                  <input type="number" value={f.tapas} onChange={e => setF(s => ({ ...s, tapas: e.target.value }))} placeholder={String(lote.cantidad_objetivo)} style={iSt} />
                  <label style={{ ...lbl, marginTop: 8 }}>Hoja de la tapa</label>
                  <input value={f.insumo_tapa} onChange={e => setF(s => ({ ...s, insumo_tapa: e.target.value }))} placeholder="Ej: SIMMTG6" style={iSt} />
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{hojasTapa} hojas de <b style={{ color: 'var(--text2)' }}>{insumoTapa || '—'}</b></div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                <div><div style={lbl}>Paneles completos (mín T,CT)</div><div style={{ fontSize: 22, fontWeight: 800, color: piezas >= lote.cantidad_objetivo ? '#3dd68c' : '#fb923c' }}>{piezas}<span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400 }}> / {lote.cantidad_objetivo}</span></div></div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Se descuentan del stock: {hojasCt} de MPSTD6 (CT){insumoTapa && insumoTapa !== HOJA_CODIGO ? ` y ${hojasTapa} de ${insumoTapa} (T)` : insumoTapa === HOJA_CODIGO ? ` + ${hojasTapa} de MPSTD6 (T)` : ''}. Al completar, el lote pasa a <b>Aguj1+Alambre+Pegado</b>.</div>
            </div>
          ) : (
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>📦 Insumo usado → semiproducto</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div><label style={lbl}>Hojas STD usadas</label><input type="number" value={f.hojas_usadas} onChange={e => setF(s => ({ ...s, hojas_usadas: e.target.value }))} placeholder={String(lote.hojas)} style={{ ...iSt, width: 120 }} /></div>
                <div style={{ fontSize: 22, color: 'var(--text3)' }}>→</div>
                <div><div style={lbl}>Entregó (paneles)</div><div style={{ fontSize: 22, fontWeight: 800, color: piezas >= lote.cantidad_objetivo ? '#3dd68c' : '#fb923c' }}>{piezas}<span style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 400 }}> / {lote.cantidad_objetivo}</span></div></div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Se descuentan las hojas del stock (MPSTD6). Si completás, el lote pasa a <b>Aguj1+Alambre+Pegado</b>.</div>
            </div>
          )}

          {/* Cambio de herramental */}
          <div><label style={lbl}>Cambio de herramental (si hubo)</label><input value={f.herramental_cambio} onChange={e => setF(s => ({ ...s, herramental_cambio: e.target.value }))} placeholder="Ej: se cambió el disco a las 12hs (cód/lote)" style={iSt} /></div>

          {/* Fin + duración */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>⏹ Finalización</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'end' }}>
              <div><label style={lbl}>Fecha fin</label><input type="date" value={f.fecha_fin} onChange={e => setF(s => ({ ...s, fecha_fin: e.target.value }))} style={iSt} /></div>
              <div><label style={lbl}>Hora fin</label><input type="time" value={f.hora_fin} onChange={e => setF(s => ({ ...s, hora_fin: e.target.value }))} style={iSt} /></div>
              <div style={{ paddingBottom: 8 }}><div style={lbl}>Duración</div><div style={{ fontSize: 16, fontWeight: 800, color: '#7b9fff' }}>{fmtDur(duracion)}</div></div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>Descuenta desayuno (9-9:15), descanso (11-11:05), almuerzo (13-13:30) y descanso (15-15:05). Jornada hasta 16:30 (L-J) / 14:00 (V), inicio 08:00.</div>
          </div>

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
