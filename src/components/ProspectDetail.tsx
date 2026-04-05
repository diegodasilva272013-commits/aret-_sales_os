"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Prospect, ProspectAnalysis, GeneratedMessage, FollowUp, FollowUpPhase } from "@/types"
import { parseAIScore, getScoreColor, getScoreBg, getScoreEmoji } from "@/lib/parseAIScore"
import BookCallModal from "./BookCallModal"
import WhatsAppChat from "./WhatsAppChat"
import VideoRecordings from "./VideoRecordings"

const STATUS_CONFIG = {
  nuevo: { label: "Nuevo", color: "#6c63ff", bg: "rgba(108,99,255,0.15)" },
  activo: { label: "Activo", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  pausado: { label: "Pausado", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  llamada_agendada: { label: "Llamada Agendada", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  cerrado_ganado: { label: "Cerrado ✓", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  cerrado_perdido: { label: "Cerrado ✗", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
}

const PHASE_CONFIG = {
  contacto: { label: "Contacto", color: "#6c63ff" },
  venta: { label: "Venta", color: "#f59e0b" },
  cierre: { label: "Cierre", color: "#22c55e" },
}

const FOLLOWUP_ORDER = [
  { num: 0, label: "Mensaje Inicial", phase: "contacto" as FollowUpPhase, type_no_resp: "inicial", type_resp: "inicial" },
  { num: 1, label: "Seguimiento 1", phase: "contacto" as FollowUpPhase, type_no_resp: "sin_respuesta", type_resp: "con_respuesta" },
  { num: 2, label: "Seguimiento 2", phase: "venta" as FollowUpPhase, type_no_resp: "sin_respuesta", type_resp: "sin_respuesta" },
  { num: 3, label: "Seguimiento 3", phase: "venta" as FollowUpPhase, type_no_resp: "sin_respuesta", type_resp: "sin_respuesta" },
  { num: 4, label: "Seguimiento 4", phase: "venta" as FollowUpPhase, type_no_resp: "sin_respuesta", type_resp: "con_respuesta" },
  { num: 5, label: "Seguimiento 5 / Cierre", phase: "cierre" as FollowUpPhase, type_no_resp: "sin_respuesta", type_resp: "con_respuesta" },
]

type Props = {
  prospect: Prospect & { profiles?: { full_name: string }; notes?: string }
  analysis: ProspectAnalysis | null
  messages: GeneratedMessage[]
  followUps: FollowUp[]
  currentUserId: string
  calendlyUrl?: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
      style={{ background: copied ? "rgba(34,197,94,0.15)" : "var(--surface-3)", color: copied ? "var(--success)" : "var(--text-secondary)" }}>
      {copied ? (
        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg> Copiado</>
      ) : (
        <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg> Copiar</>
      )}
    </button>
  )
}

function WhatsAppButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copyForWhatsApp() {
    // WhatsApp usa *negrita* y _cursiva_ — el texto ya está bien, solo copiamos
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`
  return (
    <div className="flex items-center gap-1.5">
      <button onClick={copyForWhatsApp} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{ background: copied ? "rgba(37,211,102,0.15)" : "rgba(37,211,102,0.1)", color: copied ? "#25d366" : "#25d366", border: "1px solid rgba(37,211,102,0.2)" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.116.554 4.103 1.523 5.824L.057 23.273a.75.75 0 0 0 .92.92l5.449-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.907 0-3.686-.523-5.204-1.43l-.374-.223-3.878 1.044 1.044-3.878-.223-.374A9.956 9.956 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
        </svg>
        {copied ? "¡Copiado!" : "Copiar para WhatsApp"}
      </button>
      <a href={waUrl} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{ background: "#25d366", color: "white" }}>
        Abrir en WhatsApp
      </a>
    </div>
  )
}

export default function ProspectDetail({ prospect, analysis, messages, followUps, currentUserId, calendlyUrl }: Props) {
  const [activeTab, setActiveTab] = useState<"mensajes" | "analisis" | "seguimiento" | "notas" | "whatsapp">("mensajes")
  const [showBookCall, setShowBookCall] = useState(false)
  const [calling, setCalling] = useState(false)
  const [callError, setCallError] = useState("")
  const [showCallModal, setShowCallModal] = useState(false)
  const [setterPhone, setSetterPhone] = useState("")
  const [videoLink, setVideoLink] = useState("")
  const [videoRoomName, setVideoRoomName] = useState("")
  const [creatingVideo, setCreatingVideo] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [localStatus, setLocalStatus] = useState(prospect.status)
  const [localFollowUps, setLocalFollowUps] = useState(followUps)
  const [respondedMap, setRespondedMap] = useState<Record<number, boolean>>({})
  const [localMessages, setLocalMessages] = useState(messages)
  const [regenerating, setRegenerating] = useState(false)
  const [notes, setNotes] = useState(prospect.notes || "")
  const [savingNotes, setSavingNotes] = useState(false)
  const [savedNotes, setSavedNotes] = useState(false)
  const [audioUrl, setAudioUrl] = useState((prospect as { audio_url?: string }).audio_url || "")
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()
  const supabase = createClient()

  function getMessageForStep(stepNum: number, responded: boolean) {
    const step = FOLLOWUP_ORDER[stepNum]
    if (!step) return null
    const type = responded ? step.type_resp : step.type_no_resp
    return localMessages.find(m => m.follow_up_number === stepNum && m.message_type === type)
      || localMessages.find(m => m.follow_up_number === stepNum)
  }

  async function exportPDF() {
    const { default: jsPDF } = await import("jspdf")
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })

    const purple = [108, 99, 255] as [number, number, number]
    const dark = [10, 10, 15] as [number, number, number]
    const light = [240, 240, 255] as [number, number, number]
    const muted = [90, 90, 122] as [number, number, number]

    // Fondo
    doc.setFillColor(...dark)
    doc.rect(0, 0, 210, 297, "F")

    // Header
    doc.setFillColor(...purple)
    doc.rect(0, 0, 210, 35, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text(prospect.full_name, 15, 18)
    doc.setFontSize(10)
    doc.setFont("helvetica", "normal")
    doc.text(`${prospect.headline} · ${prospect.company} · ${prospect.location}`, 15, 27)

    let y = 50

    const section = (title: string, content: string) => {
      if (y > 260) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, 210, 297, "F"); y = 20 }
      doc.setFillColor(17, 17, 24)
      doc.roundedRect(10, y - 5, 190, 8, 2, 2, "F")
      doc.setTextColor(...purple)
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.text(title.toUpperCase(), 15, y)
      y += 8
      doc.setTextColor(...light)
      doc.setFontSize(9)
      doc.setFont("helvetica", "normal")
      const lines = doc.splitTextToSize(content || "—", 180)
      doc.text(lines, 15, y)
      y += lines.length * 5 + 8
    }

    if (analysis) {
      doc.setTextColor(...muted)
      doc.setFontSize(8)
      doc.text(`DISC: ${analysis.disc_type}`, 15, y)
      y += 10
      section("Perfil Psicológico", analysis.psychological_profile)
      section("Estilo de Comunicación", analysis.communication_style)
      section("Análisis de Empresa", analysis.company_analysis)
      section("Ángulo de Venta", analysis.sales_angle)
      section("Pain Points", (analysis.pain_points || []).map((p, i) => `${i+1}. ${p}`).join("\n"))
    }

    // Mensajes
    if (localMessages.length > 0) {
      if (y > 240) { doc.addPage(); doc.setFillColor(...dark); doc.rect(0, 0, 210, 297, "F"); y = 20 }
      doc.setTextColor(...purple)
      doc.setFontSize(11)
      doc.setFont("helvetica", "bold")
      doc.text("MENSAJES GENERADOS", 15, y)
      y += 10
      localMessages.slice(0, 4).forEach(msg => {
        section(`Follow-up #${msg.follow_up_number} (${msg.message_type})`, msg.content)
      })
    }

    doc.save(`${prospect.full_name.replace(/ /g, "_")}_analisis.pdf`)
  }

  async function handleRegenerate() {
    if (!confirm("¿Regenerar todos los mensajes con IA? Se reemplazarán los actuales.")) return
    setRegenerating(true)
    try {
      const res = await fetch("/api/analyze/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: prospect.id }),
      })
      const data = await res.json()
      if (res.ok && data.messages) setLocalMessages(data.messages)
      else alert("Error regenerando mensajes")
    } finally {
      setRegenerating(false)
    }
  }

  async function saveNotes() {
    setSavingNotes(true)
    await supabase.from("prospects").update({ notes }).eq("id", prospect.id)
    setSavingNotes(false)
    setSavedNotes(true)
    setTimeout(() => setSavedNotes(false), 2000)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      chunksRef.current = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: "audio/webm" })
        await sendAudioForTranscription(blob)
      }
      recorder.start()
      mediaRecorderRef.current = recorder
      setRecording(true)
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      alert("No se pudo acceder al micrófono")
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    if (timerRef.current) clearInterval(timerRef.current)
    setRecording(false)
    setTranscribing(true)
  }

  async function sendAudioForTranscription(blob: Blob) {
    const form = new FormData()
    form.append("audio", blob, "audio.webm")
    form.append("prospectId", prospect.id)
    try {
      const res = await fetch("/api/notes/transcribe", { method: "POST", body: form })
      const data = await res.json()
      if (data.notes) setNotes(data.notes)
      if (data.audioUrl) setAudioUrl(data.audioUrl)
    } catch {
      alert("Error transcribiendo el audio")
    } finally {
      setTranscribing(false)
    }
  }

  function formatSeconds(s: number) {
    return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`
  }

  async function markSent(stepNum: number) {
    const phase = FOLLOWUP_ORDER[stepNum]?.phase || "contacto"
    const { data } = await supabase.from("follow_ups").insert({
      prospect_id: prospect.id,
      follow_up_number: stepNum,
      phase,
      status: "enviado",
      prospect_responded: false,
      setter_id: currentUserId,
      sent_at: new Date().toISOString(),
    }).select("*, profiles!setter_id(*)").single()

    if (data) setLocalFollowUps(prev => [...prev, data])

    // Update prospect
    await supabase.from("prospects").update({
      follow_up_count: stepNum + 1,
      status: "activo",
      last_contact_at: new Date().toISOString(),
      phase,
    }).eq("id", prospect.id)
  }

  async function markResponded(followUpId: string, stepNum: number, responded: boolean) {
    await supabase.from("follow_ups").update({
      status: responded ? "respondido" : "sin_respuesta",
      prospect_responded: responded,
    }).eq("id", followUpId)

    setLocalFollowUps(prev => prev.map(f => f.id === followUpId ? { ...f, status: responded ? "respondido" : "sin_respuesta", prospect_responded: responded } : f))
    setRespondedMap(prev => ({ ...prev, [stepNum]: responded }))
  }

  async function handleVideoCall() {
    setCreatingVideo(true)
    try {
      const res = await fetch("/api/video/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: prospect.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setVideoLink(data.prospectLink)
      setVideoRoomName(data.roomName)
      setShowVideoModal(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al crear videollamada")
    } finally {
      setCreatingVideo(false)
    }
  }

  async function handleCall() {
    const toNumber = (prospect as { whatsapp_number?: string; phone?: string }).whatsapp_number
    if (!toNumber || !setterPhone) return
    setCalling(true)
    setCallError("")
    try {
      const res = await fetch("/api/calls/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: prospect.id, toNumber, fromNumber: setterPhone }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al iniciar llamada")
      setShowCallModal(false)
      alert("¡Llamada iniciada! Te llamamos ahora a tu teléfono.")
    } catch (err: unknown) {
      setCallError(err instanceof Error ? err.message : "Error")
    } finally {
      setCalling(false)
    }
  }

  async function updateStatus(status: string) {
    setUpdatingStatus(true)
    await supabase.from("prospects").update({ status }).eq("id", prospect.id)
    setLocalStatus(status as typeof localStatus)
    setUpdatingStatus(false)
  }

  const statusCfg = STATUS_CONFIG[localStatus]
  const aiScore = parseAIScore(prospect.notes)

  return (
    <>
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
                <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{prospect.full_name}</h1>
                <span className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: statusCfg.bg, color: statusCfg.color }}>
                  {statusCfg.label}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: "var(--surface-2)", color: PHASE_CONFIG[prospect.phase]?.color || "var(--text-secondary)" }}>
                  Fase: {PHASE_CONFIG[prospect.phase]?.label}
                </span>
              </div>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>{prospect.headline}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>🏢 {prospect.company}</span>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>📍 {prospect.location}</span>
                <a href={prospect.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs flex items-center gap-1 hover:underline" style={{ color: "var(--accent-light)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                    <rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" />
                  </svg>
                  Ver LinkedIn
                </a>
              </div>
            </div>
          </div>

          {/* PDF + Status */}
          <div className="flex items-center gap-2">
          <button onClick={exportPDF}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            PDF
          </button>
          <button onClick={() => setShowCallModal(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.86a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            Llamar
          </button>
          <button onClick={handleVideoCall} disabled={creatingVideo}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "rgba(108,99,255,0.15)", border: "1px solid rgba(108,99,255,0.3)", color: "#a78bfa" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
            {creatingVideo ? "Creando..." : "Videollamar"}
          </button>
          <button onClick={() => setShowBookCall(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Agendar llamada
          </button>
          {/* Status selector */}
          <select
            value={localStatus}
            onChange={e => updateStatus(e.target.value)}
            disabled={updatingStatus}
            className="px-4 py-2 rounded-xl text-sm outline-none cursor-pointer"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
          </div>
        </div>

        {/* DISC badge if analysis */}
        {analysis?.disc_type && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-4 animate-fade-in"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="px-4 py-2 rounded-xl font-bold text-lg" style={{ background: "var(--accent-glow)", color: "var(--accent-light)" }}>
              {analysis.disc_type}
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Perfil DISC detectado</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                Follow-up #{prospect.follow_up_count} · Asignado a {(prospect as { profiles?: { full_name: string } }).profiles?.full_name || "vos"}
              </p>
            </div>
            {analysis.key_words?.slice(0, 4).map(kw => (
              <span key={kw} className="px-2 py-1 rounded-lg text-xs" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                {kw}
              </span>
            ))}
          </div>
        )}

        {/* AI Lead Score card — from arete-web agent */}
        {aiScore && (
          <div className="mb-6 rounded-2xl overflow-hidden animate-fade-in"
            style={{ border: `1px solid ${getScoreColor(aiScore.score)}40` }}>
            <div className="px-5 py-3 flex items-center justify-between"
              style={{ background: getScoreBg(aiScore.score) }}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{getScoreEmoji(aiScore.score)}</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                    Lead Score AI: <span style={{ color: getScoreColor(aiScore.score) }}>{aiScore.score}/{aiScore.maxScore}</span>
                  </p>
                  <p className="text-xs capitalize" style={{ color: getScoreColor(aiScore.score) }}>{aiScore.label}</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ background: getScoreBg(aiScore.score), color: getScoreColor(aiScore.score), border: `1px solid ${getScoreColor(aiScore.score)}30` }}>
                Agente AI
              </span>
            </div>
            <div className="px-5 py-4" style={{ background: "var(--surface)" }}>
              <div className="grid grid-cols-4 gap-4 mb-4">
                {[
                  { label: "Urgencia", value: aiScore.urgencia, max: 25 },
                  { label: "Presupuesto", value: aiScore.presupuesto, max: 25 },
                  { label: "Fit", value: aiScore.fit, max: 25 },
                  { label: "Engagement", value: aiScore.engagement, max: 25 },
                ].map(dim => (
                  <div key={dim.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--text-secondary)" }}>{dim.label}</span>
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{dim.value}/{dim.max}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full" style={{ background: "var(--surface-2)" }}>
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${(dim.value / dim.max) * 100}%`,
                        background: dim.value >= 20 ? "#22c55e" : dim.value >= 15 ? "#f59e0b" : "#6b7280",
                      }} />
                    </div>
                  </div>
                ))}
              </div>
              {aiScore.motivo && (
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  💡 {aiScore.motivo}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--surface)" }}>
            {(["mensajes", "analisis", "seguimiento", "notas", "whatsapp"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-5 py-2 rounded-lg text-sm font-medium capitalize transition-all"
                style={{
                  background: activeTab === tab ? (tab === "whatsapp" ? "#25d366" : "var(--accent)") : "transparent",
                  color: activeTab === tab ? "white" : "var(--text-secondary)",
                }}>
                {tab === "mensajes" ? "✉️ Mensajes" : tab === "analisis" ? "🧠 Análisis" : tab === "seguimiento" ? "📊 Seguimiento" : tab === "notas" ? "📝 Notas" : "💬 WhatsApp"}
              </button>
            ))}
          </div>
          {activeTab === "mensajes" && (
            <button onClick={handleRegenerate} disabled={regenerating}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              {regenerating ? (
                <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              )}
              {regenerating ? "Regenerando..." : "Regenerar mensajes"}
            </button>
          )}
        </div>

        {/* TAB: MENSAJES */}
        {activeTab === "mensajes" && (
          <div className="space-y-4 animate-fade-in">
            {FOLLOWUP_ORDER.map(step => {
              const prevFollowUp = localFollowUps.find(f => f.follow_up_number === step.num - 1)
              const prevResponded = step.num === 0 ? false : (respondedMap[step.num - 1] ?? prevFollowUp?.prospect_responded ?? false)
              const msg = getMessageForStep(step.num, step.num > 0 ? prevResponded : false)
              const thisFollowUp = localFollowUps.find(f => f.follow_up_number === step.num)
              const isSent = !!thisFollowUp
              const phaseCfg = PHASE_CONFIG[step.phase]

              return (
                <div key={step.num} className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between px-5 py-3"
                    style={{ background: "var(--surface)" }}>
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ background: isSent ? "rgba(34,197,94,0.15)" : "var(--surface-2)", color: isSent ? "var(--success)" : "var(--text-muted)" }}>
                        {isSent ? "✓" : step.num + 1}
                      </span>
                      <div>
                        <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{step.label}</span>
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
                          style={{ background: `${phaseCfg.color}20`, color: phaseCfg.color }}>
                          {phaseCfg.label}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSent && !thisFollowUp.prospect_responded && thisFollowUp.status !== "sin_respuesta" && (
                        <>
                          <button onClick={() => markResponded(thisFollowUp.id, step.num, true)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{ background: "rgba(34,197,94,0.15)", color: "var(--success)" }}>
                            ✓ Respondió
                          </button>
                          <button onClick={() => markResponded(thisFollowUp.id, step.num, false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                            style={{ background: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
                            ✗ Sin respuesta
                          </button>
                        </>
                      )}
                      {isSent && (
                        <span className="text-xs px-2 py-1 rounded-lg"
                          style={{
                            background: thisFollowUp.prospect_responded ? "rgba(34,197,94,0.15)" : thisFollowUp.status === "sin_respuesta" ? "rgba(239,68,68,0.1)" : "var(--surface-2)",
                            color: thisFollowUp.prospect_responded ? "var(--success)" : thisFollowUp.status === "sin_respuesta" ? "var(--danger)" : "var(--text-muted)",
                          }}>
                          {thisFollowUp.prospect_responded ? "Respondió" : thisFollowUp.status === "sin_respuesta" ? "Sin respuesta" : "Enviado"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-5" style={{ background: "var(--surface-2)" }}>
                    {msg ? (
                      <>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3" style={{ color: "var(--text-primary)" }}>
                          {msg.content}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CopyButton text={msg.content} />
                          <WhatsAppButton text={msg.content} />
                          {!isSent && (
                            <button onClick={() => markSent(step.num)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{ background: "var(--accent-glow)", color: "var(--accent-light)", border: "1px solid rgba(108,99,255,0.3)" }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Marcar como enviado
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        Mensaje no disponible para esta combinación
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* TAB: ANÁLISIS */}
        {activeTab === "analisis" && analysis && (
          <div className="space-y-4 animate-fade-in">
            {/* Psych Profile */}
            <div className="p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                🧠 Perfil Psicológico
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{analysis.psychological_profile}</p>
            </div>

            {/* Communication */}
            <div className="p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>💬 Estilo de Comunicación</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-secondary)" }}>{analysis.communication_style}</p>
              <div className="flex flex-wrap gap-2">
                {analysis.key_words?.map(kw => (
                  <span key={kw} className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{ background: "var(--accent-glow)", color: "var(--accent-light)", border: "1px solid rgba(108,99,255,0.2)" }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>

            {/* Company + Sales */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>🏢 Análisis de Empresa</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{analysis.company_analysis}</p>
              </div>
              <div className="p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>🎯 Ángulo de Venta</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{analysis.sales_angle}</p>
              </div>
            </div>

            {/* Pain Points */}
            <div className="p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-semibold mb-3" style={{ color: "var(--text-primary)" }}>🔑 Pain Points Detectados</h3>
              <div className="space-y-2">
                {analysis.pain_points?.map((pp, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: "var(--surface-2)" }}>
                    <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "var(--danger)" }}>
                      {i + 1}
                    </span>
                    <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{pp}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: NOTAS */}
        {activeTab === "notas" && (
          <div className="animate-fade-in space-y-4">

            {/* Grabador de audio */}
            <div className="p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>🎙️ Nota de voz</h3>
              <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
                Grabá una nota de voz — se transcribe automáticamente con IA y se agrega al texto.
              </p>

              <div className="flex items-center gap-4">
                {!recording && !transcribing ? (
                  <button onClick={startRecording}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", color: "white" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="8" />
                    </svg>
                    Grabar nota de voz
                  </button>
                ) : recording ? (
                  <button onClick={stopRecording}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                    <span className="w-3 h-3 rounded-sm" style={{ background: "#ef4444" }} />
                    Detener — {formatSeconds(recordingSeconds)}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-5 py-3 rounded-xl"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                    <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" style={{ color: "var(--accent)" }} />
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Transcribiendo con IA...</span>
                  </div>
                )}

                {recording && (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#ef4444" }} />
                    <span className="text-sm font-mono" style={{ color: "#ef4444" }}>{formatSeconds(recordingSeconds)}</span>
                  </div>
                )}
              </div>

              {/* Reproductor del último audio */}
              {audioUrl && !recording && !transcribing && (
                <div className="mt-4 p-3 rounded-xl" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>Última nota grabada:</p>
                  <audio controls src={audioUrl} className="w-full h-8" style={{ colorScheme: "dark" }} />
                </div>
              )}
            </div>

            {/* Notas de texto */}
            <div className="p-6 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>📝 Notas de texto</h3>
              <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
                Las transcripciones de voz se agregan acá automáticamente. También podés escribir directo.
              </p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={10}
                placeholder="Ej: Habló de ampliar equipo en Q2, interesado en automatización de RRHH..."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all mb-4"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)", resize: "vertical" }}
                onFocus={e => e.target.style.borderColor = "var(--accent)"}
                onBlur={e => e.target.style.borderColor = "var(--border)"}
              />
              <button onClick={saveNotes} disabled={savingNotes}
                className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: savedNotes ? "rgba(34,197,94,0.2)" : "linear-gradient(135deg, var(--accent), #7c3aed)",
                  color: savedNotes ? "var(--success)" : "white",
                }}>
                {savingNotes ? "Guardando..." : savedNotes ? "✓ Guardado" : "Guardar notas"}
              </button>
            </div>
          </div>
        )}

        {/* TAB: SEGUIMIENTO */}
        {activeTab === "seguimiento" && (
          <div className="animate-fade-in">
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "var(--surface)" }}>
                    {["#", "Mensaje", "Fase", "Estado", "Respuesta", "Fecha", "Setter"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                        style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FOLLOWUP_ORDER.map(step => {
                    const fu = localFollowUps.find(f => f.follow_up_number === step.num)
                    const phaseCfg = PHASE_CONFIG[step.phase]
                    return (
                      <tr key={step.num} style={{ borderBottom: "1px solid var(--border)", background: fu ? "var(--surface)" : "var(--surface-2)" }}>
                        <td className="px-4 py-4">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                            style={{ background: fu ? "rgba(34,197,94,0.15)" : "var(--surface-3)", color: fu ? "var(--success)" : "var(--text-muted)" }}>
                            {fu ? "✓" : step.num + 1}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm" style={{ color: "var(--text-primary)" }}>{step.label}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 rounded-full text-xs" style={{ background: `${phaseCfg.color}20`, color: phaseCfg.color }}>
                            {phaseCfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {fu ? (
                            <span className="px-2 py-1 rounded-full text-xs"
                              style={{
                                background: fu.status === "respondido" ? "rgba(34,197,94,0.15)" : fu.status === "sin_respuesta" ? "rgba(239,68,68,0.1)" : "rgba(108,99,255,0.15)",
                                color: fu.status === "respondido" ? "var(--success)" : fu.status === "sin_respuesta" ? "var(--danger)" : "var(--accent-light)",
                              }}>
                              {fu.status === "respondido" ? "Respondió" : fu.status === "sin_respuesta" ? "Sin respuesta" : "Enviado"}
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Pendiente</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {fu ? (
                            <span className={cn("text-xs font-medium", fu.prospect_responded ? "text-green-400" : "text-red-400")}>
                              {fu.prospect_responded ? "✓ Sí" : "✗ No"}
                            </span>
                          ) : <span className="text-xs" style={{ color: "var(--text-muted)" }}>—</span>}
                        </td>
                        <td className="px-4 py-4 text-xs" style={{ color: "var(--text-muted)" }}>
                          {fu?.sent_at ? new Date(fu.sent_at).toLocaleDateString("es-AR") : "—"}
                        </td>
                        <td className="px-4 py-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                          {(fu as FollowUp & { profiles?: { full_name: string } })?.profiles?.full_name || "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB: WHATSAPP */}
        {activeTab === "whatsapp" && (
          <div className="animate-fade-in">
            <div className="rounded-2xl p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <WhatsAppChat
                prospectId={prospect.id}
                prospectName={prospect.full_name}
                whatsappNumber={(prospect as { whatsapp_number?: string }).whatsapp_number}
              />
            </div>
          </div>
        )}
      </div>
    </div>

    {showCallModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}
        onClick={() => setShowCallModal(false)}>
        <div className="w-full max-w-sm rounded-2xl p-6 animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.86a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div>
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>Llamar a {prospect.full_name}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {(prospect as { whatsapp_number?: string }).whatsapp_number || "Sin número guardado"}
              </p>
            </div>
          </div>

          <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
            Primero te llamamos a vos, después conectamos con el prospecto. La llamada se graba automáticamente.
          </p>

          <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Tu número de teléfono
            </label>
            <input
              value={setterPhone}
              onChange={e => setSetterPhone(e.target.value)}
              placeholder="+54 9 11 1234 5678"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>

          {callError && (
            <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              {callError}
            </p>
          )}

          {!(prospect as { whatsapp_number?: string }).whatsapp_number && (
            <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b" }}>
              El prospecto no tiene número guardado. Agregalo en el tab WhatsApp primero.
            </p>
          )}

          <button onClick={handleCall}
            disabled={calling || !setterPhone || !(prospect as { whatsapp_number?: string }).whatsapp_number}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: "rgba(34,197,94,0.8)", color: "white" }}>
            {calling ? "Iniciando llamada..." : "Llamar ahora"}
          </button>
        </div>
      </div>
    )}

    <VideoRecordings prospectId={prospect.id} />

    {showVideoModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
        <div className="rounded-2xl p-6 w-full max-w-md" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(108,99,255,0.15)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
              </svg>
            </div>
            <div>
              <p className="font-bold" style={{ color: "var(--text-primary)" }}>Videollamada lista</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Compartí el link con {prospect.full_name}</p>
            </div>
          </div>

          <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <p className="text-xs flex-1 truncate" style={{ color: "var(--text-secondary)" }}>{videoLink}</p>
            <button onClick={() => { navigator.clipboard.writeText(videoLink); alert("¡Link copiado!") }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
              style={{ background: "var(--accent)", color: "white" }}>
              Copiar
            </button>
          </div>

          <a href={`https://wa.me/${(prospect as any).whatsapp_number?.replace(/\D/g,"")}?text=${encodeURIComponent(`Hola ${prospect.full_name}! Te comparto el link para nuestra videollamada: ${videoLink}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mb-3"
            style={{ background: "rgba(37,211,102,0.85)", color: "white", display: "flex" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Enviar por WhatsApp
          </a>

          <button onClick={() => { window.open(`/videollamada/${videoRoomName}`, "_blank"); setShowVideoModal(false) }}
            className="w-full py-3 rounded-xl font-semibold text-sm mb-2"
            style={{ background: "linear-gradient(135deg, #6c63ff, #7c3aed)", color: "white" }}>
            Unirme a la llamada
          </button>

          <button onClick={() => setShowVideoModal(false)}
            className="w-full py-2 rounded-xl text-sm" style={{ color: "var(--text-muted)" }}>
            Cerrar
          </button>
        </div>
      </div>
    )}

    {showBookCall && (
      <BookCallModal
        prospectId={prospect.id}
        prospectName={prospect.full_name}
        calendlyUrl={calendlyUrl}
        onClose={() => setShowBookCall(false)}
        onBooked={() => {
          setShowBookCall(false)
          setLocalStatus("llamada_agendada")
        }}
      />
    )}
    </>
  )
}
