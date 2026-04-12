import { NextResponse } from "next/server"
import { getAgentScope } from "@/lib/agent-auth"
import { createClient } from "@supabase/supabase-js"
import { getConnections } from "@/lib/agent/linkedin"

/** Service-role client for writes (same pattern as orchestrator) */
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

/** GET — List imported connections from agent_queue */
export async function GET() {
  const scope = await getAgentScope()
  if (scope.error) return scope.error

  const sb = getServiceClient()

  const { data, error } = await sb
    .from("agent_queue")
    .select("id, full_name, headline, company, linkedin_url, status, fit_score, disc_type, pain_points, sales_angle, created_at")
    .eq("organization_id", scope.organizationId)
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const stats: Record<string, number> = {}
  for (const item of data || []) {
    stats[item.status] = (stats[item.status] || 0) + 1
  }

  return NextResponse.json({ connections: data || [], stats })
}

/** POST — Import connections from LinkedIn network into agent_queue */
export async function POST() {
  const scope = await getAgentScope()
  if (scope.error) return scope.error

  const sb = getServiceClient()

  // Get active LinkedIn account
  const { data: accounts } = await sb
    .from("agent_linkedin_accounts")
    .select("*")
    .eq("organization_id", scope.organizationId)
    .in("status", ["active", "warming"])
    .not("session_cookie", "is", null)
    .order("created_at")
    .limit(1)

  if (!accounts?.length) {
    return NextResponse.json({
      error: "No hay cuentas LinkedIn activas. Primero validá tu cookie en la pestaña Cuentas.",
    }, { status: 400 })
  }

  const account = accounts[0]
  if (!account.session_cookie) {
    return NextResponse.json({
      error: "La cuenta no tiene cookie configurada.",
    }, { status: 400 })
  }

  // Clean cookie (remove quotes, whitespace, "li_at=" prefix if pasted wrong)
  let cleanCookie = account.session_cookie.trim()
  if (cleanCookie.startsWith("li_at=")) cleanCookie = cleanCookie.slice(6)
  cleanCookie = cleanCookie.replace(/^["']|["']$/g, "").trim()

  const session = {
    sessionCookie: cleanCookie,
    accountId: account.id,
  }

  // Pre-validate cookie before attempting import
  const { validateSessionDetailed } = await import("@/lib/agent/linkedin")
  const validation = await validateSessionDetailed(session)
  if (!validation.valid) {
    return NextResponse.json({
      error: `Cookie expirada o inválida (${validation.detail}). Actualizá tu cookie li_at en la pestaña Cuentas.`,
      cookieLength: cleanCookie.length,
      cookiePreview: cleanCookie.substring(0, 10) + "...",
    }, { status: 401 })
  }

  // Get current offset (how many already imported)
  const { count: totalImported } = await sb
    .from("agent_queue")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", scope.organizationId)

  const startFrom = totalImported ?? 0

  try {
    console.log(`[connections] importing offset=${startFrom}`)

    const result = await getConnections(session, startFrom, 40)

    if (!result.success) {
      return NextResponse.json({
        error: `Error de LinkedIn: ${result.error}`,
        imported: 0,
      }, { status: 502 })
    }

    if (!result.connections?.length) {
      return NextResponse.json({
        imported: 0,
        message: "No se encontraron más conexiones para importar",
        total: result.total || 0,
      })
    }

    let imported = 0
    for (const conn of result.connections) {
      if (!conn.publicId || !conn.fullName) continue
      const linkedinUrl = `https://www.linkedin.com/in/${conn.publicId}/`

      // Skip if already in queue
      const { data: existing } = await sb
        .from("agent_queue")
        .select("id")
        .eq("organization_id", scope.organizationId)
        .eq("linkedin_url", linkedinUrl)
        .limit(1)

      if (existing?.length) continue

      const { error: insertError } = await sb.from("agent_queue").insert({
        organization_id: scope.organizationId,
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

      if (!insertError) imported++
    }

    // Log the import
    if (imported > 0) {
      await sb.from("agent_logs").insert({
        organization_id: scope.organizationId,
        linkedin_account_id: account.id,
        action_type: "connections_imported",
        action_detail: `${imported} connections imported manually (offset ${startFrom})`,
        success: true,
      })
    }

    return NextResponse.json({
      imported,
      total: result.total,
      offset: startFrom,
      message: imported > 0
        ? `${imported} conexiones importadas`
        : "Todas las conexiones ya estaban importadas",
    })
  } catch (e) {
    return NextResponse.json({
      error: `Error inesperado: ${String(e)}`,
      imported: 0,
    }, { status: 500 })
  }
}
