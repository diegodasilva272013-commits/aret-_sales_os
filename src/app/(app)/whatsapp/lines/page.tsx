import { createClient } from "@/lib/supabase/server"
import LinesClient from "@/components/whatsapp/LinesClient"

export const dynamic = "force-dynamic"

export default async function LinesPage() {
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
    .select("*")
    .eq("organization_id", profile?.organization_id)
    .order("created_at", { ascending: false })

  return <LinesClient lines={lines || []} orgId={profile?.organization_id || ""} />
}
