import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function GET(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get("desde") || new Date(new Date().setDate(new Date().getDate() - 29)).toISOString().split("T")[0]
  const hasta = searchParams.get("hasta") || new Date().toISOString().split("T")[0]
  const groupBy = searchParams.get("group_by") || "day"
  const proyectoId = searchParams.get("proyecto_id")
  const userId = searchParams.get("user_id")

  // Fetch setter reports
  let setterQ = supabase.from("reportes_setter").select("*").eq("organization_id", organizationId).gte("fecha", desde).lte("fecha", hasta)
  if (proyectoId) setterQ = setterQ.eq("proyecto_id", proyectoId)
  if (userId) setterQ = setterQ.eq("user_id", userId)
  const { data: sr } = await setterQ

  // Fetch closer reports
  let closerQ = supabase.from("reportes_closer").select("*").eq("organization_id", organizationId).gte("fecha", desde).lte("fecha", hasta)
  if (proyectoId) closerQ = closerQ.eq("proyecto_id", proyectoId)
  if (userId) closerQ = closerQ.eq("user_id", userId)
  const { data: cr } = await closerQ

  // Fetch profiles for names
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, role").eq("organization_id", organizationId)
  const profMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name || "Sin nombre"]))

  const setterReports = sr || []
  const closerReports = cr || []

  // --- Timeline grouped by day/week/month ---
  function getGroupKey(fecha: string): string {
    const d = new Date(fecha)
    if (groupBy === "week") {
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d.setDate(diff))
      return monday.toISOString().split("T")[0]
    }
    if (groupBy === "month") return fecha.slice(0, 7)
    return fecha
  }

  const timelineMap = new Map<string, { fecha: string; leads: number; citas: number; shows: number; ventas: number; monto_cobrado: number }>()
  for (const r of setterReports) {
    const key = getGroupKey(r.fecha)
    const prev = timelineMap.get(key) || { fecha: key, leads: 0, citas: 0, shows: 0, ventas: 0, monto_cobrado: 0 }
    prev.leads += r.leads_nuevos || 0
    prev.citas += r.citas_agendadas || 0
    prev.shows += r.citas_show || 0
    timelineMap.set(key, prev)
  }
  for (const r of closerReports) {
    const key = getGroupKey(r.fecha)
    const prev = timelineMap.get(key) || { fecha: key, leads: 0, citas: 0, shows: 0, ventas: 0, monto_cobrado: 0 }
    prev.ventas += r.ventas_cerradas || 0
    prev.monto_cobrado += Number(r.monto_cobrado || 0)
    timelineMap.set(key, prev)
  }
  const timeline = Array.from(timelineMap.values()).sort((a, b) => a.fecha.localeCompare(b.fecha))

  // --- Per-person setter ---
  const setterAgg = new Map<string, { id: string; nombre: string; leads: number; contactados: number; citas: number; shows: number; citas_calificadas: number; tasa_conversion: number }>()
  for (const r of setterReports) {
    const prev = setterAgg.get(r.user_id) || { id: r.user_id, nombre: profMap[r.user_id] || "?", leads: 0, contactados: 0, citas: 0, shows: 0, citas_calificadas: 0, tasa_conversion: 0 }
    prev.leads += r.leads_nuevos || 0
    prev.contactados += r.contactos_efectivos || 0
    prev.citas += r.citas_agendadas || 0
    prev.shows += r.citas_show || 0
    prev.citas_calificadas += r.citas_calificadas || 0
    setterAgg.set(r.user_id, prev)
  }
  const porPersonaSetter = Array.from(setterAgg.values()).map(s => ({
    ...s,
    tasa_conversion: s.leads > 0 ? Math.round((s.citas / s.leads) * 100) : 0,
  }))

  // --- Per-person closer ---
  const closerAgg = new Map<string, { id: string; nombre: string; ventas: number; monto_cobrado: number; shows: number; tasa_cierre: number }>()
  for (const r of closerReports) {
    const prev = closerAgg.get(r.user_id) || { id: r.user_id, nombre: profMap[r.user_id] || "?", ventas: 0, monto_cobrado: 0, shows: 0, tasa_cierre: 0 }
    prev.ventas += r.ventas_cerradas || 0
    prev.monto_cobrado += Number(r.monto_cobrado || 0)
    prev.shows += r.shows || 0
    closerAgg.set(r.user_id, prev)
  }
  const porPersonaCloser = Array.from(closerAgg.values()).map(c => ({
    ...c,
    tasa_cierre: c.shows > 0 ? Math.round((c.ventas / c.shows) * 100) : 0,
  }))

  // --- Per-project ---
  const { data: proyectos } = await supabase.from("director_proyectos").select("id, nombre").eq("organization_id", organizationId)
  const proyMap = Object.fromEntries((proyectos || []).map(p => [p.id, p.nombre]))

  const proyAgg = new Map<string, { nombre: string; leads: number; citas: number; shows: number; ventas: number; monto_cobrado: number }>()
  for (const r of setterReports) {
    if (!r.proyecto_id) continue
    const prev = proyAgg.get(r.proyecto_id) || { nombre: proyMap[r.proyecto_id] || "?", leads: 0, citas: 0, shows: 0, ventas: 0, monto_cobrado: 0 }
    prev.leads += r.leads_nuevos || 0
    prev.citas += r.citas_agendadas || 0
    prev.shows += r.citas_show || 0
    proyAgg.set(r.proyecto_id, prev)
  }
  for (const r of closerReports) {
    if (!r.proyecto_id) continue
    const prev = proyAgg.get(r.proyecto_id) || { nombre: proyMap[r.proyecto_id] || "?", leads: 0, citas: 0, shows: 0, ventas: 0, monto_cobrado: 0 }
    prev.ventas += r.ventas_cerradas || 0
    prev.monto_cobrado += Number(r.monto_cobrado || 0)
    proyAgg.set(r.proyecto_id, prev)
  }
  const porProyecto = Array.from(proyAgg.values())

  // --- Payment distribution ---
  const pagos = { completo: 0, parcial: 0, sin_pago: 0 }
  for (const r of closerReports) {
    const tp = r.tipo_pago || "completo"
    if (tp in pagos) pagos[tp as keyof typeof pagos]++
  }
  const distribucionPagos = [
    { name: "Completo", value: pagos.completo },
    { name: "Parcial", value: pagos.parcial },
    { name: "Sin pago", value: pagos.sin_pago },
  ]

  // --- Motivos ---
  const motivosMap = new Map<string, number>()
  for (const r of closerReports) {
    if (r.motivo_no_cierre) motivosMap.set(r.motivo_no_cierre, (motivosMap.get(r.motivo_no_cierre) || 0) + 1)
  }
  const motivosNoCierre = Array.from(motivosMap.entries()).map(([name, value]) => ({ name, value }))

  // --- Evolution per person ---
  function buildEvolution(reports: typeof setterReports, key: string) {
    const byPerson = new Map<string, Map<string, number>>()
    const allDates = new Set<string>()
    for (const r of reports) {
      const gk = getGroupKey(r.fecha)
      allDates.add(gk)
      const name = profMap[r.user_id] || r.user_id
      if (!byPerson.has(name)) byPerson.set(name, new Map())
      const pm = byPerson.get(name)!
      pm.set(gk, (pm.get(gk) || 0) + (Number((r as Record<string, unknown>)[key]) || 0))
    }
    const dates = Array.from(allDates).sort()
    const names = Array.from(byPerson.keys())
    const data = dates.map(fecha => {
      const row: Record<string, string | number> = { fecha }
      for (const name of names) row[name] = byPerson.get(name)?.get(fecha) || 0
      return row
    })
    return { data, names }
  }

  const setterEvo = buildEvolution(setterReports, "citas_agendadas")
  const closerEvo = buildEvolution(closerReports, "ventas_cerradas")

  return NextResponse.json({
    timeline,
    porPersonaSetter,
    porPersonaCloser,
    porProyecto,
    distribucionPagos,
    motivosNoCierre,
    setterEvolucion: { data: setterEvo.data, names: setterEvo.names },
    closerEvolucion: { data: closerEvo.data, names: closerEvo.names },
  })
}
