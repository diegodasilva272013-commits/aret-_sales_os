import { createClient } from "@/lib/supabase/server"
import SettingsClient from "@/components/SettingsClient"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from("profiles").select("*, organizations(*), google_access_token").eq("id", user?.id || "").single()
  const orgId = (profile as { organization_id?: string })?.organization_id
  const { data: team } = orgId
    ? await supabase.from("profiles").select("id, full_name, email, role").eq("organization_id", orgId).order("created_at")
    : { data: [] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const calendarConnected = !!((profile as any)?.google_access_token)
  return <SettingsClient profile={profile} team={(team || []) as any} org={((profile as any)?.organizations || null) as any} calendarConnected={calendarConnected} />
}
