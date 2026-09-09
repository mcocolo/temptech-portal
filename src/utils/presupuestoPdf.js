import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

function fmtARS(n) {
  return '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(n || 0))
}

// Construye el documento PDF del presupuesto y devuelve la instancia jsPDF.
export function generarPresupuestoPDF({
  clienteNombre, clienteCuitDni, clienteDireccion, clienteLocalidad, clienteEmail,
  items, incluirIVA, totalNeto, ivaMonto, total, notas, fecha,
}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 40
  let y = 50

  // Marca
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(20, 20, 20)
  doc.text('TEMP', M, y)
  const tw = doc.getTextWidth('TEMP')
  doc.setTextColor(255, 107, 43); doc.text('TECH', M + tw, y)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120, 120, 120)
  doc.text('PRESUPUESTO', W - M, y - 10, { align: 'right' })
  doc.text(fecha || new Date().toLocaleDateString('es-AR'), W - M, y + 2, { align: 'right' })

  y += 22
  doc.setDrawColor(230, 230, 230); doc.line(M, y, W - M, y)
  y += 22

  // Datos del cliente
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(50, 50, 50)
  doc.text(clienteNombre || '', M, y); y += 15
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110, 110, 110)
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
    styles: { fontSize: 8, cellPadding: 5, textColor: [40, 40, 40], lineColor: [235, 235, 235] },
    headStyles: { fillColor: [255, 107, 43], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
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
    doc.setFont('helvetica', 'normal'); doc.setTextColor(110, 110, 110)
    doc.text('Neto', rx - 150, y); doc.text(fmtARS(totalNeto), rx, y, { align: 'right' }); y += 14
    doc.text('IVA (21%)', rx - 150, y); doc.text(fmtARS(ivaMonto), rx, y, { align: 'right' }); y += 14
  }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(20, 20, 20)
  doc.text(`Total${incluirIVA ? ' c/IVA' : ''}`, rx - 150, y)
  doc.text(fmtARS(total), rx, y, { align: 'right' }); y += 26

  // Notas
  if (notas) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(60, 60, 60)
    doc.text('Condiciones / Notas', M, y); y += 13
    doc.setFont('helvetica', 'normal'); doc.setTextColor(110, 110, 110)
    const wrapped = doc.splitTextToSize(String(notas), W - 2 * M)
    doc.text(wrapped, M, y); y += wrapped.length * 12 + 10
  }

  doc.setFontSize(8); doc.setTextColor(150, 150, 150)
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
export function presupuestoPDFBase64(payload) {
  const doc = generarPresupuestoPDF(payload)
  return arrayBufferToBase64(doc.output('arraybuffer'))
}
