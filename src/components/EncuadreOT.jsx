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
const MEDIDAS_DEF = { '250w': '291x591 mm', '500w': '591x591 mm', '1400w_tapa': '560x560 mm', '1400w_contratapa': '558x558 mm' }
const clone = o => JSON.parse(JSON.stringify(o))

const Sec = ({ t, children }) => <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8 }}>{t}</div>{children}</div>

export default function EncuadreOT({ lote, onClose, onDone }) {
  const { user, profile, isAdmin2, isSuperadmin } = useAuth()
  const nombreUsuario = profile?.full_name || user?.email || 'Producción'
  const target = lote.cantidad_actual || lote.cantidad_objetivo
  const puedeEditarMedidas = isAdmin2 || isSuperadmin
  const es1400 = (lote.modelo || '').includes('1400')
  const es250 = (lote.modelo || '').includes('250')

  const [empleados, setEmpleados] = useState([])
  const [maquinas, setMaquinas] = useState([])
  const [pausas, setPausas] = useState(DEFAULT_BREAKS)
  const [prevOt, setPrevOt] = useState(null)
  const [medidas, setMedidas] = useState(MEDIDAS_DEF)
  const [g, setG] = useState(false)
  const [f, setF] = useState({
    jornadas: [{ fecha: new Date().toISOString().split('T')[0], hi: '', hf: '' }],
    personal: [], maquinasUsadas: [], ok: '', no_conforme: '', notas: '',
  })

  useEffect(() => { cargar() }, [])
  async function cargar() {
    const [e, mq, ot, pau, med] = await Promise.all([
      supabase.from('empleados').select('apodo,nombre,sectores').eq('activo', true).order('apodo'),
      supabase.from('maquinas').select('id,nombre,codigo,sigla,sectores,estado_vida').order('nombre'),
      supabase.from('produccion_ot').select('*').eq('lote_id', lote.id).eq('etapa', 'encuadre').maybeSingle(),
      supabase.from('pausas_produccion').select('desde,hasta,activo').eq('activo', true),
      supabase.from('medidas_encuadre').select('clave,valor'),
    ])
    if (pau.data && pau.data.length) setPausas(pau.data.map(p => [hm(p.desde), hm(p.hasta)]).filter(x => x[0] != null && x[1] != null))
    setEmpleados((e.data || []).filter(x => !(x.sectores || []).length || (x.sectores || []).includes('Encuadre')))
    const maqAct = (mq.data || []).filter(m => !['discontinuado', 'eliminado'].includes(m.estado_vida))
    setMaquinas(maqAct.filter(m => (m.sectores || []).includes('Encuadre')))
    if (med.data?.length) setMedidas({ ...MEDIDAS_DEF, ...Object.fromEntries(med.data.map(r => [r.clave, r.valor])) })
    if (ot.data) {
      setPrevOt(ot.data)
      const d = ot.data.datos || {}
      setF({
        jornadas: Array.isArray(d.jornadas) && d.jornadas.length ? d.jornadas : [{ fecha: new Date().toISOString().split('T')[0], hi: '', hf: '' }],
        personal: d.personal || [], maquinasUsadas: d.maquinasUsadas || [],
        ok: ot.data.piezas ?? d.ok ?? '', no_conforme: d.no_conforme ?? '', notas: ot.data.notas || '',
      })
    }
  }

  const togglePers = ap => setF(s => ({ ...s, personal: s.personal.includes(ap) ? s.personal.filter(x => x !== ap) : [...s.personal, ap] }))
  const toggleMaquina = id => setF(s => { const arr = s.maquinasUsadas || []; return { ...s, maquinasUsadas: arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id] } })
  const setJornada = (i, campo, val) => setF(s => { const n = clone(s); n.jornadas[i][campo] = val; return n })
  const addJornada = () => setF(s => ({ ...s, jornadas: [...s.jornadas, { fecha: '', hi: '', hf: '' }] }))
  const delJornada = i => setF(s => ({ ...s, jornadas: s.jornadas.length > 1 ? s.jornadas.filter((_, j) => j !== i) : s.jornadas }))

  const conforme = int(f.ok)
  const duracion = f.jornadas.reduce((sum, j) => sum + (calcularDuracion(j.hi, j.hf, pausas) || 0), 0) || null

  async function guardarMedida(clave, valor) {
    setMedidas(m => ({ ...m, [clave]: valor }))
    if (!puedeEditarMedidas) return
    await supabase.from('medidas_encuadre').upsert({ clave, valor: valor || null, updated_at: new Date().toISOString() }, { onConflict: 'clave' })
    toast.success('Medida guardada ✅')
  }

  async function guardar() {
    setG(true)
    const finalizado = conforme >= target && conforme > 0
    // Máquinas: acreditar paneles a usos por familia (progresivo, reconciliable)
    const colMaq = es1400 ? 'usos_1400w' : es250 ? 'usos_250w' : 'usos_500w'
    const prevD = prevOt?.datos || {}
    const prevMaq = (prevD.maqCredit && typeof prevD.maqCredit === 'object') ? { ...prevD.maqCredit } : {}
    const curMaq = Object.fromEntries((f.maquinasUsadas || []).map(id => [id, conforme]))
    const nuevoMaq = {}, acciones = []
    for (const k of new Set([...Object.keys(prevMaq), ...Object.keys(curMaq)])) {
      const obj = k in curMaq ? curMaq[k] : 0, dlt = obj - int(prevMaq[k])
      if (dlt) acciones.push({ id: k, delta: dlt }); if (obj) nuevoMaq[k] = obj
    }
    const datos = { jornadas: f.jornadas, personal: f.personal, maquinasUsadas: f.maquinasUsadas, ok: conforme, no_conforme: int(f.no_conforme), notas: f.notas, maqCredit: nuevoMaq }
    const ultJor = f.jornadas[f.jornadas.length - 1] || {}
    const payload = {
      lote_id: lote.id, etapa: 'encuadre',
      fecha_inicio: f.jornadas[0]?.fecha || null, hora_inicio: f.jornadas[0]?.hi || null,
      fecha_fin: ultJor.fecha || null, hora_fin: ultJor.hf || null,
      personal: f.personal, piezas: conforme, duracion_min: duracion, notas: f.notas.trim() || null,
      datos, ...(prevOt ? {} : { creado_por: nombreUsuario }),
      modificado_por: nombreUsuario, modificado_por_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('produccion_ot').upsert(payload, { onConflict: 'lote_id,etapa' })
    if (error) { setG(false); toast.error('Error: ' + error.message); return }

    // Aplicar reconciliación de uso de máquinas
    for (const a of acciones) {
      try {
        const { data: mq } = await supabase.from('maquinas').select(`id,${colMaq}`).eq('id', a.id).single()
        if (mq) await supabase.from('maquinas').update({ [colMaq]: Math.max(0, (mq[colMaq] || 0) + a.delta) }).eq('id', a.id)
      } catch (_) { /* no bloquea */ }
    }

    // Avance del lote: encuadre = conforme; si completó pasa a Aguj N°2
    await supabase.from('produccion_lotes').update({
      avance: { ...(lote.avance || {}), encuadre: conforme },
      etapa: finalizado ? 'aguj2' : 'encuadre', estado: 'en_proceso',
      cantidad_actual: conforme > 0 ? conforme : lote.cantidad_actual,
      modificado_por: nombreUsuario, modificado_por_at: new Date().toISOString(),
    }).eq('id', lote.id)

    setG(false)
    toast.success(finalizado ? 'Encuadre finalizado ✅ · pasa a Aguj N°2' : 'OT de Encuadre guardada ✅')
    onClose(); onDone()
  }

  const medidaKeys = es1400 ? [['1400w_tapa', 'Tapa (1400w)'], ['1400w_contratapa', 'Contratapa (1400w)']] : es250 ? [['250w', '250w']] : [['500w', '500w']]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>📐 OT Encuadre · Lote #{lote.numero}</div>
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{lote.modelo}{lote.terminacion ? ` · ${lote.terminacion}` : ''} · {target} paneles a encuadrar (viene de Alambre)</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Medida objetivo */}
          <Sec t="📏 Medida objetivo (encuadrado a medida exacta)">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {medidaKeys.map(([k, label]) => (
                <div key={k} style={{ flex: '1 1 200px' }}>
                  <label style={lbl}>{label}</label>
                  {puedeEditarMedidas
                    ? <input defaultValue={medidas[k] || ''} onBlur={e => { if (e.target.value !== (medidas[k] || '')) guardarMedida(k, e.target.value.trim()) }} style={iSt} />
                    : <div style={{ fontSize: 15, fontWeight: 800, color: '#3dd68c', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 11px' }}>{medidas[k] || '—'}</div>}
                </div>
              ))}
            </div>
            {puedeEditarMedidas && <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>Podés editar las medidas (se guardan para todos). Solo admin2 / superadmin.</div>}
          </Sec>

          {/* Tiempos */}
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

          {/* Personal */}
          <Sec t="👷 Personal">
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {empleados.map(e => { const sel = f.personal.includes(e.apodo); return (
                <button key={e.apodo} onClick={() => togglePers(e.apodo)} style={{ padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(61,214,140,0.15)' : 'var(--surface2)', color: sel ? '#3dd68c' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(61,214,140,0.45)' : 'var(--border)'}` }}>{e.apodo}</button>
              ) })}
              {empleados.length === 0 && <span style={{ fontSize: 12, color: 'var(--text3)' }}>Asigná empleados al sector Encuadre.</span>}
            </div>
          </Sec>

          {/* Máquina */}
          <Sec t="⚙️ Máquinas usadas (ME6)">
            {maquinas.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text3)' }}>Cargá las máquinas en <b>Mantenimiento → Máquinas</b> con el sector "Encuadre" (ej: ME6).</div>
            ) : (
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {maquinas.map(m => { const sel = (f.maquinasUsadas || []).includes(m.id); const et = m.codigo || m.sigla || m.nombre; return (
                  <button key={m.id} onClick={() => toggleMaquina(m.id)} title={m.nombre} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(74,108,247,0.15)' : 'var(--surface2)', color: sel ? '#7b9fff' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(74,108,247,0.45)' : 'var(--border)'}` }}>{et}</button>
                ) })}
              </div>
            )}
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>A cada máquina tildada se le suman los {conforme || 0} paneles a su historial de uso al guardar.</div>
          </Sec>

          {/* Resultado */}
          <Sec t="✅ Resultado">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              <div><label style={lbl}>Conforme (OK)</label><input type="number" value={f.ok} onChange={e => setF(s => ({ ...s, ok: e.target.value }))} placeholder="0" style={iSt} /></div>
              <div><label style={lbl}>No conforme</label><input type="number" value={f.no_conforme} onChange={e => setF(s => ({ ...s, no_conforme: e.target.value }))} placeholder="0" style={iSt} /></div>
              <div><label style={lbl}>Objetivo</label><div style={{ fontSize: 15, fontWeight: 800, color: conforme >= target && conforme > 0 ? '#3dd68c' : 'var(--text)', padding: '8px 0' }}>{conforme} / {target}</div></div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 4 }}>Al llegar al objetivo, el lote pasa a <b>Aguj N°2</b>. La cantidad conforme se lleva a la etapa siguiente.</div>
          </Sec>

          <div><label style={lbl}>Notas</label><textarea value={f.notas} onChange={e => setF(s => ({ ...s, notas: e.target.value }))} rows={2} style={{ ...iSt, resize: 'vertical' }} /></div>

          <button onClick={guardar} disabled={g} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '12px', fontSize: 14, fontWeight: 700, cursor: g ? 'not-allowed' : 'pointer', opacity: g ? 0.7 : 1, fontFamily: 'var(--font)' }}>{g ? 'Guardando…' : '✓ Guardar OT'}</button>
        </div>
      </div>
    </div>
  )
}
