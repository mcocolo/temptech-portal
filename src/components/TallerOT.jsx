import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }
const lbl = { fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4, letterSpacing: '0.3px' }
const int = v => parseInt(v) || 0
const num = v => parseFloat(v) || 0
const round3 = n => Math.round(n * 1000) / 1000

// Duración (mismas pausas/jornada que las otras OT)
const BREAKS = [[540, 555], [660, 665], [780, 810], [900, 905]]
const DAY_START = 480
const hm = s => { if (!s) return null; const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0) }
const parseYMD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const fmtISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const overlap = (a1, a2, b1, b2) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1))
function calcularDuracion(fi, hi, ff, hf) {
  if (!fi || !hi || !ff || !hf) return null
  const start = parseYMD(fi), end = parseYMD(ff); if (end < start) return null
  let total = 0
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay(); if (dow === 0 || dow === 6) continue
    const iso = fmtISO(d), dayEnd = dow === 5 ? 840 : 990
    const wStart = iso === fi ? hm(hi) : DAY_START
    const wEnd = iso === ff ? Math.min(hm(hf), dayEnd) : dayEnd
    let mins = Math.max(0, wEnd - wStart)
    for (const [b1, b2] of BREAKS) mins -= overlap(wStart, wEnd, b1, b2)
    total += Math.max(0, mins)
  }
  return total
}
const fmtDur = m => m == null ? '—' : `${Math.floor(m / 60)}h ${m % 60}m`

// Taller de Firenze (1400w):
//   CT (contratapa): se agujerea y se lija
//   T  (tapa):       se agujerea, se aplica enduido y luego se lija
const FASES_CT = [['ct_aguj', 'Agujereado'], ['ct_lija', 'Lijado']]
const FASES_T = [['t_aguj', 'Agujereado'], ['t_enduido', 'Enduido'], ['t_lija', 'Lijado']]
const FASES = [...FASES_CT, ...FASES_T]
const FASE_KEYS = FASES.map(([k]) => k)
const SECTORES_TALLER = ['1400w', 'Taller']   // sectores (Empleados / Insumos) del taller Firenze
const FALLBACK_INS = [
  { cod: 'ENDUIDO', label: 'Enduido' }, { cod: 'LIJA', label: 'Lija' },
]

const emptyTiempo = () => ({ fi: '', hi: '', ff: '', hf: '' })
const FDEF = {
  tiempos: FASE_KEYS.reduce((o, k) => (o[k] = emptyTiempo(), o), {}),
  personalFase: FASE_KEYS.reduce((o, k) => (o[k] = [], o), {}),
  mechas: [{ lote: '' }, { lote: '' }],
  insumos: {},
  ct_ok: '', t_ok: '', no_conforme: '', notas: '',
}
const clone = o => JSON.parse(JSON.stringify(o))

// Nivel de módulo (NO dentro del componente) para no re-montar y perder el foco al tipear
const Sec = ({ t, children }) => <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>{t}</div>{children}</div>

export default function TallerOT({ lote, onClose, onDone }) {
  const { user, profile } = useAuth()
  const nombreUsuario = profile?.full_name || user?.email || 'Producción'
  const target = lote.cantidad_actual || lote.cantidad_objetivo
  const [empleados, setEmpleados] = useState([])
  const [insumosCat, setInsumosCat] = useState(FALLBACK_INS)
  const [prevOt, setPrevOt] = useState(null)
  const [g, setG] = useState(false)
  const [f, setF] = useState(clone(FDEF))

  useEffect(() => { cargar() }, [])
  async function cargar() {
    const [e, ins, ot] = await Promise.all([
      supabase.from('empleados').select('apodo,nombre,sectores').eq('activo', true).order('apodo'),
      supabase.from('insumos').select('*').eq('tipo', 'directo').order('codigo'),
      supabase.from('produccion_ot').select('*').eq('lote_id', lote.id).eq('etapa', 'taller').maybeSingle(),
    ])
    setEmpleados((e.data || []).filter(x => !(x.sectores || []).length || SECTORES_TALLER.some(s => (x.sectores || []).includes(s))))
    const tall = (ins.data || []).filter(i => !i.discontinuado && Array.isArray(i.sectores) && i.sectores.some(s => SECTORES_TALLER.includes(s)))
    setInsumosCat(tall.length ? tall.map(i => ({ cod: i.codigo, label: i.descripcion || i.codigo })) : FALLBACK_INS)
    if (ot.data) {
      setPrevOt(ot.data)
      const d = ot.data.datos || {}
      setF({
        ...clone(FDEF), ...d,
        tiempos: { ...FDEF.tiempos, ...(d.tiempos || {}) },
        personalFase: { ...FDEF.personalFase, ...(d.personalFase || {}) },
        mechas: d.mechas || clone(FDEF.mechas),
        insumos: { ...(d.insumos || {}) },
        ct_ok: d.ct_ok ?? '', t_ok: d.t_ok ?? '', no_conforme: d.no_conforme ?? '', notas: ot.data.notas || '',
      })
    }
  }

  const setD = (path, val) => setF(s => { const n = clone(s); let o = n; const ks = path.split('.'); for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = val; return n })
  const togglePers = (fase, ap) => setF(s => { const n = clone(s); const arr = n.personalFase[fase]; n.personalFase[fase] = arr.includes(ap) ? arr.filter(x => x !== ap) : [...arr, ap]; return n })
  const setIns = (cod, campo, val) => setF(s => { const n = clone(s); if (!n.insumos[cod]) n.insumos[cod] = { cant: '', lote: '' }; n.insumos[cod][campo] = val; return n })

  const ctOk = int(f.ct_ok), tOk = int(f.t_ok)
  const conforme = Math.min(ctOk, tOk)   // panel completo = 1 CT + 1 T terminadas
  const duracion = FASES.reduce((sum, [k]) => sum + (calcularDuracion(f.tiempos[k].fi, f.tiempos[k].hi, f.tiempos[k].ff, f.tiempos[k].hf) || 0), 0) || null

  async function descontar(codigo, delta, lote_ins) {
    if (!codigo || !delta) return
    try {
      const { data: ins } = await supabase.from('insumos').select('id,stock_actual').eq('codigo', codigo).limit(1)
      const row = ins?.[0]
      if (row) {
        await supabase.from('insumos').update({ stock_actual: round3((row.stock_actual || 0) - delta), updated_at: new Date().toISOString() }).eq('id', row.id)
        await supabase.from('movimientos_insumos').insert({ insumo_id: row.id, tipo: delta > 0 ? 'egreso' : 'ingreso', cantidad: round3(Math.abs(delta)), sector: 'Taller', motivo: `OT Taller · Lote F${lote.numero}`, lote: lote_ins || null, usuario_id: user?.id, usuario_nombre: nombreUsuario })
      }
    } catch (_) { /* no bloquea */ }
  }

  async function guardar() {
    setG(true)
    const datos = { tiempos: f.tiempos, personalFase: f.personalFase, mechas: f.mechas, insumos: f.insumos, ct_ok: ctOk, t_ok: tOk, no_conforme: int(f.no_conforme) }
    const personalPlano = [...new Set(FASE_KEYS.flatMap(k => f.personalFase[k]))]
    const payload = {
      lote_id: lote.id, etapa: 'taller',
      fecha_inicio: f.tiempos.ct_aguj.fi || f.tiempos.t_aguj.fi || null,
      hora_inicio: f.tiempos.ct_aguj.hi || f.tiempos.t_aguj.hi || null,
      fecha_fin: f.tiempos.t_lija.ff || f.tiempos.ct_lija.ff || null,
      hora_fin: f.tiempos.t_lija.hf || f.tiempos.ct_lija.hf || null,
      personal: personalPlano, piezas: conforme, duracion_min: duracion, notas: f.notas.trim() || null,
      datos,
      ...(prevOt ? {} : { creado_por: nombreUsuario }),
      modificado_por: nombreUsuario, modificado_por_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('produccion_ot').upsert(payload, { onConflict: 'lote_id,etapa' })
    if (error) { setG(false); toast.error('Error: ' + error.message); return }

    // Descontar insumos por el delta respecto de lo ya descontado
    const prev = prevOt?.datos || {}
    for (const { cod } of insumosCat) await descontar(cod, num(f.insumos[cod]?.cant) - num(prev.insumos?.[cod]?.cant), f.insumos[cod]?.lote)

    // Avance de taller = paneles completos; si llegó al objetivo, pasa a Terminado
    const completo = conforme >= target && conforme > 0
    await supabase.from('produccion_lotes').update({
      avance: { ...(lote.avance || {}), taller: conforme },
      etapa: completo ? 'terminado' : 'taller', estado: completo ? 'terminado' : 'en_proceso',
      cantidad_actual: conforme > 0 ? conforme : lote.cantidad_actual,
      modificado_por: nombreUsuario, modificado_por_at: new Date().toISOString(),
    }).eq('id', lote.id)

    setG(false)
    toast.success('OT de Taller guardada ✅')
    onClose(); onDone()
  }


  const filaFase = (k, label) => (
    <div key={k} style={{ marginBottom: 10, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
        <input key={'fi' + f.tiempos[k].fi} type="date" defaultValue={f.tiempos[k].fi} onBlur={e => setD(`tiempos.${k}.fi`, e.target.value)} style={iSt} title="Fecha inicio" />
        <input key={'hi' + f.tiempos[k].hi} type="time" defaultValue={f.tiempos[k].hi} onBlur={e => setD(`tiempos.${k}.hi`, e.target.value)} style={iSt} title="Hora inicio" />
        <input key={'ff' + f.tiempos[k].ff} type="date" defaultValue={f.tiempos[k].ff} onBlur={e => setD(`tiempos.${k}.ff`, e.target.value)} style={iSt} title="Fecha fin" />
        <input key={'hf' + f.tiempos[k].hf} type="time" defaultValue={f.tiempos[k].hf} onBlur={e => setD(`tiempos.${k}.hf`, e.target.value)} style={iSt} title="Hora fin" />
      </div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {empleados.map(e => { const sel = f.personalFase[k].includes(e.apodo); return (
          <button key={e.apodo} onClick={() => togglePers(k, e.apodo)} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(61,214,140,0.15)' : 'var(--surface)', color: sel ? '#3dd68c' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(61,214,140,0.45)' : 'var(--border)'}` }}>{e.apodo}</button>
        ) })}
        {empleados.length === 0 && <span style={{ fontSize: 12, color: 'var(--text3)' }}>Asigná empleados al sector 1400w / Taller en Empleados.</span>}
      </div>
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 820, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>🛠 OT de Taller · Lote F{lote.numero}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{lote.modelo}{lote.terminacion ? ` · ${lote.terminacion}` : ''} · {target} paneles (viene de Corte)</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><span style={{ fontSize: 12 }}>Duración total: <b style={{ color: '#22d3ee' }}>{fmtDur(duracion)}</b></span></div>

          {/* Rama CT */}
          <Sec t="◧ Contratapa (CT) — se agujerea y se lija">
            {FASES_CT.map(([k, label]) => filaFase(k, label))}
          </Sec>

          {/* Rama T */}
          <Sec t="◨ Tapa (T) — se agujerea, se aplica enduido y luego se lija">
            {FASES_T.map(([k, label]) => filaFase(k, label))}
          </Sec>

          {/* Herramental de agujereado */}
          <Sec t="🔧 Herramental (mechas de agujereado)">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {f.mechas.map((m, i) => (
                <div key={i}><label style={lbl}>Mecha {i + 1}</label><input value={m.lote} onChange={e => setD(`mechas.${i}.lote`, e.target.value)} placeholder="N° de lote / ID" style={iSt} /></div>
              ))}
            </div>
          </Sec>

          {/* Insumos (enduido, lija, …) */}
          <Sec t="📦 Insumos usados — descuentan stock">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 420 }}>
                <thead><tr>
                  <th style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'left', padding: '4px 6px' }}>Insumo</th>
                  <th style={{ fontSize: 10, color: 'var(--text3)', padding: '4px 6px' }}>Cantidad</th>
                  <th style={{ fontSize: 10, color: 'var(--text3)', padding: '4px 6px' }}>Lote</th>
                </tr></thead>
                <tbody>
                  {insumosCat.map(({ cod, label }) => (
                    <tr key={cod}>
                      <td style={{ fontSize: 12, padding: '3px 6px' }}>{label} <span style={{ color: 'var(--text3)', fontFamily: 'monospace', fontSize: 10 }}>{cod}</span></td>
                      <td style={{ padding: '3px 4px' }}><input type="number" step="any" value={f.insumos[cod]?.cant ?? ''} onChange={e => setIns(cod, 'cant', e.target.value)} style={{ ...iSt, width: 90, padding: '5px 6px', textAlign: 'center' }} /></td>
                      <td style={{ padding: '3px 4px' }}><input value={f.insumos[cod]?.lote ?? ''} onChange={e => setIns(cod, 'lote', e.target.value)} placeholder="lote" style={{ ...iSt, width: 90, padding: '5px 6px' }} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>Los insumos salen de los que tienen sector <b>1400w</b> o <b>Taller</b> en Insumos Directos.</div>
          </Sec>

          {/* Resultado */}
          <Sec t="✅ Resultado">
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><label style={lbl}>CT terminadas (OK)</label><input type="number" value={f.ct_ok} onChange={e => setD('ct_ok', e.target.value)} placeholder="0" style={{ ...iSt, width: 120 }} /></div>
              <div><label style={lbl}>T terminadas (OK)</label><input type="number" value={f.t_ok} onChange={e => setD('t_ok', e.target.value)} placeholder="0" style={{ ...iSt, width: 120 }} /></div>
              <div><label style={lbl}>No conforme</label><input type="number" value={f.no_conforme} onChange={e => setD('no_conforme', e.target.value)} placeholder="0" style={{ ...iSt, width: 110, borderColor: int(f.no_conforme) > 0 ? 'rgba(255,85,119,0.5)' : 'var(--border)' }} /></div>
              <div><div style={lbl}>Paneles completos</div><div style={{ fontSize: 20, fontWeight: 800, color: conforme >= target ? '#3dd68c' : '#fb923c' }}>{conforme} / {target}</div></div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>Un panel completo = 1 CT + 1 T terminadas (se toma el mínimo). Al llegar al objetivo, el lote pasa a <b>Terminado</b>.</div>
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
