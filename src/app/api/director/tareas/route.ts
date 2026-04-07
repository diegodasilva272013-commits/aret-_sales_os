import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function GET(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const { searchParams } = new URL(req.url)

  // Tareas
  const { data } = await supabase
    .from("director_tareas")
    .select("*")
    .eq("organization_id", organizationId)
    .order("fecha_inicio", { ascending: true })

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, userId, supabase } = scope

  const body = await req.json()
  const { data, error } = await supabase
    .from("director_tareas")
    .insert({
      organization_id: organizationId,
      titulo: body.titulo,
      descripcion: body.descripcion || null,
      tipo: body.tipo || "tarea",
      prioridad: body.prioridad || "media",
      estado: body.estado || "pendiente",
      fecha_inicio: body.fecha_inicio || null,
      fecha_fin: body.fecha_fin || null,
      todo_el_dia: body.todo_el_dia || false,
      recurrencia: body.recurrencia || null,
      participantes: body.participantes || [],
      link_reunion: body.link_reunion || null,
      created_by: userId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function PUT(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const body = await req.json()
  const { id, ...update } = body

  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  update.updated_at = new Date().toISOString()

  await supabase
    .from("director_tareas")
    .update(update)
    .eq("id", id)
    .eq("organization_id", organizationId)

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  await supabase.from("director_tareas").delete().eq("id", id).eq("organization_id", organizationId)

  return NextResponse.json({ ok: true })
}
