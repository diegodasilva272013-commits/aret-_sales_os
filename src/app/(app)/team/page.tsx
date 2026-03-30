import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import TeamManagementClient from "@/components/TeamManagementClient"

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
    .select("id, full_name, company, status, phase, follow_up_count, assigned_to, created_at, last_contact_at, project_id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })

  // All businesses
  const { data: businesses } = await supabase
    .from("businesses")
    .select("id, name, category, city, assigned_to, created_at, status, project_id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })

  // Scheduled calls
  const { data: calls } = await supabase
    .from("scheduled_calls")
    .select("id, prospect_id, setter_id, scheduled_at, status, notes, prospects(full_name)")
    .eq("organization_id", orgId)
    .order("scheduled_at", { ascending: false })

  // Call recordings
  const { data: recordings } = await supabase
    .from("call_recordings")
    .select("id, user_id, prospect_id, duration, created_at, prospects(full_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200)

  // Video rooms
  const { data: videoRooms } = await supabase
    .from("video_rooms")
    .select("id, room_name, created_by, prospect_id, status, created_at, prospects(full_name)")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100)

  // WhatsApp messages
  const { data: whatsappMessages } = await supabase
    .from("whatsapp_messages")
    .select("id, prospect_id, direction, created_at")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(500)

  // Projects
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, description, status, color, created_at, created_by")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })

  // Project members
  const { data: projectMembers } = await supabase
    .from("project_members")
    .select("id, project_id, user_id, role")

  // Activity log
  const { data: activityLog } = await supabase
    .from("activity_log")
    .select("id, user_id, action, entity_type, entity_id, details, created_at, project_id")
    .eq("organization_id", orgId)
    .order("created_at", { ascending: false })
    .limit(200)

  return (
    <TeamManagementClient 
      team={team || []}
      prospects={prospects || []}
      businesses={businesses || []}
      calls={calls || []}
      recordings={recordings || []}
      videoRooms={videoRooms || []}
      whatsappMessages={whatsappMessages || []}
      projects={projects || []}
      projectMembers={projectMembers || []}
      activityLog={activityLog || []}
      currentUserId={user?.id || ""}
      organizationId={orgId}
    />
  )
}
