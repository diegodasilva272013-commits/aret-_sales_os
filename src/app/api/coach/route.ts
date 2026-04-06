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

    // Get team members
    const { data: team } = await supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .eq("organization_id", orgId)

    // Get all prospects assigned to team
    const { data: allProspects } = await supabase
      .from("prospects")
      .select("id, status, phase, follow_up_count, assigned_to, created_at, last_contact_at, notes")
      .eq("organization_id", orgId)

    // Get follow-ups for response rates  
    const { data: followUps } = await supabase
      .from("follow_ups")
      .select("prospect_id, status, prospect_responded, created_at, sent_at")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1000)

    // Get WhatsApp messages per user
    const { data: waMessages } = await supabase
      .from("whatsapp_messages")
      .select("sender_id, direction, created_at")
      .eq("organization_id", orgId)
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())

    // Get scheduled calls
    const { data: calls } = await supabase
      .from("scheduled_calls")
      .select("setter_id, status, scheduled_at")
      .eq("organization_id", orgId)
      .gte("scheduled_at", new Date(Date.now() - 30 * 86400000).toISOString())

    // Analyze each team member
    type MemberCoaching = {
      id: string
      name: string
      role: string
      metrics: {
        prospectsAssigned: number
        activeProspects: number
        closedWon: number
        closedLost: number
        followUpsSent: number
        responseRate: number
        avgFollowUps: number
        callsScheduled: number
        callsCompleted: number
        messagesOutbound: number
        messagesInbound: number
        conversionRate: number
      }
      strengths: string[]
      improvements: string[]
      tips: string[]
      overallScore: number
      scoreLabel: string
    }

    const members: MemberCoaching[] = (team || []).map(member => {
      const myProspects = (allProspects || []).filter(p => p.assigned_to === member.id)
      const activeP = myProspects.filter(p => p.status === "activo" || p.status === "nuevo")
      const won = myProspects.filter(p => p.status === "cerrado_ganado")
      const lost = myProspects.filter(p => p.status === "cerrado_perdido")

      const myFollowUps = (followUps || []).filter(f => {
        const prospectIds = myProspects.map(p => p.id)
        return prospectIds.includes(f.prospect_id)
      })
      const respondedFU = myFollowUps.filter(f => f.prospect_responded)
      const responseRate = myFollowUps.length > 0 ? Math.round((respondedFU.length / myFollowUps.length) * 100) : 0

      const avgFU = myProspects.length > 0
        ? Math.round(myProspects.reduce((s, p) => s + (p.follow_up_count || 0), 0) / myProspects.length * 10) / 10
        : 0

      const myCalls = (calls || []).filter(c => c.setter_id === member.id)
      const completedCalls = myCalls.filter(c => c.status === "completed")

      const myOutbound = (waMessages || []).filter(m => m.sender_id === member.id && m.direction === "outbound")
      const myInbound = (waMessages || []).filter(m => m.sender_id === member.id && m.direction === "inbound")

      const convRate = myProspects.length > 0 ? Math.round((won.length / myProspects.length) * 100) : 0

      // Scoring (0-100)
      let score = 50 // base
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

      score = Math.min(score, 100)

      // Dynamic coaching tips
      const strengths: string[] = []
      const improvements: string[] = []
      const tips: string[] = []

      // Strengths
      if (convRate > 15) strengths.push("Excelente tasa de conversión")
      if (responseRate > 35) strengths.push("Alta tasa de respuesta en follow-ups")
      if (avgFU >= 3) strengths.push("Persistente con follow-ups")
      if (completedCalls.length > 5) strengths.push("Activo en llamadas")
      if (myOutbound.length > 50) strengths.push("Alto volumen de mensajes")
      if (won.length > 3) strengths.push("Buen track record de cierres")

      // Improvements + tips
      if (responseRate < 20 && myFollowUps.length > 5) {
        improvements.push("Tasa de respuesta baja en follow-ups")
        tips.push("Probá personalizar más tus mensajes. Mencioná algo específico del perfil del prospecto.")
        tips.push("Revisá los mejores horarios en Timing Inteligente para enviar follow-ups.")
      }

      if (avgFU < 2 && myProspects.length > 5) {
        improvements.push("Pocos follow-ups por prospecto")
        tips.push("Aumentá a mínimo 3 follow-ups por prospecto. La mayoría de respuestas llegan entre el 2do y 4to contacto.")
      }

      if (lost.length > won.length && myProspects.length > 5) {
        improvements.push("Más perdidos que ganados")
        tips.push("Revisá la Biblioteca de Objeciones para mejorar tus respuestas a las objeciones más comunes.")
        tips.push("Analizá qué tienen en común los prospectos que cerraste vs. los que perdiste.")
      }

      if (completedCalls.length === 0 && myCalls.length > 0) {
        improvements.push("Llamadas agendadas pero no completadas")
        tips.push("Confirmá las llamadas el día anterior por WhatsApp. Reduce no-shows un 40%.")
      }

      if (myOutbound.length < 10 && myProspects.length > 5) {
        improvements.push("Bajo volumen de mensajes")
        tips.push("Aumentá tu actividad de mensajería. Los setters top mandan +50 mensajes/mes.")
      }

      if (activeP.length > 10 && won.length === 0) {
        improvements.push("Muchos prospectos activos sin cerrar")
        tips.push("Priorizá los prospectos más calientes (Inbox Inteligente). Calidad > Cantidad.")
      }

      // Default tips if no specific ones
      if (tips.length === 0) {
        tips.push("Seguí así. Revisá las métricas semanalmente para mantener el ritmo.")
      }
      if (strengths.length === 0) {
        strengths.push("En proceso de construir historial")
      }

      let scoreLabel = "⚡ En desarrollo"
      if (score >= 85) scoreLabel = "🏆 Estrella"
      else if (score >= 70) scoreLabel = "🔥 Muy bueno"
      else if (score >= 55) scoreLabel = "✅ Sólido"

      return {
        id: member.id,
        name: member.full_name || "Usuario",
        role: member.role || "setter",
        metrics: {
          prospectsAssigned: myProspects.length,
          activeProspects: activeP.length,
          closedWon: won.length,
          closedLost: lost.length,
          followUpsSent: myFollowUps.length,
          responseRate,
          avgFollowUps: avgFU,
          callsScheduled: myCalls.length,
          callsCompleted: completedCalls.length,
          messagesOutbound: myOutbound.length,
          messagesInbound: myInbound.length,
          conversionRate: convRate,
        },
        strengths,
        improvements,
        tips,
        overallScore: score,
        scoreLabel,
      }
    })

    // Sort by score descending
    members.sort((a, b) => b.overallScore - a.overallScore)

    const teamAvgScore = members.length > 0 ? Math.round(members.reduce((s, m) => s + m.overallScore, 0) / members.length) : 0
    const topPerformer = members[0]?.name || "N/A"
    const totalWins = members.reduce((s, m) => s + m.metrics.closedWon, 0)

    return NextResponse.json({
      members,
      stats: {
        teamSize: members.length,
        teamAvgScore,
        topPerformer,
        totalWins,
      },
    })
  } catch {
    return NextResponse.json({
      members: [],
      stats: { teamSize: 0, teamAvgScore: 0, topPerformer: "N/A", totalWins: 0 },
    })
  }
}
