"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

type CallDetail = {
  id: string
  scheduled_at: string
  duration_minutes: number
  notes?: string
  prospect_id: string
  prospects: {
    id: string
    full_name: string
    company: string
    headline?: string
    linkedin_url?: string
    instagram_url?: string
    source_type?: string
    status?: string
    notes?: string
    follow_up_count?: number
  } | null
  profiles: { full_name: string; email: string } | null
}

type Analysis = {
  summary?: string
  pain_points?: string[]
  sales_angle?: string
  psychological_profile?: string
  communication_style?: string
  company_analysis?: string
  key_words?: string[]
}

type Message = {
  follow_up_number: number
  message_type: string
  phase: string
  content: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  nuevo: { label: "Nuevo", color: "#6c63ff", bg: "rgba(108,99,255,0.15)" },
  activo: { label: "Activo", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  llamada_agendada: { label: "Llamada Agendada", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  cerrado_ganado: { label: "Cerrado ✓", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  cerrado_perdido: { label: "Cerrado ✗", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
}

export default function CallDetailModal({ call, onClose }: { call: CallDetail; onClose: () => void }) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [activeTab, setActiveTab] = useState<"resumen" | "analisis" | "mensajes" | "notas">("resumen")
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<number | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!call.prospect_id) return
    Promise.all([
      supabase.from("prospect_analyses").select("*").eq("prospect_id", call.prospect_id).single(),
      supabase.from("generated_messages").select("*").eq("prospect_id", call.prospect_id).order("follow_up_number"),
    ]).then(([{ data: a }, { data: m }]) => {
      setAnalysis(a)
      setMessages(m || [])
      setLoading(false)
    })
  }, [call.prospect_id])

  function copy(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  const p = call.prospects
  const setter = call.profiles
  const statusCfg = STATUS_CONFIG[p?.status || "nuevo"] || STATUS_CONFIG.nuevo
  const callDate = new Date(call.scheduled_at)

  const tabs = [
    { id: "resumen", label: "Resumen" },
    { id: "analisis", label: "Análisis IA" },
    { id: "mensajes", label: "Mensajes" },
    { id: "notas", label: "Notas" },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

        {/* Header */}
        <div className="p-6 shrink-0" style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #6c63ff)", color: "white" }}>
                  📞
                </div>
                <div>
                  <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
                    {p?.full_name || "Prospecto"}
                  </h2>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>{p?.company || ""}</p>
                </div>
              </div>

              {/* Info de la llamada */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm" style={{ color: "#3b82f6" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                  <span className="font-semibold">
                    {callDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  {callDate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} · {call.duration_minutes || 45} min
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: statusCfg.bg, color: statusCfg.color }}>
                  {statusCfg.label}
                </span>
                {setter && (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Agendado por: <strong style={{ color: "var(--text-secondary)" }}>{setter.full_name}</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href={`/prospects/${call.prospect_id}`}
                className="px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(108,99,255,0.15)", color: "var(--accent-light)", border: "1px solid rgba(108,99,255,0.3)" }}>
                Ver prospecto completo →
              </Link>
              <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 shrink-0" style={{ borderBottom: "1px solid var(--border)" }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 text-sm font-medium rounded-t-lg transition-all"
              style={{
                color: activeTab === tab.id ? "var(--accent-light)" : "var(--text-muted)",
                borderBottom: activeTab === tab.id ? "2px solid var(--accent)" : "2px solid transparent",
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Cargando información...</p>
          ) : (
            <>
              {/* RESUMEN */}
              {activeTab === "resumen" && (
                <div className="space-y-5">
                  {/* Datos del prospecto */}
                  <div className="grid grid-cols-2 gap-4">
                    <InfoCard label="Empresa" value={p?.company || "—"} />
                    <InfoCard label="Cargo" value={p?.headline || "—"} />
                    <InfoCard label="Follow-ups" value={`${p?.follow_up_count || 0} realizados`} />
                    <InfoCard label="Fuente" value={p?.source_type === "instagram" ? "Instagram" : "LinkedIn"} />
                  </div>

                  {/* Links */}
                  <div className="flex gap-3">
                    {p?.linkedin_url && (
                      <a href={p.linkedin_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
                        style={{ background: "rgba(0,119,181,0.12)", color: "#0077b5", border: "1px solid rgba(0,119,181,0.25)" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                        Ver LinkedIn
                      </a>
                    )}
                    {p?.instagram_url && (
                      <a href={p.instagram_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium"
                        style={{ background: "rgba(225,48,108,0.12)", color: "#e1306c", border: "1px solid rgba(225,48,108,0.25)" }}>
                        IG Ver Instagram
                      </a>
                    )}
                  </div>

                  {/* Sales angle destacado */}
                  {analysis?.sales_angle && (
                    <div className="p-4 rounded-xl" style={{ background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.2)" }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: "var(--accent-light)" }}>🎯 Ángulo de venta</p>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{analysis.sales_angle}</p>
                    </div>
                  )}

                  {/* Pain points */}
                  {analysis?.pain_points && analysis.pain_points.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>⚡ Puntos de dolor</p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.pain_points.map((pp, i) => (
                          <span key={i} className="px-3 py-1 rounded-full text-xs"
                            style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                            {pp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Palabras clave */}
                  {analysis?.key_words && analysis.key_words.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>🔑 Palabras clave</p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.key_words.map((kw, i) => (
                          <span key={i} className="px-3 py-1 rounded-full text-xs"
                            style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ANÁLISIS IA */}
              {activeTab === "analisis" && (
                <div className="space-y-5">
                  {analysis?.summary && (
                    <Section title="Resumen del perfil" content={analysis.summary} />
                  )}
                  {analysis?.company_analysis && (
                    <Section title="Análisis de la empresa" content={analysis.company_analysis} />
                  )}
                  {analysis?.psychological_profile && (
                    <Section title="Perfil psicológico" content={analysis.psychological_profile} />
                  )}
                  {analysis?.communication_style && (
                    <Section title="Estilo de comunicación" content={analysis.communication_style} />
                  )}
                  {!analysis && (
                    <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Sin análisis disponible</p>
                  )}
                </div>
              )}

              {/* MENSAJES */}
              {activeTab === "mensajes" && (
                <div className="space-y-3">
                  {messages.length === 0 ? (
                    <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Sin mensajes generados</p>
                  ) : messages.map((msg, idx) => (
                    <div key={idx} className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(108,99,255,0.15)", color: "var(--accent-light)" }}>
                            #{msg.follow_up_number} · {msg.phase}
                          </span>
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{msg.message_type}</span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => copy(msg.content, idx)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{
                              background: copied === idx ? "rgba(34,197,94,0.15)" : "var(--surface)",
                              color: copied === idx ? "#22c55e" : "var(--text-secondary)",
                              border: "1px solid var(--border)"
                            }}>
                            {copied === idx ? "✓ Copiado" : "Copiar"}
                          </button>
                          {p?.linkedin_url && (
                            <a href={`https://wa.me/?text=${encodeURIComponent(msg.content)}`} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                              style={{ background: "rgba(37,211,102,0.15)", color: "#25d366", border: "1px solid rgba(37,211,102,0.3)" }}>
                              WA
                            </a>
                          )}
                        </div>
                      </div>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-primary)", lineHeight: "1.6" }}>
                        {msg.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* NOTAS */}
              {activeTab === "notas" && (
                <div>
                  <div className="p-4 rounded-xl min-h-40" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <p className="text-sm whitespace-pre-wrap" style={{ color: p?.notes ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {p?.notes || "Sin notas. Abrí el prospecto completo para agregar notas y grabaciones de voz."}
                    </p>
                  </div>
                  {call.notes && (
                    <div className="mt-4 p-4 rounded-xl" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
                      <p className="text-xs font-semibold mb-2" style={{ color: "#3b82f6" }}>Notas de esta llamada</p>
                      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{call.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  )
}

function Section({ title, content }: { title: string; content: string }) {
  return (
    <div className="p-4 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
      <p className="text-xs font-semibold mb-2" style={{ color: "var(--accent-light)" }}>{title}</p>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{content}</p>
    </div>
  )
}
