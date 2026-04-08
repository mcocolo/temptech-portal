import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner, Empty } from '@/components/ui'
import { Search, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ClientesRegistrados() {
  const { isAdmin } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [productosReg, setProductosReg] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [tab, setTab] = useState('clientes') // 'clientes' | 'distribuidores' | 'productos'
  const [selected, setSelected] = useState(null)

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

  // Separar usuarios por tipo
  const clientes      = usuarios.filter(u => u.user_type === 'client'       || u.clientes?.user_type === 'client')
  const distribuidores = usuarios.filter(u => u.user_type === 'distributor'  || u.clientes?.user_type === 'distributor')

  const filtrarUsuarios = (lista) => {
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

  const listaActual = tab === 'productos' ? filtrarProductos() : filtrarUsuarios(tab === 'clientes' ? clientes : distribuidores)

  const TABS = [
    { key: 'clientes',      label: '👤 Clientes',       count: clientes.length,      color: '#7b9fff', bg: 'rgba(74,108,247,0.1)',   border: 'rgba(74,108,247,0.35)' },
    { key: 'distribuidores', label: '🏪 Distribuidores', count: distribuidores.length, color: '#ffd166', bg: 'rgba(255,209,102,0.1)', border: 'rgba(255,209,102,0.35)' },
    { key: 'productos',     label: '📦 Productos Reg.',  count: productosReg.length,   color: '#3dd68c', bg: 'rgba(61,214,140,0.1)',  border: 'rgba(61,214,140,0.35)' },
  ]

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Clientes Registrados</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Usuarios registrados en el portal TEMPTECH</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Clientes',       val: clientes.length,       color: '#7b9fff', bg: 'rgba(110,181,255,0.08)' },
          { label: 'Distribuidores', val: distribuidores.length,  color: '#ffd166', bg: 'rgba(255,209,102,0.08)' },
          { label: 'Productos Reg.', val: productosReg.length,    color: '#3dd68c', bg: 'rgba(61,214,140,0.08)' },
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
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setSelected(null); setBusqueda('') }}
            style={{
              padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${tab === t.key ? t.border : 'var(--border)'}`,
              background: tab === t.key ? t.bg : 'transparent',
              color: tab === t.key ? t.color : 'var(--text3)',
              transition: 'all .15s',
            }}
          >
            {t.label} <span style={{ opacity: 0.7, fontSize: 11 }}>({t.count})</span>
          </button>
        ))}
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder={tab === 'productos' ? 'Buscar por nombre, email o producto...' : 'Buscar por nombre, email o razón social...'}
          style={{ width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px 10px 40px', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'var(--font)' }}
          onFocus={e => e.target.style.borderColor = 'rgba(74,108,247,0.5)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        {busqueda && (
          <button onClick={() => setBusqueda('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 18 }}>×</button>
        )}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={28} /></div>
      ) : listaActual.length === 0 ? (
        <Empty icon={tab === 'clientes' ? '👤' : tab === 'distribuidores' ? '🏪' : '📦'} title="Sin resultados" description={busqueda ? 'No encontramos resultados para tu búsqueda' : 'No hay registros en esta categoría'} />
      ) : tab === 'productos' ? (
        /* ── Tabla productos registrados ── */
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
                      {r.comprobante_url ? (
                        <a href={r.comprobante_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#7b9fff', textDecoration: 'none' }}>
                          Ver <ExternalLink size={11} />
                        </a>
                      ) : <span style={{ fontSize: 12, color: 'var(--text3)' }}>—</span>}
                    </td>
                  </tr>
                  {selected?.id === r.id && (
                    <tr key={`detail-${r.id}`}>
                      <td colSpan={7} style={{ padding: '0 18px 18px' }}>
                        <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 24px' }}>
                          {[
                            { label: 'Teléfono', val: r.telefono },
                            { label: 'Dirección', val: r.direccion },
                            { label: 'Localidad', val: r.localidad },
                            { label: 'Provincia', val: r.provincia },
                            { label: 'Código Postal', val: r.codigo_postal },
                            { label: 'N° Pedido', val: r.numero_pedido },
                          ].filter(f => f.val).map(f => (
                            <div key={f.label}>
                              <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{f.label}</div>
                              <div style={{ fontSize: 13 }}>{f.val}</div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
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
        /* ── Tabla usuarios (clientes / distribuidores) ── */
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {(tab === 'distribuidores'
                  ? ['Nombre', 'Razón Social', 'CUIT', 'Email', 'Teléfono', 'Código', 'Registrado']
                  : ['Nombre', 'Email', 'Teléfono', 'Localidad', 'Provincia', 'Registrado']
                ).map(h => (
                  <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {listaActual.map(u => {
                const cl = u.clientes
                const createdAt = u.created_at || cl?.created_at
                return (
                  <>
                    <tr key={u.id}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      style={{ borderBottom: '1px solid rgba(37,40,54,0.6)', cursor: 'pointer' }}
                      onClick={() => setSelected(selected?.id === u.id ? null : u)}
                    >
                      <td style={{ padding: '14px 18px', fontSize: 13, fontWeight: 600 }}>{u.full_name || cl?.full_name || '-'}</td>
                      {tab === 'distribuidores' && (
                        <td style={{ padding: '14px 18px', fontSize: 12 }}>{cl?.razon_social || '-'}</td>
                      )}
                      {tab === 'distribuidores' && (
                        <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text3)' }}>{cl?.cuit || '-'}</td>
                      )}
                      <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text3)' }}>{u.email || cl?.email || '-'}</td>
                      <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text3)' }}>{u.telefono || cl?.telefono || '-'}</td>
                      {tab === 'clientes' && (
                        <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text3)' }}>{cl?.localidad || '-'}</td>
                      )}
                      {tab === 'clientes' && (
                        <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text3)' }}>{cl?.provincia || '-'}</td>
                      )}
                      {tab === 'distribuidores' && (
                        <td style={{ padding: '14px 18px', fontSize: 12 }}>
                          {cl?.client_code ? (
                            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#ffd166', background: 'rgba(255,209,102,0.1)', padding: '2px 8px', borderRadius: 6 }}>{cl.client_code}</span>
                          ) : <span style={{ color: 'var(--text3)' }}>—</span>}
                        </td>
                      )}
                      <td style={{ padding: '14px 18px', fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                        {createdAt ? formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: es }) : '-'}
                      </td>
                    </tr>
                    {selected?.id === u.id && (
                      <tr key={`detail-${u.id}`}>
                        <td colSpan={tab === 'distribuidores' ? 7 : 6} style={{ padding: '0 18px 18px' }}>
                          <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 24px' }}>
                            {[
                              { label: 'ID Usuario', val: u.id },
                              { label: 'Email', val: u.email || cl?.email },
                              { label: 'Teléfono', val: u.telefono || cl?.telefono },
                              { label: 'Dirección', val: cl?.direccion },
                              { label: 'Localidad', val: cl?.localidad },
                              { label: 'Provincia', val: cl?.provincia },
                              { label: 'Código Postal', val: cl?.codigo_postal },
                              { label: 'Razón Social', val: cl?.razon_social },
                              { label: 'CUIT', val: cl?.cuit },
                              { label: 'Código Cliente', val: cl?.client_code },
                            ].filter(f => f.val).map(f => (
                              <div key={f.label}>
                                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.6px' }}>{f.label}</div>
                                <div style={{ fontSize: 13, wordBreak: 'break-all' }}>{f.val}</div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding: '10px 18px', fontSize: 12, color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>
            {listaActual.length} resultado{listaActual.length !== 1 ? 's' : ''}{busqueda ? ` para "${busqueda}"` : ''}
          </div>
        </div>
      )}
    </div>
  )
}
