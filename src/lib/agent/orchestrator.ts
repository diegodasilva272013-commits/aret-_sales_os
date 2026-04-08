// =====================================================
// Areté Sales OS — Agent Orchestrator
// =====================================================
// Runs inside Vercel Cron. Processes all active orgs,
// picks next actions, executes via LinkedIn HTTP API,
// logs results, and advances prospects through the pipeline.
// =====================================================

import { createClient } from "@supabase/supabase-js"
import * as linkedin from "./linkedin"
import * as ai from "./ai-content"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
}

/** Main entry point — called by Vercel Cron every 5 min */
export async function runAgentCycle(): Promise<{ processed: number; errors: number }> {
  let processed = 0
  let errors = 0

  // Get all active agent configs
  const { data: configs } = await supabase
    .from("agent_config")
    .select("*")
    .eq("is_active", true)

  if (!configs?.length) return { processed: 0, errors: 0 }

  for (const config of configs as AgentConfig[]) {
    try {
      const result = await processOrganization(config)
      processed += result.processed
      errors += result.errors
    } catch (e) {
      console.error(`Agent error for org ${config.organization_id}:`, e)
      errors++
    }
  }

  return { processed, errors }
}

/** Process all pending actions for one organization */
async function processOrganization(config: AgentConfig): Promise<{ processed: number; errors: number }> {
  // Check if within active hours
  const now = new Date()
  const currentHour = now.getUTCHours() - 3 // Argentina timezone (UTC-3)
  const currentDay = now.getDay()

  if (!config.active_days.includes(currentDay)) return { processed: 0, errors: 0 }
  if (currentHour < config.active_hours_start || currentHour >= config.active_hours_end) return { processed: 0, errors: 0 }

  // Get active accounts with remaining capacity
  const { data: accounts } = await supabase
    .from("agent_linkedin_accounts")
    .select("*")
    .eq("organization_id", config.organization_id)
    .in("status", ["active", "warming"])

  if (!accounts?.length) return { processed: 0, errors: 0 }

  let processed = 0
  let errors = 0

  for (const account of accounts as LinkedInAccount[]) {
    if (!account.session_cookie) continue

    const session: linkedin.LinkedInSession = {
      sessionCookie: account.session_cookie,
      accountId: account.id,
    }

    // Validate session is alive
    const valid = await linkedin.validateSession(session)
    if (!valid) {
      await supabase
        .from("agent_linkedin_accounts")
        .update({ status: "disconnected" })
        .eq("id", account.id)
      continue
    }

    // Process queue items by priority
    const result = await processQueue(config, account, session)
    processed += result.processed
    errors += result.errors
  }

  return { processed, errors }
}

/** Process queue items for one account */
async function processQueue(
  config: AgentConfig,
  account: LinkedInAccount,
  session: linkedin.LinkedInSession
): Promise<{ processed: number; errors: number }> {
  let processed = 0
  let errors = 0

  // Get items ready for action (next_action_at <= now or null for new items)
  const { data: items } = await supabase
    .from("agent_queue")
    .select("*")
    .eq("organization_id", config.organization_id)
    .not("status", "in", '("converted","failed","skipped","paused","responded")')
    .or(`next_action_at.is.null,next_action_at.lte.${new Date().toISOString()}`)
    .order("fit_score", { ascending: false, nullsFirst: false })
    .limit(5) // Process max 5 per cycle per account

  if (!items?.length) return { processed: 0, errors: 0 }

  for (const item of items as QueueItem[]) {
    try {
      // Random delay between actions
      await linkedin.delay(config.delay_min_seconds * 1000, config.delay_max_seconds * 1000)

      const acted = await processItem(config, account, session, item)
      if (acted) processed++
    } catch (e) {
      console.error(`Error processing queue item ${item.id}:`, e)
      await logAction(item, account.id, "error", false, String(e))
      errors++
    }
  }

  return { processed, errors }
}

/** Process a single queue item based on its current status */
async function processItem(
  config: AgentConfig,
  account: LinkedInAccount,
  session: linkedin.LinkedInSession,
  item: QueueItem
): Promise<boolean> {
  const daysSinceStageStart = item.current_stage_started_at
    ? (Date.now() - new Date(item.current_stage_started_at).getTime()) / (1000 * 60 * 60 * 24)
    : 0

  const publicId = extractPublicId(item.linkedin_url)
  if (!publicId) {
    await advanceStatus(item, "skipped", "URL inválida")
    return false
  }

  switch (item.status) {
    case "discovered": {
      // View profile → move to warming
      const result = await linkedin.viewProfile(session, publicId)
      await logAction(item, account.id, "profile_view", result.success, result.error)
      if (result.success) {
        await advanceStatus(item, "warming")
      }
      return result.success
    }

    case "warming": {
      if (daysSinceStageStart >= config.warming_days) {
        await advanceStatus(item, "commenting")
        return true
      }
      // Like posts during warming
      if (account.daily_comments_used < config.daily_like_limit) {
        const posts = await linkedin.getProfilePosts(session, publicId, 3)
        if (posts.success && posts.posts?.length) {
          const post = posts.posts[0]
          const result = await linkedin.likePost(session, post.urn)
          await logAction(item, account.id, "post_like", result.success, result.error)
          await updateNextAction(item, config)
          return result.success
        }
      }
      return false
    }

    case "commenting": {
      if (daysSinceStageStart >= config.commenting_days) {
        await advanceStatus(item, "connecting")
        return true
      }
      // Comment on posts
      if (account.daily_comments_used < config.daily_comment_limit) {
        const posts = await linkedin.getProfilePosts(session, publicId, 5)
        if (posts.success && posts.posts?.length) {
          const post = posts.posts[0]
          const comment = await ai.generateComment({
            postContent: post.text,
            prospectName: item.full_name || "profesional",
            prospectHeadline: item.headline || "",
          })
          const result = await linkedin.commentOnPost(session, post.urn, comment)
          await logAction(item, account.id, "post_comment", result.success, result.error, comment)
          if (result.success) {
            await supabase
              .from("agent_linkedin_accounts")
              .update({ daily_comments_used: account.daily_comments_used + 1, last_action_at: new Date().toISOString() })
              .eq("id", account.id)
          }
          await updateNextAction(item, config)
          return result.success
        }
      }
      return false
    }

    case "connecting": {
      if (account.daily_connections_used < config.daily_connection_limit) {
        const note = await ai.generateConnectionNote({
          prospectName: item.full_name || "",
          prospectHeadline: item.headline || "",
          prospectCompany: item.company || "",
          discType: item.disc_type,
        })
        // We need the profile URN — extract from linkedin_url 
        const profileUrn = `urn:li:fsd_profile:${publicId}`
        const result = await linkedin.sendConnection(session, profileUrn, note)
        await logAction(item, account.id, "connection_request", result.success, result.error, note)
        if (result.success) {
          await advanceStatus(item, "connected")
          await supabase
            .from("agent_linkedin_accounts")
            .update({ daily_connections_used: account.daily_connections_used + 1, last_action_at: new Date().toISOString() })
            .eq("id", account.id)
        }
        return result.success
      }
      return false
    }

    case "connected":
    case "nurturing": {
      if (item.status === "connected") {
        await advanceStatus(item, "nurturing")
        return true
      }
      if (daysSinceStageStart >= config.nurturing_days) {
        await advanceStatus(item, "messaged")
        // Send the DM
        const message = await ai.generateDirectMessage({
          prospectName: item.full_name || "",
          prospectHeadline: item.headline || "",
          prospectCompany: item.company || "",
          painPoints: item.pain_points,
          salesAngle: item.sales_angle,
          discType: item.disc_type,
        })
        const profileUrn = `urn:li:fsd_profile:${publicId}`
        const result = await linkedin.sendMessage(session, profileUrn, message)
        await logAction(item, account.id, "direct_message", result.success, result.error, message)

        if (result.success) {
          // Auto-create CRM prospect
          await createCRMProspect(item)
        }
        return result.success
      }
      // During nurturing: view profile again, like posts
      const result = await linkedin.viewProfile(session, publicId)
      await logAction(item, account.id, "profile_view", result.success)
      await updateNextAction(item, config)
      return result.success
    }

    case "messaged": {
      // Already messaged — waiting for response. Nothing to do.
      return false
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
  const delayMs = (config.delay_min_seconds + config.delay_max_seconds) / 2 * 1000 * 60 // Average delay in minutes, scaled up
  const nextAction = new Date(Date.now() + Math.max(delayMs, 30 * 60 * 1000)) // At least 30 min

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
