import { NextRequest, NextResponse } from "next/server"
import { getAgentScope } from "@/lib/agent-auth"

export async function GET(req: NextRequest) {
  const scope = await getAgentScope()
  if (scope.error) return scope.error

  const url = req.nextUrl
  const queueId = url.searchParams.get("queue_id")
  const actionType = url.searchParams.get("action_type")
  const success = url.searchParams.get("success")
  const from = url.searchParams.get("from")
  const to = url.searchParams.get("to")
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = parseInt(url.searchParams.get("limit") || "50")
  const offset = (page - 1) * limit

  let query = scope.supabase
    .from("agent_logs")
    .select("*, agent_queue(full_name, company, linkedin_url), agent_linkedin_accounts(account_name)", { count: "exact" })
    .eq("organization_id", scope.organizationId)
    .order("executed_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (queueId) query = query.eq("queue_id", queueId)
  if (actionType) query = query.eq("action_type", actionType)
  if (success !== null && success !== undefined) query = query.eq("success", success === "true")
  if (from) query = query.gte("executed_at", from)
  if (to) query = query.lte("executed_at", to)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, total: count || 0, page, limit })
}
