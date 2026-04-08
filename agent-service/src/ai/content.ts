// =====================================================
// Areté Agent Service — AI Content Generation
// =====================================================
// Uses OpenAI to generate personalized comments and
// messages based on prospect data and ICP context.
//
// TODO: Implement full AI generation logic
// =====================================================

import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

/**
 * Generate a comment for a LinkedIn post
 */
export async function generateComment(context: {
  postContent: string
  prospectName: string
  prospectHeadline: string
  salesAngle?: string
}): Promise<string> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Sos un experto en ventas B2B que comenta posts de LinkedIn de forma natural y valiosa.
Tu objetivo es agregar valor al post para que el autor te note.
- Máximo 2-3 oraciones
- No vendas nada directamente
- Sé genuino y específico sobre el contenido
- Escribí en el mismo idioma que el post`,
      },
      {
        role: "user",
        content: `Post de ${context.prospectName} (${context.prospectHeadline}):\n\n${context.postContent}\n\nGenerá un comentario valioso y natural.`,
      },
    ],
    max_tokens: 150,
    temperature: 0.8,
  })

  return res.choices[0]?.message?.content || "Excelente punto, totalmente de acuerdo."
}

/**
 * Generate a connection request note
 */
export async function generateConnectionNote(context: {
  prospectName: string
  prospectHeadline: string
  prospectCompany: string
  salesAngle?: string
  discType?: string
}): Promise<string> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Generá una nota de conexión de LinkedIn corta y profesional.
- Máximo 280 caracteres (límite de LinkedIn)
- Mencioná algo específico del perfil
- No vendas. Solo conectá.
- Sé cálido pero profesional`,
      },
      {
        role: "user",
        content: `Quiero conectar con ${context.prospectName}, ${context.prospectHeadline} en ${context.prospectCompany}.${context.salesAngle ? ` Sales angle: ${context.salesAngle}` : ""}${context.discType ? ` Perfil DISC: ${context.discType}` : ""}`,
      },
    ],
    max_tokens: 100,
    temperature: 0.7,
  })

  const note = res.choices[0]?.message?.content || ""
  return note.slice(0, 280)
}

/**
 * Generate a direct message
 */
export async function generateDirectMessage(context: {
  prospectName: string
  prospectHeadline: string
  prospectCompany: string
  painPoints?: string[]
  salesAngle?: string
  discType?: string
  previousInteractions?: string
}): Promise<string> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Generá un mensaje directo de LinkedIn para iniciar una conversación de ventas.
- Máximo 4-5 oraciones
- Referenciá interacciones previas si las hay
- Adaptá al perfil DISC si está disponible
- No seas agresivo, generá curiosidad
- Terminá con una pregunta abierta`,
      },
      {
        role: "user",
        content: `Mensaje para ${context.prospectName}, ${context.prospectHeadline} en ${context.prospectCompany}.
${context.painPoints?.length ? `Pain points: ${context.painPoints.join(", ")}` : ""}
${context.salesAngle ? `Sales angle: ${context.salesAngle}` : ""}
${context.discType ? `DISC: ${context.discType}` : ""}
${context.previousInteractions ? `Interacciones previas: ${context.previousInteractions}` : ""}`,
      },
    ],
    max_tokens: 300,
    temperature: 0.7,
  })

  return res.choices[0]?.message?.content || "Hola! Vi tu perfil y me pareció muy interesante tu trabajo. ¿Podemos charlar?"
}
