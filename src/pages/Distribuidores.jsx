import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

const CATEGORIAS = [
  { key: 'calefones_calderas',   label: 'Calefones / Calderas' },
  { key: 'paneles_calefactores', label: 'Paneles Calefactores' },
  { key: 'anafes',               label: 'Anafes' },
]

export default function Distribuidores() {
  const { isAdmin } = useAuth()
  const [distribuidores, setDistribuidores] = useState([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState(null)      // id del distribuidor en edición
  const [descuentos, setDescuentos] = useState({})    // { calefones_calderas: '', paneles_calefactores: '', anafes: '' }
  const [guardando, setGuardando] = useState(false)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => {
    if (isAdmin) cargar()
  }, [isAdmin])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, razon_social, cuit, localidad, provincia, telefono, descuentos, created_at')
      .eq('user_type', 'distributor')
      .order('created_at', { ascending: false })
    if (error) toast.error('Error al cargar distribuidores')
    else setDistribuidores(data || [])
    setLoading(false)
  }

  function abrirEdicion(dist) {
    const d = dist.descuentos || {}
    setDescuentos({
      calefones_calderas:   d.calefones_calderas   ?? '',
      paneles_calefactores: d.paneles_calefactores ?? '',
      anafes:               d.anafes               ?? '',
    })
    setEditando(dist.id)
  }

  function cerrarEdicion() {
    setEditando(null)
    setDescuentos({})
  }

  async function guardarDescuentos(distId) {
    setGuardando(true)
    const payload = {}
    CATEGORIAS.forEach(({ key }) => {
      const val = descuentos[key]
      payload[key] = val === '' ? 0 : Number(val)
    })
    const { error } = await supabase
      .from('profiles')
      .update({ descuentos: payload })
      .eq('id', distId)
    if (error) {
      toast.error('Error al guardar')
    } else {
      toast.success('Descuentos guardados')
      setDistribuidores(prev => prev.map(d => d.id === distId ? { ...d, descuentos: payload } : d))
      cerrarEdicion()
    }
    setGuardando(false)
  }

  const filtrados = distribuidores.filter(d => {
    const q = busqueda.toLowerCase()
    return !q || (d.razon_social || '').toLowerCase().includes(q) || (d.email || '').toLowerCase().includes(q) || (d.full_name || '').toLowerCase().includes(q)
  })

  if (!isAdmin) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Distribuidores</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Gestioná los descuentos por categoría de cada distribuidor</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, color: 'var(--text3)' }}>
          {filtrados.length} distribuidor{filtrados.length !== 1 ? 'es' : ''}
        </div>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="🔍 Buscar por razón social, email o nombre..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 14px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>
          {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay distribuidores registrados'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtrados.map(dist => (
            <div key={dist.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

              {/* Info del distribuidor */}
              <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,209,102,0.15)', border: '1px solid rgba(255,209,102,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                    🏪
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{dist.razon_social || dist.full_name || 'Sin nombre'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>
                      {dist.email}
                      {dist.cuit && <span style={{ marginLeft: 10 }}>CUIT: {dist.cuit}</span>}
                      {(dist.localidad || dist.provincia) && <span style={{ marginLeft: 10 }}>{[dist.localidad, dist.provincia].filter(Boolean).join(', ')}</span>}
                    </div>
                  </div>
                </div>

                {/* Descuentos actuales */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  {CATEGORIAS.map(({ key, label }) => {
                    const val = dist.descuentos?.[key]
                    if (!val) return null
                    return (
                      <span key={key} style={{ background: 'rgba(61,214,140,0.1)', border: '1px solid rgba(61,214,140,0.3)', color: 'var(--green)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                        {label}: {val}%
                      </span>
                    )
                  })}
                  <button
                    onClick={() => editando === dist.id ? cerrarEdicion() : abrirEdicion(dist)}
                    style={{ background: editando === dist.id ? 'var(--surface3)' : 'rgba(74,108,247,0.1)', border: `1px solid ${editando === dist.id ? 'var(--border)' : 'rgba(74,108,247,0.35)'}`, color: editando === dist.id ? 'var(--text2)' : '#7b9fff', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {editando === dist.id ? 'Cancelar' : '✏️ Editar descuentos'}
                  </button>
                </div>
              </div>

              {/* Panel edición */}
              {editando === dist.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '18px 22px', background: 'rgba(74,108,247,0.04)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>
                    Descuentos por categoría (%)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 16 }}>
                    {CATEGORIAS.map(({ key, label }) => (
                      <div key={key}>
                        <label style={{ fontSize: 11, color: 'var(--text3)', display: 'block', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                          {label}
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={descuentos[key]}
                            onChange={e => setDescuentos(prev => ({ ...prev, [key]: e.target.value }))}
                            placeholder="0"
                            style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 12px', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'var(--font)' }}
                          />
                          <span style={{ color: 'var(--text3)', fontSize: 14, fontWeight: 600 }}>%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => guardarDescuentos(dist.id)}
                      disabled={guardando}
                      style={{ background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.6 : 1, fontFamily: 'var(--font)' }}
                    >
                      {guardando ? 'Guardando...' : '💾 Guardar'}
                    </button>
                    <button
                      onClick={cerrarEdicion}
                      style={{ background: 'var(--surface3)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
