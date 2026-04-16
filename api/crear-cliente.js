import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { email, password, full_name, razon_social, cuit, telefono, localidad, provincia, vendedor_id } = req.body

  if (!email) return res.status(400).json({ error: 'El email es obligatorio' })

  // 1. Crear usuario via Admin API
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return res.status(400).json({ error: authError.message })

  const userId = authData.user.id

  // 2. Actualizar perfil como distribuidor del vendedor
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: userId,
    email: email || null,
    full_name: full_name || null,
    razon_social: razon_social || null,
    cuit: cuit || null,
    telefono: telefono || null,
    localidad: localidad || null,
    provincia: provincia || null,
    user_type: 'distributor',
    vendedor_id: vendedor_id || null,
  })

  if (profileError) return res.status(400).json({ error: profileError.message })

  return res.status(200).json({ id: userId })
}
