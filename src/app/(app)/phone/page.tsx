import { createClient } from "@/lib/supabase/server"
import PhoneClient from "@/components/PhoneClient"

export default async function PhonePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  const [{ data: recordings }, { data: prospects }] = await Promise.all([
    supabase
      .from("call_recordings")
      .select(`id, recording_url, duration_seconds, status, created_at, call_sid, transcript, prospect_id, user_id`)
      .eq("organization_id", profile?.organization_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("prospects")
      .select("id, full_name, company, whatsapp_number, status")
      .eq("organization_id", profile?.organization_id)
      .order("full_name"),
  ])

  return <PhoneClient recordings={recordings as any} prospects={prospects as any} />
}
