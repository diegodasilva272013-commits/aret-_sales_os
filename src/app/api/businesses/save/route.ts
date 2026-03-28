import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { business } = await req.json()
  if (!business) return NextResponse.json({ error: "Datos requeridos" }, { status: 400 })

  // Check duplicate
  const { data: existing } = await supabase
    .from("businesses")
    .select("id, status")
    .eq("place_id", business.place_id)
    .single()

  if (existing) {
    return NextResponse.json({ saved: true, businessId: existing.id, duplicate: true })
  }

  const { data: saved, error } = await supabase
    .from("businesses")
    .insert({
      place_id: business.place_id,
      name: business.name,
      category: business.category,
      address: business.address,
      city: business.city,
      country: business.country,
      phone: business.phone || "",
      website: business.website || "",
      google_rating: business.google_rating,
      google_maps_url: business.google_maps_url || "",
      assigned_to: user.id,
      created_by: user.id,
    })
    .select("id")
    .single()

  if (error || !saved) {
    console.error("[BUSINESS SAVE] Error:", JSON.stringify(error))
    return NextResponse.json({ error: error?.message || "Error guardando empresa" }, { status: 500 })
  }

  return NextResponse.json({ saved: true, businessId: saved.id })
}
