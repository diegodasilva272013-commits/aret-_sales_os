import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function POST(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const body = await req.json()
  const { mes, meta_objetivo, costos_ads, costos_operativos } = body

  const { data: existing } = await supabase
    .from("director_metas_mensuales")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("mes", mes)
    .single()

  if (existing) {
    await supabase.from("director_metas_mensuales").update({ meta_objetivo, costos_ads, costos_operativos }).eq("id", existing.id)
  } else {
    await supabase.from("director_metas_mensuales").insert({ organization_id: organizationId, mes, meta_objetivo, costos_ads, costos_operativos })
  }

  return NextResponse.json({ ok: true })
}
