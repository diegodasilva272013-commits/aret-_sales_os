"use client"

import { useState, useRef, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { SetterProfile } from "@/types"
import ApiKeysSection from "./ApiKeysSection"

type OrgData = {
  id: string
  name: string
  website: string
  company_description: string
  product_service: string
  value_proposition: string
  target_audience: string
  plan: string
  analyses_used: number
  plan_limit: number
  searches_used?: number
  search_limit?: number
  logo_url?: string
  message_tone?: string
  message_style?: string
  custom_instructions?: string
  calendly_url?: string
  twilio_account_sid?: string
  twilio_auth_token?: string
  twilio_phone_number?: string
  twilio_api_key?: string
  twilio_api_secret?: string
  twilio_twiml_app_sid?: string
  whatsapp_access_token?: string
  whatsapp_phone_number_id?: string
  whatsapp_verify_token?: string
} | null

const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
const inputStyle = { background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }

export default function SettingsClient({ profile, team, org, calendarConnected }: { profile: (SetterProfile & { is_owner?: boolean }) | null; team: SetterProfile[]; org: OrgData; calendarConnected?: boolean }) {
  const isOwner = !!(profile as { is_owner?: boolean } | null)?.is_owner
  const searchParams = useSearchParams()
  const [calendarStatus, setCalendarStatus] = useState<"connected" | "error" | null>(null)
  const [fullName, setFullName] = useState(profile?.full_name || "")

  useEffect(() => {
    const success = searchParams.get("success")
    const error = searchParams.get("error")
    if (success === "google_connected") setCalendarStatus("connected")
    else if (error) setCalendarStatus("error")
  }, [searchParams])
  const [savingProfile, setSavingProfile] = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)

  const [orgForm, setOrgForm] = useState({
    name: org?.name || "",
    website: org?.website || "",
    company_description: org?.company_description || "",
    product_service: org?.product_service || "",
    value_proposition: org?.value_proposition || "",
    target_audience: org?.target_audience || "",
    message_tone: org?.message_tone || "profesional",
    message_style: org?.message_style || "directo y conciso",
    custom_instructions: org?.custom_instructions || "",
    calendly_url: org?.calendly_url || "",
  })
  const [savingOrg, setSavingOrg] = useState(false)
  const [savedOrg, setSavedOrg] = useState(false)

  const [integrations, setIntegrations] = useState({
    twilio_account_sid: org?.twilio_account_sid || "",
    twilio_auth_token: org?.twilio_auth_token || "",
    twilio_phone_number: org?.twilio_phone_number || "",
    twilio_api_key: org?.twilio_api_key || "",
    twilio_api_secret: org?.twilio_api_secret || "",
    twilio_twiml_app_sid: org?.twilio_twiml_app_sid || "",
    whatsapp_access_token: org?.whatsapp_access_token || "",
    whatsapp_phone_number_id: org?.whatsapp_phone_number_id || "",
    whatsapp_verify_token: org?.whatsapp_verify_token || "",
  })
  const [savingIntegrations, setSavingIntegrations] = useState(false)
  const [savedIntegrations, setSavedIntegrations] = useState(false)

  async function saveIntegrations(e: React.FormEvent) {
    e.preventDefault()
    if (!org?.id) return
    setSavingIntegrations(true)
    await supabase.from("organizations").update(integrations).eq("id", org.id)
    setSavingIntegrations(false)
    setSavedIntegrations(true)
    setTimeout(() => setSavedIntegrations(false), 2000)
  }
  const [logoUrl, setLogoUrl] = useState(org?.logo_url || "")
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !org?.id) return
    setUploadingLogo(true)
    try {
      const ext = file.name.split(".").pop()
      const path = `${org.id}/logo.${ext}`
      const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(path)
      const url = `${publicUrl}?t=${Date.now()}`
      setLogoUrl(url)
      await supabase.from("organizations").update({ logo_url: url }).eq("id", org.id)
    } catch (err) {
      alert("Error subiendo logo: " + (err instanceof Error ? err.message : "Error"))
    } finally {
      setUploadingLogo(false)
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSavingProfile(true)
    await supabase.from("profiles").update({ full_name: fullName }).eq("id", profile?.id || "")
    setSavingProfile(false)
    setSavedProfile(true)
    setTimeout(() => setSavedProfile(false), 2000)
  }

  async function saveOrg(e: React.FormEvent) {
    e.preventDefault()
    if (!org?.id) return
    setSavingOrg(true)
    await supabase.from("organizations").update(orgForm).eq("id", org.id)
    setSavingOrg(false)
    setSavedOrg(true)
    setTimeout(() => setSavedOrg(false), 2000)
  }

  const usagePct = org ? Math.round((org.analyses_used / org.plan_limit) * 100) : 0
  const searchUsagePct = org?.search_limit ? Math.round(((org.searches_used || 0) / org.search_limit) * 100) : 0
  const [upgrading, setUpgrading] = useState<string | null>(null)

  async function handleUpgrade(planKey: string) {
    setUpgrading(planKey)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || "Error al iniciar el pago")
    } catch (err) {
      alert("Error conectando con el sistema de pagos. Configurá las keys de Stripe en .env.local")
    } finally {
      setUpgrading(null)
    }
  }

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--background)" }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Configuración</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Gestioná tu perfil, empresa y equipo</p>
        </div>

        {/* Plan actual */}
        {org && isOwner && (
          <div className="p-6 rounded-2xl mb-4 animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Plan actual</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  <span className="capitalize font-semibold" style={{ color: "var(--accent-light)" }}>{org.plan}</span>
                  {" · "}{org.analyses_used} / {org.plan_limit} análisis · {org.searches_used || 0} / {org.search_limit || 50} búsquedas
                </p>
              </div>
              <div className="flex gap-2">
                {org.plan === "free" && (
                  <>
                    <button onClick={() => handleUpgrade("pro")} disabled={!!upgrading}
                      className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                      {upgrading === "pro" ? "Redirigiendo..." : "↑ Pro — $49/mes"}
                    </button>
                    <button onClick={() => handleUpgrade("agency")} disabled={!!upgrading}
                      className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                      style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                      {upgrading === "agency" ? "Redirigiendo..." : "Agency — $150/mes"}
                    </button>
                  </>
                )}
                {org.plan === "pro" && (
                  <button onClick={() => handleUpgrade("agency")} disabled={!!upgrading}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                    {upgrading === "agency" ? "Redirigiendo..." : "↑ Agency — $150/mes"}
                  </button>
                )}
                {org.plan === "agency" && (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{ background: "rgba(34,197,94,0.15)", color: "var(--success)" }}>
                    ✓ Plan máximo
                  </span>
                )}
              </div>
            </div>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Análisis</p>
            <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: "var(--surface-2)" }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.min(usagePct, 100)}%`,
                background: usagePct > 80 ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "linear-gradient(90deg,var(--accent),#a78bfa)"
              }} />
            </div>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Búsquedas de empresas</p>
            <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.min(searchUsagePct, 100)}%`,
                background: searchUsagePct > 80 ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "linear-gradient(90deg,#22c55e,#10b981)"
              }} />
            </div>
            {(usagePct > 80 || searchUsagePct > 80) && (
              <p className="text-xs mt-2" style={{ color: "#f59e0b" }}>
                ⚠️ Usaste el {Math.max(usagePct, searchUsagePct)}% de alguno de tus límites mensuales
              </p>
            )}
          </div>
        )}

        {/* Org settings - solo admin */}
        {org && isOwner && (
          <div className="p-6 rounded-2xl mb-4 animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="mb-5">
              <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Contexto de la IA</h2>
            </div>
            <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
              La IA usa esta información para personalizar todos los mensajes de prospección con el contexto de tu empresa.
            </p>
            <form onSubmit={saveOrg} className="space-y-4">
              {/* Logo upload */}
              <div className="flex items-center gap-5 pb-4 border-b" style={{ borderColor: "var(--border)" }}>
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 cursor-pointer relative group"
                  style={{ background: logoUrl ? "transparent" : "linear-gradient(135deg, var(--accent), #7c3aed)", border: "2px solid var(--border)" }}
                  onClick={() => logoInputRef.current?.click()}>
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                  )}
                  <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: "var(--text-primary)" }}>Logo de la empresa</p>
                  <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Se muestra en el sidebar. PNG, JPG o SVG.</p>
                  <button type="button" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    {uploadingLogo ? "Subiendo..." : logoUrl ? "Cambiar logo" : "Subir logo"}
                  </button>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Nombre de la empresa</label>
                  <input value={orgForm.name} onChange={e => setOrgForm(p => ({ ...p, name: e.target.value }))}
                    className={inputCls} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--accent)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"} />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Sitio web</label>
                  <input value={orgForm.website} onChange={e => setOrgForm(p => ({ ...p, website: e.target.value }))}
                    placeholder="https://tuempresa.com" className={inputCls} style={inputStyle}
                    onFocus={e => e.target.style.borderColor = "var(--accent)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>¿A qué se dedica tu empresa?</label>
                <textarea value={orgForm.company_description} onChange={e => setOrgForm(p => ({ ...p, company_description: e.target.value }))}
                  rows={2} className={inputCls} style={{ ...inputStyle, resize: "none" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Productos / Servicios</label>
                <textarea value={orgForm.product_service} onChange={e => setOrgForm(p => ({ ...p, product_service: e.target.value }))}
                  rows={2} className={inputCls} style={{ ...inputStyle, resize: "none" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Propuesta de valor</label>
                <textarea value={orgForm.value_proposition} onChange={e => setOrgForm(p => ({ ...p, value_proposition: e.target.value }))}
                  rows={2} className={inputCls} style={{ ...inputStyle, resize: "none" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Cliente ideal (target)</label>
                <textarea value={orgForm.target_audience} onChange={e => setOrgForm(p => ({ ...p, target_audience: e.target.value }))}
                  rows={2} className={inputCls} style={{ ...inputStyle, resize: "none" }}
                  onFocus={e => e.target.style.borderColor = "var(--accent)"}
                  onBlur={e => e.target.style.borderColor = "var(--border)"} />
              </div>
              {/* Templates de mensajes */}
              <div className="pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <p className="text-xs font-semibold mb-4 uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  🎨 Estilo de los mensajes
                </p>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Tono</label>
                    <select value={orgForm.message_tone} onChange={e => setOrgForm(p => ({ ...p, message_tone: e.target.value }))}
                      className={inputCls} style={inputStyle}>
                      <option value="profesional">Profesional</option>
                      <option value="casual y cercano">Casual y cercano</option>
                      <option value="directo y audaz">Directo y audaz</option>
                      <option value="formal y corporativo">Formal y corporativo</option>
                      <option value="empático y consultivo">Empático y consultivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Estilo de redacción</label>
                    <select value={orgForm.message_style} onChange={e => setOrgForm(p => ({ ...p, message_style: e.target.value }))}
                      className={inputCls} style={inputStyle}>
                      <option value="directo y conciso">Directo y conciso</option>
                      <option value="narrativo con contexto">Narrativo con contexto</option>
                      <option value="basado en preguntas">Basado en preguntas</option>
                      <option value="orientado a datos">Orientado a datos</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>
                    Instrucciones personalizadas para la IA
                    <span className="ml-1 font-normal" style={{ color: "var(--text-muted)" }}>(opcional)</span>
                  </label>
                  <textarea value={orgForm.custom_instructions} onChange={e => setOrgForm(p => ({ ...p, custom_instructions: e.target.value }))}
                    rows={3} placeholder="Ej: Siempre mencionar que ofrecemos prueba gratuita de 14 días. No usar la palabra 'solución'. Enfocarse en ROI mensurable."
                    className={inputCls} style={{ ...inputStyle, resize: "none" }}
                    onFocus={e => e.target.style.borderColor = "var(--accent)"}
                    onBlur={e => e.target.style.borderColor = "var(--border)"} />
                </div>
              </div>

              <button type="submit" disabled={savingOrg}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: savedOrg ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, var(--accent), #7c3aed)", color: savedOrg ? "var(--success)" : "white" }}>
                {savingOrg ? "Guardando..." : savedOrg ? "✓ Guardado" : "Guardar contexto IA"}
              </button>
            </form>
          </div>
        )}

        {/* Profile */}
        <div className="p-6 rounded-2xl mb-4 animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="font-semibold mb-5" style={{ color: "var(--text-primary)" }}>Mi Perfil</h2>
          <form onSubmit={saveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Nombre</label>
              <input value={fullName} onChange={e => setFullName(e.target.value)}
                className={inputCls} style={inputStyle}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Email</label>
              <input value={profile?.email || ""} disabled
                className={`${inputCls} opacity-50 cursor-not-allowed`} style={inputStyle} />
            </div>
            <button type="submit" disabled={savingProfile}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: savedProfile ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, var(--accent), #7c3aed)", color: savedProfile ? "var(--success)" : "white" }}>
              {savingProfile ? "Guardando..." : savedProfile ? "✓ Guardado" : "Guardar cambios"}
            </button>
          </form>
        </div>

        {/* Google Calendar - solo owner */}
        {isOwner && (
          <div className="p-6 rounded-2xl animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Google Calendar</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Conectá tu calendario para que los setters puedan agendar llamadas
                </p>
                {calendarStatus === "connected" && (
                  <p className="text-xs mt-2 font-semibold" style={{ color: "#22c55e" }}>✓ Calendario conectado correctamente</p>
                )}
                {calendarStatus === "error" && (
                  <p className="text-xs mt-2 font-semibold" style={{ color: "#ef4444" }}>✗ Error al conectar. Intentá de nuevo.</p>
                )}
                {(calendarConnected || calendarStatus === "connected") && calendarStatus !== "error" && !calendarStatus && (
                  <p className="text-xs mt-2 font-semibold" style={{ color: "#22c55e" }}>✓ Calendario conectado</p>
                )}
              </div>
              <a href="/api/auth/google"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: (calendarConnected || calendarStatus === "connected") ? "rgba(34,197,94,0.15)" : "rgba(59,130,246,0.15)",
                  border: `1px solid ${(calendarConnected || calendarStatus === "connected") ? "rgba(34,197,94,0.3)" : "rgba(59,130,246,0.3)"}`,
                  color: (calendarConnected || calendarStatus === "connected") ? "#22c55e" : "#3b82f6",
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {(calendarConnected || calendarStatus === "connected") ? "Reconectar Calendar" : "Conectar Calendar"}
              </a>
            </div>
          </div>
        )}

        {/* Calendly */}
        {isOwner && (
          <div className="p-6 rounded-2xl animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h2 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Calendly</h2>
            <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
              Alternativa más simple — pegá tu link de Calendly y los setters lo usan directamente
            </p>
            <div className="flex gap-3">
              <input
                type="url"
                placeholder="https://calendly.com/tu-usuario/30min"
                value={orgForm.calendly_url}
                onChange={e => setOrgForm(f => ({ ...f, calendly_url: e.target.value }))}
                className={inputCls}
                style={inputStyle}
              />
              <button
                onClick={async () => {
                  setSavingOrg(true)
                  await supabase.from("organizations").update({ calendly_url: orgForm.calendly_url }).eq("id", org!.id)
                  setSavingOrg(false)
                  setSavedOrg(true)
                  setTimeout(() => setSavedOrg(false), 2000)
                }}
                className="px-4 py-2 rounded-xl text-sm font-semibold shrink-0"
                style={{ background: "var(--accent)", color: "white" }}
              >
                {savedOrg ? "✓ Guardado" : "Guardar"}
              </button>
            </div>
            {orgForm.calendly_url && (
              <p className="text-xs mt-2" style={{ color: "#22c55e" }}>
                ✓ Los setters van a usar este link para agendar llamadas
              </p>
            )}
          </div>
        )}

        {/* API Keys */}
        {isOwner && <ApiKeysSection orgId={org?.id || ""} />}

        {/* Team - solo admin */}
        {isOwner && <div className="p-6 rounded-2xl animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h2 className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Equipo de Setters</h2>
          <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
            Compartí el link de invitación — cuando el setter se registra queda automáticamente vinculado a tu equipo.
          </p>

          {/* Invite link */}
          {org?.id && (
            <div className="mb-6 p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>🔗 Link de invitación</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs truncate px-3 py-2 rounded-lg" style={{ background: "var(--background)", color: "var(--accent-light)", border: "1px solid var(--border)" }}>
                  {`${typeof window !== "undefined" ? window.location.origin : ""}/join/${org.id}`}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/join/${org!.id}`
                    navigator.clipboard.writeText(url)
                    alert("¡Link copiado!")
                  }}
                  className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                  Copiar
                </button>
              </div>
            </div>
          )}

          {/* Integraciones */}
          {isOwner && <form onSubmit={saveIntegrations} className="mb-8 rounded-2xl p-6" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="font-semibold mb-5" style={{ color: "var(--text-primary)" }}>Integraciones</h3>

            <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>Twilio</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { key: "twilio_account_sid", label: "Account SID" },
                { key: "twilio_auth_token", label: "Auth Token" },
                { key: "twilio_phone_number", label: "Número Twilio (+1...)" },
                { key: "twilio_api_key", label: "API Key (SK...)" },
                { key: "twilio_api_secret", label: "API Secret" },
                { key: "twilio_twiml_app_sid", label: "TwiML App SID (AP...)" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
                  <input
                    value={(integrations as Record<string, string>)[key]}
                    onChange={e => setIntegrations(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={label}
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            <p className="text-xs font-semibold mb-3 uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>WhatsApp Business</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { key: "whatsapp_access_token", label: "Access Token" },
                { key: "whatsapp_phone_number_id", label: "Phone Number ID" },
                { key: "whatsapp_verify_token", label: "Verify Token" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-secondary)" }}>{label}</label>
                  <input
                    value={(integrations as Record<string, string>)[key]}
                    onChange={e => setIntegrations(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={label}
                    className={inputCls}
                    style={inputStyle}
                  />
                </div>
              ))}
            </div>

            <button type="submit" disabled={savingIntegrations}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
              {savedIntegrations ? "¡Guardado!" : savingIntegrations ? "Guardando..." : "Guardar integraciones"}
            </button>
          </form>}

          <div className="space-y-3">
            {team.map(member => (
              <div key={member.id} className="flex items-center gap-4 p-4 rounded-xl"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                  {member.full_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{member.full_name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{member.email}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs capitalize"
                  style={{ background: member.role === "admin" ? "rgba(108,99,255,0.15)" : "var(--surface-3)", color: member.role === "admin" ? "var(--accent-light)" : "var(--text-muted)" }}>
                  {member.role}
                </span>
                {member.id === profile?.id && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>← Sos vos</span>
                )}
              </div>
            ))}
          </div>
        </div>}
      </div>
    </div>
  )
}
