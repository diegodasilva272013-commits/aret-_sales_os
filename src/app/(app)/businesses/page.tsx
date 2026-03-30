import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import BusinessesClient from "@/components/BusinessesClient"

export default async function BusinessesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, is_owner")
    .eq("id", user?.id || "")
    .single()

  let query = supabase
    .from("businesses")
    .select("*, profiles!assigned_to(full_name), business_analyses(id)")
    .order("created_at", { ascending: false })

  if (!profile?.is_owner) {
    query = query.eq("assigned_to", user?.id || "")
  }

  const { data: businesses, error } = await query

  if (error) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-center">
          <p className="text-sm mb-2" style={{ color: "var(--danger)" }}>Error cargando empresas</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{error.message}</p>
          <p className="text-xs mt-4" style={{ color: "var(--text-muted)" }}>
            ¿Ejecutaste el SQL de businesses en Supabase? (archivo: supabase-businesses.sql)
          </p>
        </div>
      </div>
    )
  }

  return <BusinessesClient businesses={businesses || []} />
}
