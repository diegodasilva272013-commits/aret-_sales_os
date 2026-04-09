// Cloudflare Worker — LinkedIn API Relay
// Deploy free at workers.cloudflare.com
// This relays LinkedIn API requests through Cloudflare's edge IPs
// instead of AWS/Vercel datacenter IPs.

const RELAY_SECRET = "arete-relay-2026-secret-key"

export default {
  async fetch(request) {
    // Only POST allowed
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 })
    }

    // Auth check
    const auth = request.headers.get("X-Relay-Secret")
    if (auth !== RELAY_SECRET) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Read the relay request
    const body = await request.json()
    const { url, method, headers, bodyContent } = body

    if (!url || !url.startsWith("https://www.linkedin.com/")) {
      return new Response("Invalid URL", { status: 400 })
    }

    // Forward to LinkedIn
    const init = {
      method: method || "GET",
      headers: headers || {},
      redirect: "manual",
    }
    if (bodyContent && method !== "GET") {
      init.body = JSON.stringify(bodyContent)
    }

    const res = await fetch(url, init)
    
    // Collect response
    const responseBody = await res.text()
    const responseHeaders = {}
    for (const [k, v] of res.headers) {
      responseHeaders[k] = v
    }

    return new Response(JSON.stringify({
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
      body: responseBody,
    }), {
      headers: { "Content-Type": "application/json" },
    })
  },
}
