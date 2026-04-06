"use client"

import { useState, useEffect, useCallback } from "react"

type ConfigField = {
  key: string
  label: string
  type: "number" | "boolean" | "select"
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  unit?: string
}

type Workflow = {
  key: string
  name: string
  description: string
  icon: string
  category: string
  categoryLabel: string
  enabled: boolean
  config: Record<string, unknown>
  configFields: ConfigField[]
  defaultConfig: Record<string, unknown>
  defaultEnabled: boolean
  actionLabel: string
  riskLevel: "safe" | "moderate" | "sends_message"
  lastRunAt: string | null
  totalExecutions: number
  weeklyExecutions: number
}

type LogEntry = {
  id: string
  rule_key: string
  prospect_name: string | null
  action: string
  detail: string
  success: boolean
  created_at: string
}

const CATEGORY_ORDER = ["qualification", "engagement", "hygiene", "notification"]
const CATEGORY_COLORS: Record<string, string> = {
  qualification: "#3b82f6",
  engagement: "#10b981",
  hygiene: "#f59e0b",
  notification: "#8b5cf6",
}
const RISK_LABELS: Record<string, { label: string; color: string }> = {
  safe: { label: "Seguro", color: "#10b981" },
  moderate: { label: "Moderado", color: "#f59e0b" },
  sends_message: { label: "Envía mensajes", color: "#ef4444" },
}

export default function WorkflowsManager() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isOwner, setIsOwner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [expandedRule, setExpandedRule] = useState<string | null>(null)
  const [showLogs, setShowLogs] = useState(false)
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set())
  const [runResult, setRunResult] = useState<{ totalActions: number; successful: number; failed: number } | null>(null)
  const [logsFilter, setLogsFilter] = useState<string>("all")

  const loadWorkflows = useCallback(async () => {
    try {
      const res = await fetch("/api/workflows")
      const data = await res.json()
      if (data.workflows) setWorkflows(data.workflows)
      setIsOwner(data.isOwner ?? false)
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  const loadLogs = useCallback(async () => {
    try {
      const url = logsFilter === "all" ? "/api/workflows/logs?limit=100" : `/api/workflows/logs?limit=100&rule_key=${logsFilter}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.logs) setLogs(data.logs)
    } catch { /* ignore */ }
  }, [logsFilter])

  useEffect(() => { loadWorkflows() }, [loadWorkflows])
  useEffect(() => { if (showLogs) loadLogs() }, [showLogs, loadLogs])

  async function toggleRule(ruleKey: string, currentEnabled: boolean) {
    setTogglingKeys(prev => new Set(prev).add(ruleKey))
    try {
      const wf = workflows.find(w => w.key === ruleKey)
      await fetch("/api/workflows", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleKey, enabled: !currentEnabled, config: wf?.config }),
      })
      setWorkflows(prev => prev.map(w => w.key === ruleKey ? { ...w, enabled: !currentEnabled } : w))
    } catch { /* ignore */ }
    finally { setTogglingKeys(prev => { const n = new Set(prev); n.delete(ruleKey); return n }) }
  }

  async function updateConfig(ruleKey: string, field: string, value: unknown) {
    const wf = workflows.find(w => w.key === ruleKey)
    if (!wf) return
    const newConfig = { ...wf.config, [field]: value }
    setWorkflows(prev => prev.map(w => w.key === ruleKey ? { ...w, config: newConfig } : w))
    await fetch("/api/workflows", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruleKey, enabled: wf.enabled, config: newConfig }),
    })
  }

  async function runAll() {
    setRunning(true)
    setRunResult(null)
    try {
      const res = await fetch("/api/workflows/run", { method: "POST" })
      const data = await res.json()
      setRunResult({ totalActions: data.totalActions || 0, successful: data.successful || 0, failed: data.failed || 0 })
      loadWorkflows()
      if (showLogs) loadLogs()
    } catch { /* ignore */ }
    finally { setRunning(false) }
  }

  // Group by category
  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: workflows.find(w => w.category === cat)?.categoryLabel || cat,
    color: CATEGORY_COLORS[cat] || "#6c63ff",
    items: workflows.filter(w => w.category === cat),
  })).filter(g => g.items.length > 0)

  const enabledCount = workflows.filter(w => w.enabled).length
  const totalWeekly = workflows.reduce((s, w) => s + w.weeklyExecutions, 0)

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
        <p style={{ color: "var(--text-muted)", marginTop: 12, fontSize: 14 }}>Cargando workflows...</p>
      </div>
    )
  }

  return (
    <div className="page-enter" style={{ maxWidth: 1000, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: 10 }}>
            ⚡ Workflows Automáticos
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
            {enabledCount} reglas activas · {totalWeekly} ejecuciones esta semana
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setShowLogs(!showLogs)}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              border: "1px solid var(--border)",
              background: showLogs ? "var(--accent)" : "var(--surface-2)",
              color: showLogs ? "white" : "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            📋 {showLogs ? "Ocultar Logs" : "Ver Logs"}
          </button>
          {isOwner && (
            <button
              onClick={runAll}
              disabled={running || enabledCount === 0}
              style={{
                padding: "8px 20px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                background: running ? "var(--border)" : "linear-gradient(135deg, var(--accent), #7c3aed)",
                color: "white",
                cursor: running || enabledCount === 0 ? "not-allowed" : "pointer",
                opacity: enabledCount === 0 ? 0.5 : 1,
                transition: "all 0.2s",
              }}
            >
              {running ? "⏳ Ejecutando..." : "▶️ Ejecutar Ahora"}
            </button>
          )}
        </div>
      </div>

      {/* Run result banner */}
      {runResult && (
        <div style={{
          padding: "12px 16px",
          borderRadius: 12,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: runResult.failed > 0 ? "rgba(239,68,68,0.08)" : "rgba(16,185,129,0.08)",
          border: `1px solid ${runResult.failed > 0 ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)"}`,
        }}>
          <span style={{ fontSize: 18 }}>{runResult.failed > 0 ? "⚠️" : "✅"}</span>
          <span style={{ fontSize: 13, color: "var(--text-primary)" }}>
            {runResult.totalActions} acciones ejecutadas · {runResult.successful} exitosas
            {runResult.failed > 0 && ` · ${runResult.failed} fallidas`}
          </span>
          <button onClick={() => setRunResult(null)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* Workflow cards by category */}
      {grouped.map(group => (
        <div key={group.category} style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 4, height: 20, borderRadius: 2, background: group.color }} />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{group.label}</h2>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {group.items.filter(i => i.enabled).length}/{group.items.length} activas
            </span>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {group.items.map(wf => {
              const isExpanded = expandedRule === wf.key
              const risk = RISK_LABELS[wf.riskLevel]
              const isToggling = togglingKeys.has(wf.key)

              return (
                <div key={wf.key} style={{
                  background: "var(--surface)",
                  border: `1px solid ${wf.enabled ? group.color + "40" : "var(--border)"}`,
                  borderRadius: 14,
                  overflow: "hidden",
                  transition: "all 0.2s",
                }}>
                  {/* Main row */}
                  <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>{wf.icon}</span>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{wf.name}</span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: risk.color + "18",
                          color: risk.color,
                          textTransform: "uppercase",
                        }}>{risk.label}</span>
                        {wf.weeklyExecutions > 0 && (
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {wf.weeklyExecutions} esta semana
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>{wf.description}</p>
                    </div>

                    {/* Config toggle button */}
                    <button
                      onClick={() => setExpandedRule(isExpanded ? null : wf.key)}
                      style={{
                        background: "none",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: "5px 10px",
                        cursor: "pointer",
                        fontSize: 12,
                        color: "var(--text-muted)",
                        flexShrink: 0,
                        transition: "all 0.2s",
                      }}
                    >
                      ⚙️
                    </button>

                    {/* Toggle switch */}
                    <button
                      onClick={() => isOwner && toggleRule(wf.key, wf.enabled)}
                      disabled={!isOwner || isToggling}
                      style={{
                        width: 48,
                        height: 26,
                        borderRadius: 13,
                        border: "none",
                        padding: 2,
                        cursor: isOwner ? "pointer" : "not-allowed",
                        background: wf.enabled ? group.color : "var(--border)",
                        transition: "background 0.3s",
                        flexShrink: 0,
                        position: "relative",
                        opacity: isToggling ? 0.6 : 1,
                      }}
                    >
                      <div style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: "white",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        transform: wf.enabled ? "translateX(22px)" : "translateX(0)",
                        transition: "transform 0.3s",
                      }} />
                    </button>
                  </div>

                  {/* Expanded config */}
                  {isExpanded && (
                    <div style={{
                      padding: "0 18px 16px",
                      borderTop: "1px solid var(--border)",
                      marginTop: 0,
                      paddingTop: 14,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>Configuración</span>
                        <span style={{ fontSize: 10, color: "var(--text-muted)", padding: "1px 6px", borderRadius: 4, background: "var(--surface-2)" }}>
                          Acción: {wf.actionLabel}
                        </span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                        {wf.configFields.map(field => {
                          const val = wf.config[field.key]
                          return (
                            <div key={field.key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>
                                {field.label}
                              </label>
                              {field.type === "number" && (
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <input
                                    type="range"
                                    min={field.min ?? 0}
                                    max={field.max ?? 100}
                                    value={val as number ?? 0}
                                    onChange={e => updateConfig(wf.key, field.key, parseInt(e.target.value))}
                                    disabled={!isOwner}
                                    style={{ flex: 1, accentColor: group.color }}
                                  />
                                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", minWidth: 40, textAlign: "right" }}>
                                    {String(val ?? 0)}{field.unit ? ` ${field.unit}` : ""}
                                  </span>
                                </div>
                              )}
                              {field.type === "boolean" && (
                                <button
                                  onClick={() => isOwner && updateConfig(wf.key, field.key, !val)}
                                  disabled={!isOwner}
                                  style={{
                                    width: 36,
                                    height: 20,
                                    borderRadius: 10,
                                    border: "none",
                                    padding: 2,
                                    cursor: isOwner ? "pointer" : "not-allowed",
                                    background: val ? group.color : "var(--border)",
                                    transition: "background 0.3s",
                                  }}
                                >
                                  <div style={{
                                    width: 16,
                                    height: 16,
                                    borderRadius: "50%",
                                    background: "white",
                                    transform: val ? "translateX(16px)" : "translateX(0)",
                                    transition: "transform 0.3s",
                                  }} />
                                </button>
                              )}
                              {field.type === "select" && (
                                <select
                                  value={val as string ?? ""}
                                  onChange={e => updateConfig(wf.key, field.key, e.target.value)}
                                  disabled={!isOwner}
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: 8,
                                    border: "1px solid var(--border)",
                                    background: "var(--surface-2)",
                                    color: "var(--text-primary)",
                                    fontSize: 12,
                                  }}
                                >
                                  {field.options?.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Stats row */}
                      <div style={{ display: "flex", gap: 16, marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Total: <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{wf.totalExecutions}</span> ejecuciones
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          Esta semana: <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{wf.weeklyExecutions}</span>
                        </div>
                        {wf.lastRunAt && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            Última ejecución: {new Date(wf.lastRunAt).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Execution Logs Panel */}
      {showLogs && (
        <div style={{
          marginTop: 8,
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          overflow: "hidden",
        }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>📋 Historial de Ejecuciones</h3>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={logsFilter}
                onChange={e => setLogsFilter(e.target.value)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "var(--surface-2)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                }}
              >
                <option value="all">Todas las reglas</option>
                {workflows.map(w => (
                  <option key={w.key} value={w.key}>{w.icon} {w.name}</option>
                ))}
              </select>
              <button onClick={loadLogs} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>🔄</button>
            </div>
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {logs.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                Sin ejecuciones aún. Ejecutá los workflows para ver el historial.
              </div>
            ) : (
              logs.map(log => {
                const wf = workflows.find(w => w.key === log.rule_key)
                return (
                  <div key={log.id} style={{
                    padding: "10px 18px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 12,
                  }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{wf?.icon || "⚙️"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{wf?.name || log.rule_key}</span>
                      {log.prospect_name && (
                        <span style={{ color: "var(--text-muted)" }}> · {log.prospect_name}</span>
                      )}
                      <p style={{ color: "var(--text-muted)", marginTop: 1 }}>{log.detail}</p>
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: log.success ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                      color: log.success ? "#10b981" : "#ef4444",
                      flexShrink: 0,
                    }}>{log.success ? "OK" : "FAIL"}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, minWidth: 60, textAlign: "right" }}>
                      {new Date(log.created_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Not owner warning */}
      {!isOwner && (
        <div style={{
          marginTop: 20,
          padding: "14px 18px",
          borderRadius: 12,
          background: "rgba(245,158,11,0.08)",
          border: "1px solid rgba(245,158,11,0.2)",
          fontSize: 13,
          color: "#f59e0b",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          🔒 Solo el owner de la organización puede activar/desactivar y configurar workflows.
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  )
}
