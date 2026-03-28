import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: businesses } = await supabase
    .from("businesses")
    .select("*, profiles!assigned_to(full_name)")
    .order("created_at", { ascending: false })

  if (!businesses) return NextResponse.json({ error: "Error" }, { status: 500 })

  const headers = ["Empresa", "Rubro", "Ciudad", "País", "Contacto", "Email", "WhatsApp", "Instagram", "Web", "Rating", "Estado", "Follow-ups", "Setter", "Fecha"]
  const rows = businesses.map(b => [
    b.name,
    b.category || "",
    b.city || "",
    b.country || "",
    b.contact_name || "",
    b.contact_email || "",
    b.whatsapp || "",
    b.instagram || "",
    b.website || "",
    b.google_rating || "",
    b.status,
    b.follow_up_count,
    (b as { profiles?: { full_name: string } }).profiles?.full_name || "",
    new Date(b.created_at).toLocaleDateString("es-AR"),
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="empresas-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}
