"use client"
import { useState, useEffect } from "react"

type Objection = {
  category: string
  icon: string
  count: number
  fromMetrics: number
  fromMessages: number
  rebuttals: string[]
}

type ObjectionData = {
  objections: Objection[]
  topLossReasons: { reason: string; count: number }[]
  stats: {
    totalObjections: number; topObjection: string; lostProspects: number
    followUpResponseRate: number; dataPoints: number
  }
}

export default function ObjectionLibrary() {
  const [data, setData] = useState<ObjectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [openCard, setOpenCard] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/objections").then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl shimmer" />
          <div className="h-5 w-52 rounded shimmer" />
        </div>
        <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl shimmer" />)}</div>
      </div>
    )
  }

  if (!data || data.stats.dataPoints === 0) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
            <span className="text-base">🛡️</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Biblioteca de Objeciones</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sin datos suficientes aún — se genera con métricas y mensajes</p>
          </div>
        </div>
      </div>
    )
  }

  const maxCount = Math.max(...data.objections.map(o => o.count), 1)

  return (
    <div className="mb-6 rounded-2xl animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-between p-5 text-left">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
            <span className="text-base">🛡️</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Biblioteca de Objeciones</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {data.stats.totalObjections} objeciones detectadas · Top: {data.stats.topObjection}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
              {data.stats.lostProspects} perdidos
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
              {data.stats.followUpResponseRate}% resp. FU
            </span>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ color: "var(--text-muted)", transition: "transform 0.3s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expandable content */}
      <div style={{ maxHeight: expanded ? "1200px" : "0", overflow: "hidden", transition: "max-height 0.4s cubic-bezier(0.4,0,0.2,1)" }}>
        <div className="px-5 pb-5">
          {/* Objection cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            {data.objections.filter(o => o.count > 0).map((obj, i) => (
              <div key={obj.category} className="rounded-xl p-4 transition-all card-hover animate-fade-in cursor-pointer"
                style={{ background: "var(--surface-2)", border: `1px solid ${openCard === obj.category ? "var(--accent)" : "var(--border)"}`, animationDelay: `${i * 0.05}s` }}
                onClick={() => setOpenCard(openCard === obj.category ? null : obj.category)}>
                {/* Objection header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{obj.icon}</span>
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{obj.category}</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(108,99,255,0.12)", color: "#6c63ff" }}>
                    {obj.count}x
                  </span>
                </div>
                {/* Frequency bar */}
                <div className="w-full h-1.5 rounded-full mb-2" style={{ background: "var(--surface)" }}>
                  <div className="h-full rounded-full animate-progress" style={{ width: `${(obj.count / maxCount) * 100}%`, background: "linear-gradient(90deg, var(--accent), #a78bfa)" }} />
                </div>
                <div className="flex gap-3 text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                  <span>📊 {obj.fromMetrics} métricas</span>
                  <span>💬 {obj.fromMessages} mensajes</span>
                </div>

                {/* Rebuttals - expandable */}
                {openCard === obj.category && (
                  <div className="mt-3 pt-3 space-y-2 animate-fade-in" style={{ borderTop: "1px solid var(--border)" }}>
                    <p className="text-xs font-semibold mb-2" style={{ color: "#22c55e" }}>💡 Respuestas sugeridas:</p>
                    {obj.rebuttals.map((r, j) => (
                      <div key={j} className="flex gap-2 p-2 rounded-lg" style={{ background: "rgba(34,197,94,0.06)" }}>
                        <span className="text-xs font-bold shrink-0" style={{ color: "#22c55e" }}>{j + 1}.</span>
                        <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{r}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Loss reasons */}
          {data.topLossReasons.length > 0 && (
            <div className="rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <h4 className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>📉 Top Motivos de No-Cierre</h4>
              <div className="space-y-2">
                {data.topLossReasons.map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-5 text-center" style={{ color: "var(--text-muted)" }}>{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{r.reason}</p>
                    </div>
                    <span className="text-xs font-bold" style={{ color: "#ef4444" }}>{r.count}x</span>
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
