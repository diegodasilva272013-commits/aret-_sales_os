"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

type WaMessage = {
  id: string
  direction: "inbound" | "outbound"
  content: string
  status: string
  created_at: string
  media_url?: string
  media_type?: string
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

function AudioBubble({ src, outbound }: { src: string; outbound: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)

  const toggle = () => {
    if (!audioRef.current) return
    if (playing) { audioRef.current.pause() } else { audioRef.current.play() }
  }

  const fmtTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00"
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  // Simulated waveform bars
  const bars = [3,5,8,4,7,10,6,9,4,7,5,8,3,6,9,5,7,4,8,6,10,5,7,3,8,6,4,9,5,7]

  return (
    <div className="flex items-center gap-2.5 min-w-[240px]">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onTimeUpdate={() => {
          const a = audioRef.current
          if (a && a.duration) setProgress(a.currentTime / a.duration)
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setProgress(0) }}
      />
      <button onClick={toggle} className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90"
        style={{ background: outbound ? "rgba(255,255,255,0.2)" : "var(--accent)" }}>
        {playing ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><polygon points="6,4 20,12 6,20"/></svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-end gap-[2px] h-[28px]">
          {bars.map((h, i) => {
            const pct = i / bars.length
            const active = pct <= progress
            return (
              <div key={i} className="flex-1 rounded-full transition-all duration-100"
                style={{
                  height: `${h * 2.5}px`,
                  background: active
                    ? (outbound ? "rgba(255,255,255,0.9)" : "var(--accent)")
                    : (outbound ? "rgba(255,255,255,0.3)" : "var(--border-light)"),
                  minWidth: "2px",
                }} />
            )
          })}
        </div>
        <span className="text-[10px] mt-0.5 block" style={{ color: outbound ? "rgba(255,255,255,0.7)" : "var(--text-muted)" }}>
          {playing ? fmtTime(audioRef.current?.currentTime || 0) : fmtTime(duration)}
        </span>
      </div>
    </div>
  )
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
  const [loadError, setLoadError] = useState("")
  const [loading, setLoading] = useState(true)
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [attachPreview, setAttachPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analysisInfo, setAnalysisInfo] = useState<{ messageCount: number; audioTranscribed: number } | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Función para cargar mensajes desde DB (reemplaza todo para capturar status updates)
  const loadMessages = useCallback(async () => {
    const { data, error: queryError } = await supabase.from("whatsapp_messages")
      .select("id, direction, content, status, created_at, media_url, media_type")
      .eq("prospect_id", prospectId)
      .order("created_at")
    setLoading(false)
    if (queryError) {
      console.error("[WhatsApp] Error loading messages:", queryError)
      setLoadError(`Error: ${queryError.message} (code: ${queryError.code})`)
      return
    }
    console.log(`[WhatsApp] Loaded ${data?.length || 0} messages for prospect ${prospectId}`)
    if (data) {
      setMessages(prev => {
        // Reemplazar con datos frescos de DB, pero mantener optimistic temporales
        const dbIds = new Set((data as WaMessage[]).map(m => m.id))
        const tempMsgs = prev.filter(m => m.id.startsWith("temp-") && !dbIds.has(m.id))
        const merged = [...(data as WaMessage[]), ...tempMsgs]
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        return merged
      })
    }
  }, [prospectId])

  useEffect(() => {
    supabase.from("generated_messages")
      .select("id, content, follow_up_number, message_type")
      .eq("prospect_id", prospectId)
      .order("follow_up_number")
      .then(({ data }) => setGeneratedMessages((data || []) as GeneratedMessage[]))
  }, [prospectId])

  useEffect(() => {
    // Cargar mensajes históricos
    loadMessages()

    // Suscribirse a mensajes nuevos y updates en tiempo real
    const channel = supabase
      .channel(`wa-${prospectId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "whatsapp_messages",
        filter: `prospect_id=eq.${prospectId}`,
      }, payload => {
        const newMsg = payload.new as WaMessage
        setMessages(prev => {
          // Evitar duplicados (por optimistic update o polling)
          if (prev.some(m => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "whatsapp_messages",
        filter: `prospect_id=eq.${prospectId}`,
      }, payload => {
        const updated = payload.new as WaMessage
        setMessages(prev => prev.map(m => m.id === updated.id ? { ...m, status: updated.status } : m))
      })
      .subscribe()

    // Polling cada 5s como fallback si Realtime no funciona
    const pollInterval = setInterval(loadMessages, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [prospectId, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  async function handleSend() {
    if (!input.trim() || !phone) return
    setSending(true)
    setError("")
    const messageText = input.trim()

    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectId, message: messageText, toNumber: phone }),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Error al enviar")
    } else {
      setInput("")
      // Optimistic update: agregar el mensaje devuelto por la API o uno temporal
      if (data.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev
          return [...prev, data.message as WaMessage]
        })
      } else {
        // Fallback: agregar mensaje temporal
        setMessages(prev => [...prev, {
          id: `temp-${Date.now()}`,
          direction: "outbound",
          content: messageText,
          status: "sent",
          created_at: new Date().toISOString(),
        }])
      }
    }

    setSending(false)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
        setRecordingTime(0)

        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm;codecs=opus" })
        if (audioBlob.size < 1000) return // ignorar grabaciones muy cortas

        setSending(true)
        setError("")

        const formData = new FormData()
        formData.append("audio", audioBlob, "audio.webm")
        formData.append("prospectId", prospectId)
        formData.append("toNumber", phone)

        const res = await fetch("/api/whatsapp/send-audio", { method: "POST", body: formData })
        const data = await res.json()
        console.log("[WhatsApp] send-audio response:", res.status, JSON.stringify(data))

        if (!res.ok) {
          setError(data.error || "Error enviando audio")
          console.error("[WhatsApp] send-audio error:", data)
        } else if (data.message) {
          setMessages(prev => {
            if (prev.some(m => m.id === data.message.id)) return prev
            return [...prev, data.message as WaMessage]
          })
        }
        setSending(false)
      }

      mediaRecorder.start(250)
      setRecording(true)
      setRecordingTime(0)
      recordingTimerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    } catch {
      setError("No se pudo acceder al micrófono")
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
  }

  function cancelRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.ondataavailable = null
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop())
      }
      mediaRecorderRef.current.stop()
    }
    audioChunksRef.current = []
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    setRecording(false)
    setRecordingTime(0)
  }

  function formatRecordingTime(seconds: number) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Max 16MB (WhatsApp limit)
    if (file.size > 16 * 1024 * 1024) {
      setError("El archivo es muy grande. Máximo 16MB.")
      return
    }
    setAttachedFile(file)
    setCaption("")
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file)
      setAttachPreview(url)
    } else if (file.type.startsWith("video/")) {
      const url = URL.createObjectURL(file)
      setAttachPreview(url)
    } else {
      setAttachPreview(null)
    }
    // Reset input so same file can be selected again
    e.target.value = ""
  }

  function cancelAttachment() {
    if (attachPreview) URL.revokeObjectURL(attachPreview)
    setAttachedFile(null)
    setAttachPreview(null)
    setCaption("")
  }

  async function sendAttachment() {
    if (!attachedFile || !phone) return
    setSending(true)
    setError("")

    const formData = new FormData()
    formData.append("file", attachedFile)
    formData.append("prospectId", prospectId)
    formData.append("toNumber", phone)
    if (caption.trim()) formData.append("caption", caption.trim())

    try {
      const res = await fetch("/api/whatsapp/send-media", { method: "POST", body: formData })
      const data = await res.json()
      console.log("[WhatsApp] send-media response:", res.status, JSON.stringify(data))

      if (!res.ok) {
        setError(data.error || "Error enviando archivo")
      } else if (data.message) {
        setMessages(prev => {
          if (prev.some(m => m.id === data.message.id)) return prev
          return [...prev, data.message as WaMessage]
        })
        cancelAttachment()
      }
    } catch {
      setError("Error enviando archivo")
    }
    setSending(false)
  }

  function getFileIcon(name: string) {
    const ext = name.split(".").pop()?.toLowerCase() || ""
    if (["pdf"].includes(ext)) return "📄"
    if (["doc", "docx"].includes(ext)) return "📝"
    if (["xls", "xlsx"].includes(ext)) return "📊"
    if (["ppt", "pptx"].includes(ext)) return "📑"
    if (["txt"].includes(ext)) return "📃"
    return "📎"
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  async function runAnalysis() {
    if (analyzing || messages.length === 0) return
    setAnalyzing(true)
    setAnalysis(null)
    setAnalysisInfo(null)
    setError("")
    try {
      const res = await fetch("/api/whatsapp/analyze-conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Error al analizar conversación")
      } else {
        setAnalysis(data.analysis)
        setAnalysisInfo({ messageCount: data.messageCount, audioTranscribed: data.audioTranscribed })
      }
    } catch {
      setError("Error al analizar conversación")
    }
    setAnalyzing(false)
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
        {/* Debug info - visible en dev */}
        {loadError && (
          <div className="mb-2 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
            <p className="font-semibold">Error cargando mensajes:</p>
            <p>{loadError}</p>
            <p className="mt-1">ProspectId: {prospectId}</p>
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "#25d366", borderTopColor: "transparent" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Cargando mensajes...</p>
          </div>
        ) : messages.length === 0 ? (
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
                    {msg.media_type === "audio" && msg.media_url ? (
                      <div className="px-3 py-2.5 rounded-2xl"
                        style={{
                          background: msg.direction === "outbound" ? "#25d366" : "var(--surface)",
                          borderRadius: msg.direction === "outbound" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          border: msg.direction === "inbound" ? "1px solid var(--border)" : "none",
                        }}>
                        <AudioBubble src={msg.media_url} outbound={msg.direction === "outbound"} />
                      </div>
                    ) : msg.media_type === "image" && msg.media_url ? (
                      <div className="rounded-2xl overflow-hidden"
                        style={{
                          background: msg.direction === "outbound" ? "#25d366" : "var(--surface)",
                          borderRadius: msg.direction === "outbound" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          border: msg.direction === "inbound" ? "1px solid var(--border)" : "none",
                        }}>
                        <img src={msg.media_url} alt="Imagen" className="max-w-[280px] max-h-[240px] object-cover cursor-pointer"
                          onClick={() => window.open(msg.media_url, "_blank")} />
                        {msg.content && msg.content !== "[Imagen]" && (
                          <p className="px-3 py-2 text-sm whitespace-pre-wrap"
                            style={{ color: msg.direction === "outbound" ? "white" : "var(--text-primary)" }}>
                            {msg.content}
                          </p>
                        )}
                      </div>
                    ) : msg.media_type === "video" && msg.media_url ? (
                      <div className="rounded-2xl overflow-hidden"
                        style={{
                          background: msg.direction === "outbound" ? "#25d366" : "var(--surface)",
                          borderRadius: msg.direction === "outbound" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          border: msg.direction === "inbound" ? "1px solid var(--border)" : "none",
                        }}>
                        <video controls preload="none" className="max-w-[280px] rounded-t-2xl">
                          <source src={msg.media_url} />
                        </video>
                        {msg.content && msg.content !== "[Video]" && (
                          <p className="px-3 py-2 text-sm whitespace-pre-wrap"
                            style={{ color: msg.direction === "outbound" ? "white" : "var(--text-primary)" }}>
                            {msg.content}
                          </p>
                        )}
                      </div>
                    ) : msg.media_type === "document" && msg.media_url ? (
                      <div className="px-3 py-2.5 rounded-2xl"
                        style={{
                          background: msg.direction === "outbound" ? "#25d366" : "var(--surface)",
                          borderRadius: msg.direction === "outbound" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                          border: msg.direction === "inbound" ? "1px solid var(--border)" : "none",
                        }}>
                        <a href={msg.media_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all"
                          style={{ background: msg.direction === "outbound" ? "rgba(255,255,255,0.15)" : "var(--surface-2)" }}>
                          <span className="text-2xl shrink-0">📄</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate"
                              style={{ color: msg.direction === "outbound" ? "white" : "var(--text-primary)" }}>
                              {msg.content && msg.content !== "[Documento]" ? msg.content : "Documento"}
                            </p>
                            <p className="text-xs" style={{ color: msg.direction === "outbound" ? "rgba(255,255,255,0.6)" : "var(--text-muted)" }}>
                              Toca para descargar
                            </p>
                          </div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                            stroke={msg.direction === "outbound" ? "rgba(255,255,255,0.7)" : "var(--text-muted)"} strokeWidth="2">
                            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </a>
                      </div>
                    ) : (
                    <div className="px-4 py-2.5 rounded-2xl text-sm"
                      style={{
                        background: msg.direction === "outbound" ? "#25d366" : "var(--surface)",
                        color: msg.direction === "outbound" ? "white" : "var(--text-primary)",
                        borderRadius: msg.direction === "outbound" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        border: msg.direction === "inbound" ? "1px solid var(--border)" : "none",
                      }}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                    )}
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/3gpp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
        onChange={handleFileSelect}
      />

      {/* File preview panel */}
      {attachedFile && (
        <div className="mb-2 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Archivo adjunto</span>
            <button onClick={cancelAttachment} className="text-xs" style={{ color: "var(--text-muted)" }}>✕</button>
          </div>
          <div className="p-3">
            {attachedFile.type.startsWith("image/") && attachPreview ? (
              <img src={attachPreview} alt="Preview" className="max-h-40 rounded-lg object-contain mx-auto" />
            ) : attachedFile.type.startsWith("video/") && attachPreview ? (
              <video src={attachPreview} controls className="max-h-40 rounded-lg mx-auto" />
            ) : (
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                <span className="text-2xl">{getFileIcon(attachedFile.name)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{attachedFile.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{formatFileSize(attachedFile.size)}</p>
                </div>
              </div>
            )}
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Agregar un mensaje... (opcional)"
              className="w-full mt-2 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); sendAttachment() } }}
            />
          </div>
          <div className="px-3 pb-3 flex justify-end">
            <button
              onClick={sendAttachment}
              disabled={!phone || sending}
              className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
              style={{ background: "#25d366", color: "white", opacity: sending ? 0.7 : 1 }}>
              {sending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              )}
              Enviar
            </button>
          </div>
        </div>
      )}

      {/* AI Analysis panel */}
      {analysis && (
        <div className="mb-2 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(108,99,255,0.3)", background: "var(--surface)" }}>
          <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(108,99,255,0.2)", background: "rgba(108,99,255,0.05)" }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "16px" }}>🧠</span>
              <span className="text-xs font-semibold" style={{ color: "var(--accent-light)" }}>Análisis IA de la conversación</span>
            </div>
            <div className="flex items-center gap-2">
              {analysisInfo && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {analysisInfo.messageCount} msgs{analysisInfo.audioTranscribed > 0 ? ` · ${analysisInfo.audioTranscribed} audios transcritos` : ""}
                </span>
              )}
              <button onClick={() => setAnalysis(null)} className="text-xs" style={{ color: "var(--text-muted)" }}>✕</button>
            </div>
          </div>
          <div className="p-3 max-h-64 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-secondary)" }}>
            {analysis}
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="flex gap-2 items-end">
        {/* Templates button */}
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          title="Mensajes generados"
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{ background: showTemplates ? "var(--accent)" : "var(--surface-2)", border: "1px solid var(--border)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={showTemplates ? "white" : "var(--text-secondary)"} strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </button>

        {/* Attach file button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          title="Adjuntar archivo"
          disabled={!!attachedFile || recording || sending}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)", opacity: (attachedFile || recording || sending) ? 0.5 : 1, cursor: "pointer", fontSize: "18px" }}>
          📎
        </button>

        {/* AI Analysis button */}
        <button
          onClick={runAnalysis}
          title="Análisis IA de la conversación"
          disabled={analyzing || messages.length === 0}
          className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all"
          style={{ background: analyzing ? "var(--accent)" : "var(--surface-2)", border: analyzing ? "1px solid var(--accent)" : "1px solid var(--border)", opacity: (analyzing || messages.length === 0) ? 0.6 : 1, cursor: "pointer", fontSize: "18px" }}>
          {analyzing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "🧠"
          )}
        </button>

        {recording ? (
          /* Recording UI */
          <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "var(--surface-2)", border: "1px solid rgba(239,68,68,0.4)" }}>
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-mono" style={{ color: "var(--text-primary)" }}>{formatRecordingTime(recordingTime)}</span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Grabando...</span>
            <div className="flex-1" />
            <button onClick={cancelRecording} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,0.1)" }} title="Cancelar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ) : (
          /* Text input */
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
        )}

        {/* Send or Record/Stop button */}
        {input.trim() ? (
          <button
            onClick={handleSend}
            disabled={!phone || sending}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all"
            style={{ background: "#25d366", opacity: sending ? 0.7 : 1 }}>
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        ) : (
          <button
            onClick={recording ? stopRecording : startRecording}
            disabled={!phone || sending}
            className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all"
            style={{ background: recording ? "#ef4444" : "#25d366", opacity: (!phone || sending) ? 0.5 : 1 }}>
            {sending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : recording ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white" stroke="none">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// Build cache bust: 2026-03-31-v2
