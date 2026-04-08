"use client"
import { useState, useEffect, useCallback } from "react"
import { ACTION_LABELS, type AgentLog, type ActionType } from "@/types/agent"

export default function AgentLogs() {
  const [logs, setLogs] = useState<AgentLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState<ActionType | "">("")
  const [successFilter, setSuccessFilter] = useState<"" | "true" | "false">("")
  const [page, setPage] = useState(0)
  const limit = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) })
    if (actionFilter) params.set("action_type", actionFilter)
    if (successFilter) params.set("success", successFilter)
    const res = await fetch(`/api/agent/logs?${params}`)
    if (res.ok) {
      const d = await res.json()
      setLogs(d.data ?? [])
      setTotal(d.total ?? 0)
    }
    setLoading(false)
  }, [actionFilter, successFilter, page])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const totalPages = Math.ceil(total / limit)

  const getActionColor = (type: ActionType, success: boolean) => {
    if (!success) return "var(--danger)"
    switch (type) {
      case "profile_view": return "#6b7280"
      case "post_like": return "#3b82f6"
      case "post_comment": return "#8b5cf6"
      case "connection_request": return "#f59e0b"
      case "connection_accepted": return "#22c55e"
      case "direct_message": return "#06b6d4"
      case "profile_discovered": return "#6b7280"
      case "stage_changed": return "#10b981"
      case "error": return "#ef4444"
      default: return "var(--text-muted)"
    }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Logs del Agente</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Registro detallado de acciones</p>
        </div>
        <div className="flex gap-2">
          <select
            value={actionFilter}
            onChange={e => { setActionFilter(e.target.value as ActionType | ""); setPage(0) }}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          >
            <option value="">Todas las acciones</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={successFilter}
            onChange={e => { setSuccessFilter(e.target.value as "" | "true" | "false"); setPage(0) }}
            className="px-3 py-1.5 rounded-lg text-xs"
            style={{ background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
          >
            <option value="">Éxito/Error</option>
            <option value="true">Solo éxitos</option>
            <option value="false">Solo errores</option>
          </select>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
        <span>{total} registros</span>
        {successFilter === "" && logs.length > 0 && (
          <>
            <span>·</span>
            <span style={{ color: "var(--success)" }}>{logs.filter(l => l.success).length} éxitos</span>
            <span>·</span>
            <span style={{ color: "var(--danger)" }}>{logs.filter(l => !l.success).length} errores</span>
          </>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "var(--surface)" }}>
              {["Hora", "Acción", "Prospecto", "Cuenta", "Detalle", "Duración", "Estado"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center" style={{ color: "var(--text-muted)" }}>Cargando...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center" style={{ color: "var(--text-muted)" }}>Sin logs</td></tr>
            ) : logs.map((log, i) => {
              const ext = log as AgentLog & { queue_full_name?: string; queue_company?: string; account_name?: string }
              const clr = getActionColor(log.action_type, log.success)
              return (
                <tr
                  key={log.id}
                  style={{ background: i % 2 === 0 ? "var(--surface-2)" : "transparent" }}
                >
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                    {new Date(log.executed_at).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </td>
                  <td className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="px-2 py-0.5 rounded-full font-semibold" style={{ background: clr + "22", color: clr }}>
                      {ACTION_LABELS[log.action_type] || log.action_type}
                    </span>
                  </td>
                  <td className="px-3 py-2" style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border)" }}>
                    {ext.queue_full_name || "—"}
                    {ext.queue_company && <span className="block text-[10px]" style={{ color: "var(--text-muted)" }}>{ext.queue_company}</span>}
                  </td>
                  <td className="px-3 py-2" style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>
                    {ext.account_name || "—"}
                  </td>
                  <td className="px-3 py-2 max-w-[250px] truncate" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                    {log.error_message ? (
                      <span style={{ color: "var(--danger)" }}>{log.error_message}</span>
                    ) : log.action_detail || (log.generated_content ? `"${log.generated_content.slice(0, 80)}..."` : "—")}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                    {log.duration_ms != null ? `${log.duration_ms}ms` : "—"}
                  </td>
                  <td className="px-3 py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="w-2 h-2 inline-block rounded-full" style={{ background: log.success ? "var(--success)" : "var(--danger)" }} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg text-xs" style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", opacity: page === 0 ? 0.4 : 1 }}>← Anterior</button>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Pág {page + 1} de {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg text-xs" style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)", opacity: page >= totalPages - 1 ? 0.4 : 1 }}>Siguiente →</button>
        </div>
      )}
    </div>
  )
}
