// =====================================================
// Areté Sales OS — AI Content Generation for Agent
// =====================================================
import OpenAI from "openai"

let _openai: OpenAI | null = null
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  return _openai
}

/** Generate a natural comment for a LinkedIn post */
export async function generateComment(ctx: {
  postContent: string
  prospectName: string
  prospectHeadline: string
}): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Sos un profesional que comenta posts de LinkedIn de forma natural y valiosa.
- Máximo 2-3 oraciones
- No vendas nada
- Sé genuino y específico sobre el contenido
- Escribí en el mismo idioma que el post`,
      },
      {
        role: "user",
        content: `Post de ${ctx.prospectName} (${ctx.prospectHeadline}):\n\n${ctx.postContent}\n\nGenerá un comentario valioso.`,
      },
    ],
    max_tokens: 150,
    temperature: 0.8,
  })
  return res.choices[0]?.message?.content || "Excelente punto, totalmente de acuerdo."
}

/** Generate a short connection request note (max 280 chars) */
export async function generateConnectionNote(ctx: {
  prospectName: string
  prospectHeadline: string
  prospectCompany: string
  discType?: string | null
}): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Generá una nota de conexión LinkedIn corta y profesional.
- Máximo 280 caracteres
- Mencioná algo del perfil
- No vendas. Solo conectá.
- Sé cálido pero profesional`,
      },
      {
        role: "user",
        content: `Conectar con ${ctx.prospectName}, ${ctx.prospectHeadline} en ${ctx.prospectCompany}.${ctx.discType ? ` DISC: ${ctx.discType}` : ""}`,
      },
    ],
    max_tokens: 100,
    temperature: 0.7,
  })
  return (res.choices[0]?.message?.content || "").slice(0, 280)
}

/** Generate a direct message to start a sales conversation */
export async function generateDirectMessage(ctx: {
  prospectName: string
  prospectHeadline: string
  prospectCompany: string
  painPoints?: string[] | null
  salesAngle?: string | null
  discType?: string | null
}): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Generá un mensaje directo de LinkedIn para iniciar conversación.
- Máximo 4-5 oraciones
- No seas agresivo, generá curiosidad
- Adaptá al perfil DISC si está disponible
- Terminá con una pregunta abierta`,
      },
      {
        role: "user",
        content: `Mensaje para ${ctx.prospectName}, ${ctx.prospectHeadline} en ${ctx.prospectCompany}.
${ctx.painPoints?.length ? `Pain points: ${ctx.painPoints.join(", ")}` : ""}
${ctx.salesAngle ? `Sales angle: ${ctx.salesAngle}` : ""}
${ctx.discType ? `DISC: ${ctx.discType}` : ""}`,
      },
    ],
    max_tokens: 300,
    temperature: 0.7,
  })
  return res.choices[0]?.message?.content || "Hola! Vi tu perfil y me pareció muy interesante. ¿Podemos charlar?"
}
