"use client"

export const dynamic = "force-dynamic"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      setLoading(false)
      if (error) { setError(error.message); return }
      setResetSent(true)
      return
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      if (error) { setError(error.message); setLoading(false); return }
      if (data.user && !data.session) {
        setEmailSent(true)
        setLoading(false)
        return
      }
    }

    router.push("/dashboard")
    router.refresh()
  }

  const subtitle = mode === "login" ? "Iniciá sesión en tu cuenta" : mode === "register" ? "Creá tu cuenta para empezar" : "Recuperá tu contraseña"

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: "linear-gradient(135deg, var(--accent), #a78bfa)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold gradient-text">Arete Prospector</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {/* Estado: email de confirmación enviado */}
          {emailSent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="font-bold text-lg mb-2" style={{ color: "var(--text-primary)" }}>Revisá tu email</h2>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                Te enviamos un link de confirmación a <strong>{email}</strong>
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                Revisá también la carpeta de spam o correo no deseado.
              </p>
              <button
                disabled={resending}
                onClick={async () => {
                  setResending(true)
                  setResendMsg("")
                  const { error } = await supabase.auth.resend({ type: "signup", email })
                  setResending(false)
                  if (error) {
                    setResendMsg(error.message)
                  } else {
                    setResendMsg("✓ Email reenviado correctamente")
                  }
                }}
                className="text-sm font-medium hover:underline disabled:opacity-50"
                style={{ color: "var(--accent)" }}
              >
                {resending ? "Reenviando..." : "Reenviar email de confirmación"}
              </button>
              {resendMsg && (
                <p className="text-xs mt-2" style={{ color: resendMsg.startsWith("✓") ? "var(--success, #22c55e)" : "var(--danger)" }}>
                  {resendMsg}
                </p>
              )}
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <button onClick={() => { setEmailSent(false); setMode("login"); setResendMsg("") }} className="text-sm hover:underline" style={{ color: "var(--accent-light)" }}>
                  Ya confirmé → Iniciar sesión
                </button>
              </div>
            </div>

          /* Estado: email de reset enviado */
          ) : resetSent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">🔑</div>
              <h2 className="font-bold text-lg mb-2" style={{ color: "var(--text-primary)" }}>Revisá tu email</h2>
              <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
                Te enviamos un link para resetear tu contraseña a <strong>{email}</strong>
              </p>
              <button onClick={() => { setResetSent(false); setMode("login") }} className="text-sm hover:underline" style={{ color: "var(--accent-light)" }}>
                Volver al login
              </button>
            </div>

          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Nombre completo</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="Tu nombre" required className={inputCls} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--accent)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"} />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com" required className={inputCls} style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>

              {mode !== "forgot" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Contraseña</label>
                    {mode === "login" && (
                      <button type="button" onClick={() => { setMode("forgot"); setError("") }}
                        className="text-xs hover:underline" style={{ color: "var(--accent-light)" }}>
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required minLength={6} className={inputCls} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--accent)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"} />
                </div>
              )}

              {error && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all mt-2 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Procesando...
                  </span>
                ) : mode === "login" ? "Ingresar" : mode === "register" ? "Crear cuenta" : "Enviar link de recuperación"}
              </button>
            </form>
          )}

          {!emailSent && !resetSent && (
            <div className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              {mode === "login" ? (
                <>¿No tenés cuenta?{" "}
                  <button onClick={() => { setMode("register"); setError("") }} className="font-medium hover:underline" style={{ color: "var(--accent-light)" }}>
                    Registrate gratis
                  </button>
                </>
              ) : (
                <>¿Ya tenés cuenta?{" "}
                  <button onClick={() => { setMode("login"); setError("") }} className="font-medium hover:underline" style={{ color: "var(--accent-light)" }}>
                    Iniciá sesión
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: "var(--text-muted)" }}>
          Arete Soluciones © {new Date().getFullYear()} ·{" "}
          <a href="/legal" className="hover:underline" style={{ color: "var(--accent-light)" }}>Términos y Privacidad</a>
        </p>
      </div>
    </div>
  )
}
