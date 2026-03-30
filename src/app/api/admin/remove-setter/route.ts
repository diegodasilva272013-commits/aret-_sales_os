import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // Verificar que sea owner/admin
  const { data: profile } = await supabase.from("profiles").select("is_owner, organization_id").eq("id", user.id).single()
  if (!profile?.is_owner) return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { setterId, reassignTo } = await req.json()
  if (!setterId) return NextResponse.json({ error: "setterId requerido" }, { status: 400 })

  // Usar service role para bypasear RLS
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Reasignar prospectos y empresas
  if (reassignTo) {
    await adminSupabase.from("prospects").update({ assigned_to: reassignTo }).eq("assigned_to", setterId)
    await adminSupabase.from("businesses").update({ assigned_to: reassignTo }).eq("assigned_to", setterId)
  } else {
    // Sin reasignar: dejar assigned_to en null
    await adminSupabase.from("prospects").update({ assigned_to: null }).eq("assigned_to", setterId)
    await adminSupabase.from("businesses").update({ assigned_to: null }).eq("assigned_to", setterId)
  }

  // Desvincular de la org
  await adminSupabase.from("profiles").update({ organization_id: null, is_owner: false, role: "setter" }).eq("id", setterId)

  return NextResponse.json({ success: true })
}
