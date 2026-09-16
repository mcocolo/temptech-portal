import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 10px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }
const lbl = { fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4, letterSpacing: '0.3px' }
const int = v => parseInt(v) || 0

// Duración (mismas pausas/jornada que la OT de Corte)
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
  tiempos: { aguj1: { fi: '', hi: '', ff: '', hf: '' }, alambre: { fi: '', hi: '', ff: '', hf: '' }, pegado: { fi: '', hi: '', ff: '', hf: '' } },
  personalEst: { E1: [], E2: [], E3: [], E4: [], E5: [] },
  mechas: [{ cod: 'MM2', lote: '' }, { cod: 'MM2', lote: '' }, { cod: 'MM3', lote: '' }, { cod: 'MM3', lote: '' }],
  tubos: [], maqSil1: '', maqSil2: '', prensaAlambre: '',
  insumosEst: {},
  prensas: { P1: { cant: '', pres: '' }, P2: { cant: '', pres: '' }, P3: { cant: '', pres: '' }, P4: { cant: '', pres: '' } },
  conforme: '', no_conforme: '', notas: '',
}
const clone = o => JSON.parse(JSON.stringify(o))

export default function ArmadoOT({ lote, onClose, onDone }) {
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
      supabase.from('insumos').select('codigo,descripcion,sectores').eq('tipo', 'directo').order('codigo'),
      supabase.from('produccion_ot').select('*').eq('lote_id', lote.id).eq('etapa', 'armado').maybeSingle(),
    ])
    setEmpleados((e.data || []).filter(x => !(x.sectores || []).length || x.sectores.includes('Armado')))
    const arm = (ins.data || []).filter(i => Array.isArray(i.sectores) && i.sectores.some(s => SECTORES_ARMADO_INS.includes(s)))
    setInsumosCat(arm.length ? arm.map(i => ({ cod: i.codigo, label: i.descripcion || i.codigo })) : FALLBACK_INS)
    if (ot.data) {
      setPrevOt(ot.data)
      const d = ot.data.datos || {}
      setF({
        ...clone(FDEF), ...d,
        tiempos: { ...FDEF.tiempos, ...(d.tiempos || {}) },
        personalEst: { ...FDEF.personalEst, ...(d.personalEst || {}) },
        mechas: d.mechas || clone(FDEF.mechas),
        insumosEst: { ...(d.insumosEst || {}) },
        prensas: { ...FDEF.prensas, ...(d.prensas || {}) },
        conforme: ot.data.piezas ?? d.conforme ?? '', no_conforme: d.no_conforme ?? '', notas: ot.data.notas || '',
      })
    }
  }

  const setD = (path, val) => setF(s => { const n = clone(s); let o = n; const ks = path.split('.'); for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = val; return n })
  const togglePers = (est, ap) => setF(s => { const n = clone(s); const arr = n.personalEst[est]; n.personalEst[est] = arr.includes(ap) ? arr.filter(x => x !== ap) : [...arr, ap]; return n })
  const toggleTubo = t => setF(s => { const n = clone(s); n.tubos = n.tubos.includes(t) ? n.tubos.filter(x => x !== t) : [...n.tubos, t]; return n })
  const setInsEst = (cod, col, val) => setF(s => { const n = clone(s); if (!n.insumosEst[cod]) n.insumosEst[cod] = emptyEst(); n.insumosEst[cod][col] = val; return n })

  const conforme = int(f.conforme)
  const duracion = FASES.reduce((sum, [k]) => sum + (calcularDuracion(f.tiempos[k].fi, f.tiempos[k].hi, f.tiempos[k].ff, f.tiempos[k].hf) || 0), 0) || null

  const totalInsumo = cod => COLS.reduce((s, c) => s + int(f.insumosEst[cod]?.[c]), 0)

  async function descontar(codigo, delta, lote_ins) {
    if (!codigo || !delta) return
    try {
      const { data: ins } = await supabase.from('insumos').select('id,stock_actual').eq('codigo', codigo).limit(1)
      const row = ins?.[0]
      if (row) {
        await supabase.from('insumos').update({ stock_actual: Math.max(0, (row.stock_actual || 0) - delta), updated_at: new Date().toISOString() }).eq('id', row.id)
        await supabase.from('movimientos_insumos').insert({ insumo_id: row.id, tipo: delta > 0 ? 'egreso' : 'ingreso', cantidad: Math.abs(delta), sector: 'Armado', motivo: `OT Armado · Lote #${lote.numero}`, lote: lote_ins || null, usuario_id: user?.id, usuario_nombre: nombreUsuario })
      }
    } catch (_) { /* no bloquea */ }
  }

  async function guardar() {
    setG(true)
    const datos = { tiempos: f.tiempos, personalEst: f.personalEst, mechas: f.mechas, tubos: f.tubos, maqSil1: f.maqSil1, maqSil2: f.maqSil2, prensaAlambre: f.prensaAlambre, insumosEst: f.insumosEst, prensas: f.prensas, no_conforme: int(f.no_conforme) }
    const personalPlano = [...new Set(ESTACIONES.flatMap(e => f.personalEst[e]))]
    const payload = {
      lote_id: lote.id, etapa: 'armado',
      fecha_inicio: f.tiempos.aguj1.fi || null, hora_inicio: f.tiempos.aguj1.hi || null,
      fecha_fin: f.tiempos.pegado.ff || null, hora_fin: f.tiempos.pegado.hf || null,
      personal: personalPlano, piezas: conforme, duracion_min: duracion, notas: f.notas.trim() || null,
      datos,
      ...(prevOt ? {} : { creado_por: nombreUsuario }),
      modificado_por: nombreUsuario, modificado_por_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('produccion_ot').upsert(payload, { onConflict: 'lote_id,etapa' })
    if (error) { setG(false); toast.error('Error: ' + error.message); return }

    // Descontar insumos por el delta respecto de lo ya descontado
    const prev = prevOt?.datos || {}
    const prevTot = cod => COLS.reduce((s, c) => s + int(prev.insumosEst?.[cod]?.[c]), 0)
    for (const { cod } of insumosCat) await descontar(cod, totalInsumo(cod) - prevTot(cod), f.insumosEst[cod]?.lote)

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

  const Sec = ({ t, children }) => <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>{t}</div>{children}</div>

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 820, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>🧵 OT Aguj N°1 + Alambre + Pegado · Lote #{lote.numero}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{lote.modelo} · {target} u. a trabajar (viene de Corte)</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Tiempos por fase */}
          <Sec t="⏱ Tiempos por fase (duración suma las tres)">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}><span style={{ fontSize: 12 }}>Duración total: <b style={{ color: '#7b9fff' }}>{fmtDur(duracion)}</b></span></div>
            {FASES.map(([k, label]) => (
              <div key={k} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                  <input type="date" value={f.tiempos[k].fi} onChange={e => setD(`tiempos.${k}.fi`, e.target.value)} style={iSt} title="Fecha inicio" />
                  <input type="time" value={f.tiempos[k].hi} onChange={e => setD(`tiempos.${k}.hi`, e.target.value)} style={iSt} title="Hora inicio" />
                  <input type="date" value={f.tiempos[k].ff} onChange={e => setD(`tiempos.${k}.ff`, e.target.value)} style={iSt} title="Fecha fin" />
                  <input type="time" value={f.tiempos[k].hf} onChange={e => setD(`tiempos.${k}.hf`, e.target.value)} style={iSt} title="Hora fin" />
                </div>
              </div>
            ))}
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
              {f.mechas.map((m, i) => (
                <div key={i}><label style={lbl}>Micromecha {m.cod}</label><input value={m.lote} onChange={e => setD(`mechas.${i}.lote`, e.target.value)} placeholder="N° de lote" style={iSt} /></div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div><label style={lbl}>Maq-Sil1</label><input value={f.maqSil1} onChange={e => setD('maqSil1', e.target.value)} placeholder="ID / lote" style={iSt} /></div>
              <div><label style={lbl}>Maq-Sil2</label><input value={f.maqSil2} onChange={e => setD('maqSil2', e.target.value)} placeholder="ID / lote" style={iSt} /></div>
              <div><label style={lbl}>Prensa-Alambre</label><input value={f.prensaAlambre} onChange={e => setD('prensaAlambre', e.target.value)} placeholder="ID / lote" style={iSt} /></div>
            </div>
            <label style={lbl}>Tubos de aluminio usados</label>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {TUBOS.map(t => { const sel = f.tubos.includes(t); return (
                <button key={t} onClick={() => toggleTubo(t)} style={{ padding: '4px 9px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(74,108,247,0.15)' : 'var(--surface2)', color: sel ? '#7b9fff' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(74,108,247,0.45)' : 'var(--border)'}` }}>TubAl{t}</button>
              ) })}
            </div>
          </Sec>

          {/* Insumos por estación (dinámico: insumos con sector Alambre/Pegado) */}
          <Sec t="📦 Insumos por estación (E1–E5) — descuentan stock">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 620 }}>
                <thead><tr>
                  <th style={{ fontSize: 10, color: 'var(--text3)', textAlign: 'left', padding: '4px 6px' }}>Insumo</th>
                  {COLS.map(e => <th key={e} style={{ fontSize: 10, color: 'var(--text3)', padding: '4px 6px' }}>{e}</th>)}
                  <th style={{ fontSize: 10, color: 'var(--text3)', padding: '4px 6px' }}>Lote</th>
                  <th style={{ fontSize: 10, color: 'var(--text3)', padding: '4px 6px' }}>Total</th>
                </tr></thead>
                <tbody>
                  {insumosCat.map(({ cod, label }) => (
                    <tr key={cod}>
                      <td style={{ fontSize: 12, padding: '3px 6px' }}>{label} <span style={{ color: 'var(--text3)', fontFamily: 'monospace', fontSize: 10 }}>{cod}</span></td>
                      {COLS.map(e => (
                        <td key={e} style={{ padding: '3px 4px' }}><input type="number" value={f.insumosEst[cod]?.[e] ?? ''} onChange={ev => setInsEst(cod, e, ev.target.value)} style={{ ...iSt, width: 54, padding: '5px 6px', textAlign: 'center' }} /></td>
                      ))}
                      <td style={{ padding: '3px 4px' }}><input value={f.insumosEst[cod]?.lote ?? ''} onChange={ev => setInsEst(cod, 'lote', ev.target.value)} placeholder="lote" style={{ ...iSt, width: 70, padding: '5px 6px' }} /></td>
                      <td style={{ padding: '3px 6px', fontWeight: 800, color: '#7b9fff', textAlign: 'center' }}>{totalInsumo(cod)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>Los insumos salen de los que tienen sector <b>Alambre</b> o <b>Pegado</b> en Insumos Directos. E5 = Pegado.</div>
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
