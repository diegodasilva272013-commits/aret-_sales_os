"use client"
import { useState, useEffect } from "react"

type WinLossData = {
  summary: {
    totalDeals: number; wins: number; losses: number; winRate: number
    avgFollowUpsToWin: number; avgFollowUpsToLoss: number; avgDaysToClose: number; totalRevenue: number
  }
  sourceStats: { source: string; wins: number; total: number; rate: number }[]
  phaseStats: { phase: string; wins: number; losses: number }[]
  setterStats: { id: string; name: string; wins: number; losses: number; rate: number }[]
  trend: { month: string; label: string; wins: number; losses: number; rate: number }[]
  topLossReasons: { reason: string; count: number }[]
  topObjections: { objection: string; count: number }[]
}

export default function WinLossReport() {
  const [data, setData] = useState<WinLossData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch("/api/win-loss").then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl shimmer" />
          <div className="h-5 w-48 rounded shimmer" />
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-xl shimmer" />)}
        </div>
      </div>
    )
  }

  if (!data || data.summary.totalDeals === 0) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
            <span className="text-base">📊</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Reporte Win/Loss</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>No hay deals cerrados para analizar</p>
          </div>
        </div>
      </div>
    )
  }

  const s = data.summary
  const maxTrend = Math.max(...data.trend.map(t => t.wins + t.losses), 1)

  return (
    <div className="mb-6 rounded-2xl animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-5 text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
            <span className="text-base">📊</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Reporte Win/Loss</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.totalDeals} deals cerrados · {s.winRate}% win rate</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
              {s.wins}W
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
              {s.losses}L
            </span>
            {s.totalRevenue > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(108,99,255,0.12)", color: "#6c63ff" }}>
                ${s.totalRevenue.toLocaleString()}
              </span>
            )}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: "var(--text-muted)", transition: "transform 0.3s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expandable */}
      <div style={{ maxHeight: expanded ? "900px" : "0", overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)" }}>
        <div className="px-5 pb-5 space-y-5">
          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Win Rate", value: `${s.winRate}%`, color: s.winRate >= 50 ? "#22c55e" : s.winRate >= 30 ? "#f59e0b" : "#ef4444", icon: "🎯" },
              { label: "Avg Follow-ups (Win)", value: `${s.avgFollowUpsToWin}`, color: "#6c63ff", icon: "✉️" },
              { label: "Días promedio cierre", value: `${s.avgDaysToClose}d`, color: "#3b82f6", icon: "⏱️" },
              { label: "Revenue", value: s.totalRevenue > 0 ? `$${s.totalRevenue.toLocaleString()}` : "—", color: "#8b5cf6", icon: "💰" },
            ].map(kpi => (
              <div key={kpi.label} className="p-3 rounded-xl card-hover" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{kpi.icon}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{kpi.label}</span>
                </div>
                <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Trend chart */}
          {data.trend.length > 1 && (
            <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Tendencia Mensual</h4>
              <div className="flex items-end gap-2 h-24">
                {data.trend.map(t => (
                  <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col items-center" style={{ height: "80px" }}>
                      <div className="w-full flex flex-col justify-end h-full gap-0.5">
                        <div className="w-full rounded-t" style={{
                          height: `${(t.wins / maxTrend) * 100}%`,
                          background: "#22c55e",
                          minHeight: t.wins > 0 ? "4px" : "0",
                          transition: "height 0.5s ease",
                        }} />
                        <div className="w-full rounded-b" style={{
                          height: `${(t.losses / maxTrend) * 100}%`,
                          background: "#ef4444",
                          minHeight: t.losses > 0 ? "4px" : "0",
                          transition: "height 0.5s ease",
                        }} />
                      </div>
                    </div>
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{t.label}</span>
                    <span className="text-xs font-bold" style={{ color: t.rate >= 50 ? "#22c55e" : "#ef4444" }}>{t.rate}%</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#22c55e" }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Ganados</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#ef4444" }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>Perdidos</span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* By Setter */}
            {data.setterStats.length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Win Rate por Setter</h4>
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
                        <div className="h-full rounded-full animate-progress" style={{
                          width: `${setter.rate}%`,
                          background: setter.rate >= 50 ? "#22c55e" : setter.rate >= 30 ? "#f59e0b" : "#ef4444",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loss Reasons */}
            <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                {data.topLossReasons.length > 0 ? "Motivos de Pérdida" : "Fuente de Deals"}
              </h4>
              {data.topLossReasons.length > 0 ? (
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
              ) : (
                <div className="space-y-2">
                  {data.sourceStats.map(src => (
                    <div key={src.source} className="flex items-center justify-between">
                      <span className="text-xs capitalize" style={{ color: "var(--text-secondary)" }}>{src.source}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold" style={{ color: src.rate >= 50 ? "#22c55e" : "#f59e0b" }}>{src.rate}%</span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>({src.total})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Follow-up comparison */}
          <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Comparación: Ganados vs Perdidos</h4>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: "#22c55e" }}>{s.avgFollowUpsToWin}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Follow-ups promedio (Wins)</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color: "#ef4444" }}>{s.avgFollowUpsToLoss}</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Follow-ups promedio (Losses)</p>
              </div>
            </div>
            {s.avgFollowUpsToWin > s.avgFollowUpsToLoss && (
              <p className="text-xs text-center mt-3 px-3 py-1.5 rounded-lg" style={{ background: "rgba(108,99,255,0.08)", color: "#6c63ff" }}>
                💡 Los deals ganados requieren en promedio {(s.avgFollowUpsToWin - s.avgFollowUpsToLoss).toFixed(1)} follow-ups más que los perdidos. ¡La persistencia paga!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
