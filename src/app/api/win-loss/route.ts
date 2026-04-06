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

    // Get all prospects with closed status  
    const { data: allProspects } = await supabase
      .from("prospects")
      .select("id, full_name, company, status, phase, follow_up_count, assigned_to, created_at, last_contact_at, notes, source_type")
      .eq("organization_id", orgId)
      .in("status", ["cerrado_ganado", "cerrado_perdido"])
      .order("created_at", { ascending: false })

    // Get follow-ups for closed prospects
    const closedIds = (allProspects || []).map(p => p.id)
    const { data: followUps } = closedIds.length > 0
      ? await supabase.from("follow_ups")
          .select("prospect_id, follow_up_number, phase, status, prospect_responded, created_at")
          .in("prospect_id", closedIds.slice(0, 200))
      : { data: [] }

    // Get closer metrics for revenue data
    const { data: closerMetrics } = await supabase
      .from("closer_metrics")
      .select("fecha, ventas_cerradas, monto_vendido, motivo_no_cierre, objeciones_principales")
      .eq("organization_id", orgId)
      .order("fecha", { ascending: false })
      .limit(90)

    // Get team members
    const { data: team } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("organization_id", orgId)

    const memberMap: Record<string, string> = {}
    ;(team || []).forEach(m => { memberMap[m.id] = m.full_name || "Usuario" })

    const prospects = allProspects || []
    const wins = prospects.filter(p => p.status === "cerrado_ganado")
    const losses = prospects.filter(p => p.status === "cerrado_perdido")

    // Win rate
    const winRate = prospects.length > 0 ? Math.round((wins.length / prospects.length) * 100) : 0

    // Avg follow-ups to win
    const followUpMap: Record<string, number> = {}
    ;(followUps || []).forEach(f => {
      followUpMap[f.prospect_id] = Math.max(followUpMap[f.prospect_id] || 0, f.follow_up_number)
    })
    const winFollowUps = wins.map(w => followUpMap[w.id] || w.follow_up_count || 0).filter(n => n > 0)
    const avgFollowUpsToWin = winFollowUps.length > 0 ? Math.round(winFollowUps.reduce((a, b) => a + b, 0) / winFollowUps.length * 10) / 10 : 0
    const lossFollowUps = losses.map(l => followUpMap[l.id] || l.follow_up_count || 0).filter(n => n > 0)
    const avgFollowUpsToLoss = lossFollowUps.length > 0 ? Math.round(lossFollowUps.reduce((a, b) => a + b, 0) / lossFollowUps.length * 10) / 10 : 0

    // Avg time to close (days)
    const winTimes = wins
      .filter(w => w.last_contact_at && w.created_at)
      .map(w => (new Date(w.last_contact_at!).getTime() - new Date(w.created_at).getTime()) / 86400000)
      .filter(d => d > 0 && d < 365)
    const avgDaysToClose = winTimes.length > 0 ? Math.round(winTimes.reduce((a, b) => a + b, 0) / winTimes.length) : 0

    // Win rate by source
    const sourceStats: Record<string, { wins: number; total: number }> = {}
    prospects.forEach(p => {
      const src = p.source_type || "linkedin"
      if (!sourceStats[src]) sourceStats[src] = { wins: 0, total: 0 }
      sourceStats[src].total++
      if (p.status === "cerrado_ganado") sourceStats[src].wins++
    })

    // Win rate by phase where they were when closed
    const phaseStats: Record<string, { wins: number; losses: number }> = {}
    prospects.forEach(p => {
      const phase = p.phase || "contacto"
      if (!phaseStats[phase]) phaseStats[phase] = { wins: 0, losses: 0 }
      if (p.status === "cerrado_ganado") phaseStats[phase].wins++
      else phaseStats[phase].losses++
    })

    // Win rate by setter
    const setterStats: Record<string, { wins: number; losses: number; name: string }> = {}
    prospects.forEach(p => {
      const sid = p.assigned_to
      if (!setterStats[sid]) setterStats[sid] = { wins: 0, losses: 0, name: memberMap[sid] || "Sin asignar" }
      if (p.status === "cerrado_ganado") setterStats[sid].wins++
      else setterStats[sid].losses++
    })

    // Monthly trend (last 6 months)
    const monthly: Record<string, { wins: number; losses: number }> = {}
    prospects.forEach(p => {
      const month = p.created_at.substring(0, 7) // YYYY-MM
      if (!monthly[month]) monthly[month] = { wins: 0, losses: 0 }
      if (p.status === "cerrado_ganado") monthly[month].wins++
      else monthly[month].losses++
    })
    const trend = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, data]) => ({
        month,
        label: new Date(month + "-01").toLocaleDateString("es-AR", { month: "short" }),
        ...data,
        rate: data.wins + data.losses > 0 ? Math.round((data.wins / (data.wins + data.losses)) * 100) : 0,
      }))

    // Loss reasons from closer metrics
    const lossReasons: Record<string, number> = {}
    ;(closerMetrics || []).forEach(m => {
      if (m.motivo_no_cierre) {
        const reasons = m.motivo_no_cierre.split(/[,;]/).map((r: string) => r.trim().toLowerCase()).filter(Boolean)
        reasons.forEach((r: string) => { lossReasons[r] = (lossReasons[r] || 0) + 1 })
      }
    })
    const topLossReasons = Object.entries(lossReasons)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([reason, count]) => ({ reason: reason.charAt(0).toUpperCase() + reason.slice(1), count }))

    // Top objections
    const objections: Record<string, number> = {}
    ;(closerMetrics || []).forEach(m => {
      if (m.objeciones_principales) {
        const objs = m.objeciones_principales.split(/[,;]/).map((o: string) => o.trim().toLowerCase()).filter(Boolean)
        objs.forEach((o: string) => { objections[o] = (objections[o] || 0) + 1 })
      }
    })
    const topObjections = Object.entries(objections)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([objection, count]) => ({ objection: objection.charAt(0).toUpperCase() + objection.slice(1), count }))

    // Revenue from closer metrics
    const totalRevenue = (closerMetrics || []).reduce((sum, m) => sum + (m.monto_vendido || 0), 0)

    // ====== INSIGHTS ACCIONABLES ======
    type Insight = { type: "danger" | "warning" | "success" | "info"; icon: string; title: string; detail: string; action: string }
    const insights: Insight[] = []

    // 1. Phase analysis - where are deals dying?
    const phaseEntries = Object.entries(phaseStats)
    const worstPhase = phaseEntries
      .filter(([, s]) => s.losses > 0)
      .sort(([, a], [, b]) => b.losses - a.losses)[0]
    if (worstPhase) {
      const [phase, stats] = worstPhase
      const phaseLossRate = Math.round((stats.losses / (stats.wins + stats.losses)) * 100)
      if (phaseLossRate >= 50) {
        insights.push({
          type: "danger",
          icon: "🚨",
          title: `Perdés ${phaseLossRate}% de deals en fase "${phase}"`,
          detail: `${stats.losses} de ${stats.wins + stats.losses} deals se pierden en esta fase. Es tu cuello de botella principal.`,
          action: `Revisá los últimos 5 deals perdidos en "${phase}" y buscá el patrón: ¿es precio? ¿timing? ¿falta de urgencia?`,
        })
      }
    }

    // 2. Follow-up gap insight
    if (avgFollowUpsToWin > 0 && avgFollowUpsToLoss > 0) {
      const gap = avgFollowUpsToWin - avgFollowUpsToLoss
      if (gap > 1) {
        insights.push({
          type: "warning",
          icon: "📤",
          title: `Dejás de seguir demasiado pronto`,
          detail: `Los deals ganados necesitan ${avgFollowUpsToWin} follow-ups en promedio, pero los perdidos solo llegan a ${avgFollowUpsToLoss}. Hay ${gap.toFixed(1)} follow-ups de diferencia.`,
          action: `Configurá un mínimo de ${Math.ceil(avgFollowUpsToWin)} follow-ups antes de dar un deal por perdido.`,
        })
      } else if (gap < -1) {
        insights.push({
          type: "info",
          icon: "⏰",
          title: `Demasiados follow-ups en deals perdidos`,
          detail: `Invertís ${avgFollowUpsToLoss} follow-ups en deals que se pierden vs ${avgFollowUpsToWin} en los que ganás.`,
          action: `Si al follow-up #${Math.ceil(avgFollowUpsToWin + 1)} no hay respuesta, pivoteá la estrategia o descalificá.`,
        })
      }
    }

    // 3. Speed to close
    if (avgDaysToClose > 30) {
      insights.push({
        type: "warning",
        icon: "⏱️",
        title: `Tu ciclo de venta es de ${avgDaysToClose} días`,
        detail: `Las mejores agencias cierran en 14-21 días. Un ciclo largo enfría al prospecto.`,
        action: `Creá urgencia: oferta con deadline, caso de éxito reciente, o una demo de resultado rápida.`,
      })
    } else if (avgDaysToClose > 0 && avgDaysToClose <= 14) {
      insights.push({
        type: "success",
        icon: "⚡",
        title: `Ciclo de cierre rápido: ${avgDaysToClose} días`,
        detail: `Tu velocidad de cierre es excelente. Los prospectos no se enfrían.`,
        action: `Mantené este ritmo. Documentá qué hacés en los primeros 3 días con cada prospecto.`,
      })
    }

    // 4. Source analysis
    const bestSource = Object.entries(sourceStats).sort(([, a], [, b]) => {
      const rateA = a.total > 0 ? a.wins / a.total : 0
      const rateB = b.total > 0 ? b.wins / b.total : 0
      return rateB - rateA
    })[0]
    const worstSource = Object.entries(sourceStats).filter(([, s]) => s.total >= 3).sort(([, a], [, b]) => {
      const rateA = a.total > 0 ? a.wins / a.total : 0
      const rateB = b.total > 0 ? b.wins / b.total : 0
      return rateA - rateB
    })[0]
    if (bestSource && worstSource && bestSource[0] !== worstSource[0]) {
      const bestRate = Math.round((bestSource[1].wins / bestSource[1].total) * 100)
      const worstRate = Math.round((worstSource[1].wins / worstSource[1].total) * 100)
      if (bestRate - worstRate > 20) {
        insights.push({
          type: "info",
          icon: "🎯",
          title: `"${bestSource[0]}" convierte ${bestRate}% vs "${worstSource[0]}" ${worstRate}%`,
          detail: `Tu mejor fuente de deals es ${bestSource[0]}. Considerá redirigir esfuerzo ahí.`,
          action: `Duplicá tu inversión en ${bestSource[0]} y reducí ${worstSource[0]} o mejorá el approach.`,
        })
      }
    }

    // 5. Objections insight  
    if (topObjections.length > 0) {
      const topObj = topObjections[0]
      insights.push({
        type: "warning",
        icon: "🛡️",
        title: `La objeción #1 es: "${topObj.objection}"`,
        detail: `Apareció ${topObj.count} veces. Si no tenés un script preparado para esto, estás perdiendo deals.`,
        action: `Escribí 3 respuestas diferentes para "${topObj.objection}" y practicá con el equipo.`,
      })
    }

    // 6. Loss reasons insight
    if (topLossReasons.length > 0) {
      const topReason = topLossReasons[0]
      const totalLossReasonCount = topLossReasons.reduce((s, r) => s + r.count, 0)
      const pct = Math.round((topReason.count / totalLossReasonCount) * 100)
      insights.push({
        type: "danger",
        icon: "💀",
        title: `"${topReason.reason}" causa ${pct}% de las pérdidas`,
        detail: `Es tu motivo principal de pérdida (${topReason.count} deals).`,
        action: `Cambiá tu pitch para atacar "${topReason.reason}" antes de que el prospecto lo mencione.`,
      })
    }

    // 7. Win rate overall
    if (winRate < 25) {
      insights.push({
        type: "danger",
        icon: "📉",
        title: `Win rate crítico: ${winRate}%`,
        detail: `De cada 4 deals, cerrás menos de 1. El benchmark es 30-40%.`,
        action: `Enfocate en calificar mejor: solo invertí tiempo en prospectos con presupuesto confirmado.`,
      })
    } else if (winRate >= 50) {
      insights.push({
        type: "success",
        icon: "🏆",
        title: `Win rate excelente: ${winRate}%`,
        detail: `Estás cerrando más de la mitad de tus deals. Seguí haciendo lo que funciona.`,
        action: `Podrías estar siendo muy selectivo. Probá escalar: más volumen de prospectos.`,
      })
    }

    // 8. Setter variance
    const setterArr = Object.entries(setterStats)
      .filter(([, s]) => s.wins + s.losses >= 3)
      .map(([, s]) => { const total = s.wins + s.losses; return { ...s, rate: Math.round((s.wins / total) * 100) } })
    if (setterArr.length >= 2) {
      const best = setterArr.sort((a, b) => b.rate - a.rate)[0]
      const worst = setterArr[setterArr.length - 1]
      if (best.rate - worst.rate > 25) {
        insights.push({
          type: "info",
          icon: "👥",
          title: `${best.name.split(" ")[0]} cierra al ${best.rate}%, ${worst.name.split(" ")[0]} al ${worst.rate}%`,
          detail: `Hay ${best.rate - worst.rate}% de diferencia entre tu mejor y peor setter.`,
          action: `Que ${best.name.split(" ")[0]} grabe sus 3 mejores llamadas para que ${worst.name.split(" ")[0]} estudie.`,
        })
      }
    }

    // Sort: danger first, then warning, info, success
    const priority = { danger: 0, warning: 1, info: 2, success: 3 }
    insights.sort((a, b) => priority[a.type] - priority[b.type])

    return NextResponse.json({
      summary: {
        totalDeals: prospects.length,
        wins: wins.length,
        losses: losses.length,
        winRate,
        avgFollowUpsToWin,
        avgFollowUpsToLoss,
        avgDaysToClose,
        totalRevenue,
      },
      insights: insights.slice(0, 6),
      sourceStats: Object.entries(sourceStats).map(([source, s]) => ({
        source,
        ...s,
        rate: s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0,
      })),
      phaseStats: Object.entries(phaseStats).map(([phase, s]) => ({ phase, ...s })),
      setterStats: Object.entries(setterStats)
        .map(([id, s]) => ({ id, ...s, rate: s.wins + s.losses > 0 ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0 }))
        .sort((a, b) => b.rate - a.rate),
      trend,
      topLossReasons,
      topObjections,
    })
  } catch {
    return NextResponse.json({ error: "Error generating report" }, { status: 500 })
  }
}
