import { createClient } from "@/lib/supabase/server"
import VideoClient from "@/components/VideoClient"

export default async function VideoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, is_owner")
    .eq("id", user.id)
    .single()

  let recordingsQuery = supabase
    .from("video_recordings")
    .select("id, room_name, duration, recording_url, transcript, status, created_at, prospect_id")
    .eq("organization_id", profile?.organization_id)
    .order("created_at", { ascending: false })

  let prospectsQuery = supabase
    .from("prospects")
    .select("id, full_name, company, whatsapp_number")
    .order("full_name")

  if (!profile?.is_owner) {
    prospectsQuery = prospectsQuery.eq("assigned_to", user.id)
  } else {
    prospectsQuery = prospectsQuery.eq("organization_id", profile?.organization_id)
  }

  const [{ data: recordings }, { data: prospects }] = await Promise.all([
    recordingsQuery,
    prospectsQuery,
  ])

  const ids = (recordings || []).map(r => r.id)
  const { data: analyses } = ids.length > 0
    ? await supabase.from("video_analyses").select("*").in("video_recording_id", ids)
    : { data: [] }

  return <VideoClient recordings={recordings as any} analyses={analyses as any} prospects={prospects as any} />
}
