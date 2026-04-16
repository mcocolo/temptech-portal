import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' })

  // Buscar ID directo desde auth.users via SQL
  const { data: authRow, error: sqlError } = await supabaseAdmin
    .rpc('get_user_id_by_email', { p_email: email })

  if (sqlError || !authRow) return res.status(404).json({ error: 'Usuario no encontrado: ' + (sqlError?.message || '') })

  // Actualizar contraseña via Admin API
  const { error } = await supabaseAdmin.auth.admin.updateUserById(authRow, { password })
  if (error) return res.status(400).json({ error: error.message })

  return res.status(200).json({ ok: true })
}
