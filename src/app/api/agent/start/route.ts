import { NextResponse } from "next/server"
import { getAgentScope } from "@/lib/agent-auth"

export async function POST() {
  const scope = await getAgentScope()
  if (scope.error) return scope.error

  // Activate (no longer blocks if accounts are disconnected — user can fix cookies after)
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
