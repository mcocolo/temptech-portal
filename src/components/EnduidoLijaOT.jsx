import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 11px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }
const lbl = { fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4, letterSpacing: '0.3px' }
const int = v => parseInt(v) || 0
const DEFAULT_BREAKS = [[540, 555], [660, 665], [780, 810], [900, 905]]
const hm = s => { if (!s) return null; const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0) }
const overlap = (a1, a2, b1, b2) => Math.max(0, Math.min(a2, b2) - Math.max(a1, b1))
function calcularDuracion(hi, hf, breaks = DEFAULT_BREAKS) {
  const a = hm(hi), b = hm(hf)
  if (a == null || b == null || b < a) return null
  let mins = b - a
  for (const [b1, b2] of breaks) mins -= overlap(a, b, b1, b2)
  return Math.max(0, mins)
}
const fmtDur = m => m == null ? '—' : `${Math.floor(m / 60)}h ${m % 60}m`
const clone = o => JSON.parse(JSON.stringify(o))
const round3 = n => Math.round((Number(n) || 0) * 1000) / 1000
const numf = v => { if (v === '' || v == null) return 0; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n }
const Sec = ({ t, children }) => <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>{t}</div>{children}</div>

export default function EnduidoLijaOT({ lote, onClose, onDone }) {
  const { user, profile } = useAuth()
  const nombreUsuario = profile?.full_name || user?.email || 'Producción'
  const target = lote.cantidad_actual || lote.cantidad_objetivo

  const [empleados, setEmpleados] = useState([])
  const [maquinas, setMaquinas] = useState([])
  const [herr, setHerr] = useState([])
  const [insumos, setInsumos] = useState([])
  const [pausas, setPausas] = useState(DEFAULT_BREAKS)
  const [prevOt, setPrevOt] = useState(null)
  const [g, setG] = useState(false)
  const [f, setF] = useState({
    jornadas: [{ fecha: new Date().toISOString().split('T')[0], hi: '', hf: '' }],
    personal: [], maquinasUsadas: [], herramientas: [], supervisor: '',
    enduido_id: '', enduido_kg: '',
    ok: '', no_conforme: '', notas: '',
  })

  useEffect(() => { cargar() }, [])
  async function cargar() {
    const [e, mq, h, ins, ot, pau] = await Promise.all([
      supabase.from('empleados').select('apodo,nombre,sectores').eq('activo', true).order('apodo'),
      supabase.from('maquinas').select('id,nombre,codigo,sigla,sectores,estado_vida').order('nombre'),
      supabase.from('herramental').select('*').eq('activo', true).order('nombre'),
      supabase.from('insumos').select('id,codigo,nombre,unidad,stock_actual,sectores').order('nombre'),
      supabase.from('produccion_ot').select('*').eq('lote_id', lote.id).eq('etapa', 'enduido_lija').maybeSingle(),
      supabase.from('pausas_produccion').select('desde,hasta,activo').eq('activo', true),
    ])
    if (pau.data && pau.data.length) setPausas(pau.data.map(p => [hm(p.desde), hm(p.hasta)]).filter(x => x[0] != null && x[1] != null))
    setEmpleados((e.data || []).filter(x => !(x.sectores || []).length || (x.sectores || []).includes('Lija')))
    const maqAct = (mq.data || []).filter(m => !['discontinuado', 'eliminado'].includes(m.estado_vida))
    setMaquinas(maqAct.filter(m => (m.sectores || []).includes('Lija')))
    setHerr((h.data || []).filter(x => !(x.sectores || []).length || (x.sectores || []).includes('Lija')))
    // Insumos candidatos: los que digan "enduido" primero; si no hay, todos
    const todosIns = ins.data || []
    const enduidoIns = todosIns.filter(x => `${x.nombre || ''} ${x.codigo || ''}`.toLowerCase().includes('enduido'))
    setInsumos(enduidoIns.length ? enduidoIns : todosIns)
    const defEnd = enduidoIns[0]?.id || ''
    if (ot.data) {
      setPrevOt(ot.data)
      const d = ot.data.datos || {}
      setF(s => ({
        ...s,
        jornadas: Array.isArray(d.jornadas) && d.jornadas.length ? d.jornadas : s.jornadas,
        personal: d.personal || [], maquinasUsadas: d.maquinasUsadas || [], herramientas: d.herramientas || [],
        supervisor: d.supervisor || '',
        enduido_id: d.enduido_id || defEnd, enduido_kg: d.enduido_kg ?? '',
        ok: ot.data.piezas ?? d.ok ?? '', no_conforme: d.no_conforme ?? '', notas: ot.data.notas || '',
      }))
    } else {
      setF(s => ({ ...s, enduido_id: defEnd }))
    }
  }

  const togglePers = ap => setF(s => ({ ...s, personal: s.personal.includes(ap) ? s.personal.filter(x => x !== ap) : [...s.personal, ap] }))
  const toggleMaquina = id => setF(s => { const arr = s.maquinasUsadas || []; return { ...s, maquinasUsadas: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] } })
  const toggleHerr = id => setF(s => { const arr = s.herramientas || []; return { ...s, herramientas: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] } })
  const setJornada = (i, campo, val) => setF(s => { const n = clone(s); n.jornadas[i][campo] = val; return n })
  const addJornada = () => setF(s => ({ ...s, jornadas: [...s.jornadas, { fecha: '', hi: '', hf: '' }] }))
  const delJornada = i => setF(s => ({ ...s, jornadas: s.jornadas.length > 1 ? s.jornadas.filter((_, j) => j !== i) : s.jornadas }))

  const conforme = int(f.ok)
  const duracion = f.jornadas.reduce((sum, j) => sum + (calcularDuracion(j.hi, j.hf, pausas) || 0), 0) || null

  async function guardar() {
    setG(true)
    const alcanzo = conforme >= target && conforme > 0
    const COL = 'usos_enduido_lija'
    const prevD = prevOt?.datos || {}
    const targets = [
      ...(f.maquinasUsadas || []).map(id => ({ tabla: 'maquinas', id })),
      ...(f.herramientas || []).map(id => ({ tabla: 'herramental', id })),
    ]
    const prevU = (prevD.usosEnduidoLija && typeof prevD.usosEnduidoLija === 'object') ? prevD.usosEnduidoLija : {}
    const nuevoU = {}, acciones = []
    for (const t of targets) { const key = `${t.tabla}:${t.id}`; nuevoU[key] = conforme; const d = conforme - int(prevU[key]); if (d) acciones.push({ tabla: t.tabla, id: t.id, delta: d }) }
    for (const key of Object.keys(prevU)) { if (key in nuevoU) continue; const [tabla, id] = key.split(':'); if (int(prevU[key])) acciones.push({ tabla, id, delta: -int(prevU[key]) }) }

    const datos = { jornadas: f.jornadas, personal: f.personal, maquinasUsadas: f.maquinasUsadas, herramientas: f.herramientas, ok: conforme, no_conforme: int(f.no_conforme), notas: f.notas, supervisor: f.supervisor || null, usosEnduidoLija: nuevoU, enduido_id: f.enduido_id || null, enduido_kg: numf(f.enduido_kg) }
    const ultJor = f.jornadas[f.jornadas.length - 1] || {}
    const payload = {
      lote_id: lote.id, etapa: 'enduido_lija',
      fecha_inicio: f.jornadas[0]?.fecha || null, hora_inicio: f.jornadas[0]?.hi || null,
      fecha_fin: ultJor.fecha || null, hora_fin: ultJor.hf || null,
      personal: f.personal, piezas: conforme, duracion_min: duracion, notas: f.notas.trim() || null,
      datos, ...(prevOt ? {} : { creado_por: nombreUsuario }),
      modificado_por: nombreUsuario, modificado_por_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('produccion_ot').upsert(payload, { onConflict: 'lote_id,etapa' })
    if (error) { setG(false); toast.error('Error: ' + error.message); return }

    for (const a of acciones) {
      try {
        const { data: row } = await supabase.from(a.tabla).select(`id,${COL}`).eq('id', a.id).single()
        if (row) await supabase.from(a.tabla).update({ [COL]: Math.max(0, (row[COL] || 0) + a.delta) }).eq('id', a.id)
      } catch (_) { /* no bloquea */ }
    }

    // Descuento de enduido (Kg): aplica el delta respecto de lo ya descontado por esta OT
    try {
      const prevEndId = prevD.enduido_id || null
      const prevEndKg = round3(prevD.enduido_kg)
      const curEndId = f.enduido_id || null
      const curEndKg = round3(numf(f.enduido_kg))
      const descEnd = async (insId, delta) => {
        if (!insId || !delta) return
        const { data: ins } = await supabase.from('insumos').select('id,stock_actual').eq('id', insId).limit(1)
        const row = ins?.[0]; if (!row) return
        await supabase.from('insumos').update({ stock_actual: round3((row.stock_actual || 0) - delta), updated_at: new Date().toISOString() }).eq('id', insId)
        await supabase.from('movimientos_insumos').insert({ insumo_id: insId, tipo: delta > 0 ? 'egreso' : 'ingreso', cantidad: round3(Math.abs(delta)), sector: 'Lija', motivo: `OT Enduido + Lija · Lote #${lote.numero}`, usuario_id: user?.id, usuario_nombre: nombreUsuario })
      }
      if (prevEndId && prevEndId !== curEndId) {
        // Cambió el insumo: devuelve lo descontado al anterior y descuenta todo al nuevo
        if (prevEndKg) await descEnd(prevEndId, -prevEndKg)
        if (curEndKg) await descEnd(curEndId, curEndKg)
      } else if (curEndId) {
        const delta = round3(curEndKg - prevEndKg)
        if (delta) await descEnd(curEndId, delta)
      }
    } catch (_) { /* no bloquea */ }

    await supabase.from('produccion_lotes').update({
      avance: { ...(lote.avance || {}), enduido_lija: conforme },
      etapa: alcanzo ? 'pintura' : 'enduido_lija', estado: 'en_proceso',
      cantidad_actual: conforme > 0 ? conforme : lote.cantidad_actual,
      modificado_por: nombreUsuario, modificado_por_at: new Date().toISOString(),
    }).eq('id', lote.id)

    setG(false)
    toast.success(alcanzo ? 'Enduido + Lija finalizado ✅ · pasa a Pintura' : 'OT de Enduido + Lija guardada ✅')
    onClose(); onDone()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>🎨 OT Enduido + Lija · Lote #{lote.numero}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{lote.modelo}{lote.terminacion ? ` · ${lote.terminacion}` : ''} · {target} paneles (viene de Aguj N°2)</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Sec t="🕒 Tiempos (una fila por jornada)">
            {f.jornadas.map((j, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: 8, marginBottom: 6, alignItems: 'end' }}>
                <div><label style={lbl}>Fecha</label><input type="date" value={j.fecha} onChange={e => setJornada(i, 'fecha', e.target.value)} style={iSt} /></div>
                <div><label style={lbl}>Inicio</label><input type="time" value={j.hi} onChange={e => setJornada(i, 'hi', e.target.value)} style={iSt} /></div>
                <div><label style={lbl}>Fin</label><input type="time" value={j.hf} onChange={e => setJornada(i, 'hf', e.target.value)} style={iSt} /></div>
                <button onClick={() => delJornada(i)} disabled={f.jornadas.length <= 1} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '8px 9px', fontSize: 12, cursor: f.jornadas.length <= 1 ? 'default' : 'pointer', fontFamily: 'var(--font)', opacity: f.jornadas.length <= 1 ? 0.4 : 1 }}>🗑</button>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={addJornada} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px dashed var(--border)', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>+ Agregar jornada</button>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Duración: <span style={{ color: '#7b9fff' }}>{fmtDur(duracion)}</span></span>
            </div>
          </Sec>

          <Sec t="👷 Personal">
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {empleados.map(e => { const sel = f.personal.includes(e.apodo); return (
                <button key={e.apodo} onClick={() => togglePers(e.apodo)} style={{ padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(61,214,140,0.15)' : 'var(--surface2)', color: sel ? '#3dd68c' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(61,214,140,0.45)' : 'var(--border)'}` }}>{e.apodo}</button>
              ) })}
              {empleados.length === 0 && <span style={{ fontSize: 12, color: 'var(--text3)' }}>Asigná empleados al sector Lija.</span>}
            </div>
          </Sec>

          <Sec t="👁 Supervisión">
            <select value={f.supervisor || ''} onChange={e => setF(s => ({ ...s, supervisor: e.target.value }))} style={{ ...iSt, cursor: 'pointer', maxWidth: 320 }}>
              <option value="">— Quién supervisó —</option>
              {empleados.map(e => <option key={e.apodo} value={e.apodo}>{e.apodo}{e.nombre ? ` · ${e.nombre}` : ''}</option>)}
            </select>
          </Sec>

          <Sec t="🔧 Herramental (espátula, lija AA, llanas)">
            {herr.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Cargá espátula y lija AA en <b>Herramental</b> con el sector "Lija".</div>
            ) : (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {herr.map(h => { const sel = (f.herramientas || []).includes(h.id); return (
                  <button key={h.id} onClick={() => toggleHerr(h.id)} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(45,212,191,0.15)' : 'var(--surface2)', color: sel ? '#2dd4bf' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(45,212,191,0.45)' : 'var(--border)'}` }}>{h.nombre}{h.codigo ? ` · ${h.codigo}` : ''}</button>
                ) })}
              </div>
            )}
          </Sec>

          {maquinas.length > 0 && (
            <Sec t="⚙️ Máquinas usadas">
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {maquinas.map(m => { const sel = (f.maquinasUsadas || []).includes(m.id); const et = m.codigo || m.sigla || m.nombre; return (
                  <button key={m.id} onClick={() => toggleMaquina(m.id)} title={m.nombre} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(74,108,247,0.15)' : 'var(--surface2)', color: sel ? '#7b9fff' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(74,108,247,0.45)' : 'var(--border)'}` }}>{et}</button>
                ) })}
              </div>
            </Sec>
          )}

          <Sec t="🪣 Insumo · Enduido (consumo en Kg)">
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={lbl}>Enduido</label>
                <select value={f.enduido_id || ''} onChange={e => setF(s => ({ ...s, enduido_id: e.target.value }))} style={{ ...iSt, cursor: 'pointer' }}>
                  <option value="">— Elegir insumo —</option>
                  {insumos.map(i => <option key={i.id} value={i.id}>{i.nombre}{i.codigo ? ` · ${i.codigo}` : ''} — stock: {round3(i.stock_actual)}{i.unidad ? ` ${i.unidad}` : ''}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Consumo (Kg)</label><input type="number" step="any" value={f.enduido_kg} onChange={e => setF(s => ({ ...s, enduido_kg: e.target.value }))} placeholder="Ej: 12.5" style={iSt} /></div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>Se descuentan los Kg del stock del insumo al guardar (si editás, ajusta la diferencia).</div>
          </Sec>

          <Sec t="✅ Resultado">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div><label style={lbl}>Conforme (OK)</label><input type="number" value={f.ok} onChange={e => setF(s => ({ ...s, ok: e.target.value }))} placeholder="0" style={iSt} /></div>
              <div><label style={lbl}>No conforme</label><input type="number" value={f.no_conforme} onChange={e => setF(s => ({ ...s, no_conforme: e.target.value }))} placeholder="0" style={iSt} /></div>
              <div><label style={lbl}>Objetivo</label><div style={{ fontSize: 15, fontWeight: 800, color: conforme >= target && conforme > 0 ? '#3dd68c' : 'var(--text)', padding: '8px 0' }}>{conforme} / {target}</div></div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>Al llegar al objetivo, el lote pasa a <b>Pintura</b>.</div>
          </Sec>

          <div><label style={lbl}>Notas</label><textarea value={f.notas} onChange={e => setF(s => ({ ...s, notas: e.target.value }))} rows={2} style={{ ...iSt, resize: 'vertical' }} /></div>

          <button onClick={guardar} disabled={g} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '12px', fontSize: 14, fontWeight: 700, cursor: g ? 'not-allowed' : 'pointer', opacity: g ? 0.7 : 1, fontFamily: 'var(--font)' }}>{g ? 'Guardando…' : '✓ Guardar OT'}</button>
        </div>
      </div>
    </div>
  )
}
