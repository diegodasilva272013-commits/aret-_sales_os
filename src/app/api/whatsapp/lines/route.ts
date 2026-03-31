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

  const { data: lines, error } = await supabase
    .from("wa_lines")
    .select("*")
    .eq("organization_id", profile?.organization_id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lines })
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

  const body = await req.json()
  const { label, phone, channel_type } = body

  const { data: line, error } = await supabase
    .from("wa_lines")
    .insert({
      organization_id: profile?.organization_id,
      label: label || null,
      phone: phone || null,
      channel_type: channel_type || "baileys",
      status: "cold",
      warmup_enabled: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ line })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single()

  const url = new URL(req.url)
  const lineId = url.searchParams.get("line_id")
  if (!lineId) return NextResponse.json({ error: "line_id requerido" }, { status: 400 })

  const body = await req.json()
  const allowed: Record<string, unknown> = {}
  if (typeof body.warmup_enabled === "boolean") allowed.warmup_enabled = body.warmup_enabled
  if (body.status) allowed.status = body.status
  if (body.label) allowed.label = body.label
  if (body.phone) allowed.phone = body.phone
  allowed.updated_at = new Date().toISOString()

  const { data: line, error } = await supabase
    .from("wa_lines")
    .update(allowed)
    .eq("id", lineId)
    .eq("organization_id", profile?.organization_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ line })
}
