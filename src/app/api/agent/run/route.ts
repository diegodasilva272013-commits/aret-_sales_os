import { NextResponse } from "next/server"
import { runAgentCycle } from "@/lib/agent/orchestrator"
import { getAgentScope } from "@/lib/agent-auth"

/**
 * POST /api/agent/run — Manual trigger for agent cycle.
 * Owner-only. Runs the same orchestrator the cron calls.
 */
export async function POST() {
  const scope = await getAgentScope()
  if ("error" in scope) return scope.error

  try {
    const result = await runAgentCycle()
    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error("Agent manual run error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
