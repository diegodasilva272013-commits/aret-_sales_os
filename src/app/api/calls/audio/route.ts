import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse("No autorizado", { status: 401 })

  const url = req.nextUrl.searchParams.get("url")
  if (!url) return new NextResponse("Falta URL", { status: 400 })

  const auth = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString("base64")

  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` }, redirect: "follow" })
  const buffer = await res.arrayBuffer()

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=3600",
    },
  })
}
