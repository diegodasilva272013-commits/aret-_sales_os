import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  // Verificar que sea owner/admin
  const { data: profile } = await supabase.from("profiles").select("is_owner, organization_id").eq("id", user.id).single()
  if (!profile?.is_owner) return NextResponse.json({ error: "Sin permisos" }, { status: 403 })

  const { setterId, reassignTo } = await req.json()
  if (!setterId) return NextResponse.json({ error: "setterId requerido" }, { status: 400 })

  // Reasignar prospectos
  if (reassignTo) {
    await supabase.from("prospects").update({ assigned_to: reassignTo }).eq("assigned_to", setterId)
    await supabase.from("businesses").update({ assigned_to: reassignTo }).eq("assigned_to", setterId)
  }

  // Desvincular de la org (no borramos el usuario de Supabase Auth)
  await supabase.from("profiles").update({ organization_id: null, is_owner: false }).eq("id", setterId)

  return NextResponse.json({ success: true })
}
