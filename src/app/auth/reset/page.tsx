"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    // Supabase setea la sesión desde el hash de la URL automáticamente
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError("Las contraseñas no coinciden"); return }
    setLoading(true)
    setError("")
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => router.push("/dashboard"), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, var(--accent), #a78bfa)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold gradient-text">Nueva contraseña</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Elegí una nueva contraseña segura</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {done ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">✅</div>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>¡Contraseña actualizada!</p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Redirigiendo al dashboard...</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-current/30 border-t-current rounded-full animate-spin mx-auto mb-3" style={{ color: "var(--accent)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Verificando link...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Nueva contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres" required minLength={6} className={inputCls} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Confirmar contraseña</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repetí la contraseña" required minLength={6} className={inputCls} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                {loading ? "Guardando..." : "Actualizar contraseña"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
