// =====================================================
// Areté Agent Service — Webhook Reporter
// =====================================================
// Sends action results back to the Areté Next.js API
// via POST /api/agent/webhook
// =====================================================

const ARETE_API_URL = process.env.ARETE_API_URL || "http://localhost:3000"
const WEBHOOK_SECRET = process.env.AGENT_WEBHOOK_SECRET || ""

export async function reportToArete(event: string, data: Record<string, unknown>) {
  try {
    const res = await fetch(`${ARETE_API_URL}/api/agent/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": WEBHOOK_SECRET,
      },
      body: JSON.stringify({ event, ...data }),
    })

    if (!res.ok) {
      console.error(`❌ Webhook failed: ${res.status} ${await res.text()}`)
    }
  } catch (err) {
    console.error("❌ Webhook error:", err)
  }
}
