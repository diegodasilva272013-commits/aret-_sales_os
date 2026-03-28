import { NextRequest, NextResponse } from "next/server"
import twilio from "twilio"

const AccessToken = twilio.jwt.AccessToken
const VideoGrant = AccessToken.VideoGrant

export async function POST(req: NextRequest) {
  const { roomName, name } = await req.json()
  if (!roomName) return NextResponse.json({ error: "Falta roomName" }, { status: 400 })

  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_API_KEY!,
    process.env.TWILIO_API_SECRET!,
    { identity: name || "Prospecto", ttl: 3600 }
  )
  token.addGrant(new VideoGrant({ room: roomName }))

  return NextResponse.json({ token: token.toJwt() })
}
