import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { parseAIScore, type DynamicScoreEvent } from "@/lib/parseAIScore"

export async function GET(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 })

  const url = new URL(req.url)
  const prospectId = url.searchParams.get("prospect_id")
  const orgMode = url.searchParams.get("org") === "1" // bulk mode for table

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return NextResponse.json({ error: "No org" }, { status: 400 })

  // ─── Single prospect mode ──────────────────────
  if (prospectId) {
    const result = await computeForProspect(supabase, prospectId, profile.organization_id)
    return NextResponse.json(result)
  }

  // ─── Bulk mode: all active prospects ───────────
  if (orgMode) {
    const { data: prospects } = await supabase
      .from("prospects")
      .select("id, notes, last_contact_at, follow_up_count, status")
      .eq("organization_id", profile.organization_id)
      .in("status", ["nuevo", "activo", "llamada_agendada", "pausado"])
      .limit(200)

    if (!prospects) return NextResponse.json({ scores: {} })

    // Batch fetch behavioral data
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

    const [{ data: waMessages }, { data: callAnalyses }, { data: followUps }] = await Promise.all([
      supabase
        .from("whatsapp_messages")
        .select("prospect_id, direction, created_at")
        .eq("organization_id", profile.organization_id)
        .gte("created_at", thirtyDaysAgo),
      supabase
        .from("call_analyses")
        .select("prospect_id, score, tone, created_at")
        .eq("organization_id", profile.organization_id)
        .gte("created_at", thirtyDaysAgo),
      supabase
        .from("follow_ups")
        .select("prospect_id, prospect_responded, created_at")
        .gte("created_at", thirtyDaysAgo),
    ])

    // Build lookup maps
    const waByProspect = new Map<string, { inbound: number; outbound: number; lastInbound: string | null }>()
    for (const msg of waMessages || []) {
      if (!msg.prospect_id) continue
      const existing = waByProspect.get(msg.prospect_id) || { inbound: 0, outbound: 0, lastInbound: null }
      if (msg.direction === "inbound") {
        existing.inbound++
        if (!existing.lastInbound || msg.created_at > existing.lastInbound) existing.lastInbound = msg.created_at
      } else {
        existing.outbound++
      }
      waByProspect.set(msg.prospect_id, existing)
    }

    const callsByProspect = new Map<string, { completed: number; hot: number }>()
    for (const ca of callAnalyses || []) {
      if (!ca.prospect_id) continue
      const existing = callsByProspect.get(ca.prospect_id) || { completed: 0, hot: 0 }
      existing.completed++
      if (ca.score >= 7 || ca.tone === "muy_interesado") existing.hot++
      callsByProspect.set(ca.prospect_id, existing)
    }

    const fuByProspect = new Map<string, { sent: number; responded: number }>()
    for (const fu of followUps || []) {
      if (!fu.prospect_id) continue
      const existing = fuByProspect.get(fu.prospect_id) || { sent: 0, responded: 0 }
      existing.sent++
      if (fu.prospect_responded) existing.responded++
      fuByProspect.set(fu.prospect_id, existing)
    }

    // Compute scores
    const scores: Record<string, { baseScore: number; dynamicScore: number; delta: number; trend: string }> = {}

    for (const p of prospects) {
      const ai = parseAIScore(p.notes)
      const baseScore = ai?.score ?? 50

      const events: DynamicScoreEvent[] = []
      const wa = waByProspect.get(p.id)
      const calls = callsByProspect.get(p.id)
      const fu = fuByProspect.get(p.id)

      // WA responses: +2 each (max +10)
      if (wa?.inbound) {
        const bonus = Math.min(wa.inbound * 2, 10)
        events.push({ type: "wa_inbound", delta: bonus, label: `${wa.inbound} respuestas WA (+${bonus})` })
      }

      // Calls completed: +3 each
      if (calls?.completed) {
        const bonus = Math.min(calls.completed * 3, 9)
        events.push({ type: "call_completed", delta: bonus, label: `${calls.completed} llamadas (+${bonus})` })
      }

      // Hot calls: +5
      if (calls?.hot) {
        events.push({ type: "call_completed", delta: 5, label: `Llamada caliente (+5)` })
      }

      // Follow-up responses: +3 each
      if (fu?.responded) {
        const bonus = Math.min(fu.responded * 3, 9)
        events.push({ type: "wa_inbound", delta: bonus, label: `${fu.responded} follow-ups respondidos (+${bonus})` })
      }

      // Decay: -1 per day without contact after 5 days
      if (p.last_contact_at) {
        const daysSince = Math.floor((Date.now() - new Date(p.last_contact_at).getTime()) / 86400000)
        if (daysSince > 5) {
          const penalty = Math.min((daysSince - 5) * 1, 20)
          events.push({ type: "decay", delta: -penalty, label: `${daysSince}d sin contacto (-${penalty})` })
        }
      } else {
        // No contact ever
        events.push({ type: "decay", delta: -10, label: "Sin contacto (-10)" })
      }

      // Status paused penalty
      if (p.status === "pausado") {
        events.push({ type: "status_change", delta: -5, label: "Pausado (-5)" })
      }

      const totalDelta = events.reduce((sum, e) => sum + e.delta, 0)
      const dynamicScore = Math.max(0, Math.min(100, baseScore + totalDelta))

      scores[p.id] = {
        baseScore,
        dynamicScore,
        delta: totalDelta,
        trend: totalDelta > 2 ? "up" : totalDelta < -2 ? "down" : "stable",
      }
    }

    return NextResponse.json({ scores })
  }

  return NextResponse.json({ error: "Specify prospect_id or org=1" }, { status: 400 })
}

// ─── Detailed single-prospect computation ──────────────────
async function computeForProspect(
  supabase: Awaited<ReturnType<typeof createClient>>,
  prospectId: string,
  orgId: string,
) {
  const { data: prospect } = await supabase
    .from("prospects")
    .select("id, notes, last_contact_at, follow_up_count, status, whatsapp_number")
    .eq("id", prospectId)
    .eq("organization_id", orgId)
    .single()

  if (!prospect) return { error: "Not found" }

  const ai = parseAIScore(prospect.notes)
  const baseScore = ai?.score ?? 50
  const events: DynamicScoreEvent[] = []

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()

  // Fetch all behavioral signals
  const [{ data: waMessages }, { data: callAnalyses }, { data: followUps }] = await Promise.all([
    supabase
      .from("whatsapp_messages")
      .select("direction, created_at, status")
      .eq("prospect_id", prospectId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),
    supabase
      .from("call_analyses")
      .select("score, tone, created_at")
      .eq("prospect_id", prospectId)
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false }),
    supabase
      .from("follow_ups")
      .select("follow_up_number, prospect_responded, sent_at, created_at")
      .eq("prospect_id", prospectId)
      .order("created_at", { ascending: false }),
  ])

  // +2 per inbound WA message (max +10)
  const inboundWA = (waMessages || []).filter(m => m.direction === "inbound")
  if (inboundWA.length > 0) {
    const bonus = Math.min(inboundWA.length * 2, 10)
    events.push({ type: "wa_inbound", delta: bonus, label: `${inboundWA.length} respuestas WhatsApp`, date: inboundWA[0]?.created_at })
  }

  // +1 per read receipt (max +3)
  const readMessages = (waMessages || []).filter(m => m.direction === "outbound" && m.status === "read")
  if (readMessages.length > 0) {
    const bonus = Math.min(readMessages.length, 3)
    events.push({ type: "wa_outbound", delta: bonus, label: `${readMessages.length} mensajes leídos`, date: readMessages[0]?.created_at })
  }

  // +3 per call analysis (completed calls), +5 bonus if score >= 7
  for (const ca of callAnalyses || []) {
    events.push({ type: "call_completed", delta: 3, label: `Llamada analizada (score ${ca.score})`, date: ca.created_at })
    if (ca.score >= 7 || ca.tone === "muy_interesado") {
      events.push({ type: "call_completed", delta: 5, label: `Llamada caliente (${ca.tone})`, date: ca.created_at })
    }
  }

  // -3 per missed/failed call indication (follow-ups without response after llamada_agendada)
  // +3 per responded follow-up
  for (const fu of followUps || []) {
    if (fu.prospect_responded) {
      events.push({ type: "follow_up_sent", delta: 3, label: `Follow-up #${fu.follow_up_number} respondido`, date: fu.created_at })
    }
  }

  // Decay: -1/day after 5 days without contact
  if (prospect.last_contact_at) {
    const daysSince = Math.floor((Date.now() - new Date(prospect.last_contact_at).getTime()) / 86400000)
    if (daysSince > 5) {
      const penalty = Math.min((daysSince - 5) * 1, 20)
      events.push({ type: "decay", delta: -penalty, label: `${daysSince} días sin contacto` })
    }
  } else {
    events.push({ type: "decay", delta: -10, label: "Sin contacto registrado" })
  }

  // Status penalty
  if (prospect.status === "pausado") {
    events.push({ type: "status_change", delta: -5, label: "Prospecto pausado" })
  }

  const totalDelta = events.reduce((sum, e) => sum + e.delta, 0)
  const dynamicScore = Math.max(0, Math.min(100, baseScore + totalDelta))

  return {
    baseScore,
    dynamicScore,
    delta: totalDelta,
    events: events.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)),
    trend: totalDelta > 2 ? "up" : totalDelta < -2 ? "down" : "stable",
  }
}
