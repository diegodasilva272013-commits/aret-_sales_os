import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// ─── Pre-built workflow definitions ────────────────────────────────
export type WorkflowDef = {
  key: string
  name: string
  description: string
  icon: string
  category: "engagement" | "qualification" | "hygiene" | "notification"
  categoryLabel: string
  defaultEnabled: boolean
  configFields: ConfigField[]
  defaultConfig: Record<string, unknown>
  actionLabel: string
  riskLevel: "safe" | "moderate" | "sends_message"
}

type ConfigField = {
  key: string
  label: string
  type: "number" | "boolean" | "select"
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  unit?: string
}

export const WORKFLOW_DEFS: WorkflowDef[] = [
  // ── ENGAGEMENT ──
  {
    key: "auto_followup",
    name: "Auto Follow-Up",
    description: "Si un prospecto activo no responde en X días, le envía el siguiente mensaje de la secuencia por WhatsApp automáticamente.",
    icon: "🔄",
    category: "engagement",
    categoryLabel: "Engagement",
    defaultEnabled: false,
    riskLevel: "sends_message",
    actionLabel: "Envía mensaje WhatsApp",
    defaultConfig: { days_threshold: 3, max_followup: 5, only_with_number: true },
    configFields: [
      { key: "days_threshold", label: "Días sin respuesta", type: "number", min: 1, max: 14, unit: "días" },
      { key: "max_followup", label: "Máximo follow-up", type: "number", min: 1, max: 6 },
      { key: "only_with_number", label: "Solo con número WhatsApp", type: "boolean" },
    ],
  },
  {
    key: "auto_welcome",
    name: "Mensaje de Bienvenida",
    description: "Cuando se crea un prospecto nuevo con número de WhatsApp, le envía el mensaje inicial automáticamente.",
    icon: "👋",
    category: "engagement",
    categoryLabel: "Engagement",
    defaultEnabled: false,
    riskLevel: "sends_message",
    actionLabel: "Envía primer mensaje",
    defaultConfig: { delay_minutes: 5, source_filter: "all" },
    configFields: [
      { key: "delay_minutes", label: "Esperar antes de enviar", type: "number", min: 0, max: 60, unit: "min" },
      { key: "source_filter", label: "Solo para fuente", type: "select", options: [
        { value: "all", label: "Todas" },
        { value: "instagram", label: "Instagram" },
        { value: "linkedin", label: "LinkedIn" },
      ]},
    ],
  },
  {
    key: "breakup_message",
    name: "Mensaje de Despedida",
    description: "Después de agotar los follow-ups sin respuesta, envía el mensaje de breakup final.",
    icon: "💔",
    category: "engagement",
    categoryLabel: "Engagement",
    defaultEnabled: false,
    riskLevel: "sends_message",
    actionLabel: "Envía breakup + pausa",
    defaultConfig: { days_after_last: 7 },
    configFields: [
      { key: "days_after_last", label: "Días después del último intento", type: "number", min: 3, max: 30, unit: "días" },
    ],
  },
  // ── QUALIFICATION ──
  {
    key: "hot_lead_schedule",
    name: "Lead Caliente → Agendar",
    description: "Si el AI score de un prospecto supera el umbral, lo mueve a 'Llamada Agendada' automáticamente.",
    icon: "🔥",
    category: "qualification",
    categoryLabel: "Calificación",
    defaultEnabled: true,
    riskLevel: "safe",
    actionLabel: "Cambia estado a Llamada Agendada",
    defaultConfig: { score_threshold: 80 },
    configFields: [
      { key: "score_threshold", label: "Score mínimo", type: "number", min: 50, max: 100, unit: "pts" },
    ],
  },
  {
    key: "inbound_activate",
    name: "Respuesta → Activar",
    description: "Cuando un prospecto te responde por WhatsApp y está en 'nuevo', lo pasa a 'activo' automáticamente.",
    icon: "💬",
    category: "qualification",
    categoryLabel: "Calificación",
    defaultEnabled: true,
    riskLevel: "safe",
    actionLabel: "Cambia estado a Activo",
    defaultConfig: { hours_lookback: 24 },
    configFields: [
      { key: "hours_lookback", label: "Revisar mensajes de las últimas", type: "number", min: 1, max: 72, unit: "horas" },
    ],
  },
  {
    key: "auto_analyze",
    name: "Auto-Analizar Nuevos",
    description: "Los prospectos nuevos sin análisis se analizan automáticamente (usa créditos de análisis).",
    icon: "🧠",
    category: "qualification",
    categoryLabel: "Calificación",
    defaultEnabled: false,
    riskLevel: "moderate",
    actionLabel: "Ejecuta análisis AI",
    defaultConfig: { source_filter: "all", max_per_run: 5 },
    configFields: [
      { key: "source_filter", label: "Solo para fuente", type: "select", options: [
        { value: "all", label: "Todas" },
        { value: "instagram", label: "Instagram" },
        { value: "linkedin", label: "LinkedIn" },
      ]},
      { key: "max_per_run", label: "Máximo por ejecución", type: "number", min: 1, max: 20 },
    ],
  },
  // ── HYGIENE ──
  {
    key: "stale_pause",
    name: "Prospecto Frío → Pausar",
    description: "Si un prospecto activo no tiene contacto en X días, lo pausa automáticamente para limpiar el pipeline.",
    icon: "❄️",
    category: "hygiene",
    categoryLabel: "Limpieza",
    defaultEnabled: true,
    riskLevel: "safe",
    actionLabel: "Cambia estado a Pausado",
    defaultConfig: { days_threshold: 15 },
    configFields: [
      { key: "days_threshold", label: "Días sin contacto", type: "number", min: 7, max: 60, unit: "días" },
    ],
  },
  {
    key: "dead_lead_close",
    name: "Lead Muerto → Cerrar",
    description: "Si un prospecto está pausado más de X días sin ninguna actividad, lo cierra como perdido.",
    icon: "💀",
    category: "hygiene",
    categoryLabel: "Limpieza",
    defaultEnabled: false,
    riskLevel: "safe",
    actionLabel: "Cierra como perdido",
    defaultConfig: { days_paused: 30 },
    configFields: [
      { key: "days_paused", label: "Días en pausa", type: "number", min: 14, max: 90, unit: "días" },
    ],
  },
  // ── NOTIFICATIONS ──
  {
    key: "notify_hot_call",
    name: "Llamada Caliente → Notificar",
    description: "Si el análisis de una llamada detecta 'Muy Interesado', envía una notificación por email al owner.",
    icon: "🔔",
    category: "notification",
    categoryLabel: "Notificaciones",
    defaultEnabled: false,
    riskLevel: "moderate",
    actionLabel: "Envía email al owner",
    defaultConfig: { min_score: 8 },
    configFields: [
      { key: "min_score", label: "Score mínimo de llamada", type: "number", min: 5, max: 10 },
    ],
  },
  {
    key: "daily_digest",
    name: "Resumen Diario",
    description: "Envía un resumen diario por email con los prospectos que necesitan atención, resultados del día anterior y próximas acciones.",
    icon: "📧",
    category: "notification",
    categoryLabel: "Notificaciones",
    defaultEnabled: false,
    riskLevel: "moderate",
    actionLabel: "Envía email resumen",
    defaultConfig: { send_hour: 9 },
    configFields: [
      { key: "send_hour", label: "Hora de envío", type: "number", min: 7, max: 21, unit: "hs" },
    ],
  },
]

// ─── GET: List all workflow rules with their state ───
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, is_owner")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return NextResponse.json({ error: "No org" }, { status: 400 })

  // Get saved rules from DB
  const { data: savedRules } = await supabase
    .from("workflow_rules")
    .select("*")
    .eq("organization_id", profile.organization_id)

  // Get recent logs count per rule
  const oneWeekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: recentLogs } = await supabase
    .from("workflow_logs")
    .select("rule_key")
    .eq("organization_id", profile.organization_id)
    .gte("created_at", oneWeekAgo)

  const logCounts: Record<string, number> = {}
  for (const log of recentLogs || []) {
    logCounts[log.rule_key] = (logCounts[log.rule_key] || 0) + 1
  }

  const savedMap = new Map(
    (savedRules || []).map(r => [r.rule_key, r])
  )

  // Merge definitions with saved state
  const workflows = WORKFLOW_DEFS.map(def => {
    const saved = savedMap.get(def.key)
    return {
      ...def,
      enabled: saved ? saved.enabled : def.defaultEnabled,
      config: saved ? { ...def.defaultConfig, ...saved.config } : def.defaultConfig,
      lastRunAt: saved?.last_run_at || null,
      totalExecutions: saved?.total_executions || 0,
      weeklyExecutions: logCounts[def.key] || 0,
    }
  })

  return NextResponse.json({ workflows, isOwner: profile.is_owner })
}

// ─── PATCH: Toggle or update a workflow rule ───
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, is_owner")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id || !profile.is_owner) {
    return NextResponse.json({ error: "Solo owners pueden configurar workflows" }, { status: 403 })
  }

  const { ruleKey, enabled, config } = await req.json()
  if (!ruleKey) return NextResponse.json({ error: "Missing ruleKey" }, { status: 400 })

  // Validate rule exists
  const def = WORKFLOW_DEFS.find(d => d.key === ruleKey)
  if (!def) return NextResponse.json({ error: "Unknown rule" }, { status: 400 })

  // Upsert
  const { error } = await supabase
    .from("workflow_rules")
    .upsert({
      organization_id: profile.organization_id,
      rule_key: ruleKey,
      enabled: enabled ?? def.defaultEnabled,
      config: config ?? def.defaultConfig,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id,rule_key" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
