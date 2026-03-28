"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Device, Call } from "@twilio/voice-sdk"

type CallState = "idle" | "connecting" | "ringing" | "active" | "ended"

export default function SoftPhone({ prospectId, prospectName, phoneNumber }: {
  prospectId?: string
  prospectName?: string
  phoneNumber?: string
}) {
  const [number, setNumber] = useState(phoneNumber || "")
  const [callState, setCallState] = useState<CallState>("idle")
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState("")
  const [transcript, setTranscript] = useState("")
  const [transcribing, setTranscribing] = useState(false)
  const [bars, setBars] = useState<number[]>(Array(32).fill(2))

  const deviceRef = useRef<Device | null>(null)
  const metaRef = useRef<{ userId: string; orgId: string }>({ userId: "", orgId: "" })
  const callRef = useRef<Call | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const animRef = useRef<number | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Inicializar Twilio Device
  useEffect(() => {
    let device: Device

    async function init() {
      try {
        const res = await fetch("/api/calls/token")
        const { token, userId, orgId } = await res.json()
        metaRef.current = { userId, orgId }

        device = new Device(token, { logLevel: 1 })

        device.on("error", (err) => setError(err.message))

        deviceRef.current = device
        await device.register()
      } catch (err) {
        console.error("Error iniciando Twilio Device:", err)
      }
    }

    init()

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
      device?.destroy()
    }
  }, [])

  // Visualizador de audio
  const startVisualizer = useCallback((stream: MediaStream) => {
    const ctx = new AudioContext()
    audioCtxRef.current = ctx
    const source = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 64
    source.connect(analyser)
    analyserRef.current = analyser

    const data = new Uint8Array(analyser.frequencyBinCount)

    function draw() {
      analyser.getByteFrequencyData(data)
      setBars(Array.from(data.slice(0, 32)).map(v => Math.max(2, (v / 255) * 60)))
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
  }, [])

  const stopVisualizer = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (audioCtxRef.current) audioCtxRef.current.close()
    setBars(Array(32).fill(2))
  }, [])

  async function handleCall() {
    if (!deviceRef.current || !number) return
    setError("")
    setCallState("connecting")

    try {
      const call = await deviceRef.current.connect({
        params: {
          To: number,
          prospectId: prospectId || "",
          userId: metaRef.current.userId,
          orgId: metaRef.current.orgId,
        },
      })
      callRef.current = call

      call.on("ringing", () => setCallState("ringing"))

      call.on("accept", () => {
        setCallState("active")
        setDuration(0)
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
        // Animación simple sin capturar el micrófono
        const animate = () => {
          setBars(Array(32).fill(0).map(() => Math.max(2, Math.random() * 50)))
          animRef.current = requestAnimationFrame(animate)
        }
        animate()
      })

      call.on("disconnect", () => {
        setCallState("ended")
        stopVisualizer()
        if (timerRef.current) clearInterval(timerRef.current)
        setTimeout(() => setCallState("idle"), 3000)
      })

      call.on("error", (err: Error) => {
        setError(err.message)
        setCallState("idle")
        stopVisualizer()
        if (timerRef.current) clearInterval(timerRef.current)
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error")
      setCallState("idle")
    }
  }

  function handleHangup() {
    callRef.current?.disconnect()
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  const isActive = callState === "active"
  const isCalling = callState === "connecting" || callState === "ringing"

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>

      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center gap-3" style={{ borderColor: "var(--border)" }}>
        <div className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(34,197,94,0.15)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.86a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {prospectName || "Llamada"}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {isActive ? formatTime(duration) : callState === "ringing" ? "Llamando..." : callState === "connecting" ? "Conectando..." : callState === "ended" ? "Finalizada" : "Listo"}
          </p>
        </div>
        {isActive && (
          <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-semibold animate-pulse"
            style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>
            EN VIVO
          </span>
        )}
      </div>

      <div className="p-5">

        {/* Input número */}
        {!isCalling && !isActive && (
          <div className="mb-4">
            <input
              value={number}
              onChange={e => setNumber(e.target.value)}
              placeholder="+5493454100816"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
        )}

        {/* Visualizador de onda */}
        {(isActive || isCalling) && (
          <div className="flex items-end justify-center gap-0.5 h-16 mb-4">
            {bars.map((h, i) => (
              <div key={i}
                className="rounded-full transition-all duration-75"
                style={{
                  width: "5px",
                  height: `${isActive ? h : 4}px`,
                  background: isActive
                    ? `hsl(${140 + i * 2}, 70%, 50%)`
                    : "var(--border)",
                  opacity: isActive ? 0.85 : 0.4,
                }}
              />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
            {error}
          </p>
        )}

        {/* Botones */}
        <div className="flex gap-3">
          {!isCalling && !isActive ? (
            <button
              onClick={handleCall}
              disabled={!number}
              className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
              style={{ background: "rgba(34,197,94,0.85)", color: "white" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.86a16 16 0 0 0 6 6l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              Llamar
            </button>
          ) : (
            <button
              onClick={handleHangup}
              className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: "rgba(239,68,68,0.85)", color: "white" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.73 12.08l1.04-1.06c.49-.49.49-1.28 0-1.77L12 6.58c-.49-.49-1.28-.49-1.77 0L9.18 7.63c-.49.49-1.28.49-1.77 0L4.9 5.12c-.49-.49-.49-1.28 0-1.77l1.06-1.06c.49-.49 1.28-.49 1.77 0L9.5 4.05c.49.49 1.28.49 1.77 0l1.04-1.04a1.25 1.25 0 0 1 1.77 0l2.7 2.7c.49.49.49 1.28 0 1.77l-1.04 1.04c-.49.49-.49 1.28 0 1.77l1.77 1.77c.49.49.49 1.28 0 1.77l-1.04 1.04c-.49.49-1.28.49-1.77 0z"/>
              </svg>
              Colgar
            </button>
          )}
        </div>

        {/* Transcripción */}
        {transcript && (
          <div className="mt-4 rounded-xl p-4" style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Transcripción</p>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{transcript}</p>
          </div>
        )}

        {transcribing && (
          <div className="mt-4 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--accent)" }} />
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Transcribiendo...</p>
          </div>
        )}
      </div>
    </div>
  )
}
