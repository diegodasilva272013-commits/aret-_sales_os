import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import * as linkedin from "@/lib/agent/linkedin"

/**
 * GET /api/agent/test-run?secret=xxx — Debug endpoint (no auth, uses CRON_SECRET)
 * Runs a FULL diagnostic: DB check → session validation → LinkedIn search
 * DELETE THIS FILE after debugging is complete.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "bad secret" }, { status: 403 })
  }

  const debug: string[] = []
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1. Check config
    const { data: configs } = await supabase.from("agent_config").select("*").eq("is_active", true)
    if (!configs?.length) {
      debug.push("No active configs found")
      return NextResponse.json({ debug })
    }
    const config = configs[0]
    debug.push(`Config: org=${config.organization_id}, hours=${config.active_hours_start}-${config.active_hours_end}, days=${JSON.stringify(config.active_days)}`)
    debug.push(`ICP: industries=${JSON.stringify(config.icp_industries)}, roles=${JSON.stringify(config.icp_roles)}, locations=${JSON.stringify(config.icp_locations)}, keywords=${JSON.stringify(config.icp_keywords)}`)

    // 2. Check time (info only, don't skip)
    const now = new Date()
    const argHour = ((now.getUTCHours() - 3) % 24 + 24) % 24
    debug.push(`Current: UTC ${now.getUTCHours()}:${String(now.getUTCMinutes()).padStart(2,'0')}, Argentina hour=${argHour}, day=${now.getDay()} (${['dom','lun','mar','mie','jue','vie','sab'][now.getDay()]})`)
    debug.push("⚠️ Ignoring hours check for this test")

    // 3. Get accounts
    const { data: accounts } = await supabase
      .from("agent_linkedin_accounts")
      .select("*")
      .eq("organization_id", config.organization_id)
      .in("status", ["active", "warming"])
    
    if (!accounts?.length) {
      debug.push("❌ No active/warming LinkedIn accounts")
      return NextResponse.json({ debug })
    }
    debug.push(`Found ${accounts.length} account(s): ${accounts.map((a: { account_name: string; status: string; session_cookie: string | null }) => `${a.account_name}(${a.status}, cookie=${a.session_cookie ? a.session_cookie.slice(0,20) + '...' : 'NULL'})`).join(', ')}`)

    const account = accounts[0]
    if (!account.session_cookie) {
      debug.push("❌ Account has no session cookie")
      return NextResponse.json({ debug })
    }

    const session: linkedin.LinkedInSession = {
      sessionCookie: account.session_cookie,
      accountId: account.id,
    }

    // 4. Validate session
    debug.push("Validating LinkedIn session...")
    const validation = await linkedin.validateSessionDetailed(session)
    debug.push(`Session validation: valid=${validation.valid}, detail=${validation.detail}`)

    if (!validation.valid) {
      debug.push("❌ Session is INVALID — user needs to update li_at cookie")
      return NextResponse.json({ debug })
    }

    // 5. Try LinkedIn search
    const keywords = [...(config.icp_keywords || []), ...(config.icp_roles || [])].filter(Boolean)
    const searchKeyword = keywords.slice(0, 3).join(" ") || "gerente hotel"
    debug.push(`Searching LinkedIn for: "${searchKeyword}"`)

    const searchResult = await linkedin.searchPeople(session, {
      keywords: searchKeyword,
      count: 5,
    })
    debug.push(`Search: success=${searchResult.success}, results=${searchResult.results?.length ?? 0}, error=${searchResult.error || 'none'}`)

    if (searchResult.results?.length) {
      for (const p of searchResult.results.slice(0, 3)) {
        debug.push(`  → ${p.fullName} | ${p.headline} | ${p.company}`)
      }
    }

    // 6. Check queue
    const { count } = await supabase
      .from("agent_queue")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", config.organization_id)
    debug.push(`Queue items: ${count ?? 0}`)

    // 7. Check logs  
    const { data: logs } = await supabase
      .from("agent_logs")
      .select("*")
      .eq("organization_id", config.organization_id)
      .order("created_at", { ascending: false })
      .limit(3)
    debug.push(`Recent logs: ${logs?.length ?? 0}`)

    debug.push("✅ Diagnostic complete")
  } catch (e) {
    debug.push(`💥 CRASH: ${String(e)}`)
    debug.push(`Stack: ${(e as Error)?.stack?.slice(0, 300) || 'none'}`)
  }

  return NextResponse.json({ debug })
}
