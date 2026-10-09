import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const NAVY = [23, 42, 77]       // barra de encabezado
const TEXT = [40, 45, 55]
const GRAY = [120, 128, 140]
const LINE = [200, 205, 212]

function fmtARS(n) {
  if (n == null || n === '') return ''
  return '$ ' + new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0)
}

async function fetchImageDataURL(url) {
  if (!url) return null
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return await new Promise((resolve) => {
      const fr = new FileReader()
      fr.onloadend = () => resolve(fr.result)
      fr.onerror = () => resolve(null)
      fr.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function fechaLarga(d) {
  try {
    return (d || new Date()).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  } catch { return new Date().toLocaleDateString('es-AR') }
}

// Genera el PDF de la lista de precios replicando el formato del Excel.
//  { titulo, productos, bannerUrl, mostrarCostos, mostrarFijacion, fecha }
//  productos: [{ negocio, codigo, producto, modelo_lista|modelo, costo_siva, costo_civa, ean, peso, medidas, fijacion, precio, disponibilidad, imagen_url }]
export async function generarListaPreciosPDF({ titulo, productos = [], bannerUrl, mostrarCostos = true, mostrarFijacion = true, fecha }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 24

  // Precargar imágenes (banner + productos)
  const banner = await fetchImageDataURL(bannerUrl)
  const imgMap = {}
  await Promise.all(productos.filter(p => p.imagen_url).map(async p => {
    imgMap[p.codigo] = await fetchImageDataURL(p.imagen_url)
  }))

  // Columnas dinámicas según categoría
  const cols = [
    { key: 'negocio', header: 'Negocio' },
    { key: 'codigo', header: 'Codigo' },
    { key: 'producto', header: 'Producto' },
    { key: 'modelo', header: 'Modelo' },
    ...(mostrarCostos ? [{ key: 'costo_siva', header: 'Costo S/IVA' }, { key: 'costo_civa', header: 'Costo C/IVA' }] : []),
    { key: 'ean', header: 'Codigo EAN' },
    { key: 'peso', header: 'Peso' },
    { key: 'medidas', header: 'Medidas' },
    { key: 'imagen', header: 'Imágenes' },
    ...(mostrarFijacion ? [{ key: 'fijacion', header: 'Fijación' }] : []),
    { key: 'pvp', header: 'PVP' },
    { key: 'disponibilidad', header: 'Disponibilidad' },
  ]
  const imgColIndex = cols.findIndex(c => c.key === 'imagen')

  const body = productos.map(p => cols.map(c => {
    switch (c.key) {
      case 'negocio': return p.negocio || ''
      case 'codigo': return p.codigo || ''
      case 'producto': return p.producto || p.nombre || ''
      case 'modelo': return p.modelo_lista || p.modelo || ''
      case 'costo_siva': return fmtARS(p.costo_siva)
      case 'costo_civa': return fmtARS(p.costo_civa)
      case 'ean': return p.ean || ''
      case 'peso': return p.peso || ''
      case 'medidas': return p.medidas || ''
      case 'imagen': return ''
      case 'fijacion': return p.fijacion || ''
      case 'pvp': return fmtARS(p.precio)
      case 'disponibilidad': return p.disponibilidad || 'NORMAL'
      default: return ''
    }
  }))

  // Encabezado (barra navy + wordmark) y banner, repetido en cada página
  function drawHeader() {
    doc.setFillColor(...NAVY)
    doc.rect(0, 0, W, 48, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.setTextColor(255, 255, 255)
    doc.text('TEMPTECH', W / 2, 31, { align: 'center' })
  }

  const headerBottom = 48
  let bannerH = 0
  if (banner) {
    try {
      const props = doc.getImageProperties(banner)
      bannerH = Math.min(150, (W - 0) * (props.height / props.width))
    } catch { bannerH = 0 }
  }

  drawHeader()
  if (banner && bannerH > 0) {
    try { doc.addImage(banner, 'JPEG', 0, headerBottom, W, bannerH) } catch {}
  }
  let startY = headerBottom + bannerH + 6
  // Fecha
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...TEXT)
  doc.text(fechaLarga(fecha), W / 2, startY + 8, { align: 'center' })
  startY += 16

  autoTable(doc, {
    startY,
    head: [cols.map(c => c.header)],
    body,
    theme: 'grid',
    styles: { fontSize: 6.5, cellPadding: 3, textColor: TEXT, lineColor: LINE, lineWidth: 0.5, valign: 'middle', overflow: 'linebreak', minCellHeight: 34 },
    headStyles: { fillColor: [235, 237, 240], textColor: NAVY, fontStyle: 'bold', halign: 'center', fontSize: 6.5, lineColor: LINE, lineWidth: 0.5 },
    bodyStyles: { halign: 'center' },
    columnStyles: {
      [cols.findIndex(c => c.key === 'producto')]: { halign: 'left' },
      [cols.findIndex(c => c.key === 'modelo')]: { halign: 'left', fontStyle: 'bold' },
      ...(mostrarCostos ? { [cols.findIndex(c => c.key === 'costo_siva')]: { halign: 'right', fontStyle: 'bold' }, [cols.findIndex(c => c.key === 'costo_civa')]: { halign: 'right', fontStyle: 'bold' } } : {}),
      [cols.findIndex(c => c.key === 'pvp')]: { halign: 'right', fontStyle: 'bold', textColor: NAVY },
      [imgColIndex]: { cellWidth: 44 },
    },
    margin: { left: M, right: M, top: headerBottom + bannerH + 24 },
    // Repintar encabezado/banner en páginas nuevas
    didDrawPage: () => { drawHeader(); if (banner && bannerH > 0) { try { doc.addImage(banner, 'JPEG', 0, headerBottom, W, bannerH) } catch {} } },
    // Dibujar la miniatura del producto en su celda
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === imgColIndex) {
        const cod = productos[data.row.index]?.codigo
        const img = cod && imgMap[cod]
        if (img) {
          const pad = 2
          const cw = data.cell.width - pad * 2
          const ch = data.cell.height - pad * 2
          try {
            const props = doc.getImageProperties(img)
            const ratio = Math.min(cw / props.width, ch / props.height)
            const w = props.width * ratio
            const h = props.height * ratio
            const x = data.cell.x + (data.cell.width - w) / 2
            const y = data.cell.y + (data.cell.height - h) / 2
            doc.addImage(img, props.fileType || 'PNG', x, y, w, h)
          } catch {}
        }
      }
    },
  })

  let y = doc.lastAutoTable.finalY + 14
  if (y > H - M) { doc.addPage(); y = M }
  doc.setFontSize(7); doc.setTextColor(...GRAY)
  doc.text('Precios sujetos a modificación sin previo aviso y a disponibilidad de stock.', M, y)

  return doc
}
