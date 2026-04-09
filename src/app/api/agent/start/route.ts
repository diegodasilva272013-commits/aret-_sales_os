import { NextResponse } from "next/server"
import { getAgentScope } from "@/lib/agent-auth"

export async function POST() {
  const scope = await getAgentScope()
  if (scope.error) return scope.error

  // Check at least one account is connected
  const { data: accounts } = await scope.supabase
    .from("agent_linkedin_accounts")
    .select("id")
    .eq("organization_id", scope.organizationId)
    .in("status", ["active", "warming"])
    .limit(1)

  if (!accounts?.length) {
    return NextResponse.json({ error: "Conectá al menos una cuenta LinkedIn antes de activar el agente" }, { status: 400 })
  }

  // Activate
  const { data, error } = await scope.supabase
    .from("agent_config")
    .upsert({
      organization_id: scope.organizationId,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "organization_id" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
