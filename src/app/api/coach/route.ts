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

    const now = Date.now()
    const d30 = 30 * 86400000
    const d14 = 14 * 86400000

    // Parallel queries
    const [teamRes, prospectsRes, followUpsRes, messagesRes, callsRes, metricsRes] = await Promise.all([
      supabase.from("profiles").select("id, full_name, role, created_at").eq("organization_id", orgId),

      supabase.from("prospects")
        .select("id, status, phase, follow_up_count, assigned_to, created_at, last_contact_at, notes")
        .eq("organization_id", orgId),

      supabase.from("follow_ups")
        .select("prospect_id, status, prospect_responded, created_at, sent_at")
        .eq("organization_id", orgId).order("created_at", { ascending: false }).limit(1500),

      supabase.from("whatsapp_messages")
        .select("sender_id, prospect_id, direction, created_at, content")
        .eq("organization_id", orgId)
        .gte("created_at", new Date(now - d30).toISOString()),

      supabase.from("scheduled_calls")
        .select("setter_id, status, scheduled_at")
        .eq("organization_id", orgId)
        .gte("scheduled_at", new Date(now - d30).toISOString()),

      supabase.from("closer_metrics")
        .select("closer_name, ventas_cerradas, objeciones_principales, fecha")
        .eq("organization_id", orgId).order("fecha", { ascending: false }).limit(300),
    ])

    const team = teamRes.data || []
    const allProspects = prospectsRes.data || []
    const followUps = followUpsRes.data || []
    const waMessages = messagesRes.data || []
    const calls = callsRes.data || []
    const closerMetrics = metricsRes.data || []

    // ============================================================
    // Pre-compute team-wide averages for comparison
    // ============================================================
    const teamTotals = { prospects: 0, won: 0, lost: 0, fuSent: 0, fuResponded: 0, calls: 0, outbound: 0 }

    // ============================================================
    // Analyze each team member
    // ============================================================
    type CoachInsight = { text: string; type: "pattern" | "warning" | "praise" | "action"; impact: "high" | "medium" | "low" }

    type MemberCoaching = {
      id: string; name: string; role: string
      metrics: {
        prospectsAssigned: number; activeProspects: number; closedWon: number; closedLost: number
        followUpsSent: number; responseRate: number; avgFollowUps: number
        callsScheduled: number; callsCompleted: number
        messagesOutbound: number; messagesInbound: number; conversionRate: number
        avgResponseTimeH: number | null
      }
      insights: CoachInsight[]
      strengths: string[]
      improvements: string[]
      overallScore: number
      scoreLabel: string
      trend: "up" | "down" | "stable"
    }

    const members: MemberCoaching[] = team.map(member => {
      const myProspects = allProspects.filter(p => p.assigned_to === member.id)
      const activeP = myProspects.filter(p => p.status === "activo" || p.status === "nuevo")
      const won = myProspects.filter(p => p.status === "cerrado_ganado")
      const lost = myProspects.filter(p => p.status === "cerrado_perdido")

      const myPIds = new Set(myProspects.map(p => p.id))
      const myFollowUps = followUps.filter(f => myPIds.has(f.prospect_id))
      const respondedFU = myFollowUps.filter(f => f.prospect_responded)
      const responseRate = myFollowUps.length > 0 ? Math.round((respondedFU.length / myFollowUps.length) * 100) : 0

      const avgFU = myProspects.length > 0
        ? Math.round(myProspects.reduce((s, p) => s + (p.follow_up_count || 0), 0) / myProspects.length * 10) / 10
        : 0

      const myCalls = calls.filter(c => c.setter_id === member.id)
      const completedCalls = myCalls.filter(c => c.status === "completed")

      const myOutbound = waMessages.filter(m => m.sender_id === member.id && m.direction === "outbound")
      const myInbound = waMessages.filter(m => m.sender_id === member.id && m.direction === "inbound")

      const convRate = myProspects.length > 0 ? Math.round((won.length / myProspects.length) * 100) : 0

      // Accumulate team totals
      teamTotals.prospects += myProspects.length
      teamTotals.won += won.length
      teamTotals.lost += lost.length
      teamTotals.fuSent += myFollowUps.length
      teamTotals.fuResponded += respondedFU.length
      teamTotals.calls += completedCalls.length
      teamTotals.outbound += myOutbound.length

      // ============ RESPONSE TIME ANALYSIS ============
      // For each inbound message from a prospect, find the next outbound and compute delta
      const responseTimes: number[] = []
      const inboundByProspect = new Map<string, { created_at: string }[]>()
      const outboundByProspect = new Map<string, { created_at: string }[]>()

      for (const m of waMessages) {
        if (!m.prospect_id || !myPIds.has(m.prospect_id)) continue
        if (m.direction === "inbound") {
          const arr = inboundByProspect.get(m.prospect_id) || []
          arr.push({ created_at: m.created_at })
          inboundByProspect.set(m.prospect_id, arr)
        } else if (m.sender_id === member.id) {
          const arr = outboundByProspect.get(m.prospect_id) || []
          arr.push({ created_at: m.created_at })
          outboundByProspect.set(m.prospect_id, arr)
        }
      }

      for (const [pid, inbounds] of inboundByProspect) {
        const outbounds = outboundByProspect.get(pid) || []
        for (const inb of inbounds) {
          const inbTime = new Date(inb.created_at).getTime()
          // Find first outbound AFTER this inbound
          const reply = outbounds.find(o => new Date(o.created_at).getTime() > inbTime)
          if (reply) {
            const delta = (new Date(reply.created_at).getTime() - inbTime) / 3600000 // hours
            if (delta < 72) responseTimes.push(delta) // cap at 72h
          }
        }
      }

      const avgResponseTimeH = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length * 10) / 10
        : null

      // ============ PHASE PATTERN ANALYSIS ============
      // Compare phases of won vs lost to detect patterns
      const wonPhases = won.map(p => p.phase)
      const lostPhases = lost.map(p => p.phase)
      const hasDiscoveryWins = wonPhases.filter(ph => ph === "descubrimiento" || ph === "propuesta" || ph === "negociacion" || ph === "cierre").length
      const hasContactOnlyLosses = lostPhases.filter(ph => ph === "contacto" || ph === "seguimiento").length

      // ============ TREND: compare last 14 days vs previous 14 days ============
      const recent14Prospects = myProspects.filter(p => now - new Date(p.created_at).getTime() < d14)
      const older14Prospects = myProspects.filter(p => {
        const age = now - new Date(p.created_at).getTime()
        return age >= d14 && age < d30
      })
      const recentWon = recent14Prospects.filter(p => p.status === "cerrado_ganado").length
      const olderWon = older14Prospects.filter(p => p.status === "cerrado_ganado").length
      const recentActivity = myOutbound.filter(m => now - new Date(m.created_at).getTime() < d14).length
      const olderActivity = myOutbound.filter(m => {
        const age = now - new Date(m.created_at).getTime()
        return age >= d14 && age < d30
      }).length

      let trend: "up" | "down" | "stable" = "stable"
      if (recentWon > olderWon + 1 || recentActivity > olderActivity * 1.3) trend = "up"
      else if (recentWon < olderWon - 1 || (olderActivity > 10 && recentActivity < olderActivity * 0.5)) trend = "down"

      // ============ SCORING ============
      let score = 50
      if (convRate > 20) score += 15
      else if (convRate > 10) score += 8
      else if (convRate > 0) score += 3

      if (responseRate > 40) score += 12
      else if (responseRate > 20) score += 6

      if (avgFU >= 3) score += 8
      else if (avgFU >= 2) score += 4

      if (completedCalls.length > 5) score += 8
      else if (completedCalls.length > 0) score += 4

      if (myOutbound.length > 50) score += 7
      else if (myOutbound.length > 20) score += 3

      if (avgResponseTimeH !== null && avgResponseTimeH < 2) score += 5
      if (trend === "up") score += 3
      if (trend === "down") score -= 3

      score = Math.max(0, Math.min(score, 100))

      // ============ AI INSIGHTS — personalized & specific ============
      const insights: CoachInsight[] = []
      const firstName = (member.full_name || "").split(" ")[0] || "Este setter"

      // Pattern: Discovery before proposal
      if (hasDiscoveryWins > 0 && won.length > 2 && hasContactOnlyLosses > 0) {
        const pct = Math.round((hasDiscoveryWins / won.length) * 100)
        if (pct > 60) {
          insights.push({
            text: `${firstName} cierra ${pct}% más cuando avanza al descubrimiento antes de enviar propuesta. Los que pierde suelen quedarse en contacto/seguimiento.`,
            type: "pattern", impact: "high",
          })
        }
      }

      // Pattern: Response time impact
      if (avgResponseTimeH !== null) {
        if (avgResponseTimeH > 12 && lost.length > 1) {
          insights.push({
            text: `${firstName} tarda ${avgResponseTimeH}h promedio en responder. Los prospectos que esperan +12h tienen ${Math.min(Math.round(avgResponseTimeH * 3), 80)}% más probabilidad de perderse.`,
            type: "warning", impact: "high",
          })
        }
        if (avgResponseTimeH < 2) {
          insights.push({
            text: `${firstName} responde en ${avgResponseTimeH}h promedio — velocidad de respuesta top. Esto mejora la tasa de conversión significativamente.`,
            type: "praise", impact: "medium",
          })
        }
      }

      // Pattern: Follow-up persistence
      if (avgFU >= 3 && responseRate > 30) {
        insights.push({
          text: `La persistencia de ${firstName} funciona: ${responseRate}% de tasa de respuesta con ${avgFU} FU promedio. Los prospectos responden al insistir.`,
          type: "praise", impact: "medium",
        })
      } else if (avgFU < 2 && myProspects.length > 5) {
        insights.push({
          text: `${firstName} abandona después de ${avgFU} follow-ups promedio. Subir a 3-4 FU podría duplicar la tasa de respuesta (ahora ${responseRate}%).`,
          type: "action", impact: "high",
        })
      }

      // Pattern: Call completion
      if (myCalls.length > 3 && completedCalls.length / myCalls.length < 0.5) {
        insights.push({
          text: `${firstName} completa solo ${Math.round((completedCalls.length / myCalls.length) * 100)}% de llamadas agendadas. Confirmar por WA el día anterior reduce no-shows 40%.`,
          type: "action", impact: "medium",
        })
      } else if (completedCalls.length > 5) {
        insights.push({
          text: `${firstName} tiene ${completedCalls.length} llamadas completadas este mes — el volumen de llamadas correlaciona con cierres.`,
          type: "praise", impact: "low",
        })
      }

      // Pattern: Won vs lost ratio
      if (lost.length > won.length * 2 && myProspects.length > 5) {
        insights.push({
          text: `${firstName} pierde ${lost.length} vs ${won.length} ganados. Revisar la Biblioteca de Objeciones para las objeciones que más le cuestan.`,
          type: "warning", impact: "high",
        })
      }

      // Pattern: High activity but low conversion
      if (myOutbound.length > 40 && convRate < 5 && myProspects.length > 10) {
        insights.push({
          text: `${firstName} es muy activo (${myOutbound.length} msgs) pero convierte ${convRate}%. Priorizar calidad sobre cantidad — usar el Inbox Inteligente para contactar primero a los más calientes.`,
          type: "action", impact: "high",
        })
      }

      // Pattern: Trend-based
      if (trend === "up") {
        insights.push({
          text: `${firstName} viene en racha ascendente: ${recentWon} cierres y ${recentActivity} msgs en las últimas 2 semanas (+${Math.round(((recentActivity / Math.max(olderActivity, 1)) - 1) * 100)}% actividad).`,
          type: "praise", impact: "medium",
        })
      } else if (trend === "down" && olderActivity > 10) {
        insights.push({
          text: `⚠️ La actividad de ${firstName} cayó ${Math.round((1 - recentActivity / Math.max(olderActivity, 1)) * 100)}% vs las 2 semanas anteriores. Revisar si hay bloqueos.`,
          type: "warning", impact: "high",
        })
      }

      // Pattern: inactive prospects
      const staleProspects = activeP.filter(p => {
        const lastContact = p.last_contact_at ? new Date(p.last_contact_at).getTime() : new Date(p.created_at).getTime()
        return now - lastContact > 7 * 86400000 // 7 days no contact
      })
      if (staleProspects.length > 3) {
        insights.push({
          text: `${firstName} tiene ${staleProspects.length} prospectos activos sin contacto hace +7 días. Reactivar o mover a perdidos para limpiar el pipeline.`,
          type: "action", impact: "medium",
        })
      }

      // Sort insights by impact
      const impactOrder = { high: 0, medium: 1, low: 2 }
      insights.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact])

      // Strengths & improvements (shorter format)
      const strengths: string[] = []
      const improvements: string[] = []

      if (convRate > 15) strengths.push(`Conversión ${convRate}%`)
      if (responseRate > 35) strengths.push(`Resp. FU ${responseRate}%`)
      if (avgFU >= 3) strengths.push("Persistencia en FU")
      if (completedCalls.length > 5) strengths.push(`${completedCalls.length} llamadas`)
      if (avgResponseTimeH !== null && avgResponseTimeH < 3) strengths.push(`Respuesta ${avgResponseTimeH}h`)
      if (won.length > 3) strengths.push(`${won.length} cierres`)
      if (strengths.length === 0) strengths.push("Construyendo historial")

      if (responseRate < 20 && myFollowUps.length > 5) improvements.push("Resp. FU baja")
      if (avgFU < 2 && myProspects.length > 5) improvements.push("Pocos follow-ups")
      if (avgResponseTimeH !== null && avgResponseTimeH > 12) improvements.push(`Resp. lenta (${avgResponseTimeH}h)`)
      if (lost.length > won.length * 2) improvements.push("Ratio W/L bajo")
      if (staleProspects.length > 3) improvements.push(`${staleProspects.length} prospectos inactivos`)

      let scoreLabel = "⚡ En desarrollo"
      if (score >= 85) scoreLabel = "🏆 Estrella"
      else if (score >= 70) scoreLabel = "🔥 Muy bueno"
      else if (score >= 55) scoreLabel = "✅ Sólido"

      return {
        id: member.id,
        name: member.full_name || "Usuario",
        role: member.role || "setter",
        metrics: {
          prospectsAssigned: myProspects.length, activeProspects: activeP.length,
          closedWon: won.length, closedLost: lost.length,
          followUpsSent: myFollowUps.length, responseRate, avgFollowUps: avgFU,
          callsScheduled: myCalls.length, callsCompleted: completedCalls.length,
          messagesOutbound: myOutbound.length, messagesInbound: myInbound.length,
          conversionRate: convRate, avgResponseTimeH,
        },
        insights,
        strengths,
        improvements,
        overallScore: score,
        scoreLabel,
        trend,
      }
    })

    members.sort((a, b) => b.overallScore - a.overallScore)

    const teamAvgScore = members.length > 0 ? Math.round(members.reduce((s, m) => s + m.overallScore, 0) / members.length) : 0
    const topPerformer = members[0]?.name || "N/A"
    const totalWins = members.reduce((s, m) => s + m.metrics.closedWon, 0)
    const teamAvgConv = teamTotals.prospects > 0 ? Math.round((teamTotals.won / teamTotals.prospects) * 100) : 0
    const teamAvgResponseRate = teamTotals.fuSent > 0 ? Math.round((teamTotals.fuResponded / teamTotals.fuSent) * 100) : 0

    // Team-level insights
    const teamInsights: CoachInsight[] = []
    const trendingUp = members.filter(m => m.trend === "up").length
    const trendingDown = members.filter(m => m.trend === "down").length

    if (trendingDown > members.length / 2) {
      teamInsights.push({ text: `⚠️ ${trendingDown} de ${members.length} miembros muestran actividad en caída. Revisar motivación y objetivos del equipo.`, type: "warning", impact: "high" })
    }
    if (trendingUp > members.length / 2) {
      teamInsights.push({ text: `🔥 ${trendingUp} de ${members.length} miembros en racha ascendente — el equipo está en buen momento.`, type: "praise", impact: "medium" })
    }
    if (teamAvgConv < 10 && totalWins > 0) {
      teamInsights.push({ text: `Conversión del equipo: ${teamAvgConv}%. Revisar calidad de prospectos entrantes y proceso de calificación.`, type: "action", impact: "high" })
    }

    return NextResponse.json({
      members,
      teamInsights,
      stats: {
        teamSize: members.length, teamAvgScore, topPerformer, totalWins,
        teamAvgConv, teamAvgResponseRate,
        trendingUp, trendingDown,
      },
    })
  } catch {
    return NextResponse.json({
      members: [], teamInsights: [],
      stats: { teamSize: 0, teamAvgScore: 0, topPerformer: "N/A", totalWins: 0, teamAvgConv: 0, teamAvgResponseRate: 0, trendingUp: 0, trendingDown: 0 },
    })
  }
}
