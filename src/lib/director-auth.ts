import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * Validates that the current user is an organization owner (director).
 * Returns the supabase client and organizationId, or a NextResponse error.
 */
export async function getDirectorScope(): Promise<
  | { organizationId: string; userId: string; supabase: Awaited<ReturnType<typeof createClient>>; error?: never }
  | { error: NextResponse; organizationId?: never; userId?: never; supabase?: never }
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

  if (!profile || !profile.is_owner || !profile.organization_id) {
    return { error: NextResponse.json({ error: "Acceso denegado: solo directores" }, { status: 403 }) }
  }

  return { organizationId: profile.organization_id, userId: user.id, supabase }
}
