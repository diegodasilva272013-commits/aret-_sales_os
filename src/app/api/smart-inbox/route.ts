import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, is_owner, full_name")
      .eq("id", user.id)
      .single()

    if (!profile) return NextResponse.json({ error: "No profile" }, { status: 404 })
    const orgId = profile.organization_id

    // Get recent inbound WA messages that haven't been replied to
    const { data: messages } = await supabase
      .from("whatsapp_messages")
      .select("id, prospect_id, direction, body, message_type, created_at, status, prospects(id, full_name, company, status, phase, follow_up_count, notes)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(200)

    if (!messages || messages.length === 0) {
      return NextResponse.json({ conversations: [], stats: { total: 0, pending: 0, urgent: 0, avgWait: 0 } })
    }

    // Group by prospect, find conversations needing response
    type ConvoData = {
      prospectId: string
      prospectName: string
      company: string
      prospectStatus: string
      phase: string
      followUps: number
      lastInbound: { body: string; created_at: string } | null
      lastOutbound: string | null
      messageCount: number
      inboundCount: number
      waitMinutes: number
      notes: string
    }
    const conversations: Record<string, ConvoData> = {}

    messages.forEach(m => {
      const pid = m.prospect_id
      const prospect = (m as { prospects?: { id: string; full_name: string; company: string; status: string; phase: string; follow_up_count: number; notes: string } }).prospects
      if (!conversations[pid]) {
        conversations[pid] = {
          prospectId: pid,
          prospectName: prospect?.full_name || "Desconocido",
          company: prospect?.company || "",
          prospectStatus: prospect?.status || "nuevo",
          phase: prospect?.phase || "contacto",
          followUps: prospect?.follow_up_count || 0,
          lastInbound: null,
          lastOutbound: null,
          messageCount: 0,
          inboundCount: 0,
          waitMinutes: 0,
          notes: prospect?.notes || "",
        }
      }
      conversations[pid].messageCount++
      if (m.direction === "inbound") {
        conversations[pid].inboundCount++
        if (!conversations[pid].lastInbound || m.created_at > conversations[pid].lastInbound!.created_at) {
          conversations[pid].lastInbound = { body: m.body || "", created_at: m.created_at }
        }
      } else {
        if (!conversations[pid].lastOutbound || m.created_at > conversations[pid].lastOutbound!) {
          conversations[pid].lastOutbound = m.created_at
        }
      }
    })

    // Find pending conversations (last message is inbound = needs reply)
    const pending = Object.values(conversations).filter(c => {
      if (!c.lastInbound) return false
      // If last outbound is after last inbound, it's already replied
      if (c.lastOutbound && c.lastOutbound > c.lastInbound.created_at) return false
      return true
    })

    // Calculate wait time
    const now = Date.now()
    pending.forEach(c => {
      if (c.lastInbound) {
        c.waitMinutes = Math.round((now - new Date(c.lastInbound.created_at).getTime()) / 60000)
      }
    })

    // Priority scoring
    type ScoredConvo = ConvoData & { priority: number; urgency: string; color: string }
    const scored: ScoredConvo[] = pending.map(c => {
      let priority = 0
      // Wait time factor (exponential urgency)
      if (c.waitMinutes > 1440) priority += 50 // >24h = critical
      else if (c.waitMinutes > 480) priority += 35 // >8h
      else if (c.waitMinutes > 120) priority += 20 // >2h
      else if (c.waitMinutes > 30) priority += 10

      // Phase factor
      if (c.phase === "cierre") priority += 30
      else if (c.phase === "venta") priority += 15

      // Engagement factor
      if (c.inboundCount >= 3) priority += 15
      if (c.followUps >= 3) priority += 10

      // Status factor
      if (c.prospectStatus === "llamada_agendada") priority += 20

      const urgency = priority >= 50 ? "critico" : priority >= 30 ? "alto" : priority >= 15 ? "medio" : "bajo"
      const color = priority >= 50 ? "#ef4444" : priority >= 30 ? "#f59e0b" : priority >= 15 ? "#3b82f6" : "#22c55e"

      return { ...c, priority, urgency, color }
    }).sort((a, b) => b.priority - a.priority)

    // Generate AI suggestions for top 5 most urgent
    const topConversations = scored.slice(0, 5)
    let suggestions: Record<string, string> = {}

    if (topConversations.length > 0) {
      const promptData = topConversations.map(c => ({
        name: c.prospectName,
        company: c.company,
        phase: c.phase,
        lastMessage: c.lastInbound?.body?.substring(0, 200) || "",
        waitMinutes: c.waitMinutes,
        followUps: c.followUps,
      }))

      try {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{
            role: "system",
            content: "Sos un closer argentino experto. Para cada conversación pendiente, genera una respuesta sugerida corta (<80 chars) y directa en español argentino. Formato JSON: {\"prospect_name\": \"respuesta sugerida\"}"
          }, {
            role: "user",
            content: JSON.stringify(promptData)
          }],
          temperature: 0.7,
          max_tokens: 500,
          response_format: { type: "json_object" },
        })

        suggestions = JSON.parse(aiResponse.choices[0]?.message?.content || "{}")
      } catch {
        // AI suggestions are optional — continue without them
      }
    }

    const result = scored.slice(0, 20).map(c => ({
      ...c,
      suggestion: suggestions[c.prospectName] || null,
      lastInboundBody: c.lastInbound?.body?.substring(0, 150) || "",
      lastInboundAt: c.lastInbound?.created_at || "",
    }))

    const avgWait = pending.length > 0 ? Math.round(pending.reduce((a, c) => a + c.waitMinutes, 0) / pending.length) : 0

    return NextResponse.json({
      conversations: result,
      stats: {
        total: Object.keys(conversations).length,
        pending: pending.length,
        urgent: scored.filter(s => s.priority >= 50).length,
        avgWait,
      },
    })
  } catch {
    return NextResponse.json({ error: "Error loading inbox" }, { status: 500 })
  }
}
