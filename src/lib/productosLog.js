// Productos que se manejan en la planilla de logística (columnas de la hoja de ruta).
// El código coincide con `precios.codigo`, lo que permite mapear un caso de
// garantía (que guarda nombre + modelo) a la columna correcta.
export const PRODUCTOS_LOG = [
  { codigo: 'C250STV1',    label: '250w' },
  { codigo: 'C250STV1TS',  label: 'B250' },
  { codigo: 'C500STV1',    label: '500w' },
  { codigo: 'C500STV1TS',  label: 'B500w' },
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
