import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

export default function AdminTecnicos() {
  const { isAdmin, isAdmin2 } = useAuth()
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState([])

  useEffect(() => {
    if (isAdmin || isAdmin2) cargar()
  }, [isAdmin, isAdmin2])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, razon_social, telefono, localidad, provincia, created_at')
      .eq('user_type', 'tecnico')
      .order('created_at', { ascending: false })
    if (error) toast.error('Error al cargar')
    else setTecnicos(data || [])
    setLoading(false)
  }

  async function eliminar(id, nombre) {
    if (!window.confirm(`¿Eliminar a ${nombre}?`)) return
    const { error } = await supabase.from('profiles').delete().eq('id', id)
    if (error) toast.error('Error al eliminar')
    else { toast.success('Eliminado'); setTecnicos(prev => prev.filter(t => t.id !== id)) }
  }

  const filtrados = tecnicos.filter(t => {
    const q = busqueda.toLowerCase()
    return !q || (t.full_name || '').toLowerCase().includes(q) || (t.email || '').toLowerCase().includes(q) || (t.razon_social || '').toLowerCase().includes(q)
  })

  if (!isAdmin && !isAdmin2) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Servicios Técnicos</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Usuarios registrados como servicio técnico</p>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 13, color: 'var(--text3)' }}>
          {filtrados.length} servicio{filtrados.length !== 1 ? 's' : ''} técnico{filtrados.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, empresa o email..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{ width: '100%', maxWidth: 420, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 14px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner /></div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)', fontSize: 14 }}>
          {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay servicios técnicos registrados'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtrados.map(t => (
            <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🔧</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{t.razon_social || t.full_name || 'Sin nombre'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>{t.email}</span>
                    {t.telefono && <span>📞 {t.telefono}</span>}
                    {(t.localidad || t.provincia) && <span>📍 {[t.localidad, t.provincia].filter(Boolean).join(', ')}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    Registrado: {new Date(t.created_at).toLocaleDateString('es-AR')}
                  </div>
                </div>
              </div>
              <button
                onClick={() => eliminar(t.id, t.razon_social || t.full_name || t.email)}
                style={{ background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', color: '#ff5577', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
