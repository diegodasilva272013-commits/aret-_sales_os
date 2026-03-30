"use client"

import { useState, useEffect, useRef, useCallback } from "react"

type Participant = {
  identity: string
  videoTrack: MediaStreamTrack | null
  audioTrack: MediaStreamTrack | null
}

export default function VideoRoom({ roomName, isProspect = false, prospectName }: {
  roomName: string
  isProspect?: boolean
  prospectName?: string
}) {
  const [name, setName] = useState(isProspect ? "Invitado" : "Setter")
  const [joined, setJoined] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState("")
  const [muted, setMuted] = useState(false)
  const [videoOff, setVideoOff] = useState(false)
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map())
  const [duration, setDuration] = useState(0)
  const [debugLog, setDebugLog] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [localVideoTrack, setLocalVideoTrack] = useState<any>(null)

  useEffect(() => { setHydrated(true) }, [])

  const log = (msg: string) => {
    console.log(msg)
    setDebugLog(prev => [...prev.slice(-4), msg])
  }

  const roomRef = useRef<any>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const attachTrack = useCallback((track: any, container: HTMLElement) => {
    const el = track.attach()
    el.style.width = "100%"
    el.style.height = "100%"
    el.style.objectFit = "cover"
    container.appendChild(el)
    return el
  }, [])

  async function join() {
    log("join() llamado")
    if (!name.trim()) { log("nombre vacío"); return }
    setConnecting(true)
    setError("")

    try {
      log("fetching token...")
      const endpoint = isProspect ? "/api/video/join" : "/api/video/room"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomName, name }),
      })
      log("res status: " + res.status)
      const data = await res.json()
      log("token ok: " + !!data.token)
      const { token } = data

      // Importar Twilio Video dinámicamente (solo browser)
      log("importando twilio-video...")
      const TwilioVideo = await import("twilio-video")
      log("conectando a sala...")
      const room = await TwilioVideo.connect(token, {
        name: roomName,
        audio: true,
        video: { width: 1280, height: 720 },
      })
      log("conectado!")

      roomRef.current = room
      setJoined(true)
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)

      // Guardar track local para attach en useEffect (el ref aún no existe)
      room.localParticipant.videoTracks.forEach((pub: any) => {
        if (pub.track) setLocalVideoTrack(pub.track)
      })

      // Participantes remotos existentes
      room.participants.forEach((participant: any) => {
        handleParticipantConnected(participant)
      })

      room.on("participantConnected", handleParticipantConnected)
      room.on("participantDisconnected", (p: any) => {
        setParticipants(prev => { const m = new Map(prev); m.delete(p.identity); return m })
      })
      room.on("disconnected", () => {
        setJoined(false)
        if (timerRef.current) clearInterval(timerRef.current)
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error("Video join error:", err)
      log("ERROR: " + msg)
      setError(msg)
    } finally {
      setConnecting(false)
    }
  }

  function handleParticipantConnected(participant: any) {
    const p: Participant = { identity: participant.identity, videoTrack: null, audioTrack: null }

    participant.tracks.forEach((pub: any) => {
      if (pub.isSubscribed && pub.track) {
        if (pub.kind === "video") p.videoTrack = pub.track
        if (pub.kind === "audio") pub.track.attach()
      }
    })

    participant.on("trackSubscribed", (track: any) => {
      setParticipants(prev => {
        const m = new Map(prev)
        const existing = m.get(participant.identity) || { identity: participant.identity, videoTrack: null, audioTrack: null }
        if (track.kind === "video") m.set(participant.identity, { ...existing, videoTrack: track })
        if (track.kind === "audio") { track.attach(); m.set(participant.identity, { ...existing, audioTrack: track }) }
        return m
      })
    })

    setParticipants(prev => new Map(prev).set(participant.identity, p))
  }

  function hangup() {
    roomRef.current?.disconnect()
    setJoined(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  function toggleMute() {
    roomRef.current?.localParticipant.audioTracks.forEach((pub: any) => {
      if (muted) pub.track.enable()
      else pub.track.disable()
    })
    setMuted(!muted)
  }

  function toggleVideo() {
    roomRef.current?.localParticipant.videoTracks.forEach((pub: any) => {
      if (videoOff) pub.track.enable()
      else pub.track.disable()
    })
    setVideoOff(!videoOff)
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60); const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  useEffect(() => () => { roomRef.current?.disconnect(); if (timerRef.current) clearInterval(timerRef.current) }, [])

  // Attach local video track una vez que el elemento <video> existe en el DOM
  useEffect(() => {
    if (localVideoTrack && localVideoRef.current) {
      localVideoTrack.attach(localVideoRef.current)
    }
  }, [localVideoTrack, joined])

  // Pantalla de espera / join
  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--background, #0f0f13)" }}>
        <div className="w-full max-w-md rounded-3xl p-8 text-center" style={{ background: "var(--surface, #1a1a24)", border: "1px solid var(--border, #2a2a3a)" }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(108,99,255,0.15)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary, white)" }}>
            {isProspect ? "Videollamada" : `Llamada con ${prospectName || "prospecto"}`}
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted, #666)" }}>
            {isProspect ? "Ingresá tu nombre para unirte" : "Iniciá la videollamada"}
          </p>

          {isProspect && (
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && join()}
              placeholder="Tu nombre"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none mb-4"
              style={{ background: "var(--surface-2, #222)", border: "1px solid var(--border, #333)", color: "var(--text-primary, white)" }}
            />
          )}

          <p className="text-xs mb-2" style={{ color: hydrated ? "#0f0" : "#f00" }}>
            JS: {hydrated ? "✓ activo" : "✗ no hidratado"}
          </p>

          {error && <p className="text-xs mb-4 p-3 rounded-xl text-red-400" style={{ background: "rgba(239,68,68,0.1)" }}>{error}</p>}

          {debugLog.length > 0 && (
            <div className="text-xs mb-4 p-2 rounded text-left" style={{ background: "#111", color: "#0f0", fontFamily: "monospace" }}>
              {debugLog.map((l, i) => <div key={i}>{l}</div>)}
            </div>
          )}

          <button type="button" onClick={join} onTouchStart={(e) => { e.preventDefault(); if (!connecting) join() }} disabled={connecting}
            className="w-full rounded-xl font-semibold text-sm disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #6c63ff, #7c3aed)", color: "white", padding: "16px", fontSize: "16px", cursor: "pointer", WebkitAppearance: "none", border: "none", minHeight: "52px" }}>
            {connecting ? "Conectando..." : "Unirse a la videollamada"}
          </button>
        </div>
      </div>
    )
  }

  const remoteParticipants = Array.from(participants.values())

  return (
    <div className="h-screen flex flex-col" style={{ background: "#0a0a0f" }}>

      {/* Videos */}
      <div className="flex-1 relative overflow-hidden">
        {/* Video remoto principal */}
        {remoteParticipants.length > 0 ? (
          <div className="w-full h-full">
            {remoteParticipants.map(p => (
              <RemoteVideo key={p.identity} participant={p} attachTrack={attachTrack} />
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse"
                style={{ background: "rgba(108,99,255,0.15)" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <p className="text-sm" style={{ color: "#666" }}>Esperando que el otro participante se una...</p>
            </div>
          </div>
        )}

        {/* Video local (esquina) */}
        <div className="absolute bottom-4 right-4 w-36 h-24 rounded-xl overflow-hidden shadow-2xl"
          style={{ border: "2px solid rgba(108,99,255,0.4)", background: "#111" }}>
          <video ref={localVideoRef} autoPlay muted playsInline
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)", display: videoOff ? "none" : "block" }} />
          {videoOff && (
            <div className="w-full h-full flex items-center justify-center" style={{ background: "#1a1a24" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-mono"
          style={{ background: "rgba(0,0,0,0.6)", color: "white" }}>
          {formatTime(duration)}
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center justify-center gap-4 p-6" style={{ background: "rgba(0,0,0,0.8)" }}>
        <button onClick={toggleMute}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
          style={{ background: muted ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={muted ? "#ef4444" : "white"} strokeWidth="2">
            {muted ? <><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v3M8 23h8"/></>
            : <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3M8 23h8"/></>}
          </svg>
        </button>

        <button onClick={toggleVideo}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
          style={{ background: videoOff ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={videoOff ? "#ef4444" : "white"} strokeWidth="2">
            {videoOff ? <><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3m3-3h6l2 3h4a2 2 0 0 1 2 2v9.34m-7.72-2.06a4 4 0 1 1-5.56-5.56"/></>
            : <><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></>}
          </svg>
        </button>

        <button onClick={hangup}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
          style={{ background: "#ef4444" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M13.73 12.08l1.04-1.06c.49-.49.49-1.28 0-1.77L12 6.58c-.49-.49-1.28-.49-1.77 0L9.18 7.63c-.49.49-1.28.49-1.77 0L4.9 5.12c-.49-.49-.49-1.28 0-1.77l1.06-1.06c.49-.49 1.28-.49 1.77 0L9.5 4.05c.49.49 1.28.49 1.77 0l1.04-1.04a1.25 1.25 0 0 1 1.77 0l2.7 2.7c.49.49.49 1.28 0 1.77l-1.04 1.04c-.49.49-.49 1.28 0 1.77l1.77 1.77c.49.49.49 1.28 0 1.77l-1.04 1.04c-.49.49-1.28.49-1.77 0z"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

function RemoteVideo({ participant, attachTrack }: { participant: Participant; attachTrack: any }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current || !participant.videoTrack) return
    const el = participant.videoTrack.attach()
    el.style.width = "100%"
    el.style.height = "100%"
    el.style.objectFit = "cover"
    ref.current.appendChild(el)
    return () => { el.remove() }
  }, [participant.videoTrack])

  return (
    <div ref={ref} className="w-full h-full" style={{ background: "#111" }}>
      {!participant.videoTrack && (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ background: "linear-gradient(135deg, #6c63ff, #7c3aed)", color: "white" }}>
            {participant.identity.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
    </div>
  )
}
