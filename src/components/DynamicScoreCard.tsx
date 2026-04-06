"use client"

import { useState, useEffect } from "react"
import { getScoreColor, getScoreEmoji, getDynamicLabel, type DynamicScoreEvent } from "@/lib/parseAIScore"

type DynamicData = {
  baseScore: number
  dynamicScore: number
  delta: number
  events: DynamicScoreEvent[]
  trend: "up" | "down" | "stable"
}

const TREND_ICON = { up: "📈", down: "📉", stable: "➡️" }

export default function DynamicScoreCard({ prospectId }: { prospectId: string }) {
  const [data, setData] = useState<DynamicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/score/dynamic?prospect_id=${prospectId}`)
      .then(r => r.json())
      .then(d => { if (d.dynamicScore !== undefined) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [prospectId])

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl p-4 animate-pulse" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="h-4 w-48 rounded" style={{ background: "var(--surface-2)" }} />
      </div>
    )
  }
  if (!data) return null

  const color = getScoreColor(data.dynamicScore)
  const emoji = getScoreEmoji(data.dynamicScore)
  const label = getDynamicLabel(data.dynamicScore)
  const deltaSign = data.delta > 0 ? "+" : ""
  const deltaColor = data.delta > 0 ? "#22c55e" : data.delta < 0 ? "#ef4444" : "var(--text-muted)"

  return (
    <div className="mb-6 rounded-2xl overflow-hidden animate-fade-in"
      style={{ border: `1px solid ${color}40` }}>

      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between"
        style={{ background: `${color}18` }}>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: 26 }}>{emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold" style={{ color }}>{data.dynamicScore}</span>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>/100</span>
              {data.delta !== 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${deltaColor}15`, color: deltaColor }}>
                  {TREND_ICON[data.trend]} {deltaSign}{data.delta}
                </span>
              )}
            </div>
            <p className="text-xs capitalize" style={{ color }}>
              Score Dinámico · {label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data.baseScore !== data.dynamicScore && (
            <span className="text-xs px-2 py-1 rounded-lg"
              style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
              Base AI: {data.baseScore}
            </span>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              transition: "all 0.2s",
            }}
          >
            {expanded ? "Ocultar" : "Ver señales"}
          </button>
        </div>
      </div>

      {/* Score bar */}
      <div className="px-5 py-3" style={{ background: "var(--surface)" }}>
        <div className="relative w-full h-3 rounded-full" style={{ background: "var(--surface-2)" }}>
          {/* Base score marker */}
          {data.baseScore !== data.dynamicScore && (
            <div style={{
              position: "absolute",
              left: `${data.baseScore}%`,
              top: -2,
              width: 2,
              height: "calc(100% + 4px)",
              background: "var(--text-muted)",
              borderRadius: 1,
              opacity: 0.5,
              zIndex: 2,
            }} />
          )}
          {/* Dynamic score fill */}
          <div className="h-full rounded-full transition-all duration-700" style={{
            width: `${data.dynamicScore}%`,
            background: `linear-gradient(90deg, ${getScoreColor(Math.max(0, data.dynamicScore - 30))}, ${color})`,
          }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>0</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>100</span>
        </div>
      </div>

      {/* Events breakdown */}
      {expanded && data.events.length > 0 && (
        <div className="px-5 pb-4" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold pt-3 pb-2" style={{ color: "var(--text-secondary)" }}>
            Señales de comportamiento (últimos 30 días)
          </p>
          <div style={{ display: "grid", gap: 6 }}>
            {data.events.map((ev, i) => (
              <div key={i} className="flex items-center gap-3 text-xs" style={{ padding: "4px 0" }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                  background: ev.delta > 0 ? "#22c55e" : ev.delta < 0 ? "#ef4444" : "#6b7280",
                }} />
                <span style={{ color: "var(--text-secondary)", flex: 1 }}>{ev.label}</span>
                <span className="font-semibold" style={{
                  color: ev.delta > 0 ? "#22c55e" : "#ef4444",
                }}>
                  {ev.delta > 0 ? "+" : ""}{ev.delta}
                </span>
                {ev.date && (
                  <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
                    {new Date(ev.date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
