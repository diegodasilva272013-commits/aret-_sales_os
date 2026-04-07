"use client"
import { useState, useEffect, useCallback } from "react"

type CoachInsight = { text: string; type: "pattern" | "warning" | "praise" | "action"; impact: "high" | "medium" | "low" }

type MemberCoaching = {
  id: string; name: string; role: string
  metrics: {
    prospectsAssigned: number; activeProspects: number; closedWon: number; closedLost: number
    followUpsSent: number; responseRate: number; avgFollowUps: number
    callsScheduled: number; callsCompleted: number
    messagesOutbound: number; messagesInbound: number; conversionRate: number
    avgResponseTimeH: number | null
  }
  insights: CoachInsight[]
  strengths: string[]; improvements: string[]
  overallScore: number; scoreLabel: string; trend: "up" | "down" | "stable"
}

type CoachData = {
  members: MemberCoaching[]
  teamInsights: CoachInsight[]
  stats: {
    teamSize: number; teamAvgScore: number; topPerformer: string; totalWins: number
    teamAvgConv: number; teamAvgResponseRate: number; trendingUp: number; trendingDown: number
  }
}

const insightConfig = {
  pattern: { icon: "🔍", color: "#8b5cf6", bg: "rgba(139,92,246,0.06)", border: "rgba(139,92,246,0.15)" },
  warning: { icon: "⚠️", color: "#ef4444", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.15)" },
  praise:  { icon: "🏆", color: "#22c55e", bg: "rgba(34,197,94,0.06)", border: "rgba(34,197,94,0.15)" },
  action:  { icon: "💡", color: "#f59e0b", bg: "rgba(245,158,11,0.06)", border: "rgba(245,158,11,0.15)" },
}

const trendConfig = {
  up:     { icon: "📈", color: "#22c55e", label: "En alza" },
  down:   { icon: "📉", color: "#ef4444", label: "En baja" },
  stable: { icon: "➡️", color: "#6b7280", label: "Estable" },
}

function scoreColor(s: number) {
  if (s >= 85) return "#22c55e"
  if (s >= 70) return "#f59e0b"
  if (s >= 55) return "#3b82f6"
  return "#6b7280"
}

export default function CoachAI() {
  const [data, setData] = useState<CoachData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"team" | "insights">("team")
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    fetch("/api/coach").then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 120000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl shimmer" />
          <div className="h-5 w-52 rounded shimmer" />
        </div>
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 rounded-xl shimmer" />)}</div>
      </div>
    )
  }

  if (!data || data.members.length === 0) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}>
            <span className="text-lg">🧠</span>
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Coach AI del Equipo</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sin datos de equipo aún</p>
          </div>
        </div>
      </div>
    )
  }

  const { stats, teamInsights } = data
  const selected = data.members.find(m => m.id === selectedMember) || null
  const allInsights = data.members.flatMap(m => m.insights.map(i => ({ ...i, memberName: m.name })))
  const highImpact = allInsights.filter(i => i.impact === "high")

  return (
    <div className="mb-6 rounded-2xl animate-scale-pop overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}>
              <span className="text-lg">🧠</span>
              {highImpact.length > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ background: "#ef4444" }}>
                  {highImpact.length}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Coach AI del Equipo</h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {stats.teamSize} miembros · Análisis de patrones personalizados
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats.trendingUp > 0 && (
              <span className="px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                📈 {stats.trendingUp} en alza
              </span>
            )}
            {stats.trendingDown > 0 && (
              <span className="px-2 py-1 rounded-full text-[10px] font-bold animate-pulse" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                📉 {stats.trendingDown} en baja
              </span>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Score", value: `${stats.teamAvgScore}pts`, color: scoreColor(stats.teamAvgScore), icon: "📊" },
            { label: "Conversión", value: `${stats.teamAvgConv}%`, color: stats.teamAvgConv > 15 ? "#22c55e" : "#f59e0b", icon: "🎯" },
            { label: "Cierres", value: stats.totalWins, color: "#22c55e", icon: "🏆" },
            { label: "Top", value: stats.topPerformer.split(" ")[0], color: "#f59e0b", icon: "⭐" },
          ].map(s => (
            <div key={s.label} className="p-2 rounded-xl text-center" style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}>
              <span className="text-xs">{s.icon}</span>
              <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Team-level insight banner */}
        {teamInsights.length > 0 && (
          <div className="p-3 rounded-xl mb-4" style={{ background: insightConfig[teamInsights[0].type].bg, border: `1px solid ${insightConfig[teamInsights[0].type].border}` }}>
            <p className="text-xs font-medium" style={{ color: insightConfig[teamInsights[0].type].color }}>
              {insightConfig[teamInsights[0].type].icon} {teamInsights[0].text}
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          {[
            { key: "team" as const, label: "👥 Equipo", count: stats.teamSize },
            { key: "insights" as const, label: "🧠 Insights AI", count: highImpact.length },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
              style={{
                background: tab === t.key ? "var(--accent)" : "var(--surface-2)",
                color: tab === t.key ? "white" : "var(--text-secondary)",
                border: `1px solid ${tab === t.key ? "var(--accent)" : "var(--border)"}`,
              }}>
              {t.label} <span className="opacity-70">({t.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-5 pb-5">
        {/* ================== TEAM TAB ================== */}
        {tab === "team" && (
          <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
            {data.members.map((member, i) => {
              const isOpen = selectedMember === member.id
              const color = scoreColor(member.overallScore)
              const tc = trendConfig[member.trend]
              const highInsights = member.insights.filter(ins => ins.impact === "high")

              return (
                <div key={member.id} className="rounded-xl transition-all animate-fade-in"
                  style={{ background: "var(--surface-2)", border: `1px solid ${isOpen ? color : "var(--border)"}`, animationDelay: `${i * 0.04}s` }}>

                  {/* Member row */}
                  <button onClick={() => setSelectedMember(isOpen ? null : member.id)}
                    className="w-full flex items-center gap-3 p-4 text-left">
                    {/* Rank badge */}
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: i === 0 ? "linear-gradient(135deg,#f59e0b,#ef4444)" : `${color}15`,
                        color: i === 0 ? "white" : color,
                      }}>
                      {i === 0 ? "👑" : i + 1}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{member.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded capitalize" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>
                          {member.role}
                        </span>
                        <span className="text-[10px]" style={{ color: tc.color }}>{tc.icon}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
                        <span>{member.scoreLabel}</span>
                        <span>·</span>
                        <span>{member.metrics.conversionRate}% conv</span>
                        <span>·</span>
                        <span>{member.metrics.closedWon}W/{member.metrics.closedLost}L</span>
                        {member.metrics.avgResponseTimeH !== null && (
                          <><span>·</span><span style={{ color: member.metrics.avgResponseTimeH > 12 ? "#ef4444" : "var(--text-muted)" }}>
                            ⚡{member.metrics.avgResponseTimeH}h resp
                          </span></>
                        )}
                      </div>
                    </div>

                    {/* Score + alert count */}
                    <div className="flex items-center gap-2 shrink-0">
                      {highInsights.length > 0 && (
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                          style={{ background: "#ef4444" }}>{highInsights.length}</span>
                      )}
                      <div className="text-right">
                        <span className="text-lg font-bold" style={{ color }}>{member.overallScore}</span>
                        <div className="w-14 h-1.5 rounded-full mt-1" style={{ background: "var(--surface)" }}>
                          <div className="h-full rounded-full" style={{ width: `${member.overallScore}%`, background: color }} />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="px-4 pb-4 animate-fade-in">
                      {/* Key metrics grid */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                        {[
                          { label: "Prospectos", value: member.metrics.prospectsAssigned },
                          { label: "Ganados", value: member.metrics.closedWon, color: "#22c55e" },
                          { label: "Perdidos", value: member.metrics.closedLost, color: "#ef4444" },
                          { label: "Resp. FU", value: `${member.metrics.responseRate}%` },
                          { label: "Avg FU", value: member.metrics.avgFollowUps },
                          { label: "Llamadas", value: member.metrics.callsCompleted },
                        ].map(metric => (
                          <div key={metric.label} className="p-2 rounded-lg text-center" style={{ background: "var(--surface)" }}>
                            <p className="text-sm font-bold" style={{ color: (metric as { color?: string }).color || "var(--text-primary)" }}>{metric.value}</p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{metric.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Strengths + Improvements row */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        <div className="p-3 rounded-lg" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}>
                          <p className="text-[10px] font-bold mb-1.5" style={{ color: "#22c55e" }}>✅ Fortalezas</p>
                          {member.strengths.map((s, j) => (
                            <p key={j} className="text-[11px] mb-0.5" style={{ color: "var(--text-secondary)" }}>• {s}</p>
                          ))}
                        </div>
                        <div className="p-3 rounded-lg" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                          <p className="text-[10px] font-bold mb-1.5" style={{ color: "#f59e0b" }}>⚡ A mejorar</p>
                          {member.improvements.length > 0 ? member.improvements.map((s, j) => (
                            <p key={j} className="text-[11px] mb-0.5" style={{ color: "var(--text-secondary)" }}>• {s}</p>
                          )) : <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Sin puntos débiles</p>}
                        </div>
                      </div>

                      {/* AI Insights — the key feature */}
                      {member.insights.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-bold" style={{ color: "#8b5cf6" }}>🧠 Coaching AI Personalizado</p>
                          {member.insights.map((insight, j) => {
                            const cfg = insightConfig[insight.type]
                            return (
                              <div key={j} className="p-3 rounded-lg" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                                <div className="flex items-start gap-2">
                                  <span className="text-sm shrink-0">{cfg.icon}</span>
                                  <div className="flex-1">
                                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{insight.text}</p>
                                    <div className="flex items-center gap-2 mt-1.5">
                                      <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                                        style={{ background: `${cfg.color}15`, color: cfg.color }}>
                                        {insight.type === "pattern" ? "PATRÓN" : insight.type === "warning" ? "ALERTA" : insight.type === "praise" ? "FORTALEZA" : "ACCIÓN"}
                                      </span>
                                      <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                                        style={{
                                          background: insight.impact === "high" ? "rgba(239,68,68,0.1)" : insight.impact === "medium" ? "rgba(245,158,11,0.1)" : "rgba(107,114,128,0.1)",
                                          color: insight.impact === "high" ? "#ef4444" : insight.impact === "medium" ? "#f59e0b" : "#6b7280",
                                        }}>
                                        {insight.impact === "high" ? "ALTO IMPACTO" : insight.impact === "medium" ? "IMPACTO MEDIO" : "INFO"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ================== INSIGHTS TAB ================== */}
        {tab === "insights" && (
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {/* Team insights first */}
            {teamInsights.map((ti, i) => {
              const cfg = insightConfig[ti.type]
              return (
                <div key={`team-${i}`} className="p-3 rounded-xl animate-fade-in" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6" }}>
                      EQUIPO
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{cfg.icon} {ti.text}</p>
                </div>
              )
            })}

            {/* All individual high-impact insights */}
            {allInsights
              .sort((a, b) => {
                const order = { high: 0, medium: 1, low: 2 }
                return order[a.impact] - order[b.impact]
              })
              .map((insight, i) => {
                const cfg = insightConfig[insight.type]
                return (
                  <div key={i} className="p-3 rounded-xl animate-fade-in"
                    style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, animationDelay: `${i * 0.03}s` }}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                        {(insight as { memberName?: string }).memberName}
                      </span>
                      <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                        style={{
                          background: insight.impact === "high" ? "rgba(239,68,68,0.1)" : insight.impact === "medium" ? "rgba(245,158,11,0.1)" : "rgba(107,114,128,0.1)",
                          color: insight.impact === "high" ? "#ef4444" : insight.impact === "medium" ? "#f59e0b" : "#6b7280",
                        }}>
                        {insight.impact === "high" ? "ALTO" : insight.impact === "medium" ? "MEDIO" : "INFO"}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{cfg.icon} {insight.text}</p>
                  </div>
                )
              })}

            {allInsights.length === 0 && teamInsights.length === 0 && (
              <div className="text-center py-10">
                <span className="text-3xl mb-3 block">🧠</span>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Sin insights aún</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Se generan con más datos de actividad del equipo</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
