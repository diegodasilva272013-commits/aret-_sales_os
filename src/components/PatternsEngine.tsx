"use client"

import { useEffect, useState, useRef } from "react"
import type { PatternInsight } from "@/app/api/patterns/route"

export default function PatternsEngine() {
  const [insights, setInsights] = useState<PatternInsight[]>([])
  const [playbook, setPlaybook] = useState("")
  const [stats, setStats] = useState<{ total: number; ganados: number; perdidos: number; winRate: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [displayedPlaybook, setDisplayedPlaybook] = useState("")
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/patterns")
        if (!res.ok) return
        const data = await res.json()
        setInsights(data.insights || [])
        setPlaybook(data.playbook || "")
        setStats(data.stats || null)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Typewriter for playbook when expanded
  useEffect(() => {
    if (!expanded || !playbook) return
    setDisplayedPlaybook("")
    let i = 0
    function type() {
      if (i < playbook.length) {
        setDisplayedPlaybook(playbook.slice(0, i + 1))
        i++
        typewriterRef.current = setTimeout(type, 15)
      }
    }
    type()
    return () => {
      if (typewriterRef.current) clearTimeout(typewriterRef.current)
    }
  }, [expanded, playbook])

  function skipPlaybookType() {
    if (typewriterRef.current) clearTimeout(typewriterRef.current)
    setDisplayedPlaybook(playbook)
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-6 mb-6 animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl" style={{ background: "var(--surface-2)" }} />
          <div className="h-4 w-40 rounded-lg" style={{ background: "var(--surface-2)" }} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-xl" style={{ background: "var(--surface-2)" }} />
          ))}
        </div>
      </div>
    )
  }

  if (!stats || stats.total < 3 || (stats.ganados + stats.perdidos) < 2) {
    return (
      <div className="rounded-2xl p-6 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
            <span className="text-base">🧠</span>
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Motor de Patrones</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Necesita al menos 2 deals cerrados para analizar patrones. Tenés {stats?.ganados || 0} ganados y {stats?.perdidos || 0} perdidos.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl mb-6 overflow-hidden animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
              <span className="text-base">🧠</span>
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Motor de Patrones</h3>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {insights.length} patrón{insights.length !== 1 ? "es" : ""} detectado{insights.length !== 1 ? "s" : ""} en {stats.ganados + stats.perdidos} deals
              </p>
            </div>
          </div>
          {/* Win rate badge */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: stats.winRate >= 50 ? "#22c55e" : stats.winRate >= 30 ? "#f59e0b" : "#ef4444" }}>
                {stats.winRate}%
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Win Rate</p>
            </div>
            <div className="flex gap-1 text-[10px] font-semibold">
              <span className="px-1.5 py-0.5 rounded-md" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>{stats.ganados}W</span>
              <span className="px-1.5 py-0.5 rounded-md" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>{stats.perdidos}L</span>
            </div>
          </div>
        </div>

        {/* Insight cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          {insights.map(insight => (
            <div
              key={insight.id}
              className="p-3.5 rounded-xl"
              style={{ background: `${insight.color}10`, border: `1px solid ${insight.color}20` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{insight.icon}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: insight.color }}>
                    {insight.category === "disc" ? "DISC" : insight.category === "speed" ? "VELOCIDAD" : insight.category === "followup" ? "FOLLOW-UP" : insight.category === "source" ? "FUENTE" : insight.category === "phase" ? "PIPELINE" : "TIMING"}
                  </span>
                </div>
                <span className="text-sm font-bold" style={{ color: insight.color }}>
                  {insight.stat}
                </span>
              </div>
              <p className="text-xs font-semibold mb-0.5" style={{ color: "var(--text-primary)" }}>
                {insight.title}
              </p>
              <p className="text-[10px] leading-snug" style={{ color: "var(--text-muted)" }}>
                {insight.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Playbook toggle */}
      {playbook && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-6 py-3 flex items-center justify-between text-xs font-semibold transition-colors"
            style={{ borderTop: "1px solid var(--border)", color: "#f59e0b", background: expanded ? "var(--surface-2)" : "transparent" }}
          >
            <span>📋 Ver Playbook AI</span>
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {expanded && (
            <div className="px-6 pb-5 cursor-pointer" onClick={skipPlaybookType}>
              <div className="rounded-xl p-4" style={{ background: "var(--surface-2)" }}>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                  {displayedPlaybook}
                  {displayedPlaybook.length < playbook.length && (
                    <span className="inline-block w-0.5 h-4 ml-0.5 animate-pulse" style={{ background: "#f59e0b", verticalAlign: "text-bottom" }} />
                  )}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
