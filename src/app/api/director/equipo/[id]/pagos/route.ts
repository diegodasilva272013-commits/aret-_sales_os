import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope
  const { id } = await params
  const body = await req.json()

  await supabase.from("director_metodos_pago").insert({
    user_id: id,
    organization_id: organizationId,
    tipo: body.tipo || "cbu",
    datos: body.datos,
    titular: body.titular || null,
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope
  const { id: _userId } = await params
  const body = await req.json()

  await supabase.from("director_metodos_pago").delete().eq("id", body.pago_id).eq("organization_id", organizationId)

  return NextResponse.json({ ok: true })
}
