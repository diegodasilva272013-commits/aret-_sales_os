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

  const { data: campaigns, error } = await supabase
    .from("wa_campaigns")
    .select("*, wa_lines(id, label, phone, status)")
    .eq("organization_id", profile?.organization_id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaigns })
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

  if (!profile?.organization_id) {
    return NextResponse.json({ error: "Sin organización" }, { status: 400 })
  }

  const body = await req.json()
  const {
    name,
    line_id,
    contact_ids,
    variations,
    block_size = 30,
    pause_minutes = 3,
    delay_seconds = 15,
    randomize = true,
  } = body

  if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 })
  if (!line_id) return NextResponse.json({ error: "Línea requerida" }, { status: 400 })
  if (!Array.isArray(contact_ids) || contact_ids.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos un contacto" }, { status: 400 })
  }
  if (!Array.isArray(variations) || variations.length === 0 || variations.some((v: { body?: string }) => !v.body?.trim())) {
    return NextResponse.json({ error: "Agrega al menos una variación de mensaje con contenido" }, { status: 400 })
  }

  // Create campaign
  const { data: campaign, error: campaignError } = await supabase
    .from("wa_campaigns")
    .insert({
      organization_id: profile.organization_id,
      name: name.trim(),
      line_id,
      status: "draft",
      contact_ids,
      variations,
      block_size,
      pause_minutes,
      delay_seconds,
      randomize,
      sent_count: 0,
      error_count: 0,
    })
    .select()
    .single()

  if (campaignError) return NextResponse.json({ error: campaignError.message }, { status: 500 })

  // Fetch contacts to build send queue
  const { data: contacts } = await supabase
    .from("wa_contacts")
    .select("id, phone, name, alias")
    .in("id", contact_ids)
    .eq("organization_id", profile.organization_id)

  if (contacts && contacts.length > 0) {
    const variationCount = variations.length
    const queueItems = contacts.map((c, idx) => ({
      campaign_id: campaign.id,
      organization_id: profile.organization_id,
      contact_id: c.id,
      phone: c.phone,
      name: c.name || c.alias || null,
      variation_index: idx % variationCount,
      status: "pending",
    }))

    // Insert in chunks
    const chunkSize = 500
    for (let i = 0; i < queueItems.length; i += chunkSize) {
      const { error: queueError } = await supabase
        .from("wa_send_queue")
        .insert(queueItems.slice(i, i + chunkSize))

      if (queueError) {
        console.error("[campaigns] Queue insert error:", queueError)
        // Non-fatal: campaign is created, queue can be rebuilt
      }
    }
  }

  return NextResponse.json({ campaign })
}
