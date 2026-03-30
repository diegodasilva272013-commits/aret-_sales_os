"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Setter = {
  id: string
  full_name: string
  email: string
  role: string
  is_owner: boolean
  created_at: string
  prospects: number
  businesses: number
}

export default function AdminClient({ team, currentUserId }: { team: Setter[]; currentUserId: string }) {
  const router = useRouter()
  const [removing, setRemoving] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Setter | null>(null)
  const [reassignTo, setReassignTo] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({ fullName: "", email: "", password: "", role: "setter" })
  const [createError, setCreateError] = useState("")
  const [createSuccess, setCreateSuccess] = useState("")

  const otherSetters = team.filter(s => s.id !== confirmDelete?.id)

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError("")
    setCreateSuccess("")
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error creando usuario")
      setCreateSuccess(`${createForm.role === "setter" ? "Setter" : "Closer"} creado exitosamente`)
      setCreateForm({ fullName: "", email: "", password: "", role: "setter" })
      setTimeout(() => {
        setShowCreateModal(false)
        setCreateSuccess("")
        router.refresh()
      }, 1500)
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Error creando usuario")
    } finally {
      setCreating(false)
    }
  }

  async function handleRemove() {
    if (!confirmDelete) return
    setRemoving(confirmDelete.id)
    try {
      const res = await fetch("/api/admin/remove-setter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setterId: confirmDelete.id, reassignTo: reassignTo || null }),
      })
      if (!res.ok) throw new Error("Error")
      setConfirmDelete(null)
      setReassignTo("")
      router.refresh()
    } catch {
      alert("Error removiendo setter")
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--background)" }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>ADMIN</span>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Panel de Administración</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Gestioná el equipo, reasigná leads y controlá el acceso</p>
          </div>
          <button
            onClick={() => { setShowCreateModal(true); setCreateError(""); setCreateSuccess("") }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shrink-0"
            style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Agregar Usuario
          </button>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Miembros activos", value: team.length, icon: "👥" },
            { label: "Total prospectos", value: team.reduce((a, s) => a + s.prospects, 0), icon: "🎯" },
            { label: "Total empresas", value: team.reduce((a, s) => a + s.businesses, 0), icon: "🏢" },
          ].map(stat => (
            <div key={stat.label} className="p-5 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-2xl mb-1">{stat.icon}</p>
              <p className="text-3xl font-bold gradient-text">{stat.value}</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Team table */}
        <div className="rounded-2xl overflow-hidden animate-fade-in" style={{ border: "1px solid var(--border)" }}>
          <div className="px-6 py-4 flex items-center justify-between" style={{ background: "var(--surface)" }}>
            <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Equipo</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                {["Miembro", "Email", "Prospectos", "Empresas", "Rol", "Ingresó", ""].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {team.map(setter => (
                <tr key={setter.id} style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--surface)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--surface-2)")}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                        {setter.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{setter.full_name}</p>
                        {setter.id === currentUserId && <span className="text-xs" style={{ color: "var(--text-muted)" }}>← Vos</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs" style={{ color: "var(--text-secondary)" }}>{setter.email}</td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{setter.prospects}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{setter.businesses}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-1 rounded-full text-xs"
                      style={{ background: setter.is_owner ? "rgba(108,99,255,0.15)" : setter.role === "closer" ? "rgba(34,197,94,0.15)" : "var(--surface-3)", color: setter.is_owner ? "var(--accent-light)" : setter.role === "closer" ? "#22c55e" : "var(--text-muted)" }}>
                      {setter.is_owner ? "Admin" : setter.role === "closer" ? "Closer" : "Setter"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs" style={{ color: "var(--text-muted)" }}>
                    {new Date(setter.created_at).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-5 py-4">
                    {setter.id !== currentUserId && (
                      <button
                        onClick={() => { setConfirmDelete(setter); setReassignTo("") }}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                        Remover
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal confirmar borrado */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
          <div className="w-full max-w-md rounded-2xl p-6 animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Remover setter</h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              Vas a remover a <strong style={{ color: "var(--text-primary)" }}>{confirmDelete.full_name}</strong> del equipo.
              {(confirmDelete.prospects > 0 || confirmDelete.businesses > 0) && (
                <span> Tiene <strong style={{ color: "var(--warning)" }}>{confirmDelete.prospects} prospectos</strong> y <strong style={{ color: "var(--warning)" }}>{confirmDelete.businesses} empresas</strong> asignadas.</span>
              )}
            </p>

            {(confirmDelete.prospects > 0 || confirmDelete.businesses > 0) && (
              <div className="mb-5">
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                  Reasignar sus leads a:
                </label>
                <select
                  value={reassignTo}
                  onChange={e => setReassignTo(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                  <option value="">— Sin reasignar (quedan sin setter) —</option>
                  {otherSetters.map(s => (
                    <option key={s.id} value={s.id}>{s.full_name} ({s.prospects + s.businesses} leads)</option>
                  ))}
                </select>
                {!reassignTo && (
                  <p className="mt-1 text-xs" style={{ color: "var(--warning)" }}>⚠️ Si no reasignás, los leads quedan sin setter asignado</p>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                Cancelar
              </button>
              <button onClick={handleRemove} disabled={!!removing}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                {removing ? "Removiendo..." : "Confirmar y remover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false) }}>
          <div className="w-full max-w-md rounded-2xl p-6 animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Agregar Usuario</h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              Creá un nuevo setter o closer para tu equipo
            </p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Nombre completo</label>
                <input
                  type="text"
                  value={createForm.fullName}
                  onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Ej: Juan Pérez"
                  required
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@ejemplo.com"
                  required
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Contraseña</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Rol</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button"
                    onClick={() => setCreateForm(f => ({ ...f, role: "setter" }))}
                    className="p-3 rounded-xl text-sm font-medium transition-all text-center"
                    style={{
                      background: createForm.role === "setter" ? "rgba(108,99,255,0.15)" : "var(--surface-2)",
                      border: `2px solid ${createForm.role === "setter" ? "var(--accent)" : "var(--border)"}`,
                      color: createForm.role === "setter" ? "var(--accent-light)" : "var(--text-muted)",
                    }}>
                    <span className="text-lg block mb-1">🎯</span>
                    Setter
                    <span className="block text-xs mt-0.5 opacity-70">Prospección</span>
                  </button>
                  <button type="button"
                    onClick={() => setCreateForm(f => ({ ...f, role: "closer" }))}
                    className="p-3 rounded-xl text-sm font-medium transition-all text-center"
                    style={{
                      background: createForm.role === "closer" ? "rgba(34,197,94,0.15)" : "var(--surface-2)",
                      border: `2px solid ${createForm.role === "closer" ? "#22c55e" : "var(--border)"}`,
                      color: createForm.role === "closer" ? "#22c55e" : "var(--text-muted)",
                    }}>
                    <span className="text-lg block mb-1">💰</span>
                    Closer
                    <span className="block text-xs mt-0.5 opacity-70">Cierre de ventas</span>
                  </button>
                </div>
              </div>

              {createError && (
                <div className="p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {createError}
                </div>
              )}

              {createSuccess && (
                <div className="p-3 rounded-xl text-sm" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                  ✓ {createSuccess}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                  {creating ? "Creando..." : "Crear Usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
