import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function GET(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get("desde") || new Date(new Date().setDate(1)).toISOString().split("T")[0]
  const hasta = searchParams.get("hasta") || new Date().toISOString().split("T")[0]
  const proyectoId = searchParams.get("proyecto_id")

  // --- Setter reports ---
  let setterQ = supabase
    .from("reportes_setter")
    .select("*, profiles:user_id(id, full_name)")
    .eq("organization_id", organizationId)
    .gte("fecha", desde)
    .lte("fecha", hasta)
  if (proyectoId) setterQ = setterQ.eq("proyecto_id", proyectoId)
  const { data: setterReports } = await setterQ

  // --- Closer reports ---
  let closerQ = supabase
    .from("reportes_closer")
    .select("*, profiles:user_id(id, full_name)")
    .eq("organization_id", organizationId)
    .gte("fecha", desde)
    .lte("fecha", hasta)
  if (proyectoId) closerQ = closerQ.eq("proyecto_id", proyectoId)
  const { data: closerReports } = await closerQ

  const sr = setterReports || []
  const cr = closerReports || []

  // --- Aggregate setter stats ---
  const totalLeads = sr.reduce((s, r) => s + (r.leads_nuevos || 0), 0)
  const totalIntentos = sr.reduce((s, r) => s + (r.intentos_contacto || 0), 0)
  const totalContactos = sr.reduce((s, r) => s + (r.contactos_efectivos || 0), 0)
  const totalCitas = sr.reduce((s, r) => s + (r.citas_agendadas || 0), 0)
  const totalShows = sr.reduce((s, r) => s + (r.citas_show || 0), 0)
  const totalNoShows = sr.reduce((s, r) => s + (r.citas_no_show || 0), 0)
  const totalCalificadas = sr.reduce((s, r) => s + (r.citas_calificadas || 0), 0)
  const totalMensajes = sr.reduce((s, r) => s + (r.mensajes_enviados || 0), 0)
  const totalRespuestas = sr.reduce((s, r) => s + (r.respuestas_recibidas || 0), 0)

  // --- Aggregate closer stats ---
  const totalVentas = cr.reduce((s, r) => s + (r.ventas_cerradas || 0), 0)
  const totalCerrado = cr.reduce((s, r) => s + Number(r.monto_cerrado || 0), 0)
  const totalCobrado = cr.reduce((s, r) => s + Number(r.monto_cobrado || 0), 0)
  const totalPropuestas = cr.reduce((s, r) => s + (r.propuestas_enviadas || 0), 0)
  const totalSeguimientos = cr.reduce((s, r) => s + (r.seguimientos_realizados || 0), 0)
  const closerShows = cr.reduce((s, r) => s + (r.shows || 0), 0)

  const tasaCierre = closerShows > 0 ? Math.round((totalVentas / closerShows) * 100) : 0

  // --- Per-setter breakdown ---
  const setterMap = new Map<string, { nombre: string; leads: number; intentos: number; contactados: number; agendadas: number; show: number; noShow: number; calificadas: number; mensajes: number; respuestas: number; reuniones: number }>()
  for (const r of sr) {
    const name = (r.profiles as any)?.full_name || "Sin nombre"
    const prev = setterMap.get(r.user_id) || { nombre: name, leads: 0, intentos: 0, contactados: 0, agendadas: 0, show: 0, noShow: 0, calificadas: 0, mensajes: 0, respuestas: 0, reuniones: 0 }
    prev.leads += r.leads_nuevos || 0
    prev.intentos += r.intentos_contacto || 0
    prev.contactados += r.contactos_efectivos || 0
    prev.agendadas += r.citas_agendadas || 0
    prev.show += r.citas_show || 0
    prev.noShow += r.citas_no_show || 0
    prev.calificadas += r.citas_calificadas || 0
    prev.mensajes += r.mensajes_enviados || 0
    prev.respuestas += r.respuestas_recibidas || 0
    prev.reuniones += r.asistio_reunion ? 1 : 0
    setterMap.set(r.user_id, prev)
  }

  // --- Per-closer breakdown ---
  const closerMap = new Map<string, { nombre: string; citas: number; show: number; ventas: number; cerrado: number; cobrado: number; propuestas: number; seguimientos: number; reuniones: number }>()
  for (const r of cr) {
    const name = (r.profiles as any)?.full_name || "Sin nombre"
    const prev = closerMap.get(r.user_id) || { nombre: name, citas: 0, show: 0, ventas: 0, cerrado: 0, cobrado: 0, propuestas: 0, seguimientos: 0, reuniones: 0 }
    prev.citas += r.citas_tomadas || 0
    prev.show += r.shows || 0
    prev.ventas += r.ventas_cerradas || 0
    prev.cerrado += Number(r.monto_cerrado || 0)
    prev.cobrado += Number(r.monto_cobrado || 0)
    prev.propuestas += r.propuestas_enviadas || 0
    prev.seguimientos += r.seguimientos_realizados || 0
    prev.reuniones += r.asistio_reunion ? 1 : 0
    closerMap.set(r.user_id, prev)
  }

  // --- Motivos de no cierre ---
  const motivosMap = new Map<string, number>()
  for (const r of cr) {
    if (r.motivo_no_cierre) {
      motivosMap.set(r.motivo_no_cierre, (motivosMap.get(r.motivo_no_cierre) || 0) + 1)
    }
  }

  // --- Cash por closer ---
  const cashData = Array.from(closerMap.entries()).map(([id, d]) => ({
    id,
    nombre: d.nombre,
    completos: cr.filter(r => r.user_id === id && r.tipo_pago === "completo").length,
    parciales: cr.filter(r => r.user_id === id && r.tipo_pago === "parcial").length,
    sinPago: cr.filter(r => r.user_id === id && r.tipo_pago === "sin_pago").length,
    totalCerrado: d.cerrado,
    cobrado: d.cobrado,
    pendiente: d.cerrado - d.cobrado,
  }))

  // --- Reunion stats ---
  const settersTotal = new Set(sr.map(r => r.user_id)).size
  const closersTotal = new Set(cr.map(r => r.user_id)).size
  const settersReunion = new Set(sr.filter(r => r.asistio_reunion).map(r => r.user_id)).size
  const closersReunion = new Set(cr.filter(r => r.asistio_reunion).map(r => r.user_id)).size

  // --- Reportes de hoy ---
  const hoy = new Date().toISOString().split("T")[0]
  const { data: settersHoy } = await supabase
    .from("reportes_setter")
    .select("user_id, profiles:user_id(full_name), asistio_reunion")
    .eq("organization_id", organizationId)
    .eq("fecha", hoy)
  const { data: closersHoy } = await supabase
    .from("reportes_closer")
    .select("user_id, profiles:user_id(full_name), asistio_reunion")
    .eq("organization_id", organizationId)
    .eq("fecha", hoy)

  // All team members
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .in("role", ["setter", "closer"])

  const setterProfiles = (allProfiles || []).filter(p => p.role === "setter")
  const closerProfiles = (allProfiles || []).filter(p => p.role === "closer")

  const reportesHoy = {
    setters: setterProfiles.map(p => ({
      id: p.id,
      nombre: p.full_name,
      enviado: (settersHoy || []).some(r => r.user_id === p.id),
      reunion: (settersHoy || []).find(r => r.user_id === p.id)?.asistio_reunion || false,
    })),
    closers: closerProfiles.map(p => ({
      id: p.id,
      nombre: p.full_name,
      enviado: (closersHoy || []).some(r => r.user_id === p.id),
      reunion: (closersHoy || []).find(r => r.user_id === p.id)?.asistio_reunion || false,
    })),
  }

  // --- Embudo ---
  const embudo = {
    leads: totalLeads,
    citas: totalCitas,
    shows: totalShows || closerShows,
    ventas: totalVentas,
    leadToVenta: totalLeads > 0 ? Math.round((totalVentas / totalLeads) * 100) : 0,
    citaToShow: totalCitas > 0 ? Math.round(((totalShows || closerShows) / totalCitas) * 100) : 0,
    showToCierre: (totalShows || closerShows) > 0 ? Math.round((totalVentas / (totalShows || closerShows)) * 100) : 0,
  }

  return NextResponse.json({
    periodo: { desde, hasta },
    stats: {
      totalLeads,
      totalIntentos,
      totalContactos,
      totalCitas,
      totalShows,
      totalNoShows,
      totalCalificadas,
      totalMensajes,
      totalRespuestas,
      totalVentas,
      totalCerrado,
      totalCobrado,
      pendienteCobro: totalCerrado - totalCobrado,
      totalPropuestas,
      totalSeguimientos,
      tasaCierre,
    },
    setters: Array.from(setterMap.entries()).map(([id, d]) => ({ id, ...d })),
    closers: Array.from(closerMap.entries()).map(([id, d]) => ({
      id, ...d,
      pendiente: d.cerrado - d.cobrado,
      tasaCierre: d.show > 0 ? Math.round((d.ventas / d.show) * 100) : 0,
    })),
    cash: cashData,
    motivos: Array.from(motivosMap.entries()).map(([motivo, cantidad]) => ({ motivo, cantidad })).sort((a, b) => b.cantidad - a.cantidad),
    embudo,
    reportesHoy,
    reunionStats: {
      settersTotal,
      closersTotal,
      settersReunion,
      closersReunion,
    },
  })
}
