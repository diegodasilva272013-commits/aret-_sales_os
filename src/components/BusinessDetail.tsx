"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

type Business = {
  id: string
  name: string
  category: string
  address: string
  city: string
  country: string
  phone: string
  website: string
  google_rating: number | null
  google_maps_url: string
  contact_name: string
  contact_email: string
  whatsapp: string
  instagram: string
  linkedin_url: string
  status: string
  follow_up_count: number
}

const STATUS_CONFIG = {
  nuevo: { label: "Nuevo", color: "#6c63ff", bg: "rgba(108,99,255,0.15)" },
  activo: { label: "Activo", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  pausado: { label: "Pausado", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  llamada_agendada: { label: "Llamada Agendada", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  cerrado_ganado: { label: "Cerrado ✓", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  cerrado_perdido: { label: "Cerrado ✗", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
}

const CHANNEL_CONFIG = {
  whatsapp: { label: "WhatsApp", emoji: "💬", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  email: { label: "Email", emoji: "📧", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  instagram: { label: "Instagram", emoji: "📸", color: "#e1306c", bg: "rgba(225,48,108,0.15)" },
  linkedin: { label: "LinkedIn", emoji: "💼", color: "#0077b5", bg: "rgba(0,119,181,0.15)" },
  general: { label: "General", emoji: "📋", color: "#6c63ff", bg: "rgba(108,99,255,0.15)" },
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{ background: copied ? "rgba(34,197,94,0.15)" : "var(--surface-3)", color: copied ? "var(--success)" : "var(--text-secondary)" }}>
      {copied ? "✓ Copiado" : "Copiar"}
    </button>
  )
}

export default function BusinessDetail({ business, analysis, messages, followUps, currentUserId }: {
  business: Business
  analysis: Record<string, unknown> | null
  messages: Record<string, unknown>[]
  followUps: Record<string, unknown>[]
  currentUserId: string
}) {
  const [activeTab, setActiveTab] = useState<"mensajes" | "analisis" | "seguimiento">("mensajes")
  const [activeChannel, setActiveChannel] = useState<"whatsapp" | "email" | "instagram" | "linkedin" | "general">("whatsapp")
  const [localStatus, setLocalStatus] = useState(business.status)
  const [localBiz, setLocalBiz] = useState(business)
  const [editingContact, setEditingContact] = useState(false)
  const [contactForm, setContactForm] = useState({
    contact_name: business.contact_name || "",
    contact_email: business.contact_email || "",
    whatsapp: business.whatsapp || "",
    instagram: business.instagram || "",
    linkedin_url: business.linkedin_url || "",
  })
  const router = useRouter()
  const supabase = createClient()

  const statusCfg = STATUS_CONFIG[localStatus as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.nuevo
  const channelMessages = messages.filter(m => m.channel === activeChannel)
  const availableChannels = Object.keys(CHANNEL_CONFIG).filter(ch => {
    if (ch === "whatsapp") return !!localBiz.whatsapp
    if (ch === "email") return !!localBiz.contact_email
    if (ch === "instagram") return !!localBiz.instagram
    if (ch === "linkedin") return !!localBiz.linkedin_url
    return true
  }) as Array<keyof typeof CHANNEL_CONFIG>

  function getContactLink(channel: string, msgContent: string) {
    const encoded = encodeURIComponent(msgContent)
    if (channel === "whatsapp") {
      const num = localBiz.whatsapp.replace(/\D/g, "")
      return `https://wa.me/${num}?text=${encoded}`
    }
    if (channel === "email") {
      const msg = messages.find(m => m.channel === "email" && m.message_type === "inicial") as Record<string, string> | undefined
      return `mailto:${localBiz.contact_email}?subject=${encodeURIComponent(msg?.subject || "")}&body=${encoded}`
    }
    if (channel === "instagram") {
      const handle = localBiz.instagram.replace("@", "")
      return `https://instagram.com/${handle}`
    }
    if (channel === "linkedin") return localBiz.linkedin_url
    return "#"
  }

  async function markSent(msgType: string) {
    await supabase.from("business_follow_ups").insert({
      business_id: business.id,
      follow_up_number: business.follow_up_count + 1,
      channel: activeChannel,
      status: "enviado",
      prospect_responded: false,
      setter_id: currentUserId,
      sent_at: new Date().toISOString(),
    })
    await supabase.from("businesses").update({
      follow_up_count: business.follow_up_count + 1,
      status: "activo",
      last_contact_at: new Date().toISOString(),
    }).eq("id", business.id)
  }

  async function saveContact() {
    await supabase.from("businesses").update(contactForm).eq("id", business.id)
    setLocalBiz({ ...localBiz, ...contactForm })
    setEditingContact(false)
  }

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--background)" }}>
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div className="flex items-start gap-4">
            <button onClick={() => router.back()} className="mt-1 p-2 rounded-lg transition-all"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={e => (e.currentTarget.style.background = "var(--surface-2)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{business.name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: statusCfg.bg, color: statusCfg.color }}>
                  {statusCfg.label}
                </span>
              </div>
              <p className="mt-1 text-sm capitalize" style={{ color: "var(--text-secondary)" }}>{business.category} · {business.city}, {business.country}</p>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                {business.phone && <span className="text-xs" style={{ color: "var(--text-muted)" }}>📞 {business.phone}</span>}
                {business.website && <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: "var(--accent-light)" }}>🌐 {business.website.replace(/https?:\/\//, "").split("/")[0]}</a>}
                {business.google_maps_url && <a href={business.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: "var(--text-muted)" }}>📍 Ver en Maps</a>}
                {business.google_rating && <span className="text-xs" style={{ color: "var(--warning)" }}>⭐ {business.google_rating}</span>}
              </div>
            </div>
          </div>
          <select value={localStatus} onChange={async e => { setLocalStatus(e.target.value); await supabase.from("businesses").update({ status: e.target.value }).eq("id", business.id) }}
            className="px-4 py-2 rounded-xl text-sm outline-none cursor-pointer"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Contacto */}
        <div className="mb-6 p-5 rounded-2xl animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>👤 Datos de contacto</h3>
            <button onClick={() => setEditingContact(!editingContact)} className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
              {editingContact ? "Cancelar" : "✏️ Editar"}
            </button>
          </div>

          {editingContact ? (
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "contact_name", label: "Nombre contacto", placeholder: "Juan Pérez" },
                { key: "contact_email", label: "Email", placeholder: "juan@empresa.com" },
                { key: "whatsapp", label: "WhatsApp", placeholder: "+54 9 11 1234-5678" },
                { key: "instagram", label: "Instagram", placeholder: "@empresa" },
                { key: "linkedin_url", label: "LinkedIn URL", placeholder: "linkedin.com/in/..." },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{f.label}</label>
                  <input value={contactForm[f.key as keyof typeof contactForm]}
                    onChange={e => setContactForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
                </div>
              ))}
              <div className="flex items-end">
                <button onClick={saveContact} className="w-full py-2 rounded-lg text-sm font-semibold"
                  style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: "Contacto", value: localBiz.contact_name, icon: "👤" },
                { label: "Email", value: localBiz.contact_email, icon: "📧" },
                { label: "WhatsApp", value: localBiz.whatsapp, icon: "💬" },
                { label: "Instagram", value: localBiz.instagram, icon: "📸" },
                { label: "LinkedIn", value: localBiz.linkedin_url ? "Ver perfil" : "", icon: "💼", link: localBiz.linkedin_url },
              ].map(item => (
                <div key={item.label}>
                  <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{item.icon} {item.label}</p>
                  {item.link ? (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-xs hover:underline" style={{ color: "var(--accent-light)" }}>{item.value || "—"}</a>
                  ) : (
                    <p className="text-xs font-medium truncate" style={{ color: item.value ? "var(--text-primary)" : "var(--text-muted)" }}>{item.value || "No encontrado"}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "var(--surface)" }}>
          {(["mensajes", "analisis", "seguimiento"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all"
              style={{ background: activeTab === tab ? "var(--accent)" : "transparent", color: activeTab === tab ? "white" : "var(--text-secondary)" }}>
              {tab === "mensajes" ? "✉️ Mensajes" : tab === "analisis" ? "🧠 Análisis" : "📊 Seguimiento"}
            </button>
          ))}
        </div>

        {/* TAB MENSAJES */}
        {activeTab === "mensajes" && (
          <div className="animate-fade-in">
            {/* Channel selector */}
            <div className="flex gap-2 mb-5 flex-wrap">
              {(Object.keys(CHANNEL_CONFIG) as Array<keyof typeof CHANNEL_CONFIG>).map(ch => {
                const cfg = CHANNEL_CONFIG[ch]
                const hasContact = availableChannels.includes(ch) || ch === "general"
                return (
                  <button key={ch} onClick={() => setActiveChannel(ch)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: activeChannel === ch ? cfg.bg : "var(--surface)",
                      border: `1px solid ${activeChannel === ch ? cfg.color : "var(--border)"}`,
                      color: activeChannel === ch ? cfg.color : hasContact ? "var(--text-secondary)" : "var(--text-muted)",
                      opacity: hasContact ? 1 : 0.5,
                    }}>
                    {cfg.emoji} {cfg.label}
                    {!hasContact && (ch as string) !== "general" && <span className="text-xs">(sin datos)</span>}
                  </button>
                )
              })}
            </div>

            {/* Messages for selected channel */}
            <div className="space-y-4">
              {channelMessages.length === 0 ? (
                <div className="p-8 text-center rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>No hay mensajes para este canal</p>
                </div>
              ) : channelMessages.map((msg, i) => {
                const m = msg as Record<string, string>
                const chCfg = CHANNEL_CONFIG[activeChannel]
                const contactLink = m.content ? getContactLink(activeChannel, m.content) : "#"
                return (
                  <div key={i} className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <div className="flex items-center justify-between px-5 py-3" style={{ background: "var(--surface)" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{chCfg.emoji}</span>
                        <div>
                          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {m.message_type === "inicial" ? "Mensaje Inicial" : m.message_type === "sin_respuesta" ? "Sin Respuesta" : "Con Respuesta"}
                          </span>
                          {m.subject && <p className="text-xs" style={{ color: "var(--text-muted)" }}>Asunto: {m.subject}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="p-5" style={{ background: "var(--surface-2)" }}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4" style={{ color: "var(--text-primary)" }}>{m.content}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <CopyButton text={m.content} />
                        {contactLink !== "#" && (
                          <a href={contactLink} target="_blank" rel="noopener noreferrer"
                            onClick={() => markSent(m.message_type)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: chCfg.bg, color: chCfg.color, border: `1px solid ${chCfg.color}40` }}>
                            {chCfg.emoji} Abrir en {chCfg.label}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB ANÁLISIS */}
        {activeTab === "analisis" && analysis && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>🏢 Análisis de la Empresa</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{analysis.company_analysis as string}</p>
            </div>
            <div className="p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>🧠 Perfil del Decisor</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>{analysis.psychological_profile as string}</p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{analysis.communication_style as string}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>🎯 Ángulo de Venta</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{analysis.sales_angle as string}</p>
              </div>
              <div className="p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>🔑 Pain Points</h3>
                <div className="space-y-2">
                  {(analysis.pain_points as string[] || []).map((pp, i) => (
                    <div key={i} className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(239,68,68,0.15)", color: "var(--danger)" }}>{i+1}</span>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>{pp}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>💬 Palabras Clave del Decisor</h3>
              <div className="flex flex-wrap gap-2">
                {(analysis.key_words as string[] || []).map(kw => (
                  <span key={kw} className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: "var(--accent-glow)", color: "var(--accent-light)", border: "1px solid rgba(108,99,255,0.2)" }}>{kw}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB SEGUIMIENTO */}
        {activeTab === "seguimiento" && (
          <div className="animate-fade-in rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--surface)" }}>
                  {["#", "Canal", "Estado", "Respondió", "Fecha", "Setter"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {followUps.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                    Sin seguimientos todavía. Enviá el primer mensaje.
                  </td></tr>
                ) : followUps.map((fu, i) => {
                  const f = fu as Record<string, unknown>
                  const chCfg = CHANNEL_CONFIG[f.channel as keyof typeof CHANNEL_CONFIG] || CHANNEL_CONFIG.general
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                      <td className="px-4 py-3 text-sm font-bold" style={{ color: "var(--text-muted)" }}>{f.follow_up_number as number}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm flex items-center gap-1">{chCfg.emoji} <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{chCfg.label}</span></span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs" style={{
                          background: f.status === "respondido" ? "rgba(34,197,94,0.15)" : f.status === "sin_respuesta" ? "rgba(239,68,68,0.1)" : "rgba(108,99,255,0.15)",
                          color: f.status === "respondido" ? "var(--success)" : f.status === "sin_respuesta" ? "var(--danger)" : "var(--accent-light)",
                        }}>
                          {f.status as string}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: f.prospect_responded ? "var(--success)" : "var(--danger)" }}>
                        {f.prospect_responded ? "✓ Sí" : "✗ No"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        {f.sent_at ? new Date(f.sent_at as string).toLocaleDateString("es-AR") : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                        {((f as Record<string, { full_name?: string }>).profiles)?.full_name || "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
