"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import CallDetailModal from "./CallDetailModal"

type Call = {
  id: string
  scheduled_at: string
  duration_minutes: number
  google_event_id?: string
  notes?: string
  prospect_id: string
  prospects: {
    id: string
    full_name: string
    company: string
    headline?: string
    linkedin_url?: string
    instagram_url?: string
    source_type?: string
    status?: string
    notes?: string
    follow_up_count?: number
  } | null
  profiles: { full_name: string; email: string } | null
}

const HOURS = Array.from({ length: 11 }, (_, i) => i + 9) // 9am - 7pm

function getDayKey(date: Date) {
  return date.toISOString().split("T")[0]
}

function getWeekDays(baseDate: Date) {
  const days: Date[] = []
  const monday = new Date(baseDate)
  monday.setDate(baseDate.getDate() - ((baseDate.getDay() + 6) % 7))
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    days.push(d)
  }
  return days
}

export default function CallsCalendar({ initialCalls }: { initialCalls: Call[] }) {
  const [calls, setCalls] = useState(initialCalls)
  const [view, setView] = useState<"day" | "week">("week")
  const [currentDate, setCurrentDate] = useState(new Date())
  const [dragging, setDragging] = useState<string | null>(null)
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const supabase = createClient()

  const weekDays = getWeekDays(currentDate)
  const todayKey = getDayKey(new Date())

  function navigate(dir: number) {
    const d = new Date(currentDate)
    if (view === "day") d.setDate(d.getDate() + dir)
    else d.setDate(d.getDate() + dir * 7)
    setCurrentDate(d)
  }

  function getCallsForSlot(dayKey: string, hour: number) {
    return calls.filter(c => {
      const d = new Date(c.scheduled_at)
      return getDayKey(d) === dayKey && d.getHours() === hour
    })
  }

  async function handleDrop(e: React.DragEvent, dayKey: string, hour: number) {
    e.preventDefault()
    if (!dragging) return
    const call = calls.find(c => c.id === dragging)
    if (!call) return

    const newDate = new Date(dayKey + "T" + String(hour).padStart(2, "0") + ":00:00")
    const endDate = new Date(newDate.getTime() + (call.duration_minutes || 45) * 60000)

    setCalls(prev => prev.map(c => c.id === dragging ? { ...c, scheduled_at: newDate.toISOString() } : c))
    setDragging(null)

    await supabase.from("scheduled_calls").update({ scheduled_at: newDate.toISOString() }).eq("id", dragging)

    // Actualizar en Google Calendar si tiene event id
    if (call.google_event_id) {
      await fetch("/api/calendar/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: dragging, start: newDate.toISOString(), end: endDate.toISOString() }),
      })
    }
  }

  const displayDays = view === "day" ? [currentDate] : weekDays

  const callsToday = calls.filter(c => getDayKey(new Date(c.scheduled_at)) === todayKey)
  const callsWeek = calls.filter(c => {
    const d = new Date(c.scheduled_at)
    return d >= weekDays[0] && d <= weekDays[6]
  })

  return (
    <>
    <div>
      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Llamadas hoy", value: callsToday.length, color: "#3b82f6" },
          { label: "Esta semana", value: callsWeek.length, color: "#6c63ff" },
          { label: "Total agendadas", value: calls.length, color: "#22c55e" },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl flex items-center gap-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="text-3xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="p-2 rounded-xl transition-all"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <button onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 rounded-xl text-sm font-medium"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            Hoy
          </button>
          <button onClick={() => navigate(1)}
            className="p-2 rounded-xl transition-all"
            style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </button>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {view === "day"
              ? currentDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
              : `${weekDays[0].toLocaleDateString("es-AR", { day: "numeric", month: "short" })} — ${weekDays[6].toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}`
            }
          </span>
        </div>
        <div className="flex gap-2">
          {(["day", "week"] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="px-4 py-1.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: view === v ? "var(--accent)" : "var(--surface)",
                color: view === v ? "white" : "var(--text-secondary)",
                border: `1px solid ${view === v ? "var(--accent)" : "var(--border)"}`,
              }}>
              {v === "day" ? "Día" : "Semana"}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        {/* Header días */}
        <div className="grid" style={{ gridTemplateColumns: `64px repeat(${displayDays.length}, 1fr)`, background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
          <div className="p-3" />
          {displayDays.map(day => {
            const isToday = getDayKey(day) === todayKey
            return (
              <div key={getDayKey(day)} className="p-3 text-center">
                <p className="text-xs uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  {day.toLocaleDateString("es-AR", { weekday: "short" })}
                </p>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mx-auto mt-1 text-sm font-bold`}
                  style={{
                    background: isToday ? "var(--accent)" : "transparent",
                    color: isToday ? "white" : "var(--text-primary)",
                  }}>
                  {day.getDate()}
                </div>
              </div>
            )
          })}
        </div>

        {/* Hora slots */}
        <div style={{ background: "var(--surface-2)", maxHeight: "600px", overflowY: "auto" }}>
          {HOURS.map(hour => (
            <div key={hour} className="grid" style={{ gridTemplateColumns: `64px repeat(${displayDays.length}, 1fr)`, borderBottom: "1px solid var(--border)", minHeight: "72px" }}>
              <div className="p-3 text-right text-xs shrink-0" style={{ color: "var(--text-muted)", paddingTop: "8px" }}>
                {hour}:00
              </div>
              {displayDays.map(day => {
                const dayKey = getDayKey(day)
                const slotCalls = getCallsForSlot(dayKey, hour)
                return (
                  <div key={dayKey}
                    className="p-1 transition-all"
                    style={{ borderLeft: "1px solid var(--border)", minHeight: "72px", background: "transparent" }}
                    onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = "rgba(108,99,255,0.08)" }}
                    onDragLeave={e => { e.currentTarget.style.background = "transparent" }}
                    onDrop={e => { e.currentTarget.style.background = "transparent"; handleDrop(e, dayKey, hour) }}>
                    {slotCalls.map(call => (
                      <div key={call.id}
                        draggable
                        onDragStart={e => { e.stopPropagation(); setDragging(call.id) }}
                        onDragEnd={() => setDragging(null)}
                        onClick={() => setSelectedCall(call)}
                        className="p-2 rounded-lg mb-1 select-none transition-all"
                        style={{
                          background: "rgba(59,130,246,0.2)",
                          border: "1px solid rgba(59,130,246,0.4)",
                          opacity: dragging === call.id ? 0.5 : 1,
                          cursor: dragging ? "grabbing" : "pointer",
                        }}>
                        <p className="text-xs font-semibold" style={{ color: "#93c5fd" }}>
                          {call.prospects?.full_name || "—"}
                        </p>
                        <p className="text-xs" style={{ color: "rgba(147,197,253,0.7)" }}>
                          {call.prospects?.company || ""}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(147,197,253,0.5)" }}>
                          {new Date(call.scheduled_at).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} · {call.duration_minutes || 45}min
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "rgba(147,197,253,0.4)" }}>
                          {call.profiles?.full_name || ""}
                        </p>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>

    {selectedCall && (
      <CallDetailModal
        call={selectedCall as any}
        onClose={() => setSelectedCall(null)}
      />
    )}
    </>
  )
}
