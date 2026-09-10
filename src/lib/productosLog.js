// Productos que se manejan en la planilla de logística (columnas de la hoja de ruta).
// El código coincide con `precios.codigo`, lo que permite mapear un caso de
// garantía (que guarda nombre + modelo) a la columna correcta.
export const PRODUCTOS_LOG = [
  { codigo: 'C250STV1',    label: '250w' },
  { codigo: 'C250STV1TS',  label: 'B250' },
  { codigo: 'C250STV1TD',  label: '250 TD' },
  { codigo: 'C500STV1',    label: '500w' },
  { codigo: 'C500STV1TS',  label: 'B500w' },
  { codigo: 'C500STV1TD',  label: '500 TD' },
  { codigo: 'F1400BCO',    label: '1400w' },
  { codigo: 'KF70SIL',     label: 'KF70' },
  { codigo: 'FE150TBL',    label: 'FE150BI' },
  { codigo: 'FE150TBLACK', label: 'E150BLAC' },
  { codigo: 'FE150TSIL',   label: 'FE150SIL' },
  { codigo: 'FM318BL',     label: 'FM318' },
  { codigo: 'FM324BL',     label: 'FM324' },
  { codigo: 'BF14EBL',     label: 'BF14' },
  { codigo: 'BF323EBL',    label: 'BF23' },
]

export function itemLogPorCodigo(codigo) {
  return PRODUCTOS_LOG.find(p => p.codigo === codigo) || null
}

// Resuelve a qué COLUMNA de la planilla pertenece un código de precios.
// Una columna agrupa varios modelos (ej. 1400w = todas las terminaciones Firenze;
// el modelo puntual lo ve el chofer en el detalle).
export function codigoALogColumna(codigo) {
  if (!codigo) return null
  const c = String(codigo).toUpperCase().trim()
  // Paneles 1400w Firenze (todas las terminaciones) → columna 1400w
  if (c.startsWith('F1400')) return 'F1400BCO'
  // Slim 250w: toallero doble → 250 TD; toallero simple → B250; resto → 250w
  if (c.startsWith('C250')) return c.includes('TD') ? 'C250STV1TD' : c.includes('TS') ? 'C250STV1TS' : 'C250STV1'
  // Slim 500w: toallero doble → 500 TD; toallero simple → B500; resto (incluye Madera Blanca) → 500w
  if (c.startsWith('C500')) return c.includes('TD') ? 'C500STV1TD' : c.includes('TS') ? 'C500STV1TS' : 'C500STV1'
  // Resto: match exacto si la columna existe
  return PRODUCTOS_LOG.some(p => p.codigo === c) ? c : null
}

// Infiere la columna a partir de un texto libre (nombre/modelo/detalle del caso).
// Fallback para paradas que no tienen el producto cargado (ej. garantías viejas).
export function textoALogColumna(text) {
  if (!text) return null
  const t = String(text).toLowerCase()
  const td = t.includes('doble')
  const ts = !td && t.includes('toallero')
  if (t.includes('1400')) return 'F1400BCO'
  if (t.includes('500')) return td ? 'C500STV1TD' : ts ? 'C500STV1TS' : 'C500STV1'
  if (t.includes('250')) return td ? 'C250STV1TD' : ts ? 'C250STV1TS' : 'C250STV1'
  return null
}
