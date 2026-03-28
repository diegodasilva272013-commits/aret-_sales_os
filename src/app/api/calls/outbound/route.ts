import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import twilio from "twilio"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { prospectId, toNumber, fromNumber } = await req.json()
  if (!toNumber || !fromNumber) return NextResponse.json({ error: "Faltan datos" }, { status: 400 })

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

  try {
    await client.calls.create({
      to: fromNumber,
      from: process.env.TWILIO_PHONE_NUMBER!,
      url: "http://demo.twilio.com/docs/voice.xml",
    })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error Twilio"
    console.error("Twilio error:", e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
