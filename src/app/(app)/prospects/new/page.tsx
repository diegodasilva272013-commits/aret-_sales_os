"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

const STEPS = [
  { label: "Buscando información del prospecto...", pct: 15 },
  { label: "Construyendo perfil psicológico...", pct: 35 },
  { label: "Desarrollando estrategia de venta...", pct: 55 },
  { label: "Generando secuencia de mensajes...", pct: 72 },
  { label: "Refinando y optimizando mensajes...", pct: 88 },
  { label: "Guardando prospecto...", pct: 95 },
  { label: "¡Análisis completo!", pct: 100 },
]

type Source = "linkedin" | "instagram" | "manual"

const SOURCE_CONFIG = {
  linkedin: {
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/nombre-apellido",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
      </svg>
    ),
    color: "#0077b5",
    validate: (url: string) => url.includes("linkedin.com") || url.startsWith("http"),
    error: "Ingresá un link de LinkedIn válido",
  },
  instagram: {
    label: "Instagram",
    placeholder: "https://instagram.com/usuario o @usuario",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
    color: "#e1306c",
    validate: (url: string) => url.includes("instagram.com") || url.startsWith("@") || url.length > 2,
    error: "Ingresá un link o usuario de Instagram válido",
  },
}

const LANGUAGES = [
  { code: "es", label: "Español", flag: "🇦🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "pt", label: "Português", flag: "🇧🇷" },
]

export default function NewProspectPage() {
  const [source, setSource] = useState<Source>("linkedin")
  const [url, setUrl] = useState("")
  const [language, setLanguage] = useState("es")
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [error, setError] = useState("")
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const router = useRouter()

  // Formulario manual
  const [manual, setManual] = useState({
    full_name: "", company: "", headline: "", location: "",
    whatsapp_number: "", linkedin_url: "", instagram_url: "",
  })
  const [savingManual, setSavingManual] = useState(false)

  async function handleManualSave(e: React.FormEvent) {
    e.preventDefault()
    if (!manual.full_name.trim()) return
    setSavingManual(true)
    setError("")
    try {
      const res = await fetch("/api/prospects/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(manual),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al guardar")
      router.push(`/prospects/${data.prospectId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      setSavingManual(false)
    }
  }

  const cfg = SOURCE_CONFIG[source]

  function normalizeInstagramUrl(input: string): string {
    if (input.startsWith("@")) return `https://instagram.com/${input.slice(1)}`
    if (!input.startsWith("http")) return `https://instagram.com/${input}`
    return input
  }

  function simulateSteps(onDone: () => void) {
    let i = 0
    const next = () => {
      if (i < STEPS.length - 1) {
        i++
        setStepIndex(i)
        setTimeout(next, 2800 + Math.random() * 1500)
      } else { onDone() }
    }
    setStepIndex(0)
    setTimeout(next, 2500)
  }

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault()
    const normalizedUrl = source === "instagram" ? normalizeInstagramUrl(url) : url

    if (!cfg.validate(url)) {
      setError(cfg.error)
      return
    }

    setLoading(true)
    setError("")
    setStepIndex(0)

    let done = false
    simulateSteps(() => { done = true })

    try {
      const body = source === "instagram"
        ? { instagramUrl: normalizedUrl, sourceType: "instagram", profileText: "", language }
        : { linkedinUrl: normalizedUrl, sourceType: "linkedin", profileText: "", language }

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await res.json()

      if (res.status === 409) {
        setError(`⚠️ ${data.message}. Prospecto ya existente.`)
        setLoading(false)
        return
      }

      if (res.status === 403) {
        setShowUpgradeModal(true)
        setLoading(false)
        return
      }

      if (!res.ok) throw new Error(data.error || "Error en el análisis")

      const wait = () => done ? router.push(`/prospects/${data.prospectId}`) : setTimeout(wait, 300)
      wait()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido")
      setLoading(false)
    }
  }

  return (
    <>
    <div className="min-h-screen p-8" style={{ background: "var(--background)" }}>
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Nuevo Prospecto</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
            Pegá el link del perfil — la IA busca toda la info y genera los mensajes personalizados
          </p>
        </div>

        <div className="rounded-2xl p-8 animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {!loading ? (
            <>
              {/* Source selector */}
              <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{ background: "var(--surface-2)" }}>
                {(["linkedin", "instagram"] as Source[]).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setSource(s); setUrl(""); setError("") }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                    style={{
                      background: source === s ? "var(--surface)" : "transparent",
                      color: source === s ? SOURCE_CONFIG[s].color : "var(--text-muted)",
                      boxShadow: source === s ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
                    }}>
                    <span style={{ color: source === s ? SOURCE_CONFIG[s].color : "var(--text-muted)" }}>
                      {SOURCE_CONFIG[s].icon}
                    </span>
                    {SOURCE_CONFIG[s].label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setSource("manual"); setError("") }}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: source === "manual" ? "var(--surface)" : "transparent",
                    color: source === "manual" ? "var(--text-primary)" : "var(--text-muted)",
                    boxShadow: source === "manual" ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
                  }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                  Manual
                </button>
              </div>

              {/* Formulario manual */}
              {source === "manual" && (
                <form onSubmit={handleManualSave} className="space-y-4">
                  <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                    Cargá el prospecto a mano. Solo el nombre es obligatorio.
                  </p>
                  {[
                    { key: "full_name", label: "Nombre completo *", placeholder: "Juan García", type: "text" },
                    { key: "company", label: "Empresa", placeholder: "Acme S.A.", type: "text" },
                    { key: "headline", label: "Cargo / Descripción", placeholder: "CEO en Acme", type: "text" },
                    { key: "location", label: "Ubicación", placeholder: "Buenos Aires, Argentina", type: "text" },
                    { key: "whatsapp_number", label: "WhatsApp", placeholder: "+54 9 11 1234 5678", type: "text" },
                    { key: "linkedin_url", label: "LinkedIn URL", placeholder: "https://linkedin.com/in/...", type: "text" },
                    { key: "instagram_url", label: "Instagram URL", placeholder: "https://instagram.com/...", type: "text" },
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                        {field.label}
                      </label>
                      <input
                        type={field.type}
                        value={(manual as Record<string, string>)[field.key]}
                        onChange={e => setManual(prev => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.placeholder}
                        required={field.key === "full_name"}
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                        onFocus={e => e.target.style.borderColor = "var(--accent)"}
                        onBlur={e => e.target.style.borderColor = "var(--border)"}
                      />
                    </div>
                  ))}

                  {error && (
                    <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      {error}
                    </div>
                  )}

                  <button type="submit" disabled={savingManual || !manual.full_name.trim()}
                    className="w-full py-4 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                    {savingManual ? "Guardando..." : "Crear prospecto"}
                  </button>
                </form>
              )}

              {/* Selector de idioma */}
              {source !== "manual" && (<div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Idioma de los mensajes:</span>
                <div className="flex gap-1">
                  {LANGUAGES.map(lang => (
                    <button key={lang.code} type="button"
                      onClick={() => setLanguage(lang.code)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: language === lang.code ? "var(--accent-glow)" : "var(--surface-2)",
                        color: language === lang.code ? "var(--accent-light)" : "var(--text-muted)",
                        border: language === lang.code ? "1px solid rgba(108,99,255,0.3)" : "1px solid var(--border)",
                      }}>
                      {lang.flag} {lang.label}
                    </button>
                  ))}
                </div>
              </div>)}

              {source !== "manual" && (<form onSubmit={handleAnalyze} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-3" style={{ color: "var(--text-secondary)" }}>
                    {source === "instagram" ? "URL o usuario de Instagram" : "URL del perfil LinkedIn"}
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: source === "instagram" ? "#e1306c" : "#0077b5" }}>
                      {cfg.icon}
                    </div>
                    <input
                      type="text"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder={cfg.placeholder}
                      required
                      className="w-full pl-12 pr-4 py-4 rounded-xl text-sm outline-none transition-all"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      onFocus={e => e.target.style.borderColor = source === "instagram" ? "#e1306c" : "var(--accent)"}
                      onBlur={e => e.target.style.borderColor = "var(--border)"}
                    />
                  </div>
                  {source === "instagram" && (
                    <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
                      Podés pegar el link completo, el @usuario o solo el nombre de usuario
                    </p>
                  )}
                </div>

                {error && (
                  <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    {error}
                  </div>
                )}

                <button type="submit"
                  className="w-full py-4 rounded-xl font-semibold text-sm transition-all"
                  style={{
                    background: source === "instagram"
                      ? "linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)"
                      : "linear-gradient(135deg, var(--accent), #7c3aed)",
                    color: "white",
                  }}>
                  <span className="flex items-center justify-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    Analizar con IA
                  </span>
                </button>
              </form>)}

              {source !== "manual" && (<div className="mt-8 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Qué hace la IA</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: "🧠", text: "Perfil psicológico DISC" },
                    { icon: "💬", text: "Replica su estilo de comunicación" },
                    { icon: "🎯", text: "Ángulo de venta personalizado" },
                    { icon: "✉️", text: source === "instagram" ? "6 DMs de seguimiento" : "6 mensajes de seguimiento" },
                    { icon: "🏢", text: "Análisis de su empresa/negocio" },
                    { icon: "🔑", text: "Pain points detectados" },
                  ].map(item => (
                    <div key={item.text} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                      <span>{item.icon}</span>
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>)}
            </>
          ) : (
            <div className="py-8">
              <div className="flex flex-col items-center mb-8">
                <div className="relative w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full animate-pulse-glow" style={{ background: "var(--accent-glow)" }} />
                  <div className="absolute inset-0 rounded-full flex items-center justify-center"
                    style={{
                      background: source === "instagram"
                        ? "linear-gradient(135deg, #f09433, #dc2743, #bc1888)"
                        : "linear-gradient(135deg, var(--accent), #7c3aed)",
                    }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"
                      className="animate-spin" style={{ animationDuration: "3s" }}>
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                </div>
                <h2 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>La IA está trabajando</h2>
                <p className="text-sm animate-pulse" style={{ color: "var(--accent-light)" }}>{STEPS[stepIndex].label}</p>
              </div>

              <div className="mb-6">
                <div className="flex justify-between text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                  <span>Progreso</span><span>{STEPS[stepIndex].pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                  <div className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${STEPS[stepIndex].pct}%`,
                      background: source === "instagram"
                        ? "linear-gradient(90deg, #f09433, #dc2743, #bc1888)"
                        : "linear-gradient(90deg, var(--accent), #a78bfa)",
                    }} />
                </div>
              </div>

              <div className="space-y-2">
                {STEPS.map((step, i) => (
                  <div key={i} className={cn("flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all",
                    i < stepIndex ? "opacity-60" : i === stepIndex ? "opacity-100" : "opacity-25")}
                    style={{
                      background: i === stepIndex ? "var(--accent-glow)" : "transparent",
                      border: i === stepIndex ? "1px solid rgba(108,99,255,0.3)" : "1px solid transparent",
                    }}>
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs">
                      {i < stepIndex ? <span style={{ color: "var(--success)" }}>✓</span>
                        : i === stepIndex ? <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: "var(--accent)" }} />
                        : <span className="w-2 h-2 rounded-full" style={{ background: "var(--border-light)" }} />}
                    </div>
                    <span style={{ color: i === stepIndex ? "var(--text-primary)" : "var(--text-muted)" }}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Modal de límite alcanzado */}

    {showUpgradeModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={() => setShowUpgradeModal(false)}>
        <div className="w-full max-w-md rounded-2xl p-8 text-center animate-fade-in"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          onClick={e => e.stopPropagation()}>
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Límite alcanzado</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            Llegaste al límite de análisis de tu plan actual. Para seguir prospectando sin interrupciones, actualizá tu plan.
          </p>
          <div className="space-y-3">
            <a href="mailto:hola@aretesoluciones.com?subject=Upgrade plan Arete Prospector"
              className="block w-full py-3 rounded-xl font-semibold text-sm"
              style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
              Contactar para actualizar plan
            </a>
            <button onClick={() => setShowUpgradeModal(false)}
              className="block w-full py-3 rounded-xl text-sm"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
