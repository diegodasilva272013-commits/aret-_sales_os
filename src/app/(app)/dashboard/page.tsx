import { createClient } from "@/lib/supabase/server"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profileCheck } = await supabase
    .from("profiles")
    .select("is_owner")
    .eq("id", user?.id || "")
    .single()

  const isOwner = profileCheck?.is_owner || false

  // Queries base - non-owners solo ven lo suyo
  let allProspectsQuery = supabase.from("prospects").select("id, status, phase, follow_up_count, assigned_to, created_at, source_type")
  let recentProspectsQuery = supabase.from("prospects").select("*, profiles!assigned_to(full_name)").order("created_at", { ascending: false }).limit(6)
  let allBusinessesQuery = supabase.from("businesses").select("id, status, follow_up_count, created_at")

  if (!isOwner) {
    allProspectsQuery = allProspectsQuery.eq("assigned_to", user?.id || "")
    recentProspectsQuery = recentProspectsQuery.eq("assigned_to", user?.id || "")
    allBusinessesQuery = allBusinessesQuery.eq("assigned_to", user?.id || "")
  }

  const [
    { data: profile },
    { data: allProspects },
    { data: myProspects },
    { data: recentProspects },
    { data: allBusinesses },
    { data: setters },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name, role, is_owner, organizations(name, plan, analyses_used, plan_limit)").eq("id", user?.id || "").single(),
    allProspectsQuery,
    supabase.from("prospects").select("id, status, follow_up_count").eq("assigned_to", user?.id || ""),
    recentProspectsQuery,
    allBusinessesQuery,
    isOwner ? supabase.from("profiles").select("id, full_name").order("full_name") : Promise.resolve({ data: [] }),
  ])

  // Métricas reales
  const prospects = allProspects || []
  const businesses = allBusinesses || []
  const total = prospects.length
  const totalBiz = businesses.length
  const activos = prospects.filter(p => p.status === "activo" || p.status === "nuevo").length
  const llamadas = prospects.filter(p => p.status === "llamada_agendada").length
  const cerrados = prospects.filter(p => p.status === "cerrado_ganado").length
  const conversionRate = total > 0 ? Math.round((cerrados / total) * 100) : 0
  const misProspectos = myProspects?.length || 0
  const conFollowUp = prospects.filter(p => p.follow_up_count > 0).length
  const tasaRespuesta = total > 0 ? Math.round((conFollowUp / total) * 100) : 0

  // Esta semana
  const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); startOfWeek.setHours(0,0,0,0)
  const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0)
  const prospectosEstaSemana = prospects.filter(p => new Date(p.created_at) >= startOfWeek).length
  const prospectosMes = prospects.filter(p => new Date(p.created_at) >= startOfMonth).length
  const llamadasHoyQuery = supabase.from("scheduled_calls").select("id", { count: "exact", head: true })
    .gte("scheduled_at", new Date().toISOString().split("T")[0])
    .lt("scheduled_at", new Date(Date.now() + 86400000).toISOString().split("T")[0])
  const llamadasSemanaQuery = supabase.from("scheduled_calls").select("id", { count: "exact", head: true })
    .gte("scheduled_at", startOfWeek.toISOString())

  if (!isOwner) {
    llamadasHoyQuery.eq("setter_id", user?.id || "")
    llamadasSemanaQuery.eq("setter_id", user?.id || "")
  }

  const llamadasHoy = await llamadasHoyQuery
  const llamadasSemana = await llamadasSemanaQuery

  // Por setter
  const setterStats = (setters || []).map(s => ({
    ...s,
    count: prospects.filter(p => p.assigned_to === s.id).length,
    llamadas: prospects.filter(p => p.assigned_to === s.id && p.status === "llamada_agendada").length,
  })).filter(s => s.count > 0).sort((a, b) => b.count - a.count)

  // Org info
  const org = (profile as { organizations?: { name: string; plan: string; analyses_used: number; plan_limit: number } } | null)?.organizations
  const usagePct = org ? Math.round((org.analyses_used / org.plan_limit) * 100) : 0

  const hora = new Date().getHours()
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches"

  const statusColors = {
    nuevo: { color: "#6c63ff", bg: "rgba(108,99,255,0.15)", label: "Nuevo" },
    activo: { color: "#22c55e", bg: "rgba(34,197,94,0.15)", label: "Activo" },
    pausado: { color: "#f59e0b", bg: "rgba(245,158,11,0.15)", label: "Pausado" },
    llamada_agendada: { color: "#3b82f6", bg: "rgba(59,130,246,0.15)", label: "Llamada" },
    cerrado_ganado: { color: "#22c55e", bg: "rgba(34,197,94,0.15)", label: "Ganado" },
    cerrado_perdido: { color: "#ef4444", bg: "rgba(239,68,68,0.15)", label: "Perdido" },
  }

  return (
    <div className="min-h-screen p-8" style={{ background: "var(--background)" }}>
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 animate-fade-in">
          <div>
            <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>{saludo},</p>
            <h1 className="text-3xl font-bold gradient-text">{profile?.full_name || "Setter"} 👋</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>Resumen de tu actividad de prospección</p>
          </div>
          <div className="flex gap-3">
            <Link href="/export/prospects"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar CSV
            </Link>
            <Link href="/prospects/new"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "linear-gradient(135deg, var(--accent), #7c3aed)", color: "white" }}>
              + Nuevo Prospecto
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {[
            { label: "Prospectos", value: total, icon: "👥", color: "var(--accent)", sub: `+${prospectosEstaSemana} esta semana` },
            { label: "Este mes", value: prospectosMes, icon: "📅", color: "#8b5cf6", sub: `+${prospectosEstaSemana} esta semana` },
            { label: "Llamadas hoy", value: llamadasHoy.count || 0, icon: "📞", color: "#3b82f6", sub: `${llamadasSemana.count || 0} esta semana` },
            { label: "Cerrados", value: cerrados, icon: "🎯", color: "#22c55e", sub: `${conversionRate}% conversión` },
            { label: "Activos", value: activos, icon: "🔥", color: "#f59e0b", sub: `${misProspectos} míos` },
          ].map(kpi => (
            <div key={kpi.label} className="p-5 rounded-2xl animate-fade-in"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div className="flex items-start justify-between mb-3">
                <span className="text-xl">{kpi.icon}</span>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${kpi.color}20` }}>
                  <div className="w-2 h-2 rounded-full" style={{ background: kpi.color }} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              <p className="text-xs mt-1 font-medium" style={{ color: "var(--text-primary)" }}>{kpi.label}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>{kpi.sub}</p>
            </div>
          ))}
        </div>

        <div className={`grid ${isOwner ? "grid-cols-3" : "grid-cols-2"} gap-4 mb-6`}>
          {/* Fase distribution */}
          <div className="p-5 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Pipeline por Fase</h3>
            {[
              { label: "Contacto", count: prospects.filter(p => p.phase === "contacto").length, color: "#6c63ff" },
              { label: "Venta", count: prospects.filter(p => p.phase === "venta").length, color: "#f59e0b" },
              { label: "Cierre", count: prospects.filter(p => p.phase === "cierre").length, color: "#22c55e" },
            ].map(item => (
              <div key={item.label} className="mb-3">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-secondary)" }}>
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
                <div className="w-full h-1.5 rounded-full" style={{ background: "var(--surface-2)" }}>
                  <div className="h-full rounded-full" style={{
                    width: `${total > 0 ? (item.count / total) * 100 : 0}%`,
                    background: item.color,
                  }} />
                </div>
              </div>
            ))}
            <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="flex justify-between text-xs" style={{ color: "var(--text-secondary)" }}>
                <span>Tasa de respuesta</span>
                <span className="font-semibold" style={{ color: "#22c55e" }}>{tasaRespuesta}%</span>
              </div>
            </div>
          </div>

          {/* Setters ranking - solo visible para owners */}
          {isOwner && <div className="p-5 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>Ranking Setters</h3>
            {setterStats.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>Sin datos todavía</p>
            ) : setterStats.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 mb-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{ background: i === 0 ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "var(--surface-2)", color: i === 0 ? "white" : "var(--text-muted)" }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{s.full_name}</p>
                  <div className="w-full h-1 rounded-full mt-1" style={{ background: "var(--surface-2)" }}>
                    <div className="h-full rounded-full" style={{
                      width: `${setterStats[0].count > 0 ? (s.count / setterStats[0].count) * 100 : 0}%`,
                      background: "linear-gradient(90deg, var(--accent), #a78bfa)"
                    }} />
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{s.count}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.llamadas}📞</p>
                </div>
              </div>
            ))}
          </div>}

          {/* Plan usage */}
          <div className="p-5 rounded-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Uso del Plan</h3>
            <p className="text-xs mb-4 capitalize" style={{ color: "var(--text-muted)" }}>Plan {org?.plan || "free"}</p>
            <div className="flex items-end gap-2 mb-3">
              <p className="text-4xl font-bold gradient-text">{org?.analyses_used || 0}</p>
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>/ {org?.plan_limit || 50} análisis</p>
            </div>
            <div className="w-full h-2.5 rounded-full mb-2" style={{ background: "var(--surface-2)" }}>
              <div className="h-full rounded-full transition-all" style={{
                width: `${Math.min(usagePct, 100)}%`,
                background: usagePct > 80 ? "linear-gradient(90deg,#f59e0b,#ef4444)" : "linear-gradient(90deg,var(--accent),#a78bfa)"
              }} />
            </div>
            <p className="text-xs" style={{ color: usagePct > 80 ? "var(--warning)" : "var(--text-muted)" }}>
              {usagePct > 80 ? "⚠️ Cerca del límite" : `${100 - usagePct}% disponible`}
            </p>
            <Link href="/settings"
              className="mt-4 block text-center py-2 rounded-xl text-xs font-semibold"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
              Gestionar plan →
            </Link>
          </div>
        </div>

        {/* Recent prospects */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ background: "var(--surface)" }}>
            <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Actividad Reciente</h3>
            <Link href="/prospects" className="text-xs hover:underline" style={{ color: "var(--accent-light)" }}>
              Ver todos →
            </Link>
          </div>
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--surface-2)" }}>
                {["Prospecto", "Empresa", "Fuente", "Estado", "Follow-ups", "Setter"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentProspects?.map(p => {
                const cfg = statusColors[p.status as keyof typeof statusColors] || statusColors.nuevo
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid var(--border)", background: "var(--surface-2)" }}>
                    <td className="px-4 py-3">
                      <Link href={`/prospects/${p.id}`} className="font-medium text-sm hover:underline" style={{ color: "var(--text-primary)" }}>
                        {p.full_name}
                      </Link>
                      <p className="text-xs mt-0.5 truncate max-w-xs" style={{ color: "var(--text-muted)" }}>{p.headline}</p>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--text-secondary)" }}>{p.company || "—"}</td>
                    <td className="px-4 py-3">
                      {p.source_type === "instagram"
                        ? <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(225,48,108,0.12)", color: "#e1306c" }}>IG</span>
                        : <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "rgba(0,119,181,0.12)", color: "#0077b5" }}>in</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-0.5">
                        {[0,1,2,3,4,5].map(i => (
                          <div key={i} className="w-3 h-3 rounded-sm" style={{ background: i < (p.follow_up_count || 0) ? "var(--accent)" : "var(--surface-3)" }} />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {(p as { profiles?: { full_name: string } }).profiles?.full_name?.split(" ")[0] || "—"}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
