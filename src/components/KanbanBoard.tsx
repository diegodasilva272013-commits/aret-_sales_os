"use client"

import { useState } from "react"
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from "@dnd-kit/core"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

type KanbanProspect = {
  id: string
  full_name: string
  company: string
  status: string
  follow_up_count: number
  assigned_to_profile?: { full_name: string }
  source_type?: string
}

const COLUMNS = [
  { id: "nuevo",            label: "Nuevos",           color: "#6c63ff", bg: "rgba(108,99,255,0.1)" },
  { id: "activo",           label: "Activos",           color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  { id: "llamada_agendada", label: "Llamada Agendada",  color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  { id: "cerrado_ganado",   label: "Cerrado ✓",         color: "#22c55e", bg: "rgba(34,197,94,0.1)"  },
  { id: "cerrado_perdido",  label: "Cerrado ✗",         color: "#ef4444", bg: "rgba(239,68,68,0.1)"  },
]

function ProspectCard({ prospect, isDragging = false }: { prospect: KanbanProspect; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: prospect.id })
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1 } : {}

  return (
    <div ref={setNodeRef} style={{ background: "var(--surface)", border: "1px solid var(--border)", ...style }} {...listeners} {...attributes}
      className="p-3 rounded-xl cursor-grab active:cursor-grabbing select-none">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link href={`/prospects/${prospect.id}`} onClick={e => e.stopPropagation()}
          className="text-sm font-semibold hover:underline leading-tight"
          style={{ color: "var(--text-primary)" }}>
          {prospect.full_name}
        </Link>
        <span className="text-xs shrink-0 px-1.5 py-0.5 rounded"
          style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>
          #{prospect.follow_up_count}
        </span>
      </div>
      {prospect.company && (
        <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>🏢 {prospect.company}</p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {prospect.assigned_to_profile?.full_name || "Sin asignar"}
        </span>
        {prospect.source_type === "instagram" && (
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(225,48,108,0.15)", color: "#e1306c" }}>IG</span>
        )}
      </div>
    </div>
  )
}

function Column({ column, prospects }: { column: typeof COLUMNS[0]; prospects: KanbanProspect[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex flex-col w-64 shrink-0">
      <div className="flex items-center justify-between px-3 py-2 rounded-t-xl mb-2"
        style={{ background: column.bg, border: `1px solid ${column.color}30` }}>
        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: column.color }}>
          {column.label}
        </span>
        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${column.color}20`, color: column.color }}>
          {prospects.length}
        </span>
      </div>
      <div ref={setNodeRef} className="flex flex-col gap-2 min-h-32 p-2 rounded-xl transition-all"
        style={{
          background: isOver ? `${column.color}08` : "var(--surface-2)",
          border: `1px solid ${isOver ? column.color + "40" : "var(--border)"}`,
          minHeight: "120px",
        }}>
        {prospects.map(p => <ProspectCard key={p.id} prospect={p} />)}
        {prospects.length === 0 && (
          <p className="text-xs text-center py-4" style={{ color: "var(--text-muted)" }}>Sin prospectos</p>
        )}
      </div>
    </div>
  )
}

export default function KanbanBoard({ initialProspects }: { initialProspects: KanbanProspect[] }) {
  const [prospects, setProspects] = useState(initialProspects)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const supabase = createClient()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function onDragStart(e: DragStartEvent) {
    setDraggingId(e.active.id as string)
  }

  async function onDragEnd(e: DragEndEvent) {
    setDraggingId(null)
    const { active, over } = e
    if (!over) return
    const prospectId = active.id as string
    const newStatus = over.id as string
    if (!COLUMNS.find(c => c.id === newStatus)) return

    setProspects(prev => prev.map(p => p.id === prospectId ? { ...p, status: newStatus } : p))
    await supabase.from("prospects").update({ status: newStatus }).eq("id", prospectId)
  }

  const draggingProspect = prospects.find(p => p.id === draggingId)

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 page-enter">
        {COLUMNS.map(col => (
          <Column key={col.id} column={col}
            prospects={prospects.filter(p => p.status === col.id)} />
        ))}
      </div>
      <DragOverlay>
        {draggingProspect && (
          <div className="p-3 rounded-xl rotate-2 shadow-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--accent)", width: "256px" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{draggingProspect.full_name}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{draggingProspect.company}</p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
