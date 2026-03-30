// All email sending is handled by Supabase Edge Functions (see /supabase/functions/)
// This file contains the client-side trigger helpers

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
