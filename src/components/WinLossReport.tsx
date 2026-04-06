"use client"
import { useState, useEffect } from "react"

type Insight = {
  type: "danger" | "warning" | "success" | "info"
  icon: string
  title: string
  detail: string
  action: string
}

type WinLossData = {
  summary: {
    totalDeals: number; wins: number; losses: number; winRate: number
    avgFollowUpsToWin: number; avgFollowUpsToLoss: number; avgDaysToClose: number; totalRevenue: number
  }
  insights: Insight[]
  sourceStats: { source: string; wins: number; total: number; rate: number }[]
  phaseStats: { phase: string; wins: number; losses: number }[]
  setterStats: { id: string; name: string; wins: number; losses: number; rate: number }[]
  trend: { month: string; label: string; wins: number; losses: number; rate: number }[]
  topLossReasons: { reason: string; count: number }[]
  topObjections: { objection: string; count: number }[]
}

const INSIGHT_STYLES: Record<string, { bg: string; border: string; color: string; badge: string }> = {
  danger:  { bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.2)", color: "#ef4444", badge: "URGENTE" },
  warning: { bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.2)", color: "#f59e0b", badge: "ATENCIÓN" },
  success: { bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.2)", color: "#22c55e", badge: "BIEN" },
  info:    { bg: "rgba(59,130,246,0.06)", border: "rgba(59,130,246,0.2)", color: "#3b82f6", badge: "DATO" },
}

export default function WinLossReport() {
  const [data, setData] = useState<WinLossData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<"insights" | "data">("insights")

  useEffect(() => {
    fetch("/api/win-loss").then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl shimmer" />
          <div className="h-5 w-52 rounded shimmer" />
        </div>
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl shimmer" />)}
        </div>
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl shimmer" />)}
        </div>
      </div>
    )
  }

  if (!data || data.summary.totalDeals === 0) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
            <span className="text-lg">📊</span>
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Reporte Win/Loss</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No hay deals cerrados para analizar. Cerrá tu primer deal para ver insights.</p>
          </div>
        </div>
      </div>
    )
  }

  const s = data.summary
  const maxTrend = Math.max(...data.trend.map(t => t.wins + t.losses), 1)

  return (
    <div className="mb-6 rounded-2xl animate-scale-pop overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
              <span className="text-lg">📊</span>
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Reporte Win/Loss</h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {s.totalDeals} deals analizados · Insights accionables
              </p>
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

        {/* Win/Loss Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold" style={{ color: "#22c55e" }}>✅ {s.wins}W</span>
              <span className="text-sm font-bold" style={{ color: "#ef4444" }}>❌ {s.losses}L</span>
            </div>
            <span className="text-2xl font-black" style={{ color: s.winRate >= 50 ? "#22c55e" : s.winRate >= 30 ? "#f59e0b" : "#ef4444" }}>
              {s.winRate}%
            </span>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ background: "var(--surface-2)" }}>
            <div className="h-full rounded-l-full transition-all duration-700"
              style={{ width: `${s.winRate}%`, background: "linear-gradient(90deg, #22c55e, #10b981)" }} />
            <div className="h-full rounded-r-full transition-all duration-700"
              style={{ width: `${100 - s.winRate}%`, background: "linear-gradient(90deg, #ef4444, #dc2626)" }} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Días al cierre", value: `${s.avgDaysToClose}d`, color: "#3b82f6", icon: "⏱️" },
            { label: "FU para ganar", value: `${s.avgFollowUpsToWin}`, color: "#22c55e", icon: "✉️" },
            { label: "FU para perder", value: `${s.avgFollowUpsToLoss}`, color: "#ef4444", icon: "📤" },
            { label: "Revenue", value: s.totalRevenue > 0 ? `$${(s.totalRevenue / 1000).toFixed(1)}k` : "—", color: "#8b5cf6", icon: "💰" },
          ].map(kpi => (
            <div key={kpi.label} className="p-2.5 rounded-xl text-center" style={{ background: `${kpi.color}10`, border: `1px solid ${kpi.color}20` }}>
              <span className="text-sm">{kpi.icon}</span>
              <p className="text-sm font-bold mt-0.5" style={{ color: kpi.color }}>{kpi.value}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{kpi.label}</p>
            </div>
          ))}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 rounded-xl mb-3" style={{ background: "var(--surface-2)" }}>
          <button onClick={() => setTab("insights")}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: tab === "insights" ? "var(--accent)" : "transparent", color: tab === "insights" ? "white" : "var(--text-secondary)" }}>
            🧠 Insights Accionables
          </button>
          <button onClick={() => setTab("data")}
            className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: tab === "data" ? "var(--accent)" : "transparent", color: tab === "data" ? "white" : "var(--text-secondary)" }}>
            📈 Datos Detallados
          </button>
        </div>
      </div>

      {/* TAB: Insights */}
      {tab === "insights" && (
        <div className="px-5 pb-5 space-y-2.5">
          {data.insights.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>
              Necesitamos más datos para generar insights. Seguí cerrando deals.
            </p>
          ) : (
            data.insights.map((insight, i) => {
              const style = INSIGHT_STYLES[insight.type]
              return (
                <div key={i} className="p-4 rounded-xl transition-all hover:scale-[1.005]"
                  style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">{insight.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: `${style.color}20`, color: style.color }}>
                          {style.badge}
                        </span>
                      </div>
                      <p className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                        {insight.title}
                      </p>
                      <p className="text-xs mb-2" style={{ color: "var(--text-secondary)" }}>
                        {insight.detail}
                      </p>
                      <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                        <span className="text-xs mt-0.5">💡</span>
                        <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                          {insight.action}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* TAB: Data */}
      {tab === "data" && (
        <div className="px-5 pb-5 space-y-4">
          {/* Trend chart */}
          {data.trend.length > 1 && (
            <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>📈 Tendencia Mensual</h4>
              <div className="flex items-end gap-2 h-24">
                {data.trend.map(t => (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center" style={{ height: "80px" }}>
                      <div className="w-full flex flex-col justify-end h-full gap-0.5">
                        <div className="w-full rounded-t transition-all duration-500" style={{
                          height: `${(t.wins / maxTrend) * 100}%`, background: "#22c55e", minHeight: t.wins > 0 ? "4px" : "0",
                        }} />
                        <div className="w-full rounded-b transition-all duration-500" style={{
                          height: `${(t.losses / maxTrend) * 100}%`, background: "#ef4444", minHeight: t.losses > 0 ? "4px" : "0",
                        }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{t.label}</span>
                    <span className="text-[10px] font-bold" style={{ color: t.rate >= 50 ? "#22c55e" : "#ef4444" }}>{t.rate}%</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm" style={{ background: "#22c55e" }} />
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Ganados</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-sm" style={{ background: "#ef4444" }} />
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Perdidos</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* By Setter */}
            {data.setterStats.length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>👥 Por Setter</h4>
                <div className="space-y-2.5">
                  {data.setterStats.slice(0, 5).map((setter, i) => (
                    <div key={setter.id}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: "var(--text-secondary)" }}>{i + 1}. {setter.name.split(" ")[0]}</span>
                        <span className="font-bold" style={{ color: setter.rate >= 50 ? "#22c55e" : "#f59e0b" }}>
                          {setter.rate}% <span style={{ color: "var(--text-muted)" }}>({setter.wins}W/{setter.losses}L)</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                        <div className="h-full rounded-full" style={{
                          width: `${setter.rate}%`,
                          background: setter.rate >= 50 ? "#22c55e" : setter.rate >= 30 ? "#f59e0b" : "#ef4444",
                          transition: "width 0.5s ease",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* By Phase */}
            {data.phaseStats.length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>📍 Por Fase</h4>
                <div className="space-y-2.5">
                  {data.phaseStats.map(p => {
                    const total = p.wins + p.losses
                    const rate = total > 0 ? Math.round((p.wins / total) * 100) : 0
                    return (
                      <div key={p.phase}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize" style={{ color: "var(--text-secondary)" }}>{p.phase}</span>
                          <span className="font-bold" style={{ color: rate >= 50 ? "#22c55e" : "#ef4444" }}>
                            {rate}% <span style={{ color: "var(--text-muted)" }}>({total})</span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full overflow-hidden flex" style={{ background: "var(--surface-3)" }}>
                          <div className="h-full" style={{ width: `${rate}%`, background: "#22c55e" }} />
                          <div className="h-full" style={{ width: `${100 - rate}%`, background: "#ef4444" }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Loss Reasons */}
            {data.topLossReasons.length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>💀 Motivos de Pérdida</h4>
                <div className="space-y-2">
                  {data.topLossReasons.map((r, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs truncate flex-1" style={{ color: "var(--text-secondary)" }}>{r.reason}</span>
                      <span className="text-xs font-bold ml-2 px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                        {r.count}×
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Objections */}
            {data.topObjections.length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>🛡️ Objeciones Top</h4>
                <div className="space-y-2">
                  {data.topObjections.map((o, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs truncate flex-1" style={{ color: "var(--text-secondary)" }}>{o.objection}</span>
                      <span className="text-xs font-bold ml-2 px-2 py-0.5 rounded-full" style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
                        {o.count}×
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Source Stats */}
          <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>🎯 Win Rate por Fuente</h4>
            <div className="grid grid-cols-3 gap-3">
              {data.sourceStats.map(src => (
                <div key={src.source} className="text-center p-2 rounded-lg" style={{ background: "var(--surface)" }}>
                  <p className="text-lg font-bold" style={{ color: src.rate >= 50 ? "#22c55e" : src.rate >= 30 ? "#f59e0b" : "#ef4444" }}>
                    {src.rate}%
                  </p>
                  <p className="text-[10px] capitalize" style={{ color: "var(--text-muted)" }}>{src.source}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{src.wins}W / {src.total} total</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
