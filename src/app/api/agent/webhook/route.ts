import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

const supabase = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  // Verify webhook secret
  const secret = req.headers.get("x-webhook-secret")
  if (secret !== process.env.AGENT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const {
    organization_id,
    queue_id,
    linkedin_account_id,
    action_type,
    action_detail,
    generated_content,
    success = true,
    error_message,
    new_status,
    duration_ms,
    // For new prospect discovery
    prospect_data,
  } = body

  if (!organization_id || !action_type) {
    return NextResponse.json({ error: "organization_id and action_type required" }, { status: 400 })
  }

  // 1. Insert log entry
  if (queue_id) {
    await supabase.from("agent_logs").insert({
      organization_id,
      queue_id,
      linkedin_account_id,
      action_type,
      action_detail,
      generated_content,
      success,
      error_message,
      duration_ms,
    })
  }

  // 2. If new prospect discovery, insert into agent_queue
  if (action_type === "profile_discovered" && prospect_data) {
    const { data: newItem } = await supabase.from("agent_queue").insert({
      organization_id,
      linkedin_account_id,
      linkedin_url: prospect_data.linkedin_url,
      full_name: prospect_data.full_name,
      headline: prospect_data.headline,
      company: prospect_data.company,
      location: prospect_data.location,
      profile_data: prospect_data.profile_data,
      disc_type: prospect_data.disc_type,
      pain_points: prospect_data.pain_points,
      sales_angle: prospect_data.sales_angle,
      fit_score: prospect_data.fit_score,
      status: "discovered",
      started_at: new Date().toISOString(),
      current_stage_started_at: new Date().toISOString(),
    }).select("id").single()

    // Log the discovery
    if (newItem) {
      await supabase.from("agent_logs").insert({
        organization_id,
        queue_id: newItem.id,
        linkedin_account_id,
        action_type: "profile_discovered",
        action_detail: `Descubierto: ${prospect_data.full_name} - ${prospect_data.headline}`,
        success: true,
      })
    }

    return NextResponse.json({ data: newItem })
  }

  // 3. Update queue item status if new_status provided
  if (queue_id && new_status) {
    const updates: Record<string, unknown> = {
      status: new_status,
      updated_at: new Date().toISOString(),
    }

    if (new_status !== (await supabase.from("agent_queue").select("status").eq("id", queue_id).single()).data?.status) {
      updates.current_stage_started_at = new Date().toISOString()
    }

    if (new_status === "messaged") {
      updates.messaged_at = new Date().toISOString()
    }

    await supabase.from("agent_queue").update(updates).eq("id", queue_id)

    // 4. Auto-convert to CRM prospect when messaged
    if (new_status === "messaged") {
      const { data: queueItem } = await supabase
        .from("agent_queue")
        .select("*")
        .eq("id", queue_id)
        .single()

      if (queueItem && !queueItem.prospect_id) {
        const { data: prospect } = await supabase.from("prospects").insert({
          organization_id,
          linkedin_url: queueItem.linkedin_url,
          full_name: queueItem.full_name || "Sin nombre",
          headline: queueItem.headline || "",
          company: queueItem.company || "",
          location: queueItem.location || "",
          status: "nuevo",
          phase: "contacto",
          follow_up_count: 0,
          source_type: "agente_autonomo",
          notes: `[Agent] Fit score: ${queueItem.fit_score || "N/A"}\nDISC: ${queueItem.disc_type || "N/A"}\nSales angle: ${queueItem.sales_angle || "N/A"}`,
          assigned_to: (await supabase.from("profiles").select("id").eq("organization_id", organization_id).eq("is_owner", true).single()).data?.id,
          created_by: (await supabase.from("profiles").select("id").eq("organization_id", organization_id).eq("is_owner", true).single()).data?.id,
        }).select("id").single()

        if (prospect) {
          await supabase.from("agent_queue").update({
            prospect_id: prospect.id,
            converted_at: new Date().toISOString(),
          }).eq("id", queue_id)
        }
      }
    }
  }

  // 5. Update account counters
  if (linkedin_account_id && success) {
    if (action_type === "connection_request") {
      await supabase.rpc("increment", { row_id: linkedin_account_id, table_name: "agent_linkedin_accounts", column_name: "daily_connections_used" }).catch(() => {
        // Fallback: direct update
        supabase.from("agent_linkedin_accounts")
          .update({ daily_connections_used: supabase.rpc as unknown as number })
          .eq("id", linkedin_account_id)
      })
    }
    if (action_type === "post_comment") {
      // Update last_action_at
    }
    await supabase.from("agent_linkedin_accounts").update({
      last_action_at: new Date().toISOString(),
    }).eq("id", linkedin_account_id)
  }

  return NextResponse.json({ received: true })
}
