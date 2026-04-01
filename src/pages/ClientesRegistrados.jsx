import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner, Empty } from '@/components/ui'
import { Search, Package, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function ClientesRegistrados() {
  const { isAdmin } = useAuth()
  const [datos, setDatos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => { if (isAdmin) load() }, [isAdmin])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('productos_registrados')
      .select('*')
      .order('created_at', { ascending: false })
    setDatos(data || [])
    setLoading(false)
  }

  if (!isAdmin) return null

  const filtrados = datos.filter(d => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return (
      d.nombre_apellido?.toLowerCase().includes(q) ||
      d.email?.toLowerCase().includes(q) ||
      d.producto?.toLowerCase().includes(q)
    )
  })

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Clientes Registrados</h1>
        <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Productos registrados por clientes del portal</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total registros', val: datos.length, color: '#6eb5ff', bg: 'rgba(110,181,255,0.08)' },
          { label: 'Clientes únicos', val: new Set(datos.map(d => d.portal_user_id)).size, color: '#3dd68c', bg: 'rgba(61,214,140,0.08)' },
          { label: 'Este mes', val: datos.filter(d => new Date(d.created_at) > new Date(new Date().setDate(1))).length, color: '#ffd166', bg: 'rgba(255,209,102,0.08)' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 'var(--radius-lg)', padding: '18px 22px', border: `1px solid ${s.color}25` }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: s.color, lineHeight: 1.2 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
        <input
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, email o producto..."
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
      ) : filtrados.length === 0 ? (
        <Empty icon="📦" title="Sin resultados" description={busqueda ? 'No encontramos resultados para tu búsqueda' : 'Todavía no hay productos registrados'} />
      ) : (
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
              {filtrados.map(r => (
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
              ))}
              {/* Detalle expandible */}
              {filtrados.map(r => selected?.id === r.id ? (
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
              ) : null)}
            </tbody>
          </table>
          <div style={{ padding: '10px 18px', fontSize: 12, color: 'var(--text3)', borderTop: '1px solid var(--border)' }}>
            {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}{busqueda ? ` para "${busqueda}"` : ''}
          </div>
        </div>
      )}
    </div>
  )
}
