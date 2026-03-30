"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const STEPS = [
  { id: "company", label: "Tu empresa" },
  { id: "product", label: "Qué vendés" },
  { id: "audience", label: "A quién le vendés" },
  { id: "done", label: "Listo" },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    name: "",
    website: "",
    company_description: "",
    product_service: "",
    value_proposition: "",
    target_audience: "",
  })

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleFinish() {
    setSaving(true)
    setError("")
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      // Crear organización
      const slug = form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + "-" + Date.now()
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: form.name,
          slug,
          company_description: form.company_description,
          product_service: form.product_service,
          value_proposition: form.value_proposition,
          target_audience: form.target_audience,
          website: form.website,
        })
        .select()
        .single()

      if (orgError || !org) throw new Error("Error creando organización: " + orgError?.message)

      // Vincular usuario a la org como owner
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ organization_id: org.id, is_owner: true })
        .eq("id", user.id)

      if (profileError) throw new Error("Error actualizando perfil")

      router.push("/setup")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error")
      setSaving(false)
    }
  }

  const inputStyle = {
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    color: "var(--text-primary)",
    borderRadius: "12px",
    padding: "12px 16px",
    width: "100%",
    fontSize: "14px",
    outline: "none",
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--background)" }}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <p className="font-bold" style={{ color: "var(--text-primary)" }}>Prospector AI</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Configuración inicial</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.slice(0, 3).map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    background: i < step ? "var(--accent)" : i === step ? "linear-gradient(135deg, var(--accent), #7c3aed)" : "var(--surface-2)",
                    color: i <= step ? "white" : "var(--text-muted)",
                  }}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className="text-xs hidden sm:block" style={{ color: i === step ? "var(--text-primary)" : "var(--text-muted)" }}>{s.label}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px" style={{ background: i < step ? "var(--accent)" : "var(--border)" }} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Contanos sobre tu empresa</h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>La IA usará esto para personalizar todos los mensajes</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Nombre de la empresa *</label>
                <input value={form.name} onChange={e => update("name", e.target.value)}
                  placeholder="Ej: Arete Soluciones" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Sitio web</label>
                <input value={form.website} onChange={e => update("website", e.target.value)}
                  placeholder="https://tuempresa.com" style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>¿A qué se dedica tu empresa? *</label>
                <textarea value={form.company_description} onChange={e => update("company_description", e.target.value)}
                  placeholder="Ej: Somos una agencia de automatización e IA para empresas. Implementamos flujos de trabajo inteligentes que eliminan tareas repetitivas."
                  rows={3} style={{ ...inputStyle, resize: "none" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              <button onClick={() => setStep(1)} disabled={!form.name || !form.company_description}
                className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                Siguiente →
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>¿Qué vendés?</h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Cuanto más detallado, mejor personalizará la IA</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Productos / Servicios que ofrecés *</label>
                <textarea value={form.product_service} onChange={e => update("product_service", e.target.value)}
                  placeholder="Ej: Automatizaciones con IA, desarrollo de software a medida, ERP, landing pages, integraciones entre sistemas, chatbots, CRMs personalizados."
                  rows={4} style={{ ...inputStyle, resize: "none" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>¿Cuál es tu propuesta de valor principal? *</label>
                <textarea value={form.value_proposition} onChange={e => update("value_proposition", e.target.value)}
                  placeholder="Ej: Que las empresas dejen de depender de personas para tareas repetitivas, ganando tiempo y reduciendo costos operativos hasta un 60%."
                  rows={3} style={{ ...inputStyle, resize: "none" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(0)}
                  className="px-5 py-3 rounded-xl font-semibold text-sm"
                  style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                  ← Atrás
                </button>
                <button onClick={() => setStep(2)} disabled={!form.product_service || !form.value_proposition}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                  Siguiente →
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>¿A quién le vendés?</h2>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Definí tu cliente ideal para que los mensajes den en el blanco</p>
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Descripción de tu cliente ideal *</label>
                <textarea value={form.target_audience} onChange={e => update("target_audience", e.target.value)}
                  placeholder="Ej: CEOs, directores y gerentes de empresas medianas (10-200 empleados). Sectores: retail, logística, servicios profesionales, manufactura. Personas que quieren escalar sin contratar más gente."
                  rows={4} style={{ ...inputStyle, resize: "none" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  {error}
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setStep(1)}
                  className="px-5 py-3 rounded-xl font-semibold text-sm"
                  style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                  ← Atrás
                </button>
                <button onClick={handleFinish} disabled={!form.target_audience || saving}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                  {saving ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Configurando...</>
                  ) : "🚀 Comenzar a prospectar"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "var(--text-muted)" }}>
          Podés cambiar esta información en cualquier momento desde Configuración
        </p>
      </div>
    </div>
  )
}
