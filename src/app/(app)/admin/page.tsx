import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AdminClient from "@/components/AdminClient"

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_owner, organization_id")
    .eq("id", user?.id || "")
    .single()

  if (!profile?.is_owner) redirect("/dashboard")

  const { data: team } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_owner, created_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at")

  // Contar prospectos y empresas por setter
  const { data: prospectCounts } = await supabase
    .from("prospects")
    .select("assigned_to")

  const { data: bizCounts } = await supabase
    .from("businesses")
    .select("assigned_to")

  const setterStats = (team || []).map(s => ({
    ...s,
    prospects: prospectCounts?.filter(p => p.assigned_to === s.id).length || 0,
    businesses: bizCounts?.filter(b => b.assigned_to === s.id).length || 0,
  }))

  return <AdminClient team={setterStats} currentUserId={user?.id || ""} />
}
