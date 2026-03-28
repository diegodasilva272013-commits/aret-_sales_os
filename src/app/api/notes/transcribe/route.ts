import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"
import { toFile } from "openai"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const formData = await req.formData()
  const audioBlob = formData.get("audio") as Blob
  const prospectId = formData.get("prospectId") as string

  if (!audioBlob || !prospectId) {
    return NextResponse.json({ error: "Audio y prospectId requeridos" }, { status: 400 })
  }

  // 1. Transcribir con Whisper
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const audioBuffer = Buffer.from(await audioBlob.arrayBuffer())
  const audioFile = await toFile(audioBuffer, "audio.webm", { type: "audio/webm" })

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    language: "es",
  })

  const text = transcription.text

  // 2. Subir audio a Supabase Storage
  const fileName = `${prospectId}/${Date.now()}.webm`
  const { error: uploadError } = await supabase.storage
    .from("audio-notes")
    .upload(fileName, audioBuffer, { contentType: "audio/webm", upsert: false })

  if (uploadError) {
    // Si falla el storage, igual devolvemos la transcripción
    return NextResponse.json({ text, audioUrl: null })
  }

  const { data: { publicUrl } } = supabase.storage
    .from("audio-notes")
    .getPublicUrl(fileName)

  // 3. Guardar audio_url y actualizar notas en el prospect
  const { data: prospect } = await supabase
    .from("prospects")
    .select("notes")
    .eq("id", prospectId)
    .single()

  const currentNotes = prospect?.notes || ""
  const timestamp = new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
  const newNotes = currentNotes
    ? `${currentNotes}\n\n🎙️ [${timestamp}]: ${text}`
    : `🎙️ [${timestamp}]: ${text}`

  await supabase.from("prospects")
    .update({ notes: newNotes, audio_url: publicUrl })
    .eq("id", prospectId)

  return NextResponse.json({ text, audioUrl: publicUrl, notes: newNotes })
}
