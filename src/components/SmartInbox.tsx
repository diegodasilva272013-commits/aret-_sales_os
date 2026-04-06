"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

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
  priorityReason: string
  intent: string
  waitingHours: number
}

type InboxData = {
  items: InboxItem[]
  stats: { totalInbox: number; urgentCount: number; highCount: number; waitingOver12h: number; avgWaitHours: number }
}

const priorityConfig = {
  urgent: { color: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.3)", label: "URGENTE", dot: "🔴" },
  high:   { color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)", label: "ALTA", dot: "🟡" },
  medium: { color: "#3b82f6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.3)", label: "MEDIA", dot: "🔵" },
  low:    { color: "#6b7280", bg: "rgba(107,114,128,0.08)", border: "rgba(107,114,128,0.3)", label: "BAJA", dot: "⚪" },
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
  const [filter, setFilter] = useState<string>("all")
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    fetch("/api/inbox").then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 45000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl shimmer" />
          <div className="h-5 w-52 rounded shimmer" />
        </div>
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl shimmer" />)}</div>
      </div>
    )
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
            <span className="text-lg">📬</span>
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Inbox Inteligente</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No hay mensajes pendientes — estás al día 🎉</p>
          </div>
        </div>
      </div>
    )
  }

  const { stats } = data
  const filtered = filter === "all" ? data.items : data.items.filter(i => i.priority === filter)
  const firstUrgent = data.items.find(i => i.priority === "urgent")

  return (
    <div className="mb-6 rounded-2xl animate-scale-pop overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}>
              <span className="text-lg">📬</span>
              {stats.urgentCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse"
                  style={{ background: "#ef4444" }}>
                  {stats.urgentCount}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Inbox Inteligente</h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {stats.totalInbox} pendientes · Ordenados por urgencia AI
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats.waitingOver12h > 0 && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold animate-pulse"
                style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                ⚠️ {stats.waitingOver12h} esperando +12h
              </span>
            )}
          </div>
        </div>

        {/* Hero CTA — most urgent message */}
        {firstUrgent && (
          <div className="p-4 rounded-xl mb-4 transition-all hover:scale-[1.005]"
            style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))", border: "1px solid rgba(239,68,68,0.2)" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
              <span className="text-[10px] font-bold tracking-wider" style={{ color: "#ef4444" }}>RESPONDÉ PRIMERO</span>
            </div>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold mb-0.5" style={{ color: "var(--text-primary)" }}>
                  {firstUrgent.name} {firstUrgent.company && <span className="font-normal text-xs" style={{ color: "var(--text-muted)" }}>· {firstUrgent.company}</span>}
                </p>
                <p className="text-xs mb-1.5 truncate" style={{ color: "var(--text-secondary)" }}>
                  &ldquo;{firstUrgent.lastMessage}&rdquo;
                </p>
                <p className="text-xs font-medium" style={{ color: "#ef4444" }}>
                  {firstUrgent.priorityReason}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1.5">
                <span className="text-xs font-bold" style={{ color: "#ef4444" }}>{timeAgo(firstUrgent.lastMessageAt)}</span>
                {firstUrgent.prospectId ? (
                  <Link href={`/whatsapp?prospect=${firstUrgent.prospectId}`}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
                    style={{ background: "#ef4444" }}>
                    Responder →
                  </Link>
                ) : (
                  <Link href="/whatsapp"
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
                    style={{ background: "#ef4444" }}>
                    Abrir WA →
                  </Link>
                )}
              </div>
            </div>
            <div className="mt-2 p-2 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                💡 {firstUrgent.suggestedAction}
              </p>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Urgente", value: stats.urgentCount, color: "#ef4444", icon: "🔴" },
            { label: "Alta", value: stats.highCount, color: "#f59e0b", icon: "🟡" },
            { label: "+12h", value: stats.waitingOver12h, color: "#f59e0b", icon: "⏰" },
            { label: "Promedio", value: `${stats.avgWaitHours}h`, color: "#3b82f6", icon: "📊" },
          ].map(s => (
            <button key={s.label} onClick={() => setFilter(s.label === "Urgente" ? "urgent" : s.label === "Alta" ? "high" : "all")}
              className="p-2 rounded-xl text-center transition-all hover:scale-[1.02]"
              style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}>
              <span className="text-xs">{s.icon}</span>
              <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          {[
            { key: "all", label: "Todos", count: data.items.length },
            { key: "urgent", label: "🔴 Urgente", count: stats.urgentCount },
            { key: "high", label: "🟡 Alta", count: stats.highCount },
            { key: "medium", label: "🔵 Media", count: data.items.filter(i => i.priority === "medium").length },
            { key: "low", label: "⚪ Baja", count: data.items.filter(i => i.priority === "low").length },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
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
      </div>

      {/* Inbox List */}
      <div className="px-5 pb-5">
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
          {filtered.map((item, i) => {
            const cfg = priorityConfig[item.priority]
            const isExpanded = expandedItem === item.id
            const isFirst = i === 0 && item.priority === "urgent"

            return (
              <div key={item.id}
                className="rounded-xl transition-all hover:scale-[1.003] cursor-pointer"
                onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                style={{
                  background: isFirst ? cfg.bg : "var(--surface-2)",
                  borderLeft: `3px solid ${cfg.border}`,
                  animationDelay: `${i * 0.03}s`,
                }}>
                {/* Main row */}
                <div className="flex items-start gap-3 p-3">
                  {/* Priority + message count */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold"
                      style={{ background: `${cfg.color}15`, color: cfg.color }}>
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ background: cfg.color }}>
                      {item.messageCount}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>{item.name}</span>
                      {item.company && <span className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>· {item.company}</span>}
                      {item.hasMedia && <span className="text-[10px]">📎</span>}
                      {item.hasPendingFollowUp && (
                        <span className="text-[9px] px-1 py-0.5 rounded font-medium" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>FU</span>
                      )}
                    </div>
                    <p className="text-xs truncate mb-1" style={{ color: "var(--text-secondary)" }}>
                      &ldquo;{item.lastMessage}&rdquo;
                    </p>
                    {/* Priority reason — the key differentiator */}
                    <p className="text-[11px] font-medium" style={{ color: cfg.color }}>
                      {item.priorityReason}
                    </p>
                  </div>

                  {/* Time + priority badge */}
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-xs font-bold" style={{ color: item.waitingHours > 12 ? "#ef4444" : "var(--text-secondary)" }}>
                      {timeAgo(item.lastMessageAt)}
                    </span>
                    <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                      style={{ background: `${cfg.color}15`, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    {item.phase !== "contacto" && (
                      <span className="text-[9px] capitalize" style={{ color: "var(--text-muted)" }}>{item.phase}</span>
                    )}
                  </div>
                </div>

                {/* Expanded: Action panel */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 animate-fade-in">
                    <div className="p-3 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                        💡 {item.suggestedAction}
                      </p>
                      <div className="flex items-center gap-2">
                        {item.prospectId ? (
                          <>
                            <Link href={`/whatsapp?prospect=${item.prospectId}`}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
                              style={{ background: "#25d366" }}
                              onClick={e => e.stopPropagation()}>
                              💬 Responder WA
                            </Link>
                            <Link href={`/prospects/${item.prospectId}`}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                              style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                              onClick={e => e.stopPropagation()}>
                              👤 Ver perfil
                            </Link>
                          </>
                        ) : (
                          <Link href="/whatsapp"
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
                            style={{ background: "#25d366" }}
                            onClick={e => e.stopPropagation()}>
                            💬 Abrir WhatsApp
                          </Link>
                        )}
                        <span className="text-[10px] ml-auto" style={{ color: "var(--text-muted)" }}>
                          Score: {item.priorityScore} · {item.intent.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>
            No hay mensajes con esta prioridad
          </p>
        )}
      </div>
    </div>
  )
}
