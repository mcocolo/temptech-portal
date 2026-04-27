import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { User, MapPin, Clock, Phone, UserCheck, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

const inputSt = {
  width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
  borderRadius: 'var(--radius)', padding: '10px 14px', color: 'var(--text)',
  fontSize: 14, outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box',
}

const labelSt = {
  fontSize: 11, fontWeight: 700, color: 'var(--text3)',
  textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 6,
}

function Field({ label, icon: Icon, children }) {
  return (
    <div>
      <label style={labelSt}>
        {Icon && <Icon size={11} style={{ marginRight: 5, verticalAlign: 'middle' }} />}
        {label}
      </label>
      {children}
    </div>
  )
}

export default function PerfilDistribuidor() {
  const { user, profile, isDistributor } = useAuth()
  const cl = profile?.clientes

  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    full_name:         '',
    telefono:          '',
    direccion_entrega: '',
    horario_entrega:   '',
    persona_contacto:  '',
  })
  const [dirsAlt, setDirsAlt] = useState([{ nombre: '', direccion: '', localidad: '' }])

  useEffect(() => {
    if (!profile) return
    setForm({
      full_name:         profile.full_name || cl?.full_name || '',
      telefono:          profile.telefono  || cl?.telefono  || '',
      direccion_entrega: cl?.direccion_entrega || cl?.direccion || '',
      horario_entrega:   cl?.horario_entrega || '',
      persona_contacto:  cl?.persona_contacto || '',
    })
    const dirs = profile.direcciones_entrega
    setDirsAlt(
      dirs && dirs.length > 0
        ? dirs.map(d => ({ nombre: d.nombre || '', direccion: d.direccion || '', localidad: d.localidad || '' }))
        : [{ nombre: '', direccion: '', localidad: '' }]
    )
  }, [profile])

  if (!isDistributor) return null

  function setF(key, val) { setForm(prev => ({ ...prev, [key]: val })) }

  function updateDir(i, key, val) {
    setDirsAlt(prev => prev.map((d, idx) => idx === i ? { ...d, [key]: val } : d))
  }

  function addDir() {
    if (dirsAlt.length >= 3) return toast.error('Máximo 3 direcciones alternativas')
    setDirsAlt(prev => [...prev, { nombre: '', direccion: '', localidad: '' }])
  }

  function removeDir(i) {
    setDirsAlt(prev => prev.filter((_, idx) => idx !== i))
  }

  async function guardar() {
    setGuardando(true)
    const dirsClean = dirsAlt.filter(d => d.direccion.trim())

    const { error: errP } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name || null, telefono: form.telefono || null, direcciones_entrega: dirsClean })
      .eq('id', user.id)

    if (errP) { toast.error('Error al guardar: ' + errP.message); setGuardando(false); return }

    if (cl?.id) {
      const { error: errCl } = await supabase
        .from('clientes')
        .update({
          full_name:         form.full_name         || null,
          telefono:          form.telefono           || null,
          direccion_entrega: form.direccion_entrega  || null,
          horario_entrega:   form.horario_entrega    || null,
          persona_contacto:  form.persona_contacto   || null,
        })
        .eq('id', cl.id)
      if (errCl) { toast.error('Error al guardar datos de entrega: ' + errCl.message); setGuardando(false); return }
    }

    toast.success('Perfil actualizado ✅')
    setGuardando(false)
  }

  const razonSocial = cl?.razon_social

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '28px 16px' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(74,108,247,0.15)', border: '1px solid rgba(74,108,247,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={20} color="#7b9fff" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 20, fontFamily: 'var(--font-display)' }}>
              {form.full_name || 'Mi Perfil'}
            </div>
            {razonSocial && <div style={{ fontSize: 13, color: '#ffd166', fontWeight: 600 }}>{razonSocial}</div>}
            <div style={{ fontSize: 12, color: 'var(--text3)' }}>{user?.email}</div>
          </div>
        </div>
      </div>

      {/* Card datos generales */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(74,108,247,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={14} color="#7b9fff" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#7b9fff' }}>Datos Generales</span>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Field label="Nombre / Razón Comercial" icon={User}>
            <input
              style={inputSt}
              value={form.full_name}
              onChange={e => setF('full_name', e.target.value)}
              placeholder="Nombre completo o razón social"
            />
          </Field>

          <Field label="Teléfono" icon={Phone}>
            <input
              style={inputSt}
              value={form.telefono}
              onChange={e => setF('telefono', e.target.value)}
              placeholder="+54 11 1234-5678"
              type="tel"
            />
          </Field>

          <Field label="Persona Responsable" icon={UserCheck}>
            <input
              style={inputSt}
              value={form.persona_contacto}
              onChange={e => setF('persona_contacto', e.target.value)}
              placeholder="Nombre de quien recibe o es responsable"
            />
          </Field>

        </div>
      </div>

      {/* Card dirección de entrega */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 16 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(61,214,140,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={14} color="#3dd68c" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#3dd68c' }}>Dirección de Entrega</span>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <Field label="Dirección Principal" icon={MapPin}>
            <input
              style={inputSt}
              value={form.direccion_entrega}
              onChange={e => setF('direccion_entrega', e.target.value)}
              placeholder="Calle, número, piso, depto, localidad"
            />
          </Field>

          <Field label="Horario de Entrega" icon={Clock}>
            <input
              style={inputSt}
              value={form.horario_entrega}
              onChange={e => setF('horario_entrega', e.target.value)}
              placeholder="Ej: Lunes a Viernes de 9 a 17hs"
            />
          </Field>

        </div>
      </div>

      {/* Card direcciones alternativas */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(255,209,102,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={14} color="#ffd166" />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ffd166' }}>Direcciones Alternativas</span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>(máx. 3)</span>
          </div>
          {dirsAlt.length < 3 && (
            <button onClick={addDir} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(255,209,102,0.1)', border: '1px solid rgba(255,209,102,0.3)', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#ffd166', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              <Plus size={12} /> Agregar
            </button>
          )}
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {dirsAlt.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13, padding: '12px 0' }}>
              No hay direcciones alternativas
            </div>
          )}
          {dirsAlt.map((d, i) => (
            <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text3)' }}>Dirección {i + 1}</span>
                <button onClick={() => removeDir(i)} style={{ background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 6, padding: '3px 8px', color: '#ff5577', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <Trash2 size={11} /> Eliminar
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ ...labelSt, fontSize: 10 }}>Nombre / Referencia</label>
                  <input style={inputSt} value={d.nombre} onChange={e => updateDir(i, 'nombre', e.target.value)} placeholder="Ej: Depósito, Sucursal Norte" />
                </div>
                <div>
                  <label style={{ ...labelSt, fontSize: 10 }}>Dirección</label>
                  <input style={inputSt} value={d.direccion} onChange={e => updateDir(i, 'direccion', e.target.value)} placeholder="Calle, número, localidad" />
                </div>
                <div>
                  <label style={{ ...labelSt, fontSize: 10 }}>Localidad / Ciudad</label>
                  <input style={inputSt} value={d.localidad} onChange={e => updateDir(i, 'localidad', e.target.value)} placeholder="Localidad" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Botón guardar */}
      <button
        onClick={guardar}
        disabled={guardando}
        style={{ width: '100%', background: 'linear-gradient(135deg,#4a6cf7,#7b9fff)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '13px', fontSize: 15, fontWeight: 800, cursor: guardando ? 'not-allowed' : 'pointer', opacity: guardando ? 0.7 : 1, fontFamily: 'var(--font)', boxShadow: '0 4px 16px rgba(74,108,247,0.3)' }}
      >
        {guardando ? '⏳ Guardando...' : '💾 Guardar Cambios'}
      </button>

    </div>
  )
}
