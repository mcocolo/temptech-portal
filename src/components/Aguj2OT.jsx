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
const Sec = ({ t, children }) => <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>{t}</div>{children}</div>

export default function Aguj2OT({ lote, onClose, onDone }) {
  const { user, profile } = useAuth()
  const nombreUsuario = profile?.full_name || user?.email || 'Producción'
  const target = lote.cantidad_actual || lote.cantidad_objetivo

  const [empleados, setEmpleados] = useState([])
  const [maquinas, setMaquinas] = useState([])
  const [herrLotes, setHerrLotes] = useState({})   // codigo -> { nombre, lotes: [] }
  const [pausas, setPausas] = useState(DEFAULT_BREAKS)
  const [prevOt, setPrevOt] = useState(null)
  const [g, setG] = useState(false)
  const [f, setF] = useState({
    jornadas: [{ fecha: new Date().toISOString().split('T')[0], hi: '', hf: '' }],
    personal: [], maquinasUsadas: [], mechas: [], supervisor: '',   // mechas: [{ cod, lote }]
    prodDiaria: [{ fecha: new Date().toISOString().split('T')[0], cant: '' }],
    no_conforme: '', notas: '',
  })
  const colAguj = (lote.modelo || '').includes('1400') ? 'agujeros_1400w' : (lote.modelo || '').includes('250') ? 'agujeros_250w' : 'agujeros_500w'
  const colMaq = (lote.modelo || '').includes('1400') ? 'usos_1400w' : (lote.modelo || '').includes('250') ? 'usos_250w' : 'usos_500w'
  const mechaSel = (cod, l) => f.mechas.some(m => m.cod === cod && m.lote === l)
  const toggleMecha = (cod, l) => setF(s => { const has = s.mechas.some(m => m.cod === cod && m.lote === l); return { ...s, mechas: has ? s.mechas.filter(m => !(m.cod === cod && m.lote === l)) : [...s.mechas, { cod, lote: l }] } })
  const addProdDia = () => setF(s => ({ ...s, prodDiaria: [...(s.prodDiaria || []), { fecha: '', cant: '' }] }))
  const setProdDia = (i, campo, val) => setF(s => { const n = clone(s); n.prodDiaria[i][campo] = val; return n })
  const delProdDia = i => setF(s => { const n = clone(s); n.prodDiaria = n.prodDiaria.filter((_, j) => j !== i); if (!n.prodDiaria.length) n.prodDiaria = [{ fecha: '', cant: '' }]; return n })

  useEffect(() => { cargar() }, [])
  async function cargar() {
    const [e, mq, h, ot, pau] = await Promise.all([
      supabase.from('empleados').select('apodo,nombre,sectores').eq('activo', true).order('apodo'),
      supabase.from('maquinas').select('id,nombre,codigo,sigla,sectores,estado_vida').order('nombre'),
      supabase.from('herramental').select('codigo,nombre,lote,sectores,estado_vida').eq('activo', true).order('nombre'),
      supabase.from('produccion_ot').select('*').eq('lote_id', lote.id).eq('etapa', 'aguj2').maybeSingle(),
      supabase.from('pausas_produccion').select('desde,hasta,activo').eq('activo', true),
    ])
    if (pau.data && pau.data.length) setPausas(pau.data.map(p => [hm(p.desde), hm(p.hasta)]).filter(x => x[0] != null && x[1] != null))
    setEmpleados((e.data || []).filter(x => (x.sectores || []).includes('Aguj N°2')))
    const maqAct = (mq.data || []).filter(m => !['discontinuado', 'eliminado'].includes(m.estado_vida))
    setMaquinas(maqAct.filter(m => (m.sectores || []).includes('Aguj N°2')))
    // Mechas del sector Aguj N°2, agrupadas por código con sus lotes
    const lm = {}
    for (const x of (h.data || [])) {
      if (['discontinuado', 'eliminado'].includes(x.estado_vida)) continue
      if (!(x.sectores || []).includes('Aguj N°2') || !x.codigo || !x.lote) continue
      const c = String(x.codigo).trim()
      if (!lm[c]) lm[c] = { nombre: x.nombre || c, lotes: [] }
      const l = String(x.lote).trim(); if (!lm[c].lotes.includes(l)) lm[c].lotes.push(l)
    }
    const soloNum = s => { const m = String(s).match(/\d+/); return m ? parseInt(m[0]) : NaN }
    for (const c of Object.keys(lm)) lm[c].lotes.sort((a, b) => { const na = soloNum(a), nb = soloNum(b); if (!isNaN(na) && !isNaN(nb)) return na - nb; return String(a).localeCompare(String(b)) })
    setHerrLotes(lm)
    if (ot.data) {
      setPrevOt(ot.data)
      const d = ot.data.datos || {}
      setF(s => ({
        ...s,
        jornadas: Array.isArray(d.jornadas) && d.jornadas.length ? d.jornadas : s.jornadas,
        personal: d.personal || [], maquinasUsadas: d.maquinasUsadas || [], mechas: Array.isArray(d.mechas) ? d.mechas.filter(m => m && m.cod && m.lote) : [],
        supervisor: d.supervisor || '',
        prodDiaria: Array.isArray(d.prodDiaria) && d.prodDiaria.length ? d.prodDiaria : (ot.data.piezas ? [{ fecha: ot.data.fecha_inicio || s.prodDiaria[0].fecha, cant: ot.data.piezas }] : s.prodDiaria),
        no_conforme: d.no_conforme ?? '', notas: ot.data.notas || '',
      }))
    }
  }

  const togglePers = ap => setF(s => ({ ...s, personal: s.personal.includes(ap) ? s.personal.filter(x => x !== ap) : [...s.personal, ap] }))
  const toggleMaquina = id => setF(s => { const arr = s.maquinasUsadas || []; return { ...s, maquinasUsadas: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] } })
  const setJornada = (i, campo, val) => setF(s => { const n = clone(s); n.jornadas[i][campo] = val; return n })
  const addJornada = () => setF(s => ({ ...s, jornadas: [...s.jornadas, { fecha: '', hi: '', hf: '' }] }))
  const delJornada = i => setF(s => ({ ...s, jornadas: s.jornadas.length > 1 ? s.jornadas.filter((_, j) => j !== i) : s.jornadas }))

  const conforme = (f.prodDiaria || []).reduce((s, r) => s + int(r.cant), 0)
  const duracion = f.jornadas.reduce((sum, j) => sum + (calcularDuracion(j.hi, j.hf, pausas) || 0), 0) || null

  async function guardar() {
    setG(true)
    const alcanzo = conforme >= target && conforme > 0
    const prevD = prevOt?.datos || {}
    // Reconciliar créditos: mechas → agujeros_<modelo> (por codigo+lote); máquinas → usos_<modelo> (por id)
    const objUso = conforme   // progresivo: cuenta los paneles hechos, esté o no finalizado
    const prevAguj = (prevD.mechasCredit && typeof prevD.mechasCredit === 'object') ? { ...prevD.mechasCredit } : {}
    const prevMaq = (prevD.maqCredit && typeof prevD.maqCredit === 'object') ? { ...prevD.maqCredit } : {}
    const curAguj = Object.fromEntries((f.mechas || []).filter(m => m.cod && String(m.lote || '').trim()).map(m => [`${m.cod}|${String(m.lote).trim()}`, objUso]))
    const curMaq = Object.fromEntries((f.maquinasUsadas || []).map(id => [id, objUso]))
    const acciones = []
    const nuevoAguj = {}, nuevoMaq = {}
    for (const k of new Set([...Object.keys(prevAguj), ...Object.keys(curAguj)])) {
      const obj = k in curAguj ? curAguj[k] : 0, d = obj - int(prevAguj[k]); const [cod, l] = k.split('|')
      if (d) acciones.push({ t: 'herr', cod, lote: l, col: colAguj, delta: d }); if (obj) nuevoAguj[k] = obj
    }
    for (const k of new Set([...Object.keys(prevMaq), ...Object.keys(curMaq)])) {
      const obj = k in curMaq ? curMaq[k] : 0, d = obj - int(prevMaq[k])
      if (d) acciones.push({ t: 'maq', id: k, col: colMaq, delta: d }); if (obj) nuevoMaq[k] = obj
    }

    const datos = { jornadas: f.jornadas, personal: f.personal, maquinasUsadas: f.maquinasUsadas, mechas: f.mechas, prodDiaria: f.prodDiaria, ok: conforme, no_conforme: int(f.no_conforme), notas: f.notas, supervisor: f.supervisor || null, mechasCredit: nuevoAguj, maqCredit: nuevoMaq }
    const ultJor = f.jornadas[f.jornadas.length - 1] || {}
    const payload = {
      lote_id: lote.id, etapa: 'aguj2',
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
        if (a.t === 'maq') {
          const { data: mq } = await supabase.from('maquinas').select(`id,${a.col}`).eq('id', a.id).single()
          if (mq) await supabase.from('maquinas').update({ [a.col]: Math.max(0, (mq[a.col] || 0) + a.delta) }).eq('id', a.id)
        } else {
          let query = supabase.from('herramental').select(`id,${a.col}`).eq('codigo', a.cod)
          if (a.lote != null) query = query.eq('lote', a.lote)
          const { data: hr } = await query.limit(1)
          if (hr?.[0]) await supabase.from('herramental').update({ [a.col]: Math.max(0, (hr[0][a.col] || 0) + a.delta) }).eq('id', hr[0].id)
        }
      } catch (_) { /* no bloquea */ }
    }

    await supabase.from('produccion_lotes').update({
      avance: { ...(lote.avance || {}), aguj2: conforme },
      etapa: alcanzo ? 'enduido_lija' : 'aguj2', estado: 'en_proceso',
      cantidad_actual: conforme > 0 ? conforme : lote.cantidad_actual,
      modificado_por: nombreUsuario, modificado_por_at: new Date().toISOString(),
    }).eq('id', lote.id)

    setG(false)
    toast.success(alcanzo ? 'Aguj N°2 finalizado ✅ · pasa a Enduido + Lija' : 'OT de Aguj N°2 guardada ✅')
    onClose(); onDone()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>🕳 OT Aguj N°2 · Lote #{lote.numero}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{lote.modelo}{lote.terminacion ? ` · ${lote.terminacion}` : ''} · {target} paneles (viene de Encuadre)</div>
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
              {empleados.length === 0 && <span style={{ fontSize: 12, color: 'var(--text3)' }}>Asigná empleados al sector Aguj N°2.</span>}
            </div>
          </Sec>

          <Sec t="👁 Supervisión">
            <select value={f.supervisor || ''} onChange={e => setF(s => ({ ...s, supervisor: e.target.value }))} style={{ ...iSt, cursor: 'pointer', maxWidth: 320 }}>
              <option value="">— Quién supervisó —</option>
              {empleados.map(e => <option key={e.apodo} value={e.apodo}>{e.apodo}{e.nombre ? ` · ${e.nombre}` : ''}</option>)}
            </select>
          </Sec>

          <Sec t="⚙️ Máquinas usadas (Aguj2-01, MMD4, MMD6)">
            {maquinas.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Cargá las máquinas en <b>Mantenimiento → Máquinas</b> con el sector "Aguj N°2".</div>
            ) : (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {maquinas.map(m => { const sel = (f.maquinasUsadas || []).includes(m.id); const et = m.codigo || m.sigla || m.nombre; return (
                  <button key={m.id} onClick={() => toggleMaquina(m.id)} title={m.nombre} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(74,108,247,0.15)' : 'var(--surface2)', color: sel ? '#7b9fff' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(74,108,247,0.45)' : 'var(--border)'}` }}>{et}</button>
                ) })}
              </div>
            )}
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>A cada máquina tildada se le suman los {conforme || 0} paneles a su historial de uso al guardar.</div>
          </Sec>

          <Sec t="🔩 Mechas usadas (elegí los lotes)">
            {Object.keys(herrLotes).length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Cargá las mechas (MMD4, MMD6) con su lote en <b>Herramental</b>, sector "Aguj N°2".</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(herrLotes).map(([cod, info]) => (
                  <div key={cod}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 5 }}>{info.nombre} <span style={{ color: 'var(--text3)', fontWeight: 400 }}>· {cod}</span></div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {info.lotes.map(l => { const sel = mechaSel(cod, l); return (
                        <button key={l} onClick={() => toggleMecha(cod, l)} style={{ padding: '4px 11px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(45,212,191,0.15)' : 'var(--surface2)', color: sel ? '#2dd4bf' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(45,212,191,0.45)' : 'var(--border)'}` }}>{sel ? '✓ ' : ''}Lote {l}</button>
                      ) })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>A cada mecha/lote tildada se le suman los <b>{conforme || 0} agujeros</b> (= paneles) en Herramental al guardar.</div>
          </Sec>

          <Sec t="📅 Cantidad hecha por día">
            {(f.prodDiaria || []).map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <input type="date" value={r.fecha} onChange={e => setProdDia(i, 'fecha', e.target.value)} style={{ ...iSt, maxWidth: 170 }} />
                <input type="number" value={r.cant} onChange={e => setProdDia(i, 'cant', e.target.value)} placeholder="cantidad" style={{ ...iSt, maxWidth: 130 }} />
                <button onClick={() => delProdDia(i)} title="Quitar" style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '6px 9px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
              </div>
            ))}
            <button onClick={addProdDia} style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px dashed var(--border)', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>+ Agregar día</button>
          </Sec>

          <Sec t="✅ Resultado">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div><label style={lbl}>Conforme (total por día)</label><div style={{ fontSize: 15, fontWeight: 800, color: '#3dd68c', padding: '8px 0' }}>{conforme}</div></div>
              <div><label style={lbl}>No conforme</label><input type="number" value={f.no_conforme} onChange={e => setF(s => ({ ...s, no_conforme: e.target.value }))} placeholder="0" style={iSt} /></div>
              <div><label style={lbl}>Objetivo</label><div style={{ fontSize: 15, fontWeight: 800, color: conforme >= target && conforme > 0 ? '#3dd68c' : 'var(--text)', padding: '8px 0' }}>{conforme} / {target}</div></div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>El conforme se suma de las cantidades por día. Al llegar al objetivo, el lote pasa a <b>Enduido + Lija</b>.</div>
          </Sec>

          <div><label style={lbl}>Notas</label><textarea value={f.notas} onChange={e => setF(s => ({ ...s, notas: e.target.value }))} rows={2} style={{ ...iSt, resize: 'vertical' }} /></div>

          <button onClick={guardar} disabled={g} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '12px', fontSize: 14, fontWeight: 700, cursor: g ? 'not-allowed' : 'pointer', opacity: g ? 0.7 : 1, fontFamily: 'var(--font)' }}>{g ? 'Guardando…' : '✓ Guardar OT'}</button>
        </div>
      </div>
    </div>
  )
}
