"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

type WaMessage = {
  id: string
  direction: "inbound" | "outbound"
  content: string
  status: string
  created_at: string
}

type GeneratedMessage = {
  id: string
  content: string
  follow_up_number: number
  message_type: string
}

const FOLLOWUP_LABELS: Record<number, string> = {
  0: "Mensaje Inicial",
  1: "Seguimiento 1",
  2: "Seguimiento 2",
  3: "Seguimiento 3",
  4: "Seguimiento 4",
  5: "Seguimiento 5 / Cierre",
}

export default function WhatsAppChat({ prospectId, prospectName, whatsappNumber }: {
  prospectId: string
  prospectName: string
  whatsappNumber?: string
}) {
  const supabase = createClient()
  const [messages, setMessages] = useState<WaMessage[]>([])
  const [generatedMessages, setGeneratedMessages] = useState<GeneratedMessage[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [phone, setPhone] = useState(whatsappNumber || "")
  const [error, setError] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from("generated_messages")
      .select("id, content, follow_up_number, message_type")
      .eq("prospect_id", prospectId)
      .order("follow_up_number")
      .then(({ data }) => setGeneratedMessages((data || []) as GeneratedMessage[]))
  }, [prospectId])

  useEffect(() => {
    // Cargar mensajes históricos
    supabase.from("whatsapp_messages")
      .select("*")
      .eq("prospect_id", prospectId)
      .order("created_at")
      .then(({ data }) => setMessages((data || []) as WaMessage[]))

    // Suscribirse a mensajes nuevos en tiempo real
    const channel = supabase
      .channel(`wa-${prospectId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "whatsapp_messages",
        filter: `prospect_id=eq.${prospectId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as WaMessage])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [prospectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || !phone) return
    setSending(true)
    setError("")

    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectId, message: input.trim(), toNumber: phone }),
    })
    const data = await res.json()

    if (!res.ok) setError(data.error || "Error al enviar")
    else setInput("")

    setSending(false)
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
  }

  // Agrupar por día
  const grouped: { date: string; msgs: WaMessage[] }[] = []
  for (const msg of messages) {
    const day = new Date(msg.created_at).toDateString()
    const last = grouped[grouped.length - 1]
    if (last?.date === day) last.msgs.push(msg)
    else grouped.push({ date: day, msgs: [msg] })
  }

  return (
    <div className="flex flex-col h-full" style={{ minHeight: "400px" }}>
      {/* Número de teléfono */}
      {!whatsappNumber && (
        <div className="p-3 mb-3 rounded-xl flex gap-2" style={{ background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.2)" }}>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+54 9 11 1234 5678"
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          />
          <button onClick={() => {}} className="px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(37,211,102,0.2)", color: "#25d366" }}>
            Guardar
          </button>
        </div>
      )}

      {/* Chat */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 mb-3" style={{ maxHeight: "420px" }}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
              style={{ background: "rgba(37,211,102,0.1)" }}>
              💬
            </div>
            <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Sin conversaciones todavía
            </p>
            <p className="text-xs text-center max-w-xs" style={{ color: "var(--text-muted)" }}>
              Enviá el primer mensaje a {prospectName} por WhatsApp
            </p>
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.date}>
              <div className="flex justify-center my-3">
                <span className="px-3 py-1 rounded-full text-xs" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                  {formatDate(group.msgs[0].created_at)}
                </span>
              </div>
              {group.msgs.map(msg => (
                <div key={msg.id} className={`flex mb-2 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-xs lg:max-w-md">
                    <div className="px-4 py-2.5 rounded-2xl text-sm"
                      style={{
                        background: msg.direction === "outbound" ? "#25d366" : "var(--surface)",
                        color: msg.direction === "outbound" ? "white" : "var(--text-primary)",
                        borderRadius: msg.direction === "outbound" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        border: msg.direction === "inbound" ? "1px solid var(--border)" : "none",
                      }}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                    <div className={`flex items-center gap-1 mt-0.5 ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatTime(msg.created_at)}</span>
                      {msg.direction === "outbound" && (
                        <span className="text-xs" style={{ color: msg.status === "read" ? "#25d366" : "var(--text-muted)" }}>
                          {msg.status === "read" ? "✓✓" : msg.status === "delivered" ? "✓✓" : "✓"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-2 px-3 py-2.5 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <p className="text-xs font-medium" style={{ color: "#ef4444" }}>{error}</p>
        </div>
      )}

      {/* Panel de mensajes generados */}
      {showTemplates && generatedMessages.length > 0 && (
        <div className="mb-2 rounded-xl overflow-hidden max-h-56 overflow-y-auto" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div className="px-3 py-2 text-xs font-semibold border-b flex items-center justify-between" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
            <span>Mensajes generados por IA</span>
            <button onClick={() => setShowTemplates(false)} style={{ color: "var(--text-muted)" }}>✕</button>
          </div>
          {generatedMessages.map(msg => (
            <button key={msg.id}
              onClick={() => { setInput(msg.content); setShowTemplates(false) }}
              className="w-full text-left px-3 py-2.5 text-xs transition-all border-b"
              style={{ borderColor: "var(--border)", background: "transparent", color: "var(--text-secondary)" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--surface-2)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <span className="font-semibold block mb-0.5" style={{ color: "var(--accent-light)" }}>
                {FOLLOWUP_LABELS[msg.follow_up_number] || `Follow-up #${msg.follow_up_number}`}
              </span>
              <span className="line-clamp-2">{msg.content}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 items-end">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          title="Mensajes generados"
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{ background: showTemplates ? "var(--accent)" : "var(--surface-2)", border: "1px solid var(--border)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={showTemplates ? "white" : "var(--text-secondary)"} strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </button>
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            placeholder="Escribí un mensaje..."
            rows={1}
            className="w-full px-4 py-3 rounded-2xl text-sm outline-none resize-none"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              maxHeight: "120px",
            }}
          />
        </div>
        <button
          onClick={handleSend}
          disabled={!input.trim() || !phone || sending}
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{
            background: input.trim() && phone ? "#25d366" : "var(--surface-2)",
            opacity: sending ? 0.7 : 1,
          }}>
          {sending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
