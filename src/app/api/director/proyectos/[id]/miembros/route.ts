import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { supabase } = scope
  const { id } = await params

  const { data } = await supabase
    .from("director_proyecto_miembros")
    .select("*, profiles:user_id(id, full_name, role)")
    .eq("proyecto_id", id)

  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { supabase } = scope
  const { id } = await params

  const body = await req.json()
  await supabase.from("director_proyecto_miembros").insert({
    proyecto_id: id,
    user_id: body.user_id,
    rol: body.rol || "setter",
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { supabase } = scope
  const { id: _proyectoId } = await params

  const { searchParams } = new URL(req.url)
  const memberId = searchParams.get("member_id")
  if (memberId) {
    await supabase.from("director_proyecto_miembros").delete().eq("id", memberId)
  }

  return NextResponse.json({ ok: true })
}
