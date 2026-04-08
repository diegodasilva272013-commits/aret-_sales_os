import { NextRequest, NextResponse } from "next/server"
import { getAgentScope } from "@/lib/agent-auth"

export async function GET() {
  const scope = await getAgentScope()
  if (scope.error) return scope.error

  const { data, error } = await scope.supabase
    .from("agent_config")
    .select("*")
    .eq("organization_id", scope.organizationId)
    .single()

  if (error && error.code !== "PGRST116") {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ config: data || null })
}

export async function POST(req: NextRequest) {
  const scope = await getAgentScope()
  if (scope.error) return scope.error
  if (!scope.isOwner) {
    return NextResponse.json({ error: "Solo owners pueden configurar el agente" }, { status: 403 })
  }

  const body = await req.json()
  const allowedFields = [
    "icp_industries", "icp_roles", "icp_company_size", "icp_locations", "icp_keywords",
    "daily_connection_limit", "daily_comment_limit", "daily_like_limit",
    "delay_min_seconds", "delay_max_seconds",
    "active_hours_start", "active_hours_end", "active_days",
    "warming_days", "commenting_days", "nurturing_days",
  ]

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key]
  }

  // Upsert: create if not exists, update if exists
  const { data, error } = await scope.supabase
    .from("agent_config")
    .upsert({
      organization_id: scope.organizationId,
      ...updates,
    }, { onConflict: "organization_id" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}
