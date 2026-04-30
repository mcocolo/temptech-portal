import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx-js-style'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import toast from 'react-hot-toast'

function formatPrecio(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(n)
}

const ESTADO_CONFIG = {
  activa:     { label: 'Activa',     color: '#3dd68c', bg: 'rgba(61,214,140,0.12)',  border: 'rgba(61,214,140,0.35)' },
  completada: { label: 'Completada', color: '#7b9fff', bg: 'rgba(74,108,247,0.12)',  border: 'rgba(74,108,247,0.35)' },
  cancelada:  { label: 'Cancelada',  color: '#ff5577', bg: 'rgba(255,85,119,0.12)',  border: 'rgba(255,85,119,0.35)' },
}

const IVA_PCT = 0.21

export default function MisPreventas() {
  const { user, profile, isDistributor } = useAuth()
  const [preventas, setPreventas] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandida, setExpandida] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('activa')

  const [agregandoPago, setAgregandoPago] = useState(null)
  const [pagoMonto, setPagoMonto] = useState('')
  const [pagoFecha, setPagoFecha] = useState('')
  const [pagoNotas, setPagoNotas] = useState('')
  const [pagoComprobante, setPagoComprobante] = useState(null)
  const [subiendoPagoComp, setSubiendoPagoComp] = useState(false)
  const [registrandoPago, setRegistrandoPago] = useState(false)

  useEffect(() => { if (user) cargar() }, [user, filtroEstado])

  async function cargar() {
    setLoading(true)
    let q = supabase.from('preventas').select('*').order('created_at', { ascending: false })
    if (filtroEstado !== 'todos') q = q.eq('estado', filtroEstado)
    if (isDistributor) q = q.eq('distribuidor_id', user.id)
    const { data, error } = await q
    if (error) { toast.error('Error al cargar preventas'); setLoading(false); return }
    setPreventas(data || [])
    setLoading(false)
  }

  async function registrarPago(pv) {
    const monto = parseFloat(pagoMonto) || 0
    if (monto <= 0) { toast.error('Ingresá un monto válido'); return }
    setRegistrandoPago(true)
    let comprobanteUrl = null
    if (pagoComprobante) {
      setSubiendoPagoComp(true)
      const ext = pagoComprobante.name.split('.').pop()
      const path = `preventas/${pv.id}/pagos/${Date.now()}_comp.${ext}`
      const { error: errUp } = await supabase.storage.from('facturas').upload(path, pagoComprobante, { upsert: true })
      setSubiendoPagoComp(false)
      if (errUp) { toast.error('Error al subir comprobante: ' + errUp.message); setRegistrandoPago(false); return }
      const { data: urlData } = supabase.storage.from('facturas').getPublicUrl(path)
      comprobanteUrl = urlData.publicUrl
    }
    const nuevoPago = {
      id: crypto.randomUUID(),
      monto,
      fecha: pagoFecha || new Date().toISOString().split('T')[0],
      notas: pagoNotas.trim() || null,
      comprobante_url: comprobanteUrl,
      registrado_por: user.id,
      registrado_por_nombre: profile?.full_name || user.email,
      created_at: new Date().toISOString(),
    }
    const nuevosPagos = [...(pv.pagos || []), nuevoPago]
    const nuevoSaldo = nuevosPagos.reduce((s, p) => s + p.monto, 0)
    const { error } = await supabase.from('preventas').update({
      pagos: nuevosPagos,
      saldo_cobrado: nuevoSaldo,
      updated_at: new Date().toISOString(),
    }).eq('id', pv.id)
    setRegistrandoPago(false)
    if (error) { toast.error('Error al registrar pago: ' + error.message); return }
    toast.success('Pago registrado ✅')
    setAgregandoPago(null); setPagoMonto(''); setPagoFecha(''); setPagoNotas(''); setPagoComprobante(null)
    cargar()
  }

  const totalPreventa = (items) => (items || []).reduce((s, i) => s + i.precio_unitario * i.cantidad_total, 0)
  const totalRetirado = (items) => (items || []).reduce((s, i) => s + i.precio_unitario * (i.cantidad_retirada || 0), 0)
  const totalPendiente = (items) => (items || []).reduce((s, i) => s + i.precio_unitario * (i.cantidad_total - (i.cantidad_retirada || 0)), 0)

  function imprimirSaldo(pv) {
    const clienteNombre = profile?.razon_social || profile?.full_name || 'Mi Cuenta'
    const items = pv.items || []
    const iva = pv.incluir_iva ? IVA_PCT : 0
    const aplicarIva = (n) => n * (1 + iva)

    const filas = items.map(i => {
      const pendiente = i.cantidad_total - (i.cantidad_retirada || 0)
      return `
        <tr>
          <td>${i.codigo || ''}</td>
          <td>${i.nombre || ''}${i.modelo ? ' — ' + i.modelo : ''}</td>
          <td style="text-align:center">${i.cantidad_total}</td>
          <td style="text-align:center">${i.cantidad_retirada || 0}</td>
          <td style="text-align:center;font-weight:700;color:${pendiente > 0 ? '#c0392b' : '#27ae60'}">${pendiente}</td>
          <td style="text-align:right">${formatPrecio(aplicarIva(i.precio_unitario * i.cantidad_total))}</td>
          <td style="text-align:right">${formatPrecio(aplicarIva(i.precio_unitario * (i.cantidad_retirada || 0)))}</td>
          <td style="text-align:right;font-weight:700;color:${pendiente > 0 ? '#c0392b' : '#27ae60'}">${formatPrecio(aplicarIva(i.precio_unitario * pendiente))}</td>
        </tr>`
    }).join('')

    const totPreventa = aplicarIva(totalPreventa(items))
    const totRetirado = aplicarIva(totalRetirado(items))
    const totPendiente = aplicarIva(totalPendiente(items))
    const ivaLabel = pv.incluir_iva ? ' (c/ IVA)' : ' (s/ IVA)'
    const fechaHoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Saldo Pendiente — ${clienteNombre}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0 }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 32px }
  h1 { font-size: 20px; margin-bottom: 4px }
  .sub { color: #555; font-size: 12px; margin-bottom: 24px }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px }
  th { background: #222; color: #fff; padding: 8px 10px; text-align: left; font-size: 12px }
  td { padding: 7px 10px; border-bottom: 1px solid #ddd; font-size: 12px }
  tr:last-child td { border-bottom: none }
  .totales { border: 2px solid #222; border-radius: 6px; padding: 16px; max-width: 360px; margin-left: auto }
  .totales div { display: flex; justify-content: space-between; padding: 4px 0 }
  .totales .pendiente { font-weight: 700; font-size: 15px; color: #c0392b; border-top: 1px solid #ccc; padding-top: 8px; margin-top: 4px }
  .btn-print { margin-bottom: 20px; padding: 8px 20px; font-size: 13px; cursor: pointer; background: #222; color: #fff; border: none; border-radius: 4px }
  @media print { .btn-print { display: none } }
</style>
</head>
<body>
<button class="btn-print" onclick="window.print()">🖨️ Imprimir</button>
<h1>Saldo Pendiente de Entrega</h1>
<div class="sub">
  Cliente: <strong>${clienteNombre}</strong> &nbsp;|&nbsp;
  Preventa: <strong>#${pv.id.slice(0, 8).toUpperCase()}</strong> &nbsp;|&nbsp;
  Fecha: <strong>${fechaHoy}</strong>
</div>
<table>
  <thead>
    <tr>
      <th>Código</th>
      <th>Producto</th>
      <th style="text-align:center">Total pactado</th>
      <th style="text-align:center">Retirado</th>
      <th style="text-align:center">Pendiente</th>
      <th style="text-align:right">Monto total${ivaLabel}</th>
      <th style="text-align:right">Retirado${ivaLabel}</th>
      <th style="text-align:right">Pendiente${ivaLabel}</th>
    </tr>
  </thead>
  <tbody>${filas}</tbody>
</table>
<div class="totales">
  <div><span>Total preventa${ivaLabel}</span><span>${formatPrecio(totPreventa)}</span></div>
  <div><span>Retirado${ivaLabel}</span><span>${formatPrecio(totRetirado)}</span></div>
  <div class="pendiente"><span>Saldo pendiente${ivaLabel}</span><span>${formatPrecio(totPendiente)}</span></div>
</div>
</body>
</html>`

    const w = window.open('', '_blank')
    w.document.write(html)
    w.document.close()
  }

  function exportarExcel() {
    const HEADER_STYLE = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10 },
      fill: { fgColor: { rgb: '1A1A2E' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: { bottom: { style: 'thin', color: { rgb: '4A6CF7' } } },
    }
    const TITLE_STYLE = { font: { bold: true, sz: 14, color: { rgb: '1A1A2E' } } }
    const SUB_STYLE = { font: { sz: 10, color: { rgb: '666666' }, italic: true } }
    const MONEY_FMT = '"$"#,##0.00'

    const cols = [
      'ID Preventa', 'Estado', 'Fecha', 'Vencimiento',
      'Código', 'Producto', 'Modelo',
      'Cant. Total', 'Retirado', 'Pendiente',
      'Precio Unit.', 'Subtotal Total', 'Sub. Retirado', 'Sub. Pendiente',
      'Total Preventa', 'Total Pagado', 'Saldo Deudor', 'Notas',
    ]

    const rows = [
      [{ v: 'TEMPTECH — Mis Preventas', t: 's', s: TITLE_STYLE }],
      [{ v: `Exportado: ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}`, t: 's', s: SUB_STYLE }],
      [],
      cols.map(c => ({ v: c, t: 's', s: HEADER_STYLE })),
    ]

    for (const pv of preventas) {
      const items = pv.items || []
      const ivaFactor = pv.incluir_iva ? (1 + IVA_PCT) : 1
      const neto = totalPreventa(items)
      const total = neto * ivaFactor
      const pagado = (pv.pagos || []).reduce((s, p) => s + p.monto, 0)
      const deuda = Math.max(0, total - pagado)
      const estado = ESTADO_CONFIG[pv.estado]?.label || pv.estado
      const fecha = new Date(pv.created_at).toLocaleDateString('es-AR')
      const venc = pv.fecha_vencimiento
        ? new Date(pv.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-AR') : ''

      const EVEN_BG = { fill: { fgColor: { rgb: 'F5F7FF' } } }

      items.forEach((item, idx) => {
        const subTotal = item.precio_unitario * item.cantidad_total * ivaFactor
        const subRet   = item.precio_unitario * (item.cantidad_retirada || 0) * ivaFactor
        const subPend  = item.precio_unitario * (item.cantidad_total - (item.cantidad_retirada || 0)) * ivaFactor
        const bg = idx % 2 === 0 ? {} : EVEN_BG
        const money = (v) => ({ v, t: 'n', z: MONEY_FMT, s: { ...bg, alignment: { horizontal: 'right' } } })
        const num   = (v) => ({ v, t: 'n', s: { ...bg, alignment: { horizontal: 'center' } } })
        const txt   = (v) => ({ v: v ?? '', t: 's', s: bg })

        rows.push([
          txt(`#${pv.id.slice(0, 8).toUpperCase()}`),
          txt(idx === 0 ? estado : ''),
          txt(idx === 0 ? fecha : ''),
          txt(idx === 0 ? venc : ''),
          { v: item.codigo || '', t: 's', s: { ...bg, font: { color: { rgb: '4A6CF7' } }, alignment: { horizontal: 'center' } } },
          txt(item.nombre),
          txt(item.modelo || ''),
          num(item.cantidad_total),
          num(item.cantidad_retirada || 0),
          num(item.cantidad_total - (item.cantidad_retirada || 0)),
          money(item.precio_unitario * ivaFactor),
          money(subTotal),
          money(subRet),
          money(subPend),
          idx === 0 ? money(total) : txt(''),
          idx === 0 ? money(pagado) : txt(''),
          idx === 0 ? { v: deuda, t: 'n', z: MONEY_FMT, s: { ...bg, font: { bold: true, color: { rgb: deuda > 0 ? 'CC2244' : '1A7A55' } }, alignment: { horizontal: 'right' } } } : txt(''),
          txt(idx === 0 ? (pv.notas || '') : ''),
        ])
      })

      rows.push([])
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 12 }, { wch: 26 }, { wch: 20 },
      { wch: 12 }, { wch: 12 }, { wch: 12 },
      { wch: 15 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 30 },
    ]
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 17 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 17 } },
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Preventas')
    XLSX.writeFile(wb, `preventas_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  function exportarPDF() {
    const nombreDistribuidor = profile?.razon_social || profile?.full_name || ''

    const bloques = preventas.map(pv => {
      const items = pv.items || []
      const ivaFactor = pv.incluir_iva ? (1 + IVA_PCT) : 1
      const neto = totalPreventa(items)
      const total = neto * ivaFactor
      const pagado = (pv.pagos || []).reduce((s, p) => s + p.monto, 0)
      const deuda = Math.max(0, total - pagado)
      const estado = ESTADO_CONFIG[pv.estado]?.label || pv.estado
      const fecha = new Date(pv.created_at).toLocaleDateString('es-AR')
      const venc = pv.fecha_vencimiento
        ? new Date(pv.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-AR') : null

      const filas = items.map(item => `
        <tr>
          <td class="mono">${item.codigo || ''}</td>
          <td>${item.nombre}</td>
          <td>${item.modelo || ''}</td>
          <td class="num">${item.cantidad_total}</td>
          <td class="num">${item.cantidad_retirada || 0}</td>
          <td class="num">${item.cantidad_total - (item.cantidad_retirada || 0)}</td>
          <td class="num">${formatPrecio(item.precio_unitario * ivaFactor)}</td>
          <td class="num">${formatPrecio(item.precio_unitario * item.cantidad_total * ivaFactor)}</td>
        </tr>`).join('')

      const filasPagos = (pv.pagos || []).map(pg => `
        <div class="pago-row">
          <span>${new Date(pg.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</span>
          <span class="purple fw">${formatPrecio(pg.monto)}</span>
          ${pg.notas ? `<span class="gray">— ${pg.notas}</span>` : ''}
        </div>`).join('')

      return `
        <div class="block">
          <div class="block-head">
            <span class="id">#${pv.id.slice(0, 8).toUpperCase()}</span>
            <span class="badge ${pv.estado}">${estado}</span>
            <span class="gray">${fecha}</span>
            ${venc ? `<span class="gray">Vence: ${venc}</span>` : ''}
            ${pv.incluir_iva ? '<span class="badge iva">IVA incl.</span>' : ''}
          </div>
          ${pv.notas ? `<div class="notas">📝 ${pv.notas}</div>` : ''}
          <table>
            <thead><tr>
              <th>Código</th><th>Producto</th><th>Modelo</th>
              <th class="num">Total</th><th class="num">Retirado</th><th class="num">Pendiente</th>
              <th class="num">P. Unit.</th><th class="num">Subtotal</th>
            </tr></thead>
            <tbody>${filas}</tbody>
          </table>
          <div class="summary">
            <div class="sum-row"><span>Total preventa</span><span>${formatPrecio(total)}</span></div>
            <div class="sum-row"><span>Retirado</span><span class="green">${formatPrecio(totalRetirado(items) * ivaFactor)}</span></div>
            <div class="sum-row"><span>Pendiente</span><span class="yellow">${formatPrecio(totalPendiente(items) * ivaFactor)}</span></div>
            <div class="sum-row"><span>Total pagado</span><span class="purple">${formatPrecio(pagado)}</span></div>
            <div class="sum-row bold"><span>Saldo deudor</span><span class="${deuda > 0 ? 'red' : 'green'}">${formatPrecio(deuda)}</span></div>
          </div>
          ${(pv.pagos || []).length > 0 ? `
            <div class="pagos">
              <div class="pagos-title">Pagos registrados</div>
              ${filasPagos}
            </div>` : ''}
        </div>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
      <title>Mis Preventas — TEMPTECH</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1a1a2e;background:#fff;padding:20px}
        .doc-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:12px;border-bottom:2px solid #1a1a2e}
        .doc-title{font-size:20px;font-weight:800}.doc-sub{font-size:11px;color:#555;margin-top:2px}.doc-date{font-size:10px;color:#999;text-align:right}
        .block{margin-bottom:20px;border:1px solid #ddd;border-radius:6px;overflow:hidden;page-break-inside:avoid}
        .block-head{display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f5f7ff;border-bottom:1px solid #e0e0e0;flex-wrap:wrap}
        .id{font-family:monospace;font-size:12px;font-weight:700;color:#4a6cf7}
        .badge{font-size:9px;font-weight:700;padding:2px 7px;border-radius:10px}
        .badge.activa{background:rgba(61,214,140,.15);color:#1a7a55;border:1px solid rgba(61,214,140,.4)}
        .badge.completada{background:rgba(74,108,247,.12);color:#3a5cc7;border:1px solid rgba(74,108,247,.35)}
        .badge.cancelada{background:rgba(255,85,119,.12);color:#cc2244;border:1px solid rgba(255,85,119,.35)}
        .badge.iva{background:rgba(74,108,247,.1);color:#4a6cf7;border:1px solid rgba(74,108,247,.3)}
        .notas{padding:5px 12px;font-size:10px;color:#444;background:rgba(74,108,247,.04);border-bottom:1px solid #eee;font-style:italic}
        table{width:100%;border-collapse:collapse}
        th{background:#1a1a2e;color:#fff;padding:5px 8px;text-align:left;font-size:10px}
        th.num{text-align:right}td{padding:4px 8px;border-bottom:1px solid #f0f0f0;font-size:10px}
        td.num{text-align:right}td.mono{font-family:monospace;color:#4a6cf7}
        tbody tr:nth-child(even){background:#fafbff}tbody tr:last-child td{border-bottom:none}
        .summary{display:flex;flex-direction:column;gap:2px;padding:8px 12px;background:#fafafa;border-top:1px solid #eee}
        .sum-row{display:flex;justify-content:space-between;font-size:10px;padding:1px 0}
        .sum-row.bold{font-weight:700;font-size:11px;padding-top:4px;border-top:1px solid #ddd;margin-top:2px}
        .fw{font-weight:700}.gray{color:#666}.green{color:#1a7a55;font-weight:700}.yellow{color:#b8860b;font-weight:700}
        .purple{color:#6d28d9;font-weight:700}.red{color:#cc2244;font-weight:700}
        .pagos{padding:8px 12px;border-top:1px solid #eee}
        .pagos-title{font-size:9px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
        .pago-row{display:flex;gap:10px;font-size:10px;padding:2px 0}
        @media print{body{padding:10px}.block{page-break-inside:avoid}}
      </style></head><body>
      <div class="doc-header">
        <div>
          <div class="doc-title">TEMPTECH — Mis Preventas</div>
          ${nombreDistribuidor ? `<div class="doc-sub">${nombreDistribuidor}</div>` : ''}
        </div>
        <div class="doc-date">Exportado: ${new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      </div>
      ${bloques}
      <script>window.onload=()=>window.print()<\/script>
    </body></html>`

    const w = window.open('', '_blank', 'width=960,height=700')
    if (!w) { toast.error('Permitir ventanas emergentes para exportar'); return }
    w.document.write(html)
    w.document.close()
  }

  if (!isDistributor) return null

  return (
    <div style={{ animation: 'fadeUp 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800 }}>Mis Preventas</h1>
          <p style={{ color: 'var(--text3)', marginTop: 4, fontSize: 13 }}>Historial de preventas y pagos</p>
        </div>
        {preventas.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={exportarPDF}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,85,119,0.08)', color: '#ff5577', border: '1px solid rgba(255,85,119,0.3)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              📄 PDF
            </button>
            <button
              onClick={exportarExcel}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(61,214,140,0.08)', color: '#3dd68c', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 'var(--radius)', padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font)' }}
            >
              📊 Excel
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {['todos', 'activa', 'completada', 'cancelada'].map(f => {
          const cfg = ESTADO_CONFIG[f]
          return (
            <button key={f} onClick={() => setFiltroEstado(f)} style={{
              padding: '6px 16px', borderRadius: 'var(--radius)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
              background: filtroEstado === f ? (cfg?.bg || 'var(--surface3)') : 'var(--surface)',
              color: filtroEstado === f ? (cfg?.color || 'var(--text)') : 'var(--text3)',
              border: filtroEstado === f ? `1px solid ${cfg?.border || 'var(--border)'}` : '1px solid var(--border)',
            }}>
              {f === 'todos' ? 'Todas' : cfg?.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>Cargando preventas...</div>
      ) : preventas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text3)' }}>No hay preventas para mostrar.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {preventas.map(pv => {
            const cfg = ESTADO_CONFIG[pv.estado] || ESTADO_CONFIG.activa
            const abierta = expandida === pv.id
            const items = pv.items || []
            const neto = totalPreventa(items)
            const total = pv.incluir_iva ? neto + (pv.iva_monto || neto * IVA_PCT) : neto
            const retiradoNeto = totalRetirado(items)
            const retirado = neto > 0 && pv.incluir_iva ? retiradoNeto * (total / neto) : retiradoNeto
            const pct = neto > 0 ? Math.min(100, Math.round((retiradoNeto / neto) * 100)) : 0
            const pagado = (pv.pagos || []).reduce((s, p) => s + p.monto, 0)
            const deuda = Math.max(0, total - pagado)

            return (
              <div key={pv.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandida(abierta ? null : pv.id)}
                  style={{ padding: '14px 20px', borderBottom: abierta ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '3px 8px', borderRadius: 4 }}>
                      #{pv.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{cfg.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                        Retirado: <span style={{ color: '#3dd68c', fontWeight: 700 }}>{formatPrecio(retirado)}</span>
                        {' / '}
                        <span style={{ fontWeight: 700 }}>{formatPrecio(total)}</span>
                        {total > 0 && <span style={{ marginLeft: 6, color: '#3dd68c', fontWeight: 700 }}>({pct}%)</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', marginTop: 2 }}>
                        {pv.incluir_iva && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#7b9fff', background: 'rgba(74,108,247,0.12)', border: '1px solid rgba(74,108,247,0.3)', padding: '1px 7px', borderRadius: 10 }}>IVA incl.</span>
                        )}
                        {deuda > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#ff5577', background: 'rgba(255,85,119,0.1)', border: '1px solid rgba(255,85,119,0.3)', padding: '1px 7px', borderRadius: 10 }}>
                            Saldo: {formatPrecio(deuda)}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ color: 'var(--text3)', fontSize: 14 }}>{abierta ? '▲' : '▼'}</span>
                  </div>
                </div>

                {abierta && (
                  <div style={{ padding: '16px 20px' }}>
                    {/* Productos */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                      {items.map((item, i) => {
                        const ret = item.cantidad_retirada || 0
                        const pend = item.cantidad_total - ret
                        const pctItem = item.cantidad_total > 0 ? (ret / item.cantidad_total) * 100 : 0
                        return (
                          <div key={i} style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
                              <div>
                                <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#7b9fff', background: 'rgba(74,108,247,0.1)', padding: '1px 6px', borderRadius: 4, marginRight: 6 }}>{item.codigo}</span>
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{item.nombre}</span>
                                <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 6 }}>{item.modelo}</span>
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{formatPrecio(item.precio_unitario)} c/u</div>
                            </div>
                            <div style={{ height: 5, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
                              <div style={{ height: '100%', width: `${pctItem}%`, background: pctItem >= 100 ? '#3dd68c' : 'var(--brand-gradient)', borderRadius: 3 }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text3)' }}>
                              <span>Retirado: <strong style={{ color: '#3dd68c' }}>{ret}</strong> / {item.cantidad_total}</span>
                              <span>Pendiente: <strong style={{ color: pend > 0 ? '#ffd166' : 'var(--text3)' }}>{pend}</strong></span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Totales */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                      {(() => {
                        const ivaFactor = pv.incluir_iva ? (1 + IVA_PCT) : 1
                        return [
                          { label: 'Total preventa', value: totalPreventa(items) * ivaFactor, color: 'var(--text)' },
                          { label: 'Retirado', value: totalRetirado(items) * ivaFactor, color: '#3dd68c' },
                          { label: 'Pendiente', value: totalPendiente(items) * ivaFactor, color: '#ffd166' },
                        ]
                      })().map(({ label, value, color }) => (
                        <div key={label} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color }}>{formatPrecio(value)}</div>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <button
                        onClick={() => imprimirSaldo(pv)}
                        style={{ background: 'rgba(255,107,43,0.1)', color: '#ff6b2b', border: '1px solid rgba(255,107,43,0.35)', borderRadius: 'var(--radius)', padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        🖨️ Saldo Pendiente
                      </button>
                    </div>

                    {pv.notas && (
                      <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(74,108,247,0.06)', border: '1px solid rgba(74,108,247,0.2)', borderRadius: 'var(--radius)', fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: '#7b9fff' }}>Notas: </span>{pv.notas}
                      </div>
                    )}

                    {/* Pagos */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>💳 Pagos</div>
                        {pv.estado === 'activa' && agregandoPago !== pv.id && (
                          <button
                            onClick={e => { e.stopPropagation(); setAgregandoPago(pv.id); setPagoFecha(new Date().toISOString().split('T')[0]) }}
                            style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 'var(--radius)', padding: '4px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}
                          >
                            + Registrar pago
                          </button>
                        )}
                      </div>

                      {(pv.pagos || []).length === 0 ? (
                        <div style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 0', marginBottom: 10 }}>Sin pagos registrados.</div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                          {(pv.pagos || []).map(pago => (
                            <div key={pago.id} style={{ padding: '8px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, color: '#a78bfa', fontSize: 13 }}>{formatPrecio(pago.monto)}</span>
                                <span style={{ color: 'var(--text3)', fontSize: 11 }}>{new Date(pago.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</span>
                                {pago.notas && <span style={{ color: 'var(--text2)', fontSize: 11 }}>— {pago.notas}</span>}
                                {pago.comprobante_url && (
                                  <a href={pago.comprobante_url} target="_blank" rel="noreferrer" style={{ color: '#7b9fff', textDecoration: 'none', fontWeight: 600, fontSize: 11 }}>
                                    📎 Comprobante
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {agregandoPago === pv.id && (
                        <div style={{ padding: '14px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 'var(--radius)', marginBottom: 12 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Monto *</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 11, color: 'var(--text3)' }}>$</span>
                                <input type="number" min="0" step="0.01" value={pagoMonto} onChange={e => setPagoMonto(e.target.value)}
                                  placeholder="0.00" autoFocus
                                  style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)', fontWeight: 700 }} />
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Fecha</div>
                              <input type="date" value={pagoFecha} onChange={e => setPagoFecha(e.target.value)}
                                style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 13, outline: 'none', fontFamily: 'var(--font)' }} />
                            </div>
                          </div>
                          <div style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Descripción / referencia (opcional)</div>
                            <input type="text" value={pagoNotas} onChange={e => setPagoNotas(e.target.value)} placeholder="Transferencia, efectivo, cheque..."
                              style={{ width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', color: 'var(--text)', fontSize: 12, outline: 'none', fontFamily: 'var(--font)' }} />
                          </div>
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 10, color: 'var(--text3)', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Comprobante (opcional)</div>
                            {pagoComprobante ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'rgba(61,214,140,0.07)', border: '1px solid rgba(61,214,140,0.3)', borderRadius: 6, fontSize: 12 }}>
                                <span style={{ flex: 1, color: '#3dd68c', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📄 {pagoComprobante.name}</span>
                                <button onClick={() => setPagoComprobante(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 13, padding: 0 }}>✕</button>
                              </div>
                            ) : (
                              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 11, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: 600 }}>
                                📎 Adjuntar comprobante
                                <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={e => setPagoComprobante(e.target.files[0] || null)} />
                              </label>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => registrarPago(pv)} disabled={registrandoPago || subiendoPagoComp || !pagoMonto}
                              style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.35)', borderRadius: 'var(--radius)', padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: !pagoMonto ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', opacity: !pagoMonto ? 0.5 : 1 }}>
                              {subiendoPagoComp ? 'Subiendo...' : registrandoPago ? 'Registrando...' : '✓ Confirmar pago'}
                            </button>
                            <button onClick={() => { setAgregandoPago(null); setPagoMonto(''); setPagoFecha(''); setPagoNotas(''); setPagoComprobante(null) }}
                              style={{ background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '7px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)' }}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Total pagado</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: '#a78bfa' }}>{formatPrecio(pagado)}</div>
                        </div>
                        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Saldo deudor</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: deuda > 0 ? '#ff5577' : '#3dd68c' }}>{formatPrecio(deuda)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
