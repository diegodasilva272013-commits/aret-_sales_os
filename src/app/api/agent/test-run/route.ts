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

    // 5. Try multiple LinkedIn search URL formats
    const searchKeyword = "gerente hotel"
    const encodedKw = encodeURIComponent(searchKeyword)

    // Format A: typeahead (simplest)
    debug.push("--- Search Format A: typeahead ---")
    try {
      const rA = await fetch(`https://www.linkedin.com/voyager/api/typeahead/hitsV2?keywords=${encodedKw}&origin=GLOBAL_SEARCH_HEADER&q=blended&type=PEOPLE`, {
        headers: {
          "Cookie": `li_at=${account.session_cookie}; JSESSIONID="ajax:0"`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "application/vnd.linkedin.normalized+json+2.1",
          "X-Li-Lang": "es_ES",
          "X-Restli-Protocol-Version": "2.0.0",
          "Csrf-Token": "ajax:0",
        },
        redirect: "manual",
      })
      debug.push(`  Status: ${rA.status}`)
      if (rA.status === 200) {
        const d = await rA.json()
        const elements = d?.elements || []
        debug.push(`  Elements: ${elements.length}`)
        for (const el of elements.slice(0, 2)) {
          debug.push(`  → ${el?.text?.text || el?.title?.text || JSON.stringify(el).slice(0, 100)}`)
        }
      }
    } catch (e) { debug.push(`  Error: ${String(e)}`) }

    // Format B: search/blended 
    debug.push("--- Search Format B: search/blended ---")
    try {
      const rB = await fetch(`https://www.linkedin.com/voyager/api/search/blended?keywords=${encodedKw}&origin=GLOBAL_SEARCH_HEADER&q=all&filters=List(resultType-%3EPEOPLE)&count=10&start=0`, {
        headers: {
          "Cookie": `li_at=${account.session_cookie}; JSESSIONID="ajax:0"`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "application/vnd.linkedin.normalized+json+2.1",
          "X-Li-Lang": "es_ES",
          "X-Restli-Protocol-Version": "2.0.0",
          "Csrf-Token": "ajax:0",
        },
        redirect: "manual",
      })
      debug.push(`  Status: ${rB.status}`)
      if (rB.status === 200) {
        const d = await rB.json()
        const included = d?.included || []
        debug.push(`  Included items: ${included.length}`)
        for (const it of included.slice(0, 2)) {
          debug.push(`  → type=${it.$type}, name=${it.firstName || it.publicIdentifier || '?'}`)
        }
      }
    } catch (e) { debug.push(`  Error: ${String(e)}`) }

    // Format C: graphql with updated queryId
    debug.push("--- Search Format C: graphql ---")
    try {
      const rC = await fetch(`https://www.linkedin.com/voyager/api/graphql?variables=(start:0,origin:GLOBAL_SEARCH_HEADER,query:(keywords:${encodedKw},flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE))),includeFiltersInResponse:false))&queryId=voyagerSearchDashClusters.66cf6e86bb2bba425e3bef87df34d4f8`, {
        headers: {
          "Cookie": `li_at=${account.session_cookie}; JSESSIONID="ajax:0"`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "application/vnd.linkedin.normalized+json+2.1",
          "X-Li-Lang": "es_ES",
          "X-Restli-Protocol-Version": "2.0.0",
          "Csrf-Token": "ajax:0",
        },
        redirect: "manual",
      })
      debug.push(`  Status: ${rC.status}`)
      if (rC.status === 200) {
        const d = await rC.json()
        const included = d?.included || []
        debug.push(`  Included items: ${included.length}`)
        for (const it of included.filter((x: Record<string, unknown>) => (x as Record<string, string>).publicIdentifier).slice(0, 2)) {
          debug.push(`  → ${(it as Record<string, string>).firstName} ${(it as Record<string, string>).lastName} (${(it as Record<string, string>).publicIdentifier})`)
        }
      }
    } catch (e) { debug.push(`  Error: ${String(e)}`) }

    // Format D: dash/clusters REST (simpler, no filterClauses)
    debug.push("--- Search Format D: dash/clusters simple ---")
    try {
      const rD = await fetch(`https://www.linkedin.com/voyager/api/search/dash/clusters?decorationId=com.linkedin.voyager.dash.deco.search.SearchClusterCollection-175&origin=GLOBAL_SEARCH_HEADER&q=all&query=(keywords:${encodedKw},flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE))))&start=0&count=10`, {
        headers: {
          "Cookie": `li_at=${account.session_cookie}; JSESSIONID="ajax:0"`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "application/vnd.linkedin.normalized+json+2.1",
          "X-Li-Lang": "es_ES",
          "X-Restli-Protocol-Version": "2.0.0",
          "Csrf-Token": "ajax:0",
        },
        redirect: "manual",
      })
      debug.push(`  Status: ${rD.status}`)
      if (rD.status === 200) {
        const d = await rD.json()
        const included = d?.included || []
        debug.push(`  Included items: ${included.length}`)
        const profiles = included.filter((x: Record<string, unknown>) => (x as Record<string, string>).publicIdentifier)
        debug.push(`  Profiles found: ${profiles.length}`)
        for (const it of profiles.slice(0, 3)) {
          debug.push(`  → ${(it as Record<string, string>).firstName} ${(it as Record<string, string>).lastName} | ${(it as Record<string, string>).headline || ''}`)
        }
      }
    } catch (e) { debug.push(`  Error: ${String(e)}`) }

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
