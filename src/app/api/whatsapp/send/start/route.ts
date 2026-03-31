import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runSendEngine } from "@/lib/whatsapp/send-engine"

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

  // Verify the campaign belongs to this org
  const { data: campaign } = await supabase
    .from("wa_campaigns")
    .select("id, status, organization_id")
    .eq("id", campaign_id)
    .eq("organization_id", profile?.organization_id)
    .single()

  if (!campaign) return NextResponse.json({ error: "Campaña no encontrada" }, { status: 404 })
  if (campaign.status === "running") return NextResponse.json({ error: "La campaña ya está en curso" }, { status: 400 })
  if (campaign.status === "done") return NextResponse.json({ error: "La campaña ya finalizó" }, { status: 400 })

  // Update status to running
  await supabase
    .from("wa_campaigns")
    .update({ status: "running", updated_at: new Date().toISOString() })
    .eq("id", campaign_id)

  // TODO: In production, trigger this via a real background worker (BullMQ, Inngest, etc.)
  // For now, we trigger the engine asynchronously using setImmediate.
  // Note: In serverless environments (Vercel), the function may be killed before completing.
  // The engine is designed to be resumable (it reads pending queue items on each run).
  setImmediate(() => {
    runSendEngine(campaign_id).catch(err => {
      console.error("[send/start] Engine error:", err)
    })
  })

  return NextResponse.json({ ok: true, status: "running" })
}
