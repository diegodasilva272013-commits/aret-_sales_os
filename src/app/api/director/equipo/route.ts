import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function GET() {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, phone, avatar_url")
    .eq("organization_id", organizationId)

  // Get payment methods
  const { data: pagos } = await supabase
    .from("director_metodos_pago")
    .select("*")
    .eq("organization_id", organizationId)

  // Get project assignments
  const { data: proyectos } = await supabase
    .from("director_proyectos")
    .select("id, nombre, activo, director_proyecto_miembros(user_id)")
    .eq("organization_id", organizationId)

  const enriched = (profiles || []).map(p => {
    const userPagos = (pagos || []).filter(pg => pg.user_id === p.id)
    const userProyectos = (proyectos || []).filter(pr =>
      (pr.director_proyecto_miembros || []).some((m: { user_id: string }) => m.user_id === p.id)
    ).map(pr => ({ id: pr.id, nombre: pr.nombre, activo: pr.activo }))

    return {
      id: p.id,
      nombre: p.full_name || "",
      full_name: p.full_name || "",
      email: (p as Record<string, unknown>).email || "",
      telefono: p.phone || null,
      phone: p.phone || null,
      foto_url: p.avatar_url || null,
      avatar_url: p.avatar_url || null,
      rol: p.role || "setter",
      role: p.role || "setter",
      activo: p.is_active !== false,
      is_active: p.is_active !== false,
      pagos: userPagos.map(pg => ({ id: pg.id, tipo: pg.tipo, datos: pg.datos, titular: pg.titular, principal: pg.principal })),
      proyectos: userProyectos,
    }
  })

  return NextResponse.json({ profiles: enriched })
}

export async function POST(req: NextRequest) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope

  const body = await req.json()
  const { nombre, apellido, email, password, rol, telefono } = body

  if (!email || !password || !nombre) {
    return NextResponse.json({ error: "Nombre, email y contraseña son requeridos" }, { status: 400 })
  }

  // Create auth user via admin (skip if no service role)
  // For now, use signUp
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: `${nombre} ${apellido || ""}`.trim() } },
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message || "Error al crear usuario" }, { status: 400 })
  }

  // Update profile with org and role
  await supabase
    .from("profiles")
    .update({
      full_name: `${nombre} ${apellido || ""}`.trim(),
      organization_id: organizationId,
      role: rol || "setter",
      phone: telefono || null,
      is_active: true,
    })
    .eq("id", authData.user.id)

  return NextResponse.json({ id: authData.user.id })
}
