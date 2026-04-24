import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { email, full_name, razon_social, cuit, telefono, localidad, provincia } = await req.json()

    if (!email) return new Response(JSON.stringify({ error: 'Email requerido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const supabaseAdmin = createClient(
      Denun vendedor quiere o.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        full_name: full_name || '',
        user_type: 'distributor',
        razon_social: razon_social || '',
        cuit: cuit || '',
        telefono: telefono || '',
        localidad: localidad || '',
        provincia: provincia || '',
      },
    })

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Actualizar profile con los datos adicionales
    if (data?.user?.id) {
      await supabaseAdmin.from('profiles').update({
        full_name: full_name || '',
        razon_social: razon_social || '',
        cuit: cuit || '',
        telefono: telefono || '',
        localidad: localidad || '',
        provincia: provincia || '',
        user_type: 'distributor',
      }).eq('id', data.user.id)
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
