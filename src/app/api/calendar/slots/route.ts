import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // Obtener el closer de la org (owner)
  const { data: myProfile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  const { data: closer } = await supabase
    .from("profiles")
    .select("id, google_access_token, google_refresh_token, google_token_expiry")
    .eq("organization_id", myProfile?.organization_id)
    .eq("is_owner", true)
    .single()

  if (!closer?.google_access_token) {
    return NextResponse.json({ error: "El closer no conectó Google Calendar" }, { status: 400 })
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

  // Refrescar token si expiró
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await supabase.from("profiles").update({
        google_access_token: tokens.access_token,
        google_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
      }).eq("id", closer.id)
    }
  })

  const calendar = google.calendar({ version: "v3", auth: oauth2Client })

  // Buscar slots libres en el rango pedido (9am-7pm)
  const days = parseInt(req.nextUrl.searchParams.get("days") || "7")
  const now = new Date()
  const weekLater = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  const { data: busyData } = await calendar.freebusy.query({
    requestBody: {
      timeMin: now.toISOString(),
      timeMax: weekLater.toISOString(),
      items: [{ id: "primary" }],
    },
  })

  const busy = busyData.calendars?.primary?.busy || []

  // Generar slots de 30 min entre 9am y 7pm
  const slots: { start: string; end: string }[] = []
  const cursor = new Date(now)
  cursor.setMinutes(0, 0, 0)
  if (cursor.getHours() < 9) cursor.setHours(9)

  while (cursor < weekLater) {
    const day = cursor.getDay()
    const hour = cursor.getHours()

    if (day !== 0 && day !== 6 && hour >= 9 && hour < 19) {
      const slotEnd = new Date(cursor.getTime() + 45 * 60 * 1000)
      const isBusy = busy.some(b => {
        const bStart = new Date(b.start!)
        const bEnd = new Date(b.end!)
        return cursor < bEnd && slotEnd > bStart
      })

      if (!isBusy && cursor > now) {
        slots.push({ start: cursor.toISOString(), end: slotEnd.toISOString() })
      }
    }

    cursor.setHours(cursor.getHours() + 1, 0, 0, 0)
    if (cursor.getHours() >= 19) {
      cursor.setDate(cursor.getDate() + 1)
      cursor.setHours(9, 0, 0, 0)
    }
  }

  return NextResponse.json({ slots, closerId: closer.id })
}
