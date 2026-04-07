import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isAuthPage = request.nextUrl.pathname.startsWith("/login")
  const isWebhook = request.nextUrl.pathname.startsWith("/api/whatsapp/webhook")
  const isStripe = request.nextUrl.pathname.startsWith("/api/stripe")
  const isWhatsappTest = request.nextUrl.pathname.startsWith("/api/whatsapp/test")
  const isMetaWebhook = request.nextUrl.pathname.startsWith("/api/director/webhook/meta")
  const isJoinPage = request.nextUrl.pathname.startsWith("/join")
  const isLegalPage = request.nextUrl.pathname.startsWith("/legal")
  const isPublicPage = isAuthPage || isWebhook || isStripe || isWhatsappTest || isMetaWebhook || isJoinPage || isLegalPage

  if (!user && !isPublicPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
