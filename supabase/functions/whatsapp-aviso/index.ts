// supabase/functions/whatsapp-aviso/index.ts
// Envía un aviso de logística por WhatsApp usando la Meta Cloud API (plantilla aprobada).
// Deploy: supabase functions deploy whatsapp-aviso
// Secrets necesarios:
//   supabase secrets set WHATSAPP_TOKEN=<token permanente de la app de Meta>
//   supabase secrets set WHATSAPP_PHONE_ID=<Phone number ID del número de la WABA>
//   (opcionales) WHATSAPP_TEMPLATE=aviso_logistica  WHATSAPP_LANG=es_AR

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const TOKEN = Deno.env.get('WHATSAPP_TOKEN') || ''
const PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID') || ''
const TEMPLATE = Deno.env.get('WHATSAPP_TEMPLATE') || 'aviso_logistica'
const LANG = Deno.env.get('WHATSAPP_LANG') || 'es_AR'
const GRAPH = 'https://graph.facebook.com/v21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Normaliza un teléfono argentino al formato E.164 sin "+" que espera WhatsApp (54 9 + área + número)
function waNum(raw: string) {
  let d = String(raw || '').replace(/\D/g, '').replace(/^0+/, '')
  if (!d) return ''
  if (d.startsWith('54')) { let r = d.slice(2).replace(/^0/, ''); if (!r.startsWith('9')) r = '9' + r; return '54' + r }
  d = d.replace(/^15/, '')
  return '549' + d
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    if (!TOKEN || !PHONE_ID) {
      return new Response(JSON.stringify({ ok: false, error: 'Falta configurar WHATSAPP_TOKEN / WHATSAPP_PHONE_ID en los secrets.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const { telefono, nombre, fecha, direccion } = await req.json()
    const to = waNum(telefono)
    if (!to) return new Response(JSON.stringify({ ok: false, error: 'Teléfono inválido o vacío.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const params = [nombre || 'Cliente', fecha || 'los próximos días', direccion || 'tu domicilio']
      .map((t) => ({ type: 'text', text: String(t).slice(0, 300) }))

    const res = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: { name: TEMPLATE, language: { code: LANG }, components: [{ type: 'body', parameters: params }] },
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = body?.error?.message || `Meta ${res.status}`
      return new Response(JSON.stringify({ ok: false, error: msg }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ ok: true, id: body?.messages?.[0]?.id || null }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String((e as Error).message || e) }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
