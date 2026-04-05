"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import type { Prospect } from "@/types"
import { parseAIScore, getScoreColor, getScoreEmoji } from "@/lib/parseAIScore"

const STATUS_CONFIG = {
  nuevo: { label: "Nuevo", color: "#6c63ff", bg: "rgba(108,99,255,0.15)" },
  activo: { label: "Activo", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  pausado: { label: "Pausado", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  llamada_agendada: { label: "Llamada Agendada", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  cerrado_ganado: { label: "Cerrado ✓", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  cerrado_perdido: { label: "Cerrado ✗", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
}

const PHASE_CONFIG = {
  contacto: { label: "Contacto", color: "#6c63ff" },
  venta: { label: "Venta", color: "#f59e0b" },
  cierre: { label: "Cierre", color: "#22c55e" },
}

type ProspectWithProfile = Prospect & { profiles?: { full_name: string; email: string }; notes?: string }

export default function ProspectsTable({ prospects, currentUserId }: { prospects: ProspectWithProfile[]; currentUserId: string }) {
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("todos")
  const [filterPhase, setFilterPhase] = useState("todas")
  const [filterSetter, setFilterSetter] = useState("todos")
  const [filterSource, setFilterSource] = useState("todos")

  // Precompute AI scores for all prospects
  const aiScoreMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof parseAIScore>>()
    prospects.forEach(p => {
      const score = parseAIScore(p.notes)
      if (score) map.set(p.id, score)
    })
    return map
  }, [prospects])

  const filtered = prospects.filter(p => {
    const matchSearch = !search ||
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.company.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === "todos" || p.status === filterStatus
    const matchPhase = filterPhase === "todas" || p.phase === filterPhase
    const matchSetter = filterSetter === "todos" ||
      (filterSetter === "mios" ? p.assigned_to === currentUserId : p.assigned_to !== currentUserId)
    const matchSource = filterSource === "todos" ||
      (filterSource === "ai" ? aiScoreMap.has(p.id) : !aiScoreMap.has(p.id))
    return matchSearch && matchStatus && matchPhase && matchSetter && matchSource
  })

  return (
    <div className="animate-fade-in">
      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-muted)" }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o empresa..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
        </div>

        {[
          { value: filterStatus, set: setFilterStatus, options: [["todos", "Todos los estados"], ...Object.entries(STATUS_CONFIG).map(([k, v]) => [k, v.label])] },
          { value: filterPhase, set: setFilterPhase, options: [["todas", "Todas las fases"], ...Object.entries(PHASE_CONFIG).map(([k, v]) => [k, v.label])] },
          { value: filterSetter, set: setFilterSetter, options: [["todos", "Todos los setters"], ["mios", "Mis prospectos"], ["otros", "Otros setters"]] },
          { value: filterSource, set: setFilterSource, options: [["todos", "Todas las fuentes"], ["ai", "🤖 Leads AI"], ["manual", "Manuales"]] },
        ].map((f, i) => (
          <select key={i} value={f.value} onChange={e => f.set(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
            {f.options.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
          </select>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--surface)" }}>
              {["Prospecto", "Empresa", "Fase", "Estado", "Follow-ups", "Último contacto", "Setter", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  No hay prospectos que coincidan con los filtros
                </td>
              </tr>
            ) : filtered.map(p => {
              const statusCfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.nuevo
              const phaseCfg = PHASE_CONFIG[p.phase] || PHASE_CONFIG.contacto
              const isOwn = p.assigned_to === currentUserId
              const ai = aiScoreMap.get(p.id)

              return (
                <tr key={p.id} className="transition-colors"
                  style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--surface-2)")}>
                  <td className="px-4 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{p.full_name}</p>
                        {(p as { source_type?: string }).source_type === "instagram" ? (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "rgba(225,48,108,0.12)", color: "#e1306c", border: "1px solid rgba(225,48,108,0.25)" }}>IG</span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: "rgba(0,119,181,0.12)", color: "#0077b5", border: "1px solid rgba(0,119,181,0.25)" }}>in</span>
                        )}
                        {ai && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                            style={{ background: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.25)" }}>
                            🤖 AI
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs truncate max-w-xs" style={{ color: "var(--text-muted)" }}>{p.headline}</p>
                        {ai && (
                          <span className="text-xs font-semibold shrink-0" style={{ color: getScoreColor(ai.score) }}>
                            {getScoreEmoji(ai.score)} {ai.score}pts
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm" style={{ color: "var(--text-secondary)" }}>{p.company || "—"}</td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 rounded-full text-xs" style={{ background: `${phaseCfg.color}20`, color: phaseCfg.color }}>
                      {phaseCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="px-2 py-1 rounded-full text-xs" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[0,1,2,3,4,5].map(i => (
                          <div key={i} className="w-3 h-3 rounded-sm" style={{
                            background: i < (p.follow_up_count || 0) ? "var(--accent)" : "var(--surface-3)"
                          }} />
                        ))}
                      </div>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{p.follow_up_count || 0}/6</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-xs" style={{ color: "var(--text-muted)" }}>
                    {p.last_contact_at ? new Date(p.last_contact_at).toLocaleDateString("es-AR") : "Sin contacto"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: isOwn ? "linear-gradient(135deg, var(--accent), #7c3aed)" : "var(--surface-3)", color: "white" }}>
                        {p.profiles?.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {isOwn ? "Yo" : p.profiles?.full_name?.split(" ")[0] || "—"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Link href={`/prospects/${p.id}`}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{ background: "var(--accent-glow)", color: "var(--accent-light)", border: "1px solid rgba(108,99,255,0.2)" }}>
                      Ver →
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
