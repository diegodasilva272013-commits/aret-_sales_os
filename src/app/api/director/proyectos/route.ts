import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function GET() {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const { data } = await supabase
    .from("director_proyectos")
    .select("*, director_proyecto_miembros(count)")
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
    .from("director_proyectos")
    .insert({
      organization_id: organizationId,
      nombre: body.nombre,
      empresa: body.empresa || null,
      descripcion: body.descripcion || null,
      tipo: body.tipo || "evergreen",
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}
