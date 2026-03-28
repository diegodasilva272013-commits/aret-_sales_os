import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/closer-metrics - List metrics with filters
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
  const periodo = params.get("periodo") // hoy, semana, mes
  const search = params.get("search")
  const page = parseInt(params.get("page") || "1")
  const limit = parseInt(params.get("limit") || "50")
  const sortBy = params.get("sort_by") || "fecha"
  const sortDir = params.get("sort_dir") === "asc"

  let query = supabase
    .from("closer_metrics")
    .select("*, profiles!closer_id(full_name, email)", { count: "exact" })
    .eq("organization_id", profile.organization_id)

  // Filter by closer (admins can see all, closers only self)
  if (profile.role !== "admin") {
    query = query.eq("closer_id", user.id)
  } else if (closerId) {
    query = query.eq("closer_id", closerId)
  }

  // Date filters
  if (periodo) {
    const now = new Date()
    let desde: string
    if (periodo === "hoy") {
      desde = now.toISOString().split("T")[0]
    } else if (periodo === "semana") {
      const d = new Date(now)
      d.setDate(d.getDate() - d.getDay())
      desde = d.toISOString().split("T")[0]
    } else {
      // mes
      desde = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
    }
    query = query.gte("fecha", desde)
  } else {
    if (fechaDesde) query = query.gte("fecha", fechaDesde)
    if (fechaHasta) query = query.lte("fecha", fechaHasta)
  }

  // Search by observations or objections
  if (search) {
    query = query.or(`objeciones_principales.ilike.%${search}%,motivo_no_cierre.ilike.%${search}%,observaciones.ilike.%${search}%`)
  }

  // Sorting
  query = query.order(sortBy, { ascending: sortDir })

  // Pagination
  const from = (page - 1) * limit
  query = query.range(from, from + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error("[CLOSER-METRICS] GET error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Get list of closers for filters (admin only)
  let closers: { id: string; full_name: string }[] = []
  if (profile.role === "admin") {
    const { data: c } = await supabase
      .from("profiles")
      .select("id, full_name")
      .eq("organization_id", profile.organization_id)
      .order("full_name")
    closers = c || []
  }

  return NextResponse.json({
    data: data || [],
    closers,
    total: count || 0,
    page,
    limit,
    isAdmin: profile.role === "admin",
  })
}

// POST /api/closer-metrics - Create new metric
export async function POST(req: NextRequest) {
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

  const body = await req.json()
  const closerId = (profile.role === "admin" && body.closer_id) ? body.closer_id : user.id

  const row = {
    organization_id: profile.organization_id,
    closer_id: closerId,
    fecha: body.fecha || new Date().toISOString().split("T")[0],
    leads_asignados: Number(body.leads_asignados) || 0,
    leads_contactados: Number(body.leads_contactados) || 0,
    respuestas_obtenidas: Number(body.respuestas_obtenidas) || 0,
    llamadas_realizadas: Number(body.llamadas_realizadas) || 0,
    conversaciones_efectivas: Number(body.conversaciones_efectivas) || 0,
    reuniones_agendadas: Number(body.reuniones_agendadas) || 0,
    reuniones_realizadas: Number(body.reuniones_realizadas) || 0,
    ofertas_enviadas: Number(body.ofertas_enviadas) || 0,
    ventas_cerradas: Number(body.ventas_cerradas) || 0,
    monto_vendido: Number(body.monto_vendido) || 0,
    cobrado: Number(body.cobrado) || 0,
    seguimientos_pendientes: Number(body.seguimientos_pendientes) || 0,
    objeciones_principales: body.objeciones_principales || "",
    motivo_no_cierre: body.motivo_no_cierre || "",
    observaciones: body.observaciones || "",
  }

  const { data, error } = await supabase
    .from("closer_metrics")
    .insert(row)
    .select("*, profiles!closer_id(full_name, email)")
    .single()

  if (error) {
    // Unique constraint = duplicate date
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ya existe un registro para este closer en esta fecha" }, { status: 409 })
    }
    console.error("[CLOSER-METRICS] POST error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
