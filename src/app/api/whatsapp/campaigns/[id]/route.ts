import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  const { data: campaign, error } = await supabase
    .from("wa_campaigns")
    .select("*, wa_lines(id, label, phone, status)")
    .eq("id", id)
    .eq("organization_id", profile?.organization_id)
    .single()

  if (error || !campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
  return NextResponse.json({ campaign })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  const body = await req.json()
  const allowed: Record<string, unknown> = {}
  const allowedFields = ["name", "status", "line_id", "contact_ids", "variations", "block_size", "pause_minutes", "delay_seconds", "randomize", "sent_count", "error_count"]
  for (const field of allowedFields) {
    if (body[field] !== undefined) allowed[field] = body[field]
  }
  allowed.updated_at = new Date().toISOString()

  const { data: campaign, error } = await supabase
    .from("wa_campaigns")
    .update(allowed)
    .eq("id", id)
    .eq("organization_id", profile?.organization_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaign })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  // Only allow deleting draft campaigns
  const { data: campaign } = await supabase
    .from("wa_campaigns")
    .select("id, status")
    .eq("id", id)
    .eq("organization_id", profile?.organization_id)
    .single()

  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
  if (campaign.status !== "draft") {
    return NextResponse.json({ error: "Solo se pueden eliminar campañas en borrador" }, { status: 400 })
  }

  const { error } = await supabase
    .from("wa_campaigns")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile?.organization_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
