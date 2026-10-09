import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const LOGO_URL = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagen-Corporativa/Temptech_LogoHorizontal.png'

const NAVY = [37, 55, 77]
const TEXT = [40, 45, 55]
const GRAY = [120, 128, 140]
const LINE = [228, 230, 235]

function fmtARS(n) {
  return '$ ' + new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)
}

async function fetchImageDataURL(url) {
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

// Genera el PDF de una lista de precios a partir de los datos vivos.
//  { titulo, productos: [{codigo, nombre, modelo, precio}], condiciones: 'texto', fecha }
export async function generarListaPreciosPDF({ titulo, productos, condiciones, fecha }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 40
  let y = 48

  // Logo
  const logo = await fetchImageDataURL(LOGO_URL)
  if (logo) {
    try {
      const props = doc.getImageProperties(logo)
      const h = 30
      const w = props.width * (h / props.height)
      doc.addImage(logo, 'PNG', M, y - 22, w, h)
    } catch {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...NAVY)
      doc.text('TEMPTECH', M, y)
    }
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(...NAVY)
    doc.text('TEMPTECH', M, y)
  }

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY)
  doc.text('LISTA DE PRECIOS', W - M, y - 12, { align: 'right' })
  doc.text(fecha || new Date().toLocaleDateString('es-AR'), W - M, y, { align: 'right' })

  y += 18
  doc.setDrawColor(...LINE); doc.line(M, y, W - M, y)
  y += 24

  // Título de la categoría
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...NAVY)
  doc.text(titulo || 'Lista de Precios', M, y)
  y += 16

  // Tabla de productos
  const body = (productos || []).map(p => [
    p.codigo || '',
    `${p.nombre || ''}${p.modelo ? ` ${p.modelo}` : ''}`.trim(),
    fmtARS(p.precio),
  ])
  autoTable(doc, {
    startY: y,
    head: [['Código', 'Producto', 'Precio']],
    body,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 6, textColor: TEXT, lineColor: LINE, lineWidth: 0.5 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: {
      0: { cellWidth: 100, fontStyle: 'bold' },
      2: { halign: 'right', cellWidth: 110 },
    },
    margin: { left: M, right: M },
  })
  y = doc.lastAutoTable.finalY + 20

  // Condiciones
  if (condiciones) {
    const wrapped = doc.splitTextToSize(String(condiciones), W - 2 * M)
    const needed = wrapped.length * 12 + 40
    if (y + needed > H - M) { doc.addPage(); y = 48 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...NAVY)
    doc.text('Condiciones comerciales', M, y); y += 15
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY)
    doc.text(wrapped, M, y); y += wrapped.length * 12 + 10
  }

  // Pie
  if (y > H - M) { doc.addPage(); y = 48 }
  doc.setFontSize(8); doc.setTextColor(...GRAY)
  doc.text('Precios sujetos a modificación sin previo aviso y a disponibilidad de stock.', M, H - 28)

  return doc
}
