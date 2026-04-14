import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { email, password, full_name, razon_social, telefono, localidad, provincia, zona_cobertura } = req.body

  if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son obligatorios' })

  // 1. Crear usuario via Admin API (funciona correctamente)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) return res.status(400).json({ error: authError.message })

  const userId = authData.user.id

  // 2. Actualizar perfil con role vendedor y datos
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: userId,
    full_name: full_name || null,
    razon_social: razon_social || null,
    telefono: telefono || null,
    localidad: localidad || null,
    provincia: provincia || null,
    zona_cobertura: zona_cobertura || null,
    role: 'vendedor',
  })

  if (profileError) return res.status(400).json({ error: profileError.message })

  return res.status(200).json({ id: userId })
}
