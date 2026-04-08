import { NextResponse } from "next/server"
import { getAgentScope } from "@/lib/agent-auth"

export async function POST() {
  const scope = await getAgentScope()
  if (scope.error) return scope.error
  if (!scope.isOwner) {
    return NextResponse.json({ error: "Solo owners pueden pausar el agente" }, { status: 403 })
  }

  const { data, error } = await scope.supabase
    .from("agent_config")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("organization_id", scope.organizationId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
