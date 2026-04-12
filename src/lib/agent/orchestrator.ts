// =====================================================
// Areté Sales OS — Agent Orchestrator v2
// =====================================================
// NEW FLOW: Prospect from YOUR network (connections).
// Pipeline: import → analyze → warm → dm → follow_up → converted
// Runs 5-6 contacts per cron call, ~30/day distributed.
// =====================================================

import { createClient, SupabaseClient } from "@supabase/supabase-js"
import * as linkedin from "./linkedin"
import * as ai from "./ai-content"

// Lazy Supabase client — avoids crash during Vercel build (env vars not available)
let _sb: SupabaseClient | null = null
function getSB(): SupabaseClient {
  if (!_sb) _sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  return _sb
}
const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop: string) {
    const c = getSB()
    const v = (c as any)[prop]
    return typeof v === "function" ? v.bind(c) : v
  },
})

interface AgentConfig {
  organization_id: string
  is_active: boolean
  icp_industries: string[]
  icp_roles: string[]
  icp_company_size: string
  icp_locations: string[]
  icp_keywords: string[]
  daily_connection_limit: number
  daily_comment_limit: number
  daily_like_limit: number
  delay_min_seconds: number
  delay_max_seconds: number
  active_hours_start: number
  active_hours_end: number
  active_days: number[]
  warming_days: number
  commenting_days: number
  nurturing_days: number
}

interface LinkedInAccount {
  id: string
  organization_id: string
  session_cookie: string | null
  status: string
  daily_connections_used: number
  daily_comments_used: number
  account_name: string
}

interface QueueItem {
  id: string
  organization_id: string
  linkedin_account_id: string | null
  linkedin_url: string
  full_name: string | null
  headline: string | null
  company: string | null
  location: string | null
  disc_type: string | null
  pain_points: string[] | null
  sales_angle: string | null
  fit_score: number | null
  status: string
  current_stage_started_at: string | null
  next_action_at: string | null
  profile_data: Record<string, unknown> | null
  messaged_at: string | null
}

// ── Constants ──────────────────────────────────────────
const CRON_DELAY_MIN_MS = 3000   // 3 seconds between API calls
const CRON_DELAY_MAX_MS = 8000   // 8 seconds
const CONTACTS_PER_CYCLE = 5     // Process 5 per cron call → ~30/day with 6 calls
const IMPORT_BATCH = 40          // Import 40 connections per batch
const FOLLOW_UP_DAYS = 2         // Follow up after 2 days of no response

// Service description — used by AI to generate personalized messages
const SERVICE_DESCRIPTION = `Areté es una consultora que ayuda a empresas y líderes a potenciar sus equipos de ventas con entrenamiento, coaching y herramientas de gestión comercial. Trabajamos con directores, gerentes y equipos comerciales para mejorar sus resultados.`

/** Main entry point — called by Vercel Cron or external trigger */
export async function runAgentCycle(options?: { skipTimeCheck?: boolean }): Promise<{ processed: number; errors: number; debug?: string[] }> {
  let processed = 0
  let errors = 0
  const debug: string[] = []

  const { data: configs, error: cfgError } = await supabase
    .from("agent_config")
    .select("*")
    .eq("is_active", true)

  if (cfgError) {
    debug.push(`DB error: ${cfgError.message}`)
    return { processed: 0, errors: 1, debug }
  }
  if (!configs?.length) {
    debug.push("No active configs")
    return { processed: 0, errors: 0, debug }
  }

  debug.push(`Found ${configs.length} active config(s)`)

  for (const config of configs as AgentConfig[]) {
    try {
      const result = await processOrganization(config, debug, options?.skipTimeCheck)
      processed += result.processed
      errors += result.errors
    } catch (e) {
      debug.push(`CRASH org ${config.organization_id}: ${String(e)}`)
      errors++
    }
  }

  return { processed, errors, debug }
}

/** Process one organization: import connections + work the pipeline */
async function processOrganization(config: AgentConfig, debug: string[], skipTimeCheck?: boolean): Promise<{ processed: number; errors: number }> {
  const now = new Date()
  const currentHour = ((now.getUTCHours() - 3) % 24 + 24) % 24
  const currentDay = now.getDay()

  debug.push(`Time: day=${currentDay} hour=${currentHour} (UTC ${now.getUTCHours()})`)

  if (!skipTimeCheck) {
    if (!config.active_days.includes(currentDay)) {
      debug.push(`SKIP: day ${currentDay} not active`)
      return { processed: 0, errors: 0 }
    }
    
    const start = config.active_hours_start
    const end = config.active_hours_end === 0 ? 24 : config.active_hours_end
    if (start !== end && (currentHour < start || currentHour >= end)) {
      debug.push(`SKIP: hour ${currentHour} outside ${start}-${end}`)
      return { processed: 0, errors: 0 }
    }
  } else {
    debug.push("⏭ Time check skipped (manual run)")
  }

  debug.push("Fetching accounts...")

  const { data: accounts, error: accError } = await supabase
    .from("agent_linkedin_accounts")
    .select("*")
    .eq("organization_id", config.organization_id)
    .not("status", "eq", "banned")
    .order("id")

  if (accError || !accounts?.length) {
    debug.push(accError ? `DB error: ${accError.message}` : "No accounts")
    return { processed: 0, errors: accError ? 1 : 0 }
  }

  const validAccounts = (accounts as LinkedInAccount[]).filter(a => a.session_cookie)
  if (!validAccounts.length) {
    debug.push("No accounts with cookies")
    return { processed: 0, errors: 0 }
  }

  // Rotate accounts by day
  const dayOfYear = Math.floor((Date.now() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const account = validAccounts[dayOfYear % validAccounts.length]
  debug.push(`Account: ${account.account_name}`)
  debug.push(`Relay: CF_RELAY_URL=${process.env.CF_RELAY_URL?.trim() ? "SET" : "UNSET"}`)

  const session: linkedin.LinkedInSession = {
    sessionCookie: account.session_cookie!,
    accountId: account.id,
  }

  let processed = 0
  let errors = 0

  // Phase 0: Keep-alive — validates session and refreshes cookie TTL
  const alive = await linkedin.keepAlive(session)
  if (!alive) {
    debug.push("❌ Session invalid — cookie expired. User needs to update li_at.")
    await supabase.from("agent_linkedin_accounts")
      .update({ status: "disconnected" })
      .eq("id", account.id)
    return { processed: 0, errors: 1 }
  }
  debug.push("✅ Session alive")

  // Phase 1: Import connections if queue is low
  try {
    await importConnections(config, account, session, debug)
  } catch (e) {
    const msg = String(e)
    debug.push(`Import error: ${msg}`)
    if (msg.includes("302") || msg.includes("redirect")) {
      debug.push("Cookie dead — stopping")
      return { processed: 0, errors: 1 }
    }
  }

  // Phase 2: Process pipeline (up to CONTACTS_PER_CYCLE items)
  const result = await processQueue(config, account, session, debug)
  processed += result.processed
  errors += result.errors

  return { processed, errors }
}

/** Import connections from LinkedIn network into the queue */
async function importConnections(
  config: AgentConfig,
  account: LinkedInAccount,
  session: linkedin.LinkedInSession,
  debug: string[]
): Promise<void> {
  // Only import if we need more prospects in the pipeline
  const { count } = await supabase
    .from("agent_queue")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", config.organization_id)
    .not("status", "in", '("converted","failed","skipped","paused","responded")')

  const activeCount = count ?? 0
  debug.push(`Queue: ${activeCount} active items`)
  if (activeCount >= 100) {
    debug.push("Queue full, skipping import")
    return
  }

  // Get how many we've already imported total
  const { count: totalImported } = await supabase
    .from("agent_queue")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", config.organization_id)

  const startFrom = totalImported ?? 0
  debug.push(`Importing connections from offset ${startFrom}`)

  const result = await linkedin.getConnections(session, startFrom, IMPORT_BATCH)
  if (!result.success || !result.connections?.length) {
    debug.push(`Connections: ${result.error || "no results"}`)
    return
  }

  debug.push(`Got ${result.connections.length} connections (total: ${result.total || "unknown"})`)

  let added = 0
  for (const conn of result.connections) {
    if (!conn.publicId || !conn.fullName) continue
    const linkedinUrl = `https://www.linkedin.com/in/${conn.publicId}/`

    // Check if already in queue
    const { data: existing } = await supabase
      .from("agent_queue")
      .select("id")
      .eq("organization_id", config.organization_id)
      .eq("linkedin_url", linkedinUrl)
      .limit(1)

    if (existing?.length) continue

    await supabase.from("agent_queue").insert({
      organization_id: config.organization_id,
      linkedin_account_id: account.id,
      linkedin_url: linkedinUrl,
      full_name: conn.fullName,
      headline: conn.headline || "",
      company: conn.company || "",
      status: "imported",
      fit_score: 50,
      started_at: new Date().toISOString(),
      current_stage_started_at: new Date().toISOString(),
    })
    added++
  }

  debug.push(`Imported ${added} new connections`)
  if (added > 0) {
    await supabase.from("agent_logs").insert({
      organization_id: config.organization_id,
      linkedin_account_id: account.id,
      action_type: "connections_imported",
      action_detail: `${added} connections imported (offset ${startFrom})`,
      success: true,
    })
  }
}

/** Process queue items through the pipeline */
async function processQueue(
  config: AgentConfig,
  account: LinkedInAccount,
  session: linkedin.LinkedInSession,
  debug: string[]
): Promise<{ processed: number; errors: number }> {
  let processed = 0
  let errors = 0

  // Get items ready for action, prioritize by stage progression
  const { data: items } = await supabase
    .from("agent_queue")
    .select("*")
    .eq("organization_id", config.organization_id)
    .not("status", "in", '("converted","failed","skipped","paused","responded")')
    .or(`next_action_at.is.null,next_action_at.lte.${new Date().toISOString()}`)
    .order("fit_score", { ascending: false, nullsFirst: false })
    .limit(CONTACTS_PER_CYCLE)

  if (!items?.length) {
    debug.push("No items ready to process")
    return { processed: 0, errors: 0 }
  }

  debug.push(`Processing ${items.length} items`)

  for (const item of items as QueueItem[]) {
    try {
      await linkedin.delay(CRON_DELAY_MIN_MS, CRON_DELAY_MAX_MS)
      const acted = await processItem(config, account, session, item, debug)
      if (acted) processed++
    } catch (e) {
      console.error(`Error processing ${item.id}:`, e)
      await logAction(item, account.id, "error", false, String(e))
      errors++
    }
  }

  return { processed, errors }
}

/**
 * Process a single queue item based on its pipeline stage.
 * 
 * PIPELINE (for network connections):
 * imported → analyzing → warming → ready_to_dm → messaged → follow_up → responded/converted
 */
async function processItem(
  config: AgentConfig,
  account: LinkedInAccount,
  session: linkedin.LinkedInSession,
  item: QueueItem,
  debug: string[]
): Promise<boolean> {
  const daysSinceStage = item.current_stage_started_at
    ? (Date.now() - new Date(item.current_stage_started_at).getTime()) / (1000 * 60 * 60 * 24)
    : 0

  const publicId = extractPublicId(item.linkedin_url)
  if (!publicId) {
    await advanceStatus(item, "skipped", "URL inválida")
    return false
  }

  switch (item.status) {
    // ── STAGE 1: Analyze profile deeply ──
    case "imported": {
      debug.push(`Analyzing: ${item.full_name}`)
      
      // Get full profile with about, experience, skills
      const fullProfile = await linkedin.getFullProfile(session, publicId)
      if (!fullProfile.success || !fullProfile.profile) {
        // If getFullProfile fails, try basic viewProfile
        const basic = await linkedin.viewProfile(session, publicId)
        await logAction(item, account.id, "profile_view", basic.success, basic.error)
        if (!basic.success) return false
        
        // Advance with basic data
        await advanceStatus(item, "analyzing")
        return true
      }

      const profile = fullProfile.profile
      await logAction(item, account.id, "profile_deep_view", true)

      // Get recent posts for context
      const posts = await linkedin.getProfilePosts(session, publicId, 3)
      const recentPosts = posts.posts?.map(p => p.text.slice(0, 200)) || []

      // AI analysis: pain points, sales angle, disc type, fit score
      const analysis = await ai.analyzeProfile({
        fullName: profile.fullName,
        headline: profile.headline,
        about: profile.about,
        experience: profile.experience,
        skills: profile.skills,
        recentPosts,
        serviceDescription: SERVICE_DESCRIPTION,
      })

      // Update queue item with analysis
      await supabase.from("agent_queue").update({
        disc_type: analysis.discType,
        pain_points: analysis.painPoints,
        sales_angle: analysis.salesAngle,
        fit_score: analysis.fitScore,
        profile_data: {
          about: profile.about,
          experience: profile.experience,
          skills: profile.skills,
          toneStyle: analysis.toneStyle,
          recentPosts,
          memberUrn: profile.memberUrn,
        },
        updated_at: new Date().toISOString(),
      }).eq("id", item.id)

      await logAction(item, account.id, "profile_analyzed", true, undefined,
        `Score: ${analysis.fitScore}, DISC: ${analysis.discType}, Angle: ${analysis.salesAngle}`)

      // Skip low-fit prospects
      if (analysis.fitScore < 25) {
        await advanceStatus(item, "skipped", `Low fit: ${analysis.fitScore}`)
        debug.push(`Skipped ${item.full_name}: low fit ${analysis.fitScore}`)
        return true
      }

      // Has posts? → warm them up. No posts? → go straight to DM
      if (recentPosts.length > 0) {
        await advanceStatus(item, "warming")
      } else {
        await advanceStatus(item, "ready_to_dm")
      }
      debug.push(`Analyzed ${item.full_name}: score=${analysis.fitScore} → ${recentPosts.length ? "warming" : "ready_to_dm"}`)
      return true
    }

    // ── Retry analysis for items that partially failed ──
    case "analyzing": {
      await advanceStatus(item, "warming")
      return true
    }

    // ── STAGE 2: Warm up — like/comment their posts ──
    case "warming": {
      // After warming_days, move to DM
      if (daysSinceStage >= config.warming_days) {
        await advanceStatus(item, "ready_to_dm")
        debug.push(`${item.full_name}: warming done → ready_to_dm`)
        return true
      }

      // Try to like a post
      const posts = await linkedin.getProfilePosts(session, publicId, 5)
      if (!posts.success || !posts.posts?.length) {
        // No posts available — skip to DM
        await advanceStatus(item, "ready_to_dm")
        return true
      }

      // Like first post
      const post = posts.posts[0]
      const likeResult = await linkedin.likePost(session, post.urn)
      await logAction(item, account.id, "post_like", likeResult.success, likeResult.error)

      // If we have time and another post, comment on it (only if > 1 day into warming)
      if (daysSinceStage >= 1 && posts.posts.length > 1 && likeResult.success) {
        await linkedin.delay(CRON_DELAY_MIN_MS, CRON_DELAY_MAX_MS)
        const commentPost = posts.posts[1]
        const comment = await ai.generateComment({
          postContent: commentPost.text,
          prospectName: item.full_name || "",
          prospectHeadline: item.headline || "",
        })
        const commentResult = await linkedin.commentOnPost(session, commentPost.urn, comment)
        await logAction(item, account.id, "post_comment", commentResult.success, commentResult.error, comment)
      }

      await setNextAction(item, 12) // Check again in ~12 hours
      debug.push(`Warmed ${item.full_name}: liked${daysSinceStage >= 1 ? " + commented" : ""}`)
      return true
    }

    // ── STAGE 3: Send personalized DM ──
    case "ready_to_dm": {
      const profileData = (item.profile_data || {}) as Record<string, unknown>
      const toneStyle = (profileData.toneStyle as string) || "informal"
      const recentPosts = (profileData.recentPosts as string[]) || []
      const memberUrn = (profileData.memberUrn as string) || ""

      // Generate hyper-personalized first message
      const message = await ai.generateFirstDM({
        prospectName: item.full_name || "",
        prospectHeadline: item.headline || "",
        prospectCompany: item.company || "",
        about: (profileData.about as string) || "",
        painPoints: item.pain_points || [],
        salesAngle: item.sales_angle || "",
        toneStyle,
        recentPostSnippet: recentPosts[0],
        serviceDescription: SERVICE_DESCRIPTION,
      })

      if (!message) {
        await logAction(item, account.id, "dm_generation_failed", false, "Empty message")
        return false
      }

      // Get member URN for DM (need the real one, not publicId)
      let dmUrn = memberUrn
      if (!dmUrn || !dmUrn.startsWith("urn:li:fsd_profile:")) {
        const profile = await linkedin.viewProfile(session, publicId)
        dmUrn = profile.memberUrn || `urn:li:fsd_profile:${publicId}`
        await linkedin.delay(CRON_DELAY_MIN_MS, CRON_DELAY_MAX_MS)
      }

      const result = await linkedin.sendMessage(session, dmUrn, message)
      await logAction(item, account.id, "direct_message", result.success, result.error, message)

      if (result.success) {
        // Store the message in profile_data for follow-up reference
        await supabase.from("agent_queue").update({
          status: "messaged",
          messaged_at: new Date().toISOString(),
          current_stage_started_at: new Date().toISOString(),
          profile_data: { ...profileData, firstMessage: message },
          updated_at: new Date().toISOString(),
        }).eq("id", item.id)

        debug.push(`DM sent to ${item.full_name}`)
      }
      return result.success
    }

    // ── STAGE 4: Follow up if no response ──
    case "messaged": {
      if (!item.messaged_at) return false

      const daysSinceMessage = (Date.now() - new Date(item.messaged_at).getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceMessage < FOLLOW_UP_DAYS) return false // Not time yet

      const profileData = (item.profile_data || {}) as Record<string, unknown>
      const firstMessage = (profileData.firstMessage as string) || ""
      const toneStyle = (profileData.toneStyle as string) || "informal"

      const followUp = await ai.generateFollowUp({
        prospectName: item.full_name || "",
        prospectHeadline: item.headline || "",
        firstMessage,
        toneStyle,
      })

      let dmUrn = (profileData.memberUrn as string) || ""
      if (!dmUrn || !dmUrn.startsWith("urn:li:fsd_profile:")) {
        const profile = await linkedin.viewProfile(session, publicId)
        dmUrn = profile.memberUrn || `urn:li:fsd_profile:${publicId}`
        await linkedin.delay(CRON_DELAY_MIN_MS, CRON_DELAY_MAX_MS)
      }

      const result = await linkedin.sendMessage(session, dmUrn, followUp)
      await logAction(item, account.id, "follow_up_message", result.success, result.error, followUp)

      if (result.success) {
        await advanceStatus(item, "follow_up")
        // Auto-create CRM prospect after follow-up
        await createCRMProspect(item)
        debug.push(`Follow-up sent to ${item.full_name}`)
      }
      return result.success
    }

    // ── STAGE 5: Already followed up — done ──
    case "follow_up": {
      // Nothing more to do — waiting for manual response tracking
      return false
    }

    // ── LEGACY stages from old flow ──
    case "discovered":
    case "connecting": {
      // Old flow items — migrate them to new pipeline
      const profile = await linkedin.viewProfile(session, publicId)
      if (profile.success) {
        await advanceStatus(item, "imported")
        return true
      }
      return false
    }

    case "connected":
    case "nurturing": {
      // Already connected in old flow — send them to DM stage
      await advanceStatus(item, "ready_to_dm")
      return true
    }

    default:
      return false
  }
}

// ── Helpers ──────────────────────────────────────────

function extractPublicId(linkedinUrl: string): string | null {
  const match = linkedinUrl.match(/linkedin\.com\/in\/([^/?#]+)/)
  return match?.[1] || null
}

async function advanceStatus(item: QueueItem, newStatus: string, skipReason?: string) {
  const updates: Record<string, unknown> = {
    status: newStatus,
    current_stage_started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  if (newStatus === "messaged") updates.messaged_at = new Date().toISOString()
  if (newStatus === "converted") updates.converted_at = new Date().toISOString()
  if (skipReason) updates.skip_reason = skipReason

  await supabase.from("agent_queue").update(updates).eq("id", item.id)

  // Log the stage change
  await supabase.from("agent_logs").insert({
    organization_id: item.organization_id,
    queue_id: item.id,
    linkedin_account_id: item.linkedin_account_id,
    action_type: "stage_changed",
    action_detail: `${item.status} → ${newStatus}`,
    success: true,
  })
}

async function updateNextAction(item: QueueItem, config: AgentConfig) {
  const delayMs = (config.delay_min_seconds + config.delay_max_seconds) / 2 * 1000 * 60
  const nextAction = new Date(Date.now() + Math.max(delayMs, 30 * 60 * 1000))
  await supabase
    .from("agent_queue")
    .update({ next_action_at: nextAction.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", item.id)
}

/** Set next action time in hours from now */
async function setNextAction(item: QueueItem, hours: number) {
  const nextAction = new Date(Date.now() + hours * 60 * 60 * 1000)
  await supabase
    .from("agent_queue")
    .update({ next_action_at: nextAction.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", item.id)
}

async function logAction(
  item: QueueItem,
  accountId: string,
  actionType: string,
  success: boolean,
  errorMessage?: string,
  generatedContent?: string
) {
  await supabase.from("agent_logs").insert({
    organization_id: item.organization_id,
    queue_id: item.id,
    linkedin_account_id: accountId,
    action_type: actionType,
    success,
    error_message: errorMessage,
    generated_content: generatedContent,
  })
}

async function createCRMProspect(item: QueueItem) {
  // Check if already linked
  if (item.linkedin_account_id) {
    const { data: existing } = await supabase
      .from("agent_queue")
      .select("prospect_id")
      .eq("id", item.id)
      .single()
    if (existing?.prospect_id) return
  }

  // Get org owner for assignment
  const { data: owner } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", item.organization_id)
    .eq("is_owner", true)
    .single()

  const { data: prospect } = await supabase.from("prospects").insert({
    organization_id: item.organization_id,
    linkedin_url: item.linkedin_url,
    full_name: item.full_name || "Sin nombre",
    headline: item.headline || "",
    company: item.company || "",
    location: item.location || "",
    status: "nuevo",
    phase: "contacto",
    source_type: "agente_autonomo",
    disc_profile: item.disc_type,
    assigned_to: owner?.id || null,
  }).select("id").single()

  if (prospect) {
    await supabase
      .from("agent_queue")
      .update({ prospect_id: prospect.id })
      .eq("id", item.id)
  }
}
