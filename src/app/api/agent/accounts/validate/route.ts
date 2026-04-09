import { NextRequest, NextResponse } from "next/server"
import { getAgentScope } from "@/lib/agent-auth"
import { validateSessionDetailed } from "@/lib/agent/linkedin"

export async function POST(req: NextRequest) {
  const scope = await getAgentScope()
  if (scope.error) return scope.error

  let body: { accountId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const { accountId } = body
  if (!accountId) {
    return NextResponse.json({ error: "accountId requerido" }, { status: 400 })
  }

  const { data: account, error } = await scope.supabase
    .from("agent_linkedin_accounts")
    .select("id, session_cookie, status")
    .eq("id", accountId)
    .eq("organization_id", scope.organizationId)
    .single()

  if (error || !account) {
    return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 })
  }

  if (!account.session_cookie) {
    return NextResponse.json({ valid: false, message: "No hay cookie de sesión configurada. Editá la cuenta y pegá tu cookie li_at." })
  }

  try {
    const result = await validateSessionDetailed({
      sessionCookie: account.session_cookie,
      accountId: account.id,
    })

    // Only update to active if valid. NEVER mark as disconnected from validate button
    // (the user might just have a temporary network issue)
    if (result.valid) {
      await scope.supabase
        .from("agent_linkedin_accounts")
        .update({ status: "active", last_action_at: new Date().toISOString() })
        .eq("id", accountId)
    }

    return NextResponse.json({
      valid: result.valid,
      detail: result.detail,
      message: result.valid
        ? `✅ Cookie válida — ${result.detail}`
        : `❌ Cookie inválida (${result.detail}) — Asegurate de estar logueado en LinkedIn y copiá la cookie li_at de nuevo`,
    })
  } catch (e) {
    return NextResponse.json({
      valid: false,
      detail: String(e),
      message: `❌ Error al validar: ${String(e)}`,
    })
  }
}
