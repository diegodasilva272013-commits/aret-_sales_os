import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

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

    // Get recent inbound WhatsApp messages (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    const { data: messages } = await supabase
      .from("whatsapp_messages")
      .select("id, prospect_id, phone_number, direction, content, media_type, status, created_at")
      .eq("organization_id", orgId)
      .eq("direction", "inbound")
      .gte("created_at", sevenDaysAgo)
      .order("created_at", { ascending: false })
      .limit(200)

    // Get prospects for context
    const prospectIds = [...new Set((messages || []).map(m => m.prospect_id).filter(Boolean))]
    const { data: prospects } = prospectIds.length > 0
      ? await supabase.from("prospects")
          .select("id, full_name, company, headline, status, phase, follow_up_count, notes")
          .in("id", prospectIds.slice(0, 100))
      : { data: [] }

    const prospectMap: Record<string, typeof prospects extends (infer T)[] | null ? T : never> = {}
    ;(prospects || []).forEach(p => { prospectMap[p.id] = p })

    // Get pending follow-ups
    const { data: pendingFollowUps } = await supabase
      .from("follow_ups")
      .select("id, prospect_id, follow_up_number, phase, status, created_at")
      .eq("organization_id", orgId)
      .eq("status", "pendiente")
      .order("created_at", { ascending: true })
      .limit(50)

    // Group messages by prospect and prioritize
    const byProspect: Record<string, { messages: typeof messages extends (infer T)[] | null ? T[] : never[]; prospect: (typeof prospectMap)[string] | null }> = {}
    
    for (const msg of (messages || [])) {
      const pid = msg.prospect_id || msg.phone_number || msg.id
      if (!byProspect[pid]) {
        byProspect[pid] = { messages: [], prospect: msg.prospect_id ? prospectMap[msg.prospect_id] || null : null }
      }
      byProspect[pid].messages.push(msg)
    }

    // Score and prioritize conversations
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
      waitingHours: number
    }

    const items: InboxItem[] = Object.entries(byProspect).map(([key, val]) => {
      const prospect = val.prospect
      const msgs = val.messages
      const latest = msgs[0]
      const hoursSinceMsg = (Date.now() - new Date(latest.created_at).getTime()) / 3600000

      // Priority scoring
      let score = 0
      
      // Recency: more recent = higher priority
      if (hoursSinceMsg < 1) score += 40
      else if (hoursSinceMsg < 4) score += 30
      else if (hoursSinceMsg < 12) score += 20
      else if (hoursSinceMsg < 24) score += 10

      // Multiple messages = eager prospect
      score += Math.min(msgs.length * 5, 20)

      // AI score from notes
      if (prospect?.notes) {
        const aiMatch = prospect.notes.match(/AI_SCORE:(\d+)/)
        if (aiMatch) score += Math.min(parseInt(aiMatch[1]) / 5, 20)
      }

      // Phase weight
      if (prospect?.phase === "cierre") score += 15
      else if (prospect?.phase === "venta") score += 10

      // Status weight
      if (prospect?.status === "llamada_agendada") score += 20
      if (prospect?.status === "activo") score += 5

      // Has media (images, audio, docs) = engagement
      const hasMedia = msgs.some(m => m.media_type && m.media_type !== "text")
      if (hasMedia) score += 5

      // Pending follow-up
      const hasPending = (pendingFollowUps || []).some(f => f.prospect_id === prospect?.id)
      if (hasPending) score += 10

      // Priority label
      let priority: InboxItem["priority"] = "low"
      if (score >= 60) priority = "urgent"
      else if (score >= 40) priority = "high"
      else if (score >= 20) priority = "medium"

      // Suggested action
      let suggestedAction = "Responder mensaje"
      if (hoursSinceMsg > 24) suggestedAction = "Respuesta urgente - esperando >24h"
      else if (hoursSinceMsg > 12) suggestedAction = "Responder pronto - >12h sin respuesta"
      else if (prospect?.status === "llamada_agendada") suggestedAction = "Confirmar fecha de llamada"
      else if (prospect?.phase === "cierre") suggestedAction = "Cerrar venta - prospect en fase cierre"
      else if (msgs.length >= 3) suggestedAction = "Prospect muy activo - priorizar respuesta"
      else if (hasMedia) suggestedAction = "Revisar media adjunto y responder"

      return {
        id: key,
        prospectId: prospect?.id || null,
        name: prospect?.full_name || latest.phone_number || "Desconocido",
        company: prospect?.company || "",
        phone: latest.phone_number || "",
        lastMessage: latest.content?.substring(0, 120) || (latest.media_type ? `📎 ${latest.media_type}` : "Mensaje sin texto"),
        lastMessageAt: latest.created_at,
        messageCount: msgs.length,
        priority,
        priorityScore: score,
        status: prospect?.status || "nuevo",
        phase: prospect?.phase || "contacto",
        hasMedia,
        hasPendingFollowUp: hasPending,
        suggestedAction,
        waitingHours: Math.round(hoursSinceMsg),
      }
    })

    // Sort by priority score descending
    items.sort((a, b) => b.priorityScore - a.priorityScore)

    // Stats
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
