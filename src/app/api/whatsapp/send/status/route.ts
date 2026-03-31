import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  const url = new URL(req.url)
  const campaignId = url.searchParams.get("campaign_id")
  if (!campaignId) return NextResponse.json({ error: "campaign_id requerido" }, { status: 400 })

  const { data: campaign } = await supabase
    .from("wa_campaigns")
    .select("id, name, status, sent_count, error_count, contact_ids")
    .eq("id", campaignId)
    .eq("organization_id", profile?.organization_id)
    .single()

  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })

  const { data: queue } = await supabase
    .from("wa_send_queue")
    .select("id, phone, name, status, error_msg, sent_at, variation_index")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: true })
    .limit(500)

  return NextResponse.json({ campaign, queue: queue || [] })
}
