import { NextResponse } from "next/server"
import { runAgentCycle } from "@/lib/agent/orchestrator"

/**
 * Vercel Cron Job — runs every 5 minutes.
 * Processes all active agent organizations.
 * Protected by CRON_SECRET header.
 */
export async function GET(req: Request) {
  // Verify Vercel Cron secret
  const authHeader = req.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const result = await runAgentCycle()
    return NextResponse.json({
      ok: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    console.error("Agent cron error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
