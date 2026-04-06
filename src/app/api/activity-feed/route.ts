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

    const now = new Date()
    const since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const todaySince = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    // Parallel queries for different activity types
    const [
      { data: recentProspects },
      { data: recentFollowUps },
      { data: recentCalls },
      { data: recentMessages },
      { data: recentRecordings },
      { data: closedDeals },
      { data: teamMembers },
    ] = await Promise.all([
      supabase.from("prospects")
        .select("id, full_name, company, status, assigned_to, created_at")
        .eq("organization_id", orgId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("follow_ups")
        .select("id, prospect_id, status, follow_up_number, phase, created_at, setter_id, prospects(full_name)")
        .eq("organization_id", orgId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("scheduled_calls")
        .select("id, prospect_id, setter_id, status, scheduled_at, created_at, prospects(full_name)")
        .eq("organization_id", orgId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase.from("whatsapp_messages")
        .select("id, prospect_id, direction, message_type, created_at, prospects(full_name)")
        .eq("organization_id", orgId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase.from("call_recordings")
        .select("id, user_id, prospect_id, duration_seconds, created_at, prospects(full_name)")
        .eq("organization_id", orgId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20),
      // Deals cerrados esta semana
      supabase.from("prospects")
        .select("id, full_name, company, assigned_to, deal_value, updated_at")
        .eq("organization_id", orgId)
        .eq("status", "cerrado")
        .gte("updated_at", since)
        .order("updated_at", { ascending: false })
        .limit(20),
      supabase.from("profiles")
        .select("id, full_name")
        .eq("organization_id", orgId),
    ])

    const memberMap: Record<string, string> = {}
    ;(teamMembers || []).forEach(m => { memberMap[m.id] = m.full_name || "Usuario" })

    type Activity = {
      id: string
      type: string
      icon: string
      color: string
      title: string
      subtitle: string
      user: string
      userId: string
      timestamp: string
      highlight?: boolean
      dealValue?: number
    }

    const activities: Activity[] = []

    // Deals cerrados (highlight)
    ;(closedDeals || []).forEach(d => {
      const value = d.deal_value || 0
      activities.push({
        id: `deal-${d.id}`,
        type: "deal_closed",
        icon: "🎯",
        color: "#22c55e",
        title: `¡Deal cerrado${value > 0 ? ` $${value.toLocaleString()}` : ""}!`,
        subtitle: `${d.full_name} — ${d.company || ""}`,
        user: memberMap[d.assigned_to] || "Closer",
        userId: d.assigned_to,
        timestamp: d.updated_at,
        highlight: true,
        dealValue: value,
      })
    })

    // New prospects
    ;(recentProspects || []).forEach(p => {
      activities.push({
        id: `prospect-${p.id}`,
        type: "new_prospect",
        icon: "👤",
        color: "#6c63ff",
        title: `Nuevo prospecto: ${p.full_name}`,
        subtitle: p.company || "Sin empresa",
        user: memberMap[p.assigned_to] || "Sistema",
        userId: p.assigned_to,
        timestamp: p.created_at,
      })
    })

    // Follow-ups
    ;(recentFollowUps || []).forEach(f => {
      const pArr = (f as unknown as { prospects?: { full_name: string }[] }).prospects
      const prospectName = pArr?.[0]?.full_name || "Prospecto"
      const statusLabel = f.status === "enviado" ? "Enviado" : f.status === "respondido" ? "Respondido ✓" : f.status
      activities.push({
        id: `followup-${f.id}`,
        type: "follow_up",
        icon: f.status === "respondido" ? "💬" : "📤",
        color: f.status === "respondido" ? "#22c55e" : "#f59e0b",
        title: `Follow-up #${f.follow_up_number} ${statusLabel}`,
        subtitle: `${prospectName} — Fase ${f.phase}`,
        user: memberMap[f.setter_id] || "Setter",
        userId: f.setter_id,
        timestamp: f.created_at,
      })
    })

    // Scheduled calls
    ;(recentCalls || []).forEach(c => {
      const pArr = (c as unknown as { prospects?: { full_name: string }[] }).prospects
      const prospectName = pArr?.[0]?.full_name || "Prospecto"
      activities.push({
        id: `call-${c.id}`,
        type: "scheduled_call",
        icon: "📞",
        color: "#3b82f6",
        title: `Llamada ${c.status === "completed" ? "completada" : "agendada"}`,
        subtitle: prospectName,
        user: memberMap[c.setter_id] || "Setter",
        userId: c.setter_id,
        timestamp: c.created_at,
      })
    })

    // WhatsApp messages (group to avoid noise)
    const msgByProspect: Record<string, { in: number; out: number; last: string; name: string }> = {}
    ;(recentMessages || []).forEach(m => {
      const pid = m.prospect_id
      if (!msgByProspect[pid]) {
        const pArr = (m as unknown as { prospects?: { full_name: string }[] }).prospects
        const prospectName = pArr?.[0]?.full_name || "Prospecto"
        msgByProspect[pid] = { in: 0, out: 0, last: m.created_at, name: prospectName }
      }
      if (m.direction === "inbound") msgByProspect[pid].in++
      else msgByProspect[pid].out++
      if (m.created_at > msgByProspect[pid].last) msgByProspect[pid].last = m.created_at
    })

    Object.entries(msgByProspect).forEach(([pid, data]) => {
      activities.push({
        id: `wa-${pid}`,
        type: "whatsapp",
        icon: data.in > 0 ? "📩" : "📨",
        color: "#25d366",
        title: `WA: ${data.out} enviados, ${data.in} recibidos`,
        subtitle: data.name,
        user: "WhatsApp",
        userId: "",
        timestamp: data.last,
      })
    })

    // Call recordings
    ;(recentRecordings || []).forEach(r => {
      const pArr = (r as unknown as { prospects?: { full_name: string }[] }).prospects
      const prospectName = pArr?.[0]?.full_name || "Prospecto"
      const mins = r.duration_seconds ? Math.round(r.duration_seconds / 60) : 0
      activities.push({
        id: `recording-${r.id}`,
        type: "recording",
        icon: "🎙️",
        color: "#8b5cf6",
        title: `Llamada grabada (${mins} min)`,
        subtitle: prospectName,
        user: memberMap[r.user_id] || "Usuario",
        userId: r.user_id,
        timestamp: r.created_at,
      })
    })

    // Sort by timestamp desc
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Leaderboard - acciones por setter hoy
    const leaderboard: Record<string, { name: string; actions: number; deals: number; revenue: number }> = {}
    activities.forEach(a => {
      if (!a.userId || a.userId === "") return
      if (!leaderboard[a.userId]) {
        leaderboard[a.userId] = { name: a.user, actions: 0, deals: 0, revenue: 0 }
      }
      if (a.timestamp >= todaySince) leaderboard[a.userId].actions++
      if (a.type === "deal_closed") {
        leaderboard[a.userId].deals++
        leaderboard[a.userId].revenue += a.dealValue || 0
      }
    })

    const leaderboardArr = Object.entries(leaderboard)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.actions - a.actions)
      .slice(0, 5)

    // Stats
    const today = new Date().toISOString().split("T")[0]
    const todayActivities = activities.filter(a => a.timestamp.startsWith(today)).length
    const uniqueUsers = new Set(activities.filter(a => a.userId).map(a => a.userId)).size
    const responseRate = activities.filter(a => a.type === "follow_up").length > 0
      ? Math.round((activities.filter(a => a.type === "follow_up" && a.icon === "💬").length / activities.filter(a => a.type === "follow_up").length) * 100)
      : 0
    const totalRevenue = (closedDeals || []).reduce((sum, d) => sum + (d.deal_value || 0), 0)

    return NextResponse.json({
      activities: activities.slice(0, 100),
      leaderboard: leaderboardArr,
      stats: {
        todayCount: todayActivities,
        weekCount: activities.length,
        activeUsers: uniqueUsers,
        responseRate,
        dealsThisWeek: (closedDeals || []).length,
        revenueThisWeek: totalRevenue,
      },
    })
  } catch {
    return NextResponse.json({ error: "Error loading activity" }, { status: 500 })
  }
}
