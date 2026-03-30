import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Cliente con service role para poder escribir sin sesión
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET: verificación del webhook desde Meta
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode")
  const token = req.nextUrl.searchParams.get("hub.verify_token")
  const challenge = req.nextUrl.searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse("Forbidden", { status: 403 })
}

// POST: recibir mensajes entrantes
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages?.length) return NextResponse.json({ ok: true })

    for (const msg of value.messages) {
      if (msg.type !== "text") continue

      const fromNumber = msg.from // número del prospecto (sin +)
      const content = msg.text?.body || ""
      const waMessageId = msg.id

      // Buscar el prospecto por número de WhatsApp
      const { data: prospect } = await supabase
        .from("prospects")
        .select("id, organization_id")
        .or(`whatsapp_number.eq.+${fromNumber},whatsapp_number.eq.${fromNumber}`)
        .single()

      await supabase.from("whatsapp_messages").insert({
        prospect_id: prospect?.id || null,
        organization_id: prospect?.organization_id || null,
        whatsapp_message_id: waMessageId,
        direction: "inbound",
        from_number: `+${fromNumber}`,
        to_number: process.env.WHATSAPP_PHONE_NUMBER_ID,
        content,
        status: "received",
      })

      // Marcar como leído en WhatsApp
      await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: waMessageId,
        }),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("WhatsApp webhook error:", e)
    return NextResponse.json({ ok: true }) // siempre 200 para Meta
  }
}
