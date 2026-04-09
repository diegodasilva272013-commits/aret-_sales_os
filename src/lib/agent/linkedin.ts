// =====================================================
// Areté Sales OS — LinkedIn HTTP API Client
// =====================================================
// Uses session cookie (li_at) to interact with LinkedIn's
// internal API. No browser needed — runs on Vercel.
// Supports residential proxy via PROXY_URL env var.
// Mimics real Chrome browser to avoid detection.
// =====================================================

import { ProxyAgent } from "undici"
import { createClient } from "@supabase/supabase-js"

const LI_BASE = "https://www.linkedin.com"

interface LinkedInSession {
  sessionCookie: string
  accountId: string
}

/** Get proxy dispatcher if PROXY_URL is configured */
function getDispatcher(): ProxyAgent | undefined {
  const proxyUrl = process.env.PROXY_URL
  if (!proxyUrl) return undefined
  return new ProxyAgent(proxyUrl)
}

/** Save updated cookies back to DB when LinkedIn sends set-cookie */
async function persistCookies(res: Response, session: LinkedInSession): Promise<void> {
  try {
    const setCookie = res.headers.get("set-cookie")
    if (!setCookie) return
    // Extract new li_at if LinkedIn rotated it
    const liAtMatch = setCookie.match(/li_at=([^;]+)/)
    if (liAtMatch && liAtMatch[1] !== session.sessionCookie) {
      const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      await sb.from("agent_linkedin_accounts")
        .update({ session_cookie: liAtMatch[1] })
        .eq("id", session.accountId)
      session.sessionCookie = liAtMatch[1] // Update in-memory too
    }
  } catch { /* non-critical */ }
}

/** Proxy-aware fetch — routes through residential proxy when configured */
async function liFetch(url: string, init?: RequestInit, session?: LinkedInSession): Promise<Response> {
  const dispatcher = getDispatcher()
  const res = dispatcher
    ? await fetch(url, { ...init, dispatcher } as never)
    : await fetch(url, init)
  // Persist any cookie rotations
  if (session) await persistCookies(res, session)
  return res
}

/** Full Chrome-like headers to avoid bot detection */
function headers(session: LinkedInSession) {
  return {
    "Cookie": `li_at=${session.sessionCookie}; JSESSIONID="ajax:0"; lang=v=2&lang=es-es`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/vnd.linkedin.normalized+json+2.1",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    "Accept-Encoding": "gzip, deflate, br",
    "X-Li-Lang": "es_ES",
    "X-Li-Page-Instance": `urn:li:page:d_flagship3_feed;${crypto.randomUUID()}`,
    "X-Li-Track": '{"clientVersion":"1.13.22","mpVersion":"1.13.22","osName":"web","timezoneOffset":-3,"deviceFormFactor":"DESKTOP","mpName":"voyager-web"}',
    "X-Restli-Protocol-Version": "2.0.0",
    "Csrf-Token": "ajax:0",
    "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-origin",
    "Referer": "https://www.linkedin.com/feed/",
  }
}

/** Random delay between min and max ms */
function delay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  return new Promise(r => setTimeout(r, ms))
}

/** Check if session cookie is still valid. Returns { valid, detail } for debug info. */
export async function validateSession(session: LinkedInSession): Promise<boolean> {
  const info = await validateSessionDetailed(session)
  return info.valid
}

export async function validateSessionDetailed(session: LinkedInSession): Promise<{ valid: boolean; detail: string }> {
  try {
    const res = await liFetch(`${LI_BASE}/voyager/api/me`, {
      headers: headers(session),
      redirect: "manual",
    }, session)
    // LinkedIn returns 200 for valid session, 401/403 for invalid,
    // or 3xx redirect to login for expired cookies
    if (!res.ok) return { valid: false, detail: `HTTP ${res.status} ${res.statusText}` }
    const text = await res.text()
    // If the response is empty or contains "login", the cookie is invalid
    if (!text) return { valid: false, detail: "Empty response body" }
    if (text.includes("/uas/login")) return { valid: false, detail: "Response contains login redirect" }
    // Try to extract profile info for logging
    try {
      const json = JSON.parse(text)
      const name = json?.miniProfile?.firstName || json?.plainId || "ok"
      return { valid: true, detail: `Session valid (${name})` }
    } catch {
      return { valid: true, detail: `Session valid (${text.length} bytes)` }
    }
  } catch (e) {
    return { valid: false, detail: `Fetch error: ${String(e)}` }
  }
}

/** View a LinkedIn profile */
export async function viewProfile(
  session: LinkedInSession,
  publicId: string
): Promise<{ success: boolean; profileData?: Record<string, unknown>; error?: string }> {
  try {
    const res = await liFetch(
      `${LI_BASE}/voyager/api/identity/dash/profiles?q=memberIdentity&memberIdentity=${encodeURIComponent(publicId)}`,
      { headers: headers(session) },
      session
    )
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
    const data = await res.json()
    // Profile data is in the included array
    const profile = data?.included?.[0] || data
    return { success: true, profileData: profile }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

/** Like a post by URN */
export async function likePost(
  session: LinkedInSession,
  activityUrn: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await liFetch(`${LI_BASE}/voyager/api/voyagerSocialDashReactions?threadUrn=${encodeURIComponent(activityUrn)}`, {
      method: "POST",
      headers: { ...headers(session), "Content-Type": "application/json" },
      body: JSON.stringify({ reactionType: "LIKE" }),
    }, session)
    return { success: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

/** Comment on a post */
export async function commentOnPost(
  session: LinkedInSession,
  activityUrn: string,
  comment: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await liFetch(`${LI_BASE}/voyager/api/voyagerSocialDashComments`, {
      method: "POST",
      headers: { ...headers(session), "Content-Type": "application/json" },
      body: JSON.stringify({
        threadUrn: activityUrn,
        comment: { values: [{ attributes: [], value: comment }] },
      }),
    }, session)
    return { success: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

/** Send connection request */
export async function sendConnection(
  session: LinkedInSession,
  profileUrn: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      trackingId: crypto.randomUUID(),
      inviteeProfileUrn: profileUrn,
    }
    if (note) body.message = note.slice(0, 280)

    const res = await liFetch(`${LI_BASE}/voyager/api/voyagerRelationshipsDashMemberRelationships?action=verifyQuotaAndCreate`, {
      method: "POST",
      headers: { ...headers(session), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, session)
    return { success: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

/** Send a direct message */
export async function sendMessage(
  session: LinkedInSession,
  profileUrn: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get or create conversation
    const res = await liFetch(`${LI_BASE}/voyager/api/voyagerMessagingDashMessengerMessages?action=createMessage`, {
      method: "POST",
      headers: { ...headers(session), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { body: { text: message } },
        mailboxUrn: "urn:li:fsd_profile:me",
        recipients: [profileUrn],
      }),
    }, session)
    return { success: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

/** Search for prospects matching ICP criteria */
export async function searchPeople(
  session: LinkedInSession,
  params: {
    keywords?: string
    industries?: string[]
    titles?: string[]
    locations?: string[]
    start?: number
    count?: number
  }
): Promise<{ success: boolean; results?: Array<{ publicId: string; fullName: string; headline: string; company: string; location: string; profileUrn: string }>; error?: string }> {
  try {
    const keywords = params.keywords || ""
    const start = params.start || 0

    // Use GraphQL endpoint — the REST dash/clusters endpoint returns 500
    const vars = `(start:${start},origin:GLOBAL_SEARCH_HEADER,query:(keywords:${encodeURIComponent(keywords)},flagshipSearchIntent:SEARCH_SRP,queryParameters:List((key:resultType,value:List(PEOPLE)))))`
    const url = `${LI_BASE}/voyager/api/graphql?variables=${vars}&queryId=voyagerSearchDashClusters.b0928897b71bd00a5a7291755dcd64f0`

    const res = await liFetch(url, {
      headers: headers(session),
      redirect: "manual",
    }, session)

    if (res.status >= 300) return { success: false, error: `HTTP ${res.status} (redirect/error)` }
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` }

    const data = await res.json()
    const results: Array<{ publicId: string; fullName: string; headline: string; company: string; location: string; profileUrn: string }> = []

    const included = data?.included || []

    // Primary: EntityResultViewModel items have navigationUrl with /in/publicId and title.text
    for (const item of included) {
      if (item.navigationUrl && item.navigationUrl.includes("/in/")) {
        const match = item.navigationUrl.match(/\/in\/([^/?]+)/)
        if (match) {
          results.push({
            publicId: match[1],
            fullName: item.title?.text || "",
            headline: item.primarySubtitle?.text || "",
            company: item.secondarySubtitle?.text || "",
            location: item.summary?.text || "",
            profileUrn: item.entityUrn || item["*entityUrn"] || "",
          })
        }
      }
    }

    // Fallback: Profile type items in included
    if (results.length === 0) {
      for (const item of included) {
        if (item.$type?.includes("Profile") && (item.publicIdentifier || item.firstName)) {
          results.push({
            publicId: item.publicIdentifier || "",
            fullName: `${item.firstName || ""} ${item.lastName || ""}`.trim(),
            headline: item.headline || item.occupation || "",
            company: "",
            location: item.geoLocation || item.location || "",
            profileUrn: item.entityUrn || "",
          })
        }
      }
    }

    return { success: true, results }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

/** Get recent posts from a profile */
export async function getProfilePosts(
  session: LinkedInSession,
  publicId: string,
  count = 5
): Promise<{ success: boolean; posts?: Array<{ urn: string; text: string; likeCount: number }>; error?: string }> {
  try {
    const res = await liFetch(
      `${LI_BASE}/voyager/api/identity/profileUpdatesV2?profileUrn=urn:li:fsd_profile:${encodeURIComponent(publicId)}&q=memberShareFeed&count=${count}`,
      { headers: headers(session) },
      session
    )
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` }

    const data = await res.json()
    const posts: Array<{ urn: string; text: string; likeCount: number }> = []

    for (const el of data?.elements || []) {
      const commentary = el?.commentary?.text?.text || el?.value?.com?.linkedin?.voyager?.feed?.render?.UpdateV2?.commentary?.text?.text || ""
      if (commentary) {
        posts.push({
          urn: el.updateUrn || el["*socialDetail"] || "",
          text: commentary,
          likeCount: el?.socialDetail?.totalSocialActivityCounts?.numLikes || 0,
        })
      }
    }

    return { success: true, posts }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export { delay, type LinkedInSession }
