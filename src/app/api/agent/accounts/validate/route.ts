import { NextRequest, NextResponse } from "next/server"
import { getAgentScope } from "@/lib/agent-auth"
import { validateSession } from "@/lib/agent/linkedin"

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
    const valid = await validateSession({
      sessionCookie: account.session_cookie,
      accountId: account.id,
    })

    // Update account status based on validation
    await scope.supabase
      .from("agent_linkedin_accounts")
      .update({ status: valid ? "active" : "disconnected", last_action_at: new Date().toISOString() })
      .eq("id", accountId)

    return NextResponse.json({
      valid,
      message: valid
        ? "Cookie válida — cuenta conectada correctamente"
        : "Cookie inválida o expirada — iniciá sesión en LinkedIn y copiá la cookie li_at de nuevo",
    })
  } catch (e) {
    return NextResponse.json({
      valid: false,
      message: `Error al validar: ${String(e)}`,
    })
  }
}
