import { NextResponse } from "next/server"
import OpenAI from "openai"
import type { AutopilotAction } from "@/app/api/autopilot/route"

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 500 })

  const { actions, userName } = (await req.json()) as {
    actions: AutopilotAction[]
    userName: string
  }

  if (!actions || actions.length === 0) {
    return NextResponse.json({
      briefing: `${userName ? userName.split(" ")[0] : "Crack"}, hoy no hay nada urgente. Buen momento para revisar si hay prospectos nuevos que analizar.`
    })
  }

  const openai = new OpenAI({ apiKey })

  const actionsText = actions.map((a, i) => {
    const parts = [`${i + 1}. ${a.prospectName}`]
    if (a.company) parts.push(`(${a.company})`)
    parts.push(`— Tipo: ${a.type}`)
    parts.push(`— ${a.detail}`)
    if (a.aiScore) parts.push(`— AI Score: ${a.aiScore}/100`)
    parts.push(`— Prioridad: ${a.priority}`)
    return parts.join(" ")
  }).join("\n")

  const hora = new Date().getHours()
  const momento = hora < 12 ? "mañana" : hora < 19 ? "tarde" : "noche"

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.8,
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content: `Sos Areté IA OS, el asistente de ventas inteligente del CRM. Tu trabajo es dar un briefing ultra-directo al setter/closer sobre qué hacer AHORA.

Reglas:
- Hablás en español argentino casual-profesional (tuteo con "vos", "dale", "mandale", "no lo dejes escapar")
- Máximo 4-5 oraciones cortas. Nada de bullet points ni listas.
- Empezá con el nombre del usuario y algo de contexto (hora del día)
- Priorizá lo más urgente primero
- Si alguien respondió WhatsApp, hacé énfasis en que responda YA
- Si hay leads calientes con AI score alto, mencionalo con entusiasmo
- Si hay prospectos para soltar, decilo con naturalidad ("ese ya fue, no pierdas tiempo")
- Soná como un compañero de equipo que sabe lo que hace, no como un robot
- NO uses emojis
- NO uses formato markdown ni asteriscos`
      },
      {
        role: "user",
        content: `Es ${momento}, el usuario se llama ${userName || "crack"}. Estas son las acciones pendientes ordenadas por prioridad:\n\n${actionsText}\n\nDale un briefing directo de qué hacer ahora.`
      }
    ],
  })

  const briefing = response.choices[0].message.content || "Sin datos suficientes para un briefing."

  return NextResponse.json({ briefing })
}
