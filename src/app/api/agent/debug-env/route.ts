import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "bad secret" }, { status: 403 })
  }

  const relayUrl = process.env.CF_RELAY_URL
  const relaySecret = process.env.CF_RELAY_SECRET
  const proxyUrl = process.env.PROXY_URL

  // Test the relay
  let relayTest = "not attempted"
  if (relayUrl?.trim()) {
    try {
      const res = await fetch(relayUrl.trim(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Relay-Secret": relaySecret?.trim() || "",
        },
        body: JSON.stringify({
          url: "https://www.linkedin.com/voyager/api/me",
          method: "GET",
          headers: {},
        }),
      })
      relayTest = `HTTP ${res.status} ${res.statusText}`
    } catch (e) {
      relayTest = `FETCH ERROR: ${String(e)}`
    }
  }

  return NextResponse.json({
    CF_RELAY_URL: relayUrl ? `SET (${relayUrl.trim().length} chars): ${relayUrl.trim().substring(0, 50)}...` : "NOT SET",
    CF_RELAY_URL_raw_length: relayUrl?.length,
    CF_RELAY_URL_trimmed_length: relayUrl?.trim()?.length,
    CF_RELAY_SECRET: relaySecret ? `SET (${relaySecret.trim().length} chars)` : "NOT SET",
    PROXY_URL: proxyUrl ? `SET (${proxyUrl.trim().length} chars)` : "NOT SET",
    relayTest,
  })
}
