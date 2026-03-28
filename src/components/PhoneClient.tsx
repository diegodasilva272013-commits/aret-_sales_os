"use client"

import { useState } from "react"
import SoftPhone from "./SoftPhone"
import CallAnalysis from "./CallAnalysis"

type Prospect = {
  id: string
  full_name: string
  company: string
  whatsapp_number?: string
  status?: string
}

type Recording = {
  id: string
  recording_url?: string
  duration_seconds: number
  status: string
  created_at: string
  call_sid?: string
  transcript?: string
  prospects?: Prospect | null
  profiles?: { full_name: string } | null
}

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  })
}

export default function PhoneClient({ recordings, prospects }: { recordings: Recording[]; prospects: Prospect[] }) {
  const [myPhone, setMyPhone] = useState("")
  const [calling, setCalling] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  async function handleCall() {
    if (!myPhone) return
    setCalling(true)
    setError("")
    setSuccess(false)
    try {
      const res = await fetch("/api/calls/outbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromNumber: myPhone, toNumber: myPhone, prospectId: null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error")
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error")
    } finally {
      setCalling(false)
    }
  }

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--background)" }}>
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Llamadas</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Llamá a tus prospectos y accedé a las grabaciones</p>
        </div>

        <div className="grid grid-cols-5 gap-6">

          {/* Panel izquierdo */}
          <div className="col-span-2">
            <div className="mb-4">
              <SoftPhone />
            </div>
            <div className="rounded-2xl overflow-hidden sticky top-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

              <div className="p-5 border-b" style={{ borderColor: "var(--border)" }}>
                <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>Nueva llamada</h2>

                <div className="mb-4">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                    Número a llamar
                  </label>
                  <input
                    value={myPhone}
                    onChange={e => setMyPhone(e.target.value)}
                    placeholder="+5493454100816"
                    className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                    style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                  />
                </div>

                {error && (
                  <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
                    {error}
                  </p>
                )}
                {success && (
                  <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>
                    ¡Llamada iniciada! Tu teléfono va a sonar ahora.
                  </p>
                )}

                <button
                  onClick={handleCall}
                  disabled={calling || !myPhone}
                  className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  style={{ background: "rgba(34,197,94,0.85)", color: "white" }}>
                  {calling ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Llamando...</>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.86a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                      </svg>
                      Llamar ahora
                    </>
                  )}
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 divide-x" style={{ borderColor: "var(--border)" }}>
                {[
                  { label: "Total", value: recordings.length, color: "#6c63ff" },
                  { label: "Completadas", value: recordings.filter(r => r.status === "completed").length, color: "#22c55e" },
                  { label: "Grabadas", value: recordings.filter(r => r.recording_url).length, color: "#3b82f6" },
                ].map(s => (
                  <div key={s.label} className="p-4 text-center">
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panel derecho — historial */}
          <div className="col-span-3">
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="px-6 py-4" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Historial de grabaciones</h2>
              </div>

              {!recordings.length ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ background: "var(--surface-2)" }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: "rgba(108,99,255,0.1)" }}>📞</div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Sin llamadas todavía</p>
                </div>
              ) : (
                <div style={{ background: "var(--surface-2)" }}>
                  {recordings.map((rec, i) => {
                    const prospect = rec.prospects
                    const setter = rec.profiles
                    return (
                      <div key={rec.id} style={{ borderBottom: i < recordings.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div className="px-6 py-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold"
                            style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                            {prospect?.full_name?.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase() || "?"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <a href={`/prospects/${prospect?.id}`}
                                className="text-sm font-semibold hover:underline" style={{ color: "var(--text-primary)" }}>
                                {prospect?.full_name || "Desconocido"}
                              </a>
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{prospect?.company || ""}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(rec.created_at)}</span>
                              {setter?.full_name && <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {setter.full_name}</span>}
                              {rec.duration_seconds > 0 && <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {formatDuration(rec.duration_seconds)}</span>}
                            </div>
                          </div>

                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
                            style={{
                              background: rec.status === "completed" ? "rgba(34,197,94,0.15)" : "rgba(245,158,11,0.15)",
                              color: rec.status === "completed" ? "#22c55e" : "#f59e0b",
                            }}>
                            {rec.status === "completed" ? "Completada" : rec.status}
                          </span>

                          {rec.recording_url && (
                            <audio controls src={`/api/calls/audio?url=${encodeURIComponent(rec.recording_url)}`} className="h-8 shrink-0" style={{ maxWidth: "200px" }} />
                          )}
                        </div>
                        {rec.transcript && (
                          <div className="mx-6 mb-3 px-4 py-3 rounded-xl text-xs leading-relaxed"
                            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                            <span className="font-semibold block mb-1" style={{ color: "var(--text-muted)" }}>Transcripción</span>
                            {rec.transcript}
                          </div>
                        )}
                        <CallAnalysis recordingId={rec.id} transcript={rec.transcript} />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
