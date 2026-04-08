// =====================================================
// Areté Agent Service — Entry Point
// =====================================================
import "dotenv/config"
import express from "express"
import { initQueue, getQueue } from "./queue"
import { setupWorkers } from "./workers/orchestrator"

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 4000

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "arete-agent-service", timestamp: new Date().toISOString() })
})

// Start agent for an organization (called by Areté API)
app.post("/start", async (req, res) => {
  const { organization_id } = req.body
  if (!organization_id) return res.status(400).json({ error: "organization_id required" })

  const queue = getQueue()
  await queue.add("orchestrate", { organization_id, action: "start" }, {
    jobId: `orch-${organization_id}`,
    removeOnComplete: true,
  })

  res.json({ ok: true, message: `Agent started for org ${organization_id}` })
})

// Pause agent for an organization
app.post("/pause", async (req, res) => {
  const { organization_id } = req.body
  if (!organization_id) return res.status(400).json({ error: "organization_id required" })

  const queue = getQueue()
  // Remove repeatable job
  const repeatableJobs = await queue.getRepeatableJobs()
  for (const job of repeatableJobs) {
    if (job.name === "cycle" && job.id === `cycle-${organization_id}`) {
      await queue.removeRepeatableByKey(job.key)
    }
  }

  res.json({ ok: true, message: `Agent paused for org ${organization_id}` })
})

// Initialize
async function main() {
  initQueue()
  setupWorkers()
  app.listen(PORT, () => {
    console.log(`🤖 Areté Agent Service running on port ${PORT}`)
  })
}

main().catch(console.error)
