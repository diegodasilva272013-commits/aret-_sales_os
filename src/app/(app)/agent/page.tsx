import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AgentSettingsPage from "@/components/agent/AgentSettingsPage"

export default async function AgentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) redirect("/onboarding")

  return (
    <div className="min-h-screen p-8 page-enter" style={{ background: "var(--background)" }}>
      <div className="max-w-4xl mx-auto">
        <AgentSettingsPage />
      </div>
    </div>
  )
}
