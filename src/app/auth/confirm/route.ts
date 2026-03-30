import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Supabase redirige aquí al confirmar email o al resetear contraseña
// URL: /auth/confirm?token_hash=xxx&type=email|recovery&next=/dashboard
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as "email" | "recovery" | null
  const next = searchParams.get("next") ?? "/dashboard"

  if (token_hash && type) {
    const redirectTo = type === "recovery" ? "/auth/reset" : next
    const redirectUrl = new URL(redirectTo, req.url)

    // Crear response primero para poder setear cookies en ella
    const response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      return response
    }
  }

  // Si algo falla, mandar al login con mensaje
  return NextResponse.redirect(new URL("/login?error=invalid_link", req.url))
}
