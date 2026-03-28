import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import ProspectsTable from "@/components/ProspectsTable"

export default async function ProspectsPage() {
  const supabase = await createClient()
  const { data: prospects } = await supabase
    .from("prospects")
    .select("*, profiles!assigned_to(full_name, email)")
    .order("created_at", { ascending: false })

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--background)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Prospectos</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              {prospects?.length || 0} prospectos en total
            </p>
          </div>
          <Link href="/prospects/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuevo Prospecto
          </Link>
        </div>

        <ProspectsTable prospects={prospects || []} currentUserId={user?.id || ""} />
      </div>
    </div>
  )
}
