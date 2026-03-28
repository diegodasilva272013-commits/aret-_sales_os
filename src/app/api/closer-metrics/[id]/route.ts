import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// PATCH /api/closer-metrics/[id] - Update metric
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  // Verify metric belongs to user or user is admin
  const { data: existing } = await supabase
    .from("closer_metrics")
    .select("closer_id, organization_id")
    .eq("id", id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
  }

  if (existing.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  if (profile.role !== "admin" && existing.closer_id !== user.id) {
    return NextResponse.json({ error: "Solo puedes editar tus propias métricas" }, { status: 403 })
  }

  const body = await req.json()

  // Build update object with only provided fields
  const numericFields = [
    "leads_asignados", "leads_contactados", "respuestas_obtenidas",
    "llamadas_realizadas", "conversaciones_efectivas", "reuniones_agendadas",
    "reuniones_realizadas", "ofertas_enviadas", "ventas_cerradas",
    "monto_vendido", "cobrado", "seguimientos_pendientes",
  ]
  const textFields = ["objeciones_principales", "motivo_no_cierre", "observaciones"]
  const dateFields = ["fecha"]

  const updates: Record<string, unknown> = {}

  for (const f of numericFields) {
    if (body[f] !== undefined) updates[f] = Number(body[f]) || 0
  }
  for (const f of textFields) {
    if (body[f] !== undefined) updates[f] = String(body[f])
  }
  for (const f of dateFields) {
    if (body[f] !== undefined) updates[f] = body[f]
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("closer_metrics")
    .update(updates)
    .eq("id", id)
    .select("*, profiles!closer_id(full_name, email)")
    .single()

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Ya existe un registro para este closer en esta fecha" }, { status: 409 })
    }
    console.error("[CLOSER-METRICS] PATCH error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}

// DELETE /api/closer-metrics/[id] - Delete metric
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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

  const { data: existing } = await supabase
    .from("closer_metrics")
    .select("closer_id, organization_id")
    .eq("id", id)
    .single()

  if (!existing) {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })
  }

  if (existing.organization_id !== profile.organization_id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  if (profile.role !== "admin" && existing.closer_id !== user.id) {
    return NextResponse.json({ error: "Solo puedes borrar tus propias métricas" }, { status: 403 })
  }

  const { error } = await supabase
    .from("closer_metrics")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("[CLOSER-METRICS] DELETE error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}
