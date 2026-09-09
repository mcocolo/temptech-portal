import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const LOGO_URL = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagen-Corporativa/Temptech_LogoHorizontal.png'

// Paleta de marca
const NAVY = [37, 55, 77]       // #25374D
const TEXT = [40, 45, 55]
const GRAY = [120, 128, 140]
const LINE = [228, 230, 235]
const GREEN = [46, 158, 107]

function fmtARS(n) {
  return '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(n || 0))
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

// Construye el documento PDF del presupuesto y devuelve la instancia jsPDF.
export async function generarPresupuestoPDF({
  clienteNombre, clienteCuitDni, clienteDireccion, clienteLocalidad, clienteEmail,
  items, incluirIVA, totalNeto, ivaMonto, total, notas, fecha,
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 40
  let y = 48

  // Logo oficial (con fallback a wordmark azul)
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
  doc.text('PRESUPUESTO', W - M, y - 12, { align: 'right' })
  doc.text(fecha || new Date().toLocaleDateString('es-AR'), W - M, y, { align: 'right' })

  y += 18
  doc.setDrawColor(...LINE); doc.line(M, y, W - M, y)
  y += 24

  // Datos del cliente
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...NAVY)
  doc.text(clienteNombre || '', M, y); y += 16
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY)
  const info = [
    clienteCuitDni && `CUIT/DNI: ${clienteCuitDni}`,
    [clienteDireccion, clienteLocalidad].filter(Boolean).join(', '),
    clienteEmail,
  ].filter(Boolean)
  info.forEach(l => { doc.text(String(l), M, y); y += 12 })
  y += 8

  // Tabla de ítems
  const body = (items || []).map(it => [
    it.codigo || '',
    `${it.nombre || ''}${it.modelo ? ` ${it.modelo}` : ''}`,
    String(it.cantidad ?? ''),
    it.descuento_pct > 0 ? `${it.descuento_pct}%` : '—',
    fmtARS(it.precio_unitario),
    fmtARS(it.subtotal),
  ])
  autoTable(doc, {
    startY: y,
    head: [['Código', 'Producto', 'Cant.', 'Desc.', 'P. Unit.', 'Subtotal']],
    body,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 6, textColor: TEXT, lineColor: LINE, lineWidth: 0.5 },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: [248, 249, 251] },
    columnStyles: {
      0: { cellWidth: 68 },
      2: { halign: 'center', cellWidth: 40 },
      3: { halign: 'right', cellWidth: 45 },
      4: { halign: 'right', cellWidth: 78 },
      5: { halign: 'right', cellWidth: 82 },
    },
    margin: { left: M, right: M },
  })
  y = doc.lastAutoTable.finalY + 18

  // Totales (alineados a la derecha)
  const rx = W - M
  doc.setFontSize(9)
  if (incluirIVA) {
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
    doc.text('Neto', rx - 150, y); doc.text(fmtARS(totalNeto), rx, y, { align: 'right' }); y += 14
    doc.text('IVA (21%)', rx - 150, y); doc.text(fmtARS(ivaMonto), rx, y, { align: 'right' }); y += 14
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...NAVY)
  doc.text(`Total${incluirIVA ? ' c/IVA' : ''}`, rx - 150, y)
  doc.text(fmtARS(total), rx, y, { align: 'right' }); y += 26

  // Notas
  if (notas) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...TEXT)
    doc.text('Condiciones / Notas', M, y); y += 13
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...GRAY)
    const wrapped = doc.splitTextToSize(String(notas), W - 2 * M)
    doc.text(wrapped, M, y); y += wrapped.length * 12 + 10
  }

  doc.setFontSize(8); doc.setTextColor(...GRAY)
  doc.text('Validez: 7 días corridos. Precios sujetos a disponibilidad de stock.', M, y)

  return doc
}

function arrayBufferToBase64(buf) {
  let binary = ''
  const bytes = new Uint8Array(buf)
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

// Devuelve el PDF en base64 (sin prefijo data:) para adjuntar en el email.
export async function presupuestoPDFBase64(payload) {
  const doc = await generarPresupuestoPDF(payload)
  return arrayBufferToBase64(doc.output('arraybuffer'))
}
