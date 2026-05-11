import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_URL = Deno.env.get('APP_URL') || 'https://portal.temptech.com.ar'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, full_name, razon_social, cuit, telefono, localidad, provincia } = await req.json()

    if (!email) return new Response(JSON.stringify({ error: 'Email requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Genera el link de invitación sin que Supabase envíe el email
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        data: {
          full_name: full_name || '',
          user_type: 'distributor',
          razon_social: razon_social || '',
          cuit: cuit || '',
          telefono: telefono || '',
          localidad: localidad || '',
          provincia: provincia || '',
        },
      },
    })

    if (linkError) return new Response(JSON.stringify({ error: linkError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const inviteUrl = linkData?.properties?.action_link

    // Actualizar profile con los datos adicionales
    if (linkData?.user?.id) {
      await supabaseAdmin.from('profiles').update({
        full_name: full_name || '',
        razon_social: razon_social || '',
        cuit: cuit || '',
        telefono: telefono || '',
        localidad: localidad || '',
        provincia: provincia || '',
        user_type: 'distributor',
      }).eq('id', linkData.user.id)
    }

    // Enviar email usando la función send-email (que ya tiene Resend configurado)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        type: 'resolucion',
        data: {
          to: email,
          subject: 'Invitación al Portal TEMPTECH',
          text: `Hola ${full_name || email},\n\nFuiste invitado como distribuidor al Portal de Atención TEMPTECH.\n\nHacé clic en el siguiente link para activar tu cuenta y configurar tu contraseña:\n\n${inviteUrl}\n\nEl link expira en 24 horas.`,
        },
      }),
    })

    if (!emailRes.ok) {
      const emailErr = await emailRes.text()
      return new Response(JSON.stringify({ error: 'Error enviando email: ' + emailErr }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
