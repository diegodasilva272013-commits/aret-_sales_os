import CampaignBuilder from "@/components/whatsapp/CampaignBuilder"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function NewCampaignPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  const { data: lines } = await supabase
    .from("wa_lines")
    .select("id, label, phone, status")
    .eq("organization_id", profile?.organization_id)
    .order("created_at", { ascending: false })

  const { data: contacts } = await supabase
    .from("wa_contacts")
    .select("id, phone, name, alias")
    .eq("organization_id", profile?.organization_id)
    .order("created_at", { ascending: false })
    .limit(2000)

  return <CampaignBuilder lines={lines || []} contacts={contacts || []} />
}
