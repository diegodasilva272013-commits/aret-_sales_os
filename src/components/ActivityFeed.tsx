"use client"
import { useState, useEffect, useRef, useCallback } from "react"

type Activity = {
  id: string
  type: string
  icon: string
  color: string
  title: string
  subtitle: string
  user: string
  timestamp: string
  highlight?: boolean
  dealValue?: number
}

type LeaderboardEntry = {
  id: string
  name: string
  actions: number
  deals: number
  revenue: number
}

type FeedData = {
  activities: Activity[]
  leaderboard: LeaderboardEntry[]
  stats: {
    todayCount: number
    weekCount: number
    activeUsers: number
    responseRate: number
    dealsThisWeek: number
    revenueThisWeek: number
  }
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const secs = Math.floor(diff / 1000)
  if (secs < 30) return "Ahora"
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "< 1m"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

function isRecent(ts: string) {
  return Date.now() - new Date(ts).getTime() < 5 * 60 * 1000 // < 5 min
}

const MEDAL = ["🥇", "🥈", "🥉", "4°", "5°"]

export default function ActivityFeed() {
  const [data, setData] = useState<FeedData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState<string>("all")
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<"feed" | "leaderboard">("feed")
  const prevIdsRef = useRef<Set<string>>(new Set())
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const fetchData = useCallback(() => {
    fetch("/api/activity-feed").then(r => r.json()).then((d: FeedData) => {
      // Detect new activities for animation
      const currentIds = new Set(d.activities.map(a => a.id))
      if (prevIdsRef.current.size > 0) {
        const fresh = new Set<string>()
        currentIds.forEach(id => {
          if (!prevIdsRef.current.has(id)) fresh.add(id)
        })
        if (fresh.size > 0) {
          setNewIds(fresh)
          // Check if there's a new deal closed for celebration
          const newDeal = d.activities.find(a => fresh.has(a.id) && a.type === "deal_closed")
          if (newDeal) {
            try { audioRef.current?.play() } catch {}
          }
          setTimeout(() => setNewIds(new Set()), 3000)
        }
      }
      prevIdsRef.current = currentIds
      setData(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000) // Poll every 15s for near-realtime
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl shimmer" />
          <div className="h-5 w-52 rounded shimmer" />
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl shimmer" />)}
        </div>
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => <div key={i} className="h-14 rounded-xl shimmer" />)}
        </div>
      </div>
    )
  }

  if (!data || data.activities.length === 0) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #22c55e, #10b981)" }}>
            <span className="text-lg">📡</span>
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>War Room — Feed en Vivo</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No hay actividad esta semana. ¡Hora de prospectar!</p>
          </div>
        </div>
      </div>
    )
  }

  const filters = [
    { key: "all", label: "Todo", icon: "📡" },
    { key: "deal_closed", label: "Deals", icon: "🎯" },
    { key: "new_prospect", label: "Prospectos", icon: "👤" },
    { key: "follow_up", label: "Follow-ups", icon: "📤" },
    { key: "whatsapp", label: "WhatsApp", icon: "📩" },
    { key: "scheduled_call", label: "Llamadas", icon: "📞" },
    { key: "recording", label: "Grabaciones", icon: "🎙️" },
  ]

  const filtered = filter === "all" ? data.activities : data.activities.filter(a => a.type === filter)
  const displayItems = expanded ? filtered : filtered.slice(0, 10)
  const { stats, leaderboard } = data

  return (
    <div className="mb-6 rounded-2xl animate-scale-pop overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Celebration audio (silent until triggered) */}
      <audio ref={audioRef} src="/audio/celebration.mp3" preload="none" />

      {/* WAR ROOM Header */}
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ background: "linear-gradient(135deg, #22c55e, #10b981)" }}>
              <span className="text-lg">📡</span>
              {/* Live pulse ring */}
              <div className="absolute inset-0 rounded-xl animate-ping opacity-20" style={{ background: "#22c55e" }} />
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                War Room
              </h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Actividad del equipo en tiempo real
              </p>
            </div>
            {/* Live badge */}
            <div className="flex items-center gap-1.5 ml-1 px-2.5 py-1 rounded-full" style={{ background: "rgba(34,197,94,0.15)" }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
              <span className="text-xs font-bold tracking-wider" style={{ color: "#22c55e" }}>LIVE</span>
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 rounded-lg transition-all hover:scale-110"
            style={{ background: "var(--surface-2)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ color: "var(--text-muted)", transition: "transform 0.3s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          {[
            { label: "Hoy", value: stats.todayCount, icon: "⚡", color: "#f59e0b" },
            { label: "Semana", value: stats.weekCount, icon: "📊", color: "#6c63ff" },
            { label: "Activos", value: stats.activeUsers, icon: "👥", color: "#3b82f6" },
            { label: "Respuesta", value: `${stats.responseRate}%`, icon: "💬", color: "#22c55e" },
            { label: "Deals", value: stats.dealsThisWeek, icon: "🎯", color: "#22c55e" },
            { label: "Revenue", value: `$${(stats.revenueThisWeek / 1000).toFixed(1)}k`, icon: "💰", color: "#f59e0b" },
          ].map(s => (
            <div key={s.label} className="p-2.5 rounded-xl text-center" style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}>
              <span className="text-sm">{s.icon}</span>
              <p className="text-sm font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl mb-3" style={{ background: "var(--surface-2)" }}>
          <button
            onClick={() => setTab("feed")}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: tab === "feed" ? "var(--accent)" : "transparent",
              color: tab === "feed" ? "white" : "var(--text-secondary)",
            }}
          >
            📡 Feed en Vivo
          </button>
          <button
            onClick={() => setTab("leaderboard")}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: tab === "leaderboard" ? "var(--accent)" : "transparent",
              color: tab === "leaderboard" ? "white" : "var(--text-secondary)",
            }}
          >
            🏆 Leaderboard
          </button>
        </div>
      </div>

      {/* TAB: Feed */}
      {tab === "feed" && (
        <div className="px-5 pb-5">
          {/* Filters */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {filters.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: filter === f.key ? "var(--accent)" : "var(--surface-2)",
                  color: filter === f.key ? "white" : "var(--text-secondary)",
                  border: `1px solid ${filter === f.key ? "var(--accent)" : "var(--border)"}`,
                }}>
                <span>{f.icon}</span> {f.label}
              </button>
            ))}
          </div>

          {/* Activity Stream */}
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {displayItems.map((activity, i) => {
              const isNew = newIds.has(activity.id)
              const recent = isRecent(activity.timestamp)
              const isDeal = activity.type === "deal_closed"

              return (
                <div key={activity.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isNew ? "animate-slide-in" : ""} ${isDeal ? "ring-1" : ""}`}
                  style={{
                    background: isDeal
                      ? "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.02))"
                      : isNew
                        ? `${activity.color}08`
                        : "var(--surface-2)",
                    animationDelay: `${i * 0.03}s`,
                    ...(isDeal ? { borderColor: "rgba(34,197,94,0.3)" } : {}),
                  }}>
                  {/* Icon with pulse for recent */}
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ background: `${activity.color}15` }}>
                      <span className="text-base">{activity.icon}</span>
                    </div>
                    {recent && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 animate-pulse"
                        style={{ background: "#22c55e", borderColor: "var(--surface)" }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs truncate ${isDeal ? "font-bold" : "font-medium"}`}
                      style={{ color: isDeal ? "#22c55e" : "var(--text-primary)" }}>
                      {activity.title}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                      {activity.subtitle}
                    </p>
                  </div>

                  {/* User avatar + time */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: `${activity.color}20`, color: activity.color }}>
                      {activity.user.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                        {activity.user.split(" ")[0]}
                      </p>
                      <p className={`text-[10px] ${recent ? "font-bold" : ""}`}
                        style={{ color: recent ? "#22c55e" : "var(--text-muted)" }}>
                        {recent && "● "}{timeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Show more */}
          {filtered.length > 10 && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="w-full mt-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-[1.01]"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
            >
              Ver {filtered.length - 10} actividades más ↓
            </button>
          )}
        </div>
      )}

      {/* TAB: Leaderboard */}
      {tab === "leaderboard" && (
        <div className="px-5 pb-5">
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>
                Sin actividad suficiente para el ranking
              </p>
            ) : (
              leaderboard.map((entry, i) => (
                <div key={entry.id}
                  className="flex items-center gap-3 p-3.5 rounded-xl transition-all hover:scale-[1.01]"
                  style={{
                    background: i === 0
                      ? "linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,215,0,0.02))"
                      : "var(--surface-2)",
                    border: i === 0 ? "1px solid rgba(255,215,0,0.2)" : "1px solid transparent",
                  }}>
                  {/* Rank */}
                  <div className="text-lg w-8 text-center font-bold shrink-0">
                    {MEDAL[i] || `${i + 1}°`}
                  </div>

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                    style={{
                      background: i === 0 ? "linear-gradient(135deg, #ffd700, #f59e0b)" : "var(--accent)",
                      color: "white",
                    }}>
                    {entry.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                      {entry.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: "rgba(108,99,255,0.12)", color: "#6c63ff" }}>
                        ⚡ {entry.actions} acciones hoy
                      </span>
                      {entry.deals > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                          🎯 {entry.deals} deals
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Revenue */}
                  {entry.revenue > 0 && (
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: "#22c55e" }}>
                        ${entry.revenue.toLocaleString()}
                      </p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>revenue</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
