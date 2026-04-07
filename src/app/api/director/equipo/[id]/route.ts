import { NextRequest, NextResponse } from "next/server"
import { getDirectorScope } from "@/lib/director-auth"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope
  const { id } = await params

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active, phone, avatar_url")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single()

  if (!profile) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  const { data: pagos } = await supabase
    .from("director_metodos_pago")
    .select("*")
    .eq("user_id", id)
    .eq("organization_id", organizationId)

  const { data: proyectos } = await supabase
    .from("director_proyectos")
    .select("id, nombre, activo, director_proyecto_miembros!inner(user_id)")
    .eq("organization_id", organizationId)
    .eq("director_proyecto_miembros.user_id", id)

  return NextResponse.json({
    ...profile,
    nombre: profile.full_name,
    rol: profile.role,
    activo: profile.is_active,
    pagos: (pagos || []).map(p => ({ id: p.id, tipo: p.tipo, datos: p.datos, titular: p.titular, principal: p.principal })),
    proyectos: (proyectos || []).map(p => ({ id: p.id, nombre: p.nombre, activo: p.activo })),
  })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getDirectorScope()
  if (scope.error) return scope.error
  const { organizationId, supabase } = scope
  const { id } = await params

  const body = await req.json()

  await supabase
    .from("profiles")
    .update({
      full_name: `${body.nombre || ""} ${body.apellido || ""}`.trim() || undefined,
      role: body.rol || undefined,
      phone: body.telefono || undefined,
      avatar_url: body.foto_url || undefined,
      is_active: body.activo,
    })
    .eq("id", id)
    .eq("organization_id", organizationId)

  // Update project assignments if provided
  if (body.proyectos) {
    const projectIds = body.proyectos.map((p: { id: string }) => p.id)
    // Remove all existing
    const { data: existingProjects } = await supabase
      .from("director_proyectos")
      .select("id")
      .eq("organization_id", organizationId)

    for (const proj of existingProjects || []) {
      await supabase.from("director_proyecto_miembros").delete().eq("proyecto_id", proj.id).eq("user_id", id)
    }
    // Add new
    for (const pid of projectIds) {
      await supabase.from("director_proyecto_miembros").insert({ proyecto_id: pid, user_id: id, rol: body.rol || "setter" })
    }
  }

  return NextResponse.json({ ok: true })
}
