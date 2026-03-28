import { createClient } from "@/lib/supabase/server"
import CallsCalendar from "@/components/CallsCalendar"

export default async function CallsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, is_owner")
    .eq("id", user?.id || "")
    .single()

  // Traer llamadas de los próximos 30 días y últimos 7
  const from = new Date(Date.now() - 7 * 86400000).toISOString()
  const to = new Date(Date.now() + 30 * 86400000).toISOString()

  let query = supabase
    .from("scheduled_calls")
    .select(`
      *,
      prospects(id, full_name, company, headline, linkedin_url, instagram_url, source_type, status, notes, follow_up_count),
      profiles!setter_id(full_name, email)
    `)
    .gte("scheduled_at", from)
    .lte("scheduled_at", to)
    .order("scheduled_at")

  if (!profile?.is_owner) {
    query = query.eq("setter_id", user?.id || "")
  }

  const { data: calls } = await query

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--background)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Llamadas</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Vista de llamadas agendadas — arrastrá para reprogramar
          </p>
        </div>
        <CallsCalendar initialCalls={(calls || []) as any} />
      </div>
    </div>
  )
}
