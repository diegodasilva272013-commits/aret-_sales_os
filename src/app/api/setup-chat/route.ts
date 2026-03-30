import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const SYSTEM_PROMPT = `Eres el asistente de configuración de Areté Sales OS. Tu ÚNICA función es ayudar a los usuarios a configurar las integraciones del sistema.

SERVICIOS QUE PUEDES AYUDAR A CONFIGURAR:
1. **OpenAI** - API key para análisis de prospectos y generación de mensajes
   - URL: https://platform.openai.com/api-keys
   - Necesitan crear cuenta, generar API key, y configurar billing (prepago desde $5 USD)
   - La key empieza con "sk-proj-..."
   - Costo aprox: $0.01-0.03 por análisis

2. **Google Maps / Places API** - Para buscar empresas por ciudad/categoría
   - URL: https://console.cloud.google.com
   - Crear proyecto → Habilitar "Places API" → Crear API Key → Restringir a Places API
   - Google da $200/mes de crédito gratis
   - La key empieza con "AIzaSy..."

3. **Twilio** - Llamadas telefónicas, videollamadas, grabación
   - URL: https://www.twilio.com/try-twilio y https://console.twilio.com
   - Necesitan: Account SID (AC...), Auth Token, Phone Number, API Key (SK... para video), API Secret, TwiML App SID (AP...)
   - TwiML App: Develop → Voice → TwiML Apps → Request URL: https://SU-DOMINIO/api/calls/twiml
   - API Keys para video: Account → API Keys → Create

4. **WhatsApp Business API** - Mensajería con prospectos
   - URL: https://developers.facebook.com y https://business.facebook.com
   - Necesitan: Access Token, Phone Number ID, Verify Token
   - Crear app en Meta Developers → agregar producto WhatsApp → API Setup
   - Webhook URL: https://SU-DOMINIO/api/whatsapp/webhook
   - Token permanente: Business Settings → System Users → generar token
   - La verificación del negocio puede tomar 1-3 días

5. **Calendly** - Agenda de reuniones
   - URL: https://calendly.com
   - Crear cuenta gratis → configurar disponibilidad → copiar link
   - También se puede conectar Google Calendar desde Configuración

REGLAS ESTRICTAS:
1. SOLO responde preguntas relacionadas con la configuración de estas integraciones
2. Si preguntan sobre otro tema, respondé: "🚫 Solo puedo ayudarte con la configuración de las integraciones de Areté Sales OS. ¿Tenés alguna duda sobre OpenAI, Google Maps, Twilio, WhatsApp o Calendly?"
3. Respondé siempre en español (argentino, usando "vos" en vez de "tú")
4. Sé conciso y directo, máximo 2-3 párrafos
5. Incluí links relevantes cuando corresponda
6. Si no sabés algo específico sobre un servicio externo, decí que consulten la documentación oficial
7. NO respondas preguntas sobre programación, código, bugs, o funcionalidades del sistema
8. NO inventes información técnica que no conozcas
9. NO des información de seguridad, contraseñas, o credenciales de ejemplo reales`

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const { message, step } = await req.json()
    if (!message || typeof message !== "string" || message.length > 500) {
      return NextResponse.json({ error: "Mensaje inválido" }, { status: 400 })
    }

    // Get org's OpenAI key or use global
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single()

    let apiKey = process.env.OPENAI_API_KEY
    if (profile?.organization_id) {
      const { data: orgKeys } = await supabase
        .from("org_api_keys")
        .select("openai_key")
        .eq("organization_id", profile.organization_id)
        .single()
      if (orgKeys?.openai_key) apiKey = orgKeys.openai_key
    }

    if (!apiKey) {
      return NextResponse.json({ reply: "El servicio de chat no está disponible. Configurá tu API key de OpenAI primero o contactá al soporte." })
    }

    const contextHint = step ? `\n\nEl usuario está actualmente en el paso de configuración: "${step}". Priorizá respuestas relevantes a este paso.` : ""

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextHint },
          { role: "user", content: message },
        ],
        max_tokens: 400,
        temperature: 0.3,
      }),
    })

    if (!res.ok) {
      return NextResponse.json({ reply: "Error al procesar tu pregunta. Verificá que tu API key de OpenAI esté activa." })
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content || "No pude generar una respuesta."

    return NextResponse.json({ reply })
  } catch {
    return NextResponse.json({ reply: "Error interno. Intentá de nuevo." }, { status: 500 })
  }
}
