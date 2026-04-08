"use client"
import { useState, useEffect, useCallback } from "react"
import type { LinkedInAccount } from "@/types/agent"

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  active: { label: "Activa", color: "#22c55e" },
  warming: { label: "Calentando", color: "#f59e0b" },
  paused: { label: "Pausada", color: "#6b7280" },
  banned: { label: "Bloqueada", color: "#ef4444" },
  disconnected: { label: "Desconectada", color: "#ef4444" },
}

export default function AgentAccounts() {
  const [accounts, setAccounts] = useState<LinkedInAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ account_name: "", linkedin_email: "", session_cookie: "" })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 3000)
  }

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    const res = await fetch("/api/agent/accounts")
    if (res.ok) {
      const d = await res.json()
      setAccounts(d.accounts ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAccounts() }, [fetchAccounts])

  const addAccount = async () => {
    if (!form.account_name.trim() || !form.linkedin_email.trim()) return
    setSaving(true)
    const res = await fetch("/api/agent/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      showToast("Cuenta agregada")
      setForm({ account_name: "", linkedin_email: "", session_cookie: "" })
      setShowAdd(false)
      fetchAccounts()
    } else {
      const d = await res.json().catch(() => ({}))
      showToast(d.error || "Error", "err")
    }
    setSaving(false)
  }

  const removeAccount = async (id: string) => {
    if (!confirm("¿Eliminar esta cuenta?")) return
    const res = await fetch(`/api/agent/accounts?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      showToast("Cuenta eliminada")
      fetchAccounts()
    } else {
      showToast("Error al eliminar", "err")
    }
  }

  const inputStyle = {
    background: "var(--surface-2)",
    color: "var(--text-primary)",
    border: "1px solid var(--border)",
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2 rounded-xl text-sm font-medium shadow-lg" style={{ background: toast.type === "ok" ? "var(--success)" : "var(--danger)", color: "white" }}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Cuentas LinkedIn</h2>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}
        >
          + Agregar Cuenta
        </button>
      </div>

      {/* Add Form */}
      {showAdd && (
        <div className="rounded-xl p-5 space-y-3" style={{ background: "var(--surface)", border: "1px solid var(--accent)" }}>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Nombre de la cuenta</label>
            <input
              value={form.account_name}
              onChange={e => setForm(p => ({ ...p, account_name: e.target.value }))}
              placeholder="Mi cuenta principal"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Email de LinkedIn</label>
            <input
              value={form.linkedin_email}
              onChange={e => setForm(p => ({ ...p, linkedin_email: e.target.value }))}
              placeholder="email@ejemplo.com"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1" style={{ color: "var(--text-secondary)" }}>Session Cookie (li_at)</label>
            <input
              value={form.session_cookie}
              onChange={e => setForm(p => ({ ...p, session_cookie: e.target.value }))}
              placeholder="Cookie de sesión LinkedIn"
              type="password"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            />
            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
              Obtené la cookie &quot;li_at&quot; desde DevTools → Application → Cookies en linkedin.com
            </p>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={addAccount} disabled={saving} className="px-4 py-2 rounded-lg text-xs font-semibold" style={{ background: "var(--accent)", color: "white", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-xs" style={{ color: "var(--text-muted)" }}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay cuentas LinkedIn conectadas</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Agregá una cuenta para empezar a prospectar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {accounts.map(acc => {
            const st = STATUS_MAP[acc.status] || STATUS_MAP.disconnected
            return (
              <div key={acc.id} className="flex items-center justify-between p-4 rounded-xl transition-colors" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--accent)")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "rgba(0,119,181,0.15)", color: "#0077b5" }}>
                    in
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{acc.account_name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{acc.linkedin_email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                      Hoy: {acc.daily_connections_used} conex · {acc.daily_comments_used} com
                    </p>
                    {acc.last_action_at && (
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        Última: {new Date(acc.last_action_at).toLocaleString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                  <span className="px-2 py-1 rounded-full text-[10px] font-semibold" style={{ background: st.color + "22", color: st.color }}>
                    {st.label}
                  </span>
                  <button onClick={() => removeAccount(acc.id)} className="text-xs px-2 py-1 rounded-lg transition-colors" style={{ color: "var(--text-muted)" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--danger)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
                  >✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
