"use client"
import { useState, useEffect, useCallback } from "react"

/* ─── types inline (no external dep) ────────────────────── */
interface AgentCfg {
  id?: string
  organization_id?: string
  is_active?: boolean
  icp_industries?: string[]
  icp_roles?: string[]
  icp_company_size?: string
  icp_locations?: string[]
  icp_keywords?: string[]
  daily_connection_limit?: number
  daily_comment_limit?: number
  daily_like_limit?: number
  delay_min_seconds?: number
  delay_max_seconds?: number
  active_hours_start?: number
  active_hours_end?: number
  active_days?: number[]
  warming_days?: number
  commenting_days?: number
  nurturing_days?: number
}

interface Account {
  id: string
  account_name: string
  linkedin_email: string
  session_cookie?: string
  status: string
  daily_connections_used: number
  daily_comments_used: number
  last_action_at?: string
}

/* ─── defaults ──────────────────────────────────────────── */
const DEFAULTS: AgentCfg = {
  icp_industries: [],
  icp_roles: [],
  icp_company_size: "",
  icp_locations: [],
  icp_keywords: [],
  daily_connection_limit: 15,
  daily_comment_limit: 4,
  daily_like_limit: 30,
  delay_min_seconds: 120,
  delay_max_seconds: 480,
  active_hours_start: 9,
  active_hours_end: 18,
  active_days: [1, 2, 3, 4, 5],
  warming_days: 7,
  commenting_days: 7,
  nurturing_days: 7,
}

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "Activa", color: "#22c55e" },
  warming: { label: "Calentando", color: "#f59e0b" },
  paused: { label: "Pausada", color: "#6b7280" },
  banned: { label: "Bloqueada", color: "#ef4444" },
  disconnected: { label: "Desconectada", color: "#ef4444" },
}

/* ═══════════════════════════════════════════════════════════ */

export default function AgentSettingsPage() {
  /* ─── state ─────────────────────────────────────────── */
  const [cfg, setCfg] = useState<AgentCfg>(DEFAULTS)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [validating, setValidating] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  const [tab, setTab] = useState<"config" | "accounts" | "status">("config")
  const [cfgTab, setCfgTab] = useState<"icp" | "limits" | "schedule" | "sequence">("icp")

  // add account form
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ account_name: "", linkedin_email: "", session_cookie: "" })
  const [addSaving, setAddSaving] = useState(false)

  const show = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  /* ─── fetch all ─────────────────────────────────────── */
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [cfgRes, accRes] = await Promise.all([
        fetch("/api/agent/config"),
        fetch("/api/agent/accounts"),
      ])
      if (cfgRes.ok) {
        const d = await cfgRes.json()
        const raw = d.config || d.data || null
        setCfg(raw ? { ...DEFAULTS, ...raw } : DEFAULTS)
      }
      if (accRes.ok) {
        const d = await accRes.json()
        setAccounts(d.accounts || d.data || [])
      }
    } catch (e) {
      show("Error cargando datos: " + String(e), "err")
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ─── save config ───────────────────────────────────── */
  const saveConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/agent/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      })
      const d = await res.json()
      if (res.ok) {
        const raw = d.config || d.data || null
        if (raw) setCfg({ ...DEFAULTS, ...raw })
        show("Configuración guardada")
      } else {
        show(d.error || "Error al guardar", "err")
      }
    } catch (e) {
      show("Error: " + String(e), "err")
    }
    setSaving(false)
  }

  /* ─── add account ───────────────────────────────────── */
  const addAccount = async () => {
    if (!form.account_name.trim() || !form.linkedin_email.trim()) {
      show("Nombre y email son requeridos", "err")
      return
    }
    setAddSaving(true)
    try {
      const res = await fetch("/api/agent/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (res.ok) {
        show("Cuenta agregada correctamente")
        setForm({ account_name: "", linkedin_email: "", session_cookie: "" })
        setShowAdd(false)
        fetchAll()
      } else {
        show(d.error || "Error al agregar", "err")
      }
    } catch (e) {
      show("Error: " + String(e), "err")
    }
    setAddSaving(false)
  }

  /* ─── remove account ────────────────────────────────── */
  const removeAccount = async (id: string) => {
    if (!confirm("¿Eliminar esta cuenta?")) return
    try {
      const res = await fetch(`/api/agent/accounts?id=${id}`, { method: "DELETE" })
      if (res.ok) {
        show("Cuenta eliminada")
        fetchAll()
      } else {
        show("Error al eliminar", "err")
      }
    } catch { show("Error al eliminar", "err") }
  }

  /* ─── validate account ──────────────────────────────── */
  const validateAccount = async (id: string) => {
    setValidating(id)
    try {
      const res = await fetch("/api/agent/accounts/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: id }),
      })
      const d = await res.json()
      if (d.valid) {
        show("Cookie VÁLIDA — La cuenta está conectada a LinkedIn", "ok")
      } else {
        show(d.message || "Cookie INVÁLIDA — Necesitás renovar la cookie li_at", "err")
      }
      fetchAll()
    } catch {
      show("Error al validar", "err")
    }
    setValidating(null)
  }

  /* ─── helpers ───────────────────────────────────────── */
  const set = (field: string, value: unknown) => setCfg(p => ({ ...p, [field]: value }))
  const setArr = (field: string, value: string) => {
    const arr = value.split(",").map(s => s.trim()).filter(Boolean)
    setCfg(p => ({ ...p, [field]: arr }))
  }

  const inputStyle = {
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  }

  /* ─── loading ───────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    )
  }

  /* ═══════════════════ RENDER ═══════════════════════════ */
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg max-w-sm" style={{ background: toast.type === "ok" ? "var(--success)" : "var(--danger)", color: "white" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Agente LinkedIn — Configuración</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Configurá tu ICP, cuentas y monitoreá el estado del agente</p>
      </div>

      {/* ─── Main Tabs ─────────────────────────────────── */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: "var(--surface)" }}>
        {[
          { key: "config" as const, label: "Configuración ICP" },
          { key: "accounts" as const, label: "Cuentas LinkedIn" },
          { key: "status" as const, label: "Estado del Agente" },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="flex-1 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: tab === t.key ? "var(--accent)" : "transparent",
              color: tab === t.key ? "white" : "var(--text-secondary)",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══════════ TAB: CONFIG ═══════════════════════════ */}
      {tab === "config" && (
        <div className="space-y-4">
          {/* Sub tabs */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--surface-2)" }}>
            {[
              { key: "icp" as const, label: "ICP" },
              { key: "limits" as const, label: "Límites" },
              { key: "schedule" as const, label: "Horario" },
              { key: "sequence" as const, label: "Secuencia" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setCfgTab(t.key)}
                className="flex-1 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all"
                style={{
                  background: cfgTab === t.key ? "var(--surface)" : "transparent",
                  color: cfgTab === t.key ? "var(--text-primary)" : "var(--text-muted)",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {/* ICP */}
            {cfgTab === "icp" && (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Industrias (separadas por coma)</label>
                  <input value={(cfg.icp_industries || []).join(", ")} onChange={e => setArr("icp_industries", e.target.value)} placeholder="SaaS, Fintech, E-commerce..." className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Roles / Cargos</label>
                  <input value={(cfg.icp_roles || []).join(", ")} onChange={e => setArr("icp_roles", e.target.value)} placeholder="CEO, CTO, VP Sales..." className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Tamaño de Empresa</label>
                  <select value={cfg.icp_company_size || ""} onChange={e => set("icp_company_size", e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
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
                  <input value={(cfg.icp_locations || []).join(", ")} onChange={e => setArr("icp_locations", e.target.value)} placeholder="Argentina, México, España..." className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>Keywords del Perfil</label>
                  <input value={(cfg.icp_keywords || []).join(", ")} onChange={e => setArr("icp_keywords", e.target.value)} placeholder="growth, marketing, scale..." className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
                </div>
              </div>
            )}

            {/* LIMITS */}
            {cfgTab === "limits" && (
              <div className="space-y-5">
                {[
                  { label: "Solicitudes de conexión / día", field: "daily_connection_limit", max: 50 },
                  { label: "Comentarios / día", field: "daily_comment_limit", max: 60 },
                  { label: "Likes / día", field: "daily_like_limit", max: 100 },
                ].map(item => (
                  <div key={item.field}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{item.label}</label>
                      <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>{(cfg as Record<string, unknown>)[item.field] as number || 0}</span>
                    </div>
                    <input type="range" min={1} max={item.max} value={(cfg as Record<string, unknown>)[item.field] as number || 0} onChange={e => set(item.field, parseInt(e.target.value))} className="w-full accent-[#6c63ff]" />
                  </div>
                ))}
                <div className="pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                  <p className="text-[10px] mb-2" style={{ color: "var(--text-muted)" }}>Delay entre acciones (segundos)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Mínimo</label>
                      <input type="number" value={cfg.delay_min_seconds || 120} onChange={e => set("delay_min_seconds", parseInt(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
                    </div>
                    <div>
                      <label className="text-[10px] block mb-1" style={{ color: "var(--text-muted)" }}>Máximo</label>
                      <input type="number" value={cfg.delay_max_seconds || 480} onChange={e => set("delay_max_seconds", parseInt(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SCHEDULE */}
            {cfgTab === "schedule" && (
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-semibold block mb-3" style={{ color: "var(--text-secondary)" }}>Días Activos</label>
                  <div className="flex gap-2">
                    {DAYS.map((d, i) => {
                      const active = (cfg.active_days || []).includes(i)
                      return (
                        <button key={i} onClick={() => { const days = cfg.active_days || []; set("active_days", active ? days.filter(x => x !== i) : [...days, i].sort()) }}
                          className="w-10 h-10 rounded-lg text-xs font-semibold transition-all"
                          style={{ background: active ? "var(--accent)" : "var(--surface-2)", color: active ? "white" : "var(--text-muted)", border: `1px solid ${active ? "var(--accent)" : "var(--border)"}` }}>
                          {d}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Hora inicio</label>
                    <select value={cfg.active_hours_start ?? 9} onChange={e => set("active_hours_start", parseInt(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
                      {Array.from({ length: 24 }, (_, i) => (<option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Hora fin</label>
                    <select value={cfg.active_hours_end ?? 18} onChange={e => set("active_hours_end", parseInt(e.target.value))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
                      {Array.from({ length: 24 }, (_, i) => (<option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* SEQUENCE */}
            {cfgTab === "sequence" && (
              <div className="space-y-5">
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cuántos días permanece cada prospecto en cada etapa antes de avanzar</p>
                {[
                  { label: "Calentamiento (ver perfil, likeear)", field: "warming_days" },
                  { label: "Comentarios (comentar posts)", field: "commenting_days" },
                  { label: "Nurturing (post-conexión)", field: "nurturing_days" },
                ].map(item => (
                  <div key={item.field}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{item.label}</label>
                      <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>{(cfg as Record<string, unknown>)[item.field] as number || 7} días</span>
                    </div>
                    <input type="range" min={1} max={30} value={(cfg as Record<string, unknown>)[item.field] as number || 7} onChange={e => set(item.field, parseInt(e.target.value))} className="w-full accent-[#6c63ff]" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save Button */}
          <button onClick={saveConfig} disabled={saving} className="w-full py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Guardando..." : "Guardar Configuración"}
          </button>
        </div>
      )}

      {/* ═══════════ TAB: ACCOUNTS ═════════════════════════ */}
      {tab === "accounts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Cuentas LinkedIn</h2>
            <button onClick={() => setShowAdd(!showAdd)} className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
              + Agregar Cuenta
            </button>
          </div>

          {/* Add Form */}
          {showAdd && (
            <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--accent)" }}>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Nombre de la cuenta</label>
                <input value={form.account_name} onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))} placeholder="Ej: Diego Principal" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Email de LinkedIn</label>
                <input value={form.linkedin_email} onChange={e => setForm(p => ({ ...p, linkedin_email: e.target.value }))} placeholder="email@ejemplo.com" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Session Cookie (li_at)</label>
                <input value={form.session_cookie} onChange={e => setForm(p => ({ ...p, session_cookie: e.target.value }))} placeholder="Pegá la cookie li_at de LinkedIn" type="password" className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
                <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                  Chrome → F12 → Application → Cookies → linkedin.com → copiá el valor de &quot;li_at&quot;
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={addAccount} disabled={addSaving} className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: "var(--accent)", color: "white", opacity: addSaving ? 0.6 : 1 }}>
                  {addSaving ? "Guardando..." : "Guardar Cuenta"}
                </button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-xs" style={{ color: "var(--text-muted)" }}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Accounts List */}
          {accounts.length === 0 ? (
            <div className="text-center py-16 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-4xl mb-3">🔗</p>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>No hay cuentas LinkedIn</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Hacé clic en &quot;+ Agregar Cuenta&quot; para conectar tu LinkedIn</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map(acc => {
                const st = STATUS_MAP[acc.status] || STATUS_MAP.disconnected
                return (
                  <div key={acc.id} className="p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "rgba(0,119,181,0.15)", color: "#0077b5" }}>in</div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{acc.account_name}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{acc.linkedin_email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold" style={{ background: st.color + "22", color: st.color }}>{st.label}</span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="flex gap-4 text-[10px]" style={{ color: "var(--text-muted)" }}>
                        <span>Conexiones hoy: <b>{acc.daily_connections_used}</b></span>
                        <span>Comentarios hoy: <b>{acc.daily_comments_used}</b></span>
                        {acc.last_action_at && <span>Última acción: {new Date(acc.last_action_at).toLocaleString("es-AR", { hour: "2-digit", minute: "2-digit" })}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => validateAccount(acc.id)} disabled={validating === acc.id}
                          className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                          style={{ background: "rgba(0,119,181,0.12)", color: "#0077b5", opacity: validating === acc.id ? 0.5 : 1 }}>
                          {validating === acc.id ? "Validando..." : "🔍 Validar Cookie"}
                        </button>
                        <button onClick={() => removeAccount(acc.id)} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ TAB: STATUS ═══════════════════════════ */}
      {tab === "status" && <AgentStatusPanel cfg={cfg} accounts={accounts} onRefresh={fetchAll} />}
    </div>
  )
}

/* ─── Status Panel (sub-component) ───────────────────────── */
function AgentStatusPanel({ cfg, accounts, onRefresh }: { cfg: AgentCfg; accounts: Account[]; onRefresh: () => void }) {
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    async function fetch_data() {
      setLoadingLogs(true)
      try {
        const [logsRes, queueRes] = await Promise.all([
          fetch("/api/agent/logs?limit=20"),
          fetch("/api/agent/queue?limit=5"),
        ])
        if (logsRes.ok) {
          const d = await logsRes.json()
          setLogs(d.data || [])
        }
        if (queueRes.ok) {
          const d = await queueRes.json()
          setStats(d.stats || {})
        }
      } catch { /* ignore */ }
      setLoadingLogs(false)
    }
    fetch_data()
  }, [])

  const totalQueue = Object.values(stats).reduce((a, b) => a + b, 0)
  const activeAccounts = accounts.filter(a => a.status === "active").length
  const hasConfig = !!(cfg.icp_industries && cfg.icp_industries.length > 0)
  const isActive = cfg.is_active
  const hasIssues = !hasConfig || activeAccounts === 0

  const toggleAgent = async () => {
    setToggling(true)
    try {
      const endpoint = isActive ? "/api/agent/pause" : "/api/agent/start"
      const res = await fetch(endpoint, { method: "POST" })
      const d = await res.json()
      if (!res.ok) {
        alert(d.error || "Error al cambiar estado del agente")
      }
      onRefresh()
    } catch {
      alert("Error de red")
    }
    setToggling(false)
  }

  const ACTION_LABELS: Record<string, string> = {
    profile_view: "Vista de perfil",
    post_like: "Like a post",
    post_comment: "Comentario en post",
    connection_request: "Solicitud de conexión",
    connection_accepted: "Conexión aceptada",
    direct_message: "Mensaje directo",
    profile_discovered: "Perfil descubierto",
    stage_changed: "Cambio de etapa",
    error: "Error",
  }

  return (
    <div className="space-y-4">
      {/* Status Banner */}
      <div className="rounded-2xl p-6" style={{
        background: isActive && !hasIssues
          ? "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05))"
          : hasIssues
            ? "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))"
            : "linear-gradient(135deg, rgba(107,114,128,0.15), rgba(107,114,128,0.05))",
        border: `1px solid ${isActive && !hasIssues ? "rgba(34,197,94,0.3)" : hasIssues ? "rgba(245,158,11,0.3)" : "rgba(107,114,128,0.3)"}`,
      }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full animate-pulse" style={{
              background: isActive && !hasIssues ? "#22c55e" : hasIssues ? "#f59e0b" : "#6b7280",
            }} />
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              {isActive && !hasIssues ? "Agente ACTIVO — Prospectando" : hasIssues ? "Agente necesita configuración" : "Agente INACTIVO"}
            </h2>
          </div>
          <button
            onClick={toggleAgent}
            disabled={toggling}
            className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{
              background: isActive
                ? "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "#fff",
              opacity: toggling ? 0.6 : 1,
              boxShadow: isActive
                ? "0 4px 15px rgba(239,68,68,0.3)"
                : "0 4px 15px rgba(34,197,94,0.3)",
            }}
          >
            {toggling ? "..." : isActive ? "⏸ Pausar Agente" : "▶ Activar Agente"}
          </button>
        </div>

        {/* Checklist */}
        <div className="space-y-2 ml-7">
          <CheckItem ok={hasConfig} label="ICP configurado (industrias, roles, etc.)" />
          <CheckItem ok={activeAccounts > 0} label={`${activeAccounts} cuenta(s) LinkedIn activa(s)`} />
          <CheckItem ok={!!isActive} label="Agente activado" />
          <CheckItem ok={totalQueue > 0} label={`${totalQueue} prospectos en pipeline`} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "En Pipeline", value: totalQueue, color: "var(--accent)" },
          { label: "Mensajeados", value: (stats["messaged"] || 0), color: "#22c55e" },
          { label: "Respondieron", value: (stats["responded"] || 0), color: "#06b6d4" },
          { label: "Convertidos", value: (stats["converted"] || 0), color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <p className="text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity Log */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-5 py-3 flex items-center justify-between" style={{ background: "var(--surface)" }}>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Registro de Actividad</h2>
          <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: "var(--accent-glow)", color: "var(--accent)" }}>
            Últimas {logs.length} acciones
          </span>
        </div>

        {loadingLogs ? (
          <div className="flex items-center justify-center py-12" style={{ background: "var(--surface-2)" }}>
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
          </div>
        ) : logs.length === 0 ? (
          <div className="px-5 py-12 text-center" style={{ background: "var(--surface-2)" }}>
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              No hay actividad registrada todavía
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              Cuando el agente empiece a operar, verás cada acción aquí
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {logs.map((log, i) => {
              const actionType = String(log.action_type || "")
              const success = log.success !== false
              return (
                <div key={i} className="flex items-center gap-3 px-5 py-3" style={{ background: "var(--surface-2)" }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: success ? "#22c55e" : "#ef4444" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                      {ACTION_LABELS[actionType] || actionType}
                    </p>
                    {log.action_detail && (
                      <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{String(log.action_detail)}</p>
                    )}
                    {log.generated_content && (
                      <p className="text-[10px] truncate mt-0.5 italic" style={{ color: "var(--text-secondary)" }}>&quot;{String(log.generated_content).slice(0, 100)}&quot;</p>
                    )}
                    {log.error_message && (
                      <p className="text-[10px] mt-0.5" style={{ color: "#ef4444" }}>Error: {String(log.error_message)}</p>
                    )}
                  </div>
                  <div className="text-[10px] shrink-0" style={{ color: "var(--text-muted)" }}>
                    {log.executed_at ? new Date(String(log.executed_at)).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Check Item ──────────────────────────────────────────── */
function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ color: ok ? "#22c55e" : "#ef4444" }}>{ok ? "✅" : "❌"}</span>
      <span className="text-sm" style={{ color: ok ? "var(--text-primary)" : "var(--text-secondary)" }}>{label}</span>
    </div>
  )
}
