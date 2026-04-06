"use client"

import { useState, useEffect } from "react"

type TimingSlot = { day: number; dayLabel: string; hour: number; hourLabel: string; responseRate: number; count: number }
type IndustryPattern = { industry: string; bestSlots: TimingSlot[]; avgResponseMinutes: number; sampleSize: number }
type HeatCell = { day: number; hour: number; value: number }

type TimingData = {
  heatmap: HeatCell[]
  bestSlots: TimingSlot[]
  industryPatterns: IndustryPattern[]
  avgResponseMinutes: number
  bestDay: { label: string; rate: number; total: number } | null
  worstDay: { label: string; rate: number; total: number } | null
  totalDataPoints: number
}

const DIAS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const HORAS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

const INDUSTRY_ICONS: Record<string, string> = {
  "Tecnología": "💻", "Marketing": "📢", "Finanzas": "💰", "Salud": "🏥",
  "Educación": "🎓", "Inmobiliaria": "🏠", "Legal": "⚖️", "Retail": "🛍️",
  "Gastronomía": "🍽️", "Consultoría": "📊",
}

function getHeatColor(value: number): string {
  if (value === 0) return "rgba(108,99,255,0.04)"
  if (value < 20) return "rgba(108,99,255,0.1)"
  if (value < 40) return "rgba(108,99,255,0.22)"
  if (value < 60) return "rgba(108,99,255,0.4)"
  if (value < 80) return "rgba(34,197,94,0.45)"
  return "rgba(34,197,94,0.7)"
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function TimingEngine() {
  const [data, setData] = useState<TimingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<{ day: number; hour: number; value: number } | null>(null)

  useEffect(() => {
    fetch("/api/timing")
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="rounded-2xl mb-6 overflow-hidden animate-scale-pop"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="p-6 flex items-center gap-3">
          <div className="shimmer" style={{ width: 32, height: 32, borderRadius: 10 }} />
          <div>
            <div className="shimmer" style={{ width: 180, height: 16, marginBottom: 6 }} />
            <div className="shimmer" style={{ width: 120, height: 12 }} />
          </div>
        </div>
      </div>
    )
  }

  if (!data || data.totalDataPoints < 3) {
    return (
      <div className="rounded-2xl mb-6 overflow-hidden animate-scale-pop"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(108,99,255,0.12)" }}>
            <span className="text-base">🕐</span>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Timing Inteligente</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Necesitás más datos para activar predicciones. Seguí enviando mensajes.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const topSlot = data.bestSlots[0]

  return (
    <div className="rounded-2xl mb-6 overflow-hidden animate-scale-pop"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center justify-between btn-press"
        style={{ background: "transparent" }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center animate-float"
            style={{ background: "linear-gradient(135deg, rgba(108,99,255,0.15), rgba(124,58,237,0.15))" }}>
            <span className="text-lg">🕐</span>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Timing Inteligente</p>
              <span className="px-1.5 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e", fontSize: 10 }}>
                {data.totalDataPoints} datos
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {topSlot
                ? <>Mejor horario: <span style={{ color: "var(--accent-light)", fontWeight: 600 }}>{topSlot.dayLabel} {topSlot.hourLabel}</span> ({topSlot.responseRate}% respuestas)</>
                : "Analizando patrones de respuesta..."
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Quick stat pills */}
          {data.bestDay && (
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs"
              style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.15)" }}>
              🏆 {data.bestDay.label}: {data.bestDay.rate}%
            </span>
          )}
          {data.avgResponseMinutes > 0 && (
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs"
              style={{ background: "rgba(108,99,255,0.08)", color: "var(--accent-light)", border: "1px solid rgba(108,99,255,0.15)" }}>
              ⚡ Resp. promedio: {formatMinutes(data.avgResponseMinutes)}
            </span>
          )}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: "var(--text-muted)", transition: "transform 0.2s ease", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expandable content */}
      <div style={{
        maxHeight: expanded ? 800 : 0,
        overflow: "hidden",
        transition: "max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}>
        <div className="px-5 pb-5">

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: "Mejor día", value: data.bestDay?.label || "—", sub: data.bestDay ? `${data.bestDay.rate}% tasa` : "", icon: "📅", color: "#22c55e" },
              { label: "Peor día", value: data.worstDay?.label || "—", sub: data.worstDay ? `${data.worstDay.rate}% tasa` : "", icon: "📉", color: "#ef4444" },
              { label: "Resp. promedio", value: data.avgResponseMinutes > 0 ? formatMinutes(data.avgResponseMinutes) : "—", sub: "tiempo de respuesta", icon: "⚡", color: "#8b5cf6" },
              { label: "Datos analizados", value: `${data.totalDataPoints}`, sub: "últimos 90 días", icon: "📊", color: "var(--accent)" },
            ].map(kpi => (
              <div key={kpi.label} className="p-3 rounded-xl card-hover"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm">{kpi.icon}</span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{kpi.label}</span>
                </div>
                <p className="text-lg font-bold number-roll" style={{ color: kpi.color }}>{kpi.value}</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{kpi.sub}</p>
              </div>
            ))}
          </div>

          {/* Heatmap */}
          <div className="mb-5">
            <p className="text-xs font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              Mapa de Calor — Tasa de Respuesta por Día y Hora
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              {/* Hour headers */}
              <div className="flex" style={{ background: "var(--surface-2)" }}>
                <div className="w-10 shrink-0" />
                {HORAS.map(h => (
                  <div key={h} className="flex-1 text-center py-1.5">
                    <span className="text-xs" style={{ color: "var(--text-muted)", fontSize: 9 }}>{h}</span>
                  </div>
                ))}
              </div>
              {/* Rows */}
              {DIAS_SHORT.map((dia, d) => (
                <div key={d} className="flex" style={{ borderTop: "1px solid var(--border)" }}>
                  <div className="w-10 shrink-0 flex items-center justify-center">
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)", fontSize: 10 }}>{dia}</span>
                  </div>
                  {HORAS.map(h => {
                    const cell = data.heatmap.find(c => c.day === d && c.hour === h)
                    const val = cell?.value || 0
                    const isHovered = hoveredCell?.day === d && hoveredCell?.hour === h
                    return (
                      <div key={h} className="flex-1 aspect-square flex items-center justify-center relative"
                        style={{
                          background: getHeatColor(val),
                          transition: "all 0.15s ease",
                          outline: isHovered ? "2px solid var(--accent)" : "none",
                          outlineOffset: -1,
                          cursor: val > 0 ? "pointer" : "default",
                        }}
                        onMouseEnter={() => val > 0 && setHoveredCell({ day: d, hour: h, value: val })}
                        onMouseLeave={() => setHoveredCell(null)}
                      >
                        {val >= 40 && (
                          <span style={{ fontSize: 8, fontWeight: 700, color: val >= 60 ? "white" : "var(--text-primary)" }}>{val}%</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            {/* Legend + tooltip */}
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: "var(--text-muted)", fontSize: 9 }}>Bajo</span>
                {[0, 15, 35, 55, 75].map(v => (
                  <div key={v} style={{ width: 14, height: 10, borderRadius: 2, background: getHeatColor(v) }} />
                ))}
                <span className="text-xs" style={{ color: "var(--text-muted)", fontSize: 9 }}>Alto</span>
              </div>
              {hoveredCell && (
                <span className="text-xs animate-fade-in" style={{ color: "var(--accent-light)" }}>
                  {DIAS_SHORT[hoveredCell.day]} {hoveredCell.hour}:00 → {hoveredCell.value}% respuestas
                </span>
              )}
            </div>
          </div>

          {/* Top 5 Best Slots */}
          {data.bestSlots.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                🎯 Top Horarios para Enviar
              </p>
              <div className="grid grid-cols-5 gap-2">
                {data.bestSlots.map((slot, i) => (
                  <div key={i} className="p-3 rounded-xl text-center card-hover animate-slide-up"
                    style={{
                      background: i === 0 ? "rgba(34,197,94,0.08)" : "var(--surface-2)",
                      border: `1px solid ${i === 0 ? "rgba(34,197,94,0.2)" : "var(--border)"}`,
                      animationDelay: `${i * 0.05}s`,
                      animationFillMode: "backwards",
                    }}>
                    <p className="text-xs font-bold" style={{ color: i === 0 ? "#22c55e" : "var(--text-primary)" }}>
                      {slot.dayLabel}
                    </p>
                    <p className="text-lg font-bold" style={{ color: i === 0 ? "#22c55e" : "var(--accent-light)" }}>
                      {slot.hourLabel}
                    </p>
                    <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                      <div className="h-full rounded-full animate-progress" style={{
                        width: `${slot.responseRate}%`,
                        background: i === 0 ? "#22c55e" : "var(--accent)",
                      }} />
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)", fontSize: 10 }}>
                      {slot.responseRate}% · {slot.count} envíos
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Industry Patterns */}
          {data.industryPatterns.length > 0 && (
            <div>
              <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                🏢 Timing por Industria
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {data.industryPatterns.map((ind, i) => (
                  <div key={ind.industry} className="p-3 rounded-xl card-hover animate-slide-up"
                    style={{
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      animationDelay: `${i * 0.06}s`,
                      animationFillMode: "backwards",
                    }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">{INDUSTRY_ICONS[ind.industry] || "🏢"}</span>
                      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{ind.industry}</p>
                      <span className="ml-auto text-xs" style={{ color: "var(--text-muted)", fontSize: 9 }}>{ind.sampleSize} datos</span>
                    </div>
                    {ind.bestSlots.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {ind.bestSlots.map((s, j) => (
                          <span key={j} className="px-1.5 py-0.5 rounded text-xs"
                            style={{
                              background: j === 0 ? "rgba(34,197,94,0.12)" : "rgba(108,99,255,0.08)",
                              color: j === 0 ? "#22c55e" : "var(--accent-light)",
                              fontSize: 10, fontWeight: 600,
                            }}>
                            {s.dayLabel} {s.hourLabel} ({s.responseRate}%)
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sin datos suficientes</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
