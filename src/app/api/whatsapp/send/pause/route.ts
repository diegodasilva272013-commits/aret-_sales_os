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

  const { campaign_id } = await req.json()
  if (!campaign_id) return NextResponse.json({ error: "campaign_id requerido" }, { status: 400 })

  const { data: campaign } = await supabase
    .from("wa_campaigns")
    .select("id, status")
    .eq("id", campaign_id)
    .eq("organization_id", profile?.organization_id)
    .single()

  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
  if (campaign.status !== "running") {
    return NextResponse.json({ error: "La campaña no está en curso" }, { status: 400 })
  }

  // Setting status to "paused" causes the send engine to stop after the current send
  await supabase
    .from("wa_campaigns")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("id", campaign_id)

  return NextResponse.json({ ok: true, status: "paused" })
}
