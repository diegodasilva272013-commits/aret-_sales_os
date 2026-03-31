import { createClient } from "@/lib/supabase/server"
import ContactsClient from "@/components/whatsapp/ContactsClient"

export const dynamic = "force-dynamic"

export default async function ContactsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  const { data: contacts } = await supabase
    .from("wa_contacts")
    .select("*")
    .eq("organization_id", profile?.organization_id)
    .order("created_at", { ascending: false })
    .limit(500)

  return <ContactsClient contacts={contacts || []} orgId={profile?.organization_id || ""} />
}
