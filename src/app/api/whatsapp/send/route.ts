import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const { prospectId, message, toNumber } = await req.json()
  if (!message || !toNumber) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

  // Normalizar número: sacar espacios, asegurar formato internacional
  const cleanNumber = toNumber.replace(/\s+/g, "").replace(/^\+/, "")

  const res = await fetch(`https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: cleanNumber,
      type: "text",
      text: { body: message },
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error("WhatsApp send error:", data)
    return NextResponse.json({ error: data.error?.message || "Error enviando mensaje" }, { status: 400 })
  }

  // Guardar en DB
  await supabase.from("whatsapp_messages").insert({
    prospect_id: prospectId,
    organization_id: profile?.organization_id,
    whatsapp_message_id: data.messages?.[0]?.id,
    direction: "outbound",
    from_number: process.env.WHATSAPP_PHONE_NUMBER_ID,
    to_number: `+${cleanNumber}`,
    content: message,
    status: "sent",
  })

  // Actualizar número del prospecto si no lo tenía
  await supabase.from("prospects")
    .update({ whatsapp_number: `+${cleanNumber}`, last_contact_at: new Date().toISOString() })
    .eq("id", prospectId)

  return NextResponse.json({ ok: true, messageId: data.messages?.[0]?.id })
}
