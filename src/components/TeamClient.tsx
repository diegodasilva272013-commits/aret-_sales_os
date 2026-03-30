"use client"

import { useState, useMemo } from "react"
import Link from "next/link"

type Member = { id: string; full_name: string; email: string; role: string; is_owner: boolean; created_at: string }
type Prospect = { id: string; full_name: string; company: string; status: string; phase: string; follow_up_count: number; assigned_to: string; created_at: string; last_contact_at?: string; linkedin_url?: string; instagram_url?: string; source_type?: string }
type Business = { id: string; name: string; category: string; city: string; assigned_to: string; created_at: string; status?: string }
type Call = { id: string; prospect_id: string; setter_id: string; scheduled_at: string; status: string; notes?: string; prospects?: { full_name: string; company?: string } | null }
type Recording = { id: string; user_id: string; prospect_id: string; duration: number; created_at: string; prospects?: { full_name: string } | null }
type VideoRoom = { id: string; room_name: string; created_by: string; prospect_id?: string; status: string; created_at: string; prospects?: { full_name: string } | null }
type WMessage = { id: string; prospect_id: string; direction: string; created_at: string }

type Props = {
  team: Member[]
  prospects: Prospect[]
  businesses: Business[]
  calls: Call[]
  recordings: Recording[]
  videoRooms: VideoRoom[]
  whatsappMessages: WMessage[]
  currentUserId: string
}

const STATUS_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  nuevo: { bg: "rgba(108,99,255,0.15)", color: "#6c63ff", label: "Nuevo" },
  activo: { bg: "rgba(34,197,94,0.15)", color: "#22c55e", label: "Activo" },
  pausado: { bg: "rgba(234,179,8,0.15)", color: "#eab308", label: "Pausado" },
  llamada_agendada: { bg: "rgba(59,130,246,0.15)", color: "#3b82f6", label: "Llamada" },
  cerrado_ganado: { bg: "rgba(16,185,129,0.15)", color: "#10b981", label: "Ganado" },
  cerrado_perdido: { bg: "rgba(239,68,68,0.15)", color: "#ef4444", label: "Perdido" },
}

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  admin: { bg: "rgba(239,68,68,0.15)", color: "#ef4444" },
  setter: { bg: "rgba(108,99,255,0.15)", color: "#6c63ff" },
  closer: { bg: "rgba(234,179,8,0.15)", color: "#eab308" },
}

export default function TeamClient({ team, prospects, businesses, calls, recordings, videoRooms, whatsappMessages, currentUserId }: Props) {
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"resumen" | "prospectos" | "empresas" | "llamadas" | "actividad">("resumen")

  // Filtered data based on selected member
  const filtered = useMemo(() => {
    const mid = selectedMember
    return {
      prospects: mid ? prospects.filter(p => p.assigned_to === mid) : prospects,
      businesses: mid ? businesses.filter(b => b.assigned_to === mid) : businesses,
      calls: mid ? calls.filter(c => c.setter_id === mid) : calls,
      recordings: mid ? recordings.filter(r => r.user_id === mid) : recordings,
      videoRooms: mid ? videoRooms.filter(v => v.created_by === mid) : videoRooms,
      whatsappMessages: mid ? whatsappMessages.filter(m => {
        const prospectIds = new Set(prospects.filter(p => p.assigned_to === mid).map(p => p.id))
        return prospectIds.has(m.prospect_id)
      }) : whatsappMessages,
    }
  }, [selectedMember, prospects, businesses, calls, recordings, videoRooms, whatsappMessages])

  // Stats per member
  const memberStats = useMemo(() => {
    return team.map(m => {
      const mProspects = prospects.filter(p => p.assigned_to === m.id)
      const mBiz = businesses.filter(b => b.assigned_to === m.id)
      const mCalls = calls.filter(c => c.setter_id === m.id)
      const mRecs = recordings.filter(r => r.user_id === m.id)
      const mMsgs = whatsappMessages.filter(w => {
        const pIds = new Set(mProspects.map(p => p.id))
        return pIds.has(w.prospect_id)
      })
      const ganados = mProspects.filter(p => p.status === "cerrado_ganado").length
      const perdidos = mProspects.filter(p => p.status === "cerrado_perdido").length
      const activos = mProspects.filter(p => p.status === "activo").length
      const totalMinutes = mRecs.reduce((sum, r) => sum + (r.duration || 0), 0)
      const lastActivity = [...mProspects.map(p => p.created_at), ...mCalls.map(c => c.scheduled_at), ...mRecs.map(r => r.created_at)].sort().reverse()[0]

      return {
        ...m,
        totalProspects: mProspects.length,
        totalBiz: mBiz.length,
        totalCalls: mCalls.length,
        totalRecordings: mRecs.length,
        totalMessages: mMsgs.length,
        ganados,
        perdidos,
        activos,
        totalMinutes,
        conversionRate: mProspects.length > 0 ? Math.round((ganados / mProspects.length) * 100) : 0,
        lastActivity,
      }
    }).sort((a, b) => b.totalProspects - a.totalProspects)
  }, [team, prospects, businesses, calls, recordings, whatsappMessages])

  const selectedStats = selectedMember ? memberStats.find(m => m.id === selectedMember) : null

  // Global stats
  const globalStats = useMemo(() => ({
    totalProspects: filtered.prospects.length,
    nuevos: filtered.prospects.filter(p => p.status === "nuevo").length,
    activos: filtered.prospects.filter(p => p.status === "activo").length,
    ganados: filtered.prospects.filter(p => p.status === "cerrado_ganado").length,
    perdidos: filtered.prospects.filter(p => p.status === "cerrado_perdido").length,
    llamadasAgendadas: filtered.calls.filter(c => c.status !== "completed").length,
    totalBiz: filtered.businesses.length,
    totalMsgs: filtered.whatsappMessages.length,
    totalRecordings: filtered.recordings.length,
    totalMinutes: filtered.recordings.reduce((s, r) => s + (r.duration || 0), 0),
  }), [filtered])

  function timeAgo(date?: string) {
    if (!date) return "Sin actividad"
    const diff = Date.now() - new Date(date).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `hace ${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `hace ${hrs}h`
    const days = Math.floor(hrs / 24)
    return `hace ${days}d`
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
  }

  function formatDuration(secs: number) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="min-h-screen p-6" style={{ background: "var(--background)" }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 animate-fade-in">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: "rgba(108,99,255,0.15)", color: "#6c63ff" }}>EQUIPO</span>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Control de Equipo</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              {selectedMember ? `Viendo datos de ${selectedStats?.full_name}` : "Vista general de toda la organización"}
            </p>
          </div>
          {selectedMember && (
            <button onClick={() => setSelectedMember(null)}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              ← Ver todos
            </button>
          )}
        </div>

        {/* Team member selector */}
        <div className="flex gap-3 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          <button onClick={() => setSelectedMember(null)}
            className="shrink-0 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: !selectedMember ? "linear-gradient(135deg, var(--accent), #7c3aed)" : "var(--surface)",
              color: !selectedMember ? "white" : "var(--text-secondary)",
              border: !selectedMember ? "none" : "1px solid var(--border)"
            }}>
            👥 Todos ({team.length})
          </button>
          {memberStats.map(m => (
            <button key={m.id} onClick={() => setSelectedMember(m.id)}
              className="shrink-0 px-4 py-3 rounded-xl text-sm transition-all text-left"
              style={{
                background: selectedMember === m.id ? "linear-gradient(135deg, var(--accent), #7c3aed)" : "var(--surface)",
                color: selectedMember === m.id ? "white" : "var(--text-primary)",
                border: selectedMember === m.id ? "none" : "1px solid var(--border)"
              }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: selectedMember === m.id ? "rgba(255,255,255,0.2)" : "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                  {m.full_name?.charAt(0)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p className="font-semibold text-xs truncate max-w-[100px]">{m.full_name}</p>
                  <p className="text-xs opacity-70">{m.totalProspects} prosp. · {m.conversionRate}%</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {[
            { label: "Prospectos", value: globalStats.totalProspects, icon: "👤", color: "#6c63ff" },
            { label: "Activos", value: globalStats.activos, icon: "🔥", color: "#22c55e" },
            { label: "Ganados", value: globalStats.ganados, icon: "🏆", color: "#10b981" },
            { label: "Empresas", value: globalStats.totalBiz, icon: "🏢", color: "#3b82f6" },
            { label: "Llamadas", value: globalStats.totalRecordings, icon: "📞", color: "#8b5cf6" },
          ].map(kpi => (
            <div key={kpi.label} className="p-4 rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{kpi.icon} {kpi.label}</p>
              <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-6" style={{ background: "var(--surface)" }}>
          {([
            { key: "resumen", label: "📊 Resumen" },
            { key: "prospectos", label: "👤 Prospectos" },
            { key: "empresas", label: "🏢 Empresas" },
            { key: "llamadas", label: "📞 Llamadas" },
            { key: "actividad", label: "📋 Actividad" },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab.key ? "var(--accent)" : "transparent",
                color: activeTab === tab.key ? "white" : "var(--text-muted)"
              }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "resumen" && (
          <div className="space-y-4">
            {/* Team ranking table */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
                <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Ranking del Equipo</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--surface-2)" }}>
                      <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>#</th>
                      <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Miembro</th>
                      <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Rol</th>
                      <th className="text-center p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Prospectos</th>
                      <th className="text-center p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Activos</th>
                      <th className="text-center p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Ganados</th>
                      <th className="text-center p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Perdidos</th>
                      <th className="text-center p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Conv. %</th>
                      <th className="text-center p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Empresas</th>
                      <th className="text-center p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Llamadas</th>
                      <th className="text-center p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Mensajes</th>
                      <th className="text-center p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Última Actividad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {memberStats.map((m, i) => {
                      const rc = ROLE_COLORS[m.role] || ROLE_COLORS.setter
                      return (
                        <tr key={m.id} className="cursor-pointer transition-all hover:brightness-110"
                          onClick={() => setSelectedMember(m.id)}
                          style={{ background: selectedMember === m.id ? "rgba(108,99,255,0.08)" : "transparent", borderBottom: "1px solid var(--border)" }}>
                          <td className="p-3 font-bold" style={{ color: "var(--text-muted)" }}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                                style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
                                {m.full_name?.charAt(0)?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-xs" style={{ color: "var(--text-primary)" }}>{m.full_name}</p>
                                <p className="text-xs truncate max-w-[140px]" style={{ color: "var(--text-muted)" }}>{m.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold capitalize" style={{ background: rc.bg, color: rc.color }}>
                              {m.role}
                            </span>
                          </td>
                          <td className="p-3 text-center font-bold" style={{ color: "var(--text-primary)" }}>{m.totalProspects}</td>
                          <td className="p-3 text-center" style={{ color: "#22c55e" }}>{m.activos}</td>
                          <td className="p-3 text-center font-bold" style={{ color: "#10b981" }}>{m.ganados}</td>
                          <td className="p-3 text-center" style={{ color: "#ef4444" }}>{m.perdidos}</td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ background: m.conversionRate > 20 ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.1)", color: m.conversionRate > 20 ? "#10b981" : "#ef4444" }}>
                              {m.conversionRate}%
                            </span>
                          </td>
                          <td className="p-3 text-center" style={{ color: "var(--text-secondary)" }}>{m.totalBiz}</td>
                          <td className="p-3 text-center" style={{ color: "var(--text-secondary)" }}>{m.totalRecordings}</td>
                          <td className="p-3 text-center" style={{ color: "var(--text-secondary)" }}>{m.totalMessages}</td>
                          <td className="p-3 text-center text-xs" style={{ color: "var(--text-muted)" }}>{timeAgo(m.lastActivity)}</td>
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
                  const count = filtered.prospects.filter(p => p.status === status).length
                  const pct = filtered.prospects.length > 0 ? Math.round((count / filtered.prospects.length) * 100) : 0
                  return (
                    <div key={status} className="p-3 rounded-xl text-center" style={{ background: sc.bg }}>
                      <p className="text-2xl font-bold" style={{ color: sc.color }}>{count}</p>
                      <p className="text-xs font-semibold" style={{ color: sc.color }}>{sc.label}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{pct}%</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "prospectos" && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                Prospectos ({filtered.prospects.length})
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0" style={{ background: "var(--surface-2)" }}>
                  <tr>
                    <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Prospecto</th>
                    <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Empresa</th>
                    <th className="text-center p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Estado</th>
                    <th className="text-center p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Fase</th>
                    <th className="text-center p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Follow-ups</th>
                    <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Asignado a</th>
                    <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Último contacto</th>
                    <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Creado</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.prospects.map(p => {
                    const sc = STATUS_COLORS[p.status] || STATUS_COLORS.nuevo
                    const assignedMember = team.find(t => t.id === p.assigned_to)
                    return (
                      <tr key={p.id} className="transition-all hover:brightness-110" style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="p-3">
                          <Link href={`/prospects/${p.id}`} className="font-semibold text-xs hover:underline" style={{ color: "var(--accent-light)" }}>
                            {p.full_name}
                          </Link>
                        </td>
                        <td className="p-3 text-xs" style={{ color: "var(--text-secondary)" }}>{p.company || "—"}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: sc.bg, color: sc.color }}>{sc.label}</span>
                        </td>
                        <td className="p-3 text-center text-xs capitalize" style={{ color: "var(--text-muted)" }}>{p.phase}</td>
                        <td className="p-3 text-center text-xs font-bold" style={{ color: "var(--text-primary)" }}>{p.follow_up_count}</td>
                        <td className="p-3">
                          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
                            {assignedMember?.full_name || "—"}
                          </span>
                        </td>
                        <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{p.last_contact_at ? timeAgo(p.last_contact_at) : "Nunca"}</td>
                        <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(p.created_at)}</td>
                      </tr>
                    )
                  })}
                  {filtered.prospects.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Sin prospectos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "empresas" && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
              <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                Empresas Guardadas ({filtered.businesses.length})
              </h3>
            </div>
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0" style={{ background: "var(--surface-2)" }}>
                  <tr>
                    <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Empresa</th>
                    <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Categoría</th>
                    <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Ciudad</th>
                    <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Asignado a</th>
                    <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.businesses.map(b => {
                    const assignedMember = team.find(t => t.id === b.assigned_to)
                    return (
                      <tr key={b.id} className="transition-all hover:brightness-110" style={{ borderBottom: "1px solid var(--border)" }}>
                        <td className="p-3">
                          <Link href={`/businesses/${b.id}`} className="font-semibold text-xs hover:underline" style={{ color: "var(--accent-light)" }}>
                            {b.name}
                          </Link>
                        </td>
                        <td className="p-3 text-xs capitalize" style={{ color: "var(--text-secondary)" }}>{b.category}</td>
                        <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{b.city}</td>
                        <td className="p-3 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{assignedMember?.full_name || "—"}</td>
                        <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(b.created_at)}</td>
                      </tr>
                    )
                  })}
                  {filtered.businesses.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Sin empresas</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "llamadas" && (
          <div className="space-y-4">
            {/* Scheduled calls */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
                <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  Llamadas Agendadas ({filtered.calls.length})
                </h3>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0" style={{ background: "var(--surface-2)" }}>
                    <tr>
                      <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Prospecto</th>
                      <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Setter</th>
                      <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Fecha</th>
                      <th className="text-center p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Estado</th>
                      <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.calls.map(c => {
                      const setter = team.find(t => t.id === c.setter_id)
                      const prospect = c.prospects as { full_name: string; company?: string } | null
                      return (
                        <tr key={c.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className="p-3 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{prospect?.full_name || "—"}</td>
                          <td className="p-3 text-xs" style={{ color: "var(--text-secondary)" }}>{setter?.full_name || "—"}</td>
                          <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>
                            {new Date(c.scheduled_at).toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                              style={{ background: c.status === "completed" ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)", color: c.status === "completed" ? "#10b981" : "#3b82f6" }}>
                              {c.status === "completed" ? "Completada" : "Pendiente"}
                            </span>
                          </td>
                          <td className="p-3 text-xs truncate max-w-[200px]" style={{ color: "var(--text-muted)" }}>{c.notes || "—"}</td>
                        </tr>
                      )
                    })}
                    {filtered.calls.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Sin llamadas agendadas</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Call recordings */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
                <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                  Grabaciones ({filtered.recordings.length}) · {Math.round(globalStats.totalMinutes / 60)} min totales
                </h3>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0" style={{ background: "var(--surface-2)" }}>
                    <tr>
                      <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Prospecto</th>
                      <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Miembro</th>
                      <th className="text-center p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Duración</th>
                      <th className="text-left p-3 font-semibold text-xs" style={{ color: "var(--text-muted)" }}>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.recordings.map(r => {
                      const member = team.find(t => t.id === r.user_id)
                      const prospect = r.prospects as { full_name: string } | null
                      return (
                        <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td className="p-3 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{prospect?.full_name || "Desconocido"}</td>
                          <td className="p-3 text-xs" style={{ color: "var(--text-secondary)" }}>{member?.full_name || "—"}</td>
                          <td className="p-3 text-center text-xs font-mono" style={{ color: "var(--text-primary)" }}>{formatDuration(r.duration || 0)}</td>
                          <td className="p-3 text-xs" style={{ color: "var(--text-muted)" }}>{formatDate(r.created_at)}</td>
                        </tr>
                      )
                    })}
                    {filtered.recordings.length === 0 && (
                      <tr><td colSpan={4} className="p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>Sin grabaciones</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "actividad" && (
          <div className="space-y-4">
            {/* Activity feed */}
            <div className="rounded-2xl p-5" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--text-primary)" }}>Actividad Reciente</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {(() => {
                  // Build unified activity feed
                  const activities: { type: string; member: string; description: string; date: string; color: string }[] = []

                  filtered.prospects.slice(0, 50).forEach(p => {
                    const m = team.find(t => t.id === p.assigned_to)?.full_name || "—"
                    activities.push({
                      type: "prospect",
                      member: m,
                      description: `Analizó prospecto: ${p.full_name}${p.company ? ` (${p.company})` : ""}`,
                      date: p.created_at,
                      color: "#6c63ff",
                    })
                  })

                  filtered.calls.slice(0, 30).forEach(c => {
                    const m = team.find(t => t.id === c.setter_id)?.full_name || "—"
                    const prospect = c.prospects as { full_name: string } | null
                    activities.push({
                      type: "call",
                      member: m,
                      description: `Agendó llamada con ${prospect?.full_name || "prospecto"}`,
                      date: c.scheduled_at,
                      color: "#3b82f6",
                    })
                  })

                  filtered.recordings.slice(0, 30).forEach(r => {
                    const m = team.find(t => t.id === r.user_id)?.full_name || "—"
                    const prospect = r.prospects as { full_name: string } | null
                    activities.push({
                      type: "recording",
                      member: m,
                      description: `Llamó a ${prospect?.full_name || "prospecto"} (${formatDuration(r.duration || 0)})`,
                      date: r.created_at,
                      color: "#8b5cf6",
                    })
                  })

                  filtered.businesses.slice(0, 30).forEach(b => {
                    const m = team.find(t => t.id === b.assigned_to)?.full_name || "—"
                    activities.push({
                      type: "business",
                      member: m,
                      description: `Guardó empresa: ${b.name} (${b.city})`,
                      date: b.created_at,
                      color: "#22c55e",
                    })
                  })

                  filtered.videoRooms.slice(0, 20).forEach(v => {
                    const m = team.find(t => t.id === v.created_by)?.full_name || "—"
                    const prospect = v.prospects as { full_name: string } | null
                    activities.push({
                      type: "video",
                      member: m,
                      description: `Videollamada con ${prospect?.full_name || "prospecto"}`,
                      date: v.created_at,
                      color: "#ec4899",
                    })
                  })

                  // Sort by date descending
                  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

                  if (activities.length === 0) {
                    return <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>Sin actividad registrada</p>
                  }

                  return activities.slice(0, 100).map((a, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl transition-all hover:brightness-110"
                      style={{ background: "var(--surface-2)" }}>
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: a.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs" style={{ color: "var(--text-primary)" }}>
                          <span className="font-semibold">{a.member}</span>
                          {" "}{a.description}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{timeAgo(a.date)}</p>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
