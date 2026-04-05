"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import type { AutopilotAction } from "@/app/api/autopilot/route"

const typeConfig: Record<AutopilotAction["type"], { icon: string; color: string; bg: string; label: string }> = {
  respond_now: { icon: "🔴", color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "RESPONDER YA" },
  call_today: { icon: "🟠", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "LLAMAR HOY" },
  follow_up: { icon: "🟡", color: "#eab308", bg: "rgba(234,179,8,0.10)", label: "FOLLOW-UP" },
  hot_lead: { icon: "🔵", color: "#6c63ff", bg: "rgba(108,99,255,0.12)", label: "LEAD CALIENTE" },
  drop: { icon: "⚫", color: "#6b7280", bg: "rgba(107,114,128,0.10)", label: "SOLTAR" },
}

export default function AutopilotPanel({ userName }: { userName?: string }) {
  const [actions, setActions] = useState<AutopilotAction[]>([])
  const [loading, setLoading] = useState(true)
  const [briefing, setBriefing] = useState("")
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [displayedText, setDisplayedText] = useState("")
  const [showActions, setShowActions] = useState(false)
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load actions
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/autopilot")
        if (!res.ok) return
        const data = await res.json()
        setActions(data.actions || [])
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Load AI briefing after actions are ready
  useEffect(() => {
    if (loading) return
    setBriefingLoading(true)
    async function loadBriefing() {
      try {
        const res = await fetch("/api/autopilot/briefing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actions, userName: userName || "" }),
        })
        if (!res.ok) return
        const data = await res.json()
        setBriefing(data.briefing || "")
      } catch {
        // silent
      } finally {
        setBriefingLoading(false)
      }
    }
    loadBriefing()
  }, [loading, actions, userName])

  // Typewriter effect
  useEffect(() => {
    if (!briefing) return
    setDisplayedText("")
    let i = 0
    function type() {
      if (i < briefing.length) {
        setDisplayedText(briefing.slice(0, i + 1))
        i++
        typewriterRef.current = setTimeout(type, 18)
      } else {
        setShowActions(true)
      }
    }
    type()
    return () => {
      if (typewriterRef.current) clearTimeout(typewriterRef.current)
    }
  }, [briefing])

  // Skip typewriter on click
  function skipTypewriter() {
    if (typewriterRef.current) clearTimeout(typewriterRef.current)
    setDisplayedText(briefing)
    setShowActions(true)
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-6 mb-6 animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl" style={{ background: "var(--surface-2)" }} />
          <div className="h-4 w-32 rounded-lg" style={{ background: "var(--surface-2)" }} />
        </div>
        <div className="h-16 rounded-xl" style={{ background: "var(--surface-2)" }} />
      </div>
    )
  }

  return (
    <div className="rounded-2xl mb-6 overflow-hidden animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Agent Header + Briefing */}
      <div className="p-6 cursor-pointer" onClick={skipTypewriter} style={{ borderBottom: showActions && actions.length > 0 ? "1px solid var(--border)" : "none" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ background: "linear-gradient(135deg, #6c63ff, #7c3aed)" }}>
              <span className="text-lg">🧠</span>
              {(briefingLoading || (displayedText && displayedText.length < briefing.length)) && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 animate-pulse" style={{ background: "#22c55e", borderColor: "var(--surface)" }} />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Areté IA OS</h3>
              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {briefingLoading ? "Analizando prospectos..." : actions.length > 0 ? `${actions.length} acción${actions.length !== 1 ? "es" : ""} pendiente${actions.length !== 1 ? "s" : ""}` : "Sin urgencias"}
              </p>
            </div>
          </div>
          {actions.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: actions[0]?.type === "respond_now" ? "rgba(239,68,68,0.12)" : "rgba(108,99,255,0.10)" }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: actions[0]?.type === "respond_now" ? "#ef4444" : "#6c63ff" }} />
              <span className="text-xs font-semibold" style={{ color: actions[0]?.type === "respond_now" ? "#ef4444" : "#6c63ff" }}>
                {actions[0]?.type === "respond_now" ? "Urgente" : "Activo"}
              </span>
            </div>
          )}
        </div>

        {/* AI Briefing bubble */}
        <div className="rounded-xl p-4" style={{ background: "var(--surface-2)" }}>
          {briefingLoading ? (
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#6c63ff", animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#6c63ff", animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: "#6c63ff", animationDelay: "300ms" }} />
              </div>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>Pensando...</span>
            </div>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
              {displayedText}
              {displayedText.length < briefing.length && (
                <span className="inline-block w-0.5 h-4 ml-0.5 animate-pulse" style={{ background: "#6c63ff", verticalAlign: "text-bottom" }} />
              )}
            </p>
          )}
        </div>
      </div>

      {/* Action cards - appear after briefing finishes typing */}
      {showActions && actions.length > 0 && (
        <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {actions.map((action, idx) => {
            const cfg = typeConfig[action.type]
            return (
              <Link
                key={action.id}
                href={`/prospects/${action.prospectId}`}
                className="group relative p-3.5 rounded-xl transition-all hover:scale-[1.02]"
                style={{ background: cfg.bg, border: "1px solid transparent" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = cfg.color + "40")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{cfg.icon}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  {action.aiScore && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>
                      {action.aiScore}pts
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                  {action.prospectName}
                </p>
                {action.company && (
                  <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{action.company}</p>
                )}
                <p className="text-[10px] mt-1 leading-snug" style={{ color: cfg.color }}>
                  {action.detail}
                </p>
                {idx < 2 && (
                  <div className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.color }} />
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
