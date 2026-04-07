import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope
  const { id } = await params

  const body = await req.json()
  await supabase
    .from("director_proyectos")
    .update({ nombre: body.nombre, empresa: body.empresa, descripcion: body.descripcion, activo: body.activo, tipo: body.tipo })
    .eq("id", id)
    .eq("organization_id", organizationId)

  return NextResponse.json({ ok: true })
}
