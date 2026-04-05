"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"
import type { AutopilotAction } from "@/app/api/autopilot/route"

const typeConfig: Record<AutopilotAction["type"], { icon: string; color: string; bg: string; label: string }> = {
  respond_now: { icon: "🔴", color: "#ef4444", bg: "rgba(239,68,68,0.12)", label: "RESPONDER YA" },
  call_today: { icon: "🟠", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", label: "LLAMAR HOY" },
  follow_up: { icon: "🟡", color: "#eab308", bg: "rgba(234,179,8,0.10)", label: "FOLLOW-UP" },
  hot_lead: { icon: "🔵", color: "#6c63ff", bg: "rgba(108,99,255,0.12)", label: "LEAD CALIENTE" },
  drop: { icon: "⚫", color: "#6b7280", bg: "rgba(107,114,128,0.10)", label: "SOLTAR" },
}

export default function AutopilotPanel() {
  const [actions, setActions] = useState<AutopilotAction[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="rounded-2xl p-6 mb-6 animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="h-5 w-48 rounded-lg mb-4" style={{ background: "var(--surface-2)" }} />
        <div className="grid grid-cols-2 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-20 rounded-xl" style={{ background: "var(--surface-2)" }} />
          ))}
        </div>
      </div>
    )
  }

  if (actions.length === 0) {
    return (
      <div className="rounded-2xl p-6 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6c63ff, #7c3aed)" }}>
            <span className="text-sm">🧠</span>
          </div>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Areté IA OS</h3>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          ✅ Todo al día — no hay acciones urgentes ahora mismo.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl p-6 mb-6 animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6c63ff, #7c3aed)" }}>
            <span className="text-base">🧠</span>
          </div>
          <div>
            <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Areté IA OS</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {actions.length} acción{actions.length !== 1 ? "es" : ""} recomendada{actions.length !== 1 ? "s" : ""} ahora
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: actions[0]?.type === "respond_now" ? "rgba(239,68,68,0.12)" : "rgba(108,99,255,0.10)" }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: actions[0]?.type === "respond_now" ? "#ef4444" : "#6c63ff" }} />
          <span className="text-xs font-semibold" style={{ color: actions[0]?.type === "respond_now" ? "#ef4444" : "#6c63ff" }}>
            {actions[0]?.type === "respond_now" ? "Urgente" : "Activo"}
          </span>
        </div>
      </div>

      {/* Actions grid */}
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, idx) => {
          const cfg = typeConfig[action.type]
          return (
            <Link
              key={action.id}
              href={`/prospects/${action.prospectId}`}
              className="group relative p-4 rounded-xl transition-all hover:scale-[1.02]"
              style={{ background: cfg.bg, border: `1px solid transparent` }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = cfg.color + "40")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "transparent")}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{cfg.icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
                {action.aiScore && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#8b5cf6" }}>
                    🤖 {action.aiScore}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                {action.prospectName}
              </p>
              {action.company && (
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{action.company}</p>
              )}
              <p className="text-xs mt-1.5 leading-relaxed" style={{ color: cfg.color }}>
                {action.detail}
              </p>
              {/* Priority indicator */}
              {idx < 2 && (
                <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.color }} />
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
