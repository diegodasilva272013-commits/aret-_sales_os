import { createClient } from "@/lib/supabase/server"
import MonitorClient from "@/components/whatsapp/MonitorClient"

export const dynamic = "force-dynamic"

export default async function MonitorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  const { data: campaigns } = await supabase
    .from("wa_campaigns")
    .select("id, name, status, sent_count, error_count, contact_ids")
    .eq("organization_id", profile?.organization_id)
    .order("created_at", { ascending: false })

  return <MonitorClient campaigns={campaigns || []} orgId={profile?.organization_id || ""} />
}
