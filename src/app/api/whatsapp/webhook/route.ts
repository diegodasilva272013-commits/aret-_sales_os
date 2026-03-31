import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente con service role para poder escribir sin sesión
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET: verificación del webhook desde Meta
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode")
  const token = req.nextUrl.searchParams.get("hub.verify_token")
  const challenge = req.nextUrl.searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse("Forbidden", { status: 403 })
}

// Buscar prospecto por número, probando varios formatos
async function findProspectByPhone(phoneNumber: string) {
  // phoneNumber viene sin + (ej: 5491112345678)
  const variations = [
    `+${phoneNumber}`,
    phoneNumber,
  ]
  
  // También probar con formato argentino alternativo (549→54)
  if (phoneNumber.startsWith("549")) {
    variations.push(`+54${phoneNumber.slice(3)}`)
    variations.push(`54${phoneNumber.slice(3)}`)
  }
  // Formato uruguayo (598→5989)
  if (phoneNumber.startsWith("598")) {
    variations.push(`+598${phoneNumber.slice(3)}`)
  }

  const orFilter = variations.map(v => `whatsapp_number.eq.${v}`).join(",")
  
  const { data } = await supabase
    .from("prospects")
    .select("id, organization_id")
    .or(orFilter)
    .limit(1)
    .maybeSingle()

  if (data) return data

  // Fallback: buscar en mensajes previos enviados a este número
  const toVariations = variations.map(v => `to_number.eq.${v}`).join(",")
  const { data: prevMsg } = await supabase
    .from("whatsapp_messages")
    .select("prospect_id, organization_id")
    .eq("direction", "outbound")
    .or(toVariations)
    .not("prospect_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (prevMsg) return { id: prevMsg.prospect_id, organization_id: prevMsg.organization_id }

  return null
}

// POST: recibir mensajes entrantes + status updates
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Log completo para debugging
    console.log("WhatsApp webhook received:", JSON.stringify(body).slice(0, 500))

    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value) return NextResponse.json({ ok: true })

    // === 1. Procesar MENSAJES ENTRANTES ===
    if (value.messages?.length) {
      for (const msg of value.messages) {
        const fromNumber = msg.from
        const waMessageId = msg.id

        // Soportar texto, imagen, audio, video, documento, etc.
        let content = ""
        if (msg.type === "text") {
          content = msg.text?.body || ""
        } else if (msg.type === "image") {
          content = `[Imagen${msg.image?.caption ? `: ${msg.image.caption}` : ""}]`
        } else if (msg.type === "audio") {
          content = "[Audio]"
        } else if (msg.type === "video") {
          content = `[Video${msg.video?.caption ? `: ${msg.video.caption}` : ""}]`
        } else if (msg.type === "document") {
          content = `[Documento: ${msg.document?.filename || "archivo"}]`
        } else if (msg.type === "sticker") {
          content = "[Sticker]"
        } else if (msg.type === "location") {
          content = `[Ubicación: ${msg.location?.latitude}, ${msg.location?.longitude}]`
        } else if (msg.type === "reaction") {
          content = `[Reacción: ${msg.reaction?.emoji || ""}]`
        } else {
          content = `[${msg.type || "mensaje"}]`
        }

        // Buscar el prospecto con múltiples formatos de número
        const prospect = await findProspectByPhone(fromNumber)

        const { error: insertErr } = await supabase.from("whatsapp_messages").insert({
          prospect_id: prospect?.id || null,
          organization_id: prospect?.organization_id || null,
          whatsapp_message_id: waMessageId,
          direction: "inbound",
          from_number: `+${fromNumber}`,
          to_number: process.env.WHATSAPP_PHONE_NUMBER_ID,
          content,
          status: "received",
        })

        if (insertErr) {
          console.error("WhatsApp insert error:", insertErr.message, "prospect:", prospect?.id, "from:", fromNumber)
        }

        // Marcar como leído en WhatsApp
        fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            status: "read",
            message_id: waMessageId,
          }),
        }).catch(() => {}) // fire and forget
      }
    }

    // === 2. Procesar STATUS UPDATES (sent → delivered → read) ===
    if (value.statuses?.length) {
      for (const status of value.statuses) {
        const waMessageId = status.id
        const newStatus = status.status // "sent" | "delivered" | "read" | "failed"

        if (!waMessageId || !newStatus) continue

        // Actualizar status del mensaje en nuestra DB
        const { error: updateErr } = await supabase
          .from("whatsapp_messages")
          .update({ status: newStatus })
          .eq("whatsapp_message_id", waMessageId)

        if (updateErr) {
          console.error("WhatsApp status update error:", updateErr.message, "msgId:", waMessageId, "status:", newStatus)
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("WhatsApp webhook error:", e)
    return NextResponse.json({ ok: true }) // siempre 200 para Meta
  }
}
