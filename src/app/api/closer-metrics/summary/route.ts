import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/closer-metrics/summary - KPI summary data
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "Sin organización" }, { status: 403 })
  }

  const params = req.nextUrl.searchParams
  const closerId = params.get("closer_id")
  const periodo = params.get("periodo") || "mes"

  // Date range
  const now = new Date()
  let desde: string
  let desdeAnterior: string // for comparison

  if (periodo === "hoy") {
    desde = now.toISOString().split("T")[0]
    const ayer = new Date(now)
    ayer.setDate(ayer.getDate() - 1)
    desdeAnterior = ayer.toISOString().split("T")[0]
  } else if (periodo === "semana") {
    const d = new Date(now)
    d.setDate(d.getDate() - d.getDay())
    desde = d.toISOString().split("T")[0]
    const prev = new Date(d)
    prev.setDate(prev.getDate() - 7)
    desdeAnterior = prev.toISOString().split("T")[0]
  } else {
    // mes
    desde = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    desdeAnterior = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}-01`
  }

  // Current period query
  let query = supabase
    .from("closer_metrics")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .gte("fecha", desde)

  if (profile.role !== "admin") {
    query = query.eq("closer_id", user.id)
  } else if (closerId) {
    query = query.eq("closer_id", closerId)
  }

  const { data: current } = await query

  // Previous period for comparison
  let prevQuery = supabase
    .from("closer_metrics")
    .select("*")
    .eq("organization_id", profile.organization_id)
    .gte("fecha", desdeAnterior)
    .lt("fecha", desde)

  if (profile.role !== "admin") {
    prevQuery = prevQuery.eq("closer_id", user.id)
  } else if (closerId) {
    prevQuery = prevQuery.eq("closer_id", closerId)
  }

  const { data: previous } = await prevQuery

  const rows = current || []
  const prevRows = previous || []

  const sum = (arr: typeof rows, field: string) =>
    arr.reduce((acc, r) => acc + (Number((r as Record<string, unknown>)[field]) || 0), 0)

  const currentSummary = {
    leads_asignados: sum(rows, "leads_asignados"),
    leads_contactados: sum(rows, "leads_contactados"),
    respuestas_obtenidas: sum(rows, "respuestas_obtenidas"),
    llamadas_realizadas: sum(rows, "llamadas_realizadas"),
    conversaciones_efectivas: sum(rows, "conversaciones_efectivas"),
    reuniones_agendadas: sum(rows, "reuniones_agendadas"),
    reuniones_realizadas: sum(rows, "reuniones_realizadas"),
    ofertas_enviadas: sum(rows, "ofertas_enviadas"),
    ventas_cerradas: sum(rows, "ventas_cerradas"),
    monto_vendido: sum(rows, "monto_vendido"),
    cobrado: sum(rows, "cobrado"),
    dias: rows.length,
  }

  const prevSummary = {
    leads_asignados: sum(prevRows, "leads_asignados"),
    ventas_cerradas: sum(prevRows, "ventas_cerradas"),
    monto_vendido: sum(prevRows, "monto_vendido"),
    reuniones_realizadas: sum(prevRows, "reuniones_realizadas"),
    reuniones_agendadas: sum(prevRows, "reuniones_agendadas"),
  }

  // Calculated
  const pctContacto = currentSummary.leads_asignados > 0
    ? Math.round((currentSummary.leads_contactados / currentSummary.leads_asignados) * 100)
    : 0
  const pctCierre = currentSummary.reuniones_realizadas > 0
    ? Math.round((currentSummary.ventas_cerradas / currentSummary.reuniones_realizadas) * 100)
    : 0
  const pctConversion = currentSummary.leads_asignados > 0
    ? Math.round((currentSummary.ventas_cerradas / currentSummary.leads_asignados) * 100)
    : 0
  const pctShowRate = currentSummary.reuniones_agendadas > 0
    ? Math.round((currentSummary.reuniones_realizadas / currentSummary.reuniones_agendadas) * 100)
    : 0
  const ticketPromedio = currentSummary.ventas_cerradas > 0
    ? Math.round(currentSummary.monto_vendido / currentSummary.ventas_cerradas)
    : 0

  // Changes vs previous period
  const change = (curr: number, prev: number) =>
    prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0

  return NextResponse.json({
    summary: currentSummary,
    calculated: { pctContacto, pctCierre, pctConversion, pctShowRate, ticketPromedio },
    changes: {
      leads_asignados: change(currentSummary.leads_asignados, prevSummary.leads_asignados),
      ventas_cerradas: change(currentSummary.ventas_cerradas, prevSummary.ventas_cerradas),
      monto_vendido: change(currentSummary.monto_vendido, prevSummary.monto_vendido),
      reuniones_realizadas: change(currentSummary.reuniones_realizadas, prevSummary.reuniones_realizadas),
    },
    periodo,
  })
}
