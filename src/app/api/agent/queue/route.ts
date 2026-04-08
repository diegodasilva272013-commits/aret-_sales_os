import { NextRequest, NextResponse } from "next/server"
import { getAgentScope } from "@/lib/agent-auth"

export async function GET(req: NextRequest) {
  const scope = await getAgentScope()
  if (scope.error) return scope.error

  const url = req.nextUrl
  const status = url.searchParams.get("status")
  const minScore = url.searchParams.get("min_score")
  const page = parseInt(url.searchParams.get("page") || "1")
  const limit = parseInt(url.searchParams.get("limit") || "50")
  const offset = (page - 1) * limit

  // Stats by status
  const { data: allItems } = await scope.supabase
    .from("agent_queue")
    .select("status")
    .eq("organization_id", scope.organizationId)

  const stats: Record<string, number> = {}
  let totalConverted = 0
  let totalMessaged = 0
  for (const item of allItems || []) {
    stats[item.status] = (stats[item.status] || 0) + 1
    if (item.status === "converted") totalConverted++
    if (item.status === "messaged" || item.status === "responded" || item.status === "converted") totalMessaged++
  }
  const conversionRate = totalMessaged > 0 ? Math.round((totalConverted / totalMessaged) * 100) : 0

  // Build query
  let query = scope.supabase
    .from("agent_queue")
    .select("*", { count: "exact" })
    .eq("organization_id", scope.organizationId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq("status", status)
  if (minScore) query = query.gte("fit_score", parseInt(minScore))

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    stats,
    conversionRate,
    total: count || 0,
    page,
    limit,
  })
}
