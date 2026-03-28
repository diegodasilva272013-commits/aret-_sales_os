import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Supabase redirige aquí al confirmar email o al resetear contraseña
// URL: /auth/confirm?token_hash=xxx&type=email|recovery&next=/dashboard
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as "email" | "recovery" | null
  const next = searchParams.get("next") ?? "/dashboard"

  if (token_hash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })

    if (!error) {
      if (type === "recovery") {
        return NextResponse.redirect(new URL("/auth/reset", req.url))
      }
      return NextResponse.redirect(new URL(next, req.url))
    }
  }

  // Si algo falla, mandar al login con mensaje
  return NextResponse.redirect(new URL("/login?error=invalid_link", req.url))
}
