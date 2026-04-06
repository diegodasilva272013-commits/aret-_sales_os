import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ============================================================
// Objection patterns — Spanish sales objections taxonomy
// ============================================================
const OBJECTION_PATTERNS: {
  category: string; patterns: RegExp[]; icon: string; killRate: "alto" | "medio" | "bajo"
  templateRebuttals: string[]
}[] = [
  {
    category: "Precio / Presupuesto",
    icon: "💰",
    killRate: "alto",
    patterns: [/precio|caro|costoso|presupuesto|no puedo pagar|muy caro|no alcanza|descuento|barato|plata|dinero|inversión grande/i],
    templateRebuttals: [
      "Entiendo tu preocupación. ¿Podemos ver juntos el ROI que genera? En promedio nuestros clientes recuperan la inversión en X semanas.",
      "¿Qué presupuesto tenés disponible? Quizás podemos armar un plan a medida.",
      "Pensalo como inversión, no gasto. ¿Cuánto perdés por mes sin resolver este problema?",
    ],
  },
  {
    category: "Timing / No es el momento",
    icon: "⏰",
    killRate: "medio",
    patterns: [/ahora no|más adelante|otro momento|no es el momento|después|el mes que viene|ocupado|sin tiempo|a futuro/i],
    templateRebuttals: [
      "Entiendo. ¿Qué tendría que pasar para que sea el momento indicado?",
      "¿Y si arrancamos con una versión mínima para que cuando estés listo ya tengamos todo preparado?",
      "¿Cuándo sería un mejor momento? Te agendo un follow-up para esa fecha.",
    ],
  },
  {
    category: "Ya tengo solución",
    icon: "🔄",
    killRate: "medio",
    patterns: [/ya tengo|ya uso|ya tenemos|competencia|otra herramienta|otro proveedor|estoy con|trabajando con/i],
    templateRebuttals: [
      "¡Genial que ya tengas algo! ¿Qué es lo que más te gusta de lo que usás? A veces podemos complementar.",
      "¿Hay algo que tu solución actual no te resuelve al 100%?",
      "¿Estarías abierto a comparar? Sin compromiso, así ves las diferencias.",
    ],
  },
  {
    category: "Necesito consultarlo",
    icon: "🤝",
    killRate: "bajo",
    patterns: [/consultar|hablar con|decisión no es mía|jefe|socio|equipo|aprobación|consultar con/i],
    templateRebuttals: [
      "Perfecto, ¿quién más está involucrado en la decisión? Puedo prepararte un resumen para que lo compartas.",
      "¿Te sirve si agendamos una llamada donde incluimos a esa persona?",
      "¿Qué info necesitarías para presentárselo? Te lo armo.",
    ],
  },
  {
    category: "No entiendo el valor",
    icon: "🤔",
    killRate: "medio",
    patterns: [/no entiendo|para qué|no me queda claro|cómo funciona|no veo|beneficio|qué gano|no sé si/i],
    templateRebuttals: [
      "Dale, te lo explico con un ejemplo concreto de tu industria...",
      "¿Qué problema específico estás tratando de resolver? Así te muestro cómo aplica.",
      "¿Te sirve si te muestro un caso de éxito similar al tuyo?",
    ],
  },
  {
    category: "Desconfianza / Riesgo",
    icon: "🛡️",
    killRate: "alto",
    patterns: [/no confío|riesgo|garantía|seguro|funciona|prueba|testimonios|referencias|resultados reales/i],
    templateRebuttals: [
      "Es lógico ser cauteloso. ¿Te sirve si te conecto con un cliente actual para que te cuente su experiencia?",
      "Ofrecemos X días de garantía. Si no ves resultados, te devolvemos el 100%.",
      "Puedo mostrarte casos de estudio verificables de empresas similares.",
    ],
  },
  {
    category: "Falta de urgencia",
    icon: "😴",
    killRate: "bajo",
    patterns: [/no es prioridad|tengo otras cosas|no urgente|lo pienso|voy a pensar|quizás|tal vez|puede ser/i],
    templateRebuttals: [
      "¿Qué es lo que sí es prioridad hoy? Quizás hay una conexión que no vemos.",
      "¿Cuánto te cuesta cada mes que pasa sin resolver esto?",
      "Te propongo algo: arranquemos con algo pequeño sin compromiso, así empezás a ver resultados.",
    ],
  },
]

function detectObjection(text: string): string | null {
  const lower = text.toLowerCase()
  for (const p of OBJECTION_PATTERNS) {
    if (p.patterns.some(r => r.test(lower))) return p.category
  }
  return null
}

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

    // Parallel queries
    const [metricsRes, followUpsRes, prospectsRes, messagesRes, outboundRes] = await Promise.all([
      // Closer metrics — includes objections + loss reasons + whether they closed
      supabase
        .from("closer_metrics")
        .select("objeciones_principales, motivo_no_cierre, ventas_cerradas, fecha, closer_name")
        .eq("organization_id", orgId)
        .order("fecha", { ascending: false })
        .limit(300),

      // Follow-ups
      supabase
        .from("follow_ups")
        .select("prospect_id, phase, status, prospect_responded, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(500),

      // All prospects with win/loss status
      supabase
        .from("prospects")
        .select("id, full_name, company, notes, status, phase")
        .eq("organization_id", orgId)
        .in("status", ["cerrado_ganado", "cerrado_perdido"])
        .order("created_at", { ascending: false })
        .limit(200),

      // Inbound WhatsApp — detect objections
      supabase
        .from("whatsapp_messages")
        .select("content, direction, prospect_id, created_at")
        .eq("organization_id", orgId)
        .eq("direction", "inbound")
        .order("created_at", { ascending: false })
        .limit(800),

      // Outbound WhatsApp — extract "what we replied" after objections
      supabase
        .from("whatsapp_messages")
        .select("content, direction, prospect_id, created_at")
        .eq("organization_id", orgId)
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(800),
    ])

    const metrics = metricsRes.data || []
    const followUps = followUpsRes.data || []
    const prospects = prospectsRes.data || []
    const inboundMsgs = messagesRes.data || []
    const outboundMsgs = outboundRes.data || []

    // Index prospects by id for fast lookup  
    const prospectById = new Map(prospects.map(p => [p.id, p]))
    const wonIds = new Set(prospects.filter(p => p.status === "cerrado_ganado").map(p => p.id))
    const lostIds = new Set(prospects.filter(p => p.status === "cerrado_perdido").map(p => p.id))

    // ============================================================
    // 1. Count objections per source (metrics + messages)
    // ============================================================
    const metricObjections: Record<string, number> = {}
    const metricWins: Record<string, number> = {}
    const metricLosses: Record<string, number> = {}
    const lossReasons: Record<string, number> = {}

    for (const m of metrics) {
      if (m.objeciones_principales) {
        const cat = detectObjection(m.objeciones_principales)
        if (cat) {
          metricObjections[cat] = (metricObjections[cat] || 0) + 1
          if ((m.ventas_cerradas || 0) > 0) {
            metricWins[cat] = (metricWins[cat] || 0) + 1
          } else {
            metricLosses[cat] = (metricLosses[cat] || 0) + 1
          }
        }
      }
      if (m.motivo_no_cierre) {
        const reason = m.motivo_no_cierre.trim()
        if (reason) lossReasons[reason] = (lossReasons[reason] || 0) + 1
      }
    }

    // ============================================================
    // 2. Detect objections in WhatsApp + find what we replied after
    // ============================================================
    const messageObjections: Record<string, number> = {}
    const msgWins: Record<string, number> = {}
    const msgLosses: Record<string, number> = {}

    // Build outbound index per prospect: prospect_id -> messages sorted by time
    const outboundByProspect = new Map<string, { content: string; created_at: string }[]>()
    for (const m of outboundMsgs) {
      if (!m.prospect_id || !m.content) continue
      const arr = outboundByProspect.get(m.prospect_id) || []
      arr.push({ content: m.content, created_at: m.created_at })
      outboundByProspect.set(m.prospect_id, arr)
    }

    // Battle-tested rebuttals: real replies we sent after an objection → that led to a WIN
    type BattleRebuttal = { text: string; prospectName: string; company: string; category: string }
    const battleRebuttals: BattleRebuttal[] = []

    // Live alerts: objections detected in last 24h
    const now = Date.now()
    const h24 = 24 * 60 * 60 * 1000
    type LiveAlert = {
      prospectId: string; prospectName: string; company: string
      objection: string; category: string; detectedAt: string; hoursAgo: number
    }
    const liveAlerts: LiveAlert[] = []

    for (const msg of inboundMsgs) {
      if (!msg.content) continue
      const cat = detectObjection(msg.content)
      if (!cat) continue

      messageObjections[cat] = (messageObjections[cat] || 0) + 1

      // Win/loss tracking per objection in WhatsApp
      if (msg.prospect_id) {
        if (wonIds.has(msg.prospect_id)) {
          msgWins[cat] = (msgWins[cat] || 0) + 1
        } else if (lostIds.has(msg.prospect_id)) {
          msgLosses[cat] = (msgLosses[cat] || 0) + 1
        }
      }

      // Find our reply after this objection (within 2h window)
      if (msg.prospect_id && wonIds.has(msg.prospect_id)) {
        const outbound = outboundByProspect.get(msg.prospect_id) || []
        const objTime = new Date(msg.created_at).getTime()
        const reply = outbound.find(o => {
          const replyTime = new Date(o.created_at).getTime()
          return replyTime > objTime && replyTime - objTime < 2 * 60 * 60 * 1000 // within 2h
        })
        if (reply && reply.content.length > 20 && reply.content.length < 500) {
          const prospect = prospectById.get(msg.prospect_id)
          battleRebuttals.push({
            text: reply.content,
            prospectName: prospect?.full_name || "Prospect",
            company: prospect?.company || "",
            category: cat,
          })
        }
      }

      // Live alert: last 24h
      const msgAge = now - new Date(msg.created_at).getTime()
      if (msgAge < h24 && msg.prospect_id) {
        const prospect = prospectById.get(msg.prospect_id)
        liveAlerts.push({
          prospectId: msg.prospect_id,
          prospectName: prospect?.full_name || msg.prospect_id,
          company: prospect?.company || "",
          objection: msg.content.slice(0, 120),
          category: cat,
          detectedAt: msg.created_at,
          hoursAgo: Math.round(msgAge / (60 * 60 * 1000)),
        })
      }
    }

    // ============================================================
    // 3. Build objection cards with win rate + battle-tested rebuttals
    // ============================================================
    const objections = OBJECTION_PATTERNS.map(pattern => {
      const fromMetrics = metricObjections[pattern.category] || 0
      const fromMessages = messageObjections[pattern.category] || 0
      const total = fromMetrics + fromMessages

      // Win rate: how often this objection was overcome
      const wins = (metricWins[pattern.category] || 0) + (msgWins[pattern.category] || 0)
      const losses = (metricLosses[pattern.category] || 0) + (msgLosses[pattern.category] || 0)
      const totalOutcomes = wins + losses
      const winRate = totalOutcomes > 0 ? Math.round((wins / totalOutcomes) * 100) : null

      // Battle-tested rebuttals for this category (deduplicated, max 3)
      const realRebuttals = battleRebuttals
        .filter(r => r.category === pattern.category)
        .slice(0, 3)
        .map(r => ({
          text: r.text,
          source: r.company ? `${r.prospectName} (${r.company})` : r.prospectName,
          verified: true,
        }))

      // Template rebuttals (fallback)
      const templateRebuttals = pattern.templateRebuttals.map(t => ({
        text: t, source: "Plantilla", verified: false,
      }))

      // Merge: battle-tested first, then fill with templates up to 4
      const allRebuttals = [...realRebuttals, ...templateRebuttals].slice(0, 4)

      return {
        category: pattern.category,
        icon: pattern.icon,
        count: total,
        fromMetrics,
        fromMessages,
        killRate: pattern.killRate,
        winRate,
        wins,
        losses,
        rebuttals: allRebuttals,
        hasBattleTested: realRebuttals.length > 0,
      }
    }).sort((a, b) => b.count - a.count)

    // ============================================================
    // 4. Follow-up effectiveness
    // ============================================================
    const respondedFollowUps = followUps.filter(f => f.prospect_responded)
    const totalFollowUps = followUps.length
    const responseRate = totalFollowUps > 0 ? Math.round((respondedFollowUps.length / totalFollowUps) * 100) : 0

    // ============================================================
    // 5. Loss reason ranking
    // ============================================================
    const topLossReasons = Object.entries(lossReasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }))

    // ============================================================
    // 6. Stats
    // ============================================================
    const totalObjectionsDetected = objections.reduce((s, o) => s + o.count, 0)
    const topObjection = objections[0]?.category || "Ninguna"
    const lostCount = lostIds.size
    const wonCount = wonIds.size
    const overallWinRate = (wonCount + lostCount) > 0
      ? Math.round((wonCount / (wonCount + lostCount)) * 100) : 0
    const deadliestObjection = objections
      .filter(o => o.winRate !== null)
      .sort((a, b) => (a.winRate ?? 100) - (b.winRate ?? 100))[0]?.category || null
    const battleTestedCount = battleRebuttals.length

    return NextResponse.json({
      objections,
      topLossReasons,
      liveAlerts: liveAlerts.slice(0, 10),
      stats: {
        totalObjections: totalObjectionsDetected,
        topObjection,
        lostProspects: lostCount,
        wonProspects: wonCount,
        overallWinRate,
        followUpResponseRate: responseRate,
        dataPoints: metrics.length + inboundMsgs.length,
        deadliestObjection,
        battleTestedCount,
        liveAlertCount: liveAlerts.length,
      },
    })
  } catch {
    return NextResponse.json({
      objections: [],
      topLossReasons: [],
      liveAlerts: [],
      stats: {
        totalObjections: 0, topObjection: "N/A", lostProspects: 0, wonProspects: 0,
        overallWinRate: 0, followUpResponseRate: 0, dataPoints: 0,
        deadliestObjection: null, battleTestedCount: 0, liveAlertCount: 0,
      },
    })
  }
}
