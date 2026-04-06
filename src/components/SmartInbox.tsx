"use client"
import { useState, useEffect } from "react"

type InboxItem = {
  id: string
  prospectId: string | null
  name: string
  company: string
  phone: string
  lastMessage: string
  lastMessageAt: string
  messageCount: number
  priority: "urgent" | "high" | "medium" | "low"
  priorityScore: number
  status: string
  phase: string
  hasMedia: boolean
  hasPendingFollowUp: boolean
  suggestedAction: string
  waitingHours: number
}

type InboxData = {
  items: InboxItem[]
  stats: { totalInbox: number; urgentCount: number; highCount: number; waitingOver12h: number; avgWaitHours: number }
}

const priorityConfig = {
  urgent: { color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "🔴 Urgente", border: "rgba(239,68,68,0.3)" },
  high: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "🟡 Alta", border: "rgba(245,158,11,0.3)" },
  medium: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", label: "🔵 Media", border: "rgba(59,130,246,0.3)" },
  low: { color: "#6b7280", bg: "rgba(107,114,128,0.12)", label: "⚪ Baja", border: "rgba(107,114,128,0.3)" },
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Ahora"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function SmartInbox() {
  const [data, setData] = useState<InboxData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [filter, setFilter] = useState<string>("all")

  useEffect(() => {
    fetch("/api/inbox").then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
    const interval = setInterval(() => {
      fetch("/api/inbox").then(r => r.json()).then(d => setData(d)).catch(() => {})
    }, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl shimmer" />
          <div className="h-5 w-52 rounded shimmer" />
        </div>
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl shimmer" />)}</div>
      </div>
    )
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
            <span className="text-base">📬</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Inbox Inteligente</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No hay mensajes pendientes — estás al día 🎉</p>
          </div>
        </div>
      </div>
    )
  }

  const filtered = filter === "all" ? data.items : data.items.filter(i => i.priority === filter)
  const displayItems = expanded ? filtered : filtered.slice(0, 6)

  return (
    <div className="mb-6 rounded-2xl animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-5 text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
            <span className="text-base">📬</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Inbox Inteligente</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {data.stats.totalInbox} conversaciones · {data.stats.urgentCount} urgentes
            </p>
          </div>
          {data.stats.urgentCount > 0 && (
            <div className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)" }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
              <span className="text-xs font-semibold" style={{ color: "#ef4444" }}>{data.stats.urgentCount}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
              {data.stats.waitingOver12h} esperando +12h
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}>
              ~{data.stats.avgWaitHours}h promedio
            </span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: "var(--text-muted)", transition: "transform 0.3s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expandable content */}
      <div style={{ maxHeight: expanded ? "800px" : "0", overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)" }}>
        <div className="px-5 pb-5">
          {/* Priority filters */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {[
              { key: "all", label: "Todos", count: data.items.length },
              { key: "urgent", label: "🔴 Urgente", count: data.stats.urgentCount },
              { key: "high", label: "🟡 Alta", count: data.stats.highCount },
              { key: "medium", label: "🔵 Media", count: data.items.filter(i => i.priority === "medium").length },
              { key: "low", label: "⚪ Baja", count: data.items.filter(i => i.priority === "low").length },
            ].map(f => (
              <button key={f.key} onClick={(e) => { e.stopPropagation(); setFilter(f.key) }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: filter === f.key ? "var(--accent)" : "var(--surface-2)",
                  color: filter === f.key ? "white" : "var(--text-secondary)",
                  border: `1px solid ${filter === f.key ? "var(--accent)" : "var(--border)"}`,
                }}>
                {f.label} <span className="opacity-70">({f.count})</span>
              </button>
            ))}
          </div>

          {/* Inbox items */}
          <div className="space-y-2">
            {displayItems.map((item, i) => {
              const cfg = priorityConfig[item.priority]
              return (
                <div key={item.id}
                  className="flex items-start gap-3 p-3 rounded-xl transition-all hover:scale-[1.005] animate-fade-in"
                  style={{ background: "var(--surface-2)", borderLeft: `3px solid ${cfg.border}`, animationDelay: `${i * 0.04}s` }}>
                  {/* Priority indicator */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: cfg.bg }}>
                    <span className="text-xs font-bold" style={{ color: cfg.color }}>{item.messageCount}</span>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{item.name}</span>
                      {item.company && <span className="text-xs truncate" style={{ color: "var(--text-muted)" }}>· {item.company}</span>}
                      {item.hasMedia && <span className="text-xs">📎</span>}
                      {item.hasPendingFollowUp && <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>Follow-up</span>}
                    </div>
                    <p className="text-xs truncate mb-1" style={{ color: "var(--text-secondary)" }}>{item.lastMessage}</p>
                    <p className="text-xs" style={{ color: cfg.color }}>💡 {item.suggestedAction}</p>
                  </div>
                  {/* Time + status */}
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold" style={{ color: item.waitingHours > 12 ? "#ef4444" : "var(--text-secondary)" }}>
                      {timeAgo(item.lastMessageAt)}
                    </p>
                    <span className="text-xs px-1.5 py-0.5 rounded-full inline-block mt-1" style={{ background: cfg.bg, color: cfg.color }}>
                      {cfg.label.split(" ")[0]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {filtered.length > 6 && !expanded && (
            <button onClick={() => setExpanded(true)} className="mt-3 w-full py-2 rounded-xl text-xs font-medium"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
              Ver {filtered.length - 6} más →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
