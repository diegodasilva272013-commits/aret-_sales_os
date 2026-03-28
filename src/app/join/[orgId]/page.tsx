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
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.from("organizations").select("name, logo_url").eq("id", orgId).single()
      .then(({ data }) => { setOrg(data); setLoadingOrg(false) })
  }, [orgId])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (signUpError) { setError(signUpError.message); setLoading(false); return }
    if (!data.user) { setError("Error creando cuenta"); setLoading(false); return }

    // Vincular a la org
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ organization_id: orgId, is_owner: false })
      .eq("id", data.user.id)

    if (profileError) {
      // Reintentar después de un momento (trigger puede demorar)
      await new Promise(r => setTimeout(r, 1500))
      await supabase.from("profiles").update({ organization_id: orgId, is_owner: false }).eq("id", data.user.id)
    }

    router.push("/dashboard")
    router.refresh()
  }

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
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Creá tu cuenta de setter para empezar</p>
        </div>

        <div className="rounded-2xl p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Nombre completo</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Tu nombre" required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com" required
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Contraseña</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" required minLength={6}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
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
                  Creando cuenta...
                </span>
              ) : `Unirme a ${org.name}`}
            </button>
          </form>

          <p className="mt-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
            ¿Ya tenés cuenta?{" "}
            <a href="/login" className="hover:underline" style={{ color: "var(--accent-light)" }}>Iniciá sesión</a>
          </p>
        </div>
      </div>
    </div>
  )
}
