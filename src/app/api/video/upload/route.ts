import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

export const maxDuration = 120

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function transcribeBase64(base64: string, identity: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64, "base64")
    const file = new File([buffer], `${identity}.webm`, { type: "audio/webm" })
    const result = await openai.audio.transcriptions.create({ file, model: "whisper-1", language: "es" })
    return result.text || ""
  } catch (err) {
    console.error("Transcription error for", identity, err)
    return ""
  }
}

async function analyzeTranscript(transcript: string) {
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Eres un experto en ventas B2B. Analiza esta transcripción de videollamada (formato [Participante]: texto) y devuelve JSON:
{
  "summary": "resumen 2-3 oraciones",
  "tone": "positivo|neutral|negativo|interesado|resistente",
  "tone_explanation": "1 oración",
  "objections": ["objeciones"],
  "buying_signals": ["señales de compra"],
  "pain_points": ["puntos de dolor"],
  "next_step": "acción concreta",
  "recommendation": "consejo para el setter 1-2 oraciones",
  "score": 7,
  "score_reason": "por qué ese puntaje"
}`
        },
        { role: "user", content: transcript }
      ]
    })
    return JSON.parse(res.choices[0].message.content || "{}")
  } catch (err) {
    console.error("Analysis error:", err)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { roomName, tracks, videoUrl } = await req.json()
    console.log(`📹 Upload: roomName=${roomName}, tracks=${tracks?.length}, sizes=${tracks?.map((t: any) => t.size).join(",")}`)

    if (!roomName || !tracks?.length) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
    }

    // Transcribir cada pista por separado
    const transcriptParts: string[] = []
    for (const track of tracks) {
      const text = await transcribeBase64(track.data, track.identity)
      if (text) transcriptParts.push(`[${track.identity}]: ${text}`)
    }

    const fullTranscript = transcriptParts.join("\n\n")
    console.log(`📹 Transcript: ${fullTranscript.length} chars`)

    // Buscar info de la sala (prospect_id, organization_id)
    const { data: videoRoom } = await supabase
      .from("video_rooms")
      .select("prospect_id, organization_id")
      .eq("room_name", roomName)
      .maybeSingle()

    // Buscar o crear video_recording
    const { data: existing } = await supabase
      .from("video_recordings")
      .select("id")
      .eq("room_name", roomName)
      .maybeSingle()

    let recordingId = existing?.id

    if (existing?.id) {
      await supabase.from("video_recordings")
        .update({
          transcript: fullTranscript || null,
          recording_url: videoUrl || null,
          status: "completed",
          prospect_id: videoRoom?.prospect_id || null,
          organization_id: videoRoom?.organization_id || null,
        })
        .eq("id", existing.id)
    } else {
      const { data: newRec } = await supabase.from("video_recordings").insert({
        room_name: roomName,
        transcript: fullTranscript || null,
        recording_url: videoUrl || null,
        status: "completed",
        prospect_id: videoRoom?.prospect_id || null,
        organization_id: videoRoom?.organization_id || null,
      }).select("id").single()
      recordingId = newRec?.id
    }

    // Analizar con IA
    if (recordingId && fullTranscript) {
      const analysis = await analyzeTranscript(fullTranscript)
      if (analysis) {
        await supabase.from("video_analyses").upsert({
          video_recording_id: recordingId,
          ...analysis,
        }, { onConflict: "video_recording_id" })
        console.log(`📹 Análisis guardado para ${recordingId}`)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Upload error:", err)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}
