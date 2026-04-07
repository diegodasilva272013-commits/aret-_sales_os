import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function GET() {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const { data } = await supabase
    .from("director_reglas_comision")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const body = await req.json()
  const { data, error } = await supabase
    .from("director_reglas_comision")
    .insert({ organization_id: organizationId, nombre: body.nombre, rol: body.rol, tramos: body.tramos })
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

  await supabase.from("director_reglas_comision").update(update).eq("id", id).eq("organization_id", organizationId)
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  await supabase.from("director_reglas_comision").delete().eq("id", id).eq("organization_id", organizationId)
  return NextResponse.json({ ok: true })
}
