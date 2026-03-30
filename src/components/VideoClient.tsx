"use client"

import { useState } from "react"

type Prospect = { id: string; full_name: string; company: string | null }

type Recording = {
  id: string
  room_name: string
  duration: number | null
  recording_url: string | null
  transcript: string | null
  status: string
  created_at: string
  prospect_id: string | null
}

type Analysis = {
  video_recording_id: string
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
  positivo: "#22c55e", interesado: "#6c63ff", neutral: "#94a3b8", negativo: "#ef4444", resistente: "#f97316",
}

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function VideoClient({ recordings, analyses, prospects }: {
  recordings: Recording[]
  analyses: Analysis[]
  prospects: Prospect[]
}) {
  const [search, setSearch] = useState("")
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [creating, setCreating] = useState(false)
  const [videoLink, setVideoLink] = useState("")
  const [videoRoomName, setVideoRoomName] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filterProspect, setFilterProspect] = useState<string | null>(null)

  const analysisMap = Object.fromEntries(analyses.map(a => [a.video_recording_id, a]))
  const prospectMap = Object.fromEntries(prospects.map(p => [p.id, p]))

  const filteredProspects = prospects.filter(p =>
    p.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.company || "").toLowerCase().includes(search.toLowerCase())
  ).slice(0, 6)

  const filteredRecordings = filterProspect
    ? recordings.filter(r => r.prospect_id === filterProspect)
    : recordings

  async function startVideoCall() {
    if (!selectedProspect) return
    setCreating(true)
    try {
      const res = await fetch("/api/video/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectId: selectedProspect.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setVideoLink(data.prospectLink)
      setVideoRoomName(data.roomName)
      setShowModal(true)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al crear videollamada")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--background)" }}>
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Videollamadas</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Iniciá videollamadas con tus prospectos y accedé a las grabaciones</p>
        </div>

        <div className="grid grid-cols-5 gap-6">

          {/* Panel izquierdo */}
          <div className="col-span-2">
            <div className="rounded-2xl overflow-hidden sticky top-8" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

              <div className="p-5" style={{ borderBottom: "1px solid var(--border)" }}>
                <h2 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>Nueva videollamada</h2>

                {/* Buscador de prospecto */}
                <div className="mb-3">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Prospecto</label>
                  {selectedProspect ? (
                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(108,99,255,0.1)", border: "1px solid rgba(108,99,255,0.3)" }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg, #6c63ff, #7c3aed)", color: "white" }}>
                        {selectedProspect.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{selectedProspect.full_name}</p>
                        {selectedProspect.company && <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{selectedProspect.company}</p>}
                      </div>
                      <button onClick={() => { setSelectedProspect(null); setSearch("") }}
                        className="text-xs px-2 py-1 rounded-lg shrink-0" style={{ color: "var(--text-muted)" }}>✕</button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar prospecto..."
                        className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                        style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                      />
                      {search && filteredProspects.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-10 shadow-xl"
                          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                          {filteredProspects.map(p => (
                            <button key={p.id} onClick={() => { setSelectedProspect(p); setSearch("") }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:opacity-80 transition-opacity"
                              style={{ borderBottom: "1px solid var(--border)" }}>
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
                                style={{ background: "linear-gradient(135deg, #6c63ff, #7c3aed)", color: "white" }}>
                                {p.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{p.full_name}</p>
                                {p.company && <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{p.company}</p>}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={startVideoCall}
                  disabled={creating || !selectedProspect}
                  className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, #6c63ff, #7c3aed)", color: "white" }}>
                  {creating ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creando sala...</>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                      </svg>
                      Iniciar videollamada
                    </>
                  )}
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 divide-x" style={{ borderColor: "var(--border)" }}>
                {[
                  { label: "Total", value: recordings.length, color: "#6c63ff" },
                  { label: "Completadas", value: recordings.filter(r => r.status === "completed").length, color: "#22c55e" },
                  { label: "Con análisis", value: analyses.length, color: "#3b82f6" },
                ].map(s => (
                  <div key={s.label} className="p-4 text-center">
                    <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Filtro por prospecto */}
              {filterProspect && (
                <div className="px-4 py-3 flex items-center gap-2" style={{ borderTop: "1px solid var(--border)" }}>
                  <p className="text-xs flex-1" style={{ color: "var(--text-muted)" }}>
                    Filtrando: <span style={{ color: "var(--text-primary)" }}>{prospectMap[filterProspect]?.full_name}</span>
                  </p>
                  <button onClick={() => setFilterProspect(null)} className="text-xs px-2 py-1 rounded-lg" style={{ color: "#6c63ff" }}>
                    Ver todas
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Panel derecho — historial */}
          <div className="col-span-3">
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
              <div className="px-6 py-4 flex items-center justify-between" style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
                <h2 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Historial de videollamadas</h2>
                <span className="text-xs px-2 py-1 rounded-full" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
                  {filteredRecordings.length} grabaciones
                </span>
              </div>

              {filteredRecordings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3" style={{ background: "var(--surface-2)" }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(108,99,255,0.1)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2">
                      <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Sin videollamadas todavía</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Iniciá una videollamada para verla acá</p>
                </div>
              ) : (
                <div style={{ background: "var(--surface-2)" }}>
                  {filteredRecordings.map((rec, i) => {
                    const analysis = analysisMap[rec.id]
                    const prospect = rec.prospect_id ? prospectMap[rec.prospect_id] : null
                    const isExpanded = expanded === rec.id

                    return (
                      <div key={rec.id} style={{ borderBottom: i < filteredRecordings.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div className="px-6 py-4 flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                            style={{ background: "linear-gradient(135deg, #6c63ff, #7c3aed)", color: "white" }}>
                            {prospect?.full_name?.charAt(0).toUpperCase() || "?"}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {prospect ? (
                                <button onClick={() => setFilterProspect(prospect.id === filterProspect ? null : prospect.id)}
                                  className="text-sm font-semibold hover:underline text-left"
                                  style={{ color: "var(--text-primary)" }}>
                                  {prospect.full_name}
                                </button>
                              ) : (
                                <span className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Sin prospecto</span>
                              )}
                              {prospect?.company && (
                                <span className="text-xs" style={{ color: "var(--text-muted)" }}>{prospect.company}</span>
                              )}
                              {analysis && (
                                <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "rgba(108,99,255,0.15)", color: "#a78bfa" }}>
                                  Score {analysis.score}/10
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(rec.created_at)}</span>
                              {rec.duration && <span className="text-xs" style={{ color: "var(--text-muted)" }}>· {formatDuration(rec.duration)}</span>}
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  background: rec.status === "completed" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.12)",
                                  color: rec.status === "completed" ? "#22c55e" : "#f59e0b",
                                }}>
                                {rec.status === "completed" ? "Completada" : rec.status === "processing" ? "Procesando..." : rec.status === "transcribing" ? "Transcribiendo..." : rec.status}
                              </span>
                            </div>
                          </div>

                          {rec.status === "completed" && (
                            <button onClick={() => setExpanded(isExpanded ? null : rec.id)}
                              className="text-xs px-3 py-1.5 rounded-lg shrink-0 font-medium"
                              style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                              {isExpanded ? "Cerrar" : "Ver detalle"}
                            </button>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="px-6 pb-5 flex flex-col gap-4" style={{ borderTop: "1px solid var(--border)" }}>

                            {/* Video */}
                            {rec.recording_url && (
                              <div className="mt-4">
                                <video controls className="w-full rounded-xl" style={{ maxHeight: 300, background: "#000" }}>
                                  <source src={`/api/video/media?url=${encodeURIComponent(rec.recording_url)}`} type="video/mp4" />
                                </video>
                              </div>
                            )}

                            {/* Análisis IA */}
                            {analysis && (
                              <div className="flex flex-col gap-3 mt-1">
                                {/* Score + tono */}
                                <div className="flex gap-3">
                                  <div className="flex-1 p-3 rounded-xl flex items-center gap-3" style={{ background: "var(--surface)" }}>
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shrink-0"
                                      style={{
                                        background: analysis.score >= 7 ? "rgba(34,197,94,0.15)" : analysis.score >= 5 ? "rgba(108,99,255,0.15)" : "rgba(239,68,68,0.15)",
                                        color: analysis.score >= 7 ? "#22c55e" : analysis.score >= 5 ? "#a78bfa" : "#ef4444"
                                      }}>
                                      {analysis.score}
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Score de la llamada</p>
                                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{analysis.score_reason}</p>
                                    </div>
                                  </div>
                                  <div className="p-3 rounded-xl flex flex-col items-center justify-center gap-1" style={{ background: "var(--surface)", minWidth: 110 }}>
                                    <span className="px-2 py-1 rounded-full text-xs font-semibold capitalize"
                                      style={{ background: `${toneColors[analysis.tone] || "#6c63ff"}22`, color: toneColors[analysis.tone] || "#6c63ff" }}>
                                      {analysis.tone}
                                    </span>
                                    <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>{analysis.tone_explanation}</p>
                                  </div>
                                </div>

                                {/* Resumen */}
                                <div className="p-3 rounded-xl" style={{ background: "var(--surface)" }}>
                                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Resumen</p>
                                  <p className="text-xs" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{analysis.summary}</p>
                                </div>

                                {/* Objeciones + señales */}
                                <div className="grid grid-cols-2 gap-3">
                                  {analysis.objections?.length > 0 && (
                                    <div className="p-3 rounded-xl" style={{ background: "rgba(239,68,68,0.08)" }}>
                                      <p className="text-xs font-semibold mb-2" style={{ color: "#ef4444" }}>Objeciones</p>
                                      {analysis.objections.map((o, i) => <p key={i} className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>• {o}</p>)}
                                    </div>
                                  )}
                                  {analysis.buying_signals?.length > 0 && (
                                    <div className="p-3 rounded-xl" style={{ background: "rgba(34,197,94,0.08)" }}>
                                      <p className="text-xs font-semibold mb-2" style={{ color: "#22c55e" }}>Señales de compra</p>
                                      {analysis.buying_signals.map((s, i) => <p key={i} className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>• {s}</p>)}
                                    </div>
                                  )}
                                </div>

                                {analysis.pain_points?.length > 0 && (
                                  <div className="p-3 rounded-xl" style={{ background: "rgba(251,191,36,0.08)" }}>
                                    <p className="text-xs font-semibold mb-2" style={{ color: "#fbbf24" }}>Puntos de dolor</p>
                                    {analysis.pain_points.map((p, i) => <p key={i} className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>• {p}</p>)}
                                  </div>
                                )}

                                <div className="p-3 rounded-xl" style={{ background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.2)" }}>
                                  <p className="text-xs font-semibold mb-1" style={{ color: "#a78bfa" }}>Próximo paso</p>
                                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{analysis.next_step}</p>
                                </div>

                                <div className="p-3 rounded-xl" style={{ background: "var(--surface)" }}>
                                  <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Recomendación del agente IA</p>
                                  <p className="text-xs" style={{ color: "var(--text-muted)", lineHeight: 1.6 }}>{analysis.recommendation}</p>
                                </div>
                              </div>
                            )}

                            {/* Transcripción */}
                            {rec.transcript && (
                              <div>
                                <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Transcripción</p>
                                <div className="p-3 rounded-xl text-xs max-h-48 overflow-y-auto" style={{ background: "var(--surface)", color: "var(--text-muted)", lineHeight: 1.7, border: "1px solid var(--border)" }}>
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
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal videollamada creada */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowModal(false)}>
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
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Compartí el link con {selectedProspect?.full_name}</p>
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

            <a href={`https://wa.me/${(selectedProspect as any)?.whatsapp_number?.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${selectedProspect?.full_name}! Te comparto el link para nuestra videollamada: ${videoLink}`)}`}
              target="_blank" rel="noopener noreferrer"
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 mb-3"
              style={{ background: "rgba(37,211,102,0.85)", color: "white", display: "flex" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Enviar por WhatsApp
            </a>

            <button onClick={() => { window.open(`/videollamada/${videoRoomName}`, "_blank"); setShowModal(false) }}
              className="w-full py-3 rounded-xl font-semibold text-sm mb-2"
              style={{ background: "linear-gradient(135deg, #6c63ff, #7c3aed)", color: "white" }}>
              Unirme a la llamada
            </button>

            <button onClick={() => setShowModal(false)}
              className="w-full py-2 rounded-xl text-sm" style={{ color: "var(--text-muted)" }}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
