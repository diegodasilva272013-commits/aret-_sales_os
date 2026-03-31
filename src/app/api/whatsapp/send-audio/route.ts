import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { writeFile, readFile, unlink } from "fs/promises"
import { join } from "path"
import { tmpdir } from "os"
import { execFile } from "child_process"
import { promisify } from "util"

const execFileAsync = promisify(execFile)

const supabaseAdmin = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function convertWebmToOgg(webmBuffer: Buffer): Promise<Buffer> {
  const ffmpegPath = require("ffmpeg-static") as string
  const inputPath = join(tmpdir(), `audio-${Date.now()}.webm`)
  const outputPath = join(tmpdir(), `audio-${Date.now()}.ogg`)

  try {
    await writeFile(inputPath, webmBuffer)
    await execFileAsync(ffmpegPath, [
      "-i", inputPath,
      "-c:a", "libopus",
      "-b:a", "48k",
      "-vn",
      "-y",
      outputPath,
    ])
    const oggBuffer = await readFile(outputPath)
    console.log("[send-audio] Converted WebM->OGG:", webmBuffer.length, "->", oggBuffer.length, "bytes")
    return oggBuffer
  } finally {
    await unlink(inputPath).catch(() => {})
    await unlink(outputPath).catch(() => {})
  }
}

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

  const cleanNumber = toNumber.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "")

  try {
    const webmBuffer = Buffer.from(await audio.arrayBuffer())
    console.log("[send-audio] WebM size:", webmBuffer.length, "bytes, to:", cleanNumber)

    // 1. Convertir WebM a OGG/Opus (formato que WhatsApp acepta)
    const oggBuffer = await convertWebmToOgg(webmBuffer)

    // 2. Guardar OGG en Supabase Storage para playback en la app
    const fileName = `outbound/${prospectId}/${Date.now()}.ogg`
    const { data: storageData, error: storageError } = await supabaseAdmin.storage
      .from("whatsapp-media")
      .upload(fileName, oggBuffer, { contentType: "audio/ogg", upsert: false })

    let mediaUrl = ""
    if (storageData?.path) {
      const { data: urlData } = supabaseAdmin.storage
        .from("whatsapp-media")
        .getPublicUrl(storageData.path)
      mediaUrl = urlData.publicUrl
    }
    console.log("[send-audio] Storage:", storageError ? storageError.message : mediaUrl)

    // 3. Subir OGG real a WhatsApp Media API
    const waForm = new FormData()
    const oggBlob = new Blob([oggBuffer as unknown as ArrayBuffer], { type: "audio/ogg" })
    waForm.append("file", oggBlob, "audio.ogg")
    waForm.append("type", "audio/ogg")
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
    console.log("[send-audio] Media upload:", uploadRes.status, JSON.stringify(uploadData))

    if (!uploadRes.ok || !uploadData.id) {
      console.error("[send-audio] Media upload failed:", JSON.stringify(uploadData))
      // Guardar con status failed
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
        error: uploadData.error?.message || "Error subiendo audio a WhatsApp",
        details: uploadData,
      }, { status: 400 })
    }

    // 3. Enviar mensaje con el media_id
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
          audio: { id: uploadData.id },
        }),
      }
    )
    const msgData = await msgRes.json()
    console.log("[send-audio] WhatsApp send:", msgRes.status, JSON.stringify(msgData))

    if (!msgRes.ok) {
      console.error("[send-audio] WhatsApp send error:", JSON.stringify(msgData))
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
        details: msgData,
      }, { status: 400 })
    }

    // 4. Guardar en DB con éxito
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
