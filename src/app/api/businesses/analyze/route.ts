import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runBusinessAnalysisPipeline } from "@/lib/ai/businessAgents"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { business } = await req.json()
  if (!business) return NextResponse.json({ error: "Datos de empresa requeridos" }, { status: 400 })

  // Check duplicate
  const { data: existing } = await supabase
    .from("businesses")
    .select("id")
    .eq("place_id", business.place_id)
    .single()

  if (existing) {
    return NextResponse.json({ error: "duplicate", businessId: existing.id, message: "Esta empresa ya fue prospectada" }, { status: 409 })
  }

  const result = await runBusinessAnalysisPipeline(business)

  // Save business
  const { data: saved, error: saveError } = await supabase
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
      contact_name: result.contactInfo.contact_name,
      contact_email: result.contactInfo.contact_email,
      whatsapp: result.contactInfo.whatsapp,
      instagram: result.contactInfo.instagram,
      linkedin_url: result.contactInfo.linkedin_url,
      assigned_to: user.id,
      created_by: user.id,
    })
    .select()
    .single()

  if (saveError || !saved) {
    console.error("[BUSINESS ANALYZE] Save error:", JSON.stringify(saveError))
    return NextResponse.json({ error: saveError?.message || "Error guardando empresa" }, { status: 500 })
  }

  // Save analysis
  await supabase.from("business_analyses").insert({
    business_id: saved.id,
    company_analysis: result.analysis.company_analysis,
    psychological_profile: result.analysis.psychological_profile,
    communication_style: result.analysis.communication_style,
    pain_points: result.analysis.pain_points,
    sales_angle: result.analysis.sales_angle,
    key_words: result.analysis.key_words,
    raw_data: result.enrichedData,
  })

  // Save messages
  const msgs = result.messages
  const messagesToSave = [
    { follow_up_number: 0, channel: "whatsapp", message_type: "inicial", content: msgs.whatsapp?.inicial || "" },
    { follow_up_number: 1, channel: "whatsapp", message_type: "sin_respuesta", content: msgs.whatsapp?.seguimiento_1 || "" },
    { follow_up_number: 2, channel: "whatsapp", message_type: "con_respuesta", content: msgs.whatsapp?.seguimiento_2 || "" },
    { follow_up_number: 0, channel: "email", message_type: "inicial", subject: msgs.email?.asunto_inicial || "", content: msgs.email?.inicial || "" },
    { follow_up_number: 1, channel: "email", message_type: "sin_respuesta", subject: msgs.email?.asunto_seguimiento || "", content: msgs.email?.seguimiento_1 || "" },
    { follow_up_number: 2, channel: "email", message_type: "con_respuesta", content: msgs.email?.seguimiento_2 || "" },
    { follow_up_number: 0, channel: "instagram", message_type: "inicial", content: msgs.instagram?.inicial || "" },
    { follow_up_number: 1, channel: "instagram", message_type: "sin_respuesta", content: msgs.instagram?.seguimiento_1 || "" },
    { follow_up_number: 5, channel: "general", message_type: "sin_respuesta", content: msgs.general?.seguimiento_breakup || "" },
    { follow_up_number: 5, channel: "general", message_type: "con_respuesta", content: msgs.general?.agendar_llamada || "" },
  ]

  await supabase.from("business_messages").insert(
    messagesToSave.filter(m => m.content).map(m => ({ ...m, business_id: saved.id }))
  )

  return NextResponse.json({ success: true, businessId: saved.id, result })
}
