import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const fmt = n => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(Number(n) || 0)
const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }
const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }
const round3 = n => Math.round((Number(n) || 0) * 1000) / 1000

// Procesar/reacondicionar una devolución (RMA distribuidor) o un caso de service/garantía:
// descuenta materiales del stock, (opcional) reingresa el panel al stock, y registra el costo.
export default function ProcesarRmaModal({ origen, refId, refCodigo, items = [], onClose, onDone }) {
  const { user, profile } = useAuth()
  const nombreUsuario = profile?.full_name || profile?.razon_social || user?.email || 'Admin'
  const panelItems = (items || []).filter(i => i.codigo)

  const [insumos, setInsumos] = useState([])     // insumos uso_rma
  const [operaciones, setOperaciones] = useState([])
  const [loading, setLoading] = useState(true)

  const [reingreso, setReingreso] = useState(true)
  const [panelIdx, setPanelIdx] = useState(0)
  const [cantidad, setCantidad] = useState(panelItems[0]?.cantidad || 1)
  const [materiales, setMateriales] = useState([]) // [{insumo_id, codigo, nombre, unidad, costo, stock_actual, cantidad}]
  const [opsSel, setOpsSel] = useState({})         // { [opId]: true }
  const [buscar, setBuscar] = useState('')
  const [notas, setNotas] = useState('')
  const [paga, setPaga] = useState('absorbido')     // 'cliente' | 'absorbido'
  const [cobrado, setCobrado] = useState('')         // monto facturado al cliente
  const [cobradoTouched, setCobradoTouched] = useState(false)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { cargar() }, [])
  async function cargar() {
    setLoading(true)
    const [{ data: ins }, { data: ops }] = await Promise.all([
      supabase.from('insumos').select('id,codigo,descripcion,unidad,costo,stock_actual').eq('uso_rma', true).order('descripcion'),
      supabase.from('operaciones_rma').select('*').eq('activo', true).order('nombre'),
    ])
    setInsumos(ins || [])
    setOperaciones(ops || [])
    setLoading(false)
  }

  const panel = panelItems[panelIdx] || null
  const addMaterial = (ins) => {
    setMateriales(prev => prev.some(m => m.insumo_id === ins.id) ? prev : [...prev, { insumo_id: ins.id, codigo: ins.codigo, nombre: ins.descripcion || ins.codigo, unidad: ins.unidad || '', costo: Number(ins.costo) || 0, stock_actual: Number(ins.stock_actual) || 0, cantidad: 1 }])
    setBuscar('')
  }
  const setMatCant = (id, v) => setMateriales(prev => prev.map(m => m.insumo_id === id ? { ...m, cantidad: parseInt(v) || 0 } : m))
  const delMat = (id) => setMateriales(prev => prev.filter(m => m.insumo_id !== id))

  const totMateriales = materiales.reduce((s, m) => s + m.costo * (m.cantidad || 0), 0)
  const opsLista = operaciones.filter(o => opsSel[o.id])
  const totOperaciones = opsLista.reduce((s, o) => s + (Number(o.costo) || 0), 0)
  const costoTotal = totMateriales + totOperaciones
  const cobradoFinal = paga === 'cliente' ? (cobradoTouched ? (parseFloat(cobrado) || 0) : costoTotal) : 0

  const q = buscar.trim().toLowerCase()
  const sugeridos = q ? insumos.filter(i => !materiales.some(m => m.insumo_id === i.id) && ((i.codigo || '').toLowerCase().includes(q) || (i.descripcion || '').toLowerCase().includes(q))).slice(0, 8) : []

  async function procesar() {
    if (reingreso && (!panel || (parseInt(cantidad) || 0) <= 0)) return toast.error('Elegí el panel y la cantidad que reingresa a stock')
    setGuardando(true)
    try {
      // 1) Descontar materiales del stock de insumos
      for (const m of materiales) {
        if (!m.cantidad) continue
        const { data: row } = await supabase.from('insumos').select('id,stock_actual').eq('id', m.insumo_id).single()
        if (row) {
          await supabase.from('insumos').update({ stock_actual: round3((row.stock_actual || 0) - m.cantidad), updated_at: new Date().toISOString() }).eq('id', m.insumo_id)
          await supabase.from('movimientos_insumos').insert({ insumo_id: m.insumo_id, tipo: 'egreso', cantidad: m.cantidad, sector: 'RMA', motivo: `Reacondicionar ${refCodigo || ''} (${origen})`.trim(), usuario_id: user?.id, usuario_nombre: nombreUsuario })
        }
      }
      // 2) Reingresar el panel al stock PT
      const cant = parseInt(cantidad) || 0
      if (reingreso && panel && cant > 0) {
        const { data: st } = await supabase.from('stock_pt').select('stock_actual,stock_inicial').eq('codigo', panel.codigo).maybeSingle()
        const nuevo = (st?.stock_actual || 0) + cant
        await supabase.from('stock_pt').upsert({ codigo: panel.codigo, nombre: panel.nombre || '', modelo: panel.modelo || '', categoria: panel.categoria || '', stock_actual: nuevo, stock_inicial: st?.stock_inicial ?? 0 }, { onConflict: 'codigo' })
        await supabase.from('movimientos_pt').insert({ codigo: panel.codigo, nombre: panel.nombre || '', modelo: panel.modelo || '', categoria: panel.categoria || '', tipo: 'ingreso', cantidad: cant, canal: 'RMA', observacion: `Reingreso reacondicionado · ${refCodigo || ''} (${origen})`.trim(), usuario_id: user?.id, usuario_nombre: nombreUsuario })
      }
      // 3) Registrar el costo
      await supabase.from('rma_costos').insert({
        origen, ref_id: refId || null, ref_codigo: refCodigo || null,
        panel_codigo: reingreso && panel ? panel.codigo : null, reingreso, cantidad: reingreso ? cant : 0,
        materiales: materiales.filter(m => m.cantidad > 0).map(m => ({ codigo: m.codigo, nombre: m.nombre, cantidad: m.cantidad, costo_unit: m.costo, subtotal: m.costo * m.cantidad })),
        operaciones: opsLista.map(o => ({ nombre: o.nombre, costo: Number(o.costo) || 0 })),
        costo_total: costoTotal, cobrado: cobradoFinal, paga, notas: notas.trim() || null, usuario: nombreUsuario,
      })
      toast.success('Reacondicionamiento registrado ✅')
      onDone && onDone()
      onClose()
    } catch (e) {
      toast.error('Error: ' + (e?.message || e))
    }
    setGuardando(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 640, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>🧰 Procesar / Reacondicionar {refCodigo ? <span style={{ fontSize: 12, color: 'var(--text3)' }}>· {refCodigo}</span> : ''}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {loading ? <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)' }}>Cargando…</div> : (<>
            {/* Reingreso a stock */}
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                <input type="checkbox" checked={reingreso} onChange={e => setReingreso(e.target.checked)} style={{ width: 16, height: 16 }} />
                ↩ Reingresa al stock (el panel vuelve a stock de PT)
              </label>
              {reingreso && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10, marginTop: 10 }}>
                  <div>
                    <label style={lbl}>Panel</label>
                    {panelItems.length > 0 ? (
                      <select value={panelIdx} onChange={e => { setPanelIdx(Number(e.target.value)); setCantidad(panelItems[Number(e.target.value)]?.cantidad || 1) }} style={{ ...iSt, cursor: 'pointer' }}>
                        {panelItems.map((it, i) => <option key={i} value={i}>{it.codigo} · {it.nombre || ''} {it.modelo || ''}</option>)}
                      </select>
                    ) : <div style={{ fontSize: 12, color: '#fb923c' }}>La devolución no tiene ítems con código.</div>}
                  </div>
                  <div><label style={lbl}>Cantidad</label><input type="number" min="1" value={cantidad} onChange={e => setCantidad(e.target.value)} style={{ ...iSt, textAlign: 'center' }} /></div>
                </div>
              )}
            </div>

            {/* Materiales */}
            <div>
              <label style={lbl}>Materiales usados (se descuentan del stock)</label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <input value={buscar} onChange={e => setBuscar(e.target.value)} placeholder="🔍 Buscar insumo RMA (caja, bolsa, cable…)" style={iSt} />
                {sugeridos.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', zIndex: 5, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', marginTop: 2 }}>
                    {sugeridos.map(i => (
                      <div key={i.id} onClick={() => addMaterial(i)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 10 }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        <span style={{ fontSize: 12 }}><b style={{ fontFamily: 'monospace', color: '#7b9fff' }}>{i.codigo}</b> {i.descripcion}</span>
                        <span style={{ fontSize: 11, color: '#e879f9', fontWeight: 700 }}>{fmt(i.costo)} · stk {i.stock_actual}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {materiales.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text3)' }}>Sin materiales (el panel entra tal cual).</div> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {materiales.map(m => (
                    <div key={m.insumo_id} style={{ display: 'grid', gridTemplateColumns: '1fr 64px auto auto', gap: 8, alignItems: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px' }}>
                      <span style={{ fontSize: 12 }}><b style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff' }}>{m.codigo}</b> {m.nombre}</span>
                      <input type="number" min="1" value={m.cantidad} onChange={e => setMatCant(m.insumo_id, e.target.value)} style={{ ...iSt, padding: '5px 6px', textAlign: 'center' }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#e879f9', minWidth: 70, textAlign: 'right' }}>{fmt(m.costo * (m.cantidad || 0))}</span>
                      <button onClick={() => delMat(m.insumo_id)} style={{ background: 'none', border: 'none', color: '#ff5577', cursor: 'pointer', fontSize: 18 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Operaciones */}
            <div>
              <label style={lbl}>Operaciones (mano de obra)</label>
              {operaciones.length === 0 ? <div style={{ fontSize: 12, color: 'var(--text3)' }}>No hay operaciones cargadas. Cargalas en Insumos → "🧾 Costos de operaciones".</div> : (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {operaciones.map(o => { const sel = !!opsSel[o.id]; return (
                    <button key={o.id} onClick={() => setOpsSel(p => ({ ...p, [o.id]: !p[o.id] }))} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: sel ? 'rgba(232,121,249,0.15)' : 'var(--surface2)', color: sel ? '#e879f9' : 'var(--text3)', border: `1px solid ${sel ? 'rgba(232,121,249,0.45)' : 'var(--border)'}` }}>{sel ? '✓ ' : ''}{o.nombre} · {fmt(o.costo)}</button>
                  ) })}
                </div>
              )}
            </div>

            {/* ¿Quién paga? */}
            <div>
              <label style={lbl}>¿Quién paga la reparación?</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[['absorbido', '🏭 Lo absorbemos (no se cobra)'], ['cliente', '💰 Lo paga el cliente/distribuidor']].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setPaga(k)} style={{ flex: 1, minWidth: 180, padding: '9px 10px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: paga === k ? 'rgba(61,214,140,0.15)' : 'var(--surface2)', color: paga === k ? '#3dd68c' : 'var(--text3)', border: `1px solid ${paga === k ? 'rgba(61,214,140,0.45)' : 'var(--border)'}` }}>{l}</button>
                ))}
              </div>
              {paga === 'cliente' && (
                <div style={{ marginTop: 8 }}>
                  <label style={lbl}>Monto a cobrar ($)</label>
                  <input type="number" step="any" min="0" value={cobradoTouched ? cobrado : costoTotal} onChange={e => { setCobradoTouched(true); setCobrado(e.target.value) }} style={iSt} />
                  <div style={{ fontSize: 10, color: 'var(--text3)', marginTop: 3 }}>Por defecto = costo. Podés cobrar más (margen) o menos.</div>
                </div>
              )}
            </div>

            <div><label style={lbl}>Notas (opcional)</label><input value={notas} onChange={e => setNotas(e.target.value)} placeholder="Observaciones" style={iSt} /></div>

            {/* Totales */}
            <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text3)' }}><span>Materiales</span><span>{fmt(totMateriales)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text3)' }}><span>Operaciones</span><span>{fmt(totOperaciones)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15, color: '#e879f9', borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2 }}><span>Nos cuesta</span><span>{fmt(costoTotal)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 14, color: cobradoFinal > 0 ? '#3dd68c' : 'var(--text3)' }}><span>Se cobra</span><span>{fmt(cobradoFinal)}</span></div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={procesar} disabled={guardando} style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>{guardando ? 'Procesando…' : '✓ Procesar y registrar costo'}</button>
              <button onClick={onClose} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
            </div>
          </>)}
        </div>
      </div>
    </div>
  )
}
