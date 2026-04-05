import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { WORKFLOW_DEFS } from "../route"
import { parseAIScore } from "@/lib/parseAIScore"

type LogEntry = { rule_key: string; prospect_id?: string; prospect_name?: string; action: string; detail: string; success: boolean }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseInstance = any

// ─── WhatsApp send helper ──────────────────────────────────
async function sendWhatsApp(toNumber: string, message: string, prospectId: string, orgId: string, supabase: SupabaseInstance) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !token) return false

  const clean = toNumber.replace(/[^0-9]/g, "")
  if (!clean) return false

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", to: clean, type: "text", text: { body: message } }),
    })
    const data = await res.json()
    if (!data.messages?.[0]?.id) return false

    await supabase.from("whatsapp_messages").insert({
      prospect_id: prospectId,
      organization_id: orgId,
      whatsapp_message_id: data.messages[0].id,
      direction: "outbound",
      from_number: phoneNumberId,
      to_number: `+${clean}`,
      content: message,
      status: "sent",
    })
    return true
  } catch {
    return false
  }
}

// ─── Rule executors ────────────────────────────────────────

async function runAutoFollowup(supabase: SupabaseInstance, orgId: string, config: Record<string, unknown>, logs: LogEntry[]) {
  const daysThreshold = (config.days_threshold as number) || 3
  const maxFollowup = (config.max_followup as number) || 5
  const threshold = new Date(Date.now() - daysThreshold * 86400000).toISOString()

  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, full_name, whatsapp_number, follow_up_count, phase")
    .eq("organization_id", orgId)
    .eq("status", "activo")
    .lt("last_contact_at", threshold)
    .lt("follow_up_count", maxFollowup)
    .not("whatsapp_number", "is", null)
    .limit(20)

  for (const p of prospects || []) {
    if (!p.whatsapp_number) continue
    const { data: msg } = await supabase
      .from("generated_messages")
      .select("content")
      .eq("prospect_id", p.id)
      .eq("follow_up_number", p.follow_up_count)
      .eq("message_type", "sin_respuesta")
      .single()

    if (!msg?.content) {
      logs.push({ rule_key: "auto_followup", prospect_id: p.id, prospect_name: p.full_name, action: "skip", detail: `Sin mensaje para step ${p.follow_up_count}`, success: false })
      continue
    }

    const sent = await sendWhatsApp(p.whatsapp_number, msg.content, p.id, orgId, supabase)
    if (sent) {
      await supabase.from("prospects").update({
        follow_up_count: p.follow_up_count + 1,
        last_contact_at: new Date().toISOString(),
      }).eq("id", p.id)

      await supabase.from("follow_ups").insert({
        prospect_id: p.id,
        follow_up_number: p.follow_up_count,
        phase: p.phase || "contacto",
        status: "enviado",
        sent_at: new Date().toISOString(),
      })
    }
    logs.push({ rule_key: "auto_followup", prospect_id: p.id, prospect_name: p.full_name, action: "send_followup", detail: `Follow-up #${p.follow_up_count} ${sent ? "enviado" : "falló"}`, success: sent })
  }
}

async function runAutoWelcome(supabase: SupabaseInstance, orgId: string, config: Record<string, unknown>, logs: LogEntry[]) {
  const delayMinutes = (config.delay_minutes as number) || 5
  const sourceFilter = (config.source_filter as string) || "all"
  const cutoff = new Date(Date.now() - delayMinutes * 60000).toISOString()

  let query = supabase
    .from("prospects")
    .select("id, full_name, whatsapp_number, source_type, follow_up_count")
    .eq("organization_id", orgId)
    .eq("status", "nuevo")
    .eq("follow_up_count", 0)
    .not("whatsapp_number", "is", null)
    .lt("created_at", cutoff)
    .limit(10)

  if (sourceFilter !== "all") query = query.eq("source_type", sourceFilter)
  const { data: prospects } = await query

  for (const p of prospects || []) {
    if (!p.whatsapp_number) continue

    // Check if already sent welcome (has follow_up for step 0)
    const { data: existing } = await supabase
      .from("follow_ups")
      .select("id")
      .eq("prospect_id", p.id)
      .eq("follow_up_number", 0)
      .limit(1)

    if (existing && existing.length > 0) continue

    const { data: msg } = await supabase
      .from("generated_messages")
      .select("content")
      .eq("prospect_id", p.id)
      .eq("follow_up_number", 0)
      .eq("message_type", "inicial")
      .single()

    if (!msg?.content) continue

    const sent = await sendWhatsApp(p.whatsapp_number, msg.content, p.id, orgId, supabase)
    if (sent) {
      await supabase.from("prospects").update({
        follow_up_count: 1,
        status: "activo",
        last_contact_at: new Date().toISOString(),
      }).eq("id", p.id)

      await supabase.from("follow_ups").insert({
        prospect_id: p.id,
        follow_up_number: 0,
        phase: "contacto",
        status: "enviado",
        sent_at: new Date().toISOString(),
      })
    }
    logs.push({ rule_key: "auto_welcome", prospect_id: p.id, prospect_name: p.full_name, action: "send_welcome", detail: sent ? "Mensaje inicial enviado" : "Falló el envío", success: sent })
  }
}

async function runBreakupMessage(supabase: SupabaseInstance, orgId: string, config: Record<string, unknown>, logs: LogEntry[]) {
  const daysAfterLast = (config.days_after_last as number) || 7
  const threshold = new Date(Date.now() - daysAfterLast * 86400000).toISOString()

  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, full_name, whatsapp_number, follow_up_count")
    .eq("organization_id", orgId)
    .eq("status", "activo")
    .gte("follow_up_count", 5)
    .lt("last_contact_at", threshold)
    .not("whatsapp_number", "is", null)
    .limit(10)

  for (const p of prospects || []) {
    if (!p.whatsapp_number) continue

    const { data: msg } = await supabase
      .from("generated_messages")
      .select("content")
      .eq("prospect_id", p.id)
      .eq("follow_up_number", 5)
      .eq("message_type", "sin_respuesta")
      .single()

    if (!msg?.content) continue

    const sent = await sendWhatsApp(p.whatsapp_number, msg.content, p.id, orgId, supabase)
    if (sent) {
      await supabase.from("prospects").update({
        status: "pausado",
        last_contact_at: new Date().toISOString(),
      }).eq("id", p.id)
    }
    logs.push({ rule_key: "breakup_message", prospect_id: p.id, prospect_name: p.full_name, action: "send_breakup", detail: sent ? "Breakup enviado, prospecto pausado" : "Falló el envío", success: sent })
  }
}

async function runHotLeadSchedule(supabase: SupabaseInstance, orgId: string, config: Record<string, unknown>, logs: LogEntry[]) {
  const scoreThreshold = (config.score_threshold as number) || 80

  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, full_name, notes, status")
    .eq("organization_id", orgId)
    .in("status", ["nuevo", "activo"])
    .limit(50)

  for (const p of prospects || []) {
    const ai = parseAIScore(p.notes)
    if (!ai || ai.score < scoreThreshold) continue

    await supabase.from("prospects").update({ status: "llamada_agendada" }).eq("id", p.id)
    logs.push({ rule_key: "hot_lead_schedule", prospect_id: p.id, prospect_name: p.full_name, action: "schedule_call", detail: `AI Score ${ai.score}/100 (${ai.label}) → Llamada Agendada`, success: true })
  }
}

async function runInboundActivate(supabase: SupabaseInstance, orgId: string, config: Record<string, unknown>, logs: LogEntry[]) {
  const hoursLookback = (config.hours_lookback as number) || 24
  const cutoff = new Date(Date.now() - hoursLookback * 3600000).toISOString()

  const { data: inbound } = await supabase
    .from("whatsapp_messages")
    .select("prospect_id")
    .eq("organization_id", orgId)
    .eq("direction", "inbound")
    .gte("created_at", cutoff)
    .not("prospect_id", "is", null)

  const prospectIds = [...new Set((inbound || []).map((m: { prospect_id: string | null }) => m.prospect_id).filter(Boolean))]
  if (!prospectIds.length) return

  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, full_name, status")
    .eq("organization_id", orgId)
    .eq("status", "nuevo")
    .in("id", prospectIds)

  for (const p of prospects || []) {
    await supabase.from("prospects").update({ status: "activo" }).eq("id", p.id)
    logs.push({ rule_key: "inbound_activate", prospect_id: p.id, prospect_name: p.full_name, action: "activate", detail: "Respondió por WhatsApp → Activo", success: true })
  }
}

async function runAutoAnalyze(supabase: SupabaseInstance, orgId: string, config: Record<string, unknown>, logs: LogEntry[]) {
  const maxPerRun = (config.max_per_run as number) || 5

  // Find prospects without analysis
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, full_name, instagram_url, linkedin_url")
    .eq("organization_id", orgId)
    .eq("status", "nuevo")
    .limit(maxPerRun)

  const idsToAnalyze: typeof prospects = []
  for (const p of prospects || []) {
    const { data: analysis } = await supabase
      .from("prospect_analyses")
      .select("id")
      .eq("prospect_id", p.id)
      .limit(1)
    if (!analysis || analysis.length === 0) idsToAnalyze.push(p)
  }

  // Just log — actual analysis requires the full pipeline which is expensive
  for (const p of idsToAnalyze || []) {
    logs.push({ rule_key: "auto_analyze", prospect_id: p.id, prospect_name: p.full_name, action: "flag_analyze", detail: "Marcado para análisis (requiere ejecución manual)", success: true })
  }
}

async function runStalePause(supabase: SupabaseInstance, orgId: string, config: Record<string, unknown>, logs: LogEntry[]) {
  const daysThreshold = (config.days_threshold as number) || 15
  const threshold = new Date(Date.now() - daysThreshold * 86400000).toISOString()

  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, full_name")
    .eq("organization_id", orgId)
    .eq("status", "activo")
    .lt("last_contact_at", threshold)
    .limit(50)

  for (const p of prospects || []) {
    await supabase.from("prospects").update({ status: "pausado" }).eq("id", p.id)
    logs.push({ rule_key: "stale_pause", prospect_id: p.id, prospect_name: p.full_name, action: "pause", detail: `+${daysThreshold}d sin contacto → Pausado`, success: true })
  }
}

async function runDeadLeadClose(supabase: SupabaseInstance, orgId: string, config: Record<string, unknown>, logs: LogEntry[]) {
  const daysPaused = (config.days_paused as number) || 30
  const threshold = new Date(Date.now() - daysPaused * 86400000).toISOString()

  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, full_name")
    .eq("organization_id", orgId)
    .eq("status", "pausado")
    .lt("last_contact_at", threshold)
    .limit(50)

  for (const p of prospects || []) {
    await supabase.from("prospects").update({ status: "cerrado_perdido" }).eq("id", p.id)
    logs.push({ rule_key: "dead_lead_close", prospect_id: p.id, prospect_name: p.full_name, action: "close", detail: `+${daysPaused}d pausado → Cerrado perdido`, success: true })
  }
}

async function runNotifyHotCall(supabase: SupabaseInstance, orgId: string, config: Record<string, unknown>, logs: LogEntry[]) {
  const minScore = (config.min_score as number) || 8
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString()

  const { data: analyses } = await supabase
    .from("call_analyses")
    .select("id, prospect_id, score, tone, summary")
    .eq("organization_id", orgId)
    .gte("score", minScore)
    .gte("created_at", oneDayAgo)
    .limit(10)

  // Deduplicate with recent logs
  const { data: recentLogs } = await supabase
    .from("workflow_logs")
    .select("detail")
    .eq("organization_id", orgId)
    .eq("rule_key", "notify_hot_call")
    .gte("created_at", oneDayAgo)

  const alreadyNotified = new Set((recentLogs || []).map((l: { detail: string }) => l.detail))

  for (const a of analyses || []) {
    const key = `call_${a.id}`
    if (alreadyNotified.has(key)) continue

    // TODO: Send email notification when email service is configured
    logs.push({ rule_key: "notify_hot_call", prospect_id: a.prospect_id || undefined, action: "notify", detail: key, success: true })
  }
}

// ─── Executor map ──────────────────────────────────────────
const EXECUTORS: Record<string, (supabase: SupabaseInstance, orgId: string, config: Record<string, unknown>, logs: LogEntry[]) => Promise<void>> = {
  auto_followup: runAutoFollowup,
  auto_welcome: runAutoWelcome,
  breakup_message: runBreakupMessage,
  hot_lead_schedule: runHotLeadSchedule,
  inbound_activate: runInboundActivate,
  auto_analyze: runAutoAnalyze,
  stale_pause: runStalePause,
  dead_lead_close: runDeadLeadClose,
  notify_hot_call: runNotifyHotCall,
}

// ─── POST: Execute all active workflows ────────────────────
export async function POST(req: Request) {
  const supabase = await createClient()

  // Allow cron calls with secret OR authenticated users
  const cronSecret = req.headers.get("x-cron-secret")
  let orgId: string | null = null

  if (cronSecret && cronSecret === process.env.CRON_SECRET) {
    // Cron: run for specified org or all orgs
    const body = await req.json().catch(() => ({}))
    orgId = body.organization_id || null
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 })

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, is_owner")
      .eq("id", user.id)
      .single()

    if (!profile?.organization_id || !profile.is_owner) {
      return NextResponse.json({ error: "Solo owners pueden ejecutar workflows" }, { status: 403 })
    }
    orgId = profile.organization_id
  }

  if (!orgId) return NextResponse.json({ error: "No organization" }, { status: 400 })

  // Get enabled rules
  const { data: rules } = await supabase
    .from("workflow_rules")
    .select("rule_key, enabled, config")
    .eq("organization_id", orgId)

  // Build map: rule_key -> { enabled, config }
  const rulesMap = new Map(
    (rules || []).map(r => [r.rule_key, { enabled: r.enabled, config: r.config }])
  )

  // For rules not in DB, use defaults from definitions
  const enabledRules: { key: string; config: Record<string, unknown> }[] = []
  for (const def of WORKFLOW_DEFS) {
    const saved = rulesMap.get(def.key)
    const enabled = saved ? saved.enabled : def.defaultEnabled
    if (!enabled) continue
    if (!EXECUTORS[def.key]) continue

    enabledRules.push({
      key: def.key,
      config: saved ? { ...def.defaultConfig, ...saved.config } : def.defaultConfig as Record<string, unknown>,
    })
  }

  const allLogs: LogEntry[] = []

  for (const rule of enabledRules) {
    try {
      await EXECUTORS[rule.key](supabase, orgId, rule.config, allLogs)
    } catch (err) {
      allLogs.push({ rule_key: rule.key, action: "error", detail: String(err), success: false })
    }
  }

  // Persist logs to DB
  if (allLogs.length > 0) {
    await supabase.from("workflow_logs").insert(
      allLogs.map(l => ({
        organization_id: orgId!,
        rule_key: l.rule_key,
        prospect_id: l.prospect_id || null,
        prospect_name: l.prospect_name || null,
        action: l.action,
        detail: l.detail,
        success: l.success,
      }))
    )
  }

  // Update last_run_at and total_executions for rules that ran
  const ruleKeysRan = [...new Set(allLogs.map(l => l.rule_key))]
  for (const rk of ruleKeysRan) {
    const count = allLogs.filter(l => l.rule_key === rk && l.success).length
    if (count > 0) {
      try {
      await supabase.rpc("increment_workflow_executions", {
        p_org_id: orgId,
        p_rule_key: rk,
        p_count: count,
      })
    } catch {
      // Fallback: just update last_run_at
      await supabase.from("workflow_rules").update({ last_run_at: new Date().toISOString() })
        .eq("organization_id", orgId!)
        .eq("rule_key", rk)
    }
    }
  }

  return NextResponse.json({
    executed: enabledRules.length,
    totalActions: allLogs.length,
    successful: allLogs.filter(l => l.success).length,
    failed: allLogs.filter(l => !l.success).length,
    logs: allLogs,
  })
}
