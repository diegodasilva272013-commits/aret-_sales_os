"use client"

import { useState, useEffect } from "react"

type Slot = { start: string; end: string }

const WEEK_OPTIONS = [
  { label: "Esta semana", days: 7 },
  { label: "2 semanas", days: 14 },
  { label: "1 mes", days: 30 },
]

export default function BookCallModal({ prospectId, prospectName, calendlyUrl, onClose, onBooked }: {
  prospectId: string
  prospectName: string
  calendlyUrl?: string
  onClose: () => void
  onBooked: () => void
}) {
  const [method, setMethod] = useState<"calendly" | "google">(calendlyUrl ? "calendly" : "google")
  const [slots, setSlots] = useState<Slot[]>([])
  const [closerId, setCloserId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState("")
  const [selected, setSelected] = useState<Slot | null>(null)
  const [rangeDays, setRangeDays] = useState(7)

  function loadSlots(days: number) {
    setLoading(true)
    setSelected(null)
    setError("")
    fetch(`/api/calendar/slots?days=${days}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else { setSlots(d.slots); setCloserId(d.closerId) }
      })
      .catch(() => setError("Error cargando horarios"))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (method === "google") loadSlots(rangeDays)
  }, [method])

  function handleRangeChange(days: number) {
    setRangeDays(days)
    loadSlots(days)
  }

  async function handleBook() {
    if (!selected) return
    setBooking(true)
    const res = await fetch("/api/calendar/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prospectId, start: selected.start, end: selected.end, closerId }),
    })
    const data = await res.json()
    if (data.success) onBooked()
    else setError(data.error || "Error al agendar")
    setBooking(false)
  }

  function formatSlot(slot: Slot) {
    const d = new Date(slot.start)
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
    return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} · ${d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`
  }

  const byDay: Record<string, Slot[]> = {}
  for (const slot of slots) {
    const day = new Date(slot.start).toDateString()
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(slot)
  }

  const calendlyFull = calendlyUrl
    ? `${calendlyUrl}?name=${encodeURIComponent(prospectName)}`
    : ""

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", animation: "fade-in 0.2s ease" }}>
      <div className="w-full rounded-2xl p-6 animate-scale-pop" style={{ background: "var(--surface)", border: "1px solid var(--border)", maxWidth: method === "calendly" ? "900px" : "448px" }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>Agendar llamada</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>con {prospectName}</p>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Selector de método */}
        {calendlyUrl && (
          <div className="flex gap-2 mb-4">
            <button onClick={() => setMethod("calendly")}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: method === "calendly" ? "var(--accent)" : "var(--surface-2)",
                color: method === "calendly" ? "white" : "var(--text-secondary)",
                border: `1px solid ${method === "calendly" ? "var(--accent)" : "var(--border)"}`,
              }}>
              📅 Calendly
            </button>
            <button onClick={() => { setMethod("google"); if (slots.length === 0) loadSlots(rangeDays) }}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: method === "google" ? "var(--accent)" : "var(--surface-2)",
                color: method === "google" ? "white" : "var(--text-secondary)",
                border: `1px solid ${method === "google" ? "var(--accent)" : "var(--border)"}`,
              }}>
              🗓 Google Calendar
            </button>
          </div>
        )}

        {/* Calendly embed */}
        {method === "calendly" && calendlyUrl && (
          <div className="relative" style={{ height: "480px" }}>
            <iframe
              src={calendlyFull}
              width="100%"
              height="100%"
              frameBorder="0"
              style={{ borderRadius: "12px", border: "1px solid var(--border)" }}
              onLoad={() => {
                // Marcar como agendada cuando carga (el setter ya está viendo el calendario)
                fetch("/api/calendar/book-calendly", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ prospectId }),
                })
              }}
            />
          </div>
        )}

        {/* Google Calendar */}
        {method === "google" && (
          <>
            <div className="flex gap-2 mb-4">
              {WEEK_OPTIONS.map(opt => (
                <button key={opt.days} onClick={() => handleRangeChange(opt.days)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: rangeDays === opt.days ? "var(--accent)" : "var(--surface-2)",
                    color: rangeDays === opt.days ? "white" : "var(--text-secondary)",
                    border: `1px solid ${rangeDays === opt.days ? "var(--accent)" : "var(--border)"}`,
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>

            {loading && <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Cargando horarios...</p>}

            {error && (
              <div className="p-3 rounded-xl text-sm mb-4" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{error}</div>
            )}

            {!loading && !error && (
              <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
                {Object.keys(byDay).length === 0 && (
                  <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>Sin horarios disponibles en este período</p>
                )}
                {Object.entries(byDay).map(([day, daySlots]) => (
                  <div key={day}>
                    <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-muted)" }}>
                      {new Date(daySlots[0].start).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {daySlots.map(slot => (
                        <button key={slot.start} onClick={() => setSelected(slot)}
                          className="px-2 py-2 rounded-xl text-sm font-medium transition-all"
                          style={{
                            background: selected?.start === slot.start ? "var(--accent)" : "var(--surface-2)",
                            color: selected?.start === slot.start ? "white" : "var(--text-primary)",
                            border: `1px solid ${selected?.start === slot.start ? "var(--accent)" : "var(--border)"}`,
                          }}>
                          {new Date(slot.start).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selected && (
              <div className="mt-3 p-3 rounded-xl text-sm" style={{ background: "rgba(108,99,255,0.1)", color: "var(--accent-light)" }}>
                Seleccionado: <strong>{formatSlot(selected)}</strong> (45 min)
              </div>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                Cancelar
              </button>
              <button onClick={handleBook} disabled={!selected || booking}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: selected ? "var(--accent)" : "var(--surface-2)",
                  color: selected ? "white" : "var(--text-muted)",
                  opacity: booking ? 0.7 : 1,
                }}>
                {booking ? "Agendando..." : "Confirmar llamada"}
              </button>
            </div>
          </>
        )}

        {method === "calendly" && (
          <div className="flex justify-end mt-4">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
