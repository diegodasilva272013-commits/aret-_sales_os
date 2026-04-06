"use client"
import { useState, useEffect } from "react"

type MemberCoaching = {
  id: string
  name: string
  role: string
  metrics: {
    prospectsAssigned: number; activeProspects: number; closedWon: number; closedLost: number
    followUpsSent: number; responseRate: number; avgFollowUps: number
    callsScheduled: number; callsCompleted: number
    messagesOutbound: number; messagesInbound: number; conversionRate: number
  }
  strengths: string[]
  improvements: string[]
  tips: string[]
  overallScore: number
  scoreLabel: string
}

type CoachData = {
  members: MemberCoaching[]
  stats: { teamSize: number; teamAvgScore: number; topPerformer: string; totalWins: number }
}

function getScoreColor(score: number) {
  if (score >= 85) return "#22c55e"
  if (score >= 70) return "#f59e0b"
  if (score >= 55) return "#3b82f6"
  return "#6b7280"
}

export default function CoachAI() {
  const [data, setData] = useState<CoachData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/coach").then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl shimmer" />
          <div className="h-5 w-52 rounded shimmer" />
        </div>
        <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="h-28 rounded-xl shimmer" />)}</div>
      </div>
    )
  }

  if (!data || data.members.length === 0) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}>
            <span className="text-base">🧠</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Coach AI del Equipo</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sin datos de equipo aún</p>
          </div>
        </div>
      </div>
    )
  }

  const selected = data.members.find(m => m.id === selectedMember) || null

  return (
    <div className="mb-6 rounded-2xl animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-5 text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}>
            <span className="text-base">🧠</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Coach AI del Equipo</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {data.stats.teamSize} miembros · Promedio {data.stats.teamAvgScore}pts
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6" }}>
              ⭐ {data.stats.topPerformer.split(" ")[0]}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
              {data.stats.totalWins} cierres
            </span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: "var(--text-muted)", transition: "transform 0.3s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expandable content */}
      <div style={{ maxHeight: expanded ? "1500px" : "0", overflow: "hidden", transition: "max-height 0.5s cubic-bezier(0.4,0,0.2,1)" }}>
        <div className="px-5 pb-5">
          {/* Team overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Equipo", value: data.stats.teamSize, icon: "👥", color: "#6c63ff" },
              { label: "Score Promedio", value: `${data.stats.teamAvgScore}pts`, icon: "📊", color: "#8b5cf6" },
              { label: "Top Performer", value: data.stats.topPerformer.split(" ")[0], icon: "⭐", color: "#f59e0b" },
              { label: "Total Cierres", value: data.stats.totalWins, icon: "🎯", color: "#22c55e" },
            ].map(kpi => (
              <div key={kpi.label} className="p-3 rounded-xl text-center" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <span className="text-lg">{kpi.icon}</span>
                <p className="text-lg font-bold mt-1" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{kpi.label}</p>
              </div>
            ))}
          </div>

          {/* Member cards */}
          <div className="space-y-3">
            {data.members.map((member, i) => {
              const isOpen = selectedMember === member.id
              const color = getScoreColor(member.overallScore)
              return (
                <div key={member.id} className="rounded-xl overflow-hidden transition-all animate-fade-in"
                  style={{ background: "var(--surface-2)", border: `1px solid ${isOpen ? color : "var(--border)"}`, animationDelay: `${i * 0.05}s` }}>
                  {/* Member header row */}
                  <button onClick={() => setSelectedMember(isOpen ? null : member.id)}
                    className="w-full flex items-center gap-3 p-4 text-left">
                    {/* Rank */}
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: i === 0 ? "linear-gradient(135deg,#f59e0b,#ef4444)" : `${color}20`, color: i === 0 ? "white" : color }}>
                      {i + 1}
                    </div>
                    {/* Name + role */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{member.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded-full capitalize" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>
                          {member.role}
                        </span>
                      </div>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {member.scoreLabel} · {member.metrics.prospectsAssigned} prospectos · {member.metrics.conversionRate}% conv.
                      </p>
                    </div>
                    {/* Score */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-12 h-2 rounded-full" style={{ background: "var(--surface)" }}>
                        <div className="h-full rounded-full animate-progress" style={{ width: `${member.overallScore}%`, background: color }} />
                      </div>
                      <span className="text-sm font-bold w-10 text-right" style={{ color }}>{member.overallScore}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        style={{ color: "var(--text-muted)", transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0)" }}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded coaching detail */}
                  {isOpen && (
                    <div className="px-4 pb-4 animate-fade-in">
                      {/* Key metrics */}
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                        {[
                          { label: "Prospectos", value: member.metrics.prospectsAssigned },
                          { label: "Ganados", value: member.metrics.closedWon },
                          { label: "Perdidos", value: member.metrics.closedLost },
                          { label: "Resp. FU", value: `${member.metrics.responseRate}%` },
                          { label: "Avg FU", value: member.metrics.avgFollowUps },
                          { label: "Llamadas", value: member.metrics.callsCompleted },
                        ].map(metric => (
                          <div key={metric.label} className="p-2 rounded-lg text-center" style={{ background: "var(--surface)" }}>
                            <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{metric.value}</p>
                            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{metric.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {/* Strengths */}
                        <div className="p-3 rounded-lg" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                          <p className="text-xs font-semibold mb-2" style={{ color: "#22c55e" }}>✅ Fortalezas</p>
                          <div className="space-y-1">
                            {member.strengths.map((s, j) => (
                              <p key={j} className="text-xs" style={{ color: "var(--text-secondary)" }}>• {s}</p>
                            ))}
                          </div>
                        </div>
                        {/* Improvements */}
                        <div className="p-3 rounded-lg" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
                          <p className="text-xs font-semibold mb-2" style={{ color: "#f59e0b" }}>⚡ A mejorar</p>
                          <div className="space-y-1">
                            {member.improvements.length > 0 ? member.improvements.map((s, j) => (
                              <p key={j} className="text-xs" style={{ color: "var(--text-secondary)" }}>• {s}</p>
                            )) : <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sin puntos débiles detectados</p>}
                          </div>
                        </div>
                      </div>

                      {/* AI Tips */}
                      <div className="mt-3 p-3 rounded-lg" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                        <p className="text-xs font-semibold mb-2" style={{ color: "#8b5cf6" }}>🧠 Consejos del Coach AI</p>
                        <div className="space-y-2">
                          {member.tips.map((tip, j) => (
                            <div key={j} className="flex gap-2">
                              <span className="text-xs font-bold shrink-0" style={{ color: "#8b5cf6" }}>→</span>
                              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{tip}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
