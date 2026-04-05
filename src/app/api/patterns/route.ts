import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import OpenAI from "openai"

export type PatternInsight = {
  id: string
  category: "disc" | "speed" | "followup" | "source" | "phase" | "timing"
  icon: string
  title: string
  detail: string
  stat: string
  color: string
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

  // 1. Get ALL prospects with their analyses
  let prospectsQuery = supabase
    .from("prospects")
    .select("id, status, phase, follow_up_count, source_type, created_at, last_contact_at, notes, assigned_to")

  if (!isOwner) {
    prospectsQuery = prospectsQuery.eq("assigned_to", user.id)
  }

  const [
    { data: prospects },
    { data: analyses },
    { data: followUps },
    { data: waMessages },
  ] = await Promise.all([
    prospectsQuery,
    supabase.from("prospect_analyses").select("prospect_id, disc_type, pain_points, communication_style"),
    supabase.from("follow_ups").select("prospect_id, follow_up_number, status, prospect_responded, sent_at, created_at"),
    supabase.from("whatsapp_messages").select("prospect_id, direction, created_at").order("created_at", { ascending: true }),
  ])

  if (!prospects || prospects.length < 3) {
    return NextResponse.json({ insights: [], playbook: null, stats: { total: 0, ganados: 0, perdidos: 0 } })
  }

  const ganados = prospects.filter(p => p.status === "cerrado_ganado")
  const perdidos = prospects.filter(p => p.status === "cerrado_perdido")
  const cerrados = [...ganados, ...perdidos]

  if (cerrados.length < 2) {
    return NextResponse.json({
      insights: [],
      playbook: null,
      stats: { total: prospects.length, ganados: ganados.length, perdidos: perdidos.length },
    })
  }

  // Build analysis map
  const analysisMap = new Map<string, { disc_type: string; pain_points: string[]; communication_style: string }>()
  for (const a of analyses || []) {
    analysisMap.set(a.prospect_id, a)
  }

  // Build follow-up map
  const followUpMap = new Map<string, typeof followUps>()
  for (const f of followUps || []) {
    if (!followUpMap.has(f.prospect_id)) followUpMap.set(f.prospect_id, [])
    followUpMap.get(f.prospect_id)!.push(f)
  }

  // Build WA response time map (first inbound after first outbound)
  const responseTimeMap = new Map<string, number>()
  const waByProspect = new Map<string, { direction: string; created_at: string }[]>()
  for (const msg of waMessages || []) {
    if (!msg.prospect_id) continue
    if (!waByProspect.has(msg.prospect_id)) waByProspect.set(msg.prospect_id, [])
    waByProspect.get(msg.prospect_id)!.push(msg)
  }
  for (const [pid, msgs] of waByProspect) {
    const firstOut = msgs.find(m => m.direction === "outbound")
    if (!firstOut) continue
    const firstIn = msgs.find(m => m.direction === "inbound" && new Date(m.created_at) > new Date(firstOut.created_at))
    if (!firstIn) continue
    const diffMins = (new Date(firstIn.created_at).getTime() - new Date(firstOut.created_at).getTime()) / 60000
    responseTimeMap.set(pid, diffMins)
  }

  const insights: PatternInsight[] = []

  // === PATTERN 1: DISC types win rate ===
  const discStats: Record<string, { ganados: number; total: number }> = {}
  for (const p of cerrados) {
    const analysis = analysisMap.get(p.id)
    if (!analysis?.disc_type) continue
    const disc = analysis.disc_type.charAt(0).toUpperCase()
    if (!discStats[disc]) discStats[disc] = { ganados: 0, total: 0 }
    discStats[disc].total++
    if (p.status === "cerrado_ganado") discStats[disc].ganados++
  }

  const discEntries = Object.entries(discStats).filter(([, v]) => v.total >= 2).sort((a, b) => (b[1].ganados / b[1].total) - (a[1].ganados / a[1].total))
  if (discEntries.length > 0) {
    const [bestDisc, bestStats] = discEntries[0]
    const winRate = Math.round((bestStats.ganados / bestStats.total) * 100)
    const discNames: Record<string, string> = { D: "Dominante", I: "Influyente", S: "Estable", C: "Concienzudo" }
    insights.push({
      id: "disc-winner",
      category: "disc",
      icon: "🧬",
      title: `DISC tipo ${bestDisc} es tu mejor perfil`,
      detail: `Los prospectos ${discNames[bestDisc] || bestDisc} cierran al ${winRate}% (${bestStats.ganados}/${bestStats.total})`,
      stat: `${winRate}%`,
      color: "#8b5cf6",
    })
    if (discEntries.length > 1) {
      const [worstDisc, worstStats] = discEntries[discEntries.length - 1]
      const worstRate = Math.round((worstStats.ganados / worstStats.total) * 100)
      if (worstRate < winRate - 15) {
        insights.push({
          id: "disc-loser",
          category: "disc",
          icon: "⚠️",
          title: `DISC tipo ${worstDisc} convierte bajo`,
          detail: `Solo ${worstRate}% de cierre (${worstStats.ganados}/${worstStats.total}). Considerá cambiar el approach.`,
          stat: `${worstRate}%`,
          color: "#ef4444",
        })
      }
    }
  }

  // === PATTERN 2: Response speed correlation ===
  const fastResponders = { ganados: 0, total: 0 }
  const slowResponders = { ganados: 0, total: 0 }
  for (const p of cerrados) {
    const responseTime = responseTimeMap.get(p.id)
    if (responseTime === undefined) continue
    if (responseTime <= 60) {
      fastResponders.total++
      if (p.status === "cerrado_ganado") fastResponders.ganados++
    } else {
      slowResponders.total++
      if (p.status === "cerrado_ganado") slowResponders.ganados++
    }
  }
  if (fastResponders.total >= 2 && slowResponders.total >= 2) {
    const fastRate = Math.round((fastResponders.ganados / fastResponders.total) * 100)
    const slowRate = Math.round((slowResponders.ganados / slowResponders.total) * 100)
    if (fastRate > slowRate) {
      const multiplier = slowRate > 0 ? (fastRate / slowRate).toFixed(1) : "∞"
      insights.push({
        id: "speed-wins",
        category: "speed",
        icon: "⚡",
        title: "Respuesta rápida = más cierre",
        detail: `Prospectos que responden en <1h cierran ${fastRate}% vs ${slowRate}%. Son ${multiplier}x más probables.`,
        stat: `${multiplier}x`,
        color: "#22c55e",
      })
    }
  }

  // === PATTERN 3: Optimal follow-up number ===
  const followUpWins: Record<number, number> = {}
  for (const p of ganados) {
    const fups = followUpMap.get(p.id)
    if (!fups) {
      followUpWins[0] = (followUpWins[0] || 0) + 1
      continue
    }
    const lastResponded = fups.filter(f => f.prospect_responded).sort((a, b) => b.follow_up_number - a.follow_up_number)[0]
    const num = lastResponded ? lastResponded.follow_up_number : p.follow_up_count || 0
    followUpWins[num] = (followUpWins[num] || 0) + 1
  }
  if (ganados.length >= 2) {
    const sorted = Object.entries(followUpWins).sort((a, b) => Number(b[1]) - Number(a[1]))
    const [bestFU, bestCount] = sorted[0]
    const pct = Math.round((Number(bestCount) / ganados.length) * 100)
    insights.push({
      id: "followup-sweet",
      category: "followup",
      icon: "🎯",
      title: `El follow-up #${bestFU} es el más efectivo`,
      detail: `${pct}% de tus cierres pasan por el follow-up ${bestFU} (${bestCount}/${ganados.length}).`,
      stat: `#${bestFU}`,
      color: "#3b82f6",
    })
  }

  // === PATTERN 4: Source conversion (IG vs LinkedIn) ===
  const sourceStats: Record<string, { ganados: number; total: number }> = {}
  for (const p of cerrados) {
    const src = p.source_type || "linkedin"
    if (!sourceStats[src]) sourceStats[src] = { ganados: 0, total: 0 }
    sourceStats[src].total++
    if (p.status === "cerrado_ganado") sourceStats[src].ganados++
  }
  const sourceEntries = Object.entries(sourceStats).filter(([, v]) => v.total >= 2)
  if (sourceEntries.length >= 2) {
    sourceEntries.sort((a, b) => (b[1].ganados / b[1].total) - (a[1].ganados / a[1].total))
    const [bestSrc, bestSrcStats] = sourceEntries[0]
    const bestRate = Math.round((bestSrcStats.ganados / bestSrcStats.total) * 100)
    const labels: Record<string, string> = { instagram: "Instagram", linkedin: "LinkedIn" }
    insights.push({
      id: "source-best",
      category: "source",
      icon: bestSrc === "instagram" ? "📸" : "💼",
      title: `${labels[bestSrc] || bestSrc} convierte mejor`,
      detail: `${bestRate}% de cierre vs ${sourceEntries.map(([s, v]) => s !== bestSrc ? `${Math.round((v.ganados / v.total) * 100)}% ${labels[s] || s}` : "").filter(Boolean).join(", ")}`,
      stat: `${bestRate}%`,
      color: bestSrc === "instagram" ? "#e1306c" : "#0077b5",
    })
  }

  // === PATTERN 5: Where deals die ===
  if (perdidos.length >= 2) {
    const phaseDeaths: Record<string, number> = {}
    for (const p of perdidos) {
      phaseDeaths[p.phase] = (phaseDeaths[p.phase] || 0) + 1
    }
    const sorted = Object.entries(phaseDeaths).sort((a, b) => b[1] - a[1])
    const [deadPhase, deadCount] = sorted[0]
    const pct = Math.round((deadCount / perdidos.length) * 100)
    const phaseLabels: Record<string, string> = { contacto: "Contacto", venta: "Venta", cierre: "Cierre" }
    insights.push({
      id: "death-phase",
      category: "phase",
      icon: "💀",
      title: `${pct}% se pierden en fase ${phaseLabels[deadPhase] || deadPhase}`,
      detail: `${deadCount} de ${perdidos.length} deals perdidos mueren en ${phaseLabels[deadPhase] || deadPhase}. Reforzá esa etapa.`,
      stat: `${pct}%`,
      color: "#ef4444",
    })
  }

  // === PATTERN 6: Average time to close ===
  const closeTimes: number[] = []
  for (const p of ganados) {
    if (!p.last_contact_at) continue
    const days = Math.round((new Date(p.last_contact_at).getTime() - new Date(p.created_at).getTime()) / 86400000)
    if (days >= 0) closeTimes.push(days)
  }
  if (closeTimes.length >= 2) {
    const avg = Math.round(closeTimes.reduce((a, b) => a + b, 0) / closeTimes.length)
    insights.push({
      id: "avg-close-time",
      category: "timing",
      icon: "⏱️",
      title: `Tiempo promedio de cierre: ${avg} días`,
      detail: `Tus deals ganados tardan ~${avg} días del primer contacto al cierre.`,
      stat: `${avg}d`,
      color: "#f59e0b",
    })
  }

  // === AI PLAYBOOK ===
  let playbook: string | null = null
  if (insights.length >= 2) {
    const apiKey = process.env.OPENAI_API_KEY
    if (apiKey) {
      try {
        const openai = new OpenAI({ apiKey })
        const insightsText = insights.map(i => `- ${i.title}: ${i.detail}`).join("\n")
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 500,
          messages: [
            {
              role: "system",
              content: `Sos el estratega de ventas de Areté IA OS. Generás un playbook corto basado en datos reales del CRM.

Reglas:
- Español argentino, directo y profesional
- Máximo 5-6 oraciones
- Usá los datos concretos que te dan (porcentajes, números)
- Dá recomendaciones accionables, no genéricas
- NO uses emojis, NO markdown, NO bullet points
- Soná como un director comercial que sabe lo que hace`
            },
            {
              role: "user",
              content: `Datos del equipo: ${prospects.length} prospectos total, ${ganados.length} ganados, ${perdidos.length} perdidos (${cerrados.length > 0 ? Math.round((ganados.length / cerrados.length) * 100) : 0}% win rate).

Patrones encontrados:
${insightsText}

Generá un mini-playbook con las 3 recomendaciones más importantes basadas en estos datos.`
            }
          ],
        })
        playbook = response.choices[0].message.content || null
      } catch {
        // silent — playbook is optional
      }
    }
  }

  return NextResponse.json({
    insights: insights.slice(0, 6),
    playbook,
    stats: {
      total: prospects.length,
      ganados: ganados.length,
      perdidos: perdidos.length,
      winRate: cerrados.length > 0 ? Math.round((ganados.length / cerrados.length) * 100) : 0,
    },
  })
}
