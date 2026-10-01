import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

// Editor central de medidas objetivo de Corte y Encuadre. Solo superadmin edita.
// Se guardan en la tabla medidas_encuadre (clave/valor); CorteOT y EncuadreOT las leen de ahí.
const GRUPOS = [
  {
    titulo: '🔪 Corte', color: '#7b9fff', campos: [
      { clave: 'corte_250w', label: '250w', def: '290x590mm' },
      { clave: 'corte_500w', label: '500w', def: '590x590mm' },
      { clave: 'corte_1400w_t', label: '1400w Tapa', def: '560x560mm' },
      { clave: 'corte_1400w_ct', label: '1400w Contratapa', def: '558x558mm' },
    ],
  },
  {
    titulo: '📐 Encuadre', color: '#3dd68c', campos: [
      { clave: '250w', label: '250w', def: '290x590 mm' },
      { clave: '500w', label: '500w', def: '590x590 mm' },
      { clave: '1400w_tapa', label: '1400w Tapa', def: '560x560 mm' },
      { clave: '1400w_contratapa', label: '1400w Contratapa', def: '558x558 mm' },
    ],
  },
]

const iSt = { width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }

export default function MedidasModal({ puedeEditar, onClose }) {
  const [valores, setValores] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])
  async function cargar() {
    setLoading(true)
    const { data } = await supabase.from('medidas_encuadre').select('clave,valor')
    setValores(Object.fromEntries((data || []).map(r => [r.clave, r.valor])))
    setLoading(false)
  }
  async function guardar(clave, valor) {
    const v = (valor || '').trim()
    const { error } = await supabase.from('medidas_encuadre').upsert({ clave, valor: v || null, updated_at: new Date().toISOString() }, { onConflict: 'clave' })
    if (error) { toast.error('Error: ' + error.message); return }
    setValores(prev => ({ ...prev, [clave]: v }))
    toast.success('Medida guardada ✅')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 800 }}>📐 Medidas de Corte y Encuadre</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 22 }}>×</button>
        </div>
        <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {!puedeEditar && <div style={{ fontSize: 12, color: '#fb923c', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: 8, padding: '8px 12px' }}>Solo lectura. Las medidas las edita el superadmin.</div>}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text3)' }}>Cargando…</div>
          ) : GRUPOS.map(g => (
            <div key={g.titulo}>
              <div style={{ fontSize: 12, fontWeight: 800, color: g.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>{g.titulo}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {g.campos.map(c => (
                  <div key={c.clave}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', display: 'block', marginBottom: 5 }}>{c.label}</label>
                    {puedeEditar
                      ? <input defaultValue={valores[c.clave] ?? c.def} key={c.clave + (valores[c.clave] ?? '')} onBlur={e => { const v = e.target.value.trim(); if (v !== (valores[c.clave] ?? c.def)) guardar(c.clave, v) }} placeholder={c.def} style={iSt} />
                      : <div style={{ ...iSt, color: '#3dd68c', fontWeight: 700 }}>{valores[c.clave] ?? c.def}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {puedeEditar && <div style={{ fontSize: 11, color: 'var(--text3)' }}>Se guardan al salir de cada campo y quedan para todos. Las usan las OT de Corte y Encuadre como medida objetivo.</div>}
        </div>
      </div>
    </div>
  )
}
