import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function GET(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get("desde") || new Date().toISOString().split("T")[0]
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

  // --- Aggregate stats ---
  const totalLeads = sr.reduce((s, r) => s + (r.leads_nuevos || 0), 0)
  const totalCitas = sr.reduce((s, r) => s + (r.citas_agendadas || 0), 0)
  const totalShows = sr.reduce((s, r) => s + (r.citas_show || 0), 0)
  const totalVentas = cr.reduce((s, r) => s + (r.ventas_cerradas || 0), 0)
  const totalMontoCerrado = cr.reduce((s, r) => s + Number(r.monto_cerrado || 0), 0)
  const totalMontoCobrado = cr.reduce((s, r) => s + Number(r.monto_cobrado || 0), 0)
  const closerShows = cr.reduce((s, r) => s + (r.shows || 0), 0)
  const effectiveShows = totalShows || closerShows
  const tasaCierre = effectiveShows > 0 ? totalVentas / effectiveShows : 0
  const tasaShow = totalCitas > 0 ? effectiveShows / totalCitas : 0

  // --- setterTable (matches original interface) ---
  const setterMap = new Map<string, {
    nombre: string; leads_recibidos: number; intentos_contacto: number; contactados: number
    citas_agendadas: number; citas_show: number; citas_noshow: number; citas_calificadas: number
    citas_reprogramadas: number; mensajes_enviados: number; respuestas_obtenidas: number; asistio_reunion: boolean | null
  }>()
  for (const r of sr) {
    const name = (r.profiles as any)?.full_name || "Sin nombre"
    const prev = setterMap.get(r.user_id) || {
      nombre: name, leads_recibidos: 0, intentos_contacto: 0, contactados: 0,
      citas_agendadas: 0, citas_show: 0, citas_noshow: 0, citas_calificadas: 0,
      citas_reprogramadas: 0, mensajes_enviados: 0, respuestas_obtenidas: 0, asistio_reunion: null,
    }
    prev.leads_recibidos += r.leads_nuevos || 0
    prev.intentos_contacto += r.intentos_contacto || 0
    prev.contactados += r.contactos_efectivos || 0
    prev.citas_agendadas += r.citas_agendadas || 0
    prev.citas_show += r.citas_show || 0
    prev.citas_noshow += r.citas_no_show || 0
    prev.citas_calificadas += r.citas_calificadas || 0
    prev.citas_reprogramadas += r.citas_reprogramadas || 0
    prev.mensajes_enviados += r.mensajes_enviados || 0
    prev.respuestas_obtenidas += r.respuestas_recibidas || 0
    if (r.asistio_reunion === true) prev.asistio_reunion = true
    else if (r.asistio_reunion === false && prev.asistio_reunion === null) prev.asistio_reunion = false
    setterMap.set(r.user_id, prev)
  }
  const setterTable = Array.from(setterMap.entries()).map(([id, d]) => ({ id, ...d }))

  // --- closerTable (matches original interface) ---
  const closerMap = new Map<string, {
    nombre: string; citas_recibidas: number; citas_show: number; citas_noshow: number
    ventas_cerradas: number; ventas_no_cerradas: number; monto_total_cerrado: number
    monto_cobrado: number; monto_pendiente: number; pagos_completos: number
    pagos_parciales: number; pagos_nulo: number; propuestas_enviadas: number
    seguimientos_realizados: number; asistio_reunion: boolean | null
    motivo_precio: number; motivo_consultar: number; motivo_momento: number
    motivo_competencia: number; motivo_otro: number
  }>()
  for (const r of cr) {
    const name = (r.profiles as any)?.full_name || "Sin nombre"
    const prev = closerMap.get(r.user_id) || {
      nombre: name, citas_recibidas: 0, citas_show: 0, citas_noshow: 0,
      ventas_cerradas: 0, ventas_no_cerradas: 0, monto_total_cerrado: 0,
      monto_cobrado: 0, monto_pendiente: 0, pagos_completos: 0,
      pagos_parciales: 0, pagos_nulo: 0, propuestas_enviadas: 0,
      seguimientos_realizados: 0, asistio_reunion: null,
      motivo_precio: 0, motivo_consultar: 0, motivo_momento: 0,
      motivo_competencia: 0, motivo_otro: 0,
    }
    prev.citas_recibidas += r.shows || r.citas_tomadas || 0
    prev.citas_show += r.shows || 0
    prev.citas_noshow += (r.citas_tomadas || 0) - (r.shows || 0)
    prev.ventas_cerradas += r.ventas_cerradas || 0
    prev.ventas_no_cerradas += (r.shows || 0) - (r.ventas_cerradas || 0)
    prev.monto_total_cerrado += Number(r.monto_cerrado || 0)
    prev.monto_cobrado += Number(r.monto_cobrado || 0)
    prev.pagos_completos += r.tipo_pago === "completo" ? 1 : 0
    prev.pagos_parciales += r.tipo_pago === "parcial" ? 1 : 0
    prev.pagos_nulo += r.tipo_pago === "sin_pago" ? 1 : 0
    prev.propuestas_enviadas += r.propuestas_enviadas || 0
    prev.seguimientos_realizados += r.seguimientos_realizados || 0
    if (r.asistio_reunion === true) prev.asistio_reunion = true
    else if (r.asistio_reunion === false && prev.asistio_reunion === null) prev.asistio_reunion = false
    const motivo = (r.motivo_no_cierre || "").toLowerCase()
    if (motivo.includes("precio")) prev.motivo_precio++
    else if (motivo.includes("consultar")) prev.motivo_consultar++
    else if (motivo.includes("momento")) prev.motivo_momento++
    else if (motivo.includes("competencia")) prev.motivo_competencia++
    else if (motivo) prev.motivo_otro++
    setterMap.set(r.user_id, prev as any)
    closerMap.set(r.user_id, prev)
  }
  const closerTable = Array.from(closerMap.entries()).map(([id, d]) => ({
    id, ...d,
    monto_pendiente: d.monto_total_cerrado - d.monto_cobrado,
  }))

  // --- Reportes de hoy ---
  const hoy = new Date().toISOString().split("T")[0]
  const { data: settersHoy } = await supabase
    .from("reportes_setter")
    .select("id, user_id, profiles:user_id(full_name), asistio_reunion")
    .eq("organization_id", organizationId)
    .eq("fecha", hoy)
  const { data: closersHoy } = await supabase
    .from("reportes_closer")
    .select("id, user_id, profiles:user_id(full_name), asistio_reunion")
    .eq("organization_id", organizationId)
    .eq("fecha", hoy)

  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .in("role", ["setter", "closer"])

  const setterProfiles = (allProfiles || []).filter(p => p.role === "setter")
  const closerProfiles = (allProfiles || []).filter(p => p.role === "closer")

  const reportesHoy = {
    setters: setterProfiles.map(p => {
      const reporte = (settersHoy || []).find(r => r.user_id === p.id)
      return {
        id: p.id,
        nombre: p.full_name,
        enviado: !!reporte,
        asistio_reunion: reporte?.asistio_reunion ?? null,
        reporte_id: reporte?.id ?? null,
      }
    }),
    closers: closerProfiles.map(p => {
      const reporte = (closersHoy || []).find(r => r.user_id === p.id)
      return {
        id: p.id,
        nombre: p.full_name,
        enviado: !!reporte,
        asistio_reunion: reporte?.asistio_reunion ?? null,
        reporte_id: reporte?.id ?? null,
      }
    }),
  }

  // --- Reunion stats ---
  const settersTotal = new Set(sr.map(r => r.user_id)).size
  const closersTotal = new Set(cr.map(r => r.user_id)).size
  const settersReunion = new Set(sr.filter(r => r.asistio_reunion).map(r => r.user_id)).size
  const closersReunion = new Set(cr.filter(r => r.asistio_reunion).map(r => r.user_id)).size

  return NextResponse.json({
    stats: {
      totalLeads,
      totalCitas,
      totalShows: effectiveShows,
      totalVentas,
      totalMontoCerrado,
      totalMontoCobrado,
      totalMontoPendiente: totalMontoCerrado - totalMontoCobrado,
      tasaCierre,
      tasaShow,
    },
    setterTable,
    closerTable,
    reportesHoy,
    reunionStats: {
      setters_asistieron: settersReunion,
      setters_total: settersTotal,
      closers_asistieron: closersReunion,
      closers_total: closersTotal,
    },
  })
}
