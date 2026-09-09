// All email sending is handled by Supabase Edge Functions (see /supabase/functions/)
// This file contains the client-side trigger helpers

import { supabase } from '@/lib/supabase'

function fmtARS(n) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n || 0)
}

// Envía un presupuesto por email reutilizando la función genérica `send-email`
// (type: 'resolucion' acepta destinatario/asunto/texto libres).
export async function enviarPresupuestoPorEmail({ to, clienteNombre, items, incluirIVA, totalNeto, ivaMonto, total, notas }) {
  const destino = String(to || '').trim()
  if (!destino) throw new Error('Falta el email del destinatario')

  const lineas = (items || []).map(it => {
    const desc = it.descuento_pct > 0 ? ` (-${it.descuento_pct}%)` : ''
    return `• ${it.cantidad} x ${it.nombre}${it.modelo ? ` ${it.modelo}` : ''} [${it.codigo}]${desc}  —  ${fmtARS(it.subtotal)}`
  }).join('\n')

  const totales = incluirIVA
    ? `\nNeto: ${fmtARS(totalNeto)}\nIVA (21%): ${fmtARS(ivaMonto)}\nTOTAL c/IVA: ${fmtARS(total)}`
    : `\nTOTAL: ${fmtARS(total)}`

  const text =
    `Hola${clienteNombre ? ` ${clienteNombre}` : ''},\n\n` +
    `Te enviamos el presupuesto solicitado:\n\n` +
    `${lineas}\n${totales}\n` +
    `${notas ? `\nCondiciones: ${notas}\n` : ''}` +
    `\nValidez: 7 días corridos. Precios sujetos a disponibilidad de stock.\n\n` +
    `Saludos,\nTEMPTECH`

  const { error } = await supabase.functions.invoke('send-email', {
    body: {
      type: 'resolucion',
      data: {
        to: destino,
        subject: `TEMPTECH - Presupuesto${clienteNombre ? ` ${clienteNombre}` : ''}`,
        text,
      },
    },
  })
  if (error) throw new Error(error.message)
  return true
}

export async function notifyNewPost({ postId, title, authorName, category }) {
  // Calls the Supabase edge function which uses Resend
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        type: 'new_post',
        data: { postId, title, authorName, category },
      }),
    }
  )
  return response.ok
}

export async function notifyNewReply({ postId, postTitle, replyAuthor, replyText, recipientEmail }) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        type: 'new_reply',
        data: { postId, postTitle, replyAuthor, replyText, recipientEmail },
      }),
    }
  )
  return response.ok
}

export async function notifyNewReclamo({ reclamoId, title, authorName, priority }) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        type: 'new_reclamo',
        data: { reclamoId, title, authorName, priority },
      }),
    }
  )
  return response.ok
}

export async function notifyReclamoUpdate({ reclamoId, title, newStatus, recipientEmail }) {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        type: 'reclamo_update',
        data: { reclamoId, title, newStatus, recipientEmail },
      }),
    }
  )
  return response.ok
}
