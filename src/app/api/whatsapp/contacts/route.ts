import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  const { data: contacts, error } = await supabase
    .from("wa_contacts")
    .select("*")
    .eq("organization_id", profile?.organization_id)
    .order("created_at", { ascending: false })
    .limit(2000)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contacts })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  if (!profile?.organization_id) return NextResponse.json({ error: "Sin organización" }, { status: 400 })

  const { phone, name, alias } = await req.json()
  if (!phone?.trim()) return NextResponse.json({ error: "Teléfono requerido" }, { status: 400 })

  const { normalizePhone } = await import("@/lib/whatsapp/csv-parser")
  const normalized = normalizePhone(phone.trim())
  if (!normalized) return NextResponse.json({ error: "Número de teléfono inválido" }, { status: 400 })

  const { data: contact, error } = await supabase
    .from("wa_contacts")
    .upsert({
      organization_id: profile.organization_id,
      phone: normalized,
      name: name?.trim() || null,
      alias: alias?.trim() || null,
      source: "manual",
    }, { onConflict: "organization_id,phone" })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ contact })
}
