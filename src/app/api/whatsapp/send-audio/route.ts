import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const audio = formData.get("audio") as File | null
  const prospectId = formData.get("prospectId") as string
  const toNumber = formData.get("toNumber") as string

  if (!audio || !toNumber) {
    return NextResponse.json({ error: "Falta audio o número" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    return NextResponse.json({ error: "WhatsApp no configurado" }, { status: 500 })
  }

  // Normalizar número
  let cleanNumber = toNumber.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "")

  try {
    // 1. Subir audio a WhatsApp Media API
    const audioBuffer = Buffer.from(await audio.arrayBuffer())
    
    // Construir multipart manualmente para compatibilidad con Graph API en serverless
    const boundary = "----WhatsAppMediaBoundary" + Date.now()
    const parts: Buffer[] = []

    // Part: messaging_product
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="messaging_product"\r\n\r\nwhatsapp\r\n`
    ))

    // Part: type 
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\naudio/ogg; codecs=opus\r\n`
    ))

    // Part: file (binary)
    parts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.ogg"\r\nContent-Type: audio/ogg; codecs=opus\r\n\r\n`
    ))
    parts.push(audioBuffer)
    parts.push(Buffer.from(`\r\n--${boundary}--\r\n`))

    const body = Buffer.concat(parts)

    console.log("[send-audio] Uploading media, size:", audioBuffer.length, "bytes")

    const uploadRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/media`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body,
      }
    )
    const uploadData = await uploadRes.json()

    console.log("[send-audio] Upload response:", uploadRes.status, JSON.stringify(uploadData))

    if (!uploadRes.ok) {
      console.error("WhatsApp media upload error:", JSON.stringify(uploadData))
      return NextResponse.json({ error: uploadData.error?.message || "Error subiendo audio", details: uploadData }, { status: 400 })
    }

    const mediaId = uploadData.id

    console.log("[send-audio] Sending audio message with mediaId:", mediaId, "to:", cleanNumber)

    const msgRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanNumber,
          type: "audio",
          audio: { id: mediaId },
        }),
      }
    )
    const msgData = await msgRes.json()
    console.log("[send-audio] Message response:", msgRes.status, JSON.stringify(msgData))

    if (!msgRes.ok) {
      console.error("WhatsApp send audio error:", JSON.stringify(msgData))
      const errCode = msgData.error?.code
      if (errCode === 190) {
        return NextResponse.json({ error: "Token de WhatsApp expirado" }, { status: 401 })
      }
      return NextResponse.json({ error: msgData.error?.message || "Error enviando audio", details: msgData }, { status: 400 })
    }

    // 3. Guardar audio en Supabase Storage
    const fileName = `outbound/${prospectId}/${Date.now()}.webm`
    const { data: storageData } = await supabaseAdmin.storage
      .from("whatsapp-media")
      .upload(fileName, audioBuffer, { contentType: "audio/webm", upsert: false })

    let mediaUrl = ""
    if (storageData?.path) {
      const { data: urlData } = supabaseAdmin.storage
        .from("whatsapp-media")
        .getPublicUrl(storageData.path)
      mediaUrl = urlData.publicUrl
    }

    // 4. Guardar en DB
    const { data: savedMsg } = await supabase.from("whatsapp_messages").insert({
      prospect_id: prospectId,
      organization_id: profile?.organization_id,
      whatsapp_message_id: msgData.messages?.[0]?.id,
      direction: "outbound",
      from_number: phoneNumberId,
      to_number: `+${cleanNumber}`,
      content: "[Audio]",
      media_url: mediaUrl,
      media_type: "audio",
      status: "sent",
    }).select().single()

    return NextResponse.json({ ok: true, messageId: msgData.messages?.[0]?.id, message: savedMsg })
  } catch (err) {
    console.error("Audio send error:", err)
    return NextResponse.json({ error: "Error interno enviando audio" }, { status: 500 })
  }
}
