import { NextRequest, NextResponse } from "next/server"
import { getAgentScope } from "@/lib/agent-auth"

export async function GET() {
  const scope = await getAgentScope()
  if (scope.error) return scope.error

  const { data, error } = await scope.supabase
    .from("agent_linkedin_accounts")
    .select("*")
    .eq("organization_id", scope.organizationId)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ accounts: data })
}

export async function POST(req: NextRequest) {
  const scope = await getAgentScope()
  if (scope.error) return scope.error
  if (!scope.isOwner) {
    return NextResponse.json({ error: "Solo owners pueden agregar cuentas" }, { status: 403 })
  }

  const { account_name, linkedin_email, session_cookie } = await req.json()

  if (!account_name || !linkedin_email) {
    return NextResponse.json({ error: "Nombre y email requeridos" }, { status: 400 })
  }

  // Check plan limit
  const { count } = await scope.supabase
    .from("agent_linkedin_accounts")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", scope.organizationId)

  const { data: org } = await scope.supabase
    .from("organizations")
    .select("plan")
    .eq("id", scope.organizationId)
    .single()

  const planLimits: Record<string, number> = { free: 1, starter: 1, pro: 3, agency: 10 }
  const maxAccounts = planLimits[org?.plan || "free"] || 0

  if ((count || 0) >= maxAccounts) {
    return NextResponse.json({
      error: `Tu plan ${org?.plan} permite máximo ${maxAccounts} cuenta(s) LinkedIn`,
    }, { status: 403 })
  }

  const { data, error } = await scope.supabase
    .from("agent_linkedin_accounts")
    .insert({
      organization_id: scope.organizationId,
      account_name,
      linkedin_email,
      session_cookie: session_cookie || null,
      status: session_cookie ? "active" : "disconnected",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}

export async function DELETE(req: NextRequest) {
  const scope = await getAgentScope()
  if (scope.error) return scope.error
  if (!scope.isOwner) {
    return NextResponse.json({ error: "Solo owners pueden eliminar cuentas" }, { status: 403 })
  }

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  const { error } = await scope.supabase
    .from("agent_linkedin_accounts")
    .delete()
    .eq("id", id)
    .eq("organization_id", scope.organizationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

/** PATCH — Update session cookie for existing account */
export async function PATCH(req: NextRequest) {
  const scope = await getAgentScope()
  if (scope.error) return scope.error

  let { accountId, session_cookie } = await req.json()
  if (!accountId || !session_cookie) {
    return NextResponse.json({ error: "accountId y session_cookie son requeridos" }, { status: 400 })
  }

  // Clean cookie: remove quotes, whitespace, "li_at=" prefix if pasted wrong
  session_cookie = session_cookie.trim()
  if (session_cookie.startsWith("li_at=")) session_cookie = session_cookie.slice(6)
  session_cookie = session_cookie.replace(/^["']|["']$/g, "").trim()

  const { data, error } = await scope.supabase
    .from("agent_linkedin_accounts")
    .update({ session_cookie, status: "active" })
    .eq("id", accountId)
    .eq("organization_id", scope.organizationId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ account: data })
}
