"use client"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"

type Rebuttal = { text: string; source: string; verified: boolean }

type Objection = {
  category: string; icon: string; count: number
  fromMetrics: number; fromMessages: number
  killRate: "alto" | "medio" | "bajo"
  winRate: number | null; wins: number; losses: number
  rebuttals: Rebuttal[]; hasBattleTested: boolean
}

type LiveAlert = {
  prospectId: string; prospectName: string; company: string
  objection: string; category: string; detectedAt: string; hoursAgo: number
}

type ObjectionData = {
  objections: Objection[]
  topLossReasons: { reason: string; count: number }[]
  liveAlerts: LiveAlert[]
  stats: {
    totalObjections: number; topObjection: string
    lostProspects: number; wonProspects: number; overallWinRate: number
    followUpResponseRate: number; dataPoints: number
    deadliestObjection: string | null; battleTestedCount: number; liveAlertCount: number
  }
}

const killColors = { alto: "#ef4444", medio: "#f59e0b", bajo: "#22c55e" }
const killLabels = { alto: "LETAL", medio: "MODERADA", bajo: "MANEJABLE" }

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function ObjectionLibrary() {
  const [data, setData] = useState<ObjectionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"library" | "alerts" | "losses">("library")
  const [openCard, setOpenCard] = useState<string | null>(null)

  const fetchData = useCallback(() => {
    fetch("/api/objections").then(r => r.json()).then(d => { setData(d); setLoading(false) }).catch(() => setLoading(false))
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
        <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-28 rounded-xl shimmer" />)}</div>
      </div>
    )
  }

  if (!data || data.stats.dataPoints === 0) {
    return (
      <div className="mb-6 rounded-2xl p-5 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
            <span className="text-lg">🛡️</span>
          </div>
          <div>
            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>Biblioteca de Objeciones</h3>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sin datos suficientes aún — se genera con métricas y mensajes</p>
          </div>
        </div>
      </div>
    )
  }

  const { stats, liveAlerts } = data
  const maxCount = Math.max(...data.objections.map(o => o.count), 1)
  const activeObjections = data.objections.filter(o => o.count > 0)

  return (
    <div className="mb-6 rounded-2xl animate-scale-pop overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center relative" style={{ background: "linear-gradient(135deg, #f59e0b, #ef4444)" }}>
              <span className="text-lg">🛡️</span>
              {stats.liveAlertCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white animate-pulse"
                  style={{ background: "#ef4444" }}>
                  {stats.liveAlertCount}
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>Biblioteca de Objeciones</h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {stats.totalObjections} detectadas · Aprendidas de {stats.dataPoints} datos
              </p>
            </div>
          </div>
          {stats.battleTestedCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold"
              style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
              ✓ {stats.battleTestedCount} respuestas probadas
            </span>
          )}
        </div>

        {/* Deadliest Objection Banner */}
        {stats.deadliestObjection && (
          <div className="p-3 rounded-xl mb-4" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
            <div className="flex items-center gap-2">
              <span className="text-xs">☠️</span>
              <span className="text-xs font-bold" style={{ color: "#ef4444" }}>Objeción más letal:</span>
              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{stats.deadliestObjection}</span>
              <span className="text-[10px] ml-auto" style={{ color: "var(--text-muted)" }}>
                Win rate general: {stats.overallWinRate}%
              </span>
            </div>
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: "Objeciones", value: stats.totalObjections, color: "#f59e0b", icon: "🛡️" },
            { label: "Win Rate", value: `${stats.overallWinRate}%`, color: "#22c55e", icon: "🏆" },
            { label: "Perdidos", value: stats.lostProspects, color: "#ef4444", icon: "📉" },
            { label: "Alertas 24h", value: stats.liveAlertCount, color: stats.liveAlertCount > 0 ? "#ef4444" : "#6b7280", icon: "🚨" },
          ].map(s => (
            <div key={s.label} className="p-2 rounded-xl text-center" style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}>
              <span className="text-xs">{s.icon}</span>
              <p className="text-sm font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          {[
            { key: "library" as const, label: "📚 Biblioteca", count: activeObjections.length },
            { key: "alerts" as const, label: "🚨 Alertas en Vivo", count: stats.liveAlertCount },
            { key: "losses" as const, label: "📉 Motivos Pérdida", count: data.topLossReasons.length },
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
        {/* ================== LIBRARY TAB ================== */}
        {tab === "library" && (
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {activeObjections.map((obj, i) => {
              const isOpen = openCard === obj.category
              const kColor = killColors[obj.killRate]
              const barPct = (obj.count / maxCount) * 100
              const wrColor = obj.winRate !== null
                ? obj.winRate >= 60 ? "#22c55e" : obj.winRate >= 35 ? "#f59e0b" : "#ef4444"
                : "var(--text-muted)"

              return (
                <div key={obj.category}
                  className="rounded-xl transition-all cursor-pointer animate-fade-in"
                  style={{
                    background: "var(--surface-2)",
                    border: `1px solid ${isOpen ? "var(--accent)" : "var(--border)"}`,
                    animationDelay: `${i * 0.04}s`,
                  }}
                  onClick={() => setOpenCard(isOpen ? null : obj.category)}>

                  <div className="p-4">
                    {/* Row 1: Category + kill rate + count */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl">{obj.icon}</span>
                        <div>
                          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{obj.category}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                              style={{ background: `${kColor}15`, color: kColor }}>
                              {killLabels[obj.killRate]}
                            </span>
                            {obj.hasBattleTested && (
                              <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                                style={{ background: "rgba(34,197,94,0.12)", color: "#22c55e" }}>
                                ✓ PROBADA
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold" style={{ color: "var(--accent)" }}>{obj.count}x</span>
                        {obj.winRate !== null && (
                          <p className="text-[10px] font-bold" style={{ color: wrColor }}>
                            {obj.winRate}% superada
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Frequency bar + sources */}
                    <div className="w-full h-2 rounded-full mb-2" style={{ background: "var(--surface)" }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${barPct}%`, background: `linear-gradient(90deg, ${kColor}, ${kColor}80)` }} />
                    </div>
                    <div className="flex items-center gap-4 text-[11px]" style={{ color: "var(--text-muted)" }}>
                      <span>📊 {obj.fromMetrics} métricas</span>
                      <span>💬 {obj.fromMessages} mensajes</span>
                      {obj.winRate !== null && (
                        <span className="ml-auto">
                          <span style={{ color: "#22c55e" }}>✓{obj.wins}</span> / <span style={{ color: "#ef4444" }}>✗{obj.losses}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded: Rebuttals */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-0 animate-fade-in">
                      <div className="pt-3 space-y-2" style={{ borderTop: "1px solid var(--border)" }}>
                        <p className="text-xs font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                          {obj.hasBattleTested ? "⚔️ Respuestas que funcionaron:" : "💡 Respuestas sugeridas:"}
                        </p>
                        {obj.rebuttals.map((r, j) => (
                          <div key={j} className="p-3 rounded-lg"
                            style={{
                              background: r.verified ? "rgba(34,197,94,0.06)" : "var(--surface)",
                              border: `1px solid ${r.verified ? "rgba(34,197,94,0.15)" : "var(--border)"}`,
                            }}>
                            <div className="flex items-start gap-2">
                              <span className="text-xs font-bold shrink-0 mt-0.5"
                                style={{ color: r.verified ? "#22c55e" : "var(--text-muted)" }}>
                                {r.verified ? "✓" : `${j + 1}.`}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{r.text}</p>
                                <p className="text-[10px] mt-1" style={{ color: r.verified ? "#22c55e" : "var(--text-muted)" }}>
                                  {r.verified ? `⚔️ Probada con: ${r.source}` : "📝 Plantilla sugerida"}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {activeObjections.length === 0 && (
              <p className="text-xs text-center py-6" style={{ color: "var(--text-muted)" }}>No se detectaron objeciones aún</p>
            )}
          </div>
        )}

        {/* ================== ALERTS TAB ================== */}
        {tab === "alerts" && (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {liveAlerts.length > 0 ? liveAlerts.map((alert, i) => {
              const pattern = data.objections.find(o => o.category === alert.category)
              return (
                <div key={`${alert.prospectId}-${i}`} className="p-3 rounded-xl animate-fade-in"
                  style={{
                    background: alert.hoursAgo < 2 ? "rgba(239,68,68,0.06)" : "var(--surface-2)",
                    border: `1px solid ${alert.hoursAgo < 2 ? "rgba(239,68,68,0.2)" : "var(--border)"}`,
                    animationDelay: `${i * 0.04}s`,
                  }}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{pattern?.icon || "⚠️"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{alert.prospectName}</span>
                        {alert.company && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>· {alert.company}</span>}
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                          {alert.category}
                        </span>
                      </div>
                      <p className="text-xs mb-2 italic" style={{ color: "var(--text-secondary)" }}>
                        &ldquo;{alert.objection}&rdquo;
                      </p>
                      {/* Best rebuttal for this category */}
                      {pattern && pattern.rebuttals[0] && (
                        <div className="p-2 rounded-lg mb-2" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.12)" }}>
                          <p className="text-[10px] font-bold mb-0.5" style={{ color: "#22c55e" }}>
                            {pattern.rebuttals[0].verified ? "⚔️ Respuesta probada:" : "💡 Respuesta sugerida:"}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{pattern.rebuttals[0].text}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Link href={`/whatsapp?prospect=${alert.prospectId}`}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
                          style={{ background: "#25d366" }}
                          onClick={e => e.stopPropagation()}>
                          💬 Responder
                        </Link>
                        <span className="text-[10px] ml-auto" style={{ color: alert.hoursAgo < 2 ? "#ef4444" : "var(--text-muted)" }}>
                          hace {timeAgo(alert.detectedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }) : (
              <div className="text-center py-10">
                <span className="text-3xl mb-3 block">✅</span>
                <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Sin objeciones en las últimas 24h</p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cuando un prospect objete, aparecerá aquí con la mejor respuesta</p>
              </div>
            )}
          </div>
        )}

        {/* ================== LOSSES TAB ================== */}
        {tab === "losses" && (
          <div className="space-y-3">
            {/* Win/Loss summary */}
            <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>Win vs Loss por objeción</span>
                <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>basado en {stats.wonProspects + stats.lostProspects} deals cerrados</span>
              </div>
              <div className="space-y-2">
                {data.objections.filter(o => o.winRate !== null).map(obj => {
                  const wr = obj.winRate ?? 0
                  return (
                    <div key={obj.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{obj.icon} {obj.category}</span>
                        <span className="text-xs font-bold" style={{ color: wr >= 50 ? "#22c55e" : "#ef4444" }}>{wr}%</span>
                      </div>
                      <div className="flex h-2 rounded-full overflow-hidden" style={{ background: "var(--surface)" }}>
                        <div className="h-full" style={{ width: `${wr}%`, background: "#22c55e" }} />
                        <div className="h-full" style={{ width: `${100 - wr}%`, background: "#ef4444" }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top loss reasons */}
            {data.topLossReasons.length > 0 && (
              <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <h4 className="text-xs font-bold mb-3" style={{ color: "var(--text-primary)" }}>📉 Top Motivos de No-Cierre</h4>
                <div className="space-y-2">
                  {data.topLossReasons.map((r, i) => {
                    const maxLoss = Math.max(...data.topLossReasons.map(l => l.count), 1)
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs font-bold w-5 text-center shrink-0"
                          style={{ color: i === 0 ? "#ef4444" : "var(--text-muted)" }}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{r.reason}</p>
                          <div className="w-full h-1.5 rounded-full" style={{ background: "var(--surface)" }}>
                            <div className="h-full rounded-full" style={{
                              width: `${(r.count / maxLoss) * 100}%`,
                              background: i === 0 ? "#ef4444" : i === 1 ? "#f59e0b" : "var(--text-muted)",
                            }} />
                          </div>
                        </div>
                        <span className="text-xs font-bold shrink-0" style={{ color: "#ef4444" }}>{r.count}x</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Follow-up response rate */}
            <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>📨 Tasa de respuesta a Follow-ups</span>
                <span className="text-sm font-bold"
                  style={{ color: stats.followUpResponseRate >= 50 ? "#22c55e" : stats.followUpResponseRate >= 25 ? "#f59e0b" : "#ef4444" }}>
                  {stats.followUpResponseRate}%
                </span>
              </div>
              <div className="mt-2 w-full h-2 rounded-full" style={{ background: "var(--surface)" }}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${stats.followUpResponseRate}%`,
                    background: stats.followUpResponseRate >= 50 ? "#22c55e" : stats.followUpResponseRate >= 25 ? "#f59e0b" : "#ef4444",
                  }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
