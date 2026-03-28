import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ProspectDetail from "@/components/ProspectDetail"

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: prospect }, { data: analysis }, { data: messages }, { data: followUps }] = await Promise.all([
    supabase.from("prospects").select("*, profiles!assigned_to(*)").eq("id", id).single(),
    supabase.from("prospect_analyses").select("*").eq("prospect_id", id).single(),
    supabase.from("generated_messages").select("*").eq("prospect_id", id).order("follow_up_number"),
    supabase.from("follow_ups").select("*, profiles!setter_id(*)").eq("prospect_id", id).order("follow_up_number"),
  ])

  if (!prospect) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  return (
    <ProspectDetail
      prospect={prospect}
      analysis={analysis}
      messages={messages || []}
      followUps={followUps || []}
      currentUserId={user?.id || ""}
    />
  )
}
