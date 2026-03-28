import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

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
  const { full_name, company, headline, location, whatsapp_number, linkedin_url, instagram_url } = body

  if (!full_name?.trim()) {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("prospects")
    .insert({
      full_name: full_name.trim(),
      company: company?.trim() || "",
      headline: headline?.trim() || "",
      location: location?.trim() || "",
      whatsapp_number: whatsapp_number?.trim() || null,
      linkedin_url: linkedin_url?.trim() || null,
      instagram_url: instagram_url?.trim() || null,
      organization_id: profile?.organization_id,
      assigned_to: user.id,
      created_by: user.id,
      status: "nuevo",
      phase: "contacto",
      source_type: "manual",
      follow_up_count: 0,
    })
    .select("id")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ prospectId: data.id })
}
