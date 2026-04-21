import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

const PRODUCTOS_LOG = [
  { codigo: 'C250STV1',    label: '250w' },
  { codigo: 'C250STV1TS',  label: 'B250' },
  { codigo: 'C500STV1',    label: '500w' },
  { codigo: 'C500STV1TS',  label: 'B500w' },
  { codigo: 'F1400BCO',    label: '1400w' },
  { codigo: 'KF70SIL',     label: 'KF70' },
  { codigo: 'FE150TBL',    label: 'FE150BI' },
  { codigo: 'FE150TBLACK', label: 'E150BLAC' },
  { codigo: 'FE150TSIL',   label: 'FE150SIL' },
  { codigo: 'FM318BL',     label: 'FM318' },
  { codigo: 'FM324BL',     label: 'FM324' },
  { codigo: 'BF14EBL',     label: 'BF14' },
  { codigo: 'BF323EBL',    label: 'BF23' },
]

const TIPOS = {
  entrega_pt:      { label: 'Entrega PT',       color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)',  emoji: '📦' },
  cambio_garantia: { label: 'Cambio Garantía',  color: '#fb923c', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.35)',  emoji: '🔄' },
  retiro_insumos:  { label: 'Retiro Insumos',   color: '#7b9fff', bg: 'rgba(123,159,255,0.12)', border: 'rgba(123,159,255,0.35)', emoji: '📥' },
  retiro_service:  { label: 'Retiro Service',   color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)', emoji: '🔧' },
  retiro_items:    { label: 'Retiro de Items',  color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', border: 'rgba(148,163,184,0.35)', emoji: '📋' },
}

const ZONAS = ['Zona CABA 1', 'Zona CABA 2', 'Zona norte', 'Zona sur 1', 'Zona sur 2', 'Zona oeste', 'Zona GBA']

const EMPTY_FORM = {
  tipo: 'entrega_pt',
  nombre: '', direccion: '', localidad: '', zona: '',
  telefono: '', email: '', dni: '',
  descripcion: '', notas: '',
  productos: {},
}

const iSt = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)',
  fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
}

export default function LogisticaDiaria() {
  const { isAdmin, isAdmin2 } = useAuth()
  const [fecha, setFecha] = useState(() => new Date().toISOString().split('T')[0])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [guardando, setGuardando] = useState(false)
  const [confirmDel, setConfirmDel] = useState(null)

  useEffect(() => { cargar() }, [fecha])

  async function cargar() {
    setLoading(true)
    const { data } = await supabase
      .from('logistica_diaria')
      .select('*')
      .eq('fecha', fecha)
      .order('orden')
    setItems(data || [])
    setLoading(false)
  }

  function abrirNuevo(tipo) {
    setForm({ ...EMPTY_FORM, tipo })
    setEditId(null)
    setModalOpen(true)
  }

  function abrirEditar(item) {
    const productos = {}
    for (const p of (item.productos || [])) productos[p.codigo] = p.cantidad
    setForm({
      tipo: item.tipo,
      nombre: item.nombre || '',
      direccion: item.direccion || '',
      localidad: item.localidad || '',
      zona: item.zona || '',
      telefono: item.telefono || '',
      email: item.email || '',
      dni: item.dni || '',
      descripcion: item.descripcion || '',
      notas: item.notas || '',
      productos,
    })
    setEditId(item.id)
    setModalOpen(true)
  }

  function setProducto(codigo, val) {
    const n = parseInt(val) || 0
    setForm(prev => {
      const p = { ...prev.productos }
      if (n > 0) p[codigo] = n; else delete p[codigo]
      return { ...prev, productos: p }
    })
  }

  async function guardar() {
    const conProductos = ['entrega_pt', 'cambio_garantia'].includes(form.tipo)
    const principal = conProductos ? form.nombre.trim() : form.descripcion.trim()
    if (!principal) return toast.error(conProductos ? 'Ingresá el nombre' : 'Ingresá la descripción')

    const productosArr = PRODUCTOS_LOG
      .filter(p => (form.productos[p.codigo] || 0) > 0)
      .map(p => ({ codigo: p.codigo, label: p.label, cantidad: form.productos[p.codigo] }))

    const payload = {
      fecha,
      tipo: form.tipo,
      nombre: form.nombre.trim() || null,
      direccion: form.direccion.trim() || null,
      localidad: form.localidad.trim() || null,
      zona: form.zona.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      dni: form.dni.trim() || null,
      descripcion: form.descripcion.trim() || null,
      notas: form.notas.trim() || null,
      productos: productosArr,
    }

    setGuardando(true)
    if (editId) {
      const { error } = await supabase.from('logistica_diaria').update(payload).eq('id', editId)
      if (error) { toast.error('Error: ' + error.message); setGuardando(false); return }
      toast.success('Actualizado ✅')
    } else {
      const maxOrden = items.length > 0 ? Math.max(...items.map(i => i.orden ?? 0)) + 1 : 0
      const { error } = await supabase.from('logistica_diaria').insert({ ...payload, orden: maxOrden })
      if (error) { toast.error('Error: ' + error.message); setGuardando(false); return }
      toast.success('Agregado a la ruta ✅')
    }
    setGuardando(false)
    setModalOpen(false)
    setEditId(null)
    cargar()
  }

  async function eliminar(id) {
    await supabase.from('logistica_diaria').delete().eq('id', id)
    setConfirmDel(null)
    cargar()
  }

  async function mover(id, dir) {
    const idx = items.findIndex(i => i.id === id)
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= items.length) return
    const a = items[idx], b = items[newIdx]
    await Promise.all([
      supabase.from('logistica_diaria').update({ orden: b.orden ?? newIdx }).eq('id', a.id),
      supabase.from('logistica_diaria').update({ orden: a.orden ?? idx }).eq('id', b.id),
    ])
    cargar()
  }

  function imprimirRuta() {
    const fechaDisplay = new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
    })
    const thSt = 'padding:5px 7px;background:#f3f4f6;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:#6b7280;border:1px solid #d1d5db;white-space:nowrap;text-align:center'
    const tdSt = 'padding:5px 7px;font-size:10px;border:1px solid #d1d5db;vertical-align:top'
    const tdYellow = tdSt + ';background:#fefce8;text-align:center;font-weight:700'
    const tdCenter = tdSt + ';text-align:center'
    const YELLOW_CODES = ['C500STV1', 'F1400BCO']

    const headers = [
      '#', 'Tipo', 'Nombre / Descripción', 'Dirección', 'Localidad', 'Zona', 'Tel.',
      'Camb.', ...PRODUCTOS_LOG.map(p => p.label),
      'Notas', 'Recibió conforme', 'DNI', 'Email',
    ]

    const rows = items.map((item, i) => {
      const t = TIPOS[item.tipo]
      const esCambio = item.tipo === 'cambio_garantia' ? '✓' : ''
      const prods = PRODUCTOS_LOG.map(p => {
        const found = (item.productos || []).find(x => x.codigo === p.codigo)
        return found ? found.cantidad : ''
      })
      return [
        i + 1, t?.label || item.tipo,
        item.nombre || item.descripcion || '',
        item.direccion || '', item.localidad || '', item.zona || '', item.telefono || '',
        esCambio, ...prods,
        item.notas || '', '', item.dni || '', item.email || '',
      ]
    })

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
      <title>Logística — ${fechaDisplay}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10px; color: #111; margin: 0; padding: 12px; }
        h2 { font-size: 15px; margin: 0 0 2px; }
        .sub { font-size: 11px; color: #6b7280; margin: 0 0 12px; }
        table { border-collapse: collapse; width: 100%; }
        @media print { body { padding: 6px; } @page { size: landscape; margin: 1cm; } }
      </style>
    </head><body>
      <h2>TEMPTECH — Logística Diaria</h2>
      <p class="sub">${fechaDisplay} &nbsp;·&nbsp; ${items.length} parada${items.length !== 1 ? 's' : ''}</p>
      <table>
        <thead><tr>${headers.map((h, hi) => {
          const isY = hi >= 8 && hi < 8 + PRODUCTOS_LOG.length && YELLOW_CODES.includes(PRODUCTOS_LOG[hi - 8]?.codigo)
          return `<th style="${thSt}${isY ? ';background:#fef08a' : ''}">${h}</th>`
        }).join('')}</tr></thead>
        <tbody>${rows.map(row =>
          `<tr>${row.map((cell, ci) => {
            const isProd = ci >= 8 && ci < 8 + PRODUCTOS_LOG.length
            const isY = isProd && YELLOW_CODES.includes(PRODUCTOS_LOG[ci - 8]?.codigo)
            const style = isY ? tdYellow : (isProd || ci === 7) ? tdCenter : tdSt
            return `<td style="${style}">${cell !== '' ? cell : '&nbsp;'}</td>`
          }).join('')}</tr>`
        ).join('')}</tbody>
      </table>
    </body></html>`

    const w = window.open('', '_blank', 'width=1400,height=800')
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 350)
  }

  if (!isAdmin && !isAdmin2) return null

  const conProductos = ['entrega_pt', 'cambio_garantia'].includes(form.tipo)

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Logística Diaria</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Armá la hoja de ruta para el chofer</p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none' }} />
          {items.length > 0 && (
            <button onClick={imprimirRuta}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, fontWeight: 700, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              🖨️ Imprimir hoja de ruta
            </button>
          )}
        </div>
      </div>

      {/* Type buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {Object.entries(TIPOS).map(([key, t]) => (
          <button key={key} onClick={() => abrirNuevo(key)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: t.bg, color: t.color, border: `1px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
            {t.emoji} + {t.label}
          </button>
        ))}
      </div>

      {/* Summary chips */}
      {items.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {Object.entries(TIPOS).map(([key, t]) => {
            const count = items.filter(i => i.tipo === key).length
            if (!count) return null
            return (
              <div key={key} style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 'var(--radius)', padding: '5px 12px', fontSize: 12, fontWeight: 700, color: t.color }}>
                {t.emoji} {t.label}: {count}
              </div>
            )
          })}
          <div style={{ marginLeft: 'auto', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '5px 14px', fontSize: 12, fontWeight: 700, color: 'var(--text2)' }}>
            {items.length} parada{items.length !== 1 ? 's' : ''} en total
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🚚</div>
          No hay paradas para esta fecha.<br />Usá los botones de arriba para armar la ruta.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((item, idx) => {
            const t = TIPOS[item.tipo]
            const prodsCon = (item.productos || []).filter(p => p.cantidad > 0)
            const isDel = confirmDel === item.id
            return (
              <div key={item.id} style={{ background: 'var(--surface)', border: `1px solid ${isDel ? 'rgba(255,85,119,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex' }}>
                {/* Number */}
                <div style={{ width: 44, background: 'var(--surface2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, flexShrink: 0, padding: '8px 0' }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text3)' }}>{idx + 1}</span>
                  <button onClick={() => mover(item.id, -1)} disabled={idx === 0}
                    style={{ background: 'none', border: 'none', cursor: idx === 0 ? 'default' : 'pointer', color: idx === 0 ? 'var(--border)' : 'var(--text3)', fontSize: 12, padding: '2px 6px', lineHeight: 1 }}>▲</button>
                  <button onClick={() => mover(item.id, 1)} disabled={idx === items.length - 1}
                    style={{ background: 'none', border: 'none', cursor: idx === items.length - 1 ? 'default' : 'pointer', color: idx === items.length - 1 ? 'var(--border)' : 'var(--text3)', fontSize: 12, padding: '2px 6px', lineHeight: 1 }}>▼</button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, padding: '12px 16px', minWidth: 0 }}>
                  {/* Row 1: tipo badge + nombre + actions */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ background: t?.bg, color: t?.color, border: `1px solid ${t?.border}`, fontSize: 10, fontWeight: 700, padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                        {t?.emoji} {t?.label}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700 }}>{item.nombre || item.descripcion}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                      <button onClick={() => abrirEditar(item)}
                        style={{ background: 'rgba(74,108,247,0.08)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.3)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        ✏️ Editar
                      </button>
                      {isDel ? (
                        <>
                          <button onClick={() => eliminar(item.id)}
                            style={{ background: 'rgba(255,85,119,0.12)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.35)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            Eliminar
                          </button>
                          <button onClick={() => setConfirmDel(null)}
                            style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            No
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setConfirmDel(item.id)}
                          style={{ background: 'rgba(255,85,119,0.06)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                          🗑
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row 2: location info */}
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text3)', marginBottom: prodsCon.length || item.notas ? 8 : 0 }}>
                    {item.direccion && <span>📍 {item.direccion}{item.localidad ? `, ${item.localidad}` : ''}</span>}
                    {item.zona && (
                      <span style={{ background: 'var(--surface2)', border: '1px solid var(--border)', padding: '1px 8px', borderRadius: 12, color: 'var(--text2)', fontWeight: 600 }}>
                        {item.zona}
                      </span>
                    )}
                    {item.telefono && <span>📞 {item.telefono}</span>}
                    {item.dni && <span style={{ color: 'var(--text2)' }}>DNI: {item.dni}</span>}
                  </div>

                  {/* Row 3: products */}
                  {prodsCon.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: item.notas ? 6 : 0 }}>
                      {prodsCon.map(p => (
                        <span key={p.codigo} style={{ background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', color: '#3dd68c', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                          {p.label} ×{p.cantidad}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Row 4: notes */}
                  {item.notas && (
                    <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic' }}>💬 {item.notas}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 600, maxHeight: '92vh', overflowY: 'auto' }}>

            {/* Header modal */}
            <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{editId ? 'Editar parada' : 'Nueva parada'}</div>
                <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                  {new Date(fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
            </div>

            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Tipo */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Tipo *</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(TIPOS).map(([key, t]) => (
                    <button key={key} onClick={() => setForm(prev => ({ ...prev, tipo: key }))}
                      style={{ padding: '6px 12px', borderRadius: 'var(--radius)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap', background: form.tipo === key ? t.bg : 'var(--surface2)', color: form.tipo === key ? t.color : 'var(--text3)', border: form.tipo === key ? `1px solid ${t.border}` : '1px solid var(--border)' }}>
                      {t.emoji} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre / Descripción */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  {conProductos ? 'Nombre / Razón Social *' : 'Descripción *'}
                </label>
                <input
                  value={conProductos ? form.nombre : form.descripcion}
                  onChange={e => setForm(prev => conProductos ? { ...prev, nombre: e.target.value } : { ...prev, descripcion: e.target.value })}
                  placeholder={conProductos ? 'Ej: Juan García / Bella Tienda SA' : 'Ej: Retirar aislante térmico x2'}
                  style={iSt}
                />
              </div>

              {/* Dirección + Localidad */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Dirección</label>
                  <input value={form.direccion} onChange={e => setForm(p => ({ ...p, direccion: e.target.value }))} placeholder="Ej: Av. Rivadavia 1234" style={iSt} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Localidad</label>
                  <input value={form.localidad} onChange={e => setForm(p => ({ ...p, localidad: e.target.value }))} placeholder="Ej: CABA, Palermo" style={iSt} />
                </div>
              </div>

              {/* Zona + Teléfono */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Zona</label>
                  <input list="zonas-list" value={form.zona} onChange={e => setForm(p => ({ ...p, zona: e.target.value }))} placeholder="Ej: Zona CABA 1" style={iSt} />
                  <datalist id="zonas-list">{ZONAS.map(z => <option key={z} value={z} />)}</datalist>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Teléfono</label>
                  <input value={form.telefono} onChange={e => setForm(p => ({ ...p, telefono: e.target.value }))} placeholder="Ej: 1145573014" style={iSt} />
                </div>
              </div>

              {/* DNI + Email (solo entrega/cambio) */}
              {conProductos && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>DNI</label>
                    <input value={form.dni} onChange={e => setForm(p => ({ ...p, dni: e.target.value }))} placeholder="Ej: 30456789" style={iSt} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Email</label>
                    <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Ej: cliente@mail.com" style={iSt} />
                  </div>
                </div>
              )}

              {/* Productos (solo entrega / cambio) */}
              {conProductos && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Productos</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))', gap: 8 }}>
                    {PRODUCTOS_LOG.map(p => {
                      const qty = form.productos[p.codigo] || 0
                      return (
                        <div key={p.codigo} style={{ background: 'var(--surface2)', border: `1px solid ${qty > 0 ? 'rgba(61,214,140,0.45)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: qty > 0 ? '#3dd68c' : 'var(--text2)' }}>{p.label}</div>
                          <div style={{ fontSize: 9, color: 'var(--text3)', fontFamily: 'monospace' }}>{p.codigo}</div>
                          <input
                            type="number" min="0" value={qty || ''}
                            onChange={e => setProducto(p.codigo, e.target.value)}
                            placeholder="0"
                            style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '4px 6px', color: 'var(--text)', fontSize: 14, fontWeight: 700, textAlign: 'center', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Notas */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Notas (opcional)</label>
                <textarea value={form.notas} onChange={e => setForm(p => ({ ...p, notas: e.target.value }))} rows={2}
                  placeholder="Observaciones, instrucciones especiales..."
                  style={{ ...iSt, resize: 'vertical', lineHeight: 1.5 }} />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <button onClick={guardar} disabled={guardando}
                  style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '10px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)' }}>
                  {guardando ? 'Guardando...' : editId ? '✓ Guardar cambios' : '✓ Agregar a la ruta'}
                </button>
                <button onClick={() => setModalOpen(false)}
                  style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
