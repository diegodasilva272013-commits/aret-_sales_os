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
    const uploadForm = new FormData()
    uploadForm.append("messaging_product", "whatsapp")
    uploadForm.append("file", new Blob([audioBuffer], { type: "audio/ogg" }), "audio.ogg")
    uploadForm.append("type", "audio/ogg")

    const uploadRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: uploadForm,
      }
    )
    const uploadData = await uploadRes.json()

    if (!uploadRes.ok) {
      console.error("WhatsApp media upload error:", JSON.stringify(uploadData))
      return NextResponse.json({ error: uploadData.error?.message || "Error subiendo audio" }, { status: 400 })
    }

    const mediaId = uploadData.id

    // 2. Enviar mensaje de audio con el media ID
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

    if (!msgRes.ok) {
      console.error("WhatsApp send audio error:", JSON.stringify(msgData))
      const errCode = msgData.error?.code
      if (errCode === 190) {
        return NextResponse.json({ error: "Token de WhatsApp expirado" }, { status: 401 })
      }
      return NextResponse.json({ error: msgData.error?.message || "Error enviando audio" }, { status: 400 })
    }

    // 3. Guardar audio en Supabase Storage
    const fileName = `outbound/${prospectId}/${Date.now()}.ogg`
    const { data: storageData } = await supabaseAdmin.storage
      .from("whatsapp-media")
      .upload(fileName, audioBuffer, { contentType: "audio/ogg", upsert: false })

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
