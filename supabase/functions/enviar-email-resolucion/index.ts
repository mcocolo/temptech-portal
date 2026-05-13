import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { to, subject, text, tracking_id, empresa, tracking, fecha } = body

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ paso: "secret", error: "Falta RESEND_API_KEY en Secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    // Convertir saltos de línea del texto editable a HTML
    const textoHtml = (text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .split("\n")
      .map(line => line.trim() === "" ? "<br/>" : `<p style="margin:0 0 10px 0;">${line}</p>`)
      .join("")

    const html = `
      <div style="font-family: Arial, sans-serif; background:#f5f5f5; padding:20px;">
        <div style="max-width:600px; margin:auto; background:white; border-radius:10px; padding:30px;">

          <h2 style="color:#1a1a1a; margin-top:0;">TEMPTECH</h2>

          <p style="color:#666; font-size:14px;">Reclamo: <strong>${tracking_id || ""}</strong></p>

          <div style="margin: 20px 0; line-height: 1.7; color: #333;">
            ${textoHtml}
          </div>

          ${empresa && empresa !== "Logistica Propia" && tracking ? `
          <div style="background:#f0f0f0; padding:15px; border-radius:8px; margin:20px 0;">
            <p style="margin:0 0 8px 0;"><strong>Empresa:</strong> ${empresa}</p>
            <p style="margin:0;"><strong>Código de seguimiento:</strong> ${tracking}</p>
          </div>` : ""}

          ${empresa === "Logistica Propia" && fecha ? `
          <div style="background:#f0f0f0; padding:15px; border-radius:8px; margin:20px 0;">
            <p style="margin:0 0 8px 0;"><strong>Empresa:</strong> Logística Propia</p>
            <p style="margin:0;"><strong>Fecha de envío:</strong> ${fecha}</p>
          </div>` : ""}

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

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TEMPTECH <garantia@temptech.com.ar>",
        to: [String(to).trim()],
        reply_to: "garantia@temptech.com.ar",
        subject,
        html,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(
        JSON.stringify({ paso: "resend", resend_status: response.status, resend_response: data }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      )
    }

    return new Response(
      JSON.stringify({ ok: true, paso: "enviado", data }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ paso: "catch", error: error.message || "Error inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})