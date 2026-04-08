"use client"
import { useState, useEffect, useCallback } from "react"
import { ACTION_LABELS, type AgentLog, type ActionType } from "@/types/agent"

export default function AgentActivityFeed() {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/agent/logs?limit=30")
    if (res.ok) {
      const d = await res.json()
      setLogs(d.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Auto-refresh every 15s
  useEffect(() => {
    const iv = setInterval(fetchLogs, 15000)
    return () => clearInterval(iv)
  }, [fetchLogs])

  const getActionIcon = (type: ActionType) => {
    switch (type) {
      case "profile_view": return "👁️"
      case "post_like": return "👍"
      case "post_comment": return "💬"
      case "connection_request": return "🤝"
      case "connection_accepted": return "✅"
      case "direct_message": return "📩"
      case "profile_discovered": return "🔍"
      case "stage_changed": return "📊"
      case "error": return "⚠️"
      default: return "•"
    }
  }

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (s < 60) return "ahora"
    if (s < 3600) return `hace ${Math.floor(s / 60)}m`
    if (s < 86400) return `hace ${Math.floor(s / 3600)}h`
    return `hace ${Math.floor(s / 86400)}d`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Actividad Reciente</h3>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "var(--success)" }} />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>En vivo</span>
        </div>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs" style={{ color: "var(--text-muted)" }}>Sin actividad aún</div>
        ) : logs.map((log, i) => {
          const ext = log as AgentLog & { queue_full_name?: string; account_name?: string }
          return (
            <div
              key={log.id}
              className="flex items-start gap-3 px-4 py-2.5 transition-colors"
              style={{ background: i % 2 === 0 ? "var(--surface-2)" : "transparent", borderBottom: "1px solid var(--border)" }}
            >
              <span className="text-sm mt-0.5">{getActionIcon(log.action_type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium" style={{ color: log.success ? "var(--text-primary)" : "var(--danger)" }}>
                    {ACTION_LABELS[log.action_type] || log.action_type}
                  </span>
                  {ext.queue_full_name && (
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>→ {ext.queue_full_name}</span>
                  )}
                </div>
                {log.action_detail && (
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{log.action_detail}</p>
                )}
                {log.error_message && (
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--danger)" }}>{log.error_message}</p>
                )}
              </div>
              <span className="text-[10px] shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }}>{timeAgo(log.executed_at)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
