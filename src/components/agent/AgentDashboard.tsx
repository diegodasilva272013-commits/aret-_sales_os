"use client"
import { useState, useEffect, useCallback } from "react"
import { AGENT_STAGES, type AgentConfig, type AgentQueueItem } from "@/types/agent"

interface Stats { [key: string]: number }

export default function AgentDashboard() {
  const [config, setConfig] = useState<AgentConfig | null>(null)
  const [stats, setStats] = useState<Stats>({})
  const [recent, setRecent] = useState<AgentQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [cfgRes, queueRes] = await Promise.all([
        fetch("/api/agent/config"),
        fetch("/api/agent/queue?limit=10"),
      ])
      if (cfgRes.ok) {
        const d = await cfgRes.json()
        setConfig(d.config ?? null)
      }
      if (queueRes.ok) {
        const d = await queueRes.json()
        setStats(d.stats ?? {})
        setRecent(d.data ?? [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const toggleAgent = async () => {
    if (!config) return
    setToggling(true)
    const endpoint = config.is_active ? "/api/agent/pause" : "/api/agent/start"
    const res = await fetch(endpoint, { method: "POST" })
    if (res.ok) {
      setConfig(prev => prev ? { ...prev, is_active: !prev.is_active } : prev)
      showToast(config.is_active ? "Agente pausado" : "Agente activado")
    } else {
      const d = await res.json().catch(() => ({}))
      showToast(d.error || "Error", "err")
    }
    setToggling(false)
  }

  const total = Object.values(stats).reduce((a, b) => a + b, 0)
  const converted = stats["converted"] || 0
  const messaged = stats["messaged"] || 0
  const responded = stats["responded"] || 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2 rounded-xl text-sm font-medium shadow-lg" style={{ background: toast.type === "ok" ? "var(--success)" : "var(--danger)", color: "white" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Agente LinkedIn</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
            Prospección autónoma 24/7 en LinkedIn
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium" style={{
            background: config?.is_active ? "rgba(34,197,94,0.15)" : "rgba(107,114,128,0.15)",
            color: config?.is_active ? "var(--success)" : "var(--text-muted)",
          }}>
            <span className="w-2 h-2 rounded-full" style={{ background: config?.is_active ? "var(--success)" : "var(--text-muted)" }} />
            {config?.is_active ? "Activo" : "Inactivo"}
          </span>
          <button
            onClick={toggleAgent}
            disabled={toggling || !config}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: config?.is_active ? "rgba(239,68,68,0.15)" : "linear-gradient(135deg, var(--accent), #7c3aed)",
              color: config?.is_active ? "var(--danger)" : "white",
              opacity: toggling ? 0.6 : 1,
            }}
          >
            {toggling ? "..." : config?.is_active ? "Pausar Agente" : "Activar Agente"}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "En Pipeline", value: total, color: "var(--accent)" },
          { label: "Mensajeados", value: messaged, color: "#22c55e" },
          { label: "Respondieron", value: responded, color: "#06b6d4" },
          { label: "Convertidos", value: converted, color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Pipeline de Prospección</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {AGENT_STAGES.map(stage => {
            const count = stats[stage.key] || 0
            return (
              <div key={stage.key} className="flex-1 min-w-[100px] p-3 rounded-xl text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ background: stage.color }} />
                <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{count}</p>
                <p className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{stage.label}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Conversion Funnel */}
      {total > 0 && (
        <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Embudo de Conversión</h2>
          <div className="space-y-2">
            {[
              { label: "Descubiertos → Conectados", value: ((stats["connected"] || 0) + (stats["nurturing"] || 0) + messaged + responded + converted) / Math.max(total, 1) * 100 },
              { label: "Conectados → Mensajeados", value: (messaged + responded + converted) / Math.max((stats["connected"] || 0) + (stats["nurturing"] || 0) + messaged + responded + converted, 1) * 100 },
              { label: "Mensajeados → Respondieron", value: (responded + converted) / Math.max(messaged + responded + converted, 1) * 100 },
              { label: "Respondieron → Convertidos", value: converted / Math.max(responded + converted, 1) * 100 },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="text-xs w-52 shrink-0" style={{ color: "var(--text-secondary)" }}>{f.label}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${f.value}%`, background: "var(--accent)" }} />
                </div>
                <span className="text-xs font-semibold w-12 text-right" style={{ color: "var(--text-primary)" }}>{f.value.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3" style={{ background: "var(--surface)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Últimos Prospectos</h2>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {recent.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              No hay prospectos en el pipeline todavía
            </div>
          ) : recent.map(item => (
            <div
              key={item.id}
              className="flex items-center justify-between px-5 py-3 transition-colors"
              style={{ background: "var(--surface-2)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
              onMouseLeave={e => (e.currentTarget.style.background = "var(--surface-2)")}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
                  {(item.full_name || "?")[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{item.full_name || "Sin nombre"}</p>
                  <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{item.headline || item.company || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {item.fit_score != null && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{
                    background: item.fit_score >= 80 ? "rgba(34,197,94,0.15)" : item.fit_score >= 50 ? "rgba(245,158,11,0.15)" : "rgba(107,114,128,0.15)",
                    color: item.fit_score >= 80 ? "var(--success)" : item.fit_score >= 50 ? "var(--warning)" : "var(--text-muted)",
                  }}>{item.fit_score}%</span>
                )}
                <span className="px-2 py-1 rounded-full text-[10px] font-semibold" style={{
                  background: (AGENT_STAGES.find(s => s.key === item.status)?.color || "#6b7280") + "22",
                  color: AGENT_STAGES.find(s => s.key === item.status)?.color || "#6b7280",
                }}>
                  {AGENT_STAGES.find(s => s.key === item.status)?.label || item.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
