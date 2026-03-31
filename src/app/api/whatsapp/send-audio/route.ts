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

  let cleanNumber = toNumber.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "")

  try {
    const audioBuffer = Buffer.from(await audio.arrayBuffer())
    console.log("[send-audio] Audio size:", audioBuffer.length, "bytes, to:", cleanNumber)

    // 1. Subir audio a Supabase Storage primero (siempre funciona)
    const fileName = `outbound/${prospectId}/${Date.now()}.webm`
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from("whatsapp-media")
      .upload(fileName, audioBuffer, { contentType: "audio/webm", upsert: false })

    let mediaUrl = ""
    if (storageData?.path) {
      const { data: urlData } = supabaseAdmin.storage
        .from("whatsapp-media")
        .getPublicUrl(storageData.path)
      mediaUrl = urlData.publicUrl
    }
    console.log("[send-audio] Storage:", storageError ? storageError.message : mediaUrl)

    // 2. Enviar a WhatsApp usando URL pública (no hace falta subir media a Graph API)
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
          audio: { link: mediaUrl },
        }),
      }
    )
    const msgData = await msgRes.json()
    console.log("[send-audio] WhatsApp response:", msgRes.status, JSON.stringify(msgData))

    if (!msgRes.ok) {
      console.error("[send-audio] WhatsApp error:", JSON.stringify(msgData))
      // Guardar en DB de todas formas con status failed
      await supabase.from("whatsapp_messages").insert({
        prospect_id: prospectId,
        organization_id: profile?.organization_id,
        direction: "outbound",
        from_number: phoneNumberId,
        to_number: `+${cleanNumber}`,
        content: "[Audio]",
        media_url: mediaUrl,
        media_type: "audio",
        status: "failed",
      })
      return NextResponse.json({ 
        error: msgData.error?.message || "Error enviando audio a WhatsApp", 
        details: msgData 
      }, { status: 400 })
    }

    // 3. Guardar en DB con éxito
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
