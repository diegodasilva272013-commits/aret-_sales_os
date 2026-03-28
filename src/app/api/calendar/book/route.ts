import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const { prospectId, start, end, closerId } = await req.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: prospect } = await supabase
    .from("prospects")
    .select("full_name, company, linkedin_url")
    .eq("id", prospectId)
    .single()

  const { data: closer } = await supabase
    .from("profiles")
    .select("google_access_token, google_refresh_token, google_token_expiry, email")
    .eq("id", closerId)
    .single()

  if (!closer?.google_access_token) {
    return NextResponse.json({ error: "Sin acceso al calendario" }, { status: 400 })
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
  )

  oauth2Client.setCredentials({
    access_token: closer.google_access_token,
    refresh_token: closer.google_refresh_token,
    expiry_date: closer.google_token_expiry ? new Date(closer.google_token_expiry).getTime() : undefined,
  })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })

  const event = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: `📞 Llamada con ${prospect?.full_name} — ${prospect?.company || ""}`,
      description: `Prospecto: ${prospect?.full_name}\nEmpresa: ${prospect?.company || "-"}\nLinkedIn: ${prospect?.linkedin_url || "-"}`,
      start: { dateTime: start, timeZone: "America/Argentina/Buenos_Aires" },
      end: { dateTime: end, timeZone: "America/Argentina/Buenos_Aires" },
      attendees: closer.email ? [{ email: closer.email }] : [],
    },
  })

  // Guardar en DB
  await supabase.from("scheduled_calls").insert({
    prospect_id: prospectId,
    setter_id: user.id,
    closer_id: closerId,
    google_event_id: event.data.id,
    scheduled_at: start,
    duration_minutes: 45,
  })

  // Actualizar estado del prospecto
  await supabase.from("prospects")
    .update({ status: "llamada_agendada" })
    .eq("id", prospectId)

  return NextResponse.json({ success: true, eventId: event.data.id })
}
