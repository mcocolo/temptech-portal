import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { fetchAllRows } from '@/lib/fetchAll'
import toast from 'react-hot-toast'

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }
const lbl = { fontSize: 10, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4, letterSpacing: '0.3px' }
const TIPOS = [
  { k: 'correctivo', label: 'Correctivo', color: '#ff5577' },
  { k: 'preventivo', label: 'Preventivo', color: '#3dd68c' },
  { k: 'predictivo', label: 'Predictivo', color: '#7b9fff' },
]
const tipoCfg = k => TIPOS.find(t => t.k === k) || { label: k, color: 'var(--text3)' }
const fmtF = f => f ? new Date(f + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const EMPTY = { tipo: 'preventivo', maquina_id: '', objeto: '', fecha: new Date().toISOString().slice(0, 10), descripcion: '', realizado_por: '', proximo: '', costo: '', fotos: [] }
const hoyISO = () => new Date().toISOString().slice(0, 10)
const diasHasta = f => Math.round((new Date(f + 'T12:00:00') - new Date(hoyISO() + 'T12:00:00')) / 86400000)

export default function MantenimientosRegistros() {
  const { isAdmin, isAdmin2, isMantenimiento, user, profile } = useAuth()
  const nombreUsuario = profile?.full_name || user?.email || 'Admin'
  const [items, setItems] = useState([])
  const [maquinas, setMaquinas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [guardando, setGuardando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)

  async function subirFotos(files) {
    if (!files || !files.length) return
    setSubiendo(true)
    const urls = []
    for (const file of files) {
      try {
        const ext = file.name.split('.').pop()
        const path = `mantenimientos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
        const { error } = await supabase.storage.from('Imagenes').upload(path, file, { upsert: true })
        if (!error) urls.push(supabase.storage.from('Imagenes').getPublicUrl(path).data.publicUrl)
      } catch (_) { /* sigue */ }
    }
    setForm(f => ({ ...f, fotos: [...(f.fotos || []), ...urls] }))
    setSubiendo(false)
    if (urls.length) toast.success(`${urls.length} foto(s) subida(s) ✅`)
  }

  useEffect(() => { if (isAdmin || isAdmin2 || isMantenimiento) cargar() }, [isAdmin, isAdmin2, isMantenimiento])
  async function cargar() {
    setLoading(true)
    const [m, mq] = await Promise.all([
      fetchAllRows(() => supabase.from('mantenimientos').select('*').order('fecha', { ascending: false })),
      supabase.from('maquinas').select('id,nombre,codigo,sigla').order('nombre'),
    ])
    setItems(m || [])
    setMaquinas(mq.data || [])
    setLoading(false)
  }

  const maqNombre = id => { const q = maquinas.find(x => x.id === id); return q ? `${q.nombre}${q.codigo ? ` · ${q.codigo}` : q.sigla ? ` · ${q.sigla}` : ''}` : null }

  async function guardar() {
    if (!form.fecha) return toast.error('Ingresá la fecha')
    if (!form.maquina_id && !form.objeto.trim()) return toast.error('Elegí la máquina o escribí el equipo/objeto')
    setGuardando(true)
    const { error } = await supabase.from('mantenimientos').insert({
      tipo: form.tipo, maquina_id: form.maquina_id || null, objeto: form.objeto.trim() || null,
      fecha: form.fecha, descripcion: form.descripcion.trim() || null, realizado_por: form.realizado_por.trim() || null,
      proximo: form.proximo || null, costo: parseFloat(form.costo) || null, fotos: form.fotos || [], creado_por: nombreUsuario,
    })
    setGuardando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Mantenimiento registrado ✅')
    setForm(EMPTY); setModal(false); cargar()
  }
  async function eliminar(id) {
    if (!window.confirm('¿Eliminar este registro de mantenimiento?')) return
    const { error } = await supabase.from('mantenimientos').delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    setItems(prev => prev.filter(x => x.id !== id))
  }

  if (!isAdmin && !isAdmin2 && !isMantenimiento) return null
  const readOnly = isAdmin2   // mantenimiento y admin cargan

  const q = busqueda.trim().toLowerCase()
  const filtrados = items.filter(m =>
    (!fTipo || m.tipo === fTipo) &&
    (!q || [maqNombre(m.maquina_id), m.objeto, m.descripcion, m.realizado_por].some(v => (v || '').toLowerCase().includes(q)))
  )
  const cuenta = t => items.filter(m => m.tipo === t).length

  // Próximos mantenimientos: registros con "próximo" no resueltos (sin uno posterior del mismo equipo)
  const claveEq = m => m.maquina_id || (m.objeto || '').toLowerCase().trim()
  const pendientes = items.filter(m => {
    if (!m.proximo) return false
    const clave = claveEq(m)
    const resuelto = items.some(x => x.id !== m.id && claveEq(x) === clave && x.fecha >= m.proximo)
    return !resuelto && diasHasta(m.proximo) <= 30   // vencidos + próximos 30 días
  }).sort((a, b) => a.proximo < b.proximo ? -1 : 1)

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Registros de Mantenimiento</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Mantenimientos correctivos, preventivos y predictivos de máquinas y equipos</p>
        </div>
        {!readOnly && <button onClick={() => { setForm(EMPTY); setModal(true) }} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➕ Ingresar mantenimiento</button>}
      </div>

      {pendientes.length > 0 && (
        <div style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>🔔 Próximos mantenimientos ({pendientes.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {pendientes.map(m => { const d = diasHasta(m.proximo); const venc = d < 0; return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: venc ? '#ff5577' : '#fb923c', background: venc ? 'rgba(255,85,119,0.12)' : 'rgba(251,146,60,0.12)', border: `1px solid ${venc ? 'rgba(255,85,119,0.4)' : 'rgba(251,146,60,0.4)'}`, borderRadius: 20, padding: '2px 9px', whiteSpace: 'nowrap' }}>{venc ? `Vencido hace ${Math.abs(d)} día${Math.abs(d) !== 1 ? 's' : ''}` : d === 0 ? 'Hoy' : `En ${d} día${d !== 1 ? 's' : ''}`}</span>
                <span style={{ fontWeight: 700 }}>{maqNombre(m.maquina_id) || m.objeto || '—'}</span>
                <span style={{ color: 'var(--text3)' }}>· {tipoCfg(m.tipo).label} · próximo {fmtF(m.proximo)}</span>
                {!readOnly && <button onClick={() => { setForm({ ...EMPTY, tipo: m.tipo, maquina_id: m.maquina_id || '', objeto: m.objeto || '' }); setModal(true) }} style={{ marginLeft: 'auto', background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>✓ Registrar realizado</button>}
              </div>
            ) })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18 }}>
        <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍 Buscar máquina, equipo, descripción, responsable…" style={{ ...iSt, maxWidth: 360 }} />
        <div style={{ display: 'flex', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 3 }}>
          {[['', 'Todos'], ...TIPOS.map(t => [t.k, t.label])].map(([v, l]) => (
            <button key={v || 'todos'} onClick={() => setFTipo(v)} style={{ padding: '7px 13px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', border: 'none', background: fTipo === v ? 'rgba(74,108,247,0.2)' : 'transparent', color: fTipo === v ? '#7b9fff' : 'var(--text3)' }}>{l}{v && cuenta(v) > 0 ? ` (${cuenta(v)})` : ''}</button>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text3)', fontWeight: 700 }}>{filtrados.length} registro(s)</span>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)' }}>Cargando…</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: 'var(--text3)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>Sin registros de mantenimiento.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.map(m => {
            const c = tipoCfg(m.tipo)
            return (
              <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: c.color, background: `${c.color}18`, border: `1px solid ${c.color}44`, borderRadius: 20, padding: '2px 10px', textTransform: 'uppercase' }}>{c.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{maqNombre(m.maquina_id) || m.objeto || '—'}</span>
                    <span style={{ fontSize: 12, color: 'var(--text3)' }}>· {fmtF(m.fecha)}</span>
                  </div>
                  {m.descripcion && <div style={{ fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>{m.descripcion}</div>}
                  {Array.isArray(m.fotos) && m.fotos.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                      {m.fotos.map((url, i) => /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(url)
                        ? <img key={i} src={url} alt="" onClick={() => window.open(url, '_blank')} style={{ width: 54, height: 54, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)', cursor: 'zoom-in' }} />
                        : <a key={i} href={url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#7b9fff', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', textDecoration: 'none' }}>📄 archivo {i + 1}</a>)}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>
                    {m.realizado_por ? `👷 ${m.realizado_por}` : ''}
                    {m.proximo ? ` · 🔁 próximo: ${fmtF(m.proximo)}` : ''}
                    {m.costo ? ` · 💲 ${Number(m.costo).toLocaleString('es-AR')}` : ''}
                    {m.creado_por ? ` · cargó ${m.creado_por}` : ''}
                  </div>
                </div>
                {!readOnly && <button onClick={() => eliminar(m.id)} style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.25)', borderRadius: 6, padding: '5px 9px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>🗑</button>}
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800 }}>➕ Ingresar mantenimiento</div>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>
            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={lbl}>Tipo *</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {TIPOS.map(t => (
                    <button key={t.k} onClick={() => setForm(f => ({ ...f, tipo: t.k }))} style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', background: form.tipo === t.k ? `${t.color}22` : 'var(--surface2)', color: form.tipo === t.k ? t.color : 'var(--text3)', border: `1px solid ${form.tipo === t.k ? `${t.color}66` : 'var(--border)'}` }}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={lbl}>Máquina</label>
                <select value={form.maquina_id} onChange={e => setForm(f => ({ ...f, maquina_id: e.target.value }))} style={{ ...iSt, cursor: 'pointer' }}>
                  <option value="">— Elegí una máquina (o dejá vacío y usá el campo de abajo) —</option>
                  {maquinas.map(q => <option key={q.id} value={q.id}>{q.nombre}{q.codigo ? ` · ${q.codigo}` : ''}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Equipo / objeto (si no es una máquina cargada)</label><input value={form.objeto} onChange={e => setForm(f => ({ ...f, objeto: e.target.value }))} placeholder="Ej: Compresor, instalación eléctrica…" style={iSt} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Fecha *</label><input type="date" value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} style={iSt} /></div>
                <div><label style={lbl}>Próximo (opcional)</label><input type="date" value={form.proximo} onChange={e => setForm(f => ({ ...f, proximo: e.target.value }))} style={iSt} /></div>
              </div>
              <div><label style={lbl}>Descripción / trabajo realizado</label><textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} placeholder="Qué se hizo…" style={{ ...iSt, resize: 'vertical', lineHeight: 1.5 }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={lbl}>Realizado por</label><input value={form.realizado_por} onChange={e => setForm(f => ({ ...f, realizado_por: e.target.value }))} placeholder="Nombre / empresa" style={iSt} /></div>
                <div><label style={lbl}>Costo (opcional)</label><input type="number" step="any" value={form.costo} onChange={e => setForm(f => ({ ...f, costo: e.target.value }))} placeholder="$" style={iSt} /></div>
              </div>
              <div>
                <label style={lbl}>Fotos (antes/después, remito…)</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {(form.fotos || []).map((url, i) => (
                    <div key={i} style={{ position: 'relative' }}>
                      <img src={url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--border)' }} />
                      <button onClick={() => setForm(f => ({ ...f, fotos: f.fotos.filter((_, j) => j !== i) }))} style={{ position: 'absolute', top: -6, right: -6, background: '#ff5577', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 11, cursor: 'pointer', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                  <label style={{ width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px dashed var(--border)', background: 'var(--surface2)', color: 'var(--text3)', fontSize: 22, cursor: 'pointer' }}>
                    {subiendo ? '…' : '＋'}
                    <input type="file" accept="image/*,application/pdf" multiple style={{ display: 'none' }} onChange={e => subirFotos(Array.from(e.target.files || []))} />
                  </label>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={guardar} disabled={guardando} style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>{guardando ? 'Guardando…' : '✓ Registrar'}</button>
                <button onClick={() => setModal(false)} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
