import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import twilio from "twilio"

const AccessToken = twilio.jwt.AccessToken
const VoiceGrant = AccessToken.VoiceGrant

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_API_KEY!,
    process.env.TWILIO_API_SECRET!,
    { identity: user.id, ttl: 3600 }
  )

  const voiceGrant = new VoiceGrant({
    outgoingApplicationSid: process.env.TWILIO_TWIML_APP_SID!,
    incomingAllow: false,
  })

  token.addGrant(voiceGrant)

  return NextResponse.json({
    token: token.toJwt(),
    userId: user.id,
    orgId: profile?.organization_id,
  })
}
