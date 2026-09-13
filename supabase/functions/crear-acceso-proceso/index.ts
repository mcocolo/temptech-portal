// supabase/functions/crear-acceso-proceso/index.ts
// Crea el usuario de login de un empleado de producción (rol 'proceso'):
// email + contraseña definida por el admin, ya confirmado (sin mail).
// Deploy: supabase functions deploy crear-acceso-proceso
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  try {
    const { email, password, nombre, apodo, empleado_id } = await req.json()
    if (!email || !password) return json({ error: 'Email y contraseña son requeridos' }, 400)
    if (String(password).length < 6) return json({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Crear el usuario ya confirmado (no se envía ningún email)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: String(email).trim(),
      password: String(password),
      email_confirm: true,
      user_metadata: { full_name: nombre || '', apodo: apodo || '' },
    })
    if (createErr) return json({ error: createErr.message }, 400)

    const uid = created?.user?.id
    if (uid) {
      // Perfil con rol proceso
      await admin.from('profiles').upsert({ id: uid, full_name: nombre || '', role: 'proceso' }, { onConflict: 'id' })
      // Vincular con el empleado
      if (empleado_id) await admin.from('empleados').update({ user_id: uid, email: String(email).trim() }).eq('id', empleado_id)
    }

    return json({ success: true, user_id: uid })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
