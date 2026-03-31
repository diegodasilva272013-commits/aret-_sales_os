/**
 * WhatsApp Masivo Send Engine
 *
 * Processes the send queue for a campaign with anti-blocker logic:
 * - Sends messages in blocks (block_size)
 * - Pauses between blocks (pause_minutes)
 * - Adds per-message delay (delay_seconds)
 * - Optionally randomizes delays to simulate human behavior
 * - Checks campaign status before each send to support pause/stop
 *
 * TODO: In production, replace the setImmediate trigger in /api/whatsapp/send/start
 *       with a proper background worker using BullMQ, Inngest, or similar.
 *       Serverless functions (Vercel) may not live long enough to complete large campaigns.
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { routeChannel } from "./channel-router"

type QueueItem = {
  id: string
  phone: string
  name: string | null
  variation_index: number
  status: string
}

type Campaign = {
  id: string
  status: string
  variations: { body: string; media_url?: string }[]
  block_size: number
  pause_minutes: number
  delay_seconds: number
  randomize: boolean
  sent_count: number
  error_count: number
  line_id: string
}

type WaLine = {
  id: string
  channel_type: string
  meta_phone_id: string | null
  baileys_session: string | null
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function jitter(base: number, randomize: boolean): number {
  if (!randomize) return base
  // Add ±30% randomization
  const factor = 0.7 + Math.random() * 0.6
  return Math.round(base * factor)
}

function interpolateMessage(template: string, contact: { name?: string | null; alias?: string | null; phone: string }): string {
  return template
    .replace(/\[name\]/gi, contact.name || contact.alias || "")
    .replace(/\[alias\]/gi, contact.alias || contact.name || "")
    .replace(/\[phone\]/gi, contact.phone)
}

/**
 * Creates a Supabase client with service role for background use (bypasses RLS).
 * Falls back to anon key if service role not available.
 */
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createSupabaseClient(url, key)
}

export async function runSendEngine(campaignId: string): Promise<void> {
  const supabase = createServiceClient()

  // Fetch campaign + line
  const { data: campaign } = await supabase
    .from("wa_campaigns")
    .select("id, status, variations, block_size, pause_minutes, delay_seconds, randomize, sent_count, error_count, line_id")
    .eq("id", campaignId)
    .single()

  if (!campaign) {
    console.error(`[send-engine] Campaign ${campaignId} not found`)
    return
  }

  const typedCampaign = campaign as Campaign

  if (typedCampaign.status !== "running") {
    console.log(`[send-engine] Campaign ${campaignId} is not running (status=${typedCampaign.status}), aborting.`)
    return
  }

  const { data: line } = await supabase
    .from("wa_lines")
    .select("id, channel_type, meta_phone_id, baileys_session")
    .eq("id", typedCampaign.line_id)
    .single()

  if (!line) {
    console.error(`[send-engine] Line not found for campaign ${campaignId}`)
    await supabase
      .from("wa_campaigns")
      .update({ status: "paused", updated_at: new Date().toISOString() })
      .eq("id", campaignId)
    return
  }

  const typedLine = line as WaLine

  // Fetch pending queue items
  const { data: queueItems } = await supabase
    .from("wa_send_queue")
    .select("id, phone, name, variation_index, status")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  if (!queueItems || queueItems.length === 0) {
    console.log(`[send-engine] No pending items for campaign ${campaignId}. Marking done.`)
    await supabase
      .from("wa_campaigns")
      .update({ status: "done", updated_at: new Date().toISOString() })
      .eq("id", campaignId)
    return
  }

  const typedItems = queueItems as QueueItem[]
  const { block_size, pause_minutes, delay_seconds, randomize, variations } = typedCampaign

  let sentCount = typedCampaign.sent_count
  let errorCount = typedCampaign.error_count
  let blockCount = 0

  for (let i = 0; i < typedItems.length; i++) {
    // Check campaign status before each send (supports pause)
    if (i % 5 === 0 && i > 0) {
      const { data: fresh } = await supabase
        .from("wa_campaigns")
        .select("status")
        .eq("id", campaignId)
        .single()

      if (fresh?.status !== "running") {
        console.log(`[send-engine] Campaign ${campaignId} paused/stopped at item ${i}. Exiting engine.`)
        return
      }
    }

    const item = typedItems[i]
    const variation = variations[item.variation_index % variations.length]

    const body = interpolateMessage(variation.body, {
      name: item.name,
      alias: null,
      phone: item.phone,
    })

    const result = await routeChannel({
      phone: item.phone,
      body,
      media_url: variation.media_url,
      line: typedLine,
      contact: { name: item.name },
    })

    if (result.success) {
      sentCount++
      await supabase
        .from("wa_send_queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", item.id)
    } else {
      errorCount++
      await supabase
        .from("wa_send_queue")
        .update({ status: "error", error_msg: result.error || "Error desconocido" })
        .eq("id", item.id)
    }

    // Update campaign counts every 10 sends
    if ((sentCount + errorCount) % 10 === 0) {
      await supabase
        .from("wa_campaigns")
        .update({ sent_count: sentCount, error_count: errorCount, updated_at: new Date().toISOString() })
        .eq("id", campaignId)
    }

    blockCount++

    // End of block: pause
    if (blockCount >= block_size && i < typedItems.length - 1) {
      blockCount = 0
      const pauseMs = jitter(pause_minutes * 60 * 1000, randomize)
      console.log(`[send-engine] Campaign ${campaignId}: block complete, pausing ${Math.round(pauseMs / 1000)}s`)
      await sleep(pauseMs)
    } else if (i < typedItems.length - 1) {
      // Per-message delay
      const delayMs = jitter(delay_seconds * 1000, randomize)
      await sleep(delayMs)
    }
  }

  // Final update
  const allDone = queueItems.length === typedItems.length
  await supabase
    .from("wa_campaigns")
    .update({
      sent_count: sentCount,
      error_count: errorCount,
      status: allDone ? "done" : "paused",
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId)

  console.log(`[send-engine] Campaign ${campaignId} finished. Sent=${sentCount}, Errors=${errorCount}`)
}
