// =====================================================
// Areté Sales OS — LinkedIn HTTP API Client
// =====================================================
// Uses session cookie (li_at) to interact with LinkedIn's
// internal API. No browser needed — runs on Vercel.
// =====================================================

const LI_BASE = "https://www.linkedin.com"
const LI_API = "https://api.linkedin.com"

interface LinkedInSession {
  sessionCookie: string
  accountId: string
}

function headers(session: LinkedInSession) {
  return {
    "Cookie": `li_at=${session.sessionCookie}; JSESSIONID="ajax:0"`,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "application/vnd.linkedin.normalized+json+2.1",
    "X-Li-Lang": "es_ES",
    "X-Restli-Protocol-Version": "2.0.0",
    "Csrf-Token": "ajax:0",
  }
}

/** Random delay between min and max ms */
function delay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  return new Promise(r => setTimeout(r, ms))
}

/** Check if session cookie is still valid */
export async function validateSession(session: LinkedInSession): Promise<boolean> {
  try {
    const res = await fetch(`${LI_BASE}/voyager/api/me`, {
      headers: headers(session),
      redirect: "manual",
    })
    // LinkedIn returns 200 for valid session, 401/403 for invalid,
    // or 3xx redirect to login for expired cookies
    if (!res.ok) return false
    const text = await res.text()
    // If the response is empty or contains "login", the cookie is invalid
    if (!text || text.includes("/uas/login")) return false
    return true
  } catch {
    return false
  }
}

/** View a LinkedIn profile */
export async function viewProfile(
  session: LinkedInSession,
  publicId: string
): Promise<{ success: boolean; profileData?: Record<string, unknown>; error?: string }> {
  try {
    const res = await fetch(
      `${LI_BASE}/voyager/api/identity/profiles/${encodeURIComponent(publicId)}`,
      { headers: headers(session) }
    )
    if (!res.ok) return { success: false, error: `HTTP ${res.status}` }
    const data = await res.json()
    return { success: true, profileData: data }
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
    const res = await fetch(`${LI_BASE}/voyager/api/voyagerSocialDashReactions?threadUrn=${encodeURIComponent(activityUrn)}`, {
      method: "POST",
      headers: { ...headers(session), "Content-Type": "application/json" },
      body: JSON.stringify({ reactionType: "LIKE" }),
    })
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
    const res = await fetch(`${LI_BASE}/voyager/api/voyagerSocialDashComments`, {
      method: "POST",
      headers: { ...headers(session), "Content-Type": "application/json" },
      body: JSON.stringify({
        threadUrn: activityUrn,
        comment: { values: [{ attributes: [], value: comment }] },
      }),
    })
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

    const res = await fetch(`${LI_BASE}/voyager/api/voyagerRelationshipsDashMemberRelationships?action=verifyQuotaAndCreate`, {
      method: "POST",
      headers: { ...headers(session), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
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
    const res = await fetch(`${LI_BASE}/voyager/api/voyagerMessagingDashMessengerMessages?action=createMessage`, {
      method: "POST",
      headers: { ...headers(session), "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { body: { text: message } },
        mailboxUrn: "urn:li:fsd_profile:me",
        recipients: [profileUrn],
      }),
    })
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
    const searchParams = new URLSearchParams({
      decorationId: "com.linkedin.voyager.dash.deco.search.SearchClusterCollection-175",
      q: "all",
      start: String(params.start || 0),
      count: String(params.count || 10),
      origin: "GLOBAL_SEARCH_HEADER",
    })

    if (params.keywords) searchParams.set("keywords", params.keywords)

    const res = await fetch(
      `${LI_BASE}/voyager/api/graphql?variables=(${searchParams.toString()})&queryId=voyagerSearchDashClusters.bb251bf4a82e80e325e48b3e72a0301a`,
      { headers: headers(session) }
    )

    if (!res.ok) return { success: false, error: `HTTP ${res.status}` }

    const data = await res.json()
    const results: Array<{ publicId: string; fullName: string; headline: string; company: string; location: string; profileUrn: string }> = []

    // Parse LinkedIn's nested response structure
    const included = data?.included || []
    for (const item of included) {
      if (item.$type === "com.linkedin.voyager.dash.identity.profile.Profile" || item.publicIdentifier) {
        results.push({
          publicId: item.publicIdentifier || "",
          fullName: `${item.firstName || ""} ${item.lastName || ""}`.trim(),
          headline: item.headline || "",
          company: item.companyName || "",
          location: item.geoLocation || item.location || "",
          profileUrn: item.entityUrn || "",
        })
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
    const res = await fetch(
      `${LI_BASE}/voyager/api/identity/profileUpdatesV2?profileUrn=urn:li:fsd_profile:${encodeURIComponent(publicId)}&q=memberShareFeed&count=${count}`,
      { headers: headers(session) }
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
