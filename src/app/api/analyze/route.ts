import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runProspectAnalysisPipeline } from "@/lib/ai/agents"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { linkedinUrl, instagramUrl, profileText, sourceType = "linkedin", language = "es" } = await req.json()
  const profileUrl = sourceType === "instagram" ? instagramUrl : linkedinUrl
  if (!profileUrl) return NextResponse.json({ error: "URL requerida" }, { status: 400 })

  // Obtener contexto de la org
  const { data: profile } = await supabase.from("profiles").select("organization_id, organizations(*)").eq("id", user.id).single()
  const org = (profile?.organizations as unknown as Record<string, string> | null) || null
  const orgId = profile?.organization_id as string | null

  // Usar API key del org si está configurada
  if (orgId) {
    const { data: apiKeys } = await supabase.from("org_api_keys").select("openai_key").eq("organization_id", orgId).single()
    if (apiKeys?.openai_key) process.env.OPENAI_API_KEY = apiKeys.openai_key
  }

  // Check duplicate
  const urlField = sourceType === "instagram" ? "instagram_url" : "linkedin_url"
  const { data: existing } = await supabase
    .from("prospects")
    .select("id, assigned_to, profiles!assigned_to(full_name)")
    .eq(urlField, profileUrl)
    .single()

  if (existing) {
    return NextResponse.json({
      error: "duplicate",
      message: `Este prospecto ya está asignado`,
      prospectId: existing.id,
    }, { status: 409 })
  }

  // Verificar límite de uso
  if (org && (org as any).analyses_used >= (org as any).plan_limit) {
    return NextResponse.json({ error: "Límite de análisis alcanzado para tu plan. Contactá soporte para actualizar." }, { status: 403 })
  }

  // Run pipeline
  const result = await runProspectAnalysisPipeline(profileUrl, profileText || "", undefined, sourceType, org as Parameters<typeof runProspectAnalysisPipeline>[4], language)

  // Save prospect
  const { data: prospect, error: prospectError } = await supabase
    .from("prospects")
    .insert({
      linkedin_url: sourceType === "linkedin" ? profileUrl : null,
      instagram_url: sourceType === "instagram" ? profileUrl : null,
      source_type: sourceType,
      organization_id: orgId,
      full_name: result.prospectInfo.full_name || "Sin nombre",
      headline: result.prospectInfo.headline || "",
      company: result.prospectInfo.company || "",
      location: result.prospectInfo.location || "",
      status: "nuevo",
      phase: "contacto",
      follow_up_count: 0,
      assigned_to: user.id,
      created_by: user.id,
    })
    .select()
    .single()

  if (prospectError || !prospect) {
    return NextResponse.json({ error: "Error guardando prospecto" }, { status: 500 })
  }

  // Save analysis
  await supabase.from("prospect_analyses").insert({
    prospect_id: prospect.id,
    psychological_profile: result.psychologicalProfile.psychological_profile,
    disc_type: result.psychologicalProfile.disc_type,
    communication_style: result.psychologicalProfile.communication_style,
    key_words: result.psychologicalProfile.key_words,
    pain_points: result.salesStrategy.pain_points,
    sales_angle: result.salesStrategy.sales_angle,
    company_analysis: result.salesStrategy.company_analysis,
    raw_linkedin_data: result.rawProfileData,
  })

  // Save messages
  const msgs = result.messages
  const messagesToSave = [
    { follow_up_number: 0, phase: "contacto", message_type: "inicial", content: msgs.mensaje_inicial },
    { follow_up_number: 1, phase: "contacto", message_type: "sin_respuesta", content: msgs.fase_contacto.seguimiento_1_sin_respuesta },
    { follow_up_number: 1, phase: "contacto", message_type: "con_respuesta", content: msgs.fase_contacto.seguimiento_2_con_respuesta },
    { follow_up_number: 2, phase: "venta", message_type: "sin_respuesta", content: msgs.fase_venta.seguimiento_3_sin_respuesta },
    { follow_up_number: 3, phase: "venta", message_type: "sin_respuesta", content: msgs.fase_venta.seguimiento_4_sin_respuesta },
    { follow_up_number: 4, phase: "venta", message_type: "con_respuesta", content: msgs.fase_venta.seguimiento_5_con_respuesta },
    { follow_up_number: 5, phase: "cierre", message_type: "sin_respuesta", content: msgs.fase_cierre.seguimiento_6_breakup },
    { follow_up_number: 5, phase: "cierre", message_type: "con_respuesta", content: msgs.fase_cierre.seguimiento_6_agendar },
  ]

  await supabase.from("generated_messages").insert(
    messagesToSave.map(m => ({ ...m, prospect_id: prospect.id }))
  )

  // Incrementar uso
  if (orgId) await supabase.rpc("increment_analyses_used", { org_id: orgId })

  return NextResponse.json({ success: true, prospectId: prospect.id, result })
}
