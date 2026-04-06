import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 })
    const orgId = profile.organization_id

    // Get closer metrics with objections and loss reasons
    const { data: metrics } = await supabase
      .from("closer_metrics")
      .select("objeciones_principales, motivo_no_cierre, ventas_cerradas, fecha")
      .eq("organization_id", orgId)
      .order("fecha", { ascending: false })
      .limit(200)

    // Get follow-ups with response data 
    const { data: followUps } = await supabase
      .from("follow_ups")
      .select("prospect_id, phase, status, prospect_responded, created_at, sent_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(500)

    // Get lost prospects with notes for context
    const { data: lostProspects } = await supabase
      .from("prospects")
      .select("id, full_name, company, notes, status, phase, headline")
      .eq("organization_id", orgId)
      .eq("status", "cerrado_perdido")
      .order("created_at", { ascending: false })
      .limit(100)

    // WhatsApp messages to detect objections in conversation
    const { data: messages } = await supabase
      .from("whatsapp_messages")
      .select("content, direction, prospect_id, created_at")
      .eq("organization_id", orgId)
      .eq("direction", "inbound")
      .order("created_at", { ascending: false })
      .limit(500)

    // ========= Analyze objections =========

    // Known objection patterns in Spanish
    const objectionPatterns: { category: string; patterns: RegExp[]; icon: string; rebuttals: string[] }[] = [
      {
        category: "Precio / Presupuesto",
        icon: "💰",
        patterns: [/precio|caro|costoso|presupuesto|no puedo pagar|muy caro|no alcanza|descuento|barato|plata|dinero|inversión grande/i],
        rebuttals: [
          "Entiendo tu preocupación. ¿Podemos ver juntos el ROI que genera? En promedio nuestros clientes recuperan la inversión en X semanas.",
          "¿Qué presupuesto tenés disponible? Quizás podemos armar un plan a medida.",
          "Pensalo como inversión, no gasto. ¿Cuánto perdés por mes sin resolver este problema?",
        ],
      },
      {
        category: "Timing / No es el momento",
        icon: "⏰",
        patterns: [/ahora no|más adelante|otro momento|no es el momento|después|el mes que viene|ocupado|sin tiempo|a futuro/i],
        rebuttals: [
          "Entiendo. ¿Qué tendría que pasar para que sea el momento indicado?",
          "¿Y si arrancamos con una versión mínima para que cuando estés listo ya tengamos todo preparado?",
          "¿Cuándo sería un mejor momento? Te agendo un follow-up para esa fecha.",
        ],
      },
      {
        category: "Ya tengo solución",
        icon: "🔄",
        patterns: [/ya tengo|ya uso|ya tenemos|competencia|otra herramienta|otro proveedor|estoy con|trabajando con/i],
        rebuttals: [
          "¡Genial que ya tengas algo! ¿Qué es lo que más te gusta de lo que usás? A veces podemos complementar.",
          "¿Hay algo que tu solución actual no te resuelve al 100%?",
          "¿Estarías abierto a comparar? Sin compromiso, así ves las diferencias.",
        ],
      },
      {
        category: "Necesito consultarlo",
        icon: "🤝",
        patterns: [/consultar|hablar con|decisión no es mía|jefe|socio|equipo|aprobación|consultar con/i],
        rebuttals: [
          "Perfecto, ¿quién más está involucrado en la decisión? Puedo prepararte un resumen para que lo compartas.",
          "¿Te sirve si agendamos una llamada donde incluimos a esa persona?",
          "¿Qué info necesitarías para presentárselo? Te lo armo.",
        ],
      },
      {
        category: "No entiendo el valor",
        icon: "🤔",
        patterns: [/no entiendo|para qué|no me queda claro|cómo funciona|no veo|beneficio|qué gano|no sé si/i],
        rebuttals: [
          "Dale, te lo explico con un ejemplo concreto de tu industria...",
          "¿Qué problema específico estás tratando de resolver? Así te muestro cómo aplica.",
          "¿Te sirve si te muestro un caso de éxito similar al tuyo?",
        ],
      },
      {
        category: "Desconfianza / Riesgo",
        icon: "🛡️",
        patterns: [/no confío|riesgo|garantía|seguro|funciona|prueba|testimonios|referencias|resultados reales/i],
        rebuttals: [
          "Es lógico ser cauteloso. ¿Te sirve si te conecto con un cliente actual para que te cuente su experiencia?",
          "Ofrecemos X días de garantía. Si no ves resultados, te devolvemos el 100%.",
          "Puedo mostrarte casos de estudio verificables de empresas similares.",
        ],
      },
      {
        category: "Falta de urgencia",
        icon: "😴",
        patterns: [/no es prioridad|tengo otras cosas|no urgente|lo pienso|voy a pensar|quizás|tal vez|puede ser/i],
        rebuttals: [
          "¿Qué es lo que sí es prioridad hoy? Quizás hay una conexión que no vemos.",
          "¿Cuánto te cuesta cada mes que pasa sin resolver esto?",
          "Te propongo algo: arranquemos con algo pequeño sin compromiso, así empezás a ver resultados.",
        ],
      },
    ]

    // Count objections from closer_metrics
    const metricObjections: Record<string, number> = {}
    const lossReasons: Record<string, number> = {}
    
    for (const m of (metrics || [])) {
      if (m.objeciones_principales) {
        const text = m.objeciones_principales.toLowerCase()
        for (const pattern of objectionPatterns) {
          if (pattern.patterns.some(p => p.test(text))) {
            metricObjections[pattern.category] = (metricObjections[pattern.category] || 0) + 1
          }
        }
      }
      if (m.motivo_no_cierre) {
        const reason = m.motivo_no_cierre.trim()
        if (reason) lossReasons[reason] = (lossReasons[reason] || 0) + 1
      }
    }

    // Count objections from WhatsApp messages
    const messageObjections: Record<string, number> = {}
    for (const msg of (messages || [])) {
      if (!msg.content) continue
      const text = msg.content.toLowerCase()
      for (const pattern of objectionPatterns) {
        if (pattern.patterns.some(p => p.test(text))) {
          messageObjections[pattern.category] = (messageObjections[pattern.category] || 0) + 1
        }
      }
    }

    // Merge counts
    const objections = objectionPatterns.map(pattern => {
      const fromMetrics = metricObjections[pattern.category] || 0
      const fromMessages = messageObjections[pattern.category] || 0
      const total = fromMetrics + fromMessages
      return {
        category: pattern.category,
        icon: pattern.icon,
        count: total,
        fromMetrics,
        fromMessages,
        rebuttals: pattern.rebuttals,
      }
    }).sort((a, b) => b.count - a.count)

    // Follow-up effectiveness after objection-heavy conversations
    const respondedFollowUps = (followUps || []).filter(f => f.prospect_responded)
    const totalFollowUps = (followUps || []).length
    const responseRate = totalFollowUps > 0 ? Math.round((respondedFollowUps.length / totalFollowUps) * 100) : 0

    // Loss reason ranking
    const topLossReasons = Object.entries(lossReasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }))

    // Stats
    const totalObjectionsDetected = objections.reduce((s, o) => s + o.count, 0)
    const topObjection = objections[0]?.category || "Ninguna"
    const lostCount = (lostProspects || []).length

    return NextResponse.json({
      objections,
      topLossReasons,
      stats: {
        totalObjections: totalObjectionsDetected,
        topObjection,
        lostProspects: lostCount,
        followUpResponseRate: responseRate,
        dataPoints: (metrics || []).length + (messages || []).length,
      },
    })
  } catch {
    return NextResponse.json({
      objections: [],
      topLossReasons: [],
      stats: { totalObjections: 0, topObjection: "N/A", lostProspects: 0, followUpResponseRate: 0, dataPoints: 0 },
    })
  }
}
