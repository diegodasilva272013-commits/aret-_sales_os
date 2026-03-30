import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import TeamClient from "@/components/TeamClient"

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_owner, organization_id")
    .eq("id", user?.id || "")
    .single()

  if (!profile?.is_owner) redirect("/dashboard")

  const orgId = profile.organization_id

  // Team members
  const { data: team } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, is_owner, created_at")
    .eq("organization_id", orgId)
    .order("created_at")

  // All prospects
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, full_name, company, status, phase, follow_up_count, assigned_to, created_at, last_contact_at, linkedin_url, instagram_url, source_type")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })

  // All businesses
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, category, city, assigned_to, created_at, status")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })

  // Scheduled calls
  const { data: calls } = await supabase
    .from("scheduled_calls")
    .select("id, prospect_id, setter_id, scheduled_at, status, notes, prospects(full_name, company)")
    .eq("organization_id", orgId)
    .order("scheduled_at", { ascending: false })

  // Call recordings
  const { data: recordings } = await supabase
    .from("call_recordings")
    .select("id, user_id, prospect_id, duration, created_at, prospects(full_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100)

  // Video rooms
  const { data: videoRooms } = await supabase
    .from("video_rooms")
    .select("id, room_name, created_by, prospect_id, status, created_at, prospects(full_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50)

  // WhatsApp message counts per prospect
  const { data: whatsappMessages } = await supabase
    .from("whatsapp_messages")
    .select("id, prospect_id, direction, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(500)

  return (
    <TeamClient 
      team={team || []}
      prospects={prospects || []}
      businesses={businesses || []}
      calls={calls || []}
      recordings={recordings || []}
      videoRooms={videoRooms || []}
      whatsappMessages={whatsappMessages || []}
      currentUserId={user?.id || ""}
    />
  )
}
