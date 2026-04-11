import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function proxy(request: NextRequest) {
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
  const isPublicRoute = request.nextUrl.pathname.startsWith("/auth/")
    || request.nextUrl.pathname.startsWith("/legal")
    || request.nextUrl.pathname.startsWith("/onboarding")
    || request.nextUrl.pathname.startsWith("/join")
  const isWebhook = request.nextUrl.pathname.startsWith("/api/whatsapp/webhook")
    || request.nextUrl.pathname.startsWith("/api/calls/twiml")
    || request.nextUrl.pathname.startsWith("/api/calls/recording")
    || request.nextUrl.pathname.startsWith("/api/video/join")
    || request.nextUrl.pathname.startsWith("/videollamada")
    || request.nextUrl.pathname === "/join.html"
    || request.nextUrl.pathname.startsWith("/api/video/composition")
    || request.nextUrl.pathname.startsWith("/api/video/upload")
    || request.nextUrl.pathname.startsWith("/api/stripe")
    || request.nextUrl.pathname.startsWith("/api/director/webhook/meta")
    || request.nextUrl.pathname.startsWith("/api/agent/cron")
    || request.nextUrl.pathname.startsWith("/api/agent/test-run")
    || request.nextUrl.pathname.startsWith("/api/agent/debug-env")

  if (!user && !isAuthPage && !isPublicRoute && !isWebhook) {
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

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
