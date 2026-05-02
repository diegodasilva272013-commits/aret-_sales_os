// Production health check for LinkedIn Agent.
// Usage:
//   AGENT_BASE_URL="https://arete-prospector.vercel.app" CRON_SECRET="..." node test-e2e-production.mjs
// Optional recovery:
//   LI_AT_COOKIE="..." AGENT_BASE_URL="..." CRON_SECRET="..." node test-e2e-production.mjs

const BASE = process.env.AGENT_BASE_URL || "https://arete-prospector.vercel.app"
const CRON_SECRET = process.env.CRON_SECRET || ""
const NEW_COOKIE = (process.env.LI_AT_COOKIE || "").trim()

if (!CRON_SECRET) {
  console.error("Missing CRON_SECRET env var")
  process.exit(1)
}

async function getJsonOrText(url, init) {
  const res = await fetch(url, init)
  const raw = await res.text()
  let json
  try {
    json = JSON.parse(raw)
  } catch {
    json = null
  }
  return { res, raw, json }
}

async function runCron() {
  const { res, raw, json } = await getJsonOrText(`${BASE}/api/agent/cron`, {
    headers: { authorization: `Bearer ${CRON_SECRET}` },
  })
  console.log(`Cron status: ${res.status}`)
  console.log(json ? JSON.stringify(json, null, 2) : raw.slice(0, 500))
  return json
}

async function debugState() {
  const { res, raw, json } = await getJsonOrText(`${BASE}/api/agent/debug-env?secret=${encodeURIComponent(CRON_SECRET)}`)
  console.log(`Debug status: ${res.status}`)
  console.log(json ? JSON.stringify(json, null, 2) : raw.slice(0, 500))
  return json
}

async function applyCookie(cookie) {
  const { res, raw, json } = await getJsonOrText(`${BASE}/api/agent/debug-env?secret=${encodeURIComponent(CRON_SECRET)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cookie }),
  })
  console.log(`Cookie update status: ${res.status}`)
  console.log(json ? JSON.stringify(json, null, 2) : raw.slice(0, 500))
  return json
}

async function main() {
  console.log("=== 1) Current cron run ===")
  await runCron()

  console.log("\n=== 2) Current LinkedIn debug state ===")
  await debugState()

  if (!NEW_COOKIE) {
    console.log("\nNo LI_AT_COOKIE provided. Skipping cookie recovery step.")
    return
  }

  console.log("\n=== 3) Apply new li_at cookie ===")
  await applyCookie(NEW_COOKIE)

  console.log("\n=== 4) Cron run after cookie update ===")
  await runCron()

  console.log("\n=== 5) Debug state after cookie update ===")
  await debugState()
}

main().catch((e) => {
  console.error("FATAL:", e)
  process.exit(1)
})
