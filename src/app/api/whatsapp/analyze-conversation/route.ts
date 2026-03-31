import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import OpenAI from "openai"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { prospectId } = await req.json()
  if (!prospectId) return NextResponse.json({ error: "Falta prospectId" }, { status: 400 })

  // Get org context
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, organizations(name, company_description, product_service, value_proposition)")
    .eq("id", user.id)
    .single()

  const orgId = profile?.organization_id as string | null
  const org = profile?.organizations as Record<string, string> | null

  // Use org API key if configured
  let apiKey = process.env.OPENAI_API_KEY
  if (orgId) {
    const { data: apiKeys } = await supabase.from("org_api_keys").select("openai_key").eq("organization_id", orgId).single()
    if (apiKeys?.openai_key) apiKey = apiKeys.openai_key
  }
  if (!apiKey) return NextResponse.json({ error: "OpenAI API key no configurada" }, { status: 500 })

  // Get prospect info
  const { data: prospect } = await supabase
    .from("prospects")
    .select("full_name, company, headline, status")
    .eq("id", prospectId)
    .single()

  // Get all messages
  const { data: messages, error: msgsError } = await supabase
    .from("whatsapp_messages")
    .select("direction, content, media_type, media_url, created_at")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: true })

  if (msgsError || !messages) {
    return NextResponse.json({ error: "Error cargando mensajes" }, { status: 500 })
  }

  if (messages.length === 0) {
    return NextResponse.json({ error: "No hay mensajes para analizar" }, { status: 400 })
  }

  // Transcribe audio messages
  const openai = new OpenAI({ apiKey })
  const transcribedMessages: string[] = []

  for (const msg of messages) {
    const time = new Date(msg.created_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    const who = msg.direction === "outbound" ? "SETTER" : "PROSPECTO"

    if (msg.media_type === "audio" && msg.media_url) {
      try {
        const audioRes = await fetch(msg.media_url)
        if (audioRes.ok) {
          const audioBuffer = await audioRes.arrayBuffer()
          const audioFile = new File([audioBuffer], "audio.ogg", { type: "audio/ogg" })
          const transcription = await openai.audio.transcriptions.create({
            model: "whisper-1",
            file: audioFile,
            language: "es",
          })
          transcribedMessages.push(`[${time}] ${who} (audio): ${transcription.text}`)
        } else {
          transcribedMessages.push(`[${time}] ${who}: [Audio - no se pudo descargar]`)
        }
      } catch {
        transcribedMessages.push(`[${time}] ${who}: [Audio - error al transcribir]`)
      }
    } else if (msg.media_type === "image") {
      transcribedMessages.push(`[${time}] ${who}: [Imagen enviada]${msg.content && msg.content !== "[Imagen]" ? ` - "${msg.content}"` : ""}`)
    } else if (msg.media_type === "video") {
      transcribedMessages.push(`[${time}] ${who}: [Video enviado]${msg.content && msg.content !== "[Video]" ? ` - "${msg.content}"` : ""}`)
    } else if (msg.media_type === "document") {
      transcribedMessages.push(`[${time}] ${who}: [Documento enviado]${msg.content && msg.content !== "[Documento]" ? ` - "${msg.content}"` : ""}`)
    } else {
      transcribedMessages.push(`[${time}] ${who}: ${msg.content}`)
    }
  }

  const conversationText = transcribedMessages.join("\n")

  const orgName = org?.name || "la empresa"
  const orgDesc = org?.company_description || ""
  const orgProduct = org?.product_service || ""
  const orgValue = org?.value_proposition || ""

  const systemPrompt = `Sos un experto en ventas B2B y análisis de conversaciones comerciales. Tu trabajo es analizar conversaciones de WhatsApp entre un setter (vendedor) y un prospecto, y dar feedback accionable.

Contexto de la empresa que vende:
- Empresa: ${orgName}
${orgDesc ? `- Descripción: ${orgDesc}` : ""}
${orgProduct ? `- Producto/Servicio: ${orgProduct}` : ""}
${orgValue ? `- Propuesta de valor: ${orgValue}` : ""}

El objetivo del setter es agendar una llamada de 20-30 minutos con el prospecto.`

  const userPrompt = `Analizá esta conversación de WhatsApp con el prospecto ${prospect?.full_name || "desconocido"} (${prospect?.company || "empresa no especificada"}, ${prospect?.headline || ""}).

CONVERSACIÓN:
${conversationText}

Dame un análisis completo con este formato exacto:

📊 **ESTADO DE LA CONVERSACIÓN**
(Resumí en 1-2 oraciones cómo viene: fría, tibia, caliente, muerta, etc.)

🎯 **NIVEL DE INTERÉS DEL PROSPECTO**
(Bajo / Medio / Alto / Muy Alto — justificá brevemente por qué)

✅ **LO QUE SE HIZO BIEN**
(Lista de cosas que el setter hizo bien)

⚠️ **ERRORES O ÁREAS DE MEJORA**
(Lista de errores o cosas que se podrían mejorar)

💡 **PRÓXIMO PASO RECOMENDADO**
(Qué debería hacer el setter AHORA — sé específico y directo)

✍️ **MENSAJE SUGERIDO**
(Escribí el mensaje exacto que el setter debería enviar ahora para avanzar hacia agendar la llamada. Que sea natural, corto y directo.)

Sé directo, práctico y honesto. No endulces si la conversación va mal.`

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    })

    const analysis = response.choices[0].message.content || "No se pudo generar el análisis"

    return NextResponse.json({
      ok: true,
      analysis,
      messageCount: messages.length,
      audioTranscribed: messages.filter(m => m.media_type === "audio").length,
    })
  } catch (err: unknown) {
    console.error("[analyze-conversation] Error:", err)
    const message = err instanceof Error ? err.message : "Error interno"
    return NextResponse.json({ error: `Error de IA: ${message}` }, { status: 500 })
  }
}
