"use client"

import { useState, useEffect } from "react"

type VideoRecording = {
  id: string
  room_name: string
  duration: number
  recording_url: string | null
  transcript: string | null
  status: string
  created_at: string
}

type VideoAnalysis = {
  summary: string
  tone: string
  tone_explanation: string
  objections: string[]
  buying_signals: string[]
  pain_points: string[]
  next_step: string
  recommendation: string
  score: number
  score_reason: string
}

const toneColors: Record<string, string> = {
  positivo: "#22c55e",
  interesado: "#6c63ff",
  neutral: "#94a3b8",
  negativo: "#ef4444",
  resistente: "#f97316",
}

function formatDuration(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${String(sec).padStart(2, "0")}`
}

export default function VideoRecordings({ prospectId }: { prospectId: string }) {
  const [recordings, setRecordings] = useState<VideoRecording[]>([])
  const [analyses, setAnalyses] = useState<Record<string, VideoAnalysis>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/video/recordings?prospectId=${prospectId}`)
      .then(r => r.json())
      .then(data => {
        setRecordings(data.recordings || [])
        const map: Record<string, VideoAnalysis> = {}
        for (const a of data.analyses || []) map[a.video_recording_id] = a
        setAnalyses(map)
      })
      .finally(() => setLoading(false))
  }, [prospectId])

  if (loading) return null
  if (recordings.length === 0) return null

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
        Videollamadas grabadas
      </h3>
      <div className="flex flex-col gap-3">
        {recordings.map(rec => {
          const analysis = analyses[rec.id]
          const isExpanded = expanded === rec.id
          return (
            <div key={rec.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              {/* Header */}
              <div className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(108,99,255,0.15)" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2">
                    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Videollamada {new Date(rec.created_at).toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {rec.status === "processing" || rec.status === "transcribing"
                      ? "Procesando..."
                      : rec.duration ? formatDuration(rec.duration) : "—"}
                    {analysis && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "rgba(108,99,255,0.15)", color: "#a78bfa" }}>
                        Score: {analysis.score}/10
                      </span>
                    )}
                  </p>
                </div>
                {rec.status === "completed" && (
                  <button onClick={() => setExpanded(isExpanded ? null : rec.id)}
                    className="text-xs px-3 py-1.5 rounded-lg shrink-0"
                    style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    {isExpanded ? "Cerrar" : "Ver"}
                  </button>
                )}
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 flex flex-col gap-4" style={{ borderTop: "1px solid var(--border)" }}>
                  {/* Video player */}
                  {rec.recording_url && (
                    <div className="mt-4">
                      <video controls className="w-full rounded-xl" style={{ maxHeight: 240, background: "#000" }}>
                        <source src={`/api/video/media?url=${encodeURIComponent(rec.recording_url)}`} type="video/mp4" />
                      </video>
                    </div>
                  )}

                  {/* Análisis IA */}
                  {analysis && (
                    <div className="flex flex-col gap-3">
                      {/* Score */}
                      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "var(--surface)" }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0"
                          style={{ background: analysis.score >= 7 ? "rgba(34,197,94,0.15)" : analysis.score >= 5 ? "rgba(108,99,255,0.15)" : "rgba(239,68,68,0.15)",
                            color: analysis.score >= 7 ? "#22c55e" : analysis.score >= 5 ? "#a78bfa" : "#ef4444" }}>
                          {analysis.score}
                        </div>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Score de la llamada</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{analysis.score_reason}</p>
                        </div>
                      </div>

                      {/* Tono */}
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold capitalize"
                          style={{ background: `${toneColors[analysis.tone] || "#6c63ff"}22`, color: toneColors[analysis.tone] || "#6c63ff" }}>
                          {analysis.tone}
                        </span>
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>{analysis.tone_explanation}</span>
                      </div>

                      {/* Resumen */}
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Resumen</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{analysis.summary}</p>
                      </div>

                      {/* Grid: objeciones + señales */}
                      <div className="grid grid-cols-2 gap-2">
                        {analysis.objections?.length > 0 && (
                          <div className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)" }}>
                            <p className="text-xs font-semibold mb-2" style={{ color: "#ef4444" }}>Objeciones</p>
                            {analysis.objections.map((o, i) => (
                              <p key={i} className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>• {o}</p>
                            ))}
                          </div>
                        )}
                        {analysis.buying_signals?.length > 0 && (
                          <div className="p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.08)" }}>
                            <p className="text-xs font-semibold mb-2" style={{ color: "#22c55e" }}>Señales de compra</p>
                            {analysis.buying_signals.map((s, i) => (
                              <p key={i} className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>• {s}</p>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Próximo paso */}
                      <div className="p-3 rounded-xl" style={{ background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.2)" }}>
                        <p className="text-xs font-semibold mb-1" style={{ color: "#a78bfa" }}>Próximo paso</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{analysis.next_step}</p>
                      </div>

                      {/* Recomendación */}
                      <div>
                        <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Recomendación del agente</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{analysis.recommendation}</p>
                      </div>
                    </div>
                  )}

                  {/* Transcripción */}
                  {rec.transcript && (
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Transcripción</p>
                      <div className="p-3 rounded-xl text-xs max-h-40 overflow-y-auto" style={{ background: "var(--surface)", color: "var(--text-muted)", lineHeight: 1.6 }}>
                        {rec.transcript}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
