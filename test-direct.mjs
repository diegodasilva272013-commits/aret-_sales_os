// Test: direct fetch to LinkedIn (no relay) to see if the cookie works at all
const COOKIE = "AQEDARhNqeQERCvMAAABnYEEVY0AAAGdpRDZjU4AsQcdwSE6BT3MZ4mevjBohLVOeGflAaB6PBQvPFxRnzS116hRMkNlG7-4lIz94VWLCe3yE3Vzv8figYot-YXZdRsZVFGD84uYr_H-V_vXd5ChtH31"
const jsession = "ajax:direct99"

async function main() {
  console.log(`Cookie: ${COOKIE.substring(0,20)}...${COOKIE.substring(COOKIE.length-20)} (${COOKIE.length} chars)`)
  
  const res = await fetch("https://www.linkedin.com/voyager/api/me", {
    headers: {
      "Cookie": `li_at=${COOKIE}; JSESSIONID="${jsession}"`,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "application/vnd.linkedin.normalized+json+2.1",
      "X-Restli-Protocol-Version": "2.0.0",
      "Csrf-Token": jsession,
    },
    redirect: "manual",
  })
  
  console.log(`Direct fetch: status=${res.status}`)
  console.log(`Location: ${res.headers.get("location") || "none"}`)
  const sc = res.headers.get("set-cookie")
  if (sc) console.log(`Set-Cookie: ${sc.substring(0, 200)}`)
  
  if (res.status === 200) {
    const text = await res.text()
    console.log(`Body length: ${text.length}`)
    try {
      const json = JSON.parse(text)
      console.log(`Profile: ${json.miniProfile?.firstName || json.plainId || "parsed OK"}`)
    } catch {}
    console.log("✅ Cookie is VALID")
  } else {
    console.log("❌ Cookie is INVALID or expired")
  }
}

main().catch(console.error)
