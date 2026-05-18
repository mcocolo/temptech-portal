export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { to, nombre, tracking_id, textoCompleto } = req.body
  if (!to || !tracking_id) return res.status(400).json({ error: 'Faltan campos requeridos' })

  const RESEND_API_KEY = process.env.RESEND_API_KEY
  if (!RESEND_API_KEY) return res.status(500).json({ error: 'Falta RESEND_API_KEY' })

  const textoHtml = (textoCompleto || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split('\n')
    .map(line => line.trim() === '' ? '<br/>' : `<p style="margin:0 0 10px 0;">${line}</p>`)
    .join('')

  const html = `
    <div style="font-family: Arial, sans-serif; background:#f5f5f5; padding:20px;">
      <div style="max-width:600px; margin:auto; background:white; border-radius:10px; padding:30px;">
        <h2 style="color:#1a1a1a; margin-top:0;">TEMPTECH</h2>
        <p style="color:#666; font-size:14px;">Caso: <strong>${tracking_id}</strong></p>
        <div style="margin: 20px 0; line-height: 1.7; color: #333;">
          ${textoHtml}
        </div>
        <p style="margin-top:30px; color:#555;">
          Ante cualquier duda, podés responder este email directamente.
        </p>
        <p style="margin-bottom:0;">
          Saludos,<br/>
          <strong>Equipo TEMPTECH</strong>
        </p>
      </div>
    </div>
  `

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'TEMPTECH <garantia@temptech.com.ar>',
      to: [String(to).trim()],
      reply_to: 'garantia@temptech.com.ar',
      subject: `❌ Actualización sobre su caso ${tracking_id} — TEMPTECH`,
      html,
    }),
  })

  const data = await response.json()
  if (!response.ok) return res.status(500).json({ error: data })
  return res.status(200).json({ ok: true, data })
}
