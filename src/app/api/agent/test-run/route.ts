import { NextRequest, NextResponse } from "next/server"
import { runAgentCycle } from "@/lib/agent/orchestrator"

/**
 * GET /api/agent/test-run?secret=xxx — Debug endpoint (no auth required, uses CRON_SECRET)
 * DELETE THIS FILE after debugging is complete.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret")
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "bad secret" }, { status: 403 })
  }

  try {
    const result = await runAgentCycle()
    return NextResponse.json(result, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: String(e), stack: (e as Error)?.stack }, { status: 500 })
  }
}
