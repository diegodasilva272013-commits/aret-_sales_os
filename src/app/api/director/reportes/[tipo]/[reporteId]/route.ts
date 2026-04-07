import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ tipo: string; reporteId: string }> }) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope
  const { tipo, reporteId } = await params

  const table = tipo === "setter" ? "reportes_setter" : "reportes_closer"
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", reporteId)
    .eq("organization_id", organizationId)
    .single()

  if (error || !data) return NextResponse.json({ error: "No encontrado" }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ tipo: string; reporteId: string }> }) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope
  const { tipo, reporteId } = await params

  const body = await req.json()
  const table = tipo === "setter" ? "reportes_setter" : "reportes_closer"

  const { error } = await supabase
    .from(table)
    .update(body)
    .eq("id", reporteId)
    .eq("organization_id", organizationId)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
