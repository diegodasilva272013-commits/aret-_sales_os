"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export default function JoinPage() {
  const { orgId } = useParams<{ orgId: string }>()
  const [org, setOrg] = useState<{ name: string; logo_url?: string } | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [loadingOrg, setLoadingOrg] = useState(true)
  const [emailSent, setEmailSent] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendMsg, setResendMsg] = useState("")
  const [mode, setMode] = useState<"register" | "login">("register")
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      // Cargar org
      const { data } = await supabase.from("organizations").select("name, logo_url").eq("id", orgId).single()
      setOrg(data)
      setLoadingOrg(false)

      // Si ya está logueado, vincular directo
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()
        if (profile && !profile.organization_id) {
          await supabase.from("profiles").update({ organization_id: orgId, is_owner: false }).eq("id", user.id)
          router.push("/dashboard")
          router.refresh()
        } else if (profile?.organization_id === orgId) {
          router.push("/dashboard")
          router.refresh()
        }
      }
    }
    init()
  }, [orgId])

  async function handleJoinRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    // Registrar nuevo usuario con orgId en metadata
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, pending_org_id: orgId },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/dashboard`,
      },
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    if (!data.user) { setError("Error creando cuenta"); setLoading(false); return }

    // Si hay sesión inmediata (email confirm desactivado), vincular directo
    if (data.session) {
      await linkToOrg(data.user.id)
      router.push("/dashboard")
      router.refresh()
      return
    }

    // Email confirmation requerida
    setEmailSent(true)
    setLoading(false)
  }

  async function handleJoinLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { data, error: loginError } = await supabase.auth.signInWithPassword({ email, password })
    if (loginError) { setError(loginError.message); setLoading(false); return }
    if (!data.user) { setError("Error al iniciar sesión"); setLoading(false); return }

    await linkToOrg(data.user.id)
    router.push("/dashboard")
    router.refresh()
  }

  async function linkToOrg(userId: string) {
    // Esperar a que el trigger cree el profile si es nuevo
    let attempts = 0
    while (attempts < 5) {
      const { data: profile } = await supabase.from("profiles").select("id, organization_id").eq("id", userId).single()
      if (profile) {
        if (!profile.organization_id) {
          await supabase.from("profiles").update({ organization_id: orgId, is_owner: false }).eq("id", userId)
        }
        return
      }
      attempts++
      await new Promise(r => setTimeout(r, 1000))
    }
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }

  if (loadingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="w-8 h-8 border-2 border-current/30 border-t-current rounded-full animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    )
  }

  if (!org) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="text-center">
          <p className="text-2xl mb-2">😕</p>
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Link inválido o expirado</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Pedile al admin un nuevo link de invitación</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)" }} />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 overflow-hidden"
            style={{ background: org.logo_url ? "var(--surface)" : "linear-gradient(135deg, var(--accent), #a78bfa)", border: org.logo_url ? "1px solid var(--border)" : "none" }}>
            {org.logo_url
              ? <img src={org.logo_url} alt="Logo" className="w-full h-full object-contain" />
              : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
            }
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Unirte a {org.name}</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            {mode === "register" ? "Creá tu cuenta de setter para empezar" : "Iniciá sesión para unirte al equipo"}
          </p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {/* Email de confirmación enviado */}
          {emailSent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📧</div>
              <h2 className="font-bold text-lg mb-2" style={{ color: "var(--text-primary)" }}>Revisá tu email</h2>
              <p className="text-sm mb-2" style={{ color: "var(--text-secondary)" }}>
                Te enviamos un link de confirmación a <strong>{email}</strong>
              </p>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                Una vez que confirmes, vas a quedar vinculado automáticamente a <strong>{org.name}</strong>.
                Revisá también la carpeta de spam.
              </p>
              <button
                disabled={resending}
                onClick={async () => {
                  setResending(true)
                  setResendMsg("")
                  const { error } = await supabase.auth.resend({ type: "signup", email })
                  setResending(false)
                  setResendMsg(error ? error.message : "✓ Email reenviado")
                }}
                className="text-sm font-medium hover:underline disabled:opacity-50"
                style={{ color: "var(--accent)" }}
              >
                {resending ? "Reenviando..." : "Reenviar email de confirmación"}
              </button>
              {resendMsg && (
                <p className="text-xs mt-2" style={{ color: resendMsg.startsWith("✓") ? "#22c55e" : "var(--danger)" }}>
                  {resendMsg}
                </p>
              )}
              <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <button onClick={() => { setEmailSent(false); setMode("login") }} className="text-sm hover:underline" style={{ color: "var(--accent-light)" }}>
                  Ya confirmé → Iniciar sesión
                </button>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={mode === "register" ? handleJoinRegister : handleJoinLogin} className="space-y-4">
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
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Contraseña</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder={mode === "register" ? "Mínimo 6 caracteres" : "Tu contraseña"} required minLength={6}
                    className={inputCls} style={inputStyle}
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
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {mode === "register" ? "Creando cuenta..." : "Ingresando..."}
                    </span>
                  ) : mode === "register" ? `Crear cuenta y unirme` : `Ingresar y unirme a ${org.name}`}
                </button>
              </form>

              <div className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                {mode === "register" ? (
                  <>¿Ya tenés cuenta?{" "}
                    <button onClick={() => { setMode("login"); setError("") }} className="font-medium hover:underline" style={{ color: "var(--accent-light)" }}>
                      Iniciá sesión para unirte
                    </button>
                  </>
                ) : (
                  <>¿No tenés cuenta?{" "}
                    <button onClick={() => { setMode("register"); setError("") }} className="font-medium hover:underline" style={{ color: "var(--accent-light)" }}>
                      Registrate
                    </button>
                  </>
                )}
              </div>
            </>
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
