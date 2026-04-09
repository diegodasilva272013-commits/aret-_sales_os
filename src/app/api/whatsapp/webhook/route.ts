import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente con service role para poder escribir sin sesión
let _sb: any
const supabase = new Proxy({} as any, { get(_, p: string) { const c = _sb ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); const v = c[p]; return typeof v === "function" ? v.bind(c) : v } })

// GET: verificación del webhook desde Meta + diagnóstico
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode")
  const token = req.nextUrl.searchParams.get("hub.verify_token")
  const challenge = req.nextUrl.searchParams.get("hub.challenge")

  // Ver logs: GET /api/whatsapp/webhook?logs=1
  if (req.nextUrl.searchParams.get("logs") === "1") {
    const { data: logs } = await supabase
      .from("webhook_logs")
      .select("id, method, body, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
    return NextResponse.json({ logs })
  }

  // Diagnóstico: GET /api/whatsapp/webhook?diag=1
  if (req.nextUrl.searchParams.get("diag") === "1") {
    const prospectId = req.nextUrl.searchParams.get("pid") || "9f7e6374-2af3-4c6e-85b9-528e083728ee"
    const orgId = "41bb4817-72d1-4bf4-89d3-029b094bce39"

    const { data: msgs, error: msgErr } = await supabase
      .from("whatsapp_messages")
      .select("id, direction, content, status, created_at")
      .eq("prospect_id", prospectId)
      .order("created_at", { ascending: false })
      .limit(5)

    const { data: inbox, error: inboxErr } = await supabase
      .from("whatsapp_messages")
      .select("id, content, direction, prospect_id, created_at, prospects!prospect_id(id, full_name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5)

    const { count } = await supabase
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })

    return NextResponse.json({
      prospect_messages: { count: msgs?.length, error: msgErr?.message, data: msgs },
      inbox_messages: { count: inbox?.length, error: inboxErr?.message, data: inbox },
      total_in_db: count,
      env: {
        phone_id: process.env.WHATSAPP_PHONE_NUMBER_ID,
        has_token: !!process.env.WHATSAPP_ACCESS_TOKEN,
        has_svc_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      },
    })
  }

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

// Descargar media de WhatsApp y guardar en Supabase Storage
async function downloadAndStoreMedia(mediaId: string, type: string, fromNumber: string): Promise<string> {
  try {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    if (!accessToken) return ""

    // 1. Obtener URL de descarga del media
    const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const metaData = await metaRes.json()
    if (!metaData.url) return ""

    // 2. Descargar el archivo
    const fileRes = await fetch(metaData.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!fileRes.ok) return ""
    const fileBuffer = Buffer.from(await fileRes.arrayBuffer())

    // 3. Determinar extensión
    const mimeType = metaData.mime_type || fileRes.headers.get("content-type") || "application/octet-stream"
    const extMap: Record<string, string> = {
      "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/aac": "aac",
      "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
      "video/mp4": "mp4", "video/3gpp": "3gp",
      "application/pdf": "pdf",
    }
    const ext = extMap[mimeType.split(";")[0]] || "bin"

    // 4. Subir a Supabase Storage
    const fileName = `inbound/${fromNumber}/${Date.now()}.${ext}`
    const { data: storageData } = await supabase.storage
      .from("whatsapp-media")
      .upload(fileName, fileBuffer, { contentType: mimeType, upsert: false })

    if (storageData?.path) {
      const { data: urlData } = supabase.storage
        .from("whatsapp-media")
        .getPublicUrl(storageData.path)
      return urlData.publicUrl
    }
    return ""
  } catch (err) {
    console.error("Media download error:", err)
    return ""
  }
}

// POST: recibir mensajes entrantes + status updates
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Guardar CADA request en webhook_logs para debugging
    await supabase.from("webhook_logs").insert({
      method: "POST",
      body,
      headers: Object.fromEntries(req.headers.entries()),
    }).then(({ error }) => {
      if (error) console.error("webhook_logs insert error:", error.message)
    })

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
        let mediaUrl = ""
        let mediaType = ""

        if (msg.type === "text") {
          content = msg.text?.body || ""
        } else if (msg.type === "image") {
          content = `[Imagen${msg.image?.caption ? `: ${msg.image.caption}` : ""}]`
          mediaType = "image"
          if (msg.image?.id) mediaUrl = await downloadAndStoreMedia(msg.image.id, "image", fromNumber)
        } else if (msg.type === "audio") {
          content = "[Audio]"
          mediaType = "audio"
          if (msg.audio?.id) mediaUrl = await downloadAndStoreMedia(msg.audio.id, "audio", fromNumber)
        } else if (msg.type === "video") {
          content = `[Video${msg.video?.caption ? `: ${msg.video.caption}` : ""}]`
          mediaType = "video"
          if (msg.video?.id) mediaUrl = await downloadAndStoreMedia(msg.video.id, "video", fromNumber)
        } else if (msg.type === "document") {
          content = `[Documento: ${msg.document?.filename || "archivo"}]`
          mediaType = "document"
          if (msg.document?.id) mediaUrl = await downloadAndStoreMedia(msg.document.id, "document", fromNumber)
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

        const insertData: Record<string, unknown> = {
          prospect_id: prospect?.id || null,
          organization_id: prospect?.organization_id || null,
          whatsapp_message_id: waMessageId,
          direction: "inbound",
          from_number: `+${fromNumber}`,
          to_number: process.env.WHATSAPP_PHONE_NUMBER_ID,
          content,
          status: "received",
        }
        if (mediaUrl) insertData.media_url = mediaUrl
        if (mediaType) insertData.media_type = mediaType

        const { error: insertErr } = await supabase.from("whatsapp_messages").insert(insertData)

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
