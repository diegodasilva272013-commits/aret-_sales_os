import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const { callId, start, end } = await req.json()
  const supabase = await createClient()

  const { data: call } = await supabase
    .from("scheduled_calls")
    .select("google_event_id, closer_id")
    .eq("id", callId)
    .single()

  if (!call?.google_event_id || !call?.closer_id) return NextResponse.json({ ok: true })

  const { data: closer } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token, google_token_expiry")
    .eq("id", call.closer_id)
    .single()

  if (!closer?.google_access_token) return NextResponse.json({ ok: true })

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  )
  oauth2Client.setCredentials({
    access_token: closer.google_access_token,
    refresh_token: closer.google_refresh_token,
  })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })
  await calendar.events.patch({
    calendarId: "primary",
    eventId: call.google_event_id,
    requestBody: {
      start: { dateTime: start, timeZone: "America/Argentina/Buenos_Aires" },
      end: { dateTime: end, timeZone: "America/Argentina/Buenos_Aires" },
    },
  })

  return NextResponse.json({ ok: true })
}
