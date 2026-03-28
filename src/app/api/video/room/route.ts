import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import twilio from "twilio"

const AccessToken = twilio.jwt.AccessToken
const VideoGrant = AccessToken.VideoGrant

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { prospectId } = await req.json()

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, full_name")
    .eq("id", user.id)
    .single()

  const roomName = `room-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

  // Crear sala en Twilio con grabación activada
  const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
  try {
    await client.video.v1.rooms.create({
      uniqueName: roomName,
      type: "group-small",
      recordParticipantsOnConnect: true,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/video/composition?prospectId=${prospectId || ""}&orgId=${profile?.organization_id || ""}`,
      statusCallbackMethod: "POST",
    })
  } catch (e) {
    console.error("Room create error:", e)
  }

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_API_KEY!,
    process.env.TWILIO_API_SECRET!,
    { identity: profile?.full_name || user.id, ttl: 3600 }
  )
  token.addGrant(new VideoGrant({ room: roomName }))

  await supabase.from("video_rooms").insert({
    room_name: roomName,
    prospect_id: prospectId || null,
    organization_id: profile?.organization_id,
    created_by: user.id,
    status: "waiting",
  })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  const prospectLink = `${appUrl}/join.html?room=${roomName}`

  return NextResponse.json({ token: token.toJwt(), roomName, prospectLink })
}
