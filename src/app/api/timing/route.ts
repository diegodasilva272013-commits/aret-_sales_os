import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Días en español
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const HORAS_LABEL: Record<number, string> = {
  8: "8:00", 9: "9:00", 10: "10:00", 11: "11:00", 12: "12:00",
  13: "13:00", 14: "14:00", 15: "15:00", 16: "16:00", 17: "17:00",
  18: "18:00", 19: "19:00", 20: "20:00",
}

type TimingSlot = { day: number; dayLabel: string; hour: number; hourLabel: string; responseRate: number; count: number }
type IndustryPattern = { industry: string; bestSlots: TimingSlot[]; avgResponseMinutes: number; sampleSize: number }
type GlobalHeatmap = { day: number; hour: number; value: number }[]

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    const orgId = profile?.organization_id
    if (!orgId) return NextResponse.json({ error: "No org" }, { status: 400 })

    // 1. Obtener mensajes WA con dirección y timestamps (últimos 90 días)
    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data: messages } = await supabase
      .from("whatsapp_messages")
      .select("id, prospect_id, direction, created_at")
      .eq("organization_id", orgId)
      .gte("created_at", since)
      .order("created_at")

    // 2. Obtener follow-ups con sus resultados
    const { data: followUps } = await supabase
      .from("follow_ups")
      .select("id, prospect_id, status, sent_at, prospect_responded, created_at")
      .gte("created_at", since)

    // 3. Obtener prospectos para data de industria
    const { data: prospects } = await supabase
      .from("prospects")
      .select("id, company, headline, location")

    const msgs = messages || []
    const fups = followUps || []
    const prspcts = prospects || []

    // ── Análisis 1: Heatmap de respuestas por día/hora ──
    // Agrupar mensajes outbound e inbound por prospect
    const outboundByProspect = new Map<string, { ts: Date }[]>()
    const inboundByProspect = new Map<string, { ts: Date }[]>()

    for (const m of msgs) {
      const ts = new Date(m.created_at)
      const pid = m.prospect_id
      if (m.direction === "outbound") {
        if (!outboundByProspect.has(pid)) outboundByProspect.set(pid, [])
        outboundByProspect.get(pid)!.push({ ts })
      } else {
        if (!inboundByProspect.has(pid)) inboundByProspect.set(pid, [])
        inboundByProspect.get(pid)!.push({ ts })
      }
    }

    // Para cada outbound, buscar si hubo inbound dentro de 48hs
    // Registrar: hora del outbound → respondió o no
    type SendResult = { day: number; hour: number; responded: boolean; responseMinutes?: number }
    const sendResults: SendResult[] = []

    for (const [pid, outMsgs] of outboundByProspect) {
      const inMsgs = inboundByProspect.get(pid) || []
      for (const out of outMsgs) {
        const nextIn = inMsgs.find(i => i.ts > out.ts && i.ts.getTime() - out.ts.getTime() < 48 * 60 * 60 * 1000)
        sendResults.push({
          day: out.ts.getDay(),
          hour: out.ts.getHours(),
          responded: !!nextIn,
          responseMinutes: nextIn ? Math.round((nextIn.ts.getTime() - out.ts.getTime()) / 60000) : undefined,
        })
      }
    }

    // También usar follow-ups con sent_at
    for (const f of fups) {
      if (!f.sent_at) continue
      const ts = new Date(f.sent_at)
      sendResults.push({
        day: ts.getDay(),
        hour: ts.getHours(),
        responded: f.prospect_responded || f.status === "respondido",
      })
    }

    // ── Calcular heatmap global (7 días × 13 horas de laburo) ──
    const heatmap: GlobalHeatmap = []
    for (let d = 0; d < 7; d++) {
      for (let h = 8; h <= 20; h++) {
        const matching = sendResults.filter(r => r.day === d && r.hour === h)
        const total = matching.length
        const responded = matching.filter(r => r.responded).length
        heatmap.push({
          day: d,
          hour: h,
          value: total >= 2 ? Math.round((responded / total) * 100) : 0,
        })
      }
    }

    // ── Top 5 slots con mejor tasa de respuesta (mín 3 envíos) ──
    const slotStats: TimingSlot[] = []
    for (let d = 0; d < 7; d++) {
      for (let h = 8; h <= 20; h++) {
        const matching = sendResults.filter(r => r.day === d && r.hour === h)
        if (matching.length >= 2) {
          const responded = matching.filter(r => r.responded).length
          slotStats.push({
            day: d,
            dayLabel: DIAS[d],
            hour: h,
            hourLabel: HORAS_LABEL[h] || `${h}:00`,
            responseRate: Math.round((responded / matching.length) * 100),
            count: matching.length,
          })
        }
      }
    }
    const bestSlots = slotStats.sort((a, b) => b.responseRate - a.responseRate).slice(0, 5)

    // ── Análisis 2: Patrones por industria/empresa ──
    const prospectMap = new Map(prspcts.map(p => [p.id, p]))
    const industryResults = new Map<string, SendResult[]>()

    for (const r of sendResults) {
      // Buscar el prospect de este send result
      for (const [pid, outMsgs] of outboundByProspect) {
        const p = prospectMap.get(pid)
        if (!p) continue
        const industry = extractIndustry(p.company, p.headline)
        if (!industry) continue
        if (!industryResults.has(industry)) industryResults.set(industry, [])
        industryResults.get(industry)!.push(r)
        break
      }
    }

    // Para follow-ups, mapear prospect_id → industry
    for (const f of fups) {
      if (!f.sent_at || !f.prospect_id) continue
      const p = prospectMap.get(f.prospect_id)
      if (!p) continue
      const industry = extractIndustry(p.company, p.headline)
      if (!industry) continue
      const ts = new Date(f.sent_at)
      if (!industryResults.has(industry)) industryResults.set(industry, [])
      industryResults.get(industry)!.push({
        day: ts.getDay(),
        hour: ts.getHours(),
        responded: f.prospect_responded || f.status === "respondido",
      })
    }

    const industryPatterns: IndustryPattern[] = []
    for (const [industry, results] of industryResults) {
      if (results.length < 3) continue

      const responded = results.filter(r => r.responded)
      const responseMinutes = sendResults
        .filter(r => r.responded && r.responseMinutes)
        .map(r => r.responseMinutes!)
      const avgResponseMinutes = responseMinutes.length > 0
        ? Math.round(responseMinutes.reduce((a, b) => a + b, 0) / responseMinutes.length)
        : 0

      // Best slots for this industry
      const indSlots: TimingSlot[] = []
      for (let d = 0; d < 7; d++) {
        for (let h = 8; h <= 20; h++) {
          const matching = results.filter(r => r.day === d && r.hour === h)
          if (matching.length >= 1) {
            const resp = matching.filter(r => r.responded).length
            indSlots.push({
              day: d, dayLabel: DIAS[d], hour: h, hourLabel: HORAS_LABEL[h] || `${h}:00`,
              responseRate: Math.round((resp / matching.length) * 100),
              count: matching.length,
            })
          }
        }
      }

      industryPatterns.push({
        industry,
        bestSlots: indSlots.sort((a, b) => b.responseRate - a.responseRate).slice(0, 3),
        avgResponseMinutes,
        sampleSize: results.length,
      })
    }

    // Ordenar por tamaño de muestra
    industryPatterns.sort((a, b) => b.sampleSize - a.sampleSize)

    // ── Análisis 3: Velocidad de respuesta promedio global ──
    const allResponseMinutes = sendResults
      .filter(r => r.responded && r.responseMinutes)
      .map(r => r.responseMinutes!)
    const avgGlobalResponseMin = allResponseMinutes.length > 0
      ? Math.round(allResponseMinutes.reduce((a, b) => a + b, 0) / allResponseMinutes.length)
      : 0

    // ── Análisis 4: Mejor día y peor día ──
    const dayStats = DIAS.map((label, i) => {
      const dayResults = sendResults.filter(r => r.day === i)
      const total = dayResults.length
      const responded = dayResults.filter(r => r.responded).length
      return { day: i, label, total, responded, rate: total >= 2 ? Math.round((responded / total) * 100) : 0 }
    }).filter(d => d.total >= 2)

    const bestDay = dayStats.length > 0 ? dayStats.reduce((a, b) => a.rate > b.rate ? a : b) : null
    const worstDay = dayStats.length > 0 ? dayStats.reduce((a, b) => a.rate < b.rate ? a : b) : null

    // ── Análisis 5: Recomendaciones para prospectos activos ──
    const url = new URL(req.url)
    const prospectId = url.searchParams.get("prospect_id")
    let prospectRecommendation = null

    if (prospectId) {
      const p = prospectMap.get(prospectId)
      if (p) {
        const industry = extractIndustry(p.company, p.headline)
        const indPattern = industry ? industryPatterns.find(ip => ip.industry === industry) : null
        const slots = indPattern?.bestSlots || bestSlots

        prospectRecommendation = {
          prospectName: p.company || "este prospecto",
          industry: industry || "General",
          recommendedSlots: slots.slice(0, 3),
          reasoning: indPattern
            ? `Prospectos de "${industry}" responden mejor ${slots[0]?.dayLabel || ""} a las ${slots[0]?.hourLabel || ""} (${slots[0]?.responseRate || 0}% tasa)`
            : bestSlots.length > 0
              ? `Mejor horario general: ${bestSlots[0].dayLabel} ${bestSlots[0].hourLabel} (${bestSlots[0].responseRate}% tasa)`
              : "Sin datos suficientes todavía. Seguí mandando mensajes para mejorar las predicciones.",
        }
      }
    }

    return NextResponse.json({
      heatmap,
      bestSlots,
      industryPatterns: industryPatterns.slice(0, 6),
      avgResponseMinutes: avgGlobalResponseMin,
      bestDay,
      worstDay,
      totalDataPoints: sendResults.length,
      daysAnalyzed: 90,
      prospectRecommendation,
    })
  } catch (e) {
    console.error("[Timing API]", e)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// Helper: extraer industria de nombre de empresa + headline
function extractIndustry(company?: string, headline?: string): string | null {
  const text = `${company || ""} ${headline || ""}`.toLowerCase()
  const patterns: [string, RegExp][] = [
    ["Tecnología", /tech|software|saas|app|digital|startup|dev|programm|código|data|ai|inteligencia/],
    ["Marketing", /market|agencia|publicidad|ads|social media|contenido|branding|seo|comunic/],
    ["Finanzas", /financ|banco|inversión|contab|trading|fintech|crypto|cripto|capital/],
    ["Salud", /salud|médic|doctor|clínic|hospital|farma|odonto|psicol|nutric|biotech/],
    ["Educación", /educ|coach|capacit|formación|curso|academia|univer|escuela|mentor|teach/],
    ["Inmobiliaria", /inmobil|real estate|propied|bienes raíces|construcción|arquit/],
    ["Legal", /abogad|legal|derecho|jurídic|notari|estudio jurídic/],
    ["Retail", /retail|tienda|ecommerce|comercio|venta.al.por/],
    ["Gastronomía", /gastro|restaurant|comida|cocina|bar|café|catering/],
    ["Consultoría", /consult|asesor|estrateg/],
  ]
  for (const [industry, regex] of patterns) {
    if (regex.test(text)) return industry
  }
  return null
}
