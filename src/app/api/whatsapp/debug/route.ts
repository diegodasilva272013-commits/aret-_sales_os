import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET: ver últimos mensajes + estado del webhook (solo para owners)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("organization_id, is_owner").eq("id", user.id).single()
  if (!profile?.is_owner) return NextResponse.json({ error: "Solo owners" }, { status: 403 })

  // Últimos 10 mensajes
  const { data: messages } = await supabase
    .from("whatsapp_messages")
    .select("id, direction, content, status, from_number, to_number, prospect_id, whatsapp_message_id, created_at")
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false })
    .limit(10)

  // Contar inbound vs outbound
  const { count: inboundCount } = await supabase
    .from("whatsapp_messages")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id)
    .eq("direction", "inbound")

  const { count: outboundCount } = await supabase
    .from("whatsapp_messages")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id)
    .eq("direction", "outbound")

  // Mensajes sin prospect_id (huérfanos)
  const { count: orphanCount } = await supabase
    .from("whatsapp_messages")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id)
    .is("prospect_id", null)

  return NextResponse.json({
    summary: {
      total_inbound: inboundCount || 0,
      total_outbound: outboundCount || 0,
      orphan_messages: orphanCount || 0,
      webhook_url: "https://aret-sales-os.vercel.app/api/whatsapp/webhook",
      phone_number_id: process.env.WHATSAPP_PHONE_NUMBER_ID || "NOT SET",
      token_set: !!process.env.WHATSAPP_ACCESS_TOKEN,
      service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    recent_messages: messages,
  })
}
