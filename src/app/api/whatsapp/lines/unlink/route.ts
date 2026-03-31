import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  const { line_id } = await req.json()
  if (!line_id) return NextResponse.json({ error: "line_id requerido" }, { status: 400 })

  // Verify ownership before deletion
  const { data: line } = await supabase
    .from("wa_lines")
    .select("id, channel_type")
    .eq("id", line_id)
    .eq("organization_id", profile?.organization_id)
    .single()

  if (!line) return NextResponse.json({ error: "Línea no encontrada" }, { status: 404 })

  // If Baileys, tell the server to disconnect the session
  if (line.channel_type === "baileys" && process.env.BAILEYS_SERVER_URL) {
    try {
      await fetch(`${process.env.BAILEYS_SERVER_URL}/api/sessions/${line_id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${process.env.BAILEYS_SERVER_SECRET || ""}` },
        signal: AbortSignal.timeout(5000),
      })
    } catch {
      // Non-fatal: continue with DB deletion even if Baileys server is unreachable
    }
  }

  const { error } = await supabase
    .from("wa_lines")
    .delete()
    .eq("id", line_id)
    .eq("organization_id", profile?.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
