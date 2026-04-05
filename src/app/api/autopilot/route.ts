import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { parseAIScore } from "@/lib/parseAIScore"

export type AutopilotAction = {
  id: string
  type: "respond_now" | "call_today" | "follow_up" | "hot_lead" | "drop"
  priority: number
  prospectId: string
  prospectName: string
  company: string
  detail: string
  timeAgo?: string
  aiScore?: number
}

function minutesAgo(date: string): number {
  return Math.round((Date.now() - new Date(date).getTime()) / 60000)
}

function formatTimeAgo(mins: number): string {
  if (mins < 60) return `hace ${mins} min`
  if (mins < 1440) return `hace ${Math.round(mins / 60)}h`
  return `hace ${Math.round(mins / 1440)}d`
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 })

  const { data: profileCheck } = await supabase
    .from("profiles")
    .select("is_owner, organization_id")
    .eq("id", user.id)
    .single()

  const isOwner = profileCheck?.is_owner || false
  const orgId = profileCheck?.organization_id

  // 1. Get all active prospects
  let prospectsQuery = supabase
    .from("prospects")
    .select("id, full_name, company, status, phase, follow_up_count, last_contact_at, notes, whatsapp_number, assigned_to, created_at")
    .in("status", ["nuevo", "activo", "llamada_agendada", "pausado"])

  if (!isOwner) {
    prospectsQuery = prospectsQuery.eq("assigned_to", user.id)
  }

  // 2. Get inbound WhatsApp messages from last 24h
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  let waQuery = supabase
    .from("whatsapp_messages")
    .select("prospect_id, created_at")
    .eq("direction", "inbound")
    .gte("created_at", oneDayAgo)
    .order("created_at", { ascending: false })

  if (orgId) {
    waQuery = waQuery.eq("organization_id", orgId)
  }

  // 3. Get today's scheduled calls
  const todayStart = new Date().toISOString().split("T")[0]
  const tomorrowStart = new Date(Date.now() + 86400000).toISOString().split("T")[0]
  let callsQuery = supabase
    .from("scheduled_calls")
    .select("id, prospect_id, scheduled_at, prospects(full_name, company)")
    .gte("scheduled_at", todayStart)
    .lt("scheduled_at", tomorrowStart)

  if (!isOwner) {
    callsQuery = callsQuery.eq("setter_id", user.id)
  }

  const [{ data: prospects }, { data: waMessages }, { data: calls }] = await Promise.all([
    prospectsQuery,
    waQuery,
    callsQuery,
  ])

  if (!prospects) return NextResponse.json({ actions: [] })

  // Build a map: prospectId -> latest inbound WA time
  const latestWA = new Map<string, string>()
  for (const msg of waMessages || []) {
    if (msg.prospect_id && !latestWA.has(msg.prospect_id)) {
      latestWA.set(msg.prospect_id, msg.created_at)
    }
  }

  // Build a set: prospectId -> has call today
  const callToday = new Map<string, string>()
  for (const call of calls || []) {
    if (call.prospect_id) {
      callToday.set(call.prospect_id, call.scheduled_at)
    }
  }

  const actions: AutopilotAction[] = []
  const now = Date.now()

  for (const p of prospects) {
    if (p.status === "pausado") continue // skip paused for now

    let priority = 0
    let type: AutopilotAction["type"] = "follow_up"
    let detail = ""
    let timeAgo: string | undefined

    const ai = parseAIScore(p.notes)
    const aiScore = ai?.score

    // Check if they responded on WhatsApp recently  
    const lastWA = latestWA.get(p.id)
    if (lastWA) {
      const mins = minutesAgo(lastWA)
      if (mins <= 60) {
        priority += 50
        type = "respond_now"
        detail = `Te respondió ${formatTimeAgo(mins)}`
        timeAgo = formatTimeAgo(mins)
      } else if (mins <= 1440) {
        priority += 30
        type = "respond_now"
        detail = `Te respondió ${formatTimeAgo(mins)}`
        timeAgo = formatTimeAgo(mins)
      }
    }

    // Has a call scheduled today
    if (callToday.has(p.id)) {
      const callTime = new Date(callToday.get(p.id)!)
      const hours = callTime.getHours().toString().padStart(2, "0")
      const minutes = callTime.getMinutes().toString().padStart(2, "0")
      priority += 40
      if (type !== "respond_now") type = "call_today"
      detail = detail ? `${detail} · Call ${hours}:${minutes}` : `Llamada agendada a las ${hours}:${minutes}`
    }

    // AI score bonus
    if (aiScore && aiScore >= 80) {
      priority += 20
      if (!detail) {
        type = "hot_lead"
        detail = `Lead caliente — Score ${aiScore}/100`
      } else {
        detail += ` · Score ${aiScore}`
      }
    } else if (aiScore && aiScore >= 60) {
      priority += 10
    }

    // Days without contact
    const lastContact = p.last_contact_at ? new Date(p.last_contact_at).getTime() : new Date(p.created_at).getTime()
    const daysSinceContact = Math.round((now - lastContact) / 86400000)

    if (daysSinceContact >= 15 && type !== "respond_now" && type !== "call_today") {
      type = "drop"
      detail = `${daysSinceContact} días sin responder`
      priority += 5
    } else if (daysSinceContact >= 5 && type !== "respond_now" && type !== "call_today") {
      priority += 25
      type = "follow_up"
      detail = detail || `${daysSinceContact} días sin contacto — toca follow-up #${(p.follow_up_count || 0) + 1}`
    } else if (daysSinceContact >= 2 && type !== "respond_now" && type !== "call_today") {
      priority += 15
      type = "follow_up"
      detail = detail || `${daysSinceContact} días sin contacto`
    }

    // New prospect never contacted
    if (p.status === "nuevo" && !p.last_contact_at && type !== "respond_now") {
      priority += 10
      if (!detail) {
        type = "hot_lead"
        detail = "Nuevo prospecto — iniciar secuencia"
      }
    }

    // Only add if there's something actionable
    if (priority > 0 && detail) {
      actions.push({
        id: `${p.id}-${type}`,
        type,
        priority,
        prospectId: p.id,
        prospectName: p.full_name,
        company: p.company || "",
        detail,
        timeAgo,
        aiScore: aiScore || undefined,
      })
    }
  }

  // Sort by priority descending, take top 8
  actions.sort((a, b) => b.priority - a.priority)

  return NextResponse.json({ actions: actions.slice(0, 8) })
}
