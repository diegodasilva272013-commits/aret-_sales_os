import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const RELAY_URL = "https://linkedin-relay.arete-relay.workers.dev"
const RELAY_SECRET = "arete-relay-2026-secret-key"

/** Test a LinkedIn URL through the relay and return status + response info */
async function testUrl(url: string, cookieHeaders: Record<string, string>): Promise<{ status: number; location?: string; bodyPreview?: string; ok: boolean }> {
  try {
    const res = await fetch(RELAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Relay-Secret": RELAY_SECRET },
      body: JSON.stringify({ url, method: "GET", headers: cookieHeaders }),
    })
    const data = await res.json() as { status: number; headers: Record<string, string>; body: string }
    return {
      status: data.status,
      location: data.headers?.location?.substring(0, 150),
      bodyPreview: data.body?.substring(0, 300),
      ok: data.status >= 200 && data.status < 300,
    }
  } catch (e) {
    return { status: -1, bodyPreview: String(e), ok: false }
  }
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "bad secret" }, { status: 403 })
  }

  // Get the active cookie from DB
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: accounts } = await sb
    .from("agent_linkedin_accounts")
    .select("id, session_cookie, status, account_name")
    .in("status", ["active", "warming"])
    .not("session_cookie", "is", null)
    .limit(1)

  if (!accounts?.length) {
    return NextResponse.json({ error: "No active accounts with cookies" })
  }

  const cookie = accounts[0].session_cookie!.trim()
  const jsessionId = "ajax:test123"
  const hdrs = {
    "Cookie": `li_at=${cookie}; JSESSIONID="${jsessionId}"; lang=v=2&lang=es-es`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/vnd.linkedin.normalized+json+2.1",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "X-Li-Lang": "es_ES",
    "X-Restli-Protocol-Version": "2.0.0",
    "Csrf-Token": jsessionId,
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Referer": "https://www.linkedin.com/mynetwork/",
  }

  // Test multiple LinkedIn endpoints
  const results: Record<string, { status: number; location?: string; bodyPreview?: string; ok: boolean }> = {}

  const urls: Record<string, string> = {
    "1_me": "https://www.linkedin.com/voyager/api/me",
    "2_connections_classic": "https://www.linkedin.com/voyager/api/relationships/connections?count=10&start=0&sortType=RECENTLY_ADDED",
    "3_connections_dash": "https://www.linkedin.com/voyager/api/relationships/dash/connections?count=10&q=search&start=0&sortType=RECENTLY_ADDED",
    "4_connections_dash_decorated": "https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16&count=10&q=search&start=0&sortType=RECENTLY_ADDED",
    "5_search_rest": "https://www.linkedin.com/voyager/api/search/dash/clusters?decorationId=com.linkedin.voyager.dash.deco.search.SearchClusterCollection-175&origin=GLOBAL_SEARCH_HEADER&q=all&query=(keywords:test,flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE))))&start=0&count=5",
    "6_typeahead": `https://www.linkedin.com/voyager/api/typeahead/hitsV2?keywords=a&origin=GLOBAL_SEARCH_HEADER&q=blended&type=PEOPLE`,
    "7_feed": `https://www.linkedin.com/voyager/api/feed/dash/feedDetailsByModule?count=1&q=MODULE&moduleKey=NAVIGATOR_FEED`,
  }

  for (const [name, url] of Object.entries(urls)) {
    results[name] = await testUrl(url, hdrs)
  }

  return NextResponse.json({
    account: accounts[0].account_name,
    cookieLength: cookie.length,
    cookiePreview: cookie.substring(0, 15) + "...",
    results,
  })
}

/** POST — Save a new cookie and test it end-to-end (temp endpoint for testing) */
export async function POST(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "bad secret" }, { status: 403 })
  }

  const body = await req.json() as { cookie?: string }
  if (!body.cookie || body.cookie.length < 100) {
    return NextResponse.json({ error: "cookie required (>100 chars)" }, { status: 400 })
  }

  const newCookie = body.cookie.trim().replace(/^li_at=/, "").replace(/^["']|["']$/g, "").trim()

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  
  // Get the first account
  const { data: accounts } = await sb
    .from("agent_linkedin_accounts")
    .select("id, account_name, session_cookie")
    .limit(1)

  if (!accounts?.length) {
    return NextResponse.json({ error: "No accounts found" })
  }

  const accountId = accounts[0].id
  const oldLen = (accounts[0].session_cookie || "").length

  // Step 1: Test cookie with LinkedIn /me endpoint
  const jsessionId = "ajax:" + Math.random().toString(36).slice(2, 8)
  const hdrs = {
    "Cookie": `li_at=${newCookie}; JSESSIONID="${jsessionId}"; lang=v=2&lang=es-es`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/vnd.linkedin.normalized+json+2.1",
    "X-Restli-Protocol-Version": "2.0.0",
    "Csrf-Token": jsessionId,
    "Referer": "https://www.linkedin.com/feed/",
  }

  const meTest = await testUrl("https://www.linkedin.com/voyager/api/me", hdrs)
  if (!meTest.ok) {
    return NextResponse.json({
      error: "Cookie INVÁLIDA — LinkedIn devolvió " + meTest.status,
      step: "validate",
      meTest,
    })
  }

  // Step 2: Test connections endpoint
  const connTest = await testUrl(
    "https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16&count=5&q=search&start=0&sortType=RECENTLY_ADDED",
    hdrs
  )

  // Step 3: Save to database  
  const { error: updateErr } = await sb
    .from("agent_linkedin_accounts")
    .update({ session_cookie: newCookie, status: "active" })
    .eq("id", accountId)

  if (updateErr) {
    return NextResponse.json({ error: "DB update failed: " + updateErr.message, step: "save" })
  }

  // Step 4: Verify saved
  const { data: verify } = await sb
    .from("agent_linkedin_accounts")
    .select("session_cookie")
    .eq("id", accountId)
    .single()

  const savedLen = (verify?.session_cookie || "").length
  const cookieMatch = verify?.session_cookie === newCookie

  // Step 5: Parse some connection names from the response
  let connectionNames: string[] = []
  if (connTest.ok && connTest.bodyPreview) {
    try {
      const full = await (await fetch(RELAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Relay-Secret": RELAY_SECRET },
        body: JSON.stringify({ 
          url: "https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16&count=5&q=search&start=0&sortType=RECENTLY_ADDED",
          method: "GET", headers: hdrs 
        }),
      })).json() as { body: string }
      const parsed = JSON.parse(full.body)
      const included = (parsed?.included || []) as Array<{ publicIdentifier?: string; firstName?: string; lastName?: string }>
      connectionNames = included
        .filter(i => i.publicIdentifier && i.firstName)
        .slice(0, 5)
        .map(i => `${i.firstName} ${i.lastName} (${i.publicIdentifier})`)
    } catch { /* ignore */ }
  }

  return NextResponse.json({
    success: true,
    steps: {
      "1_validate_cookie": { status: meTest.status, ok: meTest.ok },
      "2_test_connections": { status: connTest.status, ok: connTest.ok },
      "3_save_to_db": { ok: !updateErr, oldCookieLen: oldLen, newCookieLen: newCookie.length },
      "4_verify_saved": { savedLen, cookieMatch },
      "5_sample_connections": connectionNames,
    }
  })
}
