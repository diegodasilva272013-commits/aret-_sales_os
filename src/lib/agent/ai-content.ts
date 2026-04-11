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
- Escribí en el mismo idioma que el post
- NO uses frases genéricas de ChatGPT como "excelente post", "gran reflexión", "me encanta tu perspectiva"
- Sé directo, opiná, agregá una experiencia corta o dato relevante
- Si el post es en español rioplatense, usá ese tono`,
      },
      {
        role: "user",
        content: `Post de ${ctx.prospectName} (${ctx.prospectHeadline}):\n\n${ctx.postContent}\n\nGenerá un comentario que suene a persona real.`,
      },
    ],
    max_tokens: 150,
    temperature: 0.9,
  })
  return res.choices[0]?.message?.content || "Buen punto, coincido."
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

/** Analyze a profile deeply to find pain points and sales angle */
export async function analyzeProfile(ctx: {
  fullName: string
  headline: string
  about: string
  experience: Array<{ title: string; company: string; duration: string }>
  skills: string[]
  recentPosts: string[]
  serviceDescription: string
}): Promise<{ painPoints: string[]; salesAngle: string; discType: string; fitScore: number; toneStyle: string }> {
  const res = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Sos un analista de ventas experto. Analizá el perfil de LinkedIn y respondé en JSON puro (sin markdown):
{
  "painPoints": ["dolor 1", "dolor 2", "dolor 3"],
  "salesAngle": "ángulo de venta específico en 1-2 oraciones",
  "discType": "D|I|S|C",
  "fitScore": 0-100,
  "toneStyle": "formal|informal|técnico|ejecutivo"
}

Criterios:
- painPoints: problemas reales que podría tener basado en su cargo/industria
- salesAngle: cómo conectar tu servicio con sus necesidades reales
- discType: basado en cómo escribe y su cargo (D=directo/resultados, I=influyente/relaciones, S=estable/equipo, C=analítico/datos)
- fitScore: qué tan buen fit es como prospecto (0=nulo, 100=perfecto)
- toneStyle: cómo se comunica esta persona`,
      },
      {
        role: "user",
        content: `Perfil: ${ctx.fullName}
Headline: ${ctx.headline}
About: ${ctx.about || "(sin about)"}
Experiencia: ${ctx.experience.map(e => `${e.title} en ${e.company}`).join(", ") || "(sin experiencia)"}
Skills: ${ctx.skills.join(", ") || "(sin skills)"}
Posts recientes: ${ctx.recentPosts.length ? ctx.recentPosts.join(" | ") : "(sin posts)"}
Servicio que ofrecemos: ${ctx.serviceDescription}`,
      },
    ],
    max_tokens: 400,
    temperature: 0.3,
  })

  try {
    const text = res.choices[0]?.message?.content || "{}"
    const clean = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim()
    return JSON.parse(clean)
  } catch {
    return { painPoints: [], salesAngle: "", discType: "I", fitScore: 50, toneStyle: "informal" }
  }
}

/** Generate a HUMAN first DM — the most critical message */
export async function generateFirstDM(ctx: {
  prospectName: string
  prospectHeadline: string
  prospectCompany: string
  about: string
  painPoints: string[]
  salesAngle: string
  toneStyle: string
  recentPostSnippet?: string
  serviceDescription: string
}): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Generá un mensaje directo de LinkedIn que parezca escrito por una PERSONA REAL, no por una IA.

REGLAS ESTRICTAS:
- Máximo 4 oraciones cortas
- PROHIBIDO: "espero que estés bien", "me parece muy interesante tu perfil", "vi que trabajás en...", "me gustaría conectar contigo"
- PROHIBIDO: empezar con halago genérico
- Usá el tono que usa la persona (${ctx.toneStyle})
- Arrancá con algo ESPECÍFICO: un post que hizo, un problema de su industria, algo concreto
- Generá curiosidad sobre tu servicio sin decir qué vendés
- Terminá con pregunta directa y corta
- Si el tono es informal, tuteá. Si es rioplatense, usá "vos"
- No uses signos de exclamación exagerados ni emojis`,
      },
      {
        role: "user",
        content: `Mensaje para ${ctx.prospectName} (${ctx.prospectHeadline}, ${ctx.prospectCompany}).
About: ${ctx.about || "(sin about)"}
Dolores detectados: ${ctx.painPoints.join(", ") || "generales de su industria"}
Ángulo de venta: ${ctx.salesAngle}
${ctx.recentPostSnippet ? `Post reciente: "${ctx.recentPostSnippet.slice(0, 200)}"` : ""}
Servicio: ${ctx.serviceDescription}`,
      },
    ],
    max_tokens: 250,
    temperature: 0.85,
  })
  return res.choices[0]?.message?.content || ""
}

/** Generate follow-up message (day 2 after no response) */
export async function generateFollowUp(ctx: {
  prospectName: string
  prospectHeadline: string
  firstMessage: string
  toneStyle: string
}): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Generá un mensaje de seguimiento para LinkedIn. La persona no respondió al primer mensaje.

REGLAS:
- Máximo 2-3 oraciones
- NO repitás lo del primer mensaje
- NO digas "te escribí hace unos días" ni "no sé si viste mi mensaje"
- Ofrecé algo de valor gratis: un dato, una pregunta provocadora, un insight de su industria
- Debe sentirse como un mensaje separado, no un recordatorio
- Tono: ${ctx.toneStyle}`,
      },
      {
        role: "user",
        content: `Follow-up para ${ctx.prospectName} (${ctx.prospectHeadline}).
Primer mensaje que mandamos: "${ctx.firstMessage}"`,
      },
    ],
    max_tokens: 150,
    temperature: 0.85,
  })
  return res.choices[0]?.message?.content || ""
}

/** Generate a direct message to start a sales conversation (legacy) */
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
