// Parses AI lead score data embedded in prospect notes by arete-web agent
// Format: [Score: 93/100 — muy caliente]
//         Urgencia: 25 | Presupuesto: 19 | Fit: 19 | Engagement: 25
//         Motivo: ...

export type AIScoreData = {
  score: number
  maxScore: number
  label: string // "muy caliente", "caliente", etc.
  urgencia: number
  presupuesto: number
  fit: number
  engagement: number
  motivo: string
}

export function parseAIScore(notes: string | null | undefined): AIScoreData | null {
  if (!notes) return null

  // Match [Score: 93/100 — muy caliente]
  const scoreMatch = notes.match(/\[Score:\s*(\d+)\/(\d+)\s*[—–-]\s*([^\]]+)\]/)
  if (!scoreMatch) return null

  const score = parseInt(scoreMatch[1], 10)
  const maxScore = parseInt(scoreMatch[2], 10)
  const label = scoreMatch[3].trim()

  // Match Urgencia: 25 | Presupuesto: 19 | Fit: 19 | Engagement: 25
  const urgMatch = notes.match(/Urgencia:\s*(\d+)/)
  const presMatch = notes.match(/Presupuesto:\s*(\d+)/)
  const fitMatch = notes.match(/Fit:\s*(\d+)/)
  const engMatch = notes.match(/Engagement:\s*(\d+)/)

  // Match Motivo: ...
  const motivoMatch = notes.match(/Motivo:\s*(.+?)(?:\n|$)/)

  return {
    score,
    maxScore,
    label,
    urgencia: urgMatch ? parseInt(urgMatch[1], 10) : 0,
    presupuesto: presMatch ? parseInt(presMatch[1], 10) : 0,
    fit: fitMatch ? parseInt(fitMatch[1], 10) : 0,
    engagement: engMatch ? parseInt(engMatch[1], 10) : 0,
    motivo: motivoMatch ? motivoMatch[1].trim() : "",
  }
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "#ef4444" // rojo — muy caliente
  if (score >= 60) return "#f59e0b" // naranja — caliente
  if (score >= 40) return "#3b82f6" // azul — tibio
  return "#6b7280" // gris — frío
}

export function getScoreBg(score: number): string {
  if (score >= 80) return "rgba(239,68,68,0.15)"
  if (score >= 60) return "rgba(245,158,11,0.15)"
  if (score >= 40) return "rgba(59,130,246,0.15)"
  return "rgba(107,114,128,0.15)"
}

export function getScoreEmoji(score: number): string {
  if (score >= 80) return "🔥"
  if (score >= 60) return "🟠"
  if (score >= 40) return "🔵"
  return "❄️"
}

// ─── Dynamic Score Calculation ─────────────────────────────
export type DynamicScoreEvent = {
  type: "wa_inbound" | "wa_outbound" | "call_completed" | "call_missed" | "follow_up_sent" | "status_change" | "decay"
  delta: number
  label: string
  date?: string
}

export type DynamicScoreData = {
  baseScore: number
  dynamicScore: number
  delta: number
  events: DynamicScoreEvent[]
  trend: "up" | "down" | "stable"
}

export function getDynamicLabel(score: number): string {
  if (score >= 80) return "muy caliente"
  if (score >= 60) return "caliente"
  if (score >= 40) return "tibio"
  if (score >= 20) return "frío"
  return "congelado"
}
