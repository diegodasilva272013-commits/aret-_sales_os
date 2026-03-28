import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Sidebar from "@/components/Sidebar"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, organizations(*)")
      .eq("id", user.id)
      .single()

    // Si no tiene org, ir a onboarding
    if (profile && !profile.organization_id) {
      redirect("/onboarding")
    }

    // Mensajes inbound no leídos (para badge en sidebar)
    const { count: unreadMessages } = await supabase
      .from("whatsapp_messages")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", profile?.organization_id)
      .eq("direction", "inbound")
      .eq("status", "received")

    // Prospectos activos sin contacto hace más de 2 días (para badge)
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const { count: pendingCount } = await supabase
      .from("prospects")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", user.id)
      .eq("status", "activo")
      .or(`last_contact_at.lt.${twoDaysAgo},last_contact_at.is.null`)

    // Notificación automática: si hay pendientes y no se notificó en las últimas 24hs
    if ((pendingCount || 0) > 0) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const lastNotif = (profile as any)?.last_notification_sent_at
      if (!lastNotif || lastNotif < oneDayAgo) {
        // Disparar en background sin bloquear el render
        fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/self`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        }).catch(() => {})
      }
    }

    return (
      <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)" }}>
        <Sidebar profile={profile} org={profile?.organizations || null} pendingFollowUps={pendingCount || 0} unreadMessages={unreadMessages || 0} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    )
  } catch (e: unknown) {
    if (e instanceof Error && e.message?.includes("NEXT_REDIRECT")) throw e
    redirect("/login")
  }
}
