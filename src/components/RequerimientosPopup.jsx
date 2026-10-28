import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

// Pop-up que le aparece al destinatario mientras tenga requerimientos pendientes.
export default function RequerimientosPopup() {
  const { user, profile, isAdmin, isAdmin2, isMantenimiento } = useAuth()
  const interno = isAdmin || isAdmin2 || isMantenimiento
  const miId = user?.id
  const nombreUsuario = profile?.full_name || profile?.razon_social || user?.email || 'Usuario'

  const [pendientes, setPendientes] = useState([])
  const [mostrar, setMostrar] = useState(false)
  const [respAbierto, setRespAbierto] = useState(null)
  const [respTexto, setRespTexto] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    if (!interno || !miId) return
    if (sessionStorage.getItem('req_pendientes_pospuesto')) return
    cargar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interno, miId])

  async function cargar() {
    const { data } = await supabase.from('requerimientos').select('*').neq('estado', 'cumplido').order('created_at', { ascending: false })
    // Pendientes para mí (destinatario) donde la pelota está de mi lado:
    // todavía no escribí nada, o el último mensaje no es mío (el que lo pidió me volvió a escribir).
    const mios = (data || []).filter(r => {
      if (!(Array.isArray(r.destinatarios) && r.destinatarios.some(d => d.id === miId))) return false
      const msgs = Array.isArray(r.mensajes) ? r.mensajes : []
      const ultimo = msgs[msgs.length - 1]
      const yaRespondi = !!r.respuesta || msgs.some(m => m.autor_id === miId)
      return !yaRespondi || (ultimo && ultimo.autor_id && ultimo.autor_id !== miId)
    })
    setPendientes(mios)
    setMostrar(mios.length > 0)
  }

  // El destinatario responde (agrega mensaje al hilo). NO marca cumplido (eso lo hace quien lo pidió).
  async function responder(r) {
    const txt = respTexto.trim()
    if (!txt) return
    setProcesando(true)
    const msg = { autor: nombreUsuario, autor_id: miId, texto: txt, fecha: new Date().toISOString() }
    const mensajes = [...(Array.isArray(r.mensajes) ? r.mensajes : []), msg]
    const { error } = await supabase.from('requerimientos').update({ mensajes, updated_at: new Date().toISOString() }).eq('id', r.id)
    setProcesando(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Respuesta enviada ✅')
    const resto = pendientes.filter(x => x.id !== r.id)
    setPendientes(resto)
    setRespAbierto(null); setRespTexto('')
    if (resto.length === 0) setMostrar(false)
  }

  function posponer() {
    sessionStorage.setItem('req_pendientes_pospuesto', '1')
    setMostrar(false)
  }

  if (!mostrar || pendientes.length === 0) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '22px 24px 10px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)' }}>📋 Tenés {pendientes.length} requerimiento{pendientes.length !== 1 ? 's' : ''} pendiente{pendientes.length !== 1 ? 's' : ''}</div>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>Respondé acá o más tarde desde el menú <b style={{ color: 'var(--text2)' }}>Requerimientos</b>. Vuelve a aparecer hasta que respondas. Quien lo pidió lo da por cumplido.</p>
        </div>
        <div style={{ padding: '4px 24px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pendientes.map(r => { const msgs = Array.isArray(r.mensajes) ? r.mensajes : []; const ult = msgs[msgs.length - 1]; return (
            <div key={r.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>{r.titulo}</div>
              {r.detalle && <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{r.detalle}</div>}
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>De: {r.created_by || '—'}</div>
              {ult && ult.autor_id !== miId && (
                <div style={{ marginTop: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#7b9fff', textTransform: 'uppercase', marginBottom: 3 }}>Último mensaje · {ult.autor || '—'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', whiteSpace: 'pre-wrap' }}>{ult.texto}</div>
                </div>
              )}

              {respAbierto === r.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                  <textarea value={respTexto} onChange={e => setRespTexto(e.target.value)} rows={2} placeholder="Tu respuesta (ej: 12 conformes, 3 no conformes)…" autoFocus
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 12px', color: 'var(--text)', fontSize: 13, fontFamily: 'var(--font)', outline: 'none', resize: 'vertical' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => responder(r)} disabled={procesando} style={{ background: 'rgba(123,159,255,0.14)', color: '#7b9fff', border: '1px solid rgba(123,159,255,0.4)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>➤ Enviar respuesta</button>
                    <button onClick={() => { setRespAbierto(null); setRespTexto('') }} style={{ background: 'var(--surface)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font)' }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                  <button onClick={() => { setRespAbierto(r.id); setRespTexto('') }} style={{ background: 'rgba(123,159,255,0.12)', color: '#7b9fff', border: '1px solid rgba(123,159,255,0.4)', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}>✍️ Responder</button>
                </div>
              )}
            </div>
          ) })}
        </div>
        <div style={{ padding: '10px 24px 22px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={posponer} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>Más tarde</button>
        </div>
      </div>
    </div>
  )
}
