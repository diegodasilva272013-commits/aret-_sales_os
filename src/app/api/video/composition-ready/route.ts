import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import OpenAI from "openai"

let _sb: any, _ai: OpenAI
const supabase = new Proxy({} as any, { get(_, p: string) { const c = _sb ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); const v = c[p]; return typeof v === "function" ? v.bind(c) : v } })
const openai = new Proxy({} as OpenAI, { get(_, p: string) { const c = _ai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY! }); const v = (c as any)[p]; return typeof v === "function" ? v.bind(c) : v } })

async function analyzeTranscript(transcript: string) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Eres un experto en ventas B2B. Analiza esta transcripción de videollamada de ventas (el formato es [Nombre]: texto para cada participante) y devuelve un JSON con:
{
  "summary": "resumen en 2-3 oraciones",
  "tone": "positivo|neutral|negativo|interesado|resistente",
  "tone_explanation": "por qué ese tono en 1 oración",
  "objections": ["lista de objeciones mencionadas"],
  "buying_signals": ["señales de interés o compra"],
  "pain_points": ["problemas o dolores identificados"],
  "next_step": "acción concreta recomendada",
  "recommendation": "consejo para el setter en 1-2 oraciones",
  "score": 7,
  "score_reason": "por qué ese puntaje del 1 al 10"
}`
        },
        { role: "user", content: transcript }
      ]
    })
    return JSON.parse(response.choices[0].message.content || "{}")
  } catch (err) {
    console.error("Analysis error:", err)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const status = formData.get("Status")?.toString()
    const compositionSid = formData.get("CompositionSid")?.toString()
    const duration = formData.get("Duration")?.toString()

    console.log("🎬 Composition ready:", compositionSid, "status:", status)

    if ((status !== "completed" && status !== "composed") || !compositionSid) {
      return NextResponse.json({ ok: true })
    }

    // URL del video
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")
    const mediaRes = await fetch(
      `https://video.twilio.com/v1/Compositions/${compositionSid}/Media?Ttl=86400`,
      { headers: { Authorization: `Basic ${auth}` }, redirect: "manual" }
    )
    const videoUrl = mediaRes.headers.get("location") || `https://video.twilio.com/v1/Compositions/${compositionSid}/Media`

    // Actualizar recording con URL del video
    const { data: recording } = await supabase
      .from("video_recordings")
      .update({
        recording_url: videoUrl,
        duration: parseInt(duration || "0"),
        status: "completed",
      })
      .eq("composition_sid", compositionSid)
      .select("id, transcript")
      .single()

    if (!recording?.id) return NextResponse.json({ ok: true })

    // Analizar con IA si hay transcripción
    if (recording.transcript) {
      const analysis = await analyzeTranscript(recording.transcript)
      if (analysis) {
        await supabase.from("video_analyses").upsert({
          video_recording_id: recording.id,
          ...analysis,
        }, { onConflict: "video_recording_id" })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error("Composition ready error:", err)
    return NextResponse.json({ ok: true })
  }
}
