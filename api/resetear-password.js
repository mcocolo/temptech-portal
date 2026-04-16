import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' })

  // Buscar usuario por email
  const { data, error: searchError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (searchError || !data) return res.status(404).json({ error: 'Usuario no encontrado en profiles' })

  // Actualizar contraseña
  const { error } = await supabaseAdmin.auth.admin.updateUserById(data.id, { password })
  if (error) return res.status(400).json({ error: error.message })

  return res.status(200).json({ ok: true })
}
