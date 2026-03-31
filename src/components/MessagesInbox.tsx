"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import WhatsAppChat from "./WhatsAppChat"

type Prospect = {
  id: string
  full_name: string
  company: string
  headline?: string
  whatsapp_number?: string
  status?: string
}

type Conversation = {
  id: string
  content: string
  direction: "inbound" | "outbound"
  status: string
  created_at: string
  prospect_id: string
  prospects: Prospect | null
}

const STATUS_COLORS: Record<string, string> = {
  nuevo: "#6c63ff",
  activo: "#22c55e",
  pausado: "#f59e0b",
  llamada_agendada: "#3b82f6",
  cerrado_ganado: "#22c55e",
  cerrado_perdido: "#ef4444",
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "ahora"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  return `${days}d`
}

export default function MessagesInbox({ conversations, orgId }: { conversations: Conversation[]; orgId: string }) {
  const supabase = createClient()
  const [convos, setConvos] = useState<Conversation[]>(conversations)
  const [selected, setSelected] = useState<Conversation | null>(convos[0] || null)
  const [search, setSearch] = useState("")

  // Realtime: actualizar lista cuando llega mensaje nuevo
  useEffect(() => {
    const channel = supabase
      .channel("inbox-updates")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "whatsapp_messages",
      }, async (payload) => {
        const newMsg = payload.new as { prospect_id: string; content: string; direction: string; created_at: string; id: string; status: string }

        setConvos(prev => {
          const existing = prev.find(c => c.prospect_id === newMsg.prospect_id)
          if (existing) {
            // Mover al tope con nuevo último mensaje
            const updated = {
              ...existing,
              content: newMsg.content,
              direction: newMsg.direction as "inbound" | "outbound",
              created_at: newMsg.created_at,
            }
            return [updated, ...prev.filter(c => c.prospect_id !== newMsg.prospect_id)]
          }
          return prev
        })
      })
      .subscribe()

    // Polling cada 8s como fallback para inbox
    const pollInbox = async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select(`
          id, content, direction, status, created_at, prospect_id,
          prospects!prospect_id(id, full_name, company, headline, whatsapp_number, status)
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(200)

      if (error) {
        console.error("[Inbox] Polling error:", error)
        return
      }
      console.log(`[Inbox] Polled ${data?.length || 0} messages, orgId=${orgId}`)

      if (data && data.length > 0) {
        // Re-agrupar por prospect, quedarse con el último mensaje
        const seen = new Set<string>()
        const fresh: Conversation[] = []
        for (const msg of data) {
          const pid = (msg as { prospect_id: string }).prospect_id
          if (!seen.has(pid)) {
            seen.add(pid)
            fresh.push(msg as unknown as Conversation)
          }
        }
        setConvos(fresh)
      }
    }
    const pollInterval = setInterval(pollInbox, 8000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [orgId])

  const filtered = convos.filter(c => {
    const name = c.prospects?.full_name?.toLowerCase() || ""
    const company = c.prospects?.company?.toLowerCase() || ""
    const q = search.toLowerCase()
    return name.includes(q) || company.includes(q)
  })

  return (
    <div className="flex h-screen" style={{ background: "var(--background)" }}>

      {/* Panel izquierdo — lista de conversaciones */}
      <div className="w-80 flex flex-col shrink-0" style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}>

        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Mensajes</h1>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{ background: "rgba(37,211,102,0.15)", color: "#25d366" }}>
              WhatsApp
            </span>
          </div>
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-muted)" }}>
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar conversación..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                style={{ background: "rgba(37,211,102,0.1)" }}>💬</div>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Sin conversaciones</p>
              <p className="text-xs text-center px-6" style={{ color: "var(--text-muted)" }}>
                Los mensajes de WhatsApp aparecerán acá
              </p>
            </div>
          ) : (
            filtered.map(convo => {
              const isSelected = selected?.prospect_id === convo.prospect_id
              const statusColor = STATUS_COLORS[convo.prospects?.status || "nuevo"] || "#6c63ff"
              const isInbound = convo.direction === "inbound"

              return (
                <button
                  key={convo.prospect_id}
                  onClick={() => setSelected(convo)}
                  className="w-full p-4 flex items-start gap-3 text-left transition-all"
                  style={{
                    background: isSelected ? "rgba(37,211,102,0.08)" : "transparent",
                    borderLeft: isSelected ? "3px solid #25d366" : "3px solid transparent",
                    borderBottom: "1px solid var(--border)",
                  }}>

                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 text-sm font-bold relative"
                    style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                    {convo.prospects?.full_name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2"
                      style={{ background: statusColor, borderColor: "var(--surface)" }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                        {convo.prospects?.full_name || "Desconocido"}
                      </p>
                      <span className="text-xs shrink-0 ml-2" style={{ color: "var(--text-muted)" }}>
                        {timeAgo(convo.created_at)}
                      </span>
                    </div>
                    <p className="text-xs truncate mb-1" style={{ color: "var(--text-muted)" }}>
                      {convo.prospects?.company || ""}
                    </p>
                    <p className="text-xs truncate" style={{ color: isInbound ? "var(--text-secondary)" : "var(--text-muted)" }}>
                      {isInbound ? "" : "Vos: "}{convo.content}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Panel derecho — chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            {/* Header del chat */}
            <div className="px-6 py-4 flex items-center gap-4" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                {selected.prospects?.full_name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  {selected.prospects?.full_name || "Desconocido"}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {selected.prospects?.company || ""}{selected.prospects?.whatsapp_number ? ` · ${selected.prospects.whatsapp_number}` : ""}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <a href={`/prospects/${selected.prospect_id}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  Ver prospecto
                </a>
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 overflow-hidden p-6">
              <WhatsAppChat
                prospectId={selected.prospect_id}
                prospectName={selected.prospects?.full_name || ""}
                whatsappNumber={selected.prospects?.whatsapp_number}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl"
              style={{ background: "rgba(37,211,102,0.1)" }}>💬</div>
            <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              Seleccioná una conversación
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Todos tus chats de WhatsApp en un solo lugar
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
