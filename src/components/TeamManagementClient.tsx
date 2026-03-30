"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

/* ── Types ──────────────────────────────────────────── */
type Member = { id: string; full_name: string; email: string; role: string; is_owner: boolean; created_at: string }
type Prospect = { id: string; full_name: string; company: string; status: string; phase: string; follow_up_count: number; assigned_to: string; created_at: string; last_contact_at?: string; project_id?: string }
type Business = { id: string; name: string; category: string; city: string; assigned_to: string; created_at: string; status?: string; project_id?: string }
type Call = { id: string; prospect_id: string; setter_id: string; scheduled_at: string; status: string; notes?: string; prospects?: { full_name: string } | null }
type Recording = { id: string; user_id: string; prospect_id: string; duration: number; created_at: string; prospects?: { full_name: string } | null }
type VideoRoom = { id: string; room_name: string; created_by: string; prospect_id?: string; status: string; created_at: string; prospects?: { full_name: string } | null }
type WMessage = { id: string; prospect_id: string; direction: string; created_at: string }
type Project = { id: string; name: string; description: string | null; status: string; color: string; created_at: string; created_by: string }
type ProjectMember = { id: string; project_id: string; user_id: string; role: string }
type ActivityLog = { id: string; user_id: string; action: string; entity_type: string; entity_id: string; details: Record<string, string>; created_at: string; project_id?: string }

type Props = {
  team: Member[]
  prospects: Prospect[]
  businesses: Business[]
  calls: Call[]
  recordings: Recording[]
  videoRooms: VideoRoom[]
  whatsappMessages: WMessage[]
  projects: Project[]
  projectMembers: ProjectMember[]
  activityLog: ActivityLog[]
  currentUserId: string
  organizationId: string
}

/* ── Constants ──────────────────────────────────────── */
const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  nuevo: { bg: "rgba(108,99,255,0.15)", color: "#6c63ff", label: "Nuevo" },
  activo: { bg: "rgba(34,197,94,0.15)", color: "#22c55e", label: "Activo" },
  pausado: { bg: "rgba(234,179,8,0.15)", color: "#eab308", label: "Pausado" },
  llamada_agendada: { bg: "rgba(59,130,246,0.15)", color: "#3b82f6", label: "Llamada" },
  cerrado_ganado: { bg: "rgba(16,185,129,0.15)", color: "#10b981", label: "Ganado" },
  cerrado_perdido: { bg: "rgba(239,68,68,0.15)", color: "#ef4444", label: "Perdido" },
}

const PROJECT_COLORS = ["#6c63ff", "#3b82f6", "#22c55e", "#eab308", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#06b6d4"]

/* ── Component ──────────────────────────────────────── */
export default function TeamManagementClient(props: Props) {
  const { team, prospects, businesses, calls, recordings, videoRooms, whatsappMessages, projects: initProjects, projectMembers: initPM, activityLog, currentUserId, organizationId } = props
  const router = useRouter()
  const supabase = createClient()

  const [activeTab, setActiveTab] = useState<"equipo" | "proyectos" | "monitoreo" | "rendimiento">("equipo")
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  // Projects state
  const [projects, setProjects] = useState(initProjects)
  const [projectMembers, setProjectMembers] = useState(initPM)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [projectForm, setProjectForm] = useState({ name: "", description: "", color: "#6c63ff" })
  const [savingProject, setSavingProject] = useState(false)

  // Create user state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createForm, setCreateForm] = useState({ fullName: "", email: "", password: "", role: "setter" })
  const [createError, setCreateError] = useState("")
  const [createSuccess, setCreateSuccess] = useState("")

  // Remove user state
  const [confirmDelete, setConfirmDelete] = useState<Member | null>(null)
  const [reassignTo, setReassignTo] = useState("")
  const [removing, setRemoving] = useState(false)

  // Assign to project state
  const [showAssignModal, setShowAssignModal] = useState<string | null>(null) // project_id
  const [selectedFilterProject, setSelectedFilterProject] = useState<string>("all")
  const [monitorFilter, setMonitorFilter] = useState<"all" | "prospects" | "businesses" | "calls" | "messages" | "video">("all")

  /* ── Member Stats ─────────────────────────────── */
  const memberStats = useMemo(() => {
    return team.map(m => {
      const mP = prospects.filter(p => p.assigned_to === m.id)
      const mB = businesses.filter(b => b.assigned_to === m.id)
      const mC = calls.filter(c => c.setter_id === m.id)
      const mR = recordings.filter(r => r.user_id === m.id)
      const pIds = new Set(mP.map(p => p.id))
      const mM = whatsappMessages.filter(w => pIds.has(w.prospect_id))
      const mV = videoRooms.filter(v => v.created_by === m.id)
      const ganados = mP.filter(p => p.status === "cerrado_ganado").length
      const perdidos = mP.filter(p => p.status === "cerrado_perdido").length
      const activos = mP.filter(p => p.status === "activo").length
      const totalMin = mR.reduce((s, r) => s + (r.duration || 0), 0)
      const memberProjects = projectMembers.filter(pm => pm.user_id === m.id).map(pm => pm.project_id)
      const lastAct = [...mP.map(p => p.created_at), ...mC.map(c => c.scheduled_at), ...mR.map(r => r.created_at)].sort().reverse()[0]
      return {
        ...m, totalProspects: mP.length, totalBiz: mB.length, totalCalls: mC.length, totalRecordings: mR.length,
        totalMessages: mM.length, totalVideo: mV.length, ganados, perdidos, activos, totalMin,
        conversionRate: mP.length > 0 ? Math.round((ganados / mP.length) * 100) : 0,
        lastActivity: lastAct, memberProjects,
      }
    }).sort((a, b) => b.totalProspects - a.totalProspects)
  }, [team, prospects, businesses, calls, recordings, whatsappMessages, videoRooms, projectMembers])

  /* ── Activity Feed (unified) ─────────────────── */
  const activityFeed = useMemo(() => {
    const items: { type: string; member: string; memberId: string; desc: string; date: string; color: string; icon: string; projectId?: string }[] = []

    // From activity_log table
    activityLog.forEach(a => {
      const m = team.find(t => t.id === a.user_id)?.full_name || "Sistema"
      items.push({ type: a.action, member: m, memberId: a.user_id, desc: a.details?.description || a.action, date: a.created_at, color: "#6c63ff", icon: "📋", projectId: a.project_id || undefined })
    })

    // From existing data
    prospects.slice(0, 80).forEach(p => {
      const m = team.find(t => t.id === p.assigned_to)?.full_name || "—"
      items.push({ type: "prospect_created", member: m, memberId: p.assigned_to, desc: `Nuevo prospecto: ${p.full_name}${p.company ? ` (${p.company})` : ""}`, date: p.created_at, color: "#6c63ff", icon: "👤", projectId: p.project_id || undefined })
    })
    businesses.slice(0, 50).forEach(b => {
      const m = team.find(t => t.id === b.assigned_to)?.full_name || "—"
      items.push({ type: "business_saved", member: m, memberId: b.assigned_to, desc: `Empresa guardada: ${b.name} (${b.city})`, date: b.created_at, color: "#22c55e", icon: "🏢", projectId: b.project_id || undefined })
    })
    calls.slice(0, 50).forEach(c => {
      const m = team.find(t => t.id === c.setter_id)?.full_name || "—"
      const pn = (c.prospects as { full_name: string } | null)?.full_name || "prospecto"
      items.push({ type: "call_scheduled", member: m, memberId: c.setter_id, desc: `Llamada agendada con ${pn}`, date: c.scheduled_at, color: "#3b82f6", icon: "📅" })
    })
    recordings.slice(0, 50).forEach(r => {
      const m = team.find(t => t.id === r.user_id)?.full_name || "—"
      const pn = (r.prospects as { full_name: string } | null)?.full_name || "prospecto"
      items.push({ type: "call_made", member: m, memberId: r.user_id, desc: `Llamó a ${pn} (${Math.floor((r.duration || 0) / 60)}:${((r.duration || 0) % 60).toString().padStart(2, "0")})`, date: r.created_at, color: "#8b5cf6", icon: "📞" })
    })
    videoRooms.slice(0, 30).forEach(v => {
      const m = team.find(t => t.id === v.created_by)?.full_name || "—"
      const pn = (v.prospects as { full_name: string } | null)?.full_name || "prospecto"
      items.push({ type: "video_call", member: m, memberId: v.created_by, desc: `Videollamada con ${pn}`, date: v.created_at, color: "#ec4899", icon: "🎥" })
    })

    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    return items
  }, [activityLog, prospects, businesses, calls, recordings, videoRooms, team])

  /* ── Filtered activity ─────────────────── */
  const filteredActivity = useMemo(() => {
    let items = activityFeed
    if (selectedMember) items = items.filter(a => a.memberId === selectedMember)
    if (selectedFilterProject !== "all") items = items.filter(a => a.projectId === selectedFilterProject)
    if (monitorFilter !== "all") {
      const typeMap: Record<string, string[]> = {
        prospects: ["prospect_created"],
        businesses: ["business_saved"],
        calls: ["call_scheduled", "call_made"],
        messages: ["message_sent"],
        video: ["video_call"],
      }
      items = items.filter(a => typeMap[monitorFilter]?.includes(a.type))
    }
    return items.slice(0, 200)
  }, [activityFeed, selectedMember, selectedFilterProject, monitorFilter])

  /* ── Handlers ─────────────────────────────── */
  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true); setCreateError(""); setCreateSuccess("")
    try {
      const res = await fetch("/api/admin/create-user", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(createForm) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error creando usuario")
      setCreateSuccess(`${createForm.role === "setter" ? "Setter" : "Closer"} creado exitosamente`)
      setCreateForm({ fullName: "", email: "", password: "", role: "setter" })
      setTimeout(() => { setShowCreateModal(false); setCreateSuccess(""); router.refresh() }, 1500)
    } catch (err: unknown) { setCreateError(err instanceof Error ? err.message : "Error") }
    finally { setCreating(false) }
  }

  async function handleRemove() {
    if (!confirmDelete) return
    setRemoving(true)
    try {
      const res = await fetch("/api/admin/remove-setter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ setterId: confirmDelete.id, reassignTo: reassignTo || null }) })
      if (!res.ok) throw new Error("Error")
      setConfirmDelete(null); setReassignTo(""); router.refresh()
    } catch { alert("Error removiendo miembro") }
    finally { setRemoving(false) }
  }

  async function handleSaveProject(e: React.FormEvent) {
    e.preventDefault()
    setSavingProject(true)
    try {
      if (editingProject) {
        const { error } = await supabase.from("projects").update({ name: projectForm.name, description: projectForm.description || null, color: projectForm.color, updated_at: new Date().toISOString() }).eq("id", editingProject.id)
        if (error) throw error
        setProjects(prev => prev.map(p => p.id === editingProject.id ? { ...p, name: projectForm.name, description: projectForm.description || null, color: projectForm.color } : p))
      } else {
        const { data, error } = await supabase.from("projects").insert({ name: projectForm.name, description: projectForm.description || null, color: projectForm.color, organization_id: organizationId, created_by: currentUserId }).select().single()
        if (error) throw error
        if (data) setProjects(prev => [...prev, data])
      }
      setShowProjectModal(false); setEditingProject(null); setProjectForm({ name: "", description: "", color: "#6c63ff" })
    } catch { alert("Error guardando proyecto") }
    finally { setSavingProject(false) }
  }

  async function handleDeleteProject(id: string) {
    if (!confirm("¿Eliminar este proyecto? Los prospectos y empresas NO se borran.")) return
    const { error } = await supabase.from("projects").delete().eq("id", id)
    if (!error) setProjects(prev => prev.filter(p => p.id !== id))
  }

  async function handleToggleProjectMember(projectId: string, userId: string) {
    const existing = projectMembers.find(pm => pm.project_id === projectId && pm.user_id === userId)
    if (existing) {
      await supabase.from("project_members").delete().eq("id", existing.id)
      setProjectMembers(prev => prev.filter(pm => pm.id !== existing.id))
    } else {
      const member = team.find(t => t.id === userId)
      const { data } = await supabase.from("project_members").insert({ project_id: projectId, user_id: userId, role: member?.role || "setter" }).select().single()
      if (data) setProjectMembers(prev => [...prev, data])
    }
  }

  /* ── Helpers ──────────────────────────────── */
  function timeAgo(date?: string) {
    if (!date) return "Sin actividad"
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `hace ${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `hace ${hrs}h`
    return `hace ${Math.floor(hrs / 24)}d`
  }

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
  }

  const otherMembers = team.filter(m => m.id !== confirmDelete?.id && m.id !== currentUserId)

  /* ── Render ──────────────────────────────── */
  return (
    <div className="min-h-screen p-6" style={{ background: "var(--background)" }}>
      <div className="max-w-7xl mx-auto">

        {/* ── Header ─── */}
        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(108,99,255,0.15)", color: "#6c63ff" }}>CENTRO DE CONTROL</span>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Gestión de Equipo</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Creá, gestioná y monitoreá a tu equipo de setters y closers</p>
          </div>
          <button onClick={() => { setShowCreateModal(true); setCreateError(""); setCreateSuccess("") }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shrink-0"
            style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            Nuevo Miembro
          </button>
        </div>

        {/* ── Quick Stats ─── */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: "Miembros", value: team.length, icon: "👥", color: "#6c63ff" },
            { label: "Setters", value: team.filter(t => t.role === "setter" && !t.is_owner).length, icon: "🎯", color: "#3b82f6" },
            { label: "Closers", value: team.filter(t => t.role === "closer").length, icon: "💰", color: "#22c55e" },
            { label: "Proyectos", value: projects.length, icon: "📁", color: "#8b5cf6" },
            { label: "Prospectos", value: prospects.length, icon: "👤", color: "#f97316" },
            { label: "Ganados", value: prospects.filter(p => p.status === "cerrado_ganado").length, icon: "🏆", color: "#10b981" },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{s.icon} {s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ─── */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "var(--surface)" }}>
          {([
            { key: "equipo", label: "👥 Equipo", desc: "Gestión" },
            { key: "proyectos", label: "📁 Proyectos", desc: "Organización" },
            { key: "monitoreo", label: "📋 Monitoreo", desc: "Actividad" },
            { key: "rendimiento", label: "📊 Rendimiento", desc: "Métricas" },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-3 rounded-lg text-xs font-semibold transition-all"
              style={{ background: activeTab === tab.key ? "var(--accent)" : "transparent", color: activeTab === tab.key ? "white" : "var(--text-muted)" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* ═══ TAB: EQUIPO ═══════════════════════════ */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === "equipo" && (
          <div className="space-y-4">
            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {memberStats.map(m => {
                const roleColor = m.is_owner ? { bg: "rgba(239,68,68,0.15)", color: "#ef4444", label: "Admin" } : m.role === "closer" ? { bg: "rgba(34,197,94,0.15)", color: "#22c55e", label: "Closer" } : { bg: "rgba(108,99,255,0.15)", color: "#6c63ff", label: "Setter" }
                const mProjects = projects.filter(p => m.memberProjects.includes(p.id))
                return (
                  <div key={m.id} className="rounded-2xl p-5 transition-all hover:brightness-105"
                    style={{ background: "var(--surface)", border: selectedMember === m.id ? "2px solid var(--accent)" : "1px solid var(--border)" }}
                    onClick={() => setSelectedMember(selectedMember === m.id ? null : m.id)}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                          style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                          {m.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{m.full_name}</p>
                          <p className="text-xs" style={{ color: "var(--text-muted)" }}>{m.email}</p>
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold mt-1" style={{ background: roleColor.bg, color: roleColor.color }}>
                            {roleColor.label}
                          </span>
                        </div>
                      </div>
                      {!m.is_owner && m.id !== currentUserId && (
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete(m); setReassignTo("") }}
                          className="p-1.5 rounded-lg transition-all hover:bg-red-500/10" title="Remover">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                        </button>
                      )}
                    </div>

                    {/* Mini stats */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[
                        { v: m.totalProspects, l: "Prosp.", c: "#6c63ff" },
                        { v: m.ganados, l: "Ganados", c: "#10b981" },
                        { v: m.totalRecordings, l: "Llamadas", c: "#8b5cf6" },
                        { v: `${m.conversionRate}%`, l: "Conv.", c: m.conversionRate > 20 ? "#10b981" : "#ef4444" },
                      ].map(s => (
                        <div key={s.l} className="text-center p-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                          <p className="text-lg font-bold" style={{ color: s.c }}>{s.v}</p>
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.l}</p>
                        </div>
                      ))}
                    </div>

                    {/* Projects badges */}
                    {mProjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {mProjects.map(p => (
                          <span key={p.id} className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: `${p.color}20`, color: p.color }}>{p.name}</span>
                        ))}
                      </div>
                    )}

                    {/* Last activity */}
                    <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Última actividad: {timeAgo(m.lastActivity)}</p>
                      <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Desde {fmtDate(m.created_at)}</p>
                    </div>
                  </div>
                )
              })}

              {/* Add member card */}
              <button onClick={() => { setShowCreateModal(true); setCreateError(""); setCreateSuccess("") }}
                className="rounded-2xl p-5 flex flex-col items-center justify-center gap-3 transition-all hover:brightness-110 min-h-[200px]"
                style={{ background: "var(--surface)", border: "2px dashed var(--border)" }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(108,99,255,0.1)" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6c63ff" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-muted)" }}>Agregar Miembro</p>
              </button>
            </div>

            {/* Selected member detail panel */}
            {selectedMember && (() => {
              const m = memberStats.find(x => x.id === selectedMember)
              if (!m) return null
              const mProspects = prospects.filter(p => p.assigned_to === m.id)
              const mBiz = businesses.filter(b => b.assigned_to === m.id)
              return (
                <div className="rounded-2xl p-6 animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>Detalle: {m.full_name}</h3>
                    <button onClick={() => setSelectedMember(null)} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}>Cerrar ×</button>
                  </div>

                  {/* Pipeline breakdown */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                    {Object.entries(STATUS_COLORS).map(([status, sc]) => {
                      const count = mProspects.filter(p => p.status === status).length
                      return (
                        <div key={status} className="p-3 rounded-xl text-center" style={{ background: sc.bg }}>
                          <p className="text-xl font-bold" style={{ color: sc.color }}>{count}</p>
                          <p className="text-[10px] font-semibold" style={{ color: sc.color }}>{sc.label}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* Recent prospects */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Últimos prospectos ({mProspects.length})</h4>
                    <div className="space-y-1 max-h-[200px] overflow-y-auto">
                      {mProspects.slice(0, 15).map(p => {
                        const sc = STATUS_COLORS[p.status] || STATUS_COLORS.nuevo
                        return (
                          <div key={p.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                            <div className="flex items-center gap-2">
                              <Link href={`/prospects/${p.id}`} className="text-xs font-semibold hover:underline" style={{ color: "var(--accent-light)" }}>{p.full_name}</Link>
                              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{p.company}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                          </div>
                        )
                      })}
                      {mProspects.length === 0 && <p className="text-xs p-2" style={{ color: "var(--text-muted)" }}>Sin prospectos asignados</p>}
                    </div>
                  </div>

                  {/* Recent businesses */}
                  <div>
                    <h4 className="text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Empresas guardadas ({mBiz.length})</h4>
                    <div className="space-y-1 max-h-[150px] overflow-y-auto">
                      {mBiz.slice(0, 10).map(b => (
                        <div key={b.id} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                          <Link href={`/businesses/${b.id}`} className="text-xs font-semibold hover:underline" style={{ color: "var(--accent-light)" }}>{b.name}</Link>
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{b.city}</span>
                        </div>
                      ))}
                      {mBiz.length === 0 && <p className="text-xs p-2" style={{ color: "var(--text-muted)" }}>Sin empresas</p>}
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ═══ TAB: PROYECTOS ════════════════════════ */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === "proyectos" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Organizá tu equipo en proyectos diferentes. Asigná setters y closers a cada uno.</p>
              <button onClick={() => { setEditingProject(null); setProjectForm({ name: "", description: "", color: "#6c63ff" }); setShowProjectModal(true) }}
                className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
                style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
                Nuevo Proyecto
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="rounded-2xl p-12 text-center" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                <p className="text-4xl mb-3">📁</p>
                <p className="font-bold mb-1" style={{ color: "var(--text-primary)" }}>Sin proyectos</p>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>Creá tu primer proyecto para organizar el trabajo</p>
                <button onClick={() => { setEditingProject(null); setProjectForm({ name: "", description: "", color: "#6c63ff" }); setShowProjectModal(true) }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--accent)", color: "white" }}>
                  Crear Proyecto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map(project => {
                  const pMembers = projectMembers.filter(pm => pm.project_id === project.id)
                  const pMemberDetails = pMembers.map(pm => team.find(t => t.id === pm.user_id)).filter(Boolean) as Member[]
                  const pProspects = prospects.filter(p => p.project_id === project.id)
                  const pBiz = businesses.filter(b => b.project_id === project.id)
                  const ganados = pProspects.filter(p => p.status === "cerrado_ganado").length
                  const convRate = pProspects.length > 0 ? Math.round((ganados / pProspects.length) * 100) : 0
                  const statusConf = project.status === "active" ? { bg: "rgba(34,197,94,0.15)", color: "#22c55e", label: "Activo" }
                    : project.status === "paused" ? { bg: "rgba(234,179,8,0.15)", color: "#eab308", label: "Pausado" }
                    : project.status === "completed" ? { bg: "rgba(16,185,129,0.15)", color: "#10b981", label: "Completado" }
                    : { bg: "rgba(107,114,128,0.15)", color: "#6b7280", label: "Archivado" }

                  return (
                    <div key={project.id} className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)", borderLeft: `4px solid ${project.color}` }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{project.name}</h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: statusConf.bg, color: statusConf.color }}>{statusConf.label}</span>
                          </div>
                          {project.description && <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{project.description}</p>}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingProject(project); setProjectForm({ name: project.name, description: project.description || "", color: project.color }); setShowProjectModal(true) }}
                            className="p-1.5 rounded-lg transition-all hover:bg-blue-500/10" title="Editar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                          </button>
                          <button onClick={() => handleDeleteProject(project.id)}
                            className="p-1.5 rounded-lg transition-all hover:bg-red-500/10" title="Eliminar">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                          </button>
                        </div>
                      </div>

                      {/* Project stats */}
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {[
                          { v: pProspects.length, l: "Prospectos", c: "#6c63ff" },
                          { v: pBiz.length, l: "Empresas", c: "#3b82f6" },
                          { v: ganados, l: "Ganados", c: "#10b981" },
                          { v: `${convRate}%`, l: "Conversión", c: convRate > 20 ? "#10b981" : "#ef4444" },
                        ].map(s => (
                          <div key={s.l} className="text-center p-2 rounded-lg" style={{ background: "var(--surface-2)" }}>
                            <p className="text-sm font-bold" style={{ color: s.c }}>{s.v}</p>
                            <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{s.l}</p>
                          </div>
                        ))}
                      </div>

                      {/* Team members */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {pMemberDetails.slice(0, 5).map(m => (
                            <div key={m.id} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold -ml-1 first:ml-0 ring-2 ring-[var(--surface)]"
                              style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }} title={m.full_name}>
                              {m.full_name?.charAt(0)?.toUpperCase()}
                            </div>
                          ))}
                          {pMemberDetails.length > 5 && <span className="text-[10px] ml-1" style={{ color: "var(--text-muted)" }}>+{pMemberDetails.length - 5}</span>}
                          {pMemberDetails.length === 0 && <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Sin miembros</span>}
                        </div>
                        <button onClick={() => setShowAssignModal(project.id)}
                          className="text-[10px] px-2 py-1 rounded-lg font-semibold"
                          style={{ background: "rgba(108,99,255,0.1)", color: "#6c63ff" }}>
                          Gestionar equipo
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ═══ TAB: MONITOREO ════════════════════════ */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === "monitoreo" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <select value={selectedMember || "all"} onChange={e => setSelectedMember(e.target.value === "all" ? null : e.target.value)}
                className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                <option value="all">Todos los miembros</option>
                {team.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>

              <select value={selectedFilterProject} onChange={e => setSelectedFilterProject(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs outline-none" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                <option value="all">Todos los proyectos</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>

              <div className="flex gap-1">
                {([
                  { key: "all", label: "Todo", icon: "📋" },
                  { key: "prospects", label: "Prospectos", icon: "👤" },
                  { key: "businesses", label: "Empresas", icon: "🏢" },
                  { key: "calls", label: "Llamadas", icon: "📞" },
                  { key: "video", label: "Video", icon: "🎥" },
                ] as const).map(f => (
                  <button key={f.key} onClick={() => setMonitorFilter(f.key)}
                    className="px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all"
                    style={{ background: monitorFilter === f.key ? "var(--accent)" : "var(--surface)", color: monitorFilter === f.key ? "white" : "var(--text-muted)" }}>
                    {f.icon} {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Feed */}
            <div className="rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
                <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  Actividad en Tiempo Real ({filteredActivity.length})
                </h3>
              </div>
              <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
                {filteredActivity.length === 0 && (
                  <p className="text-center text-sm py-8" style={{ color: "var(--text-muted)" }}>Sin actividad con estos filtros</p>
                )}
                {filteredActivity.map((a, i) => {
                  const project = a.projectId ? projects.find(p => p.id === a.projectId) : null
                  return (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl transition-all hover:brightness-110" style={{ background: "var(--surface-2)" }}>
                      <span className="text-lg shrink-0">{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs" style={{ color: "var(--text-primary)" }}>
                          <span className="font-bold">{a.member}</span>{" "}{a.desc}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(a.date)}</p>
                          {project && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={{ background: `${project.color}20`, color: project.color }}>{project.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ═══ TAB: RENDIMIENTO ══════════════════════ */}
        {/* ═══════════════════════════════════════════ */}
        {activeTab === "rendimiento" && (
          <div className="space-y-4">
            {/* Ranking Table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
                <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Ranking del Equipo</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--surface-2)" }}>
                      {["#", "Miembro", "Rol", "Prospectos", "Activos", "Ganados", "Perdidos", "Conv. %", "Empresas", "Llamadas", "Mensajes", "Videos", "Última Act."].map(h => (
                        <th key={h} className="p-3 text-left font-semibold text-xs" style={{ color: "var(--text-muted)" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {memberStats.map((m, i) => {
                      const rc = m.is_owner ? { bg: "rgba(239,68,68,0.15)", color: "#ef4444" } : m.role === "closer" ? { bg: "rgba(34,197,94,0.15)", color: "#22c55e" } : { bg: "rgba(108,99,255,0.15)", color: "#6c63ff" }
                      return (
                        <tr key={m.id} className="transition-all hover:brightness-110 cursor-pointer"
                          onClick={() => { setSelectedMember(m.id); setActiveTab("equipo") }}
                          style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className="p-3 font-bold" style={{ color: "var(--text-muted)" }}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                                {m.full_name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-xs" style={{ color: "var(--text-primary)" }}>{m.full_name}</p>
                                <p className="text-[10px] truncate max-w-[120px]" style={{ color: "var(--text-muted)" }}>{m.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize" style={{ background: rc.bg, color: rc.color }}>
                              {m.is_owner ? "admin" : m.role}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold" style={{ color: "var(--text-primary)" }}>{m.totalProspects}</td>
                          <td className="p-3 text-center" style={{ color: "#22c55e" }}>{m.activos}</td>
                          <td className="p-3 text-center font-bold" style={{ color: "#10b981" }}>{m.ganados}</td>
                          <td className="p-3 text-center" style={{ color: "#ef4444" }}>{m.perdidos}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                              style={{ background: m.conversionRate > 20 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.1)", color: m.conversionRate > 20 ? "#10b981" : "#ef4444" }}>
                              {m.conversionRate}%
                            </span>
                          </td>
                          <td className="p-3 text-center" style={{ color: "var(--text-secondary)" }}>{m.totalBiz}</td>
                          <td className="p-3 text-center" style={{ color: "var(--text-secondary)" }}>{m.totalRecordings}</td>
                          <td className="p-3 text-center" style={{ color: "var(--text-secondary)" }}>{m.totalMessages}</td>
                          <td className="p-3 text-center" style={{ color: "var(--text-secondary)" }}>{m.totalVideo}</td>
                          <td className="p-3 text-center text-[10px]" style={{ color: "var(--text-muted)" }}>{timeAgo(m.lastActivity)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pipeline breakdown */}
            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>Pipeline General</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {Object.entries(STATUS_COLORS).map(([status, sc]) => {
                  const count = prospects.filter(p => p.status === status).length
                  const pct = prospects.length > 0 ? Math.round((count / prospects.length) * 100) : 0
                  return (
                    <div key={status} className="p-3 rounded-xl text-center" style={{ background: sc.bg }}>
                      <p className="text-2xl font-bold" style={{ color: sc.color }}>{count}</p>
                      <p className="text-xs font-semibold" style={{ color: sc.color }}>{sc.label}</p>
                      <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{pct}%</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Per-member comparison */}
            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>Comparación por Miembro</h3>
              <div className="space-y-3">
                {memberStats.map(m => {
                  const maxP = Math.max(...memberStats.map(x => x.totalProspects), 1)
                  const pct = Math.round((m.totalProspects / maxP) * 100)
                  return (
                    <div key={m.id} className="flex items-center gap-3">
                      <div className="w-24 text-xs font-semibold truncate" style={{ color: "var(--text-primary)" }}>{m.full_name}</div>
                      <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                        <div className="h-full rounded-full flex items-center px-2 transition-all" style={{ width: `${Math.max(pct, 5)}%`, background: "linear-gradient(90deg, var(--accent), #7c3aed)" }}>
                          <span className="text-[10px] font-bold text-white whitespace-nowrap">{m.totalProspects} prosp. · {m.ganados} gan. · {m.conversionRate}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* ═══ MODALS ════════════════════════════════════ */}
      {/* ═══════════════════════════════════════════════ */}

      {/* Modal: Crear miembro */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreateModal(false) }}>
          <div className="w-full max-w-md rounded-2xl p-6 animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Agregar Miembro</h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Creá un nuevo setter o closer para tu equipo</p>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Nombre completo</label>
                <input type="text" value={createForm.fullName} onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Ej: Juan Pérez" required
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Email</label>
                <input type="email" value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@ejemplo.com" required
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Contraseña</label>
                <input type="password" value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mínimo 6 caracteres" required minLength={6}
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Rol</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { role: "setter", icon: "🎯", label: "Setter", desc: "Prospección", active: "rgba(108,99,255,0.15)", accent: "var(--accent)" },
                    { role: "closer", icon: "💰", label: "Closer", desc: "Cierre de ventas", active: "rgba(34,197,94,0.15)", accent: "#22c55e" },
                  ].map(r => (
                    <button key={r.role} type="button" onClick={() => setCreateForm(f => ({ ...f, role: r.role }))}
                      className="p-3 rounded-xl text-sm font-medium transition-all text-center"
                      style={{
                        background: createForm.role === r.role ? r.active : "var(--surface-2)",
                        border: `2px solid ${createForm.role === r.role ? r.accent : "var(--border)"}`,
                        color: createForm.role === r.role ? r.accent : "var(--text-muted)",
                      }}>
                      <span className="text-lg block mb-1">{r.icon}</span>
                      {r.label}
                      <span className="block text-xs mt-0.5 opacity-70">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {createError && <p className="text-xs p-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>{createError}</p>}
              {createSuccess && <p className="text-xs p-2 rounded-lg" style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}>{createSuccess}</p>}

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>Cancelar</button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                  {creating ? "Creando..." : "Crear Miembro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar eliminación */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
          <div className="w-full max-w-md rounded-2xl p-6 animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Remover miembro</h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              Vas a remover a <strong style={{ color: "var(--text-primary)" }}>{confirmDelete.full_name}</strong> del equipo.
            </p>

            {otherMembers.length > 0 && (
              <div className="mb-5">
                <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>Reasignar sus leads a:</label>
                <select value={reassignTo} onChange={e => setReassignTo(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                  <option value="">— Sin reasignar —</option>
                  {otherMembers.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}
                </select>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>Cancelar</button>
              <button onClick={handleRemove} disabled={removing}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                {removing ? "Removiendo..." : "Confirmar y remover"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear/Editar proyecto */}
      {showProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) { setShowProjectModal(false); setEditingProject(null) } }}>
          <div className="w-full max-w-md rounded-2xl p-6 animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>{editingProject ? "Editar Proyecto" : "Nuevo Proyecto"}</h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
              {editingProject ? "Modificá los datos del proyecto" : "Creá un proyecto para organizar tu trabajo"}
            </p>

            <form onSubmit={handleSaveProject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Nombre del proyecto</label>
                <input type="text" value={projectForm.name} onChange={e => setProjectForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Campaña Q2, Clientes LATAM..." required
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Descripción (opcional)</label>
                <textarea value={projectForm.description} onChange={e => setProjectForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="¿De qué trata este proyecto?"
                  rows={3}
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none resize-none"
                  style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: "var(--text-secondary)" }}>Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PROJECT_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setProjectForm(f => ({ ...f, color: c }))}
                      className="w-8 h-8 rounded-full transition-all"
                      style={{ background: c, border: projectForm.color === c ? "3px solid white" : "2px solid transparent", boxShadow: projectForm.color === c ? `0 0 0 2px ${c}` : "none" }} />
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowProjectModal(false); setEditingProject(null) }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>Cancelar</button>
                <button type="submit" disabled={savingProject}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                  {savingProject ? "Guardando..." : editingProject ? "Guardar Cambios" : "Crear Proyecto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Asignar miembros a proyecto */}
      {showAssignModal && (() => {
        const project = projects.find(p => p.id === showAssignModal)
        if (!project) return null
        const pMembers = projectMembers.filter(pm => pm.project_id === project.id)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={e => { if (e.target === e.currentTarget) setShowAssignModal(null) }}>
            <div className="w-full max-w-md rounded-2xl p-6 animate-fade-in" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>Equipo: {project.name}</h3>
              <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Seleccioná los miembros que trabajan en este proyecto</p>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {team.map(m => {
                  const isAssigned = pMembers.some(pm => pm.user_id === m.id)
                  const role = m.is_owner ? "Admin" : m.role === "closer" ? "Closer" : "Setter"
                  return (
                    <button key={m.id} onClick={() => handleToggleProjectMember(project.id, m.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                      style={{ background: isAssigned ? "rgba(108,99,255,0.1)" : "var(--surface-2)", border: `1px solid ${isAssigned ? "var(--accent)" : "var(--border)"}` }}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ background: isAssigned ? "linear-gradient(135deg, var(--accent), #7c3aed)" : "var(--surface-3)", color: isAssigned ? "white" : "var(--text-muted)" }}>
                        {isAssigned ? "✓" : m.full_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{m.full_name}</p>
                        <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>{role} · {m.email}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              <button onClick={() => setShowAssignModal(null)}
                className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "var(--accent)", color: "white" }}>
                Listo
              </button>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
