// All email sending is handled by Supabase Edge Functions (see /supabase/functions/)
// This file contains the client-side trigger helpers

import { supabase } from '@/lib/supabase'

// Envía un presupuesto por email con el PDF adjunto (Edge Function `send-email`,
// type: 'presupuesto', que lo reenvía a Resend como attachment).
export async function enviarPresupuestoPorEmail(p) {
  const destino = String(p?.to || '').trim()
  if (!destino) throw new Error('Falta el email del destinatario')

  // jsPDF se carga on-demand para no engordar el bundle inicial
  const { presupuestoPDFBase64 } = await import('@/utils/presupuestoPdf')
  const pdfBase64 = await presupuestoPDFBase64(p)

  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      type: 'presupuesto',
      data: {
        to: destino,
        clienteNombre: p.clienteNombre || '',
        items: (p.items || []).map(it => ({
          codigo: it.codigo, nombre: it.nombre, modelo: it.modelo,
          cantidad: it.cantidad, descuento_pct: it.descuento_pct,
          precio_unitario: it.precio_unitario, subtotal: it.subtotal,
        })),
        incluirIVA: p.incluirIVA,
        totalNeto: p.totalNeto,
        ivaMonto: p.ivaMonto,
        total: p.total,
        notas: p.notas || '',
        attachment: { filename: 'Presupuesto-TEMPTECH.pdf', content: pdfBase64 },
      },
    },
  })
  if (error) throw new Error(error.message)
  // La función devuelve { ok:false } si el tipo no existe (deploy pendiente)
  if (data && data.ok === false) {
    throw new Error('El servidor de email todavía no está actualizado (falta redeployar la Edge Function send-email).')
  }
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
