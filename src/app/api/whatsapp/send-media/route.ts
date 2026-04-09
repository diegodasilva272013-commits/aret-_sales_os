import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"

let _sb: any
const supabaseAdmin = new Proxy({} as any, { get(_, p: string) { const c = _sb ??= createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); const v = c[p]; return typeof v === "function" ? v.bind(c) : v } })

// WhatsApp supported MIME types
const MIME_MAP: Record<string, { waType: string; ext: string }> = {
  "image/jpeg": { waType: "image", ext: "jpg" },
  "image/png": { waType: "image", ext: "png" },
  "image/webp": { waType: "image", ext: "webp" },
  "video/mp4": { waType: "video", ext: "mp4" },
  "video/3gpp": { waType: "video", ext: "3gp" },
  "application/pdf": { waType: "document", ext: "pdf" },
  "application/msword": { waType: "document", ext: "doc" },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { waType: "document", ext: "docx" },
  "application/vnd.ms-excel": { waType: "document", ext: "xls" },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { waType: "document", ext: "xlsx" },
  "application/vnd.ms-powerpoint": { waType: "document", ext: "ppt" },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { waType: "document", ext: "pptx" },
  "text/plain": { waType: "document", ext: "txt" },
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const prospectId = formData.get("prospectId") as string
  const toNumber = formData.get("toNumber") as string
  const caption = formData.get("caption") as string | null

  if (!file || !toNumber) {
    return NextResponse.json({ error: "Falta archivo o número" }, { status: 400 })
  }

  const mimeInfo = MIME_MAP[file.type]
  if (!mimeInfo) {
    return NextResponse.json({ error: `Formato no soportado: ${file.type}. Soportados: imágenes (JPG, PNG, WebP), videos (MP4), documentos (PDF, Word, Excel, PPT, TXT)` }, { status: 400 })
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

  const cleanNumber = toNumber.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "")

  try {
    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const originalName = file.name || `file.${mimeInfo.ext}`
    console.log("[send-media] File:", originalName, "size:", fileBuffer.length, "type:", file.type, "to:", cleanNumber)

    // 1. Guardar en Supabase Storage
    const storageName = `outbound/${prospectId}/${Date.now()}_${originalName.replace(/[^a-zA-Z0-9._-]/g, "_")}`
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from("whatsapp-media")
      .upload(storageName, fileBuffer, { contentType: file.type, upsert: false })

    let mediaUrl = ""
    if (storageData?.path) {
      const { data: urlData } = supabaseAdmin.storage
        .from("whatsapp-media")
        .getPublicUrl(storageData.path)
      mediaUrl = urlData.publicUrl
    }
    console.log("[send-media] Storage:", storageError ? storageError.message : mediaUrl)

    // 2. Subir a WhatsApp Media API
    const waForm = new FormData()
    waForm.append("file", new Blob([fileBuffer as unknown as ArrayBuffer], { type: file.type }), originalName)
    waForm.append("type", file.type)
    waForm.append("messaging_product", "whatsapp")

    const uploadRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: waForm,
      }
    )
    const uploadData = await uploadRes.json()
    console.log("[send-media] Media upload:", uploadRes.status, JSON.stringify(uploadData))

    if (!uploadRes.ok || !uploadData.id) {
      await supabase.from("whatsapp_messages").insert({
        prospect_id: prospectId,
        organization_id: profile?.organization_id,
        direction: "outbound",
        from_number: phoneNumberId,
        to_number: `+${cleanNumber}`,
        content: caption || `[${mimeInfo.waType === "image" ? "Imagen" : mimeInfo.waType === "video" ? "Video" : "Documento"}]`,
        media_url: mediaUrl,
        media_type: mimeInfo.waType,
        status: "failed",
      })
      return NextResponse.json({
        error: uploadData.error?.message || "Error subiendo archivo a WhatsApp",
        details: uploadData,
      }, { status: 400 })
    }

    // 3. Enviar mensaje con media_id
    const mediaPayload: Record<string, unknown> = { id: uploadData.id }
    if (caption && (mimeInfo.waType === "image" || mimeInfo.waType === "video")) {
      mediaPayload.caption = caption
    }
    if (mimeInfo.waType === "document") {
      mediaPayload.filename = originalName
      if (caption) mediaPayload.caption = caption
    }

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
          type: mimeInfo.waType,
          [mimeInfo.waType]: mediaPayload,
        }),
      }
    )
    const msgData = await msgRes.json()
    console.log("[send-media] WhatsApp send:", msgRes.status, JSON.stringify(msgData))

    if (!msgRes.ok) {
      await supabase.from("whatsapp_messages").insert({
        prospect_id: prospectId,
        organization_id: profile?.organization_id,
        direction: "outbound",
        from_number: phoneNumberId,
        to_number: `+${cleanNumber}`,
        content: caption || `[${mimeInfo.waType === "image" ? "Imagen" : mimeInfo.waType === "video" ? "Video" : "Documento"}]`,
        media_url: mediaUrl,
        media_type: mimeInfo.waType,
        status: "failed",
      })
      return NextResponse.json({
        error: msgData.error?.message || "Error enviando archivo a WhatsApp",
        details: msgData,
      }, { status: 400 })
    }

    // 4. Guardar en DB
    const contentLabel = caption || `[${mimeInfo.waType === "image" ? "Imagen" : mimeInfo.waType === "video" ? "Video" : originalName}]`
    const { data: savedMsg } = await supabase.from("whatsapp_messages").insert({
      prospect_id: prospectId,
      organization_id: profile?.organization_id,
      whatsapp_message_id: msgData.messages?.[0]?.id,
      direction: "outbound",
      from_number: phoneNumberId,
      to_number: `+${cleanNumber}`,
      content: contentLabel,
      media_url: mediaUrl,
      media_type: mimeInfo.waType,
      status: "sent",
    }).select().single()

    return NextResponse.json({ ok: true, messageId: msgData.messages?.[0]?.id, message: savedMsg })
  } catch (err) {
    console.error("Media send error:", err)
    return NextResponse.json({ error: "Error interno enviando archivo" }, { status: 500 })
  }
}
