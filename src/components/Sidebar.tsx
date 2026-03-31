"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { SetterProfile } from "@/types"

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/prospects",
    label: "Prospectos",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    href: "/prospects/new",
    label: "Nuevo Prospecto",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
    highlight: true,
  },
  {
    href: "/messages",
    label: "Mensajes",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    ),
  },
  {
    href: "/whatsapp",
    label: "WA Masivo",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
      </svg>
    ),
  },
  {
    href: "/calls",
    label: "Agendas",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: "/phone",
    label: "Llamadas",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.86a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
      </svg>
    ),
  },
  {
    href: "/video",
    label: "Videollamadas",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
      </svg>
    ),
  },
  {
    href: "/pipeline",
    label: "Pipeline",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="4" height="18" rx="1" />
        <rect x="10" y="6" width="4" height="15" rx="1" />
        <rect x="17" y="9" width="4" height="12" rx="1" />
      </svg>
    ),
  },
  {
    href: "/find",
    label: "Buscar Empresas",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
    ),
  },
  {
    href: "/businesses",
    label: "Empresas",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        <line x1="12" y1="12" x2="12" y2="16" />
        <line x1="10" y1="14" x2="14" y2="14" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Configuración",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
      </svg>
    ),
  },
]

type OrgInfo = { name: string; plan: string; analyses_used: number; plan_limit: number; searches_used?: number; search_limit?: number; logo_url?: string } | null

export default function Sidebar({ profile, org, pendingFollowUps = 0, unreadMessages = 0 }: { profile: (SetterProfile & { is_owner?: boolean }) | null; org?: OrgInfo; pendingFollowUps?: number; unreadMessages?: number }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()
    : "?"

  return (
    <aside className="w-64 flex flex-col h-full shrink-0" style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}>
      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: org?.logo_url ? "transparent" : "linear-gradient(135deg, var(--accent), #7c3aed)", border: org?.logo_url ? "1px solid var(--border)" : "none" }}>
            {org?.logo_url ? (
              <img src={org.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            )}
          </div>
          <div>
            <p className="font-bold text-sm truncate max-w-[140px]" suppressHydrationWarning style={{ color: "var(--text-primary)" }}>{org?.name || "Prospector AI"}</p>
            <p className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>{org?.plan || "free"} · {org?.analyses_used || 0}/{org?.plan_limit || 50}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {/* Control de Equipo - solo owners */}
        {profile?.is_owner && (
          <Link
            href="/team"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-2",
              (pathname === "/team" || pathname === "/admin") ? "text-white" : "hover:text-white"
            )}
            style={{
              background: (pathname === "/team" || pathname === "/admin") ? "rgba(108,99,255,0.7)" : "rgba(108,99,255,0.08)",
              color: (pathname === "/team" || pathname === "/admin") ? "white" : "#6c63ff",
              border: "1px solid rgba(108,99,255,0.2)",
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Centro de Control
          </Link>
        )}
        {navItems.map(item => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/prospects/new" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "text-white"
                  : "hover:text-white",
                item.highlight && !isActive && "border"
              )}
              style={{
                background: isActive ? "var(--accent)" : item.highlight ? "transparent" : "transparent",
                color: isActive ? "white" : item.highlight ? "var(--accent-light)" : "var(--text-secondary)",
                borderColor: item.highlight && !isActive ? "var(--accent)" : undefined,
              }}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.href === "/prospects" && pendingFollowUps > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold leading-none"
                  style={{ background: "#ef4444", color: "white", minWidth: "18px", textAlign: "center" }}>
                  {pendingFollowUps > 99 ? "99+" : pendingFollowUps}
                </span>
              )}
              {item.href === "/messages" && unreadMessages > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold leading-none"
                  style={{ background: "#25d366", color: "white", minWidth: "18px", textAlign: "center" }}>
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Profile + logout */}
      <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl mb-2" style={{ background: "var(--surface-2)" }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
            {initials}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
              {profile?.full_name || "Setter"}
            </p>
            <p className="text-xs truncate capitalize" style={{ color: "var(--text-muted)" }}>
              {profile?.role || "setter"}
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
