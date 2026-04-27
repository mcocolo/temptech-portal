import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// EAN → código de producto portal
const EAN_MAP: Record<string, string> = {
  '0726798313312': 'C250STV1',
  '0726798313329': 'C250STV1TS',
  '0726798313336': 'C250STV1TD',
  '0726798313343': 'C500STV1',
  '0726798313350': 'C500STV1TS',
  '0726798313367': 'C500STV1TD',
  '0726798313374': 'F1400BCO',
  '0726798313381': 'F1400MV',
  '0726798313398': 'F1400MR',
  '0726798313404': 'F1400PA',
  '0793969172153': 'C500STV1X2',
  '0793969172160': 'F1400PR',
  '0793969172177': 'F1400SMARTBL',
  '0793969172184': 'C500STV1MB',
  '0793969172207': 'F1400MTG',
  '0793969172214': 'F1400PCL',
  '0793969172221': 'F1400MCO',
  '0793969172238': 'KF70SIL',
  '0793969172245': 'FE150TBL',
  '0610985266935': 'FE150TBLACK',
  '0610985266942': 'FE150TSIL',
  '0610985266959': 'FM318BL',
  '0610985266966': 'FM324BL',
  '0610985266973': 'BF14EBL',
  '0610985266980': 'BF323EBL',
  '0793969172191': 'K40010',
  '0610985266997': 'K40011',
  '0610985267000': 'DT4',
  '0610985267017': 'DT4W',
  '0610985267024': 'K1002',
  '0610985267031': 'K2002',
  '0610985267048': 'DT4-1',
  '0610985267062': 'F1400MB',
  '0610985267079': 'B250',
}

// Etiqueta corta para mostrar en logística
const LABEL_MAP: Record<string, string> = {
  C250STV1: '250w', C250STV1TS: 'B250', C250STV1TD: 'B250TD',
  C500STV1: '500w', C500STV1TS: 'B500w', C500STV1TD: 'B500wTD',
  C500STV1MB: '500wMB', C500STV1X2: '500wx2',
  F1400BCO: '1400w', F1400MV: '1400wMV', F1400MR: '1400wMR',
  F1400PA: '1400wPA', F1400PR: '1400wPR', F1400SMARTBL: 'SMART',
  F1400MB: '1400wMB', F1400MTG: '1400wMTG', F1400PCL: '1400wPCL', F1400MCO: '1400wMCO',
  KF70SIL: 'KF70', FE150TBL: 'FE150BI', FE150TBLACK: 'E150BLAC', FE150TSIL: 'FE150SIL',
  FM318BL: 'FM318', FM324BL: 'FM324', BF14EBL: 'BF14', BF323EBL: 'BF23',
  K40010: 'K40010', K40011: 'K40011', DT4: 'DT4', DT4W: 'DT4W',
  K1002: 'K1002', K2002: 'K2002', 'DT4-1': 'DT4-1', B250: 'B250',
}

serve(async (req) => {
  if (req.method === 'GET') {
    return new Response('OK', { status: 200 })
  }

  try {
    const body = await req.json()

    if (body.event !== 'order/paid') {
      return new Response(JSON.stringify({ skipped: body.event }), { status: 200 })
    }

    const TN_TOKEN    = Deno.env.get('TIENDANUBE_TOKEN')!
    const TN_STORE_ID = Deno.env.get('TIENDANUBE_STORE_ID')!

    const orderRes = await fetch(
      `https://api.tiendanube.com/v1/${TN_STORE_ID}/orders/${body.id}`,
      {
        headers: {
          'Authentication': `bearer ${TN_TOKEN}`,
          'User-Agent': 'TempTech Portal (info@temptech.com.ar)',
        },
      }
    )
    if (!orderRes.ok) {
      console.error('Tiendanube API error:', await orderRes.text())
      return new Response('TN API error', { status: 502 })
    }
    const order = await orderRes.json()

    // Mapear productos por EAN o SKU
    const productos = (order.products || [])
      .map((p: any) => {
        const ean = p.barcode || p.sku || ''
        const codigo = EAN_MAP[ean] ?? ean
        const label  = LABEL_MAP[codigo] ?? codigo
        return { codigo, label, cantidad: p.quantity ?? 1, nombre_tn: p.name ?? codigo }
      })
      .filter((p: any) => p.codigo && p.cantidad > 0)

    const shipping = order.shipping_address || {}
    const customer = order.customer || {}
    const fecha    = new Date().toISOString().split('T')[0]

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verificar si ya existe una venta con este nro_orden (evitar duplicados)
    const nroOrden = `TN-${order.number}`
    const { data: existente } = await supabase
      .from('ventas')
      .select('id')
      .eq('nro_orden', nroOrden)
      .maybeSingle()

    if (existente) {
      console.log(`⚠️ Pedido ${nroOrden} ya existe en ventas, skipping`)
      return new Response(JSON.stringify({ ok: true, skipped: 'duplicate', order: order.number }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // Obtener nombres completos de stock_pt
    const codigos = productos.map((p: any) => p.codigo)
    const { data: stockItems } = await supabase
      .from('stock_pt')
      .select('codigo, nombre, modelo')
      .in('codigo', codigos)

    const stockMap: Record<string, { nombre: string; modelo: string }> = {}
    for (const s of stockItems || []) {
      stockMap[s.codigo] = { nombre: s.nombre, modelo: s.modelo || '' }
    }

    // Items para la venta
    const items = productos.map((p: any) => ({
      codigo: p.codigo,
      nombre: stockMap[p.codigo]?.nombre || p.nombre_tn || p.codigo,
      modelo: stockMap[p.codigo]?.modelo || '',
      cantidad: p.cantidad,
      precio_unitario: 0,
    }))

    // 1. Crear venta en portal (Pedidos Página)
    const { error: ventaError } = await supabase.from('ventas').insert({
      canal: 'pagina',
      nro_orden: nroOrden,
      cliente_nombre: customer.name || nroOrden,
      cliente_email: customer.email || null,
      cliente_telefono: customer.phone || null,
      items,
      total: parseFloat(order.total) || 0,
      estado: 'pendiente',
      observaciones: `Pedido Tiendanube #${order.number}`,
      tipo_envio: shipping.address ? 'logistica' : null,
      envio_etiquetas: shipping.address ? items.map((it: any) => ({ ...it })) : [],
      stock_descontado: false,
      usuario_nombre: 'Tiendanube',
      updated_at: new Date().toISOString(),
    })

    if (ventaError) {
      console.error('Error al insertar venta:', ventaError)
    } else {
      console.log(`✅ Venta creada en portal: ${nroOrden}`)
    }

    // 2. Calcular orden logística (al final de la lista del día)
    const { data: last } = await supabase
      .from('logistica_diaria')
      .select('orden')
      .eq('fecha', fecha)
      .order('orden', { ascending: false })
      .limit(1)
    const orden = last?.[0]?.orden != null ? last[0].orden + 1 : 0

    const direccion = [shipping.address, shipping.number, shipping.floor]
      .filter(Boolean).join(' ')

    // 3. Crear entrada en logística diaria
    await supabase.from('logistica_diaria').insert({
      fecha,
      tipo: 'entrega_pt',
      nombre: `${customer.name ?? ''} — ${nroOrden}`,
      direccion: direccion || null,
      localidad: shipping.city || null,
      zona: shipping.province || null,
      telefono: customer.phone || null,
      email: customer.email || null,
      productos: productos.map((p: any) => ({ codigo: p.codigo, label: p.label, cantidad: p.cantidad })),
      notas: `Pedido Tiendanube #${order.number}`,
      orden,
    })

    console.log(`✅ Logística creada: ${nroOrden} — ${customer.name}`)
    return new Response(JSON.stringify({ ok: true, order: order.number }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 })
  }
})
