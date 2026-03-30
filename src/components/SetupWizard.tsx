"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Props = {
  orgId: string
  orgName: string
  existingKeys: { openai_key: string; google_maps_key: string }
  existingIntegrations: {
    twilio_account_sid: string; twilio_auth_token: string; twilio_phone_number: string
    twilio_api_key: string; twilio_api_secret: string; twilio_twiml_app_sid: string
    whatsapp_access_token: string; whatsapp_phone_number_id: string; whatsapp_verify_token: string
    calendly_url: string
  }
}

const STEPS = [
  { id: "welcome", label: "Bienvenida", icon: "👋" },
  { id: "openai", label: "OpenAI", icon: "🧠", required: true },
  { id: "google_maps", label: "Google Maps", icon: "🗺️" },
  { id: "twilio", label: "Twilio", icon: "📞" },
  { id: "whatsapp", label: "WhatsApp", icon: "💬" },
  { id: "calendar", label: "Agenda", icon: "📅" },
  { id: "review", label: "Finalizar", icon: "✅" },
]

export default function SetupWizard({ orgId, orgName, existingKeys, existingIntegrations }: Props) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Chat state
  const [chatOpen, setChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Form state
  const [keys, setKeys] = useState({
    openai_key: existingKeys.openai_key,
    google_maps_key: existingKeys.google_maps_key,
  })
  const [integrations, setIntegrations] = useState({ ...existingIntegrations })
  const [showPasswords, setShowPasswords] = useState(false)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  function updateKey(field: string, value: string) {
    setKeys(prev => ({ ...prev, [field]: value }))
  }
  function updateIntegration(field: string, value: string) {
    setIntegrations(prev => ({ ...prev, [field]: value }))
  }

  async function saveKeys() {
    setSaving(true)
    const { data: existing } = await supabase.from("org_api_keys").select("id").eq("organization_id", orgId).single()
    if (existing) {
      await supabase.from("org_api_keys").update({ openai_key: keys.openai_key, google_maps_key: keys.google_maps_key, updated_at: new Date().toISOString() }).eq("organization_id", orgId)
    } else {
      await supabase.from("org_api_keys").insert({ organization_id: orgId, openai_key: keys.openai_key, google_maps_key: keys.google_maps_key })
    }
    setSaving(false)
  }

  async function saveIntegrations() {
    setSaving(true)
    await supabase.from("organizations").update({
      twilio_account_sid: integrations.twilio_account_sid || null,
      twilio_auth_token: integrations.twilio_auth_token || null,
      twilio_phone_number: integrations.twilio_phone_number || null,
      twilio_api_key: integrations.twilio_api_key || null,
      twilio_api_secret: integrations.twilio_api_secret || null,
      twilio_twiml_app_sid: integrations.twilio_twiml_app_sid || null,
      whatsapp_access_token: integrations.whatsapp_access_token || null,
      whatsapp_phone_number_id: integrations.whatsapp_phone_number_id || null,
      whatsapp_verify_token: integrations.whatsapp_verify_token || null,
      calendly_url: integrations.calendly_url || null,
    }).eq("id", orgId)
    setSaving(false)
  }

  async function handleFinish() {
    setSaving(true)
    // Save everything one last time
    await saveKeys()
    await saveIntegrations()
    // Mark setup as completed
    await supabase.from("organizations").update({ setup_completed: true }).eq("id", orgId)
    setSaving(false)
    router.push("/dashboard")
    router.refresh()
  }

  async function testOpenAI() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${keys.openai_key}` },
      })
      if (res.ok) setTestResult({ ok: true, msg: "Conexión exitosa con OpenAI" })
      else setTestResult({ ok: false, msg: "Key inválida o sin permisos" })
    } catch {
      setTestResult({ ok: false, msg: "Error de conexión" })
    }
    setTesting(false)
  }

  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = chatInput.trim()
    setChatInput("")
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }])
    setChatLoading(true)
    try {
      const res = await fetch("/api/setup-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, step: STEPS[step]?.id }),
      })
      const data = await res.json()
      setChatMessages(prev => [...prev, { role: "assistant", content: data.reply || "Error al procesar tu pregunta." }])
    } catch {
      setChatMessages(prev => [...prev, { role: "assistant", content: "Error de conexión. Intentá de nuevo." }])
    }
    setChatLoading(false)
  }

  function next() {
    setTestResult(null)
    // Auto-save on step change
    if (step === 1 || step === 2) saveKeys()
    if (step === 3 || step === 4 || step === 5) saveIntegrations()
    setStep(s => Math.min(s + 1, STEPS.length - 1))
  }
  function prev() {
    setTestResult(null)
    setStep(s => Math.max(s - 1, 0))
  }

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all font-mono"
  const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }
  const labelCls = "block text-xs font-medium mb-1.5"
  const labelStyle = { color: "var(--text-secondary)" }

  function InstructionStep({ num, children }: { num: number; children: React.ReactNode }) {
    return (
      <div className="flex gap-3 items-start">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5"
          style={{ background: "rgba(108,99,255,0.15)", color: "#6c63ff" }}>{num}</div>
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{children}</div>
      </div>
    )
  }

  function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-semibold transition-all hover:brightness-110"
        style={{ background: "rgba(108,99,255,0.12)", color: "#6c63ff" }}>
        {children}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15,3 21,3 21,9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>
    )
  }

  function FeatureTag({ children, color = "#6c63ff" }: { children: React.ReactNode; color?: string }) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold mr-1 mb-1"
        style={{ background: `${color}20`, color }}>{children}</span>
    )
  }

  // Config status summary
  const configStatus = {
    openai: !!keys.openai_key,
    google_maps: !!keys.google_maps_key,
    twilio: !!(integrations.twilio_account_sid && integrations.twilio_auth_token),
    whatsapp: !!(integrations.whatsapp_access_token && integrations.whatsapp_phone_number_id),
    calendar: !!(integrations.calendly_url),
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--background)" }}>
      {/* Top bar */}
      <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{orgName || "Areté Sales OS"}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Asistente de configuración</p>
          </div>
        </div>
        <button onClick={handleFinish} className="text-xs px-4 py-2 rounded-xl transition-all"
          style={{ background: "var(--surface-2)", color: "var(--text-muted)", border: "1px solid var(--border)" }}>
          Saltar y configurar después →
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Steps */}
        <div className="w-64 border-r p-4 hidden md:flex flex-col gap-1" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          {STEPS.map((s, i) => {
            const isActive = i === step
            const isDone = i < step
            const isConfigured = i === 1 ? configStatus.openai : i === 2 ? configStatus.google_maps : i === 3 ? configStatus.twilio : i === 4 ? configStatus.whatsapp : i === 5 ? configStatus.calendar : false
            return (
              <button key={s.id} onClick={() => setStep(i)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-all"
                style={{
                  background: isActive ? "rgba(108,99,255,0.1)" : "transparent",
                  color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                }}>
                <span className="text-base">{isDone && isConfigured ? "✅" : isDone && !isConfigured && i > 0 && i < 6 ? "⏭️" : s.icon}</span>
                <span className="font-medium text-xs">{s.label}</span>
                {s.required && !isConfigured && <span className="text-xs px-1 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", fontSize: "9px" }}>REQUERIDO</span>}
              </button>
            )
          })}

          <div className="mt-auto pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Estado</p>
            <div className="space-y-1">
              {[
                { label: "OpenAI", ok: configStatus.openai },
                { label: "Google Maps", ok: configStatus.google_maps },
                { label: "Twilio", ok: configStatus.twilio },
                { label: "WhatsApp", ok: configStatus.whatsapp },
                { label: "Agenda", ok: configStatus.calendar },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>{s.ok ? "🟢" : "⚪"}</span>{s.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-2xl mx-auto">

            {/* Mobile progress */}
            <div className="flex md:hidden items-center gap-1 mb-6">
              {STEPS.map((_, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full" style={{ background: i <= step ? "var(--accent)" : "var(--surface-2)" }} />
              ))}
            </div>

            {/* STEP 0: Welcome */}
            {step === 0 && (
              <div className="animate-fade-in">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  </div>
                  <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
                    ¡Bienvenido a Areté Sales OS!
                  </h1>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    Vamos a configurar tus integraciones para que el sistema funcione al 100%.
                    <br />Este proceso toma entre 10-20 minutos.
                  </p>
                </div>

                <div className="rounded-2xl p-6 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>¿Qué vamos a configurar?</h3>
                  <div className="space-y-3">
                    {[
                      { icon: "🧠", name: "OpenAI", desc: "Análisis de prospectos, mensajes personalizados, transcripción", tag: "Requerido", tagColor: "#ef4444" },
                      { icon: "🗺️", name: "Google Maps", desc: "Búsqueda de empresas por ciudad y categoría", tag: "Opcional", tagColor: "#eab308" },
                      { icon: "📞", name: "Twilio", desc: "Llamadas telefónicas, videollamadas, grabación de llamadas", tag: "Opcional", tagColor: "#eab308" },
                      { icon: "💬", name: "WhatsApp Business", desc: "Enviar y recibir mensajes de WhatsApp a prospectos", tag: "Opcional", tagColor: "#eab308" },
                      { icon: "📅", name: "Calendly / Google Calendar", desc: "Agenda de reuniones y disponibilidad automática", tag: "Opcional", tagColor: "#eab308" },
                    ].map(item => (
                      <div key={item.name} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                        <span className="text-lg">{item.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-xs" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                            <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                              style={{ background: `${item.tagColor}15`, color: item.tagColor, fontSize: "10px" }}>{item.tag}</span>
                          </div>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl p-4 mb-6" style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.15)" }}>
                  <p className="text-xs" style={{ color: "#6c63ff" }}>
                    💡 <strong>Tip:</strong> Podés saltear cualquier paso y configurarlo después desde Configuración. Las integraciones opcionales agregan funcionalidades extra pero no son necesarias para empezar a prospectar.
                  </p>
                </div>

                <div className="rounded-2xl p-4 mb-6" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.15)" }}>
                  <p className="text-xs" style={{ color: "#22c55e" }}>
                    🤖 <strong>¿Necesitás ayuda?</strong> Tenés un asistente de IA disponible en el botón de chat de abajo a la derecha. Preguntale cualquier duda sobre la configuración.
                  </p>
                </div>

                <button onClick={next}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all"
                  style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                  Empezar configuración →
                </button>
              </div>
            )}

            {/* STEP 1: OpenAI */}
            {step === 1 && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🧠</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>REQUERIDO</span>
                </div>
                <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>OpenAI API Key</h2>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                  Esta es la integración más importante. Sin ella, no podrás analizar prospectos ni generar mensajes.
                </p>

                <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h4 className="font-semibold text-xs mb-1" style={{ color: "var(--text-primary)" }}>¿Qué funciones habilita?</h4>
                  <div className="flex flex-wrap mt-2">
                    <FeatureTag color="#6c63ff">Análisis de LinkedIn/Instagram</FeatureTag>
                    <FeatureTag color="#22c55e">Mensajes personalizados</FeatureTag>
                    <FeatureTag color="#3b82f6">Transcripción de llamadas</FeatureTag>
                    <FeatureTag color="#8b5cf6">Análisis de conversaciones</FeatureTag>
                  </div>
                </div>

                <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h4 className="font-semibold text-xs mb-4" style={{ color: "var(--text-primary)" }}>📋 Cómo obtener tu API Key</h4>
                  <div className="space-y-3">
                    <InstructionStep num={1}>
                      Andá a <ExternalLink href="https://platform.openai.com/signup">platform.openai.com</ExternalLink> y creá una cuenta (o iniciá sesión si ya tenés)
                    </InstructionStep>
                    <InstructionStep num={2}>
                      En el menú lateral, hacé click en <strong>&quot;API Keys&quot;</strong> o andá directo a <ExternalLink href="https://platform.openai.com/api-keys">API Keys</ExternalLink>
                    </InstructionStep>
                    <InstructionStep num={3}>
                      Hacé click en <strong>&quot;Create new secret key&quot;</strong>, ponele un nombre como &quot;Areté Sales OS&quot;
                    </InstructionStep>
                    <InstructionStep num={4}>
                      <strong>Copiá la key inmediatamente</strong> (empieza con <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--surface-2)" }}>sk-proj-...</code>). Solo se muestra una vez.
                    </InstructionStep>
                    <InstructionStep num={5}>
                      Andá a <ExternalLink href="https://platform.openai.com/account/billing">Billing</ExternalLink> y agregá un método de pago (funciona con prepago, cargás $5-10 USD y listo)
                    </InstructionStep>
                  </div>

                  <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: "rgba(234,179,8,0.08)", color: "#eab308", border: "1px solid rgba(234,179,8,0.15)" }}>
                    ⚠️ <strong>Importante:</strong> Sin billing configurado en OpenAI, la key no funcionará. El costo aproximado es $0.01-0.03 por análisis de prospecto.
                  </div>
                </div>

                <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <label className={labelCls} style={labelStyle}>Tu OpenAI API Key</label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={keys.openai_key}
                    onChange={e => updateKey("openai_key", e.target.value)}
                    placeholder="sk-proj-..."
                    className={inputCls}
                    style={inputStyle}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <button onClick={() => setShowPasswords(v => !v)} className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {showPasswords ? "🔒 Ocultar" : "👁️ Mostrar"}
                    </button>
                    <button onClick={testOpenAI} disabled={!keys.openai_key || testing}
                      className="px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
                      style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                      {testing ? "Probando..." : "🧪 Probar conexión"}
                    </button>
                  </div>
                  {testResult && (
                    <div className="mt-3 p-3 rounded-xl text-xs"
                      style={{ background: testResult.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", color: testResult.ok ? "#22c55e" : "#ef4444" }}>
                      {testResult.ok ? "✅" : "❌"} {testResult.msg}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button onClick={prev} className="px-5 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>← Atrás</button>
                  <button onClick={next}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm disabled:opacity-40"
                    style={{ background: keys.openai_key ? "linear-gradient(135deg, var(--accent), #7c3aed)" : "var(--surface-2)", color: keys.openai_key ? "white" : "var(--text-muted)" }}>
                    {keys.openai_key ? "Siguiente →" : "Saltar por ahora →"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Google Maps */}
            {step === 2 && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">🗺️</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(234,179,8,0.1)", color: "#eab308" }}>OPCIONAL</span>
                </div>
                <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Google Maps API Key</h2>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                  Permite buscar empresas por ciudad, categoría y zona geográfica para encontrar prospectos.
                </p>

                <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h4 className="font-semibold text-xs mb-1" style={{ color: "var(--text-primary)" }}>¿Qué funciones habilita?</h4>
                  <div className="flex flex-wrap mt-2">
                    <FeatureTag color="#3b82f6">Buscar empresas por ciudad</FeatureTag>
                    <FeatureTag color="#22c55e">Filtrar por categoría</FeatureTag>
                    <FeatureTag color="#8b5cf6">Descubrir prospectos nuevos</FeatureTag>
                  </div>
                </div>

                <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h4 className="font-semibold text-xs mb-4" style={{ color: "var(--text-primary)" }}>📋 Cómo obtener tu API Key</h4>
                  <div className="space-y-3">
                    <InstructionStep num={1}>
                      Andá a <ExternalLink href="https://console.cloud.google.com">Google Cloud Console</ExternalLink> e iniciá sesión con tu cuenta de Google
                    </InstructionStep>
                    <InstructionStep num={2}>
                      Creá un <strong>nuevo proyecto</strong> (nombre: &quot;Areté Sales OS&quot; por ejemplo)
                    </InstructionStep>
                    <InstructionStep num={3}>
                      Andá a <strong>APIs &amp; Services → Library</strong> y buscá <strong>&quot;Places API&quot;</strong>. Hacé click en <strong>&quot;Enable&quot;</strong>
                    </InstructionStep>
                    <InstructionStep num={4}>
                      Andá a <strong>APIs &amp; Services → Credentials</strong> → <strong>&quot;Create Credentials&quot;</strong> → <strong>&quot;API Key&quot;</strong>
                    </InstructionStep>
                    <InstructionStep num={5}>
                      <strong>Restringí la key:</strong> Edit API Key → <strong>&quot;Restrict key&quot;</strong> → seleccioná solo <strong>&quot;Places API&quot;</strong> para seguridad
                    </InstructionStep>
                    <InstructionStep num={6}>
                      Copiá la key (empieza con <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--surface-2)" }}>AIzaSy...</code>) y pegala abajo
                    </InstructionStep>
                  </div>

                  <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.15)" }}>
                    💰 <strong>Costo:</strong> Google da $200 USD/mes de crédito gratis. Con uso normal de prospección, no vas a pagar nada.
                  </div>
                </div>

                <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <label className={labelCls} style={labelStyle}>Tu Google Maps API Key</label>
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={keys.google_maps_key}
                    onChange={e => updateKey("google_maps_key", e.target.value)}
                    placeholder="AIzaSy..."
                    className={inputCls}
                    style={inputStyle}
                  />
                  <button onClick={() => setShowPasswords(v => !v)} className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                    {showPasswords ? "🔒 Ocultar" : "👁️ Mostrar"}
                  </button>
                </div>

                <div className="flex gap-3">
                  <button onClick={prev} className="px-5 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>← Atrás</button>
                  <button onClick={next}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: keys.google_maps_key ? "linear-gradient(135deg, var(--accent), #7c3aed)" : "var(--surface-2)", color: keys.google_maps_key ? "white" : "var(--text-muted)" }}>
                    {keys.google_maps_key ? "Siguiente →" : "Saltar →"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Twilio */}
            {step === 3 && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📞</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(234,179,8,0.1)", color: "#eab308" }}>OPCIONAL</span>
                </div>
                <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Twilio (Llamadas y Video)</h2>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                  Habilita llamadas telefónicas, videollamadas y grabación directamente desde la plataforma.
                </p>

                <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h4 className="font-semibold text-xs mb-1" style={{ color: "var(--text-primary)" }}>¿Qué funciones habilita?</h4>
                  <div className="flex flex-wrap mt-2">
                    <FeatureTag color="#ef4444">Llamadas desde el navegador</FeatureTag>
                    <FeatureTag color="#3b82f6">Videollamadas con prospectos</FeatureTag>
                    <FeatureTag color="#8b5cf6">Grabación de llamadas</FeatureTag>
                    <FeatureTag color="#22c55e">Transcripción automática</FeatureTag>
                  </div>
                </div>

                <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h4 className="font-semibold text-xs mb-4" style={{ color: "var(--text-primary)" }}>📋 Cómo configurar Twilio</h4>
                  <div className="space-y-3">
                    <InstructionStep num={1}>
                      Creá una cuenta en <ExternalLink href="https://www.twilio.com/try-twilio">Twilio</ExternalLink> (incluye crédito gratis de prueba)
                    </InstructionStep>
                    <InstructionStep num={2}>
                      En el <ExternalLink href="https://console.twilio.com">Dashboard de Twilio</ExternalLink>, copiá tu <strong>Account SID</strong> y <strong>Auth Token</strong> (están en la página principal)
                    </InstructionStep>
                    <InstructionStep num={3}>
                      Comprá un número de teléfono: <strong>Phone Numbers → Buy a Number</strong>. Elegí uno con capacidad de voz.
                    </InstructionStep>
                    <InstructionStep num={4}>
                      <strong>Para videollamadas:</strong> Andá a <strong>Account → API Keys</strong> → <strong>&quot;Create API Key&quot;</strong>. Copiá el <strong>SID</strong> (es el API Key) y el <strong>Secret</strong>.
                    </InstructionStep>
                    <InstructionStep num={5}>
                      <strong>Para llamadas desde el navegador:</strong> Andá a <strong>Develop → Voice → TwiML Apps</strong> → <strong>&quot;Create new TwiML App&quot;</strong>.
                      En &quot;Voice Request URL&quot; poné: <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--surface-2)" }}>https://TU-DOMINIO/api/calls/twiml</code>
                    </InstructionStep>
                    <InstructionStep num={6}>
                      Copiá el <strong>SID de la TwiML App</strong> (empieza con <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--surface-2)" }}>AP...</code>)
                    </InstructionStep>
                  </div>
                </div>

                <div className="rounded-2xl p-5 mb-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls} style={labelStyle}>Account SID</label>
                      <input type={showPasswords ? "text" : "password"} value={integrations.twilio_account_sid}
                        onChange={e => updateIntegration("twilio_account_sid", e.target.value)}
                        placeholder="AC..." className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className={labelCls} style={labelStyle}>Auth Token</label>
                      <input type={showPasswords ? "text" : "password"} value={integrations.twilio_auth_token}
                        onChange={e => updateIntegration("twilio_auth_token", e.target.value)}
                        placeholder="••••••••••" className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className={labelCls} style={labelStyle}>Phone Number</label>
                      <input type="text" value={integrations.twilio_phone_number}
                        onChange={e => updateIntegration("twilio_phone_number", e.target.value)}
                        placeholder="+1234567890" className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className={labelCls} style={labelStyle}>TwiML App SID</label>
                      <input type={showPasswords ? "text" : "password"} value={integrations.twilio_twiml_app_sid}
                        onChange={e => updateIntegration("twilio_twiml_app_sid", e.target.value)}
                        placeholder="AP..." className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className={labelCls} style={labelStyle}>API Key (Video)</label>
                      <input type={showPasswords ? "text" : "password"} value={integrations.twilio_api_key}
                        onChange={e => updateIntegration("twilio_api_key", e.target.value)}
                        placeholder="SK..." className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className={labelCls} style={labelStyle}>API Secret (Video)</label>
                      <input type={showPasswords ? "text" : "password"} value={integrations.twilio_api_secret}
                        onChange={e => updateIntegration("twilio_api_secret", e.target.value)}
                        placeholder="••••••••••" className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                  <button onClick={() => setShowPasswords(v => !v)} className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {showPasswords ? "🔒 Ocultar credenciales" : "👁️ Mostrar credenciales"}
                  </button>
                </div>

                <div className="flex gap-3">
                  <button onClick={prev} className="px-5 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>← Atrás</button>
                  <button onClick={next}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: configStatus.twilio ? "linear-gradient(135deg, var(--accent), #7c3aed)" : "var(--surface-2)", color: configStatus.twilio ? "white" : "var(--text-muted)" }}>
                    {configStatus.twilio ? "Siguiente →" : "Saltar →"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: WhatsApp */}
            {step === 4 && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">💬</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(234,179,8,0.1)", color: "#eab308" }}>OPCIONAL</span>
                </div>
                <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>WhatsApp Business API</h2>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                  Permite enviar y recibir mensajes de WhatsApp directamente desde la plataforma.
                </p>

                <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h4 className="font-semibold text-xs mb-1" style={{ color: "var(--text-primary)" }}>¿Qué funciones habilita?</h4>
                  <div className="flex flex-wrap mt-2">
                    <FeatureTag color="#25d366">Enviar mensajes a prospectos</FeatureTag>
                    <FeatureTag color="#3b82f6">Recibir respuestas en tiempo real</FeatureTag>
                    <FeatureTag color="#8b5cf6">Historial de conversaciones</FeatureTag>
                  </div>
                </div>

                <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h4 className="font-semibold text-xs mb-4" style={{ color: "var(--text-primary)" }}>📋 Cómo configurar WhatsApp Business API</h4>
                  <div className="space-y-3">
                    <InstructionStep num={1}>
                      Andá a <ExternalLink href="https://business.facebook.com">Meta Business Suite</ExternalLink> y creá una cuenta de negocio (o usá la existente)
                    </InstructionStep>
                    <InstructionStep num={2}>
                      Andá a <ExternalLink href="https://developers.facebook.com">Meta for Developers</ExternalLink> → <strong>&quot;My Apps&quot;</strong> → <strong>&quot;Create App&quot;</strong> → tipo: <strong>&quot;Business&quot;</strong>
                    </InstructionStep>
                    <InstructionStep num={3}>
                      En tu app, agregá el producto <strong>&quot;WhatsApp&quot;</strong>. Hacé click en <strong>&quot;Set up&quot;</strong>.
                    </InstructionStep>
                    <InstructionStep num={4}>
                      En <strong>&quot;API Setup&quot;</strong> vas a ver tu <strong>Phone Number ID</strong> y un <strong>Temporary Access Token</strong>. Copiá ambos.
                    </InstructionStep>
                    <InstructionStep num={5}>
                      <strong>Para un token permanente:</strong> Andá a <strong>Business Settings → System Users</strong> → creá uno, asignale permisos de WhatsApp, y generá un token permanente.
                    </InstructionStep>
                    <InstructionStep num={6}>
                      Configurá el <strong>Webhook:</strong> En tu app → WhatsApp → Configuration → Callback URL: <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--surface-2)" }}>https://TU-DOMINIO/api/whatsapp/webhook</code>
                    </InstructionStep>
                    <InstructionStep num={7}>
                      El <strong>Verify Token</strong> lo inventás vos (ej: una frase secreta). Ponélo abajo y en Meta el mismo exacto.
                    </InstructionStep>
                  </div>

                  <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: "rgba(234,179,8,0.08)", color: "#eab308", border: "1px solid rgba(234,179,8,0.15)" }}>
                    ⚠️ <strong>Nota:</strong> WhatsApp Business API requiere verificación del negocio en Meta. Puede tomar 1-3 días hábiles. Mientras tanto podés usar el número de prueba que da Meta.
                  </div>
                </div>

                <div className="rounded-2xl p-5 mb-5 space-y-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div>
                    <label className={labelCls} style={labelStyle}>Access Token</label>
                    <input type={showPasswords ? "text" : "password"} value={integrations.whatsapp_access_token}
                      onChange={e => updateIntegration("whatsapp_access_token", e.target.value)}
                      placeholder="EAAxxxxxxx..." className={inputCls} style={inputStyle} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls} style={labelStyle}>Phone Number ID</label>
                      <input type="text" value={integrations.whatsapp_phone_number_id}
                        onChange={e => updateIntegration("whatsapp_phone_number_id", e.target.value)}
                        placeholder="123456789012345" className={inputCls} style={inputStyle} />
                    </div>
                    <div>
                      <label className={labelCls} style={labelStyle}>Verify Token (webhook)</label>
                      <input type="text" value={integrations.whatsapp_verify_token}
                        onChange={e => updateIntegration("whatsapp_verify_token", e.target.value)}
                        placeholder="mi_token_secreto_123" className={inputCls} style={inputStyle} />
                    </div>
                  </div>
                  <button onClick={() => setShowPasswords(v => !v)} className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {showPasswords ? "🔒 Ocultar" : "👁️ Mostrar"}
                  </button>
                </div>

                <div className="flex gap-3">
                  <button onClick={prev} className="px-5 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>← Atrás</button>
                  <button onClick={next}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: configStatus.whatsapp ? "linear-gradient(135deg, var(--accent), #7c3aed)" : "var(--surface-2)", color: configStatus.whatsapp ? "white" : "var(--text-muted)" }}>
                    {configStatus.whatsapp ? "Siguiente →" : "Saltar →"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: Calendar */}
            {step === 5 && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📅</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(234,179,8,0.1)", color: "#eab308" }}>OPCIONAL</span>
                </div>
                <h2 className="text-xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>Agenda de Reuniones</h2>
                <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
                  Configurá una URL de agendamiento para que los prospectos puedan agendar llamadas directamente.
                </p>

                <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h4 className="font-semibold text-xs mb-1" style={{ color: "var(--text-primary)" }}>¿Qué funciones habilita?</h4>
                  <div className="flex flex-wrap mt-2">
                    <FeatureTag color="#3b82f6">Agendar llamadas con prospectos</FeatureTag>
                    <FeatureTag color="#22c55e">Link de agenda en mensajes</FeatureTag>
                    <FeatureTag color="#8b5cf6">Disponibilidad automática</FeatureTag>
                  </div>
                </div>

                <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h4 className="font-semibold text-xs mb-4" style={{ color: "var(--text-primary)" }}>📋 Opción recomendada: Calendly (más fácil)</h4>
                  <div className="space-y-3">
                    <InstructionStep num={1}>
                      Creá una cuenta gratis en <ExternalLink href="https://calendly.com">Calendly</ExternalLink>
                    </InstructionStep>
                    <InstructionStep num={2}>
                      Configurá tu disponibilidad y tipo de evento (ej: &quot;Reunión de 30 minutos&quot;)
                    </InstructionStep>
                    <InstructionStep num={3}>
                      Copiá tu link de Calendly (ej: <code className="px-1 py-0.5 rounded text-xs" style={{ background: "var(--surface-2)" }}>https://calendly.com/tunombre/30min</code>)
                    </InstructionStep>
                  </div>
                </div>

                <div className="rounded-2xl p-5 mb-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <label className={labelCls} style={labelStyle}>URL de Calendly (o similar)</label>
                  <input type="url" value={integrations.calendly_url}
                    onChange={e => updateIntegration("calendly_url", e.target.value)}
                    placeholder="https://calendly.com/tu-nombre/30min" className={inputCls} style={{ ...inputStyle, fontFamily: "inherit" }} />
                </div>

                <div className="rounded-2xl p-4 mb-5" style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.15)" }}>
                  <p className="text-xs" style={{ color: "#6c63ff" }}>
                    💡 También podés conectar <strong>Google Calendar</strong> directamente desde <strong>Configuración</strong> una vez que termines el wizard. Esto permite sincronización bidireccional de eventos.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={prev} className="px-5 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>← Atrás</button>
                  <button onClick={next}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: configStatus.calendar ? "linear-gradient(135deg, var(--accent), #7c3aed)" : "var(--surface-2)", color: configStatus.calendar ? "white" : "var(--text-muted)" }}>
                    {configStatus.calendar ? "Siguiente →" : "Saltar →"}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 6: Review */}
            {step === 6 && (
              <div className="animate-fade-in">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "linear-gradient(135deg, #22c55e, #10b981)" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </div>
                  <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>¡Configuración lista!</h2>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>Revisá el resumen de tus integraciones antes de empezar.</p>
                </div>

                <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>Resumen de integraciones</h3>
                  <div className="space-y-3">
                    {[
                      { name: "OpenAI", ok: configStatus.openai, desc: "Análisis y mensajes", critical: true },
                      { name: "Google Maps", ok: configStatus.google_maps, desc: "Búsqueda de empresas" },
                      { name: "Twilio", ok: configStatus.twilio, desc: "Llamadas y video" },
                      { name: "WhatsApp", ok: configStatus.whatsapp, desc: "Mensajería" },
                      { name: "Agenda", ok: configStatus.calendar, desc: "Calendly / Calendar" },
                    ].map(s => (
                      <div key={s.name} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                        <span className="text-lg">{s.ok ? "✅" : "⚪"}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-xs" style={{ color: "var(--text-primary)" }}>{s.name}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                          style={{
                            background: s.ok ? "rgba(34,197,94,0.1)" : s.critical ? "rgba(239,68,68,0.1)" : "rgba(234,179,8,0.1)",
                            color: s.ok ? "#22c55e" : s.critical ? "#ef4444" : "#eab308",
                          }}>
                          {s.ok ? "Configurado" : s.critical ? "Sin configurar" : "Omitido"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {!configStatus.openai && (
                  <div className="rounded-2xl p-4 mb-5" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)" }}>
                    <p className="text-xs" style={{ color: "#ef4444" }}>
                      ⚠️ <strong>OpenAI no está configurado.</strong> No podrás analizar prospectos ni generar mensajes. Podés configurarlo después en Configuración → API Keys.
                    </p>
                  </div>
                )}

                <div className="rounded-2xl p-4 mb-6" style={{ background: "rgba(108,99,255,0.06)", border: "1px solid rgba(108,99,255,0.15)" }}>
                  <p className="text-xs" style={{ color: "#6c63ff" }}>
                    💡 Todas estas configuraciones se pueden modificar en cualquier momento desde <strong>Configuración</strong> en el menú lateral.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button onClick={prev} className="px-5 py-3 rounded-xl font-semibold text-sm"
                    style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>← Atrás</button>
                  <button onClick={handleFinish} disabled={saving}
                    className="flex-1 py-3.5 rounded-xl font-bold text-sm transition-all disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #22c55e, #10b981)", color: "white" }}>
                    {saving ? "Guardando..." : "🚀 Ir al Dashboard"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Chat Bubble */}
      <div className="fixed bottom-6 right-6 z-50">
        {chatOpen && (
          <div className="mb-3 w-80 md:w-96 rounded-2xl overflow-hidden shadow-2xl animate-fade-in"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="p-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)" }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <div>
                  <p className="text-sm font-bold text-white">Asistente de Config</p>
                  <p className="text-xs text-white/70">Preguntame sobre la configuración</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-white/70 hover:text-white transition-all">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div className="h-64 overflow-y-auto p-3 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>¡Hola! Preguntame cualquier duda sobre la configuración de las integraciones. 💡</p>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[80%] p-3 rounded-xl text-xs leading-relaxed"
                    style={{
                      background: m.role === "user" ? "var(--accent)" : "var(--surface-2)",
                      color: m.role === "user" ? "white" : "var(--text-primary)",
                    }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-xl text-xs" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                    Escribiendo...
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t flex gap-2" style={{ borderColor: "var(--border)" }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChatMessage()}
                placeholder="Escribí tu pregunta..."
                className="flex-1 px-3 py-2 rounded-xl text-xs outline-none"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
              <button onClick={sendChatMessage} disabled={chatLoading || !chatInput.trim()}
                className="px-3 py-2 rounded-xl transition-all disabled:opacity-40"
                style={{ background: "var(--accent)", color: "white" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        )}

        <button onClick={() => setChatOpen(v => !v)}
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110"
          style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)" }}>
          {chatOpen ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          )}
        </button>
      </div>
    </div>
  )
}
