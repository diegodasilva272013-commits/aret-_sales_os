// Test script: verifies cookie → relay → LinkedIn → connections, end to end
const RELAY_URL = "https://linkedin-relay.arete-relay.workers.dev"
const RELAY_SECRET = "arete-relay-2026-secret-key"
const COOKIE = "AQEDARhNqeQERCvMAAABnYEEVY0AAAGdpRDZjU4AsQcdwSE6BT3MZ4mevjBohLVOeGflAaB6PBQvPFxRnzS116hRMkNlG7-4lIz94VWLCe3yE3Vzv8figYot-YXZdRsZVFGD84uYr_H-V_vXd5ChtH31"

const jsession = "ajax:test" + Math.random().toString(36).slice(2, 8)

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
  try {
    const res = await fetch(RELAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Relay-Secret": RELAY_SECRET },
      body: JSON.stringify({ url, method: "GET", headers: liHeaders }),
    })
    const data = await res.json()
    const bodyLen = data.body?.length || 0
    const preview = data.body?.substring(0, 150) || ""
    console.log(`[${name}] status=${data.status} bodyLen=${bodyLen}`)
    if (data.status !== 200) {
      console.log(`  location: ${data.headers?.location || "none"}`)
    }
    if (data.status === 200 && bodyLen > 0) {
      try {
        const json = JSON.parse(data.body)
        const included = json.included?.length || 0
        const elements = json.elements?.length || 0
        console.log(`  included=${included} elements=${elements}`)
        if (name === "1_me") {
          const mini = json.miniProfile || json.included?.find(i => i.publicIdentifier)
          console.log(`  profile: ${mini?.firstName || mini?.publicIdentifier || "?"}`)
        }
      } catch { console.log(`  body: ${preview}`) }
    }
    return data.status
  } catch (e) {
    console.log(`[${name}] ERROR: ${e.message}`)
    return -1
  }
}

async function main() {
  console.log(`Cookie length: ${COOKIE.length}`)
  console.log(`JSESSIONID: ${jsession}`)
  console.log("---")

  // Test 1: /me (validates cookie)
  const s1 = await testRelay("1_me", "https://www.linkedin.com/voyager/api/me")
  
  if (s1 !== 200) {
    console.log("\n❌ COOKIE IS INVALID — LinkedIn returned " + s1)
    console.log("The user needs to get a fresh li_at cookie from Chrome DevTools")
    return
  }
  
  console.log("\n✅ COOKIE IS VALID")
  console.log("---")

  // Test 2: Connections REST
  await testRelay("2_connections_rest", 
    "https://www.linkedin.com/voyager/api/relationships/dash/connections?decorationId=com.linkedin.voyager.dash.deco.web.mynetwork.ConnectionListWithProfile-16&count=10&q=search&start=0&sortType=RECENTLY_ADDED")

  // Test 3: Connections classic
  await testRelay("3_connections_classic",
    "https://www.linkedin.com/voyager/api/relationships/connections?count=10&start=0&sortType=RECENTLY_ADDED")

  // Test 4: GraphQL connections
  await testRelay("4_graphql_connections",
    "https://www.linkedin.com/voyager/api/graphql?variables=(start:0,count:10,origin:MEMBER_PROFILE_CANNED_SEARCH)&queryId=voyagerRelationshipsDashConnections.2dc8bdaddb5e2371ce379b5e9a44fcff")

  // Test 5: Search my network
  await testRelay("5_search_network",
    "https://www.linkedin.com/voyager/api/graphql?variables=(start:0,origin:GLOBAL_SEARCH_HEADER,query:(keywords:*,flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE)),(key:network,value:List(F)))))&queryId=voyagerSearchDashClusters.b0928897b71bd00a5a7291755dcd64f0")

  console.log("\n--- DONE ---")
}

main().catch(console.error)
