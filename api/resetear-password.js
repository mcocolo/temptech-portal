import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Email y password requeridos' })

  // Buscar usuario por email paginando auth.admin.listUsers
  let found = null
  let page = 1
  while (!found) {
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
    if (listError || !users.length) break
    found = users.find(u => u.email === email)
    if (users.length < 1000) break
    page++
  }

  if (!found) return res.status(404).json({ error: 'Usuario no encontrado en auth' })

  // Actualizar contraseña
  const { error } = await supabaseAdmin.auth.admin.updateUserById(found.id, { password })
  if (error) return res.status(400).json({ error: error.message })

  return res.status(200).json({ ok: true })
}
