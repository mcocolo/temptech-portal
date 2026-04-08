import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner, Empty } from '@/components/ui'
import { Search, ExternalLink, Pencil, X, Check } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const CATEGORIAS_DESC = [
  { key: 'calefones_calderas',    label: 'Calefones / Calderas' },
  { key: 'paneles_calefactores',  label: 'Paneles Calefactores' },
  { key: 'anafes',                label: 'Anafes' },
]

const PROVINCIAS = [
  'Buenos Aires','CABA','Catamarca','Chaco','Chubut','Córdoba','Corrientes',
  'Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones',
  'Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe',
  'Santiago del Estero','Tierra del Fuego','Tucumán',
]

const inputSt = {
  background: 'var(--surface3)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '7px 10px', color: 'var(--text)',
  fontSize: 13, outline: 'none', width: '100%', fontFamily: 'var(--font)',
}

function LabelInput({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

export default function ClientesRegistrados() {
  const { isAdmin } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [productosReg, setProductosReg] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [tab, setTab] = useState('clientes')
  const [selected, setSelected] = useState(null)

  // Edición
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (isAdmin) load() }, [isAdmin])

  async function load() {
    setLoading(true)
    const [{ data: perfiles }, { data: prods }] = await Promise.all([
      supabase.from('profiles').select('*, clientes(*)').order('created_at', { ascending: false }),
      supabase.from('productos_registrados').select('*').order('created_at', { ascending: false }),
    ])
    setUsuarios(perfiles || [])
    setProductosReg(prods || [])
    setLoading(false)
  }

  if (!isAdmin) return null

  const clientes       = usuarios.filter(u => u.user_type === 'client'      || u.clientes?.user_type === 'client')
  const distribuidores = usuarios.filter(u => u.user_type === 'distributor' || u.clientes?.user_type === 'distributor')

  const filtrar = (lista) => {
    if (!busqueda) return lista
    const q = busqueda.toLowerCase()
    return lista.filter(u =>
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.clientes?.razon_social?.toLowerCase().includes(q) ||
      u.clientes?.client_code?.toLowerCase().includes(q)
    )
  }

  const filtrarProductos = () => {
    if (!busqueda) return productosReg
    const q = busqueda.toLowerCase()
    return productosReg.filter(d =>
      d.nombre_apellido?.toLowerCase().includes(q) ||
      d.email?.toLowerCase().includes(q) ||
      d.producto?.toLowerCase().includes(q)
    )
  }

  const listaActual = tab === 'productos'
    ? filtrarProductos()
    : filtrar(tab === 'clientes' ? clientes : distribuidores)

  const TABS = [
    { key: 'clientes',       label: '👤 Clientes',      count: clientes.length,       color: '#7b9fff', bg: 'rgba(74,108,247,0.1)',   border: 'rgba(74,108,247,0.35)' },
    { key: 'distribuidores', label: '🏪 Distribuidores', count: distribuidores.length,  color: '#ffd166', bg: 'rgba(255,209,102,0.1)', border: 'rgba(255,209,102,0.35)' },
    { key: 'productos',      label: '📦 Productos Reg.', count: productosReg.length,    color: '#3dd68c', bg: 'rgba(61,214,140,0.1)',  border: 'rgba(61,214,140,0.35)' },
  ]

  // ── Abrir edición ──
  function abrirEdicion(u) {
    const cl = u.clientes
    if (tab === 'clientes') {
      setEditForm({
        full_name:          u.full_name || cl?.full_name || '',
        email:              u.email || cl?.email || '',
        telefono:           u.telefono || cl?.telefono || '',
        direccion:          cl?.direccion || '',
        localidad:          cl?.localidad || '',
        provincia:          cl?.provincia || '',
        codigo_postal:      cl?.codigo_postal || '',
        direccion_entrega:  cl?.direccion_entrega || '',
        horario_entrega:    cl?.horario_entrega || '',
        persona_contacto:   cl?.persona_contacto || '',
      })
    } else {
      // Distribuidor: solo descuentos + 3 campos
      const descuentos = u.descuentos || {}
      setEditForm({
        desc_calefones_calderas:   descuentos.calefones_calderas   ?? '',
        desc_paneles_calefactores: descuentos.paneles_calefactores ?? '',
        desc_anafes:               descuentos.anafes               ?? '',
        direccion_entrega:         cl?.direccion_entrega || '',
        horario_entrega:           cl?.horario_entrega || '',
        persona_contacto:          cl?.persona_contacto || '',
      })
    }
    setEditingId(u.id)
    setSelected(null)
  }

  function setEF(key, val) { setEditForm(f => ({ ...f, [key]: val })) }

  // ── Guardar ──
  async function guardarEdicion(u) {
    setSaving(true)
    try {
      const cl = u.clientes
      if (tab === 'clientes') {
        // Actualizar profiles
        await supabase.from('profiles').update({
          full_name: editForm.full_name,
          email:     editForm.email,
          telefono:  editForm.telefono,
        }).eq('id', u.id)
        // Actualizar clientes (si existe)
        if (cl?.id) {
          await supabase.from('clientes').update({
            full_name:         editForm.full_name,
            email:             editForm.email,
            telefono:          editForm.telefono,
            direccion:         editForm.direccion,
            localidad:         editForm.localidad,
            provincia:         editForm.provincia,
            codigo_postal:     editForm.codigo_postal,
            direccion_entrega: editForm.direccion_entrega,
            horario_entrega:   editForm.horario_entrega,
            persona_contacto:  editForm.persona_contacto,
          }).eq('id', cl.id)
        }
      } else {
        // Distribuidor: solo descuentos + 3 campos
        const descuentos = {
          calefones_calderas:   editForm.desc_calefones_calderas   !== '' ? parseFloat(editForm.desc_calefones_calderas)   : null,
          paneles_calefactores: editForm.desc_paneles_calefactores !== '' ? parseFloat(editForm.desc_paneles_calefactores) : null,
          anafes:               editForm.desc_anafes               !== '' ? parseFloat(editForm.desc_anafes)               : null,
        }
        // Limpiar nulos
        Object.keys(descuentos).forEach(k => { if (descuentos[k] === null) delete descuentos[k] })
        await supabase.from('profiles').update({ descuentos }).eq('id', u.id)
        if (cl?.id) {
          await supabase.from('clientes').update({
            direccion_entrega: editForm.direccion_entrega,
            horario_entrega:   editForm.horario_entrega,
            persona_contacto:  editForm.persona_contacto,
          }).eq('id', cl.id)
        }
      }
      toast.success('Guardado correctamente')
      setEditingId(null)
      await load()
    } catch (err) {
      toast.error('Error al guardar: ' + err.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Clientes Registrados</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Usuarios registrados en el portal TEMPTECH</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Clientes',       val: clientes.length,      color: '#7b9fff', bg: 'rgba(110,181,255,0.08)' },
          { label: 'Distribuidores', val: distribuidores.length, color: '#ffd166', bg: 'rgba(255,209,102,0.08)' },
          { label: 'Productos Reg.', val: productosReg.length,   color: '#3dd68c', bg: 'rgba(61,214,140,0.08)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--radius-lg)', padding: '18px 22px', border: `1px solid ${s.color}25` }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelected(null); setBusqueda(''); setEditingId(null) }}
            style={{ padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${tab === t.key ? t.border : 'var(--border)'}`, background: tab === t.key ? t.bg : 'transparent', color: tab === t.key ? t.color : 'var(--text3)', transition: 'all .15s' }}
          >
            {t.label} <span style={{ opacity: 0.7, fontSize: 11 }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder={tab === 'productos' ? 'Buscar por nombre, email o producto...' : 'Buscar por nombre, email o razón social...'}
          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px 10px 40px', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'var(--font)' }}
          onFocus={e => e.target.style.borderColor = 'rgba(74,108,247,0.5)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        {busqueda && <button onClick={() => setBusqueda('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>×</button>}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>
      ) : listaActual.length === 0 ? (
        <Empty icon={tab === 'clientes' ? '👤' : tab === 'distribuidores' ? '🏪' : '📦'} title="Sin resultados" description={busqueda ? 'No encontramos resultados' : 'No hay registros en esta categoría'} />
      ) : tab === 'productos' ? (
        /* ── Productos registrados ── */
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Cliente', 'Email', 'Producto', 'Canal', 'Fecha compra', 'Registrado', 'Comprobante'].map(h => (
                  <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listaActual.map(r => (
                <>
                  <tr key={r.id}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    style={{ borderBottom: '1px solid rgba(37,40,54,0.6)', cursor: 'pointer' }}
                    onClick={() => setSelected(selected?.id === r.id ? null : r)}
                  >
                    <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 600 }}>{r.nombre_apellido || '-'}</td>
                    <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text3)' }}>{r.email || '-'}</td>
                    <td style={{ padding: '14px 18px', fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.producto}</td>
                    <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text3)' }}>{r.canal || '-'}</td>
                    <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                      {r.fecha_compra ? new Date(r.fecha_compra + 'T12:00:00').toLocaleDateString('es-AR') : '-'}
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: es })}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {r.comprobante_url
                        ? <a href={r.comprobante_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#7b9fff', textDecoration: 'none' }}>Ver <ExternalLink size={11} /></a>
                        : <span style={{ fontSize: 12, color: 'var(--text3)' }}>—</span>}
                    </td>
                  </tr>
                  {selected?.id === r.id && (
                    <tr key={`d-${r.id}`}><td colSpan={7} style={{ padding: '0 18px 18px' }}>
                      <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 24px' }}>
                        {[{ label: 'Teléfono', val: r.telefono },{ label: 'Dirección', val: r.direccion },{ label: 'Localidad', val: r.localidad },{ label: 'Provincia', val: r.provincia },{ label: 'CP', val: r.codigo_postal },{ label: 'N° Pedido', val: r.numero_pedido }]
                          .filter(f => f.val).map(f => (
                            <div key={f.label}>
                              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{f.label}</div>
                              <div style={{ fontSize: 13 }}>{f.val}</div>
                            </div>
                          ))}
                      </div>
                    </td></tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '10px 18px', fontSize: 12, color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>
            {listaActual.length} resultado{listaActual.length !== 1 ? 's' : ''}{busqueda ? ` para "${busqueda}"` : ''}
          </div>
        </div>
      ) : (
        /* ── Clientes / Distribuidores ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {listaActual.map(u => {
            const cl = u.clientes
            const createdAt = u.created_at || cl?.created_at
            const isEditing = editingId === u.id
            const isDistrib = tab === 'distribuidores'

            return (
              <div key={u.id} style={{ background: 'var(--surface)', border: `1px solid ${isEditing ? 'rgba(74,108,247,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

                {/* Header */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: isDistrib ? 'rgba(255,209,102,0.15)' : 'rgba(74,108,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                      {isDistrib ? '🏪' : '👤'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{u.full_name || cl?.full_name || '-'}</div>
                      {isDistrib && cl?.razon_social && <div style={{ fontSize: 12, color: '#ffd166' }}>{cl.razon_social}</div>}
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.email || cl?.email}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {isDistrib && cl?.client_code && (
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#ffd166', background: 'rgba(255,209,102,0.1)', padding: '3px 10px', borderRadius: 6 }}>{cl.client_code}</span>
                    )}
                    {createdAt && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: es })}</span>}
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => guardarEdicion(u)} disabled={saving}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                          <Check size={13} /> {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}>
                          <X size={13} /> Cancelar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => abrirEdicion(u)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <Pencil size={12} /> Editar
                      </button>
                    )}
                  </div>
                </div>

                {/* Body — vista o edición */}
                {isEditing ? (
                  <div style={{ padding: '18px 20px' }}>
                    {isDistrib ? (
                      /* ── Edición distribuidor: descuentos + 3 campos ── */
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#ffd166', marginBottom: 12 }}>📊 Descuentos por categoría</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                            {CATEGORIAS_DESC.map(cat => (
                              <LabelInput key={cat.key} label={`${cat.label} (%)`}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <input type="number" min="0" max="100" step="0.5"
                                    value={editForm[`desc_${cat.key}`]}
                                    onChange={e => setEF(`desc_${cat.key}`, e.target.value)}
                                    style={{ ...inputSt, width: 80, textAlign: 'center' }}
                                  />
                                  <span style={{ fontSize: 13, color: 'var(--text3)' }}>%</span>
                                </div>
                              </LabelInput>
                            ))}
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#7b9fff', marginBottom: 12 }}>📍 Datos de entrega</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <LabelInput label="Dirección de entrega">
                              <input value={editForm.direccion_entrega} onChange={e => setEF('direccion_entrega', e.target.value)} style={inputSt} />
                            </LabelInput>
                            <LabelInput label="Horario de entrega">
                              <input value={editForm.horario_entrega} onChange={e => setEF('horario_entrega', e.target.value)} placeholder="Ej: Lunes a viernes 9-17hs" style={inputSt} />
                            </LabelInput>
                            <LabelInput label="Persona de contacto">
                              <input value={editForm.persona_contacto} onChange={e => setEF('persona_contacto', e.target.value)} style={inputSt} />
                            </LabelInput>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── Edición cliente: todos los campos ── */
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <LabelInput label="Nombre y Apellido">
                          <input value={editForm.full_name} onChange={e => setEF('full_name', e.target.value)} style={inputSt} />
                        </LabelInput>
                        <LabelInput label="Email">
                          <input value={editForm.email} onChange={e => setEF('email', e.target.value)} style={inputSt} />
                        </LabelInput>
                        <LabelInput label="Teléfono">
                          <input value={editForm.telefono} onChange={e => setEF('telefono', e.target.value)} style={inputSt} />
                        </LabelInput>
                        <LabelInput label="Dirección">
                          <input value={editForm.direccion} onChange={e => setEF('direccion', e.target.value)} style={inputSt} />
                        </LabelInput>
                        <LabelInput label="Localidad">
                          <input value={editForm.localidad} onChange={e => setEF('localidad', e.target.value)} style={inputSt} />
                        </LabelInput>
                        <LabelInput label="Código Postal">
                          <input value={editForm.codigo_postal} onChange={e => setEF('codigo_postal', e.target.value)} style={inputSt} />
                        </LabelInput>
                        <LabelInput label="Provincia">
                          <select value={editForm.provincia} onChange={e => setEF('provincia', e.target.value)} style={inputSt}>
                            <option value="">Seleccioná...</option>
                            {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </LabelInput>
                        <div /> {/* spacer */}
                        <LabelInput label="Dirección de entrega">
                          <input value={editForm.direccion_entrega} onChange={e => setEF('direccion_entrega', e.target.value)} style={inputSt} />
                        </LabelInput>
                        <LabelInput label="Horario de entrega">
                          <input value={editForm.horario_entrega} onChange={e => setEF('horario_entrega', e.target.value)} placeholder="Ej: Lunes a viernes 9-17hs" style={inputSt} />
                        </LabelInput>
                        <LabelInput label="Persona de contacto">
                          <input value={editForm.persona_contacto} onChange={e => setEF('persona_contacto', e.target.value)} style={inputSt} />
                        </LabelInput>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ── Vista ── */
                  <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px 24px' }}>
                    {isDistrib ? [
                      { label: 'Email',              val: u.email || cl?.email },
                      { label: 'Teléfono',           val: u.telefono || cl?.telefono },
                      { label: 'CUIT',               val: cl?.cuit },
                      { label: 'Descuento Calefones',val: u.descuentos?.calefones_calderas != null ? `${u.descuentos.calefones_calderas}%` : null },
                      { label: 'Descuento Paneles',  val: u.descuentos?.paneles_calefactores != null ? `${u.descuentos.paneles_calefactores}%` : null },
                      { label: 'Descuento Anafes',   val: u.descuentos?.anafes != null ? `${u.descuentos.anafes}%` : null },
                      { label: 'Dir. de entrega',    val: cl?.direccion_entrega },
                      { label: 'Horario de entrega', val: cl?.horario_entrega },
                      { label: 'Persona de contacto',val: cl?.persona_contacto },
                    ].filter(f => f.val).map(f => (
                      <div key={f.label}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{f.label}</div>
                        <div style={{ fontSize: 13 }}>{f.val}</div>
                      </div>
                    )) : [
                      { label: 'Email',              val: u.email || cl?.email },
                      { label: 'Teléfono',           val: u.telefono || cl?.telefono },
                      { label: 'Dirección',          val: cl?.direccion },
                      { label: 'Localidad',          val: cl?.localidad },
                      { label: 'Provincia',          val: cl?.provincia },
                      { label: 'Código Postal',      val: cl?.codigo_postal },
                      { label: 'Dir. de entrega',    val: cl?.direccion_entrega },
                      { label: 'Horario de entrega', val: cl?.horario_entrega },
                      { label: 'Persona de contacto',val: cl?.persona_contacto },
                    ].filter(f => f.val).map(f => (
                      <div key={f.label}>
                        <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{f.label}</div>
                        <div style={{ fontSize: 13 }}>{f.val}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          <div style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0' }}>
            {listaActual.length} resultado{listaActual.length !== 1 ? 's' : ''}{busqueda ? ` para "${busqueda}"` : ''}
          </div>
        </div>
      )}
    </div>
  )
}
