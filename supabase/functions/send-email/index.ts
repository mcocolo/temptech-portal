// supabase/functions/send-email/index.ts
// Deploy: supabase functions deploy send-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'TEMPTECH <noreply@temptech.com.ar>'
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'soporte@temptech.com.ar'
const APP_URL = Deno.env.get('APP_URL') || 'https://portal.temptech.com.ar'
const LOGO_URL = 'https://edddvxqlvwgexictsnmn.supabase.co/storage/v1/object/public/Imagenes/Imagen-Corporativa/Temptech_LogoHorizontal.png'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Attachment = { filename: string; content: string }

async function sendEmail(
  { to, subject, html, attachments }:
  { to: string; subject: string; html: string; attachments?: Attachment[] }
) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      ...(attachments && attachments.length ? { attachments } : {}),
    }),
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Resend ${res.status}: ${errBody}`)
  }
  return true
}

function fmtARS(n: number) {
  return '$ ' + new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(Math.round(n || 0))
}

// Plantilla clara alineada a la marca (fondo blanco, logo oficial, azul marino)
function brandTemplate(content: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f4f5f7; color: #2a2f3a; margin: 0; padding: 0; }
      .wrap { max-width: 600px; margin: 0 auto; padding: 32px 20px; }
      .head { text-align: center; margin-bottom: 22px; }
      .head img { height: 42px; }
      .card { background: #ffffff; border: 1px solid #e6e8ec; border-radius: 12px; padding: 28px 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
      h2 { font-size: 20px; margin: 0 0 14px; color: #25374d; font-weight: 800; }
      p { font-size: 14px; color: #5a6473; line-height: 1.7; margin: 0 0 12px; }
      .highlight { color: #25374d; font-weight: 700; }
      .footer { font-size: 12px; color: #9aa2af; text-align: center; margin-top: 20px; }
    </style>
    </head>
    <body>
      <div class="wrap">
        <div class="head"><img src="${LOGO_URL}" alt="TEMPTECH"></div>
        ${content}
        <div class="footer">© ${new Date().getFullYear()} TEMPTECH · Portal de Atención al Cliente</div>
      </div>
    </body>
    </html>
  `
}

function baseTemplate(content: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8">
    <style>
      body { font-family: -apple-system, sans-serif; background: #0e0f13; color: #e8eaf0; margin: 0; padding: 0; }
      .wrap { max-width: 560px; margin: 0 auto; padding: 40px 24px; }
      .logo { font-size: 26px; font-weight: 800; letter-spacing: -1px; margin-bottom: 32px; }
      .logo span { color: #ff6b2b; }
      .card { background: #161820; border: 1px solid #252836; border-radius: 12px; padding: 28px; margin-bottom: 24px; }
      h2 { font-size: 20px; margin: 0 0 12px; }
      p { font-size: 14px; color: #9196a8; line-height: 1.7; margin: 0 0 12px; }
      .highlight { color: #e8eaf0; font-weight: 600; }
      .btn { display: inline-block; background: #ff6b2b; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 16px; }
      .footer { font-size: 12px; color: #555b70; text-align: center; }
    </style>
    </head>
    <body>
      <div class="wrap">
        <div class="logo"><span>TEMP</span>TECH</div>
        ${content}
        <div class="footer">© ${new Date().getFullYear()} TEMPTECH · Portal de Atención al Cliente</div>
      </div>
    </body>
    </html>
  `
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { type, data } = await req.json()
    let ok = false

    if (type === 'new_post') {
      ok = await sendEmail({
        to: ADMIN_EMAIL,
        subject: `💬 Nueva consulta: ${data.title}`,
        html: baseTemplate(`
          <div class="card">
            <h2>Nueva consulta publicada</h2>
            <p>El usuario <span class="highlight">${data.authorName}</span> publicó una nueva consulta en el foro.</p>
            <p><strong>Categoría:</strong> ${data.category}</p>
            <p><strong>Consulta:</strong> ${data.title}</p>
            <a href="${APP_URL}/admin" class="btn">Ver en el Panel Admin →</a>
          </div>
        `),
      })
    }

    else if (type === 'new_reply') {
      ok = await sendEmail({
        to: data.recipientEmail,
        subject: `💬 Nueva respuesta en tu consulta`,
        html: baseTemplate(`
          <div class="card">
            <h2>Recibiste una respuesta</h2>
            <p><span class="highlight">${data.replyAuthor}</span> respondió tu consulta <span class="highlight">"${data.postTitle}"</span>.</p>
            <p style="background:#1e2130;padding:14px;border-radius:8px;color:#c8cad4">"${data.replyText}${data.replyText.length >= 200 ? '...' : ''}"</p>
            <a href="${APP_URL}/foro" class="btn">Ver en el foro →</a>
          </div>
        `),
      })
    }

    else if (type === 'new_reclamo') {
      ok = await sendEmail({
        to: ADMIN_EMAIL,
        subject: `⚠️ Nuevo caso [${data.priority?.toUpperCase()}]: ${data.title}`,
        html: baseTemplate(`
          <div class="card">
            <h2>Nuevo caso registrado</h2>
            <p>El cliente <span class="highlight">${data.authorName}</span> registró un nuevo caso.</p>
            <p><strong>Tipo:</strong> ${data.title}</p>
            <p><strong>Prioridad:</strong> <span style="color:${data.priority === 'high' ? '#ff4d6d' : data.priority === 'medium' ? '#ffd166' : '#9196a8'}">${data.priority}</span></p>
            <a href="${APP_URL}/admin" class="btn">Gestionar caso →</a>
          </div>
        `),
      })
    }

    else if (type === 'reclamo_update') {
      const statusLabel: Record<string, string> = { open: 'Abierto', in_progress: 'En proceso', closed: 'Resuelto ✓' }
      ok = await sendEmail({
        to: data.recipientEmail,
        subject: `📋 Tu caso fue actualizado — ${statusLabel[data.newStatus] || data.newStatus}`,
        html: baseTemplate(`
          <div class="card">
            <h2>Actualización de tu caso</h2>
            <p>El estado de tu caso <span class="highlight">#${data.reclamoId?.slice(0,8).toUpperCase()}</span> fue actualizado.</p>
            <p><strong>Nuevo estado:</strong> <span class="highlight">${statusLabel[data.newStatus] || data.newStatus}</span></p>
            ${data.adminNote ? `<p style="background:#1e2130;padding:14px;border-radius:8px;color:#c8cad4"><strong>Nota del equipo:</strong><br>${data.adminNote}</p>` : ''}
            <a href="${APP_URL}/reclamos" class="btn">Ver mis casos →</a>
          </div>
        `),
      })
    }

    else if (type === 'resolucion') {
      ok = await sendEmail({
        to: data.to,
        subject: data.subject,
        html: baseTemplate(`
          <div class="card">
            <h2>${data.subject}</h2>
            <p style="background:#1e2130;padding:16px;border-radius:8px;color:#c8cad4;line-height:1.8;white-space:pre-line">${data.text}</p>
            <a href="${APP_URL}/reclamos" class="btn">Ver mi caso →</a>
          </div>
        `),
      })
    }

    else if (type === 'presupuesto') {
      const rows = (data.items || []).map((it: any) => `
        <tr>
          <td style="padding:8px 8px;border-bottom:1px solid #eceef1;font-family:monospace;color:#25374d;font-size:12px">${it.codigo || ''}</td>
          <td style="padding:8px 8px;border-bottom:1px solid #eceef1;color:#2a2f3a">${it.nombre || ''}${it.modelo ? ` <span style="color:#8a93a3">${it.modelo}</span>` : ''}</td>
          <td style="padding:8px 8px;border-bottom:1px solid #eceef1;text-align:center;color:#2a2f3a">${it.cantidad ?? ''}</td>
          <td style="padding:8px 8px;border-bottom:1px solid #eceef1;text-align:right;color:${it.descuento_pct > 0 ? '#2e9e6b' : '#8a93a3'}">${it.descuento_pct > 0 ? `${it.descuento_pct}%` : '—'}</td>
          <td style="padding:8px 8px;border-bottom:1px solid #eceef1;text-align:right;color:#2a2f3a">${fmtARS(it.precio_unitario)}</td>
          <td style="padding:8px 8px;border-bottom:1px solid #eceef1;text-align:right;font-weight:700;color:#25374d">${fmtARS(it.subtotal)}</td>
        </tr>`).join('')

      const totalesHtml = data.incluirIVA
        ? `<p style="text-align:right;margin:14px 0 0">
             <span style="color:#8a93a3">Neto: ${fmtARS(data.totalNeto)}</span><br>
             <span style="color:#8a93a3">IVA (21%): ${fmtARS(data.ivaMonto)}</span><br>
             <span style="font-size:18px;font-weight:800;color:#25374d">Total c/IVA: ${fmtARS(data.total)}</span>
           </p>`
        : `<p style="text-align:right;margin:14px 0 0;font-size:18px;font-weight:800;color:#25374d">Total: ${fmtARS(data.total)}</p>`

      ok = await sendEmail({
        to: data.to,
        subject: `TEMPTECH - Presupuesto${data.clienteNombre ? ` ${data.clienteNombre}` : ''}`,
        html: brandTemplate(`
          <div class="card">
            <h2>Presupuesto</h2>
            <p>Hola${data.clienteNombre ? ` <span class="highlight">${data.clienteNombre}</span>` : ''}, te enviamos el presupuesto solicitado. También lo adjuntamos en PDF.</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-top:12px">
              <thead>
                <tr style="background:#25374d;color:#ffffff;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">
                  <th style="padding:9px 8px;border-radius:6px 0 0 0">Código</th><th style="padding:9px 8px">Producto</th>
                  <th style="padding:9px 8px;text-align:center">Cant.</th><th style="padding:9px 8px;text-align:right">Desc.</th>
                  <th style="padding:9px 8px;text-align:right">P. Unit.</th><th style="padding:9px 8px;text-align:right;border-radius:0 6px 0 0">Subtotal</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
            ${totalesHtml}
            ${data.notas ? `<p style="background:#f4f6f8;padding:14px;border-radius:8px;color:#5a6473;margin-top:16px"><strong style="color:#25374d">Condiciones:</strong> ${data.notas}</p>` : ''}
            <p style="font-size:12px;color:#9aa2af;margin-top:16px">Validez: 7 días corridos. Precios sujetos a disponibilidad de stock.</p>
          </div>
        `),
        attachments: data.attachment && data.attachment.content
          ? [{ filename: data.attachment.filename || 'Presupuesto-TEMPTECH.pdf', content: data.attachment.content }]
          : undefined,
      })
    }

    else if (type === 'nota_cliente') {
      ok = await sendEmail({
        to: ADMIN_EMAIL,
        subject: `💬 Nueva nota del cliente — ${data.trackingId}`,
        html: baseTemplate(`
          <div class="card">
            <h2>El cliente envió una nota</h2>
            <p><span class="highlight">${data.nombre || data.email || 'Cliente'}</span> agregó una nota en el caso <span class="highlight">${data.trackingId}</span>${data.producto ? ` (${data.producto})` : ''}.</p>
            <p style="background:#1e2130;padding:14px;border-radius:8px;color:#c8cad4;white-space:pre-line">${data.nota}</p>
            <a href="${APP_URL}/reclamos?tracking=${data.trackingId}" class="btn">Ver el caso →</a>
          </div>
        `),
      })
    }

    else if (type === 'nota_caso') {
      ok = await sendEmail({
        to: data.recipientEmail,
        subject: `📋 Actualización en tu caso de garantía — ${data.trackingId}`,
        html: baseTemplate(`
          <div class="card">
            <h2>Hay una actualización en tu caso</h2>
            <p>El equipo de <span class="highlight">TEMPTECH</span> agregó una nota a tu caso <span class="highlight">${data.trackingId}</span>.</p>
            <p style="background:#1e2130;padding:16px;border-radius:8px;color:#c8cad4;line-height:1.8">${data.nota}</p>
            <a href="${APP_URL}/reclamos" class="btn">Ver mi caso →</a>
          </div>
        `),
      })
    }

    else if (type === 'alta_reclamo') {
      const filas = [
        data.producto   && `<tr><td style="color:#9196a8;padding:6px 0">Producto</td><td style="color:#e8eaf0;font-weight:600;padding:6px 0 6px 16px">${data.producto}</td></tr>`,
        data.motivo     && `<tr><td style="color:#9196a8;padding:6px 0">Motivo</td><td style="color:#e8eaf0;padding:6px 0 6px 16px">${data.motivo}</td></tr>`,
        data.canal      && `<tr><td style="color:#9196a8;padding:6px 0">Canal de compra</td><td style="color:#e8eaf0;padding:6px 0 6px 16px">${data.canal}</td></tr>`,
        data.ventaManual && `<tr><td style="color:#9196a8;padding:6px 0">N° de venta</td><td style="color:#e8eaf0;padding:6px 0 6px 16px">${data.ventaManual}</td></tr>`,
        data.fechaCompra && `<tr><td style="color:#9196a8;padding:6px 0">Fecha de compra</td><td style="color:#e8eaf0;padding:6px 0 6px 16px">${data.fechaCompra}</td></tr>`,
        data.diasGarantia != null && `<tr><td style="color:#9196a8;padding:6px 0">Días en garantía</td><td style="color:#e8eaf0;padding:6px 0 6px 16px">${data.diasGarantia} días</td></tr>`,
        data.telefono   && `<tr><td style="color:#9196a8;padding:6px 0">Teléfono</td><td style="color:#e8eaf0;padding:6px 0 6px 16px">${data.telefono}</td></tr>`,
        data.localidad  && `<tr><td style="color:#9196a8;padding:6px 0">Localidad</td><td style="color:#e8eaf0;padding:6px 0 6px 16px">${data.localidad}${data.provincia ? `, ${data.provincia}` : ''}</td></tr>`,
      ].filter(Boolean).join('')
      ok = await sendEmail({
        to: data.email,
        subject: `✅ Caso registrado — ${data.trackingId}`,
        html: baseTemplate(`
          <div class="card">
            <h2>Tu caso fue registrado ✅</h2>
            <p>Hola <span class="highlight">${data.nombre || ''}</span>, recibimos tu caso de garantía y lo estamos procesando.</p>
            <div style="background:#1e2130;border-radius:10px;padding:16px 20px;margin:16px 0">
              <div style="font-size:12px;color:#555b70;margin-bottom:4px">N° de seguimiento</div>
              <div style="font-family:monospace;font-size:22px;font-weight:800;color:#ff6b2b;letter-spacing:2px">${data.trackingId}</div>
              <div style="font-size:12px;color:#555b70;margin-top:8px">Ingresado el ${data.fechaIngreso || ''}</div>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px">${filas}</table>
            ${data.descripcion ? `<div style="background:#1e2130;padding:14px;border-radius:8px;color:#c8cad4;font-size:13px;line-height:1.7;margin-bottom:12px"><strong style="color:#9196a8">Descripción:</strong><br>${data.descripcion}</div>` : ''}
            <p style="font-size:13px">Te notificaremos cuando haya novedades. Podés seguir el estado de tu caso en el portal.</p>
            <a href="${APP_URL}/reclamos" class="btn">Ver mi caso →</a>
          </div>
        `),
      })
      // Notificar al equipo admin también
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `⚠️ Nuevo caso de garantía — ${data.trackingId}`,
        html: baseTemplate(`
          <div class="card">
            <h2>Nuevo caso ingresado</h2>
            <p><span class="highlight">${data.nombre || data.email}</span> registró un caso de garantía.</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px">${filas}</table>
            <a href="${APP_URL}/admin" class="btn">Ver en panel admin →</a>
          </div>
        `),
      })
    }

    return new Response(JSON.stringify({ ok }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('send-email ERROR:', msg)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
