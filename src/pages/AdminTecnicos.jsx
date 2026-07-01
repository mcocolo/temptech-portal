import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { Spinner } from '@/components/ui'
import toast from 'react-hot-toast'

const inputSt = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)',
  fontSize: 13, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box',
}

function ZonaSelector({ value, onChange }) {
  const [input, setInput] = useState('')
  const tags = value ? value.split(',').map(s => s.trim()).filter(Boolean) : []

  function addTag(raw) {
    const tag = raw.trim()
    if (!tag || tags.includes(tag)) { setInput(''); return }
    onChange([...tags, tag].join(', '))
    setInput('')
  }

  function removeTag(tag) {
    onChange(tags.filter(t => t !== tag).join(', '))
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', minHeight: 42, cursor: 'text' }}
      onClick={e => e.currentTarget.querySelector('input')?.focus()}
    >
      {tags.map(tag => (
        <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.4)', color: '#2dd4bf', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {tag}
          <button type="button" onClick={() => removeTag(tag)} style={{ background: 'none', border: 'none', color: '#2dd4bf', cursor: 'pointer', fontSize: 15, lineHeight: 1, padding: 0, display: 'flex', alignItems: 'center' }}>×</button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input.trim() && addTag(input)}
        placeholder={tags.length === 0 ? 'Ej: Lanús, Quilmes, GBA Sur… (Enter para agregar)' : ''}
        style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', minWidth: 180, flex: 1 }}
      />
    </div>
  )
}

export default function AdminTecnicos() {
  const { isAdmin, isAdmin2 } = useAuth()
  const [tecnicos, setTecnicos] = useState([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (isAdmin || isAdmin2) cargar()
  }, [isAdmin, isAdmin2])

  async function cargar() {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, razon_social, telefono, localidad, provincia, domicilio, zona_cobertura, created_at')
      .eq('user_type', 'tecnico')
      .order('created_at', { ascending: false })
    if (error) toast.error('Error al cargar')
    else setTecnicos(data || [])
    setLoading(false)
  }

  function abrirEdicion(t) {
    const desc = t.descuentos || {}
    setEditForm({
      full_name: t.full_name || '', razon_social: t.razon_social || '', email: t.email || '',
      telefono: t.telefono || '', localidad: t.localidad || '', provincia: t.provincia || '',
      domicilio: t.domicilio || '', zona_cobertura: t.zona_cobertura || '',
      dto_calefones: Array.isArray(desc.calefones_calderas) ? desc.calefones_calderas[0] ?? '' : (desc.calefones_calderas || ''),
      dto_paneles:   Array.isArray(desc.paneles_calefactores) ? desc.paneles_calefactores[0] ?? '' : (desc.paneles_calefactores || ''),
      dto_anafes:    Array.isArray(desc.anafes) ? desc.anafes[0] ?? '' : (desc.anafes || ''),
    })
    setEditando(t.id)
  }

  async function guardar(id) {
    setGuardando(true)
    const toNum = v => parseFloat(v) || 0
    const descuentos = {
      calefones_calderas:   toNum(editForm.dto_calefones) || 0,
      paneles_calefactores: toNum(editForm.dto_paneles)   || 0,
      anafes:               toNum(editForm.dto_anafes)    || 0,
    }
    const { error } = await supabase.from('profiles').update({
      full_name: editForm.full_name.trim() || null,
      razon_social: editForm.razon_social.trim() || null,
      telefono: editForm.telefono.trim() || null,
      localidad: editForm.localidad.trim() || null,
      provincia: editForm.provincia.trim() || null,
      email: editForm.email.trim() || null,
      domicilio: editForm.domicilio.trim() || null,
      zona_cobertura: editForm.zona_cobertura.trim() || null,
      descuentos,
    }).eq('id', id)
    if (error) {
      toast.error('Error al guardar')
    } else {
      toast.success('Datos guardados ✅')
      setTecnicos(prev => prev.map(t => t.id === id ? { ...t, ...editForm } : t))
      setEditando(null)
    }
    setGuardando(false)
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
            <div key={t.id} style={{ background: 'var(--surface)', border: `1px solid ${editando === t.id ? 'rgba(45,212,191,0.4)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'border-color .2s' }}>

              {/* Info */}
              <div style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🔧</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{t.razon_social || t.full_name || 'Sin nombre'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span>{t.email}</span>
                      {t.telefono && (
                        <a href={`https://wa.me/54${t.telefono.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                          style={{ color: '#25d366', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.532 5.856L0 24l6.293-1.504A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.793 9.793 0 01-5.001-1.371l-.36-.214-3.733.892.936-3.63-.235-.374A9.786 9.786 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/></svg>
                          {t.telefono}
                        </a>
                      )}
                      {(t.localidad || t.provincia) && <span>📍 {[t.localidad, t.provincia].filter(Boolean).join(', ')}</span>}
                      {t.domicilio && <span>🏠 {t.domicilio}</span>}
                    </div>
                    {t.zona_cobertura && (
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {t.zona_cobertura.split(',').map(z => z.trim()).filter(Boolean).map(z => (
                          <span key={z} style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)', color: '#2dd4bf' }}>
                            🗺️ {z}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                      Registrado: {new Date(t.created_at).toLocaleDateString('es-AR')}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => editando === t.id ? setEditando(null) : abrirEdicion(t)}
                    style={{ background: editando === t.id ? 'var(--surface3)' : 'rgba(45,212,191,0.1)', border: `1px solid ${editando === t.id ? 'var(--border)' : 'rgba(45,212,191,0.35)'}`, color: editando === t.id ? 'var(--text2)' : '#2dd4bf', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    {editando === t.id ? 'Cancelar' : '✏️ Editar'}
                  </button>
                  <button
                    onClick={() => eliminar(t.id, t.razon_social || t.full_name || t.email)}
                    style={{ background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', color: '#ff5577', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {/* Panel edición */}
              {editando === t.id && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '20px 22px', background: 'rgba(45,212,191,0.03)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Nombre</label>
                      <input value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Nombre completo" style={inputSt} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Razón social / Empresa</label>
                      <input value={editForm.razon_social} onChange={e => setEditForm(p => ({ ...p, razon_social: e.target.value }))} placeholder="Ej: Giga Service" style={inputSt} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Email</label>
                      <input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} placeholder="correo@ejemplo.com" type="email" style={inputSt} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Teléfono</label>
                      <input value={editForm.telefono} onChange={e => setEditForm(p => ({ ...p, telefono: e.target.value }))} placeholder="+54 11 1234-5678" style={inputSt} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Localidad</label>
                      <input value={editForm.localidad} onChange={e => setEditForm(p => ({ ...p, localidad: e.target.value }))} placeholder="Ej: Lanus Oeste" style={inputSt} />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Provincia</label>
                      <input value={editForm.provincia} onChange={e => setEditForm(p => ({ ...p, provincia: e.target.value }))} placeholder="Ej: Buenos Aires" style={inputSt} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 5 }}>Dirección</label>
                      <input value={editForm.domicilio} onChange={e => setEditForm(p => ({ ...p, domicilio: e.target.value }))} placeholder="Ej: Av. Corrientes 1234, CABA" style={inputSt} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>🗺️ Zona de cobertura</label>
                      <ZonaSelector value={editForm.zona_cobertura} onChange={val => setEditForm(p => ({ ...p, zona_cobertura: val }))} />
                    </div>
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#ffd166', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>🏷️ Descuentos en productos</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        {[
                          { label: 'Calefones / Calderas', key: 'dto_calefones' },
                          { label: 'Paneles Calefactores', key: 'dto_paneles' },
                          { label: 'Anafes',               key: 'dto_anafes' },
                        ].map(({ label, key }) => (
                          <div key={key}>
                            <label style={{ fontSize: 10, fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{label}</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input type="number" min="0" max="100" step="0.1" value={editForm[key]} onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))} placeholder="0" style={{ ...inputSt, width: 80, textAlign: 'center' }} />
                              <span style={{ color: 'var(--text3)', fontSize: 13 }}>%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => guardar(t.id)}
                      disabled={guardando}
                      style={{ background: 'rgba(45,212,191,0.12)', color: '#2dd4bf', border: '1px solid rgba(45,212,191,0.35)', borderRadius: 'var(--radius)', padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.6 : 1, fontFamily: 'var(--font)' }}
                    >
                      {guardando ? 'Guardando...' : '💾 Guardar'}
                    </button>
                    <button onClick={() => setEditando(null)} style={{ background: 'var(--surface3)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
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
