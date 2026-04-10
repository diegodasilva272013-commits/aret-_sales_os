#!/usr/bin/env node
// =====================================================
// Areté Local Relay — LinkedIn API Proxy
// =====================================================
// Runs on your PC. Cloudflare Tunnel exposes it.
// Vercel calls this → your residential IP → LinkedIn.
// LinkedIn sees YOUR home IP, not a datacenter.
// =====================================================

import http from "node:http"

const PORT = 3847
const RELAY_SECRET = "arete-relay-2026-secret-key"

const server = http.createServer(async (req, res) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" })
    res.end()
    return
  }

  // Only POST
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "text/plain" })
    res.end("Method not allowed")
    return
  }

  // Auth check
  if (req.headers["x-relay-secret"] !== RELAY_SECRET) {
    res.writeHead(401, { "Content-Type": "text/plain" })
    res.end("Unauthorized")
    return
  }

  // Read body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = JSON.parse(Buffer.concat(chunks).toString())

  const { url, method, headers: hdrs, bodyContent } = body

  if (!url || !url.startsWith("https://www.linkedin.com/")) {
    res.writeHead(400, { "Content-Type": "text/plain" })
    res.end("Invalid URL")
    return
  }

  const startTime = Date.now()
  console.log(`[${new Date().toLocaleTimeString()}] → ${method || "GET"} ${url.substring(0, 80)}...`)

  try {
    const init = {
      method: method || "GET",
      headers: hdrs || {},
      redirect: "manual",
    }
    if (bodyContent && method !== "GET") {
      init.body = JSON.stringify(bodyContent)
    }

    const liRes = await fetch(url, init)
    const responseBody = await liRes.text()
    const responseHeaders = {}
    for (const [k, v] of liRes.headers) {
      responseHeaders[k] = v
    }

    const elapsed = Date.now() - startTime
    console.log(`[${new Date().toLocaleTimeString()}] ← ${liRes.status} (${elapsed}ms, ${responseBody.length} bytes)`)

    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({
      status: liRes.status,
      statusText: liRes.statusText,
      headers: responseHeaders,
      body: responseBody,
    }))
  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] ERROR:`, err.message)
    res.writeHead(200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({
      status: 500,
      statusText: "Relay Error",
      headers: {},
      body: JSON.stringify({ error: err.message }),
    }))
  }
})

server.listen(PORT, () => {
  console.log(`\n🚀 Areté Local Relay running on http://localhost:${PORT}`)
  console.log(`📡 Waiting for Cloudflare Tunnel connection...\n`)
  console.log(`LinkedIn requests will go through YOUR residential IP.`)
  console.log(`Keep this window open while the agent runs.\n`)
})
