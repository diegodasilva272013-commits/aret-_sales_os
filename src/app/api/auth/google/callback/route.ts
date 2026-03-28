import { NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  if (!code) return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=no_code`)

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CALENDAR_CLIENT_ID,
      process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
    )

    const { tokens } = await oauth2Client.getToken(code)

    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error("No user session in callback:", userError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=no_session`)
    }

    const { error: updateError } = await supabase.from("profiles").update({
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token,
      google_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    }).eq("id", user.id)

    if (updateError) {
      console.error("Error saving tokens:", updateError)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=save_failed`)
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?success=google_connected`)
  } catch (e) {
    console.error("Google callback error:", e)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/settings?error=callback_failed`)
  }
}
