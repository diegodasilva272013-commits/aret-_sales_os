import { createClient } from "@/lib/supabase/server"
import VideoClient from "@/components/VideoClient"

export default async function VideoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  const [{ data: recordings }, { data: prospects }] = await Promise.all([
    supabase
      .from("video_recordings")
      .select("id, room_name, duration, recording_url, transcript, status, created_at, prospect_id")
      .eq("organization_id", profile?.organization_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("prospects")
      .select("id, full_name, company, whatsapp_number")
      .eq("organization_id", profile?.organization_id)
      .order("full_name"),
  ])

  const ids = (recordings || []).map(r => r.id)
  const { data: analyses } = ids.length > 0
    ? await supabase.from("video_analyses").select("*").in("video_recording_id", ids)
    : { data: [] }

  return <VideoClient recordings={recordings as any} analyses={analyses as any} prospects={prospects as any} />
}
