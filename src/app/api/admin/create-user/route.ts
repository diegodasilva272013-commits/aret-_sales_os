import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // Verificar que sea owner/admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_owner, organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.is_owner) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { fullName, email, password, role } = await req.json()

  if (!fullName || !email || !password || !role) {
    return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
  }

  if (!["setter", "closer"].includes(role)) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
  }

  // Crear usuario con admin API (sin confirmación de email)
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createError) {
    if (createError.message.includes("already been registered")) {
      return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 })
    }
    return NextResponse.json({ error: createError.message }, { status: 500 })
  }

  // Actualizar perfil con org, rol, nombre
  const { error: profileError } = await adminSupabase
    .from("profiles")
    .update({
      full_name: fullName,
      role,
      organization_id: profile.organization_id,
      is_owner: false,
    })
    .eq("id", newUser.user.id)

  if (profileError) {
    // Si el perfil no se creó automáticamente por trigger, insertarlo
    await adminSupabase.from("profiles").upsert({
      id: newUser.user.id,
      email,
      full_name: fullName,
      role,
      organization_id: profile.organization_id,
      is_owner: false,
    })
  }

  return NextResponse.json({ success: true, userId: newUser.user.id })
}
