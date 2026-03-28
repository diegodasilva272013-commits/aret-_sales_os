"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type { CloserMetric } from "@/types"
import { createClient } from "@/lib/supabase/client"

type Closer = { id: string; full_name: string }
type SummaryData = {
  summary: Record<string, number>
  calculated: Record<string, number>
  changes: Record<string, number>
  periodo: string
}

const NUMERIC_COLS = [
  { key: "leads_asignados", label: "Leads Asig.", short: "L.Asig" },
  { key: "leads_contactados", label: "Leads Contact.", short: "L.Cont" },
  { key: "respuestas_obtenidas", label: "Respuestas", short: "Resp" },
  { key: "llamadas_realizadas", label: "Llamadas", short: "Llam" },
  { key: "conversaciones_efectivas", label: "Conv. Efectivas", short: "Conv.E" },
  { key: "reuniones_agendadas", label: "Reun. Agend.", short: "R.Ag" },
  { key: "reuniones_realizadas", label: "Reun. Realiz.", short: "R.Re" },
  { key: "ofertas_enviadas", label: "Ofertas Env.", short: "Ofer" },
  { key: "ventas_cerradas", label: "Ventas", short: "Vtas" },
  { key: "monto_vendido", label: "Monto ($)", short: "$Vend" },
  { key: "cobrado", label: "Cobrado ($)", short: "$Cobr" },
  { key: "seguimientos_pendientes", label: "Seguim. Pend.", short: "Seg" },
] as const

const TEXT_COLS = [
  { key: "objeciones_principales", label: "Objeciones" },
  { key: "motivo_no_cierre", label: "Motivo No Cierre" },
  { key: "observaciones", label: "Observaciones" },
] as const

const CALC_COLS = [
  { key: "pct_contacto", label: "% Contacto", fn: (r: CloserMetric) => r.leads_asignados > 0 ? ((r.leads_contactados / r.leads_asignados) * 100).toFixed(1) : "0" },
  { key: "pct_respuesta", label: "% Respuesta", fn: (r: CloserMetric) => r.leads_contactados > 0 ? ((r.respuestas_obtenidas / r.leads_contactados) * 100).toFixed(1) : "0" },
  { key: "pct_show", label: "% Show Rate", fn: (r: CloserMetric) => r.reuniones_agendadas > 0 ? ((r.reuniones_realizadas / r.reuniones_agendadas) * 100).toFixed(1) : "0" },
  { key: "pct_cierre", label: "% Cierre", fn: (r: CloserMetric) => r.reuniones_realizadas > 0 ? ((r.ventas_cerradas / r.reuniones_realizadas) * 100).toFixed(1) : "0" },
  { key: "pct_conv", label: "% Conv. Total", fn: (r: CloserMetric) => r.leads_asignados > 0 ? ((r.ventas_cerradas / r.leads_asignados) * 100).toFixed(1) : "0" },
  { key: "ticket_prom", label: "Ticket Prom.", fn: (r: CloserMetric) => r.ventas_cerradas > 0 ? Math.round(r.monto_vendido / r.ventas_cerradas).toLocaleString() : "0" },
] as const

type Periodo = "hoy" | "semana" | "mes" | "custom"

export default function CloserMetricsClient() {
  const [metrics, setMetrics] = useState<CloserMetric[]>([])
  const [closers, setClosers] = useState<Closer[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Filters
  const [periodo, setPeriodo] = useState<Periodo>("mes")
  const [filtroCloser, setFiltroCloser] = useState("")
  const [fechaDesde, setFechaDesde] = useState("")
  const [fechaHasta, setFechaHasta] = useState("")
  const [search, setSearch] = useState("")
  const [sortBy, setSortBy] = useState("fecha")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc")

  // Edit state
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState("")
  const editRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  // New row
  const [showNewRow, setShowNewRow] = useState(false)
  const [newRow, setNewRow] = useState<Record<string, string | number>>({})

  const limit = 50

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit), sort_by: sortBy, sort_dir: sortDir })
    if (periodo !== "custom") params.set("periodo", periodo)
    else {
      if (fechaDesde) params.set("fecha_desde", fechaDesde)
      if (fechaHasta) params.set("fecha_hasta", fechaHasta)
    }
    if (filtroCloser) params.set("closer_id", filtroCloser)
    if (search) params.set("search", search)

    const res = await fetch(`/api/closer-metrics?${params}`)
    const json = await res.json()
    if (res.ok) {
      setMetrics(json.data)
      setClosers(json.closers || [])
      setIsAdmin(json.isAdmin)
      setTotal(json.total)
    } else {
      showToast(json.error || "Error cargando", "err")
    }
    setLoading(false)
  }, [page, periodo, filtroCloser, fechaDesde, fechaHasta, search, sortBy, sortDir])

  const fetchSummary = useCallback(async () => {
    const params = new URLSearchParams({ periodo: periodo === "custom" ? "mes" : periodo })
    if (filtroCloser) params.set("closer_id", filtroCloser)
    const res = await fetch(`/api/closer-metrics/summary?${params}`)
    if (res.ok) setSummary(await res.json())
  }, [periodo, filtroCloser])

  useEffect(() => {
    fetchMetrics()
    fetchSummary()
  }, [fetchMetrics, fetchSummary])

  // Inline edit handlers
  const startEdit = (id: string, field: string, value: string | number) => {
    setEditingCell({ id, field })
    setEditValue(String(value ?? ""))
    setTimeout(() => editRef.current?.focus(), 50)
  }

  const saveEdit = async () => {
    if (!editingCell) return
    const { id, field } = editingCell
    const original = metrics.find(m => m.id === id)
    if (!original) return

    const oldVal = String((original as Record<string, unknown>)[field] ?? "")
    if (oldVal === editValue) {
      setEditingCell(null)
      return
    }

    setSaving(id)
    const res = await fetch(`/api/closer-metrics/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: editValue }),
    })
    const json = await res.json()
    setSaving(null)
    setEditingCell(null)

    if (res.ok) {
      setMetrics(prev => prev.map(m => m.id === id ? { ...m, ...json.data } : m))
      fetchSummary()
    } else {
      showToast(json.error || "Error guardando", "err")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit() }
    if (e.key === "Escape") setEditingCell(null)
  }

  // New row
  const addNewRow = async () => {
    setSaving("new")
    const res = await fetch("/api/closer-metrics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newRow),
    })
    const json = await res.json()
    setSaving(null)

    if (res.ok) {
      showToast("Registro creado")
      setShowNewRow(false)
      setNewRow({})
      fetchMetrics()
      fetchSummary()
    } else {
      showToast(json.error || "Error creando", "err")
    }
  }

  const deleteRow = async (id: string) => {
    const res = await fetch(`/api/closer-metrics/${id}`, { method: "DELETE" })
    if (res.ok) {
      showToast("Registro eliminado")
      setMetrics(prev => prev.filter(m => m.id !== id))
      setDeleteConfirm(null)
      fetchSummary()
    } else {
      const json = await res.json()
      showToast(json.error || "Error eliminando", "err")
    }
  }

  const handleSort = (col: string) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortBy(col); setSortDir("desc") }
  }

  const exportCSV = () => {
    const params = new URLSearchParams()
    if (filtroCloser) params.set("closer_id", filtroCloser)
    if (fechaDesde) params.set("fecha_desde", fechaDesde)
    if (fechaHasta) params.set("fecha_hasta", fechaHasta)
    window.open(`/export/closer-metrics?${params}`, "_blank")
  }

  // Totals row
  const totals = metrics.reduce((acc, r) => {
    NUMERIC_COLS.forEach(c => { acc[c.key] = (acc[c.key] || 0) + (Number((r as Record<string, unknown>)[c.key]) || 0) })
    return acc
  }, {} as Record<string, number>)

  const s = summary?.summary
  const c = summary?.calculated
  const ch = summary?.changes

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: "var(--background)" }}>
      <div className="max-w-full mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6 animate-fade-in">
          <div>
            <h1 className="text-2xl font-bold gradient-text">Métricas de Closers</h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {new Date().toLocaleDateString("es-AR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => { setShowNewRow(true); setNewRow({ fecha: new Date().toISOString().split("T")[0] }) }}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
              style={{ background: "var(--accent)", color: "white" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
              Nuevo registro
            </button>
            <button onClick={exportCSV}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Exportar CSV
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        {s && c && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6 animate-fade-in">
            {[
              { label: "Leads Asignados", value: s.leads_asignados, change: ch?.leads_asignados },
              { label: "Contactados", value: s.leads_contactados, color: "var(--info)" },
              { label: "Reun. Agendadas", value: s.reuniones_agendadas },
              { label: "Reun. Realizadas", value: s.reuniones_realizadas, change: ch?.reuniones_realizadas },
              { label: "Ventas Cerradas", value: s.ventas_cerradas, change: ch?.ventas_cerradas, color: "var(--success)" },
              { label: "Monto Vendido", value: `$${(s.monto_vendido || 0).toLocaleString()}`, change: ch?.monto_vendido, color: "var(--success)" },
              { label: "% Cierre", value: `${c.pctCierre}%`, color: c.pctCierre >= 20 ? "var(--success)" : "var(--warning)" },
              { label: "Ticket Prom.", value: `$${(c.ticketPromedio || 0).toLocaleString()}` },
            ].map((kpi, i) => (
              <div key={i} className="rounded-xl p-3" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-xs truncate mb-1" style={{ color: "var(--text-muted)" }}>{kpi.label}</p>
                <p className="text-lg font-bold" style={{ color: kpi.color || "var(--text-primary)" }}>{kpi.value}</p>
                {kpi.change !== undefined && kpi.change !== 0 && (
                  <p className="text-xs mt-0.5" style={{ color: kpi.change > 0 ? "var(--success)" : "var(--danger)" }}>
                    {kpi.change > 0 ? "↑" : "↓"} {Math.abs(kpi.change)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Calculated rates bar */}
        {c && (
          <div className="flex flex-wrap gap-4 mb-6 px-4 py-3 rounded-xl animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {[
              { label: "% Contacto", value: c.pctContacto },
              { label: "% Show Rate", value: c.pctShowRate },
              { label: "% Cierre", value: c.pctCierre },
              { label: "% Conversión Total", value: c.pctConversion },
            ].map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{r.label}</span>
                <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-3)" }}>
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${Math.min(r.value, 100)}%`,
                    background: r.value >= 50 ? "var(--success)" : r.value >= 25 ? "var(--warning)" : "var(--danger)",
                  }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{r.value}%</span>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4 animate-fade-in">
          {/* Periodo */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {(["hoy", "semana", "mes", "custom"] as Periodo[]).map(p => (
              <button key={p} onClick={() => setPeriodo(p)}
                className="px-3 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: periodo === p ? "var(--accent)" : "var(--surface)",
                  color: periodo === p ? "white" : "var(--text-secondary)",
                }}>
                {p === "hoy" ? "Hoy" : p === "semana" ? "Semana" : p === "mes" ? "Mes" : "Rango"}
              </button>
            ))}
          </div>

          {periodo === "custom" && (
            <>
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs" style={{ background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs" style={{ background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
            </>
          )}

          {/* Closer filter (admin only) */}
          {isAdmin && closers.length > 0 && (
            <select value={filtroCloser} onChange={e => setFiltroCloser(e.target.value)}
              className="px-3 py-1.5 rounded-xl text-xs" style={{ background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
              <option value="">Todos los closers</option>
              {closers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          )}

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar en notas..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs" style={{ background: "var(--surface-2)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
          </div>

          <span className="text-xs ml-auto" style={{ color: "var(--text-muted)" }}>
            {total} registro{total !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="rounded-xl overflow-hidden animate-fade-in" style={{ border: "1px solid var(--border)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: "1400px" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  <th className="sticky left-0 z-20 px-3 py-2.5 text-left font-semibold cursor-pointer select-none"
                    style={{ background: "var(--surface-2)", color: "var(--text-secondary)", minWidth: "100px" }}
                    onClick={() => handleSort("fecha")}>
                    Fecha {sortBy === "fecha" && (sortDir === "desc" ? "↓" : "↑")}
                  </th>
                  {isAdmin && (
                    <th className="sticky left-[100px] z-20 px-3 py-2.5 text-left font-semibold"
                      style={{ background: "var(--surface-2)", color: "var(--text-secondary)", minWidth: "120px" }}>
                      Closer
                    </th>
                  )}
                  {NUMERIC_COLS.map(col => (
                    <th key={col.key} className="px-2 py-2.5 text-right font-semibold cursor-pointer select-none whitespace-nowrap"
                      style={{ color: "var(--text-secondary)" }} onClick={() => handleSort(col.key)} title={col.label}>
                      {col.short} {sortBy === col.key && (sortDir === "desc" ? "↓" : "↑")}
                    </th>
                  ))}
                  {CALC_COLS.map(col => (
                    <th key={col.key} className="px-2 py-2.5 text-right font-semibold whitespace-nowrap"
                      style={{ color: "var(--accent-light)" }} title={col.label}>
                      {col.label}
                    </th>
                  ))}
                  {TEXT_COLS.map(col => (
                    <th key={col.key} className="px-2 py-2.5 text-left font-semibold" style={{ color: "var(--text-secondary)", minWidth: "140px" }}>
                      {col.label}
                    </th>
                  ))}
                  <th className="px-2 py-2.5 text-center font-semibold" style={{ color: "var(--text-secondary)", width: "50px" }}></th>
                </tr>
              </thead>
              <tbody>
                {/* New row */}
                {showNewRow && (
                  <tr style={{ background: "rgba(108,99,255,0.06)" }}>
                    <td className="sticky left-0 z-10 px-2 py-1.5" style={{ background: "rgba(108,99,255,0.06)" }}>
                      <input type="date" value={String(newRow.fecha || "")} onChange={e => setNewRow(p => ({ ...p, fecha: e.target.value }))}
                        className="w-full px-2 py-1 rounded text-xs" style={{ background: "var(--surface-3)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
                    </td>
                    {isAdmin && (
                      <td className="sticky left-[100px] z-10 px-2 py-1.5" style={{ background: "rgba(108,99,255,0.06)" }}>
                        <select value={String(newRow.closer_id || "")} onChange={e => setNewRow(p => ({ ...p, closer_id: e.target.value }))}
                          className="w-full px-2 py-1 rounded text-xs" style={{ background: "var(--surface-3)", color: "var(--text-primary)", border: "1px solid var(--border)" }}>
                          <option value="">Yo</option>
                          {closers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                        </select>
                      </td>
                    )}
                    {NUMERIC_COLS.map(col => (
                      <td key={col.key} className="px-1 py-1.5">
                        <input type="number" min="0" step={col.key.includes("monto") || col.key === "cobrado" ? "0.01" : "1"}
                          value={String(newRow[col.key] ?? "")} onChange={e => setNewRow(p => ({ ...p, [col.key]: e.target.value }))}
                          placeholder="0" className="w-full px-2 py-1 rounded text-xs text-right"
                          style={{ background: "var(--surface-3)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
                      </td>
                    ))}
                    {CALC_COLS.map(col => <td key={col.key} className="px-2 py-1.5 text-right" style={{ color: "var(--text-muted)" }}>—</td>)}
                    {TEXT_COLS.map(col => (
                      <td key={col.key} className="px-1 py-1.5">
                        <input value={String(newRow[col.key] || "")} onChange={e => setNewRow(p => ({ ...p, [col.key]: e.target.value }))}
                          placeholder="..." className="w-full px-2 py-1 rounded text-xs"
                          style={{ background: "var(--surface-3)", color: "var(--text-primary)", border: "1px solid var(--border)" }} />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={addNewRow} disabled={saving === "new"}
                          className="p-1 rounded" style={{ color: "var(--success)" }} title="Guardar">
                          {saving === "new" ? "…" : "✓"}
                        </button>
                        <button onClick={() => { setShowNewRow(false); setNewRow({}) }}
                          className="p-1 rounded" style={{ color: "var(--danger)" }} title="Cancelar">✕</button>
                      </div>
                    </td>
                  </tr>
                )}

                {loading ? (
                  <tr><td colSpan={99} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                    <div className="flex justify-center gap-1">
                      <div className="loading-dot w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
                      <div className="loading-dot w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
                      <div className="loading-dot w-2 h-2 rounded-full" style={{ background: "var(--accent)" }} />
                    </div>
                  </td></tr>
                ) : metrics.length === 0 ? (
                  <tr><td colSpan={99} className="text-center py-12" style={{ color: "var(--text-muted)" }}>
                    Sin registros en este período
                  </td></tr>
                ) : (
                  <>
                    {metrics.map((row, idx) => {
                      const p = row.profiles
                      return (
                        <tr key={row.id}
                          className="transition-colors"
                          style={{
                            background: idx % 2 === 0 ? "var(--surface)" : "var(--background)",
                            borderBottom: "1px solid var(--border)",
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--surface-2)" }}
                          onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? "var(--surface)" : "var(--background)" }}
                        >
                          {/* Fecha */}
                          <td className="sticky left-0 z-10 px-3 py-2 font-medium whitespace-nowrap"
                            style={{ background: "inherit", color: "var(--text-primary)" }}>
                            {new Date(row.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                          </td>
                          {/* Closer */}
                          {isAdmin && (
                            <td className="sticky left-[100px] z-10 px-3 py-2 truncate"
                              style={{ background: "inherit", color: "var(--text-secondary)", maxWidth: "120px" }}>
                              {p?.full_name || "—"}
                            </td>
                          )}
                          {/* Numeric */}
                          {NUMERIC_COLS.map(col => {
                            const val = (row as Record<string, unknown>)[col.key]
                            const isEditing = editingCell?.id === row.id && editingCell?.field === col.key
                            const isMoney = col.key.includes("monto") || col.key === "cobrado"
                            return (
                              <td key={col.key} className="px-2 py-2 text-right cursor-pointer"
                                onClick={() => !isEditing && startEdit(row.id, col.key, val as number)}
                                style={{ color: Number(val) > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                                {isEditing ? (
                                  <input ref={editRef as React.RefObject<HTMLInputElement>} type="number" min="0" step={isMoney ? "0.01" : "1"}
                                    value={editValue} onChange={e => setEditValue(e.target.value)}
                                    onBlur={saveEdit} onKeyDown={handleKeyDown}
                                    className="w-full px-1 py-0.5 rounded text-right text-xs"
                                    style={{ background: "var(--surface-3)", color: "var(--text-primary)", border: "1px solid var(--accent)", outline: "none" }} />
                                ) : (
                                  isMoney && Number(val) > 0 ? `$${Number(val).toLocaleString()}` : String(val ?? 0)
                                )}
                              </td>
                            )
                          })}
                          {/* Calculated */}
                          {CALC_COLS.map(col => {
                            const val = col.fn(row)
                            const numVal = parseFloat(val)
                            return (
                              <td key={col.key} className="px-2 py-2 text-right font-medium"
                                style={{
                                  color: col.key.startsWith("pct")
                                    ? numVal >= 50 ? "var(--success)" : numVal >= 25 ? "var(--warning)" : numVal > 0 ? "var(--danger)" : "var(--text-muted)"
                                    : "var(--accent-light)",
                                }}>
                                {col.key.startsWith("pct") ? `${val}%` : col.key === "ticket_prom" ? `$${val}` : val}
                              </td>
                            )
                          })}
                          {/* Text */}
                          {TEXT_COLS.map(col => {
                            const val = (row as Record<string, unknown>)[col.key] as string
                            const isEditing = editingCell?.id === row.id && editingCell?.field === col.key
                            return (
                              <td key={col.key} className="px-2 py-2 cursor-pointer"
                                onClick={() => !isEditing && startEdit(row.id, col.key, val || "")}
                                style={{ color: val ? "var(--text-secondary)" : "var(--text-muted)", maxWidth: "160px" }}>
                                {isEditing ? (
                                  <input ref={editRef as React.RefObject<HTMLInputElement>}
                                    value={editValue} onChange={e => setEditValue(e.target.value)}
                                    onBlur={saveEdit} onKeyDown={handleKeyDown}
                                    className="w-full px-1 py-0.5 rounded text-xs"
                                    style={{ background: "var(--surface-3)", color: "var(--text-primary)", border: "1px solid var(--accent)", outline: "none" }} />
                                ) : (
                                  <span className="truncate block" title={val || ""}>{val || "—"}</span>
                                )}
                              </td>
                            )
                          })}
                          {/* Actions */}
                          <td className="px-2 py-2 text-center">
                            {deleteConfirm === row.id ? (
                              <div className="flex gap-1 justify-center items-center">
                                <button onClick={() => deleteRow(row.id)} className="text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--danger)", color: "white" }}>Sí</button>
                                <button onClick={() => setDeleteConfirm(null)} className="text-xs px-1.5 py-0.5 rounded" style={{ color: "var(--text-muted)" }}>No</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(row.id)} className="p-1 rounded transition-colors opacity-40 hover:opacity-100" style={{ color: "var(--danger)" }} title="Eliminar">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}

                    {/* Totals row */}
                    {metrics.length > 1 && (
                      <tr style={{ background: "var(--surface-2)", borderTop: "2px solid var(--accent)" }}>
                        <td className="sticky left-0 z-10 px-3 py-2.5 font-bold text-xs"
                          style={{ background: "var(--surface-2)", color: "var(--accent-light)" }}>TOTAL</td>
                        {isAdmin && <td className="sticky left-[100px] z-10" style={{ background: "var(--surface-2)" }}></td>}
                        {NUMERIC_COLS.map(col => {
                          const val = totals[col.key] || 0
                          const isMoney = col.key.includes("monto") || col.key === "cobrado"
                          return (
                            <td key={col.key} className="px-2 py-2.5 text-right font-bold"
                              style={{ color: "var(--text-primary)" }}>
                              {isMoney ? `$${val.toLocaleString()}` : val.toLocaleString()}
                            </td>
                          )
                        })}
                        {CALC_COLS.map(col => {
                          // Calc on totals
                          const fakeRow = totals as unknown as CloserMetric
                          const val = col.fn(fakeRow)
                          return (
                            <td key={col.key} className="px-2 py-2.5 text-right font-bold"
                              style={{ color: "var(--accent-light)" }}>
                              {col.key.startsWith("pct") ? `${val}%` : `$${val}`}
                            </td>
                          )
                        })}
                        {TEXT_COLS.map(col => <td key={col.key}></td>)}
                        <td></td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              ← Anterior
            </button>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Página {page} de {Math.ceil(total / limit)}
            </span>
            <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg text-xs" style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              Siguiente →
            </button>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in"
            style={{
              background: toast.type === "ok" ? "var(--success)" : "var(--danger)",
              color: "white",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            }}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  )
}
