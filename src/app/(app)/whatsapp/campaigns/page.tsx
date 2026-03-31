import { createClient } from "@/lib/supabase/server"
import CampaignsClient from "@/components/whatsapp/CampaignsClient"

export const dynamic = "force-dynamic"

export default async function CampaignsPage() {
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
    .select("*, wa_lines(id, label, phone, status)")
    .eq("organization_id", profile?.organization_id)
    .order("created_at", { ascending: false })

  return <CampaignsClient campaigns={campaigns || []} />
}
