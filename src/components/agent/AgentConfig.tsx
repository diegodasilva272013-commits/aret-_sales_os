"use client"
import { useState, useEffect, useCallback } from "react"
import type { AgentConfig } from "@/types/agent"

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

const DEFAULT_CONFIG: Partial<AgentConfig> = {
  icp_industries: [],
  icp_roles: [],
  icp_company_size: "",
  icp_locations: [],
  icp_keywords: [],
  daily_connection_limit: 20,
  daily_comment_limit: 30,
  daily_like_limit: 50,
  delay_min_seconds: 45,
  delay_max_seconds: 180,
  active_hours_start: 9,
  active_hours_end: 18,
  active_days: [1, 2, 3, 4, 5],
  warming_days: 3,
  commenting_days: 2,
  nurturing_days: 5,
}

export default function AgentConfigComponent() {
  const [config, setConfig] = useState<Partial<AgentConfig>>(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<"icp" | "limits" | "schedule" | "sequence">("icp")
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/agent/config")
      if (res.ok) {
        const d = await res.json()
        setConfig(d.config || d.data || DEFAULT_CONFIG)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const save = async () => {
    setSaving(true)
    const res = await fetch("/api/agent/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    })
    if (res.ok) {
      showToast("Configuración guardada")
      const d = await res.json()
      setConfig(d.config || d.data || config)
    } else {
      const d = await res.json().catch(() => ({}))
      showToast(d.error || "Error al guardar", "err")
    }
    setSaving(false)
  }

  const updateField = (field: string, value: unknown) => {
    setConfig(prev => ({ ...prev, [field]: value }))
  }

  const updateArrayField = (field: string, value: string) => {
    const arr = value.split(",").map(s => s.trim()).filter(Boolean)
    setConfig(prev => ({ ...prev, [field]: arr }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    )
  }

  const inputStyle = {
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  }

  const tabs = [
    { key: "icp" as const, label: "ICP (Cliente Ideal)" },
    { key: "limits" as const, label: "Límites Diarios" },
    { key: "schedule" as const, label: "Horario" },
    { key: "sequence" as const, label: "Secuencia" },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2 rounded-xl text-sm font-medium shadow-lg" style={{ background: toast.type === "ok" ? "var(--success)" : "var(--danger)", color: "white" }}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Configuración del Agente</h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Define tu ICP, límites y comportamiento del agente</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
          style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white", opacity: saving ? 0.6 : 1 }}
        >
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--surface)" }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: tab === t.key ? "var(--accent)" : "transparent",
              color: tab === t.key ? "white" : "var(--text-secondary)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
        {tab === "icp" && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Industrias (separadas por coma)</label>
              <input
                value={(config.icp_industries || []).join(", ")}
                onChange={e => updateArrayField("icp_industries", e.target.value)}
                placeholder="SaaS, Fintech, E-commerce..."
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Roles / Cargos</label>
              <input
                value={(config.icp_roles || []).join(", ")}
                onChange={e => updateArrayField("icp_roles", e.target.value)}
                placeholder="CEO, CTO, VP Sales, Director..."
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Tamaño de Empresa</label>
              <select
                value={config.icp_company_size || ""}
                onChange={e => updateField("icp_company_size", e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={inputStyle}
              >
                <option value="">Cualquiera</option>
                <option value="1-10">1-10 empleados</option>
                <option value="11-50">11-50 empleados</option>
                <option value="51-200">51-200 empleados</option>
                <option value="201-500">201-500 empleados</option>
                <option value="500+">500+ empleados</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Ubicaciones</label>
              <input
                value={(config.icp_locations || []).join(", ")}
                onChange={e => updateArrayField("icp_locations", e.target.value)}
                placeholder="Argentina, México, España..."
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Keywords del Perfil</label>
              <input
                value={(config.icp_keywords || []).join(", ")}
                onChange={e => updateArrayField("icp_keywords", e.target.value)}
                placeholder="growth, marketing, scale..."
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {tab === "limits" && (
          <div className="space-y-5">
            {[
              { label: "Solicitudes de conexión / día", field: "daily_connection_limit", max: 50 },
              { label: "Comentarios / día", field: "daily_comment_limit", max: 60 },
              { label: "Likes / día", field: "daily_like_limit", max: 100 },
            ].map(item => (
              <div key={item.field}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{item.label}</label>
                  <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>
                    {(config as Record<string, unknown>)[item.field] as number || 0}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={item.max}
                  value={(config as Record<string, unknown>)[item.field] as number || 0}
                  onChange={e => updateField(item.field, parseInt(e.target.value))}
                  className="w-full accent-[#6c63ff]"
                />
                <div className="flex justify-between text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                  <span>1</span>
                  <span>Máx: {item.max}</span>
                </div>
              </div>
            ))}
            <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>Delay entre acciones (segundos)</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Mínimo</label>
                  <input
                    type="number"
                    value={config.delay_min_seconds || 45}
                    onChange={e => updateField("delay_min_seconds", parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Máximo</label>
                  <input
                    type="number"
                    value={config.delay_max_seconds || 180}
                    onChange={e => updateField("delay_max_seconds", parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === "schedule" && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold block mb-3" style={{ color: "var(--text-secondary)" }}>Días Activos</label>
              <div className="flex gap-2">
                {DAYS.map((d, i) => {
                  const active = (config.active_days || []).includes(i)
                  return (
                    <button
                      key={i}
                      onClick={() => {
                        const days = config.active_days || []
                        updateField("active_days", active ? days.filter(x => x !== i) : [...days, i].sort())
                      }}
                      className="w-10 h-10 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: active ? "var(--accent)" : "var(--surface-2)",
                        color: active ? "white" : "var(--text-muted)",
                        border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                      }}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-3" style={{ color: "var(--text-secondary)" }}>Horario de Operación</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Hora inicio</label>
                  <select
                    value={config.active_hours_start ?? 9}
                    onChange={e => updateField("active_hours_start", parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={inputStyle}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Hora fin</label>
                  <select
                    value={config.active_hours_end ?? 18}
                    onChange={e => updateField("active_hours_end", parseInt(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={inputStyle}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[10px] mt-2" style={{ color: "var(--text-muted)" }}>
                El agente solo operará entre las {String(config.active_hours_start ?? 9).padStart(2, "0")}:00 y las {String(config.active_hours_end ?? 18).padStart(2, "0")}:00
              </p>
            </div>
          </div>
        )}

        {tab === "sequence" && (
          <div className="space-y-5">
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              Define cuántos días permanece el prospecto en cada etapa antes de avanzar automáticamente.
            </p>
            {[
              { label: "Días de Calentamiento", desc: "Likes y vistas de perfil antes de comentar", field: "warming_days" },
              { label: "Días de Comentarios", desc: "Comentarios en posts antes de conectar", field: "commenting_days" },
              { label: "Días de Nurturing", desc: "Interacción post-conexión antes de mensaje directo", field: "nurturing_days" },
            ].map(item => (
              <div key={item.field} className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{item.label}</span>
                  <span className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                    {(config as Record<string, unknown>)[item.field] as number || 0} días
                  </span>
                </div>
                <p className="text-[10px] mb-3" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                <input
                  type="range"
                  min={1}
                  max={14}
                  value={(config as Record<string, unknown>)[item.field] as number || 3}
                  onChange={e => updateField(item.field, parseInt(e.target.value))}
                  className="w-full accent-[#6c63ff]"
                />
              </div>
            ))}

            {/* Sequence visualization */}
            <div className="pt-4" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Flujo de la Secuencia</p>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: "Descubrir", days: 0, color: "#6b7280" },
                  { label: "Calentar", days: config.warming_days || 3, color: "#f59e0b" },
                  { label: "Comentar", days: config.commenting_days || 2, color: "#8b5cf6" },
                  { label: "Conectar", days: 0, color: "#3b82f6" },
                  { label: "Nutrir", days: config.nurturing_days || 5, color: "#10b981" },
                  { label: "Mensaje", days: 0, color: "#22c55e" },
                ].map((s, i) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-lg text-[10px] font-semibold text-center" style={{ background: s.color + "22", color: s.color, minWidth: "70px" }}>
                      {s.label}
                      {s.days > 0 && <span className="block text-[9px] opacity-75">{s.days}d</span>}
                    </div>
                    {i < 5 && <span style={{ color: "var(--text-muted)" }}>→</span>}
                  </div>
                ))}
              </div>
              <p className="text-[10px] mt-3" style={{ color: "var(--text-muted)" }}>
                Total: ~{(config.warming_days || 3) + (config.commenting_days || 2) + (config.nurturing_days || 5)} días desde descubrimiento hasta primer mensaje directo
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
