import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner, Empty } from '@/components/ui'
import { Search, ExternalLink, Pencil, X, Check, ChevronLeft, MessageSquare, AlertTriangle, Package, FileText } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
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

const STATUS_RECLAMO = {
  'Ingresado':  { label: 'Ingresado',  color: '#6eb5ff' },
  'pendiente':  { label: 'Pendiente',  color: '#ffd166' },
  'Resolucion': { label: 'Resolución', color: '#b39dfa' },
  'Devolucion': { label: 'Devolución', color: '#fb923c' },
  'Service':    { label: 'Service',    color: '#2dd4bf' },
  'rechazado':  { label: 'Rechazado',  color: '#ff5577' },
  'cerrado':    { label: 'Cerrado',    color: '#888888' },
}

const inputSt = {
  background: 'var(--surface3)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '7px 10px', color: 'var(--text)',
  fontSize: 13, outline: 'none', width: '100%', fontFamily: 'var(--font)',
}

function LI({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

function Field({ label, val }) {
  if (!val) return null
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</div>
      <div style={{ fontSize: 13 }}>{val}</div>
    </div>
  )
}

function fDate(d) {
  if (!d) return '-'
  try { return format(new Date(d), 'dd/MM/yyyy HH:mm', { locale: es }) } catch { return d }
}

function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

const STATUS_PEDIDO = {
  pendiente:  { label: 'Pendiente',  color: '#ffd166', bg: 'rgba(255,209,102,0.12)' },
  aprobado:   { label: 'Aprobado',   color: '#3dd68c', bg: 'rgba(61,214,140,0.12)'  },
  modificado: { label: 'Modificado', color: '#fb923c', bg: 'rgba(251,146,60,0.12)'  },
  rechazado:  { label: 'Rechazado',  color: '#ff5577', bg: 'rgba(255,85,119,0.12)'  },
  finalizado: { label: 'Finalizado', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
}

// ── Vista de perfil completo ──────────────────────────────────────────────────
function PerfilCliente({ u, onBack, isDistrib, vendedores = [], onAsignarVendedor, onEliminar }) {
  const cl = u.clientes
  const [tab, setTab] = useState('datos')
  const [historial, setHistorial] = useState({ posts: [], reclamos: [], productos: [], pedidos: [] })
  const [loadingH, setLoadingH] = useState(false)

  // Edición
  const [editando, setEditando] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  // Nota interna
  const [nota, setNota] = useState(cl?.notas_admin || '')
  const [savingNota, setSavingNota] = useState(false)

  useEffect(() => {
    async function loadHistorial() {
      setLoadingH(true)
      const queries = [
        supabase.from('posts').select('*, replies(id)').eq('user_id', u.id).order('created_at', { ascending: false }),
        supabase.from('devoluciones').select('tracking_id, producto, motivo, estado, fecha_creacion').eq('portal_user_id', u.id).order('fecha_creacion', { ascending: false }),
        supabase.from('productos_registrados').select('*').eq('portal_user_id', u.id).order('created_at', { ascending: false }),
        isDistrib
          ? supabase.from('pedidos').select('*').eq('distribuidor_id', u.id).order('created_at', { ascending: false })
          : Promise.resolve({ data: [] }),
      ]
      const [postsRes, reclamosRes, productosRes, pedidosRes] = await Promise.all(queries)
      setHistorial({
        posts:     postsRes.data || [],
        reclamos:  reclamosRes.data || [],
        productos: productosRes.data || [],
        pedidos:   pedidosRes.data || [],
      })
      setLoadingH(false)
    }
    loadHistorial()
  }, [u.id])

  function abrirEdicion() {
    if (isDistrib) {
      const desc = u.descuentos || {}
      setEditForm({
        desc_calefones_calderas:   desc.calefones_calderas   ?? '',
        desc_paneles_calefactores: desc.paneles_calefactores ?? '',
        desc_anafes:               desc.anafes               ?? '',
        direccion_entrega:         cl?.direccion_entrega || '',
        horario_entrega:           cl?.horario_entrega   || '',
        persona_contacto:          cl?.persona_contacto  || '',
        dirs_alt: (u.direcciones_entrega || [{},{},{}]).slice(0,3).map(d => ({ nombre: d.nombre||'', direccion: d.direccion||'', localidad: d.localidad||'' })),
      })
    } else {
      setEditForm({
        full_name:         u.full_name || cl?.full_name || '',
        email:             u.email || cl?.email || '',
        telefono:          u.telefono || cl?.telefono || '',
        direccion:         cl?.direccion || '',
        localidad:         cl?.localidad || '',
        provincia:         cl?.provincia || '',
        codigo_postal:     cl?.codigo_postal || '',
        direccion_entrega: cl?.direccion_entrega || '',
        horario_entrega:   cl?.horario_entrega || '',
        persona_contacto:  cl?.persona_contacto || '',
      })
    }
    setEditando(true)
  }

  function setEF(k, v) { setEditForm(f => ({ ...f, [k]: v })) }

  async function guardar() {
    setSaving(true)
    try {
      if (isDistrib) {
        const desc = {
          calefones_calderas:   editForm.desc_calefones_calderas   !== '' ? parseFloat(editForm.desc_calefones_calderas)   : null,
          paneles_calefactores: editForm.desc_paneles_calefactores !== '' ? parseFloat(editForm.desc_paneles_calefactores) : null,
          anafes:               editForm.desc_anafes               !== '' ? parseFloat(editForm.desc_anafes)               : null,
        }
        Object.keys(desc).forEach(k => { if (desc[k] === null) delete desc[k] })
        const dirsAlt = (editForm.dirs_alt || []).filter(d => d.direccion.trim())
        await supabase.from('profiles').update({ descuentos: desc, direcciones_entrega: dirsAlt }).eq('id', u.id)
        if (cl?.id) await supabase.from('clientes').update({ direccion_entrega: editForm.direccion_entrega, horario_entrega: editForm.horario_entrega, persona_contacto: editForm.persona_contacto }).eq('id', cl.id)
      } else {
        await supabase.from('profiles').update({ full_name: editForm.full_name, email: editForm.email, telefono: editForm.telefono }).eq('id', u.id)
        if (cl?.id) await supabase.from('clientes').update({ full_name: editForm.full_name, email: editForm.email, telefono: editForm.telefono, direccion: editForm.direccion, localidad: editForm.localidad, provincia: editForm.provincia, codigo_postal: editForm.codigo_postal, direccion_entrega: editForm.direccion_entrega, horario_entrega: editForm.horario_entrega, persona_contacto: editForm.persona_contacto }).eq('id', cl.id)
      }
      toast.success('Guardado')
      setEditando(false)
    } catch (e) { toast.error(e.message) }
    setSaving(false)
  }

  async function guardarNota() {
    if (!cl?.id) { toast.error('No se encontró el registro del cliente'); return }
    setSavingNota(true)
    const { error } = await supabase.from('clientes').update({ notas_admin: nota }).eq('id', cl.id)
    setSavingNota(false)
    if (error) toast.error(error.message); else toast.success('Nota guardada')
  }

  const TABS = [
    { key: 'datos',     label: 'Datos',          icon: '👤' },
    ...(isDistrib ? [{ key: 'pedidos', label: `Pedidos (${historial.pedidos.length})`, icon: '📋' }] : []),
    { key: 'reclamos',  label: `Reclamos (${historial.reclamos.length})`,   icon: '⚠️' },
    { key: 'consultas', label: `Consultas (${historial.posts.length})`,      icon: '💬' },
    { key: 'productos', label: `Productos Reg. (${historial.productos.length})`, icon: '📦' },
    { key: 'notas',     label: 'Notas internas',  icon: '🔒' },
  ]

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      {/* Back */}
      <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, cursor: 'pointer', padding: 0 }}>
        <ChevronLeft size={15} /> Volver al listado
      </button>

      {/* Header del perfil */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 26px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 50, height: 50, borderRadius: '50%', background: isDistrib ? 'rgba(255,209,102,0.15)' : 'rgba(74,108,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            {isDistrib ? '🏪' : '👤'}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 }}>{u.full_name || cl?.full_name || '-'}</div>
            {isDistrib && cl?.razon_social && <div style={{ fontSize: 13, color: '#ffd166', fontWeight: 600 }}>{cl.razon_social}</div>}
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{u.email || cl?.email}</div>
            {isDistrib && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Vendedor:</span>
                <select
                  value={u.vendedor_id || ''}
                  onChange={e => onAsignarVendedor?.(u.id, e.target.value || null)}
                  onClick={e => e.stopPropagation()}
                  style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px', color: 'var(--text)', fontSize: 12, fontFamily: 'var(--font)', outline: 'none', cursor: 'pointer' }}
                >
                  <option value="">TEMPTECH</option>
                  {vendedores.map(v => (
                    <option key={v.id} value={v.id}>{v.razon_social || v.full_name || v.email}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {isDistrib && cl?.client_code && (
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#ffd166', background: 'rgba(255,209,102,0.1)', padding: '4px 12px', borderRadius: 8, fontSize: 13 }}>{cl.client_code}</span>
          )}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', fontSize: 12 }}>
            <span style={{ color: '#6eb5ff', fontWeight: 700 }}>{historial.reclamos.length}</span> <span style={{ color: 'var(--text3)' }}>reclamos</span>
            <span style={{ color: 'var(--text3)', margin: '0 2px' }}>·</span>
            <span style={{ color: '#fb923c', fontWeight: 700 }}>{historial.posts.length}</span> <span style={{ color: 'var(--text3)' }}>consultas</span>
            <span style={{ color: 'var(--text3)', margin: '0 2px' }}>·</span>
            <span style={{ color: '#3dd68c', fontWeight: 700 }}>{historial.productos.length}</span> <span style={{ color: 'var(--text3)' }}>productos</span>
          </div>
          <button
            onClick={() => {
              if (window.confirm(`¿Eliminar a ${u.full_name || u.email}? Esta acción no se puede deshacer.`)) {
                onEliminar?.(u.id)
              }
            }}
            style={{ background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.35)', color: '#ff5577', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
          >
            🗑 Eliminar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 18px', background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: tab === t.key ? 700 : 400,
            color: tab === t.key ? 'var(--text)' : 'var(--text3)',
            borderBottom: `2px solid ${tab === t.key ? '#7b9fff' : 'transparent'}`,
            marginBottom: -1, transition: 'all .15s', whiteSpace: 'nowrap',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* ── TAB: Datos ── */}
      {tab === 'datos' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>Información del {isDistrib ? 'distribuidor' : 'cliente'}</div>
            {!editando
              ? <button onClick={abrirEdicion} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(74,108,247,0.1)', color: '#7b9fff', border: '1px solid rgba(74,108,247,0.35)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><Pencil size={12} /> Editar</button>
              : <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={guardar} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(61,214,140,0.12)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.35)', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><Check size={13} /> {saving ? 'Guardando...' : 'Guardar'}</button>
                  <button onClick={() => setEditando(false)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', fontSize: 12, cursor: 'pointer' }}><X size={13} /> Cancelar</button>
                </div>
            }
          </div>

          {editando ? (
            isDistrib ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#ffd166', marginBottom: 10 }}>📊 Descuentos por categoría</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    {CATEGORIAS_DESC.map(cat => (
                      <LI key={cat.key} label={`${cat.label} (%)`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type="number" min="0" max="100" step="0.5" value={editForm[`desc_${cat.key}`]} onChange={e => setEF(`desc_${cat.key}`, e.target.value)} style={{ ...inputSt, width: 80, textAlign: 'center' }} />
                          <span style={{ color: 'var(--text3)', fontSize: 13 }}>%</span>
                        </div>
                      </LI>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#7b9fff', marginBottom: 10 }}>📍 Datos de entrega</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                    <LI label="Dirección principal"><input value={editForm.direccion_entrega} onChange={e => setEF('direccion_entrega', e.target.value)} style={inputSt} /></LI>
                    <LI label="Horario de entrega"><input value={editForm.horario_entrega} onChange={e => setEF('horario_entrega', e.target.value)} placeholder="Ej: Lunes a viernes 9-17hs" style={inputSt} /></LI>
                    <LI label="Persona de contacto"><input value={editForm.persona_contacto} onChange={e => setEF('persona_contacto', e.target.value)} style={inputSt} /></LI>
                  </div>
                  {/* Direcciones alternativas */}
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 10 }}>Direcciones alternativas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, fontWeight: 600 }}>Dirección {i + 2}</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>Nombre / referencia</div>
                            <input
                              value={editForm.dirs_alt?.[i]?.nombre || ''}
                              onChange={e => { const d = [...(editForm.dirs_alt||[{},{},{}])]; d[i] = { ...d[i], nombre: e.target.value }; setEF('dirs_alt', d) }}
                              placeholder="Ej: Depósito"
                              style={{ ...inputSt, fontSize: 12 }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>Dirección</div>
                            <input
                              value={editForm.dirs_alt?.[i]?.direccion || ''}
                              onChange={e => { const d = [...(editForm.dirs_alt||[{},{},{}])]; d[i] = { ...d[i], direccion: e.target.value }; setEF('dirs_alt', d) }}
                              placeholder="Calle 123"
                              style={{ ...inputSt, fontSize: 12 }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 3 }}>Localidad</div>
                            <input
                              value={editForm.dirs_alt?.[i]?.localidad || ''}
                              onChange={e => { const d = [...(editForm.dirs_alt||[{},{},{}])]; d[i] = { ...d[i], localidad: e.target.value }; setEF('dirs_alt', d) }}
                              placeholder="Ciudad"
                              style={{ ...inputSt, fontSize: 12 }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <LI label="Nombre y Apellido"><input value={editForm.full_name} onChange={e => setEF('full_name', e.target.value)} style={inputSt} /></LI>
                <LI label="Email"><input value={editForm.email} onChange={e => setEF('email', e.target.value)} style={inputSt} /></LI>
                <LI label="Teléfono"><input value={editForm.telefono} onChange={e => setEF('telefono', e.target.value)} style={inputSt} /></LI>
                <LI label="Dirección"><input value={editForm.direccion} onChange={e => setEF('direccion', e.target.value)} style={inputSt} /></LI>
                <LI label="Localidad"><input value={editForm.localidad} onChange={e => setEF('localidad', e.target.value)} style={inputSt} /></LI>
                <LI label="Código Postal"><input value={editForm.codigo_postal} onChange={e => setEF('codigo_postal', e.target.value)} style={inputSt} /></LI>
                <LI label="Provincia">
                  <select value={editForm.provincia} onChange={e => setEF('provincia', e.target.value)} style={inputSt}>
                    <option value="">Seleccioná...</option>
                    {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </LI>
                <div />
                <LI label="Dirección de entrega"><input value={editForm.direccion_entrega} onChange={e => setEF('direccion_entrega', e.target.value)} style={inputSt} /></LI>
                <LI label="Horario de entrega"><input value={editForm.horario_entrega} onChange={e => setEF('horario_entrega', e.target.value)} placeholder="Ej: Lunes a viernes 9-17hs" style={inputSt} /></LI>
                <LI label="Persona de contacto"><input value={editForm.persona_contacto} onChange={e => setEF('persona_contacto', e.target.value)} style={inputSt} /></LI>
              </div>
            )
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px 28px' }}>
              {isDistrib ? [
                { label: 'Email',               val: u.email || cl?.email },
                { label: 'Teléfono',            val: u.telefono || cl?.telefono },
                { label: 'CUIT',                val: cl?.cuit },
                { label: 'Desc. Calefones/Calderas', val: u.descuentos?.calefones_calderas != null ? `${u.descuentos.calefones_calderas}%` : null },
                { label: 'Desc. Paneles',       val: u.descuentos?.paneles_calefactores != null ? `${u.descuentos.paneles_calefactores}%` : null },
                { label: 'Desc. Anafes',        val: u.descuentos?.anafes != null ? `${u.descuentos.anafes}%` : null },
                { label: 'Dirección de entrega',val: cl?.direccion_entrega },
                { label: 'Horario de entrega',  val: cl?.horario_entrega },
                { label: 'Persona de contacto', val: cl?.persona_contacto },
              ].map(f => <Field key={f.label} {...f} />) : [
                { label: 'Email',               val: u.email || cl?.email },
                { label: 'Teléfono',            val: u.telefono || cl?.telefono },
                { label: 'Dirección',           val: cl?.direccion },
                { label: 'Localidad',           val: cl?.localidad },
                { label: 'Provincia',           val: cl?.provincia },
                { label: 'Código Postal',       val: cl?.codigo_postal },
                { label: 'Dirección de entrega',val: cl?.direccion_entrega },
                { label: 'Horario de entrega',  val: cl?.horario_entrega },
                { label: 'Persona de contacto', val: cl?.persona_contacto },
              ].map(f => <Field key={f.label} {...f} />)}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Reclamos ── */}
      {tab === 'reclamos' && (
        loadingH ? <div style={{ textAlign: 'center', padding: 60 }}><Spinner size={24} /></div> :
        historial.reclamos.length === 0 ? (
          <Empty icon="✅" title="Sin reclamos de garantía" description="Este cliente no realizó reclamos" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historial.reclamos.map(r => {
              const cfg = STATUS_RECLAMO[r.estado] || STATUS_RECLAMO['Ingresado']
              return (
                <div key={r.tracking_id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <AlertTriangle size={18} color={cfg.color} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.producto}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      <span style={{ fontFamily: 'monospace', color: '#7b9fff' }}>{r.tracking_id}</span>
                      {r.motivo && <span> · {r.motivo}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}40`, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{cfg.label}</span>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{fDate(r.fecha_creacion)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── TAB: Consultas foro ── */}
      {tab === 'consultas' && (
        loadingH ? <div style={{ textAlign: 'center', padding: 60 }}><Spinner size={24} /></div> :
        historial.posts.length === 0 ? (
          <Empty icon="💬" title="Sin consultas" description="Este cliente no publicó consultas en el foro" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historial.posts.map(p => (
              <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <MessageSquare size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {(p.replies?.length || 0)} respuestas · {fDate(p.created_at)}
                  </div>
                </div>
                <span style={{
                  background: p.status === 'resolved' ? 'rgba(61,214,140,0.12)' : 'rgba(255,209,102,0.12)',
                  color: p.status === 'resolved' ? '#3dd68c' : '#ffd166',
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                  border: `1px solid ${p.status === 'resolved' ? 'rgba(61,214,140,0.35)' : 'rgba(255,209,102,0.35)'}`,
                }}>{p.status === 'resolved' ? 'Resuelto' : 'Pendiente'}</span>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── TAB: Productos registrados ── */}
      {tab === 'productos' && (
        loadingH ? <div style={{ textAlign: 'center', padding: 60 }}><Spinner size={24} /></div> :
        historial.productos.length === 0 ? (
          <Empty icon="📦" title="Sin productos registrados" description="Este cliente no registró compras" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {historial.productos.map(p => (
              <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <Package size={18} color="var(--text3)" style={{ flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{p.producto}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                    {p.canal && <span>{p.canal} · </span>}
                    {p.fecha_compra ? `Compra: ${new Date(p.fecha_compra + 'T12:00:00').toLocaleDateString('es-AR')} · ` : ''}
                    Registrado: {fDate(p.created_at)}
                  </div>
                </div>
                {p.comprobante_url && (
                  <a href={p.comprobante_url} target="_blank" rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#7b9fff', textDecoration: 'none', background: 'rgba(74,108,247,0.1)', border: '1px solid rgba(74,108,247,0.25)', borderRadius: 6, padding: '4px 10px' }}>
                    <ExternalLink size={11} /> Comprobante
                  </a>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* ── TAB: Pedidos (solo distribuidores) ── */}
      {tab === 'pedidos' && (
        loadingH ? <div style={{ textAlign: 'center', padding: 60 }}><Spinner size={24} /></div> :
        historial.pedidos.length === 0 ? (
          <Empty icon="📋" title="Sin pedidos" description="Este distribuidor no tiene pedidos aún" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {historial.pedidos.map(p => {
              const cfg = STATUS_PEDIDO[p.estado] || STATUS_PEDIDO.pendiente
              return (
                <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  {/* Header */}
                  <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '2px 8px', borderRadius: 4 }}>
                        #{p.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>
                        {cfg.label}
                      </span>
                      {p.tipo === 'preventa' && (
                        <span style={{ background: 'rgba(255,209,102,0.12)', color: '#ffd166', border: '1px solid rgba(255,209,102,0.35)', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20 }}>
                          📦 Preventa
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#7b9fff', fontSize: 14 }}>{formatPrecio(p.total)}</div>
                        {p.incluir_iva && <div style={{ fontSize: 10, color: 'var(--text3)' }}>c/IVA incl.</div>}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text3)' }}>{new Date(p.created_at).toLocaleDateString('es-AR')}</span>
                    </div>
                  </div>
                  {/* Items */}
                  <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {(p.items || []).map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--text2)' }}>
                          {item.nombre} <span style={{ color: 'var(--text3)', fontSize: 11 }}>{item.modelo}</span>
                        </span>
                        <span style={{ color: 'var(--text3)' }}>x{item.cantidad} · {formatPrecio(item.subtotal)}</span>
                      </div>
                    ))}
                    {p.incluir_iva && p.iva_monto > 0 && (
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                          <span>Subtotal neto</span><span>{formatPrecio(p.total - p.iva_monto)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                          <span>IVA (21%)</span><span>{formatPrecio(p.iva_monto)}</span>
                        </div>
                      </div>
                    )}
                    {p.notas_admin && (
                      <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 6, fontSize: 11, color: 'var(--text2)' }}>
                        <span style={{ fontWeight: 700, color: '#7b9fff' }}>Nota TEMPTECH: </span>{p.notas_admin}
                      </div>
                    )}
                    {p.fecha_entrega && (
                      <div style={{ marginTop: 6, fontSize: 11, color: '#3dd68c' }}>
                        📅 Entrega: {new Date(p.fecha_entrega + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* ── TAB: Notas internas ── */}
      {tab === 'notas' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 24px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#ffd166', marginBottom: 12 }}>🔒 Notas internas del equipo TEMPTECH</div>
          <p style={{ fontSize: 12, color: 'var(--text3)', marginBottom: 14 }}>Estas notas solo son visibles para admins. Usalas para registrar observaciones, acuerdos comerciales, historial de contacto, etc.</p>
          <textarea
            value={nota}
            onChange={e => setNota(e.target.value)}
            rows={8}
            placeholder="Ingresá notas internas sobre este cliente..."
            style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', resize: 'vertical', outline: 'none', lineHeight: 1.7, marginBottom: 12 }}
          />
          <button onClick={guardarNota} disabled={savingNota}
            style={{ background: 'rgba(255,209,102,0.12)', color: '#ffd166', border: '1px solid rgba(255,209,102,0.35)', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: savingNota ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
            🔒 {savingNota ? 'Guardando...' : 'Guardar nota'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function ClientesRegistrados() {
  const { isAdmin, isAdmin2 } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [vendedores, setVendedores] = useState([])
  const [productosReg, setProductosReg] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [tab, setTab] = useState('clientes')
  const [selected, setSelected] = useState(null) // productos_registrados expand
  const [detailUser, setDetailUser] = useState(null) // perfil completo
  const [detailVendedor, setDetailVendedor] = useState(null)
  const [modalNuevoVendedor, setModalNuevoVendedor] = useState(false)
  const [nvForm, setNvForm] = useState({ email: '', password: '', full_name: '', razon_social: '', telefono: '', localidad: '', provincia: '', zona_cobertura: '' })
  const [creandoVendedor, setCreandoVendedor] = useState(false)

  async function crearVendedor() {
    if (!nvForm.email || !nvForm.password) { toast.error('Email y contraseña son obligatorios'); return }
    setCreandoVendedor(true)
    const { data, error } = await supabase.rpc('crear_cliente_vendedor', {
      p_email:      nvForm.email.trim(),
      p_password:   nvForm.password,
      p_full_name:  nvForm.full_name.trim() || null,
      p_razon_social: nvForm.razon_social.trim() || null,
      p_telefono:   nvForm.telefono.trim() || null,
      p_localidad:  nvForm.localidad.trim() || null,
      p_provincia:  nvForm.provincia.trim() || null,
      p_vendedor_id: null,
    })
    if (error) { toast.error('Error: ' + error.message); setCreandoVendedor(false); return }
    // Asignar role vendedor y zona_cobertura
    await supabase.from('profiles').update({
      role: 'vendedor',
      zona_cobertura: nvForm.zona_cobertura.trim() || null,
    }).eq('id', data)
    toast.success('Vendedor creado ✅')
    setCreandoVendedor(false)
    setModalNuevoVendedor(false)
    setNvForm({ email: '', password: '', full_name: '', razon_social: '', telefono: '', localidad: '', provincia: '', zona_cobertura: '' })
    load()
  }

  // Edición inline en lista (para productos reg)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (isAdmin || isAdmin2) load() }, [isAdmin, isAdmin2])

  async function load() {
    setLoading(true)
    const [{ data: perfiles }, { data: prods }, { data: vends }] = await Promise.all([
      supabase.from('profiles').select('*, clientes(*), vendedor_id').order('created_at', { ascending: false }),
      supabase.from('productos_registrados').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, razon_social, email, telefono, localidad, provincia, zona_cobertura, created_at').eq('role', 'vendedor'),
    ])
    setUsuarios(perfiles || [])
    setProductosReg(prods || [])
    setVendedores(vends || [])
    setLoading(false)
  }

  async function eliminarUsuario(userId) {
    const { error } = await supabase.rpc('eliminar_usuario', { p_user_id: userId })
    if (error) {
      // Fallback: solo borrar el perfil si no existe la función
      const { error: e2 } = await supabase.from('profiles').delete().eq('id', userId)
      if (e2) { toast.error('Error al eliminar: ' + e2.message); return }
    }
    toast.success('Usuario eliminado')
    setDetailUser(null)
    setUsuarios(prev => prev.filter(u => u.id !== userId))
    setVendedores(prev => prev.filter(v => v.id !== userId))
  }

  async function asignarVendedor(userId, vendedorId) {
    const { error } = await supabase.from('profiles').update({ vendedor_id: vendedorId || null }).eq('id', userId)
    if (error) { toast.error('Error al asignar vendedor'); return }
    toast.success('Vendedor asignado ✅')
    setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, vendedor_id: vendedorId || null } : u))
    if (detailUser?.id === userId) setDetailUser(prev => ({ ...prev, vendedor_id: vendedorId || null }))
  }

  function nombreVendedor(vendedor_id) {
    if (!vendedor_id) return 'TEMPTECH'
    const v = vendedores.find(v => v.id === vendedor_id)
    return v ? (v.razon_social || v.full_name || v.email) : 'TEMPTECH'
  }

  if (!isAdmin && !isAdmin2) return null

  const clientes       = usuarios.filter(u => u.role !== 'vendedor' && u.role !== 'admin' && u.role !== 'admin2' && (u.user_type === 'client'      || u.clientes?.user_type === 'client'))
  const distribuidores = usuarios.filter(u => u.role !== 'vendedor' && u.role !== 'admin' && u.role !== 'admin2' && (u.user_type === 'distributor' || u.clientes?.user_type === 'distributor'))

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
    : tab === 'vendedores'
    ? vendedores.filter(v => {
        const q = busqueda.toLowerCase()
        return !q || (v.full_name || '').toLowerCase().includes(q) || (v.email || '').toLowerCase().includes(q) || (v.razon_social || '').toLowerCase().includes(q)
      })
    : filtrar(tab === 'clientes' ? clientes : distribuidores)

  const TABS_MAIN = [
    { key: 'clientes',       label: '👤 Clientes',      count: clientes.length,      color: '#7b9fff', bg: 'rgba(74,108,247,0.1)',   border: 'rgba(74,108,247,0.35)' },
    { key: 'distribuidores', label: '🏪 Distribuidores', count: distribuidores.length, color: '#ffd166', bg: 'rgba(255,209,102,0.1)', border: 'rgba(255,209,102,0.35)' },
    { key: 'productos',      label: '📦 Productos Reg.', count: productosReg.length,   color: '#3dd68c', bg: 'rgba(61,214,140,0.1)',  border: 'rgba(61,214,140,0.35)' },
    { key: 'vendedores',     label: '🧑‍💼 Vendedores',    count: vendedores.length,     color: '#b39dfa', bg: 'rgba(179,157,250,0.1)', border: 'rgba(179,157,250,0.35)' },
  ]

  // Mostrar perfil vendedor
  if (detailVendedor) {
    const v = detailVendedor
    const misDistrib = usuarios.filter(u => u.vendedor_id === v.id && (u.user_type === 'distributor' || u.clientes?.user_type === 'distributor'))
    const misClients = usuarios.filter(u => u.vendedor_id === v.id && (u.user_type === 'client'      || u.clientes?.user_type === 'client'))
    return (
      <div style={{ animation: 'fadeUp 0.3s ease' }}>
        <button onClick={() => setDetailVendedor(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, cursor: 'pointer', padding: 0 }}>
          <ChevronLeft size={15} /> Volver al listado
        </button>

        {/* Header */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '22px 26px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(179,157,250,0.15)', border: '1px solid rgba(179,157,250,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🧑‍💼</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 800 }}>{v.razon_social || v.full_name || '-'}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{v.email}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', fontSize: 12 }}>
              <span style={{ color: '#b39dfa', fontWeight: 700 }}>{misDistrib.length}</span> <span style={{ color: 'var(--text3)' }}>distribuidores</span>
              <span style={{ color: 'var(--text3)', margin: '0 2px' }}>·</span>
              <span style={{ color: '#7b9fff', fontWeight: 700 }}>{misClients.length}</span> <span style={{ color: 'var(--text3)' }}>clientes</span>
            </div>
            <button
              onClick={() => { if (window.confirm(`¿Eliminar a ${v.full_name || v.email}?`)) { eliminarUsuario(v.id); setDetailVendedor(null) } }}
              style={{ background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.35)', color: '#ff5577', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              🗑 Eliminar
            </button>
          </div>
        </div>

        {/* Datos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>Datos del vendedor</div>
            {[
              ['Email',           v.email],
              ['Teléfono',        v.telefono],
              ['Localidad',       v.localidad],
              ['Provincia',       v.provincia],
              ['Zona de cobertura', v.zona_cobertura],
            ].map(([label, val]) => !val ? null : (
              <div key={label} style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 10 }}>
                <span style={{ color: 'var(--text3)', minWidth: 140, flexShrink: 0 }}>{label}</span>
                <span style={{ color: 'var(--text2)' }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Listado clientes/distribuidores */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 16 }}>Sus clientes</div>
            {misDistrib.length === 0 && misClients.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text3)' }}>Sin clientes asignados</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {misDistrib.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, fontSize: 13 }}>
                    <span>🏪</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{u.clientes?.razon_social || u.full_name || '-'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.email}</div>
                    </div>
                    <span style={{ fontSize: 11, color: '#ffd166', background: 'rgba(255,209,102,0.1)', padding: '2px 8px', borderRadius: 20 }}>Distribuidor</span>
                  </div>
                ))}
                {misClients.map(u => (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface2)', borderRadius: 8, fontSize: 13 }}>
                    <span>👤</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{u.full_name || '-'}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.email}</div>
                    </div>
                    <span style={{ fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '2px 8px', borderRadius: 20 }}>Cliente</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Mostrar perfil completo
  if (detailUser) {
    const isDistrib = detailUser.user_type === 'distributor' || detailUser.clientes?.user_type === 'distributor'
    return <PerfilCliente u={detailUser} isDistrib={isDistrib} onBack={() => setDetailUser(null)} vendedores={vendedores} onAsignarVendedor={asignarVendedor} onEliminar={eliminarUsuario} />
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
        {TABS_MAIN.map(t => (
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
            {listaActual.length} resultado{listaActual.length !== 1 ? 's' : ''}
          </div>
        </div>
      ) : tab === 'vendedores' ? (
        /* ── Vendedores ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
            <button onClick={() => setModalNuevoVendedor(true)}
              style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>
              + Nuevo vendedor
            </button>
          </div>
          {listaActual.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>No hay vendedores registrados</div>
          ) : listaActual.map(v => {
            const misClientes = usuarios.filter(u => u.vendedor_id === v.id)
            return (
              <div key={v.id}
                onClick={() => setDetailVendedor(v)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(179,157,250,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, cursor: 'pointer', transition: 'all .15s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(179,157,250,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🧑‍💼</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{v.razon_social || v.full_name || '-'}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{v.email}{v.localidad ? ` · ${v.localidad}` : ''}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                    <strong style={{ color: '#b39dfa' }}>{misClientes.filter(c => c.user_type === 'distributor' || c.clientes?.user_type === 'distributor').length}</strong> distribuidores
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>
                    <strong style={{ color: '#7b9fff' }}>{misClientes.filter(c => c.user_type === 'client' || c.clientes?.user_type === 'client').length}</strong> clientes
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); if (window.confirm(`¿Eliminar a ${v.razon_social || v.full_name || v.email}?`)) { eliminarUsuario(v.id); setDetailVendedor(null) } }}
                    style={{ background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.35)', color: '#ff5577', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    🗑 Eliminar
                  </button>
                </div>
              </div>
            )
          })}
          <div style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0' }}>
            {listaActual.length} vendedor{listaActual.length !== 1 ? 'es' : ''}
          </div>
        </div>
      ) : (
        /* ── Clientes / Distribuidores ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {listaActual.map(u => {
            const cl = u.clientes
            const createdAt = u.created_at || cl?.created_at
            const isDistrib = tab === 'distribuidores'

            return (
              <div key={u.id}
                onClick={() => setDetailUser(u)}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)' }}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, cursor: 'pointer', transition: 'all .15s' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: isDistrib ? 'rgba(255,209,102,0.15)' : 'rgba(74,108,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {isDistrib ? '🏪' : '👤'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{u.full_name || cl?.full_name || '-'}</div>
                    {isDistrib && cl?.razon_social && <div style={{ fontSize: 12, color: '#ffd166' }}>{cl.razon_social}</div>}
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{u.email || cl?.email}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  {isDistrib && cl?.client_code && (
                    <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#ffd166', background: 'rgba(255,209,102,0.1)', padding: '3px 10px', borderRadius: 6 }}>{cl.client_code}</span>
                  )}
                  {u.telefono || cl?.telefono
                    ? <span style={{ fontSize: 12, color: 'var(--text3)' }}>{u.telefono || cl.telefono}</span>
                    : null}
                  {isDistrib && (
                    <span style={{ fontSize: 11, fontWeight: 600, color: u.vendedor_id ? '#3dd68c' : 'var(--text3)', background: u.vendedor_id ? 'rgba(61,214,140,0.1)' : 'var(--surface2)', border: `1px solid ${u.vendedor_id ? 'rgba(61,214,140,0.3)' : 'var(--border)'}`, padding: '2px 8px', borderRadius: 20 }}>
                      {nombreVendedor(u.vendedor_id)}
                    </span>
                  )}
                  {createdAt && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: es })}</span>}
                  <span style={{ fontSize: 11, color: '#7b9fff' }}>Ver perfil →</span>
                </div>
              </div>
            )
          })}
          <div style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0' }}>
            {listaActual.length} resultado{listaActual.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>

    {/* Modal nuevo vendedor */}
    {modalNuevoVendedor && (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700 }}>🧑‍💼 Nuevo vendedor</span>
            <button onClick={() => setModalNuevoVendedor(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>✕</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Email *</div>
              <input style={inputSt} type="email" value={nvForm.email} onChange={e => setNvForm(p => ({ ...p, email: e.target.value }))} placeholder="vendedor@email.com" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Contraseña *</div>
              <input style={inputSt} type="password" value={nvForm.password} onChange={e => setNvForm(p => ({ ...p, password: e.target.value }))} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Nombre</div>
              <input style={inputSt} value={nvForm.full_name} onChange={e => setNvForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Nombre y apellido" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Razón social</div>
              <input style={inputSt} value={nvForm.razon_social} onChange={e => setNvForm(p => ({ ...p, razon_social: e.target.value }))} placeholder="Empresa (opcional)" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Teléfono</div>
              <input style={inputSt} value={nvForm.telefono} onChange={e => setNvForm(p => ({ ...p, telefono: e.target.value }))} placeholder="+54 11..." />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Localidad</div>
              <input style={inputSt} value={nvForm.localidad} onChange={e => setNvForm(p => ({ ...p, localidad: e.target.value }))} placeholder="Ciudad" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Provincia</div>
              <select style={inputSt} value={nvForm.provincia} onChange={e => setNvForm(p => ({ ...p, provincia: e.target.value }))}>
                <option value="">Seleccionar...</option>
                {PROVINCIAS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Zona de cobertura</div>
              <input style={inputSt} value={nvForm.zona_cobertura} onChange={e => setNvForm(p => ({ ...p, zona_cobertura: e.target.value }))} placeholder="Ej: GBA Norte, Córdoba..." />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button onClick={() => setModalNuevoVendedor(false)} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', color: 'var(--text2)' }}>Cancelar</button>
            <button onClick={crearVendedor} disabled={creandoVendedor} style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)', opacity: creandoVendedor ? 0.6 : 1 }}>
              {creandoVendedor ? 'Creando...' : 'Crear vendedor'}
            </button>
          </div>
        </div>
      </div>
    )}
  )
}
