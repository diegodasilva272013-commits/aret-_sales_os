import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import BusinessDetail from "@/components/BusinessDetail"

export default async function BusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: business }, { data: analysis }, { data: messages }, { data: followUps }] = await Promise.all([
    supabase.from("businesses").select("*, profiles!assigned_to(*)").eq("id", id).single(),
    supabase.from("business_analyses").select("*").eq("business_id", id).single(),
    supabase.from("business_messages").select("*").eq("business_id", id).order("follow_up_number"),
    supabase.from("business_follow_ups").select("*, profiles!setter_id(*)").eq("business_id", id).order("follow_up_number"),
  ])

  if (!business) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  return <BusinessDetail business={business} analysis={analysis} messages={messages || []} followUps={followUps || []} currentUserId={user?.id || ""} />
}
