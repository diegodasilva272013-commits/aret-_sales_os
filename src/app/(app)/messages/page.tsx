import { createClient } from "@/lib/supabase/server"
import MessagesInbox from "@/components/MessagesInbox"

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, is_owner")
    .eq("id", user.id)
    .single()

  // Traer conversaciones - non-owners solo ven las de sus prospectos
  let msgQuery = supabase
    .from("whatsapp_messages")
    .select(`
      id, content, direction, status, created_at, prospect_id,
      prospects!prospect_id(id, full_name, company, headline, whatsapp_number, status, assigned_to)
    `)
    .eq("organization_id", profile?.organization_id)
    .order("created_at", { ascending: false })

  if (!profile?.is_owner) {
    // Get assigned prospect IDs first, then filter messages
    const { data: myProspects } = await supabase
      .from("prospects")
      .select("id")
      .eq("assigned_to", user.id)
    const myIds = (myProspects || []).map(p => p.id)
    if (myIds.length > 0) {
      msgQuery = msgQuery.in("prospect_id", myIds)
    } else {
      msgQuery = msgQuery.eq("prospect_id", "00000000-0000-0000-0000-000000000000")
    }
  }

  const { data: conversations } = await msgQuery

  // Agrupar por prospect_id, quedarse con el último mensaje de cada uno
  const seen = new Set<string>()
  const convos: typeof conversations = []
  for (const msg of (conversations || [])) {
    const pid = (msg as { prospect_id: string }).prospect_id
    if (!seen.has(pid)) {
      seen.add(pid)
      convos.push(msg)
    }
  }

  return <MessagesInbox conversations={convos as any} orgId={profile?.organization_id || ""} />
}
