// Test cookie #2
const COOKIE = "AQEDARhNqeQE2XTKAAABnYEL4wMAAAGdpRhnA04Ale0M-axncbjnVlryLCiuhu053qAo_oplrrSzoPluYKHiyvzTH5bx-QU84t4StMzya829_r8SIFulluCg1sku2f36RhRLXo4G_m6A3VUmMWno7baa"
const RELAY_URL = "https://linkedin-relay.arete-relay.workers.dev"
const RELAY_SECRET = "arete-relay-2026-secret-key"

const jsession = "ajax:" + Math.random().toString(36).slice(2, 8)
const liHeaders = {
  "Cookie": `li_at=${COOKIE}; JSESSIONID="${jsession}"; lang=v=2&lang=es-es`,
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "application/vnd.linkedin.normalized+json+2.1",
  "Accept-Language": "es-ES,es;q=0.9",
  "X-Li-Lang": "es_ES",
  "X-Restli-Protocol-Version": "2.0.0",
  "Csrf-Token": jsession,
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "Referer": "https://www.linkedin.com/feed/",
}

async function testRelay(name, url) {
  const res = await fetch(RELAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Relay-Secret": RELAY_SECRET },
    body: JSON.stringify({ url, method: "GET", headers: liHeaders }),
  })
  const data = await res.json()
  console.log(`[${name}] status=${data.status} bodyLen=${data.body?.length || 0}`)
  if (data.status !== 200) {
    console.log(`  set-cookie: ${(data.headers?.["set-cookie"] || "").substring(0, 200)}`)
  }
  if (data.status === 200 && data.body?.length > 0) {
    try {
      const json = JSON.parse(data.body)
      const included = json.included?.length || 0
      console.log(`  included=${included}`)
      // Show profile name from /me
      if (name === "1_me") {
        const p = json.included?.find(i => i.publicIdentifier) || json.miniProfile
        console.log(`  profile: ${p?.firstName || p?.publicIdentifier || JSON.stringify(json).substring(0, 200)}`)
      }
      // Show connections
      if (name.includes("conn")) {
        const people = (json.included || []).filter(i => i.publicIdentifier && i.firstName)
        console.log(`  people found: ${people.length}`)
        for (const p of people.slice(0, 3)) {
          console.log(`    - ${p.firstName} ${p.lastName} (${p.publicIdentifier})`)
        }
      }
    } catch { console.log(`  body: ${data.body.substring(0, 200)}`) }
  }
  return data.status
}

async function main() {
  console.log(`Cookie: ${COOKIE.substring(0,15)}...${COOKIE.substring(COOKIE.length-10)} (${COOKIE.length} chars)`)
  console.log("---")

  const s1 = await testRelay("1_me", "https://www.linkedin.com/voyager/api/me")
  if (s1 !== 200) {
    console.log("\n❌ COOKIE INVALID")

    // Also try direct
    console.log("\nTrying DIRECT (no relay)...")
    const dr = await fetch("https://www.linkedin.com/voyager/api/me", {
      headers: liHeaders,
      redirect: "manual",
    })
    console.log(`Direct: status=${dr.status}`)
    if (dr.status === 200) console.log("✅ Direct works — relay issue")
    else console.log("❌ Direct also fails — cookie truly expired")
    return
  }

  console.log("\n✅ COOKIE VALID — testing connections...")
  console.log("---")

  await testRelay("2_connections_dash",
    "https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16&count=10&q=search&start=0&sortType=RECENTLY_ADDED")

  await testRelay("3_connections_classic",
    "https://www.linkedin.com/voyager/api/relationships/connections?count=10&start=0&sortType=RECENTLY_ADDED")

  await testRelay("3_search_rest",
    "https://www.linkedin.com/voyager/api/search/dash/clusters?decorationId=com.linkedin.voyager.dash.deco.search.SearchClusterCollection-175&origin=GLOBAL_SEARCH_HEADER&q=all&query=(keywords:test,flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE))))&start=0&count=5")

  // DO NOT test GraphQL endpoints — they kill sessions with outdated queryIds!

  console.log("\n--- DONE ---")
}

main().catch(console.error)
