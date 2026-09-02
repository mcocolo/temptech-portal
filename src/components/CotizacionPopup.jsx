import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

// Solo el admin principal carga la cotización del dólar.
const ADMIN_PRINCIPAL_EMAIL = 'martin@temptech.com.ar'

export default function CotizacionPopup() {
  const { user, isAdmin } = useAuth()
  const [mostrar, setMostrar] = useState(false)
  const [valor, setValor] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [ultima, setUltima] = useState(null)

  const esAdminPrincipal = isAdmin && user?.email === ADMIN_PRINCIPAL_EMAIL

  useEffect(() => {
    if (!esAdminPrincipal) return
    if (sessionStorage.getItem('cotizacion_pospuesta')) return
    supabase.from('cotizaciones').select('fecha, valor').order('fecha', { ascending: false }).limit(1)
      .then(({ data }) => {
        const last = data?.[0]
        setUltima(last || null)
        if (!last) { setMostrar(true); return }
        // Lunes (00:00) de la semana que contiene una fecha
        const lunesTime = (dateObj) => {
          const dt = new Date(dateObj)
          const day = dt.getDay()
          const diff = day === 0 ? -6 : 1 - day
          dt.setDate(dt.getDate() + diff)
          dt.setHours(0, 0, 0, 0)
          return dt.getTime()
        }
        // Mostrar si la última cotización es de una semana anterior a la actual
        const semanaUltima = lunesTime(new Date(last.fecha + 'T12:00:00'))
        const semanaHoy = lunesTime(new Date())
        if (semanaUltima < semanaHoy) setMostrar(true)
      })
  }, [esAdminPrincipal])

  async function guardar() {
    const v = parseFloat(String(valor).replace(',', '.'))
    if (!v || v <= 0) { toast.error('Ingresá un valor válido'); return }
    setGuardando(true)
    const { error } = await supabase.from('cotizaciones').insert({ valor: v, created_by: user?.email || null })
    setGuardando(false)
    if (error) { toast.error('Error al guardar: ' + error.message); return }
    toast.success('Cotización guardada ✅')
    setMostrar(false)
  }

  function posponer() {
    sessionStorage.setItem('cotizacion_pospuesta', '1')
    setMostrar(false)
  }

  if (!mostrar) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 28, width: '100%', maxWidth: 420 }}>
        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: 6 }}>💵 Cotización del dólar</div>
        <p style={{ color: 'var(--text3)', fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
          Cargá el valor del dólar de esta semana. Queda registrado con la fecha de hoy para los reportes.
          {ultima && <><br />Última cargada: <b style={{ color: 'var(--text2)' }}>${Number(ultima.valor).toLocaleString('es-AR')}</b> el {new Date(ultima.fecha + 'T00:00:00').toLocaleDateString('es-AR')}.</>}
        </p>
        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 6 }}>Valor del dólar (ARS)</label>
        <input autoFocus type="number" value={valor} onChange={e => setValor(e.target.value)} placeholder="Ej: 1350"
          onKeyDown={e => e.key === 'Enter' && guardar()}
          style={{ width: '100%', boxSizing: 'border-box', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 12px', color: 'var(--text)', fontSize: 15, fontWeight: 700, outline: 'none', fontFamily: 'var(--font)', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={guardar} disabled={guardando} style={{ flex: 1, background: 'var(--brand-gradient)', color: '#fff', border: 'none', borderRadius: 'var(--radius)', padding: '11px', fontSize: 14, fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
            {guardando ? 'Guardando...' : 'Guardar cotización'}
          </button>
          <button onClick={posponer} style={{ background: 'var(--surface2)', color: 'var(--text3)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '11px 16px', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Más tarde
          </button>
        </div>
      </div>
    </div>
  )
}
