import { serve } from "https://deno.land/std/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function guessFilenameFromUrl(url: string, fallback: string) {
  try {
    const pathname = new URL(url).pathname;
    const last = pathname.split("/").pop() || fallback;
    return decodeURIComponent(last);
  } catch {
    return fallback;
  }
}

function guessContentType(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

async function buildAttachment(url: string, fallbackName: string) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`No se pudo descargar adjunto: ${url} - status ${resp.status}`);
  const bytes = new Uint8Array(await resp.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const filename = guessFilenameFromUrl(url, fallbackName);
  const contentType = resp.headers.get("content-type") || guessContentType(filename);
  return { filename, content: btoa(binary), content_type: contentType };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      email, nombre, trackingId, fechaIngreso, direccion, localidad,
      provincia, codigoPostal, telefono, fechaCompra, canal, vendedor,
      ventaManual, producto, modelo, motivo, descripcion, diasGarantia,
      // Singular (retrocompat)
      comprobanteUrl, imagenProductoUrl,
      // Arrays con todos los archivos
      comprobantesUrls, imagenesProductoUrls,
    } = body;

    console.log("BODY RECIBIDO:", { email, nombre, trackingId, comprobantesUrls, imagenesProductoUrls });

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Falta RESEND_API_KEY" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Construir lista de URLs únicas para comprobantes
    const urlsComprobantes: string[] = []
    if (comprobantesUrls && Array.isArray(comprobantesUrls) && comprobantesUrls.length > 0) {
      urlsComprobantes.push(...comprobantesUrls.filter(Boolean))
    } else if (comprobanteUrl) {
      urlsComprobantes.push(comprobanteUrl)
    }

    // Construir lista de URLs únicas para imágenes del producto
    const urlsImagenes: string[] = []
    if (imagenesProductoUrls && Array.isArray(imagenesProductoUrls) && imagenesProductoUrls.length > 0) {
      urlsImagenes.push(...imagenesProductoUrls.filter(Boolean))
    } else if (imagenProductoUrl) {
      urlsImagenes.push(imagenProductoUrl)
    }

    console.log("URLs comprobantes:", urlsComprobantes)
    console.log("URLs imágenes:", urlsImagenes)

    // Construir adjuntos para todos los archivos
    const attachments = [];

    for (let i = 0; i < urlsComprobantes.length; i++) {
      try {
        const att = await buildAttachment(urlsComprobantes[i], `comprobante-${i + 1}`)
        attachments.push(att)
        console.log(`Adjunto comprobante ${i + 1} OK:`, att.filename)
      } catch (e) {
        console.log(`No se pudo adjuntar comprobante ${i + 1}:`, String(e))
      }
    }

    for (let i = 0; i < urlsImagenes.length; i++) {
      try {
        const att = await buildAttachment(urlsImagenes[i], `imagen-producto-${i + 1}`)
        attachments.push(att)
        console.log(`Adjunto imagen producto ${i + 1} OK:`, att.filename)
      } catch (e) {
        console.log(`No se pudo adjuntar imagen ${i + 1}:`, String(e))
      }
    }

    // Links en el HTML para todos los archivos
    const linksComprobantes = urlsComprobantes.length > 0
      ? `<p style="margin-top:24px;"><strong>Comprobantes (${urlsComprobantes.length}):</strong><br>` +
        urlsComprobantes.map((url, i) => `<a href="${url}" target="_blank">Ver comprobante ${i + 1}</a>`).join('<br>') +
        `</p>`
      : ''

    const linksImagenes = urlsImagenes.length > 0
      ? `<p><strong>Imágenes del producto (${urlsImagenes.length}):</strong><br>` +
        urlsImagenes.map((url, i) => `<a href="${url}" target="_blank">Ver imagen ${i + 1}</a>`).join('<br>') +
        `</p>`
      : ''

    const html = `
      <div style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
        <h2 style="margin-bottom: 8px;">Hemos recibido su reclamo</h2>
        <p>Estimado/a ${nombre || "cliente"},</p>
        <p>Su reclamo fue registrado correctamente. Nuestro equipo de Soporte procederá a evaluar la información y brindarle una respuesta a la brevedad. A continuación le enviamos el detalle completo de la solicitud.</p>
        <p style="font-size: 18px; font-weight: bold; margin: 18px 0;">
          Número de reclamo: ${trackingId || "-"}
        </p>
        <table style="border-collapse: collapse; width: 100%; margin-top: 12px;">
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Fecha de ingreso</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${fechaIngreso || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Nombre y apellido</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${nombre || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Dirección</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${direccion || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Localidad</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${localidad || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Provincia</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${provincia || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Código postal</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${codigoPostal || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Teléfono</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${telefono || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Email</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${email || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Fecha de compra</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${fechaCompra || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Días garantía</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${diasGarantia ?? "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Canal</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${canal || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Vendedor</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${vendedor || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Número de venta / comprobante</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${ventaManual || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Producto</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${producto || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Modelo</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${modelo || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Motivo</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${motivo || "-"}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #ddd;"><strong>Descripción de falla</strong></td><td style="padding: 8px; border: 1px solid #ddd;">${descripcion || "-"}</td></tr>
        </table>

        ${linksComprobantes}
        ${linksImagenes}

        ${attachments.length ? `<p style="margin-top:20px;"><b>Adjuntos incluidos (${attachments.length}):</b> ${attachments.map(a => a.filename).join(", ")}</p>` : ""}

        <p style="margin-top: 28px;">Conserve este email para futuras consultas.</p>
        <p>Nos estaremos comunicando a la brevedad.</p>
        <p>Saludos,<br><b>Equipo TEMPTECH</b></p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TEMPTECH <notificaciones@temptech.com.ar>",
        to: [email],
        cc: ["garantia@temptech.com.ar"],
        subject: `Recepción de reclamo ${trackingId || ""} - TEMPTECH`,
        html,
        attachments,
      }),
    });

    const data = await response.json();
    console.log("RESPUESTA RESEND:", data);

    return new Response(JSON.stringify(data), {
      status: response.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.log("ERROR FUNCTION:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});