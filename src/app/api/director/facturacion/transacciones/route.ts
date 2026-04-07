import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function GET(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const { searchParams } = new URL(req.url)
  const desde = searchParams.get("desde")
  const hasta = searchParams.get("hasta")
  const tipo = searchParams.get("tipo")
  const limit = parseInt(searchParams.get("limit") || "100")

  let query = supabase
    .from("director_transacciones")
    .select("*, clientes_cartera(nombre_cliente)")
    .eq("organization_id", organizationId)
    .order("fecha", { ascending: false })
    .limit(limit)

  if (desde) query = query.gte("fecha", desde)
  if (hasta) query = query.lte("fecha", hasta + "T23:59:59")
  if (tipo) query = query.eq("tipo", tipo)

  const { data } = await query

  // Enrich with closer/setter names
  const enriched = (data || []).map(t => ({
    id: t.id,
    cliente_id: t.cliente_id,
    cuota_id: t.cuota_id,
    monto: Number(t.monto),
    tipo: t.tipo,
    fecha: t.fecha,
    descripcion: t.descripcion,
    creado_en: t.created_at,
    cliente_nombre: (t.clientes_cartera as any)?.nombre_cliente || null,
  }))

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const body = await req.json()
  const { data, error } = await supabase
    .from("director_transacciones")
    .insert({
      organization_id: organizationId,
      monto: body.monto,
      tipo: body.tipo,
      descripcion: body.descripcion || null,
      cliente_id: body.cliente_id || null,
      cuota_id: body.cuota_id || null,
      fecha: body.fecha || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

  await supabase.from("director_transacciones").delete().eq("id", id).eq("organization_id", organizationId)
  return NextResponse.json({ ok: true })
}
