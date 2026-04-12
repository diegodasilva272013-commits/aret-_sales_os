// Test saving cookie and running import connections via production API
const BASE = "https://arete-prospector.vercel.app"
const CRON_SECRET = "fbXuJR9GBV87td4sKaHcmMPSLQNOryxT"
const NEW_COOKIE = "AQEDARhNqeQE2XTKAAABnYEL4wMAAAGdpRhnA04Ale0M-axncbjnVlryLCiuhu053qAo_oplrrSzoPluYKHiyvzTH5bx-QU84t4StMzya829_r8SIFulluCg1sku2f36RhRLXo4G_m6A3VUmMWno7baa"

async function main() {
  console.log("=== 1. Get current accounts ===")
  const accRes = await fetch(`${BASE}/api/agent/accounts`, {
    headers: { "Authorization": `Bearer ${CRON_SECRET}` }
  })
  console.log(`GET accounts: ${accRes.status}`)
  if (!accRes.ok) {
    console.log(await accRes.text())
    return
  }
  const accData = await accRes.json()
  const accounts = accData.accounts || []
  console.log(`Accounts: ${accounts.length}`)
  
  if (accounts.length === 0) {
    console.log("No accounts found!")
    return
  }
  
  const acc = accounts[0]
  console.log(`Account: id=${acc.id}, name=${acc.full_name}, cookie_len=${(acc.session_cookie || "").length}`)
  console.log(`Current cookie preview: "${(acc.session_cookie || "").substring(0, 30)}..."`)

  console.log("\n=== 2. Update cookie via PATCH ===")
  const patchRes = await fetch(`${BASE}/api/agent/accounts`, {
    method: "PATCH",
    headers: { 
      "Authorization": `Bearer ${CRON_SECRET}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      accountId: acc.id,
      session_cookie: NEW_COOKIE
    })
  })
  console.log(`PATCH accounts: ${patchRes.status}`)
  const patchData = await patchRes.json()
  console.log(`Result: ${JSON.stringify(patchData).substring(0, 200)}`)

  // Verify it was saved
  console.log("\n=== 3. Verify cookie saved ===")
  const verRes = await fetch(`${BASE}/api/agent/accounts`, {
    headers: { "Authorization": `Bearer ${CRON_SECRET}` }
  })
  const verData = await verRes.json()
  const updAcc = (verData.accounts || []).find(a => a.id === acc.id)
  console.log(`Saved cookie length: ${(updAcc?.session_cookie || "").length}`)
  console.log(`Cookie matches: ${updAcc?.session_cookie === NEW_COOKIE}`)

  console.log("\n=== 4. Validate cookie ===")
  const valRes = await fetch(`${BASE}/api/agent/accounts/validate?accountId=${acc.id}`, {
    headers: { "Authorization": `Bearer ${CRON_SECRET}` }
  })
  console.log(`Validate: ${valRes.status}`)
  const valData = await valRes.json()
  console.log(`Result: ${JSON.stringify(valData).substring(0, 300)}`)
  
  console.log("\n=== 5. Test connections endpoint ===")
  const connRes = await fetch(`${BASE}/api/agent/connections`, {
    headers: { "Authorization": `Bearer ${CRON_SECRET}` }
  })
  console.log(`GET connections: ${connRes.status}`)
  const connData = await connRes.json()
  console.log(`Result: ${JSON.stringify(connData).substring(0, 500)}`)

  if (connData.connections?.length > 0) {
    console.log(`\n✅ Found ${connData.connections.length} connections! First 3:`)
    for (const c of connData.connections.slice(0, 3)) {
      console.log(`  - ${c.fullName} (${c.publicId})`)
    }
  }

  console.log("\n=== 6. Test import connections (POST) ===")
  const importRes = await fetch(`${BASE}/api/agent/connections`, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${CRON_SECRET}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ accountId: acc.id, count: 5 })
  })
  console.log(`POST connections: ${importRes.status}`)
  const importData = await importRes.json()
  console.log(`Result: ${JSON.stringify(importData).substring(0, 500)}`)

  console.log("\n=== DONE ===")
}

main().catch(e => console.error("FATAL:", e))
