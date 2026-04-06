import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// Keyword-based intent detection for prioritization reasoning
function detectIntent(text: string): { intent: string; urgencyBoost: number; reason: string } {
  const lower = (text || "").toLowerCase()
  
  // Price/budget signals = HIGHEST priority
  if (/precio|cuánto|cuanto|costo|presupuesto|tarifa|inversión|inversion|vale|cobr/.test(lower))
    return { intent: "price_inquiry", urgencyBoost: 25, reason: "Preguntó por precio — señal de compra fuerte" }
  
  // Scheduling/meeting intent
  if (/reunión|reunion|llamada|agenda|cuándo|cuando.*disponible|horario|videollamada|zoom|meet/.test(lower))
    return { intent: "meeting_request", urgencyBoost: 20, reason: "Quiere agendar — está listo para avanzar" }
  
  // Decision signals
  if (/acepto|dale|vamos|quiero|contrat|empezar|arranc|firm|cerr|listo/.test(lower))
    return { intent: "ready_to_buy", urgencyBoost: 30, reason: "Señal de cierre — quiere avanzar AHORA" }
  
  // Questions about service
  if (/cómo funciona|como funciona|qué incluye|que incluye|garantía|garantia|resultado|caso de éxito/.test(lower))
    return { intent: "info_request", urgencyBoost: 10, reason: "Pide info del servicio — interés genuino" }
  
  // Objections/doubts
  if (/no estoy seguro|lo pienso|muy caro|no me convence|no sé|no se|duda/.test(lower))
    return { intent: "objection", urgencyBoost: 15, reason: "Tiene dudas — necesita manejo de objeción rápido" }
  
  // Complaint/urgency
  if (/urgente|necesito ya|lo antes posible|cuanto antes|apuro|rápido/.test(lower))
    return { intent: "urgent_need", urgencyBoost: 25, reason: "Expresó urgencia — responder YA" }
  
  // Referral
  if (/recomend|me pasaron|me dijo que|de parte de/.test(lower))
    return { intent: "referral", urgencyBoost: 15, reason: "Viene referido — alta probabilidad de cierre" }
  
  // Audio message
  if (/\[audio\]|\[voice\]|audio/.test(lower))
    return { intent: "audio", urgencyBoost: 10, reason: "Mandó audio — alto engagement" }
  
  // Simple greeting
  if (/^(hola|hey|buenas|buen día|buenos días|qué tal|que tal|hi)\s*[.!?]?\s*$/i.test(lower.trim()))
    return { intent: "greeting", urgencyBoost: -5, reason: "Solo saludó — puede esperar" }
  
  return { intent: "general", urgencyBoost: 0, reason: "Mensaje pendiente de respuesta" }
}

function generateSuggestedAction(intent: string, phase: string, waitHours: number, status: string, msgCount: number): string {
  // Urgency-based actions first
  if (waitHours > 48) return "⚠️ Respondé urgente — +48h sin respuesta, se enfría"
  if (waitHours > 24) return "⏰ Respondé HOY — llevas +24h sin contestar"
  
  // Intent-based actions
  switch (intent) {
    case "ready_to_buy": return "🔥 Cerrá ahora — mandá link de pago o agendá cierre"
    case "price_inquiry": return "💰 Respondé con propuesta de valor + precio"
    case "meeting_request": return "📅 Mandá tu link de agenda YA"
    case "objection": return "🛡️ Respondé con caso de éxito que rompa la objeción"
    case "urgent_need": return "⚡ Respuesta inmediata — tiene urgencia real"
    case "referral": return "🤝 Tratalo como VIP — viene referido"
    case "info_request": return "📋 Mandá info + caso de éxito + CTA a llamada"
    case "audio": return "🎧 Escuchá el audio y respondé con audio"
    case "greeting": return "👋 Respondé amable + pregunta para calificar"
  }
  
  // Phase-based fallback
  if (phase === "cierre") return "🎯 Está en cierre — empujá para cerrar"
  if (phase === "venta") return "📞 Proponer llamada de cierre"
  if (status === "llamada_agendada") return "✅ Confirmar fecha y hora de llamada"
  if (msgCount >= 3) return "🔥 Muy activo — priorizar respuesta"
  
  return "💬 Responder y avanzar la conversación"
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, is_owner")
      .eq("id", user.id)
      .single()

    if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 })
    const orgId = profile.organization_id

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    // Parallel: inbound messages + outbound messages for reply detection
    const [{ data: inboundMsgs }, { data: outboundMsgs }, { data: pendingFollowUps }] = await Promise.all([
      supabase.from("whatsapp_messages")
        .select("id, prospect_id, phone_number, direction, content, media_type, status, created_at")
        .eq("organization_id", orgId)
        .eq("direction", "inbound")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("whatsapp_messages")
        .select("prospect_id, created_at")
        .eq("organization_id", orgId)
        .eq("direction", "outbound")
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase.from("follow_ups")
        .select("id, prospect_id, follow_up_number, phase, status")
        .eq("organization_id", orgId)
        .eq("status", "pendiente")
        .limit(50),
    ])

    // Build latest outbound per prospect for reply detection
    const lastOutbound: Record<string, string> = {}
    ;(outboundMsgs || []).forEach(m => {
      if (!lastOutbound[m.prospect_id] || m.created_at > lastOutbound[m.prospect_id]) {
        lastOutbound[m.prospect_id] = m.created_at
      }
    })

    // Get unique prospect ids
    const prospectIds = [...new Set((inboundMsgs || []).map(m => m.prospect_id).filter(Boolean))]
    const { data: prospects } = prospectIds.length > 0
      ? await supabase.from("prospects")
          .select("id, full_name, company, status, phase, follow_up_count, notes")
          .in("id", prospectIds.slice(0, 100))
      : { data: [] }

    const prospectMap: Record<string, (typeof prospects extends (infer T)[] | null ? T : never)> = {}
    ;(prospects || []).forEach(p => { prospectMap[p.id] = p })

    // Group inbound by prospect
    const byProspect: Record<string, { msgs: typeof inboundMsgs extends (infer T)[] | null ? T[] : never[] }> = {}
    for (const msg of (inboundMsgs || [])) {
      const pid = msg.prospect_id || msg.phone_number || msg.id
      if (!byProspect[pid]) byProspect[pid] = { msgs: [] }
      byProspect[pid].msgs.push(msg)
    }

    // Pending follow-up set
    const pendingFUSet = new Set((pendingFollowUps || []).map(f => f.prospect_id))

    type InboxItem = {
      id: string
      prospectId: string | null
      name: string
      company: string
      phone: string
      lastMessage: string
      lastMessageAt: string
      messageCount: number
      priority: "urgent" | "high" | "medium" | "low"
      priorityScore: number
      status: string
      phase: string
      hasMedia: boolean
      hasPendingFollowUp: boolean
      suggestedAction: string
      priorityReason: string
      intent: string
      waitingHours: number
    }

    const items: InboxItem[] = Object.entries(byProspect)
      .map(([key, val]) => {
        const msgs = val.msgs
        const latest = msgs[0]
        const prospect = latest.prospect_id ? prospectMap[latest.prospect_id] : null
        const hoursSince = (Date.now() - new Date(latest.created_at).getTime()) / 3600000

        // Check if already replied
        const lastOut = latest.prospect_id ? lastOutbound[latest.prospect_id] : null
        if (lastOut && lastOut > latest.created_at) return null // Already replied

        // Detect intent from message content
        const { intent, urgencyBoost, reason } = detectIntent(latest.content || "")

        // Priority scoring
        let score = 0

        // Wait time (exponential urgency)
        if (hoursSince > 48) score += 50
        else if (hoursSince > 24) score += 40
        else if (hoursSince > 12) score += 30
        else if (hoursSince > 4) score += 20
        else if (hoursSince > 1) score += 10
        else score += 5

        // Intent boost
        score += urgencyBoost

        // Multiple messages = eager
        score += Math.min(msgs.length * 5, 20)

        // Phase weight
        if (prospect?.phase === "cierre") score += 20
        else if (prospect?.phase === "venta") score += 12
        else if (prospect?.phase === "seguimiento") score += 5

        // Status weight
        if (prospect?.status === "llamada_agendada") score += 20
        if (prospect?.status === "activo") score += 5

        // AI score from notes
        if (prospect?.notes) {
          const aiMatch = prospect.notes.match(/AI_SCORE:(\d+)/)
          if (aiMatch) score += Math.min(parseInt(aiMatch[1]) / 5, 15)
        }

        // Has media
        const hasMedia = msgs.some(m => m.media_type && m.media_type !== "text")
        if (hasMedia) score += 5

        // Pending follow-up
        const hasPending = prospect ? pendingFUSet.has(prospect.id) : false
        if (hasPending) score += 10

        // Priority label
        let priority: InboxItem["priority"] = "low"
        if (score >= 65) priority = "urgent"
        else if (score >= 40) priority = "high"
        else if (score >= 20) priority = "medium"

        // Build priority reason with wait time context
        let priorityReason = reason
        if (hoursSince > 24) priorityReason = `⏰ +${Math.round(hoursSince)}h sin respuesta — ${reason.toLowerCase()}`
        else if (hoursSince > 0 && intent !== "greeting") priorityReason = `${reason} (hace ${hoursSince < 1 ? "< 1h" : Math.round(hoursSince) + "h"})`

        const suggestedAction = generateSuggestedAction(intent, prospect?.phase || "", Math.round(hoursSince), prospect?.status || "", msgs.length)

        return {
          id: key,
          prospectId: prospect?.id || null,
          name: prospect?.full_name || latest.phone_number || "Desconocido",
          company: prospect?.company || "",
          phone: latest.phone_number || "",
          lastMessage: latest.content?.substring(0, 150) || (latest.media_type ? `📎 ${latest.media_type}` : "Mensaje sin texto"),
          lastMessageAt: latest.created_at,
          messageCount: msgs.length,
          priority,
          priorityScore: score,
          status: prospect?.status || "nuevo",
          phase: prospect?.phase || "contacto",
          hasMedia,
          hasPendingFollowUp: hasPending,
          suggestedAction,
          priorityReason,
          intent,
          waitingHours: Math.round(hoursSince),
        }
      })
      .filter((item): item is InboxItem => item !== null)

    items.sort((a, b) => b.priorityScore - a.priorityScore)

    const totalInbox = items.length
    const urgentCount = items.filter(i => i.priority === "urgent").length
    const highCount = items.filter(i => i.priority === "high").length
    const waitingOver12h = items.filter(i => i.waitingHours > 12).length
    const avgWaitHours = items.length > 0 ? Math.round(items.reduce((s, i) => s + i.waitingHours, 0) / items.length) : 0

    return NextResponse.json({
      items: items.slice(0, 30),
      stats: { totalInbox, urgentCount, highCount, waitingOver12h, avgWaitHours },
    })
  } catch {
    return NextResponse.json({ items: [], stats: { totalInbox: 0, urgentCount: 0, highCount: 0, waitingOver12h: 0, avgWaitHours: 0 } })
  }
}
