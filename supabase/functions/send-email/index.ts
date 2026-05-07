// supabase/functions/send-email/index.ts
// Deploy: supabase functions deploy send-email

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const FROM_EMAIL = 'TEMPTECH <noreply@temptech.com.ar>'
const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL') || 'soporte@temptech.com.ar'
const APP_URL = Deno.env.get('APP_URL') || 'https://portal.temptech.com.ar'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  })
  return res.ok
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

    return new Response(JSON.stringify({ ok }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
