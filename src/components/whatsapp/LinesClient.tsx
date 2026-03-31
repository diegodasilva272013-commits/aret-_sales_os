"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

type WaLine = {
  id: string
  phone: string | null
  label: string | null
  channel_type: string
  status: "cold" | "warming" | "ready" | "banned"
  warmup_enabled: boolean
  created_at: string
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  ready:   { label: "Listo",     color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  warming: { label: "Calentando", color: "#eab308", bg: "rgba(234,179,8,0.12)" },
  cold:    { label: "Frío",      color: "var(--text-muted)", bg: "var(--surface-2)" },
  banned:  { label: "Baneado",   color: "var(--danger)", bg: "rgba(239,68,68,0.12)" },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.cold
  return (
    <span
      className="px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  )
}

function QRModal({ lineId, onClose }: { lineId: string; onClose: () => void }) {
  const [qrData, setQrData] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/whatsapp/lines/qr?line_id=${lineId}`)
        const data = await res.json()
        if (data.connected) {
          setConnected(true)
          if (intervalRef.current) clearInterval(intervalRef.current)
        } else if (data.qr) {
          setQrData(data.qr)
          setLoading(false)
        } else if (data.placeholder) {
          setQrData(null)
          setLoading(false)
          setError(data.message || "Servidor Baileys no configurado. QR de ejemplo.")
        }
      } catch {
        setLoading(false)
        setError("Error al obtener el QR. Verifica la conexión.")
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 3000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [lineId])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 flex flex-col items-center gap-4"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between w-full">
          <h3 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>
            Vincular WhatsApp
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {connected ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,0.15)" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p className="font-semibold" style={{ color: "#22c55e" }}>¡Conectado!</p>
            <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>La línea fue vinculada exitosamente.</p>
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-xl text-sm font-medium text-white"
              style={{ background: "var(--accent)" }}
            >
              Cerrar
            </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border)", borderTopColor: "var(--accent)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Generando QR...</p>
          </div>
        ) : (
          <>
            {qrData ? (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`}
                alt="QR Code"
                className="rounded-xl"
                width={220}
                height={220}
              />
            ) : (
              <div
                className="w-[220px] h-[220px] rounded-xl flex items-center justify-center"
                style={{ background: "var(--surface-2)", border: "2px dashed var(--border)" }}
              >
                <div className="text-center px-4">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="mx-auto mb-2">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3M17 17h3v3M14 20h3"/>
                  </svg>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>QR de ejemplo</p>
                </div>
              </div>
            )}
            {error && (
              <p className="text-xs text-center px-2" style={{ color: "var(--text-muted)" }}>{error}</p>
            )}
            <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
              Abre WhatsApp → Dispositivos vinculados → Vincular dispositivo y escanea el QR
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>Actualizando automáticamente cada 3 segundos...</p>
          </>
        )}
      </div>
    </div>
  )
}

function AddLineModal({ onClose, onCreated }: { onClose: () => void; onCreated: (line: WaLine) => void }) {
  const [label, setLabel] = useState("")
  const [phone, setPhone] = useState("")
  const [channelType, setChannelType] = useState("baileys")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/whatsapp/lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, phone, channel_type: channelType }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al crear la línea")
      onCreated(data.line)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-base" style={{ color: "var(--text-primary)" }}>Nueva Línea</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Etiqueta</label>
            <input
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Ej: Línea Principal"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Teléfono (opcional)</label>
            <input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+54 9 11 1234 5678"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Canal</label>
            <select
              value={channelType}
              onChange={e => setChannelType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              <option value="baileys">Baileys (QR scan)</option>
              <option value="meta">Meta Cloud API</option>
            </select>
          </div>

          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-60"
              style={{ background: "var(--accent)" }}
            >
              {loading ? "Creando..." : "Crear línea"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LinesClient({ lines: initialLines, orgId }: { lines: WaLine[]; orgId: string }) {
  const [lines, setLines] = useState<WaLine[]>(initialLines)
  const [showAddModal, setShowAddModal] = useState(false)
  const [qrLineId, setQrLineId] = useState<string | null>(null)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const handleCreated = (line: WaLine) => {
    setLines(prev => [line, ...prev])
    setShowAddModal(false)
    setQrLineId(line.id)
  }

  const handleUnlink = async (id: string) => {
    if (!confirm("¿Desvincular esta línea?")) return
    setUnlinkingId(id)
    try {
      await fetch("/api/whatsapp/lines/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_id: id }),
      })
      setLines(prev => prev.filter(l => l.id !== id))
    } finally {
      setUnlinkingId(null)
    }
  }

  const handleToggleWarmup = async (line: WaLine) => {
    setTogglingId(line.id)
    try {
      const res = await fetch(`/api/whatsapp/lines?line_id=${line.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warmup_enabled: !line.warmup_enabled }),
      })
      if (res.ok) {
        setLines(prev => prev.map(l => l.id === line.id ? { ...l, warmup_enabled: !l.warmup_enabled } : l))
      }
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>Líneas de WhatsApp</h2>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {lines.length} línea{lines.length !== 1 ? "s" : ""} configurada{lines.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
          style={{ background: "#25d366" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Vincular nueva línea
        </button>
      </div>

      {lines.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-2xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(37,211,102,0.12)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#25d366" strokeWidth="1.5">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
            </svg>
          </div>
          <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Sin líneas configuradas</p>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>Vincula una línea de WhatsApp para comenzar a enviar campañas</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-white"
            style={{ background: "#25d366" }}
          >
            Vincular primera línea
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {lines.map(line => (
            <div
              key={line.id}
              className="rounded-2xl p-5 flex flex-col gap-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(37,211,102,0.12)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#25d366" stroke="none">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{line.label || "Sin etiqueta"}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{line.phone || "Teléfono no vinculado"}</p>
                  </div>
                </div>
                <StatusBadge status={line.status} />
              </div>

              <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="px-2 py-1 rounded-lg" style={{ background: "var(--surface-2)" }}>
                  {line.channel_type === "baileys" ? "Baileys (QR)" : "Meta Cloud API"}
                </span>
                <div className="flex items-center gap-2">
                  <span>Calentamiento</span>
                  <button
                    onClick={() => handleToggleWarmup(line)}
                    disabled={togglingId === line.id}
                    className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-60"
                    style={{ background: line.warmup_enabled ? "var(--accent)" : "var(--surface-2)", border: "1px solid var(--border)" }}
                  >
                    <span
                      className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform shadow-sm"
                      style={{ transform: line.warmup_enabled ? "translateX(18px)" : "translateX(2px)" }}
                    />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-1 border-t" style={{ borderColor: "var(--border)" }}>
                {line.channel_type === "baileys" && (
                  <button
                    onClick={() => setQrLineId(line.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ background: "rgba(108,99,255,0.1)", color: "var(--accent)" }}
                  >
                    Ver QR
                  </button>
                )}
                <button
                  onClick={() => handleUnlink(line.id)}
                  disabled={unlinkingId === line.id}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: "rgba(239,68,68,0.08)", color: "var(--danger)" }}
                >
                  {unlinkingId === line.id ? "Desvinculando..." : "Desvincular"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddLineModal
          onClose={() => setShowAddModal(false)}
          onCreated={handleCreated}
        />
      )}

      {qrLineId && (
        <QRModal
          lineId={qrLineId}
          onClose={() => setQrLineId(null)}
        />
      )}
    </>
  )
}
