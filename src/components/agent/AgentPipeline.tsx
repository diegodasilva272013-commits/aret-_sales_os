"use client"
import { useState, useEffect, useCallback } from "react"
import { AGENT_STAGES, type AgentQueueItem, type AgentStatus } from "@/types/agent"

export default function AgentPipeline() {
  const [items, setItems] = useState<AgentQueueItem[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/agent/queue?limit=500")
    if (res.ok) {
      const d = await res.json()
      setItems(d.data ?? [])
      setStats(d.stats ?? {})
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const grouped = AGENT_STAGES.reduce((acc, stage) => {
    acc[stage.key] = items.filter(i => i.status === stage.key)
    return acc
  }, {} as Record<AgentStatus, AgentQueueItem[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Pipeline de Prospección</h2>
      <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "400px" }}>
        {AGENT_STAGES.map(stage => {
          const stageItems = grouped[stage.key] || []
          const count = stats[stage.key] || stageItems.length
          return (
            <div key={stage.key} className="w-56 shrink-0 flex flex-col rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              {/* Column Header */}
              <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: stage.color }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{stage.label}</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: stage.color + "22", color: stage.color }}>{count}</span>
              </div>
              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2" style={{ maxHeight: "calc(100vh - 320px)" }}>
                {stageItems.length === 0 ? (
                  <div className="text-center py-6 text-[10px]" style={{ color: "var(--text-muted)" }}>Sin prospectos</div>
                ) : stageItems.map(item => (
                  <div key={item.id} className="p-2.5 rounded-lg cursor-default transition-colors" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = stage.color)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
                  >
                    <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{item.full_name || "Sin nombre"}</p>
                    <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--text-muted)" }}>{item.headline || "—"}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{item.company || ""}</span>
                      {item.fit_score != null && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{
                          background: item.fit_score >= 80 ? "rgba(34,197,94,0.15)" : item.fit_score >= 50 ? "rgba(245,158,11,0.15)" : "rgba(107,114,128,0.15)",
                          color: item.fit_score >= 80 ? "#22c55e" : item.fit_score >= 50 ? "#f59e0b" : "#6b7280",
                        }}>{item.fit_score}%</span>
                      )}
                    </div>
                    {item.next_action_at && (
                      <p className="text-[9px] mt-1.5" style={{ color: "var(--text-muted)" }}>
                        Próx: {new Date(item.next_action_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
