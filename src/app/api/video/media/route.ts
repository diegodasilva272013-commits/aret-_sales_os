import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url")
  if (!url) return new NextResponse("Missing url", { status: 400 })

  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")
  const res = await fetch(url, { headers: { Authorization: `Basic ${auth}` } })

  if (!res.ok) return new NextResponse("Error fetching media", { status: res.status })

  return new NextResponse(res.body, {
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "video/mp4",
      "Content-Length": res.headers.get("Content-Length") || "",
    },
  })
}
