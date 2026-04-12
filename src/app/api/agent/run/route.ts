import { NextResponse } from "next/server"
import { runAgentCycle } from "@/lib/agent/orchestrator"
import { getAgentScope } from "@/lib/agent-auth"

/**
 * POST /api/agent/run — Manual trigger for agent cycle.
 * Any authenticated org member can run it.
 */
export async function POST() {
  console.log("[agent/run] Starting manual trigger...")
  
  const scope = await getAgentScope()
  
  if ("error" in scope) {
    console.log("[agent/run] Auth failed - returning error response")
    return scope.error
  }
  
  console.log("[agent/run] Authenticated as userId:", scope.userId, "orgId:", scope.organizationId, "isOwner:", scope.isOwner)

  try {
    console.log("[agent/run] Calling runAgentCycle(skipTimeCheck=true)...")
    const result = await runAgentCycle({ skipTimeCheck: true })
    console.log("[agent/run] Cycle complete:", JSON.stringify(result))
    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error("[agent/run] Error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
