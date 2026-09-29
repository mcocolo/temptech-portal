// Muestra el uso de una máquina/herramental separado por etapa: Cortes (250/500/1400 T/CT), Encuadre (250/500) y Alambre (250/500/1400)
const chip = (label, val, color) => <span key={label} style={{ fontSize: 11, fontWeight: 700, color, background: `${color}1a`, border: `1px solid ${color}55`, borderRadius: 4, padding: '1px 7px' }}>{label}: {val}</span>

export default function UsosEtapa({ row, sectores = [], compact }) {
  const secs = Array.isArray(sectores) ? sectores : []
  const tieneCorte = secs.includes('Corte')
  const tieneEncuadre = secs.includes('Encuadre')
  const c = { c250: row.usos_corte_250w || 0, c500: row.usos_corte_500w || 0, ct: row.usos_corte_1400w_t || 0, cct: row.usos_corte_1400w_ct || 0 }
  const e = { e250: row.usos_encuadre_250w || 0, e500: row.usos_encuadre_500w || 0 }
  const totC = c.c250 + c.c500 + c.ct + c.cct
  const totE = e.e250 + e.e500
  const showC = tieneCorte || totC > 0
  const showE = tieneEncuadre || totE > 0
  if (!showC && !showE) return null
  const linea = (icon, label, color, chips, tot) => (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: 10, fontWeight: 800, color, minWidth: compact ? 0 : 62 }}>{icon} {label}</span>
      {chips}
      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 7px' }}>Total {tot}</span>
    </div>
  )
  return (
    <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 5 }}>
      {showC && linea('🔪', 'CORTES', '#7b9fff', [chip('250w', c.c250, '#7b9fff'), chip('500w', c.c500, '#3dd68c'), chip('1400w T', c.ct, '#fb923c'), chip('1400w CT', c.cct, '#fb923c')], totC)}
      {showE && linea('📐', 'ENCUADRE', '#3dd68c', [chip('250w', e.e250, '#7b9fff'), chip('500w', e.e500, '#3dd68c')], totE)}
    </div>
  )
}
