"use client"
import { useState, useEffect, useCallback } from "react"
import { AGENT_STAGES, type AgentQueueItem, type AgentStatus } from "@/types/agent"

export default function AgentQueue() {
  const [items, setItems] = useState<AgentQueueItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "">("")
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState<AgentQueueItem | null>(null)
  const limit = 25

  const fetchData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) })
    if (statusFilter) params.set("status", statusFilter)
    const res = await fetch(`/api/agent/queue?${params}`)
    if (res.ok) {
      const d = await res.json()
      setItems(d.data ?? [])
      setTotal(d.total ?? 0)
    }
    setLoading(false)
  }, [statusFilter, page])

  useEffect(() => { fetchData() }, [fetchData])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Cola de Prospectos</h2>
        <div className="flex-1" />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value as AgentStatus | ""); setPage(0) }}
          className="px-3 py-1.5 rounded-lg text-xs"
          style={{ background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)" }}
        >
          <option value="">Todos los estados</option>
          {AGENT_STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          <option value="paused">Pausado</option>
          <option value="failed">Fallido</option>
          <option value="skipped">Omitido</option>
          <option value="responded">Respondió</option>
          <option value="converted">Convertido</option>
        </select>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{total} prospectos</span>
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-x-auto" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: "var(--surface)" }}>
              {["Nombre", "Headline", "Empresa", "Score", "Estado", "Próxima acción"].map(h => (
                <th key={h} className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center" style={{ color: "var(--text-muted)" }}>Cargando...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center" style={{ color: "var(--text-muted)" }}>Sin prospectos</td></tr>
            ) : items.map(item => {
              const stg = AGENT_STAGES.find(s => s.key === item.status)
              return (
                <tr
                  key={item.id}
                  className="cursor-pointer transition-colors"
                  style={{ background: "var(--surface-2)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--surface-2)")}
                  onClick={() => setSelected(item)}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: "var(--text-primary)", borderBottom: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
                        {(item.full_name || "?")[0]}
                      </div>
                      {item.full_name || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[200px] truncate" style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>{item.headline || "—"}</td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>{item.company || "—"}</td>
                  <td className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    {item.fit_score != null ? (
                      <span className="font-bold" style={{ color: item.fit_score >= 80 ? "var(--success)" : item.fit_score >= 50 ? "var(--warning)" : "var(--text-muted)" }}>
                        {item.fit_score}%
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: (stg?.color || "#6b7280") + "22", color: stg?.color || "#6b7280" }}>
                      {stg?.label || item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                    {item.next_action_at ? new Date(item.next_action_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
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

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} />
          <div className="relative w-full max-w-md h-full overflow-y-auto p-6" style={{ background: "var(--background)", borderLeft: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-lg" style={{ color: "var(--text-muted)" }}>✕</button>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
                  {(selected.full_name || "?")[0]}
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{selected.full_name || "Sin nombre"}</h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{selected.headline || "—"}</p>
                </div>
              </div>

              {[
                { label: "Empresa", value: selected.company },
                { label: "Ubicación", value: selected.location },
                { label: "LinkedIn", value: selected.linkedin_url },
                { label: "DISC", value: selected.disc_type },
                { label: "Score", value: selected.fit_score != null ? `${selected.fit_score}%` : null },
                { label: "Sales Angle", value: selected.sales_angle },
                { label: "Pain Points", value: selected.pain_points?.join(", ") },
              ].filter(f => f.value).map(f => (
                <div key={f.label}>
                  <p className="text-[10px] font-semibold uppercase mb-0.5" style={{ color: "var(--text-muted)" }}>{f.label}</p>
                  <p className="text-sm" style={{ color: "var(--text-primary)" }}>{f.value}</p>
                </div>
              ))}

              <div className="pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                <p className="text-[10px] font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>Historial</p>
                <div className="text-xs space-y-1" style={{ color: "var(--text-secondary)" }}>
                  {selected.started_at && <p>Inicio: {new Date(selected.started_at).toLocaleString("es-AR")}</p>}
                  {selected.messaged_at && <p>Mensaje: {new Date(selected.messaged_at).toLocaleString("es-AR")}</p>}
                  {selected.converted_at && <p>Convertido: {new Date(selected.converted_at).toLocaleString("es-AR")}</p>}
                  <p>Reintentos: {selected.retry_count}</p>
                  {selected.skip_reason && <p>Omitido: {selected.skip_reason}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
