"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"

type Analysis = {
  id: string
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

const TONE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  muy_interesado: { label: "Muy interesado", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  interesado:     { label: "Interesado",     color: "#86efac", bg: "rgba(134,239,172,0.12)" },
  neutral:        { label: "Neutral",         color: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
  dudoso:         { label: "Dudoso",          color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  frio:           { label: "Frío",            color: "#60a5fa", bg: "rgba(96,165,250,0.12)" },
  hostil:         { label: "Hostil",          color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
}

export default function CallAnalysis({ recordingId, transcript }: { recordingId: string; transcript?: string }) {
  const supabase = createClient()
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase.from("call_analyses")
      .select("*")
      .eq("call_recording_id", recordingId)
      .single()
      .then(({ data }) => { if (data) setAnalysis(data as Analysis) })
  }, [recordingId])

  async function analyze() {
    setLoading(true)
    setOpen(true)
    const res = await fetch("/api/calls/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordingId }),
    })
    const data = await res.json()
    if (data.analysis) setAnalysis(data.analysis)
    setLoading(false)
  }

  const tone = analysis ? (TONE_CONFIG[analysis.tone] || TONE_CONFIG.neutral) : null

  return (
    <div className="mx-6 mb-3">
      {!analysis ? (
        <button onClick={analyze} disabled={!transcript || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-40"
          style={{ background: "rgba(108,99,255,0.12)", color: "var(--accent-light)", border: "1px solid rgba(108,99,255,0.2)" }}>
          {loading ? (
            <><div className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent-light)" }} /> Analizando con IA...</>
          ) : (
            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> Analizar llamada con IA</>
          )}
        </button>
      ) : (
        <div>
          <button onClick={() => setOpen(!open)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold mb-2 transition-all"
            style={{ background: "rgba(108,99,255,0.12)", color: "var(--accent-light)", border: "1px solid rgba(108,99,255,0.2)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
            Análisis IA {open ? "▲" : "▼"}
          </button>

          {open && (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>

              {/* Score + Tono */}
              <div className="p-4 flex items-center gap-4 border-b" style={{ borderColor: "var(--border)" }}>
                <div className="text-center">
                  <div className="text-3xl font-bold" style={{ color: analysis.score >= 7 ? "#22c55e" : analysis.score >= 4 ? "#f59e0b" : "#ef4444" }}>
                    {analysis.score}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>/ 10</div>
                </div>
                <div className="w-px h-10" style={{ background: "var(--border)" }} />
                {tone && (
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold" style={{ background: tone.bg, color: tone.color }}>
                    {tone.label}
                  </span>
                )}
                <p className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{analysis.tone_explanation}</p>
              </div>

              <div className="p-4 space-y-4">

                {/* Resumen */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>Resumen</p>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{analysis.summary}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Objeciones */}
                  {analysis.objections?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#f59e0b" }}>Objeciones</p>
                      <ul className="space-y-1">
                        {analysis.objections.map((o, i) => (
                          <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}>
                            <span style={{ color: "#f59e0b" }}>•</span> {o}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Señales de compra */}
                  {analysis.buying_signals?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#22c55e" }}>Señales de compra</p>
                      <ul className="space-y-1">
                        {analysis.buying_signals.map((s, i) => (
                          <li key={i} className="text-xs flex items-start gap-1.5" style={{ color: "var(--text-secondary)" }}>
                            <span style={{ color: "#22c55e" }}>✓</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Próximo paso */}
                {analysis.next_step && (
                  <div className="rounded-xl p-3" style={{ background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.15)" }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: "var(--accent-light)" }}>Próximo paso recomendado</p>
                    <p className="text-sm" style={{ color: "var(--text-primary)" }}>{analysis.next_step}</p>
                  </div>
                )}

                {/* Recomendación para el closer */}
                {analysis.recommendation && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--text-muted)" }}>Recomendación para el closer</p>
                    <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{analysis.recommendation}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
