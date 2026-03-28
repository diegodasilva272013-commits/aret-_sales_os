import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { recordingId } = await req.json()
  if (!recordingId) return NextResponse.json({ error: "Falta recordingId" }, { status: 400 })

  // Obtener la grabación con transcript
  const { data: recording, error } = await supabase
    .from("call_recordings")
    .select("id, transcript, prospect_id, organization_id, prospects(full_name, company)")
    .eq("id", recordingId)
    .single()

  if (error || !recording) return NextResponse.json({ error: "Grabación no encontrada" }, { status: 404 })
  if (!recording.transcript) return NextResponse.json({ error: "No hay transcripción disponible" }, { status: 400 })

  const prospect = recording.prospects as { full_name?: string; company?: string } | null

  const prompt = `Sos un experto en ventas B2B y análisis de llamadas comerciales. Analizá la siguiente transcripción de una llamada de ventas y devolvé un análisis detallado en JSON.

Prospecto: ${prospect?.full_name || "Desconocido"} ${prospect?.company ? `de ${prospect.company}` : ""}

Transcripción:
${recording.transcript}

Devolvé SOLO un JSON válido con esta estructura exacta:
{
  "summary": "Resumen ejecutivo de la llamada en 2-3 oraciones",
  "tone": "uno de: muy_interesado | interesado | neutral | dudoso | frio | hostil",
  "tone_explanation": "Explicación breve del tono detectado",
  "objections": ["objeción 1", "objeción 2"],
  "buying_signals": ["señal 1", "señal 2"],
  "pain_points": ["problema 1", "problema 2"],
  "next_step": "Acción concreta recomendada para el próximo contacto",
  "recommendation": "Recomendación detallada para el closer: qué decir, cómo enfocarlo, qué evitar",
  "score": 7,
  "score_reason": "Por qué recibió ese puntaje del 1 al 10"
}`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    })

    const analysis = JSON.parse(completion.choices[0].message.content || "{}")

    const { data: saved } = await supabase
      .from("call_analyses")
      .upsert({
        call_recording_id: recordingId,
        prospect_id: recording.prospect_id || null,
        organization_id: recording.organization_id,
        summary: analysis.summary,
        tone: analysis.tone,
        objections: analysis.objections || [],
        buying_signals: analysis.buying_signals || [],
        recommendation: analysis.recommendation,
        score: analysis.score,
        raw_analysis: analysis,
      }, { onConflict: "call_recording_id" })
      .select("id")
      .single()

    return NextResponse.json({ ok: true, analysis, id: saved?.id })
  } catch (err) {
    console.error("Analysis error:", err)
    return NextResponse.json({ error: "Error al analizar" }, { status: 500 })
  }
}
