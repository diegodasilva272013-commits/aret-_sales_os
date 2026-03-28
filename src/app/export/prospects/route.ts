import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: prospects } = await supabase
    .from("prospects")
    .select("*, profiles!assigned_to(full_name, email)")
    .order("created_at", { ascending: false })

  if (!prospects) return NextResponse.json({ error: "Error" }, { status: 500 })

  const headers = ["Nombre", "Empresa", "Cargo", "Ubicación", "Fuente", "URL", "Estado", "Fase", "Follow-ups", "Setter", "Fecha"]
  const rows = prospects.map(p => [
    p.full_name,
    p.company || "",
    p.headline || "",
    p.location || "",
    p.source_type || "linkedin",
    p.linkedin_url || p.instagram_url || "",
    p.status,
    p.phase,
    p.follow_up_count,
    (p as { profiles?: { full_name: string } }).profiles?.full_name || "",
    new Date(p.created_at).toLocaleDateString("es-AR"),
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="prospectos-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}
