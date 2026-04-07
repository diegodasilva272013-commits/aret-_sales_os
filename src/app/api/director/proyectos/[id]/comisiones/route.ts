import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { supabase } = scope
  const { id } = await params

  const { data } = await supabase
    .from("director_comisiones_proyecto")
    .select("*")
    .eq("proyecto_id", id)
    .single()

  if (!data) {
    return NextResponse.json({
      proyecto_id: id,
      setter_base_mensual: 500,
      setter_por_cita_show_calificada: 25,
      setter_por_venta_cerrada: 75,
      closer_comision_porcentaje: 8,
      closer_bonus_cierre: 500,
      closer_bonus_tasa_minima: 40,
      closer_penalidad_impago_porcentaje: 50,
      closer_dias_penalidad: 30,
    })
  }

  return NextResponse.json(data)
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { supabase } = scope
  const { id } = await params

  const body = await req.json()

  const { data: existing } = await supabase
    .from("director_comisiones_proyecto")
    .select("id")
    .eq("proyecto_id", id)
    .single()

  if (existing) {
    await supabase.from("director_comisiones_proyecto").update(body).eq("proyecto_id", id)
  } else {
    await supabase.from("director_comisiones_proyecto").insert({ ...body, proyecto_id: id })
  }

  return NextResponse.json({ ok: true })
}
