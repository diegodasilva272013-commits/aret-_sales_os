import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /export/closer-metrics - Export to CSV
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
  const fechaDesde = params.get("fecha_desde")
  const fechaHasta = params.get("fecha_hasta")

  let query = supabase
    .from("closer_metrics")
    .select("*, profiles!closer_id(full_name, email)")
    .eq("organization_id", profile.organization_id)
    .order("fecha", { ascending: false })

  if (profile.role !== "admin") {
    query = query.eq("closer_id", user.id)
  } else if (closerId) {
    query = query.eq("closer_id", closerId)
  }

  if (fechaDesde) query = query.gte("fecha", fechaDesde)
  if (fechaHasta) query = query.lte("fecha", fechaHasta)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data || []

  // CSV headers
  const headers = [
    "Fecha", "Closer", "Email",
    "Leads Asignados", "Leads Contactados", "Respuestas Obtenidas",
    "Llamadas Realizadas", "Conversaciones Efectivas",
    "Reuniones Agendadas", "Reuniones Realizadas",
    "Ofertas Enviadas", "Ventas Cerradas",
    "Monto Vendido", "Cobrado",
    "% Contacto", "% Respuesta", "% Show Rate", "% Cierre", "% Conversión Total",
    "Ticket Promedio",
    "Seguimientos Pendientes",
    "Objeciones Principales", "Motivo No Cierre", "Observaciones",
  ]

  const csvRows = rows.map(r => {
    const p = r.profiles as { full_name: string; email: string } | null
    const pctContacto = r.leads_asignados > 0 ? ((r.leads_contactados / r.leads_asignados) * 100).toFixed(1) : "0"
    const pctRespuesta = r.leads_contactados > 0 ? ((r.respuestas_obtenidas / r.leads_contactados) * 100).toFixed(1) : "0"
    const pctShow = r.reuniones_agendadas > 0 ? ((r.reuniones_realizadas / r.reuniones_agendadas) * 100).toFixed(1) : "0"
    const pctCierre = r.reuniones_realizadas > 0 ? ((r.ventas_cerradas / r.reuniones_realizadas) * 100).toFixed(1) : "0"
    const pctConv = r.leads_asignados > 0 ? ((r.ventas_cerradas / r.leads_asignados) * 100).toFixed(1) : "0"
    const ticket = r.ventas_cerradas > 0 ? (r.monto_vendido / r.ventas_cerradas).toFixed(2) : "0"

    return [
      r.fecha,
      `"${(p?.full_name || "").replace(/"/g, '""')}"`,
      p?.email || "",
      r.leads_asignados, r.leads_contactados, r.respuestas_obtenidas,
      r.llamadas_realizadas, r.conversaciones_efectivas,
      r.reuniones_agendadas, r.reuniones_realizadas,
      r.ofertas_enviadas, r.ventas_cerradas,
      r.monto_vendido, r.cobrado,
      pctContacto, pctRespuesta, pctShow, pctCierre, pctConv,
      ticket,
      r.seguimientos_pendientes,
      `"${(r.objeciones_principales || "").replace(/"/g, '""')}"`,
      `"${(r.motivo_no_cierre || "").replace(/"/g, '""')}"`,
      `"${(r.observaciones || "").replace(/"/g, '""')}"`,
    ].join(",")
  })

  const csv = [headers.join(","), ...csvRows].join("\n")
  const bom = "\uFEFF" // UTF-8 BOM for Excel

  return new NextResponse(bom + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="metricas-closers-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  })
}
