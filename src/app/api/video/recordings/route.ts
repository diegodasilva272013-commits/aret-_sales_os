import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const prospectId = req.nextUrl.searchParams.get("prospectId")
  if (!prospectId) return NextResponse.json({ recordings: [], analyses: [] })

  const { data: recordings } = await supabase
    .from("video_recordings")
    .select("*")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false })

  const ids = (recordings || []).map(r => r.id)
  const { data: analyses } = ids.length > 0
    ? await supabase.from("video_analyses").select("*").in("video_recording_id", ids)
    : { data: [] }

  return NextResponse.json({ recordings: recordings || [], analyses: analyses || [] })
}
