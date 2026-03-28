import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { regenerateMessagesOnly } from "@/lib/ai/agents"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { prospectId } = await req.json()
  if (!prospectId) return NextResponse.json({ error: "prospectId requerido" }, { status: 400 })

  // Obtener análisis existente
  const { data: analysis } = await supabase
    .from("prospect_analyses")
    .select("*")
    .eq("prospect_id", prospectId)
    .single()

  if (!analysis) return NextResponse.json({ error: "Análisis no encontrado" }, { status: 404 })

  // Obtener prospect para sourceType y nombre
  const { data: prospect } = await supabase
    .from("prospects")
    .select("full_name, source_type")
    .eq("id", prospectId)
    .single()

  // Obtener contexto de org
  const { data: profile } = await supabase
    .from("profiles")
    .select("organizations(*)")
    .eq("id", user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = (profile?.organizations as unknown as Record<string, string> | null) || null
  const prospectName = prospect?.full_name?.split(" ")[0] || "el prospecto"
  const sourceType = (prospect?.source_type as "linkedin" | "instagram") || "linkedin"

  const newMessages = await regenerateMessagesOnly(
    analysis.raw_linkedin_data || "",
    JSON.stringify(analysis),
    JSON.stringify({ pain_points: analysis.pain_points, sales_angle: analysis.sales_angle }),
    prospectName,
    sourceType,
    org as any
  )

  // Borrar mensajes viejos e insertar nuevos
  await supabase.from("generated_messages").delete().eq("prospect_id", prospectId)

  const messagesToSave = [
    { follow_up_number: 0, phase: "contacto", message_type: "inicial",        content: newMessages.mensaje_inicial },
    { follow_up_number: 1, phase: "contacto", message_type: "sin_respuesta",   content: newMessages.fase_contacto?.seguimiento_1_sin_respuesta },
    { follow_up_number: 1, phase: "contacto", message_type: "con_respuesta",   content: newMessages.fase_contacto?.seguimiento_2_con_respuesta },
    { follow_up_number: 2, phase: "venta",    message_type: "sin_respuesta",   content: newMessages.fase_venta?.seguimiento_3_sin_respuesta },
    { follow_up_number: 3, phase: "venta",    message_type: "sin_respuesta",   content: newMessages.fase_venta?.seguimiento_4_sin_respuesta },
    { follow_up_number: 4, phase: "venta",    message_type: "con_respuesta",   content: newMessages.fase_venta?.seguimiento_5_con_respuesta },
    { follow_up_number: 5, phase: "cierre",   message_type: "sin_respuesta",   content: newMessages.fase_cierre?.seguimiento_6_breakup },
    { follow_up_number: 5, phase: "cierre",   message_type: "con_respuesta",   content: newMessages.fase_cierre?.seguimiento_6_agendar },
  ].filter(m => m.content)

  const { data: saved } = await supabase
    .from("generated_messages")
    .insert(messagesToSave.map(m => ({ ...m, prospect_id: prospectId })))
    .select()

  return NextResponse.json({ success: true, messages: saved })
}
