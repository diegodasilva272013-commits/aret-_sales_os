'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, Square, Play, Pause, Trash2, Download, Save, X, FileText, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'

// DB-ADAPT: profiles field is full_name instead of nombre
interface AudioNota {
  id: string
  audio_url: string
  audio_playback_url: string
  duracion_segundos: number
  transcripcion?: string
  titulo?: string
  usuario_id: string
  creado_en: string
  profiles?: { full_name: string }
}

interface AudioRecorderProps {
  entidadTipo: 'proyecto' | 'cliente' | 'venta' | 'brief' | 'transaccion' | 'cartera' | 'general' | 'tarea'
  entidadId: string
  readOnly?: boolean
}

const C = {
  bg: '#080B14',
  surface: '#0D1117',
  card: '#111827',
  border: '#1a2234',
  text: '#F1F5F9',
  muted: '#94A3B8',
  dim: '#475569',
  accent: '#6366F1',
  accentLight: '#818CF8',
  green: '#34D399',
  red: '#F87171',
  yellow: '#FBBF24',
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// DB-ADAPT: API path is /api/director/audio-notas (not /api/audio-notas)
export default function AudioRecorder({ entidadTipo, entidadId, readOnly = false }: AudioRecorderProps) {
  const [notas, setNotas] = useState<AudioNota[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)

  // Recording state
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // New note form
  const [titulo, setTitulo] = useState('')
  const [transcripcion, setTranscripcion] = useState('')
  const [saving, setSaving] = useState(false)

  // Playback
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [playProgress, setPlayProgress] = useState<Record<string, number>>({})

  // Editing transcription
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTranscripcion, setEditTranscripcion] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Fetch notes
  const fetchNotas = useCallback(async () => {
    try {
      const res = await fetch(`/api/director/audio-notas?entidad_tipo=${encodeURIComponent(entidadTipo)}&entidad_id=${encodeURIComponent(entidadId)}`)
      if (res.ok) {
        setNotas(await res.json())
        setApiError(null)
      } else {
        const data = await res.json().catch(() => ({}))
        if (data.error?.includes('audio_notas')) {
          setApiError('Tabla audio_notas no encontrada. Ejecuta la migración supabase-director-fix.sql en Supabase.')
        } else {
          setApiError(data.error || 'Error cargando notas')
        }
      }
    } catch {
      setApiError('No se pudieron cargar las notas de audio')
    }
    setLoading(false)
  }, [entidadTipo, entidadId])

  useEffect(() => { fetchNotas() }, [fetchNotas])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Waveform visualization during recording
  function drawWaveform() {
    if (!analyserRef.current || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)
    analyser.getByteTimeDomainData(dataArray)

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.lineWidth = 2
    ctx.strokeStyle = C.accent
    ctx.beginPath()

    const sliceWidth = canvas.width / bufferLength
    let x = 0

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0
      const cy = (v * canvas.height) / 2
      if (i === 0) ctx.moveTo(x, cy)
      else ctx.lineTo(x, cy)
      x += sliceWidth
    }
    ctx.lineTo(canvas.width, canvas.height / 2)
    ctx.stroke()

    animFrameRef.current = requestAnimationFrame(drawWaveform)
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Detect supported MIME type
      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
      const mimeType = mimeTypes.find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setAudioBlob(blob)
        setPreviewUrl(URL.createObjectURL(blob))
        stream.getTracks().forEach(t => t.stop())
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      }

      // Setup waveform analyser
      try {
        const audioContext = new AudioContext()
        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        const source = audioContext.createMediaStreamSource(stream)
        source.connect(analyser)
        analyserRef.current = analyser
      } catch { /* Waveform is optional, don't break recording */ }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start()
      setRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)

      // Start waveform
      if (analyserRef.current) drawWaveform()
    } catch {
      setApiError('No se pudo acceder al micrófono. Verifica los permisos del navegador.')
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  function discardRecording() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setAudioBlob(null)
    setPreviewUrl(null)
    setTitulo('')
    setTranscripcion('')
    setRecordingTime(0)
  }

  async function saveNote() {
    if (!audioBlob) return
    setSaving(true)

    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'nota.webm')
      formData.append('entidad_tipo', entidadTipo)
      formData.append('entidad_id', entidadId)
      formData.append('titulo', titulo)
      formData.append('duracion', String(recordingTime))
      formData.append('transcripcion', transcripcion)

      const res = await fetch('/api/director/audio-notas', { method: 'POST', body: formData })

      if (res.ok) {
        discardRecording()
        await fetchNotas()
      } else {
        const data = await res.json().catch(() => ({}))
        setApiError(data.error || 'Error al guardar')
      }
    } catch {
      setApiError('Error al guardar la nota de audio')
    }
    setSaving(false)
  }

  async function deleteNote(id: string) {
    if (!confirm('¿Eliminar esta nota de audio?')) return
    const res = await fetch(`/api/director/audio-notas?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (res.ok) {
      setNotas(prev => prev.filter(n => n.id !== id))
      if (playingId === id) {
        audioRef.current?.pause()
        setPlayingId(null)
      }
    }
  }

  async function updateTranscripcion(id: string) {
    const res = await fetch('/api/director/audio-notas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, transcripcion: editTranscripcion }),
    })
    if (res.ok) {
      setEditingId(null)
      await fetchNotas()
    }
  }

  function togglePlay(nota: AudioNota) {
    const url = nota.audio_playback_url
    if (!url) return

    if (playingId === nota.id) {
      audioRef.current?.pause()
      setPlayingId(null)
      return
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.removeEventListener('timeupdate', handleTimeUpdate)
    }

    const audio = new Audio(url)
    audio.onended = () => {
      setPlayingId(null)
      setPlayProgress(prev => ({ ...prev, [nota.id]: 0 }))
    }

    function handleTimeUpdate() {
      if (audio.duration) {
        setPlayProgress(prev => ({ ...prev, [nota.id]: (audio.currentTime / audio.duration) * 100 }))
      }
    }
    audio.addEventListener('timeupdate', handleTimeUpdate)

    audio.play().catch(() => setApiError('Error reproduciendo audio'))
    audioRef.current = audio
    setPlayingId(nota.id)
  }

  function downloadAudio(nota: AudioNota) {
    const url = nota.audio_playback_url
    if (!url) return

    const a = document.createElement('a')
    a.href = url
    a.download = `${nota.titulo || 'nota-audio'}-${new Date(nota.creado_en).toISOString().slice(0, 10)}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: C.bg,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '8px 12px',
    color: C.text,
    fontSize: 13,
    outline: 'none',
  }

  // Error state
  if (apiError && notas.length === 0 && !loading) {
    return (
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.25rem' }}>
        <div className="flex items-center gap-2 mb-2">
          <Mic size={14} style={{ color: C.accentLight }} />
          <span style={{ color: C.text, fontSize: 13, fontWeight: 600 }}>Notas de Audio</span>
        </div>
        <div className="flex items-center gap-2" style={{ padding: '12px', background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 8 }}>
          <AlertCircle size={14} style={{ color: C.red, flexShrink: 0 }} />
          <p style={{ color: C.muted, fontSize: 12, margin: 0 }}>{apiError}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(248,113,113,0.06) 100%)', borderBottom: `1px solid ${C.border}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic size={14} style={{ color: C.red }} />
            <h3 style={{ color: C.text, fontSize: 13, fontWeight: 700, margin: 0 }}>Notas de Audio</h3>
            {notas.length > 0 && (
              <span style={{ fontSize: 11, color: C.dim, background: 'rgba(99,102,241,0.1)', padding: '1px 8px', borderRadius: 10 }}>
                {notas.length}
              </span>
            )}
          </div>
          {apiError && (
            <span style={{ fontSize: 11, color: C.yellow }}>{apiError}</span>
          )}
        </div>
      </div>

      <div style={{ padding: '1.25rem' }}>
        {/* Recording area */}
        {!readOnly && !audioBlob && (
          <div style={{ marginBottom: notas.length > 0 ? 16 : 0 }}>
            {recording ? (
              <div style={{ background: C.bg, border: `1px solid rgba(248,113,113,0.3)`, borderRadius: 12, padding: '1rem' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', background: C.red,
                      animation: 'pulse 1s infinite'
                    }} />
                    <span style={{ color: C.red, fontSize: 13, fontWeight: 600 }}>Grabando</span>
                    <span style={{ color: C.muted, fontSize: 13, fontFamily: 'monospace' }}>
                      {formatDuration(recordingTime)}
                    </span>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                    style={{ background: 'rgba(248,113,113,0.15)', border: '1px solid rgba(248,113,113,0.3)', color: C.red, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Square size={12} fill={C.red} />
                    Detener
                  </button>
                </div>
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={50}
                  style={{ width: '100%', height: 50, borderRadius: 6, background: 'rgba(99,102,241,0.04)' }}
                />
              </div>
            ) : (
              <button
                onClick={startRecording}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl transition-all"
                style={{
                  background: 'rgba(248,113,113,0.06)', border: `1px dashed rgba(248,113,113,0.3)`,
                  color: C.red, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                }}
              >
                <Mic size={15} />
                Grabar nota de audio
              </button>
            )}
          </div>
        )}

        {/* Preview / Save form after recording */}
        {!readOnly && audioBlob && previewUrl && (
          <div style={{ background: C.bg, border: `1px solid rgba(99,102,241,0.2)`, borderRadius: 12, padding: '1rem', marginBottom: notas.length > 0 ? 16 : 0 }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: C.accentLight, fontSize: 13, fontWeight: 600 }}>Nueva nota grabada</span>
              <span style={{ color: C.dim, fontSize: 12 }}>{formatDuration(recordingTime)}</span>
            </div>

            {/* Audio preview */}
            <audio controls src={previewUrl} style={{ width: '100%', height: 36, marginBottom: 12 }} />

            {/* Title */}
            <input
              placeholder="Título de la nota (opcional)"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              style={{ ...inputStyle, marginBottom: 8 }}
            />

            {/* Transcription */}
            <div style={{ marginBottom: 12 }}>
              <div className="flex items-center gap-1.5 mb-1">
                <FileText size={11} style={{ color: C.dim }} />
                <label style={{ color: C.dim, fontSize: 11 }}>
                  Transcripción (manual o copiar desde servicio externo)
                </label>
              </div>
              <textarea
                placeholder="Escribe o pega la transcripción aquí..."
                value={transcripcion}
                onChange={e => setTranscripcion(e.target.value)}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' as const }}
              />
              <p style={{ color: C.dim, fontSize: 10, marginTop: 4 }}>
                💡 Para transcripción automática, usa Whisper (OpenAI), AssemblyAI o Google Speech-to-Text y pega el resultado aquí.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={saveNote}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{
                  background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                  border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? (
                  <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                ) : (
                  <Save size={12} />
                )}
                {saving ? 'Guardando...' : 'Guardar nota'}
              </button>
              <button
                onClick={discardRecording}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all"
                style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, fontSize: 12, cursor: 'pointer' }}
              >
                <X size={12} />
                Descartar
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-6">
            <div style={{ width: 24, height: 24, border: '2px solid rgba(99,102,241,0.2)', borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        )}

        {/* Notes list */}
        {!loading && notas.length === 0 && !audioBlob && (
          <div className="text-center py-4">
            <Mic size={28} style={{ color: C.dim, opacity: 0.3, margin: '0 auto 8px' }} />
            <p style={{ color: C.dim, fontSize: 12 }}>No hay notas de audio</p>
          </div>
        )}

        {notas.length > 0 && (
          <div className="space-y-2">
            {notas.map(nota => {
              const isPlaying = playingId === nota.id
              const isExpanded = expandedId === nota.id
              const isEditing = editingId === nota.id
              const progress = playProgress[nota.id] || 0

              return (
                <div
                  key={nota.id}
                  style={{
                    background: C.bg,
                    border: `1px solid ${isPlaying ? 'rgba(99,102,241,0.3)' : C.border}`,
                    borderRadius: 10,
                    overflow: 'hidden',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* Progress bar */}
                  {isPlaying && (
                    <div style={{ height: 2, background: C.border }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: C.accent, transition: 'width 0.2s' }} />
                    </div>
                  )}

                  <div style={{ padding: '10px 14px' }}>
                    {/* Main row */}
                    <div className="flex items-center gap-3">
                      {/* Play button */}
                      <button
                        onClick={() => togglePlay(nota)}
                        style={{
                          width: 34, height: 34, borderRadius: '50%',
                          background: isPlaying ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)',
                          border: `1px solid ${isPlaying ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.15)'}`,
                          color: C.accentLight, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', flexShrink: 0,
                        }}
                      >
                        {isPlaying ? <Pause size={14} /> : <Play size={14} style={{ marginLeft: 2 }} />}
                      </button>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {nota.titulo && (
                            <span style={{ color: C.text, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {nota.titulo}
                            </span>
                          )}
                          {!nota.titulo && (
                            <span style={{ color: C.muted, fontSize: 13 }}>Nota de audio</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="flex items-center gap-1" style={{ color: C.dim, fontSize: 11 }}>
                            <Clock size={10} />
                            {formatDuration(nota.duracion_segundos || 0)}
                          </span>
                          <span style={{ color: C.dim, fontSize: 11 }}>
                            {nota.profiles?.full_name || 'Usuario'}
                          </span>
                          <span style={{ color: C.dim, fontSize: 11 }}>
                            {formatDate(nota.creado_en)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        {nota.transcripcion && (
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : nota.id)}
                            style={{ padding: 6, borderRadius: 6, color: C.dim, cursor: 'pointer', background: 'transparent', border: 'none' }}
                            title="Ver transcripción"
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        )}
                        <button
                          onClick={() => downloadAudio(nota)}
                          style={{ padding: 6, borderRadius: 6, color: C.dim, cursor: 'pointer', background: 'transparent', border: 'none' }}
                          title="Descargar"
                        >
                          <Download size={14} />
                        </button>
                        {!readOnly && (
                          <>
                            <button
                              onClick={() => { setEditingId(nota.id); setEditTranscripcion(nota.transcripcion || ''); setExpandedId(nota.id) }}
                              style={{ padding: 6, borderRadius: 6, color: C.dim, cursor: 'pointer', background: 'transparent', border: 'none' }}
                              title="Editar transcripción"
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              onClick={() => deleteNote(nota.id)}
                              style={{ padding: 6, borderRadius: 6, color: C.dim, cursor: 'pointer', background: 'transparent', border: 'none' }}
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Expanded transcription */}
                    {isExpanded && (
                      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                        {isEditing ? (
                          <div>
                            <textarea
                              value={editTranscripcion}
                              onChange={e => setEditTranscripcion(e.target.value)}
                              rows={4}
                              style={{ ...inputStyle, resize: 'vertical' as const, marginBottom: 8 }}
                              placeholder="Escribe la transcripción..."
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => updateTranscripcion(nota.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: C.accentLight, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                              >
                                <Save size={10} /> Guardar
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="px-3 py-1.5 rounded-lg"
                                style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, fontSize: 11, cursor: 'pointer' }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p style={{ color: C.dim, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                              Transcripción
                            </p>
                            <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0 }}>
                              {nota.transcripcion || 'Sin transcripción'}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
