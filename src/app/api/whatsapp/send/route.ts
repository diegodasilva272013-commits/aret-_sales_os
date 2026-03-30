import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const { prospectId, message, toNumber, useTemplate, templateName } = await req.json()
  if (!toNumber) return NextResponse.json({ error: "Falta el número de teléfono" }, { status: 400 })
  if (!message && !useTemplate) return NextResponse.json({ error: "Falta el mensaje" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).single()

  // Normalizar número: sacar espacios, guiones, paréntesis, asegurar formato internacional sin +
  let cleanNumber = toNumber.replace(/[\s\-\(\)]/g, "").replace(/^\+/, "")
  
  // Si es número argentino con 15, convertir a formato internacional
  // Ej: 011 15 1234-5678 → 5491112345678
  if (cleanNumber.startsWith("0")) {
    // Número local argentino: sacar el 0 del código de área y el 15
    cleanNumber = "549" + cleanNumber.slice(1).replace(/^(\d{2,4})15/, "$1")
  }

  // Construir body del mensaje
  let msgBody: Record<string, unknown>
  if (useTemplate && templateName) {
    // Template message - funciona fuera de la ventana de 24h
    msgBody = {
      messaging_product: "whatsapp",
      to: cleanNumber,
      type: "template",
      template: {
        name: templateName,
        language: { code: "es_AR" },
      },
    }
  } else {
    // Texto libre - solo funciona dentro de la ventana de 24h
    msgBody = {
      messaging_product: "whatsapp",
      to: cleanNumber,
      type: "text",
      text: { body: message },
    }
  }

  const apiVersion = "v21.0"
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN

  if (!phoneNumberId || !accessToken) {
    return NextResponse.json({ error: "WhatsApp no configurado. Revisá las API Keys en Configuración." }, { status: 500 })
  }

  let res: Response
  try {
    res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(msgBody),
    })
  } catch (fetchErr) {
    console.error("WhatsApp fetch error:", fetchErr)
    return NextResponse.json({ error: "No se pudo conectar con WhatsApp. Revisá tu conexión." }, { status: 502 })
  }

  const data = await res.json()

  if (!res.ok) {
    console.error("WhatsApp API error:", JSON.stringify(data))
    // Mensajes de error más claros
    const errCode = data.error?.code
    const errMsg = data.error?.message || "Error desconocido"
    
    if (errCode === 190) {
      return NextResponse.json({ error: "Token de WhatsApp expirado o inválido. Actualizalo en Configuración → WhatsApp." }, { status: 401 })
    }
    if (errCode === 131047 || errMsg.includes("24 hour")) {
      return NextResponse.json({ error: "Fuera de la ventana de 24h. El prospecto debe escribirte primero, o usá un template aprobado." }, { status: 400 })
    }
    if (errCode === 131026 || errMsg.includes("not valid")) {
      return NextResponse.json({ error: `Número inválido: +${cleanNumber}. Verificá el formato (ej: +5491112345678).` }, { status: 400 })
    }
    if (errCode === 100 && errMsg.includes("param")) {
      return NextResponse.json({ error: "Error de configuración de WhatsApp. Verificá el Phone Number ID." }, { status: 400 })
    }
    
    return NextResponse.json({ error: errMsg }, { status: 400 })
  }

  const messageContent = useTemplate ? `[Template: ${templateName}]` : message

  // Guardar en DB
  await supabase.from("whatsapp_messages").insert({
    prospect_id: prospectId,
    organization_id: profile?.organization_id,
    whatsapp_message_id: data.messages?.[0]?.id,
    direction: "outbound",
    from_number: phoneNumberId,
    to_number: `+${cleanNumber}`,
    content: messageContent,
    status: "sent",
  })

  // Actualizar número del prospecto
  await supabase.from("prospects")
    .update({ whatsapp_number: `+${cleanNumber}`, last_contact_at: new Date().toISOString() })
    .eq("id", prospectId)

  return NextResponse.json({ ok: true, messageId: data.messages?.[0]?.id })
}
