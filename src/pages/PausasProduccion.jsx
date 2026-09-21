import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const iSt = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 11px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }
const lbl = { fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }
const hm = s => { if (!s) return null; const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0) }
const dur = (d, h) => { const a = hm(d), b = hm(h); return (a != null && b != null && b >= a) ? `${b - a} min` : '—' }

export default function PausasProduccion() {
  const { isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ nombre: '', desde: '', hasta: '' })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => { if (isAdmin) cargar() }, [isAdmin])
  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('pausas_produccion').select('*').order('orden').order('desde')
    setItems(data || [])
    setLoading(false)
  }

  async function agregar() {
    if (!form.nombre.trim() || !form.desde || !form.hasta) return toast.error('Completá nombre, desde y hasta')
    if (hm(form.hasta) <= hm(form.desde)) return toast.error('"Hasta" debe ser mayor que "Desde"')
    setGuardando(true)
    const orden = (items.reduce((m, p) => Math.max(m, p.orden || 0), 0)) + 1
    const { error } = await supabase.from('pausas_produccion').insert({ nombre: form.nombre.trim(), desde: form.desde, hasta: form.hasta, orden })
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    setForm({ nombre: '', desde: '', hasta: '' })
    toast.success('Pausa agregada ✅'); cargar()
  }

  async function actualizar(p, campos) {
    const { error } = await supabase.from('pausas_produccion').update(campos).eq('id', p.id)
    if (error) { toast.error('Error: ' + error.message); return }
    setItems(prev => prev.map(x => x.id === p.id ? { ...x, ...campos } : x))
  }

  async function eliminar(id) {
    if (!window.confirm('¿Eliminar esta pausa?')) return
    const { error } = await supabase.from('pausas_produccion').delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    setItems(prev => prev.filter(x => x.id !== id))
  }

  if (!isAdmin) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease', maxWidth: 760 }}>
      <div style={{ marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Pausas de la jornada</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Desayuno, descansos y almuerzo. Las OT de producción descuentan estas pausas del cálculo de duración.</p>
      </div>

      {/* Alta */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ flex: '1 1 160px' }}><label style={lbl}>Nombre</label><input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Almuerzo" style={{ ...iSt, width: '100%' }} /></div>
        <div><label style={lbl}>Desde</label><input type="time" value={form.desde} onChange={e => setForm(f => ({ ...f, desde: e.target.value }))} style={iSt} /></div>
        <div><label style={lbl}>Hasta</label><input type="time" value={form.hasta} onChange={e => setForm(f => ({ ...f, hasta: e.target.value }))} style={iSt} /></div>
        <button onClick={agregar} disabled={guardando} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Agregar pausa</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text3)' }}>Cargando…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(p => (
            <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', opacity: p.activo ? 1 : 0.55 }}>
              <input defaultValue={p.nombre} onBlur={e => actualizar(p, { nombre: e.target.value.trim() || p.nombre })} style={{ ...iSt, flex: '1 1 160px' }} />
              <input type="time" defaultValue={p.desde} onBlur={e => actualizar(p, { desde: e.target.value })} style={iSt} />
              <span style={{ color: 'var(--text3)' }}>→</span>
              <input type="time" defaultValue={p.hasta} onBlur={e => actualizar(p, { hasta: e.target.value })} style={iSt} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#7b9fff', minWidth: 60 }}>{dur(p.desde, p.hasta)}</span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={!!p.activo} onChange={e => actualizar(p, { activo: e.target.checked })} style={{ width: 15, height: 15, accentColor: '#3dd68c', cursor: 'pointer' }} /> Activa
              </label>
              <button onClick={() => eliminar(p.id)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '6px 10px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>🗑</button>
            </div>
          ))}
          {items.length === 0 && <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>Sin pausas. Agregá la primera arriba.</div>}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 12 }}>Solo se descuentan las pausas <b>Activas</b> y en la parte que se solapa con el horario cargado en la OT.</div>
    </div>
  )
}
