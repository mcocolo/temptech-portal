import * as XLSX from 'xlsx-js-style'

const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n || 0)
const fmtDate = (s) => s ? new Date(s + (s.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

// ─── Estilos compartidos para Excel ──────────────────────────────────────────
const XL = {
  headerBg:   { fgColor: { rgb: '1a1a2e' } },
  accentBg:   { fgColor: { rgb: 'ff6b2b' } },
  subheadBg:  { fgColor: { rgb: '2d2d4e' } },
  altRowBg:   { fgColor: { rgb: 'f5f5fa' } },
  white:      { fgColor: { rgb: 'ffffff' } },
  fontBold:   (sz = 11) => ({ bold: true, sz, color: { rgb: 'ffffff' }, name: 'Arial' }),
  fontNormal: (sz = 10, rgb = '1a1a2e') => ({ sz, color: { rgb }, name: 'Arial' }),
  fontMono:   (sz = 9)  => ({ sz, color: { rgb: '4a6cf7' }, name: 'Courier New', bold: true }),
  border: { top: { style: 'thin', color: { rgb: 'e0e0f0' } }, bottom: { style: 'thin', color: { rgb: 'e0e0f0' } }, left: { style: 'thin', color: { rgb: 'e0e0f0' } }, right: { style: 'thin', color: { rgb: 'e0e0f0' } } },
  alignR: { horizontal: 'right', vertical: 'center' },
  alignC: { horizontal: 'center', vertical: 'center' },
  alignL: { horizontal: 'left', vertical: 'center' },
}

function cell(v, font, fill, alignment, border) {
  return { v, t: 's', s: { font, fill, alignment: alignment || XL.alignL, border: border || XL.border } }
}
function numCell(v, font, fill, alignment) {
  return { v, t: 'n', s: { font: font || XL.fontNormal(10), fill, alignment: alignment || XL.alignR, border: XL.border, numFmt: '#,##0.00' } }
}

// ─── HTML base para PDF ───────────────────────────────────────────────────────
function htmlDoc(titulo, subtitulo, idStr, fechaStr, cuerpo) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>TEMPTECH — ${titulo}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Helvetica Neue',Arial,sans-serif;font-size:12px;color:#1a1a2e;background:#fff}
  .header{background:#1a1a2e;color:#fff;padding:20px 32px;display:flex;justify-content:space-between;align-items:flex-start}
  .logo{font-size:26px;font-weight:900;letter-spacing:-1px}
  .logo-t{color:#ff6b2b}.logo-rest{color:#fff}
  .logo-sub{font-size:9px;color:#888;letter-spacing:3px;text-transform:uppercase;margin-top:2px}
  .doc-badge{text-align:right}
  .doc-type{font-size:18px;font-weight:700;color:#ff6b2b;text-transform:uppercase;letter-spacing:2px}
  .doc-id{font-size:12px;color:#aaa;margin-top:4px;font-family:monospace}
  .doc-fecha{font-size:11px;color:#888;margin-top:2px}
  .info-bar{background:#f5f5fa;border-bottom:2px solid #e0e0f0;padding:14px 32px;display:flex;gap:40px;flex-wrap:wrap}
  .info-group label{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:3px}
  .info-group span{font-size:13px;font-weight:600;color:#1a1a2e}
  .info-group small{font-size:10px;color:#666;display:block}
  .section{padding:20px 32px}
  .section-title{font-size:10px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid #e0e0f0}
  table{width:100%;border-collapse:collapse;font-size:11px}
  thead tr{background:#1a1a2e;color:#fff}
  thead th{padding:9px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.8px;font-weight:600}
  thead th.r{text-align:right}
  tbody tr:nth-child(even){background:#f9f9fc}
  tbody tr:hover{background:#f0f0f8}
  td{padding:9px 12px;border-bottom:1px solid #eee;vertical-align:top}
  td.mono{font-family:monospace;font-size:10px;color:#4a6cf7;font-weight:700}
  td.r{text-align:right;font-weight:600}
  td.c{text-align:center}
  td .sub{font-size:10px;color:#888;margin-top:2px}
  .totales{background:#f5f5fa;border:1px solid #e0e0f0;border-radius:8px;padding:16px 20px;margin:0 32px 20px;max-width:380px;margin-left:auto}
  .totales-row{display:flex;justify-content:space-between;padding:5px 0;font-size:12px}
  .totales-row.grand{font-size:15px;font-weight:800;color:#1a1a2e;border-top:2px solid #1a1a2e;margin-top:8px;padding-top:10px}
  .totales-row.iva{color:#888;font-size:11px}
  .pagos-table td{padding:7px 12px}
  .badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:700;text-transform:uppercase}
  .badge-green{background:#e6faf2;color:#1a8a5a;border:1px solid #3dd68c}
  .badge-blue{background:#e8eeff;color:#3457d5;border:1px solid #7b9fff}
  .badge-red{background:#fff0f3;color:#cc2244;border:1px solid #ff5577}
  .badge-orange{background:#fff5e6;color:#cc6600;border:1px solid #fb923c}
  .notas{margin:0 32px 20px;padding:14px 18px;background:#fffbf0;border:1px solid #fde68a;border-radius:8px;font-size:11px;color:#666}
  .notas strong{color:#92400e;display:block;margin-bottom:4px;font-size:10px;text-transform:uppercase;letter-spacing:1px}
  .footer{background:#f5f5fa;border-top:1px solid #e0e0f0;padding:14px 32px;text-align:center;font-size:10px;color:#888;margin-top:20px}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.no-print{display:none!important}}
  .print-btn{position:fixed;bottom:24px;right:24px;background:#ff6b2b;color:#fff;border:none;border-radius:12px;padding:12px 24px;font-size:14px;font-weight:700;cursor:pointer;box-shadow:0 4px 16px rgba(255,107,43,.4);z-index:1000}
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo"><span class="logo-t">TEMP</span><span class="logo-rest">TECH</span></div>
    <div class="logo-sub">Portal de Clientes</div>
  </div>
  <div class="doc-badge">
    <div class="doc-type">${titulo}</div>
    <div class="doc-id">#${idStr}</div>
    <div class="doc-fecha">${subtitulo} · ${fechaStr}</div>
  </div>
</div>
${cuerpo}
<div class="footer">TEMPTECH — Documento generado el ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
<button class="print-btn no-print" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
</body>
</html>`
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVENTA — PDF
// ═══════════════════════════════════════════════════════════════════════════════
export function imprimirPreventa(pv) {
  const items  = pv.items || []
  const pagos  = Array.isArray(pv.pagos) ? pv.pagos : []
  const dist   = pv.profiles || {}
  const nombre = dist.razon_social || dist.full_name || '—'
  const totalPagado = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
  const saldo  = (pv.total || 0) - totalPagado
  const totalNeto = pv.incluir_iva && pv.iva_monto ? (pv.total - pv.iva_monto) : pv.total

  const estadoBadge = { activa: 'badge-green', completada: 'badge-blue', cancelada: 'badge-red' }[pv.estado] || 'badge-orange'

  const filasItems = items.map(it => `
    <tr>
      <td class="mono">${it.codigo || '—'}</td>
      <td><strong>${it.nombre || ''}</strong><div class="sub">${it.modelo || ''}</div></td>
      <td class="c">${it.cantidad_total}</td>
      <td class="c">${it.cantidad_retirada || 0}</td>
      <td class="c"><strong>${(it.cantidad_total || 0) - (it.cantidad_retirada || 0)}</strong></td>
      <td class="r">${fmt(it.precio_unitario)}</td>
      <td class="r">${fmt((it.precio_unitario || 0) * (it.cantidad_total || 0))}</td>
    </tr>`).join('')

  const filasPagos = pagos.length ? pagos.map(p => `
    <tr>
      <td>${fmtDate(p.fecha)}</td>
      <td class="r"><strong>${fmt(p.monto)}</strong></td>
      <td>${p.notas || '—'}</td>
      <td class="c">${p.comprobante_url ? `<a href="${p.comprobante_url}" target="_blank" style="color:#4a6cf7">Ver</a>` : '—'}</td>
    </tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:#888;padding:16px">Sin pagos registrados</td></tr>'

  const cuerpo = `
<div class="info-bar">
  <div class="info-group"><label>Distribuidor</label><span>${nombre}</span>${dist.email ? `<small>${dist.email}</small>` : ''}</div>
  <div class="info-group"><label>Estado</label><span class="badge ${estadoBadge}">${pv.estado || '—'}</span></div>
  ${pv.fecha_vencimiento ? `<div class="info-group"><label>Vencimiento</label><span>${fmtDate(pv.fecha_vencimiento)}</span></div>` : ''}
  <div class="info-group"><label>Fecha creación</label><span>${fmtDate(pv.created_at)}</span></div>
  ${pv.incluir_iva ? '<div class="info-group"><label>Impuestos</label><span>IVA 21% incluido</span></div>' : ''}
</div>

<div class="section">
  <div class="section-title">Productos</div>
  <table>
    <thead>
      <tr>
        <th>Código</th><th>Producto</th>
        <th class="r">Total</th><th class="r">Retirado</th><th class="r">Pendiente</th>
        <th class="r">Precio U.</th><th class="r">Subtotal</th>
      </tr>
    </thead>
    <tbody>${filasItems}</tbody>
  </table>
</div>

<div class="totales">
  ${pv.incluir_iva && pv.iva_monto ? `
  <div class="totales-row iva"><span>Subtotal neto</span><span>${fmt(totalNeto)}</span></div>
  <div class="totales-row iva"><span>IVA (21%)</span><span>${fmt(pv.iva_monto)}</span></div>` : ''}
  <div class="totales-row grand"><span>TOTAL PREVENTA</span><span>${fmt(pv.total)}</span></div>
  <div class="totales-row" style="color:#3dd68c"><span>Total pagado</span><span>${fmt(totalPagado)}</span></div>
  <div class="totales-row" style="color:${saldo > 0 ? '#ff5577' : '#3dd68c'};font-weight:700"><span>Saldo deudor</span><span>${fmt(saldo)}</span></div>
</div>

<div class="section">
  <div class="section-title">Pagos registrados</div>
  <table class="pagos-table">
    <thead><tr><th>Fecha</th><th class="r">Monto</th><th>Notas</th><th class="c">Comprobante</th></tr></thead>
    <tbody>${filasPagos}</tbody>
  </table>
</div>

${pv.notas ? `<div class="notas"><strong>📝 Notas</strong>${pv.notas}</div>` : ''}`

  const html = htmlDoc('PREVENTA', nombre, pv.id?.slice(0, 8).toUpperCase(), fmtDate(pv.created_at), cuerpo)
  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVENTA — EXCEL
// ═══════════════════════════════════════════════════════════════════════════════
export function exportarPreventaExcel(pv) {
  const items = pv.items || []
  const pagos = Array.isArray(pv.pagos) ? pv.pagos : []
  const dist  = pv.profiles || {}
  const nombre = dist.razon_social || dist.full_name || '—'
  const totalPagado = pagos.reduce((s, p) => s + (parseFloat(p.monto) || 0), 0)
  const saldo = (pv.total || 0) - totalPagado

  const wb = XLSX.utils.book_new()
  const rows = []

  // Título
  rows.push([cell('TEMPTECH', XL.fontBold(16), XL.headerBg, XL.alignL), cell('', XL.fontBold(10), XL.headerBg), cell('', XL.fontBold(10), XL.headerBg), cell('', XL.fontBold(10), XL.headerBg), cell('', XL.fontBold(10), XL.headerBg), cell('PREVENTA', XL.fontBold(14), XL.accentBg, XL.alignR)])
  rows.push([cell(`#${pv.id?.slice(0,8).toUpperCase()}`, XL.fontNormal(10,'aaaaaa'), XL.headerBg), cell('', XL.fontBold(10), XL.headerBg), cell('', XL.fontBold(10), XL.headerBg), cell('', XL.fontBold(10), XL.headerBg), cell('', XL.fontBold(10), XL.headerBg), cell(fmtDate(pv.created_at), XL.fontNormal(10,'cccccc'), XL.headerBg, XL.alignR)])
  rows.push([])

  // Info
  rows.push([cell('DISTRIBUIDOR', XL.fontBold(9), XL.subheadBg), cell(nombre, XL.fontNormal(10), { fgColor: { rgb: 'f0f0f8' } }, XL.alignL, null), cell('', null, { fgColor: { rgb: 'f0f0f8' } }), cell('ESTADO', XL.fontBold(9), XL.subheadBg), cell((pv.estado || '').toUpperCase(), XL.fontBold(10), { fgColor: { rgb: 'e8eeff' } }, XL.alignC), cell(pv.incluir_iva ? 'IVA incluido' : 'Sin IVA', XL.fontNormal(9,'888888'), { fgColor: { rgb: 'f0f0f8' } }, XL.alignC)])
  rows.push([cell('EMAIL', XL.fontBold(9), XL.subheadBg), cell(dist.email || '—', XL.fontNormal(10), { fgColor: { rgb: 'f0f0f8' } }, XL.alignL, null), cell('', null, { fgColor: { rgb: 'f0f0f8' } }), cell('VENCIMIENTO', XL.fontBold(9), XL.subheadBg), cell(fmtDate(pv.fecha_vencimiento), XL.fontNormal(10), { fgColor: { rgb: 'f0f0f8' } }, XL.alignC), cell('', null, { fgColor: { rgb: 'f0f0f8' } })])
  rows.push([])

  // Header productos
  const hFont = XL.fontBold(10)
  const hFill = XL.headerBg
  rows.push([cell('CÓDIGO', hFont, hFill, XL.alignC), cell('PRODUCTO', hFont, hFill), cell('MODELO', hFont, hFill), cell('TOTAL', hFont, hFill, XL.alignC), cell('RETIRADO', hFont, hFill, XL.alignC), cell('PRECIO U.', hFont, hFill, XL.alignR)])

  items.forEach((it, idx) => {
    const bg = idx % 2 === 0 ? null : XL.altRowBg
    rows.push([
      cell(it.codigo || '—', XL.fontMono(), bg, XL.alignC),
      cell(it.nombre || '', XL.fontNormal(10), bg),
      cell(it.modelo || '', XL.fontNormal(9, '666666'), bg),
      { v: it.cantidad_total || 0, t: 'n', s: { font: XL.fontNormal(10), fill: bg, alignment: XL.alignC, border: XL.border } },
      { v: it.cantidad_retirada || 0, t: 'n', s: { font: XL.fontNormal(10, '888888'), fill: bg, alignment: XL.alignC, border: XL.border } },
      numCell(it.precio_unitario || 0, null, bg),
    ])
  })
  rows.push([])

  // Totales
  const tFill = { fgColor: { rgb: 'f0f0f8' } }
  if (pv.incluir_iva && pv.iva_monto) {
    rows.push([cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('Subtotal neto', XL.fontNormal(10, '888888'), tFill, XL.alignR), numCell((pv.total || 0) - (pv.iva_monto || 0), XL.fontNormal(10, '888888'), tFill)])
    rows.push([cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('IVA (21%)', XL.fontNormal(10, '888888'), tFill, XL.alignR), numCell(pv.iva_monto || 0, XL.fontNormal(10, '888888'), tFill)])
  }
  rows.push([cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('TOTAL PREVENTA', XL.fontBold(11), XL.headerBg, XL.alignR), numCell(pv.total || 0, XL.fontBold(11), XL.headerBg)])
  rows.push([cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('Total pagado', XL.fontNormal(10, '1a8a5a'), { fgColor: { rgb: 'e6faf2' } }, XL.alignR), numCell(totalPagado, XL.fontNormal(10, '1a8a5a'), { fgColor: { rgb: 'e6faf2' } })])
  rows.push([cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('Saldo deudor', XL.fontBold(11), { fgColor: { rgb: saldo > 0 ? 'fff0f3' : 'e6faf2' } }, XL.alignR), numCell(saldo, XL.fontBold(11), { fgColor: { rgb: saldo > 0 ? 'fff0f3' : 'e6faf2' } })])
  rows.push([])

  // Pagos
  if (pagos.length) {
    rows.push([cell('PAGOS REGISTRADOS', XL.fontBold(10), XL.subheadBg), cell('', null, XL.subheadBg), cell('', null, XL.subheadBg), cell('', null, XL.subheadBg), cell('', null, XL.subheadBg), cell('', null, XL.subheadBg)])
    rows.push([cell('Fecha', hFont, XL.headerBg), cell('Monto', hFont, XL.headerBg, XL.alignR), cell('Notas', hFont, XL.headerBg), cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null)])
    pagos.forEach(p => {
      rows.push([cell(fmtDate(p.fecha), XL.fontNormal(10), null), numCell(p.monto, null, null, XL.alignR), cell(p.notas || '—', XL.fontNormal(9, '666666'), null), cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null)])
    })
  }

  if (pv.notas) {
    rows.push([])
    rows.push([cell('NOTAS', XL.fontBold(10), XL.subheadBg), cell(pv.notas, XL.fontNormal(10, '555555'), { fgColor: { rgb: 'fffbf0' } }, XL.alignL, null), cell('', null, { fgColor: { rgb: 'fffbf0' } }), cell('', null, { fgColor: { rgb: 'fffbf0' } }), cell('', null, { fgColor: { rgb: 'fffbf0' } }), cell('', null, { fgColor: { rgb: 'fffbf0' } })])
  }

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 22 }, { wch: 10 }, { wch: 10 }, { wch: 16 }]
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } }, { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } }]

  XLSX.utils.book_append_sheet(wb, ws, 'Preventa')
  XLSX.writeFile(wb, `TEMPTECH_Preventa_${pv.id?.slice(0,8).toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESUPUESTO — PDF
// ═══════════════════════════════════════════════════════════════════════════════
export function imprimirPresupuesto({ items, distribuidor, notas, fecha, incluirIVA, total, ivaMonto, titulo = 'PRESUPUESTO' }) {
  const nombre = distribuidor?.razon_social || distribuidor?.full_name || distribuidor?.nombre || '—'
  const email  = distribuidor?.email || ''
  const totalNeto = incluirIVA && ivaMonto ? total - ivaMonto : total
  const idStr  = `TEMP-${Date.now().toString(36).toUpperCase().slice(-6)}`

  const filasItems = items.filter(it => it.cantidad > 0).map(it => `
    <tr>
      <td class="mono">${it.codigo || '—'}</td>
      <td><strong>${it.nombre || ''}</strong><div class="sub">${it.modelo || ''}</div></td>
      <td class="c">${it.cantidad}</td>
      ${it.descuento_pct > 0 ? `<td class="c" style="color:#3dd68c">${it.descuento_pct}%</td>` : '<td class="c" style="color:#ccc">—</td>'}
      <td class="r">${fmt(it.precio_unitario)}</td>
      <td class="r">${fmt(it.subtotal)}</td>
    </tr>`).join('')

  const cuerpo = `
<div class="info-bar">
  <div class="info-group"><label>${titulo === 'PEDIDO' ? 'Distribuidor' : 'Cliente / Distribuidor'}</label><span>${nombre}</span>${email ? `<small>${email}</small>` : ''}</div>
  ${fecha ? `<div class="info-group"><label>Fecha de entrega</label><span>${fmtDate(fecha)}</span></div>` : ''}
  ${incluirIVA ? '<div class="info-group"><label>Impuestos</label><span>IVA 21% incluido</span></div>' : ''}
  <div class="info-group"><label>Emitido</label><span>${new Date().toLocaleDateString('es-AR')}</span></div>
</div>

<div class="section">
  <div class="section-title">Productos</div>
  <table>
    <thead>
      <tr>
        <th>Código</th><th>Producto</th><th class="r">Cant.</th><th class="r">Desc.</th>
        <th class="r">Precio U.</th><th class="r">Subtotal</th>
      </tr>
    </thead>
    <tbody>${filasItems}</tbody>
  </table>
</div>

<div class="totales">
  ${incluirIVA && ivaMonto ? `
  <div class="totales-row iva"><span>Subtotal neto</span><span>${fmt(totalNeto)}</span></div>
  <div class="totales-row iva"><span>IVA (21%)</span><span>${fmt(ivaMonto)}</span></div>` : ''}
  <div class="totales-row grand"><span>TOTAL</span><span>${fmt(total)}</span></div>
</div>

${notas ? `<div class="notas"><strong>📝 Condiciones / Notas</strong>${notas}</div>` : ''}
<div class="notas" style="background:#f0f0f8;border-color:#c0c0e0">
  <strong>⚠️ Condiciones generales</strong>
  Este presupuesto tiene validez de 7 días corridos desde su emisión. Los precios están expresados en pesos argentinos. Sujeto a disponibilidad de stock.
</div>`

  const html = htmlDoc(titulo, nombre, idStr, new Date().toLocaleDateString('es-AR'), cuerpo)
  const w = window.open('', '_blank')
  w.document.write(html)
  w.document.close()
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRESUPUESTO — EXCEL
// ═══════════════════════════════════════════════════════════════════════════════
export function exportarPresupuestoExcel({ items, distribuidor, notas, fecha, incluirIVA, total, ivaMonto, titulo = 'PRESUPUESTO' }) {
  const nombre = distribuidor?.razon_social || distribuidor?.full_name || distribuidor?.nombre || '—'
  const email  = distribuidor?.email || ''
  const idStr  = `TEMP-${Date.now().toString(36).toUpperCase().slice(-6)}`
  const wb = XLSX.utils.book_new()
  const rows = []

  // Header
  rows.push([cell('TEMPTECH', XL.fontBold(16), XL.headerBg), cell('', null, XL.headerBg), cell('', null, XL.headerBg), cell('', null, XL.headerBg), cell('', null, XL.headerBg), cell(titulo, XL.fontBold(14), XL.accentBg, XL.alignR)])
  rows.push([cell(idStr, XL.fontNormal(9,'aaaaaa'), XL.headerBg), cell('', null, XL.headerBg), cell('', null, XL.headerBg), cell('', null, XL.headerBg), cell('', null, XL.headerBg), cell(new Date().toLocaleDateString('es-AR'), XL.fontNormal(10,'cccccc'), XL.headerBg, XL.alignR)])
  rows.push([])

  // Info
  rows.push([cell('CLIENTE', XL.fontBold(9), XL.subheadBg), cell(nombre, XL.fontNormal(10), { fgColor: { rgb: 'f0f0f8' } }, XL.alignL, null), cell('', null, { fgColor: { rgb: 'f0f0f8' } }), cell('EMAIL', XL.fontBold(9), XL.subheadBg), cell(email || '—', XL.fontNormal(10), { fgColor: { rgb: 'f0f0f8' } }, XL.alignL, null), cell(incluirIVA ? 'IVA incl.' : 'Sin IVA', XL.fontNormal(9,'888888'), { fgColor: { rgb: 'f0f0f8' } }, XL.alignC)])
  if (fecha) rows.push([cell('ENTREGA', XL.fontBold(9), XL.subheadBg), cell(fmtDate(fecha), XL.fontNormal(10), { fgColor: { rgb: 'f0f0f8' } }, XL.alignL, null), cell('', null, { fgColor: { rgb: 'f0f0f8' } }), cell('', null, null), cell('', null, null), cell('', null, null)])
  rows.push([])

  // Encabezado tabla
  const hFont = XL.fontBold(10), hFill = XL.headerBg
  rows.push([cell('CÓDIGO', hFont, hFill, XL.alignC), cell('PRODUCTO', hFont, hFill), cell('MODELO', hFont, hFill), cell('CANT.', hFont, hFill, XL.alignC), cell('PRECIO U.', hFont, hFill, XL.alignR), cell('SUBTOTAL', hFont, hFill, XL.alignR)])

  const validos = items.filter(it => it.cantidad > 0)
  validos.forEach((it, idx) => {
    const bg = idx % 2 === 0 ? null : XL.altRowBg
    rows.push([
      cell(it.codigo || '—', XL.fontMono(), bg, XL.alignC),
      cell(it.nombre || '', XL.fontNormal(10), bg),
      cell(it.modelo || '', XL.fontNormal(9, '666666'), bg),
      { v: it.cantidad, t: 'n', s: { font: XL.fontNormal(10), fill: bg, alignment: XL.alignC, border: XL.border } },
      numCell(it.precio_unitario || 0, null, bg),
      numCell(it.subtotal || 0, XL.fontNormal(10), bg),
    ])
  })
  rows.push([])

  // Totales
  const tFill = { fgColor: { rgb: 'f0f0f8' } }
  if (incluirIVA && ivaMonto) {
    rows.push([cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('Subtotal neto', XL.fontNormal(10,'888888'), tFill, XL.alignR), numCell(total - ivaMonto, XL.fontNormal(10,'888888'), tFill)])
    rows.push([cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('IVA (21%)', XL.fontNormal(10,'888888'), tFill, XL.alignR), numCell(ivaMonto, XL.fontNormal(10,'888888'), tFill)])
  }
  rows.push([cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('TOTAL', XL.fontBold(12), XL.headerBg, XL.alignR), numCell(total, XL.fontBold(12), XL.headerBg)])
  rows.push([])

  if (notas) {
    rows.push([cell('NOTAS / CONDICIONES', XL.fontBold(10), XL.subheadBg), cell(notas, XL.fontNormal(10,'555555'), { fgColor: { rgb: 'fffbf0' } }, XL.alignL, null), cell('', null, { fgColor: { rgb: 'fffbf0' } }), cell('', null, { fgColor: { rgb: 'fffbf0' } }), cell('', null, { fgColor: { rgb: 'fffbf0' } }), cell('', null, { fgColor: { rgb: 'fffbf0' } })])
  }
  rows.push([cell('', null, null, null, null), cell('Precios válidos por 7 días. Sujeto a disponibilidad de stock.', XL.fontNormal(9,'999999'), null, XL.alignL, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null), cell('', null, null, null, null)])

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 12 }, { wch: 28 }, { wch: 22 }, { wch: 8 }, { wch: 16 }, { wch: 16 }]
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }]

  XLSX.utils.book_append_sheet(wb, ws, titulo)
  XLSX.writeFile(wb, `TEMPTECH_${titulo}_${idStr}_${new Date().toISOString().split('T')[0]}.xlsx`)
}
