import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * Returns org scope for any authenticated user (agent module is visible to all roles).
 */
export async function getAgentScope(): Promise<
  | { organizationId: string; userId: string; isOwner: boolean; supabase: Awaited<ReturnType<typeof createClient>>; error?: never }
  | { error: NextResponse; organizationId?: never; userId?: never; isOwner?: never; supabase?: never }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) }
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, is_owner")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) {
    return { error: NextResponse.json({ error: "Sin organización" }, { status: 403 }) }
  }

  return {
    organizationId: profile.organization_id,
    userId: user.id,
    isOwner: !!profile.is_owner,
    supabase,
  }
}
