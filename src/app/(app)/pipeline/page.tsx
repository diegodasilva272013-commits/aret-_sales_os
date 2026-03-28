import { createClient } from "@/lib/supabase/server"
import KanbanBoard from "@/components/KanbanBoard"

export default async function PipelinePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, is_owner")
    .eq("id", user?.id || "")
    .single()

  let query = supabase
    .from("prospects")
    .select("id, full_name, company, status, follow_up_count, source_type, assigned_to, profiles!assigned_to(full_name)")
    .neq("status", "pausado")
    .order("created_at", { ascending: false })

  // Owners ven todos, setters solo los suyos
  if (!profile?.is_owner) {
    query = query.eq("assigned_to", user?.id || "")
  } else if (profile?.organization_id) {
    // Owner: filtrar por org via assigned_to
  }

  const { data: prospects } = await query

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapped: any[] = (prospects || []).map(p => ({
    id: p.id,
    full_name: p.full_name,
    company: p.company,
    status: p.status,
    follow_up_count: p.follow_up_count,
    source_type: p.source_type,
    assigned_to_profile: (p.profiles as unknown as { full_name: string } | null),
  }))

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--background)" }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Pipeline</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
          Arrastrá los prospectos entre columnas para actualizar su estado
        </p>
      </div>
      <KanbanBoard initialProspects={mapped} />
    </div>
  )
}
